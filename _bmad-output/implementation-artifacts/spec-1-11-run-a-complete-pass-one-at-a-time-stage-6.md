---
title: 'Story 1.11: Run a complete pass, one at a time (run_pass, stage 6)'
type: 'feature'
created: '2026-11-14'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<!-- APPROVED at Checkpoint 1 by the developer on 2026-11-14 (revision 2 with B1). The block below is frozen: only the developer can change it. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Stages 1, 2, 3 and 5 exist (Stories 1.6–1.8 and 1.10), and the connector contract exists (Story 1.9). But nothing yet runs them as one Generation Pass in the fixed order, turns a connector failure into a pass failure, builds the success reply, or stops a second pass from starting while one is running. Without that, routes (Stories 1.13 and 2.1) would each wire the stages themselves, and double clicks could start duplicate work (FR-3, AR-4, AR-12, AR-17).

**Approach:**
- **`PassRunner`:** add a `PassRunner`, built once with its connector, settings and a shared `PassGuard`. Its `run_pass(doc, filename, inputs, source)` method:
  - acquires a non-blocking pass lock;
  - runs stages 1 → 2 → 3 → 4 → 5 → 6;
  - maps a valid `ConnectorError` to a `PassFailure` without chaining it;
  - returns a frozen `GenerationResponse` built by a module-level stage 6 function `respond`;
  - releases the lock in `finally`.
- **The api layer:** add one exception handler that turns a `PassFailure` into the existing error envelope. No route is added.
- **Scope:** backend only; no cost gate, paid-call counter, real or demo connector, route or frontend change. Covered by pytest with the Story 1.9 fake connector.

## Boundaries & Constraints

**Always:**
- **Order:** the stage order is exactly 1 → 2 → 3 → 4 → 5 → 6, each stage at most once. The first failure stops the pass, and nothing after it runs (AD-1, AR-4).
- **Lock:** the pass lock is acquired non-blockingly **before stage 1**. It is released in `finally` after success, after any `PassFailure` and after any unexpected exception, and **only** by the call that acquired it (AD-16, AR-17). A busy lock fails the call **at once** with `PassFailure("generation_in_progress")` (409), no stage runs, and the other holder's lock isn't touched.
- **Failure signal:** pipeline failures are signalled by raising `PassFailure` (D1).
- **Stage 4 mapping:** stage 4 maps a `ConnectorError` whose `code` is an exact built-in `str` in `CONNECTOR_ERROR_CODES` to a `PassFailure` with that code.
  - **Invalid code:** an invalid or mutated code is a programming error, `TypeError("connector raised an invalid error code")`.
  - **Invalid reply:** a reply that isn't a `ConnectorReply` is a programming error, `TypeError("connector must return a ConnectorReply")`.
  - **Not kept:** the original `ConnectorError` and its code value are never kept in `__context__`, `__cause__` or a frame local (see "Stage 4").
- **Stage 5:** `validate_output` is never called inside an `except` clause.
- **Stage 6:** `respond` accepts only a `ValidatedResults` instance; anything else is a programming error (`TypeError`), not a `PassFailure`.
- **`skipped_pages`:** for a PDF it is stage 2's `skipped_pages` (sorted); for plain text it is empty, serialised as `[]`.
- **Logging:** nothing in `run_pass`, `PassGuard`, stage 4 or stage 6 logs anything (D10). Failure replies are logged only by the existing api logger, which writes `stage=api code=<code> duration_ms=<n>` plus a `reference_id` for `internal_error`.
- **Never logged by Story 1.11 code:** document content, AI output, raw validation errors, exception messages, tracebacks, chained exceptions or frame locals.
- **pypdf:** its existing warning logs are unchanged and remain deferred (Q2).
- **Unchanged:** stages 1–5 run as approved; their behaviour and frozen specs don't change.
- **Imports:** absolute only (the existing import scanners require `level == 0`).

**Never:**
- Add an HTTP route, `POST /api/demo`, `POST /api/generate` or any request parsing (Stories 1.13 and 2.1).
- Add the cost gate, any `count_input_tokens` call, the paid-call counter (Story 2.2), the real connector (Story 2.3) or the demo connector (Story 1.13).
- Normalise raw inputs inside `run_pass`; callers pass an already-normalised `GenerationInputs` (D4).
- Add source-dependent processing (D8), a module-level guard singleton, or a cross-process or distributed lock (D6).
- Add pipeline logging (D10), or change pypdf warning handling (Q2).
- Change any of the following:
  - **Earlier stages and contracts:** stages 1–5; the Story 1.9 contracts (`ConnectorRequest`, `ConnectorReply`, `ConnectorError`, `Connector`, `AiOutput`); the Story 1.10 contracts (`ValidatedResults` and its item models); `PassFailure`; `app/contracts/errors.py` (error codes, `HTTP_STATUS`, messages).
  - **The api layer:** `app/api/errors.py`, apart from the D3 handler and its registration (`AppError`, `build_error_response`, the other handlers, `CatchAllMiddleware` and logging stay as they are).
  - **Everything else:** settings, dependencies, CI, README, the frontend, and any existing test.
- Use anything from `architecture/technology.md`.
- Touch `.claude/`, `_bmad/`, `CLAUDE.md`, planning documents, frozen specifications, `sprint-status.yaml`, `deferred-work.md` or `issues.md` during implementation. Separately approved administrative log and record updates (the `sesjonslogg` convention, closeout) happen only at later checkpoints the developer approves. Never stage, commit or push without the developer's approval.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| `epics.md:715-717` (Story 1.11 AC1) | `run_pass(doc, filename, inputs, source)` with a fake connector runs 1 → 2 → 3 → 4 → 5 → 6; any stage error stops the pass, and nothing after it runs | D1, D2, Execution; matrix: order and stop rows (all six stages recorded) |
| `epics.md:719-721` (AC2) | on success, stage 6 accepts only `ValidatedResults` and returns `{mode, results, skipped_pages}` | D7, D9, stage 6 `respond`; matrix: stage 6 and envelope rows |
| `epics.md:723-726` (AC3) | a second pass gets `generation_in_progress` (409) at once; the lock is released in `finally`, including after errors | D5, D6, `PassGuard`; matrix: lock rows |
| `epics.md:728` (AC4, C-5 at `epics.md:132`) | the lock is backend-wide, not per browser session | D6, "Deployment assumption", integration duties for routes |
| `epics.md:729` (AC5) | the cost gate and the paid-call counter are not part of this story | Never list; D5; matrix: "No cost gate" row and `count_calls == 0` in order and stop rows |
| `epics.md:730` (AC6) | pytest covers stage order, stopping at each stage, the success envelope, lock refusal and lock release after an exception | test plan, matrix |
| `ARCHITECTURE-SPINE.md` AD-1 (l.72) | single entry point `run_pass(doc: bytes, filename: str, inputs: GenerationInputs, source: "upload" \| "sample")`; any stage stops with an AD-11 code; no route calls a connector directly | D1, D2, D4, D8 |
| AD-3, AD-22 | local-only, single backend process on `127.0.0.1:8000` | D6, "Deployment assumption" |
| AD-4 | connector returns `ConnectorReply` or raises `ConnectorError`; mode fixed at startup | stage 4, D2, D7 |
| AD-11 (l.132) | success `{mode, results: ValidatedResults, skipped_pages: int[]}`, `skipped_pages` always present, sorted, `[]` for plain text; error envelope and HTTP mapping | D3, D9 |
| AD-12 / AR-13 | Pydantic contracts are the source of truth | D9 (TS mirror deferred to Stories 1.13/1.16) |
| AD-16 (l.177) / AR-17 | one `PassGuard` in `pipeline/`, non-blocking lock at the start of `run_pass`, released in `finally`, shared by both routes; busy → `generation_in_progress`; the counter is part of `PassGuard` | D5, D6, integration duties |
| AD-7, AR-26 | logs record stage, code, duration, tokens, `reference_id`; never content | D10, privacy rules |
| PRD FR-3 (`prd.md:82-95`) | one pass per document; no concurrent or duplicate calls | lock, integration duties (thread pool) |
| Story 1.9 spec ("Provides for: Story 1.11"; Design Notes l.348) | the `Connector` protocol for stage 4; `ConnectorError` codes mapped to `PassFailure`; fake call recording; "how `run_pass` runs (thread pool or not) is Story 1.11's decision" | stage 4, test plan, integration duties |
| Story 1.10 spec ("Deferred to Story 1.11") and `issues.md` | log only the failure code; never log traceback, frame locals or chained exceptions; never call `validate_output` in an `except`; never log `ValidatedResults`/`AiOutput`; serialise in JSON mode; map `PassFailure` to HTTP | D3, D9, D10, privacy rules |

## Decisions (developer, 2026-11-14)

- **D1 — failures are exceptions:** pipeline failures are signalled by raising `PassFailure`, as stages 1, 2 and 5 already do. AD-1's `-> success | failure` is read as "returns a success, or raises a failure". `run_pass` returns only a `GenerationResponse`. Programming errors (an invalid source, connector contract violations, a non-`ValidatedResults` at stage 6) raise `ValueError` or `TypeError`, not `PassFailure`.
- **D2 — `PassRunner` with dependency injection:**
  - **Construction:** `PassRunner(*, connector, settings, guard)` is built once, by a caller that has a connector (Stories 1.13 and 2.1).
  - **Call shape:** its method `run_pass(doc, filename, inputs, source)` keeps the architecture's four-argument call shape.
- **D3 — `PassFailure` to HTTP:** one narrowly scoped exception handler in `backend/app/api/errors.py`, registered in `register_error_handlers`, turns a `PassFailure` into the existing error envelope by calling `build_error_response(scope, exc.code, limit=exc.limit)`. No HTTP route is created.
- **D4 — normalised inputs only:** `run_pass` receives a `GenerationInputs` already built by `read_generation_inputs`. Normalisation is the job of the future routes, Story 1.13 `/api/demo` and Story 2.1 `/api/generate`. 1.8-R3 stays open and is assigned to those stories. No separate `run_pass` input type check is added (open-question answer).
- **D5 — lock now, counter later:** `PassGuard` implements the non-blocking pass lock only. The paid-call counter, which AD-16 also places in `PassGuard`, is added in Story 2.2.
- **D6 — one guard per application instance:**
  - **Where:** `create_app` creates exactly one `PassGuard` and stores it on `app.state.pass_guard`. Every `PassRunner` built for that app must use it.
  - **Scope:** this is backend-wide protection **within one serving process**, which is the supported deployment (see "Deployment assumption"). It doesn't protect across several worker processes or several app instances.
  - **What's ruled out:** no module-level singleton and no distributed or cross-process lock.
- **D7 — `mode`:** taken from `settings.ai_mode`, fixed at construction; never from `source`.
- **D8 — `source`:** validated strictly (`type(source) is str and source in PASS_SOURCES`); no source-dependent processing yet. The cost gate and upload handling arrive in Epic 2.
- **D9 — `GenerationResponse`:** a frozen contract with `mode`, `results: InstanceOf[ValidatedResults]` and `skipped_pages`. JSON-mode serialisation produces arrays and exactly the AD-11 shape (open-question answer: keep `InstanceOf`).
- **D10 — no pipeline logging:** no new logging; failures are logged only by the existing code-only api logger.
- **Q1 — test PDF helper:** a minimal standalone `backend/tests/_pdf.py` builds PDF bytes for these tests. It imports no other test module. Unrelated tests aren't refactored, and `test_stage2_extract.py` isn't changed (1.8-R5 stays open).
- **Q2 — pypdf warnings:** pypdf warning handling is deferred; its `issues.md` item stays open, and its existing warning logs are allowed in tests.
- **Review decisions (developer, 2026-11-14):**
  - **S5:** an invalid or mutated `ConnectorError.code` is a programming error, a `TypeError` with a fixed message that never includes or logs the value. The three-code mapping for valid codes is unchanged.
  - **S3:** stage 6 is a module-level function `respond(results, extracted, mode)`, called by name from `PassRunner`.
  - **S9:** future async routes must call the synchronous `run_pass` through a thread pool, and Stories 1.13 and 2.1 must test concurrent HTTP requests. See "Integration duties".
  - **Module name:** `pipeline/pass_runner.py` (open-question answer).
- **Architecture source:** `ARCHITECTURE-SPINE.md` only (AD-1, AD-3, AD-4, AD-7, AD-11, AD-12, AD-16, AD-22 and the logging convention).

## Source-wording points (resolved by the decisions)

1. **AD-1 `-> success | failure`** versus the existing stages, which raise: resolved by **D1**.
2. **AD-1's four-argument signature** has no connector or settings, but AC1 needs a fake connector: resolved by **D2**.
3. **1.8-R3 says "Story 1.11 must use `read_generation_inputs`",** but AD-1 gives `run_pass` a ready-made `GenerationInputs`: resolved by **D4**. R3 moves to Stories 1.13 and 2.1 and stays open.
4. **AD-16's `PassGuard` owns the paid-call counter,** but AC5 excludes it: resolved by **D5**.
5. **The Story 1.10 follow-up asks Story 1.11 to "map `PassFailure` to the HTTP reply",** but the Story 1.11 AC adds no route: resolved by **D3**. A handler is added, and no route.
6. **C-5 "backend-wide"** versus multiple workers: resolved by **D6** and the deployment assumption.

## Components and interfaces

**`backend/app/contracts/responses.py` (new):**
- **`GenerationResponse`:** `GenerationResponse(mode: AiMode, results: InstanceOf[ValidatedResults], skipped_pages: ResultPages)`, with `ConfigDict(extra="forbid", frozen=True, hide_input_in_errors=True)`.
  - **`mode`:** `AiMode` from `contracts/options.py` (`"demo" | "real"`).
  - **`results`:** must already be a `ValidatedResults` instance; a dict or another model is rejected rather than rebuilt in Python mode.
  - **`skipped_pages`:** reuses `ResultPages` from `contracts/results.py`: strict positive integers, strictly increasing, tuple internally, may be empty.
- **Serialisation:** `model_dump(mode="json")`, `model_dump_json()` and `jsonable_encoder` give exactly `{"mode": …, "results": {"summary": …, "flashcards": […], "quiz": […], "key_concepts": […]}, "skipped_pages": […]}`, with every collection as a JSON array. Plain `model_dump()` keeps tuples, so callers must serialise in JSON mode.
- **Imports:** from the app, only other `app.contracts` modules (Story 1.9 A9). No `logging`.

**`backend/app/pipeline/pass_guard.py` (new):**
- **`PassGuard()`:** wraps one `threading.Lock`.
  - **`try_acquire() -> bool`:** a non-blocking acquire (`acquire(blocking=False)`). It returns `True` when the caller now holds the lock and `False` at once when the lock is held. It never waits.
  - **`release() -> None`:** releases the lock. Releasing a lock that isn't held raises `RuntimeError`, as `threading.Lock` does.
  - **`locked() -> bool`:** whether the lock is held at the moment of the call.
- **Ownership rule (S13):**
  - **Who releases:** `threading.Lock` doesn't track an owner, so ownership is a usage rule. Only a caller whose own `try_acquire()` returned `True` may call `release()`, exactly once, in `finally`; in this story that's only `run_pass`.
  - **`locked()`:** observational only, for tests and diagnostics. It can be stale as soon as it returns, and it must never be used to decide whether to acquire or release.
- **Re-entrancy:** the lock isn't re-entrant. A nested `run_pass` on the same guard is refused like any second pass.
- **Imports:** standard library only. No `logging`.

**`backend/app/pipeline/pass_runner.py` (new):**
- **`PassSource = Literal["upload", "sample"]`** and **`PASS_SOURCES = get_args(PassSource)`**.
- **`respond(results: ValidatedResults, extracted: ExtractedDocument, mode: AiMode) -> GenerationResponse`:** stage 6, a module-level function (see "Stage 6").
- **`PassRunner(*, connector: Connector, settings: Settings, guard: PassGuard)`:** stores its three dependencies and `mode = settings.ai_mode`.
- **`PassRunner.run_pass(doc: bytes, filename: str, inputs: GenerationInputs, source: PassSource) -> GenerationResponse`:** see "Execution".
- **Calling stages by name:** the stage functions are imported by name (`from app.pipeline.stage1_validate import validate_bytes`, and the same for `extract_document`, `build_request` and `validate_output`). They and `respond` are called through this module's global names, so tests can replace each with a recorder that wraps the real function.
- **Imports:** from the app, only `app.contracts.*`, `app.pipeline.*` and `app.config` (the Story 1.9 D10 allowlist). No `app.api` or `app.connectors`, and no `logging`.

**`backend/app/api/errors.py` (modified only for D3):**
- **New handler:** add `_pass_failure_handler(request, exc)`:
  - for a `PassFailure`, it returns `build_error_response(request.scope, exc.code, limit=exc.limit)`;
  - for any other exception it returns `internal_error`, the same defensive pattern as `_app_error_handler`.
- **Registration:** register it with `application.add_exception_handler(PassFailure, _pass_failure_handler)`.
- **Unchanged:** everything else in the file.
- **Import:** add `from app.pipeline.failures import PassFailure`. The api layer may import the pipeline (Design Paradigm).

**`backend/app/application.py` (modified only for D6):** `create_app` sets `application.state.pass_guard = PassGuard()` once. No `PassRunner` is built here, because no connector exists until Stories 1.13 and 2.3.

## Execution (`run_pass`)

1. **Check the source (before the lock):** if not `type(source) is str and source in PASS_SOURCES`, raise `ValueError("unknown pass source")`, a programming error. A `str` subclass equal to `"upload"` is rejected. The lock isn't touched and no stage runs.
2. **Acquire the lock (outside the `try`):** if `guard.try_acquire()` returns `False`, raise `PassFailure("generation_in_progress")` at once. Because this raise happens before the `try`, the `finally` doesn't run, and the other holder's lock is never released. No stage runs.
3. **`try`:**
   1. **Stage 1:** `checked = validate_bytes(doc, filename, max_pdf_pages=settings.max_pdf_pages)`.
   2. **Stage 2:** `extracted = extract_document(checked, max_text_chars=settings.max_text_chars)`.
   3. **Stage 3:** `request = build_request(extracted, inputs)`.
   4. **(Cost gate: not in this story, Epic 2. `count_input_tokens` is never called.)**
   5. **Stage 4:** `reply = self._generate(request)` (see "Stage 4").
   6. **Stage 5:** `results = validate_output(reply, extracted)`, called outside any `except` clause.
   7. **Stage 6:** `return respond(results, extracted, self._mode)`.
4. **`finally`:** `guard.release()`. This is reached only after a successful acquire, and runs after success, after any `PassFailure` and after any unexpected exception.

**Failure behaviour:**
- **Stages 1, 2 and 5:** their `PassFailure` propagates unchanged, with the same code and `limit`.
- **Stage 3:** it doesn't fail by design.
- **Unexpected exceptions:** an exception from any stage, the connector or stage 6, and the programming-error `TypeError`s and `ValueError`s, propagate unchanged; they're not converted into a `PassFailure`. Within a future route they reach the existing catch-all, which returns `internal_error` (500) with a code-only log line.

**Codes `run_pass` can raise**, with their HTTP status from the existing `HTTP_STATUS` table:

| Status | Codes |
|---|---|
| 400 | `unsupported_file_type`, `bad_text_encoding`, `unreadable_file`, `no_extractable_text` |
| 409 | `generation_in_progress` |
| 413 | `file_too_large` (with `limit` `pages` or `characters`) |
| 422 | `insufficient_content` |
| 429 | `ai_rate_limited` |
| 502 | `ai_unavailable`, `ai_output_invalid` |
| 503 | `ai_credits_exhausted` |

## Stage 4 (connector call)

This mechanism was checked in memory before drafting, covering valid codes, codes changed to `"internal_error"` and `None`, a `str` subclass carrying a secret, a deleted `code` attribute, and a `None` or `dict` reply.

```python
def _generate(self, request: ConnectorRequest) -> ConnectorReply:
    failed_code: ConnectorErrorCode | None = None
    invalid_code = False
    try:
        reply = self._connector.generate(request)
    except ConnectorError as error:
        code = getattr(error, "code", None)
        if type(code) is str and code in CONNECTOR_ERROR_CODES:
            failed_code = code
        else:
            invalid_code = True
        del code                              # keep no possibly unsafe value in the frame
    else:
        if not isinstance(reply, ConnectorReply):
            raise TypeError("connector must return a ConnectorReply")
        return reply
    if invalid_code:
        raise TypeError("connector raised an invalid error code")
    raise PassFailure(failed_code)
```

- **Inside the `except` clause:** the clause only records an exact built-in `str` code from the approved list, or a flag. It reads the code with `getattr`, so a deleted attribute can't raise inside the clause. It deletes its temporary, so a malicious `str` subclass isn't kept as a frame local.
- **Raised after the clause:** the `PassFailure` and the invalid-code `TypeError` are raised after the clause has ended. That gives `__context__ is None`, `__cause__ is None` and `__suppress_context__ is False`, and Python deletes the `as error` name, so the `ConnectorError` isn't reachable from frame locals.
- **The invalid-reply `TypeError`:** it's raised in the `else` branch, where no exception is being handled, so it has no context either. No `assert` is used, so the behaviour holds under `python -O`.
- **Only `ConnectorError` is caught.** Any other exception from the connector propagates unchanged.
- **What stays in the frame:** `request` holds document text in this frame's locals. That's the documented traceback limit, and this story never logs frames.
- **Caller context:** a caller that invokes `run_pass` while it is itself handling an exception adds its own `__context__` (Story 1.10 limit).

## Stage 6 (`respond`)

```python
def respond(results: ValidatedResults, extracted: ExtractedDocument, mode: AiMode) -> GenerationResponse:
    if not isinstance(results, ValidatedResults):
        raise TypeError("stage 6 accepts only ValidatedResults")
    return GenerationResponse(mode=mode, results=results, skipped_pages=extracted.skipped_pages)
```

- **`skipped_pages`:** for a PDF, stage 2's `skipped_pages`, sorted ascending by construction; for plain text, `()`, which serialises as `[]`.
- **Not logged:** neither `ValidatedResults` nor `GenerationResponse` is logged anywhere.

## Privacy and logging

- **No logging:** `pass_runner.py`, `pass_guard.py` and `responses.py` import no `logging` and print nothing (D10).
- **Failures carry only codes:** every `PassFailure` from `run_pass` holds only its code (and `limit` for `file_too_large`). Its `str`, `repr`, `args` and attributes contain no document text, inputs or AI output.
- **Fixed messages:** programming-error messages are fixed text and never contain a value.
- **Stage 4:** it chains nothing it caught. Stages 1 and 2 keep their documented `from None` behaviour (Story 1.7 D1, unchanged), and stage 5 keeps its own guarantees (Story 1.10).
- **The `PassFailure` handler:** it logs exactly one line, through `build_error_response`: `stage=api code=<code> duration_ms=<n>`. It never logs the exception, its traceback, frame locals or chained exceptions.
- **pypdf:** its existing warnings (for example "EOF marker not found" for a broken PDF) still appear under `pypdf.*` loggers. They contain no document text, and their handling stays deferred (Q2).
- **Known limits:**
  - **traceback frames:** a raised failure's traceback frames can hold document or AI text in their locals;
  - **caller context:** a caller already handling an exception adds `__context__`;
  - **content in the models:** `ValidatedResults` and `GenerationResponse` hold AI text and show it in `repr()` and `model_dump()`.

  Story 1.11 code never logs, stores or returns any of these, apart from returning the `GenerationResponse` itself.

## Deployment assumption (D6, S17)

- **The supported deployment** is the README command `uv run uvicorn app.main:app --host 127.0.0.1 --port 8000` (AD-3, AD-22). That's one serving process, with one `create_app` call and therefore one `PassGuard`, so the lock is backend-wide, as C-5 requires.
- **`--reload` is still single-serving:** the reloader parent process doesn't import or serve the app.
- **Not supported:** several worker processes (`--workers N` with N > 1) or several app instances would each have their own guard, and passes could then overlap. That's out of scope and documented as a limit, not prevented.

## Integration duties for Stories 1.13 and 2.1 (S9, S10, S12)

These requirements bind the future route stories. They're recorded here because Story 1.9 left "how `run_pass` runs" to Story 1.11.

1. **Thread pool:**
   - **Why:** `run_pass` is synchronous and may block, for up to the AI timeout in Epic 2.
   - **Sync routes:** a route may be a plain `def` route, which FastAPI runs in its thread pool.
   - **Async routes:** an `async def` route must call `run_pass` through a thread pool (for example `await run_in_threadpool(runner.run_pass, …)`), never directly on the event loop. Otherwise a second request would queue behind the first instead of being refused with 409.
2. **One shared guard:**
   - **Wiring:** both `/api/demo` (Story 1.13) and `/api/generate` (Story 2.1) build their `PassRunner` with `app.state.pass_guard`.
   - **Effect:** a pass on one route refuses a pass on the other with `generation_in_progress`.
3. **Return the model instance:** routes return the `GenerationResponse` instance, or serialise it with `model_dump(mode="json")` without passing that dict back through `response_model` validation. That's because `InstanceOf` rejects a dict in Python-mode validation, and `model_validate_json` would rebuild one.
4. **Tests:** Stories 1.13 and 2.1 must test concurrent HTTP requests:
   - a second request during a running pass gets 409 at once;
   - once both routes exist, the demo and upload routes refuse each other.

## I/O & Edge-Case Matrix

Unless a row says otherwise:
- **Runner:** tests use `PassRunner(connector=<recording connector>, settings=make_settings(), guard=PassGuard())`. The recording connector delegates to a `FakeConnector(raw_json=<valid ok reply>)` and appends `"count"` or `"generate"` to a shared event list on each call.
- **Recorders:** recorders replace `pass_runner.validate_bytes`, `extract_document`, `build_request`, `validate_output` and `respond` with wrappers that append their name to the same list and call the real function.
- **Document:** a PDF built by `tests/_pdf.py` with pages `[text, image-only, text]` (`supplied_pages == (1, 3)`, `skipped_pages == (2,)`).
- **Inputs:** `read_generation_inputs(course_code=None, detail_level=None, output_language=None)`.
- **Source:** `"upload"`.
- **Fake reply:** a valid AD-9 `ok` reply with 5 items per list, citing page 1.

Every test calls `run_pass` outside any `except` block.

| Scenario | Input | Expected Output / Behavior | Error Handling |
|----------|-------|---------------------------|----------------|
| Order: PDF success | default PDF | the event list is exactly `validate_bytes, extract_document, build_request, generate, validate_output, respond`, each once; returns a `GenerationResponse`; `count_calls == 0` | N/A |
| Order: plain-text success | UTF-8 `.txt` document, reply with no pages | same six events in the same order; `skipped_pages == ()`; `count_calls == 0` | N/A |
| Stage arguments | default PDF | stage 1 gets `max_pdf_pages=settings.max_pdf_pages`; stage 2 gets `max_text_chars=settings.max_text_chars`; stage 3 gets stage 2's object and the given `inputs`; the connector gets stage 3's request object itself (`is`); stage 5 gets the connector's reply and stage 2's object; `respond` gets stage 5's result, stage 2's object and `settings.ai_mode` | N/A |
| Stop at stage 1 | `unsupported_file_type` (an image file), `bad_text_encoding` (Latin-1 `.txt`), `unreadable_file` (a broken PDF), `file_too_large`/`pages` (pages over a small `max_pdf_pages`) | the same `PassFailure` code and `limit`; event list exactly `validate_bytes`; `generate_calls == 0`; `count_calls == 0` | `PassFailure` |
| Stop at stage 2 | `no_extractable_text` (image-only PDF), `file_too_large`/`characters` (text over a small `max_text_chars`) | the same code and `limit`; event list exactly `validate_bytes, extract_document`; `generate_calls == 0`; `count_calls == 0` | `PassFailure` |
| Stage 3 unexpected error | `build_request` replaced by one raising `RuntimeError` | the `RuntimeError` propagates unchanged (not a `PassFailure`); event list ends at `build_request`; lock released; `count_calls == 0` | `RuntimeError` |
| Stop at stage 4 | `FakeConnector(generate_error=…)` for each of `ai_unavailable`, `ai_rate_limited`, `ai_credits_exhausted` | `PassFailure` with the same code; event list ends at `generate` (once); `validate_output` and `respond` not called; `count_calls == 0` | `PassFailure` |
| Stage 4 no chaining | each of the three codes above | `__context__ is None`, `__cause__ is None`, `__suppress_context__ is False`; no `ConnectorError` instance reachable from the failure's traceback frame locals; `vars(exc) == {"code": code, "limit": None}` | `PassFailure` |
| Stage 4 invalid error code | a connector raising a `ConnectorError` whose `code` was then changed to `"internal_error"`, `"not_found"`, `""` or `None`; replaced by a `str` subclass equal to `"ai_unavailable"` whose `__format__`/`__str__` returns `"PASS-SECRET"`; or deleted | `TypeError("connector raised an invalid error code")` with exactly that message; the secret is in no `str`, `repr` or `args`; `__context__ is None`, `__cause__ is None`; no `ConnectorError` or code-subclass object reachable from traceback frame locals; stages 5–6 not called; lock released | `TypeError` |
| Stage 4 invalid reply | a connector returning `None`, a `dict` or an `AiOutput` | `TypeError("connector must return a ConnectorReply")`; `__context__ is None`; stages 5–6 not called; lock released | `TypeError` |
| Stage 4 unexpected error | a connector whose `generate` raises `RuntimeError` | the `RuntimeError` propagates unchanged; stages 5–6 not called; lock released | `RuntimeError` |
| Stop at stage 5 | fake reply with `stop="length"`; reply with `status: "insufficient_content"` | `ai_output_invalid`; `insufficient_content`; event list ends at `validate_output`; `respond` not called; `count_calls == 0` | `PassFailure` |
| Stage 5 outside `except` | the `validate_output` recorder captures `sys.exc_info()` on entry | `sys.exc_info() == (None, None, None)` inside stage 5 on the success path and on the stage-5-failure path | N/A |
| Stage 6 accepts only `ValidatedResults` | `respond` called directly with an `AiOutput`, a `dict` and `None`; and `run_pass` with `validate_output` replaced by one returning an `AiOutput` | `TypeError("stage 6 accepts only ValidatedResults")` each time; through `run_pass` the lock is released | `TypeError` |
| No cost gate | every success and failure path in this matrix that reaches the connector or stops before it | `count_calls == 0` and `"count"` never appears in the event list; the `pass_runner.py` source, read with `ast`, contains no attribute or name `count_input_tokens` | N/A |
| Envelope shape | default PDF success | `model_dump(mode="json")` has exactly the keys `mode`, `results`, `skipped_pages`; `results` has exactly `summary`, `flashcards`, `quiz`, `key_concepts`; every collection is a JSON array; `jsonable_encoder` and `json.loads(model_dump_json())` give the same dict | N/A |
| Envelope `skipped_pages` | PDF with pages `[text, image, text, image, text]`; plain text | `(2, 4)` → `[2, 4]`; `()` → `[]` | N/A |
| Envelope `mode` | `make_settings()` (demo); `make_settings(ai_mode="real", anthropic_api_key=FAKE_KEY)`; each with `source` `"upload"` and `"sample"` | `mode` is `"demo"` or `"real"` from the settings, and the same for both sources | N/A |
| Envelope contract | direct construction | frozen; extra field rejected; `mode` other than `demo`/`real` rejected; `results` as a `dict` or an `AiOutput` rejected; `skipped_pages` `[2, 1]`, `[0]`, `[True]` rejected; config has `extra="forbid"`, `frozen=True` and `hide_input_in_errors=True` | `ValidationError` |
| Source validation | `"upload"`, `"sample"` (accepted); `"demo"`, `""`, `None`, `"UPLOAD"`, and a `str` subclass equal to `"upload"` | the accepted values run normally; the others raise `ValueError("unknown pass source")` before the lock, with the guard unlocked afterwards and no event recorded | `ValueError` |
| Lock busy | the test holds `guard.try_acquire()`, then calls `run_pass` | `PassFailure("generation_in_progress")` at once; no event recorded; `generate_calls == 0`; the guard is still locked afterwards (the refused call didn't release it); `HTTP_STATUS["generation_in_progress"] == 409` | `PassFailure` |
| Lock: nested `run_pass` refused | a connector whose `generate` calls `run_pass` on a runner sharing the same guard, and records the result | the inner call raises `PassFailure("generation_in_progress")` at once; the outer pass then completes normally (the recording connector returns the valid reply after recording the inner refusal); the guard is unlocked afterwards | `PassFailure` (inner) |
| Lock released after success | default PDF success | `guard.locked()` is `False` afterwards; a second `run_pass` succeeds | N/A |
| Lock released after a pass failure | one failure from each stage (1, 2, 4, 5) | `guard.locked()` is `False` after each | `PassFailure` |
| Lock released after an unexpected exception | `RuntimeError` from stage 2 and from the connector; the stage 4 `TypeError`s; the stage 6 `TypeError` | `guard.locked()` is `False` after each | the original exception |
| Lock: concurrent threads | thread A runs `run_pass` with a connector that sets an `entered` event inside `generate` and then waits on a `release` event. The test waits for `entered` (bounded, 5 s), then thread B calls `run_pass` on another `PassRunner` sharing the same guard | B gets `generation_in_progress` without blocking (well under 1 s); then the test sets `release`; A completes successfully; both threads `join(timeout=5)` and are no longer alive; a new pass then succeeds. `release` is also set in a `finally`, so a failing assertion never leaves A blocked | `PassFailure` (B) |
| Lock scope per app instance | `create_app(make_settings())` called twice | each app has exactly one `app.state.pass_guard`, a `PassGuard`; the two apps' guards are different objects; two runners built with one app's guard refuse each other, and runners with different guards don't (the documented single-process scope, D6) | `PassFailure` |
| `PassGuard` API | a new guard | `try_acquire()` is `True`, then `False`; `locked()` follows; `release()` unlocks; `release()` on an unlocked guard raises `RuntimeError` | `RuntimeError` |
| HTTP mapping | a test-only route on a `create_app` test instance raising `PassFailure` for each code `run_pass` can raise | status equals `HTTP_STATUS[code]` (409, 400, 413, 422, 429, 502, 503); body is the AD-11 envelope with the approved `message`; `limit` present exactly for `file_too_large`; no `reference_id`; CORS headers kept for an allowed `Origin` | N/A |
| HTTP mapping logging | the same requests, with `caplog.handler` attached directly to the non-propagating `app.errors` logger (the `logs` fixture pattern in `test_errors.py`) | exactly one record per request, `stage=api code=<code> duration_ms=<n>`, with no exception text, traceback or `exc_info` | N/A |
| Existing handlers unchanged | the existing `AppError`, 404, 405 and validation-error tests | they still pass when the existing suite is rerun (no new test needed) | N/A |
| Privacy: no app logs or output | every success and failure path above, with document text and AI output containing `"PASS-SECRET"`, `caplog` at DEBUG on the root logger, and `capsys` | no record from loggers named `app` or `app.*`; existing `pypdf.*` warning records are allowed (Q2); `"PASS-SECRET"` appears in no captured record from any logger; nothing on stdout or stderr; the secret is in no `PassFailure` `str`, `repr`, `args` or `vars` | N/A |
| Import boundary | `pass_runner.py`, `pass_guard.py`, `responses.py` | absolute imports only. The existing Story 1.9 scanners (pipeline allowlist, contracts rule, SDK isolation, no logging in contracts) cover the new files automatically when rerun. One new test checks that `pass_guard.py` imports only the standard library and does not import `logging`, and that `pass_runner.py` imports no `logging`, `app.api` or `app.connectors` | N/A |
| Unchanged earlier stages | the existing backend suite | all existing tests still pass when rerun (no new test needed); stages 1–5 and their contracts unchanged | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/pipeline/stage1_validate.py:102` `validate_bytes(doc, filename, *, max_pdf_pages)`; `stage2_extract.py:47` `extract_document(document, *, max_text_chars)`; `stage3_prompt.py:206` `build_request(extracted, inputs)` and `:159` `read_generation_inputs`; `stage5_gates.py:153` `validate_output(reply, extracted)`. Read-only.
- `backend/app/contracts/connector.py` -- `Connector`, `ConnectorRequest`, `ConnectorReply`, `ConnectorError`, `ConnectorErrorCode`, `CONNECTOR_ERROR_CODES`. Read-only.
- `backend/app/contracts/results.py` -- `ValidatedResults`, `ResultPages`. Read-only.
- `backend/app/contracts/options.py` -- `AiMode`. Read-only.
- `backend/app/contracts/errors.py` -- `HTTP_STATUS`, `MESSAGES`. Read-only.
- `backend/app/pipeline/failures.py` -- `PassFailure`. Read-only.
- `backend/app/config.py` -- `Settings` (`ai_mode`, `max_pdf_pages`, `max_text_chars`). Read-only.
- `backend/app/api/errors.py` -- `build_error_response`, the `_app_error_handler` pattern, `register_error_handlers`, `CatchAllMiddleware`. Modified only for the D3 handler.
- `backend/app/application.py` -- `create_app`. Modified only to set `state.pass_guard`.
- `backend/tests/_fake_connectors.py` -- `FakeConnector`, wrapped by the recording connector in the new test file. Read-only.
- `backend/tests/conftest.py` -- `make_settings`, `demo_app`, `client`. Read-only.
- `backend/tests/test_errors.py` -- the `logs` fixture pattern for the non-propagating `app.errors` logger. Read-only.
- `backend/tests/test_stage1_validate.py:295` -- asserts that pypdf still logs its warnings, which is why the privacy row allows them. Read-only.
- `backend/tests/test_stage2_extract.py` -- its PDF helpers stay where they are (1.8-R5). The new `tests/_pdf.py` builds PDFs independently.
- `README.md:26` -- the single-process start command.

## Tasks & Acceptance

**Execution:**
- [ ] `backend/app/contracts/responses.py` (new) -- `GenerationResponse` -- D9.
- [ ] `backend/app/pipeline/pass_guard.py` (new) -- `PassGuard` -- D5, D6, S13.
- [ ] `backend/app/pipeline/pass_runner.py` (new) -- `PassSource`, `PASS_SOURCES`, `respond` (stage 6), `PassRunner` with stage 4 -- D1, D2, D4, D7, D8, D10, S3, S5, S14, S20.
- [ ] `backend/app/api/errors.py` (modified only for D3) -- the `PassFailure` handler and its registration.
- [ ] `backend/app/application.py` (modified only for D6) -- `state.pass_guard`.
- [ ] `backend/tests/_pdf.py` (new) -- a minimal standalone PDF builder (text pages, image-only pages, broken bytes); it imports no other test module -- Q1.
- [ ] `backend/tests/test_pass_runner.py` (new) -- one test, or one parametrised test, per new-behaviour matrix row. The rows "Existing handlers unchanged" and "Unchanged earlier stages", and the parts of "Import boundary" already covered by the Story 1.9 scanners, are satisfied by rerunning the existing suite, not by redundant new tests.

**Acceptance Criteria:**
- Given the backend, when `uv sync --locked && uv run pytest -q` run, then all tests pass (the existing 885 plus the new ones), also with `-W error`, with no new dependency and an unchanged `uv.lock`.
- Given the repository, when compared with the state at the start of implementation (the spec commit, with the 30 untracked BMAD tool folders already present and untouched), then only the seven files above and this spec changed. Separately approved administrative entries (`.logs/` session log, `issues.md`, closeout records) may be added at later checkpoints.

## Dependencies & deferred work

- **Depends on:** Stories 1.6 (stage 1, `PassFailure`), 1.7 (stage 2), 1.8 (stage 3, `GenerationInputs`), 1.9 (connector contracts, `FakeConnector`) and 1.10 (stage 5, `ValidatedResults`), all merged. Also Story 1.3 (`build_error_response`, handlers).
- **Provides for:**
  - **Story 1.13:** the `PassRunner` used by `POST /api/demo`, built with a demo connector and **`app.state.pass_guard`**, with `source="sample"`; `GenerationResponse` for `samples/demo-response.json`. The integration duties above apply.
  - **Story 2.1:** the `PassRunner` used by `POST /api/generate`, built with **`app.state.pass_guard`**, with `source="upload"`. The integration duties above apply.
  - **Story 2.2:** the place for the cost gate (between stages 3 and 4) and the paid-call counter in `PassGuard`.
- **Stays open:** none of these is closed by this spec or by the implementation:
  - **1.8-R3:** assigned to Stories 1.13 and 2.1, which must build inputs with `read_generation_inputs`.
  - **1.8-R4:** the routes must never log or return the surrogate `ValidationError`.
  - **The pypdf warning-logging item (Q2).**
  - **Others:** 1.8-R2, R5, S1/S2; Story 1.7 D1 and L1; the Story 1.6 pickling item; the Story 1.13 docstring item.
- **Future closeout responsibility (S15):** the Story 1.11 closeout (a separate checkpoint) must update `deferred-work.md` and `issues.md` consistently:
  - **1.8-R3 and R4:** re-point them from "Story 1.11" to Stories 1.13 and 2.1;
  - **The pypdf item:** give it a new target (proposed: Story 2.1, the first route that processes uploaded PDFs);
  - **The Story 1.10 "Story 1.11 duties" item:** close it only if the implementation verifiably meets each duty, recording the route duties above as their own open items.

  This spec doesn't modify those records.
- **Not part of this story:** the frontend TypeScript mirror of `GenerationResponse` (Stories 1.13 and 1.16).

## Open questions

None. The three open questions in the first draft were answered by the developer on 2026-11-14 (keep `InstanceOf`; no separate input type check; `pass_runner.py`), and the review decisions S3, S5 and S9 are recorded under Decisions.

## Implementation Notes

## Spec Change Log

- **2026-11-14, revision 2:** applied the independent adversarial review's findings S1–S20, with the developer's decisions on S3, S5 and S9:
  - **S1:** the Never list separates `app/contracts/errors.py` (unchanged) from `app/api/errors.py` (D3 handler only).
  - **S2:** the privacy row allows existing `pypdf.*` warnings and checks only `app`/`app.*` loggers, plus that no secret appears in any record.
  - **S3:** stage 6 became the module-level `respond`; a recording connector makes all six stages observable.
  - **S4:** `count_calls == 0` in the order and stop rows, plus a "No cost gate" row.
  - **S5:** strict code validation in stage 4 (exact `str`, approved list, `getattr`, deleted temporary), with a fixed-message `TypeError`.
  - **S6:** the tasks say regression and scanner rows are satisfied by rerunning existing tests.
  - **S7:** `caplog.handler` is attached to `app.errors`.
  - **S9, S10, S12:** a new "Integration duties for Stories 1.13 and 2.1" section.
  - **S11:** a deterministic thread handshake.
  - **S13:** a lock ownership rule.
  - **S14, S16:** stage 4 uses `try`/`except`/`else` with no `assert`, and an invalid reply raises a fixed-message `TypeError`.
  - **S15:** a future closeout responsibility.
  - **S17:** `--reload` versus `--workers`.
  - **S18:** a nested `run_pass` refusal row.
  - **S19:** later approved administrative entries.
  - **S20:** a strict source check.
  - **Matrix:** 30 → 34 rows.
- **2026-11-14, Checkpoint 1 (B1):** at approval, the Import boundary row was tightened to say that `pass_guard.py` imports only the standard library and does not import `logging`, as the final verification suggested. There's no other technical change; the matrix stays at 34 rows.

## Review Triage Log

- **2026-11-14 — independent adversarial review of the first draft:** REVISIONS REQUIRED, with no blockers or HIGH findings:
  - verified defects S1–S7 (four MEDIUM: S1–S4)
  - risks S9–S15
  - optional improvements S16–S20

  All were applied in revision 2. The reviewer confirmed, with an in-memory prototype against the real stages, `FakeConnector` and `create_app`:
  - the lock order;
  - the stage 4 no-chaining result;
  - the handler's statuses, envelope, CORS, `HEAD` and code-only logging;
  - `GenerationResponse` with `InstanceOf` (serialisation, schema, `response_model` with an instance);
  - stage 2's `skipped_pages` always valid for `ResultPages`;
  - that the existing 885 tests and scanners aren't broken.
- **2026-11-14 — final independent verification of revision 2:** READY FOR APPROVAL.
  - **Findings:** S1–S7 and S9–S20 all RESOLVED; one optional LOW, B1, applied at approval.
  - **Verified with an in-memory prototype:** stage 4 (valid, mutated and malicious codes, invalid replies), the lock (busy, nested, two threads), the six-stage order, `count_calls == 0`, `GenerationResponse`, the `PassFailure` handler (all statuses, CORS, one code-only log line) and the pypdf/app log split.
  - **Matrix:** 34 rows.
- **2026-11-14 — Checkpoint 1: APPROVED by the developer** (revision 2 with B1).
  - **The decision:** the spec is frozen and set to `ready-for-dev`.
  - **What it fixes:** the requirements, D1–D10, Q1–Q2, the review decisions, the integration duties, the 34-row acceptance matrix and the seven-file implementation scope.
  - **What changed at approval:** the B1 wording, this status change, the approval comment and these log entries only.
- **2026-11-14 — Closeout: Story 1.11 done.**
  - **Merge:** PR #30 merged as `7098f3d309a266db824c85ab9068bf3c136138cf`.
  - **CI:** GitHub Actions run 43606035941 on `60f4e10`: Backend (pytest, 959 passed) and Frontend (Vitest, 97 passed), both successful.
  - **What changed:** the status went from `ready-for-dev` to `done`; the frozen block, including the requirements and the 34-row acceptance matrix, is unchanged.

## Design Notes

- **Why a `PassRunner` object:** it keeps AD-1's four-argument call and fixes the connector and mode at construction (AD-4). Tests can also inject a fake and a fresh guard without globals.
- **Why stage 6 is a module-level function:** it can be tested directly and recorded in the stage order like the other stages.
- **Why the source check comes before the lock:** an invalid call is a programming error, so it shouldn't touch shared state.
- **Why the busy raise is outside the `try`:** a refused call must never reach the `finally` that releases the lock it doesn't hold.
- **Why the handler sits in the api layer:** `PassFailure`'s docstring already says "The api layer converts it into an error reply". One handler serves both future routes, and `build_error_response` keeps the single code-only log line.
- **Why `threading.Lock`:** the stages and connectors are synchronous, and FastAPI runs `def` routes in a thread pool. A non-blocking acquire gives the required "at once" refusal without timeouts, provided routes follow the thread-pool duty.

## Verification

**Commands:**
- `cd backend && uv sync --locked && uv run pytest -q` -- expected: all pass
- `cd backend && uv run pytest -q -W error tests/test_pass_runner.py` -- expected: all pass
- `cd backend && uv run pytest -q -W error` -- expected: all pass
- `git diff -- backend/uv.lock backend/pyproject.toml` -- expected: empty

**Manual checks:**
- The developer reads "Deployment assumption" and "Integration duties" and confirms the single-process scope and the route obligations.
- `git status`, compared with the starting state described in the Acceptance Criteria: only the seven files above and this spec changed (plus any separately approved administrative entries).
