---
title: 'Story 1.9: Connector interface, AI output models and test fakes'
type: 'feature'
created: '2026-11-14'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<!-- APPROVED at Checkpoint 1 by the developer on 2026-11-14 (revision 3). The block below is frozen: only the developer can change it. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Stage 3 builds a `ConnectorRequest`, but nothing yet defines what an AI connector returns, how it fails, what the AI's JSON must look like, or how a test can stand in for a connector. Without these contracts, Stories 1.10, 1.11 and 1.13 and Epic 2 would each invent their own shapes, and the pipeline could end up depending on a provider SDK.

**Approach:** In `contracts/`, add `ConnectorReply`, a typed `ConnectorError` exception with a closed code, a synchronous `Connector` protocol, and the AD-9 output models. Keep document text, inputs and the unparsed AI reply (`raw_json`) out of `repr`, and keep raw input out of the AD-9 models' validation-error messages (`str()` and `repr()` of the error). Both are partial mitigations (see the privacy safeguards). Add a deterministic fake connector under `backend/tests/`, plus pytest coverage of the contracts, the fake and the static import rules. Backend only; no AI call, no connector implementation, no new dependency.

## Boundaries & Constraints

**Always:**
- Every model and type a later stage needs from a connector lives in `contracts/`. A contracts module imports from the app only other `app.contracts` modules (D1).
- Connectors return the AI's reply as unparsed text (`raw_json`). Parsing is Gate 2's job (Story 1.10).
- `ConnectorError`'s constructor accepts only one of the three approved codes. It takes no provider message, document content, AI output or secret. Its limits as a mutable exception are listed under the privacy safeguards.
- Token counts are strict, non-negative integers.
- The approved AD-9 JSON field names (`status`, `summary`, `text`, `pages`, `flashcards`, `front`, `back`, `quiz`, `question`, `answer`, `key_concepts`, `term`, `explanation`) are used unchanged, in the same nesting and order as the D-11 `Response` block in `stage3_prompt.py`.
- Neither the fake connector nor any new contract writes a log line.

**Never:**
- Implement the demo connector (Story 1.13) or the real connector (Epic 2), or add or change anything under `backend/app/connectors/`.
- Add a provider SDK or any other dependency, or change `pyproject.toml` or `uv.lock`.
- Implement Gate 1, 2 or 3, `ValidatedResults`, empty-text checks, minimum counts or page filtering (Story 1.10).
- Implement `run_pass`, stage 4, the mapping from `ConnectorError` to `PassFailure`, the cost gate, `PassGuard` or any route (Story 1.11, Epic 2).
- Export a JSON schema for provider structured output (Epic 2).
- Change any of the following:
  - **`ConnectorRequest`:** its field names, types, required state, frozen state or extra-field rule. D4's `repr=False` on two fields is its only change.
  - **Other contracts and pipeline code:** `GenerationInputs`, `options.py`, `errors.py`, stages 1–3, `PassFailure` and `AppError`.
  - **Everything else:** `config.py`, settings, logging configuration, the frontend, CI, README, and any existing test.
- Use anything from `architecture/technology.md`.
- Touch `.claude/`, `_bmad/`, `CLAUDE.md`, `.logs/`, planning documents, frozen specifications or `sprint-status.yaml`; stage, commit or push without the developer's approval.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| `epics.md` Story 1.9, AC 1 | `ConnectorRequest`, `ConnectorReply{raw_json, stop, input_tokens, output_tokens}`, `ConnectorError{code}` and the AD-9 output models exist in `contracts/` | D2, D4, D5, D6; matrix: reply, request, error, AI output rows |
| `epics.md` Story 1.9, AC 2 | Fakes implement `count_input_tokens` and `generate`; return a chosen `raw_json` and `stop`; raise each `ConnectorError` code; report a fixed token count | D3, D9; matrix: fake rows |
| `epics.md` Story 1.9, AC 3 | Import check: `pipeline` imports no concrete connector and no provider SDK; `contracts` imports nothing from the app | D1, D8, D10; import-boundary rules; matrix: import rows |
| AR-4 / AD-1, Design Paradigm | Dependency direction; only `connectors.real` imports the Anthropic SDK | D8, D10 |
| AR-5 / AD-4 | Reply, error and interface shapes; unparsed text; provider exceptions mapped to `ConnectorError`; fixed token count for fakes | D2, D3 |
| AR-10 / AD-9 | AI output shape; the schema enforces shape only | D5, D6 |
| AR-13 / AD-12 | Pydantic is the contract source of truth | D4–D6 (the AD-9 models are backend-internal; no TS mirror is needed, because the browser receives `ValidatedResults` from Story 1.10 onward) |
| AR-26, AD-6(4) | Never log content, AI output, secrets, full requests or raw provider errors | D4, D5, privacy safeguards |
| Deferred 1.8-R2 | `ConnectorRequest` `repr` exposes document text and course code; connectors must pass `document_block` unchanged and never insert raw `inputs.course_code` | D4; interface rules; stays open (see Dependencies & deferred work) |
| Deferred 1.8-R6 | Outdated `contracts/__init__.py` docstring | D7 |

## Decisions (developer, 2026-11-14)

D1–D8 were approved as recommended, with safeguards. D9–D13 answer the five open questions in the first draft. The F5 and F8 decisions record the developer's choices on the independent review.

- **D1 — contracts import rule:** a contracts module may import other `app.contracts` modules, but nothing from `app.api`, `app.pipeline`, `app.connectors` or `app.config`, or any other application layer. This is approved decision A9 from Story 1.8.
- **D2 — `ConnectorError`:** a typed `Exception` subclass with a closed `code`, not a Pydantic `BaseModel`, because `generate` must be able to raise it (AD-4).
- **D3 — interface:** a synchronous `typing.Protocol` named `Connector`, in `contracts/connector.py`, with `count_input_tokens(request) -> int` and `generate(request) -> ConnectorReply`. Test fakes live under `backend/tests/`.
- **D4 — hidden representations:** `Field(repr=False)` on `ConnectorRequest.document_block`, `ConnectorRequest.inputs` and `ConnectorReply.raw_json`. This keeps those values out of `repr()` and `str()` only. It does **not** make serialisation, `model_dump()`, validation errors, tracebacks or logging safe (see the privacy safeguards).
- **D5 — AD-9 model strictness:**
  - every AD-9 model uses `ConfigDict(extra="forbid", frozen=True, hide_input_in_errors=True)` (F8 decision)
  - every field is required, and `pages` items are strict integers
  - empty-text checks, minimum counts and page validation stay in Story 1.10
- **D6 — names:** `contracts/ai_output.py` with `AiOutput`, `Summary`, `Flashcard`, `QuizItem` and `KeyConcept`.
- **D7 — 1.8-R6:** the `contracts/__init__.py` docstring is corrected to the A9 rule. That is the file's only change.
- **D8 — import-boundary tests:** based on the approved dependency rules, as defined under "Import-boundary rules". `pipeline` gets an allowlist; contracts get the D1 rule; `app/config.py` gets the F5 rule; the Anthropic SDK is allowed only in a future `app/connectors/real.py`.
- **D9 — the fake's `raw_json`:** a required keyword-only argument with no default.
- **D10 — `app.config` in the pipeline allowlist:** allowed. The spine's dependency diagram draws `config --> pipeline`. Unlike most of its arrows, which read "X imports Y", this one is interpreted as "pipeline may read config". The node is labelled "config: settings from env", and its arrows point to the layers that read settings. This reading is developer-approved (2026-11-14).
- **D11 — `@runtime_checkable`:** kept on `Connector`, with its limits documented under Contracts and interface.
- **D12 — `app/connectors/__init__.py`:** left unchanged. Its outdated docstring ("AI connectors (demo, test fakes, real). Added from Story 1.9.") is corrected in Story 1.13.
- **D13 — spec size:** the detailed spec and its full acceptance matrix are kept as one specification.
- **F5 decision — `config.py` boundary:** add an import test limiting `backend/app/config.py`'s app imports to `app.contracts.*`, and document the limits of static import analysis.
- **F8 decision — AD-9 validation errors:** `hide_input_in_errors=True` on all new AD-9 models. It reduces exposure through validation-error messages only. It hides the input from `str(error)` and `repr(error)`, but not from `error.errors()` or `error.json()` by default. It doesn't prevent disclosure through the models' `repr`, `model_dump`, tracebacks or logging.
- **Architecture source:** `ARCHITECTURE-SPINE.md` only (AD-1, AD-4, AD-6, AD-9, AD-10, AD-12, AD-15, AD-20, the logging convention and the Structural Seed).

## Source-wording conflicts (resolved by D1, D2 and D3)

The wording in `epics.md`, `ARCHITECTURE-SPINE.md` and `epic-1-context.md` stays unchanged; this story doesn't edit planning documents.

1. **"`contracts` imports nothing from the app"** (`epics.md` Story 1.9 AC 3, AR-4, `ARCHITECTURE-SPINE.md` Design Paradigm, `epic-1-context.md`) conflicts with approved decision A9 (Story 1.8, 2026-11-13). Under A9, contracts modules already import each other: `connector.py` → `inputs.py` → `options.py`. **Resolution (D1):** the AC is read as "contracts import nothing from any other application layer", and the import test checks exactly that.
2. **"`ConnectorError{code}` … exist as Pydantic models"** (`epics.md` Story 1.9 AC 1) conflicts with "`generate(req) -> ConnectorReply` (or raises `ConnectorError`)" (AD-4): a Pydantic `BaseModel` cannot be raised. **Resolution (D2):** `ConnectorError` is a typed contract in `contracts/`, an `Exception` subclass with a closed, validated `code`, following the existing `PassFailure` pattern. The other AC 1 types are Pydantic models as written. This deviation from the AC's literal wording is deliberate and approved.
3. **Where the interface lives.**
   - **The sources disagree.** The Structural Seed lists `connectors/  # interface, real, demo`, and the dependency diagram draws the "connector interface" as a node separate from `contracts`. But Story 1.9's own wording says "one connector interface … defined in `contracts/`", and the A1 code comment in `contracts/connector.py` places it next to `ConnectorRequest`.
   - **Resolution (D3):** the `Connector` protocol lives in `contracts/connector.py`. The diagram's "connector interface" node is that protocol, and nothing is added under `connectors/` until Story 1.13.

## Contracts and interface

All new code lives in `backend/app/contracts/`. Each Pydantic model below forbids extra fields and is frozen. Frozen means only that fields can't be reassigned, so the immutability is shallow: list contents stay mutable. Frozen Pydantic models are hashable when every field value is: `ConnectorRequest` and `ConnectorReply` are hashable, but the AD-9 models hold lists and so can't be hashed (`TypeError: unhashable type: 'list'`). Later stages build new objects instead of changing these (Story 1.10 builds a new `ValidatedResults`).

**`contracts/connector.py`:**
- `StopReason = Literal["complete", "length", "refusal", "other"]` and `STOP_REASONS = get_args(StopReason)`.
- `ConnectorErrorCode = Literal["ai_unavailable", "ai_rate_limited", "ai_credits_exhausted"]` and `CONNECTOR_ERROR_CODES = get_args(ConnectorErrorCode)`. Every value is also in `ERROR_CODES` (`contracts/errors.py`).
- `ConnectorRequest(system: str, document_block: str, inputs: GenerationInputs)`: unchanged apart from `Field(repr=False)` on `document_block` and `inputs` (D4). `repr()` and `str()` then show only `system`; equality, `model_dump()` and validation are unchanged.
- `ConnectorReply`, with `ConfigDict(extra="forbid", frozen=True)`:
  - `raw_json: StrictStr`, with `Field(repr=False)` (D4). It is the AI's text exactly as received, never parsed, trimmed or checked as JSON by the connector or the contract.
  - `stop: StopReason`.
  - `input_tokens` and `output_tokens`: `Annotated[int, Field(strict=True, ge=0)]`. Values such as `True`, `1.0`, `"1"` and `-1` are rejected, from Python and from JSON.
- `ConnectorError(Exception)`:
  - **Constructor:** `ConnectorError(code: ConnectorErrorCode)`. Any value not in `CONNECTOR_ERROR_CODES` raises `ValueError` whose message is exactly `unknown connector error code`.
  - **Contents:** `code` is the only attribute it sets, and `args == (code,)`, so `str(error) == code`, `repr(error) == f"ConnectorError({code!r})"`, and pickling round-trips. It accepts no message, cause text or extra arguments.
  - **Mutability:** it is still an ordinary, mutable exception (see the privacy safeguards).
- `@runtime_checkable class Connector(Protocol)`:
  - **Methods:** `count_input_tokens(self, request: ConnectorRequest) -> int` and `generate(self, request: ConnectorRequest) -> ConnectorReply`. Both may raise `ConnectorError` and nothing else.
  - **Docstring:** it must state the connector rules. A connector:
    - (a) sends `system` as the system instruction and `document_block` as the user content **exactly as given**
    - (b) never inserts `inputs.course_code`, or any other `inputs` value, into an instruction, prompt, HTML or anything else it builds. Stage 3 has already placed the sanitised course code inside `document_block`.
    - (c) never logs the request, the reply or their contents
    - (d) returns the provider's text unparsed in `raw_json`
    - (e) maps every provider exception to `ConnectorError` with an approved code, never raises SDK types, and keeps provider data out of the raised error (see the privacy safeguards)
    - (f) never retries automatically
  - **Limits (D11):** `isinstance` against this protocol checks only that attributes named `count_input_tokens` and `generate` exist. It doesn't check that they are callable or have the right signatures. It is a test convenience, not a guarantee.
- **Module docstring:** updated, so that it no longer says the fakes live next to the model.

**`contracts/ai_output.py`** (D5, D6; AD-9). Shape only; every model uses `ConfigDict(extra="forbid", frozen=True, hide_input_in_errors=True)`:
- `AiStatus = Literal["ok", "insufficient_content"]`.
- `Pages = list[Annotated[int, Field(strict=True)]]`. Any integer is accepted, including 0, negative and duplicate values; empty lists are accepted; `None` is not. Gate 3 (Story 1.10) filters and normalises the pages.
- `Summary(text: str, pages: Pages)`.
- `Flashcard(front: str, back: str, pages: Pages)`.
- `QuizItem(question: str, answer: str, pages: Pages)`.
- `KeyConcept(term: str, explanation: str, pages: Pages)`.
- `AiOutput(status: AiStatus, summary: Summary, flashcards: list[Flashcard], quiz: list[QuizItem], key_concepts: list[KeyConcept])`.
- **Field order:** each model declares its fields in the D-11 order shown above.
- **What the models leave out:** they don't enforce non-empty text, item counts or page validity. Reading `status` first, and ignoring the other fields when it is `insufficient_content`, is Gate 2's logic (Story 1.10). `AiOutput` describes the full shape that Gate 2 parses when `status` is `ok`.

**`contracts/__init__.py`** (D7): docstring only, for example `"""Shared contracts (error codes, options, inputs, connector types, AI output). A contracts module imports from the app only other app.contracts modules (A9)."""`.

## Test fake (`backend/tests/_fake_connectors.py`)

`FakeConnector` is a deterministic test double that satisfies `Connector`. Tests import it as `from tests._fake_connectors import FakeConnector`, the repository convention also used for `tests._fakes`.
- **Constructor (keyword-only, D9):**
  - `raw_json: str` (required)
  - `stop: StopReason = "complete"`
  - `token_count: int = 1000`: returned by `count_input_tokens`
  - `input_tokens: int = 1000` and `output_tokens: int = 500`: put on the reply
  - `count_error: ConnectorErrorCode | None = None`
  - `generate_error: ConnectorErrorCode | None = None`
- **Validation at construction:** nothing is left to fail later.
  - **The reply:** the constructor builds its single `ConnectorReply` from `raw_json`, `stop`, `input_tokens` and `output_tokens` immediately. A non-`str` `raw_json`, an unknown `stop` or a bad reply token value therefore fails at construction, with Pydantic's `ValidationError`, a `ValueError` subclass.
  - **Other values:** a `token_count` that isn't a non-negative, non-`bool` integer, or an error code not in `CONNECTOR_ERROR_CODES`, raises `ValueError`.
  - **The result:** `generate` and `count_input_tokens` can raise only `ConnectorError`.
- **Recording:** it records every request, in order, in `count_requests` and `generate_requests` (the same objects it received, never copied or changed). `count_calls` and `generate_calls` are the lengths of those lists.
- **`count_input_tokens`:** records the request, then raises `ConnectorError(count_error)` if `count_error` is set, otherwise returns `token_count`.
- **`generate`:** records the request, then raises `ConnectorError(generate_error)` if `generate_error` is set, otherwise returns the reply built at construction. That is the same frozen object on every call.
- **What it never does:** it never reads `request.inputs` or parses `raw_json`, and it has no randomness, clock, network, file or environment access. It imports no `logging` and writes no log line. It is test-only and never imported by `app`.
- **Isolation:** each test creates its own `FakeConnector`. No instance is created at module level or in a fixture wider than function scope, so recorded requests can't leak between tests.

## Privacy and error-handling safeguards

These are partial mitigations. None of them makes logging or returning these values safe, so callers must still never log or return document text, course codes, raw or parsed AI output, or provider data (AR-26, AD-6(4)).

- **`repr=False` (D4):** it keeps `document_block`, `inputs` and `raw_json` out of `repr()` and `str()` only, which reduces one accidental leak path (`%r` in log lines, assertion messages, debuggers). The values still appear in:
  - `model_dump()`, `model_dump_json()` and attribute access;
  - pytest's assertion diffs, which may show field values when two models are compared;
  - traceback local variables;
  - `ValidationError` messages raised while building `ConnectorRequest` or `ConnectorReply`, which echo the failing field's input (compare 1.8-R4).
- **AD-9 models (D5, F8):**
  - **Exposed:** `AiOutput` and the item models show all AI text in `repr()`, `str()`, `model_dump()`, tracebacks and assertion diffs. Story 1.10 and later stages must never log them.
  - **Mitigated, partly:** `hide_input_in_errors=True` removes the raw input from `str(error)` and `repr(error)` of their `ValidationError` only.
  - **Still exposed in errors:** by default, `error.errors()` and `error.json()` still contain the input under `input`. For malformed JSON, that is the whole AI text. Only `error.errors(include_input=False)` and `error.json(include_input=False)` omit it. Story 1.10 and later code must not log or return `errors()` or `json()` output; if error details are ever needed, they must be taken with `include_input=False`. The setting does nothing for the exposure paths above. Raw or parsed AI content must never be logged.
- **`ConnectorError` (D2):**
  - **Limited:** its constructor accepts only an approved code.
  - **Still mutable:** like any exception, a raiser can still add notes (`add_note`), set attributes, chain a cause (`__cause__` or `__context__`), and leave its frame's local variables in `__traceback__`. Notes and attributes also survive pickling.
  - **Responsibility:** keeping provider data out of these is the connector's job. Story 1.13 (demo) and Epic 2 (real) must test it; compare Story 1.7 D1.
- **Rejected codes:** an unknown code is rejected with the fixed message `unknown connector error code`, which never echoes the value.
- **Request recording:** the fake keeps references to the requests it receives, which contain document text and course codes. They stay in memory for that test only (see Isolation) and are never printed or logged by the fake. Tests should assert on identity or on chosen marker strings, not print the recorded requests.
- **Logging:** the new contracts and the fake write no log lines (AR-26).

## Import-boundary rules (D8, D10, F5)

The import tests use one shared scanner with these rules:
- **Discovery:** each scan uses recursive file discovery (`rglob("*.py")`) from its package directory, located from the imported package's `__file__`. Each scan first asserts that its expected modules were found, so an empty or wrong directory fails instead of passing:
  - **contracts:** `__init__.py`, `connector.py`, `inputs.py`, `options.py`, `errors.py` and `ai_output.py`
  - **pipeline:** `__init__.py`, `failures.py`, `stage1_validate.py`, `stage2_extract.py` and `stage3_prompt.py`
  - **`app/config.py`:** exists
  - **whole-app scan:** the `app/` root contains `config.py` and the `contracts/` and `pipeline/` packages
- **Nodes:** every file is parsed with `ast.parse`, and every node is visited with `ast.walk`. That finds imports in functions, methods, class bodies, `if`/`else`, `try`/`except`/`finally`, `with` blocks and `if TYPE_CHECKING:` blocks, not only top-level ones.
- **Names:**
  - `import a.b as c` yields `a.b`.
  - `from m import x, y` yields `m`. When `m` is exactly `app`, it yields `app.x` and `app.y` instead, so `from app import config` is checked as `app.config`.
  - A relative import (`level != 0`) fails in every scan.
  - A bare `import app` fails in every scan.
- **Matching:**
  - **App modules:** a name `N` is inside boundary `B` only if `N == B` or `N.startswith(B + ".")`. So `app.config_x` is not `app.config`, and `app.contracts_evil` is not `app.contracts`.
  - **Standard-library and third-party modules:** matched on the exact top-level name, `N.split(".")[0]`, against `sys.stdlib_module_names` or the named packages. So `pydantic` doesn't admit `pydantic_settings` or `pydantic_core`.
- **Scanner self-test:** the scanner is also run on fixed source strings inside the test. No files are written.
  - **Exact extraction:** each string has a fixed list of expected module names. The scanner's extracted names must equal that list exactly, compared as sorted lists, because `ast.walk` order isn't source order. Finding only some of the names isn't enough.
  - **Accepted or rejected per scan:** each control must give the stated result in the named scan.
  - **Existing cases (kept):**
    - an import inside a function, a `try` block and an `if TYPE_CHECKING:` block
    - a `from app import …` alias
    - a relative import, rejected in every scan
    - the unsafe prefixes `pydantic_settings` (rejected in the pipeline scan), `app.config_x` (rejected in the pipeline scan) and `app.contracts_evil` (rejected in the contracts scan)
  - **Negative controls:**
    - `import anthropic.types` extracts `anthropic.types` and `from anthropic import Anthropic` extracts `anthropic`. Both are flagged by the SDK-isolation scan and rejected by the pipeline scan.
    - `import app` is rejected in every scan.
  - **Positive controls:**
    - `import pydantic.fields` extracts `pydantic.fields`, which the pipeline scan accepts as inside `pydantic`.
    - `from app import config` extracts exactly `app.config`. The pipeline scan accepts it; the contracts and `config.py` scans reject it.
    - `from app.contracts import errors` extracts `app.contracts`. The pipeline, contracts and `config.py` scans accept it.
  - **Out of scope:** the self-test covers static import statements only. It doesn't add dynamic-import detection or network analysis (see Limits).
- **Limits (documented, not tested):** static analysis can't see:
  - **dynamic or string imports:** `importlib.import_module("…")`, `__import__("…")`, `exec`/`eval`
  - **standard-library network clients:** `urllib`, `http`, `socket`, `ssl` and others, which the standard-library allowance permits, so a module could reach a provider over plain HTTP without an SDK
  - **transitive imports** beyond the modules each rule names directly

  Code review is the defence for these.

## I/O & Edge-Case Matrix

| Scenario | Input | Expected Output / Behavior | Error Handling |
|----------|-------|---------------------------|----------------|
| Reply: valid | each of the four `stop` values; tokens `0` and `1234`; `raw_json` of `'{"a": 1}'`, `"not json {"`, `"  padded  "` and `""` | the model is built; `raw_json` is exactly the given string, not parsed, trimmed or checked as JSON | N/A |
| Reply: invalid stop | `stop` of `"stop"`, `"COMPLETE"`, `""` or `None` | rejected | `ValidationError` |
| Reply: token strictness | `input_tokens` or `output_tokens` of `-1`, `True`, `1.0`, `"1"` or `None`, via Python and via `model_validate_json` | rejected | `ValidationError` |
| Reply: raw_json type | `raw_json` of `b"{}"`, `{}` or `None` | rejected | `ValidationError` |
| Reply: contract | any reply | frozen (assignment fails); extra fields rejected; all four fields required | `ValidationError` |
| Reply: repr | `raw_json` containing `"AI-OUTPUT-SECRET"` | `repr()` and `str()` don't contain it; `model_dump()["raw_json"]` still equals it (D4's limit) | N/A |
| Request: repr | `document_block` containing `"DOC-SECRET"`, `inputs.course_code="CODE-SECRET"` | `repr()` and `str()` contain neither; `system` is still shown; `model_dump()` still contains both | N/A |
| Request: unchanged contract | Story 1.8 construction | same field names, types and required state, frozen, extra fields rejected, equality unchanged; all Story 1.8 tests pass | N/A |
| Error: approved codes | each of the three codes | `code`, `str()`, `args == (code,)` and `repr()` as specified; `isinstance(error, Exception)`; survives `pickle` with `code` intact | N/A |
| Error: unapproved codes | `"ai_output_invalid"`, `"internal_error"`, `"AI_UNAVAILABLE"`, `""`, `"PROVIDER-SECRET"`, `None` | rejected; `str(error)` is exactly `unknown connector error code` | `ValueError` |
| Error: no extra payload | `ConnectorError("ai_unavailable", "provider says x")` | rejected by the signature | `TypeError` |
| Error codes subset | `CONNECTOR_ERROR_CODES` | exactly the three approved codes, each in `ERROR_CODES` | N/A |
| AI output: full ok | D-11-shaped JSON with `status: "ok"`, one item per list, integer pages | `AiOutput.model_validate_json` builds it; values are kept as given | N/A |
| AI output: insufficient | `status: "insufficient_content"` with an empty summary text and empty lists | builds (shape only) | N/A |
| AI output: shape only | empty strings, empty lists, `pages` of `[]`, `[0]`, `[-3]`, `[2, 2]` | accepted unchanged (no counts, empty-text check or page filtering) | N/A |
| AI output: invalid status | `"OK"`, `"error"`, `null` | rejected | `ValidationError` |
| AI output: missing field | each top-level field, and each item field, removed in turn | rejected | `ValidationError` |
| AI output: extra field | an extra key at the top level, in `summary` and in each item type | rejected | `ValidationError` |
| AI output: page strictness | a `pages` item of `"1"`, `1.0`, `true` or `null` | rejected | `ValidationError` |
| AI output: hidden input | invalid inputs carrying `"AI-SECRET-TEXT"`: `"summary": "AI-SECRET-TEXT"`, an extra key whose value is `"AI-SECRET-TEXT"`, and malformed JSON containing it | for each case: `str(error)` and `repr(error)` don't contain `"AI-SECRET-TEXT"`; `error.errors()` and `error.json()` do contain it (the documented limit); `error.errors(include_input=False)` and `error.json(include_input=False)` don't; every AD-9 model's `model_config` has `hide_input_in_errors=True`, `extra="forbid"` and `frozen=True` | `ValidationError` |
| AI output: field names | the D-11 `Response` block in `stage3_prompt.SYSTEM_TEMPLATE` (from the line starting `  {"status"` through the `"key_concepts"` line) | the ordered keys extracted with the regex `"(\w+)":` equal both the fixed list `status, summary, text, pages, flashcards, front, back, pages, quiz, question, answer, pages, key_concepts, term, explanation, pages` and the same list built by walking `AiOutput.model_fields` depth-first (nested model fields, then list item model fields) | N/A |
| AI output: frozen | any model | field assignment fails | `ValidationError` |
| Fake: protocol | `FakeConnector(raw_json="{}")` | `isinstance(fake, Connector)` is true | N/A |
| Fake: chosen reply | `raw_json` X and each `stop` value | `generate` returns a `ConnectorReply` with exactly X, that `stop` and the configured token counts; repeated calls return the same object | N/A |
| Fake: token count | `token_count=4321` | `count_input_tokens` returns `4321` on every call | N/A |
| Fake: generate errors | `generate_error` set to each of the three codes | `generate` raises `ConnectorError` with that code; the call is still recorded | `ConnectorError` |
| Fake: count errors | `count_error` set to each of the three codes | `count_input_tokens` raises `ConnectorError` with that code; the call is still recorded | `ConnectorError` |
| Fake: recording | three calls with different requests | the requests are recorded in order and are the identical objects; call counts match; a new instance starts with empty records | N/A |
| Fake: inputs ignored | two requests that differ only in `inputs` (`course_code` `""` vs `"CODE-SECRET"`) | the same reply object | N/A |
| Fake: invalid config | `raw_json` omitted, or given as `b"{}"` or `None`; `stop="stop"`; a negative or `bool` value for `token_count`, `input_tokens` or `output_tokens`; an unknown error code | rejected at construction, before any call: omitted `raw_json` → `TypeError`; the others → `ValueError` (Pydantic's `ValidationError` for reply fields) | `TypeError` / `ValueError` |
| Fake: no logs | every fake call path, including the errors, with `caplog` at DEBUG | no log records; the fake module imports no `logging` | N/A |
| Import: contracts | every file under `app/contracts/` (expected set asserted) | imports from the app only `app.contracts` or `app.contracts.*`, under the import-boundary rules (D1) | N/A |
| Import: pipeline allowlist | every file under `app/pipeline/` (expected set asserted) | every import is a standard-library top-level name, `pydantic`, `pypdf`, `app.contracts`(`.*`), `app.pipeline`(`.*`) or exactly `app.config` (D10); so no `app.connectors`, `app.api`, provider SDK or `pydantic_settings` | N/A |
| Import: config boundary | `app/config.py` (existence asserted) | imports from the app only `app.contracts` or `app.contracts.*` (F5) | N/A |
| Import: SDK isolation | every file under `app/` (expected modules asserted) except `app/connectors/real.py` (absent today) | no import whose top-level name is `anthropic` | N/A |
| Import: scanner self-test | fixed source strings: an import inside a function, a `try` block and an `if TYPE_CHECKING:` block; `from . import x`; `import pydantic_settings`; `import app.config_x`; `import app.contracts_evil`; negative controls `import anthropic.types`, `from anthropic import Anthropic` and `import app`; positive controls `import pydantic.fields`, `from app import config` and `from app.contracts import errors` | for every string, the extracted names equal its fixed expected list exactly (sorted). The relative import and `import app` are rejected in every scan. `pydantic_settings` and `app.config_x` are rejected by the pipeline scan, and `app.contracts_evil` by the contracts scan. `anthropic.types` and `anthropic` are flagged by the SDK-isolation scan and rejected by the pipeline scan. `pydantic.fields` is accepted by the pipeline scan. `from app import config` gives exactly `app.config`: accepted by the pipeline scan, rejected by the contracts and `config.py` scans. `from app.contracts import errors` gives `app.contracts`: accepted by the pipeline, contracts and `config.py` scans | N/A |
| Contracts: no logging | every file under `app/contracts/` | no `logging` import | N/A |
| Docstring | `contracts/__init__.py` | states the A9 rule ("imports from the app only other app.contracts modules"); no longer says "imports nothing from the app" (D7) | N/A |

</frozen-after-approval>

## Code Map

- `backend/app/contracts/connector.py` -- `ConnectorRequest` (Story 1.8, A1); gets `repr=False` on two fields, plus the new types and protocol. Its field names, types, required state and frozen state must not change.
- `backend/app/contracts/errors.py` -- `ERROR_CODES`, which includes the three connector codes. Read-only; `backend/tests/test_errors.py:189` keeps checking that this file imports nothing from `app`.
- `backend/app/contracts/inputs.py`, `options.py` -- `GenerationInputs`, closed lists. Read-only.
- `backend/app/config.py` -- imports from the app only `app.contracts.options` today; the new F5 test pins that. Read-only.
- `backend/app/pipeline/stage3_prompt.py` -- `SYSTEM_TEMPLATE`, whose D-11 `Response` block (lines 67–74) is the source of the field-name test. Read-only.
- `backend/app/pipeline/failures.py` -- the `PassFailure` pattern that `ConnectorError` follows (closed code, code-only `args`). Read-only.
- `backend/app/connectors/__init__.py` -- unchanged (D12).
- `backend/tests/test_stage1_validate.py:332`, `test_stage3_prompt.py:596-611` -- the existing import tests; they stay unchanged and must still pass with the new contracts module. `test_contracts_import_only_contracts` uses a subset check and `rglob`, so `ai_output.py` is scanned and nothing breaks.
- `backend/tests/_fakes.py` -- the existing test-only values module (`FAKE_KEY`), imported as `tests._fakes`. Read-only.

## Tasks & Acceptance

**Execution:**
- [ ] `backend/app/contracts/connector.py` -- add `StopReason`, `STOP_REASONS`, `ConnectorErrorCode`, `CONNECTOR_ERROR_CODES`, `ConnectorReply`, `ConnectorError` and `Connector`; `repr=False` on `document_block` and `inputs`; update the module docstring -- D2, D3, D4, D11.
- [ ] `backend/app/contracts/ai_output.py` (new) -- `AiStatus`, `Pages`, `Summary`, `Flashcard`, `QuizItem`, `KeyConcept`, `AiOutput` -- D5, D6.
- [ ] `backend/app/contracts/__init__.py` -- docstring only -- D7.
- [ ] `backend/tests/_fake_connectors.py` (new) -- `FakeConnector` -- D3, D9.
- [ ] `backend/tests/test_connector_contracts.py` (new) -- the import scanner and one test, or one parametrised test, per matrix row -- D8, D10, F5.

**Acceptance Criteria:**
- Given the backend, when `uv sync --locked && uv run pytest -q` run, then all tests pass (the existing 415 plus the new ones), with no new dependency and an unchanged `uv.lock`.
- Given the repository, when inspected, then only the five files above and this spec changed. Everything else is unchanged: existing tests, stages 1–3, `inputs.py`, `options.py`, `errors.py`, `config.py`, `app/connectors/`, settings, frontend and CI.

## Dependencies & deferred work

- **Depends on:** Story 1.3 (`ERROR_CODES`) and Story 1.8 (`ConnectorRequest`, `GenerationInputs`, D-11 `Response` block), both merged.
- **Provides for:**
  - **Story 1.10:** `ConnectorReply.stop` (Gate 1), `AiOutput` and the item models (Gate 2), and `FakeConnector` replies.
  - **Story 1.11:** the `Connector` protocol for stage 4, `ConnectorError` codes to map onto `PassFailure`, and the fake's call recording for the stage-order and stop-at-stage tests.
  - **Story 1.13:** the protocol for the demo connector.
  - **Epic 2:** the protocol for the real connector, `count_input_tokens` for the cost gate, and the fake call counts for `PassGuard` counter tests.
- **1.8-R2 stays OPEN**, narrowed. Story 1.9 handles the `repr` part (D4) and documents the connector rules in the protocol. The demo connector (Story 1.13) and the real connector (Epic 2) must be verified against those rules by their own tests: `document_block` sent unchanged, `inputs.course_code` never inserted, nothing logged, no provider data in raised errors. Only after that can R2 be closed.
- **1.8-R6** is resolved by D7. Its record in `issues.md` and `deferred-work.md` is updated only in a separately approved closeout.
- **D12:** the `app/connectors/__init__.py` docstring is deferred to Story 1.13.
- **Unchanged and still deferred:** 1.8-R3 and R4 (Story 1.11), R5 (maintenance), S1 and S2 (accepted), and Story 1.7 D1 (exception `__context__`; relevant to the Epic 2 real connector).

## Open questions

None. The first draft's five open questions were answered by the developer on 2026-11-14 and are recorded as D9–D13.

## Implementation Notes

## Spec Change Log

- **2026-11-14, revision 2:** applied the independent adversarial review's findings F1–F17, with the developer's F5 and F8 decisions. It added the import-boundary rules, the third source conflict, D9–D13, the `hide_input_in_errors` setting and corrected privacy statements, and expanded the matrix (35 → 38 rows: all 35 kept, some widened, plus "AI output: hidden input", "Import: config boundary" and "Import: scanner self-test"). The spec stays a draft, not frozen.
- **2026-11-14, revision 3:** applied the final verification's findings V1–V3, approved by the developer:
  - **V1:** `hide_input_in_errors` covers only `str()` and `repr()` of a validation error. `errors()` and `json()` still include the input, and `include_input=False` omits it. The Approach section, the F8 decision, the privacy safeguards and the "AI output: hidden input" row were updated.
  - **V2:** the scanner self-test gained exact extraction, per-scan expectations, negative controls (`anthropic.types`, `from anthropic import Anthropic`, `import app`) and positive controls (`pydantic.fields`, `from app import config`, `from app.contracts import errors`).
  - **V3:** the hashability statement was corrected.

  The matrix stays at 38 rows, and the spec stays a draft, not frozen.

## Review Triage Log

- **2026-11-14 — independent adversarial review of the first draft:** REVISIONS REQUIRED, with no blockers. All 17 findings were applied in revision 2:
  - F1: exact error message
  - F2: the fake is validated at construction
  - F3, F4: the import-boundary rules and the scanner self-test
  - F5: the `config.py` boundary
  - F6: the ordered D-11 key test
  - F7, F8: privacy statements and `hide_input_in_errors`
  - F9: conflict 3
  - F10: D10 wording
  - F11: `runtime_checkable` limits
  - F12: shallow frozen
  - F13: D7 docstring wording
  - F14: Never-list wording
  - F15: fake isolation and import path
  - F16: unparsed `raw_json` inputs
  - F17: D9–D13
- **2026-11-14 — final independent verification of revision 2:** REVISIONS REQUIRED, with no blockers:
  - V1 (MEDIUM): `hide_input_in_errors` overclaim
  - V2 (MEDIUM): the scanner self-test lacked SDK and `import app` controls and positive controls
  - V3 (LOW): hashability statement

  All three were applied in revision 3. The verifier confirmed F1–F3, F5–F7, F9–F11 and F13–F17 resolved, and F4, F8 and F12 resolved through V2, V1 and V3. It also confirmed the D-11 extraction yields the expected 16 keys and that no current import is rejected by the scanner rules.
- **2026-11-14 — Checkpoint 1: APPROVED by the developer** (revision 3).
  - **The decision:** the spec is frozen and set to `ready-for-dev`.
  - **What it fixes:** the requirements, D1–D13, the 38-row acceptance matrix and the five-file implementation scope.
  - **What changed at approval:** this status change and this log entry only; no design changes.

## Design Notes

- **Why `ConnectorError` follows `PassFailure`:** a closed, validated code kept in `args` gives one predictable failure shape, safe `str` and `repr`, and pickling without a custom `__reduce__`. That avoids the Story 1.6 deferred pickling issue, which affected exceptions that also carry `limit`.
- **Why strict integers on `pages` but not on text fields:** Pydantic 2 already rejects numbers, booleans and `null` for `str` fields by default. The strictness that matters is that `1.0`, `"1"` and `true` are never silently taken as page numbers.
- **Why the protocol is synchronous:** the pipeline stages are synchronous, and how `run_pass` runs (thread pool or not) is Story 1.11's decision. AD-4 doesn't require `async`.
- **Why the fake builds its reply at construction:** it keeps the protocol promise that `generate` raises only `ConnectorError`, and it makes a misconfigured test fail at its setup line rather than inside the code under test.

## Verification

**Commands:**
- `cd backend && uv sync --locked && uv run pytest -q` -- expected: all pass
- `cd backend && uv run pytest -q -W error tests/test_connector_contracts.py` -- expected: all pass
- `cd backend && uv run pytest -q -W error` -- expected: all pass
- `git diff -- backend/uv.lock backend/pyproject.toml` -- expected: empty

**Manual checks:**
- The developer reads the `Connector` docstring and confirms the connector rules match this spec.
- The developer reviews new code for dynamic imports and standard-library network use, which the static import tests can't detect.
- `git status`: only the five files above and this spec changed.
