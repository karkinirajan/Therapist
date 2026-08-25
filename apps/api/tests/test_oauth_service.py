import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import get_settings
from app.services.oauth_service import (
    GoogleIdentity,
    GoogleIdTokenVerificationError,
    InvalidExchangeCodeError,
    InvalidOAuthStateError,
    OAuthAccountService,
    UnverifiedGoogleEmailError,
    build_authorization_request,
    build_exchange_code,
    exchange_code_for_google_identity,
    verify_exchange_code,
    verify_state,
)

settings = get_settings()


def test_build_authorization_request_embeds_pkce_and_points_at_google() -> None:
    url, state = build_authorization_request()

    assert url.startswith(settings.google_authorize_url)
    assert "code_challenge=" in url
    assert "code_challenge_method=S256" in url
    assert f"state={state}" in url


def test_verify_state_round_trip() -> None:
    _url, state = build_authorization_request()

    result = verify_state(state)

    assert result.code_verifier


def test_verify_state_rejects_garbage() -> None:
    with pytest.raises(InvalidOAuthStateError):
        verify_state("not-a-real-token")


def test_verify_state_rejects_wrong_purpose_token() -> None:
    # An exchange-code token has a different `purpose` claim and must not be
    # accepted as OAuth state.
    fake_user_id = uuid.uuid4()
    exchange_code = build_exchange_code(fake_user_id)

    with pytest.raises(InvalidOAuthStateError):
        verify_state(exchange_code)


def test_exchange_code_round_trip() -> None:
    user_id = uuid.uuid4()

    code = build_exchange_code(user_id)

    assert verify_exchange_code(code) == user_id


def test_exchange_code_rejects_garbage() -> None:
    with pytest.raises(InvalidExchangeCodeError):
        verify_exchange_code("not-a-real-token")


async def test_resolve_creates_new_user_for_unknown_google_identity(db_session) -> None:
    identity = GoogleIdentity(
        provider_account_id=f"google-{uuid.uuid4().hex[:8]}",
        email=f"newuser-{uuid.uuid4().hex[:8]}@example.com",
        email_verified=True,
    )

    service = OAuthAccountService(db_session)
    result = await service.resolve(identity)

    assert result.user is not None
    assert result.user.email == identity.email
    assert result.user.email_verified is True
    assert result.user.password_hash is None
    assert result.link_confirmation_token is None


async def test_resolve_logs_in_existing_linked_identity(db_session) -> None:
    identity = GoogleIdentity(
        provider_account_id=f"google-{uuid.uuid4().hex[:8]}",
        email=f"repeat-{uuid.uuid4().hex[:8]}@example.com",
        email_verified=True,
    )
    service = OAuthAccountService(db_session)
    first = await service.resolve(identity)

    second = await service.resolve(identity)

    assert second.user is not None
    assert second.user.id == first.user.id
    assert second.link_confirmation_token is None


async def test_resolve_rejects_unverified_google_email(db_session) -> None:
    identity = GoogleIdentity(
        provider_account_id=f"google-{uuid.uuid4().hex[:8]}",
        email=f"unverified-{uuid.uuid4().hex[:8]}@example.com",
        email_verified=False,
    )
    service = OAuthAccountService(db_session)

    with pytest.raises(UnverifiedGoogleEmailError):
        await service.resolve(identity)


async def test_resolve_requires_link_confirmation_for_existing_password_account(db_session) -> None:
    from app.repositories.user_repo import UserRepository

    email = f"existing-{uuid.uuid4().hex[:8]}@example.com"
    await UserRepository(db_session).create(
        email=email, password_hash="argon2-hash-placeholder", email_verified=True
    )

    identity = GoogleIdentity(
        provider_account_id=f"google-{uuid.uuid4().hex[:8]}", email=email, email_verified=True
    )
    service = OAuthAccountService(db_session)

    result = await service.resolve(identity)

    assert result.user is None
    assert result.link_confirmation_token is not None


def _mocked_google_client(fake_id_token: str = "fake.id.token"):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id_token": fake_id_token, "access_token": "unused"}

    mock_async_client = AsyncMock()
    mock_async_client.__aenter__.return_value = mock_async_client
    mock_async_client.post.return_value = mock_response
    return mock_async_client


async def test_exchange_code_for_google_identity_uses_mocked_google_endpoints() -> None:
    fake_claims = {
        "sub": "google-account-123",
        "email": "mocked@example.com",
        "email_verified": True,
        "nonce": "expected-nonce",
    }
    mock_async_client = _mocked_google_client()

    with (
        patch("app.services.oauth_service.httpx.AsyncClient", return_value=mock_async_client),
        patch("app.services.oauth_service.jwt.PyJWKClient") as mock_jwk_client_cls,
        patch("app.services.oauth_service.jwt.decode", return_value=fake_claims) as mock_decode,
    ):
        mock_jwk_client_cls.return_value.get_signing_key_from_jwt.return_value = MagicMock(key="fake-key")

        identity = await exchange_code_for_google_identity(
            code="auth-code", code_verifier="verifier", expected_nonce="expected-nonce"
        )

    assert identity.provider_account_id == "google-account-123"
    assert identity.email == "mocked@example.com"
    assert identity.email_verified is True
    mock_async_client.post.assert_awaited_once()
    mock_decode.assert_called_once()


async def test_exchange_code_for_google_identity_rejects_nonce_mismatch() -> None:
    fake_claims = {
        "sub": "google-account-123",
        "email": "mocked@example.com",
        "email_verified": True,
        "nonce": "attacker-supplied-nonce",
    }
    mock_async_client = _mocked_google_client()

    with (
        patch("app.services.oauth_service.httpx.AsyncClient", return_value=mock_async_client),
        patch("app.services.oauth_service.jwt.PyJWKClient") as mock_jwk_client_cls,
        patch("app.services.oauth_service.jwt.decode", return_value=fake_claims),
        pytest.raises(GoogleIdTokenVerificationError),
    ):
        mock_jwk_client_cls.return_value.get_signing_key_from_jwt.return_value = MagicMock(key="fake-key")

        await exchange_code_for_google_identity(
            code="auth-code", code_verifier="verifier", expected_nonce="expected-nonce"
        )
