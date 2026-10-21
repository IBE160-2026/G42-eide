---
title: AI Study Buddy — PRD Addendum
status: draft
created: 2026-09-16
updated: 2026-09-16
---

# Addendum: AI Study Buddy (PRD)

Supporting detail that doesn't belong in the PRD's main narrative but is useful context for downstream planning (Architecture, UX, epics and stories).

## Course context (IBE160 "Programmering med KI")

Gathered by the user from the course materials after the brief was finalized. This is background for the Architecture workflow to weigh, not a stack decision made here — the PRD does not pick a tech stack.

- **Version control:** Git is essential to the course. Project work must live in the assigned repository and be pushed to GitHub. (This shows up in the PRD as a process constraint, not here.)
- **Taught technologies (not mandatory unless confirmed elsewhere):** frontend in JavaScript (Node.js), backend in Python. Package managers: npm (Node), uv (Python). Course examples use Next.js (frontend) and FastAPI (backend).
- **AI coding agent:** Claude Code is the course's recommended agent.
- **Development framework:** BMAD v6 is the framework being taught — this PRD and its planning process are already following it.
- **Deployment:** not required for the course project — publishing or hosting is out of scope (reflected as a scope boundary in the PRD).

## Open for architecture

- **Citation mapping:** Page-level citation (FR-4) now has a chosen direction — real page markers are preserved during text extraction and carried through to the LLM, and every returned page reference is validated against those real markers; a citation that isn't one of the real markers is rejected. This confirms the citation is a real, preserved marker, not that it's the most accurate page for the content — that's checked manually during testing (see PRD §9, Open Question 5). The exact chunk-to-page-ID mapping mechanics (how markers survive chunking of longer documents) remain deferred to Architecture. (Original flag carried from the brief addendum's Technical Gotchas.)
- **Tech stack:** Final pick (frontend framework, backend framework, and a hosting-free local run setup) — explicitly deferred to `bmad-architecture`, informed by the course-taught technologies above but not bound by them.
- **Git workflow:** How branching, commit cadence, and PR review if any — since this is solo — map onto the course's version-control expectations.

## Rejected alternatives
*Carried from the finalized product brief's addendum — decision provenance, not open questions.*

- **Local (self-hosted) LLM** — considered per the assignment's design-decision prompt, rejected for MVP given the developer's beginner status: a cloud API is simpler to get working correctly first.
- **Session-only storage of generated outputs** (as opposed to zero persistence) — considered as a slightly friendlier MVP, letting the student review results without immediately exporting them. Rejected because it still introduces server-side state and retention questions that zero persistence avoids entirely; revisit if a "save my results" need turns out to matter in practice.
