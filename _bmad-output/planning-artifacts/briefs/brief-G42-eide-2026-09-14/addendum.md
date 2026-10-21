---
title: AI Study Buddy — Brief Addendum
status: draft
created: 2026-09-14
updated: 2026-09-16
---

# Addendum: AI Study Buddy

Supporting detail that doesn't belong in the brief itself but may be useful for downstream planning (PRD, architecture).

## Comparable tools landscape (informal notes, unverified — research, 2026)

Everything below is "what's publicly claimed," not independently tested or confirmed firsthand — see the source list at the end of the Technical gotchas section below, which covers both sections. Confidence varies by source:

**Confidence key:** vendor page = vendor's own description of its own product, unverified. Tertiary source = third-party reference (e.g., Wikipedia), not the vendor's own materials, unverified. Comparison blog = single third-party SEO/comparison article, the weakest source here, unverified.

- **Quizlet AI Flashcard Generator** — (vendor page): uploads notes/PDFs, generates flashcards/study guides/practice tests via a cloud LLM.
- **Google NotebookLM** — (tertiary source): offers "grounded" Q&A over uploaded sources, and is reported to generate summaries, flashcards, quizzes, and narrated video overviews.
- **StudyFetch** — (comparison blog, myquizgpt.com): described as flashcards embedded in a broader AI tutor product, with multiple card formats (term/definition, MCQ, fill-in-the-blank).
- **Taskade** — (vendor page): claims one PDF upload produces six outputs at once (notes, outline, flashcards, quiz, summary, reviewer).

The following is this project's own interpretation of the (unverified) descriptions above, not sourced fact: all four appear to be cloud-hosted and aimed at a similar core loop (upload → summarize/flashcard/quiz). Any read of "differentiation" between them — polish, source-grounding depth, format breadth — is this project's inference from marketing descriptions, not a benchmarked or hands-on comparison.

**Table-stakes vs. differentiator (2026)** — table-stakes = upload → reliable summary + flashcards + quiz where answers don't obviously contradict the source. Candidate differentiators, per the descriptions above: source-grounding/citation quality (NotebookLM), multi-format output breadth (Taskade), tutoring-style interaction (StudyFetch) — none of which this project's MVP needs to feel legitimate.

## Technical gotchas (from research, relevant to future architecture/implementation work)

- Tables and figures flattened into plain text become unreadable or uncitable — naive PDF-to-text extraction loses their structure. (MVP response: disclosed limitation, not solved — see brief.)
- Chunking breaks on structured documents; naive fixed-size chunking can sever the context needed to answer correctly. (MVP response: avoided entirely by scoping to single, reasonably-sized documents — see brief.)
- Hallucination compounds downstream: a misread chart or dropped row propagates errors into every flashcard/quiz item generated from it. (MVP response: source-constrained prompting + disclosed AI-generated notice — see brief.)
- Page-level citation accuracy requires deliberate chunk-to-page-id mapping; it doesn't fall out for free from just calling an LLM on raw extracted text. **Decision (see brief's Success Criteria and PRD FR-4):** real PDF page markers are preserved during text extraction and carried through to the LLM; every returned page reference is validated against those real markers, rejecting any number that wasn't actually supplied. This confirms the citation is a real, preserved marker — it does not by itself prove the citation is the most accurate page for that content, which is checked manually during testing. The exact chunk-to-page-ID mapping mechanics (how markers survive chunking of longer documents) remain deferred to Architecture.

Sources: Taskade PDF Study Tools (2026) blog; Quizlet AI Flashcard Generator product page; NotebookLM (Wikipedia); "9 Best AI Flashcard Generators Compared for 2026" (myquizgpt.com); "The PDF Problem: Why AI Struggles to Read Documents" (Medium); "Designing an OCR pipeline: scanned PDF to chunked text" (dev.to).

## Rejected alternatives

- **Session-only storage of generated outputs** (as opposed to zero persistence) was considered as a slightly friendlier MVP — letting the student review results without immediately exporting them. It was rejected for MVP because it still introduces server-side state and retention questions that zero-persistence avoids entirely; revisit if a "save my results" need turns out to matter in practice.
- **Local/self-hosted LLM** was considered per the assignment's design-decision prompt, but rejected for MVP given the developer's beginner status — a cloud API is simpler to get working correctly first.
