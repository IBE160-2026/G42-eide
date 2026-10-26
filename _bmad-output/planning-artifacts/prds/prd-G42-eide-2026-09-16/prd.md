---
title: AI Study Buddy — PRD
status: final
created: 2026-09-16
updated: 2026-10-26
---

# PRD: AI Study Buddy

## 0. Document purpose

This PRD translates the finalized AI Study Buddy product brief into features, functional requirements, and constraints for a solo, beginner-built capstone project (IBE160). It's written for the developer's own use through the rest of the BMAD workflow (Architecture, epics and stories, implementation) and for a course reviewer assessing process and outcome. Structure: Glossary-anchored vocabulary (§3), Features grouped with globally-numbered FRs nested under each (§4), assumptions tagged inline and indexed in §10. It builds directly on the finalized product brief and addendum at `_bmad-output/planning-artifacts/briefs/brief-G42-eide-2026-09-14/` — this PRD doesn't duplicate that reasoning, only the decisions relevant to requirements, scope, and constraints.

## 1. Vision

Turning raw course material into something study-ready — a summary, practice questions, a distilled list of what matters — is manual, repetitive work that most students do by hand every exam season, or skip entirely for lack of time. AI Study Buddy is a web application that automates that first pass. A student uploads one lecture's slides or notes (PDF or plain text); the app sends the extracted text to a cloud LLM and returns, in one pass, a summary, a small set of flashcards, a short quiz with answers, and a list of key concepts — each with a page reference back to its source, where practical.

This is a solo capstone project for IBE160 at Høgskolen i Molde, built by a first-time programmer. The project is scoped small on purpose: one well-understood workflow, built and tested end-to-end, rather than a broad feature set competing with tools like Quizlet or NotebookLM. Its point is to demonstrate sound, AI-assisted development practice — a pipeline that's designed, built, tested, and documented, and that the person who built it can fully explain.

## 2. Target user

### 2.1 Jobs To Be Done
- **Functional:** Turn one piece of raw course material (a lecture's slides or notes) into a structured study starting point — summary, flashcards, quiz, key concepts — without doing it by hand.
- **Meta/builder:** Produce a working, testable, fully-explainable AI-assisted pipeline as the actual deliverable for this course — the "job" is as much about demonstrating sound build practice as it is about the study output itself.

### 2.2 Non-Users (v1)
- The broader student population — v1 is built and tested against one concrete persona and situation (a student preparing for an exam in a lecture-heavy subject, reviewing one lecture at a time), with the developer as the only person actually testing it, standing in for that persona rather than validating across other subjects, note formats, or users.
- Course material in languages other than Norwegian (Bokmål) and English, beyond whatever happens to work incidentally. Norwegian and English source material is in scope.
- Anyone needing multi-document or full-course-level study support in one session.

### 2.3 Key User Journeys
Single-user, single-workflow product — the lighter form fits; the JTBD above already *is* the journey.

- **UJ-1.** The student, studying for an upcoming exam, uploads a lecture PDF and gets back a summary, flashcards, a quiz, and key concepts with page references to review before the exam.
  - **Edge cases:**
    - If the file type or size isn't supported, the upload is rejected with a message explaining why, rather than failing silently.
    - Generated results may be imperfect — the interface reminds the student to verify them against the source material.

## 3. Glossary

- **Document** — the single uploaded file (PDF or plain text) a Generation Pass runs against. One Document per Generation Pass; no multi-document support in v1.
- **Generation Pass** — the single request/response cycle: extract text from a Document, call the LLM once, return all outputs together. One Generation Pass = one Document = one set of Results.
- **Results** — the collective output of a Generation Pass: a Summary, a Flashcard Set, a Quiz, and a Key Concepts list.
- **Summary** — the generated condensed overview of the Document's content.
- **Flashcard Set** — the small set of generated flashcards, each pairing a term or prompt with an answer.
- **Quiz** — the generated set of questions with answers. In v1, the Quiz is display-only: questions and their answers are shown together, not answered interactively. Interactive answering and automatic scoring is a planned Phase 2 feature (see §6.2 Out of Scope for MVP).
- **Key Concepts** — the generated list of terms/ideas the Document treats as most important.
- **Page Reference** — a page-number citation attached to a Summary, Flashcard, Quiz item, or Key Concept, pointing back to where in the Document it was drawn from. Inclusion or omission policy: see FR-4.
- **Generation Inputs** — the optional fields the student can set before a Generation Pass: course code/subject, detail level, output language.
- **Verification Notice** — the visible, persistent notice shown with Results stating the content is AI-generated and should be checked against the Document.

## 4. Features

### 4.1 Document Upload & Generation Inputs
**Description:** The student uploads one Document and optionally sets Generation Inputs before running a Generation Pass. Realizes UJ-1.

#### FR-1: Upload a Document
The student can upload one Document (PDF or plain text). Realizes UJ-1.

**Consequences (testable):**
- System accepts PDF and plain-text file types.
- System rejects unsupported file types with a clear message naming the problem.
- System rejects oversized Documents with a clear message asking for a smaller file. [ASSUMPTION: exact size threshold not yet defined — see Open Questions.]
- System validates the file's actual content (its signature), not just its extension, before accepting an upload.
- Plain-text Documents are checked for a supported text encoding (UTF-8); unsupported or undetectable encoding is rejected with a message rather than processed as garbled text.
- Norwegian characters (æ, ø, å) are extracted correctly from PDF and UTF-8 plain-text Documents.

#### FR-2: Set Generation Inputs
The student can optionally set course code/subject, detail level, and output language before a Generation Pass.

**Consequences (testable):**
- Course code/subject is optional and stays blank when unset — no default value is substituted.
- Detail level is one of Brief, Standard or Detailed, and defaults to Standard when left unset.
- Output language is Norwegian (Bokmål) or English, and defaults to Norwegian (Bokmål) when left unset.
- The selected output language applies to all four Result types, whatever the language of the source Document (for example, a Norwegian Document can produce English Results).
- An invalid or unsupported value for detail level or output language is rejected or falls back to its default, rather than passed through unvalidated.
- Free-text input (course code/subject) is sanitized and delimited before inclusion in the LLM prompt, so it cannot override the source-constrained instruction in FR-3.

### 4.2 Content Generation
**Description:** One Generation Pass produces all Results from a single Document in one LLM call, constrained to the Document's own content. Realizes UJ-1.

#### FR-3: Run a Generation Pass
The system runs one Generation Pass per submitted Document, producing a Summary, Flashcard Set, Quiz, and Key Concepts together in a single LLM call/response cycle.

**Consequences (testable):**
- All four Result types are always produced together; there's no way to request a subset.
- The LLM is instructed to base output only on the Document's extracted text — no outside knowledge injected as fact.
- Only one Generation Pass may run at a time per session; the generate action is disabled while a pass is in flight, preventing concurrent or duplicate calls.
- When the Document contains enough genuine material (the normal case for a reasonably-sized lecture document), a Generation Pass produces at least 5 flashcards, at least 5 quiz questions with answers, and at least 5 key concepts, together with the Summary.
- The LLM must never invent flashcards, quiz questions, or key concepts just to reach these minimums; see FR-7 for how a Document with too little genuine content is handled instead.
- Subject-specific terminology from the Document is preserved. When the output language differs from the Document's language, the original technical term is shown in brackets the first time it appears (for example, "safety stock (sikkerhetslager)"); important terms are not force-translated inaccurately.

**Out of Scope:**
- Chunking or multiple LLM calls for oversized Documents — out of scope per FR-1's size rejection.
- Interactive quiz-taking (the student answering Quiz questions in the app) and automatic scoring — the v1 Quiz is display-only; this is a planned Phase 2 feature, built only after the core Generation Pass is stable.

#### FR-4: Attach Page References
The system attaches a Page Reference to generated items where practical, per the Glossary definition.

**Consequences (testable):**
- During text extraction from a PDF Document, the real page markers are preserved and carried through to the LLM call, so each chunk of content the LLM sees is tagged with the actual page it came from.
- The LLM is instructed to cite only page numbers from the markers it was given, not to infer or guess a page number independently.
- Every Page Reference attached to a Flashcard, Quiz item, or Key Concept is validated against the set of real markers supplied for that Generation Pass; a citation that isn't one of those markers is rejected rather than shown. This check confirms the citation is a real, preserved page marker — it does not by itself prove the citation is the single best or most precise page for that content; that is verified manually against the source PDF during testing, not claimed as an automated guarantee.
- No Page Reference is fabricated for plain-text Documents lacking page information — omitted, not guessed.
- Page References work the same way whatever the language of the Document or of the Results.

### 4.3 Results Display
**Description:** Results are shown in-browser immediately after a successful Generation Pass, alongside a Verification Notice. Realizes UJ-1, including its "results may be imperfect" edge case.

#### FR-5: Display Results
The student sees the Summary, Flashcard Set, Quiz, and Key Concepts in the browser after a successful Generation Pass.

**Consequences (testable):**
- Results are only displayed when a Generation Pass completes successfully; on failure, FR-7's failure state is shown instead.

#### FR-6: Display Verification Notice
The system displays a Verification Notice alongside Results.

**Consequences (testable):**
- The notice is visible without extra clicks whenever Results are shown — not buried in a tooltip or footer link.

#### FR-7: Handle Generation Pass Failures
When a Generation Pass does not complete successfully, the system shows the student a clear failure state instead of no Results, a crash, or fabricated content.

**Consequences (testable):**
- If the LLM API call fails or times out, the student sees an error message; Results are not shown as though generation had succeeded.
- If the Document has no extractable text (for example, a corrupt or image-only PDF, or a blank file), the system detects this before calling the LLM and shows a specific message — no Generation Pass is attempted against empty content.
- If the LLM's response is malformed, incomplete, or missing one of the four Result types, the pass is treated as failed, not partially displayed as if complete.
- If the LLM provider returns a rate-limit or quota error, the student sees a message distinguishing this from a generic failure.
- If the Document has real, extractable text but too little genuine content to support the minimum counts in FR-3, the pass reports this specifically (e.g., a message naming insufficient material) instead of returning padded or invented Results. This detection is best-effort, not a guarantee — the system is not expected to catch every case of thin content, but the LLM must never fabricate content to meet the minimums regardless of whether thinness was detected.

## 5. Non-goals (explicit)

- Not a multi-user or shared platform (see Constraints & Guardrails › Privacy).
- Not a general-purpose or multi-subject study tool in this version — built and validated against the developer's own course material only (see Non-Users).
- Not attempting to compete with or differentiate itself from existing commercial study tools (Quizlet, NotebookLM, StudyFetch, Taskade) — competitive positioning is outside this project's scope, a decision made for this project, not a course or grading requirement.
- Not deployed or hosted (see MVP Scope › Out of Scope).

## 6. MVP scope

### 6.1 In Scope
- Upload one PDF or plain-text Document at a time.
- Optional Generation Inputs: course code/subject, detail level, output language.
- One Generation Pass producing Summary, Flashcard Set, Quiz, and Key Concepts together.
- Page References on generated items where practical (PDF only, never fabricated for plain text).
- Results displayed in-browser with a Verification Notice.
- No accounts, no login, no saved history, no stored copy of the Document.

### 6.2 Out of Scope for MVP
- Multiple or simultaneous file uploads, or a document library — deferred; see Beyond MVP in the brief.
- Chunking or any handling of Documents larger than a single lecture's worth of material — a known source of bugs (broken context, severed answers); not worth the complexity for a first project.
- Structured handling of tables and figures — disclosed limitation, not solved.
- Saving, editing, or exporting Flashcards; spaced-repetition scheduling — deferred; see Beyond MVP.
- User accounts, sharing, or any multi-user functionality.
- Fine-grained citation (quoting exact source text) beyond the page number.
- Any buying or selling functionality — not applicable to this project.
- Publishing or deployment — not required for the course project.
- Interactive quiz-taking and automatic scoring — the v1 Quiz is display-only; this is a planned Phase 2 feature, not required for MVP.

## 7. Success metrics

**Primary**
- **SM-1**: Functional completion bar — for a reasonably-sized lecture Document with genuine content, a Generation Pass produces a Summary together with at least 5 Flashcards, 5 Quiz questions with answers, and 5 Key Concepts; every PDF Page Reference matches a real, preserved page marker (plain-text Documents carry none, never guessed); a Document that is oversized, unsupported, or has no extractable text is rejected with a specific message before any LLM call; a failed or malformed LLM response shows a clear failure state instead of partial or fabricated Results; and a Document with too little genuine content is reported as insufficient rather than padded. Automated checks validate page references against the real markers supplied to the LLM — they do not themselves confirm an item's full semantic accuracy, which is checked manually against the source Document. Validation includes at least one Norwegian-language Document, run with both output languages, with terminology and Page References checked manually. Validates FR-1, FR-2, FR-3, FR-4, FR-5, FR-7.
- **SM-2**: Explainability — the developer can explain the main design and implementation decisions behind the pipeline to a reviewer (self-assessed, not automated). Validates FR-3, FR-4, and the process discipline in Constraints & Guardrails.
- **SM-3**: Documented process — the project's Git history, tests, and documentation stand as evidence of a traceable, reviewable development process, not just a working demo. This describes what the project produces, not a confirmed grading criterion.

**Counter-metrics (do not optimize)**
- **SM-C1**: Scope growth — do not add Document types, output formats, or audience breadth beyond MVP In Scope to chase impressiveness. Per the developer's confirmed course info, project difficulty is balanced against available time, and a smaller or easier project may need more attention to form and presentation to reach the top grade band — finishing the small scope well, with polish, outweighs an unfinished bigger one. Counterbalances SM-3.

## 8. Constraints & guardrails

### Privacy
- Zero persistence: the system must not store the uploaded Document or generated Results beyond the request/response cycle of a single Generation Pass. Processed in memory only, discarded once Results are returned.
- No accounts, no login, no saved history — there is nothing to protect access to, so authentication is out of scope by design, not by oversight.

### Cost
- **LLM approach:** a cloud LLM API, not a locally-run model — chosen because it's simpler to implement for a first-time programmer. See `addendum.md` › Rejected alternatives for why a self-hosted local model was considered and set aside.
- Cloud LLM API calls carry a real, ongoing cost during development and testing. No provider or budget has been chosen yet — see Open Questions.
- Constraint: prefer a free or lowest-cost practical tier during development; avoid committing to a paid provider before actual usage patterns are known.

### Accuracy
- The LLM is instructed to base output only on the uploaded Document (source-constrained prompting) — this mitigates hallucination risk — it doesn't eliminate it.
- No automated verification logic (for example, cross-checking generated answers against the source text) is built for MVP; the Verification Notice (FR-6) is the sole mitigation surfaced to the student.
- Residual hallucination risk is accepted as a known limitation for this version.
- Generating Results in a different language from the Document adds a small risk of mistranslated terms; this is checked manually during testing, and the Verification Notice still applies.

### Process
- Git is required by the course for version control: project work is kept in the assigned repository and pushed to GitHub. Confirmed course requirement.
- Development follows the BMAD planning and implementation process this project has adopted, including human review checkpoints and testing and code review during implementation — practices carried out through BMAD, not asserted here as confirmed grading mandates.
- Planning artifacts (brief, PRD, and downstream BMAD documents) are version-controlled alongside the code.

## 9. Open questions

All five questions were answered by the Architecture workflow on 2026-10-26. The original questions are kept below for traceability; each answer points to the binding decision in `_bmad-output/planning-artifacts/architecture/architecture-G42-eide-2026-10-26/ARCHITECTURE-SPINE.md`.

1. What is the exact Document size threshold before an upload is rejected as oversized? (FR-1)
   - **Answered (AD-14):** provisional limits of 10 MB, 80 PDF pages, 200,000 extracted characters and a 60,000 input-token ceiling, checked in a fixed order; to be revisited after testing real lecture PDFs.
2. Which cloud LLM provider and pricing tier will be used — what free/low-cost tier is actually available and sufficient for development and testing? (Cost)
   - **Answered (AD-5, AD-15):** Anthropic Claude API, model `claude-haiku-5-5`, lowest-cost practical paid tier with prepaid credits and auto-reload off (total project budget USD 5–10). The free Gemini tier was rejected because its terms allow inputs to be used for training; Gemini paid tier is a possible fallback after re-checking its terms.
3. Final tech stack (frontend and backend framework, local run setup) — deferred to the Architecture workflow; course-taught technologies noted in `addendum.md` for it to weigh.
   - **Answered (Stack, AD-3, AD-22):** Next.js frontend and FastAPI backend, Python 3.13 and Node 22 LTS, running locally only (backend on 127.0.0.1:8000, frontend on localhost:3000), with a README quickstart in demo mode.
4. How does a solo Git workflow (branching, commit cadence) map onto the course's version-control expectations? (Process)
   - **Answered (AD-21):** one short-lived branch per story, then a Pull Request, self-review and merge into `main`, with automatic tests on every Pull Request; every commit, push and merge needs the developer's explicit approval.
5. Page-level citation (FR-4) now has a chosen direction — preserve real page markers through extraction and validate LLM citations against them — but the implementation mechanics (exact chunk-to-page-ID mapping, how markers survive chunking of longer documents) are still deferred to the Architecture workflow. Flagged in `addendum.md`'s "Open for architecture" list since Page References is an MVP must-have.
   - **Answered (AD-8, AD-10):** no chunking; one PDF page is one citation unit. Each page with text is wrapped in a page marker, and invalid citations are removed. An item left with no valid page makes the whole pass invalid.

## 10. Assumptions index

- Inline assumption from §4.1 FR-1 — exact Document size threshold not yet defined; treated as an implementation detail to resolve during Architecture or implementation, not a blocking PRD decision. **Resolved by AD-14** (see §9, question 1).
