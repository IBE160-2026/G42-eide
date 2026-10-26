---
review: adversarial (build-incompatibility attack)
target: ../ARCHITECTURE-SPINE.md (draft, 2026-10-26)
reviewed: 2026-10-26
lens: "Construct two units one level down that each obey every AD to the letter yet still build incompatibly."
---

# Adversarial Review — Architecture Spine, AI Study Buddy

## Verdict

**Not yet build-safe. Fix before stories are cut.** The spine is strong on *what* must happen (stage order, gates, closed error list, key handling, demo honesty). It is weak on the *exact shapes and owners at the seams*: the demo fixture, the connector's input/output types, the HTTP layer around the envelope, the `results` payload, the option values, and who owns the lock and call counter. Each of these lets two separately built stories (often written by different AI sessions) both obey every AD and still fail to fit together. Most fixes are one or two sentences added to an existing AD or a row added to the Conventions table.

I found 12 holes: 2 critical, 5 high, 4 medium and 1 low. They are ordered by severity below. Each one gives Unit A, Unit B, the AD-compliant choice each made, the clash, and the smallest tightening that closes it.

---

## H1 — Demo fixture: raw AI output or success envelope? · **CRITICAL**

- **Unit A: demo connector story (backend).** AD-13 says "stage 4 returns the fixture". AD-4 says connector output is "raw AI result + stop status". So the fixture is written as AD-9 raw output, *including* `status: "ok"`, with no `mode` or `skipped_pages`.
- **Unit B: frontend contract-test story.** AD-12 says "frontend tests validate [the fixture] against the TS types". The frontend only has TS types for the AD-11 envelope (`{mode, results, skipped_pages}`), where `results` has *no* `status`. So it writes the fixture as a success envelope, or it adds `status` to its TS `Results` type to make the test pass.
- **Clash:** There can be only one file. Whichever shape is chosen, one side's test fails. Or, worse, the frontend widens its types to accept `status`, and the AD-12 drift guard stops guarding the real wire shape. The fixture also has no defined stop reason, so Gate 1 (AD-10) has nothing to check in demo mode, and each story will invent its own value (`"end_turn"`, `"complete"`, missing).
- **Tightening (AD-12/AD-13):** Use **two committed files with fixed roles**:
  1. `samples/demo-ai-output.json`: AD-9 raw output, including `status`. The demo connector returns it with a fixed neutral stop value `complete` (see H4).
  2. `samples/demo-response.json`: the exact AD-11 success envelope that `POST /api/demo` produces. A backend test generates and asserts it from the real pipeline. Frontend contract and UI tests consume it.

  Only (1) is hand-recorded. (2) is a golden file kept in sync by the backend test.

## H2 — Error envelope vs HTTP layer: bodies that aren't the envelope · **CRITICAL**

- **Unit A: API/route story.** It follows AD-11 for every error *the pipeline raises*. It uses FastAPI defaults for everything else, which the spine never forbids: a missing `file` field gives **422 `{"detail":[…]}`**, `POST /api/demo` in real mode gives **404 `{"detail":"Not Found"}`**, and an early Content-Length rejection from Starlette or the server gives a bare 413. An unhandled exception goes to the `Exception` handler, which runs in `ServerErrorMiddleware`, *outside* `CORSMiddleware`. The 500 then has **no CORS headers**, so the browser reports a network error and never sees `internal_error` or its `reference_id`.
- **Unit B: frontend fetch story.** It branches on `response.ok` and then parses `error_code`. It also follows "unknown code → generic failure". On `{"detail":…}` it finds no `error_code`, and on a CORS-blocked 500 it finds no body at all. Different implementations will crash, show a blank screen or show a generic message, which breaks the AD-11 promise that unknown failures never render blank.
- **Second clash in the same area:** the Conventions table says "4xx user-caused, 5xx for `ai_*`/`internal_error`". It does not place `insufficient_content` (thin document or AI judgement?), `generation_in_progress`, `demo_mode_no_uploads` or `ai_output_invalid` precisely. One story returns `insufficient_content` as 422 and another as 502. That matters if the frontend branches on status.
- **Tightening (AD-11 + Conventions):**
  - Add a **fixed code→HTTP table**: 400 for `unsupported_file_type`, `bad_text_encoding`, `unreadable_file` and `no_extractable_text`; 413 for `file_too_large`; 422 for `insufficient_content`; 409 for `generation_in_progress`; 403 for `demo_mode_no_uploads`; 502 for `ai_output_invalid` and `ai_unavailable`; 429 for `ai_rate_limited`; 402 or 503 for `ai_credits_exhausted` (pick one); 500 for `internal_error`.
  - "Every non-2xx response from the backend has the AD-11 envelope body". Achieve it with handlers for `RequestValidationError`, `StarletteHTTPException` and 404, plus a catch-all **inside** CORS (a pipeline-level try/except or a middleware added *after* CORS), so CORS headers survive on 500s.
  - The frontend decides success vs failure by `"error_code" in body`, never by status alone. It produces its own client-only failure for network errors and timeouts.

## H3 — `insufficient_content` dies in Gate 2 before Gate 3 can see it · **HIGH**

- **Unit A: Gate 2 story.** AD-10 says to parse into the AD-9 models with "all fields present; no empty text". It makes `summary.text` required and non-empty and validates every list item.
- **Unit B: real connector / prompt story.** AD-9 says the honest thin-content signal is `status:"insufficient_content"`. Following AD-9's "never pad", the model returns that status with an empty summary text and empty lists (exactly what a fake connector in AD-20 will also emit).
- **Clash:** Gate 2 rejects the reply as `ai_output_invalid`, so the specific FR-7 `insufficient_content` code can **never** be reached through the real gate order. The unit tests for Gate 3 pass because they feed Gate 3 directly.
- **Tightening (AD-9/AD-10):** "Gate 2 reads `status` first. If `insufficient_content`, all other fields are ignored: they may be empty or missing, and the pass stops with `insufficient_content`. Non-empty-text and per-item rules apply only when `status=ok`." Add a fake-connector test for the full gate chain with this exact payload.

## H4 — Connector interface types are unnamed; provider-error and token-count ownership undefined · **HIGH**

- **Unit A: real connector story.** It uses the SDK's `messages.parse()` with the Pydantic model (natural with structured outputs). It returns a **parsed model**, passes through the SDK's `stop_reason` strings (`end_turn`, `max_tokens`, `refusal`), and lets `anthropic.RateLimitError` etc. propagate as "typed failures" (AD-4 never says *whose* type).
- **Unit B: pipeline Gate 1/2 + fake-connector story.** It expects a **raw JSON string** (Gate 2 "parse into Pydantic"), a neutral stop value, and failures already expressed as AD-11 codes. Because `pipeline` may not import the SDK, it *cannot* catch `anthropic.*` exceptions.
- **Clashes:**
  1. A double parse, or a parse failure raised inside the connector that becomes `internal_error` instead of `ai_output_invalid`.
  2. Gate 1 compares the wrong stop vocabulary.
  3. Provider errors become `internal_error`.
  4. **Cost gate:** AD-15 needs the provider's `count_tokens`, but the gate sits in `pipeline/`, which may not import the SDK. One story puts `import anthropic` in the pipeline (breaking the dependency rule). Another adds a method only the real connector has, and demo or fakes crash, or the gate is skipped incorrectly.
- **Tightening (AD-4):** Define it in `contracts/`:
  - `ConnectorRequest{system: str, document_block: str, inputs: GenerationInputs}`
  - `ConnectorReply{raw_json: str, stop: Literal["complete","length","refusal","other"], input_tokens: int, output_tokens: int}`
  - `ConnectorError(code: Literal["ai_unavailable","ai_rate_limited","ai_credits_exhausted"])`

  The connector **maps all provider exceptions** (timeout, 5xx, 429, 402/insufficient credit, token-count failure) to `ConnectorError`, and never raises SDK types. It returns unparsed text; **Gate 2 is the only parser**. The interface has `count_input_tokens(req) -> int`. Real calls the free endpoint; demo and fakes return a fixed number. The cost gate calls it only when `mode=real`.

## H5 — What exactly is in `results`: filtered or raw pages; shape of empty values · **HIGH**

- **Unit A: Gate 3 story.** It implements AD-10 as a *checker*: it computes filtered pages to decide pass/fail and returns `None` / raises, without changing the model.
- **Unit B: stage 6 story.** It serialises "AD-9 fields minus status" from the connector's parsed output.
- **Clash:** Invalid page numbers that Gate 3 "removed" are shown to the student. That breaks FR-4, and every test still passes. Smaller variants of the same gap:
  - `summary.pages` may be `[]`, `null` or absent ("optional").
  - Pages may be unsorted or duplicated.
  - `skipped_pages` for plain text may be `[]`, `null` or omitted (memlog says empty, spine is silent).
  - The frontend's TS types are then guessed.
- **Tightening (AD-10/AD-11):** "Stage 5 returns a new `ValidatedResults` model built from the filtered data; stage 6 accepts only that type." Every `pages` field is always present as a sorted, de-duplicated `int[]` (possibly `[]` for the Summary and always `[]` for plain text). `skipped_pages` is always present: sorted, `[]` for plain text.

## H6 — Option values unspecified + silent fallback hides a mismatch · **HIGH**

- **Unit A: backend contracts story.** It picks `detail_level ∈ {"brief","standard","detailed"}` and `output_language ∈ {"en","nb"}` (the spine leaves these values as an Open Question).
- **Unit B: frontend form story.** Its select sends `"Standard"`, `"Detailed"`, `"English"`, `"Norsk"`.
- **Clash:** AD-17 says invalid values **silently fall back to defaults**, so every pass runs as `standard`/English whatever the student picks. No error code fires and no test catches it unless written for it. Each side is AD-compliant.
- **Tightening (AD-17 + `/api/status`):** Close the Open Question now with lowercase code values (for example `brief|standard|detailed`, `en|nb`). Have `GET /api/status` return them (`options.detail_level`, `options.output_language`, each with `default`), and have the frontend render its selects **from that response**, not from a hand-copied list. Fall back only when a field is *absent*; *log* a present-but-invalid value. Add a contract test that the TS mirror equals the backend list. Fix the multipart field names exactly: `file`, `course_code`, `detail_level`, `output_language` (all text fields as strings, empty string = unset).

## H7 — Owner and scope of the concurrency lock and the paid-call counter · **HIGH**

- **Unit A: `/api/generate` route story.** It holds an `asyncio.Lock` in the route module around the pipeline call. It increments the call counter inside the real connector *after* a successful reply.
- **Unit B: `/api/demo` route story.** It has its own route and no lock (or its own lock). It also adds the cap check in the cost gate, counting *attempts*, and returns `ai_unavailable` on cap ("ai_credits_exhausted-style" exists only in the memlog; the spine names no code).
- **Clashes:**
  - Two locks mean concurrent demo and generate passes are possible.
  - The lock may be taken after the slow upload read or before it. If before, the second request's body is never drained.
  - The counter can be incremented twice (attempt and success), or missed on timeouts. Since a timed-out call may still be billed, counting only successes under-counts spend.
  - The cap code is inconsistent.
  - Sync vs async: a `threading.Lock` held in a sync route with an async check elsewhere does not exclude anything.
- **Tightening (AD-15/AD-16):** One `PassGuard` object in `pipeline/` owns both.
  - **Lock:** non-blocking acquire at the start of `run_pass` (after the api layer has finished receiving the body), released in `finally`. Both endpoints use it. Failure gives `generation_in_progress`.
  - **Counter:** incremented **immediately before** the paid `messages` call, whatever the outcome. `count_tokens` is not counted.
  - **Cap:** the cap check happens in the cost gate before counting tokens. Cap reached gives **`ai_credits_exhausted`**, with a message saying "run limit reached, restart backend".
  - **Order:** `demo_mode_no_uploads` is checked before the lock.

## H8 — Order and units of limit checks (pages, characters, tokens) · **MEDIUM**

- **Unit A: stage 1 story.** It checks the 80-page limit on `len(reader.pages)` before extraction (cheap, and stops pypdf work on huge files).
- **Unit B: stage 2 story.** It counts pages *with text* after extraction (the "supplied set") and counts characters *after* marker wrapping and neutralisation.
- **Clash:** The same PDF passes in one build and fails in the other. An 85-page PDF with 10 image pages is fine under B and rejected under A. The character count differs by marker overhead. Precedence is also undefined: an 85-page all-image PDF gets `file_too_large` under A and `no_extractable_text` under B. The `file_too_large` "names which limit" requirement has no field, so the frontend can't show it except through `message` (see H9).
- **Tightening (AD-14):**
  - Page limit uses the **total PDF page count** and is checked in stage 1, before extraction.
  - Characters are the **sum of extracted page text before markers**, checked at the end of stage 2 *after* the `no_extractable_text` check.
  - The token ceiling is checked in the cost gate.
  - Add `limit: "bytes"|"pages"|"characters"|"tokens"` to the failure envelope as an optional field (or require it in `message`, see H9).
  - Byte-limit enforcement while receiving belongs to the **api layer**. Stage 1 receives `bytes` (see H10).

## H9 — Who owns user-facing message text · **MEDIUM**

- **Unit A: backend story.** It writes specific `message` strings ("PDF has 112 pages; limit is 80").
- **Unit B: frontend story.** Following AD-11's "frontend maps codes to friendly text", it ignores `message` and shows a fixed per-code string ("File too large").
- **Clash:** The limit-specific detail AD-14 requires is lost. In the reverse combination, the frontend shows the backend `message` and the frontend error-message tests (AD-20 layer 3) assert strings the backend owns. Language mixing is also possible if `output_language` is Norwegian.
- **Tightening (AD-11):** One rule:
  - The frontend owns the headline text per code, plus a generic fallback for unknown codes and client-side network failures.
  - The backend `message` is a **secondary detail line, shown verbatim as plain text** (AD-18).
  - Messages are English. `internal_error` shows the `reference_id`.

## H10 — Pipeline entry type: upload stream vs bytes (demo can't reuse stage 1) · **MEDIUM**

- **Unit A: `/api/generate` + stage 1 story.** `run_pass(upload: UploadFile, …)`, with streaming size checks inside stage 1 (AD-14 "enforced while receiving").
- **Unit B: `/api/demo` story.** It must run stages 1, 2, 3 and 5 on `samples/…pdf` from disk (AD-13). It either builds a fake `UploadFile` or writes a second entry point that skips stage 1, which AD-1 forbids.
- **Tightening (AD-1):** `run_pass(doc: bytes, inputs: GenerationInputs, source: Literal["upload","sample"]) -> ValidatedResponse`. The api layer owns streaming receipt and the byte cap. Stage 1 owns signature sniffing, UTF-8 checks and page count on bytes. `/api/demo` passes the sample bytes with default inputs, and these must match what the fixture was recorded with (note this in the provenance file).

## H11 — Frontend/back-end timeouts and origins/ports · **MEDIUM**

- **Timeouts.** The backend worst case is about count_tokens + 90 s AI call + extraction, so roughly 100 s or more. A frontend story adds a 60 s `AbortController` (reasonable UX) and re-enables Generate on abort. The backend is still running and may still spend money. The student clicks again and gets `generation_in_progress` (confusing), or a second paid call once the first finishes. **Tightening (AD-16):** The frontend sets no client timeout shorter than `AI timeout + 30 s` (or none). Generate stays disabled until a response or network error. Document both values in config/Conventions.
- **Origins.** One story sets `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000`. The backend binds `127.0.0.1` (works with IPv4 but `localhost` may resolve to `::1` on Windows, which fails). Another developer opens the app at `http://127.0.0.1:3000`, which is not the allowed origin `http://localhost:3000`, so CORS fails. **Tightening (AD-3 + Conventions):** Fix canonical strings. The frontend is opened at `http://localhost:3000` and the backend `ALLOWED_ORIGIN` equals exactly that. The frontend calls `http://127.0.0.1:8000` via the non-secret `NEXT_PUBLIC_API_BASE_URL`. The frontend owns only the base URL and the backend owns the port, bind and CORS settings.

## H12 — `/api/status` shape and `reference_id` format · **LOW**

- The `limits` key names and units are unspecified (`max_upload_mb: 10` vs `max_upload_bytes: 10485760`). The frontend pre-check is then off by about 5% or off by a factor of 1,000,000. **Tightening:**
  - Specify `GET /api/status → {mode: "real"|"demo", limits: {max_upload_bytes, max_pdf_pages, max_text_chars}, options: {…per H6}, accepted_types: ["application/pdf","text/plain"]}` as a Pydantic model mirrored in TS.
  - Have the fetch failure of `/api/status` render a "backend not reachable" state.
- `reference_id`: specify 8 lowercase hex chars, generated in the catch-all handler, present **only** on `internal_error`, and written on the same log line as the stack trace.

---

## Proposed additions, condensed

| # | Where | Add |
| --- | --- | --- |
| H1 | AD-12/13 | Two fixtures: `demo-ai-output.json` (AD-9 + status; connector stop=`complete`) and golden `demo-response.json` (AD-11 envelope, backend-generated, frontend-consumed) |
| H2 | AD-11 + Conventions | Code→HTTP table; every non-2xx body is the envelope (validation/404/413 handlers; catch-all inside CORS); frontend discriminates on `error_code` key |
| H3 | AD-10 | `insufficient_content` short-circuits Gate 2; other fields may be empty |
| H4 | AD-4 | Named `ConnectorRequest/Reply/Error` types; neutral stop enum; connector maps provider errors; raw text out, Gate 2 sole parser; `count_input_tokens` on interface |
| H5 | AD-10/11 | Stage 5 emits `ValidatedResults` (filtered); all `pages`/`skipped_pages` always present, sorted, deduped |
| H6 | AD-17 | Fixed lowercase option codes served by `/api/status`; fallback only when absent; exact multipart names |
| H7 | AD-15/16 | Single `PassGuard` in pipeline: one lock across both endpoints, counter before paid call, cap → `ai_credits_exhausted` |
| H8 | AD-14 | Page limit = total pages in stage 1; chars = pre-marker text after `no_extractable_text`; optional `limit` field |
| H9 | AD-11 | Frontend owns headline per code; backend `message` shown as detail line |
| H10 | AD-1 | `run_pass(bytes, inputs, source)`; api layer owns streaming cap |
| H11 | AD-3/16 | Frontend timeout ≥ backend max; canonical origin/base URL strings |
| H12 | Conventions | Full `/api/status` schema; `reference_id` format |
