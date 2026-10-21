---
title: AI Study Buddy — Product Brief
status: final
created: 2026-09-14
updated: 2026-09-16
---

# Product Brief: AI Study Buddy

## Executive summary

AI Study Buddy is a web application that turns a student's own course material into study resources. A student uploads one lecture's slides or notes (PDF or plain text); the app uses a cloud LLM to generate a summary, a small set of flashcards, a short quiz with answers, and a list of key concepts — each with a page reference back to its source, where practical.

This is a solo capstone project for IBE160 "Programmering med KI" at Høgskolen i Molde, built by a first-time programmer working alone rather than as part of the assumed group. Given that starting point, the project is scoped deliberately small: a single, well-understood core workflow, built and tested end-to-end, rather than a broad feature set. The point of the project is not to out-build Quizlet or NotebookLM — tools that already do this well — but to demonstrate sound AI-assisted development practice: a working pipeline that is designed, built, tested, and fully explainable.

## The problem

Turning raw course material into something study-ready — a summary, practice questions, a distilled list of what actually matters — is manual, repetitive work that most students do every exam season, or skip entirely for lack of time. The student behind this project feels this directly. AI Study Buddy automates the first pass: upload the material once, get a structured starting point back.

## The solution

The core workflow:

1. Student uploads one reasonably-sized document (e.g., one lecture's slides or notes — not a full course pack).
2. Student optionally specifies course code/subject, desired level of detail, and output language.
3. The app extracts the text and sends it to a cloud LLM, instructed to work only from the supplied material.
4. The app returns, in one pass: a summary, a small set of flashcards, a short quiz (questions + answers), and a list of key concepts — each with a page reference back to its source, where practical.
5. Results are shown in the browser. Nothing is saved — no accounts, no history, no stored copy of the uploaded document.

## Relation to existing tools

A brief, non-exhaustive look at public product pages (sources and per-source confidence in `addendum.md`) shows that several established products — Quizlet, Google NotebookLM, StudyFetch, and Taskade — publicly describe a similar upload-to-study-materials capability. That supports scope legitimacy, not a benchmarked comparison: this project makes no claim to novelty or competitive differentiation against these tools. Its purpose is to demonstrate the developer's own development process, not to compete commercially.

## Who this serves

The primary user is a student preparing for a written exam in a lecture-heavy subject — for example, a course taught through weekly slide decks rather than a single textbook. A realistic scenario: with several lectures' worth of material to revisit before the exam and limited time, the student uploads one lecture at a time and gets back a summary, flashcards, a quiz, and key concepts with page references — a faster first pass than re-reading the full deck cold.

For this version, the developer is the only person who actually uses the app, testing it against their own real lecture material from this same kind of course. That's a deliberate stand-in for the persona above, not a claim of broader validation: the app is built and tested against this one concrete situation, not against other subjects, note formats, or users beyond the developer. A wider student audience remains a plausible future direction (see Beyond MVP), not a design target for this version.

## Key design decisions

The assignment specifically calls out several open design decisions. Positions taken for this project:

- **LLM choice & confidentiality:** A cloud LLM API, not a locally-run model — simpler to implement for a first-time programmer. Confidentiality is addressed structurally: the app avoids storing uploaded documents at all (see Data handling / persistence, next item), rather than by building security controls around stored data.
- **Data handling / persistence:** Zero persistence. The uploaded document is processed in memory for the duration of the request and discarded once results are generated. No database, no accounts, no saved history. This was chosen over a session-only-storage alternative specifically because it removes an entire category of concerns (retention, access control) that a beginner solo project doesn't need to take on. Because nothing is stored or shared, authentication is out of scope for this version — not because it was overlooked, but because there is nothing to protect access to.
- **Document size & chunking:** MVP handles one reasonably-sized document at a time (for example, a single lecture's worth of material). An oversized upload is rejected with a message asking for a smaller document. Chunking long documents into multiple LLM calls is explicitly out of scope for this version — the research for this brief confirmed it's a common source of bugs (broken context, severed answers), and not worth the complexity for a first project.
- **Tables & figures:** Not specially handled in v1. Text is extracted and processed; tables and figures may be flattened or skipped rather than preserved. This is a disclosed limitation, not a silent failure.
- **Accuracy & hallucination:** Addressed two ways, deliberately kept lightweight: the LLM is instructed to base its output only on the uploaded material, and the app displays a visible notice that content is AI-generated and should be verified against the source. No verification logic (for example, cross-checking generated answers against the source text) is built for MVP. This reduces hallucination risk but doesn't eliminate it — the residual risk is accepted for this version.

## Scope

**MVP (must-have):**
- Upload one PDF or plain-text document at a time
- Optional inputs: course code/subject, desired detail level, output language
- One generation pass producing: summary, flashcard set, quiz (questions + answers), key concepts list
- Page-number references on generated items, where practical
- Results displayed in-browser; disclosed AI-generated/verify-against-source notice
- No accounts, no login, no saved history, no stored copy of the upload

**Explicitly postponed:**
- Multiple or simultaneous file uploads, or a document library
- Chunking or any handling of documents larger than a single lecture's worth of material
- Structured handling of tables and figures
- Saving, editing, or exporting flashcards; spaced-repetition scheduling
- Interactive quiz-taking (answering Quiz questions in the app) and automatic scoring — a planned Phase 2 feature, not in MVP
- User accounts, sharing, or any multi-user functionality
- Fine-grained citation (quoting exact source text) beyond page number
- Any buying or selling functionality (not applicable to this project)

## Success criteria

Two lenses, both need to hold:

- **Course/grading lens:** the project's Git history, planning documents, and test suite show a traceable path from brief → PRD → architecture → working code, not just a finished demo. A reviewer can run the app from the README and see the process that produced it.

- **Functional lens (testable):** for a reasonably-sized lecture document (this brief's own definition — roughly one lecture's worth of slides or notes):
  - **Sufficiency and honesty.** The Document must contain enough real content to genuinely support the counts below, and the LLM is instructed to work only from the Document's actual content — it must never deliberately invent facts, definitions, or questions just to reach a minimum count. The app makes a best-effort attempt to detect when source material is too thin to support genuine results and reports this clearly (e.g., "not enough material in this document to generate a full set") rather than returning a complete-looking but fabricated result. This detection is a safeguard, not a guarantee — it may not catch every inadequate document — but fabrication to hit a count is never acceptable regardless of whether thinness was detected.
  - **Minimum counts.** When the Document does contain enough material — the normal case for a reasonably-sized lecture document — a single Generation Pass returns at least 5 flashcards, at least 5 quiz questions with answers, and at least 5 key concepts, together, not as a partial result.
  - **Page references (PDF).** The document's real page markers are preserved during text extraction and carried through to the AI, so each page reference it returns must match one of those real, preserved markers — not an invented or out-of-range number. Matching a real marker is checked automatically; genuinely confirming that the cited page supports the item's content is checked manually against the source document during testing, not claimed as something automated validation alone guarantees. The summary may reference a page or page range where that's practical, or omit it where the summary spans the whole document too broadly for one page number to mean anything.
  - **Page references (plain text).** No page reference is attached to any item — the field is omitted entirely, never filled with a guessed, default, or placeholder value.
  - **Oversized documents.** A Document larger than the system's defined size limit is rejected with a message that names the problem and asks for a smaller file — not a crash or a silent failure.
  - **Unreadable documents.** An unsupported file type, or a Document with no extractable text (e.g. a scanned, image-only PDF), is rejected with a specific message before any LLM call is attempted.
  - **Generation failures.** If the LLM call fails, times out, or returns an incomplete/malformed response, the student sees a clear failure state — never a partial or fabricated set of results.

- **Explainability:** the developer can walk a reviewer through the main design and implementation decisions behind the pipeline (why zero persistence, why one LLM call, how page references work, how source-sufficiency is checked) without notes.

## Constraints & risks

- **Solo, beginner developer.** Every scope decision above is deliberately conservative for this reason; the risk of over-scoping is treated as more dangerous than the risk of under-building.
- **API cost.** A cloud LLM API has a real, ongoing cost during development and testing (repeated calls while building and debugging). No provider or budget has been chosen yet; the intent is to use a free or lowest-cost practical tier rather than commit to a paid provider before the project's actual usage pattern is known.
- **Hallucination risk.** See Key design decisions › Accuracy & hallucination — mitigated, not eliminated.
- **Tech stack undecided.** No programming language or framework has been chosen yet, pending a check of the course's actual requirements/recommendations — this should be resolved before implementation planning proceeds.

## Beyond MVP

If time and interest remain after the MVP is solid, the most natural next steps are supporting more than one document per session, turning the Quiz into something the student can answer interactively and get scored on, saving or exporting generated flashcards, and generalizing beyond this initial use case toward other students. None of this is a commitment — the project's success is defined by the MVP above, not by how far past it the project gets.
