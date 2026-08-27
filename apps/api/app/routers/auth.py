from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.rate_limit import email_key, limiter
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserPublic
from app.services.auth_service import (
    AuthService,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    InvalidRefreshTokenError,
)

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = "/auth"

# `Secure` cookies are only ever sent by browsers/HTTP clients over TLS, so we
# only set the flag in production - local dev and tests run the API over plain
# HTTP (http://localhost:8000), and a Secure cookie there would simply never be
# echoed back, breaking refresh/logout entirely.
_COOKIE_SECURE = get_settings().environment == "production"


def _set_refresh_cookie(response: Response, raw_refresh_token: str, max_age_seconds: int) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_refresh_token,
        max_age=max_age_seconds,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=_COOKIE_SECURE,
        samesite="lax",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


def _expired_refresh_cookie_header() -> str:
    """The Set-Cookie value that clears the refresh cookie, for use as an
    HTTPException header. Mutating the handler's injected `Response` (via
    `_clear_refresh_cookie`) has no effect once the handler raises - FastAPI
    builds a brand-new Response from the exception instead of reusing the one
    already mutated in the handler - so a cookie-clear on a rejected refresh
    has to travel on the exception itself instead."""
    probe = Response()
    _clear_refresh_cookie(probe)
    return probe.headers["set-cookie"]


async def _signup_body(request: Request, body: SignupRequest) -> SignupRequest:
    request.state.rate_limit_email = body.email.lower()
    return body


async def _login_body(request: Request, body: LoginRequest) -> LoginRequest:
    request.state.rate_limit_email = body.email.lower()
    return body


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
@limiter.limit("5/minute", key_func=email_key)
async def signup(
    request: Request,
    response: Response,
    body: SignupRequest = Depends(_signup_body),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    service = AuthService(db)
    try:
        issued = await service.signup(
            email=body.email,
            password=body.password,
            user_agent=request.headers.get("user-agent"),
            ip=request.client.host if request.client else None,
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        ) from exc

    _set_refresh_cookie(
        response, issued.refresh_token, max_age_seconds=_refresh_max_age_seconds()
    )
    return TokenResponse(access_token=issued.access_token, user=UserPublic.model_validate(issued.user))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
@limiter.limit("5/minute", key_func=email_key)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest = Depends(_login_body),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    service = AuthService(db)
    try:
        issued = await service.login(
            email=body.email,
            password=body.password,
            user_agent=request.headers.get("user-agent"),
            ip=request.client.host if request.client else None,
        )
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        ) from exc

    _set_refresh_cookie(
        response, issued.refresh_token, max_age_seconds=_refresh_max_age_seconds()
    )
    return TokenResponse(access_token=issued.access_token, user=UserPublic.model_validate(issued.user))


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token")

    service = AuthService(db)
    try:
        issued = await service.refresh(
            raw_token=raw_token,
            user_agent=request.headers.get("user-agent"),
            ip=request.client.host if request.client else None,
        )
    except InvalidRefreshTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"set-cookie": _expired_refresh_cookie_header()},
        ) from exc

    _set_refresh_cookie(
        response, issued.refresh_token, max_age_seconds=_refresh_max_age_seconds()
    )
    return TokenResponse(access_token=issued.access_token, user=UserPublic.model_validate(issued.user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> None:
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw_token:
        service = AuthService(db)
        await service.logout(raw_token=raw_token)
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserPublic)
async def me(current_user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(current_user)


def _refresh_max_age_seconds() -> int:
    return get_settings().refresh_token_ttl_days * 24 * 60 * 60
