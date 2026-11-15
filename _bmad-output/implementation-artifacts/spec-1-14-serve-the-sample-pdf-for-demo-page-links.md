---
title: 'Story 1.14: Serve the sample PDF for demo page links'
type: 'feature'
created: '2026-11-15'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<!-- APPROVED at Checkpoint 66 (G0) by the developer on 2026-11-15 (revision 3). The block below is frozen: only the developer can change it. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** demo page links (Story 1.17, UX-DR-27) must open the bundled sample lecture at a cited page, offline, from the local backend: `<NEXT_PUBLIC_API_BASE_URL>/api/demo/sample.pdf#page=N`. The sample PDF (Story 1.12) and `POST /api/demo` (Story 1.13) exist, but no route serves the PDF itself.

**Approach:** one fixed, read-only route `GET /api/demo/sample.pdf` in `backend/app/api/demo.py`. In demo mode it reads the same file `POST /api/demo` processes (`app.state.demo_sample_pdf`) on every request and returns its exact bytes in a plain `Response` with `Content-Type: application/pdf` and `Content-Disposition: inline`. In real mode it refuses with `demo_not_enabled` (403) before touching any file. A missing or unreadable file becomes `internal_error` (500) through the existing catch-all. Everything else (unknown paths 404, other methods including `HEAD` 405, CORS preflights) is left to the existing AD-11 handling, which already does what the acceptance criteria require. No new error code, setting, dependency, header policy, documentation change or frontend code.

**Out of scope:** the demo start screen (Story 1.15), the page-link and summary UI (Story 1.17), `POST /api/generate` and real-mode object-URL links (Story 2.1 and Epic 2), the cost gate and paid-call counter (Story 2.2), the real connector (Story 2.3) and the final real-run fixture (Stories 3.1–3.3).

## Boundaries & Constraints

**Always:**
- **One fixed route, one fixed file:** the only new route is `GET /api/demo/sample.pdf`. It takes no path parameter and reads no query parameter, header or body. The file it serves is `app.state.demo_sample_pdf`, the same `Path` object `POST /api/demo` reads, set once at startup from `SAMPLES_DIR / SAMPLE_PDF` (Story 1.13, D3). No static-file mount, no `FileResponse`, no file name or path built from request data.
- **Exact bytes:** the body is `state.demo_sample_pdf.read_bytes()`, read on every request, unchanged.
- **Existing contracts:** the AD-11 envelope, the closed error list, `MESSAGES`, `HTTP_STATUS`, the handlers and `CatchAllMiddleware` stay exactly as they are. The route raises only `AppError("demo_not_enabled")`; any `OSError` from reading propagates to the catch-all.
- **Sync endpoint:** a plain `def`, so the file read runs in FastAPI's thread pool, not on the event loop.
- **Independent of the pass:** the route never touches `app.state.pass_guard`, `app.state.demo_runner`, a `PassRunner`, any pipeline stage or any connector, and creates no provider client.
- **No content in logs:** the route adds no log line. Success logs nothing; failures keep the existing single code-only error line, which never contains the file path, file name or exception text (AR-26, 1.8-R4).

**Ask First:**
- Any extra response header (for example `Cache-Control`, `X-Content-Type-Options`, a `filename` in `Content-Disposition`, `Accept-Ranges` or `ETag`), any change to the existing FastAPI documentation routes (D15), or any README or `PROVENANCE.md` change (OQ1).

**Never:**
- Changes to `backend/app/api/errors.py`, `backend/app/application.py`, `backend/app/samples.py`, `backend/app/main.py`, `backend/app/config.py`, `backend/app/pipeline/`, `backend/app/contracts/`, `backend/app/connectors/`, `backend/pyproject.toml`, `backend/uv.lock` or any frontend file.
- Changes to `samples/` (the PDF, its sources, the fixtures, `PROVENANCE.md`), `README.md`, or any existing test file.
- A new error code, setting, dependency or route other than `GET /api/demo/sample.pdf`.
- `_bmad-output/planning-artifacts/architecture/technology.md` as a source.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| `epics.md:793-824`, Story 1.14 AC 1 | demo: bytes identical to the sample `POST /api/demo` processes, `application/pdf`, `Content-Disposition: inline` | D2–D4; rows S1–S5 |
| Story 1.14 AC 2 | real mode: `demo_not_enabled` (403) | D5; rows R1–R3, Q2 |
| Story 1.14 AC 3 | missing sample: `internal_error` (500) via the catch-all | D6; rows F1–F3 |
| Story 1.14 AC 4 | no other file reachable by query or path; a path matching no route gets 404 `not_found` | D7–D9; rows Q1–Q2, P1–P4 |
| Story 1.14 AC 5 | other methods incl. `HEAD`: 405 `method_not_allowed`, `Allow: GET`; `HEAD` headers only; preflights by CORS middleware | D10; rows M1–M4 |
| Story 1.14 AC 6 | no pass lock, no paid call, no provider client | D11; rows I1–I4 (paid call: see D11 and B1) |
| Story 1.14 AC 7 | pytest covers each case | the matrix; Tasks |
| AR-14, AD-13 | GET only, demo only, read-only, one fixed committed file, no path parameter, no query input, existing AD-11 codes only; link format `…/api/demo/sample.pdf#page=N` (top-level navigation; the fragment is client-side, see "Page-link format") | D1–D11; rows Q1, P1–P4 |
| AD-11 | unknown route 404, unsupported method 405 with `Allow`, `HEAD` headers only, preflight exception, error envelope and code-only log | D6, D9, D10; rows P1–P3 (404), M1, M2, M4 (405, `HEAD`), M3 (preflight exception), R1, F1–F2 (envelope) |
| AR-21, AD-20 layer 1 | `GET /api/demo/sample.pdf` pytest cases | the matrix |
| AR-26 | one code-only log line per error reply, nothing on success | rows R1, F1–F2, M1, M2 (exactly one code-only line); L1 (nothing on success) |

## Decisions

Directions given by the developer at Checkpoint 61 (D1–D15) and review decisions at Checkpoint 63 (2026-11-15).

- **D1 — one fixed route:** `GET /api/demo/sample.pdf`, added to the existing `router` in `backend/app/api/demo.py`, which `create_app` already includes.
- **D2 — same file as the demo pass:** the route serves `app.state.demo_sample_pdf`, the attribute `POST /api/demo` reads before calling `run_pass(doc, …)`. The "identical bytes" criterion therefore holds by construction and is also tested against the bytes the pass actually receives (row S2). The PDF is stored as binary (`.gitattributes`: `*.pdf binary`), so line-ending conversion cannot change it.
- **D3 — sync, read per request, plain `Response`:** `def get_sample_pdf(request: Request) -> Response`; the bytes are read on every request (a replaced or corrected sample needs no restart, and a missing file shows as a clear 500). A plain `Response`, not Starlette's `FileResponse`, so there are no `Range`/206 partial replies, no `Accept-Ranges`, `ETag` or `Last-Modified` headers, and no file stat after the reply has been chosen.
- **D4 — success reply:** 200; `Content-Type: application/pdf` exactly (no charset parameter); `Content-Disposition: inline` exactly (no `filename`); the exact bytes; `Content-Length` equal to the byte count (set by `Response`).
- **D5 — real mode first (OQ2 resolved):** if `request.app.state.demo_sample_pdf is None`, raise `AppError("demo_not_enabled")` (403) before any file access. This deliberately differs from `POST /api/demo`, whose precondition checks `state.demo_runner is None`: each route depends only on the state it uses. `create_app` sets both attributes together (both set in demo mode, both `None` in real mode; row R3 pins this), so the two routes always agree in a real app. No extra defensive cross-check is added: only a test that edits one attribute alone could make them disagree, and no requirement asks for a guard against that.
- **D6 — installation faults:** a missing or unreadable file raises `OSError` from `read_bytes()`; it is not caught in the route, so `CatchAllMiddleware` returns `internal_error` (500) with a `reference_id` and writes its one code-only ERROR line. This is the existing Story 1.13 D14 behaviour for `POST /api/demo`.
- **D7 — no query influence:** the endpoint does not declare or read any query parameter; FastAPI therefore ignores every query string.
- **D8 — no path parameter, no static mount:** the route path is a literal; no `StaticFiles`, no `{name}` segment, no path built from the request.
- **D9 — path matching (corrected at Checkpoint 63, A1):** Starlette routes on the **decoded** ASGI `scope["path"]` and does not use `raw_path`. Its route pattern ends in `$`, which in Python also matches before one trailing newline. Therefore:
  - a request whose decoded path is `/api/demo/sample.pdf` reaches this route, including percent-encoded forms that decode to it, such as `/api/demo%2Fsample.pdf`, `/api/demo/sample%2Epdf` and a trailing `%0A` (`/api/demo/sample.pdf%0A`); these return the same fixed bytes as the plain path (row P4). The existing `/api/status` already behaves the same way;
  - every other decoded path (different case, trailing slash, `..` or `.` segments, a doubled slash, a NUL, a `;` parameter, another file name) matches no route and gets the existing AD-11 `not_found` (404) (rows P1–P3); `redirect_slashes=False` is already set.

  These are application-level facts. Whether a real server (uvicorn) accepts, rejects or normalises such a request line before the app sees it is not claimed here. Either way, the only file the route can return is the fixed sample.
- **D10 — methods:** the route is declared for `GET` only. FastAPI's `APIRoute` does not add `HEAD` to a `GET` route, so every other method, including `HEAD` and a plain `OPTIONS`, gets the existing `method_not_allowed` (405) with `Allow: GET`; a `HEAD` reply has status and headers only (`errors.py:89-91`). CORS preflights are answered by the existing `CORSMiddleware` before routing. Method handling comes before the endpoint, so a wrong method gets 405 in both modes.
- **D11 — isolation:** no pass lock, no pipeline, no connector, no provider client and no outbound network. **Paid calls (B1):** no paid-call counter exists yet (it arrives in Story 2.2, `pass_guard.py`), so this story cannot increment one; the route calls nothing that will count. Story 2.2 gets the duty to assert that `GET /api/demo/sample.pdf` leaves its counter unchanged (see "Dependencies & deferred work").
- **D12 — no optional headers (A4):** the endpoint adds only `Content-Type` and `Content-Disposition`; no `Cache-Control`, `X-Content-Type-Options` or other header. Headers the framework and the existing middleware already produce are permitted: `content-length`, `vary: Origin` (on every reply from `CORSMiddleware`), and `access-control-allow-origin` when the allowed `Origin` is sent. Tests assert the required headers and the absence of forbidden ones, never an exhaustive header set.
- **D13 — minimal change:** only `backend/app/api/demo.py` changes in production code (the new endpoint, the `Response` import, and a module docstring that now describes both routes). `application.py` already includes the router and wires `state.demo_sample_pdf`.
- **D14 — backend only:** no frontend code. Story 1.17 builds the links.
- **D15 — FastAPI documentation routes (A7, OQ4 resolved):** `create_app` and `main.py` do not set `docs_url`, `redoc_url` or `openapi_url`, so four framework routes are registered today: `/openapi.json`, `/docs`, `/docs/oauth2-redirect` and `/redoc`. Each accepts `GET` and `HEAD` (the review probe got `HEAD /docs` → 200 with an HTML `content-type`), and each returns content outside the AD-11 envelope. This is a genuine, **pre-existing** conflict with AD-11 ("no route accepts `HEAD`"; one closed set of API replies), dating from Stories 1.2–1.3, not introduced here; `/openapi.json` will also list the new route. This story does not change these routes and does not approve them. At closeout, one `issues.md` item is proposed for the developer's review (text under "Dependencies & deferred work").
- **D16 — no documentation change (OQ1 resolved):** no README or `PROVENANCE.md` change in this story. Serving the file changes neither its origin nor its permitted use; any user-facing note can be added later with the demo UI.

## Route (`GET /api/demo/sample.pdf`, `backend/app/api/demo.py`)

```python
@router.get("/api/demo/sample.pdf")
def get_sample_pdf(request: Request) -> Response:
    sample = request.app.state.demo_sample_pdf
    if sample is None:
        raise AppError("demo_not_enabled")
    return Response(
        content=sample.read_bytes(),
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"},
    )
```

Illustrative, not binding on formatting. The module docstring becomes "``POST /api/demo`` and ``GET /api/demo/sample.pdf``" with one short paragraph on the GET route (D2–D6, D11).

## Why no other file can be served

- The only input that selects a file is a constant set at startup (`SAMPLES_DIR / SAMPLE_PDF`); nothing from the request (path, query, headers, body) reaches it.
- Routing compares the decoded path with one literal route; there is no path parameter or static mount to traverse. A request either matches the literal (including encoded forms that decode to it, D9) and gets the same fixed bytes, or matches nothing and gets 404. No request can name another file.
- Real mode never reads the file (D5), and the route never lists a directory.

## Page-link format

Story 1.17 builds demo links as `<NEXT_PUBLIC_API_BASE_URL>/api/demo/sample.pdf#page=N`, opened in a new tab with `rel="noopener"`. The `#page=N` fragment is handled by the browser's PDF viewer and is never sent to the server, so this story needs no backend test for it.

## Approval gates

- **G0:** this spec approved and frozen; the spec commit on branch `story/1-14-serve-the-sample-pdf-for-demo-page-links`.
- **G1 — code and tests:** the endpoint and `backend/tests/test_demo_sample_pdf.py`; the backend suite passes, also with `-W error`.
- **G2 — commit:** the usual approval of the exact staged file list.

## I/O & Edge-Case Matrix

Unless a row says otherwise:
- **App:** `create_app(make_settings())` (demo mode), entered with `with TestClient(app, headers={"Origin": <allowed origin>}) as client`; real mode uses `make_settings(ai_mode="real", anthropic_api_key=<test placeholder>)`. Each test builds its own app.
- **Sample:** the committed `samples/innkjop-og-lager.pdf` (pinned SHA-256 `2e831fac413529b552fe97dae13b58f41947d2e99f41b306a3e3cd8686f45e63`, 471,258 bytes; both values are copied as literals into the new test file from the constants in `backend/tests/test_sample_pdf.py`, not imported from that test module), unless a row replaces `app.state.demo_sample_pdf`.
- **Envelope:** an error reply is exactly `{error_code, message}` with the existing `MESSAGES` text (plus `reference_id`, 8 lowercase hex characters, for `internal_error`), `Content-Type: application/json`, and no `Content-Disposition` header.
- **Headers:** required headers are asserted by value and forbidden ones by absence; no test asserts the complete header set (D12).
- **Raw ASGI:** `await app(scope, receive, send)` with an `http` scope whose `path` (decoded) and `raw_path` (bytes as sent) are consistent with each other, used where the client would normalise the path or where the exact body bytes on the wire matter. These are application-level checks, not proof that a real server accepts the same request line (D9).
- **Logs:** the `logs` fixture pattern from `backend/tests/test_errors.py:120-130` (capture through the non-propagating `app.errors` logger), plus `capsys` for stderr.
- **Forbidden fragments (failure logs and bodies):** following `_forbidden_fragments` in `backend/tests/test_demo.py:727-745`: `str(tmp_path)`, `str(SAMPLES_DIR)`, `SAMPLE_PDF`, `"missing.pdf"`, `"No such file"`, `"Errno"`, `"Traceback"`, `"FileNotFoundError"`, `"PermissionError"`, `"IsADirectoryError"`, `"OSError"`.

| ID | Scenario | Input | Expected Output / Behavior | Error Handling |
|----|----------|-------|---------------------------|----------------|
| S1 | Demo success | `GET /api/demo/sample.pdf` | 200; body SHA-256 equals the pinned hash and equals `SAMPLES_DIR / SAMPLE_PDF` bytes; `content-type` is exactly `application/pdf`; `content-disposition` is exactly `inline`; `content-length` is `"471258"` | N/A |
| S2 | Same bytes as the demo pass | wrap `state.demo_runner.run_pass` with a spy that records `doc` and delegates; `POST /api/demo`, then `GET /api/demo/sample.pdf` | POST 200; GET body equals the recorded `doc` exactly | N/A |
| S3 | Read per request | `state.demo_sample_pdf` replaced by a temp file with bytes A; GET; overwrite with bytes B; GET | first body A, second body B; `content-length` matches each | N/A |
| S4 | Plain `Response`, no range handling | GET with `Range: bytes=0-99` | 200 (not 206); the full bytes; no `accept-ranges`, `etag`, `last-modified`, `content-range`, `cache-control` or `x-content-type-options` header | N/A |
| S5 | No `Origin` header (top-level navigation) | GET from a client without `Origin` | 200, same bytes; no `access-control-allow-origin` header (`vary: Origin` may be present, D12) | N/A |
| R1 | Real mode | GET in real mode | 403 `demo_not_enabled` envelope; exactly one INFO line `stage=api code=demo_not_enabled …` | N/A |
| R2 | Real mode reads nothing | real mode; `pathlib.Path.read_bytes` patched with a recorder | 403; the recorder saw no call | N/A |
| R3 | Real-mode wiring | real-mode app | `state.demo_sample_pdf is None` and `state.demo_runner is None` (the invariant D5 relies on). Covered by the existing `test_startup_wiring_real` (`backend/tests/test_demo.py:463-475`); no new test | N/A |
| F1 | Missing sample | `state.demo_sample_pdf = tmp_path / "missing.pdf"` | 500 `internal_error` with a `reference_id`; exactly one ERROR line, containing that `reference_id`; no forbidden fragment in the log, stderr or body | N/A |
| F2 | Unreadable sample | `state.demo_sample_pdf = tmp_path` (a directory: `IsADirectoryError` on Linux, `PermissionError` on Windows; both `OSError`) | as F1 | N/A |
| F3 | Recovery after a fault | after F1, set `state.demo_sample_pdf` back to `SAMPLES_DIR / SAMPLE_PDF`; GET | 200, pinned bytes | N/A |
| Q1 | Query strings ignored | `?file=../backend/.env`, `?path=demo-ai-output.json`, `?page=2`, `?download=1`, a 4,000-character query, and a repeated key | 200 each; body equal to the pinned bytes; `content-disposition: inline` | N/A |
| Q2 | Query in real mode | real mode, `?file=innkjop-og-lager.pdf` | 403 `demo_not_enabled` | N/A |
| P1 | Near-miss paths (client) | `/api/demo/sample.pdf/`, `/api/demo/Sample.pdf`, `/api/demo/sample.PDF`, `/api/demo/sample`, `/api/demo/sample.pdf.json`, `/api/demo/innkjop-og-lager.pdf`, `/api/demo/demo-ai-output.json`, `/api/demo/demo-response.json`, `/api/demo/PROVENANCE.md`, `/samples/innkjop-og-lager.pdf`, `/api/samples/innkjop-og-lager.pdf`, `/api/demo/sample.pdf;x=1` | 404 `not_found` envelope each; no body starts with `%PDF-` | N/A |
| P2 | Unnormalised paths (raw ASGI, application level) | (`path`, `raw_path`) pairs: (`/api/demo/../demo/sample.pdf`, `b"/api/demo/../demo/sample.pdf"`); (`/api/demo/./sample.pdf`, `b"/api/demo/./sample.pdf"`); (`//api/demo/sample.pdf`, `b"//api/demo/sample.pdf"`); (`/api/demo/../sample.pdf`, `b"/api/demo/%2e%2e/sample.pdf"`); (`/api/demo/sample.pdf\x00`, `b"/api/demo/sample.pdf%00"`) | 404 `not_found` each; no body starts with `%PDF-` | N/A |
| P3 | Paths in real mode | real mode, `/api/demo/sample.pdf/` | 404 `not_found` (routing before mode) | N/A |
| P4 | Encoded forms of the route path (client) | `/api/demo%2Fsample.pdf`, `/api/demo/sample%2Epdf`, `/api/demo/sample.pdf%0A` | 200 each; body equal to the pinned bytes (D9: they decode to the route path and can only return the fixed sample) | N/A |
| M1 | Other methods | `POST`, `PUT`, `PATCH`, `DELETE`, plain `OPTIONS` (no preflight headers) on `/api/demo/sample.pdf` | 405 `method_not_allowed` envelope; `allow: GET`; one INFO line | N/A |
| M2 | `HEAD`, headers only (raw ASGI) | `HEAD /api/demo/sample.pdf` with the allowed `Origin`, demo and real mode | one `http.response.start` with 405, `allow: GET`, `content-length: 0`, no `content-type`, `access-control-allow-origin` equal to the allowed origin; zero body bytes; one INFO line `method_not_allowed` | N/A |
| M3 | Allowed CORS preflight | `OPTIONS` with the allowed `Origin` and `Access-Control-Request-Method: GET` | answered by `CORSMiddleware` (200, `access-control-allow-origin` equal to the allowed origin); no error envelope; no log line. Rejected preflights are not repeated here: `CORSMiddleware` answers preflights before routing, and `test_rejected_preflight_is_unchanged` (`test_errors.py:557-578`) already covers them | N/A |
| M4 | Wrong method in real mode | real mode, `POST /api/demo/sample.pdf` | 405 with `allow: GET` (method check before the endpoint) | N/A |
| I1 | Pass lock not used | `state.pass_guard.try_acquire()` held by the test; GET | 200, pinned bytes; afterwards `state.pass_guard.locked()` is still `True` (the route neither waited for, took nor released it); the test then releases it | `finally` releases |
| I2 | No pipeline or connector (B5) | `state.demo_runner` replaced by a spy that appends every attribute access to a list and then raises; `DemoConnector.generate` and `count_input_tokens` patched with spies that record calls | GET 200 **and** the access list and call records are empty (an access swallowed into a 500 would still fail the test through the records) | N/A |
| I3 | No outbound network (A3) | inside an already-entered `with TestClient(...) as client`, `monkeypatch.setattr` blocks `socket.socket.connect` and `socket.create_connection`; then GET through that same client | 200; no socket call. The patch is installed only after the client (and its event loop) is open, because starting a new event loop on Windows calls `socket.connect` internally; `monkeypatch` restores it | N/A |
| I4 | No provider or HTTP-client imports | the existing `test_no_provider_or_http_client_imports` over `api/demo.py` (`test_demo.py:389-411`) | still passes with the new code (no new test) | N/A |
| L1 | No success logging | GET in demo mode | no record in `app.errors`; nothing on stderr | N/A |
| E1 | `POST /api/demo` unchanged | the existing `backend/tests/test_demo.py` suite | passes unchanged, including `GET /api/demo` → 405 `allow: POST` | N/A |
| E2 | Existing error and status tests unchanged | `test_errors.py`, `test_status.py`, `test_app.py` | pass unchanged | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/api/demo.py` (modified) -- the `GET /api/demo/sample.pdf` endpoint, the `Response` import, the module docstring -- D1–D13.
- `backend/tests/test_demo_sample_pdf.py` (new; OQ3 resolved) -- rows S1–S5, R1–R2, F1–F3, Q1–Q2, P1–P4, M1–M4, I1–I3, L1 (24 rows). Its small client, `logs` and forbidden-fragment helpers and the pinned sample constants are copied, not imported from another test module (the 1.8-R5 concern). Rows R3 (`test_startup_wiring_real`), I4 (`test_no_provider_or_http_client_imports`), E1 and E2 are covered by existing tests that stay unchanged.
- Read-only: `backend/app/application.py` (`state.demo_sample_pdf`, `state.demo_runner`, `state.pass_guard`, router inclusion, CORS settings), `backend/app/api/errors.py` (`AppError`, handlers, `CatchAllMiddleware`, `build_error_response`), `backend/app/samples.py`, `backend/app/pipeline/pass_guard.py` (`try_acquire`, `release`, `locked`), `backend/app/connectors/demo.py`, `backend/tests/conftest.py` (`make_settings`), `backend/tests/test_errors.py` (the `logs` and raw-ASGI patterns), `backend/tests/test_demo.py` (the socket-blocking, spy and forbidden-fragment patterns), `backend/tests/test_sample_pdf.py` (the pinned constants).

## Tasks & Acceptance

**Execution** (after G0):
- [ ] `backend/app/api/demo.py`: the endpoint and docstring -- D1–D13.
- [ ] `backend/tests/test_demo_sample_pdf.py`: the 24 rows listed in the Code Map -- gate G1.

**Acceptance Criteria:**
- Given the backend, when `uv sync --locked && uv run pytest -q` run, then all tests pass (the existing 1,079 plus the new ones), also with `-W error`, locally and in GitHub CI, with no new dependency.
- Given the frontend, when `npm test` and `npm run build` run, then results are unchanged (214 passed), since no frontend file changes.
- Given the story branch, when the paths changed by the implementation commits alone are listed (one `git show` per implementation commit, not a range diff; see Verification), then they are exactly `backend/app/api/demo.py` and `backend/tests/test_demo_sample_pdf.py`. Every other commit after the spec commit is a separately approved administrative commit (session log, `issues.md`, `sprint-status.yaml`, `deferred-work.md`, this spec's administrative sections) and is reviewed on its own.

## Dependencies & deferred work

- **Depends on:** Story 1.3 (AD-11 error handling, 404/405/`HEAD`, catch-all) and Story 1.12 (the pinned sample), both merged; and Story 1.13 (`state.demo_sample_pdf`, the demo router), merged as PR #34. `epics.md` lists only 1.3 and 1.12; 1.13 is a real implementation dependency.
- **Provides for:** Story 1.17 (summary rendering and page links; the frontend's base-URL helper already exists in `frontend/lib/status.ts`) and the later end-to-end demo check (`epics.md:1515`).
- **Not this story:** Story 1.15 (demo start screen, `Vis eksempel`, calls only `POST /api/demo`); Story 1.17 (the link UI); Story 2.1 (`POST /api/generate`; real-mode links use an object URL and must never point to this route, `epics.md:1260-1261`); Story 2.2 (cost gate and paid-call counter); Stories 3.1–3.3 (final real-run fixture; this route serves the PDF, not the fixture).
- **Duty for Story 2.2 (B1):** when the paid-call counter exists, add a test that `GET /api/demo/sample.pdf` leaves it unchanged (AC 6 of this story).
- **Proposed `issues.md` item at closeout (D15, OQ4), subject to the developer's review:** "FastAPI's default documentation routes `/openapi.json`, `/docs`, `/docs/oauth2-redirect` and `/redoc` are enabled (`create_app` sets no `docs_url`, `redoc_url` or `openapi_url`); they accept `GET` and `HEAD` and return non-envelope content, which conflicts with AD-11 (no route accepts `HEAD`; closed set of API replies). Pre-existing since Stories 1.2–1.3. Decide whether to disable them or record them as an approved exception, in a separately approved change."
- **Open items unaffected:** U-1, the final real-run fixture, the Story 2.1 integration duties, 1.8-R2/R3/R4/R5/S1/S2, and the `contracts/connector.py` docstring item stay open; nothing in `deferred-work.md` or `issues.md` names Story 1.14.

## Open questions

All resolved by the developer at Checkpoint 63 (2026-11-15):

- **OQ1 — documentation: resolved, no change.** No README or `PROVENANCE.md` change in this story (D16). Rationale: serving the file changes neither its origin nor its permitted use, and the README's demo description belongs with the demo UI; leaving `README.md` alone also keeps `test_readme` and the pinned Story 1.12 provenance section untouched.
- **OQ2 — demo-enabled condition: resolved, `state.demo_sample_pdf is None`** (D5). Rationale: the route depends only on the file it serves; `create_app` wires both attributes together (row R3).
- **OQ3 — test file: resolved, new `backend/tests/test_demo_sample_pdf.py`.** Rationale: no existing test file changes, and the helpers are copied rather than imported across test modules (1.8-R5).
- **OQ4 — documentation routes: resolved, deferred.** The pre-existing conflict is recorded (D15) and one `issues.md` item is proposed for closeout; nothing changes in this story and `issues.md` is not edited now.

## Review items

- **RV-1 (D15):** resolved for this story by OQ4: recorded, not changed, not approved; closeout proposal under "Dependencies & deferred work".
- **No deviations** from AR-14, AD-11 or AD-13 are proposed. `Content-Disposition: inline` is used exactly as written; no optional header is added (D12).

## Independent-review checklist

- [ ] Every Story 1.14 acceptance criterion maps to at least one matrix row (traceability table).
- [ ] The route cannot serve any file other than the fixed sample: no path parameter, query input or static mount; P1–P4 cover near-miss, unnormalised and encoded paths, and D9 states the decoded-path behaviour without overclaiming.
- [ ] Real mode refuses before any file access (R1–R2), and method/path errors come before the mode check (P3, M4) without contradicting AD-11 or AD-13.
- [ ] `HEAD` and preflight behaviour (M2, M3) match AD-11's two exceptions and the existing tests in `test_errors.py`.
- [ ] D3 (plain `Response`, per-request read) is justified and tested (S3, S4).
- [ ] Installation faults (F1–F3) reuse the existing catch-all, and the logs never contain a forbidden fragment.
- [ ] Isolation rows (I1–I3) prove no lock, pipeline, connector or network use, and are reliable on Windows and Linux.
- [ ] No unnecessary duplication of existing tests (R3, I4, E1, E2 and rejected preflights in M3 reuse existing coverage).
- [ ] The "Never" list keeps `application.py`, `errors.py`, `main.py`, `samples/`, `README.md` and the frontend unchanged.
- [ ] D15 records the documentation-route conflict without changing or approving the routes.
- [ ] Scope boundaries against Stories 1.15, 1.17, 2.1, 2.2 and 3.1–3.3 are correct.

## Approval and freeze boundary

- **G0 done:** the developer approved revision 3 at Checkpoint 66 on 2026-11-15. Revisions 1–3 before approval are recorded in the Spec Change Log.
- At G0 the sections from "Intent" to the end of "I/O & Edge-Case Matrix" were wrapped in `<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">…</frozen-after-approval>` with an `<!-- APPROVED … -->` comment, and `status` became `ready-for-dev`. Only the developer can change the frozen block.
- Code Map, Tasks, Dependencies, Open questions, Review items, the checklist, Implementation Notes, Spec Change Log, Review Triage Log and Verification stay outside the frozen block.

## Implementation Notes

## Spec Change Log

- **2026-11-15 — revision 1 (draft, Checkpoint 61):** first draft from Story 1.14 (`epics.md:793-824`), AR-14, AR-21, AD-11, AD-13, the Story 1.13 implementation and the Story 1.12 sample, applying the developer's design directions D1–D15. Four open questions (OQ1–OQ4) and one review item (RV-1). Not reviewed, not approved.
- **2026-11-15 — revision 2 (draft, Checkpoint 63):** applied the Checkpoint 62 independent review. D9, "Why no other file can be served" and the traceability row for AC 4 now state decoded-path routing (encoded forms of the route path reach it and return the same bytes); new row P4; P2 gives consistent `path`/`raw_path` pairs with `%00` and is labelled application-level; I3 installs the socket block only inside an entered client; D12 permits `vary: Origin` and forbids exhaustive header assertions; the AC and Verification file comparison now matches the implementation scope and excepts administrative files; matrix rows G1/G2 renamed E1/E2; D15 names all four documentation routes with the `HEAD` evidence and a proposed closeout `issues.md` item; D11 and a Story 2.2 duty cover the missing paid-call counter; D5 explains the attribute choice; forbidden fragments extended; the I2 spy records accesses; S6 removed and the fragment explained under "Page-link format"; OQ1–OQ4 resolved (new D16: no documentation change). Matrix: 28 rows (S1–S5, R1–R3, F1–F3, Q1–Q2, P1–P4, M1–M4, I1–I4, L1, E1–E2), 25 of them in the new test file. Not approved.
- **2026-11-15 — revision 3 (draft, Checkpoint 65):** applied the six non-blocking notes of the Checkpoint 64 verification; no design decision reopened and no scope change. Line references corrected (`test_errors.py:557-578`, `test_demo.py:389-411`); R3 marked as covered by the existing `test_startup_wiring_real`, so the new test file has 24 rows and R3, I4, E1, E2 reuse existing coverage (matrix still 28 rows); the implementation-diff check now lists the implementation commits alone (`git show` per commit) instead of a range diff; the pinned sample constants are stated as copied, not imported; P2 wording fixed ("no body starts with"); the AD-11 and AR-26 traceability rows now cite error rows (plus L1 for "nothing on success" and M3 for the preflight exception); `review_loop_iteration` set back to `0`. Not approved.
- **2026-11-15 — Checkpoint 66: G0 approval.** The developer approved revision 3 (SHA-256 `cdfd92347e9aff2ee0f7bd93c6d3db390f92aa3cd68133c27c37012559ebaf2a`) as the binding implementation specification. Changes at approval only: `status` set to `ready-for-dev`, the draft comment replaced by the approval comment, the frozen-block markers added around "Intent" to the end of "I/O & Edge-Case Matrix" (content unchanged), the "Approval and freeze boundary" section updated to record G0, and these log entries.

## Review Triage Log

- **2026-11-15 — Checkpoint 62, independent adversarial review of revision 1** (separate reviewer, probes against an in-memory app with FastAPI 0.162.2 and Starlette 1.10.0): REVISE BEFORE APPROVAL; no blockers; every acceptance-criterion path behaved as specified.
  - **A1 (MAJOR, applied):** encoded forms that decode to the route path (`%2F`, `%2E`, trailing `%0A`) return 200 with the same bytes, not 404 → D9 and the security section corrected; row P4.
  - **A2 (MINOR, applied):** literal NUL in `raw_path` unrealistic → `%00` with consistent pairs in P2.
  - **A3 (MINOR, applied):** socket patch before an event loop starts breaks on Windows → I3 patches inside an entered client.
  - **A4 (MINOR, applied):** `vary: Origin` on every reply → permitted in D12; no exhaustive header assertions.
  - **A5 (MINOR, applied):** Verification inconsistent with AC 3 → file comparison aligned, administrative files excepted.
  - **A6 (MINOR, applied):** row/gate ID collision → rows E1/E2.
  - **A7 (MINOR, applied):** documentation routes are a genuine pre-existing AD-11 conflict (four routes, `HEAD` → 200) → D15 expanded; closeout `issues.md` proposal.
  - **B1 (applied):** paid-call counter does not exist yet → D11 and a Story 2.2 duty. **B2 (noted):** mismatched state only possible in tests; no extra check (D5). **B3 (applied):** forbidden fragments extended. **B4 (applied):** raw-ASGI rows labelled application-level. **B5 (applied):** I2 spy records accesses.
  - **C1 (applied):** S6 removed. **C2 (noted):** "restore default path" steps dropped as unnecessary (each test builds its own app); F3 kept as a recovery check. **C3 (not applied):** rejected preflights already covered by `test_rejected_preflight_is_unchanged`, and preflights are answered before routing.
  - **Open questions:** OQ1 no documentation change (D16); OQ2 `demo_sample_pdf is None`; OQ3 new test file; OQ4 deferred with a closeout proposal. All resolved by the developer at Checkpoint 63.
- **2026-11-15 — Checkpoint 64, independent verification of revision 2** (a fresh reviewer, probes against an in-memory app with the real demo router): READY WITH MINOR NON-BLOCKING NOTES; A1–A7, B1–B5, C1–C3 and OQ1–OQ4 all verified as resolved; no blocker or major finding. Claude Code checked separately afterwards that `test_app.py` and `test_status.py` contain no route or OpenAPI inventory check (E2), which the reviewer could not read.
  - **N1 (NOTE, applied):** two line references off by one → `test_errors.py:557-578`, `test_demo.py:389-411`.
  - **N2 (MINOR, applied):** R3 duplicated `test_startup_wiring_real` → R3 kept in the matrix, covered by the existing test; the new file has 24 rows.
  - **N3 (MINOR, applied):** a range diff would include administrative commits made in between → Verification lists each implementation commit alone (`git show --name-only`), and a separate `git log` check that every commit is approved implementation or administrative work.
  - **N4 (NOTE, applied):** the pinned constants are copied, not imported.
  - **N5 (NOTE, applied):** P2 wording; AD-11 and AR-26 traceability rows cite error rows (L1 kept for "nothing on success", M3 for the preflight exception); P4 and F3 remain under AC 4 and AC 3.
  - **N6 (NOTE, applied):** `review_loop_iteration` set to `0`, the convention of every merged spec (Stories 1.10–1.13 all keep `0`, including Story 1.13 after two spec reviews): the field counts the build workflow's implementation review loop, not spec review rounds.
- **2026-11-15 — Checkpoint 66: APPROVED by the developer (G0)** (revision 3).
  - **The decision:** the spec is frozen and set to `ready-for-dev`; gate G0 is met. The approval covers the specification only; implementation starts at a later checkpoint.
  - **What it fixes:** the requirements, D1–D16, the route, the decoded-path behaviour, the error and header rules, the approval gates and the 28-row matrix (24 rows in the new test file; R3, I4, E1, E2 covered by existing tests).
  - **What changed at approval:** the status, the approval comment, the frozen-block markers, the "Approval and freeze boundary" wording and these log entries only.
- **2026-11-15 — Closeout: Story 1.14 done.**
  - **Merge:** PR #36 merged as `2f368b2eeea978c77b84b01d05ac611d82debd4b` (approved head `ed2694cbea31bcfc4ae063ffcf0255409e91c229`).
  - **CI:** GitHub Actions run 43744397133 on `ed2694cbea31bcfc4ae063ffcf0255409e91c229`: Backend (pytest, 1,132 passed) and Frontend (Vitest, 214 passed), both successful.
  - **What changed:** the status changed from `ready-for-dev` to `done`; the frozen block remains unchanged.

## Verification

**Commands:**
- `cd backend && uv sync --locked && uv run pytest -q` -- expected: all pass
- `cd backend && uv run pytest -q -W error` -- expected: all pass
- `cd frontend && npm test && npm run build` -- expected: unchanged, all pass
- `git log --format='%h %s' --name-only <spec commit>..HEAD` -- expected: every commit after the spec commit is either an approved implementation commit or an approved administrative commit; no other commit
- `git show --name-only --format= <implementation commit 1> [<implementation commit 2> …] | sort -u` -- expected: exactly `backend/app/api/demo.py` and `backend/tests/test_demo_sample_pdf.py` (the implementation commits alone, so a session-log or other administrative commit in between is never mixed in; administrative commits are checked separately)
- `git diff -- backend/uv.lock backend/pyproject.toml frontend/package.json frontend/package-lock.json` -- expected: empty
