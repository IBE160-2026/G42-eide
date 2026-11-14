# Story 1.9 connector contracts

## 2026-11-14 kl. 07:00 — Amma Kwaasi-Eide

> **Type of record:** a retrospective summary written by Claude Code at the end of the work. It is **not** a verbatim transcript; prompts are paraphrased. The authoritative record is the Story 1.9 spec (its frozen decisions D1–D13, safeguards, import-boundary rules and 38-row I/O matrix) together with commits `10222a1` and `481b5a7`.

### Task
Implement Story 1.9 ("Connector interface, AI output models and test fakes", Epic 1) with the installed `bmad-build` workflow (BMAD 6.12.0), with approval at every stage. The work ran on branch `story/1-9-connector-interface-ai-output-models-and-test-fakes`, created from `main` at `57da4e7`, after the 1.8-R1 fix (#24) and its closeout (#25) were merged.

The goal was one provider-independent connector interface and the AD-9 AI output contract in `contracts/`, plus a deterministic test fake. It is backend only: no demo or real connector, no provider SDK, no Story 1.10 gates and no Story 1.11 orchestration.

### Plan
- **Read-only preparation:** Story 1.9 in `epics.md` (lines 642–660); AR-4, AR-5, AR-10, AR-13 and AR-26; the spine's AD-4, AD-6, AD-9, AD-10 and AD-12, the logging convention and the Structural Seed (`ARCHITECTURE-SPINE.md` only); the frozen Story 1.8 spec (A1, A2, A9, D-11); deferred findings 1.8-R2 to R6; and the existing contracts, pipeline and tests.
- **Developer decisions, approved 2026-11-14:**
  - **D1:** contracts import from the app only `app.contracts`, following A9.
  - **D2:** `ConnectorError` is a typed `Exception` with a closed code, not a Pydantic model.
  - **D3:** a synchronous `typing.Protocol` called `Connector` in `contracts/connector.py`, with fakes in `backend/tests/`.
  - **D4:** `Field(repr=False)` on `ConnectorRequest.document_block`, `ConnectorRequest.inputs` and `ConnectorReply.raw_json`.
  - **D5:** frozen, extra-field-forbidding AD-9 models with required fields and strict page integers.
  - **D6:** `contracts/ai_output.py` with `AiOutput`, `Summary`, `Flashcard`, `QuizItem` and `KeyConcept`.
  - **D7:** correct the `contracts/__init__.py` docstring (1.8-R6).
  - **D8:** import-boundary tests.
  - **D9–D13** answered the first draft's open questions:
    - **D9:** the fake's `raw_json` is required and keyword-only.
    - **D10:** `app.config` is allowed in the pipeline allowlist.
    - **D11:** `Connector` stays `@runtime_checkable`, with its limits documented.
    - **D12:** `app/connectors/__init__.py` is left unchanged and deferred to Story 1.13.
    - **D13:** the detailed spec is kept as one document.
- **Three source-wording conflicts** were recorded and resolved:
  - "contracts imports nothing from the app" versus A9 (resolved by D1)
  - "`ConnectorError` as a Pydantic model" versus AD-4's raise semantics (D2)
  - the Structural Seed placing the interface under `connectors/` (D3)
- **Spec review, three rounds before freezing:**
  1. **Independent adversarial review of the draft:** 17 findings, F1–F17, all MEDIUM or LOW. All were applied in revision 2, along with the developer's choices on F5 (a `config.py` import boundary) and F8 (`hide_input_in_errors=True` on the AD-9 models).
  2. **Final independent verification:** V1 to V3 (the `hide_input_in_errors` scope, the scanner self-test's controls, the hashability statement). All were applied in revision 3.
  3. **Checkpoint 1:** approved. The spec was frozen as `ready-for-dev`, the workflow's approved state, and committed.
- **Implementation, review and corrections:** I implemented the spec directly in the five approved files. A fresh independent reviewer did a read-only review of the implementation. The six LOW findings, R1–R6, were then corrected.
- **Plan document:** [spec-1-9-connector-interface-ai-output-models-and-test-fakes.md](../../_bmad-output/implementation-artifacts/spec-1-9-connector-interface-ai-output-models-and-test-fakes.md). Context: [epic-1-context.md](../../_bmad-output/implementation-artifacts/epic-1-context.md).

### Result
- **Spec commit:** `10222a195d90e0365bced891132ed3bb288eeaf2` ("docs: approve Story 1.9 specification"). It holds D1–D13, the privacy safeguards, the import-boundary rules and **38 acceptance scenarios**.
- **Implementation commit** `481b5a702ccfecb98ec81a7314134fc799917ae3` ("feat: implement Story 1.9 connector contracts and test fakes"): 5 files, 1,018 insertions and 9 deletions, local only.
  - `backend/app/contracts/connector.py`:
    - **Types:** `StopReason`, `ConnectorErrorCode` and their tuples.
    - **`ConnectorReply`:** frozen and forbids extra fields; `raw_json` is a `StrictStr` hidden from `repr`; the token counts are strict non-negative integers.
    - **`ConnectorError`:** accepts only an exact built-in `str` with one of the three approved codes, and its `args` are the code only. Any other value raises `ValueError("unknown connector error code")`.
    - **`Connector` protocol:** carries connector rules (a)–(f) and the D11 limits in its docstring.
    - **`ConnectorRequest`:** `repr=False` on `document_block` and `inputs`, with its fields otherwise unchanged.
  - `backend/app/contracts/ai_output.py`: the AD-9 models in D-11 field order, with `extra="forbid", frozen=True, hide_input_in_errors=True` and strict page integers. They check shape only.
  - `backend/app/contracts/__init__.py`: docstring only (D7).
  - `backend/tests/_fake_connectors.py`: `FakeConnector`.
    - **Construction:** it validates its configuration when built, and creates its single reply then, so its methods can raise only `ConnectorError`.
    - **Behaviour:** a fixed token count, both `ConnectorError` paths, and request recording.
    - **Never:** logging, network access or randomness.
  - `backend/tests/test_connector_contracts.py`: **196 tests** covering all 38 scenarios, including the static import scanner.
    - **Scanner method:** `ast.walk` over recursive `rglob`, exact module-boundary matching, and checks that the expected files were found.
    - **Self-test:** positive and negative controls (`anthropic.types`, `from anthropic import Anthropic`, `import app`, `pydantic.fields`, `from app import config`, `from app.contracts import errors`, `app.config.sub`, unsafe prefixes, relative and nested imports).
- **Independent implementation review:** READY TO COMMIT, with no blocker, high or medium findings. Its six LOW findings were all corrected before the commit:
  - **R1:** `ConnectorError` takes an exact `str` only.
  - **R2:** the fake's `token_count` must be an exact `int`, so `IntEnum` is rejected.
  - **R3:** a positive control for the JSON token test, plus field-specific error locations.
  - **R4:** `TypeError` for a keyword argument and for no argument.
  - **R5:** a self-test case for `app.config.sub`.
  - **R6:** `ValidationError` versus `ValueError` in the fake's tests, and Python-path page-strictness tests.

  The reviewer's 23 mutations caught 19. My own checks caught all 11 of the first round's mutations and all 7 of the R1–R6 regressions.
- **Verification:**
  - `uv sync --locked`: no dependency changes.
  - Story 1.9 tests: 196 passed. Full backend: **611 passed** (415 earlier + 196), also with `-W error`.
  - Frontend: **97 passed** (6 files).
  - `uv.lock`, `pyproject.toml`, the frontend, CI, README, existing tests and other app code are all unchanged.
- **Privacy safeguards and documented limits:**
  - **`repr=False`:** it hides values only from `repr()` and `str()`. They still appear in `model_dump()`, assertion diffs, tracebacks and the `ValidationError`s of `ConnectorRequest` and `ConnectorReply`.
  - **`hide_input_in_errors` on the AD-9 models:** it hides input only from `str()` and `repr()` of their validation errors. `errors()` and `json()` still contain it, and only `include_input=False` omits it. The models show all AI text in `repr` and `model_dump`.
  - **`ConnectorError`:** it stays a mutable exception (notes, attributes, `__cause__`/`__context__`, traceback locals). Keeping provider data out of it is the connectors' job.
  - **Static import tests:** they can't see dynamic or string imports, standard-library network clients, or transitive imports.
- **Issue records:**
  - **1.8-R6 resolved** by D7 (`issues.md` and a `resolution:` field in `deferred-work.md`).
  - **1.8-R2 stays OPEN.** The `Connector` protocol now documents the rules and `repr=False` is applied, but the demo connector (Story 1.13) and the real connector (Epic 2) still have to be verified against them.
- **Statuses:** the spec is `ready-for-dev`, and Story 1.9 is still `backlog` in `sprint-status.yaml`. Both are left for the closeout.
- **Unchanged:** the PRD, architecture, epics, UX, `CLAUDE.md`, the frozen Story 1.8 spec and the untracked BMAD tool folders.
- **Not done:** no push, pull request or merge, and no paid API calls.

### Open items
- **CI for Story 1.9 not yet run on GitHub.** Confirm both jobs pass on the Story 1.9 pull request.
- **Story 1.10: never log or return AD-9 validation-error details.** `ValidationError.errors()` and `.json()` from the AD-9 models still contain the AI text by default. Use `include_input=False` if details are ever needed (Story 1.9 spec, privacy safeguards).
- **Story 1.13: correct the outdated `backend/app/connectors/__init__.py` docstring**, which still mentions "test fakes" (Story 1.9 decision D12).
- **1.8-R2 stays open,** narrowed: the demo connector (Story 1.13) and the real connector (Epic 2) must be tested against the `Connector` rules. Those rules are: send `document_block` unchanged; never insert `inputs.course_code`; log nothing; put no provider data in raised errors.
- **Remaining workflow steps:** this log's commit, push, pull request, CI, merge and closeout (spec `done`, Story 1.9 `done` in `sprint-status.yaml`), each only with the developer's approval.
- **Still open (unchanged):**
  - **Story 1.8 findings:** 1.8-R3 to R5, and S1/S2.
  - **Earlier stories:** the Story 1.7 D1 and L1 items; the Story 1.6 pickling and pypdf logging items; the Story 1.5 status-fixture drift and `StatusLimits` items.
  - **Tooling:** npm 10 lockfile generation; the minimatch advisory.
  - **Everything else in `issues.md`:** the lecturer's PRD feedback, the `technology.md` exclusion on context rebuilds, the Story 2.3 key and provider follow-ups, G-2 targets in Stories 1.15 and 2.4, G-3 to G-5, U-1, U-2, DD-1 and the remaining 2026-10-27 items.
