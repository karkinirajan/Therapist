from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

# Default key func is per-IP. Endpoints that also need a per-email limit pass an
# explicit `key_func=email_key` on a second stacked `@limiter.limit(...)` decorator;
# `email_key` reads a value a request-body-parsing dependency stashed on
# `request.state` earlier in the dependency chain (slowapi's key_func only ever
# receives the `Request`, not the resolved endpoint kwargs).
limiter = Limiter(key_func=get_remote_address)


def email_key(request: Request) -> str:
    email = getattr(request.state, "rate_limit_email", None)
    return email or "unknown-email"


def user_key(request: Request) -> str:
    """Same `request.state` stash pattern as `email_key` - a dependency
    earlier in the chain sets `request.state.rate_limit_user_id` before this
    key_func runs. Used for per-user (not per-IP) limits, e.g. the voice
    feature's turn endpoint."""
    user_id = getattr(request.state, "rate_limit_user_id", None)
    return user_id or "unknown-user"
