---
title: 'Story 1.3: One error format for every failure'
type: 'feature'
created: '2026-11-12'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Backend failures still use FastAPI's defaults (`{"detail": …}` bodies, a 500 without CORS headers, a 307 trailing-slash redirect, request-line access logs), so the frontend cannot rely on one failure shape and logs could carry request details.

**Approach:** Add the closed error-code list with fixed HTTP statuses and Norwegian messages in `contracts/`, one envelope for every failure (with the approved CORS-preflight and `HEAD` exceptions), a catch-all inside CORS with a `reference_id`, and one AR-26 log line per error reply.

## Boundaries & Constraints

**Always:**
- Every non-2xx reply the application sends has the body `{error_code, message, limit?, reference_id?}` with CORS headers; `limit` and `reference_id` appear only when set (AD-11, AR-12). Replies Uvicorn sends before a request reaches FastAPI are outside this guarantee (Decisions, Q2).
- The closed list, its HTTP statuses and messages live in `contracts/`, which imports nothing from the app.
- Unknown path → `not_found` (404); trailing-slash redirects are off, so an unmatched path with a trailing slash is also `not_found`. Unsupported method, including a plain `OPTIONS` → `method_not_allowed` (405) with the framework's `Allow` header. Malformed request or validation error → `invalid_request` (400). `not_found` and `method_not_allowed` come only from the framework.
- Every `internal_error`, wherever it arises, gets a fresh `reference_id` (8 lowercase hex) and an ERROR log line with the same id. `limit` is required for `file_too_large` and refused for every other code.
- `HEAD` replies carry status and headers only (no body, no `content-type`, length 0); CORS preflights keep the CORS middleware's standard replies.
- No reply or log line echoes a path, query, input value, exception class name, exception message, document content or secret.
- Uvicorn's access log is switched off from inside the app; Uvicorn's startup and `uvicorn.error` diagnostics stay.

**Never:**
- Change the README start command, the frontend, CI, dependencies, settings, `/api/status` behaviour or `sprint-status.yaml`.
- Add pipeline stages, uploads, byte or page limits, connectors, the pass lock or the anthropic SDK (later stories); codes beyond `not_found`, `method_not_allowed`, `invalid_request` and `internal_error` are defined but not raised by app code here.
- Re-raise an exception from the catch-all, or complete a reply that already started.
- Use anything from `architecture/technology.md` (an external reference example, not this project's architecture).
- Touch `.claude/`, `_bmad/`, `CLAUDE.md`, `.logs/` or planning documents; stage, commit or push without the developer's approval.

## Decisions (developer, 2026-11-11/12)

- **G-1 (Option A, P1, H1)** as amended in AD-11, AR-12 and this story's acceptance criteria.
- **Backend messages** (approved; Norwegian Bokmål, shown by the frontend as a detail line under its own headline and action text):

  | Code | HTTP | `message` |
  |---|---|---|
  | `unsupported_file_type` | 400 | `Bare PDF- og tekstfiler (.pdf, .txt) støttes.` |
  | `bad_text_encoding` | 400 | `Tekstfilen er ikke lagret som UTF-8.` |
  | `unreadable_file` | 400 | `PDF-filen kunne ikke åpnes.` |
  | `no_extractable_text` | 400 | `Dokumentet inneholder ingen tekst som kan hentes ut.` |
  | `invalid_request` | 400 | `Forespørselen hadde feil format.` |
  | `demo_mode_no_uploads` | 403 | `Opplasting er slått av i demomodus.` |
  | `demo_not_enabled` | 403 | `Demoen er bare tilgjengelig i demomodus.` |
  | `not_found` | 404 | `Adressen finnes ikke.` |
  | `method_not_allowed` | 405 | `Metoden støttes ikke for denne adressen.` |
  | `generation_in_progress` | 409 | `En annen generering kjører allerede.` |
  | `file_too_large` | 413 | `Dokumentet overskrider en av grensene for opplasting.` (with `limit`: `bytes`/`pages`/`characters`/`tokens`) |
  | `insufficient_content` | 422 | `KI-tjenesten fant for lite fagstoff i dokumentet.` |
  | `ai_rate_limited` | 429 | `KI-tjenesten tar imot for mange forespørsler akkurat nå.` |
  | `internal_error` | 500 | `Det oppstod en uventet feil i serveren.` (with `reference_id`) |
  | `ai_unavailable` | 502 | `KI-tjenesten svarte ikke i tide eller er utilgjengelig.` |
  | `ai_output_invalid` | 502 | `Svaret fra KI-tjenesten besto ikke valideringen.` |
  | `ai_credits_exhausted` | 503 | `Kreditten hos KI-leverandøren er brukt opp.` |
  | `session_call_limit_reached` | 503 | `Grensen for KI-kall i denne serverøkten er nådd.` |

- **Log line:** exactly one application log line per error reply on logger `app.errors`, only AR-26 fields: `stage=api code=<error_code> duration_ms=<int>`, plus `reference_id=<id>` for `internal_error` only; INFO for 4xx, ERROR for 5xx. Token counts arrive in Epic 2. `app.errors` has one stream handler with format `%(message)s`, added once however often the app is built, and propagates so pytest can capture it; no line is duplicated.
- **Access log (option B):** disable the `uvicorn.access` logger from inside the app; verified to keep startup lines and `uvicorn.error` output with the unchanged README command.
- **Trailing slash (review F1):** `redirect_slashes=False`; `GET /api/status` is unchanged.
- **Unexpected framework HTTP errors (Q1, Option A):** a framework `HTTPException` without an approved mapping becomes `internal_error` (500) with a fresh `reference_id`. This fallback never overrides malformed requests and validation errors → `invalid_request` (400), unknown paths → `not_found` (404), unsupported methods → `method_not_allowed` (405) with `Allow`, the CORS preflight behaviour, or any `AppError` code and its fixed status. No new error codes.
- **Uvicorn-generated replies (Q2, Option A):** replies Uvicorn sends before a request reaches FastAPI (a plain-text `400 Invalid HTTP request received.` for malformed HTTP; a plain-text 503 only with `--limit-concurrency`, which is not used) are a known infrastructure limitation outside the application's envelope guarantee. Uvicorn's configuration, the README command and the architecture stay unchanged.
- **Error after a reply has started (review F2, verified with Uvicorn 0.54/h11 and curl):** the catch-all logs its one `internal_error` line and returns without re-raising and without completing the reply. The client then sees a broken reply (connection cut, so the failure is visible), and Uvicorn adds its own generic `ASGI callable returned without completing response.` line with no exception details. Re-raising would print the traceback and exception message; completing the reply would make a truncated reply look successful.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Unknown path | `GET`/`POST /nope-<token>`; `GET /api/status/?q=<token>` | 404 `not_found` + CORS, no redirect | `<token>` in neither body nor log |
| Unsupported method | `POST`, plain `OPTIONS` and `HEAD` on `/api/status`; `HEAD /nope` | 405 + `Allow: GET` (404 for `/nope`) + CORS; `HEAD` replies send no body | N/A |
| Invalid request | test route: wrong parameter type; malformed JSON body | 400 `invalid_request` | input not echoed |
| App error | test route raising `AppError(code)` for each code it may raise | mapped status + exact message + CORS; `file_too_large` with `limit`; `internal_error` with `reference_id` | `limit` on other codes, or missing on `file_too_large`, is refused |
| Unexpected framework error | test route raising Starlette `HTTPException(418, detail="secret …")` | 500 `internal_error` + `reference_id` + CORS | one ERROR log line; "secret" in neither body nor log |
| Unhandled exception | test route raising `RuntimeError("secret …")` | 500 `internal_error` + `reference_id` `^[0-9a-f]{8}$` + CORS | same id on the log line; no "secret", class name or traceback |
| Error after start | streamed reply that raises after its first chunk | no second `http.response.start`, reply not completed | one `internal_error` log line, nothing sensitive |
| Preflight | allowed `Origin` on `/api/status` and `/nope`; other origin | 200 / Starlette's plain-text 400, unchanged | no envelope, no log line |
| Status | `GET /api/status` | unchanged 200 body | no log line |

</frozen-after-approval>

## Code Map

- `backend/app/application.py` -- `create_app(settings)` adds `CORSMiddleware`, then the status router. Starlette makes the last-added middleware outermost, so add the catch-all **before** `CORSMiddleware` (flow: CORS → catch-all → FastAPI exception handlers → router). `build_app`/`load_settings_or_exit` unchanged.
- `backend/app/contracts/options.py` -- pattern to follow: `Literal` types, tuples via `typing.get_args`, frozen `_Closed` models with `extra="forbid"`.
- `backend/tests/conftest.py` -- reuse `make_settings`, `demo_app`, `client`, per-test env isolation and the session guard that `app.main` is never imported. `backend/tests/test_status.py` rejected-preflight 400 assertions must keep passing.
- Framework facts (FastAPI 0.162.2, Starlette 1.10.0, Uvicorn 0.54.0 with h11), verified by probes:
  - `@app.exception_handler(Exception)` runs outside `CORSMiddleware` (its 500 has no CORS headers); the catch-all must be middleware inside CORS.
  - Starlette's 404/405 arrive as `starlette.exceptions.HTTPException`; the 405 carries `headers={"Allow": "GET"}`. Malformed JSON bodies raise `RequestValidationError`.
  - The only framework `HTTPException` statuses reachable in this app are routing 404/405 (`starlette/routing.py`, `fastapi/routing.py`) and 400 from form/multipart body parsing (`starlette/requests.py`). Authentication, `StaticFiles` and FastAPI's static frontend serving (which raise 401/404/405) are not used. App code raises `AppError`, never `HTTPException`.
  - Uvicorn itself answers some requests before the app sees them: a plain-text `400 Invalid HTTP request received.` for malformed HTTP, and a plain-text 503 only when `--limit-concurrency` is set (it is not). These replies cannot carry the envelope or CORS headers.
  - With the default `redirect_slashes=True`, `GET /api/status/?q=x` returns 307 with `location: …/api/status?q=x`.
  - Starlette's `Response` sends a body for `HEAD` (and keeps the GET content length); Uvicorn's h11 drops it, but the app must not rely on that. The test client (`httpx2`) strips `HEAD` bodies, so assert at ASGI level by capturing the sent messages.
  - `logging.getLogger("uvicorn.access").disabled = True` inside the app suppresses access lines only; Uvicorn sets no root handler, so a propagating `app.errors` produces no duplicate console lines.

## Tasks & Acceptance

**Execution:**
- [ ] `backend/app/contracts/errors.py` -- `ErrorCode` literal with the 18 codes, `HTTP_STATUS` and `MESSAGES` from the Decisions table, `LimitKind` literal, and the `ErrorResponse` model serialised without unset optional fields -- AD-11, AR-12.
- [ ] `backend/app/api/errors.py` -- `AppError(code, limit=None)`, refusing `not_found`/`method_not_allowed`, a missing `limit` on `file_too_large` and a `limit` on any other code; one shared builder that creates the reply (for `HEAD`, an empty `Response` with only the status and any `Allow` header; CORS headers are added by the middleware), adds a `reference_id` to every `internal_error` and writes the single log line; handlers for `AppError`, Starlette `HTTPException` and `RequestValidationError`, using only the mappings verified for this app: routing 404 → `not_found`, routing 405 → `method_not_allowed` keeping `Allow`, body-parsing 400 → `invalid_request` (400), `RequestValidationError` → `invalid_request` (400); these never override the fixed status of a code, the 404/405 handling or the CORS preflight exception; any other `HTTPException` status → `internal_error` (500) with a `reference_id` (Decisions, Q1); a pure ASGI catch-all that records the start time in `scope["state"]`, turns uncaught exceptions into `internal_error` before a reply starts, and after a reply starts only logs and returns (see Decisions); `configure_logging()` (disable `uvicorn.access`, one handler on `app.errors`, idempotent) -- AD-11, AR-26.
- [ ] `backend/app/application.py` -- `FastAPI(..., redirect_slashes=False)`, call `configure_logging()`, register the handlers, add the catch-all before `CORSMiddleware` -- AD-11.
- [ ] `backend/tests/test_errors.py` -- every matrix row, using test-only routes on apps from `create_app`, plus:
  - contract: the 18 codes, statuses and messages match the Decisions table exactly; `contracts/errors.py` imports nothing from the app;
  - log counts: exactly one `app.errors` record per error reply (404, 405, plain `OPTIONS`, `HEAD`, both invalid-request cases, each `AppError`, 500, error after start) and none for 2xx or either preflight; INFO for 4xx and ERROR for 5xx; records contain only the AR-26 fields;
  - logging setup: after `create_app` twice, `app.errors` has exactly one handler and one error gives one record; `uvicorn.access` is disabled while `uvicorn` and `uvicorn.error` are not;
  - `HEAD`: no `http.response.body` bytes at ASGI level;
  - sensitive data: a unique token in the path, query, parameter, JSON body and exception message appears in no reply body or log record.

**Acceptance Criteria:**
- Given the backend started with the README command, when any request fails, then the console shows no access-log line and exactly one `stage=api …` line per error reply.
- Given the existing suite, when `uv run pytest -q -W error` runs, then all previous tests still pass alongside the new ones.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

- `duration_ms` is measured from the start time the catch-all stores in `scope["state"]`; `stage` is `api` until pipeline stages exist.
- Log examples: `stage=api code=not_found duration_ms=2` · `stage=api code=internal_error duration_ms=14 reference_id=3f9c0a1b`

## Verification

**Commands:**
- `cd backend && uv sync --locked && uv run pytest -q -W error` -- expected: all pass

**Manual checks:**
- With no `backend/.env`, run the README command, then: `curl -i http://127.0.0.1:8000/nope` and `curl -i http://127.0.0.1:8000/api/status/` (404 envelopes, no redirect), `curl -i -X POST http://127.0.0.1:8000/api/status` (405 + `Allow: GET`), `curl -I http://127.0.0.1:8000/api/status` (405, no body), and a preflight with `-X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET"` (200). The server console shows no access-log lines and one `stage=api …` line per error.
- `git status`: only the files above changed; the BMAD folders are still untracked.
