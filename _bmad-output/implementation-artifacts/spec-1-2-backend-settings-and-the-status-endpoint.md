---
title: 'Story 1.2: Backend settings and the status endpoint'
type: 'feature'
created: '2026-11-11'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The backend has no settings and no routes, so the frontend has nowhere to read the mode, limits, options and accepted file types, and nothing stops a real-mode start without a key.

**Approach:** Add one pydantic-settings module (mode defaults to `demo`; `real` without a key refuses to start), closed option lists in `contracts/`, `GET /api/status`, and CORS for exactly `http://localhost:3000`, each covered by pytest.

## Boundaries & Constraints

**Always:**
- Settings come from the environment and `backend/.env` only: `AI_MODE` (default `demo`), `ANTHROPIC_API_KEY`, provider `anthropic`, model `claude-haiku-5-5`, effort `low`, `max_tokens` 16000, AI timeout 90 s, `max_upload_bytes` 10485760, `max_pdf_pages` 80, `max_text_chars` 200000, `max_input_tokens` 60000, call cap 20, `ALLOWED_ORIGIN` `http://localhost:3000`. No literals for these anywhere else (AR-6).
- `real` with a missing, empty or whitespace-only key refuses to start and never falls back to `demo` (AR-5).
- Option lists, defaults and accepted types live in `contracts/`, which imports nothing from the app (AR-18, AR-4).
- `/api/status` returns exactly the AR-24 shape in `snake_case`, with limits read from settings.
- The key is a secret type: never logged, printed, returned, or shown in any error, repr or test output.
- Tests never read `backend/.env` or the real environment, never import the module-level `app.main.app`, and never use a real key.

**Never:**
- Resolve G-1 (the status codes for unknown routes and unsupported methods); it stays open and needs the developer's decision.
- Add the common error envelope, error codes or exception handlers, or change the default CORS rejection reply (Story 1.3).
- Add the anthropic SDK, other routes, the pass lock, connectors or any frontend change.
- Add a new startup mechanism; the README Uvicorn command stays the only start path.
- Install any dependency other than `httpx2==2.16.0` (dev group only).
- Touch `.claude/`, `_bmad/`, `CLAUDE.md`, `.logs/`, planning documents or `sprint-status.yaml`; stage, commit or push without the developer's approval.

## Decisions (developer, 2026-11-11)

- **Test client:** `httpx2==2.16.0` in the `dev` group only (FastAPI `TestClient`). Starlette 1.10.0 prefers `httpx2` and warns on `httpx`.
- **Refusal message:** Norwegian Bokmål, clear, never containing the key.
- **Invalid `AI_MODE`:** only the exact, case-sensitive values `demo` and `real` are accepted; any other value (e.g. `reel`, `REAL`, `Demo`, empty) refuses to start with a Norwegian message and no secrets.
- **Spec length:** the full scope (settings, status, CORS, security and test isolation) stays in one story; not split.
- **Host and port:** the existing README command `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000`; no new startup mechanism.
- **CORS:** origin `ALLOWED_ORIGIN` (default `http://localhost:3000`), methods `GET` and `POST`, header `Content-Type`, no credentials.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Default mode | no `AI_MODE` | mode `demo` | N/A |
| Demo with key | `AI_MODE=demo`, key set | mode `demo`; key never shown | N/A |
| Real with key | `AI_MODE=real`, key set | mode `real` | N/A |
| Real, no key | `AI_MODE=real`; key absent, `""` or spaces | backend does not start | Norwegian message, no fallback, no key or traceback values |
| Invalid mode | `AI_MODE` = `reel`, `REAL`, `Demo` or `""` | backend does not start | Norwegian message naming the allowed values, no secrets |
| Status | `GET /api/status` | 200, exact AR-24 body | N/A |
| CORS allowed | `Origin: http://localhost:3000`, GET or preflight POST | `access-control-allow-origin: http://localhost:3000`; no allow-credentials | N/A |
| CORS other | e.g. `http://127.0.0.1:3000`, `http://evil.test` | no `access-control-allow-origin` | Starlette default (envelope is Story 1.3) |

</frozen-after-approval>

## Code Map

- `backend/app/config.py` -- placeholder docstring; becomes the settings module. Use `pydantic_settings.BaseSettings` (2.16.2: env names are case-insensitive; OS variables override `.env`; a blank variable gives `SecretStr('')`, so blank must count as missing).
- `backend/app/main.py` -- bare `FastAPI(title="AI Study Buddy")`; becomes an app factory plus the module-level `app` the README command imports.
- `backend/app/contracts/__init__.py`, `backend/app/api/__init__.py` -- docstring-only packages to fill.
- `backend/tests/test_app.py` -- imports `app.main.app`; must change, because that import would read the developer's `.env`.
- `backend/pyproject.toml`, `backend/uv.lock` -- add the dev dependency; `httpx2` brings `httpcore2==2.16.0` and `truststore>=0.10`; already-locked `anyio` 4.16.0, `idna` 3.20 and `h11` 0.16.0 satisfy it.
- `backend/.env.example` -- unchanged (`AI_MODE=demo`, blank key).
- `README.md:26` -- the start command with `--host 127.0.0.1 --port 8000`; unchanged.

## Tasks & Acceptance

**Execution:**
- [ ] `backend/pyproject.toml`, `backend/uv.lock` -- `uv add --dev "httpx2==2.16.0"` -- test client.
- [ ] `backend/app/config.py` -- `Settings` with the fields above, the key as `SecretStr`, `.env` resolved relative to `backend/` (not the working directory), and a loader that refuses an invalid `AI_MODE` or `real` without a key with a dedicated error -- AR-5, AR-6.
- [ ] `backend/app/contracts/options.py` (or similar inside `contracts/`) -- `detail_level` (`brief`, `standard`, `detailed`; default `standard`), `output_language` (`nb`, `en`; default `nb`), accepted types, and Pydantic models for the status body -- AR-18, AR-24.
- [ ] `backend/app/api/status.py` -- `GET /api/status` from settings and contracts -- AR-24.
- [ ] `backend/app/main.py` -- `create_app(settings)` adds CORS and the status router; module-level `app` loads settings and, on refusal, exits non-zero printing only the Norwegian message -- AR-2, AR-5.
- [ ] `backend/tests/conftest.py`, `backend/tests/test_app.py`, `backend/tests/test_config.py`, `backend/tests/test_status.py` -- cover every matrix row and the ACs below; an autouse fixture clears all settings variables; settings built with `_env_file=None`; apps built with `create_app`.

**Acceptance Criteria:**
- Given a test run on a machine whose environment or `backend/.env` holds `AI_MODE=real` and a key, when `uv run pytest` runs, then every test still uses demo or test-only values, and no real key is read.
- Given the settings object or the refusal, when it is printed or logged, then the key value does not appear.
- Given the repository, when inspected, then no setting value is duplicated as a literal outside `config.py` and `contracts/`, and `anthropic` is absent from `pyproject.toml` and `uv.lock`.
- Given `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000` from `backend/` with no `.env`, then `GET http://127.0.0.1:8000/api/status` returns the AR-24 body with `mode: "demo"`.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

- Proposed refusal texts (developer can adjust at Checkpoint 1):
  - missing key: `Backend starter ikke: AI_MODE=real krever en API-nøkkel i ANTHROPIC_API_KEY (backend/.env). Legg inn nøkkelen, eller bruk AI_MODE=demo.`
  - invalid mode: `Backend starter ikke: AI_MODE må være «demo» eller «real» (små bokstaver).` The rejected value is not echoed.
- Exiting with `SystemExit(message)` keeps the refusal to one clean line; a raw `ValidationError` would print a traceback with field values.
- Two separate default framework behaviours stay as they are in this story:
  - **Rejected CORS preflight:** Starlette's `CORSMiddleware` answers a disallowed origin with a plain-text 400. Bringing that reply into the common error format belongs to Story 1.3's error-envelope work.
  - **Unknown routes and unsupported methods:** FastAPI's default 404/405. Their status codes are G-1, which stays open and unchanged.
- Status body example (demo):
  `{"mode":"demo","limits":{"max_upload_bytes":10485760,"max_pdf_pages":80,"max_text_chars":200000},"options":{"detail_level":{"values":["brief","standard","detailed"],"default":"standard"},"output_language":{"values":["nb","en"],"default":"nb"}},"accepted_types":["application/pdf","text/plain"]}`

## Verification

**Commands:**
- `cd backend && uv sync --locked && uv run pytest` -- expected: all pass, with no httpx deprecation warning
- `grep -rn "anthropic" backend/pyproject.toml backend/uv.lock` -- expected: no matches
- `grep -n "uvicorn app.main:app --host 127.0.0.1 --port 8000" README.md` -- expected: one match

**Manual checks:**
- From `backend/` with no `.env`, run the README command, then `curl http://127.0.0.1:8000/api/status` -- the demo body above. With `AI_MODE=real` and a blank key, the same command exits non-zero, printing only the Norwegian message.
- `git status`: only the files above changed; the BMAD folders are still untracked.
