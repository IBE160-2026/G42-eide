---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-G42-eide-2026-09-16/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-G42-eide-2026-10-26/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-G42-eide-2026-10-27/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-G42-eide-2026-10-27/EXPERIENCE.md
  - _bmad-output/planning-artifacts/prds/prd-G42-eide-2026-09-16/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-G42-eide-2026-10-26/REVIEWER-EXPLAINER.md
---

# AI Study Buddy - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for AI Study Buddy, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

**Sources.** Authoritative (all `status: final`, updated 2026-11-08): the PRD (`prd.md`), the architecture spine (`ARCHITECTURE-SPINE.md`, AD-1 to AD-22) and the UX design contract (`DESIGN.md` + `EXPERIENCE.md`). Supporting context only: the PRD `addendum.md` (status draft; all its "Open for architecture" items are answered by the architecture) and `REVIEWER-EXPLAINER.md` (a reader-friendly companion to the spine; where it adds a detail, the spine wins). Review reports and the `.working/` alternative mockups are not used as requirements. Where documents overlap, the more specific final document governs: architecture for technical contracts, EXPERIENCE.md for behaviour and exact Norwegian interface text, DESIGN.md for visual tokens.

**Conventions in this document.** PRD requirement IDs are kept exactly (`FR-1` … `FR-7`, `SM-*`) for traceability. NFRs are numbered `NFR-n` with their PRD section. Architecture requirements are numbered `AR-n` with their AD IDs. UX design requirements are numbered `UX-DR-n` with their source section. Norwegian interface text is quoted exactly as approved.

## Requirements Inventory

### Functional Requirements

FR-1 to FR-7 are traced to PRD §4 and keep its meaning and IDs. The consequence bullets follow the PRD text closely but are not presented as a verbatim quotation: headings are reformatted, the FR-3 out-of-scope note is condensed, and the UJ-1 line is a summary. The PRD remains the authoritative wording.

**FR-1: Upload a Document.** The student can upload one Document (PDF or plain text). Realizes UJ-1.
- System accepts PDF and plain-text file types.
- System rejects unsupported file types with a clear message naming the problem.
- System rejects oversized Documents with a clear message asking for a smaller file. (Thresholds are defined in architecture AD-14; the upload limit is 10 MB in the binary convention, i.e. 10,485,760 bytes.)
- System validates the file's actual content (its signature), not just its extension, before accepting an upload.
- Plain-text Documents are checked for a supported text encoding (UTF-8); unsupported or undetectable encoding is rejected with a message rather than processed as garbled text.
- Norwegian characters (æ, ø, å) are extracted correctly from PDF and UTF-8 plain-text Documents.

**FR-2: Set Generation Inputs.** The student can optionally set course code/subject, detail level, and output language before a Generation Pass.
- Course code/subject is optional and stays blank when unset — no default value is substituted.
- Detail level is one of Brief, Standard or Detailed, and defaults to Standard when left unset.
- Output language is Norwegian (Bokmål) or English, and defaults to Norwegian (Bokmål) when left unset.
- The selected output language applies to all four Result types, whatever the language of the source Document (for example, a Norwegian Document can produce English Results).
- An invalid or unsupported value for detail level or output language is rejected or falls back to its default, rather than passed through unvalidated.
- Free-text input (course code/subject) is sanitized and delimited before inclusion in the LLM prompt, so it cannot override the source-constrained instruction in FR-3.

**FR-3: Run a Generation Pass.** The system runs one Generation Pass per submitted Document, producing a Summary, Flashcard Set, Quiz, and Key Concepts together in a single LLM call/response cycle.
- All four Result types are always produced together; there's no way to request a subset.
- The LLM is instructed to base output only on the Document's extracted text — no outside knowledge injected as fact.
- Only one Generation Pass may run at a time per session; the generate action is disabled while a pass is in flight, preventing concurrent or duplicate calls.
- When the Document contains enough genuine material (the normal case for a reasonably-sized lecture document), a Generation Pass produces at least 5 flashcards, at least 5 quiz questions with answers, and at least 5 key concepts, together with the Summary.
- The LLM must never invent flashcards, quiz questions, or key concepts just to reach these minimums; see FR-7 for how a Document with too little genuine content is handled instead.
- Subject-specific terminology from the Document is preserved. When the output language differs from the Document's language, the original technical term is shown in brackets the first time it appears (for example, "safety stock (sikkerhetslager)"); important terms are not force-translated inaccurately.
- Out of scope (PRD FR-3): chunking or multiple LLM calls for oversized Documents; interactive quiz-taking and automatic scoring (planned Phase 2).

**FR-4: Attach Page References.** The system attaches a Page Reference to generated items where practical, per the Glossary definition.
- During text extraction from a PDF Document, the real page markers are preserved and carried through to the LLM call, so each chunk of content the LLM sees is tagged with the actual page it came from.
- The LLM is instructed to cite only page numbers from the markers it was given, not to infer or guess a page number independently.
- Every Page Reference attached to a Flashcard, Quiz item, or Key Concept is validated against the set of real markers supplied for that Generation Pass; a citation that isn't one of those markers is rejected rather than shown. This check confirms the citation is a real, preserved page marker — it does not by itself prove the citation is the single best or most precise page for that content; that is verified manually against the source PDF during testing, not claimed as an automated guarantee.
- No Page Reference is fabricated for plain-text Documents lacking page information — omitted, not guessed.
- Page References work the same way whatever the language of the Document or of the Results.

**FR-5: Display Results.** The student sees the Summary, Flashcard Set, Quiz, and Key Concepts in the browser after a successful Generation Pass.
- Results are only displayed when a Generation Pass completes successfully; on failure, FR-7's failure state is shown instead.

**FR-6: Display Verification Notice.** The system displays a Verification Notice alongside Results.
- The notice is visible without extra clicks whenever Results are shown — not buried in a tooltip or footer link.

**FR-7: Handle Generation Pass Failures.** When a Generation Pass does not complete successfully, the system shows the student a clear failure state instead of no Results, a crash, or fabricated content.
- If the LLM API call fails or times out, the student sees an error message; Results are not shown as though generation had succeeded.
- If the Document has no extractable text (for example, a corrupt or image-only PDF, or a blank file), the system detects this before calling the LLM and shows a specific message — no Generation Pass is attempted against empty content.
- If the LLM's response is malformed, incomplete, or missing one of the four Result types, the pass is treated as failed, not partially displayed as if complete.
- If the LLM provider returns a rate-limit or quota error, the student sees a message distinguishing this from a generic failure.
- If the Document has real, extractable text but too little genuine content to support the minimum counts in FR-3, the pass reports this specifically (e.g., a message naming insufficient material) instead of returning padded or invented Results. This detection is best-effort, not a guarantee — the system is not expected to catch every case of thin content, but the LLM must never fabricate content to meet the minimums regardless of whether thinness was detected.

**User journey realised:** UJ-1 (PRD §2.3) — upload a lecture PDF, get Summary, Flashcards, Quiz and Key Concepts with page references; edge cases: unsupported type/size rejected with a reason; results may be imperfect, so the interface reminds the student to verify.

### NonFunctional Requirements

Derived from PRD §7 (Success metrics), §8 (Constraints & guardrails) and §2.2 (Non-Users). The original section is given for each.

| ID | Requirement | Source |
|---|---|---|
| NFR-1 | **Zero persistence:** the uploaded Document and generated Results are not stored beyond the request/response cycle of a single Generation Pass; processed in memory only and discarded once Results are returned. | §8 Privacy |
| NFR-2 | **No accounts, login or saved history;** authentication is out of scope by design. | §8 Privacy |
| NFR-3 | **Cloud LLM API, not a locally-run model.** | §8 Cost |
| NFR-4 | **Lowest-cost practical tier;** cloud calls carry real cost during development and testing, so cost is minimised. (Provider, model and cost controls are governed by the final architecture, AD-5, AD-15 and AD-16, which is authoritative. See documentation discrepancy DD-1.) | §8 Cost |
| NFR-5 | **Source-constrained prompting:** the LLM is instructed to base output only on the uploaded Document (mitigates, does not eliminate, hallucination). | §8 Accuracy |
| NFR-6 | **No automated semantic verification in MVP;** the Verification Notice (FR-6) is the sole mitigation surfaced to the student. Residual hallucination risk is an accepted limitation. | §8 Accuracy |
| NFR-7 | **Cross-language terminology risk is checked manually** during testing when Results are in a different language from the Document; the Verification Notice still applies. | §8 Accuracy |
| NFR-8 | **Git:** project work lives in the assigned repository and is pushed to GitHub (confirmed course requirement). | §8 Process |
| NFR-9 | **BMAD process:** human review checkpoints, testing and code review during implementation. | §8 Process |
| NFR-10 | **Planning artifacts are version-controlled** alongside the code. | §8 Process |
| NFR-11 | **SM-1 functional completion bar:** for a reasonably-sized lecture Document with genuine content, a pass produces a Summary + ≥ 5 Flashcards, ≥ 5 Quiz questions with answers, ≥ 5 Key Concepts; every PDF Page Reference matches a real preserved marker (none for plain text); oversized/unsupported/no-text Documents rejected with a specific message before any LLM call; failed or malformed LLM responses show a clear failure state; too-thin Documents reported, not padded. Automated checks validate page references against supplied markers only; semantic accuracy is checked manually. Validation includes at least one Norwegian Document run with both output languages, terminology and Page References checked manually. Validates FR-1, FR-2, FR-3, FR-4, FR-5, FR-7. | §7 SM-1 |
| NFR-12 | **SM-2 explainability:** the developer can explain the main design and implementation decisions to a reviewer (self-assessed). | §7 SM-2 |
| NFR-13 | **SM-3 documented process:** Git history, tests and documentation stand as evidence of a traceable, reviewable process. | §7 SM-3 |
| NFR-14 | **SM-C1 counter-metric (do not optimise):** no extra Document types, output formats or audience breadth beyond MVP In Scope; finishing the small scope well, with polish, outweighs a bigger unfinished one. | §7 SM-C1 |
| NFR-15 | **Source languages:** Norwegian (Bokmål) and English course material are in scope; other languages only incidentally. | §2.2 Non-Users |

#### Scope boundaries (preserved from PRD §5 and §6)

**MVP In Scope (§6.1):** one PDF or plain-text Document at a time; optional Generation Inputs (course code/subject, detail level, output language); one Generation Pass producing Summary, Flashcard Set, Quiz and Key Concepts together; Page References where practical (PDF only, never fabricated for plain text); Results in-browser with a Verification Notice; no accounts, login, saved history or stored copy of the Document.

**Out of Scope for MVP (§6.2):** multiple/simultaneous uploads or a document library; chunking or Documents larger than one lecture; structured handling of tables and figures (disclosed limitation); saving, editing or exporting Flashcards, spaced repetition; accounts, sharing, multi-user; fine-grained citation beyond the page number; buying/selling; publishing or deployment; interactive quiz-taking and automatic scoring (Phase 2).

**Explicit non-goals (§5):** not multi-user or shared; not a general-purpose or multi-subject study tool in this version; not competing with commercial study tools; not deployed or hosted.

No story may add anything from the Out of Scope or non-goal lists.

#### Documentation discrepancies (recorded, not changed in this workflow)

- **DD-1. PRD §8 Cost is out of date.** It says "No provider or budget has been chosen yet." PRD §9 Q2 and architecture AD-5/AD-15 later settled this: Anthropic `claude-haiku-5-5`, prepaid credits with auto-reload off, and a total budget of USD 5–10. The architecture is authoritative. The PRD is not edited in this workflow; any later tidy-up needs separate approval.

#### Step 1 clarifications (approved 2026-11-10)

These resolve the Step 1 review ambiguities A-1 to A-7 and R-1 to R-5. They do not change the PRD, architecture or UX documents.

- **C-1 Provider and cost (A-1).** The final architecture governs the AI provider and cost controls (AD-5, AD-6, AD-15, AD-16). See DD-1.
- **C-2 Temporary demo fixture (A-2, R-1, R-2, R-5).**
  - **Purpose:** a clearly marked *temporary development/test fixture* lets the demo infrastructure be built and tested without a paid AI call. It is a development-only arrangement and is **not** the final demo fixture.
  - **Location and format:** it uses the AD-12 path `samples/demo-ai-output.json` and keeps the AD-9 JSON schema valid and unchanged. The **TEMPORARY** marker lives in its separate provenance documentation, where it must be unmistakable.
  - **Content:** Claude Code may draft it from the real content and real page markers of the approved sample PDF (C-3). No page reference is invented. The developer reviews and approves it before it is committed.
  - **Final fixture (AD-13, authoritative, not weakened):** it must be recorded from one approved real AI run, manually reviewed and committed with a provenance note (date, model ID, inputs, reviewed).
  - **When it replaces the temporary one:** before final end-to-end demo acceptance testing and before final submission. Replacing it is its own story with its own acceptance criteria.
  - **README rule:** while the temporary fixture remains, the README must not claim that the demo results come from a real AI run.
- **C-3 Original Norwegian logistics sample PDF (A-3, R-3, R-4).**
  - **What:** creating the sample PDF is an implementation task. It is an original Norwegian (Bokmål) lecture on inventory management and supply-chain logistics.
  - **Pages:** 5–8 pages, including **exactly one image-only page** (required), so the `skipped_pages` behaviour can be tested and shown in the demo.
  - **Authorship:** the developer provides or substantially authors the core lecture content. Claude Code may help with structure, language and formatting.
  - **Provenance note:** records authorship, licence and any AI assistance.
  - **Course-rules check:** before the PDF is treated as acceptable for submission, the developer checks the course's AI-use rules (open item U-1).
  - **Tests:** Norwegian characters (æ, ø, å) are extracted correctly; the page count is within the limit; the image-only page appears in `skipped_pages`; `GET /api/demo/sample.pdf` returns bytes identical to the sample file processed by the demo pass.
  - **Dependency:** the temporary fixture (C-2) depends on this PDF, because its page references must be real markers from it.
- **C-4 Process and setup (A-4, A-6).** Process requirements, documentation, tests, Git practice and external account setup are covered by acceptance criteria and the Developer Checklist below, not by user-facing epics.
- **C-5 Single-pass lock (A-5).** The backend-wide single-pass lock (AD-16) is kept. It is stricter than the PRD's "per session" wording and compatible with it.
- **C-6 Traceability (A-7).** The added identifiers (`NFR-n`, `AR-n`, `UX-DR-n`, `D-n`, `DD-n`, `C-n`, `U-n`) and the added subsections are kept.

#### Developer checklist (non-story tasks, separate from user-facing features)

Done by the developer, mostly on external websites or by hand. Stories may reference these items in their acceptance criteria, but they are not product features.

- [ ] **Anthropic Console:** a dedicated project workspace with its own spend limit and key; prepaid credits with auto-reload off. Done before buying credits and before any real AI run (AR-7, AR-16).
- [ ] **GitHub:** secret scanning turned on where available (AR-7).
- [ ] **Before each real-AI session:** confirm and log each test document's source and permission basis (AR-20, AR-21).
- [ ] **Manual real-AI sessions:** a citation-quality table and a cost log, including one Norwegian document run in both output languages (AR-21, NFR-11).
- [ ] **Approved real run for the final demo fixture:** recorded, manually reviewed and given its provenance note (C-2, AD-13).
- [ ] **At milestones:** the manual UI checklist in both modes, including the network-off demo check (AR-21); accessibility tests T-1 to T-3 with findings in the test notes (UX-DR-39).
- [ ] **Sample PDF authorship:** core lecture content provided or substantially authored by the developer; the course's AI-use rules checked before the first paid fixture recording (Story 3.2) and again before submission (Story 3.10) (C-3, U-1).
- [ ] **Reflection report instructions:** the lecturer's instructions (format, length, deadline, submission channel, additional requirements) checked and recorded in `issues.md` before Story 3.9, and at the latest before Story 3.10 (U-2).
- [ ] **Before final submission:** the final demo fixture has replaced the temporary one; the README is checked against AR-23 and makes no real-run claim for a temporary fixture (C-2).
- [ ] **Throughout:** a session log per work session (`sesjonslogg`), committed only with approval (AR-22).
- [ ] **Later decisions:** the D-items below, a uv update, and whether to commit the `.claude/` and `_bmad/` tool folders.

#### Unresolved items

- **U-1 Course AI-use rules for the sample PDF.** The course's rules on AI-assisted content have not been checked yet. Until they are, the sample PDF counts as acceptable for development and testing only, not yet for submission. **Decide by:** before the first paid fixture recording (Story 3.2); checked again as the final submission gate (Story 3.10).
- **U-2 Reflection report requirements.** The reflection report (refleksjonsrapport) is a confirmed deliverable, written by the developer. Its exact format, length, deadline, submission channel (including whether it is submitted through the repository) and any additional requirements are unresolved until the lecturer's instructions are checked. **Decide by:** before Story 3.9 (evidence index and report preparation), and at the latest before Story 3.10 (final submission check).

#### Decision history (Steps 2–4, approved 2026-11-10)

A record of decisions approved by the developer after Step 1, for traceability and as evidence for the reflection report. These are not new requirement IDs; the C-1 to C-6 clarifications above remain a closed Step 1 set. Each decision is binding through the stories named.

- **Epic structure (Step 2):** three epics along the risk boundaries free demo → paid AI → final fixture; every story carries its own tests; Epic 3 verifies and finalises rather than rebuilds (Epic List).
- **Anthropic SDK timing:** added in Story 2.3, not 1.1, with the `uv.lock` change reviewed in that Pull Request (1.1, 2.3).
- **Text-file identification:** the fixed rule order in stage 1, including that the extension must match the detected type (`.pdf`/`.txt`, case-insensitive) and is never sufficient on its own (1.6).
- **Strict PDF signature:** `%PDF-` must be at the very start of the file; unusual PDFs with leading bytes are a documented known limitation (1.6, 3.8).
- **Page-marker validation is not semantic verification:** automated checks prove only that cited pages are supplied markers; whether a page supports an item is checked manually (1.10, 1.13, 3.2, 3.5).
- **Results split:** results shell and tabs separate from Summary rendering and page links (1.16, 1.17).
- **Byte limit:** the counted file bytes are authoritative (exactly 10,485,760 bytes accepted); any early `Content-Length` check is conservative and allows multipart overhead (2.1).
- **Privacy link:** opens in a new tab with `target="_blank"` and `rel="noopener"`; approved accessible name `Les mer om hvordan Anthropic behandler data, åpnes i ny fane`; visible wording unchanged (2.4).
- **Spending safeguards:** the call cap, token ceiling and paid-call counter are safeguards, not budget guarantees; the Console spend limit and prepaid credit remain the hard limits; explicit approval before every paid session (2.2, 2.11).
- **Manual retries:** no automatic retries; a user-triggered retry may make another paid call, which the README states; the approved Norwegian interface text is unchanged (2.9, 2.11).
- **Fixture recording:** a developer-run script with no public endpoint, never run in CI, built and tested with fakes before any paid call, and requiring explicit approval before every paid attempt (3.1, 3.2).
- **Candidate-first recording:** recordings are written only as Git-ignored candidates and replace the temporary fixture only after the developer explicitly approves the review (3.1, 3.2).
- **No hand-editing of genuine AI output:** serious inaccuracies or unsupported citations cannot be accepted merely by documenting them (3.2).
- **U-1 timing:** checked before the first paid recording and again as the final submission gate (3.2, 3.10).
- **Evidence location:** `docs/testing/` under the AR-19 privacy and source-permission rules (Epic 3).
- **Implementation explanation:** a new `docs/IMPLEMENTATION-NOTES.md`; the architecture spine and REVIEWER-EXPLAINER stay unchanged (3.8).
- **Reflection report:** written personally by the developer; Claude Code may only help organise evidence or prepare a structure with approval and under the course rules; details unresolved until the lecturer's instructions are checked (U-2; 3.9, 3.10).
- **Step 4 validation corrections:** the page-link component takes its link source as an input and real mode never links to the demo PDF (1.17, 2.6, 2.7); the focused Vitest tests are an approved story-level extension of the AD-20 layer-3 minimum (Epics 1 and 2); an English-language source document is tested in the final quality session (3.5); Story 3.1 split into a free script story and a paid recording story (3.1, 3.2).

### Additional Requirements

Technical requirements from the architecture spine that shape epics and stories.

**⚠ Starter template (affects Epic 1, Story 1):** the frontend is created with **`create-next-app`** (Next.js 16.4.x, TypeScript, App Router), then its defaults are changed: replace `next/font/google` with the system font stack, agent-feedback option off, telemetry disabled (`NEXT_TELEMETRY_DISABLED=1`). The backend is a FastAPI app managed with **uv** (Python 3.13). The repository layout follows the Structural Seed: `frontend/`, `backend/app/{api,pipeline,connectors,contracts,config.py}`, `backend/tests/`, `backend/.env.example`, `samples/`, `.github/workflows/`, `README.md`.

| ID | Requirement | Source |
|---|---|---|
| AR-1 | **Stack and versions:** Python 3.13.x, uv 0.8.15+ (update only with approval; CI pinned to the same), FastAPI 0.162.x, Uvicorn 0.54.x, Pydantic 2.14.x, pydantic-settings 2.16.x, python-multipart 0.0.32, anthropic SDK 2.3.x, pypdf 6.21.x, pytest 9.1.x; Node 22.x LTS, Next.js 16.4.x, React 19.x, TypeScript 5.x, Vitest 5.0.x (+ @vitejs/plugin-react, jsdom), @testing-library/react 16.3.x. Exact versions fixed by committed `uv.lock` and `package-lock.json`. | Stack |
| AR-2 | **Local-only topology:** no deployment; backend binds `127.0.0.1:8000`; app opened at `http://localhost:3000`; backend `ALLOWED_ORIGIN` equals exactly that origin; frontend calls the backend via the non-secret `NEXT_PUBLIC_API_BASE_URL`; no Next.js server-side proxy. | AD-3 |
| AR-3 | **Backend is the single authority; frontend is thin:** all processing, AI calls and authoritative validation in the backend; frontend pre-checks (type/size from `/api/status`) are for friendliness only and never call the AI provider. | AD-2 |
| AR-4 | **Six-stage pipeline:** single entry point `run_pass(doc, filename, inputs, source: "upload" \| "sample")` runs 1 validate bytes → 2 extract text with page markers → 3 build prompt → cost gate (real only) → 4 connector → 5 validate output → 6 respond; any stage may stop the pass with an AD-11 code. The api layer owns receiving and the byte cap; no route calls a connector directly. Dependency rules: `pipeline` never imports a concrete connector or provider SDK; only `connectors.real` imports the Anthropic SDK; `contracts` imports nothing from the app. | AD-1, Design Paradigm |
| AR-5 | **Connector interface:** `ConnectorRequest{system, document_block, inputs}`, `ConnectorReply{raw_json, stop, input_tokens, output_tokens}`, `ConnectorError{code: ai_unavailable \| ai_rate_limited \| ai_credits_exhausted}`; methods `count_input_tokens` and `generate`; connectors return unparsed text and map every provider exception to `ConnectorError`. Implementations: `real`, `demo`, test fakes. `AI_MODE=real \| demo` read once at startup, **default `demo`**; `real` without a key refuses to start with a clear message, never falls back to demo. | AD-4 |
| AR-6 | **Configuration:** one backend settings module from environment: `AI_MODE`, API key, provider, model `claude-haiku-5-5`, effort `low`, `max_tokens` (≈16,000), timeout (90 s), limits, call cap, `ALLOWED_ORIGIN`; no literals in stages. Gemini fallback is **not** built for MVP. | AD-5, Conventions → Config |
| AR-7 | **API key handling:** key read only by the backend, only from gitignored `backend/.env`; committed `backend/.env.example` (blank key, `AI_MODE=demo`); no secret in any `NEXT_PUBLIC_*`; key, full provider requests and raw provider errors never logged or returned; dedicated Anthropic Console workspace with its own spend limit and key; a leaked key is revoked immediately; `git status` before every commit; GitHub secret scanning where available; no AI key in GitHub, including CI. | AD-6 |
| AR-8 | **Zero persistence and privacy disclosure:** uploads held in memory for one request; any framework temp file deleted at request end. Local logs record only stage, error code, duration, token counts, `reference_id`. Real mode shows the external-AI notice. README/docs state Anthropic's default 30-day deletion and no-training default **with exceptions**, citing the policy page and check date; never promise unconditional deletion. | AD-7 |
| AR-9 | **Page markers:** stage 2 extracts per PDF page with pypdf; each page with non-empty text wrapped `<page number="N">…</page>` (N = 1-based PDF viewer position); pages without text go into `skipped_pages`; marker-like strings in page text are neutralised; no text at all (or empty plain text) → `no_extractable_text` before any AI call; plain text gets no markers; no chunking. | AD-8 |
| AR-10 | **AI output contract:** structured output `{status: "ok" \| "insufficient_content", summary: {text, pages}, flashcards: [{front, back, pages}], quiz: [{question, answer, pages}], key_concepts: [{term, explanation, pages}]}`; the model must never pad. | AD-9 |
| AR-11 | **Stage 5 three gates → `ValidatedResults`:** Gate 1 `stop == complete`; Gate 2 parse, `insufficient_content` handled first, full Pydantic parse with no empty text; Gate 3 ≥ 5 items per list, PDF pages filtered to the supplied set, any flashcard/quiz item/key concept left with zero pages fails the pass, Summary pages optional but filtered, any page on plain text fails the pass. Failures → `ai_output_invalid`. `pages` always a sorted, de-duplicated `int[]`. Stage 6 accepts only `ValidatedResults`. | AD-10 |
| AR-12 | **Backend→browser contract:** success `{mode, results, skipped_pages}`; every non-2xx (including framework validation errors, unknown routes, unsupported methods, oversize bodies, unhandled exceptions) uses `{error_code, message, limit?, reference_id?}`; catch-all handler inside CORS; closed error list with fixed HTTP mapping (400/403/404/405/409/413/422/429/500/502/503); CORS preflight replies and bodyless `HEAD` replies are exempt (AD-11); `reference_id` 8 lowercase hex, also on the log line; backend `message` in Norwegian Bokmål; frontend decides success by presence of `error_code`. | AD-11 |
| AR-13 | **Contracts:** Pydantic is the source of truth; frontend TS types mirror them by hand with identical `snake_case` names. Fixtures: `samples/demo-ai-output.json` (raw AD-9 shape, consumed by the demo connector) and `samples/demo-response.json` (exact AD-11 success envelope from `/api/demo`, regenerated and asserted by a backend test, consumed by frontend tests with a runtime shape check); drift fails CI. | AD-12 |
| AR-14 | **Demo mode:** `POST /api/demo` processes only the bundled sample; `POST /api/generate` returns `demo_mode_no_uploads` in demo (checked before the pass lock); `POST /api/demo` returns `demo_not_enabled` in real mode. Stages 1, 2, 3, 5 run for real on the sample with fixed inputs (`standard`, `nb`); stage 4 returns the fixture. No key, no provider client, no external network or resources at runtime. `GET /api/demo/sample.pdf`: GET only, demo only, serves only the fixed sample PDF as `application/pdf`, `Content-Disposition: inline`; real mode → `demo_not_enabled` (403); missing file → `internal_error` (500); no pass lock, no paid-call count. Labelled by `mode: "demo"`, a permanent banner and the heading `Eksempelresultater (ikke generert nå)`. The sample is the developer's own original Norwegian (Bokmål) lecture on inventory management and supply-chain logistics; the fixture is recorded once from a real run, manually reviewed and committed with a provenance note (date, model ID, inputs, reviewed). Supporting detail (explainer): 5–8 pages with one image-only page. | AD-13 |
| AR-15 | **Input limits in fixed order** (values provisional): 10 MB = 10,485,760 bytes, 80 PDF pages, 200,000 extracted characters, 60,000 input tokens. Order: api layer declared length + chunked byte count → stage 1 content signature, UTF-8, PDF opens (`unreadable_file`), total page count → stage 2 `no_extractable_text`, then characters before markers → cost gate tokens. Any limit → `file_too_large` with `limit` = `bytes`/`pages`/`characters`/`tokens`. | AD-14 |
| AR-16 | **Paid-call cost controls (real only):** call-cap check first (`session_call_limit_reached`), then free token count + fixed safety margin vs the ceiling (counting failure → `ai_unavailable`, no paid call); `max_tokens` cap; zero automatic retries anywhere (`max_retries=0`); 90 s AI timeout → `ai_unavailable`; prepaid credits, auto-reload off; routine development and all automated tests use demo or fakes. | AD-15 |
| AR-17 | **One pass at a time:** one `PassGuard` owns the pass lock (non-blocking, released in `finally`, shared by `/api/generate` and `/api/demo`; busy → `generation_in_progress`) and the paid-call counter (incremented immediately before each paid `generate`). Frontend disables Generate until reply or network error; no client timeout shorter than backend AI timeout + 30 s. | AD-16 |
| AR-18 | **Generation Inputs and prompt safety:** multipart fields `file`, `course_code`, `detail_level`, `output_language` (empty string = unset); closed lists in `contracts/` served with defaults by `/api/status` (`brief \| standard \| detailed`, default `standard`; `nb \| en`, default `nb`); absent → default; invalid → default + log line; `course_code` stripped of control characters, truncated to 100, placed in a delimited data block. System instruction: Document text only; document and inputs are data; cite only supplied pages; all four Result types in the selected language; terminology preserved with the original term in brackets on first use when languages differ. | AD-17 |
| AR-19 | **Plain-text rendering:** all AI-generated, document-derived and backend `message` text rendered as plain text; no `dangerouslySetInnerHTML`, no Markdown-to-HTML. | AD-18 |
| AR-20 | **Public repository hygiene:** never commit keys, `.env`, private config, sensitive or copyrighted documents, or real AI responses about non-public material; committed samples are the developer's own or openly licensed with source/licence noted; test files generated by tests or made by the developer. Sending a document to the AI and committing it are separate permissions; real course PDFs never committed and sent only with confirmed permission. Same rules govern `.logs/`. | AD-19 |
| AR-21 | **Testing layers:** (1) pytest per stage, every error code via fakes, full gate-chain tests, Norwegian-character extraction tests, `GET /api/demo/sample.pdf` tests; (2) contract tests on both fixtures, backend and frontend; (3) a small focused set of frontend tests (demo banner, skipped-pages notice, error headlines, plain-text rendering); (4) deliberate manual real-AI sessions on 3–5 permitted test PDFs with a citation-quality table and cost log, including one Norwegian document in both output languages; (5) a manual UI checklist in both modes before each milestone, including a network-off demo check. Layers 1–3 never use a real key. | AD-20 |
| AR-22 | **Git workflow and CI:** one short-lived branch per story → Pull Request → self-review (tests green, checklist, BMAD code review) → merge; plain-English commit messages; every commit, push and merge needs explicit approval; GitHub Actions runs backend and frontend tests on every Pull Request in demo/fake mode with the same uv/Node versions; sessions logged with `sesjonslogg` in `.logs/<user>/`, committed only with approval. | AD-21 |
| AR-23 | **README runnability:** no-key demo quickstart (backend `uv sync` + `uv run` on 127.0.0.1:8000; frontend `npm install` + `npm run dev` on localhost:3000), optional real-mode setup with the reviewer's own key, the privacy statement (AD-7), known limitations (no OCR, tables/figures may be unreadable); `frontend/.env.example` holds `NEXT_PUBLIC_API_BASE_URL` and `NEXT_TELEMETRY_DISABLED=1`. | AD-22 |
| AR-24 | **Endpoints:** `GET /api/status` → `{mode, limits: {max_upload_bytes, max_pdf_pages, max_text_chars}, options: {detail_level: {values, default}, output_language: {values, default}}, accepted_types: ["application/pdf", "text/plain"]}`; `POST /api/generate` (multipart per AD-17); `POST /api/demo` (no body); `GET /api/demo/sample.pdf`. `snake_case` JSON on both sides. If `/api/status` fails, the frontend shows the server-not-reachable state. | Conventions → Endpoints, JSON naming |
| AR-25 | **Notices with Results:** Verification Notice always; skipped-pages notice when `skipped_pages` is non-empty; demo banner in demo mode; external-AI notice in real mode. | Conventions → Notices |
| AR-26 | **Logging:** local only; stage, code, duration, tokens, `reference_id`; never content or secrets. | Conventions → Logging, AD-7 |

### UX Design Requirements

From the UX design contract (DESIGN.md for visuals and tokens, EXPERIENCE.md for structure, behaviour, exact copy and accessibility). All interface text is Norwegian Bokmål exactly as approved; "KI" not "AI" in interface text; product name "AI Study Buddy".

**Foundation and visual system**

- **UX-DR-1 Design tokens** (DESIGN.md frontmatter): implement every colour (`background` #F7F3EA … `backdrop`), typography role (caption, small, body, ui, answer, heading, subheading, brand, flashcard-term), rounded (6/10/12px) and spacing token (scale 4–48px, `control-min-height` 44px, `target-min` 24px, `measure-answer` 65ch, `content-max-width` 960px, border and focus widths) as CSS custom properties. Light mode only; no dark-mode styles. System font stack only; no web fonts or CDN. Flat surfaces: no shadows or gradients. Size values are minimums (`min-height`, never fixed heights).
- **UX-DR-2 Component visual specs** (DESIGN.md → Components): app-header, demo-banner, notice-info, notice-warning, not-saved-note, upload-bar / upload-bar-locked, file-chip / file-chip-problem, settings-field, button-primary (+ hover, disabled), button-secondary (+ hover, disabled), result-tab (+ hover, selected), flashcard, quiz-item, page-link, dialog, loading-indicator, error-state, focus-ring — each styled from its tokens.
- **UX-DR-3 Global focus ring:** `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px }` on every focusable element, including tab panels and aria-disabled controls; never removed (AF-2).
- **UX-DR-4 Inline SVG icons:** logo mark (open book), info circle, warning triangle, error circle-✕, demo screen-with-play, file outline, padlock, upward arrow; stroke `currentColor`; `aria-hidden="true"` and `focusable="false"`; no icon library or external assets.

**Page structure and startup**

- **UX-DR-5 Single-page shell:** `<html lang="nb">`, `<title>AI Study Buddy</title>`; `<header>` with `h1` `AI Study Buddy` and logo; `<main>`; regions `<section aria-label="Opplasting og innstillinger">` and `<section aria-label="Resultater">` whose names never change; content centred, max 960px; results area directly after the upload bar in tab order; heading outline h1 → h2 → h3 per tab panel → h4 per quiz question; header, banner and notices never sticky or fixed.
- **UX-DR-6 Startup states:** S0 `Starter …` (not announced, no controls) while `/api/status` loads; S0x on failure uses the error-state component with `Får ikke kontakt med appens server` / `Sjekk at serveren er startet, og trykk «Prøv igjen».` and a `Prøv igjen` button that re-checks `/api/status`, stays in place aria-disabled while checking, moves focus to the headline on each failure, and on success moves focus to `Last opp` (real) / `Vis eksempel` (demo).
- **UX-DR-7 Copy rules for runtime values:** `<max_upload_mb>` = `limits.max_upload_bytes` ÷ 1,048,576, at most one decimal, Norwegian decimal comma; `<max_pdf_pages>` from `limits.max_pdf_pages`; actual file sizes use the same binary convention (e.g. `2,4 MB`); the token ceiling and the KI call cap are never shown as numbers; no numeric limit hard-coded in UI text.

**Notices**

- **UX-DR-8 External-AI notice** (real mode, always, `notice-info`): exact text `Teksten i dokumentet ditt sendes til Anthropic, en ekstern KI-tjeneste, for å lage studiemateriell. AI Study Buddy lagrer ikke dokumentet eller resultatene. Les mer om hvordan Anthropic behandler data.` with the last sentence as a link to Anthropic's official data-handling information. (Link target tab behaviour is deferred — see D-6.)
- **UX-DR-9 DEMO banner** (demo mode, always, `demo-banner`): `DEMO – du ser et ferdig eksempel. Ingen KI-tjeneste brukes, og egne filer kan ikke lastes opp.`
- **UX-DR-10 Verification Notice** (always with Results, both modes, `notice-warning`, no extra clicks): `Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.`
- **UX-DR-11 Skipped-pages notice** (`notice-info`, only when `skipped_pages` non-empty), with singular, two-item and 3+ wording: `PDF-side 2 hadde ingen lesbar tekst …`, `PDF-side 2 og 7 hadde …`, `PDF-side 2, 7 og 9 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.`
- **UX-DR-12 Not-saved note** (real S4 only, next to Ny fil): `Resultatene lagres ikke. De forsvinner hvis du lukker eller laster inn siden på nytt.` Notices are never dismissible, sticky or fixed; each has icon + text.

**Upload and settings**

- **UX-DR-13 Upload bar:** holds `Last opp`, file chip, three settings fields and `Generer`; locked read-only variant (`upload-bar-locked`) during S3 and S4, settings shown as a `<dl>` with `<dt>`/`<dd>` pairs, lock icon `aria-hidden`, lock state also stated in text (wording deferred — D-2); unlocks on S5; defaults Norsk bokmål / Standard / empty course code; demo S4 shows it locked with fixed settings; wraps its fields (AF-11).
- **UX-DR-14 Last opp:** a real `<button>` opening a visually hidden `<input type="file">` (one file; `accept` = `.pdf,.txt` + MIME types from `/api/status`); choosing a new file replaces the current one; disabled in demo and while locked; **no drag-and-drop**.
- **UX-DR-15 File chip:** file icon, name (ellipsis, wraps at narrow widths), type and actual size; lock icon while locked; problem variant (`file-chip-problem`) for failed pre-check or invalid/too-big/too-little-content rejection, stating the problem in text (visually hidden if not shown); ✕ icon `aria-hidden`.
- **UX-DR-16 Browser pre-check:** on file selection, check type and size (from `/api/status`) for friendliness only; on failure an inline message with an `id` (`Bare PDF- og TXT-filer støttes.` / `Filen er større enn <max_upload_mb> MB. Velg en mindre fil.`), `aria-describedby` from `Last opp` (and Generer), announced via the status region, problem chip, Generer aria-disabled until the file is replaced.
- **UX-DR-17 Settings fields:** visible `<label for>`; selects `Språk på resultatene` (`Norsk bokmål` nb default / `Engelsk` en) and `Detaljnivå` (`Kort` / `Standard` default / `Detaljert`) rendered from `/api/status`; `Emnekode (valgfritt)` text input, placeholder `f.eks. LOG201`, `maxlength="100"`, `autocomplete="off"`. Demo: selects fixed (Norsk bokmål, Standard) with the note `Demoen viser ferdiglagde resultater på norsk bokmål med standard detaljnivå. Innstillingene kan ikke endres, og det lages ingen ny oversettelse.`
- **UX-DR-18 Generer / Vis eksempel / Prøv igjen / Forrige / Neste — temporarily unavailable pattern:** `type="button"`, never native `disabled`; unavailable = `aria-disabled="true"`, still focusable, disabled visual style, activation blocked for click/Enter/Space by a guarded handler; Generer and Vis eksempel never send a duplicate request. Generer availability: unavailable with no file, a problem file, while locked, after a hard-stop error, after `invalid_request` or unknown codes; available in S2 and after Temporary-group errors only. `Vis eksempel` replaces Generer in demo and calls `POST /api/demo`.

**Loading, status and results**

- **UX-DR-19 Loading state S3:** animated indicator + `Lager studiemateriell … Dette kan ta opptil to minutter.` (demo: `Henter eksempel …`); everything locked; no progress bar, elapsed counter or cancel; static under `prefers-reduced-motion` (AF-13); no client timeout shorter than backend AI timeout + 30 s.
- **UX-DR-20 Status live region (AF-6):** one visually hidden `<div role="status" aria-live="polite" aria-atomic="true">`, present and empty from first render; announces loading text, `Resultatene er klare`, and pre-check messages; cleared then set on the next tick so repeats are announced; polite only; errors never announced through it.
- **UX-DR-21 Results area S4:** `h2` `Resultater` (real) or `Eksempelresultater (ikke generert nå)` (demo, on one row with `Tilbake til start`); above the tabs: Verification Notice, skipped-pages notice when relevant, not-saved note + `Ny fil` (real) / `Tilbake til start` (demo); upload bar locked; focus not moved on arrival.
- **UX-DR-22 Result tabs (AF-3):** full WAI-ARIA APG tabs — `role="tablist"` labelled by the results h2; `<button role="tab">` with `id`, `aria-selected`, `aria-controls`, roving tabindex; `role="tabpanel"` with `aria-labelledby`, `tabindex="0"`; inactive panels stay mounted with `hidden`; fixed order **Sammendrag | Nøkkelbegreper | Flashkort | Quiz**, Sammendrag selected first; counts only on Flashkort and Quiz (e.g. `Flashkort (8)`); Left/Right with automatic activation and wrapping, Home/End; tab list wraps at narrow widths; panel position and revealed answers kept across tab switches.
- **UX-DR-23 Sammendrag panel:** plain text with line breaks preserved (`white-space: pre-line`), no Markdown; page links only where the Summary has pages.
- **UX-DR-24 Nøkkelbegreper panel:** each key concept as plain text (term + explanation, line breaks preserved) with its page links.
- **UX-DR-25 Flashcard:** one card at a time; order counter `Kort N av M` (its own polite live region, present from panel start) → term → `Vis svar`/`Skjul svar` (`aria-expanded`, `aria-controls`, answer `hidden` when collapsed) → answer + page links → `Forrige`/`Neste` (aria-disabled at the ends, focus stays); current card and revealed answers kept across tab switches; reset on a new results session.
- **UX-DR-26 Quiz item:** all questions as an `<ol>` in the Quiz panel, question as `h4`, then `Vis svar`/`Skjul svar` → answer → page links; each answer hidden by default with its own toggle; no "Vis alle svar", no typing, selecting, scoring or saving.
- **UX-DR-27 Page link:** `<a href={url + '#page=' + n} target="_blank" rel="noopener">PDF-side {n}<span aria-hidden="true"> ↗</span><span class="sr-only">, åpnes i ny fane</span></a>`; one link per page, inline, separator ` · ` `aria-hidden`; target ≥ 24px. Real mode: the selected file kept in browser memory and opened via an object URL created once per results session and revoked on Fortsett; nothing re-uploaded. Demo: `<NEXT_PUBLIC_API_BASE_URL>/api/demo/sample.pdf#page=N` (clickable links required). Plain text: no links.
- **UX-DR-28 lang on English results (AF-5):** when the submitted `output_language` is `en`, `lang="en"` only on elements holding generated text, never on containers with Norwegian labels, controls, page links, counters, notices or tab names; demo results are `nb`.

**Starting over and leaving**

- **UX-DR-29 Ny fil dialog (real):** native `<dialog>` with `showModal()`, labelled by `Resultatene blir ikke lagret og vil forsvinne. Vil du fortsette?`; buttons `Avbryt` (initial focus) / `Fortsett` (primary); `Avbryt` or `Esc` keeps everything and returns focus to `Ny fil`; `Fortsett` removes the leave warning, clears results, revealed answers and the in-memory PDF, returns to S1 with default settings, focus to `Last opp`.
- **UX-DR-30 Tilbake til start (demo):** returns directly to demo S1, no dialog, no leave warning; revealed answers reset; focus to `Vis eksempel`.
- **UX-DR-31 Leave/reload warning:** browser `beforeunload` warning registered only in real S4, removed on Ny fil → Fortsett; off in all other states and all demo states.

**Errors**

- **UX-DR-32 Error state component (S5/S0x):** `<h2 tabindex="-1">` headline → action text → backend `message` as a smaller muted detail line (plain text); focus moves to the headline (announced once); no `role="alert"`, no live-region announcement; file and settings stay visible when safe; upload bar unlocked; choosing a new file returns to S2.
- **UX-DR-33 Headline + action text per code:** implement the exact Norwegian texts in EXPERIENCE.md → Error headline + action per code for: server unreachable, `unsupported_file_type`, `bad_text_encoding`, `unreadable_file`, `no_extractable_text`, `file_too_large` (per `limit`: bytes / pages / characters / tokens, each followed by `Prøv med én forelesning om gangen.`), `insufficient_content`, `generation_in_progress`, `ai_unavailable`, `ai_rate_limited`, `ai_output_invalid`, `ai_credits_exhausted`, `session_call_limit_reached`, network failure during generation (`Mistet kontakten med serveren`), `internal_error` (with `<reference_id>`), `invalid_request`, and unknown/other codes including `demo_mode_no_uploads`, `demo_not_enabled`, `not_found` and `method_not_allowed` (`Noe gikk galt`). No message implies a retry costs money.
- **UX-DR-34 S5 error groups:** Invalid file, Too big, Too little content → file kept and marked, Generer aria-disabled until replaced; Temporary (`ai_unavailable`, `ai_rate_limited`, `ai_output_invalid`, `generation_in_progress`, `internal_error`, network failure) → Generer available; Hard stop (`ai_credits_exhausted`, `session_call_limit_reached`) → Generer aria-disabled, reload required; Reload required (`invalid_request`, unknown codes) → Generer aria-disabled. Demo errors use the same table with `Vis eksempel` in Generer's place.

**Accessibility floor and testing**

- **UX-DR-35 Keyboard and focus (AF-1, AF-4):** every control keyboard-operable; tab order follows visual order; focus never lost to `<body>`; the focus-management rules in EXPERIENCE.md → Interaction Primitives; no custom keyboard shortcuts.
- **UX-DR-36 Labels and names (AF-7, AF-8):** accessible name = visible label everywhere (no differing `aria-label`), except the page-link hidden suffix; heading structure and landmarks as UX-DR-5.
- **UX-DR-37 Contrast and colour (AF-9, AF-10):** body text ≥ 4.5:1, large text/icons/control borders ≥ 3:1 (token pairs pre-verified); never colour alone — icon + text for errors, notices and the DEMO banner.
- **UX-DR-38 Zoom, reflow and targets (AF-11, AF-12):** usable at 200% zoom; reflow at 320 CSS px with no two-dimensional scrolling (upload bar, tab list, all button rows and long words wrap; no clipping under text-spacing overrides); targets ≥ 24×24px, controls ≥ 44px tall.
- **UX-DR-39 Accessibility tests:** T-1 keyboard-only walkthrough (Key Flow 1 + demo flow + reflow/text-spacing), T-2 Lighthouse (S1, S3, S4 each tab, S5, demo S4; optional Accessibility Insights), T-3 short screen-reader spot check (NVDA or Narrator) — at implementation milestones and before final submission, findings recorded in the manual test notes. Target: WCAG 2.2 AA as a design and testing target, never a blanket compliance claim.
- **UX-DR-40 Banned anti-patterns:** fake progress bar, elapsed-time counter, cancel button; "Vis alle svar"; quiz typing/selecting/scoring/saving; a separate results screen; any path mixing demo and live generation; messages implying retries cost money; native `disabled` on the five controls in UX-DR-18; `role="alert"` on errors; drag-and-drop upload; dark mode.

**Key flows to verify end to end:** Key Flow 1 (Odeibea, real mode: understand, practise, verify) and Key Flow 2 (the examiner, demo mode, offline, no key).

### Deferred and open items (NOT approved features)

These are recorded so they are not silently built. Each needs a decision at the named point; any new Norwegian copy needs the developer's approval before it ships.

| ID | Item | Source | Revisit |
|---|---|---|---|
| D-1 | Visibility of the real-S4 `h2` `Resultater` and the panel `h3`s (visible or visually hidden). | EXPERIENCE OQ 8 | Building the results area; check with T-2/T-3 |
| D-2 | Lock-state text in the locked upload bar (wording not approved). | EXPERIENCE OQ 9 | Building the locked bar; needs copy approval |
| D-3 | Whether a valid file choice is announced, and its wording. | EXPERIENCE OQ 10 | Building Last opp / file chip; T-3 |
| D-4 | Whether changing only a setting in S5 keeps or clears the error state. | EXPERIENCE OQ 11 | Building S5 error handling |
| D-5 | Whether the demo fixed-settings note stays visible in demo S4. | EXPERIENCE OQ 12 | Building demo mode |
| D-6 | External-AI notice link: same tab or new tab (risk of the leave warning in S4). | EXPERIENCE OQ 13 | Building the external-AI notice |
| D-7 | S0/S0x content before the mode is known ([ASSUMPTION]: header + status message only). | EXPERIENCE OQ 14 | Building the `/api/status` startup check |
| D-8 | Type sizes outside the approved scale (settings-field values, demo results heading) — pick existing scale steps only. | DESIGN OQ 1 | First styled component |
| D-9 | Off-scale mockup paddings — snap to `{spacing.*}` steps and add padding tokens. | DESIGN OQ 2 | First styled component |
| D-10 | Visuals for unmocked surfaces (S0, S1 guidance, S2, pre-check message, fixed-settings note, Sammendrag/Nøkkelbegreper panels, dialog) — reuse existing tokens/components; proposed reuse not decided. | DESIGN OQ 3 | When each surface is built |
| D-11 | Exact prompt wording (inside stage 3; must satisfy AD-8, AD-9, AD-17). | Architecture → Deferred | Building stage 3 |
| D-12 | Final limit values (AD-14) and call cap (AD-15, default 20). | Architecture → Deferred | After the first real test session |
| D-13 | Patch-level tool updates (uv, Python 3.13.x, Node 22.x). | Architecture → Deferred | At implementation, with approval |
| D-14 | Gemini paid-tier connector — **not built for MVP**. | AD-5, Architecture → Deferred | Only if cost/availability forces it |
| D-15 | Phase 2 interactive quiz with scoring — **not in MVP**. | PRD §6.2, Architecture → Deferred | After MVP |

Open implementation prerequisites carried from `.logs/amma-kwaasi-eide/issues.md` (tasks for the developer, not product features): verify Anthropic Console spending controls before buying credits; write the Norwegian sample PDF and record/review the demo fixture; revisit provisional limits and the call cap after the first real test session; check Norwegian output quality on Claude Haiku 5.5; decide on a uv update; decide whether to commit the `.claude/` and `_bmad/` tool folders.

### FR Coverage Map

| FR | Epic 1 (demo) | Epic 2 (real) | Epic 3 (final verification) |
|---|---|---|---|
| FR-1 Upload a Document | Stage-1 validation of the sample's bytes | **Main:** upload, browser pre-check, every rejection path | Verified end to end |
| FR-2 Generation Inputs | Option lists and defaults from `/api/status`; fixed demo inputs; AD-17 input handling in prompt building | **Main:** settings UI, defaults, invalid-value fallback | Verified end to end |
| FR-3 Generation Pass | Pipeline, ≥ 5 count gate, backend-wide pass lock | **Main:** one real AI call, source-only instruction, terminology rule | Verified end to end |
| FR-4 Page References | **Main:** page markers, citation filtering, demo page links | Own-PDF page links; none for plain text | Manual citation-quality table |
| FR-5 Display Results | **Main:** all four result tabs and components | Real-mode results, `Ny fil` | Verified end to end |
| FR-6 Verification Notice | **Main:** always shown with Results | Same in real mode | Verified end to end |
| FR-7 Failure handling | Error envelope, gate failures, `insufficient_content`, `internal_error`, server unreachable | **Main:** upload, AI and cost errors, network failure, all S5 groups | Verified end to end |

Cross-cutting requirements are covered inside stories, not as separate epics: accessibility (UX-DR-35 to UX-DR-39) through each component story's acceptance criteria; testing (AR-21) through each story's own tests; repository hygiene and Git practice (AR-20, AR-22) in every story. The Developer Checklist stays separate; stories only refer to it.

## Epic List

**Approved epic-level rules (2026-11-10):**

- Every implementation story includes its own tests and testable acceptance criteria. Epic 3 is final integration, verification and submission readiness, not the first point at which testing happens.
- Epic 1 may use generated test PDFs and fake connectors during development, but Epic 1 is complete only with the approved sample PDF (C-3) and a working offline demo.
- Epic 2's real-generation implementation must not depend unnecessarily on the temporary demo fixture (C-2); it is built and tested with fake connectors and generated test documents.
- Stories stay small, independently testable where practical, and manageable for one student developer (one branch and Pull Request per story, AR-22).
- U-1 (the course's AI-use rules for the sample PDF) stays visible as an unresolved submission prerequisite until it is checked.

### Epic 1: Run the app and explore a complete example

A reviewer or the student can start AI Study Buddy from the README with no API key and no internet connection, run the demo on the bundled Norwegian sample lecture, and use clearly labelled example results (Sammendrag, Nøkkelbegreper, Flashkort, Quiz) with working `PDF-side N` links into the sample PDF (Key Flow 2). Includes project setup (Story 1.1), the shared pipeline, the original sample PDF (C-3) and the temporary fixture (C-2).
**FRs covered:** FR-4, FR-5, FR-6; shared parts of FR-1, FR-2, FR-3 and FR-7.

### Epic 2: Generate study material from my own lecture

The student uploads their own PDF or TXT, chooses output language, detail level and an optional course code, and gets real AI study material whose page links open their own PDF. Every problem gets a clear Norwegian message and the right next action, and spending is safeguarded (Key Flow 1).
**FRs covered:** FR-1, FR-2, FR-3; real-mode parts of FR-4, FR-5, FR-6 and FR-7.

### Epic 3: Submission-ready, with a genuine demo and verified quality

The reviewer sees demo results recorded from an approved real AI run (replacing the temporary fixture), and the project has a final README and recorded end-to-end verification (SM-1, citation-quality table, T-1 to T-3) ready for submission. Requires U-1 to be resolved before submission.
**FRs covered:** none new; final verification of FR-1 to FR-7.

## Epic 1: Run the app and explore a complete example

A reviewer or the student can start AI Study Buddy from the README with no API key and no internet connection, run the demo on the bundled Norwegian sample lecture, and use clearly labelled example results (Sammendrag, Nøkkelbegreper, Flashkort, Quiz) with working `PDF-side N` links into the sample PDF (Key Flow 2).

**FRs:** FR-4, FR-5, FR-6; shared parts of FR-1, FR-2, FR-3 and FR-7. **Main requirements:** AR-1 to AR-5, AR-9 to AR-14, AR-17 to AR-19, AR-21 to AR-26; UX-DR-1 to UX-DR-6, UX-DR-9 to UX-DR-11, UX-DR-17 to UX-DR-27, UX-DR-30, UX-DR-32, UX-DR-35 to UX-DR-40; clarifications C-2 and C-3. Every story follows AR-20 and AR-22 (repository hygiene; one branch and Pull Request per story; every commit, push and merge only with the developer's approval).

**Development rule:** Stories 1.6 to 1.11 use test-generated PDFs and fake connectors, so they do not wait for the sample PDF. Epic 1 is complete only with the approved sample PDF (Story 1.12) and a working offline demo (Story 1.21).

**UI and test rules (approved 2026-11-10):** Each UI story styles its components according to DESIGN.md → Components, using the tokens from Story 1.4 (UX-DR-2). The focused Vitest tests in the UI stories deliberately extend the AD-20 layer-3 minimum (demo banner, skipped-pages notice, error headlines, plain-text rendering) to cover important UX and accessibility behaviours; this is an approved extension at story level, not a change to AD-20 or the architecture document.

| Story | Title | Depends on |
|---|---|---|
| 1.1 | Set up the project from the approved starters | — |
| 1.2 | Backend settings and the status endpoint | 1.1 |
| 1.3 | One error format for every failure | 1.2 |
| 1.4 | Page shell and visual foundation | 1.1 |
| 1.5 | Startup check (`Starter …` / server not reachable) | 1.2, 1.3, 1.4 |
| 1.6 | Check a document's bytes (stage 1) | 1.3 |
| 1.7 | Extract text with real page markers (stage 2) | 1.6 |
| 1.8 | Build the source-constrained prompt (stage 3) | 1.7 |
| 1.9 | Connector interface, AI output models and test fakes | 1.3 |
| 1.10 | Validate AI output with three gates (stage 5) | 1.9 |
| 1.11 | Run a complete pass, one at a time (`run_pass`, stage 6) | 1.6, 1.7, 1.8, 1.9, 1.10 |
| 1.12 | Add the original Norwegian sample lecture PDF | 1.7 |
| 1.13 | Temporary fixture, demo connector and `POST /api/demo` | 1.11, 1.12 |
| 1.14 | Serve the sample PDF for demo page links | 1.3, 1.12 |
| 1.15 | Demo start screen and "Vis eksempel" | 1.5, 1.13 |
| 1.16 | Results shell, notices and accessible tabs | 1.15 |
| 1.17 | Summary rendering and PDF page links | 1.14, 1.16 |
| 1.18 | Nøkkelbegreper panel | 1.17 |
| 1.19 | Flashkort | 1.17 |
| 1.20 | Quiz | 1.17 |
| 1.21 | Back to start, and demo acceptance | 1.18, 1.19, 1.20 |

### Story 1.1: Set up the project from the approved starters

As the developer,
I want the frontend and backend created from the approved starters with tests and CI in place,
So that every later story starts from a runnable, tested and safely configured project.

**Depends on:** — · **Requirements:** AR-1, AR-7, AR-22, AR-23, Starter template, C-2

**Acceptance Criteria:**

**Given** an empty `frontend/` folder
**When** the frontend is created with `create-next-app` (Next.js 16.4.x, TypeScript, App Router)
**Then** `next/font/google` is replaced with the system font stack, the agent-feedback option is off, and telemetry is disabled (`NEXT_TELEMETRY_DISABLED=1`)
**And** Vitest (+ @vitejs/plugin-react, jsdom) and @testing-library/react are set up with one passing test (AR-1).

**Given** the backend folder
**When** it is created as a uv project on Python 3.13 with FastAPI, Uvicorn, Pydantic, pydantic-settings, python-multipart, pypdf and pytest
**Then** the folders follow the Structural Seed (`backend/app/{api,pipeline,connectors,contracts}`, `config.py`, `backend/tests/`)
**And** one pytest test passes
**And** the anthropic SDK is **not** added in this story; the Epic 2 story that builds the real connector adds it with `uv add` within the architecture's version range (2.3.x), and that story's Pull Request includes the reviewed `uv.lock` change (AR-1).

**Given** the repository
**When** `.gitignore` and the example env files are added
**Then** `backend/.env`, `.venv/` and `node_modules/` are ignored
**And** `backend/.env.example` contains `AI_MODE=demo` and a blank key line
**And** `frontend/.env.example` contains `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` and `NEXT_TELEMETRY_DISABLED=1` (AR-7, AR-23).

**Given** a Pull Request
**When** GitHub Actions runs
**Then** it runs pytest and Vitest with the same uv and Node versions as local development, and with no API key (AR-22).

**Given** the README
**When** a reviewer reads it
**Then** it explains how to start the backend (`uv sync`, `uv run` on 127.0.0.1:8000) and the frontend (`npm install`, `npm run dev` on localhost:3000)
**And** it makes no claim that demo results come from a real AI run (C-2).

**And** `uv.lock` and `package-lock.json` are committed, no secrets are committed, and the `.claude/` and `_bmad/` folders are not touched
**And** D-13 (patch-level tool updates) is decided here, with the developer's approval.

### Story 1.2: Backend settings and the status endpoint

As the frontend (and a reviewer),
I want one status endpoint that reports the mode, limits, options and accepted types,
So that the interface never hard-codes these values.

**Depends on:** 1.1 · **Requirements:** AR-2, AR-5, AR-6, AR-18, AR-24

**Acceptance Criteria:**

**Given** the settings module
**When** the backend starts without `AI_MODE`
**Then** the mode is `demo` (AR-5)
**And** with `AI_MODE=real` and no API key, the backend refuses to start with a clear message and never falls back to demo
**And** all limits, the call cap, the timeout and `ALLOWED_ORIGIN` come from settings, not literals (AR-6).

**Given** the backend is running
**When** `GET /api/status` is called
**Then** it returns `{mode, limits: {max_upload_bytes: 10485760, max_pdf_pages: 80, max_text_chars: 200000}, options: {detail_level: {values: [brief, standard, detailed], default: standard}, output_language: {values: [nb, en], default: nb}}, accepted_types: ["application/pdf", "text/plain"]}` in `snake_case` (AR-24)
**And** the option lists come from `contracts/` (AR-18).

**Given** the run setup
**When** the backend runs
**Then** it binds only to `127.0.0.1:8000`, and CORS allows exactly `http://localhost:3000` (AR-2).

**And** pytest covers the default mode, the refusal without a key, the status shape and the CORS origin.

### Story 1.3: One error format for every failure

As a student,
I want every backend failure to arrive in one predictable shape,
So that the interface can always show a clear message instead of a blank screen.

**Depends on:** 1.2 · **Requirements:** AR-12, AR-26, FR-7

**Acceptance Criteria:**

**Given** the closed list of error codes in `contracts/` with their HTTP mapping (AR-12)
**When** any request fails, including framework validation errors, unknown routes, unsupported methods and unhandled exceptions
**Then** the body is `{error_code, message, limit?, reference_id?}`, and the CORS headers are present.

**Given** a request to a path that has no route
**When** it is received
**Then** the reply is `not_found` (404) with the message `Adressen finnes ikke.`, never echoing the path.

**Given** a request with a method the route does not support, including a plain `OPTIONS` request
**When** it is received
**Then** the reply is `method_not_allowed` (405) with the message `Metoden støttes ikke for denne adressen.` and an `Allow` header listing the supported methods.

**Given** a malformed request or a framework validation error
**When** it is received
**Then** the reply is `invalid_request` (400).

**Given** a `HEAD` request
**When** it is received
**Then** the reply is `method_not_allowed` (405) with an `Allow` header, or `not_found` (404) for an unknown path, with headers only and no body (AD-11).

**Given** a CORS preflight (`OPTIONS` with `Origin` and `Access-Control-Request-Method`)
**When** it is received
**Then** the CORS middleware answers it unchanged — 200 for an allowed origin, method and header on any path, and its plain-text 400 when rejected — and it is exempt from the envelope (AD-11).

**Given** an unhandled exception
**When** it is caught
**Then** the reply is `internal_error` (500) with an 8-character lowercase hex `reference_id`, and the same id appears on the log line.

**Given** any log line
**When** it is written
**Then** it holds only the stage, code, duration, token counts and `reference_id`, never document text, AI output or secrets (AR-26).

**And** the backend `message` texts are Norwegian Bokmål with no paths, provider bodies or secrets
**And** pytest covers every code's HTTP status, the unknown route, the unsupported method with its `Allow` header, the validation error, `HEAD`, both preflight cases, the catch-all with its CORS headers, and the log content.

### Story 1.4: Page shell and visual foundation

As a student,
I want a calm, accessible single page with the approved look,
So that the app feels trustworthy and works with keyboard and screen readers from the start.

**Depends on:** 1.1 · **Requirements:** UX-DR-1, UX-DR-3, UX-DR-4, UX-DR-5, UX-DR-20, D-8, D-9

**Acceptance Criteria:**

**Given** the DESIGN.md tokens
**When** the global styles are built
**Then** every colour, type, radius and spacing token exists as a CSS custom property
**And** the page uses light mode only, the system font stack, no shadows, and minimum sizes rather than fixed heights (UX-DR-1).

**Given** any focusable element
**When** it receives keyboard focus
**Then** the 3px focus ring with a 2px offset is visible (UX-DR-3).

**Given** the page
**When** it renders
**Then** it has `<html lang="nb">` and `<title>AI Study Buddy</title>`
**And** it has a `<header>` with `h1` `AI Study Buddy` and the inline SVG logo (`aria-hidden="true"`, `focusable="false"`)
**And** it has `<main>` with the two regions `Opplasting og innstillinger` and `Resultater`, content capped at 960px, and nothing sticky or fixed (UX-DR-4, UX-DR-5).

**Given** the page
**When** it first renders
**Then** one empty, visually hidden status region (`role="status"`, `aria-live="polite"`, `aria-atomic="true"`) is present, with a helper that clears it and then sets the text (UX-DR-20).

**And** Vitest checks the landmarks, region names, `lang` and the empty status region
**And** D-8 and D-9 (type sizes and paddings outside the scale) are resolved using existing scale steps only.

### Story 1.5: Startup check (`Starter …` / server not reachable)

As a student or reviewer,
I want to see that the app is starting, and a clear message if its server isn't running,
So that I know what to do instead of facing an empty page.

**Depends on:** 1.2, 1.3, 1.4 · **Requirements:** UX-DR-6, UX-DR-18, UX-DR-32, AR-13, AR-24, D-7

**Acceptance Criteria:**

**Given** the page loads
**When** `GET /api/status` is pending
**Then** `Starter …` is shown, no controls are available, and the message is not announced.

**Given** `/api/status` fails
**When** the error state renders
**Then** it shows the headline `Får ikke kontakt med appens server` (`<h2 tabindex="-1">`), the action text `Sjekk at serveren er startet, og trykk «Prøv igjen».` and a `Prøv igjen` button
**And** focus moves to the headline
**And** there is no `role="alert"` and no live-region announcement (UX-DR-6, UX-DR-32).

**Given** S0x
**When** `Prøv igjen` is pressed
**Then** it stays in place with `aria-disabled="true"` and keeps focus while the check runs
**And** a click, `Enter` or `Space` while aria-disabled does nothing
**And** a repeated failure moves focus to the headline again
**And** success leaves the error state (UX-DR-18).

**And** the frontend TS types mirror the status contract with identical `snake_case` names (AR-13)
**And** D-7 (what S0/S0x shows before the mode is known) is decided here
**And** Vitest covers pending, failure, retry while aria-disabled, and recovery.

### Story 1.6: Check a document's bytes (stage 1)

As a student,
I want a file checked by its actual content before anything else happens,
So that unsupported or broken files are rejected with a clear reason.

**Depends on:** 1.3 · **Requirements:** FR-1, AR-15, AR-20

**Acceptance Criteria:**

**Given** document bytes and a filename
**When** stage 1 identifies the type
**Then** PDF is recognised only by the `%PDF-` signature at the very beginning of the file
**And** plain text is recognised only by passing the text rules, checked in this order: a known binary signature (ZIP/Office `PK\x03\x04`, legacy Office, PNG, JPEG, GIF) → `unsupported_file_type`; a UTF-16 or UTF-32 byte-order mark → `bad_text_encoding`; any NUL byte → `unsupported_file_type`; strict UTF-8 decoding fails → `bad_text_encoding` (an optional leading UTF-8 BOM is allowed and removed); control characters other than tab, line feed, carriage return and form feed → `unsupported_file_type`
**And** the filename extension must match the detected type (`.pdf` for PDF content, `.txt` for text content, case-insensitive); a mismatch or a missing extension → `unsupported_file_type`
**And** the extension is never enough on its own to accept a file (FR-1, AR-15).

**Given** a PDF
**When** it can't be opened, for example corrupt or password-protected
**Then** stage 1 stops with `unreadable_file`
**And** a PDF with more than `max_pdf_pages` **total** pages → `file_too_large` with `limit: "pages"` (AR-15).

**Given** an empty `.txt` file
**When** stage 1 runs
**Then** it passes stage 1, so that stage 2 rejects it with `no_extractable_text`.

**Given** the strict PDF signature rule
**When** a PDF has stray bytes before `%PDF-`
**Then** it is rejected as `unsupported_file_type`, and this is documented as a known limitation (README known limitations).

**And** pytest uses test files generated by the tests, never downloaded files (AR-20): a PDF renamed to `.txt`; text renamed to `.pdf`; a PNG; a ZIP/DOCX; a Latin-1 `.txt` with æøå; UTF-16 with a byte-order mark; UTF-8 with and without a BOM; a NUL byte; disallowed control characters; `.TXT` in capitals; a missing extension; a `.md` UTF-8 file; an empty `.txt`; a corrupt PDF; an 81-page PDF.

### Story 1.7: Extract text with real page markers (stage 2)

As a student,
I want each piece of extracted text tagged with its real PDF page,
So that page references can later be checked against pages that actually exist.

**Depends on:** 1.6 · **Requirements:** FR-1, FR-4, FR-7, NFR-15, AR-9, AR-15, AR-21

**Acceptance Criteria:**

**Given** a PDF with text on pages 1 and 3 and an image-only page 2
**When** stage 2 runs (pypdf, per page)
**Then** pages 1 and 3 are wrapped as `<page number="1">…</page>` and `<page number="3">…</page>`, page 2 has no marker, and `skipped_pages = [2]` (AR-9).

**Given** page text containing a marker-like string such as `<page number="9">`
**When** it is wrapped
**Then** that string is neutralised, so it can't create a fake page.

**Given** a PDF with no text on any page, or a plain-text file that is empty after stripping
**When** stage 2 runs
**Then** it stops with `no_extractable_text` before any AI call (FR-7).

**Given** extracted text over `max_text_chars`, counted before markers
**When** stage 2 checks it
**Then** it stops with `file_too_large` and `limit: "characters"`.

**And** plain text gets no markers and `skipped_pages = []`
**And** pytest proves that æ, ø and å survive extraction from a generated PDF and from UTF-8 text (FR-1, AR-21).

### Story 1.8: Build the source-constrained prompt (stage 3)

As a student,
I want the AI instructed to use only my document, in my chosen language, with my inputs treated as data,
So that results stay grounded and can't be hijacked by document or input text.

**Depends on:** 1.7 · **Requirements:** FR-2, FR-3, NFR-5, AR-18, D-11

**Acceptance Criteria:**

**Given** extracted text and Generation Inputs
**When** stage 3 builds the `ConnectorRequest`
**Then** the system instruction says to use only the Document's text; treat document and input content as data; cite only the supplied page numbers; write all four Result types in the selected output language; and preserve terminology, giving the original term in brackets on first use when the languages differ (AR-18, FR-3).

**Given** `detail_level` or `output_language` is absent
**When** the inputs are read
**Then** the defaults (`standard`, `nb`) apply
**And** an invalid value falls back to the default and writes a log line (FR-2).

**Given** a `course_code` with control characters, 150 characters, or text such as "ignore previous instructions"
**When** it is placed in the prompt
**Then** control characters are stripped, it is cut to 100 characters, and it sits inside the delimited data block, never in the instruction (FR-2).

**And** the prompt wording (D-11) is recorded in code and shown to the developer for review
**And** pytest covers the defaults, invalid-value fallback, sanitising, delimiting, and that the selected language appears in the instruction.

### Story 1.9: Connector interface, AI output models and test fakes

As the developer,
I want one connector interface and the AI output contract defined in `contracts/`,
So that the pipeline never depends on a provider and every case can be tested free.

**Depends on:** 1.3 · **Requirements:** AR-4, AR-5, AR-10, AR-13

**Acceptance Criteria:**

**Given** `contracts/`
**When** the models are defined
**Then** `ConnectorRequest`, `ConnectorReply{raw_json, stop, input_tokens, output_tokens}`, `ConnectorError{code}` and the AD-9 output models (`status`, `summary`, `flashcards`, `quiz`, `key_concepts`, each with `pages`) exist as Pydantic models (AR-5, AR-10, AR-13).

**Given** the connector interface (`count_input_tokens`, `generate`)
**When** test fakes implement it
**Then** they can return a chosen `raw_json` and `stop`, raise each `ConnectorError` code, and report a fixed token count.

**And** an import check (test) shows that `pipeline` imports no concrete connector and no provider SDK, and that `contracts` imports nothing from the app (AR-4).

### Story 1.10: Validate AI output with three gates (stage 5)

As a student,
I want AI output that is incomplete, padded or cites pages that were never supplied to be rejected,
So that I only ever see complete results whose page references point to real PDF pages.

**Depends on:** 1.9 · **Requirements:** FR-3, FR-4, FR-7, AR-11, AR-21

**Acceptance Criteria:**

**Given** a reply whose `stop` isn't `complete`
**When** Gate 1 runs
**Then** the pass fails with `ai_output_invalid`.

**Given** `status: "insufficient_content"`
**When** Gate 2 runs
**Then** the pass stops with `insufficient_content` (422) and ignores the other fields
**And** malformed JSON, a missing Result type or empty text → `ai_output_invalid` (FR-7).

**Given** `status: "ok"` for a PDF with supplied pages {1, 3}
**When** Gate 3 runs
**Then** each list must have at least 5 items
**And** page 2 is removed from every item
**And** any flashcard, quiz item or key concept left with no pages fails the pass
**And** Summary pages are optional but filtered (FR-3, FR-4).

**Given** a plain-text Document
**When** any item has a page number
**Then** the pass fails.

**Given** Gate 3
**When** it validates page numbers
**Then** it proves only that each cited page is one of the PDF page markers supplied for this pass; it does **not** check that the page supports the item (FR-4, AR-11)
**And** code comments, test names and docs describe it as "page-marker validation", never as citation or content verification.

**Given** a fake reply where an item cites a real supplied page that is unrelated to its content
**When** Gate 3 runs
**Then** the item passes, and this test is kept as documented evidence of the limit.

**And** the output is a new `ValidatedResults`, with every `pages` field sorted and de-duplicated (`[]` allowed for the Summary, always `[]` for plain text) (AR-11)
**And** semantic support is checked **manually only**: during the developer's review of the temporary fixture (Story 1.13), and in the manual real-AI sessions with the citation-quality table (supports / partly / doesn't, about 5 items per PDF; AR-21 layer 4, Epic 2 and Epic 3)
**And** pytest covers each gate's failure and success paths with fakes.

### Story 1.11: Run a complete pass, one at a time (`run_pass`, stage 6)

As a student,
I want the whole pipeline to run in one fixed order, with only one pass at a time,
So that every request is checked the same way and double clicks can't start duplicate work.

**Depends on:** 1.6, 1.7, 1.8, 1.9, 1.10 · **Requirements:** FR-3, AR-4, AR-12, AR-17, C-5

**Acceptance Criteria:**

**Given** `run_pass(doc, filename, inputs, source)`
**When** it runs with a fake connector
**Then** the stages run in the order 1 → 2 → 3 → 4 → 5 → 6, any stage error stops the pass, and nothing after it runs (AR-4).

**Given** a successful pass
**When** stage 6 responds
**Then** it accepts only `ValidatedResults` and returns `{mode, results, skipped_pages}` (AR-12).

**Given** a pass is running
**When** a second pass starts
**Then** it gets `generation_in_progress` (409) at once
**And** the lock is released in `finally`, including after errors (AR-17, FR-3).

**And** the lock is backend-wide, not per browser session (C-5)
**And** the cost gate and the paid-call counter are **not** part of this story (Epic 2)
**And** pytest covers the stage order, stopping at each stage, the success envelope, the lock refusal and the lock release after an exception.

### Story 1.12: Add the original Norwegian sample lecture PDF

As a reviewer,
I want a bundled, original Norwegian sample lecture,
So that the demo shows realistic results without anyone's private or copyrighted material.

**Depends on:** 1.7 · **Requirements:** C-3, U-1, AR-14, AR-20

**Acceptance Criteria:**

**Given** the developer's own core lecture content on inventory management and supply-chain logistics (Norwegian Bokmål)
**When** it is added as the sample PDF in `samples/`
**Then** it has 5–8 pages, with **exactly one image-only page** (C-3).

**Given** the sample
**When** it is committed
**Then** a provenance note in `samples/` records authorship, licence and any AI assistance with structure, language or formatting
**And** it states that U-1 (the course's AI-use rules) is **still open**: the sample is acceptable for development and testing, not yet for submission.

**Given** the committed sample
**When** pytest runs stages 1 and 2 on it
**Then** it passes stage 1 within the limits
**And** exactly one page appears in `skipped_pages`
**And** æ, ø and å are extracted correctly.

**And** the developer approves the content before it is committed (AR-20).

### Story 1.13: Temporary fixture, demo connector and `POST /api/demo`

As a reviewer,
I want the demo to produce prepared results for the sample through the real checks,
So that I can try the app with no key, no cost and no network.

**Depends on:** 1.11, 1.12 · **Requirements:** C-2, AR-13, AR-14, AR-17

**Acceptance Criteria:**

**Given** the approved sample PDF
**When** the temporary fixture `samples/demo-ai-output.json` is drafted
**Then** it follows the unchanged AD-9 schema
**And** it uses only the sample's real content and real page markers, with no invented page references
**And** the developer reviews and approves it (C-2)
**And** during review the developer checks that each cited page supports its item, and records the check in the provenance note.

**Given** the provenance note
**When** the fixture is committed
**Then** the note marks it, unmistakably, as **TEMPORARY**: a development/test fixture, not recorded from a real run, to be replaced before final demo acceptance and submission (C-2).

**Given** `AI_MODE=demo`
**When** `POST /api/demo` is called
**Then** stages 1, 2, 3 and 5 run for real on the sample with fixed inputs (`standard`, `nb`)
**And** the demo connector returns the fixture with `stop: "complete"` and fixed token counts, creating no provider client
**And** the reply is a success envelope with `mode: "demo"` (AR-14).

**Given** `AI_MODE=real`
**When** `POST /api/demo` is called
**Then** it returns `demo_not_enabled` (403).

**And** the lock is shared, so a busy demo pass returns `generation_in_progress`
**And** a backend test regenerates and asserts `samples/demo-response.json` (AR-13).

### Story 1.14: Serve the sample PDF for demo page links

As a reviewer,
I want demo page links to open the bundled sample PDF from the local backend,
So that I can check a citation against the source while offline.

**Depends on:** 1.3, 1.12 · **Requirements:** AR-14, AR-21

**Acceptance Criteria:**

**Given** `AI_MODE=demo`
**When** `GET /api/demo/sample.pdf` is called
**Then** it returns bytes identical to the sample processed by `POST /api/demo`, as `application/pdf` with `Content-Disposition: inline` (AR-14).

**Given** `AI_MODE=real`
**When** it is called
**Then** it returns `demo_not_enabled` (403).

**Given** the sample file is missing
**When** it is called
**Then** it returns `internal_error` (500) through the catch-all handler.

**Given** any query string or path variation
**When** it is called
**Then** no other file is reachable; a path that matches no route follows the AD-11 unknown-route rule (`not_found`, 404).

**Given** a method other than `GET` on the existing route `/api/demo/sample.pdf`, including `HEAD`
**When** it is called
**Then** it follows the AD-11 unsupported-method rule: `method_not_allowed` (405) with `Allow: GET`; a `HEAD` reply has headers only and no body, and CORS preflights are answered by the CORS middleware (AD-11).

**And** the endpoint takes no pass lock, counts no paid call and creates no provider client
**And** pytest covers each case above.

### Story 1.15: Demo start screen and "Vis eksempel"

As a reviewer,
I want a clearly labelled demo start screen and one button that shows the example,
So that I understand that I'm seeing prepared results, not an analysis of my own file.

**Depends on:** 1.5, 1.13 · **Requirements:** FR-5, FR-6, FR-7, UX-DR-9, UX-DR-10, UX-DR-17, UX-DR-18, UX-DR-19, UX-DR-20, UX-DR-32, UX-DR-33, UX-DR-2, AR-13, AR-21

**Acceptance Criteria:**

**Given** `/api/status` returns `mode: "demo"`
**When** S1 renders
**Then** it shows the DEMO banner `DEMO – du ser et ferdig eksempel. Ingen KI-tjeneste brukes, og egne filer kan ikke lastes opp.` (icon + text); the S1 demo text; `Last opp` disabled; the settings shown fixed (`Norsk bokmål`, `Standard`) with the fixed-settings note; and the `Vis eksempel` button
**And** there is no external-AI notice (UX-DR-9, UX-DR-17).

**Given** `Vis eksempel`
**When** it is pressed
**Then** `POST /api/demo` is sent once
**And** the button is `aria-disabled` and keeps focus, with repeat activation ignored
**And** `Henter eksempel …` is shown and announced through the status region
**And** the loading indicator is static under `prefers-reduced-motion` (UX-DR-18, UX-DR-19).

**Given** a success envelope
**When** it arrives
**Then** the results area shows the heading `Eksempelresultater (ikke generert nå)` and the Verification Notice `Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.`
**And** `Resultatene er klare` is announced, and focus is not moved (FR-5, FR-6).

**Given** an error envelope or a network failure
**When** it arrives
**Then** the error state shows the approved headline and action text for that code, with the `message` as a muted detail line, and focus moves to the headline: `internal_error` with `<reference_id>`; `generation_in_progress`; `Mistet kontakten med serveren`; `Noe gikk galt` for unknown codes, `demo_not_enabled` and `demo_mode_no_uploads`
**And** the success/failure decision uses the presence of `error_code`, never only the HTTP status (UX-DR-32, UX-DR-33).

**And** Vitest covers the banner, the single request, the aria-disabled guard, the announcement and the error headlines, plus a runtime shape check against `samples/demo-response.json` (AR-13, AR-21).

### Story 1.16: Results shell, notices and accessible tabs

As a reviewer,
I want the results area organised under clear notices and accessible tabs,
So that I can move between the four kinds of study material with mouse or keyboard.

**Depends on:** 1.15 · **Requirements:** FR-5, FR-6, UX-DR-10, UX-DR-11, UX-DR-13, UX-DR-21, UX-DR-22, UX-DR-35, UX-DR-36, UX-DR-2, AR-25, D-1, D-2, D-5

**Acceptance Criteria:**

**Given** demo S4
**When** the results area renders
**Then** the Verification Notice shows
**And** the skipped-pages notice uses the correct singular, two-item or 3+ wording from `skipped_pages`
**And** the upload bar is locked with the fixed settings as a `<dl>` (UX-DR-11, UX-DR-13, UX-DR-21).

**Given** the tabs
**When** they render
**Then** they follow the full APG pattern in the order **Sammendrag | Nøkkelbegreper | Flashkort | Quiz**, with Sammendrag selected and counts on Flashkort and Quiz
**And** Left/Right (automatic activation, wrapping), Home and End work
**And** the tab list is one Tab stop, and inactive panels stay mounted with `hidden`
**And** each panel has its `h3` with the tab name (UX-DR-22).

**Given** the panels whose content belongs to later stories (Nøkkelbegreper, Flashkort, Quiz)
**When** this story is complete
**Then** they exist as empty panels; this is an expected in-between state until Stories 1.18 to 1.20.

**And** D-1 (heading visibility), D-2 (lock-state text; the wording needs the developer's approval) and D-5 (the fixed-settings note in demo S4) are decided here
**And** Vitest covers the skipped-pages wording, tab keyboard behaviour and roving tabindex.

### Story 1.17: Summary rendering and PDF page links

As a reviewer,
I want the summary shown as readable plain text with working page links,
So that I can read the overview and check it against the sample PDF.

**Depends on:** 1.14, 1.16 · **Requirements:** FR-4, FR-5, AR-19, UX-DR-2, UX-DR-23, UX-DR-27, D-10

**Acceptance Criteria:**

**Given** the Sammendrag panel
**When** it renders
**Then** the text is plain, with line breaks preserved and no Markdown or HTML (AR-19, UX-DR-23).

**Given** the reusable page-link component
**When** it is built
**Then** it receives its PDF link source as an input and holds no hard-coded URL, so that real mode can supply its own source later (Story 2.7)
**And** in demo mode the source is `<NEXT_PUBLIC_API_BASE_URL>/api/demo/sample.pdf`.

**Given** Summary pages
**When** page links render through the reusable page-link component
**Then** each is `PDF-side N ↗`, with accessible name `PDF-side N, åpnes i ny fane`
**And** in demo mode it points to `<NEXT_PUBLIC_API_BASE_URL>/api/demo/sample.pdf#page=N` and opens in a new tab with `rel="noopener"`
**And** the separator ` · ` is `aria-hidden` and each target is ≥ 24px (UX-DR-27, FR-4).

**Given** a Summary with no pages
**When** it renders
**Then** no page links are shown.

**And** D-10 (the panel's visual treatment) reuses existing tokens
**And** Vitest covers plain-text rendering of a `<script>` string, the page-link markup, and that the link URL comes from the supplied source.

### Story 1.18: Nøkkelbegreper panel

As a student,
I want each key concept with its explanation and page links,
So that I can quickly see what matters in the lecture and where it comes from.

**Depends on:** 1.17 · **Requirements:** FR-4, FR-5, UX-DR-2, UX-DR-24, D-10

**Acceptance Criteria:**

**Given** the Nøkkelbegreper tab
**When** it is selected
**Then** each concept shows its term and explanation as plain text with line breaks preserved, followed by its page links (UX-DR-24)
**And** the panel has an `h3` with the tab name.

**And** Vitest covers the rendering and the page links
**And** the visual treatment reuses existing tokens (D-10).

### Story 1.19: Flashkort

As a student,
I want to practise one flashcard at a time and reveal the answer when I'm ready,
So that I can test myself.

**Depends on:** 1.17 · **Requirements:** FR-5, UX-DR-2, UX-DR-18, UX-DR-25

**Acceptance Criteria:**

**Given** the Flashkort tab
**When** it opens
**Then** it shows `Kort 1 av M` (a polite live region present from the start), the term, `Vis svar`, the hidden answer with its page links, and `Forrige` / `Neste` (UX-DR-25).

**Given** `Vis svar`
**When** it is pressed
**Then** the answer is revealed, the button becomes `Skjul svar`, and `aria-expanded` and `aria-controls` are correct.

**Given** the first or last card
**When** `Forrige` or `Neste` is unavailable
**Then** it is `aria-disabled`, keeps focus and ignores activation.

**Given** a tab switch
**When** the user returns
**Then** the current card and revealed answers are kept.

**And** Vitest covers the counter, toggling, the deck ends and kept state.

### Story 1.20: Quiz

As a student,
I want to see every quiz question and reveal each answer myself,
So that I can check my understanding (display-only, no scoring).

**Depends on:** 1.17 · **Requirements:** FR-5, UX-DR-2, UX-DR-26, UX-DR-40

**Acceptance Criteria:**

**Given** the Quiz tab
**When** it is selected
**Then** all questions show as an `<ol>`, each with an `h4` question, `Vis svar` / `Skjul svar`, the hidden answer and its page links (UX-DR-26).

**Given** any question
**When** its toggle is used
**Then** only that answer shows or hides
**And** revealed answers stay visible across tab switches.

**And** there is no "Vis alle svar", no typing, selecting, scoring or saving (UX-DR-40, PRD §6.2)
**And** Vitest covers the toggles, kept state and the absence of answer inputs.

### Story 1.21: Back to start, and demo acceptance

As a reviewer,
I want to return to the start, and to rely on the demo working fully offline,
So that I can repeat the walkthrough from the README with confidence.

**Depends on:** 1.18, 1.19, 1.20 · **Requirements:** AR-14, AR-21, AR-23, UX-DR-30, UX-DR-39, C-2, U-1

**Acceptance Criteria:**

**Given** demo S4
**When** `Tilbake til start` is pressed
**Then** demo S1 returns with no dialog and no leave warning
**And** revealed answers and the card position reset
**And** focus moves to `Vis eksempel` (UX-DR-30).

**Given** the completed demo
**When** the README quickstart is followed with the network off
**Then** Key Flow 2 works end to end, including the page links into the sample PDF (AR-14, AR-23).

**Given** the demo milestone
**When** the manual UI checklist (demo mode, network off) and accessibility tests T-1 to T-3 on the demo flow are run
**Then** the results are recorded in the test notes, and the findings are fixed or listed as unresolved (AR-21, UX-DR-39).

**And** the README still makes no real-run claim for the temporary fixture
**And** U-1 stays listed as open.

## Epic 2: Generate study material from my own lecture

The student uploads their own PDF or TXT, chooses output language, detail level and an optional course code, and gets real AI study material whose page links open their own PDF. Every problem gets a clear Norwegian message and the right next action, and spending is safeguarded (Key Flow 1).

**FRs:** FR-1, FR-2, FR-3; real-mode parts of FR-4, FR-5, FR-6 and FR-7. **Main requirements:** AR-5 to AR-8, AR-15 to AR-18, AR-21 to AR-23, AR-25; UX-DR-7, UX-DR-8, UX-DR-12 to UX-DR-19, UX-DR-21, UX-DR-27 to UX-DR-29, UX-DR-31 to UX-DR-35, UX-DR-39. Every story follows AR-20 and AR-22.

**Reused from Epic 1, not rebuilt:** stages 1 and 2 (including the page and character limits), stage 3 (including course-code sanitising and invalid-value fallback), the output gates, `run_pass` with the backend-wide lock (C-5), the error envelope, the status region, the results tabs and panels, and the page-link component.

**Development rule:** Stories 2.1 to 2.10 are built and tested with fake connectors and test-generated documents; they never depend on the temporary demo fixture (C-2) and never use a real key. The cost gate (Story 2.2) comes before the real connector (Story 2.3), so no paid call path exists without its safeguards. Real paid calls happen only in developer-approved manual sessions after the Developer Checklist Console items are done.

**UI and test rules:** as in Epic 1 — each UI story styles its components according to DESIGN.md → Components (UX-DR-2), and the focused Vitest tests are an approved story-level extension of the AD-20 layer-3 minimum, not a change to the architecture.

| Story | Title | Depends on |
|---|---|---|
| 2.1 | Upload route with the byte cap (`POST /api/generate`) | 1.11 |
| 2.2 | Cost gate: call cap, token ceiling, paid-call counter | 1.11 |
| 2.3 | Real Anthropic connector | 2.2 |
| 2.4 | Real-mode start screen: privacy notice and settings | 1.15 |
| 2.5 | Choose a file: file chip and browser pre-check | 2.4 |
| 2.6 | Generate and see my results | 1.20, 2.1, 2.5 |
| 2.7 | Page links to my own PDF | 2.6 |
| 2.8 | Problems with my file (S5: invalid, too big, too little content) | 2.6 |
| 2.9 | Service, limit and connection problems (S5: other groups) | 2.2, 2.3, 2.8 |
| 2.10 | Start over and protection against leaving (`Ny fil`) | 2.7 |
| 2.11 | Real-mode setup guide and real-mode acceptance | 2.3, 2.9, 2.10 |

### Story 2.1: Upload route with the byte cap (`POST /api/generate`)

As a student,
I want to send my own document with my settings to the app's server,
So that it can be checked and processed without being stored.

**Depends on:** 1.11 · **Requirements:** FR-1, FR-2, AR-4, AR-8, AR-12, AR-14, AR-15, AR-17, AR-18, NFR-1

**Acceptance Criteria:**

**Given** real mode
**When** `POST /api/generate` receives the multipart fields `file`, `course_code`, `detail_level` and `output_language`
**Then** empty strings count as unset, and the bytes are passed to `run_pass(…, source="upload")`; no route calls a connector directly (AR-4, AR-18).

**Given** an upload
**When** the api layer receives it
**Then** the **counted bytes of the file itself** decide the limit: a file of up to 10,485,760 bytes is accepted, and one byte more is rejected with `file_too_large` and `limit: "bytes"`, by counting the file bytes while reading in chunks and stopping once over the limit (AR-15)
**And** an optional early check of the request's declared length (`Content-Length`) is conservative: it allows a fixed multipart overhead (set in settings, e.g. 64 KiB), so a valid file is never rejected only because of the form fields and multipart framing
**And** both checks run in the api layer before the pass lock and before stage 1 (the lock is taken after the body is received, AR-17).

**Given** demo mode
**When** `POST /api/generate` is called
**Then** it returns `demo_mode_no_uploads` (403), checked **before** the pass lock (AR-14).

**Given** a missing `file` field or a malformed request
**When** it is received
**Then** it returns `invalid_request` (400) in the error envelope.

**Given** any request
**When** it ends, on success or failure
**Then** the upload was held only in memory, and any temporary file the framework created has been deleted (AR-8, NFR-1).

**And** until Story 2.3 the route is tested with fake connectors only
**And** pytest covers: a file of exactly 10,485,760 bytes with normal form fields (accepted); 10,485,761 bytes (rejected); a declared length just above 10 MB because of overhead only (not rejected); a declared length far above the limit (rejected early without reading the body); demo refusal before the lock; `invalid_request`; temp-file cleanup; and a busy lock → `generation_in_progress`.

### Story 2.2: Cost gate: call cap, token ceiling, paid-call counter

As the developer (paying for credits),
I want every paid AI call checked against spending safeguards before it is sent,
So that oversized prompts, loops and repeated clicks are limited, as one part of keeping within the USD 5–10 budget.

**Depends on:** 1.11 · **Requirements:** FR-7, AR-6, AR-7, AR-15, AR-16, AR-17, UX-DR-7, C-1

**Acceptance Criteria:**

**Given** real mode
**When** a pass reaches the cost gate between stage 3 and stage 4
**Then** the call cap is checked first, and once it is reached the pass stops with `session_call_limit_reached` (503) (AR-16).

**Given** the cap is not reached
**When** `count_input_tokens` plus the fixed safety margin exceeds 60,000
**Then** the pass stops with `file_too_large` and `limit: "tokens"`, and no paid call is made.

**Given** token counting fails
**When** the connector raises
**Then** the pass stops with `ai_unavailable`, and no paid call is made.

**Given** a pass passes the gate
**When** `generate` is about to be called
**Then** the `PassGuard` paid-call counter is incremented immediately before the call, whatever its outcome
**And** token counting is not counted (AR-17).

**And** demo mode skips the cost gate entirely
**And** the cap, ceiling and margin come from settings, and the cap's value is never sent to the frontend (UX-DR-7)
**And** the call cap, token ceiling and paid-call counter are described in code, docs and the README as **spending safeguards**, never as a guarantee that the budget cannot be exceeded; the hard limits outside the app are the external Anthropic Console spend limit and the prepaid credit with auto-reload off (Developer Checklist, AR-7, AR-16)
**And** no real paid call is made without the developer's explicit approval of that manual session (Developer Checklist)
**And** pytest with fakes covers the cap order, the ceiling, the counting failure, counter timing (incremented even when `generate` fails), and demo bypass.

### Story 2.3: Real Anthropic connector

As a student,
I want my document sent once to the approved AI model, with failures reported honestly,
So that I get real study material, or a clear reason why not.

**Depends on:** 2.2 · **Requirements:** FR-3, FR-7, NFR-3, NFR-4, AR-1, AR-4, AR-5, AR-6, AR-7, AR-10, AR-16, AR-26

**Acceptance Criteria:**

**Given** this story
**When** the dependency is added
**Then** the anthropic SDK is installed with `uv add` within 2.3.x, and the `uv.lock` change is shown for review in this story's Pull Request (Story 1.1).

**Given** `connectors.real`
**When** it implements the connector interface
**Then** it calls the cloud Anthropic Claude API (not a locally run model) using the settings for model `claude-haiku-5-5` — the lowest-cost practical paid tier chosen in AD-5 — with effort `low`, `max_tokens`, the 90 s timeout and `max_retries=0` (NFR-3, NFR-4)
**And** it requests structured output in the AD-9 schema and returns unparsed text plus `stop` and token counts
**And** it is the only module that imports the SDK (AR-4, AR-5, AR-6, AR-16).

**Given** provider failures
**When** they occur
**Then** a timeout, 5xx or token-count failure maps to `ai_unavailable`, a 429 to `ai_rate_limited`, and a credit or spend limit to `ai_credits_exhausted`
**And** no SDK exception leaves the connector
**And** the key, the full request and the raw provider error are never logged or returned (AR-7, AR-26).

**Given** the provider's stop reason
**When** it is mapped
**Then** it maps to `complete` / `length` / `refusal` / `other`, so that Gate 1 can reject incomplete output.

**And** there are **no automatic retries anywhere**
**And** demo mode creates no provider client (tested)
**And** pytest uses a mocked SDK transport, with no network and no key
**And** the first real paid call happens only in a developer-approved manual session, after the Developer Checklist Console items are done; it is not part of automated tests.

### Story 2.4: Real-mode start screen: privacy notice and settings

As a student,
I want to see what happens to my document and to choose my settings,
So that I can decide before anything is sent.

**Depends on:** 1.15 · **Requirements:** FR-2, AR-8, AR-18, UX-DR-2, UX-DR-7, UX-DR-8, UX-DR-17, UX-DR-18, UX-DR-36, D-6

**Acceptance Criteria:**

**Given** `mode: "real"`
**When** S1 renders
**Then** the external-AI notice shows, always visible, with the exact approved text (UX-DR-8, AR-8)
**And** the S1 real text shows `maks <max_upload_mb> MB`, computed as bytes ÷ 1,048,576, at most one decimal, with a Norwegian decimal comma, never hard-coded (UX-DR-7).

**Given** the privacy link `Les mer om hvordan Anthropic behandler data`
**When** it renders
**Then** it opens Anthropic's official privacy/data-handling page in a **new tab** (`target="_blank"`, `rel="noopener"`), so results in S4 are never lost and the leave warning is not triggered
**And** its visible text is unchanged; a decorative `↗` is optional and `aria-hidden`; and the hidden suffix gives the developer-approved accessible name `Les mer om hvordan Anthropic behandler data, åpnes i ny fane`
**And** no other new Norwegian text is introduced (D-6 decided, approved 2026-11-10).

**Given** the settings fields
**When** they render from `/api/status`
**Then** they show `Språk på resultatene` (`Norsk bokmål` default / `Engelsk`), `Detaljnivå` (`Kort` / `Standard` default / `Detaljert`) and `Emnekode (valgfritt)` (placeholder `f.eks. LOG201`, `maxlength="100"`, `autocomplete="off"`)
**And** each field has a visible `<label for>` (UX-DR-17).

**Given** no file is chosen
**When** S1 shows
**Then** `Generer` is `aria-disabled`, stays focusable, and its handler is guarded (UX-DR-18).

**And** Vitest covers the notice text, the privacy link's `target`/`rel` and accessible name, the limit formatting (10,485,760 → `10`), the options rendered from status, the defaults, and the aria-disabled guard.

### Story 2.5: Choose a file: file chip and browser pre-check

As a student,
I want to pick my lecture file and get immediate feedback if it can't work,
So that I don't wait for the server to tell me something obvious.

**Depends on:** 2.4 · **Requirements:** FR-1, AR-3, UX-DR-2, UX-DR-7, UX-DR-14, UX-DR-15, UX-DR-16, UX-DR-20, D-3

**Acceptance Criteria:**

**Given** `Last opp`
**When** it is pressed
**Then** a visually hidden `<input type="file">` opens with `accept` = `.pdf,.txt` plus the MIME types from `/api/status`, for one file only
**And** a new choice replaces the old one
**And** there is no drag-and-drop (UX-DR-14).

**Given** a chosen file
**When** the file chip renders
**Then** it shows the file name, type and **actual** size (binary convention, Norwegian decimal comma, e.g. `2,4 MB`) (UX-DR-15, UX-DR-7).

**Given** a wrong type or a file over `<max_upload_mb>`
**When** the pre-check runs
**Then** the inline message `Bare PDF- og TXT-filer støttes.` / `Filen er større enn <max_upload_mb> MB. Velg en mindre fil.` shows with an `id`
**And** `Last opp` and `Generer` point to it with `aria-describedby`
**And** it is announced through the status region
**And** the chip shows its problem variant with the problem stated in text
**And** `Generer` stays aria-disabled until the file is replaced (UX-DR-16).

**Given** a valid file
**When** it passes the pre-check
**Then** S2 shows and `Generer` becomes available.

**And** the pre-check is for convenience only; the backend still checks everything (AR-3)
**And** D-3 (whether a valid file choice is announced) is decided here
**And** Vitest covers type, size, the exact limit, replacing a file, and the announcements.

### Story 2.6: Generate and see my results

As a student,
I want one click to turn my lecture into study material,
So that I can start studying.

**Depends on:** 1.20, 2.1, 2.5 · **Requirements:** FR-3, FR-5, FR-6, AR-17, UX-DR-13, UX-DR-18, UX-DR-19, UX-DR-21, UX-DR-28

**Acceptance Criteria:**

**Given** S2
**When** `Generer` is pressed
**Then** one multipart `POST /api/generate` is sent with the file and settings
**And** `Generer` is aria-disabled and keeps focus, and repeat activation is ignored
**And** the upload bar locks to a `<dl>` with the file name and the settings used
**And** `Lager studiemateriell … Dette kan ta opptil to minutter.` shows and is announced (UX-DR-13, UX-DR-18, UX-DR-19).

**Given** the wait
**When** a client timeout is set
**Then** it is not shorter than the backend AI timeout + 30 s (AR-17).

**Given** a success envelope with `mode: "real"`
**When** it arrives
**Then** S4 shows the `h2` `Resultater`, the Verification Notice, the skipped-pages notice when relevant, and the Epic 1 tabs and panels
**And** `Resultatene er klare` is announced and focus is not moved (FR-5, FR-6, UX-DR-21).

**Given** the pass was requested with `output_language: "en"`
**When** results render
**Then** `lang="en"` is set only on elements that hold generated text, never on Norwegian labels, controls, page links, counters, notices or tab names (UX-DR-28).

**And** TXT results show no page links
**And** real-mode PDF results render no page links until Story 2.7 supplies the object-URL source (an expected in-between state); the demo PDF URL is never used in real mode
**And** Vitest with a mocked fetch covers the single request, locking, loading, success rendering, `lang` placement, and the absence of demo-URL links in real mode.

### Story 2.7: Page links to my own PDF

As a student,
I want each `PDF-side N` link to open my own PDF at that page,
So that I can check the material against my lecture.

**Depends on:** 2.6 · **Requirements:** FR-4, AR-8, UX-DR-27

**Acceptance Criteria:**

**Given** real S4 for a PDF
**When** page links render
**Then** they reuse the Epic 1 page-link component, with an object URL for the selected file supplied as its link source, giving `<object URL>#page=N`, opened in a new tab (UX-DR-27)
**And** real-mode links never point to the demo PDF (`/api/demo/sample.pdf`).

**Given** a results session
**When** the links are created
**Then** one object URL is created per results session, the file is kept only in browser memory, and nothing is uploaded again or stored (AR-8).

**Given** a new pass, or `Ny fil` → `Fortsett` (Story 2.10)
**When** the results session ends
**Then** the object URL is revoked.

**And** if a browser ignores `#page=N`, the PDF still opens and the visible label stays
**And** TXT results have no links
**And** Vitest covers the URL format, create-once behaviour and revocation, and verifies that no real-mode link uses the demo PDF URL.

### Story 2.8: Problems with my file (S5: invalid, too big, too little content)

As a student,
I want to know exactly what is wrong with my file and what to do,
So that I can fix it and try again.

**Depends on:** 2.6 · **Requirements:** FR-1, FR-7, UX-DR-7, UX-DR-15, UX-DR-32, UX-DR-33, UX-DR-34, D-4

**Acceptance Criteria:**

**Given** `unsupported_file_type`, `bad_text_encoding`, `unreadable_file`, `no_extractable_text`, `file_too_large` or `insufficient_content`
**When** the error arrives
**Then** the error state shows the exact approved headline and action text, with the `message` as a muted detail line
**And** focus moves to the headline (UX-DR-32, UX-DR-33).

**Given** `file_too_large`
**When** it is shown
**Then** the text follows `limit`: `bytes` → `Filen er større enn <max_upload_mb> MB.`; `pages` → `PDF-en har mer enn <max_pdf_pages> sider.`; `characters` and `tokens` → `Dokumentet inneholder for mye tekst.` with no number shown
**And** each is followed by `Prøv med én forelesning om gangen.`

**Given** these groups (Invalid file, Too big, Too little content)
**When** S5 shows
**Then** the file and settings are kept, the chip shows its problem variant, the upload bar is unlocked, and `Generer` stays aria-disabled until the file is replaced (UX-DR-34).

**Given** S5
**When** a new file is chosen
**Then** the error clears and S2 shows, with the pre-check run again.

**And** D-4 (changing only a setting after an error) is decided here
**And** Vitest covers every code's text, all four `limit` variants, the problem chip, and the S5 → S2 exit.

### Story 2.9: Service, limit and connection problems (S5: other groups)

As a student,
I want clear guidance when the AI service, the spending limit or the connection fails,
So that I know whether to wait, retry or reload.

**Depends on:** 2.2, 2.3, 2.8 · **Requirements:** FR-7, AR-16, UX-DR-32, UX-DR-33, UX-DR-34

**Acceptance Criteria:**

**Given** the Temporary group (`ai_unavailable`, `ai_rate_limited`, `ai_output_invalid`, `generation_in_progress`, `internal_error` with `<reference_id>`, or a network failure during generation → `Mistet kontakten med serveren`)
**When** it is shown
**Then** the exact approved texts appear and `Generer` is **available** (UX-DR-33, UX-DR-34).

**Given** the Hard-stop group (`ai_credits_exhausted`, `session_call_limit_reached`)
**When** it is shown
**Then** the exact approved texts appear, with no cap number shown, and `Generer` is aria-disabled until the page is reloaded.

**Given** the Reload-required group (`invalid_request`, unknown codes)
**When** it is shown
**Then** the exact approved texts appear and `Generer` is aria-disabled.

**And** the file and settings are kept
**And** no automatic retries happen anywhere: not in the frontend, the backend or the SDK (`max_retries=0`) (AR-16)
**And** a **user-triggered** retry (pressing an available `Generer` again) starts a new pass, which **may make another paid API call** and counts toward the call cap
**And** the finalized interface texts are used unchanged: they say when to wait or retry, and neither claim nor imply that a retry is free or costs money (EXPERIENCE.md → Voice and Tone)
**And** the README's real-mode section (Story 2.11) states that each user-triggered retry may make a new paid call
**And** Vitest covers every code's text and `Generer` availability per group.

### Story 2.10: Start over and protection against leaving (`Ny fil`)

As a student,
I want to start over on purpose, and be warned before I lose results by accident,
So that I don't lose my study material by mistake.

**Depends on:** 2.7 · **Requirements:** AR-8, UX-DR-2, UX-DR-12, UX-DR-29, UX-DR-31, UX-DR-35

**Acceptance Criteria:**

**Given** real S4
**When** it shows
**Then** the not-saved note `Resultatene lagres ikke. De forsvinner hvis du lukker eller laster inn siden på nytt.` and `Ny fil` are shown
**And** the browser's leave/reload warning is on (UX-DR-12, UX-DR-31).

**Given** `Ny fil`
**When** it is pressed
**Then** a native `<dialog>` opens with `showModal()`, labelled by `Resultatene blir ikke lagret og vil forsvinne. Vil du fortsette?`, with initial focus on `Avbryt` (UX-DR-29).

**Given** `Avbryt` or `Esc`
**When** it is used
**Then** everything is kept and focus returns to `Ny fil`.

**Given** `Fortsett`
**When** it is used
**Then** the leave warning is removed first
**And** results, revealed answers and the in-memory PDF are cleared, and the object URL is revoked
**And** S1 returns with the default settings
**And** focus moves to `Last opp`.

**And** the leave warning is off in every other state and in demo mode
**And** Vitest covers the dialog focus rules, `Esc`, clearing, and registering and removing the warning.

### Story 2.11: Real-mode setup guide and real-mode acceptance

As a reviewer with my own key, and as the developer,
I want clear real-mode setup instructions and a verified real flow,
So that real generation is proven to work safely and honestly.

**Depends on:** 2.3, 2.9, 2.10 · **Requirements:** NFR-7, NFR-11, AR-8, AR-16, AR-20, AR-21, AR-23, UX-DR-39, C-2, D-11, D-12

**Acceptance Criteria:**

**Given** the README
**When** this story is done
**Then** it has an optional real-mode section covering: the reviewer's own key in `backend/.env` (never committed); `AI_MODE=real`; the cost controls, described as spending safeguards, not budget guarantees; that each user-triggered retry may make a new paid API call; and the privacy statement (Anthropic's default 30-day deletion and no-training default, **with exceptions**, citing the policy page and the date it was checked; never a promise of unconditional deletion) (AR-8, AR-16, AR-23).

**Given** the Developer Checklist items are done (Console workspace, spend limit, prepaid credits with auto-reload off, permission basis for each test document)
**When** the developer explicitly approves a manual real-AI session
**Then** Key Flow 1 runs on a permitted test PDF and a TXT file
**And** at least one Norwegian document runs with both output languages
**And** the citation-quality table and cost log are recorded (AR-21 layer 4, NFR-7, NFR-11).

**Given** the real-mode milestone
**When** the manual UI checklist and T-1 to T-3 for Key Flow 1 are run
**Then** the findings are recorded in the test notes, and fixed or listed as unresolved (UX-DR-39).

**And** prompt wording changes found in the session (D-11) are made only with the developer's review
**And** observations about the limits and call cap are recorded for D-12, with any change needing approval
**And** the README still makes no real-run claim for the demo while the temporary fixture remains (C-2).

## Epic 3: Submission-ready, with a genuine demo and verified quality

The reviewer sees demo results recorded from an approved real AI run (replacing the temporary fixture), and the project has a final README and recorded end-to-end verification (SM-1, citation-quality table, T-1 to T-3) ready for submission. Requires U-1 to be resolved before submission.

**FRs:** none new; final verification of FR-1 to FR-7 against SM-1, SM-2 and SM-3. **Main requirements:** C-2, C-3, U-1, U-2, AR-7, AR-8, AR-13, AR-14, AR-16, AR-19 to AR-23, NFR-6, NFR-7, NFR-11 to NFR-14, UX-DR-39, D-12.

**Epic 3 rules (approved 2026-11-10):**

- Epic 3 verifies and finalises the tests and functionality from Epics 1 and 2; it does not rebuild them. Gaps or defects found are fixed in small linked fix branches, or listed as unresolved.
- U-1 is checked **before** the first paid recording (Story 3.2) and is checked again as a final submission gate in Story 3.10.
- Every paid AI attempt needs the developer's explicit approval beforehand. There are no automatic retries.
- Genuine AI output is never hand-edited.
- Evidence files live in `docs/testing/` (`test-notes.md`, `citation-quality.md`, `cost-log.md`), under the privacy and source-permission rules (AR-19): content excerpts only for documents that may be committed; for documents that were only sent to the AI, only document IDs, page numbers and judgements.
- The developer writes the reflection report personally. Claude Code may only help organise evidence or prepare a structure, with the developer's approval and in accordance with the course's AI-use rules. The report's details stay unresolved until the lecturer's instructions are checked (U-2).
- Every commit, push and merge needs the developer's explicit approval (AR-22).

| Story | Title | Depends on |
|---|---|---|
| 3.1 | Build and test the fixture-recording script | 1.13, 2.11 |
| 3.2 | Record and review the final demo fixture | 3.1 |
| 3.3 | Regenerate the demo envelope and prove the demo is offline and keyless | 3.2 |
| 3.4 | Final automated verification and test traceability | 3.3 |
| 3.5 | Final real-mode quality session: citations, languages and cost log | 3.4 |
| 3.6 | Final manual UI and accessibility verification | 3.4 |
| 3.7 | Final privacy, security and spending-safeguard verification | 3.4 |
| 3.8 | Final README and implementation explanation | 3.5, 3.6, 3.7 |
| 3.9 | Evidence index and reflection report preparation | 3.8 |
| 3.10 | Final submission check: U-1, repository, push and lecturer access | 3.9 |

Non-story prerequisites (Developer Checklist): Story 3.2 also needs the U-1 check, the Console items and the developer's approval of each paid attempt; Story 3.5 needs the permission basis for each test document and the developer's approval of the session.

### Story 3.1: Build and test the fixture-recording script

As the developer,
I want a safe, tested recording script ready before any money is spent,
So that the paid recording follows the approved pipeline exactly and cannot run or overwrite the fixture by accident.

**Depends on:** 1.13, 2.11 · **Requirements:** C-2, AR-4, AR-13, AR-14, AR-16, AR-22, AR-26

**Acceptance Criteria:**

**Given** the developer-run recording script in `backend/`
**When** it is built
**Then** it reuses the approved pipeline (stages 1–3, the cost gate, the connector interface and Gates 1–3) on the sample with the demo inputs (`standard`, `nb`), without duplicating pipeline logic (AR-4)
**And** it has **no public endpoint**, is not imported by the app, and **never runs in CI** (AR-22).

**Given** the script is started
**When** it is about to make a paid call
**Then** it asks for the developer's explicit approval for **that** attempt; declining makes no call
**And** it makes at most one call per approved attempt and never retries on its own (AR-16).

**Given** output that passes Gates 1–3 against the sample's real markers
**When** it is written
**Then** it is written only as a **candidate** to a Git-ignored location (the ignore rule is added in this story)
**And** the script never writes `samples/demo-ai-output.json` directly; promoting an approved candidate to that path is a separate, explicitly confirmed action, never automatic
**And** output that fails a gate is not written.

**And** the script logs no document text, AI output or key (AR-26)
**And** pytest uses fake connectors only, with no key and **no paid calls**, and covers: approval declined → no connector call; approval given → exactly one call; a gate failure → nothing written; success → a candidate only in the ignored location, with `samples/demo-ai-output.json` unchanged; promotion only after explicit confirmation.

### Story 3.2: Record and review the final demo fixture

As a reviewer,
I want the demo to show genuine AI output for the sample lecture, recorded once and documented honestly,
So that the example results represent what the app really produces.

**Depends on:** 3.1 · **Requirements:** C-2, C-3, U-1, AR-13, AR-14, AR-16, AR-19

**Acceptance Criteria:**

**Given** U-1 has not yet been checked
**When** this story is about to start (before the first paid recording)
**Then** the developer checks the course's AI-use rules first and records the result
**And** if the rules require changes to the sample PDF, the sample is updated first under the Story 1.12 rules (and the temporary fixture re-drafted if needed) before any recording (U-1 remains a final gate in Story 3.10).

**Given** the tested recording script from Story 3.1
**When** it is used
**Then** it runs the approved pipeline (stages 1–3, the cost gate, the real connector and Gates 1–3) on the sample with the demo inputs (`standard`, `nb`)
**And** the developer gives explicit approval before **every** paid recording attempt, and there are no automatic retries.

**Given** an approved recording attempt
**When** the output passes Gates 1–3 against the sample's real markers
**Then** it is written only as a **candidate** to a Git-ignored location
**And** `samples/demo-ai-output.json` is not replaced; the demo keeps using the temporary fixture, with its TEMPORARY marker, until the developer explicitly approves the review
**And** output that fails a gate is not written, and another attempt needs a new approval.

**Given** a candidate
**When** the developer reviews it manually
**Then** content accuracy, Norwegian language quality and, for each item, whether the cited page supports it (supports / partly / doesn't) are checked and recorded.

**Given** the review result
**When** it is decided
**Then** the candidate content is **never hand-edited**
**And** a candidate with serious inaccuracies or any unsupported citation ("doesn't") cannot be accepted as final merely because its problems are documented; it stays unapproved until a new authorised recording or another resolution that the developer explicitly reviews
**And** minor issues (for example a "partly" rating) may be accepted only with the developer's explicit approval and are recorded in the provenance note.

**Given** an approved candidate
**When** it replaces the temporary fixture
**Then** the provenance note records the source document (file name and SHA-256), model ID (`claude-haiku-5-5`), effort, date, output settings (`standard`, `nb`), token counts, the reviewer and the review result
**And** the TEMPORARY marker is removed only now (C-2, AR-13).

**And** evidence: the provenance note, the sample section of `docs/testing/citation-quality.md`, and a line in `docs/testing/cost-log.md` for every paid attempt.

### Story 3.3: Regenerate the demo envelope and prove the demo is offline and keyless

As a reviewer,
I want everything that depends on the fixture to match the final version, with the demo still needing no key or network,
So that the README quickstart works exactly as promised.

**Depends on:** 3.2 · **Requirements:** AR-13, AR-14, AR-21

**Acceptance Criteria:**

**Given** the approved final fixture
**When** the existing backend test regenerates `samples/demo-response.json`
**Then** it is asserted, and the existing frontend contract test with its runtime shape check passes (AR-13).

**Given** `AI_MODE=demo` and no key in `backend/.env`
**When** the existing tests run
**Then** they confirm that no provider client is created, and that `GET /api/demo/sample.pdf` returns bytes identical to the sample processed by the demo pass (AR-14).

**Given** the network is off
**When** the README demo quickstart is followed in a browser
**Then** Key Flow 2 works end to end, including the page links
**And** the browser's developer tools show only requests to localhost (no fonts, CDN or external calls).

**And** evidence: green CI on the story's Pull Request, and the network-off check recorded in `docs/testing/test-notes.md`.

### Story 3.4: Final automated verification and test traceability

As the developer,
I want to show that the existing automated tests together cover every requirement and error code,
So that SM-1 is backed by traceable automated evidence.

**Depends on:** 3.3 · **Requirements:** NFR-11, NFR-13, AR-21, AR-22, C-6

**Acceptance Criteria:**

**Given** `main` with Epics 1 and 2 merged and Stories 3.1–3.3 done
**When** the full pytest and Vitest suites run locally and in CI
**Then** they pass with no real key.

**Given** the existing tests
**When** a traceability table is written in `docs/testing/test-notes.md`
**Then** it maps FR-1 to FR-7, every AD-11 error code, the gates (including the "page-marker validation, not semantic verification" limit test), the Norwegian-character tests and the fixture contract tests to the tests that cover them, using this document's traceability IDs (AR-21 layers 1–3, C-6).

**Given** a gap found in the table
**When** it is confirmed
**Then** a missing test is added in this story, or a defect is fixed in a small linked fix branch, or it is listed as unresolved; nothing is rebuilt.

**And** evidence: the traceability table and the CI run link.

### Story 3.5: Final real-mode quality session: citations, languages and cost log

As the developer,
I want manual evidence of the quality of real AI output,
So that citation quality and language handling are judged honestly, not assumed.

**Depends on:** 3.4 · **Requirements:** NFR-6, NFR-7, NFR-11, NFR-15, AR-16, AR-19, AR-20, AR-21

**Acceptance Criteria:**

**Given** 3–5 permitted test PDFs (own or openly licensed; course PDFs only with confirmed permission, never committed) and the developer's explicit approval of the session
**When** each runs in real mode
**Then** `docs/testing/citation-quality.md` records about 5 items per PDF as supports / partly / doesn't, with page numbers
**And** content excerpts appear only for documents that may be committed (AR-19, AR-21 layer 4).

**Given** at least one Norwegian document
**When** it runs with both `nb` and `en` output
**Then** the terminology rule (the original term in brackets on first use) and the page references are checked by hand and recorded (NFR-7, NFR-11).

**Given** at least one permitted **English-language** source document
**When** it runs in real mode
**Then** its output and, where the document is a PDF, its page references are checked by hand and recorded, so that both in-scope source languages are verified (NFR-15).

**Given** one TXT document
**When** it runs
**Then** the results have no page references.

**Given** every paid call in the session
**When** it completes
**Then** `docs/testing/cost-log.md` records the date, document ID, source and permission basis, inputs, token counts, estimated cost and outcome.

**And** citation quality is reported as a manual judgement, never as automated verification (NFR-6)
**And** no paid call is made without the developer's explicit approval, and there are no automatic retries.

### Story 3.6: Final manual UI and accessibility verification

As a student or reviewer,
I want the finished interface confirmed to work as designed in both modes, including with keyboard and screen reader,
So that the app is usable by everyone it is meant for.

**Depends on:** 3.4 · **Requirements:** AR-21, UX-DR-35 to UX-DR-39

**Acceptance Criteria:**

**Given** both modes
**When** the manual UI checklist runs
**Then** every state is checked: S0, S0x, S1, S2, S3, S4, every S5 group, `Ny fil`, `Tilbake til start` and the leave warning (AR-21 layer 5).

**Given** the final build
**When** T-1 (keyboard and reflow), T-2 (Lighthouse) and T-3 (screen reader) run on Key Flows 1 and 2
**Then** the results are recorded, and the findings are fixed in linked fix branches or listed as unresolved (UX-DR-39).

**And** documentation says "designed and tested against WCAG 2.2 AA", never "compliant" as a blanket claim
**And** evidence: the UI and accessibility sections of `docs/testing/test-notes.md`.

### Story 3.7: Final privacy, security and spending-safeguard verification

As the developer and as a student,
I want to confirm that no data is stored, no secrets leak and the spending safeguards work,
So that the privacy and cost promises in the documentation are true.

**Depends on:** 3.4 · **Requirements:** NFR-1, AR-7, AR-8, AR-16, AR-19, AR-26

**Acceptance Criteria:**

**Given** the privacy and security checks
**When** they run
**Then** the logs contain no document text, AI output or key
**And** no upload or result files remain after a run
**And** `backend/.env` is ignored by Git and absent from the history
**And** no key appears in the frontend or in any `NEXT_PUBLIC_*` value
**And** the real-mode external-AI notice is shown (AR-7, AR-8, AR-26).

**Given** the spending-safeguard checks, all **free**
**When** they run
**Then** a call cap of 0 gives `session_call_limit_reached` with no paid call
**And** a low token ceiling gives `file_too_large` with `limit: "tokens"` (token counting is free)
**And** oversize, unsupported and no-text files are rejected before any AI call
**And** no automatic retry is observed (AR-16).

**And** the safeguards are described as spending safeguards, not budget guarantees; the Anthropic Console spend limit and the prepaid credit with auto-reload off remain the outside hard limits
**And** evidence: the privacy, security and safeguard sections of `docs/testing/test-notes.md`.

### Story 3.8: Final README and implementation explanation

As a reviewer,
I want a final README and a clear explanation of how the implementation follows the architecture,
So that I can run, understand and judge the project from its documentation.

**Depends on:** 3.5, 3.6, 3.7 · **Requirements:** NFR-12, AR-8, AR-16, AR-23, C-2

**Acceptance Criteria:**

**Given** the README
**When** it is finalised
**Then** it contains the no-key demo quickstart and the optional real-mode setup; the privacy statement (Anthropic's default 30-day deletion and no-training default **with exceptions**, the policy page and the check date); the cost controls described as spending safeguards, and that a user-triggered retry may make a new paid call; and the known limitations (no OCR; tables and figures may be unreadable; the strict PDF signature rule; page-marker validation is not semantic verification; one file at a time; the Quiz is display-only) (AR-23)
**And** it says that the demo results come from a real AI run only now, after Stories 3.2 and 3.3 (C-2).

**Given** the implementation explanation
**When** it is written as a new file, `docs/IMPLEMENTATION-NOTES.md`
**Then** it explains the main implementation decisions and how they follow AD-1 to AD-22, linking to the architecture spine and REVIEWER-EXPLAINER, so that the developer can explain them (SM-2, NFR-12)
**And** the architecture spine and REVIEWER-EXPLAINER are **not** changed.

**And** evidence: the README and `docs/IMPLEMENTATION-NOTES.md`, reviewed by the developer.

### Story 3.9: Evidence index and reflection report preparation

As the developer,
I want all the evidence for my reflection report collected and easy to find,
So that I can write the report myself, accurately and on time.

**Depends on:** 3.8 · **Requirements:** NFR-12, NFR-13, U-2

**Acceptance Criteria:**

**Given** the lecturer's instructions for the reflection report
**When** they are checked
**Then** the exact format, length, deadline, submission channel and any additional requirements are recorded in `issues.md`
**And** until they are confirmed, they stay listed as unresolved (U-2) and nothing is assumed about them.

**Given** the project's evidence
**When** an evidence index is written in `docs/testing/test-notes.md`
**Then** it links each report theme to its evidence:
- **Development process:** the BMAD planning artifacts (brief → PRD → architecture → UX → epics), the Git history, every story Pull Request and its review, and the CI runs
- **Use of AI:** the `.logs/` session logs and `issues.md`; the private transcript backup is referred to by its existence and location only, and its content is never copied or committed
- **Technical decisions:** the decision logs (`.memlog.md`), REVIEWER-EXPLAINER and `docs/IMPLEMENTATION-NOTES.md`
- **Testing and quality:** the traceability table, citation-quality table, cost log, manual checklist and T-1 to T-3 results
- **Challenges and learning:** resolved and open items in `issues.md`, corrections made during planning, and findings fixed in fix branches

**And** SM-1, SM-2 and SM-3 are each mapped to their evidence.

**Given** the reflection report
**When** this story is done
**Then** the report has **not** been written by Claude Code: the developer writes it personally
**And** Claude Code may only help organise the evidence or prepare a structure derived from the confirmed instructions, with the developer's approval and in accordance with the course's AI-use rules
**And** any AI help is disclosed as those rules require.

**And** evidence: the evidence index, and the recorded report requirements (or their unresolved status) in `issues.md`.

### Story 3.10: Final submission check: U-1, repository, push and lecturer access

As the developer,
I want the final approved project on GitHub, complete, clean and reachable by the lecturer,
So that the submission is ready and honest.

**Depends on:** 3.9 · **Requirements:** NFR-2, NFR-8, NFR-9, NFR-10, NFR-13, NFR-14, AR-19, AR-20, AR-22, C-4, U-1, U-2

**Acceptance Criteria:**

**Given** U-1
**When** it is checked again as the final gate
**Then** the result and its source are recorded in the sample's provenance note and in `issues.md`
**And** submission acceptance is **blocked** until the sample PDF is confirmed acceptable, or replaced and re-recorded under Stories 3.2–3.3.

**Given** the repository
**When** a final hygiene check runs
**Then** there are no secrets, `.env` files, course PDFs, raw AI transcripts, or AI responses about non-public material
**And** samples have their provenance
**And** the decision about the `.claude/` and `_bmad/` folders is recorded (AR-19, AR-20).

**Given** the final state
**When** it is verified
**Then** every approved story branch has been merged into `main` through its Pull Request, after self-review (tests green, checklist, BMAD code review) (NFR-9, AR-22)
**And** the local `main` matches `origin/main`, with no uncommitted tracked changes
**And** CI is green on the final `main` commit, whose hash is recorded
**And** the final code, README, `docs/`, `samples/`, planning artifacts and `.logs/` are present on GitHub
**And** every commit, push and merge in this story was made only with the developer's explicit approval (AR-22).

**Given** the GitHub repository `IBE160-2026/G42-eide`
**When** access is checked
**Then** the developer confirms on the GitHub website (repository and organisation access, and the repository's visibility) that the lecturer can open it, and records the date of the check
**And** if access cannot be confirmed there, the developer asks the lecturer to confirm.

**Given** the reflection report
**When** submission is checked
**Then** it is checked on GitHub **only if** its confirmed submission instructions say it is submitted through the repository; otherwise its submission is recorded separately in `issues.md` once the instructions are known (U-2).

**Given** the Developer Checklist, D-12 and `issues.md`
**When** they are reviewed
**Then** every item is either done, or listed as an open item with its reason (process and setup are covered by acceptance criteria and the checklist, C-4)
**And** the MVP exclusions and deferred items (D-14 Gemini, D-15 Phase 2 quiz, PRD §6.2 Out of Scope) are listed as future work, not built
**And** the app has no accounts, login or saved history (NFR-2).

**And** evidence: the final `main` hash, the CI link, the access-check date and the hygiene result, recorded in `docs/testing/test-notes.md` and the final session log.
