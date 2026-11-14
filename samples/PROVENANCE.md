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
