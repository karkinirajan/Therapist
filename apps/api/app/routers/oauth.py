import hmac
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.core.config import get_settings
from app.core.deps import get_db
from app.core.rate_limit import limiter
from app.repositories.user_repo import UserRepository
from app.routers.auth import _set_refresh_cookie
from app.schemas.auth import GoogleExchangeRequest, TokenResponse, UserPublic
from app.services.auth_service import AuthService
from app.services.oauth_service import (
    GoogleIdTokenVerificationError,
    GoogleTokenExchangeError,
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

router = APIRouter(prefix="/auth/google", tags=["oauth"])
settings = get_settings()

STATE_COOKIE_NAME = "google_oauth_state"
STATE_COOKIE_PATH = "/auth/google"
_COOKIE_SECURE = get_settings().environment == "production"


@router.get("/authorize")
@limiter.limit("10/minute")
async def authorize(request: Request) -> RedirectResponse:
    authorization_url, state = build_authorization_request()
    response = RedirectResponse(url=authorization_url, status_code=status.HTTP_302_FOUND)
    # Bind the state to this browser: /callback must present the same value back
    # via this cookie before we'll trust the `state` query param at all. Without
    # this, a validly-signed state token is still replayable by anyone who can
    # get their own callback URL opened in a victim's browser (e.g. a captured
    # redirect), since JWT signature validity alone doesn't prove the callback
    # request originated from the browser that started this flow.
    response.set_cookie(
        key=STATE_COOKIE_NAME,
        value=state,
        max_age=600,
        path=STATE_COOKIE_PATH,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="lax",
    )
    return response


@router.get("/callback")
async def callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    cookie_state = request.cookies.get(STATE_COOKIE_NAME)
    if not cookie_state or not hmac.compare_digest(cookie_state, state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired state"
        )

    try:
        oauth_state = verify_state(state)
    except InvalidOAuthStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired state"
        ) from exc

    try:
        identity = await exchange_code_for_google_identity(
            code=code,
            code_verifier=oauth_state.code_verifier,
            expected_nonce=oauth_state.nonce,
        )
    except (GoogleTokenExchangeError, GoogleIdTokenVerificationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Google authentication failed"
        ) from exc

    account_service = OAuthAccountService(db)
    try:
        result = await account_service.resolve(identity)
    except UnverifiedGoogleEmailError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is not verified",
        ) from exc

    if result.link_confirmation_token is not None:
        params = urlencode({"link_token": result.link_confirmation_token})
        response: RedirectResponse = RedirectResponse(
            url=f"{settings.frontend_url}/auth/link-confirm?{params}",
            status_code=status.HTTP_302_FOUND,
        )
    else:
        assert result.user is not None
        exchange_code = build_exchange_code(result.user.id)
        params = urlencode({"code": exchange_code})
        response = RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback?{params}",
            status_code=status.HTTP_302_FOUND,
        )

    response.delete_cookie(key=STATE_COOKIE_NAME, path=STATE_COOKIE_PATH)
    return response


@router.post("/exchange", response_model=TokenResponse)
@limiter.limit("10/minute")
async def exchange(
    request: Request,
    response: Response,
    body: GoogleExchangeRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    try:
        user_id = verify_exchange_code(body.code)
    except InvalidExchangeCodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired exchange code"
        ) from exc

    user = await UserRepository(db).get_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")

    auth_service = AuthService(db)
    issued = await auth_service.issue_tokens_for_user(
        user,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )

    _set_refresh_cookie(
        response, issued.refresh_token, max_age_seconds=settings.refresh_token_ttl_days * 24 * 60 * 60
    )
    return TokenResponse(access_token=issued.access_token, user=UserPublic.model_validate(user))
