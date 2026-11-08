# Upstream reconciliation

## 2026-11-08 kl. 17:37 — Amma Kwaasi-Eide

> **Type of record:** a retrospective summary written by Claude Code at the end of the work. It is **not** a verbatim transcript; prompts are paraphrased. The authoritative records are the decision logs (`.memlog.md`) in the PRD, architecture and UX folders, and the commits listed below. Approved Norwegian UI labels are quoted exactly.

### Task
After the final UX design was merged (PR #3, `main` at `f10374e`), the developer asked for the six pending upstream changes from the UX work to be applied to the PRD and architecture, before starting BMAD epics and stories. The changes were to be reviewed read-only first, then applied one section at a time (PRD, architecture, UX alignment, logs), with every diff reviewed and every commit approved separately. No application code was to be written.

### Plan
- A read-only reconciliation review located each of the six items in the PRD and architecture, and proposed exact replacement wording and the safest order.
- The developer's decisions:
  - **Option A** for demo page links: a read-only, demo-only backend endpoint `GET /api/demo/sample.pdf`, chosen over a second copy in the frontend so there is one source of truth.
  - A **binary** upload limit: 10 MB = 10,485,760 bytes.
  - The optional FR-1 tidy-up.
- Three refinements from the developer:
  - Keep Norwegian Bokmål interface and error text separate from the optional English output for AI-generated study content.
  - Demo mode makes no external network or AI-provider calls; local browser-to-backend HTTP is allowed.
  - Mark items APPLIED only after verification, and never anticipate commit hashes.
- Work on branch `docs/upstream-reconciliation` from `f10374e`:
  - Section A: the PRD.
  - Section B: the architecture. Two small corrections were made before staging: the `/api/status` example was kept unchanged, and the Glossary row was reworded.
  - Section C: UX alignment.
  - Section D: these logs.
- Plan documents:
  - [PRD](../../_bmad-output/planning-artifacts/prds/prd-G42-eide-2026-09-16/prd.md)
  - [Architecture spine](../../_bmad-output/planning-artifacts/architecture/architecture-G42-eide-2026-10-26/ARCHITECTURE-SPINE.md)
  - [EXPERIENCE.md](../../_bmad-output/planning-artifacts/ux-designs/ux-G42-eide-2026-10-27/EXPERIENCE.md)

### Result
- **Commit `50b403d`, `Update PRD: quiz reveal wording and upload limit definition`:**
  - The Glossary "Quiz" entry now uses the approved reveal-answer wording: display-only, no typing, scoring or saving. The UI label "Vis svar" is defined in the UX documents.
  - FR-1's outdated size-threshold [ASSUMPTION] is replaced by a pointer to AD-14 (10 MB = 10,485,760 bytes).
  - The answer to §9 question 1 now gives the binary value.
  - One PRD decision-log entry was added.
- **Commit `44059f6`, `Amend architecture: Norwegian UI wording, demo sample PDF endpoint, binary 10 MB limit`:**
  - AD-8 and the page-number convention use `PDF-side N`.
  - AD-11: backend messages are in Norwegian Bokmål. The optional English output applies only to generated study content.
  - AD-13: the demo heading is `Eksempelresultater (ikke generert nå)`, and the new `GET /api/demo/sample.pdf` endpoint is defined. It is GET only, demo mode only, and serves only the fixed sample PDF. Real mode returns the existing `demo_not_enabled` (403); a missing file returns the existing `internal_error` (500). No new error codes. It doesn't take the pass lock and makes no paid or external calls.
  - AD-14: 10 MB = 10,485,760 bytes, with the same binary formatting in the backend and frontend.
  - AD-15: the user-facing call-limit text follows the UX wording.
  - AD-20: tests for the new endpoint.
  - Conventions:
    - Endpoints: the `/api/status` example is unchanged; the byte value is stated outside it.
    - Page numbers: `PDF-side N`.
    - Glossary: code uses the PRD terms; the UI uses the Norwegian labels.
  - Structural Seed and Capability map updated to match.
  - REVIEWER-EXPLAINER.md updated.
  - Six architecture decision-log entries were added.
  - Decision IDs AD-1 to AD-22 are unchanged, and `status: final` is kept.
- **Commit `4ac2989`, `Mark upstream UX changes as applied`:**
  - EXPERIENCE.md:
    - All six upstream items are marked APPLIED, each with its verified commit.
    - Open Question 7 (the demo-flow dependency) is **CLOSED**.
    - The file-size rule uses the binary convention.
    - Demo page links point to the new endpoint.
    - The Foundation section states that demo mode makes no external calls.
  - DESIGN.md: the pointer now says the upstream changes are applied.
  - One UX decision-log entry was added.
  - The deferred questions 8–15 are unchanged, and `status: final` is kept.
- **Verification:**
  - Each item was checked in the **committed** files before being marked APPLIED.
  - The architecture spine format checker reported 0 findings after each architecture edit.
  - Staged diffs were compared byte for byte with the reviewed diffs before every commit.
  - No old English UI wording or "NOT APPLIED" markers remain in the current PRD, architecture or UX reconciliation sections. The original "NOT APPLIED" wording is intentionally preserved in the seven resolved entries in `issues.md`, for historical traceability.
  - The `.claude/` and `_bmad/` tool folders were checked by checksum and are untouched.
- **Done in documentation only:** these are design and contract decisions. **No application code was written.** The `/api/demo/sample.pdf` endpoint, the binary size formatting, the Norwegian UI and every other feature are specified but **not yet implemented**.
- **Branch status at the time of writing:** `docs/upstream-reconciliation` exists only on this laptop. It has not been pushed, and it has no Pull Request and no merge.
- Closed in `issues.md`: the seven reconciliation items from 2026-11-08.

### Open items
- Run BMAD epics and stories (`bmad-create-epics-and-stories`) from the reconciled PRD, architecture and UX documents.
- Implementation work still open (tracked since 2026-10-27; unchanged): verify the Anthropic Console spending controls before buying credits; write the Norwegian sample PDF and record and review the demo fixture; revisit the provisional limits and the call cap after the first real test session; check Norwegian output quality on Claude Haiku 5.5; decide on a uv update; decide whether to commit the `.claude/` and `_bmad/` tool folders.
- The deferred UX implementation questions stay open in EXPERIENCE.md → Open Questions (items 8–15), each with its revisit point.
