---
title: PRD ↔ Brief Reconciliation
created: 2026-09-16
---

# Reconciliation: PRD (prd.md + addendum.md) vs. Finalized Product Brief (brief.md + addendum.md)

**Documents compared**
- Artifact checked: `prds/prd-G42-eide-2026-09-16/prd.md` + `addendum.md`
- Source input: `briefs/brief-G42-eide-2026-09-14/brief.md` + `addendum.md`

## Overall verdict

The PRD is a faithful, well-structured translation of the brief for the parts that map cleanly onto Features/FRs, Non-Goals, MVP Scope, and Constraints & Guardrails. Section-by-section checks:

- **Scope**: Brief's MVP must-haves (6 bullets) all map 1:1 onto PRD §6.1 In Scope and FR-1 through FR-6. No additions, no omissions.
- **Explicitly postponed** (brief) vs **Out of Scope for MVP** (PRD §6.2): all 7 brief bullets present in the PRD, rationale preserved where the brief gave one (e.g., chunking's "known source of bugs" language survives verbatim in spirit).
- **Key Design Decisions** (brief): Data handling/persistence, Document size & chunking, Tables & figures, and Accuracy & hallucination all carry through faithfully into PRD §8 Constraints & Guardrails, including the "why" (e.g., "nothing to protect access to," "disclosed limitation, not solved," "mitigates, doesn't eliminate").
- **Constraints & risks** (brief): Solo/beginner-developer framing, API cost, hallucination risk, and tech-stack-undecided all land correctly in the PRD (cost and accuracy nearly verbatim; the over-scoping risk becomes SM-C1's counter-metric with its rationale intact).

Five gaps are worth flagging, in descending order of materiality.

## Gaps found

### 1. Success-criteria weighting is restructured, not just reformatted (contradicts brief's stated equal-weighting)

Brief's "Success criteria" is explicit: **"Two lenses, both need to hold"** — a Course/grading lens (sound, well-documented process; testing/QA practice; documentation — "rather than feature completeness or polish") and a Personal lens (works on a real PDF + developer can explain the design). Both are presented as co-equal, non-optional bars.

PRD §7 splits this differently: SM-1 (personal completion) and SM-2 (explainability) are **Primary**, while the content that maps to the brief's course/grading lens becomes **SM-3, Secondary**, with an added hedge not present in the brief: *"This describes what the project produces, not a confirmed grading criterion."* A parallel hedge appears in PRD §8 Process: *"practices carried out through BMAD, not asserted here as confirmed grading mandates."*

This is a real demotion, not a rewording — the brief treats the grading/process lens as equally load-bearing for "success," and the PRD downgrades it to secondary-with-disclaimer. Worth a deliberate confirm from the developer (is this intentional risk-hedging, or should it stay primary per the brief?) before the PRD is finalized.

### 2. The brief's "Problem" narrative (the *why*) is absent from the PRD's Vision

Brief's "The problem" section: study-prep busywork is "manual, repetitive work that most students do every exam season, or skip entirely for lack of time. **The student behind this project feels this directly.**" This is the motivating rationale for why the project exists at all.

PRD §1 Vision goes straight from "what the app does" to "why it's scoped small" (capstone/solo/beginner framing) — it never restates the underlying problem or the personal-motivation framing. The mechanics (upload → generate → results) fully survived; the human "why build this" framing did not. Low-stakes for a solo capstone, but it's exactly the kind of dropped qualitative content the reconciliation check is meant to catch.

### 3. "Cloud LLM, not local" is never stated as a decision in the PRD — only assumed as a fact

Brief's Key Design Decisions calls this out explicitly as a considered decision: *"A cloud LLM API, not a locally-run model — simpler to implement for a first-time programmer,"* reinforced by the addendum's Rejected Alternatives: *"Local/self-hosted LLM was considered per the assignment's design-decision prompt, but rejected for MVP given the developer's beginner status."*

The PRD never states this as a decision anywhere — it just presupposes "cloud LLM" throughout (Vision §1, Cost in §8) without ever surfacing that a local-model alternative was considered and rejected, or why. Since the brief flags this explicitly as one of the assignment's called-out design decisions (not incidental detail), its absence as an explicit decision point in the PRD is a genuine gap — a reviewer reading only the PRD would not know this alternative was weighed.

### 4. Brief addendum's "Rejected alternatives" section has no counterpart in the PRD

Beyond the cloud-vs-local LLM point above, the brief addendum's other rejected alternative — **session-only storage of results**, considered as "a slightly friendlier MVP" and rejected specifically because it "still introduces server-side state and retention questions that zero-persistence avoids entirely" (with an explicit note to "revisit if a 'save my results' need turns out to matter") — doesn't appear anywhere in the PRD or PRD addendum. PRD §8 Privacy states the zero-persistence *decision* well, but the fact that a specific milder alternative was weighed and consciously rejected (with a revisit condition) is lost. This is minor given the PRD's own stated policy of not duplicating brief reasoning (§0), but it's a decision-relevant fact (not just narrative color), and the "revisit if X" condition is the kind of detail downstream stories might want.

### 5. Brief addendum's page-citation technical gotcha isn't carried into the PRD addendum's "Open for Architecture" list

Brief addendum's Technical gotchas flags, with explicit forward-pointing intent: *"Page-level citation accuracy requires deliberate chunk-to-page-id mapping; it doesn't fall out for free from just calling an LLM on raw extracted text. This is worth flagging early for architecture/implementation planning, since 'page-number references' is an MVP must-have."*

PRD FR-4 (Attach Page References) is precisely the feature this risk concerns, and the PRD addendum has an "Open for Architecture" section that would be the natural home for it — but it only lists tech-stack pick and Git-workflow mapping, not this citation-implementation risk. Since the brief addendum explicitly earmarked this fact for the architecture workflow to weigh, and the PRD addendum's stated purpose is exactly to carry forward "context for downstream planning (Architecture...)," this looks like an oversight rather than a deliberate cut — worth adding to the PRD addendum's Open for Architecture list before the Architecture workflow runs.

## Minor / not flagged as gaps

- Brief's "built by a first-time programmer working alone rather than as part of the assumed group" (i.e., deviating from an assumed group-project structure) is compressed in PRD Vision to just "solo capstone project... built by a first-time programmer" — loses the "rather than as part of the assumed group" nuance. Very minor, noted only for completeness (also consistent with the repo's own initial commit message referencing a "gruppeprosjekt" template).
- Brief addendum's sourcing/confidence caveats for the comparable-tools research (vendor page vs. tertiary vs. comparison blog) aren't repeated in the PRD's Non-Goals competitive-positioning bullet — appropriate, since the PRD correctly treats that as out-of-scope research detail rather than a requirement.
