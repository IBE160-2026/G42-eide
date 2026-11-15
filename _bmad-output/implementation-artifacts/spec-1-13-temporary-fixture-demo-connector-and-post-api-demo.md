---
title: 'Story 1.13: Temporary fixture, demo connector and POST /api/demo'
type: 'feature'
created: '2026-11-15'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<!-- APPROVED at Checkpoint 36 (G0) by the developer on 2026-11-15 (revision 4). The block below is frozen: only the developer can change it. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** the pipeline (Stories 1.6–1.11) and the approved sample lecture (Story 1.12) exist, but nothing runs them for a reviewer. There is no demo connector, no `POST /api/demo` route, no temporary AI-output fixture and no recorded success envelope for the frontend to test against. Stories 1.14–1.21 (sample serving and the demo UI) depend on all of these (C-2, AR-13, AR-14, AR-17).

**Approach:**
- **Temporary fixture:** `samples/demo-ai-output.json`, an AD-9 reply drafted by Claude Code from the approved sample's real text, in Bokmål, with exactly 5 flashcards, 5 quiz items and 5 key concepts and a standard-length summary. Every citation is a supplied page (1, 2, 3, 5 or 6). The developer approves the content and checks every cited page by hand; the check is recorded in `samples/PROVENANCE.md`, which marks the fixture **TEMPORARY**.
- **Demo connector:** `DemoConnector` reads the fixture on every call and returns it unparsed with `stop: "complete"` and zero token counts. It creates no provider client and makes no network call.
- **Route:** `POST /api/demo` runs the real stages 1, 2, 3 and 5 on the sample, with inputs fixed to `standard` and `nb` through `read_generation_inputs`, using one `PassRunner` built at startup with the app's shared `PassGuard`. In real mode it returns `demo_not_enabled`; a request with a non-empty body, or one that disconnects while its body is checked, gets `invalid_request`.
- **Recorded envelope:** `samples/demo-response.json` is the exact AD-11 success envelope, written only by a controlled regeneration command, asserted by a backend test (parsed JSON) and by a frontend runtime shape check against a new TypeScript mirror of `GenerationResponse`.
- **Small carried-over duties:** the `connectors/__init__.py` docstring, a status-fixture drift check, a README note that the demo shows a temporary fixture, and one compatibility correction (C1) so the Story 1.12 tests pass on Windows checkouts with CRLF line endings.
- **Out of scope:** `GET /api/demo/sample.pdf` (Story 1.14), the demo UI (Stories 1.15–1.21), `POST /api/generate` (2.1), the cost gate and counter (2.2), the real connector (2.3) and the final recorded fixture (3.1–3.3).

## Boundaries & Constraints

**Always:**
- **Contracts unchanged:** the AD-9 output shape, the AD-11 envelope and closed error list, the `Connector` protocol and its docstring, `ConnectorRequest`, `ConnectorReply`, `ConnectorError`, `GenerationResponse` and `ValidatedResults` stay exactly as they are. No new error code. The one documented deviation from the protocol docstring is D14.
- **Real content only:** every fixture text states something the approved sample says, in Bokmål; no invented facts, figures or page references. `samples/innkjop-og-lager.md` (the same wording as the PDF's text pages) is the drafting reference.
- **Citations:** every fixture page is in `{1, 2, 3, 5, 6}`; page 4 (image-only) is never cited. The summary and every flashcard, quiz item and key concept cite at least one page. Each `pages` list is strictly increasing, so stage 5's normalisation has nothing to change.
- **No silent removal:** tests prove that stage 5 keeps every raw citation, both by calling `validate_output` directly and end to end through `POST /api/demo`: the validated pages equal the fixture's raw pages for the summary and all 15 items.
- **Manual review of every cited page:** whether each cited page supports its entry, and whether the entry's content matches the sample, is checked only by the developer (`epics.md:164`, `:702`); one result per cited page is recorded in `PROVENANCE.md`, and every result must be "yes" before the fixture is committed.
- **TEMPORARY:** `PROVENANCE.md` states unmistakably that the fixture is TEMPORARY: a development and test fixture drafted by Claude Code, not recorded from a real AI run, to be replaced by a fixture recorded from one approved real run (AD-13) before final demo acceptance and submission. The JSON carries no marker, because its schema forbids extra keys.
- **Fixed inputs:** the route builds its inputs only with `read_generation_inputs(course_code=None, detail_level="standard", output_language="nb")` (1.8-R3).
- **One guard:** the demo `PassRunner` uses `app.state.pass_guard`; a busy guard gives `generation_in_progress` (409) at once (AR-17, Story 1.11 duties).
- **Sync endpoint:** the `POST /api/demo` endpoint is a plain `def` function, so FastAPI runs it, and `run_pass`, in its thread pool (Story 1.11 duty 1). Only the precondition dependency (see "Route") is `async`, and it never calls `run_pass`.
- **Return the instance:** the endpoint returns the `GenerationResponse` instance (Story 1.11 duty 3).
- **No provider client, no network:** `app/connectors/demo.py` imports only `pathlib` and `app.contracts.connector`, and receives its fixture path from the caller. Nothing in this story imports a provider SDK.
- **No content in logs:** no new log line. Failures keep the existing single code-only error line, which contains no file path, exception text, fixture text or sample text (1.8-R4).
- **Fixtures written only on purpose:** `demo-response.json` and `status-response.json` are written only by `main()` of the regeneration command; tests call `render_fixtures()`, which cannot write files.

**Ask First:**
- Any change to the fixture's content after G1, or to `demo-response.json` or `status-response.json` other than through the regeneration command. (The sample PDF and its sources are not an "Ask First" item: they are under "Never".)
- Any new error code, setting or dependency, or any route beyond `POST /api/demo`.

**Never:**
- Changes to `backend/app/pipeline/`, `backend/app/contracts/`, `backend/app/config.py`, `backend/app/api/errors.py`, `backend/pyproject.toml`, `backend/uv.lock`, `frontend/package.json` or `frontend/package-lock.json`.
- Changes to `samples/innkjop-og-lager.pdf`, `.md`, `vareflyt.jpg` or `build_sample_pdf.py`, to the Story 1.12 section of `PROVENANCE.md`, or to `.gitattributes`.
- Changes to any existing test file, except compatibility correction C1 in `backend/tests/test_sample_pdf.py`, limited to what "Compatibility correction C1" allows.
- `GET /api/demo/sample.pdf`, any UI, `POST /api/generate`, a cost gate, a paid-call counter or a real connector.
- A claim anywhere that the demo results come from a real AI run.
- `_bmad-output/planning-artifacts/architecture/technology.md` as a source.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| `epics.md:769-774` (AC1) | fixture follows the unchanged AD-9 schema; only real content and real page markers; developer reviews and approves; each cited page checked and recorded in the provenance note | D6, D7; "Fixture rules"; "Provenance section"; matrix: fixture and provenance rows; gate G1 |
| `epics.md:776-778` (AC2) | the provenance note marks the fixture unmistakably TEMPORARY | D7; "Provenance section"; matrix: provenance row; gate G4 |
| `epics.md:780-784` (AC3) | demo mode: stages 1, 2, 3, 5 run for real with `standard`/`nb`; connector returns the fixture with `stop: "complete"` and fixed token counts; no provider client; success envelope with `mode: "demo"` | D1–D4; "Route"; matrix: route and connector rows |
| `epics.md:786-788` (AC4) | real mode: `demo_not_enabled` (403) | D1; matrix: real-mode rows |
| `epics.md:790` (AC5) | shared lock; a busy demo pass gives `generation_in_progress` | matrix: concurrency rows |
| `epics.md:791` (AC6) | a backend test regenerates and asserts `samples/demo-response.json` | D8; matrix: response-fixture rows (the test regenerates in memory and asserts; only `main()` writes the file) |
| C-2 (`epics.md:116-122`) | temporary fixture rules; final fixture from a real run in its own later story; README makes no real-run claim | D7, D13; "Dependencies" |
| AR-13 / AD-12 (`epics.md:199`, spine l.150) | Pydantic is the source of truth; TS mirrors by hand; `demo-response.json` consumed by frontend tests with a runtime shape check; drift fails CI | D8, D9; "Frontend mirror"; matrix: frontend rows |
| AR-14 / AD-13 (`epics.md:200`, spine l.156) | demo processes only the bundled sample; no key, provider client or network; real mode gives `demo_not_enabled` | D1–D3; matrix |
| AD-4 (spine l.86) | connectors return unparsed text; demo returns the fixture with `stop: "complete"` and a fixed token count | D2, D4 |
| AD-10 (stage 5) | Gate 3 minimum of 5 per list; page-marker validation is not semantic | D6, D7 |
| AD-11 | closed error list and HTTP mapping; unknown methods 405 | "Route"; matrix: error rows |
| AR-17 / AD-16 | one shared `PassGuard`, busy gives 409 | "Route"; concurrency rows |
| Story 1.11 spec, "Integration duties" (`issues.md:65`) | sync endpoint or thread pool; shared guard; return the instance; concurrent HTTP tests with an immediate 409 | "Route"; matrix |
| Story 1.12 spec, "Provides for" (`issues.md:66`) | cite only pages 1, 2, 3, 5, 6; TEMPORARY section in `PROVENANCE.md`; a PDF change invalidates the fixture | "Fixture rules", "Provenance section" |
| 1.8-R3, 1.8-R4 (`issues.md:53-54`) | inputs only through `read_generation_inputs`; never log or return a raw `ValidationError` | "Route"; logging rows |
| `issues.md:61` | correct the `connectors/__init__.py` docstring | D11 |
| `issues.md:42`, `deferred-work.md:30-33` | status-fixture drift check when the shared fixtures arrive | D10 |

## Decisions (developer, 2026-11-15)

- **D1 — wiring at startup:** in demo mode, `create_app` builds one `DemoConnector(SAMPLES_DIR / DEMO_FIXTURE)` and one `PassRunner(connector=…, settings=…, guard=application.state.pass_guard)`, and stores `application.state.demo_runner` (the runner) and `application.state.demo_sample_pdf` (the sample's path). In real mode both are `None` and no `DemoConnector` is built.
- **D2 — fixture read per request:** `DemoConnector.generate` reads the fixture file on every call.
- **D3 — fixed paths:** a new module `backend/app/samples.py` defines `SAMPLES_DIR = Path(__file__).resolve().parents[2] / "samples"` and the fixed names `SAMPLE_PDF = "innkjop-og-lager.pdf"`, `DEMO_FIXTURE = "demo-ai-output.json"` and `DEMO_RESPONSE = "demo-response.json"`. Among production modules only `app/application.py` (paths) and `app/api/demo.py` (the filename `SAMPLE_PDF` passed to stage 1) import it; `scripts/write_fixtures.py` and tests may import it too. The demo connector never imports it; the route takes the sample's *path* from `app.state.demo_sample_pdf`. No new setting.
- **D4 — zero tokens:** `count_input_tokens` returns `0`; replies carry `input_tokens=0` and `output_tokens=0`.
- **D5 — request bodies (OQ1):** `POST /api/demo` takes no body. A request whose body is non-empty, as delivered by the server, is refused with the existing `invalid_request` (400), before the pass lock, whatever its headers say (see "Route").
- **D6 — fixture size:** exactly 5 flashcards, 5 quiz items and 5 key concepts, in Bokmål, with a summary of moderate length covering the main points (stage 3's `standard` guidance).
- **D7 — manual review per cited page:** for every cited page of every entry, the developer records whether that page supports the entry and whether the entry's content matches the sample; all results must be "yes" before the fixture is committed (see "Provenance section").
- **D8 — controlled regeneration (OQ4):** `backend/scripts/write_fixtures.py` (no `__init__.py`; `scripts` is a namespace package), run from `backend/` as `uv run python -m scripts.write_fixtures`, is the only writer of `samples/demo-response.json` and `frontend/__tests__/status-response.json`. It exposes `render_fixtures() -> dict[Path, bytes]`, which reads the samples and renders both files in memory, and `main()`, which writes them. It renders through `fastapi.testclient.TestClient` (from the `httpx2` dev dependency, included by `uv run`). **Byte format:** each artifact is `json.dumps(value, ensure_ascii=False, indent=2) + "\n"`, encoded as UTF-8 without a byte-order mark, with LF line endings (written as bytes, so no platform newline translation), keys in the order the reply produced them. `render_fixtures()` returns exactly these bytes; tests compare parsed JSON, so a CRLF checkout on Windows still compares equal, and `git diff` after `main()` shows no change under `core.autocrlf=true`.
- **D9 — frontend mirror:** TypeScript types mirroring `GenerationResponse` and `ValidatedResults` in `frontend/lib/contracts.ts`, and a runtime shape check `isGenerationResponse` in a new `frontend/lib/generation.ts` (see "Frontend mirror"), tested against `samples/demo-response.json`.
- **D10 — status-fixture drift (OQ3):** the regeneration command also writes the default demo-mode `GET /api/status` reply to `frontend/__tests__/status-response.json`, a test-only artifact. A backend test asserts it; a frontend test asserts that `validStatus()` equals it and passes `isStatusResponse`.
- **D11 — docstring:** `backend/app/connectors/__init__.py` describes the package as the demo and real connectors, with test fakes in `backend/tests/`.
- **D12 — logging:** no new logging anywhere in this story.
- **D13 — README:** a short Norwegian note that the demo shows prepared example results from a TEMPORARY fixture drafted for development and testing, not recorded from a real AI run, to be replaced before final submission; README line 13's "Demomodus … kommer i senere stories" is adjusted to say that the backend demo exists and the demo screen comes later.
- **D14 — installation faults (OQ2):** a missing or unreadable bundled file (the sample PDF or the fixture) is `internal_error` (500), never `ai_unavailable`. This is a documented deviation from the `Connector` docstring for local installation faults only (see "Installation faults").
- **D15 — client disconnect (MINOR-1):** a `ClientDisconnect` raised while the precondition reads the body is caught there, and only there, and becomes `invalid_request` (400). Shared error handlers are unchanged.
- **C1 — compatibility correction:** see "Compatibility correction C1".
- **Architecture source:** `ARCHITECTURE-SPINE.md` only (AD-3, AD-4, AD-9, AD-10, AD-11, AD-12, AD-13, AD-16) and `epics.md` (C-2, AR-13, AR-14, AR-17).

## Fixture rules (`samples/demo-ai-output.json`)

- **Shape:** exactly the AD-9 keys: `{"status": "ok", "summary": {"text", "pages"}, "flashcards": [{"front", "back", "pages"}] ×5, "quiz": [{"question", "answer", "pages"}] ×5, "key_concepts": [{"term", "explanation", "pages"}] ×5}`. No other key, no comment.
- **Encoding:** UTF-8 without a byte-order mark, 2-space indents, Norwegian letters as characters (not `\u` escapes), ending with one newline. Committed with LF line endings; a Windows checkout may show CRLF. Byte-level checks therefore run on the LF-normalised bytes (`\r\n` → `\n`), and require that no other `\r` remains.
- **Text:** Bokmål; every value passes the shared text rule (non-empty after `str.strip()`, no lone surrogates) and contains no control character, Markdown or HTML markup; figures and terms exactly as the sample writes them.
- **Pages:** integers from `{1, 2, 3, 5, 6}`, strictly increasing, at least one per list. Together the entries cite all five text pages.
- **Drafting:** Claude Code drafts it from `samples/innkjop-og-lager.md` and proposes the cited pages for each entry; the developer approves the wording and checks every cited page (G1, D7).

## Route (`POST /api/demo`, `backend/app/api/demo.py`)

**Preconditions:** one `async` dependency, `demo_preconditions(request)`, declared on the route. FastAPI matches the method first (other methods get 405 before it runs), then runs it on the event loop before the sync endpoint, and never reads the body itself because the endpoint declares no body parameter. In this order:
1. **Mode:** if `app.state.demo_runner` is `None` (real mode), raise `AppError("demo_not_enabled")` (403). The body isn't read, no file is read and the lock isn't touched.
2. **Body:** read the request body through `request.stream()`, one ASGI message at a time, as delivered by the server after its own framing (`Content-Length` or chunked). As soon as any message carries at least one byte, stop reading and raise `AppError("invalid_request")` (400). If the stream ends with no bytes, continue. If `starlette.requests.ClientDisconnect` is raised while reading, catch exactly that exception here and raise `AppError("invalid_request")` (D15).
   - **Bounded:** any number of empty messages may be read, but reading stops at the first non-empty one; nothing is accumulated, stored or parsed. The size of that one message is bounded by the server, not by this route: uvicorn's h11 handler pauses reading once more than 64 KiB is buffered, so a single message can exceed 64 KiB by up to one transport read, whose size depends on the platform and event loop. No universal maximum message size is promised.
   - **Header-independent:** no decision uses `Content-Length`, `Transfer-Encoding` or `Content-Type`. An empty chunked body is accepted; a non-empty body is refused even if a header claims otherwise.
   - **Threading:** reading the stream awaits the server and never blocks the event loop; the lock is taken later, inside `run_pass` in the thread pool, so a waiting precondition never holds the lock and a concurrent request still gets 409 at once.

**Endpoint** (plain `def`, after the preconditions):
3. **Inputs:** `read_generation_inputs(course_code=None, detail_level="standard", output_language="nb")`.
4. **Sample:** read `app.state.demo_sample_pdf` as bytes (see "Installation faults").
5. **Pass:** `return app.state.demo_runner.run_pass(pdf, SAMPLE_PDF, inputs, "sample")`. The filename is always the constant `SAMPLE_PDF`, even if a test points `demo_sample_pdf` at another file. Pipeline failures become their AD-11 replies through the existing `PassFailure` handler; `run_pass` releases the lock in `finally`.

Other methods and `HEAD` follow the existing AD-11 rules (`method_not_allowed`, 405, `Allow: POST`); query strings are ignored; CORS behaves as for every route.

**Residual limit (documented, not worked around):** a client that announces a body and then sends nothing keeps its own request waiting in step 2 until it sends data (400) or disconnects (400, D15). It never holds the pass lock, so other requests are unaffected. The backend is local-only (AD-3), so no further timeout is added.

## Demo connector (`backend/app/connectors/demo.py`)

- `DemoConnector(fixture_path: Path)`; satisfies the `Connector` protocol's methods; imports only `pathlib` and `app.contracts.connector`.
- `count_input_tokens(request) -> 0`.
- `generate(request) -> ConnectorReply(raw_json=fixture_path.read_text(encoding="utf-8"), stop="complete", input_tokens=0, output_tokens=0)`, reading the file on every call. `read_text` translates CRLF to LF, so `raw_json` is the same on every platform.
- Never reads or parses `request`, never parses the fixture (Gate 2 does), never logs, never retries.

## Installation faults (D14, OQ2)

- **What happens:** if the fixture is missing or unreadable, `generate` lets `OSError` (or `UnicodeDecodeError`) propagate. If the sample PDF is missing, the endpoint's read raises `OSError` before `run_pass`.
- **Why stage 4 handles it correctly:** stage 4 catches only `ConnectorError` (`backend/app/pipeline/pass_runner.py:86-101`); every other exception propagates unchanged out of `run_pass` after `finally` releases the lock (`pass_runner.py:79-80`), as Story 1.11 specifies (Story 1.11 spec: "Execution", line 174; "Stage 4", line 217; and the "Stage 4 unexpected error" matrix row, line 294). No `PassFailure` handler matches it, so the existing `CatchAllMiddleware` (`backend/app/api/errors.py:169-176`) turns it into `internal_error` (500) with one code-only log line and no traceback, path or message in the reply.
- **Documented deviation:** the `Connector` docstring (`backend/app/contracts/connector.py:85`) says both methods "may raise `ConnectorError` and nothing else". `DemoConnector` deviates from that sentence for local installation faults only: it may raise `OSError` or `UnicodeDecodeError`, and it never raises `ConnectorError`, because no AI provider is involved. The developer approved this deviation (2026-11-15). The protocol and its docstring are not changed; `contracts/` is outside this story.
- **Why not `ai_unavailable`:** `ConnectorError` codes describe AI-provider failures; a missing bundled file is a broken installation, and a 502 "AI unavailable" would mislead.
- **A broken (unparseable or invalid) fixture** is different: the file is read, so stage 5 rejects it as `ai_output_invalid` (502), exactly as for any connector reply.
- **A present but changed sample PDF** would surface stage 1 or 2 codes (for example `unreadable_file`), not `internal_error`; Story 1.12's pinned SHA-256 test guards against that.

## Frontend mirror (`frontend/lib/contracts.ts`, `frontend/lib/generation.ts`)

`isGenerationResponse(value)` mirrors the success contract as the backend emits it in JSON (`GenerationResponse` serialised in JSON mode). It does not replicate Python's input coercion or strict-type validation (see "Numbers"):
- **Keys:** exactly `mode`, `results`, `skipped_pages` at the top; exactly `summary`, `flashcards`, `quiz`, `key_concepts` in `results`; exactly the AD-9 item keys in each item. Any missing or extra key at any level is rejected (the backend models forbid extra keys).
- **`mode`:** `"demo"` or `"real"`.
- **Lists:** `flashcards`, `quiz` and `key_concepts` are arrays of any length, including empty (the counts are a stage 5 rule, not part of the model).
- **Pages (`ResultPages`, including `skipped_pages`):** arrays of integers that are `Number.isSafeInteger` and greater than 0, strictly increasing; an empty array is valid (plain-text results, a PDF with no skipped page).
- **Text (`ResultText`):** a string that contains at least one character outside Python's `str.isspace()` set and no unpaired UTF-16 surrogate. Supplementary-plane characters (for example emoji or mathematical symbols), which JavaScript stores as a valid high-plus-low surrogate pair, are accepted; only an isolated high surrogate (U+D800–U+DBFF not followed by a low one) or an isolated low surrogate (U+DC00–U+DFFF not preceded by a high one) is rejected. The whitespace set is written out explicitly in `generation.ts` as the 29 code points U+0009–U+000D, U+001C–U+001F, U+0020, U+0085, U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F and U+3000. JavaScript's `trim()` is not used, because it treats U+FEFF as whitespace and U+001C–U+001F and U+0085 as text, unlike the backend.
- **Numbers:** JSON parsing in JavaScript cannot distinguish `1` from `1.0`, and integers above 2^53 − 1 are not safe; the validator therefore accepts `1.0` and rejects such large integers, while the backend's strict validation would do the opposite. The backend never emits either (it writes page numbers as small integers), so the emitted contract is mirrored exactly.
- **Loading test files:** frontend tests read `samples/demo-response.json` and `frontend/__tests__/status-response.json` with `readFileSync(resolve(__dirname, …), "utf8")` and `JSON.parse`, as `frontend/__tests__/globals-css.test.ts` already does; no JSON is imported from outside `frontend/`.

## Compatibility correction C1 (`backend/tests/test_sample_pdf.py`)

- **Problem (verified by the independent review):** with `core.autocrlf=true`, the Windows working copy has CRLF line endings in `samples/innkjop-og-lager.md` (`git ls-files --eol`: `i/lf w/crlf`). The Story 1.12 tests read it as checked out, so `test_sample_provenance` hashes CRLF text (hash not in `PROVENANCE.md`) and `test_sample_reproducible_build[crlf]` turns `\r\n` into `\r\r\n`, which the build script rejects. Result on this machine: 1,012 passed, 2 failed. CI on Linux is unaffected.
- **The only change:** the `sample_source` fixture (`test_sample_pdf.py:257-258`) normalises CRLF to LF after decoding: `SAMPLE_SOURCE.read_bytes().decode("utf-8").replace("\r\n", "\n")`.
- **Effect:** the provenance check computes its hash from the LF-normalised approved source (`c4d3f690…`, the hash of the committed LF text) and compares it with the hash recorded in `PROVENANCE.md`; the `lf` rebuild uses that text and the `crlf` rebuild converts it to CRLF exactly once, as intended. Both rebuilds must still reproduce the pinned PDF bytes and SHA-256.
- **Precisely what changes:** the provenance check no longer reacts to the line endings of the checked-out file (which git's `core.autocrlf` controls), only to its content; the content itself remains guarded by that hash, the pinned PDF hash and both rebuild assertions.
- **Unchanged:** every assertion, the pinned PDF hash and size, the approved JPEG hash, every other fixture and test, the sample files and the build script. No test is skipped and no assertion is removed.

## Provenance section (`samples/PROVENANCE.md`)

A new section below the Story 1.12 section, which stays unchanged, starting with its own `## ` heading.

**Protection of the Story 1.12 section:** a test extracts that section deterministically from the LF-normalised file: from the line `` ## Sample lecture: `innkjop-og-lager.pdf` `` up to, but not including, the next line that starts with `## ` (or the end of the file), joined with `\n` and with trailing whitespace removed. Its SHA-256 must equal the pinned value `75093dc975910833d664ac0433d597b8c88d6f6649949be7b557d1c393eec399`, computed from the committed file at `d19fbb2` (the working copy gives the same value). The test needs no git history, so it works with CI's shallow checkout, and the approved section itself is not edited.

The new section records:
- **File and status:** `demo-ai-output.json`, the SHA-256 of its LF-normalised bytes, and the word **TEMPORARY** in the heading and the first sentence.
- **What it is:** a development and test fixture drafted by Claude Code from the approved sample's text on the drafting date; **not recorded from a real AI run**; inputs `standard`, `nb`.
- **Replacement:** to be replaced by a fixture recorded from one approved real AI run, manually reviewed and committed with its own provenance note (date, model ID, inputs, reviewed), before final demo acceptance and submission (C-2, AD-13; Stories 3.1–3.3).
- **Citation review (D7):** a Markdown table with exactly one row per cited page of every entry, and the columns `Entry | Page | Page supports entry | Content matches sample | Reviewer | Date`. `Entry` is `summary`, `flashcards[1]`–`[5]`, `quiz[1]`–`[5]` or `key_concepts[1]`–`[5]` (1-based); `Page` is one page number. Rows appear in fixture order (summary, then flashcards, quiz and key concepts, each in order) and, within an entry, in ascending page order, with no duplicates. Both judgement columns must read `yes` in every row before the fixture is committed; `Reviewer` and `Date` (`YYYY-MM-DD`) are filled in every row; a correction is made in the fixture and re-reviewed, never left as a "no" row.
- **Approval:** the developer's approval of the content and citations (G1) and of this section (G4), with dates.
- **Derived file:** `demo-response.json` is generated from the fixture by `scripts/write_fixtures.py` and changes whenever the fixture or the sample changes.
- **U-1:** still open; the fixture is AI-drafted, so it is for development and testing only.

## Approval gates

- **G0:** this spec approved and frozen; the spec commit on branch `story/1-13-temporary-fixture-demo-connector-and-post-api-demo`.
- **G1 — fixture content:** Claude Code drafts `demo-ai-output.json` with proposed citations; the developer approves the wording and checks every cited page; all review rows read `yes`.
- **G2 — code:** connector, route, wiring, script, tests and C1 implemented; the backend and frontend suites and `npm run build` pass.
- **G3 — recorded envelopes:** `demo-response.json` and `status-response.json` written by `main()` and reviewed.
- **G4 — documentation:** the `PROVENANCE.md` section and the README note approved.
- **G5 — commit:** the usual approval of the exact staged file list.

## I/O & Edge-Case Matrix

Unless a row says otherwise:
- **App:** `create_app(make_settings())` (demo mode) with `TestClient` and an allowed `Origin` header; real mode uses `make_settings(ai_mode="real", anthropic_api_key=<test placeholder>)`.
- **Fixture and sample:** the committed `samples/demo-ai-output.json` and `samples/innkjop-og-lager.pdf`, unless a row replaces `app.state.demo_runner` or `app.state.demo_sample_pdf`.
- **JSON comparison:** `json.loads` on both sides.
- **Raw ASGI:** `await app(scope, receive, send)` with an `http` scope for `POST /api/demo`, a scripted `receive` that records each call, and a `send` that collects the reply; used wherever the number or kind of ASGI messages matters, because `TestClient` buffers a whole body into one message.
- **Logs:** the `logs` fixture pattern from `backend/tests/test_errors.py:120-130` (the capture handler attached to the non-propagating `app.errors` logger), plus `capsys` for stderr.
- **"Lock free afterwards":** `app.state.pass_guard.locked()` is `False`; a fresh `app.state.pass_guard.try_acquire()` returns `True` and is released at once; and, after the test restores the default `state.demo_runner` and `state.demo_sample_pdf` it had replaced, a following `POST /api/demo` gets 200.

| Scenario | Input | Expected Output / Behavior | Error Handling |
|----------|-------|---------------------------|----------------|
| Fixture shape | `json.loads(fixture)` | validates as `AiOutput`; `status == "ok"`; exactly 5 flashcards, 5 quiz items, 5 key concepts; no extra keys at any level | N/A |
| Fixture text | every text value | passes `is_valid_result_text`; no control character, `<`, `>`, backtick or `**` | N/A |
| Fixture pages | every `pages` list | non-empty; strictly increasing; a subset of `{1, 2, 3, 5, 6}`; never contains 4 | N/A |
| Fixture coverage | all cited pages together | include 1, 2, 3, 5 and 6 | N/A |
| Fixture language | all text | contains at least one of æ, ø, å | N/A |
| Fixture encoding | LF-normalised file bytes | UTF-8, no byte-order mark, no remaining `\r`, ends with exactly one newline | N/A |
| No silent removal, stage 5 | `validate_output(ConnectorReply(raw_json=fixture, stop="complete", input_tokens=0, output_tokens=0), stage 2 of the sample)` | succeeds; validated pages equal the raw pages for the summary and each of the 15 items | N/A |
| No silent removal, end to end | `POST /api/demo` | every `pages` array in the reply equals the fixture's raw pages, in the same item order | N/A |
| Page 4 control | the fixture with 4 added to one item's pages, through `validate_output` | succeeds, but that item's validated pages lack 4: the comparison above would fail, so it detects page 4 | N/A |
| Connector reply | `DemoConnector(path).generate(request)` | `raw_json == path.read_text(encoding="utf-8")`; `stop == "complete"`; tokens `0, 0` | N/A |
| Connector tokens | `count_input_tokens(request)` | `0` | N/A |
| Connector reads per call | a temporary fixture file changed between two calls | the second reply has the new text | N/A |
| Connector missing file | a path to a missing file | an `OSError` subclass, not `ConnectorError` | `OSError` |
| Connector imports | `app.connectors.demo` source | imports only `pathlib` and `app.contracts.connector`; no `app.samples`, no SDK | N/A |
| Demo success | `POST /api/demo`, no body | 200; JSON with exactly `mode: "demo"`, `results`, `skipped_pages: [4]`; `access-control-allow-origin` echoes the allowed origin | N/A |
| Fixed inputs | spies on `read_generation_inputs` and on the connector's request | called with `course_code=None, detail_level="standard", output_language="nb"`; the request's inputs are `standard`/`nb` | N/A |
| Real stages run | spies on stages 1, 2, 3 and 5 (as in Story 1.11's recorders) | each called once; stage 1 with the sample's bytes and `innkjop-og-lager.pdf` | N/A |
| Startup wiring, demo | `create_app(demo settings)` | `state.demo_runner` is a `PassRunner` whose private `_guard` is `state.pass_guard` (inspected deliberately); `state.demo_sample_pdf == SAMPLES_DIR / SAMPLE_PDF` | N/A |
| Startup wiring, real | `create_app(real settings)` with a spy on `DemoConnector` | `state.demo_runner is None`; `state.demo_sample_pdf is None`; `DemoConnector` never constructed | N/A |
| Real mode refused | `POST /api/demo` in real mode | 403 `demo_not_enabled`; no file read; guard never acquired | `AppError` |
| Body check after mode | real mode, non-empty body | 403 `demo_not_enabled` | `AppError` |
| Body refused | `POST /api/demo` with `{}` JSON; with form data; with a generator body (sent chunked, without `Content-Length`) | 400 `invalid_request`; no stage runs; guard never acquired. (Through `TestClient` these cases differ only in headers, not in ASGI framing.) | `AppError` |
| Misleading header | a non-empty body with a `Content-Length: 0` header (in-process; a real HTTP/1.1 server would frame by the header) | 400 `invalid_request` (the delivered body decides) | `AppError` |
| Empty body accepted | no body; `Content-Length: 0`; an empty generator body | 200 as "Demo success" | N/A |
| Bounded read (raw ASGI) | scripted messages: empty with `more_body=True`, 70,000 bytes with `more_body=True`, then `b"b"`, then `b"c"` | 400 `invalid_request`; `receive` called exactly twice; no stage runs; guard never acquired | `AppError` |
| Empty messages accepted (raw ASGI) | scripted messages: empty with `more_body=True`, then empty with `more_body=False` | 200 as "Demo success" | N/A |
| Client disconnect (raw ASGI) | scripted messages: empty with `more_body=True`, then `http.disconnect`; and `http.disconnect` as the first message | 400 `invalid_request` sent; one INFO log line with code `invalid_request`; no `internal_error`; guard never acquired | `AppError` |
| Query ignored | `POST /api/demo?x=1` | 200 as "Demo success" | N/A |
| Methods | `GET`, `PUT`, `HEAD` on `/api/demo` | 405 `method_not_allowed`, `Allow: POST`; `HEAD` has no body | N/A |
| Busy guard | the test holds `state.pass_guard`, then posts | 409 `generation_in_progress` at once; the holder's lock untouched | `PassFailure` |
| Concurrent requests | `state.demo_runner` replaced by a runner on `state.pass_guard` whose connector blocks on an event; two threads post with their own clients | the second gets 409 while the first runs; the first then gets 200; lock free afterwards | N/A |
| Missing sample | `state.demo_sample_pdf` set to a missing file | 500 `internal_error`; lock free afterwards | catch-all |
| Missing fixture | `state.demo_runner` replaced by a runner whose `DemoConnector` points to a missing file | 500 `internal_error`; lock free afterwards | catch-all |
| Broken fixture | a runner whose `DemoConnector` points to a temporary file with invalid JSON | 502 `ai_output_invalid`; lock free afterwards | `PassFailure` |
| Logs on success | `POST /api/demo` with the `logs` fixture and `capsys` | no `app.errors` record; nothing on stderr | N/A |
| Logs on failure | the missing-sample, missing-fixture, broken-fixture and body-refused cases, with the `logs` fixture and `capsys` | exactly one `app.errors` record each, with the expected code, `exc_info` unset; no record, stderr output or reply body contains a file path, the sample or fixture name, exception text (for example "No such file"), fixture text, sample text or a page marker | N/A |
| Response fixture | `json.loads(samples/demo-response.json)` and `render_fixtures()` | the committed file equals the rendered one, and both equal a fresh `POST /api/demo` reply | N/A |
| Response fixture shape | the same JSON | `mode == "demo"`, `skipped_pages == [4]`, arrays throughout | N/A |
| Status fixture | `json.loads(frontend/__tests__/status-response.json)` and `render_fixtures()` | equal to each other and to a fresh default demo-mode `GET /api/status` reply | N/A |
| Regeneration isolation | `render_fixtures()` with `AI_MODE=real`, lower-case `ai_mode=real`, `MAX_PDF_PAGES=5`, an invalid `ALLOWED_ORIGIN`, and `Settings.model_config["env_file"]` pointed at a temporary `.env` setting `AI_MODE=real` and `MAX_PDF_PAGES=3` | same output as in a clean environment; the script builds settings with `_env_file=None` and every field passed explicitly at its default. (`ai_mode` and `AI_MODE` are distinct variables only on case-sensitive systems such as Linux CI; on Windows they are the same variable.) | N/A |
| Rendering never writes | `render_fixtures()` with `Path.write_bytes`, `Path.write_text`, `Path.open` and `builtins.open` patched to raise for any write, append, exclusive or update mode | succeeds and returns both files; no write attempted | N/A |
| Frontend shape check | `isGenerationResponse(demo-response.json)` (Vitest) | `true` | N/A |
| Frontend positive cases | `mode: "real"`; empty `summary.pages`; empty item `pages`; empty lists; `skipped_pages: []`; non-ASCII text; a text that is only U+FEFF; an emoji (U+1F600 "😀", a surrogate pair); a mathematical symbol (`"x 𝑥"`, U+1D465, a surrogate pair) | `true` for each | N/A |
| Frontend negative cases | missing key; extra key at the top, in `results` and in an item; `mode: "other"`; pages `[0]`, `[1.5]`, `["1"]`, `[2, 1]`, `[1, 1]`; text `""`, `"   "`, only U+0085, only U+001C; an isolated high surrogate (`"a\uD800b"`); an isolated low surrogate (`"a\uDC00b"`); a reversed pair (`"\uDE00\uD83D"`) | `false` for each | N/A |
| Frontend status drift | `validStatus()` and `status-response.json` (Vitest) | deep-equal; `isStatusResponse` is `true` | N/A |
| Provenance | `samples/PROVENANCE.md` | the fixture section contains "TEMPORARY", "not recorded from a real AI run", the replacement duty, the fixture's LF-normalised SHA-256 and "U-1"; the extracted Story 1.12 section hashes to the pinned `75093dc9…` (see "Provenance section") | N/A |
| Provenance citation table | the review table parsed from `PROVENANCE.md` and the fixture | the ordered list of (entry, page) rows equals exactly the fixture's citations in fixture order, ascending pages within an entry, no duplicates; both judgement columns read `yes`; `Reviewer` is non-empty and `Date` matches `YYYY-MM-DD` in every row | N/A |
| README | `README.md` | contains the D13 note; no claim of a real AI run | N/A |
| Docstring | `app/connectors/__init__.py` | no longer says test fakes are in the package | N/A |
| C1 compatibility | `test_sample_pdf.py` on this CRLF working copy and in CI | all its tests pass; the provenance hash and both rebuilds use LF-normalised source; no assertion removed or relaxed | N/A |
| Existing suites | all existing backend and frontend tests and `npm run build` | pass; lockfiles unchanged; `test_sample_pdf.py` is the only modified existing test file | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/samples.py` (new) -- `SAMPLES_DIR`, `SAMPLE_PDF`, `DEMO_FIXTURE`, `DEMO_RESPONSE` -- D3.
- `backend/app/connectors/demo.py` (new) -- `DemoConnector` -- D2, D4, D14.
- `backend/app/connectors/__init__.py` (modified, docstring only) -- D11.
- `backend/app/api/demo.py` (new) -- `demo_preconditions` and the `POST /api/demo` endpoint -- D1, D5, D14, D15.
- `backend/app/application.py` (modified) -- `state.demo_runner`, `state.demo_sample_pdf`, include the demo router -- D1.
- `backend/scripts/write_fixtures.py` (new; no `__init__.py`) -- `render_fixtures()` and `main()` -- D8, D10.
- `backend/tests/test_demo.py` (new) -- the backend matrix rows.
- `backend/tests/test_sample_pdf.py` (modified, **compatibility correction C1 only**) -- the `sample_source` fixture.
- `samples/demo-ai-output.json` (new) -- the TEMPORARY fixture -- G1.
- `samples/demo-response.json` (new, generated) -- G3.
- `samples/PROVENANCE.md` (modified, new section only) -- G4.
- `frontend/lib/contracts.ts` (modified, types added) -- D9.
- `frontend/lib/generation.ts` (new) -- `isGenerationResponse` -- D9.
- `frontend/__tests__/generation.test.ts` (new) -- frontend shape rows.
- `frontend/__tests__/status-response.json` (new, generated, test-only) -- D10.
- `frontend/__tests__/status-fixture.test.ts` (new) -- status drift row.
- `README.md` (modified) -- D13.
- Read-only: `backend/app/pipeline/pass_runner.py` (`PassRunner`, `run_pass`, stage 4), `pass_guard.py`, `stage3_prompt.py:159` (`read_generation_inputs`), `stage5_gates.py` (`validate_output`), `backend/app/api/errors.py` (`AppError`, handlers, `CatchAllMiddleware`), `backend/app/contracts/*`, `backend/tests/conftest.py` (`make_settings`, environment isolation), `backend/tests/test_errors.py` (`logs` fixture pattern), `backend/tests/test_pass_runner.py` (recorder and concurrency patterns), `frontend/lib/status.ts` (`isStatusResponse` style), `frontend/__tests__/status-fixtures.ts` (`validStatus`).

## Tasks & Acceptance

**Execution** (after G0):
- [ ] C1 in `backend/tests/test_sample_pdf.py`, first, so the baseline suite is green on this machine.
- [ ] Draft `samples/demo-ai-output.json` with proposed citations; developer review of every cited page -- G1.
- [ ] `backend/app/samples.py`, `connectors/demo.py`, `connectors/__init__.py`, `api/demo.py`, `application.py` -- D1–D5, D11, D14, D15.
- [ ] `backend/scripts/write_fixtures.py`; run `main()` to write `demo-response.json` and `status-response.json` -- D8, D10, G3.
- [ ] `backend/tests/test_demo.py` -- backend rows.
- [ ] `frontend/lib/contracts.ts`, `frontend/lib/generation.ts`, `frontend/__tests__/generation.test.ts`, `status-fixture.test.ts` -- D9, D10.
- [ ] `samples/PROVENANCE.md` section and `README.md` note -- D7, D13, G4.

**Acceptance Criteria:**
- Given the backend, when `uv sync --locked && uv run pytest -q` run, then all tests pass (the existing 1,014 plus the new ones), also with `-W error`, on this Windows working copy (after C1) and in CI, with no new dependency.
- Given the frontend, when `npm ci && npm test && npm run build` run, then all tests pass (the existing 97 plus the new ones) and the build succeeds, with no new dependency.
- Given `cd backend && uv run python -m scripts.write_fixtures`, when run on the committed files, then `git diff --exit-code` shows no change to either fixture.
- Given the repository, when compared with the spec commit, then only the files in the Code Map and this spec changed. Separately approved administrative entries may be added at later checkpoints.

## Dependencies & deferred work

- **Depends on:** Story 1.11 (`PassRunner`, `PassGuard`, `GenerationResponse`, the `PassFailure` handler) and Story 1.12 (the pinned sample), both merged.
- **Provides for:** Story 1.14 (`app/samples.py` and `state.demo_sample_pdf` for `GET /api/demo/sample.pdf`); Story 1.15 (`POST /api/demo`, which the UI calls with no body; `isGenerationResponse`); Stories 1.16–1.21 (the recorded envelope for UI tests); Stories 3.1–3.3 (the fixture to replace, and the regeneration command).
- **Closes, at closeout, if verified:** `issues.md:61` (docstring); `issues.md:42` and the `deferred-work.md` status-drift entry (D10); the Story 1.13 half of `issues.md:65` (Story 2.1's half stays open); `issues.md:66` (Story 1.12 duties); the Story 1.13 parts of 1.8-R3 and R4.
- **New deferred item, recorded at closeout:** `backend/app/contracts/connector.py:4` ("the demo and real connectors come later") becomes outdated once `DemoConnector` exists; `contracts/` is outside this story, so a later approved change corrects it. The D14 deviation should be reflected in the protocol docstring at the same time, if approved.
- **Stays open:** U-1; `issues.md:6` until the final fixture (Story 3.2); 1.8-R2, R5, S1/S2; the Story 2.1 route duties.
- **Note on the Story 1.12 spec:** its "Provides for" says stage 5 enforces the page restriction. Stage 5 actually filters unsupplied pages silently and fails only when an item is left with none; this story's "no silent removal" rows close that gap. The frozen Story 1.12 spec is not changed; C1 changes only one test fixture, not the spec.
- **Structural seed:** `backend/app/samples.py` and `backend/scripts/` are additions to the AD structural seed and to `epic-1-context.md:52`; both are named here and in the Code Map.

## Open questions

None. OQ1–OQ4 and the review decisions were answered by the developer on 2026-11-15 and are recorded in D5, D8, D10, D14, D15 and C1.

## Implementation Notes

## Spec Change Log

- **2026-11-15, revision 2 (Checkpoint 31):** applied the developer's answers to OQ1–OQ4 and the draft review: a bounded stream check in an `async` precondition dependency; "Installation faults" and D14; `render_fixtures()` and `uv run python -m scripts.write_fixtures`; `DemoConnector` receives its path from `create_app`; `state.demo_sample_pdf`; end-to-end "no silent removal"; regeneration isolation; LF-normalised fixture hash. Matrix 41 → 45 rows.
- **2026-11-15, revision 3 (Checkpoint 33):** applied the independent adversarial review (NOT READY: MAJOR-1, MAJOR-2, MINOR-1 to MINOR-10, N1–N9) with the developer's decisions:
  - **MAJOR-1:** compatibility correction C1 (option A) added to the Code Map, the Never list, the tasks, the acceptance criteria and the matrix; the false claim that the working copy was unaffected removed.
  - **MAJOR-2:** "Bounded read" is now a raw-ASGI test with scripted messages; a raw-ASGI "empty messages" row added; the `TestClient` body rows note that they differ only in headers.
  - **MINOR-1:** D15, catching `ClientDisconnect` narrowly in the precondition, with a raw-ASGI disconnect row.
  - **MINOR-2:** "Logs on success" and "Logs on failure" rows using the `logs` fixture pattern, `capsys`, and checks for paths and exception text.
  - **MINOR-3:** D3 now lets `app/api/demo.py` import `SAMPLE_PDF`; the filename passed to stage 1 is always the constant.
  - **MINOR-4:** "Installation faults" records the approved docstring deviation, corrects the Story 1.11 citation, and the stale `connector.py:4` sentence is a new deferred item.
  - **MINOR-5:** the hash-based "no test writes fixtures" row replaced by a write-blocking "Rendering never writes" row.
  - **MINOR-6:** settings built with `_env_file=None` and every field passed explicitly; the isolation row covers lower-case names, an invalid value and a temporary `.env`.
  - **MINOR-7:** a new "Frontend mirror" section with the exact key, page and whitespace rules (Python's 29 `isspace` code points, not `trim()`); positive and negative frontend rows.
  - **MINOR-8:** `npm run build` in G2, the acceptance criteria and Verification.
  - **MINOR-9:** the review table has one row per cited page with "page supports entry" and "content matches sample" columns, all `yes` before commit; a new "Provenance citation table" row binds it to the fixture.
  - **MINOR-10:** byte checks run on LF-normalised bytes; the connector row compares with `read_text`.
  - **Notes:** N1 bounded-size wording; N2 misleading-header clarification; N3 corrected AC line references; N4 no `__init__.py` and the `httpx2` note; N5 README line 13 adjusted under D13; N6 "any route beyond `POST /api/demo`"; N7 changed-PDF note; N8 CORS assertion in "Demo success"; N9 `_guard` inspection stated. `api/errors.py` added to the Never list.
  - **Matrix:** 45 → 51 rows.
- **2026-11-15, revision 4 (Checkpoint 35):** applied the independent verification of revision 3 (READY, with MINOR-A, MINOR-B and NOTE-1 to NOTE-10):
  - **MINOR-A:** "Lock free afterwards" now checks `locked()`, a fresh `try_acquire()` and, after restoring the replaced runner or sample path, a 200 follow-up.
  - **MINOR-B:** valid surrogate pairs (emoji, mathematical symbol) are accepted; isolated high and low surrogates and a reversed pair are rejected; the text rule says so.
  - **NOTE-1:** Story 1.11 references corrected to "Execution" l.174, "Stage 4" l.217 and the "Stage 4 unexpected error" row l.294.
  - **NOTE-2:** the body-size wording no longer promises a maximum; one message can exceed 64 KiB by up to one transport read.
  - **NOTE-3:** C1 states precisely that the provenance hash is computed from the LF-normalised source and that the pinned PDF and rebuild assertions are kept.
  - **NOTE-4:** the isolation row notes that `ai_mode` and `AI_MODE` are distinct only on case-sensitive systems.
  - **NOTE-5:** the Story 1.12 section of `PROVENANCE.md` is protected by a pinned SHA-256 (`75093dc9…`) of a deterministically extracted, LF-normalised section; no git history needed.
  - **NOTE-6:** sample files removed from "Ask First"; they stay under "Never".
  - **NOTE-7:** the citation-table test compares an ordered list and requires non-empty `Reviewer` and a `YYYY-MM-DD` `Date`.
  - **NOTE-8:** the frontend validator is described as mirroring the emitted JSON contract, with the number differences stated.
  - **NOTE-9:** frontend tests read the JSON files with `readFileSync`, as `globals-css.test.ts` does.
  - **NOTE-10:** D8 specifies the generated files' byte format (UTF-8, 2-space indent, final LF, written as bytes) and platform-safe comparison.
  - **Matrix:** unchanged at 51 rows (rows reworded, none added).
- **2026-11-15, Checkpoint 36 (G0 approval):** the developer approved revision 4 without changes. The status went from `draft` to `ready-for-dev`, and the pending-approval markers were replaced by the frozen block. No requirement, decision, test expectation or gate changed; the matrix stays at 51 rows.

## Review Triage Log

- **2026-11-15 — independent adversarial review of revision 2:** NOT READY. Two MAJOR (verified), ten MINOR, nine notes. All MAJOR and MINOR findings and the useful notes applied in revision 3 with the developer's decisions (see the Spec Change Log).
- **2026-11-15 — independent verification of revision 3:** READY for G0. Both MAJOR and nine of ten MINOR findings resolved (MINOR-7 partly, because of the gap in MINOR-B). Two new MINOR findings (MINOR-A lock recovery, MINOR-B supplementary Unicode) and ten notes; all applied in revision 4. The verifier confirmed by in-memory probes: the C1 normalisation reproduces the pinned PDF and provenance hash; the raw-ASGI bounded read (exactly 2 `receive` calls), empty-message and disconnect cases; the 29 `isspace` code points; settings isolation; the write-blocking patches; and stage 5's silent filtering of page 4.
- **2026-11-15 — Checkpoint 36: APPROVED by the developer (G0)** (revision 4).
  - **The decision:** the spec is frozen and set to `ready-for-dev`; gate G0 is met. The approval covers the specification design only; implementation starts at a later checkpoint.
  - **What it fixes:** the requirements, D1–D15 and C1, the fixture rules, the route and body-check design, the demo connector, installation faults, the frontend mirror, compatibility correction C1, the provenance section and its protections, the approval gates G0–G5, the 51-row acceptance matrix and the Code Map scope.
  - **What changed at approval:** this status change, the approval comment, the frozen-block markers and these log entries only.

## Design Notes

- **Why the fixture is read per request:** a regenerated or corrected fixture never needs a restart, and a missing file shows up as a clear 500 that tests can prove.
- **Why a stream check, not headers:** headers can be absent (chunked) or wrong, and in-process clients don't frame by them. The server's own framing decides what the body is; stopping at the first non-empty message keeps the check bounded, and doing it in an `async` dependency keeps the endpoint a sync `def` function for the thread pool.
- **Why raw ASGI for the bound:** `TestClient` reads a whole body into one message before the app sees it, so only scripted `receive` calls can show how many messages the check consumes.
- **Why a disconnect is `invalid_request`:** a client that leaves mid-body sent an incomplete request; reporting it as a 500 with an ERROR line would look like a backend fault.
- **Why paths live on `app.state`:** the connector and the route stay free of module-level paths, so tests can point them at temporary files without patching, and `app.samples` stays the one place that knows the repository layout.
- **Why "no silent removal" is tested twice:** Gate 3 keeps an item if at least one of its pages survives, so a page 4 citation would vanish without any error. Comparing raw and validated pages, directly and through the route, catches that.
- **Why parsed-JSON comparison and LF-normalised hashes:** `core.autocrlf=true` checks JSON and Markdown files out with CRLF on Windows; bytes differ by platform, parsed JSON and LF-normalised hashes don't.

## Verification

**Commands:**
- `cd backend && uv sync --locked && uv run pytest -q` -- expected: all pass
- `cd backend && uv run pytest -q -W error` -- expected: all pass
- `cd frontend && npm ci && npm test && npm run build` -- expected: all pass, build succeeds
- `cd backend && uv run python -m scripts.write_fixtures && git diff --exit-code -- ../samples/demo-response.json ../frontend/__tests__/status-response.json` -- expected: no change
- `git diff -- backend/uv.lock backend/pyproject.toml frontend/package.json frontend/package-lock.json` -- expected: empty
