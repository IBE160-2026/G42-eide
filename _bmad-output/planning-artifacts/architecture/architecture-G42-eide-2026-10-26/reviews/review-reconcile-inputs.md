# Review — Input Reconciliation (ARCHITECTURE-SPINE.md)

- **Reviewed:** `ARCHITECTURE-SPINE.md` (draft, 2026-10-26), with `.memlog.md` as the record of what was decided on purpose
- **Inputs checked:** PRD (`prd.md`, `addendum.md`), brief (`brief.md`, `addendum.md`), lecturer feedback (`tilbakemelding-product-brief.md`, 2026-10-06)
- **Reviewer lens:** requirements and conditions in the inputs that are missing from the spine or that the spine contradicts. Decisions the memlog shows as deliberate (demo mode, paid Anthropic tier instead of a free tier, failing the whole pass when a plain-text Document gets a page reference, optional Summary pages, the extra error codes) are **not** counted as gaps.

## Verdict

**The spine is close to the inputs.** All seven FRs, every PRD Open Question that Architecture owned (OQ1, OQ2, OQ3, OQ4, OQ5), and the lecturer's main technical requests (structured JSON output with validation, demo mode, `.env.example`, no copyrighted samples) appear in it. The gaps are mostly quiet ones, and most of them come from the lecturer's feedback rather than the PRD:

- whether a reviewer can actually run the app (the README, and what `AI_MODE` defaults to)
- telling the student in the app that their text goes to an external AI
- keeping prompts and AI sessions as evidence of the process
- an error code for the per-run call cap
- a tension between the test-data rule and the PRD's plan to validate against real lecture material

Nothing is critical. Two findings are high.

## Findings

### F1 — Reviewer runnability: no README, no default for `AI_MODE` — **high**

- **Source:** Brief, Success criteria › Course/grading lens: "A reviewer can run the app from the README and see the process that produced it." Lecturer, Gjennomførbarhet › *Kjørbar for sensor* (Risiko), and Del 1 criterion 6 *README og kjørbarhet* (10 %): the app must run locally "uten gruppens nøkler", using demo mode or a clear key setup.
- **Gap:** AD-4 says `real` without a key "refuses to start", but the spine never says what `AI_MODE` is when unset, or which mode `.env.example` ships with. If the default is `real`, a reviewer who copies `.env.example` gets a backend that will not start. The README is not in the Structural Seed or anywhere else in the spine, and the spine never names the run path: two processes (uv + npm), ports, and the order to start them.
- **Fix:** Add a rule that `AI_MODE` defaults to `demo` (and `.env.example` sets `demo`), and add `README.md` to the Structural Seed with a no-key quickstart in demo mode plus an optional real-mode setup with the reviewer's own key.

### F2 — The in-app disclosure that text goes to an external AI is not pinned to the UI — **high**

- **Source:** Lecturer, factor table › *Sikkerhet og personvern*: "Innholdet sendes likevel til en ekstern språkmodell; nevn det for brukeren." (Tell the user.)
- **Gap:** AD-7 only requires "User-facing docs" to describe what Anthropic retains. Nothing requires the app UI to tell the student, before they upload, that the extracted text is sent to an external provider. The lecturer asked for this to be shown to the user, not only written in the docs.
- **Fix:** Extend AD-7 (or the Conventions) to require a visible notice near upload/Generate in real mode saying the text is sent to Anthropic's API, with a link to the policy. Leave the wording to UX.

### F3 — Saving prompts and AI sessions as process evidence is missing — **medium**

- **Source:** Lecturer, Del 1 criterion 1 *Prosess og KI-styring* (30 %): "lagre prompts og KI-økter". Also "sørg for at det synes i repoet med prompts, iterasjoner og tester". PRD SM-3 (documented process).
- **Gap:** AD-20 and AD-21 cover tests, branches, PRs and CI, but no AD or seed folder says where prompts, AI-session logs or iteration notes go. AD-19 forbids committing real AI responses about non-public material, so a safe place for sessions needs to be defined.
- **Fix:** Add a seed folder (e.g. `docs/ai-sessions/`), name it in AD-21, and state that the AD-19 hygiene rules apply to it.

### F4 — The test-data rule conflicts with the PRD's plan to validate against real lecture material — **medium**

- **Source:** PRD §2.2 and §5: the app is "built and validated against the developer's own course material only". Brief, Who this serves: the developer tests "against their own real lecture material from this same kind of course". SM-1 talks about "a reasonably-sized lecture Document".
- **Contradiction:** AD-19 and AD-20 allow real-AI testing only on "own non-sensitive work or openly licensed" documents. The memlog records this as a deliberate rule. Course slides written by a lecturer are usually neither of those, so the persona validation the PRD describes cannot happen as written. Publishing a document (forbidden by AD-19) and sending it to the API for a private test are two different things, but the spine treats them as one.
- **Fix:** Either explicitly allow sending (not committing) real course PDFs to the API for private manual tests, or record that SM-1 is validated on self-made lecture-style PDFs and note this as a change to the PRD's validation scope.

### F5 — Per-run call cap has no error code — **medium**

- **Source:** PRD FR-7 (the student sees a clear, specific failure state). Memlog: the cap refuses with an "ai_credits_exhausted-style message".
- **Gap:** AD-15 introduces the in-memory paid-call cap (default 20), but AD-11's closed list has no code for it. Reusing `ai_credits_exhausted` would tell the student their credits are gone when they are not.
- **Fix:** Name the code in AD-15: either add `call_cap_reached` to AD-11, or state that `ai_credits_exhausted` is reused, with a message that says the local cap was reached.

### F6 — Empty or whitespace-only plain-text file not covered — **medium**

- **Source:** PRD FR-7: "no extractable text (for example, a corrupt or image-only PDF, or a blank file) … detects this before calling the LLM". SM-1 says the same.
- **Gap:** AD-8 defines `no_extractable_text` only for PDFs ("no pages with text"). No rule covers an empty or whitespace-only `.txt` upload, which would reach the AI and probably come back as `insufficient_content` or `ai_output_invalid`, wasting a paid call.
- **Fix:** In AD-8, state that a plain-text Document whose stripped text is empty → `no_extractable_text` before the cost gate.

### F7 — Traceability for the PRD Open Questions and the change to the "free tier" cost constraint — **low**

- **Source:** PRD §9 OQ1–OQ5. PRD §8 Cost: "prefer a free or lowest-cost practical tier … avoid committing to a paid provider before actual usage patterns are known." Lecturer: the reviewer should be able to follow "en sporbar vei fra plan til ferdig app".
- **Gap:** The spine resolves the Open Questions (AD-14 → OQ1, AD-5 → OQ2, Stack → OQ3, AD-21 → OQ4, AD-8 → OQ5) but never says so. The move to a paid, prepaid tier, made because Gemini's free tier allows training on inputs and has EEA restrictions, is explained only in the memlog. A reader of the spine sees what looks like a contradiction of the PRD cost constraint.
- **Fix:** Add "Resolves PRD OQ-n" tags to those ADs, and add one sentence to AD-5 explaining why the paid lowest-cost tier replaces the free-tier preference.

### F8 — SM-2 (explainability) is bound, but no mechanism or deliverable is named — **low**

- **Source:** PRD SM-2. Brief › Explainability: walk a reviewer through "why zero persistence, why one LLM call, how page references work, how source-sufficiency is checked". Memlog › Direction: a "short reviewer-facing explainer" is a deliverable of this workflow.
- **Gap:** `binds:` lists SM-2, but no AD, Convention or seed entry mentions the explainer document.
- **Fix:** Reference the explainer in Companions or Structural Seed. Optionally map SM-2 in the Capability table.

### F9 — No seam for the Phase 2 extension the lecturer asked for — **low**

- **Source:** Lecturer, Forslag til justering 1 and Del 1 criterion 2: plan one extension (an interactive quiz with scoring, or exporting flashcards) as a clear second stage. PRD FR-3 › Out of Scope: the interactive quiz is "a planned Phase 2 feature".
- **Gap:** The Deferred section groups the interactive quiz with permanent exclusions ("out of MVP scope per PRD §6.2"). It does not say whether the planned extension fits the current contracts: frontend-only scoring on the `quiz[]` data, with no backend change and no persistence.
- **Fix:** List "Phase 2: interactive quiz" separately in Deferred, with one line saying it should be frontend-only on the existing AD-9 `quiz` data and keep zero persistence.

### F10 — The tables and figures limitation is never disclosed to the user — **low**

- **Source:** Brief › Tables & figures: "a disclosed limitation, not a silent failure". PRD §6.2.
- **Gap:** The skipped-pages notice covers image-only pages, but no rule makes sure the tables/figures limitation is disclosed in the UI or README. Disclosing it is a requirement, not just wording, though the exact text belongs to UX.
- **Fix:** Add a line to Deferred → UX (or to the README requirement in F1) saying the tables/figures limitation must be disclosed.

### F11 — `course_code` over the length cap: truncate or reject? — **low**

- **Source:** PRD FR-2: an invalid value is "rejected or falls back … rather than passed through unvalidated".
- **Gap:** AD-17 says `course_code` is "length-capped" but does not say whether too-long input is truncated or rejected, and if rejected, with which code. The closed error list has no code that fits.
- **Fix:** State "truncated silently to N characters" (needs no new code) or add a code.

## Checked and found consistent (no action)

- FR-1 checks the file signature and requires UTF-8 (AD-14). FR-3: one pass at a time (AD-16), at least 5 items each, no padding (AD-9, AD-10).
- FR-4: markers preserved, validated, never invented for plain text (AD-8, AD-10). Manual citation check (AD-20 layer 4).
- FR-6: Verification Notice shown in both modes. FR-7: rate-limit and quota cases are distinguished (`ai_rate_limited`, `ai_credits_exhausted`).
- Privacy: zero persistence and honest wording about what the provider retains (AD-7). No accounts.
- Lecturer requests covered: structured output validated in code (AD-9, AD-10); a demo mode with a stored answer for a sample PDF (AD-13); key in `.env` kept out of Git, `.env.example` committed (AD-6); shareable, non-copyrighted sample PDFs (AD-19, sample decision in the memlog); stack chosen with reasons (Stack + memlog); a sample PDF with an expected result (demo fixture + AD-20).
- Process: Git/GitHub, BMAD review checkpoints, planning artifacts kept under version control (AD-21, seed `_bmad-output/`).
