import json
from collections.abc import AsyncIterator
from dataclasses import dataclass

import httpx

from app.core.config import get_settings

settings = get_settings()

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class LlmNotConfiguredError(Exception):
    pass


class LlmQuotaExceededError(Exception):
    pass


class LlmRequestError(Exception):
    pass


@dataclass(frozen=True)
class LlmChunk:
    text: str
    input_tokens: int = 0
    output_tokens: int = 0


async def stream_reply(
    *, system_prompt: str, history: list[dict[str, str]]
) -> AsyncIterator[LlmChunk]:
    """Streams a reply from Gemini's `streamGenerateContent` endpoint.

    `history` is a list of {"role": "user" | "model", "text": ...} turns,
    oldest first. Yields incremental text chunks as they arrive so the
    caller can forward them over a WebSocket without waiting for the full
    reply — the actual source of "real-time" feel, since STT is already
    client-side and TTS speaks as text arrives too.
    """
    if not settings.gemini_api_key:
        raise LlmNotConfiguredError("GEMINI_API_KEY is not configured")

    contents = [
        {"role": turn["role"], "parts": [{"text": turn["text"]}]} for turn in history
    ]
    url = (
        f"{GEMINI_BASE_URL}/{settings.gemini_model}:streamGenerateContent"
        f"?alt=sse&key={settings.gemini_api_key}"
    )
    body = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
    }

    async with (
        httpx.AsyncClient(timeout=30.0) as client,
        client.stream("POST", url, json=body) as response,
    ):
        if response.status_code == 429:
            raise LlmQuotaExceededError(await response.aread())
        if response.status_code != 200:
            raise LlmRequestError(await response.aread())

        async for line in response.aiter_lines():
            if not line.startswith("data: "):
                continue
            payload = json.loads(line.removeprefix("data: "))
            candidates = payload.get("candidates") or []
            if not candidates:
                continue
            parts = candidates[0].get("content", {}).get("parts") or []
            text = "".join(p.get("text", "") for p in parts)
            usage = payload.get("usageMetadata") or {}
            if text:
                yield LlmChunk(
                    text=text,
                    input_tokens=usage.get("promptTokenCount", 0),
                    output_tokens=usage.get("candidatesTokenCount", 0),
                )


async def complete(*, system_prompt: str, history: list[dict[str, str]]) -> str:
    """Non-streaming variant — used for the end-of-session summarization
    call, where there's no live listener to stream tokens to."""
    chunks = [chunk.text async for chunk in stream_reply(system_prompt=system_prompt, history=history)]
    return "".join(chunks)
