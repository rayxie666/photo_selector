# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
# photo_selector

## Architecture

Photo Selector is a two-process app:

- **Frontend** (`/`): React 19 + TypeScript + Vite. Handles all UI and on-device pixel analysis (Stage 1 technical filters).
- **Backend** (`/backend`): Local FastAPI service for AI features — aesthetic ranking (Stage 2), CLIP similarity clustering (Stage 3), and LLM provider routing (OpenAI / Anthropic / Google / local Claude Code CLI).

Both run on `localhost` only; the frontend talks to the backend via a Vite proxy mounted at `/api`.

## Frontend

```bash
npm install
npm run dev    # http://localhost:5173
```

## Backend

Prerequisites: [uv](https://docs.astral.sh/uv/) and Python ≥ 3.11.

```bash
cd backend
./scripts/setup.sh
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend health: `curl http://localhost:8000/api/health`

Model weights for CLIP / aesthetic scorer are downloaded on first use to `~/.cache/photo-selector/models` (override with `PHOTO_SELECTOR_MODEL_CACHE_DIR`).

## Pipeline (designed; see `openspec/changes/ai-curated-selection-pipeline/`)

1. **Stage 1 — Technical filter** (frontend): rejects overexposed / blurry / gray-flat / pure-black photos
2. **Stage 2 — Aesthetic ranking** (backend): local LAION-Aesthetic scorer + optional LLM critique for Top-K
3. **Stage 3 — Similarity PK** (backend + frontend): CLIP + DBSCAN clusters burst groups; user resolves each cluster via side-by-side comparison with synchronized zoom

Rejected photos are soft-deleted into per-stage buckets and can be one-click restored.
