---
title: 'Story 1.10: Validate AI output with three gates (stage 5)'
type: 'feature'
created: '2026-11-14'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<!-- APPROVED at Checkpoint 1 by the developer on 2026-11-14 (revision 3). The block below is frozen: only the developer can change it. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A connector returns the AI's reply as unparsed text with a stop reason (Story 1.9). Nothing yet decides whether that reply is complete, well formed, honest about thin material, and cites only real PDF page markers. Until something does, a truncated, padded, malformed or wrongly cited reply could reach the student as if it were a finished result (FR-3, FR-4, FR-7).

**Approach:**
- **The gates:** add stage 5, `validate_output`, which runs three gates in a fixed order on a `ConnectorReply` and stage 2's `ExtractedDocument` (AD-10):
  - **Gate 1 (completeness):** `stop` must be `complete`.
  - **Gate 2 (shape):** parse the reply, read `status` first, then parse fully into the Story 1.9 AD-9 models, applying the shared text rule.
  - **Gate 3 (page-marker validation):** enforce the minimum counts, and for PDFs filter cited pages to the supplied set.
- **The output:** stage 5 builds a new, immutable `ValidatedResults` contract that enforces its own structural invariants.
- **Failures:** every AI-output validation failure is a `PassFailure` with a code only; an unknown document kind is a programming-error `ValueError`. Stage 5 never logs AI content and never chains an exception it caught.
- **Scope:** backend only; no AI call, connector, route, HTTP mapping or `run_pass`. Covered by pytest with literal replies and the Story 1.9 fake.

## Boundaries & Constraints

**Always:**
- **Inputs:** stage 5's inputs are exactly a `ConnectorReply` (Story 1.9) and an `ExtractedDocument(kind, text, supplied_pages, skipped_pages)` (Story 1.7). It reads only `reply.stop` and `reply.raw_json`, plus `extracted.kind` and `extracted.supplied_pages`. `skipped_pages` belongs to stage 6's envelope (AD-11) and isn't used.
- **Order:** the gates run in the order Gate 1 → Gate 2 → Gate 3. The first failure stops stage 5; nothing after it runs (AD-1, AD-10).
- **Failure types:** every expected AI-output validation failure is `PassFailure("ai_output_invalid")`, except Gate 2's `status: "insufficient_content"`, which is `PassFailure("insufficient_content")` (AD-10). No other code is used. The only other exception stage 5 raises on purpose is the fixed programming-error `ValueError("unknown document kind")` (Gate 3), which is not a pass failure.
- **No item is dropped,** reordered or merged. Only page numbers are filtered and normalised; every text value reaches `ValidatedResults` exactly as the AI wrote it, untrimmed (D3).
- **Gate 3 is page-marker validation:** it proves only that each cited page is one of the PDF page markers supplied for this pass, never that the page supports the item (FR-4, AR-11, AD-10, D9).
- **Privacy:** stage 5 never logs raw exceptions, tracebacks, frame locals or AI content. It never raises inside an `except` clause (D6).
- **Imports:** absolute imports only (the existing import scanners require `level == 0`).

**Never:**
- Check semantic support, duplicate items, padding, upper item counts, language or terminology. None of these is an automated requirement; semantic support is manual (Story 1.13 fixture review; Epics 2–3 real-AI sessions).
- Map `PassFailure` to an HTTP reply, or implement stage 6, `run_pass`, stage 4, the mapping from `ConnectorError`, `PassGuard`, the success envelope or any route (Story 1.11).
- Implement the demo connector, `samples/demo-ai-output.json` or `samples/demo-response.json` (Story 1.13), or the real connector (Epic 2).
- Add frontend TypeScript types, fixtures or any frontend change (D8).
- Change any of the following:
  - **Story 1.9's contracts:** `ConnectorRequest`, `ConnectorReply`, `ConnectorError`, `Connector`, and the AD-9 models in `contracts/ai_output.py`.
  - **Earlier stages and errors:** stages 1–3, `PassFailure`, `AppError`, `errors.py` and the api layer.
  - **Everything else:** settings, logging configuration, dependencies, CI, README and existing tests.
- Use anything from `architecture/technology.md`.
- Touch `.claude/`, `_bmad/`, `CLAUDE.md`, planning documents, frozen specifications or `sprint-status.yaml`. Write to `.logs/` only through the `sesjonslogg` convention (CLAUDE.md), and only at a step the developer approves. Never stage, commit or push without the developer's approval.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| `epics.md:672-674` (Story 1.10 AC) | `stop` isn't `complete` → `ai_output_invalid` | Gate 1; matrix: Gate 1 rows |
| `epics.md:676-679` | `insufficient_content` stops the pass with that code (422 per `HTTP_STATUS`) and ignores the other fields; malformed JSON, a missing Result type or empty text → `ai_output_invalid` | Gate 2, D3, D4; matrix: Gate 2 rows. Stage 5 raises the code. The 422 reply itself is produced by the HTTP mapping in Story 1.11; this story asserts `HTTP_STATUS[code] == 422` |
| `epics.md:681-686` | `ok` with PDF supplied {1, 3}: each list ≥ 5; page 2 removed everywhere; a flashcard, quiz item or key concept left with no pages fails; Summary pages optional but filtered | Gate 3, D7; matrix: Gate 3 PDF rows |
| `epics.md:688-690` | plain text: any page number fails | Gate 3; matrix: plain-text rows |
| `epics.md:692-699` | page-marker validation only; never called citation or content verification; the unrelated-but-supplied-page limit test is kept | D9; matrix: limit and wording rows |
| `epics.md:701` | new `ValidatedResults`, every `pages` sorted and de-duplicated, `[]` allowed for the Summary, always `[]` for plain text | D1, D2, page normalisation; matrix: output and serialisation rows |
| `epics.md:702-703` | semantic support manual only; pytest covers each gate's failure and success paths with fakes | Never list; test plan |
| `ARCHITECTURE-SPINE.md` AD-10 (l.126) | gate definitions, failures → `ai_output_invalid`, new `ValidatedResults`, stage 6 accepts only it, gates prove membership not support | Gates 1–3, D1, D2 |
| AD-9 (l.120) | the schema enforces shape only; counts and page validity are AD-10's job | Gate 2 uses the Story 1.9 models; Gate 3 adds counts and pages |
| AD-11 | `results: ValidatedResults` in the success envelope (arrays in JSON); `insufficient_content` 422; `ai_output_invalid` 502 | D1, serialisation rule; existing `HTTP_STATUS` (the reply mapping is Story 1.11) |
| AD-12 / AR-13 | Pydantic is the contract source of truth | D1, D2 (TS mirror deferred, D8) |
| AD-20 / AR-21 | per-stage pytest, every error code via fakes, full gate-chain tests, no real key | test plan |
| AR-11 (`epics.md:197`) | repeats AD-10 | as AD-10 |
| AR-26, AD-6(4) | logs never hold content | D6 |
| PRD FR-3 (`prd.md:82-95`) | ≥ 5 flashcards, quiz items and key concepts with the Summary; never padded | D7, Gate 3 counts |
| PRD FR-4 (`prd.md:97-106`) | page references checked against the real supplied markers; a citation that isn't one is rejected; doesn't prove the best page; none for plain text | Gate 3, D9; see the conflict check on "where practical" |
| PRD FR-7 (`prd.md:122-131`) | malformed or incomplete output, or a missing Result type, is a failed pass; thin content is reported specifically | Gates 1–2 |
| Story 1.9 follow-up (`issues.md`) | never log or return AD-9 `ValidationError.errors()`/`.json()` | D6 |

## Decisions (developer, 2026-11-14)

D1–D9 were approved at discovery, with refinements. The open-question answers and the review decisions were added in revision 2.

- **D1 — `ValidatedResults` location and shape:** it lives in `backend/app/contracts/results.py`. It has the AD-11 result structure without `status`: `summary`, `flashcards`, `quiz`, `key_concepts`, with the AD-9 item fields.
- **D2 — `ValidatedResults` enforces its own structural invariants, at contract level only:**
  - **Model config:** frozen, with extra fields forbidden.
  - **Immutability:** collections are immutable tuples internally (A4; see "`ValidatedResults` contract").
  - **Text:** every text field is a strict `str` (bytes and other types are rejected, never coerced) and obeys the shared text rule (D3).
  - **Pages:** strict, positive integers that are strictly increasing, which means sorted and unique. At contract level any `pages` may be empty.
  - **Document-kind rules belong to stage 5,** because the model doesn't know its source: a PDF item's `pages` must be non-empty and within the supplied set, and plain text has empty `pages` everywhere.
- **D3 — the shared text rule** (refined by the A5/OQ1 decision). A text value is invalid if any of these hold:
  - it's empty;
  - it's whitespace-only under Python `str.strip()` (that is, `not value.strip()`);
  - it contains a lone surrogate code point (U+D800–U+DFFF).

  Otherwise-valid text is kept exactly as written, never trimmed or normalised. One predicate implements the rule, and both Gate 2 and `ValidatedResults` use it, with a fixed, non-sensitive error message.
- **D4 — Gate 2 reads `status` first:** stage 5 parses the JSON and inspects `status` before anything else. `insufficient_content` gives `PassFailure("insufficient_content")` with no validation of the other fields. `ok` leads to full Pydantic validation into `AiOutput`.
- **D5 — entry point:** `backend/app/pipeline/stage5_gates.py` with `validate_output(reply: ConnectorReply, extracted: ExtractedDocument) -> ValidatedResults`, raising `PassFailure`.
- **D6 — privacy-safe error handling,** corrected in revision 2 for A1 and A2:
  - **Never exposed:** raw AI output, raw exceptions, tracebacks and frame locals are never logged, and `ValidationError.errors()`/`.json()` are never called or exposed. A `PassFailure` never contains AI text.
  - **No raise inside `except`:** stage 5 never raises inside an `except` clause and never calls anything that may raise from one; an `except` body only records that parsing failed. So stage 5 chains no exception it caught.
  - **Tests:** they cover the `PassFailure`'s attributes, `__context__`, `__cause__`, `__suppress_context__` and `__notes__`, plus messages and logs, using distinctive secret strings and nested malformed data.
  - **Limits** are stated under the privacy safeguards.
- **D7 — `MIN_ITEMS = 5`:** a named product-rule constant in `stage5_gates.py` (FR-3), not a setting, and enforced only by stage 5 (OQ2).
- **D8 — no TypeScript, fixtures or frontend:** TS mirrors, demo fixtures and frontend changes are outside this story.
- **D9 — page-marker validation, not semantic verification:** code comments, docstrings and test names describe Gate 3 as page-marker validation. The required limit test, where an unrelated but supplied page passes, is kept as documented evidence. This is enforced mainly by behavioural tests, with an implementable wording check as a backstop (A3).
- **Answered open questions (developer, 2026-11-14):**
  - **OQ1:** lone surrogates are rejected by the shared text rule (D3).
  - **OQ2:** `MIN_ITEMS` stays in stage 5 only. A directly constructed `ValidatedResults` proves the contract-level invariants only, not that all three gates ran.
  - **OQ3:** the `Validated*` model names are kept.
- **Architecture source:** `ARCHITECTURE-SPINE.md` only (AD-1, AD-8, AD-9, AD-10, AD-11, AD-12, AD-20 and the logging convention).

## Conflict check

There's no conflict between D1–D9, the review decisions and `epics.md`, `ARCHITECTURE-SPINE.md` and the PRD. Points that look like tension but are consistent:
- **The PRD's "where practical" and the stricter PDF rule:**
  - **The two sources:** PRD FR-4 says the system attaches a Page Reference "where practical". AD-10 and the AC (`epics.md:685`) make at least one valid page mandatory for every PDF flashcard, quiz item and key concept.
  - **Recorded as an intentional refinement:** the spine and epics tighten the PRD, and that's what this story implements. The Summary keeps the looser rule (pages optional).
- **The D-11 prompt and Gate 3:** the prompt (Story 1.8) asks the model to "leave out any item that no supplied page supports", while Gate 3 fails the pass when such an item remains, rather than dropping it. That's consistent: the model is asked to omit, and the gate rejects if it didn't. It's strict by design.
- **D2's plain-text rule:** "plain-text outputs must have empty pages everywhere" is enforced by stage 5, not by the contract, as the developer's clarification of D2 says.
- **Empty text is checked twice:** AD-10 places "no empty text" in Gate 2. D2 makes `ValidatedResults` enforce the same shared rule. Gate 2 checks it first, and the contract re-check is a second layer of defence.

## The three gates (D4, D5)

`validate_output(reply, extracted)` runs, in this order:

**Gate 1 — completeness.** If `reply.stop != "complete"` (that is, `length`, `refusal` or `other`), raise `PassFailure("ai_output_invalid")`. `raw_json` is not read.

**Gate 2 — shape.** Each step runs only if the previous one passed:
1. **Parse `reply.raw_json` with `json.loads`.** A `ValueError` gives `ai_output_invalid`; that includes `JSONDecodeError` and the integer-digit limit error. So does a `RecursionError` from deeply nested input. Surrounding whitespace is allowed (standard `json.loads`). Duplicate keys follow `json.loads`, where the last value wins; they aren't detected. `NaN`, `Infinity` and out-of-range numbers parse as floats and are then rejected wherever an integer is required. Stage 5 uses `import json` and calls `json.loads` through the module attribute, so tests can monkeypatch `json.loads`.
2. **Check the type.** The parsed value must be a JSON object (`dict`); anything else gives `ai_output_invalid`.
3. **Read `status` first:**
   - **`"insufficient_content"`** (an exact `str`) gives `PassFailure("insufficient_content")`. No other field is read or validated.
   - **`"ok"`** (an exact `str`) continues to step 4.
   - **Anything else** (missing, another value or another type) gives `ai_output_invalid`.
4. **`AiOutput.model_validate(parsed)`.** That's the Story 1.9 models, unchanged: every Result type and item field required, extra fields forbidden, strict page integers. A `ValidationError` gives `ai_output_invalid`.
5. **The shared text rule (D3).** Stage 5 imports `is_valid_result_text` from `app.contracts.results` and applies that same predicate. It applies to every text field of the parsed `AiOutput`: `summary.text`, and each flashcard's `front` and `back`, each quiz item's `question` and `answer`, and each key concept's `term` and `explanation`. Any violation gives `ai_output_invalid`.

**Gate 3 — page-marker validation and counts** (only after Gate 2 passed with `status: "ok"`):
1. **Counts (D7):** `flashcards`, `quiz` and `key_concepts` must each have at least `MIN_ITEMS` (5) items; otherwise `ai_output_invalid`. There's no upper limit. Counts run before the document-kind check and all page checks.
2. **Pages, by document kind.** Items are never dropped, so the counts are unaffected:
   - **PDF** (`extracted.kind == "pdf"`):
     - **Filter:** in every item and the Summary, keep only page numbers that are in `extracted.supplied_pages`. Every other number is removed, whether unsupplied, skipped, 0, negative or out of range.
     - **Reject:** if any flashcard, quiz item or key concept is left with no pages after filtering, the result is `ai_output_invalid`; the item isn't dropped.
     - **Allow:** the Summary may be left with no pages.
   - **Plain text** (`extracted.kind == "text"`): if any `pages` list, the Summary's included, is non-empty, the result is `ai_output_invalid`. Nothing is filtered, and every output `pages` is empty.
   - **Any other `kind`:** a programming error, because stage 2 only builds `pdf` or `text`. Stage 5 raises `ValueError("unknown document kind")` with that fixed message, not a `PassFailure`.
3. **Normalise and build:** stage 5 normalises every `pages` list (sorted ascending, de-duplicated) and then builds a new `ValidatedResults` from the filtered values. Text values are copied unchanged, and items keep their order.
   - **Guarded build:** stage 5 builds every `Validated*` item model and the `ValidatedResults` inside one `try` block whose only `except` clause is `except ValidationError`, and that clause only records a flag. Nothing else is caught, so unrelated programming errors propagate unchanged. After Gates 2 and 3 a `ValidationError` here can't normally happen, because the contract's rules are a subset of what the gates have already checked. If it ever does, stage 5 raises `PassFailure("ai_output_invalid")` after the clause has ended (D6). Stage 5 imports the name with `from app.contracts.results import ValidatedResults`, so the defensive test can monkeypatch `app.pipeline.stage5_gates.ValidatedResults`.

**Return:** the `ValidatedResults`.

**Observable versus specified order:**
- **Observable through tests:**
  - Gate 1 before Gate 2: a non-complete reply with `insufficient_content` gives `ai_output_invalid`.
  - `status` before full validation and before Gate 3: `insufficient_content` with invalid fields, too few items or bad pages gives `insufficient_content`.
  - Gate 1 doesn't parse `raw_json`: a non-complete reply with malformed JSON still gives `ai_output_invalid`, and a test that monkeypatches `json.loads` shows it's never called.
  - Counts before the document-kind check: with `kind="docx"` and only 4 flashcards, stage 5 raises `PassFailure("ai_output_invalid")`, not the unknown-kind `ValueError`.
- **Specified for clarity only:** Gate 2's full validation before Gate 3 under `ok`, and counts before page checks for a known kind, give the same code either way, so no test can tell them apart.

## `ValidatedResults` contract (D1, D2, D3)

`backend/app/contracts/results.py`. Like every contracts module, it imports from the app only other `app.contracts` modules (Story 1.9 A9), and it imports no `logging`. Every model uses `ConfigDict(extra="forbid", frozen=True, hide_input_in_errors=True)`.

- **`is_valid_result_text(value: str) -> bool`:** the one shared text predicate (D3). It returns `False` for an empty or whitespace-only value (`not value.strip()`) and for any value containing a code point in U+D800–U+DFFF. It never encodes the string, because an encoding error would carry the whole value.
  - **Known limit:** text made only of characters that aren't whitespace under `str.strip()`, such as U+200B, U+FEFF or NUL, passes. That's the same limit as Story 1.7 L1, and it isn't changed here.
- **`ResultText`:** a `StrictStr` validated with `is_valid_result_text`, so bytes and other non-string input are rejected, never coerced. On failure it raises `ValueError("text must contain non-whitespace characters and no lone surrogates")`, a fixed message containing no part of the value. The value is never stripped or changed.
- **`ResultPages`:** `tuple[Annotated[int, Field(strict=True, gt=0)], ...]` that must be strictly increasing, which means sorted and unique. It may be empty. A tuple that isn't strictly increasing (out of order, or with a duplicate) raises `ValueError("pages must be strictly increasing")`. Non-integers and values ≤ 0 fail Pydantic's own strict-type and `gt=0` checks with their normal validation errors, not this message.
- **Item models:**
  - `ValidatedSummary(text: ResultText, pages: ResultPages)`
  - `ValidatedFlashcard(front: ResultText, back: ResultText, pages: ResultPages)`
  - `ValidatedQuizItem(question: ResultText, answer: ResultText, pages: ResultPages)`
  - `ValidatedKeyConcept(term: ResultText, explanation: ResultText, pages: ResultPages)`
- **`ValidatedResults`:** `ValidatedResults(summary: ValidatedSummary, flashcards: tuple[ValidatedFlashcard, ...], quiz: tuple[ValidatedQuizItem, ...], key_concepts: tuple[ValidatedKeyConcept, ...])`. There's no `status` field.
- **Field order:** the same names and order as AD-9 without `status`.
- **Docstring:** it must say that a `ValidatedResults` built directly proves only these contract-level invariants. Only one returned by `validate_output` has also passed the minimum counts and page-marker validation (OQ2).

**Internal representation versus serialised output (A4):**
- **Internally:** every collection (`pages`, `flashcards`, `quiz`, `key_concepts`) is an immutable tuple, so `ValidatedResults` can't be changed after construction. List input is accepted and stored as a tuple. With frozen models, this makes the whole object deeply immutable and hashable.
- **Serialised:** `model_dump(mode="json")`, `model_dump_json()` and FastAPI's `jsonable_encoder` produce JSON arrays. So the AD-11 wire format (`pages: int[]`, item arrays) is unchanged.
- **Plain `model_dump()`:** this Python mode returns tuples. Stage 6 and the fixture test (Stories 1.11 and 1.13) must serialise in JSON mode.

## Privacy and error-handling safeguards (D6)

**What stage 5 guarantees (tested in this story):**
- **Code only:** every AI-output failure is a `PassFailure` built from its code alone (the unknown-kind `ValueError` is a programming error, outside these guarantees). Its `str`, `repr` and `args` hold only the code. Its attributes are exactly `{"code": <code>, "limit": None}`, and it has no `__notes__`.
- **Nothing raised inside `except`:** a caught `ValueError`, `RecursionError` or `ValidationError` only sets a flag inside its `except` clause, and the `PassFailure` is raised after the clause has ended. When `validate_output` is called outside any exception handler, the raised failure has `__context__ is None`, `__cause__ is None` and `__suppress_context__ is False`. Stage 5 chains no exception it caught.
  - Stages 1 and 2's `from None` pattern keeps `__context__` (Story 1.7 D1) and isn't used here.
- **No error details:** stage 5 never calls `ValidationError.errors()`, `.json()` or `str()` on a caught exception, and never stores the exception.
- **No logs:** stage 5 imports no `logging` and writes no log line, and it prints nothing to stdout or stderr.

**What stage 5 can't guarantee (documented limits):**
- **Traceback frames keep AI text.** The raised `PassFailure`'s `__traceback__` references stage 5's frames. Their local variables (`reply`, `parsed`, the parsed models, the filtered pages) can hold AI text, and stay reachable as long as the failure object exists. Stage 5 doesn't scrub frame locals.
- **The caller can add context.** If a caller invokes `validate_output` while it is itself handling an exception, Python sets the raised failure's `__context__` to the caller's exception. Stage 5 can't prevent this.
- **The models show AI text.** `AiOutput` and `ValidatedResults` hold AI text and show it in `repr()` and `model_dump()`. `ValidatedResults` is the response body, but neither model may be logged.
- **`hide_input_in_errors` has a narrow scope.** It hides input only from `str()` and `repr()` of a validation error, not from `errors()` or `json()` (Story 1.9, V1).

**Deferred to Story 1.11:** the code that catches stage 5's `PassFailure` must:
- never log it with its traceback, frame locals or chained exceptions;
- log only the `code`;
- never call stage 5 from inside an `except` clause;
- never log a `ValidatedResults` or `AiOutput`;
- serialise `ValidatedResults` in JSON mode.

## I/O & Edge-Case Matrix

Unless a row says otherwise, "valid ok reply" means:
- `stop="complete"`;
- a JSON object with `status: "ok"`, a Summary citing `[1]` and exactly 5 items in each list, each item citing `[1]`;
- every text field non-empty;
- the document is a PDF with `supplied_pages=(1, 3)` and `skipped_pages=(2,)` (page 2 image-only, as in the AC).

All tests call `validate_output` outside any `except` block.

| Scenario | Input | Expected Output / Behavior | Error Handling |
|----------|-------|---------------------------|----------------|
| Gate 1: complete | valid ok reply | passes Gate 1 | N/A |
| Gate 1: not complete | `stop` of `length`, `refusal`, `other`, each with an otherwise valid ok reply | `ai_output_invalid` | `PassFailure` |
| Gate 1 before Gate 2 | `stop="length"` with `status: "insufficient_content"`; and `stop="length"` with malformed JSON | `ai_output_invalid` both times; a monkeypatched `json.loads` is never called | `PassFailure` |
| Gate 2: malformed JSON | `"{"`, `"not json"`, `""`, a leading UTF-8 BOM, a Markdown code fence around valid JSON | `ai_output_invalid` | `PassFailure` |
| Gate 2: parser limits | `[` × 100,000 then `]` × 100,000; `{"a":` × 50,000; a page integer with 5,000 digits | `ai_output_invalid` (`RecursionError` and the digit-limit `ValueError` caught) | `PassFailure` |
| Gate 2: whitespace around JSON | a valid ok reply with leading and trailing spaces and newlines | passes | N/A |
| Gate 2: not an object | `[]`, `"ok"`, `5`, `null`, `true` | `ai_output_invalid` | `PassFailure` |
| Gate 2: status missing or invalid | no `status`; `"OK"`, `"error"`, `""`, `null`, `1`, `["ok"]` | `ai_output_invalid` | `PassFailure` |
| Gate 2: duplicate status keys | `{"status": "ok", …, "status": "insufficient_content"}`; and the reverse order with a valid ok body | the last value wins (`insufficient_content`; then a pass) | `PassFailure` / N/A |
| Gate 2: insufficient content | `{"status": "insufficient_content"}` alone; with empty fields; with garbage, wrongly typed or missing fields; with extra keys; with fewer than 5 items and pages citing `[2]` | `insufficient_content`; no other field validated, Gate 3 never runs; `HTTP_STATUS["insufficient_content"] == 422` | `PassFailure` |
| Gate 2: missing Result type | `ok`, with each of `summary`, `flashcards`, `quiz` and `key_concepts` removed in turn | `ai_output_invalid` | `PassFailure` |
| Gate 2: missing item field | `ok`, with each item field (`text`, `pages`, `front`, `back`, `question`, `answer`, `term`, `explanation`) removed in turn | `ai_output_invalid` | `PassFailure` |
| Gate 2: extra field | an extra key at the top level, in `summary` and in each item type | `ai_output_invalid` | `PassFailure` |
| Gate 2: wrong types | a text field as a number, object or `null`; a list as an object; `pages` items `"1"`, `1.0`, `true`, `null`, `NaN`, `Infinity`, `1e400` | `ai_output_invalid` | `PassFailure` |
| Gate 2: text rule | each text field in turn as `""`, `" "`, `"\n\t"`, `"　"`, `"\x1c"` (all whitespace under `str.strip()`), and as a value containing the lone surrogate escape `"\ud800"` | `ai_output_invalid` | `PassFailure` |
| Gate 2: text preserved | text with surrounding spaces and newlines (`"  Lager\n"`); Norwegian `æøå`; the JSON escape `\ud83d\ude00` written literally in `raw_json` (a valid surrogate pair, not a pre-decoded emoji); U+200B-only text (the documented limit) | passes; `ValidatedResults` holds each value exactly as parsed; the escape becomes the single code point U+1F600, which passes `is_valid_result_text` | N/A |
| Gate 3: counts boundary | 4 items in `flashcards`, `quiz` or `key_concepts` in turn (the others 5) | `ai_output_invalid`; `HTTP_STATUS["ai_output_invalid"] == 502` | `PassFailure` |
| Gate 3: counts met | exactly 5 of each; and 12 of one list | passes; all items kept, in order | N/A |
| Gate 3: PDF filtering | supplied `(1, 3)`; items citing `[1, 2]`, `[2, 3]`, `[3, 1, 3]`; Summary `[2, 1]` | pages become `(1,)`, `(3,)`, `(1, 3)`; Summary `(1,)`; no item dropped | N/A |
| Gate 3: PDF invalid numbers | items citing `[0, 1]`, `[-3, 3]`, `[1, 99]`, `[1, 1180591620717411303424]` (2^70) | `(1,)`, `(3,)`, `(1,)`, `(1,)` | N/A |
| Gate 3: PDF skipped page | an item citing `[2, 3]` (page 2 is in `skipped_pages`) | `(3,)`; a skipped page is never a valid marker | N/A |
| Gate 3: PDF item left empty | a single flashcard, quiz item or key concept in turn citing only `[2]` (skipped), only `[4]` (neither supplied nor skipped), or `[]` | `ai_output_invalid`; the item is not dropped | `PassFailure` |
| Gate 3: PDF Summary may be empty | Summary citing `[]`, or only `[2]` | passes; Summary `pages == ()` | N/A |
| Gate 3: plain text, no pages | `kind="text"`, `supplied_pages=()`, `skipped_pages=()`, every `pages` `[]` | passes; every output `pages == ()` | N/A |
| Gate 3: plain text with a page | `kind="text"`, with a page number in the Summary, then in each item type in turn (`[1]`, `[0]`, 2^70) | `ai_output_invalid` | `PassFailure` |
| Gate 3: unknown kind | `kind="docx"` with an otherwise valid ok reply; and `kind="docx"` with only 4 flashcards | `ValueError("unknown document kind")`, not a `PassFailure`; with 4 flashcards, `PassFailure("ai_output_invalid")`, because counts run first | `ValueError` / `PassFailure` |
| Gate 3: page-marker limit | PDF supplied `(1, 3)`; an item about one topic cites page 3, whose text is about something unrelated | passes. The test's name contains `page_marker`, and its docstring states it is documented evidence that Gate 3 doesn't check semantic support (D9) | N/A |
| Output: new object | valid ok reply | returns a `ValidatedResults`, not the `AiOutput`; field names exactly `summary`, `flashcards`, `quiz`, `key_concepts` (no `status`) | N/A |
| Output: pages normalised | any passing reply | every `pages` is a tuple, sorted ascending, unique and positive | N/A |
| Output: serialisation | a passing `ValidatedResults` | `model_dump(mode="json")`, `model_dump_json()` and `jsonable_encoder` give JSON arrays for `pages` and every item list, with values unchanged; plain `model_dump()` gives tuples | N/A |
| Output: immutability | a passing `ValidatedResults` | field assignment fails (`ValidationError`); `pages` and item collections are tuples (no `append`); `hash()` succeeds | `ValidationError` / `AttributeError` |
| Defensive build path | `app.pipeline.stage5_gates.ValidatedResults` monkeypatched with a callable that raises a `ValidationError`; and, separately, with one that raises `RuntimeError` | `ai_output_invalid`, with the same privacy properties as the other failures; the `RuntimeError` propagates unchanged (not caught) | `PassFailure` / `RuntimeError` |
| Contract: valid | direct construction with valid values (list input accepted) | built; text unchanged; collections stored as tuples | N/A |
| Contract: invariants | text `""`, `"  "`, `"\ud800x"`, `b"x"`; pages `[2, 1]`, `[1, 1]`, `[0]`, `[-1]`, `["1"]`, `[1.0]`, `[True]`; an extra field whose value is `"AI-SECRET-TEXT"`; a missing field. A valid sibling text field holds `"AI-SECRET-TEXT"` | rejected; the secret isn't in `str()` or `repr()` of the error (`errors()` holds input by design); text errors carry the fixed text message, out-of-order and duplicate pages the fixed pages message, and type and ≤ 0 page errors Pydantic's own | `ValidationError` |
| Contract: empty pages allowed | `ValidatedSummary(text="x", pages=[])` and an item with `pages=[]` | built, because contract level allows empty pages; non-empty item pages are stage 5's rule | N/A |
| Contract: config and names | every model | each has `extra="forbid"`, `frozen=True` and `hide_input_in_errors=True`; names and order equal AD-9's without `status`; `app.pipeline.stage5_gates.is_valid_result_text is app.contracts.results.is_valid_result_text` (stage 5 imports and uses the shared predicate) | N/A |
| Privacy: failure object | each AI-output failure path (Gate 1, every Gate 2 branch, every Gate 3 branch, the defensive path; not the unknown-kind `ValueError`, which is a programming error), with every text field containing `"AI-SECRET-TEXT"` | `exc.code` is the expected code; `vars(exc) == {"code": code, "limit": None}`; no `__notes__`; the secret is in no `str()`, `repr()` or `args` | `PassFailure` |
| Privacy: no chained exceptions | each failure path above, plus nested malformed data such as `{"status": "ok", "summary": {"text": {"deep": ["AI-SECRET-TEXT"]}}}` (this example exercises the Pydantic `ValidationError` path; the JSON parsing failure paths are covered by the same assertions on the malformed-JSON and parser-limit inputs) | `__context__ is None`, `__cause__ is None`, `__suppress_context__ is False` | `PassFailure` |
| Privacy: no logs or output | every success and failure path, with `caplog` at DEBUG on the root logger and `capsys` | no log records; nothing on stdout or stderr; the stage 5 module imports no `logging` | N/A |
| Fake chain | `FakeConnector(raw_json=…, stop=…).generate(request)` passed to `validate_output`, for one success and each failure code | same results as the literal-reply rows | `PassFailure` |
| Import boundary | `stage5_gates.py` and `results.py` | absolute imports only. Stage 5 imports from the app only `app.contracts.*` and `app.pipeline.*`; `results.py` only `app.contracts.*`. Neither imports `logging`, `app.api`, `app.connectors` or `app.config`. The Story 1.9 import tests still pass | N/A |
| Wording (D9) | the docstrings (via `ast`) and comments (via `tokenize` `COMMENT` tokens) of `stage5_gates.py` and `results.py`, and the test file's function names and docstrings (via `ast`); the raw test-file text, which holds the search terms, is never scanned | none contains "citation verification" or "content verification", matched case-insensitively. The stage 5 module docstring describes Gate 3 as page-marker validation and says it doesn't verify semantic support | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/contracts/connector.py` -- `ConnectorReply(raw_json, stop, …)` and `StopReason`. Read-only.
- `backend/app/contracts/ai_output.py` -- `AiOutput` and its item models (shape only, strict pages, `hide_input_in_errors`), used by Gate 2. Read-only.
- `backend/app/pipeline/stage2_extract.py` -- `ExtractedDocument(kind, text, supplied_pages, skipped_pages)`, a plain dataclass whose `kind` isn't enforced at runtime. `supplied_pages` is ascending; a PDF always has at least one supplied page. Read-only.
- `backend/app/pipeline/failures.py` -- `PassFailure(code)`; `ai_output_invalid` and `insufficient_content` are both allowed. Read-only.
- `backend/app/contracts/errors.py` -- `HTTP_STATUS`: `insufficient_content` 422 and `ai_output_invalid` 502. Read-only. No layer maps `PassFailure` to a reply yet; that's Story 1.11.
- `backend/tests/_fake_connectors.py` -- `FakeConnector`, to produce replies for the chain tests. Read-only.
- `backend/tests/test_connector_contracts.py`, `test_stage1_validate.py:332`, `test_stage3_prompt.py:583-611` -- the existing import scanners. They're recursive, require absolute imports and cover the new modules automatically. Read-only.
- `backend/app/pipeline/stage3_prompt.py` -- the D-11 prompt, whose "leave out any item" rule Gate 3 backs up. Read-only.

## Tasks & Acceptance

**Execution:**
- [ ] `backend/app/contracts/results.py` (new) -- `is_valid_result_text`, `ResultText`, `ResultPages`, the four `Validated*` item models and `ValidatedResults` -- D1, D2, D3.
- [ ] `backend/app/pipeline/stage5_gates.py` (new) -- `MIN_ITEMS` and `validate_output` with Gates 1–3 -- D4, D5, D6, D7, D9.
- [ ] `backend/tests/test_stage5_gates.py` (new) -- one test, or one parametrised test, per matrix row, with a local AI-JSON builder (no imports from other test modules except `tests._fake_connectors`). Absolute imports only.

**Acceptance Criteria:**
- Given the backend, when `uv sync --locked && uv run pytest -q` run, then all tests pass (the existing 611 plus the new ones), with no new dependency and an unchanged `uv.lock`.
- Given the repository, when compared with the state at the start of implementation, then only the three files above and this spec changed. That starting state is the spec commit, with the 30 untracked BMAD tool folders (`.claude/skills/bmad-*`, `_bmad/`) already present and untouched. Everything else is unchanged: existing contracts, stages 1–3, existing tests, settings, frontend and CI.

## Dependencies & deferred work

- **Depends on:**
  - **Story 1.9:** `ConnectorReply`, `AiOutput`, `FakeConnector`.
  - **Story 1.7:** `ExtractedDocument`.
  - **Story 1.6:** `PassFailure`.
  - All are merged.
- **Provides for:**
  - **Story 1.11:** `validate_output` as stage 5, and `ValidatedResults` as the only input stage 6 accepts. Story 1.11 must also meet the obligations listed under "Deferred to Story 1.11".
  - **Story 1.13:** the gates that validate the demo fixture against the sample's real markers, with JSON-mode serialisation for `demo-response.json`.
  - **Epic 2:** the gates for real AI replies.
- **Resolves:** the Story 1.9 follow-up "never log or return AD-9 `ValidationError.errors()`/`.json()`", via D6. It's closed only in a separately approved closeout.
- **Unchanged and still deferred:**
  - **Story 1.8:** R2 (demo and real connectors), R3 and R4 (Story 1.11), R5, and S1/S2.
  - **Story 1.7:** D1 and L1. Zero-width-only text is the L1 limit, and the D3 text rule keeps it.
  - **Story 1.13:** the `connectors/__init__.py` docstring.
  - **Later stories:** TS types and fixtures (D8).

## Open questions

None. The three open questions in the first draft were answered by the developer on 2026-11-14; see "Answered open questions" under Decisions.

## Implementation Notes

## Spec Change Log

- **2026-11-14, revision 2:** applied the independent adversarial review's findings A1–A18, with the developer's decisions on A4 (tuples), A5/OQ1 (the shared text rule), OQ2 and OQ3:
  - **Privacy, A1–A2:** corrected the traceback-locals and caller-context limits, and made "never raise inside `except`" a rule.
  - **A3:** an implementable AST wording check.
  - **A4:** immutable tuples, plus serialisation and immutability rows.
  - **A5:** a shared text predicate, with surrogate rows.
  - **A6:** stronger checks on the failure object.
  - **A7:** HTTP mapping deferred to Story 1.11, with `HTTP_STATUS` assertions.
  - **A8 and A9:** duplicate-key handling, plus parser-limit, `NaN`/`Infinity`/`1e400`, 2^70, whitespace and skipped-page rows.
  - **A10–A14:** the whitespace definition and its L1 limit; absolute imports; observable versus specified order; wording; unknown `kind`.
  - **A15–A16:** sharper contract-invariant and no-logs rows (`capsys`).
  - **A17–A18:** the "where practical" refinement; the git-status baseline and `.logs/` convention.
  - **Matrix:** 37 → 42 rows. The spec stays a draft, not frozen.
- **2026-11-14, revision 3:** applied the final verification's findings N1–N10 and two clarifications, approved by the developer:
  - **N1:** the wording check reads docstrings via `ast` and comments via `tokenize`.
  - **N2:** `ResultText` is a `StrictStr`; `b"x"` added to the contract-invariants row.
  - **N3:** stage 5 calls `json.loads` through the module attribute.
  - **N4:** AI-output failures are `PassFailure`; the unknown-kind `ValueError` is a programming error, excluded from the privacy row.
  - **N5:** counts run before the kind check, an observable case.
  - **N6:** `[2]` (skipped), `[4]` and `[]` as the empty-item examples.
  - **N7:** the surrogate pair is a literal JSON escape in `raw_json`.
  - **N8:** the fixed pages message covers order and duplicates only.
  - **N9:** one guarded `try` around the build, catching only `ValidationError`; the test patches `app.pipeline.stage5_gates.ValidatedResults` and checks that an unrelated error propagates.
  - **N10:** "(Story 1.9 A9)".
  - **Clarifications:** stage 5 imports `is_valid_result_text` (checked by identity); the nested example covers the `ValidationError` path.
  - **Matrix:** stays at 42 rows (rows widened, none added).

## Review Triage Log

- **2026-11-14 — independent adversarial review of the first draft:** REVISIONS REQUIRED, with no blockers:
  - two HIGH (A1, A2)
  - five MEDIUM (A3–A7)
  - eleven LOW (A8–A18)

  All 18 were applied in revision 2 (see the Spec Change Log). The reviewer confirmed the gate semantics, the line references, the `RecursionError`, BOM and digit-limit behaviour, and that raising after an `except` block leaves `__context__`/`__cause__` `None`. It also confirmed that the existing 611 tests and the Story 1.9 scanners aren't affected.
- **2026-11-14 — final independent verification of revision 2:** REVISIONS REQUIRED, with no blockers or HIGH findings:
  - A1, A2 and A4–A18 PASS; A3 PARTIAL
  - one MEDIUM (N1) and nine LOW (N2–N10)

  All were applied in revision 3. The verifier confirmed the gates against the sources, the tuple serialisation, the text rule, the parser behaviour, the `HTTP_STATUS` codes and the 42-row count.
- **2026-11-14 — Checkpoint 1: APPROVED by the developer** (revision 3).
  - **The decision:** the spec is frozen and set to `ready-for-dev`.
  - **What it fixes:** the requirements, D1–D9 with the answered open questions, the privacy safeguards, the 42-row acceptance matrix and the three-file implementation scope.
  - **What changed at approval:** this status change, the approval comment and this log entry only; no design changes.

## Design Notes

- **Why parse with `json.loads` and then `model_validate`:** reading `status` first needs a parsed object before the full model applies (D4). Story 1.9's R6 tests show the Python path is as strict as the JSON path for page integers.
- **Why stage 5 never raises inside `except`:** any exception raised while another is being handled gets that one as `__context__`, even with `from None`. That chained exception's message or input can hold AI text, so stage 5 records a flag and raises afterwards (D6). Frame locals in `__traceback__` remain a documented limit (A1).
- **Why tuples:** frozen Pydantic models only block field reassignment; list contents could still be changed after validation. Tuples make the D2 invariants hold for the object's whole life, which matters because stage 6 trusts any `ValidatedResults`. JSON output is unaffected.
- **Why items are never dropped:** AD-10 and the AC make an item with no valid page a pass failure, so dropping it would hide an error and could disguise padding as success.

## Verification

**Commands:**
- `cd backend && uv sync --locked && uv run pytest -q` -- expected: all pass
- `cd backend && uv run pytest -q -W error tests/test_stage5_gates.py` -- expected: all pass
- `cd backend && uv run pytest -q -W error` -- expected: all pass
- `git diff -- backend/uv.lock backend/pyproject.toml` -- expected: empty

**Manual checks:**
- The developer reads the stage 5 module docstring and the page-marker limit test, and confirms they don't claim semantic verification (D9).
- `git status`, compared with the starting state described in the Acceptance Criteria: only the three files above and this spec changed.
