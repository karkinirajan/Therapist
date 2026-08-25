import time
import uuid
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx
import jwt
from authlib.common.security import generate_token
from authlib.oauth2.rfc7636 import create_s256_code_challenge
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.oauth_identity import OAuthProvider
from app.models.user import User
from app.repositories.oauth_identity_repo import OAuthIdentityRepository
from app.repositories.user_repo import UserRepository

settings = get_settings()

STATE_PURPOSE = "google_oauth_state"
EXCHANGE_PURPOSE = "google_oauth_exchange"
LINK_PURPOSE = "google_oauth_link_confirm"

STATE_TTL_SECONDS = 10 * 60
EXCHANGE_TTL_SECONDS = 2 * 60
LINK_TTL_SECONDS = 10 * 60


class InvalidOAuthStateError(Exception):
    """Raised when the `state` param on /callback is missing, expired, or tampered with."""


class InvalidExchangeCodeError(Exception):
    """Raised when the one-time exchange code on /exchange is invalid or expired."""


class GoogleTokenExchangeError(Exception):
    """Raised when the authorization-code-for-token exchange with Google fails."""


class GoogleIdTokenVerificationError(Exception):
    """Raised when the returned Google ID token fails signature/claims verification."""


@dataclass(frozen=True)
class OAuthState:
    nonce: str
    code_verifier: str


@dataclass(frozen=True)
class GoogleIdentity:
    provider_account_id: str
    email: str
    email_verified: bool


def _encode_signed_token(payload: dict, ttl_seconds: int) -> str:
    now = int(time.time())
    full_payload = {**payload, "iat": now, "exp": now + ttl_seconds}
    return jwt.encode(full_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode_signed_token(token: str, expected_purpose: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.InvalidTokenError:
        return None
    if payload.get("purpose") != expected_purpose:
        return None
    return payload


def build_authorization_request() -> tuple[str, str]:
    """Return (authorization_url, state_token). Stateless: the PKCE verifier and a
    random nonce are embedded in the signed `state` JWT itself, so nothing needs to
    be kept server-side between /authorize and /callback."""
    code_verifier = generate_token(64)
    code_challenge = create_s256_code_challenge(code_verifier)
    nonce = generate_token(24)

    state = _encode_signed_token(
        {"purpose": STATE_PURPOSE, "nonce": nonce, "code_verifier": code_verifier},
        STATE_TTL_SECONDS,
    )

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "access_type": "online",
        "prompt": "select_account",
    }
    authorization_url = f"{settings.google_authorize_url}?{urlencode(params)}"
    return authorization_url, state


def verify_state(state: str) -> OAuthState:
    payload = _decode_signed_token(state, STATE_PURPOSE)
    if payload is None:
        raise InvalidOAuthStateError()
    return OAuthState(nonce=payload["nonce"], code_verifier=payload["code_verifier"])


async def exchange_code_for_google_identity(*, code: str, code_verifier: str) -> GoogleIdentity:
    """Exchange the authorization code (+ PKCE verifier) for tokens with Google,
    then verify the returned ID token and extract identity claims."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_response = await client.post(
            settings.google_token_url,
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
                "code_verifier": code_verifier,
            },
        )
    if token_response.status_code != 200:
        raise GoogleTokenExchangeError(token_response.text)

    token_payload = token_response.json()
    id_token = token_payload.get("id_token")
    if not id_token:
        raise GoogleTokenExchangeError("No id_token in Google token response")

    return await verify_google_id_token(id_token)


async def verify_google_id_token(id_token: str) -> GoogleIdentity:
    try:
        jwk_client = jwt.PyJWKClient(settings.google_jwks_url)
        signing_key = jwk_client.get_signing_key_from_jwt(id_token)
        claims = jwt.decode(
            id_token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.google_client_id,
            issuer=[settings.google_issuer, "accounts.google.com"],
        )
    except jwt.InvalidTokenError as exc:
        raise GoogleIdTokenVerificationError(str(exc)) from exc

    email = claims.get("email")
    sub = claims.get("sub")
    if not email or not sub:
        raise GoogleIdTokenVerificationError("Missing email or sub claim")

    return GoogleIdentity(
        provider_account_id=sub,
        email=email,
        email_verified=bool(claims.get("email_verified", False)),
    )


@dataclass(frozen=True)
class OAuthLoginResult:
    user: User | None
    link_confirmation_token: str | None


class OAuthAccountService:
    """Handles the account-linking decision for a verified Google identity.
    Transaction boundary: a single flush per call, commit is owned by the caller's
    `get_db` dependency (this mirrors AuthService/get_db elsewhere in the app)."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._users = UserRepository(db)
        self._identities = OAuthIdentityRepository(db)

    async def resolve(self, identity: GoogleIdentity) -> OAuthLoginResult:
        existing_identity = await self._identities.get_by_provider_account(
            OAuthProvider.google, identity.provider_account_id
        )
        if existing_identity is not None:
            user = await self._users.get_by_id(existing_identity.user_id)
            return OAuthLoginResult(user=user, link_confirmation_token=None)

        existing_user = await self._users.get_by_email(identity.email)
        if existing_user is not None:
            # A password-based (or differently-linked) account already owns this
            # email. Do not silently merge identities - require explicit
            # confirmation via a one-time linking token.
            link_token = _encode_signed_token(
                {
                    "purpose": LINK_PURPOSE,
                    "user_id": str(existing_user.id),
                    "provider_account_id": identity.provider_account_id,
                },
                LINK_TTL_SECONDS,
            )
            return OAuthLoginResult(user=None, link_confirmation_token=link_token)

        new_user = await self._users.create(
            email=identity.email,
            password_hash=None,
            email_verified=True,
        )
        await self._identities.create(
            user_id=new_user.id,
            provider=OAuthProvider.google,
            provider_account_id=identity.provider_account_id,
        )
        return OAuthLoginResult(user=new_user, link_confirmation_token=None)


def build_exchange_code(user_id: uuid.UUID) -> str:
    return _encode_signed_token(
        {"purpose": EXCHANGE_PURPOSE, "user_id": str(user_id)}, EXCHANGE_TTL_SECONDS
    )


def verify_exchange_code(code: str) -> uuid.UUID:
    payload = _decode_signed_token(code, EXCHANGE_PURPOSE)
    if payload is None:
        raise InvalidExchangeCodeError()
    try:
        return uuid.UUID(payload["user_id"])
    except (KeyError, ValueError) as exc:
        raise InvalidExchangeCodeError() from exc


def verify_link_confirmation_token(token: str) -> tuple[uuid.UUID, str]:
    payload = _decode_signed_token(token, LINK_PURPOSE)
    if payload is None:
        raise InvalidExchangeCodeError()
    try:
        return uuid.UUID(payload["user_id"]), payload["provider_account_id"]
    except (KeyError, ValueError) as exc:
        raise InvalidExchangeCodeError() from exc
