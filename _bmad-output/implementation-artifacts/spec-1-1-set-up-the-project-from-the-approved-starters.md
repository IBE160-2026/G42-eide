---
title: 'Story 1.1: Set up the project from the approved starters'
type: 'chore'
created: '2026-11-10'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '4ed41064f8e6ab3f3a13052ea4b157def3d0e227'
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
- [x] `frontend/` -- run `npx create-next-app@16.4.6 frontend --ts --app --empty --eslint --no-tailwind --no-src-dir --import-alias "@/*" --use-npm --no-agents-md --no-agent-feedback --disable-git` -- the approved starter with its defaults switched off.
- [x] `frontend/app/globals.css`, `frontend/app/layout.tsx` -- add a system font stack only; no `next/font` import -- the frontend-defaults rule (tokens come in Story 1.4).
- [x] `frontend/README.md` -- delete the template README -- the root README is the only README.
- [x] `frontend/package.json`, `frontend/vitest.config.mts`, `frontend/__tests__/page.test.tsx` -- add `vitest ~5.0`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react ^16.3`, `@testing-library/dom`, `@types/node ^22`; a `test: vitest run` script; one rendering test -- AR-1.
- [x] `frontend/.env.example` -- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`, `NEXT_TELEMETRY_DISABLED=1` -- AR-23.
- [x] `backend/pyproject.toml`, `backend/.python-version`, `backend/uv.lock` -- a uv app project on Python 3.13 (`.python-version` = `3.13.7`) with the pinned runtime dependencies plus a `dev` group with pytest; pytest config (`testpaths = ["tests"]`) -- AR-1.
- [x] `backend/app/{__init__,main,config}.py`, `backend/app/{api,pipeline,connectors,contracts}/__init__.py` -- the Structural Seed; `main.py` creates a bare `FastAPI` app with no routes; `config.py` is a placeholder docstring for Story 1.2.
- [x] `backend/tests/test_app.py` -- one test that the app object imports and is a `FastAPI` instance.
- [x] `backend/.env.example` -- `AI_MODE=demo` and blank `ANTHROPIC_API_KEY=` -- AR-7.
- [x] `.github/workflows/ci.yml` -- on `pull_request`: a backend job (setup-uv with uv `0.8.15`, Python from `.python-version`, `uv sync --locked`, `uv run pytest`) and a frontend job (setup-node with Node `22.19.0`, `npm ci`, `npm test`, `npm run build`), with `NEXT_TELEMETRY_DISABLED=1` and no secrets -- AR-22. Use the current official action majors, checked at implementation.
- [x] `README.md` -- append, in Norwegian (Bokmål): requirements (uv, Python 3.13, Node 22); backend start (`cd backend`, `uv sync`, `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`); frontend start (`cd frontend`, copy `.env.example` to `.env.local`, `npm install`, `npm run dev` → `http://localhost:3000`); tests; a note that features arrive in later stories -- AR-23, C-2.

**Acceptance Criteria:**
- Given a fresh clone, when the README backend steps run, then Uvicorn serves on `127.0.0.1:8000`, and `uv run pytest` passes.
- Given a fresh clone, when `npm ci` and `npm test` run in `frontend/`, then one Vitest test passes, and `npm run dev` serves `http://localhost:3000`.
- Given the frontend source, when it is searched, then there is no `next/font`, no Tailwind, and no `experimental.agentFeedback`.
- Given the repository, when `git check-ignore` runs on `backend/.env`, `backend/.venv/` and `frontend/node_modules/`, then all three are ignored, and both `.env.example` files are not.
- Given a Pull Request, when CI runs, then both jobs pass with no secrets, using uv 0.8.15, Python 3.13.7 and Node 22.19.0, the same as local.
- Given `backend/pyproject.toml`, when inspected, then `anthropic` is absent and every runtime dependency is within its architecture range.
- Given the finished story, when `git status` is checked, then `.claude/`, `_bmad/`, `CLAUDE.md`, `.logs/` and the planning documents are unchanged.

## Implementation Notes

Approved by the developer on 2026-11-10, after the pre-implementation compatibility check:

1. **jsdom:** install `jsdom@^29.1.1`. jsdom 30 and 31 require Node ≥ 22.22.2, which conflicts with D-13 (Node 22.19.0). jsdom 29 supports `^22.13.0`.
2. **pytest import path:** besides `testpaths = ["tests"]`, set `pythonpath = ["."]` in `[tool.pytest.ini_options]` so `uv run pytest` can import `app` from `backend/`.
3. **Source search:** run the Verification grep with `--exclude-dir=node_modules --exclude-dir=.next`; otherwise it matches Next.js's own files.
4. **Linux CI:** after install, confirm `frontend/package-lock.json` lists the Linux x64 native packages (e.g. the Vite/rolldown and `@next/swc` Linux bindings) so `npm ci` works on `ubuntu-latest`. Current action majors checked on 2026-11-10: `actions/checkout@v7`, `actions/setup-node@v7`, `astral-sh/setup-uv@v10`.
5. **Starter flags:** before running create-next-app, run `npx create-next-app@16.4.6 --help` and confirm every flag in the Execution task is supported. If any is unsupported, stop and report — do not substitute flags.

Install commands (free npm/PyPI downloads only):
- `cd frontend && npm install --save-dev vitest@~5.0.5 @vitejs/plugin-react@^6.3.0 jsdom@^29.1.1 @testing-library/react@^16.3.3 @testing-library/dom@^10.4.2 @types/node@^22.20.5`
- `uv init backend --bare --python 3.13 --vcs none`, then `uv python pin 3.13.7 --directory backend`
- `uv add --directory backend "fastapi>=0.162,<0.163" "uvicorn>=0.54,<0.55" "pydantic>=2.14,<2.15" "pydantic-settings>=2.16,<2.17" "python-multipart==0.0.32" "pypdf>=6.21,<6.22"`
- `uv add --directory backend --dev "pytest>=9.1,<9.2"`

Do not run session-log commits or any `git add`/`commit`/`push` during implementation.

Implementation results (2026-11-10), pending developer review:

- **Deviation A, lockfile npm version:** the local npm 10.9.3 (bundled with Node 22.19.0) crashes in arborist (`Cannot read properties of null (reading 'edgesOut')`) when adding vitest, because vitest's optional `@vitest/browser-*` peers resolve to 5.1.x. `frontend/package-lock.json` (lockfileVersion 3) was therefore generated once with `npx npm@11` in a scratch folder. Node and the global npm were not upgraded. With this lockfile, npm 10.9.3 runs `npm ci` and `npm install` successfully. Risk: changing frontend dependencies later on npm 10.9.3 may hit the same crash.
- **Deviation B, `agentRules: false`:** even with `--no-agents-md`, `next dev` wrote `frontend/AGENTS.md` on its first run. The file was deleted, and `agentRules: false` was added to `frontend/next.config.ts` to keep it from coming back.
- **Extra fix:** the template's `frontend/.gitignore` ignored `.env*`, which also hid `.env.example`; `!.env.example` was added.
- Starter flags: `--no-tailwind`, `--no-src-dir` and `--no-agents-md` are not listed in `--help` but are handled by the 16.4.6 CLI; the starter ran with exactly the Execution flags.
- Resolved: vitest 5.0.5, vite 8.3.7, @vitejs/plugin-react 6.3.0, jsdom 29.1.1, typescript 5.9.3, next 16.4.6, react 19.3.0; fastapi 0.162.2, uvicorn 0.54.0, pydantic 2.14.3, pydantic-settings 2.16.2, python-multipart 0.0.32, pypdf 6.21.4, pytest 9.1.1. The lockfile contains the Linux x64 bindings for `@next/swc`, rolldown, lightningcss and sharp.
- Open: CI not yet run on GitHub; `npm ci` reports 8 moderate audit findings in starter dependencies (left as is).

CI correction (2026-11-10, developer-approved), after the first GitHub run:

- **First CI run (PR #7, run 42819586614, commit `abd1039`):** the frontend job passed (`npm ci`, `npm test`, `npm run build` on Node 22.19.0). The backend job failed at "Set up job" before any step ran: ``Unable to resolve action `astral-sh/setup-uv@v10`, unable to find version `v10` ``.
- **Cause:** `astral-sh/setup-uv` publishes only exact release tags (e.g. `v10.3.3`) and no floating `v10` major tag, unlike `actions/checkout` and `actions/setup-node`. The pre-implementation check in note 4 queried `git/refs/tags/v10`, which GitHub answers with a prefix match (`v10.1.0` … `v10.3.3`); the exact `git/ref/tags/v10` returns 404. The `astral-sh/setup-uv@v10` named in note 4 is therefore wrong.
- **Correction:** `.github/workflows/ci.yml` now uses `astral-sh/setup-uv@v10.3.3` (tag commit `68559e99cc807c1eb7e9238fd43a15bba460eec2`). Tool versions (uv 0.8.15, Python 3.13.7, Node 22.19.0), dependencies and lockfiles are unchanged.

## Spec Change Log

- **2026-11-10, review iteration 1 (developer-approved):** triggered by triage finding 1 (CI never builds or type-checks the Next.js app). Amended the Execution task for `.github/workflows/ci.yml` so the frontend job also runs `npm run build` after `npm test`, and added the build to Verification. Known-bad state avoided: a broken `layout.tsx` or `next.config.ts` passing CI. The developer chose a targeted patch instead of a full revert and re-derive. KEEP: all other implemented files, the committed lockfiles, the jsdom 29 pin, `pythonpath = ["."]`, `agentRules: false` and the `!.env.example` exception.

## Review Triage Log

Review iteration 1 (2026-11-10): layers blind-hunter (BH), edge-case-hunter (ECH) and verification-gap (VG), plus the orchestrator's own checks (OC). Routes await developer approval; no fixes applied.

| # | Source | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | VG, BH, ECH | CI never runs `next build` or a type check, so `layout.tsx` (global `LayoutProps`) and `next.config.ts` are unchecked | medium | `ci.yml` frontend job runs only `npm ci` and `npm test`; `page.test.tsx` imports only `app/page.tsx`. Local `npm run build` passes now (compile + TypeScript), so nothing is broken today | bad_spec (the Execution CI task lists only `npm ci`/`npm test`) |
| 2 | ECH, BH | Vitest has no `globals` or setup file, so Testing Library's automatic `cleanup()` never runs between tests | medium | RTL registers auto-cleanup only when a global `afterEach` exists; `vitest.config.mts` sets only `environment: "jsdom"`. No harm with one test; DOMs leak once Story 1.4 adds more | patch |
| 3 | OC, BH | npm 10.9.3 cannot regenerate `package-lock.json` from scratch | medium | In a scratch copy, npm 10.9.3 kept the existing lock byte-identical (`--package-lock-only`: up to date), but generating a new lock from `package.json` alone fails with `Cannot read properties of null (reading 'edgesOut')`. Caused by the npm 10.9.3 bug, not this change; a fix needs a tool upgrade (D-13) | defer |
| 4 | OC | 8 moderate npm audit findings | low | All 8 come from one advisory, GHSA-g3hv-75wg-m249 (minimatch ReDoS, `>=7.0.0 <11.0.1`), via minimatch 10.2.6 under `@typescript-eslint/typescript-estree` 8.72.2, which `eslint-config-next` 16.4.6 uses. Dev-only lint tooling, not in the app bundle or CI. No fix within approved ranges: the latest typescript-estree still requires `minimatch ^10.2.2`, and npm's only suggestion is downgrading to `eslint-config-next@15.5.29` | defer |
| 5 | VG, BH | No automated check that Uvicorn starts the app | low | `test_app.py` only checks `isinstance(app, FastAPI)`, exactly as the spec specifies; startup on 127.0.0.1:8000 was verified manually. Story 1.2 adds `httpx` and the status endpoint | defer |
| 6 | BH | README says "Node.js 22", but jsdom 29 needs ≥ 22.13 and vitest 5 needs ≥ 22.12 | low | README line reads "Node.js 22 (prosjektet bruker 22.19.0)", so the exact version is stated; harm is negligible | reject |
| 7 | BH, VG | `layout.tsx` keeps the template title and `lang="en"`; `page.tsx` shows "Hello world!" | low | The intent defers the UI shell to Story 1.4, and epic context assigns `<html lang="nb">` and `<title>AI Study Buddy</title>` there | reject |
| 8 | BH | Assertion `getByRole("main")).toBeDefined()` cannot fail | false | `getByRole` throws when no `main` exists, so the test does fail if the element is missing | reject |
| 9 | BH | CI does not enforce the tool versions | false | `setup-uv` installs exactly `0.8.15`, `setup-node` exactly `22.19.0`, and `uv python install` installs exactly `.python-version` (3.13.7) | reject |
| 10 | BH | No local pin file (`.nvmrc`, `engines`, `required-version`) | low | Versions are stated in the README, `.python-version` and `ci.yml`; adding files beyond the spec for this is more than a direct correction | reject |
| 11 | BH | README uses `npm install` instead of `npm ci` | false | The spec prescribes `npm install`; verified that npm 10.9.3 `npm install` leaves the committed lock unchanged | reject |
| 12 | BH | CI lacks a push-to-main trigger, `concurrency`, timeouts and uv cache | low | The spec sets `on: pull_request`; `setup-uv` v10 caches automatically on GitHub-hosted runners | reject |
| 13 | BH | `partialPrefetching: true` is undocumented | false | It is a create-next-app 16.4.6 template default next to `cacheComponents`; only `agentRules` was added by hand | reject |
| 14 | BH | `127.0.0.1:8000` vs `localhost:3000` needs CORS | false | The architecture topology fixes these addresses; CORS for `http://localhost:3000` belongs to the settings/app stories | reject |
| 15 | BH | `sprint-status.yaml` (in-progress) and spec (in-review) disagree | false | The workflow syncs sprint status at start and at done only; this mismatch during review is by design | reject |
| 16 | BH | `frontend/.gitignore` duplicates the root `.gitignore` | low | Template file; the duplication caused no wrong outcome after the `!.env.example` fix | reject |
| 17 | ECH | README `cp .env.example .env.local` overwrites an existing `.env.local` | low | One-time setup step as specified; unlikely in everyday use, and the guard adds complexity | reject |

Outcome of iteration 1 (developer decisions, 2026-11-10):
- **#1 fixed:** the developer approved a targeted spec amendment (see Spec Change Log) instead of a full revert; `- run: npm run build` added after `npm test` in the `ci.yml` frontend job.
- **#2 fixed:** `globals: true` added to `frontend/vitest.config.mts`. Testing Library 16.3.3 registers `afterEach(cleanup)` when a global `afterEach` exists (`dist/index.js:26`); `npm test` passes on vitest 5.0.5.
- **#3, #4, #5 deferred:** recorded in `deferred-work.md` with reasons, risks and follow-ups.
- Re-verification after the patches: `npm ci` + `npm test` 1 passed; `npm run build` compiles and type-checks; `uv sync --locked` + `uv run pytest` 1 passed; `ci.yml` parses (frontend steps `npm ci`, `npm test`, `npm run build`; no secrets); frozen spec block, the original README lines, `.claude/`, `_bmad/`, `CLAUDE.md`, `.logs/` and planning documents unchanged; nothing staged.

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
- `cd frontend && npm run build` -- expected: compiles and type-checks with no errors
- `git check-ignore -v backend/.env backend/.venv frontend/node_modules` -- expected: all matched
- `grep -rE "next/font|tailwind|agentFeedback" frontend --include=*.ts --include=*.tsx --include=*.mjs --include=*.css --include=package.json` -- expected: no matches

**Manual checks:**
- The README top section is byte-identical to the original 9 lines; the backend and frontend start at the stated addresses.
