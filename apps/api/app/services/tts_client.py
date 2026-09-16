import httpx

from app.core.config import get_settings

settings = get_settings()

ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1/text-to-speech"


class TtsNotConfiguredError(Exception):
    pass


class TtsQuotaExceededError(Exception):
    pass


class TtsRequestError(Exception):
    pass


async def synthesize(*, text: str) -> bytes:
    """Returns MP3 audio bytes for `text` via ElevenLabs. Callers should
    catch `TtsQuotaExceededError` and fall back to the browser's own
    SpeechSynthesis rather than failing the turn — TTS is a quality
    enhancement, not a hard dependency, on the free tier."""
    if not settings.elevenlabs_api_key or not settings.elevenlabs_voice_id:
        raise TtsNotConfiguredError("ELEVENLABS_API_KEY/ELEVENLABS_VOICE_ID not configured")

    url = f"{ELEVENLABS_BASE_URL}/{settings.elevenlabs_voice_id}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            url,
            headers={"xi-api-key": settings.elevenlabs_api_key, "accept": "audio/mpeg"},
            json={"text": text, "model_id": "eleven_turbo_v2_5"},
        )
    if response.status_code == 429:
        raise TtsQuotaExceededError(response.text)
    if response.status_code != 200:
        raise TtsRequestError(response.text)
    return response.content
