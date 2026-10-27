# Architecture workflow

## 2026-10-27 kl. 20:20 — Amma Kwaasi-Eide

> **Type of record:** a retrospective summary written by Claude Code at the end of a session that ran from 2026-10-26 to 2026-10-27. It is **not** a verbatim transcript: prompts are paraphrased, and no exact prompt wording is reproduced. The authoritative decision record, with sources, is the architecture decision log (`.memlog.md`, linked below).

### Task
Run the BMAD Architecture workflow for AI Study Buddy using the approved stack (Next.js frontend and FastAPI backend), step by step and in beginner-friendly language, for a solo beginner developer. The design had to cover demo mode, API key security, PDF page references and structured AI output validation, with no application code, and with every commit, push and merge approved separately.

### Plan
- BMAD `bmad-architecture` skill, Coaching path. Deliverables: the architecture spine plus a short explainer for a course reviewer.
- Eight decision steps, each explained and approved by the developer before being recorded:
  1. Design pattern: a six-stage pipeline (pipes and filters) with a swappable AI connector (real, demo or test fakes) and a thin frontend.
  2. AI provider: Claude Haiku 5.5 (`claude-haiku-5-5`), with Gemini Flash **paid tier** as a possible fallback. Model ID, pricing, structured outputs, billing and privacy terms checked against official pages. Total budget USD 5–10 for the whole project, prepaid with auto-reload off.
  3. API key security: eight rules. The browser talks directly to FastAPI on 127.0.0.1. The repository is public.
  4. AI output contract and three validation gates. No automatic retry. Pydantic is the source of truth, with hand-written TypeScript types and contract tests.
  5. Page references: one PDF page is one citation unit, using pypdf. "PDF page N" labels and a skipped-pages notice.
  6. Demo mode: `AI_MODE` setting, works offline, bundled sample only, uploads rejected, results clearly labelled.
  7. Size limits (provisional), pre-call token check, call cap, zero retries, safe error handling, five testing layers.
  8. Repository layout and versions (Python 3.13 and Node 22 already installed and kept), one branch and Pull Request per story, CI with no API key.
- Reviewer gate: an automatic format check plus four independent reviewers (input reconciliation, checklist, technology verification, adversarial).
- Language update requested by the developer: Norwegian Bokmål as the default output language, English available.
- Plan documents:
  - [ARCHITECTURE-SPINE.md](../../_bmad-output/planning-artifacts/architecture/architecture-G42-eide-2026-10-26/ARCHITECTURE-SPINE.md)
  - [REVIEWER-EXPLAINER.md](../../_bmad-output/planning-artifacts/architecture/architecture-G42-eide-2026-10-26/REVIEWER-EXPLAINER.md)
  - [decision log](../../_bmad-output/planning-artifacts/architecture/architecture-G42-eide-2026-10-26/.memlog.md)

### Result
- **Architecture spine finalised:** 22 decisions (AD-1 to AD-22), approved by the developer as final on 2026-10-26.
- **Reviewer gate:**
  - Format check: 0 findings.
  - Technology verification: passed.
  - The adversarial and checklist reviewers found gaps where separately built parts meet. Fixes applied:
    - two demo fixtures
    - code-to-HTTP error table, with the error format on every non-2xx reply
    - `insufficient_content` handled before the shape check
    - named connector types
    - a single owner for the pass lock and the call counter
    - option lists served by `/api/status`
    - the order in which limits are checked
  - The input reconciliation found further gaps. Fixes applied:
    - `AI_MODE` defaults to demo, with a README quickstart that needs no key
    - in-app notice that text is sent to Anthropic
    - empty text files are caught before any paid call
  - Technology fixes: system fonts instead of Google Fonts, Next.js telemetry off.
- **Test-document policy (AD-19):** committing a document and sending it to the AI are separate permissions. Real course PDFs are sent only when their licence or rules allow it, and are never committed.
- **PRD updated:**
  - Norwegian and English source material is in scope.
  - Norwegian Bokmål is the default output language; English is available.
  - Detail levels: Brief, Standard, Detailed.
  - Terminology rule: the original term is shown in brackets when the languages differ.
  - Norwegian validation added to SM-1.
  - §9 open questions 1–5 marked as answered, with references to the architecture decisions.
- **Reviewer explainer** completed and marked final.
- **Commits:**
  - `0be1267` (architecture and PRD update)
  - `3c1f0ea` (explainer finalised)
  - Both merged into `main` through Pull Request #1, as merge commit `dabe90f`.
- **Local `main`** synchronised with GitHub by fast-forward. The untracked `.claude/` and `_bmad/` folders were verified unchanged.
- **AD-21 amended** (2026-10-27): AI-session evidence now lives in `.logs/` through the course-provided `sesjonslogg` skill, replacing `docs/ai-sessions/`. Every commit still needs the developer's approval.
- **Not done, by design:** no application code, no API key created, no credits purchased.

### Open items
- Run the BMAD UX workflow (`bmad-ux`). It must decide:
  - the interface language
  - notice wording and placement (Verification Notice, demo banner, skipped pages, external AI)
  - the error headline for each error code
  - how the fixed demo selections are presented
- Before buying any credits, verify the spending controls in the Anthropic Console: auto-reload off, a project workspace with its own spend limit, and the minimum purchase amount.
- Revisit the provisional limits (10 MB, 80 pages, 200,000 characters, 60,000 tokens) and the 20-call cap after the first real test session.
- Write the original Norwegian sample PDF (5–8 pages on inventory management, with one image-only page), then record and review the demo fixture. This happens during implementation.
- Check Norwegian output quality and terminology on Claude Haiku 5.5 in a manual test session.
- Decide whether to update uv (0.8.15) before implementation.
- Decide whether the BMAD and Claude Code tool folders (`.claude/` apart from `sesjonslogg`, and `_bmad/`) should be committed to the repository.
