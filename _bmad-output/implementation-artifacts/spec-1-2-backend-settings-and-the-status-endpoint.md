---
title: 'Story 1.2: Backend settings and the status endpoint'
type: 'feature'
created: '2026-11-11'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '8260425cb9341a24e82fad262cde35e73a54325b'
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
- [x] `backend/pyproject.toml`, `backend/uv.lock` -- `uv add --dev "httpx2==2.16.0"` -- test client.
- [x] `backend/app/config.py` -- `Settings` with the fields above, the key as `SecretStr`, `.env` resolved relative to `backend/` (not the working directory), and a loader that refuses an invalid `AI_MODE` or `real` without a key with a dedicated error. Numeric limits, call cap, `max_tokens` and timeout must be positive (timeout finite); `ALLOWED_ORIGIN` must be one explicit `scheme://host:port` origin with no wildcard, path, query or trailing slash. Any other invalid value, and an unreadable or non-UTF-8 `.env`, refuses with the generic Norwegian message without echoing values -- AR-5, AR-6.
- [x] `backend/app/contracts/options.py` (or similar inside `contracts/`) -- `detail_level` (`brief`, `standard`, `detailed`; default `standard`), `output_language` (`nb`, `en`; default `nb`), accepted types, and Pydantic models for the status body -- AR-18, AR-24.
- [x] `backend/app/api/status.py` -- `GET /api/status` from settings and contracts -- AR-24.
- [x] `backend/app/application.py` -- `create_app(settings)` adds CORS and the status router; `load_settings_or_exit()` and `build_app()` load settings and, on refusal, exit non-zero printing only the Norwegian message -- AR-2, AR-5.
- [x] `backend/app/main.py` -- only `app = build_app()`, the module-level app the README command imports; no other logic -- AR-2.
- [x] `backend/tests/conftest.py`, `backend/tests/_fakes.py`, `backend/tests/test_app.py`, `backend/tests/test_config.py`, `backend/tests/test_status.py` -- cover every matrix row and the ACs below; an autouse fixture clears all settings variables in any letter case; settings built with `_env_file=None`; apps built with `app.application`; no test imports `app.main`.

**Acceptance Criteria:**
- Given a test run on a machine whose environment or `backend/.env` holds `AI_MODE=real` and a key, when `uv run pytest` runs, then every test still uses demo or test-only values, and no real key is read.
- Given the settings object or the refusal, when it is printed or logged, then the key value does not appear.
- Given the repository, when inspected, then no setting value is duplicated as a literal outside `config.py` and `contracts/`, and `anthropic` is absent from `pyproject.toml` and `uv.lock`.
- Given `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000` from `backend/` with no `.env`, then `GET http://127.0.0.1:8000/api/status` returns the AR-24 body with `mode: "demo"`.

## Implementation Notes

Implementation results (2026-11-11), first pass. Bullets marked *superseded* describe the state before review iteration 1 and are kept as history; the current state follows below them.

- **Dependencies:** `httpx2==2.16.0` added to the `dev` group. `uv.lock` gains `httpx2`, `httpcore2` 2.16.0 and `truststore` 0.10.5, plus a lock-only entry `httpx2-jsfetch` 1.0 (emscripten platforms only; not installed). No `anthropic`.
- *Superseded by review iteration 1 (`create_app` and `load_settings_or_exit` moved to `app/application.py`; `FAKE_KEY` moved to `tests/_fakes.py`).* **Files:** `app/config.py` (`Settings`, `load_settings`, `SettingsRefused`, the Norwegian messages), `app/contracts/options.py` (modes, option lists, defaults, accepted types, closed status models), `app/api/status.py`, `app/main.py` (`create_app`, `load_settings_or_exit`), `tests/conftest.py`, `tests/test_app.py` (rewritten), `tests/test_config.py`, `tests/test_status.py`.
- *Superseded by review iteration 1 (removed; developer chose option a).* **Deviation A, lazy module-level `app`:** `app.main.app` is created on first access through a module `__getattr__` (PEP 562), so importing `create_app` in tests never reads the environment or `backend/.env`. Uvicorn's `app.main:app` lookup works with it (verified). The alternative is moving `create_app` into its own module.
- **Deviation B, third refusal message:** any other invalid setting value (e.g. `MAX_PDF_PAGES=abc`) refuses with `Backend starter ikke: en innstilling i miljøet eller backend/.env har ugyldig verdi.`, again without echoing the value.
- *Superseded by review iteration 1 (the allowed-headers set is now pinned exactly).* **CORS headers:** Starlette always adds the CORS-safelisted headers (`Accept`, `Accept-Language`, `Content-Language`) to `access-control-allow-headers`; the test checks that `Content-Type` is included rather than the only one.
- **Sprint status:** the workflow's sync to `in-progress` in `sprint-status.yaml` was skipped by developer instruction; Story 1.2 stays `backlog` there.
- *Superseded by review iteration 1 (78-test baseline; see the triage outcome).* **Verification (orchestrator, 2026-11-11):** `uv sync --locked`; `uv run pytest -q -W error` → 31 passed, also with `AI_MODE=real` and a fake key in the OS environment and with a temporary `backend/.env` holding `real`, a fake key and a bad limit (file removed afterwards). The README command served exactly the Design Notes body on `127.0.0.1:8000`. `AI_MODE=real` with a blank key, `REAL`, `Demo` and empty each exited 1 with one Norwegian line and no key. No setting literals in app code outside `config.py` and `contracts/`; `contracts/` imports nothing from the app.
- **Observation:** when the refusal output is captured through a pipe on Windows (Git Bash), `ø` and `«»` appear garbled, because Python writes redirected stderr in the Windows code page; not yet checked in a normal terminal window. Left unchanged by developer decision (triage #15).

Current state after review iteration 1 (2026-11-11):

- **Startup design:** `app/application.py` holds `create_app(settings)`, `load_settings_or_exit()` and `build_app()`; `app/main.py` holds only `app = build_app()` for the README command. Tests import `app.application` only and never `app.main`.
- **Settings:** positive integers for limits, call cap and `max_tokens`; positive finite timeout; one explicit lower-case `http(s)://host:port` `ALLOWED_ORIGIN`. Invalid values and an unreadable or non-UTF-8 `.env` refuse with the generic Norwegian message (Deviation B, approved).
- **Tests:** `tests/conftest.py` (isolation in any letter case, `env_file` redirected), `tests/_fakes.py` (`FAKE_KEY`), `tests/test_app.py`, `tests/test_config.py`, `tests/test_status.py`. Baseline before the final verification fixes: `uv run pytest -q -W error` → 78 passed.
- **Focused verification review (2026-11-11):** one fresh read-only reviewer found no high or medium issues and three low ones, all approved for fixing: noncanonical `ALLOWED_ORIGIN` values (leading-zero port, explicit default port, non-ASCII, percent-encoded or backslash host); the `app.main` import guard checking only one moment; and these out-of-date notes.
- **Final verification fixes (2026-11-11):** `ALLOWED_ORIGIN` now also rejects leading-zero ports, the scheme's default port (80/443), non-ASCII values and `%` or `\` in the host, while `http://localhost:3000`, `http://127.0.0.1:3000`, `http://[::1]:3000` and `https://example.test:8443` stay valid. A session-scoped autouse fixture in `tests/conftest.py` fails the run if `app.main` was imported at any point. `uv run pytest -q -W error` → 88 passed, also with mixed-case hostile settings in the OS environment and with a temporary cp1252 `backend/.env` (removed afterwards); the README command served exactly the approved body.

## Spec Change Log

- **2026-11-11, review iteration 1 (developer-approved):** triggered by triage findings 1–3 (lazy `app` masks `AttributeError`, entry point untested, import-isolation test cannot detect eager loading) and 7–8 (no range or origin checks). Amended the non-frozen Execution tasks:
  - `create_app`, `load_settings_or_exit` and `build_app` move to `app/application.py`, and `app/main.py` becomes only `app = build_app()`. The lazy module `__getattr__` (Deviation A) is removed.
  - `config.py` validates positive numeric settings and one explicit `ALLOWED_ORIGIN`, and maps an unreadable or non-UTF-8 `.env` to the generic refusal (Deviation B approved).
  - Known-bad states avoided: misleading `Attribute "app" not found` errors, an unused start path, negative limits served by `/api/status`, and `ALLOWED_ORIGIN=*` opening CORS.
  - The developer chose targeted patches instead of a full revert and re-derive.
  - KEEP: settings fields and defaults, `SecretStr` key, `ENV_FILE` relative to `backend/`, the three Norwegian messages, the contracts module and status models, the status route, the CORS settings, the `httpx2==2.16.0` dependency and lockfile, and the frozen rule that tests never import `app.main`.

## Review Triage Log

Review iteration 1 (2026-11-11): blind-hunter (BH), edge-case-hunter (ECH), verification-gap (VG), plus orchestrator probes (OC). Routes await developer decisions; no fixes applied.

| # | Source | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | BH | Lazy `app` via module `__getattr__` masks any `AttributeError` raised while building the app | medium | OC probe: an `AttributeError` inside `create_app` makes Uvicorn report `Attribute "app" not found in module "app.main"` | decision (Deviation A) |
| 2 | VG, BH | The `app.main:app` entry point is not run by any test | medium | No test reads `main.app`; the old eager test was removed; wrong name, lost cache or wrong settings would pass all 31 tests | decision (Deviation A) |
| 3 | VG, BH | `test_importing_main_does_not_build_the_module_level_app` cannot detect eager loading | medium | It asserts only `main._app is None`; a restored `app = create_app(load_settings_or_exit())` still passes in CI | decision (Deviation A) |
| 4 | BH | `test_test_runs_ignore_a_real_env_file` passes trivially | medium | The temporary file is never at `ENV_FILE`, so `make_settings()` could not read it anyway; AC1 for `backend/.env` was only verified manually by OC | patch |
| 5 | VG, ECH, BH | Autouse fixture deletes only upper-case names; pydantic-settings reads names case-insensitively | low | OC probe: `ai_mode=real` is read; on Linux a lower-case variable survives the fixture | patch |
| 6 | ECH, BH | Non-UTF-8 or unreadable `backend/.env` escapes as a raw traceback | medium | OC probe: a cp1252 `.env` raises `UnicodeDecodeError`; `load_settings` catches only `ValidationError` | patch |
| 7 | ECH, BH | No range checks on limits, call cap, `max_tokens`, timeout | medium | OC probe: `MAX_PDF_PAGES=-5` and `0` load and would be served by `/api/status` | decision |
| 8 | ECH, BH | `ALLOWED_ORIGIN` accepts `*`, empty or a trailing slash | medium | OC probe: `*` loads; Starlette would then allow every origin; a trailing slash silently blocks the frontend | decision |
| 9 | ECH | `ai_provider`, `ai_effort` accept any string | low | Unused until Epic 2; validate where they are consumed | reject |
| 10 | BH | API key whitespace is not stripped | low | Only the emptiness check strips; the key is first used in Story 2.3 | reject (note for Story 2.3) |
| 11 | VG | CORS never tested with a non-default `ALLOWED_ORIGIN` | medium | All CORS tests use the default; hard-coding `http://localhost:3000` in `create_app` would pass | patch |
| 12 | VG, ECH, BH | Disallowed preflight header/method untested; allowed-headers check passes with `["*"]` | medium | Only `"content-type" in allowed_headers` is asserted; widening the policy would not fail | patch |
| 13 | ECH, BH | Rejected-origin preflight status not pinned | low | Current reply is Starlette's plain-text 400; the spec keeps it unchanged until Story 1.3 | patch |
| 14 | ECH | A CORS preflight to an unknown path returns 200 | low | OC probe: `OPTIONS /nope` preflight → 200, plain `GET /nope` → 404; `CORSMiddleware` answers preflights before routing (framework default, required by AR-2) | defer (input for G-1 and Story 1.3; not changed) |
| 15 | VG, ECH, BH | Refusal text is written in the Windows code page when stderr is redirected | low | OC: redirected bytes are correct cp1252 (`0xe5`, `0xab`); garbled only when read as UTF-8; `PYTHONUTF8=1` prints correctly; a normal console uses the Unicode console API | decision |
| 16 | BH | Exit code 1 vs Uvicorn's 3; `--reload` keeps the parent running | low | The README command uses no `--reload`; the app never serves after a refusal | reject |
| 17 | BH | `AI_MODES` is unused and duplicates the `AiMode` literal | low | Direct deletion or `get_args` derivation | patch |
| 18 | BH | Tests import `tests.conftest` as a module | low | No `tests/__init__.py`; conftest is loaded twice under two names; move `FAKE_KEY` to a helper module | patch |
| 19 | BH | `httpx2-jsfetch` and `truststore` enter the lock | low | `httpx2-jsfetch` is emscripten-only and not installed; `truststore` is used only by the test client, which makes no network calls | reject (noted) |
| 20 | BH | `httpx2==2.16.0` exact pin differs from other ranges | false | Exact pin is the developer's recorded decision | reject |
| 21 | BH | No tests pin the default 404/405 | low | G-1 is open; pinning defaults now would pre-empt that decision | reject |
| 22 | BH | `/api/status` tests thin outside the default case | low | Real-mode body, JSON content type and env-variable → status mapping are not asserted | patch |
| 23 | ECH | Tests repeat setting values as literals | false | The AC targets application code; expected values in tests are the contract check | reject |
| 24 | VG | CI does not enforce "no deprecation warning" | low | Only `httpx2` is locked, so the `httpx` warning cannot occur | reject |

Outcome of iteration 1 (developer decisions, 2026-11-11):
- **#1–3 fixed (Deviation A, option a):** `create_app`, `load_settings_or_exit` and `build_app` now live in `app/application.py`; `app/main.py` is only `app = build_app()`; the module `__getattr__` is removed. Tests import only `app.application`; `test_app.py` asserts `"app.main" not in sys.modules`, and a whole-session check confirmed `app.main` is never imported by tests. `build_app()` is tested in demo and on refusal; `app.main:app` is verified by the README command.
- **#4, #5 fixed:** the `.env` isolation test now points `Settings.model_config["env_file"]` at a temporary `.env` with `real` and the fake key (demo via `make_settings()`, `real` as positive control). The autouse fixture deletes settings variables in any letter case and also redirects `env_file` to a missing temporary file.
- **#6 fixed (Deviation B approved):** `UnicodeDecodeError`, `OSError` and `SettingsError` map to the generic refusal `from None`; tested with a cp1252 `.env`.
- **#7, #8 fixed (developer-approved validation):** positive integers for limits, call cap and `max_tokens`; positive finite timeout; `ALLOWED_ORIGIN` must be one lower-case `http(s)://host:port` origin with no path, trailing slash, query, fragment, user info, wildcard, whitespace or list. Upper-case and comma-list rejection were added by the implementer.
- **#11, #12, #13, #22 fixed:** CORS with a non-default origin; disallowed header and method preflights → 400; allowed headers pinned to `{accept, accept-language, content-language, content-type}`; rejected-origin preflight pinned to 400; full real-mode body, JSON content type and `MAX_PDF_PAGES` env → status.
- **#17, #18 fixed:** `AI_MODES` removed and option tuples derived with `get_args`; `FAKE_KEY` moved to `tests/_fakes.py`.
- **#15 unchanged (developer chose option a).** **#9, #10 rejected** with a note for Story 2.3. **#14 deferred** as input for G-1 and Story 1.3, unchanged. **#16, #19–21, #23, #24 rejected** as logged.
- **Re-verification:** `uv run pytest -q -W error` → 78 passed; also 78 with `AI_MODE=real`, a fake key, `MAX_PDF_PAGES=1` and `ALLOWED_ORIGIN=*` in the OS environment, and with a temporary cp1252 `backend/.env` holding `real` and a fake key (removed afterwards). The README command served exactly the approved body. Refusals (`real` + blank key, `REAL`, empty mode, `MAX_PDF_PAGES=-5`, timeout `nan`, origin `*`, trailing `/`, missing port, cp1252 `.env`) each exited 1 with one Norwegian line and no value echoed. Lockfile unchanged since the first review; no `anthropic`.

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
