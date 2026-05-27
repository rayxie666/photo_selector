"""LLM provider listing and ad-hoc critique endpoint."""

from __future__ import annotations

import io
import logging
from typing import Annotated

from fastapi import APIRouter, File, Form, Header, HTTPException, UploadFile
from pydantic import BaseModel

from app.llm.base import CritiqueResult
from app.llm.registry import ALL_PROVIDER_IDS, get_provider, provider_listing

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/llm", tags=["llm"])


class ProviderInfo(BaseModel):
    id: str
    requires_api_key: bool
    available: bool
    reason: str | None = None


@router.get("/providers", response_model=list[ProviderInfo])
def list_providers() -> list[ProviderInfo]:
    return [ProviderInfo(**entry) for entry in provider_listing()]


class CritiqueResponse(BaseModel):
    item_id: str
    provider: str
    result: CritiqueResult


def _parse_authorization(value: str | None) -> str | None:
    if not value:
        return None
    if value.lower().startswith("bearer "):
        return value[7:].strip() or None
    return value.strip() or None


@router.post("/critique", response_model=CritiqueResponse)
async def critique(
    image: Annotated[UploadFile, File()],
    item_id: Annotated[str, Form()],
    x_llm_provider: Annotated[str | None, Header(alias="X-LLM-Provider")] = None,
    authorization: Annotated[str | None, Header()] = None,
    accept_language: Annotated[str | None, Header(alias="Accept-Language")] = "en",
) -> CritiqueResponse:
    if not x_llm_provider:
        raise HTTPException(status_code=400, detail="missing X-LLM-Provider header")
    if x_llm_provider not in ALL_PROVIDER_IDS:
        raise HTTPException(
            status_code=400,
            detail={"error": "unknown_provider", "available": list(ALL_PROVIDER_IDS)},
        )

    api_key = _parse_authorization(authorization)
    try:
        provider = get_provider(x_llm_provider, api_key)
    except ValueError as exc:
        # Cloud provider missing API key
        raise HTTPException(
            status_code=401,
            detail={"error": "missing_api_key", "provider": x_llm_provider, "message": str(exc)},
        ) from exc

    image_bytes = await image.read()
    try:
        result = await provider.critique(
            image_bytes=image_bytes, language=accept_language or "en"
        )
    except RuntimeError as exc:
        # e.g. CLI not in PATH
        raise HTTPException(status_code=503, detail={"error": "provider_unavailable", "message": str(exc)}) from exc

    return CritiqueResponse(item_id=item_id, provider=x_llm_provider, result=result)
