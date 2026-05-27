"""OpenAI vision provider (gpt-4o)."""

from __future__ import annotations

import base64
import json

from openai import AsyncOpenAI, OpenAIError

from app.llm.base import CritiqueResult, prompt_for

_MODEL = "gpt-4o"


class OpenAIProvider:
    id = "openai"
    requires_api_key = True

    def __init__(self, api_key: str) -> None:
        self._client = AsyncOpenAI(api_key=api_key)

    async def critique(self, *, image_bytes: bytes, language: str = "en") -> CritiqueResult:
        b64 = base64.b64encode(image_bytes).decode("ascii")
        response = await self._client.chat.completions.create(
            model=_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_for(language)},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                        },
                    ],
                },
            ],
        )
        raw = response.choices[0].message.content or "{}"
        return CritiqueResult.model_validate_json(raw)

    async def health(self) -> tuple[bool, str | None]:
        try:
            # Cheapest authenticated round-trip: list models.
            await self._client.models.list()
            return True, None
        except OpenAIError as exc:
            return False, str(exc)
        except Exception as exc:  # noqa: BLE001 — surface any failure reason
            return False, str(exc)
