# Provenance of the files in `samples/`

This note records where each bundled sample file comes from, who made it, how AI tools were involved, and what it may be used for. It has one section per sample. Later samples (for example the temporary demo fixture of Story 1.13) get their own sections below.

## Sample lecture: `innkjop-og-lager.pdf`

### Files

| File | Role | SHA-256 |
|---|---|---|
| `innkjop-og-lager.pdf` | the sample lecture PDF (pinned in `backend/tests/test_sample_pdf.py`) | `2e831fac413529b552fe97dae13b58f41947d2e99f41b306a3e3cd8686f45e63` |
| `innkjop-og-lager.md` | source text of the lecture | `c4d3f690e08a7050bbc603ce9485551f17af1ed98bd60493c2c0ed348c5da64f` |
| `vareflyt.jpg` | the diagram on page 4 | `65e77aa4471a18230e095ce06815385c2fb21ae6b2e21cff104ba69e4856e63b` |
| `build_sample_pdf.py` | the deterministic build script | (code; reviewed with the tests) |

The PDF is built only from `innkjop-og-lager.md` and `vareflyt.jpg` by `build_sample_pdf.py`:

```
uv run --project backend python samples/build_sample_pdf.py
```

The build is deterministic: the same two inputs always give the same PDF bytes, and the tests check that a rebuild reproduces the pinned SHA-256.

### What it is

- **Title:** *Innkjøp, lagerstyring og vareflyt i verdikjeden*.
- **Language:** Norwegian Bokmål.
- **Pages:** 6 A4 pages. Page 4 is the only image-only page (the diagram); pages 1, 2, 3, 5 and 6 carry text.
- **Nature:** original Norwegian teaching material prepared as the sample lecture for AI Study Buddy. Its examples (the shop, the suppliers "Leverandør A" and "Leverandør B", the figures on page 6) are fictional; no real companies or people are named.

### Who made it

- **The developer** supplied the core ideas, the explanations, the supplier-choice reasoning and the replenishment (reorder-point) calculation, and reviewed and approved the full lecture text on 2026-11-14. The developer also proposed and approved the diagram concept, and reviewed and approved the generated diagram.
- **ChatGPT (GPT-6)**, on 2026-11-14, helped structure, expand and polish the Norwegian lecture draft. Part of the final wording is therefore AI-assisted.
- **The diagram** was generated with ChatGPT's image-generation tool on 2026-11-14 from the developer's approved concept, then reviewed and approved by the developer. It was not hand-drawn by the developer, and it was not copied from any source. It shows a conceptual purchasing and retail process in which purchasing coordinates decisions and orders; it is not a route of physical goods or a map of locations.
- **Claude Code** assisted with the Story 1.12 implementation specification, the transcription of the approved text into `innkjop-og-lager.md`, the build script, the tests and the draft of this note. It did not change the lecture wording except for the three edits the developer approved, listed below.

### Transcription from the approved text

The developer-approved text and diagram are kept outside the repository. The approved text has SHA-256 `8d0ea851b2325945d7eb566639e7ca65f63d603e629413b7d839c00f0d4e5599`; `vareflyt.jpg` is a byte-for-byte copy of the approved diagram. Only these developer-approved changes were made to the text:

- **K1 (formatting only):** the six `---` separators were removed.
- **K2:** the page 4 section, which described the diagram and instructed that page 4 hold only the image, was replaced by the image reference, so page 4 shows only the diagram.
- **K3:** "– utkast til Story 1.12" was removed from the subtitle.

A word-level comparison showed no other difference. Details are in the Story 1.12 specification (`_bmad-output/implementation-artifacts/spec-1-12-add-the-original-norwegian-sample-lecture-pdf.md`, Implementation Notes).

### Background

The topics draw on the course LOG505 Innkjøpsledelse og forhandling at Høgskolen i Molde (Forelesning 1 – Innledning, 11.01.2024) as conceptual background only. That lecture is not in this repository, and the sample was not copied from it: no slides, figures, wording or examples were copied.

### Copyright and permitted use

© the developer. Use is permitted for this course project's demonstration, subject to the course's rules. This is not an open licence.

### Course AI-use rules (U-1): OPEN

The course's rules on AI-assisted content have not been checked yet (open item U-1). The sample is approved for development and testing only and is **not yet approved for submission**. U-1 must be checked before Story 3.2 (the first paid fixture recording) and again before final submission. This note makes no finding on whether the AI assistance meets those rules.

### Approval history

All approvals are by the developer, before the files were committed (AR-20):

- **2026-11-14, G1:** the approved lecture text and diagram supplied; the diagram's content and meaning confirmed.
- **2026-11-14, G2:** the transcription `innkjop-og-lager.md` approved.
- **2026-11-14, G3:** the rendered `innkjop-og-lager.pdf` approved after visual review, with no layout changes.
- **2026-11-14, G4:** this provenance note approved.

## Demo fixture: `demo-ai-output.json` (TEMPORARY)

**TEMPORARY:** `demo-ai-output.json` is a temporary development and test fixture. It is a human-reviewed fixture that was drafted by Claude Code and then reviewed, corrected and approved by the developer; it is **not recorded from a real AI run**.

### Files

| File | Role | SHA-256 |
|---|---|---|
| `demo-ai-output.json` | the TEMPORARY AI-output fixture returned by the demo connector (SHA-256 of its LF-normalised bytes) | `cc18e9f290a3f2ef6d6df74cda0ca921c551e81b397af524f28c8779a4a5ce60` |
| `innkjop-og-lager.pdf` | the approved sample lecture the fixture is based on (pinned in `backend/tests/test_sample_pdf.py`) | `2e831fac413529b552fe97dae13b58f41947d2e99f41b306a3e3cd8686f45e63` |
| `innkjop-og-lager.md` | the approved source text of the sample's text pages (LF-normalised) | `c4d3f690e08a7050bbc603ce9485551f17af1ed98bd60493c2c0ed348c5da64f` |

### What it is

- **Content:** one summary, five flashcards, five quiz items and five key concepts in Norwegian Bokmål, in the AD-9 output format, with page citations.
- **How it was made:** drafted by Claude Code (Anthropic) from the approved sample's text in `innkjop-og-lager.md`, without any real AI-provider call, then reviewed, corrected and approved by the developer. It is **not recorded from a real AI run**.
- **Inputs it represents:** detail level `standard`, output language `nb`.
- **Citations:** only the sample's text pages 1, 2, 3, 5 and 6; page 4 is image-only and is never cited.
- **Derived file:** `demo-response.json`, the exact demo success reply, is generated from this fixture by `backend/scripts/write_fixtures.py` and must be regenerated whenever this fixture or the sample changes.

### Replacement duty

This TEMPORARY fixture must be replaced by a fixture recorded from one approved real AI run, manually reviewed and committed with its own provenance note (date, model ID, inputs, reviewed), before final demo acceptance and submission (C-2, AD-13; Stories 3.1–3.3, recorded in Story 3.2). Until then, nothing may claim that the demo results come from a real AI run.

### Citation review

One row per cited page of every entry, in fixture order. For each row the developer checked that the cited page supports the entry and that the entry's content matches the sample.

| Entry | Page | Page supports entry | Content matches sample | Reviewer | Date |
|---|---|---|---|---|---|
| summary | 1 | yes | yes | project developer | 2026-11-15 |
| summary | 2 | yes | yes | project developer | 2026-11-15 |
| summary | 3 | yes | yes | project developer | 2026-11-15 |
| summary | 5 | yes | yes | project developer | 2026-11-15 |
| summary | 6 | yes | yes | project developer | 2026-11-15 |
| flashcards[1] | 2 | yes | yes | project developer | 2026-11-15 |
| flashcards[2] | 3 | yes | yes | project developer | 2026-11-15 |
| flashcards[3] | 3 | yes | yes | project developer | 2026-11-15 |
| flashcards[4] | 6 | yes | yes | project developer | 2026-11-15 |
| flashcards[5] | 5 | yes | yes | project developer | 2026-11-15 |
| quiz[1] | 3 | yes | yes | project developer | 2026-11-15 |
| quiz[1] | 6 | yes | yes | project developer | 2026-11-15 |
| quiz[2] | 6 | yes | yes | project developer | 2026-11-15 |
| quiz[3] | 2 | yes | yes | project developer | 2026-11-15 |
| quiz[4] | 6 | yes | yes | project developer | 2026-11-15 |
| quiz[5] | 1 | yes | yes | project developer | 2026-11-15 |
| key_concepts[1] | 1 | yes | yes | project developer | 2026-11-15 |
| key_concepts[2] | 2 | yes | yes | project developer | 2026-11-15 |
| key_concepts[3] | 3 | yes | yes | project developer | 2026-11-15 |
| key_concepts[3] | 6 | yes | yes | project developer | 2026-11-15 |
| key_concepts[4] | 5 | yes | yes | project developer | 2026-11-15 |
| key_concepts[5] | 2 | yes | yes | project developer | 2026-11-15 |

### Approval

- **2026-11-15, G1:** the developer (project developer) reviewed and approved the content of all 16 entries and all 22 entry/page citations, after one wording correction (quiz[5] now refers to "innkjøpsavdelingen", as the source does). The approval covers this temporary fixture only; it does not approve a real AI-generated result and does not remove the replacement duty above.
- **G4:** the wording of this section: pending developer approval.

### Course AI-use rules (U-1): OPEN

The course's rules on AI-assisted content have not been checked yet (open item U-1). This fixture is AI-drafted, so it is for development and testing only and is not yet approved for submission.
