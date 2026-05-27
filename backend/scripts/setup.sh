#!/usr/bin/env bash
set -euo pipefail

# Run from the backend/ directory.
cd "$(dirname "$0")/.."

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is not installed. Install from https://docs.astral.sh/uv/ and re-run." >&2
  exit 1
fi

echo "==> Syncing Python dependencies"
uv sync

echo "==> Backend ready."
echo "    Start with: uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
echo
echo "Model weights for CLIP / aesthetic scorer will be downloaded on first use"
echo "into \$PHOTO_SELECTOR_MODEL_CACHE_DIR (default: ~/.cache/photo-selector/models)."
