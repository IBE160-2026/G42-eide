# Epic 1 Context: Run the app and explore a complete example

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A reviewer or the student can start AI Study Buddy from the README with no API key and no internet connection, run the demo on a bundled original Norwegian (Bokmål) sample lecture, and use clearly labelled example results (Sammendrag, Nøkkelbegreper, Flashkort, Quiz) with working `PDF-side N` links into the sample PDF. The epic builds the project skeleton, the shared six-stage backend pipeline (reused by real mode in Epic 2), the sample PDF and a clearly marked TEMPORARY demo fixture. It is complete only with the approved sample PDF and a working offline demo.

## Stories

- Story 1.1: Set up the project from the approved starters
- Story 1.2: Backend settings and the status endpoint
- Story 1.3: One error format for every failure
- Story 1.4: Page shell and visual foundation
- Story 1.5: Startup check (`Starter …` / server not reachable)
- Story 1.6: Check a document's bytes (stage 1)
- Story 1.7: Extract text with real page markers (stage 2)
- Story 1.8: Build the source-constrained prompt (stage 3)
- Story 1.9: Connector interface, AI output models and test fakes
- Story 1.10: Validate AI output with three gates (stage 5)
- Story 1.11: Run a complete pass, one at a time (`run_pass`, stage 6)
- Story 1.12: Add the original Norwegian sample lecture PDF
- Story 1.13: Temporary fixture, demo connector and `POST /api/demo`
- Story 1.14: Serve the sample PDF for demo page links
- Story 1.15: Demo start screen and "Vis eksempel"
- Story 1.16: Results shell, notices and accessible tabs
- Story 1.17: Summary rendering and PDF page links
- Story 1.18: Nøkkelbegreper panel
- Story 1.19: Flashkort
- Story 1.20: Quiz
- Story 1.21: Back to start, and demo acceptance

## Requirements & Constraints

- Demo runs fully offline: no key, no provider client, no external network, fonts or CDNs at runtime.
- A pass always produces all four Result types; ≥ 5 flashcards, quiz items and key concepts; the model must never pad. Too-thin content → `insufficient_content`.
- Page references: only real PDF page markers supplied for that pass; never fabricated; none for plain text. Automated checks are "page-marker validation" only — never describe them as citation or content verification; semantic support is checked manually.
- Files are identified by content (strict `%PDF-` at byte 0; ordered text rules for UTF-8), and the extension must match (`.pdf`/`.txt`, case-insensitive); extension alone never suffices. Empty/no-text documents stop before any AI call.
- Limits (provisional, from settings): 10,485,760 bytes, 80 PDF pages, 200,000 extracted characters (counted before markers). Exceeding → `file_too_large` with `limit`.
- Zero persistence: documents and results only in memory for one request. Logs hold only stage, code, duration, token counts, `reference_id` — never content or secrets.
- All AI/document/backend text rendered as plain text (no `dangerouslySetInnerHTML`, no Markdown).
- Every story ships its own tests (pytest; focused Vitest — an approved story-level extension of the minimum frontend layer). Tests never use a real key and use only test-generated files, never downloaded ones.
- Repository hygiene: no secrets, `.env` or non-public documents committed; one short-lived branch + Pull Request per story; every commit, push and merge needs the developer's explicit approval. Do not touch `.claude/` or `_bmad/`.
- Temporary fixture rules: drafted only from the sample's real content and page markers, reviewed by the developer, provenance note marks it unmistakably **TEMPORARY**; README must not claim demo results come from a real AI run. U-1 (course AI-use rules for the sample) stays listed as open.
- Out of scope: drag-and-drop, quiz scoring/typing, "Vis alle svar", dark mode, saving/exporting, Anthropic SDK (added in Epic 2), cost gate and paid-call counter (Epic 2).

## Technical Decisions

- **Stack:** Next.js 16.4.x (create-next-app, TypeScript, App Router; system font stack instead of `next/font/google`, agent-feedback off, `NEXT_TELEMETRY_DISABLED=1`), React 19, Vitest 5.0.x + Testing Library; FastAPI on Python 3.13 via uv, Pydantic 2.14, pydantic-settings, python-multipart, pypdf, pytest. Versions fixed by committed `uv.lock`/`package-lock.json`; CI runs pytest + Vitest with the same versions and no key.
- **Layout:** `frontend/`, `backend/app/{api,pipeline,connectors,contracts,config.py}`, `backend/tests/`, `samples/`, `.github/workflows/`.
- **Topology:** backend binds `127.0.0.1:8000`; CORS allows exactly `http://localhost:3000`; frontend calls `NEXT_PUBLIC_API_BASE_URL`; no Next.js proxy. Backend is the single authority; frontend is thin.
- **Config:** one settings module; `AI_MODE=real|demo`, default `demo`; `real` without a key refuses to start (never falls back). No literals in stages.
- **Pipeline:** `run_pass(doc, filename, inputs, source)` runs 1 validate bytes → 2 extract with `<page number="N">…</page>` markers (1-based; text-less pages → `skipped_pages`; marker-like strings neutralised) → 3 build prompt → 4 connector → 5 three gates → 6 respond. `pipeline` never imports a concrete connector or SDK; `contracts` imports nothing from the app.
- **Connector:** `ConnectorRequest{system, document_block, inputs}`, `ConnectorReply{raw_json, stop, input_tokens, output_tokens}`, `ConnectorError{code}`; methods `count_input_tokens`, `generate`. Implementations here: demo + test fakes.
- **AI output (AD-9):** `{status: ok|insufficient_content, summary{text,pages}, flashcards[{front,back,pages}], quiz[{question,answer,pages}], key_concepts[{term,explanation,pages}]}`. Stage 5 gates: stop complete → shape/status → counts and page filtering; output is a new `ValidatedResults` with sorted, de-duplicated `pages`.
- **Prompt inputs:** `detail_level` (`brief|standard|detailed`, default `standard`), `output_language` (`nb|en`, default `nb`); invalid → default + log line; `course_code` stripped of control chars, cut to 100, inside a delimited data block. Exact wording (D-11) recorded in code for developer review.
- **Contract:** success `{mode, results, skipped_pages}`; every non-2xx body `{error_code, message, limit?, reference_id?}`, catch-all inside CORS; closed code list in `contracts/` with fixed HTTP mapping (400/403/409/413/422/429/500/502/503); `internal_error` carries an 8-char lowercase hex `reference_id` also on the log line; backend `message` in Norwegian Bokmål. Frontend decides success by presence of `error_code`, never status alone. TS types mirror Pydantic by hand in identical `snake_case`.
- **Open decision G-1:** the HTTP status for unknown routes / unsupported methods is unresolved and must be decided before Story 1.3. Only the envelope requirement is fixed.
- **Endpoints:** `GET /api/status` (mode, limits, options with defaults, accepted types); `POST /api/demo` (no body; fixed inputs `standard`, `nb`; stages 1, 2, 3, 5 run for real; real mode → `demo_not_enabled` 403); `GET /api/demo/sample.pdf` (demo only, fixed file, `application/pdf`, `Content-Disposition: inline`, bytes identical to the processed sample, no lock).
- **Pass lock:** one backend-wide, non-blocking `PassGuard`, released in `finally`, shared by demo and generate; busy → `generation_in_progress` (409).
- **Fixtures:** `samples/demo-ai-output.json` (raw AD-9, read by the demo connector) and `samples/demo-response.json` (exact success envelope, regenerated and asserted by a backend test, shape-checked in frontend tests).
- **Sample PDF:** original Norwegian logistics/inventory lecture, 5–8 pages, exactly one image-only page; provenance note (authorship, licence, AI assistance, U-1 open).

## UX & Interaction Patterns

- Interface text is Norwegian Bokmål exactly as approved in EXPERIENCE.md; "KI" not "AI" in UI text. Light mode only, flat surfaces, DESIGN.md tokens as CSS custom properties, minimum sizes (controls ≥ 44px, targets ≥ 24px), content max 960px, global 3px focus ring with 2px offset, inline SVG icons (`aria-hidden`, `focusable="false"`).
- Shell: `<html lang="nb">`, `<title>AI Study Buddy</title>`, header `h1`, regions `Opplasting og innstillinger` and `Resultater`; nothing sticky; one visually hidden polite status region present from first render (clear-then-set helper; errors never announced through it).
- Startup: `Starter …` while status loads; on failure `Får ikke kontakt med appens server` / `Sjekk at serveren er startet, og trykk «Prøv igjen».` with `Prøv igjen`.
- Unavailable controls (Generer, Vis eksempel, Prøv igjen, Forrige, Neste) use `aria-disabled="true"`, stay focusable, and block activation — never native `disabled`.
- Demo: banner `DEMO – du ser et ferdig eksempel. Ingen KI-tjeneste brukes, og egne filer kan ikke lastes opp.`; `Last opp` disabled; fixed settings with fixed-settings note; `Vis eksempel` sends one request; loading `Henter eksempel …`; results heading `Eksempelresultater (ikke generert nå)`; Verification Notice `Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.`; skipped-pages notice with singular/two/3+ wording; `Resultatene er klare` announced, focus not moved.
- Errors: `<h2 tabindex="-1">` headline gets focus, action text, backend `message` as a muted detail; no `role="alert"`; unknown codes, `demo_not_enabled`, `demo_mode_no_uploads` → `Noe gikk galt`; network loss → `Mistet kontakten med serveren`.
- Tabs: full APG pattern, order Sammendrag | Nøkkelbegreper | Flashkort | Quiz; counts on Flashkort and Quiz; panels stay mounted with `hidden`; state kept across tab switches.
- Page link: `PDF-side N ↗`, accessible name `PDF-side N, åpnes i ny fane`, new tab with `rel="noopener"`, link source passed in as input (demo: `<NEXT_PUBLIC_API_BASE_URL>/api/demo/sample.pdf#page=N`).
- Flashkort: one card, `Kort N av M`, `Vis svar`/`Skjul svar`, `Forrige`/`Neste`. Quiz: `<ol>`, `h4` questions, per-item toggle, display only.
- `Tilbake til start`: back to demo S1, no dialog, no leave warning, state reset, focus to `Vis eksempel`.
- Accessibility target WCAG 2.2 AA (a target, not a compliance claim): keyboard-only, 200% zoom, reflow at 320px; T-1 to T-3 run at the demo milestone.
- Story-level open items to decide: D-7 (1.5), D-1/D-2/D-5 (1.16; D-2 wording needs approval), D-8/D-9 (1.4), D-10 (panels), D-13 (1.1).

## Cross-Story Dependencies

- Backend chain: 1.1 → 1.2 → 1.3 → {1.6 → 1.7 → 1.8, 1.9 → 1.10} → 1.11. Stages 1.6–1.11 use test-generated PDFs and fakes, so they do not wait for the sample.
- 1.12 (sample PDF, needs 1.7) gates 1.13 (fixture + `/api/demo`, also needs 1.11) and 1.14 (sample endpoint, also needs 1.3).
- Frontend chain: 1.1 → 1.4; 1.5 needs 1.2, 1.3, 1.4; 1.15 needs 1.5 + 1.13; 1.16 → 1.17 (also needs 1.14) → 1.18/1.19/1.20 → 1.21.
- Epic 2 reuses the pipeline, error contract, page-link component (real mode supplies its own link source) and adds the Anthropic SDK, cost gate and paid-call counter. Epic 3 replaces the temporary fixture with one recorded from an approved real run and resolves U-1 before submission.
