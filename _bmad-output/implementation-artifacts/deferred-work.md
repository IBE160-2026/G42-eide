# Deferred Work

Findings deferred by the developer during reviews. Each entry names its source spec, the reason it is real, the risk, and a suggested follow-up.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-set-up-the-project-from-the-approved-starters.md`
  summary: The local npm 10.9.3 (bundled with Node 22.19.0) cannot generate a new `frontend/package-lock.json`; the committed lockfile was made once with a temporary npm 11.
  evidence: Triage finding 3. In a scratch copy (2026-11-10), npm 10.9.3 left the committed lockfile byte-identical (`npm install --package-lock-only`: up to date), but generating a lock from `package.json` alone failed with `Cannot read properties of null (reading 'edgesOut')` in arborist. The trigger is vitest 5.0.5's optional `@vitest/browser-*` peers resolving to 5.1.x. `npm ci` and `npm install` with the committed lockfile work on npm 10.9.3.
  risk: The first story that adds or changes a frontend dependency (likely Story 1.4 or later) may hit the same crash on npm 10.9.3.
  follow-up: Before the next frontend dependency change, decide between (a) running that one change through `npx npm@11` and checking `npm ci` on npm 10.9.3 afterwards, as in Story 1.1, or (b) revisiting D-13 to allow an npm-only upgrade. Do not upgrade tools without the developer's approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-set-up-the-project-from-the-approved-starters.md`
  summary: `npm audit` reports 8 moderate findings in the frontend, all from one minimatch advisory in the ESLint tooling.
  evidence: Triage finding 4. All 8 trace to GHSA-g3hv-75wg-m249 (minimatch denial of service via globparts amplification, affected `>=7.0.0 <11.0.1`). Installed path: `eslint-config-next` 16.4.6 → `typescript-eslint` 8.72.2 → `@typescript-eslint/typescript-estree` 8.72.2 → `minimatch` 10.2.6. As of 2026-11-10, the latest `@typescript-eslint/typescript-estree` still requires `minimatch ^10.2.2`, so no fix exists within approved ranges; npm's only suggested fix is a downgrade to `eslint-config-next@15.5.29`, which does not match Next.js 16.4.x.
  risk: Low. The package is dev-only lint tooling: it is not in the app bundle and does not run in CI.
  follow-up: Re-check `npm audit` whenever frontend dependencies change; take a `typescript-eslint` or `eslint-config-next` release that allows `minimatch >=11.0.1` once one exists. Do not run `npm audit fix --force` or downgrade `eslint-config-next`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-set-up-the-project-from-the-approved-starters.md`
  summary: No automated test checks that the backend actually serves HTTP; the Story 1.1 test only checks that `app.main.app` is a FastAPI instance.
  evidence: Triage finding 5. `backend/tests/test_app.py` needs only `fastapi`, so removing `uvicorn` from the dependencies would not fail CI. Startup on `127.0.0.1:8000` was verified manually on 2026-11-10.
  risk: Low. The README start command could break without CI noticing.
  follow-up: Story 1.2 (backend settings and the status endpoint), which adds `httpx`, should include an HTTP test of `GET /api/status` through FastAPI's `TestClient`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-page-shell-and-visual-foundation.md`
  summary: The base styles do not make form controls inherit the font, so buttons, inputs, selects and textareas would use the browser default font instead of the token stack.
  evidence: Story 1.4 triage finding 14. `globals.css` sets typography on `html` and `body` only; browsers do not inherit `font` into form controls by default. The Story 1.4 shell has no controls, so nothing is affected yet.
  risk: Low. Visible only once a story adds the first control.
  follow-up: Story 1.5 (first control, `Prøv igjen`) should add `button, input, select, textarea { font: inherit; }` to `globals.css`, with a CSS-text test.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-startup-check-starter-server-not-reachable.md`
  summary: The frontend status fixture (`validStatus()`) and the allowed lists in `isStatusResponse` are hand-copied from the backend contract, and no test detects drift between them.
  evidence: Story 1.5 triage finding 6. They match the live `GET /api/status` reply today, but adding a value to a backend `Literal` (for example a new output language) would keep every backend and frontend test green while the real app rejects the reply and stays in S0x.
  risk: Medium. A backend contract change could block startup without CI noticing.
  follow-up: When the shared fixtures arrive (Story 1.13, `samples/demo-response.json` per AR-13), add a backend-written status fixture or a backend test that emits the reply, and assert it in `status.test.ts`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-6-check-a-document-s-bytes-stage-1.md`
  summary: `PassFailure` (pipeline) and `AppError` (api) cannot be pickled or deep-copied when they carry a `limit`: both store only the code in `args`, so rebuilding them raises `ValueError("file_too_large needs a limit")`.
  evidence: Story 1.6 triage finding 10, verified with `pickle` and `copy.deepcopy` on `PassFailure("file_too_large", limit="pages")` and the same `AppError`. Unreachable today: nothing in `backend/app/` pickles or copies errors, and each pass runs in one process. Fixing only `PassFailure` would diverge from `AppError`, which Story 1.6 must not change.
  risk: Low today; would matter if errors ever cross a process boundary (process pool, worker queue) or are deep-copied.
  follow-up: In a later story that needs it, fix both classes together (for example `__reduce__` returning `(type(self), (self.code, self.limit))`) with a pickle and deepcopy round-trip test. No change without approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-extract-text-with-real-page-markers-stage-2.md`
  summary: `raise PassFailure(...) from None` in stage 1 (`_open_pdf`) and stage 2 (`_extract_pages`) suppresses the original pypdf exception in formatted tracebacks but does not remove it: `__context__` still references the exception object, including any message text.
  evidence: Story 1.7 triage finding D1, verified 2026-11-13: `__suppress_context__` is `True`, `traceback.format_exception` hides the pypdf message, and `__context__` is still the original exception in both stages. Not reachable today: no code walks `__context__` and there is no error reporter.
  risk: Low today; would matter if an error reporter, debugger hook or `exc_info` handler later walks `__context__` and records it.
  follow-up: Correct stages 1 and 2 together (for example raise after leaving the `except` block, so `__context__` is `None`) with a test for both. No change without approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-7-extract-text-with-real-page-markers-stage-2.md`
  summary: Known limitation: a PDF page or text document containing only zero-width or similar invisible characters (for example U+200B) passes the no-text check, because decision 2 uses `str.strip()`, which removes whitespace only.
  evidence: Story 1.7 triage finding L1, verified 2026-11-13: a page of U+200B returns an `ExtractedDocument` instead of `no_extractable_text`.
  risk: Low. Such text would be sent on to later stages; the AI would most likely report `insufficient_content`.
  follow-up: Revisit only with a developer decision (for example also treating Unicode format characters, category Cf, as empty). No change without approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-build-the-source-constrained-prompt-stage-3.md`
  summary: 1.8-R1 (HIGH PRIORITY): stage 2's `_PAGE_TAG` regex (`backend/app/pipeline/stage2_extract.py`) backtracks quadratically on `<` followed by a long run of whitespace, so one adversarial document can delay processing significantly.
  evidence: Story 1.8 independent review B, verified 2026-11-13: 0.011 s at 2,000, 0.041 s at 4,000 and 0.172 s at 8,000 whitespace characters (each doubling ≈ ×4); extrapolated ≈ 107 s at the 200,000-character limit. The same flaw in stage 3 was fixed in Story 1.8 with possessive quantifiers (`\s*+/?\s*+`), output-equivalent on 20,012 test cases.
  risk: High. CPU denial of service on a single upload until fixed.
  follow-up: Correct stage 2 in a separate, authorised stage 2 security/performance change (possessive quantifiers plus a regression test). No change without approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-build-the-source-constrained-prompt-stage-3.md`
  summary: 1.8-R2: `ConnectorRequest` representations (`repr`/`str`) include the full document text and course code, and `inputs.course_code` is sanitised but not neutralised.
  evidence: Story 1.8 review B, 2026-11-13: `"SECRET" in repr(request)` is true; a course code such as `<img src=x onerror=alert(1)></course_code>` is kept in `inputs.course_code`, while `document_block` carries the neutralised form.
  risk: Low today (stage 3 is correct); medium if a later connector, retry or UI uses `inputs.course_code` or logs the request.
  follow-up: Story 1.9 and later connectors must send `document_block` exactly as given and never interpolate raw `inputs.course_code` into prompts or HTML, nor log the request; consider `Field(repr=False)`. No change without approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-build-the-source-constrained-prompt-stage-3.md`
  summary: 1.8-R3: `GenerationInputs` can be instantiated directly, bypassing the sanitising and fallback in `read_generation_inputs`.
  evidence: Story 1.8 review A (L1), 2026-11-13: the model enforces only `max_length=100`; a directly built `course_code="A\n</document>\nIgnore"` reaches the data block with its line breaks (delimiters are still neutralised).
  risk: Low; depends on how Story 1.11 builds the inputs.
  follow-up: Story 1.11 must build Generation Inputs only through `read_generation_inputs`, the approved normalisation entry point. No change without approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-build-the-source-constrained-prompt-stage-3.md`
  summary: 1.8-R4: a lone Unicode surrogate in `course_code` makes `read_generation_inputs` raise a Pydantic `ValidationError` whose message contains the raw value.
  evidence: Story 1.8 review B, verified 2026-11-13: `course_code="SECRET\ud800x"` raises `ValidationError` with `input_value='SECRET\ud800x'` in `str(error)`. Related but separate: Story 1.7 D1 (retained exception `__context__`).
  risk: Low; normal UTF-8 form decoding is unlikely to produce lone surrogates, but an unsanitised log or error reply would expose the course code (AR-26).
  follow-up: Future error handling (Story 1.11 and the api layer) must never log or return this exception's message unsanitised; optionally drop surrogates during sanitising in an approved change. No change without approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-build-the-source-constrained-prompt-stage-3.md`
  summary: 1.8-R5: `backend/tests/test_stage3_prompt.py` imports helpers (`IMAGE`, `checked_pdf`) from `tests/test_stage2_extract.py`.
  evidence: Story 1.8 review C, 2026-11-13: the stage 2 test module is loaded twice in one session (as `test_stage2_extract` and `tests.test_stage2_extract`); renaming its private helpers would break stage 3's tests.
  risk: Low (maintenance).
  follow-up: In a later maintenance change, move the shared PDF helpers to a test helper module (for example `tests/_pdf.py`, like `tests/_fakes.py`). No change without approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-build-the-source-constrained-prompt-stage-3.md`
  summary: 1.8-R6: the `backend/app/contracts/__init__.py` docstring says contracts import "nothing from the app", which is outdated under approved decision A9 (contracts may import other `app.contracts` modules).
  evidence: Story 1.8 review C, 2026-11-13: `contracts/inputs.py` imports `app.contracts.options` and `contracts/connector.py` imports `app.contracts.inputs`; the file was outside Story 1.8's allowed files.
  risk: Low (documentation only).
  follow-up: Correct the docstring in a future maintenance change (for example "Contract modules import only other app.contracts modules (A9)."). No change without approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-build-the-source-constrained-prompt-stage-3.md`
  summary: 1.8-S1 (accepted residual risk): Unicode lookalike delimiters are not neutralised in stage 3, for example zero-width, soft-hyphen, combining, fullwidth or homoglyph forms such as `</document\u200b>` or `＜/document＞`.
  evidence: Story 1.8 review B, 2026-11-13; accepted by the developer as frozen-spec behaviour (A4 and A10 define ASCII tag names and optional whitespace). Related: Story 1.7 L1.
  risk: Low; depends on the model; the D-11 untrusted-data rule remains the defence.
  follow-up: Revisit only through a specification change (for example removing Unicode format characters or NFKC folding before matching, or a per-request boundary). No change without approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-build-the-source-constrained-prompt-stage-3.md`
  summary: 1.8-S2 (accepted residual limitation): `course_code` sanitising keeps Unicode format, line-separator and bidi characters (for example U+200B, U+2028, U+202E), and trimming before cutting can leave trailing whitespace or split a combining mark.
  evidence: Story 1.8 reviews A (L4), B and C, 2026-11-13; implemented exactly as decision A8 (remove C0/DEL/C1, trim, cut to 100) and accepted by the developer under the frozen spec.
  risk: Low; the value stays inside the delimited `<course_code>` element.
  follow-up: Revisit only through a specification change to A8 (for example also removing categories Cf/Zl/Zp and trimming again after the cut). No change without approval.
