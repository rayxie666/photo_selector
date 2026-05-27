"""Claude Code CLI provider — invokes the locally installed `claude` binary via subprocess.

Uses the user's existing Claude Code subscription/auth, so no API key is needed.

Two complications we work around:

  1. **File access**: Claude's Read tool only sees files in the current working
     directory by default. We pass `--add-dir <tmp_parent>` to grant access to the
     temp file that holds the image, and reference it with `@<absolute_path>`.

  2. **User-level Stop hooks**: If the caller has a global `Stop` hook configured
     (e.g. one that forces a TaskList check), it fires AFTER Claude's first
     assistant turn and prompts another turn — whose text replaces the previous
     `result` field. To stay robust regardless of user settings, we use
     `--output-format stream-json` and scan EVERY assistant turn for a parseable
     CritiqueResult, returning the first match.
"""

from __future__ import annotations

import asyncio
import json
import shutil
import tempfile
from pathlib import Path

from pydantic import ValidationError

from app.llm.base import CritiqueResult, prompt_for

_CLI_TIMEOUT_SECONDS = 120


class ClaudeCodeCLIProvider:
    id = "claude-cli"
    requires_api_key = False

    async def critique(self, *, image_bytes: bytes, language: str = "en") -> CritiqueResult:
        cli_path = shutil.which("claude")
        if cli_path is None:
            raise RuntimeError("claude CLI not found in PATH")

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = Path(tmp.name)

        try:
            base_prompt = prompt_for(language)
            prompt = (
                f"{base_prompt}\n\n"
                f"Image to analyze: @{tmp_path}\n"
                "Use the Read tool to view this image. Reply with ONLY the JSON object — "
                "no markdown fences, no preamble, no commentary."
            )
            proc = await asyncio.create_subprocess_exec(
                cli_path,
                "-p",
                prompt,
                "--output-format",
                "stream-json",
                "--verbose",
                "--add-dir",
                str(tmp_path.parent),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=_CLI_TIMEOUT_SECONDS
                )
            except TimeoutError as exc:
                proc.kill()
                await proc.wait()
                raise RuntimeError("claude CLI timed out") from exc

            if proc.returncode != 0:
                raise RuntimeError(
                    f"claude CLI exited {proc.returncode}: "
                    f"{stderr_bytes.decode(errors='replace')}"
                )

            assistant_texts = _collect_assistant_texts(stdout_bytes.decode())
            if not assistant_texts:
                raise RuntimeError(
                    "claude CLI produced no assistant output. stdout: "
                    f"{stdout_bytes[:300]!r}"
                )

            # Scan every assistant turn; return the first one that parses cleanly
            # as our expected schema. Hook-driven turns (e.g. "task complete") get
            # skipped because they don't have the score/composition/style fields.
            errors: list[str] = []
            for text in assistant_texts:
                cleaned = _strip_json_fences(text).strip()
                candidate = cleaned if cleaned.startswith("{") else _extract_json_object(cleaned)
                if not candidate:
                    errors.append(f"non-JSON turn: {text[:120]!r}")
                    continue
                try:
                    return CritiqueResult.model_validate_json(candidate)
                except ValidationError as exc:
                    errors.append(f"schema mismatch: {exc.errors()[:1]}")
                    continue

            joined = " | ".join(errors[:3])
            raise RuntimeError(
                f"claude CLI produced {len(assistant_texts)} assistant turns but none matched "
                f"the critique schema. Issues: {joined}"
            )
        finally:
            tmp_path.unlink(missing_ok=True)

    async def health(self) -> tuple[bool, str | None]:
        if shutil.which("claude") is None:
            return False, "claude binary not found in PATH"
        return True, None


def _collect_assistant_texts(stream_json: str) -> list[str]:
    """Extract concatenated text content from every `assistant` turn in NDJSON output."""
    texts: list[str] = []
    for line in stream_json.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if obj.get("type") != "assistant":
            continue
        # Stream-json shape: {"type": "assistant", "message": {"content": [...]}}.
        # Each content block has type=text with a `text` field.
        message = obj.get("message") or {}
        content = message.get("content") or []
        text_parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                t = block.get("text")
                if isinstance(t, str):
                    text_parts.append(t)
        if text_parts:
            texts.append("".join(text_parts))
    return texts


def _strip_json_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
    return cleaned


def _extract_json_object(text: str) -> str | None:
    """Find the first balanced `{...}` substring in `text`, ignoring braces in strings."""
    start = text.find("{")
    if start == -1:
        return None
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(text)):
        c = text[i]
        if in_string:
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == '"':
                in_string = False
            continue
        if c == '"':
            in_string = True
        elif c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None
