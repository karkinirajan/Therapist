import time
import uuid

import jwt

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

settings = get_settings()


def test_password_hash_round_trip() -> None:
    plain = "correct horse battery staple"
    hashed = hash_password(plain)

    assert hashed != plain
    assert verify_password(plain, hashed) is True


def test_password_verify_rejects_wrong_password_without_raising() -> None:
    hashed = hash_password("the-real-password")

    assert verify_password("not-the-real-password", hashed) is False


def test_access_token_round_trip() -> None:
    user_id = uuid.uuid4()
    token = create_access_token(user_id)

    decoded = decode_access_token(token)

    assert decoded == user_id


def test_access_token_rejects_garbage() -> None:
    assert decode_access_token("not-a-real-jwt") is None


def test_access_token_rejects_expired_token() -> None:
    user_id = uuid.uuid4()
    now = int(time.time())
    expired_payload = {"sub": str(user_id), "iat": now - 120, "exp": now - 60}
    expired_token = jwt.encode(expired_payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

    assert decode_access_token(expired_token) is None


def test_access_token_rejects_wrong_signature() -> None:
    user_id = uuid.uuid4()
    now = int(time.time())
    payload = {"sub": str(user_id), "iat": now, "exp": now + 60}
    token = jwt.encode(payload, "a-completely-different-secret", algorithm=settings.jwt_algorithm)

    assert decode_access_token(token) is None
