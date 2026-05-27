"""Anthropic vision provider (Claude Sonnet 4.5)."""

from __future__ import annotations

import base64
import json

from anthropic import APIError, AsyncAnthropic

from app.llm.base import CritiqueResult, prompt_for

_MODEL = "claude-sonnet-4-5"


class AnthropicProvider:
    id = "anthropic"
    requires_api_key = True

    def __init__(self, api_key: str) -> None:
        self._client = AsyncAnthropic(api_key=api_key)

    async def critique(self, *, image_bytes: bytes, language: str = "en") -> CritiqueResult:
        b64 = base64.b64encode(image_bytes).decode("ascii")
        message = await self._client.messages.create(
            model=_MODEL,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": "image/jpeg", "data": b64},
                        },
                        {"type": "text", "text": prompt_for(language)},
                    ],
                },
            ],
        )
        text = "".join(
            block.text for block in message.content if getattr(block, "type", None) == "text"
        )
        # Strip optional ```json fences just in case.
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")
            if cleaned.lower().startswith("json"):
                cleaned = cleaned[4:]
            cleaned = cleaned.strip()
        return CritiqueResult.model_validate_json(cleaned or "{}")

    async def health(self) -> tuple[bool, str | None]:
        try:
            # Minimal validation call: try to list models is not exposed for Anthropic;
            # send a tiny no-op message instead. Costs ~few tokens.
            await self._client.messages.create(
                model=_MODEL,
                max_tokens=1,
                messages=[{"role": "user", "content": "ping"}],
            )
            return True, None
        except APIError as exc:
            return False, str(exc)
        except Exception as exc:  # noqa: BLE001
            return False, str(exc)
