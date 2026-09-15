from functools import lru_cache

from pydantic import Field, PostgresDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: str = "development"
    database_url: PostgresDsn
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    google_authorize_url: str = "https://accounts.google.com/o/oauth2/v2/auth"
    google_token_url: str = "https://oauth2.googleapis.com/token"
    google_jwks_url: str = "https://www.googleapis.com/oauth2/v3/certs"
    google_issuer: str = "https://accounts.google.com"

    frontend_url: str = "http://localhost:3000"

    cors_allow_origins: list[str] = ["http://localhost:3000"]

    # Overrides the `Secure` cookie flag's default (environment == "production").
    # Needed for a production deployment served over plain HTTP without a
    # domain/TLS yet (e.g. a bare EC2 IP) — browsers silently drop `Secure`
    # cookies set over an insecure connection, which breaks refresh/logout
    # entirely. Leave unset once real TLS is in front of the app.
    cookie_secure_override: bool | None = Field(default=None, validation_alias="COOKIE_SECURE")

    @field_validator("cookie_secure_override", mode="before")
    @classmethod
    def _blank_env_means_unset(cls, value: object) -> object:
        # Compose's `${COOKIE_SECURE:-}` interpolation passes an empty string,
        # not an absent var, when unset in .env — treat that the same as unset
        # rather than a bool-parse error.
        return None if value == "" else value

    @property
    def cookie_secure(self) -> bool:
        if self.cookie_secure_override is not None:
            return self.cookie_secure_override
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
