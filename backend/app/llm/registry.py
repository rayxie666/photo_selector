"""Registry that maps provider id -> instance, and reports per-provider availability."""

from __future__ import annotations

import shutil
from typing import get_args

from app.llm.anthropic_provider import AnthropicProvider
from app.llm.base import LLMProvider, ProviderId
from app.llm.claude_cli_provider import ClaudeCodeCLIProvider
from app.llm.google_provider import GoogleProvider
from app.llm.openai_provider import OpenAIProvider


ALL_PROVIDER_IDS: tuple[ProviderId, ...] = get_args(ProviderId)


def get_provider(provider_id: str, api_key: str | None) -> LLMProvider:
    """Instantiate the provider per request. Stateless, no caching."""
    if provider_id == "openai":
        if not api_key:
            raise ValueError("OpenAI requires an API key")
        return OpenAIProvider(api_key=api_key)
    if provider_id == "anthropic":
        if not api_key:
            raise ValueError("Anthropic requires an API key")
        return AnthropicProvider(api_key=api_key)
    if provider_id == "google":
        if not api_key:
            raise ValueError("Google requires an API key")
        return GoogleProvider(api_key=api_key)
    if provider_id == "claude-cli":
        return ClaudeCodeCLIProvider()
    raise ValueError(f"unknown provider id: {provider_id!r}")


def provider_listing() -> list[dict]:
    """Static description of each provider (used by GET /api/llm/providers).

    Cloud providers are reported as "needs_api_key" — the frontend supplies the key
    on each request and the backend never stores it. The CLI provider is reported
    "available" iff the `claude` binary is in PATH at query time.
    """
    cli_available = shutil.which("claude") is not None
    return [
        {
            "id": "openai",
            "requires_api_key": True,
            "available": True,
            "reason": None,
        },
        {
            "id": "anthropic",
            "requires_api_key": True,
            "available": True,
            "reason": None,
        },
        {
            "id": "google",
            "requires_api_key": True,
            "available": True,
            "reason": None,
        },
        {
            "id": "claude-cli",
            "requires_api_key": False,
            "available": cli_available,
            "reason": None if cli_available else "claude binary not found in PATH",
        },
    ]
