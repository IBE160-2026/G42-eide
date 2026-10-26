---
title: Reconciliation — Course Context + Grading Calibration vs. PRD
created: 2026-09-16
input: "course context (INPUT 1) + stakes/grading calibration (INPUT 2), supplied verbatim mid-conversation"
checked_against:
  - prd.md (prd-G42-eide-2026-09-16)
  - addendum.md (prd-G42-eide-2026-09-16)
---

# Reconciliation: Course Context + Grading Calibration Input vs. PRD

## Method

Read `prd.md` and `addendum.md` in full. Checked each discrete point in INPUT 1 and INPUT 2 against both documents, looking for (1) omissions, (2) overstatement of recommended/taught items as firm requirements, (3) invented grading-rubric detail, and (4) leakage of architecture/tech-stack decisions into the PRD.

## 1. Point-by-point coverage check

### INPUT 1 (course constraints/recommendations)

| Point | Where reflected | Faithful? |
|---|---|---|
| Git essential; work kept in assigned repo, pushed to GitHub | prd.md §1 Vision ("real Git discipline (explicitly required by the course)"); §8 Process ("Git/version control is required by the course... Confirmed course requirement."); addendum.md "Version control" bullet | Yes — correctly stated as a firm, confirmed requirement, matching the source's "essential" framing. |
| JS/Node.js frontend, Python backend, npm/uv, Next.js/FastAPI examples — taught, not mandatory | addendum.md "Taught technologies (not mandatory unless confirmed elsewhere)" bullet, verbatim-equivalent hedge | Yes — correctly hedged. Confirmed via grep that prd.md itself contains zero stack-name mentions (Next.js/FastAPI/npm/uv/Node/Python all absent from prd.md; present only in addendum.md, properly caveated). |
| Claude Code recommended AI coding agent | addendum.md "AI coding agent" bullet | Yes — stated as "recommended," not required. |
| BMAD v6 is the taught development framework | addendum.md "Development framework" bullet | Yes — stated as a fact about the course and about this project's own process, not asserted as a grading mandate. |
| Publishing/deployment not required | prd.md §5 Non-Goals, §6 Out of Scope, §1 Vision; addendum.md "Deployment" bullet | Yes — consistent across all four mentions. |
| Follow BMAD planning/implementation process incl. human review checkpoints, testing/review during implementation, version-controlled artifacts | prd.md §1 Vision, §8 Process (checkpoints/testing framed as "practices carried out through BMAD, not asserted here as confirmed grading mandates"), version-controlled planning artifacts line | Yes — present and deliberately NOT overstated as a confirmed grading requirement, which is the correct calibration per INPUT 2's "do not invent rubric" instruction. |
| Deliberately small, feasible for solo beginner | prd.md §1 Vision, §6.2 (chunking cut "not worth the complexity for a first project"), §7 SM-C1 | Yes. |
| Do not make architecture decisions (defer to Architecture workflow) | prd.md §9 Open Questions item 3 ("Final tech stack... deferred to the Architecture workflow"); addendum.md "Open for Architecture" section | Yes — see §3 below for detailed confirmation. |

**Result: all INPUT 1 points are present and none are overstated.**

### INPUT 2 (stakes/grading calibration)

| Point | Where reflected | Faithful? |
|---|---|---|
| Graded solo university course project, not hobby/commercial | Conveyed in spirit via §0 ("solo, beginner-built capstone project (IBE160)... for a course reviewer assessing process and outcome"), §1 Vision ("solo capstone project for IBE160 at Høgskolen i Molde, built by a first-time programmer"), §5 Non-Goals ("not a course or grading requirement" language implies grading context exists) | Partially — the *substance* (graded, academic, solo) is present throughout, but the PRD never states outright that this is explicitly "not a hobby project or commercial launch" the way INPUT 2 phrased it. This is a soft gap, not a misstatement — see Gap 1 below. |
| Scope small/feasible for beginner, but planning/implementation/testing/documentation/Git taken seriously | §1 Vision (designed, built, tested, documented, explainable); §7 SM-2 Explainability, SM-3 Documented process; §8 Process section | Yes, well covered. |
| Confirmed grading info: difficulty is balanced against available time; easier project = better completion odds but may need more attention to form/presentation to reach highest level | §7 SM-C1 captures the "difficulty balanced against available time" half accurately, attributed correctly ("Per your confirmed course info..."). | **Gap** — the second half of this confirmed grading info (that choosing an easier/smaller project may require *more* attention to form and presentation to reach the top grade) is not reflected anywhere in the PRD. See Gap 2 below. |
| Do not infer/invent grading rubric beyond what was confirmed | §7 SM-3 ("not a confirmed grading criterion"), §5 Non-Goals ("not a course or grading requirement"), §8 Process ("not asserted here as confirmed grading mandates") | Yes — the PRD is notably careful here; no invented rubric detail (no fabricated weighting, criteria, or pass/fail thresholds) was found anywhere in either document. |

## 2. Overstatement check (recommended/taught vs. required)

Checked specifically for whether BMAD checkpoints/testing or any tech-stack name was elevated into a "confirmed requirement," which would misrepresent the source. None found:
- Git/GitHub: correctly the *only* item stated as a firm, confirmed course requirement — matches the source, which was itself unambiguous ("essential," "should be kept... and pushed to GitHub").
- BMAD process (checkpoints, testing/review): explicitly qualified as "practices carried out through BMAD, not asserted here as confirmed grading mandates" (§8) — correct, since INPUT 1 phrased this as something the project "should follow," not a stated course/grading mandate.
- Tech stack names (JS/Node, Python, npm, uv, Next.js, FastAPI): confirmed absent from prd.md entirely; present only in addendum.md, each instance explicitly hedged as "taught," "example," or "not mandatory unless confirmed elsewhere."
- Claude Code / BMAD v6: both stated only as course facts ("recommended," "being taught"), never elevated to product requirements.

## 3. Invented-rubric check

No invented grading-rubric detail was found. The PRD's three grading-adjacent statements (SM-3, SM-C1, §8 Process) each explicitly self-limit to what INPUT 2 actually confirmed (difficulty-vs-time balance) and explicitly flag anything else as *not* a confirmed grading criterion. This matches INPUT 2's explicit instruction not to infer or invent rubric detail.

## 4. Architecture-deferral check

Confirmed honored:
- prd.md contains **zero** mentions of Next.js, FastAPI, npm, uv, Node.js, or Python anywhere in its own body (verified by grep) — all stack references live only in addendum.md.
- prd.md §9 Open Questions, item 3: "Final tech stack (frontend/backend framework, local run setup) — deferred to the Architecture workflow; course-taught technologies noted in `addendum.md` for it to weigh."
- addendum.md opens with an explicit disclaimer: "This is background for the Architecture workflow to weigh, not a stack decision made here — the PRD does not pick a tech stack."
- addendum.md "Open for Architecture" section explicitly defers both the tech-stack pick and the Git-workflow-shape question to `bmad-architecture`.

No architecture decisions are made in either document.

## Gaps found

1. **Minor/soft — "not a hobby project or commercial launch product" framing.** INPUT 2 explicitly stated the project is "not a hobby project or a commercial launch product." The PRD conveys this in spirit (capstone project, course reviewer, first-time programmer, IBE160 references throughout) but never states this contrast outright. Low impact, since nothing in the PRD contradicts it and the academic framing is consistent throughout — flagged for completeness rather than as a faithfulness problem.

2. **Real gap — the "form and presentation" half of the confirmed grading calibration is missing.** INPUT 2's confirmed grading info was two-part: (a) difficulty is balanced against available time, and (b) an easier project gives a better completion chance but "may require more attention to form and presentation to reach the highest level." The PRD's §7 SM-C1 captures only half (a) — it cites "your confirmed course info" for the difficulty/time trade-off but omits the corollary about needing extra polish in form/presentation to reach the top grade when scope is kept small. Since this project deliberately chose a small/easy scope (per SM-C1 itself), this omitted half is arguably the more actionable of the two for a small-scope project — worth surfacing to the user for a possible addendum or Open Questions addition, though it does not misstate anything already there.

No other omissions, overstatements, or invented rubric details were found. All INPUT 1 points are present and correctly calibrated (Git firm; BMAD process, Claude Code, and tech-stack items correctly presented as recommended/taught, not mandatory). Architecture deferral is fully honored in both prd.md and addendum.md.
