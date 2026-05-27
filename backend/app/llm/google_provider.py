"""Google Gemini vision provider (gemini-2.5-flash)."""

from __future__ import annotations

from google import genai
from google.genai import types as genai_types
from google.genai.errors import APIError

from app.llm.base import CritiqueResult, prompt_for

_MODEL = "gemini-2.5-flash"


class GoogleProvider:
    id = "google"
    requires_api_key = True

    def __init__(self, api_key: str) -> None:
        self._client = genai.Client(api_key=api_key)

    async def critique(self, *, image_bytes: bytes, language: str = "en") -> CritiqueResult:
        response = await self._client.aio.models.generate_content(
            model=_MODEL,
            contents=[
                genai_types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                prompt_for(language),
            ],
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CritiqueResult,
            ),
        )
        raw = response.text or "{}"
        return CritiqueResult.model_validate_json(raw)

    async def health(self) -> tuple[bool, str | None]:
        try:
            # Listing models is the cheapest authenticated call.
            await self._client.aio.models.list(config={"page_size": 1})
            return True, None
        except APIError as exc:
            return False, str(exc)
        except Exception as exc:  # noqa: BLE001
            return False, str(exc)
