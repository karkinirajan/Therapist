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
    build_authorization_request,
    build_exchange_code,
    exchange_code_for_google_identity,
    verify_exchange_code,
    verify_state,
)

router = APIRouter(prefix="/auth/google", tags=["oauth"])
settings = get_settings()


@router.get("/authorize")
@limiter.limit("10/minute")
async def authorize(request: Request) -> RedirectResponse:
    authorization_url, _state = build_authorization_request()
    return RedirectResponse(url=authorization_url, status_code=status.HTTP_302_FOUND)


@router.get("/callback")
async def callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    try:
        oauth_state = verify_state(state)
    except InvalidOAuthStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired state"
        ) from exc

    try:
        identity = await exchange_code_for_google_identity(
            code=code, code_verifier=oauth_state.code_verifier
        )
    except (GoogleTokenExchangeError, GoogleIdTokenVerificationError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Google authentication failed"
        ) from exc

    account_service = OAuthAccountService(db)
    result = await account_service.resolve(identity)

    if result.link_confirmation_token is not None:
        params = urlencode({"link_token": result.link_confirmation_token})
        return RedirectResponse(
            url=f"{settings.frontend_url}/auth/link-confirm?{params}",
            status_code=status.HTTP_302_FOUND,
        )

    assert result.user is not None
    exchange_code = build_exchange_code(result.user.id)
    params = urlencode({"code": exchange_code})
    return RedirectResponse(
        url=f"{settings.frontend_url}/auth/callback?{params}",
        status_code=status.HTTP_302_FOUND,
    )


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
