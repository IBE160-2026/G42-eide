# Story 1.2 backend settings and status endpoint

## 2026-11-11 kl. 19:48 — Amma Kwaasi-Eide

> **Type of record:** a retrospective summary written by Claude Code at the end of the work. It is **not** a verbatim transcript; prompts are paraphrased. The authoritative record is the Story 1.2 spec (its frozen Decisions, Implementation Notes, Spec Change Log and Review Triage Log) together with commit `c9ea05b`.

### Task
Implement Story 1.2 ("Backend settings and the status endpoint") with the installed `bmad-build` workflow, on branch `story/1-2-backend-settings-status` from `main` at `c2248df`. The developer asked for a read-only readiness check first, then approval at every stage: spec planning, implementation, two review rounds, fixes and one local commit. No Story 1.3 work (common error format), no Epic 2 work (Anthropic SDK), G-1 left open, no frontend changes, no `sprint-status.yaml` change until the final checkpoint, and no push or pull request.

### Plan
- Context from the same session: after Story 1.1's commits, the setup-uv tag was fixed (`b5bad4e`, `astral-sh/setup-uv@v10.3.3`), PR #7 was merged (`662ec0b`), Story 1.1 was closed out in PR #8 (`3af502f`, merged as `c2248df`). Those steps are recorded in the Story 1.1 spec, PR #7 and PR #8; this log covers Story 1.2.
- Readiness check (read-only): Story 1.2 acceptance criteria in `epics.md`, architecture AD-3, AD-4, AD-6, AD-17 and the Endpoints convention, the Epic 1 context, `deferred-work.md` and G-1.
- Developer decisions before planning: `httpx2==2.16.0` as a dev-only test client (Starlette 1.10.0 prefers it over `httpx`); a Norwegian refusal message without the key; the existing README Uvicorn command as the only start path; CORS with GET, POST, `Content-Type` and no credentials.
- Spec planning (`bmad-build` step 2): one open question answered — only the exact, case-sensitive values `demo` and `real` are accepted for `AI_MODE`; omitted means `demo`; empty, invalid or wrongly capitalised values refuse to start. The developer kept the full scope (about 2,500 tokens, over the 1,600 guideline). Spec approved as `ready-for-dev` and committed alone (`8260425`).
- Implementation by a fresh subagent from the spec, then three fresh review subagents (blind hunter, edge-case hunter, verification gap), developer-approved fixes, and one focused, fresh, read-only verification reviewer with three low fixes.
- Plan document: [spec-1-2-backend-settings-and-the-status-endpoint.md](../../_bmad-output/implementation-artifacts/spec-1-2-backend-settings-and-the-status-endpoint.md); context: [epic-1-context.md](../../_bmad-output/implementation-artifacts/epic-1-context.md)

### Result
- **Implemented (commit `c9ea05b`, "feat: implement Story 1.2 backend settings and status endpoint", 14 files, local only):**
  - `backend/app/config.py`: one pydantic-settings module with the architecture defaults (model `claude-haiku-5-5`, effort `low`, `max_tokens` 16000, timeout 90 s, 10,485,760 bytes, 80 pages, 200,000 characters, 60,000 input tokens, call cap 20, `ALLOWED_ORIGIN` `http://localhost:3000`). The key is a `SecretStr`; `.env` is resolved relative to `backend/`.
  - Refusals, each one Norwegian line with exit code 1 and no value echoed: `real` with a missing, empty or whitespace key; an invalid `AI_MODE`; and a generic message for any other invalid setting, including non-positive limits, a non-finite timeout, a non-canonical `ALLOWED_ORIGIN`, and an unreadable or non-UTF-8 `.env`.
  - `backend/app/contracts/options.py`: option lists and defaults (`brief | standard | detailed`, default `standard`; `nb | en`, default `nb`), accepted types and closed status models; imports nothing from the app.
  - `backend/app/api/status.py`: `GET /api/status`, returning exactly the AR-24 body.
  - `backend/app/application.py`: `create_app` with CORS for exactly `ALLOWED_ORIGIN` (GET, POST, `Content-Type`, no credentials), `load_settings_or_exit` and `build_app`. `backend/app/main.py` holds only `app = build_app()`.
  - Tests: `conftest.py` (clears settings variables in any letter case, redirects `env_file`, and fails the session if `app.main` is imported), `_fakes.py`, `test_app.py`, `test_config.py`, `test_status.py`.
  - `pyproject.toml` and `uv.lock`: `httpx2==2.16.0` in the dev group, with `httpcore2` 2.16.0, `truststore` 0.10.5 and a lock-only `httpx2-jsfetch` entry (emscripten only, not installed). No `anthropic`.
  - Spec marked `done`; Story 1.2 set to `review` in `sprint-status.yaml` (Epic 1 stays `in-progress`; `last_updated` left unchanged).
- **Architecture decisions and approved deviations:**
  - Deviation A (lazy module-level `app` through a module `__getattr__`) was **rejected after review** and replaced by option a: `app/application.py` plus a one-line `app/main.py`, because the lazy version hid `AttributeError`s behind Uvicorn's `Attribute "app" not found`.
  - Deviation B (a generic Norwegian refusal for any other invalid setting) was **approved**, including unreadable or wrongly encoded `.env` files.
  - Settings validation beyond the original spec was **approved** after review: positive numeric settings, a finite timeout, and one explicit lower-case `http(s)://host:port` origin with no wildcard, path, trailing slash, query, fragment, user info, list, leading-zero port, default port, non-ASCII host, `%` or `\`.
  - Windows encoding left unchanged (developer option a): when stderr is redirected, Python writes the message in cp1252, which only looks garbled when read as UTF-8.
- **Review round 1 (three fresh subagents): 24 findings, no high.**
  - Fixed (developer-approved): the lazy `app` (1–3), the trivial `.env` isolation test (4), lower-case variable isolation (5), the non-UTF-8 `.env` traceback (6), missing range and origin checks (7, 8), loose CORS tests (11–13), thin status tests (22), an unused duplicate list (17) and conftest imported as a module (18).
  - Unchanged by decision: 15 (encoding). Deferred: 14 (a CORS preflight to an unknown path returns 200, a Starlette default; input for G-1 and Story 1.3). Rejected with evidence: 9, 10 (noted for Story 2.3), 16, 19–21, 23, 24.
  - Process note: one reviewer briefly created and deleted a scratch file `backend/out_dummy` despite the read-only instruction; no file was left behind.
- **Focused verification review (one fresh read-only reviewer): no high or medium findings; three low, all fixed:** non-canonical origins accepted, the `app.main` import guard checking only one moment (now a session-end check), and out-of-date spec notes (now marked superseded, with a current-state section).
- **Final verification (2026-11-11):** `uv run pytest -q -W error` → **88 passed**; also 88 with mixed-case `real`, a fake key, a bad limit and a bad origin in the OS environment, and 88 with a temporary cp1252 `backend/.env` holding `real` and a fake key (removed afterwards). The README command `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000` served exactly the approved `/api/status` body. Every refusal case exited 1 with one Norwegian line. No setting literals in app code outside `config.py` and `contracts/`. The spec's frozen section is identical to the approved commit `8260425`.
- **Commits on the branch:** `8260425` (approved spec) and `c9ea05b` (implementation, tests, dependency, spec `done`, sprint status `review`). Secret scan of the staged diff found only the test placeholder key.
- **Unchanged:** frontend, README, CI, planning documents, `deferred-work.md`, `issues.md`, `CLAUDE.md`, and the 29 untracked BMAD skill folders and `_bmad/` (234 files unchanged).
- **Not done:** no push, no pull request, no merge, Story 1.3 not started, no paid API calls.
- Closed in `issues.md`: the 2026-11-10 item "Backend HTTP test deferred to Story 1.2", now covered by `TestClient` tests of `GET /api/status`. The G-1 item gained the CORS preflight observation and stays open.

### Open items
- **CI for Story 1.2 not yet run on GitHub.** Confirm both jobs pass on the Story 1.2 Pull Request (the backend job now also installs `httpx2`).
- **G-1 (still unresolved):** HTTP status for unknown routes and unsupported methods; decide before Story 1.3. New input: a CORS preflight to an unknown path returns 200 from Starlette's CORS middleware, while a plain request returns 404.
- **Story 1.3:** bring Starlette's plain-text 400 for rejected CORS preflights into the common error format.
- **Story 2.3:** strip whitespace around the API key before use, and validate `ai_provider` and `ai_effort` where they are consumed.
- **Windows encoding (accepted, low):** the refusal text appears garbled only when redirected stderr is read as UTF-8 (for example Git Bash); `PYTHONUTF8=1` prints it cleanly.
- Still open (unchanged): npm 10 lockfile generation, the minimatch advisory, G-2 to G-5, U-1, U-2, DD-1 and the remaining 2026-10-27 items.
