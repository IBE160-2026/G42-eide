---
title: 'Story 1.1: Set up the project from the approved starters'
type: 'chore'
created: '2026-11-10'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The repository has planning documents but no application. Every later story needs a runnable, tested, safely configured frontend and backend with CI.

**Approach:** Create `frontend/` with `create-next-app` 16.4.x and `backend/` as a uv project on Python 3.13, each with one passing test. Add example env files and a GitHub Actions workflow that runs both test suites with no key. Extend the existing README with run instructions.

## Boundaries & Constraints

**Always:**
- Stay within the architecture Stack versions. Pin `vitest` to 5.0.x, `typescript` to 5.x, `pypdf` to 6.21.x, `pytest` to 9.1.x, `python-multipart` to 0.0.32, FastAPI to 0.162.x, Uvicorn to 0.54.x, Pydantic to 2.14.x and pydantic-settings to 2.16.x. Newer majors exist (TypeScript 7, pypdf 7) and must not be used.
- Commit lockfiles (`uv.lock`, `frontend/package-lock.json`).
- The CI uses the same uv, Python and Node versions as local development, and has no secrets or API key.
- Keep the existing Norwegian README heading, course text and member list unchanged at the top. Only add sections below them.
- The README makes no claim that demo results come from a real AI run (C-2).

**Never:**
- Add the anthropic SDK (Story 2.3).
- Add routes, settings logic, a status endpoint or a UI shell (Stories 1.2 and 1.4).
- Upgrade uv, Python or Node.
- Use `next/font/google`, Tailwind or a component library.
- Commit `.env` files or secrets.
- Touch `.claude/`, `_bmad/`, `CLAUDE.md`, `.logs/` or the planning documents.
- Stage, commit or push without the developer's approval.

## Decisions (developer, 2026-11-10)

- **D-13 (tool versions):** keep the current versions: uv **0.8.15**, Python **3.13.7**, Node **22.19.0**. No updates. CI pins exactly these versions (`backend/.python-version` = `3.13.7`).
- **README language:** the new README sections are written in **Norwegian (Bokmål)**. Commands, paths, file names and code stay verbatim.
- **Scope:** keep the full Story 1.1 spec, including CI and the README, even though it exceeds the 1,600-token guideline. Nothing is split into other stories.

</frozen-after-approval>

## Code Map

- `README.md` -- existing course/group README (9 lines, Norwegian). Append only.
- `.gitignore` -- already ignores `.env`/`.env.*` (keeps `*.example`), `.venv/`, `node_modules/`, `.next/`, `next-env.d.ts`, caches, `_bmad/render/`. Verify; change only if something is missing.
- `create-next-app@16.4.6` -- installs `typescript ^5`, `@types/node ^20`, `@types/react ^19`. Defaults to Tailwind, ESLint, Cache Components, an `AGENTS.md` file and agent feedback (`experimental.agentFeedback`). The template layout imports `next/font/google` (Geist), but the `--empty` template has no font import.
- `vitest@5.0.x` -- needs `@types/node` ^22, so raise the template's `^20`. `@vitejs/plugin-react@6.x` needs vite ^8 (vitest 5 accepts 8).
- `.github/` -- does not exist yet.
- `_bmad-output/implementation-artifacts/sprint-status.yaml` -- updated only by the Build workflow's status sync.

## Tasks & Acceptance

**Execution:**
- [ ] `frontend/` -- run `npx create-next-app@16.4.6 frontend --ts --app --empty --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm --no-agents-md --no-agent-feedback --disable-git` -- the approved starter with its defaults switched off.
- [ ] `frontend/app/globals.css`, `frontend/app/layout.tsx` -- add a system font stack only; no `next/font` import -- the frontend-defaults rule (tokens come in Story 1.4).
- [ ] `frontend/README.md` -- delete the template README -- the root README is the only README.
- [ ] `frontend/package.json`, `frontend/vitest.config.mts`, `frontend/__tests__/page.test.tsx` -- add `vitest ~5.0`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react ^16.3`, `@testing-library/dom`, `@types/node ^22`; a `test: vitest run` script; one rendering test -- AR-1.
- [ ] `frontend/.env.example` -- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`, `NEXT_TELEMETRY_DISABLED=1` -- AR-23.
- [ ] `backend/pyproject.toml`, `backend/.python-version`, `backend/uv.lock` -- a uv app project on Python 3.13 (`.python-version` = `3.13.7`) with the pinned runtime dependencies plus a `dev` group with pytest; pytest config (`testpaths = ["tests"]`) -- AR-1.
- [ ] `backend/app/{__init__,main,config}.py`, `backend/app/{api,pipeline,connectors,contracts}/__init__.py` -- the Structural Seed; `main.py` creates a bare `FastAPI` app with no routes; `config.py` is a placeholder docstring for Story 1.2.
- [ ] `backend/tests/test_app.py` -- one test that the app object imports and is a `FastAPI` instance.
- [ ] `backend/.env.example` -- `AI_MODE=demo` and blank `ANTHROPIC_API_KEY=` -- AR-7.
- [ ] `.github/workflows/ci.yml` -- on `pull_request`: a backend job (setup-uv with uv `0.8.15`, Python from `.python-version`, `uv sync --locked`, `uv run pytest`) and a frontend job (setup-node with Node `22.19.0`, `npm ci`, `npm test`), with `NEXT_TELEMETRY_DISABLED=1` and no secrets -- AR-22. Use the current official action majors, checked at implementation.
- [ ] `README.md` -- append, in Norwegian (Bokmål): requirements (uv, Python 3.13, Node 22); backend start (`cd backend`, `uv sync`, `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`); frontend start (`cd frontend`, copy `.env.example` to `.env.local`, `npm install`, `npm run dev` → `http://localhost:3000`); tests; a note that features arrive in later stories -- AR-23, C-2.

**Acceptance Criteria:**
- Given a fresh clone, when the README backend steps run, then Uvicorn serves on `127.0.0.1:8000`, and `uv run pytest` passes.
- Given a fresh clone, when `npm ci` and `npm test` run in `frontend/`, then one Vitest test passes, and `npm run dev` serves `http://localhost:3000`.
- Given the frontend source, when it is searched, then there is no `next/font`, no Tailwind, and no `experimental.agentFeedback`.
- Given the repository, when `git check-ignore` runs on `backend/.env`, `backend/.venv/` and `frontend/node_modules/`, then all three are ignored, and both `.env.example` files are not.
- Given a Pull Request, when CI runs, then both jobs pass with no secrets, using uv 0.8.15, Python 3.13.7 and Node 22.19.0, the same as local.
- Given `backend/pyproject.toml`, when inspected, then `anthropic` is absent and every runtime dependency is within its architecture range.
- Given the finished story, when `git status` is checked, then `.claude/`, `_bmad/`, `CLAUDE.md`, `.logs/` and the planning documents are unchanged.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

- Decisions made by the agent (developer can override at Checkpoint 1):
  - `--empty` avoids Vercel boilerplate and the Geist font import.
  - `--no-tailwind`, because UX builds components from DESIGN.md tokens.
  - ESLint is kept as the template linter but not run in CI (not required).
  - `--no-agents-md` avoids an unreviewed agent-instruction file.
  - The Cache Components default is kept (no effect on a client-side page).
  - The key variable is named `ANTHROPIC_API_KEY`.
  - The backend smoke test needs no HTTP client (`httpx` arrives with Story 1.2).
- Network downloads (npm, uv) are needed during implementation; they are free, and no paid API calls are made.

## Verification

**Commands:**
- `cd backend && uv sync --locked && uv run pytest` -- expected: 1 passed
- `cd frontend && npm ci && npm test` -- expected: 1 passed
- `git check-ignore -v backend/.env backend/.venv frontend/node_modules` -- expected: all matched
- `grep -rE "next/font|tailwind|agentFeedback" frontend --include=*.ts --include=*.tsx --include=*.mjs --include=*.css --include=package.json` -- expected: no matches

**Manual checks:**
- The README top section is byte-identical to the original 9 lines; the backend and frontend start at the stated addresses.
