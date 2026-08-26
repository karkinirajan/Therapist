from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.routers import auth, baseline, checkin, hierarchy, me, oauth, roadmap, tracking

settings = get_settings()

app = FastAPI(
    title="Therapist API",
    version="0.1.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(oauth.router)
app.include_router(baseline.router)
app.include_router(tracking.router)
app.include_router(checkin.router)
app.include_router(hierarchy.router)
app.include_router(roadmap.router)
app.include_router(me.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
