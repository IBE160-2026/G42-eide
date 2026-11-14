---
title: 'Story 1.12: Add the original Norwegian sample lecture PDF'
type: 'feature'
created: '2026-11-14'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<!-- APPROVED at Checkpoint 3 by the developer on 2026-11-14 (revision 3); revision 4 (K4 provenance correction, renegotiated and authorized by the developer at Checkpoint 7 on 2026-11-14). The block below is frozen: only the developer can change it. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** the demo (Stories 1.13–1.21) needs a bundled sample lecture that is the developer's own, Norwegian, realistic and safe to publish. Nothing exists yet: there is no `samples/` folder. Stories 1.6–1.11 were built and tested only with generated test PDFs. Story 1.13's temporary fixture must cite real page markers from this sample, and Story 1.14 must serve its exact bytes, so the sample has to exist, and stay fixed, first (C-3, AR-14, AR-20).

**Approach:**
- **The sample:** add `samples/innkjop-og-lager.pdf`, six A4 pages in Norwegian Bokmål, titled *Innkjøp, lagerstyring og vareflyt i verdikjeden*. Page 4 is the only image-only page: a diagram generated from the developer's approved concept and approved by the developer.
- **How it is built:** a small build script, `samples/build_sample_pdf.py`, uses only the existing `pypdf` dependency. It turns the approved lecture text, `samples/innkjop-og-lager.md`, and the approved diagram, `samples/vareflyt.jpg`, into the PDF. The build is deterministic, and the committed PDF is pinned by SHA-256.
- **Provenance:** a note, `samples/PROVENANCE.md`, records authorship, the AI assistance, copyright and permission, the diagram's origin, and that U-1 is still open.
- **Git:** a new `.gitattributes` marks `*.pdf` and `*.jpg` as binary, so line-ending conversion can never change their bytes.
- **Tests:** `backend/tests/test_sample_pdf.py` runs the real stages 1 and 2 on the committed file and checks the page rules, the Norwegian characters, that the PDF holds exactly the approved wording, the integrity of the bytes and the build's reproducibility.
- **Scope:** no production code, no new dependency, no route, no fixture, no frontend change.

## Boundaries & Constraints

**Always:**
- **Content source (P1):** the lecture text is the developer-approved full text from the developer's separate working session. It is supplied to implementation as text. Implementation transcribes it into `innkjop-og-lager.md` with **formatting-only** changes (see "Transcription rules"); every substantive edit needs the developer's explicit approval first. Claude Code never writes, expands or replaces lecture wording, and never works from the page summaries in "Approved page plan".
- **Nothing inserted for tests:** no character, word or sentence is added to the lecture, the source or the PDF to make a test pass. When the approved text lacks something a test would need, the test adapts if the requirement allows it; otherwise the conflict is reported to the developer.
- **No LOG505 material:** the course lecture *LOG505 Innkjøpsledelse og forhandling, Forelesning 1 – Innledning (11.01.2024)* was used only as conceptual background outside the repository. No slide, figure, wording, example or structure from it may be added to any file, prompt or commit.
- **Fictional examples only:** retail scenarios use made-up shops and suppliers (for example "Leverandør A", "Leverandør B"). No real employer, shop chain, brand or person is named.
- **Pages:** exactly 6 A4 pages. Pages 1, 2, 3, 5 and 6 carry text; page 4 is the only image-only page (C-3).
- **Page 4 is image-only:** its content stream draws one image XObject and nothing else. There is no text operator, no `/Font` resource, no caption, header, footer or page number. `extract_text()` returns exactly `""`, not just text that is empty after `strip()`, so deferred item 1.7 L1 (invisible characters) cannot apply.
- **No running elements:** no page numbers, headers or footers on any page.
- **Fixed bytes:** once the developer approves the rendered PDF (gate G3), its SHA-256 is pinned in the tests. Rebuilding from the committed sources reproduces exactly those bytes.
- **Fail closed:** the build script refuses to write a PDF when any rule in "PDF generation" is broken (unsupported markup, a character the font can't show, a word or page that doesn't fit, wrong page structure, a JPEG with metadata, missing font metrics). It never shrinks text, moves content to another page, rewrites or drops characters to make things fit.
- **Overflow goes to the developer:** if approved text doesn't fit its page at the provisional typography, the build stops and the developer decides (shorter text, which is a substantive edit; or a typography change for all pages).
- **Honest AI disclosure:** the provenance note records the developer's original contribution and the AI assistance accurately, including AI-assisted expansion of the wording (D9). It never claims that AI contributed no wording.
- **U-1 stays open:** the provenance note says the course's AI-use rules have not been checked, and that the sample is approved for development and testing only, **not yet for submission**.

**Ask First:**
- Any substantive edit to the approved lecture text (see "Transcription rules"), including shortening it to fit a page.
- Any change of font size, page size, margins or the page plan after approval.
- Adding any dependency, or any file outside the "Code Map" list.
- Re-pinning the SHA-256 after gate G3.

**Never:**
- Changes to `backend/app/`, `backend/pyproject.toml`, `backend/uv.lock`, the frontend, or any existing test.
- Committing the LOG505 lecture, or any part of it.
- Metadata other than `/Producer` in the PDF; EXIF, XMP, IPTC or comment segments in the JPEG.
- Fonts other than the standard Type 1 Helvetica family (`Helvetica`, `Helvetica-Bold`, `Helvetica-Oblique`, `Helvetica-BoldOblique`), not embedded.
- Hand-written font-width tables (D11).
- Network access, randomness, timestamps or environment-dependent values in the build.
- `_bmad-output/planning-artifacts/architecture/technology.md` as a source.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| `epics.md:742-744` (Story 1.12 AC1) | the developer's own core lecture content; 5–8 pages; exactly one image-only page | P1, D1, D3, D9; matrix: page count, page 4 and text-page rows |
| `epics.md:746-749` (AC2) | a provenance note in `samples/` records authorship, licence and AI assistance, and states that U-1 is still open | "Provenance note"; matrix: provenance row |
| `epics.md:751-755` (AC3) | pytest runs stages 1 and 2: stage 1 passes within the limits; exactly one page in `skipped_pages`; æ, ø, å extracted correctly | matrix: stage 1, stage 2 and character rows |
| `epics.md:757` (AC4) / AR-20 | the developer approves the content before it is committed | gates G2–G5 |
| `epics.md:123-130` (C-3) | original Bokmål lecture on inventory management and supply-chain logistics; developer provides or substantially authors the core content, Claude Code may help with structure, language and formatting; tests for characters, page limit, `skipped_pages`, and identical bytes for `GET /api/demo/sample.pdf` | D1, D9, P1, pinned SHA-256 (prepares Story 1.14); see "Points for the developer's acknowledgement" |
| `epics.md:153` (U-1) | course AI-use rules unchecked; development and testing only | "Provenance note" |
| `epics.md:206` (AR-20) / AD-19 | own or openly licensed samples, with source and licence noted; no copyrighted documents | Never list, D8, D10, "Provenance note" |
| AD-13 (`ARCHITECTURE-SPINE.md:156`) / AR-14 | the sample is the developer's original Bokmål lecture; processed by `POST /api/demo`; served read-only to page links | "Provides for" |
| Structural seed (`ARCHITECTURE-SPINE.md:270`) | `samples/` holds the sample PDF, fixtures and the provenance note | Code Map; the build sources are an addition (D5, OQ7) |

## Decisions (developer, 2026-11-14)

- **D1 — topic and title:** *Innkjøp, lagerstyring og vareflyt i verdikjeden*. Purchasing, inventory control and the flow of goods in a retail value chain; this meets C-3's "inventory management and supply-chain logistics".
- **D2 — filename:** `samples/innkjop-og-lager.pdf` (ASCII only, lower case).
- **D3 — six A4 pages**, page 4 image-only; see "Approved page plan".
- **D4 — build method:** a reproducible Python script using the existing `pypdf` only. No new dependency.
- **D5 — committed sources:** the source text, the diagram JPEG and the build script are committed next to the PDF in `samples/`; the script stays in `samples/` (OQ7).
- **D6 — `.gitattributes`:** `*.pdf binary` and `*.jpg binary`.
- **D7 — SHA-256:** documented now, pinned only after the developer approves the final rendered PDF (gate G3).
- **D8 — copyright:** the developer keeps the copyright and permits use for the course demonstration, subject to the course's rules. No open licence.
- **D9 — authorship and AI disclosure (OQ2, OQ8):**
  - **The developer** supplied the core ideas, the explanations, the supplier-choice reasoning and the replenishment (reorder-point) calculation, approved the full text on 2026-11-14, and approved the diagram concept.
  - **ChatGPT (GPT-6)** assisted on 2026-11-14 with structuring, expanding and polishing the Norwegian lecture draft.
  - **Claude Code** assisted with this implementation specification; later implementation assistance (transcription, build script, tests, provenance draft) is recorded when it happens.
  - **The diagram:** the developer proposed and approved the concept; ChatGPT's image-generation tool generated the image on 2026-11-14; the developer reviewed and approved the result and supplies it as an approved JPEG (OQ1).
- **D10 — LOG505:** named in the provenance note as conceptual background only, kept outside the repository, with nothing copied. No lecturer name.
- **D11 — font metrics (review correction A):** line widths are measured with the Adobe Core 14 metrics that ship inside the locked `pypdf` (`pypdf._codecs.core_font_metrics.CORE_FONT_METRICS`, pypdf 6.21.4), not with hand-written tables. See "Design Notes" for the options considered.
- **D12 — typography (OQ4, provisional):** A4, 20 mm margins, body 11 pt, page headings 16 pt. Title and subheading sizes are proposals.
- **D13 — characters (OQ3):** the tests require `æ`, `ø` and `å`. `Æ`, `Ø` and `Å` are required only if they occur in the approved source.
- **D14 — metadata (OQ5):** the PDF's document information holds only `/Producer`.
- **D15 — size (OQ6):** the PDF is at most 2 MiB.
- **Architecture source:** `ARCHITECTURE-SPINE.md` only (AD-13, AD-19) and `epics.md` (C-3, U-1, AR-14, AR-20).

## Approved page plan

These summaries identify each page. **They are not lecture text** and are never used to generate wording (P1).

| Page | Heading (as in the approved text) | Covers |
|---|---|---|
| 1 | Innkjøpets strategiske rolle i verdikjeden | purchasing as a strategic function; coordinating the flow of goods; quality, profitability, liquidity; demand, supplier capacity, risk management. The document title stands above this heading. |
| 2 | Leverandørvalg og leveringspålitelighet | fictional Supplier A (cheaper, unreliable) versus Supplier B (slightly dearer, reliable); stockouts, lost sales, safety-stock needs, planning, total cost |
| 3 | Lagerstyring og bestillingsplanlegging | tied-up capital, holding costs, markdowns, obsolete stock, flexibility; sales history, seasonality, lead times, safety stock, reorder points |
| 4 | — (image only) | the approved diagram (see "The diagram"; origin in D9) |
| 5 | Sesonginnkjøp og de seks riktige | the Christmas season: timing, demand forecasting, assortment, storage capacity, exit strategy, contingency planning; right quality, quantity, price, place, time and supplier |
| 6 | Praktisk eksempel: Bestillingspunkt i en butikk | average daily sales 30 units; lead time 5 days; safety stock 50 units, also given in the approved two-column table (Faktor / Verdi); reorder point (30 × 5) + 50 = 200 units; inventory position; reorder point versus order quantity |

The headings, the page 6 table and the page 6 figures are tested exactly as they appear in the approved text, not as summarised here.

## The diagram (page 4)

- **What it shows:** a **conceptual purchasing and retail process** in five steps, with the developer-approved labels Leverandør → Innkjøp → Lager → Butikk → Kunde. The sequence shows how the process hangs together, **not a route that physical goods travel**, and not five separate physical locations or transport legs.
- **Physical goods versus decisions:** physical goods flow from suppliers through logistics, storage and retail operations to the customer. **Innkjøp** (purchasing) coordinates decisions and orders; it is a planning and decision function, not a place goods pass through.
- **What the image must not imply:** that physical goods pass through the purchasing department. The developer's approved JPEG makes the distinction visible, for example by drawing the link into and out of Innkjøp as decisions and orders rather than goods, or with a short legend inside the image. How it does so is the developer's choice; the check is part of gates G1 and G3.
- **Transport:** implied by the connections between the goods steps, not drawn as a box.
- **Reverse flow:** information flows back: customer demand, sales data and purchasing decisions.
- **Supply:** the developer supplies the approved diagram as a JPEG (P2): baseline JPEG, about 1,600–2,400 px wide, exported without metadata. Claude Code does not generate or edit the image.
- **Labels:** all labels are pixels in the image. Nothing about the diagram is drawn as PDF text, so no automated test can check its meaning; the developer's review at G1 and G3 does.

## Transcription rules

The approved text is supplied as text (P1) and transcribed into `samples/innkjop-og-lager.md`.

**Formatting-only (allowed; each listed at G2):**
- adding, removing or changing markup symbols (`#`, `##`, `###`, `-`, `**`, `*`) and blank lines;
- choosing heading levels, and turning the approved text's list layout into `-` or `1.` items with the same words;
- joining lines that the approved text broke only for layout;
- normalising whitespace (repeated spaces, trailing spaces, tabs);
- normalising a two-column table's pipes, cell padding and separator row to the form in "Source format", with the same cells in the same order;
- placing the page breaks where the approved text starts each page.

**Substantive (each needs the developer's explicit approval before G2):**
- any change to a word, number, punctuation mark or character, including replacing a character the font can't show (for example `→`, `≈`, `−` or `≤`);
- adding, removing, splitting, merging or reordering sentences;
- moving text from one page to another;
- shortening text to fit a page;
- adding, removing, reordering or editing table rows, columns or cells;
- turning a table into prose or a list, or any other structure the source format doesn't support (for example a table with more than two columns) into a different structure.

**Record:** the formatting-only list and every approved substantive edit are written into "Implementation Notes" in this spec. At G2 the developer receives a word-level comparison of the approved text and the source: after removing markup and normalising whitespace, the two word sequences must be identical, except for approved substantive edits.

## Source format (`samples/innkjop-og-lager.md`)

UTF-8 without a byte-order mark. The script reads it, turns every `\r\n` into `\n` (so Windows checkouts with `core.autocrlf=true` build the same bytes as CI), and rejects any other `\r`. Lines:

- `# <title>`: exactly once, the first non-blank line; drawn at the top of page 1.
- `## <heading>`: starts a new text page; exactly five.
- `### <subheading>`: a subheading within a page.
- `![](vareflyt.jpg)`: exactly once, alone on its line, between the third and the fourth `##` page. It makes page 4. The alt text is empty, so the source holds no unapproved wording.
- `- <text>`: a bullet item; `1. <text>` (any number): a numbered item, drawn as written. One list level only.
- **Two-column table:** consecutive lines starting with `|`, preceded and followed by a blank line (or the page's end), in exactly this form:
  - line 1, the header row: `| <cell> | <cell> |`;
  - line 2, the separator: `|---|---|` (each part three or more `-`, optional spaces around them, no `:` alignment marks);
  - one or more body rows: `| <cell> | <cell> |`.

  Every row has exactly two non-empty cells. Cells are trimmed and hold plain text only: no emphasis, no `|` inside a cell. The approved page 6 table (`Faktor | Verdi`, then three rows) is the case this supports.
- any other non-blank line: paragraph text. Consecutive lines join into one paragraph; a blank line ends it.
- **Inline emphasis:** `**bold**`, `*italic*` and `***bold italic***` spans, balanced and not nested otherwise. They select the font; the asterisks are never drawn. Not allowed in table cells.

**Errors:** any other line starting with `#`, `>`, `!` or `<`; a table line that breaks the table rules (a missing or malformed separator, `:` alignment marks, a row with fewer or more than two cells, an empty cell, emphasis in a cell, no blank line around the table); nested lists; unbalanced or nested emphasis; `__`, `_x_` emphasis or backticks. When the approved text uses an unsupported structure, transcription stops and the developer decides (a substantive edit).

## PDF generation (`samples/build_sample_pdf.py`)

- **Interface:** a pure function `build_pdf(source: str, jpeg: bytes) -> bytes` that does no file I/O. When the script is run directly, `main()` reads `innkjop-og-lager.md` and `vareflyt.jpg` from its own folder and writes `innkjop-og-lager.pdf` there. Run with `uv run --project backend python samples/build_sample_pdf.py`.
- **Page:** A4, `595.28 × 841.89` pt; 56.69 pt (20 mm) margins on all sides (D12).
- **Fonts:** the Helvetica family, Type 1, `/WinAnsiEncoding`, not embedded. Title 20 pt bold; page heading 16 pt bold; subheading 12 pt bold; body 11 pt with 15 pt leading. Bullets use `•` with a hanging indent (D12).
- **Characters:** every drawn character must be a printable WinAnsi (cp1252) character with a width in the pypdf metrics: printable ASCII and the printable characters from 0x80 to 0xFF, except the no-break space and the soft hyphen. That includes `æøåÆØÅ`, `–`, `—`, `«»`, `“”`, `‘’`, `×`, `•` and `…`. Anything else (for example `→`) is an error, not a replacement.
- **Metrics (D11):** widths come from `CORE_FONT_METRICS[<font>].character_widths`, in 1/1000 em. If the module, a font or a character's width is missing, the build fails with a clear error. The pinned-hash test catches any change in the metrics.
- **Wrapping:** at spaces only, measured with the metrics, across emphasis spans; no hyphenation, so every word extracts whole. A single word wider than the text width is an error.
- **Overflow:** if a page's content doesn't fit between the margins, the build fails and names the page. It doesn't shrink text or continue onto a new page.
- **Lines:** each line is drawn at an absolute position; emphasis spans inside a line are consecutive `Tj` operators with font switches and no gaps, so extraction gives one line per drawn line.
- **Tables:** each table row is one line at the body size and leading. The header row is set in `Helvetica-Bold`, body rows in `Helvetica`. Column 1 starts at the left margin; column 2 starts at a fixed x: the left margin plus the widest column-1 cell (measured with the metrics, header in bold) plus a 24 pt gap. Each cell is one `Tj` at its absolute position; cells never wrap. If any row is wider than the text width, the build fails. A 0.5 pt horizontal rule, drawn with path operators (no text), runs under the header row across the table's width. A blank body-size line of space stands before and after the table. Checked at spec time in memory: pypdf extracts such a row as `<cell 1> <cell 2>` on its own line, and the rule does not change the extracted text.
- **Page 4:** the JPEG is embedded unchanged as an image XObject with `/Filter /DCTDecode`. Width, height, colour components (1 = `/DeviceGray`, 3 = `/DeviceRGB`) and bit depth (8) come from the JPEG's SOF0 header, read with the standard library. The image is scaled to fit inside the margins, keeping its aspect ratio, and centred. The content stream is exactly `q <a> 0 0 <d> <e> <f> cm /Im1 Do Q`.
- **JPEG rules:** baseline (SOF0) only; it must contain no APP1 (EXIF/XMP), APP13 (IPTC) or COM segments. A JPEG that breaks a rule is an error, not silently cleaned; the developer re-exports it.
- **Metadata and determinism (D14):** pypdf 6.21's default output was checked at spec time to be byte-identical across runs, with no `/ID` and only `/Producer (pypdf)`. The script adds no metadata, no date and no `/ID`. Object order follows the page order; the text pages share one fixed font resource set.

## Provenance note (`samples/PROVENANCE.md`)

In English (technical documentation), with one section per file so Story 1.13 can add its TEMPORARY fixture section. Claude Code drafts it; the developer approves the wording at G4. The section for the sample records:

- **Files:** `innkjop-og-lager.pdf` (with its SHA-256), its sources `innkjop-og-lager.md` and `vareflyt.jpg`, and `build_sample_pdf.py`.
- **Title, language, page count, image-only page:** *Innkjøp, lagerstyring og vareflyt i verdikjeden*, Bokmål, 6 pages, page 4.
- **Developer's contribution (D9):** the core ideas, the explanations, the supplier-choice reasoning and the replenishment calculation; approval of the full text on 2026-11-14; the diagram concept, and review and approval of the generated image.
- **AI assistance (D9):** ChatGPT (GPT-6), on 2026-11-14, helped structure, expand and polish the Norwegian lecture draft, so part of the final wording is AI-assisted. Claude Code assisted with the implementation specification and, as recorded at implementation, with transcription into the source format, the build script, the tests and the draft of this note; it did not change the lecture wording except for approved edits listed in the spec.
- **Diagram:** generated with ChatGPT's image-generation tool on 2026-11-14 from the developer's approved concept, then reviewed and approved by the developer; not copied from any source; a conceptual purchasing and retail process in which purchasing coordinates decisions and orders, not a route of physical goods or a map of locations.
- **Background (D10):** the topics draw on the course LOG505 Innkjøpsledelse og forhandling (Forelesning 1 – Innledning, 11.01.2024) as conceptual background only. The lecture isn't in the repository; no slides, figures, wording or examples were copied.
- **Examples:** fictional; no real companies or people.
- **Copyright (D8):** © the developer; use permitted for this course project's demonstration, subject to the course's rules. Not an open licence.
- **U-1 OPEN:** the course's rules on AI-assisted content haven't been checked. The sample is approved for development and testing only, **not yet for submission**. Check before Story 3.2 and again before final submission.
- **Approval:** content approved by the developer on a date given at gate G4, before the commit (AR-20).

## Points for the developer's acknowledgement (review correction F)

Recorded here; nothing is decided or changed by this spec:
- **C-3 and the AI assistance:** C-3 (`epics.md:126`) asks that the developer provides or substantially authors the core lecture content, and names the help Claude Code may give (structure, language and formatting). It doesn't address assistance from other AI tools. The authorship record (D9) is factual: the developer supplied substantial original content (the core ideas, explanations, supplier-choice reasoning and replenishment calculation), and ChatGPT (GPT-6) assisted with structuring, expansion and Norwegian wording. This spec makes **no finding** that the assistance does or doesn't meet C-3 or the course's rules. Whether it is acceptable for submission depends on the course's actual AI-use rules: that is **U-1, unresolved until those rules are checked**. Until then the sample is for development and testing only. No requirement and no part of the approved text or the authorship record is changed.
- **AC3 and the letters æ, ø, å:** AC3 requires that æ, ø and å are extracted correctly. If the approved text happened to contain no `æ` (or `ø`, `å`), the requirement couldn't be met without changing the text. Nothing is inserted (correction C); this would go to the developer.

## Approval gates

- **G0:** this spec approved and frozen (Checkpoint 1).
- **G1 — prerequisites supplied:** P1 the full approved lecture text, including the page 6 table; P2 the approved diagram JPEG, which the developer confirms shows the five approved labels and the reverse information flow, and doesn't imply that physical goods pass through purchasing ("The diagram"). Implementation doesn't start without both. (The AI-tool details, formerly P3, are recorded in D9.)
- **G2 — transcription:** the developer reviews the word-level comparison and the formatting-only list, and confirms the source matches the approved text, including the table's cells, apart from approved edits.
- **G3 — rendered PDF:** the developer looks at the built PDF (layout, characters, the page 6 table, the diagram and its meaning, nothing cut off) and approves it; only then is the SHA-256 pinned.
- **G4 — provenance:** the developer approves the wording of `PROVENANCE.md`.
- **G5 — commit:** the usual approval of the exact staged file list.

## I/O & Edge-Case Matrix

Unless a row says otherwise:
- **Files:** read from `SAMPLES = Path(__file__).resolve().parents[2] / "samples"`, so the tests work from any working directory (CI runs pytest in `backend/`).
- **Build script:** loaded with `importlib.util.spec_from_file_location` from `SAMPLES / "build_sample_pdf.py"`. Tests call `build_pdf` and its parser only; no test writes a file.
- **Stages:** the real `validate_bytes` and `extract_document`, with the default `Settings` limits (`max_pdf_pages` 80, `max_text_chars` 200,000).
- **Text comparison:** "normalised" means `" ".join(text.split())`. "Rendered source" means the source with markup removed, bullets as `•`, numbered items as written, and each table row (header first, the separator dropped) as its two cells joined by one space, in reading order.
- **Expected values** (headings, the page 6 calculation, which capitals occur) are taken from the approved source, never invented.

| Scenario | Input | Expected Output / Behavior | Error Handling |
|----------|-------|---------------------------|----------------|
| File present | `samples/innkjop-og-lager.pdf` | exists; starts with `%PDF-`; size ≤ 2 MiB | N/A |
| Pinned bytes | the PDF bytes | SHA-256 equals the pinned constant | N/A |
| Reproducible build | `build_pdf(md text, jpg bytes)` | returns bytes identical to the committed PDF | N/A |
| Reproducible build, CRLF source | the md text with every `\n` replaced by `\r\n` | identical bytes to the row above | N/A |
| Stage 1 | `validate_bytes(pdf, "innkjop-og-lager.pdf", max_pdf_pages=80)` | `CheckedPdf` with `page_count == 6` | N/A |
| Stage 1 at the edge | `max_pdf_pages=6`, then `5` | 6 passes; 5 raises `file_too_large` with `limit="pages"` (proves the count is exact) | `PassFailure` |
| Stage 2 pages | `extract_document(checked, max_text_chars=200000)` | `kind == "pdf"`; `skipped_pages == (4,)`; `supplied_pages == (1, 2, 3, 5, 6)` | N/A |
| Stage 2 markers | the extracted text | page markers appear exactly for 1, 2, 3, 5, 6, in that order; no marker for 4 | N/A |
| Page 4 truly empty | `reader.pages[3]` | `extract_text() == ""`; no `/Font` in its resources; exactly one XObject, an `/Image` with `/Filter /DCTDecode`; content stream holds no `BT` | N/A |
| Text pages | pages 1, 2, 3, 5, 6 | non-empty after `strip()`; no image XObject | N/A |
| Source fidelity | per text page: normalised `extract_text()` versus the normalised rendered source of that page | identical: the PDF holds exactly the approved wording, nothing dropped, added or reordered | N/A |
| Page size | every page | MediaBox `[0 0 595.28 841.89]` | N/A |
| Norwegian characters | all extracted text | `æ`, `ø` and `å` each occur; each of `Æ`, `Ø`, `Å` occurs if and only if it occurs in the source | N/A |
| Headings | normalised text of each text page | page 1 contains the title; each text page contains its `##` heading from the source | N/A |
| Page 6 calculation | normalised page 6 text | contains the reorder-point calculation exactly as written in the source | N/A |
| Page 6 table | `extract_text()` of page 6, split into lines | the header row and each body row of the source's table appear as consecutive lines `<cell 1> <cell 2>`, in source order, exactly as in the source (for the approved table: `Faktor Verdi`, then its three rows) | N/A |
| Table layout | the page 6 content stream | the header cells use `Helvetica-Bold` and body cells `Helvetica`; all column-2 cells start at the same x; one path rule under the header row | N/A |
| No mis-decoding | all extracted text | contains no `�`, `Ã`, `Â` or `\x00` | N/A |
| No pypdf warnings | stages 1 and 2 on the sample, under `caplog` and `warnings.catch_warnings(action="error")` | no `pypdf` record at WARNING or above; no Python warning | N/A |
| Size limits | the extracted text | total original length well under `max_text_chars` | N/A |
| No personal metadata | `reader.metadata`; PDF and JPEG bytes | metadata keys are only `/Producer`; neither file contains `Exif`, `<x:xmpmeta` or `Photoshop 3.0` | N/A |
| Build: bad character | source with `→` | `ValueError` naming the problem, not the text | `ValueError` |
| Build: page overflow | a page with far too much text | `ValueError` naming the page; no output | `ValueError` |
| Build: overlong word | one word wider than the text width | `ValueError` | `ValueError` |
| Build: wrong structure | 4 or 6 `##` pages; no image line; image line in the wrong place | `ValueError` | `ValueError` |
| Build: unsupported markup | a quote (`>`), a nested list, unbalanced `**`, a backtick | `ValueError` | `ValueError` |
| Build: table rules | a three-column row; a missing separator; a separator with `:`; an empty cell; `**` in a cell; no blank line before the table; a row wider than the text width | `ValueError` | `ValueError` |
| Build: emphasis | a paragraph with `**bold**` and `*italic*` spans | the asterisks are not in the extracted text; the words are, in order | N/A |
| Build: JPEG rules | a JPEG with an APP1 segment; a progressive (SOF2) JPEG; bytes that aren't a JPEG | `ValueError` | `ValueError` |
| Build: metrics missing | `CORE_FONT_METRICS` patched to lack `Helvetica` | a clear error; no output | `ValueError` |
| Git attributes | `.gitattributes` at the repository root | contains the lines `*.pdf binary` and `*.jpg binary` | N/A |
| Provenance | `samples/PROVENANCE.md` | names `innkjop-og-lager.pdf`, `vareflyt.jpg` and the pinned SHA-256; contains "U-1" and states the sample is not yet approved for submission; names ChatGPT (GPT-6) and ChatGPT's image-generation tool | N/A |
| Existing suite | all existing tests | pass unchanged (959 at spec time); `uv.lock` unchanged | N/A |

</frozen-after-approval>

## Code Map

- `samples/innkjop-og-lager.pdf` (new, binary) -- the sample. Built, approved at G3, then pinned.
- `samples/innkjop-og-lager.md` (new) -- the approved lecture text in the source format (P1, G2).
- `samples/vareflyt.jpg` (new, binary) -- the developer's approved diagram (P2).
- `samples/build_sample_pdf.py` (new) -- `build_pdf` and `main`; imports only the standard library and `pypdf`.
- `samples/PROVENANCE.md` (new) -- the provenance note (G4).
- `backend/tests/test_sample_pdf.py` (new) -- the matrix rows.
- `.gitattributes` (new) -- `*.pdf binary`, `*.jpg binary`.
- `backend/app/pipeline/stage1_validate.py:102` `validate_bytes`; `stage2_extract.py:47` `extract_document`. Read-only.
- `backend/app/config.py:85-87` default limits. Read-only.
- `backend/.venv/.../pypdf/_codecs/core_font_metrics.py` -- `CORE_FONT_METRICS`, the Adobe Core 14 widths used by D11. Read-only, from the locked dependency.
- `backend/tests/_pdf.py`, `backend/tests/test_stage2_extract.py:174` -- prior art: Helvetica/WinAnsi text pages and image-only pages built with pypdf, with æøå extracted exactly. Read-only.

## Tasks & Acceptance

**Execution** (after G0 and G1):
- [ ] `.gitattributes` -- first, before any binary is added -- D6.
- [ ] `samples/build_sample_pdf.py` -- the parser (including the two-column table), the generator and its checks -- D4, D11, "Source format", "PDF generation".
- [ ] `samples/innkjop-og-lager.md` -- transcription of the approved text, with the formatting-only list and the word-level comparison -- P1, "Transcription rules", G2.
- [ ] `samples/vareflyt.jpg` -- the developer's JPEG, checked by the script's JPEG rules -- P2.
- [ ] Build `samples/innkjop-og-lager.pdf`; on overflow, stop and ask; developer review -- D12, G3.
- [ ] `backend/tests/test_sample_pdf.py` -- one test, or one parametrised test, per matrix row; pin the SHA-256 after G3 -- D7.
- [ ] `samples/PROVENANCE.md` -- with the pinned SHA-256; developer approval -- D9, G4.

**Acceptance Criteria:**
- Given the backend, when `uv sync --locked && uv run pytest -q` run, then all tests pass (the existing 959 plus the new ones), also with `-W error`, with no new dependency and an unchanged `uv.lock`.
- Given a fresh clone, on Windows with `core.autocrlf=true` or on Linux, when the build script runs, then it reproduces the pinned bytes, and `git ls-files --eol samples/` shows the PDF and JPEG as `-text`.
- Given the repository, when compared with the spec commit, then only the seven files above and this spec changed. Separately approved administrative entries may be added at later checkpoints.

## Dependencies & deferred work

- **Depends on:** Story 1.6 (stage 1) and Story 1.7 (stage 2), both merged; the existing `pypdf` dependency.
- **Provides for:**
  - **Story 1.13:** the sample for `POST /api/demo` (filename `innkjop-og-lager.pdf`, `source="sample"`); its temporary fixture may cite only pages 1, 2, 3, 5 and 6, and stage 5 enforces this. `PROVENANCE.md` gets its TEMPORARY fixture section there.
  - **Story 1.14:** the exact bytes for `GET /api/demo/sample.pdf`; the pinned SHA-256 can back its identical-bytes test.
  - **Any later change to the PDF** invalidates the 1.13 fixture and `demo-response.json`, and needs a new G3 and re-pinning.
- **Stays open:** U-1 (`issues.md:19`); `issues.md:6` (this story covers only the PDF half; the fixture half is Story 1.13 and later 3.2); 1.7 L1 (not reachable for page 4, which extracts to exactly `""`); the pypdf warning-logging item (Story 2.1; this story only asserts that the sample causes none).
- **Not part of this story:** the demo connector, routes, fixtures, frontend, README.

## Open questions

None of OQ1–OQ8 remains open; the developer's answers (2026-11-14) are recorded in D5, D9, D12–D15 and "The diagram". The two items in "Points for the developer's acknowledgement" need the developer's acknowledgement at approval.

## Implementation Notes

<!-- Filled during implementation: the formatting-only transcription list, approved substantive edits, the G2/G3/G4 approval dates and the pinned SHA-256. -->

- **Approved inputs (Checkpoint 5, 2026-11-14):** kept outside the repository, unchanged, in `C:\Users\odeib\OneDrive\Skrivebord\story-1-12-input\`:
  - `innkjop-og-lager-godkjent.md`, 9,477 bytes, SHA-256 `8d0ea851b2325945d7eb566639e7ca65f63d603e629413b7d839c00f0d4e5599`;
  - `vareflyt.jpg`, 454,137 bytes, SHA-256 `65e77aa4471a18230e095ce06815385c2fb21ae6b2e21cff104ba69e4856e63b` (baseline JPEG, 1774 × 887, RGB, no EXIF/XMP/IPTC/comment segments).
- **Transcription decisions (developer, Checkpoint 7, 2026-11-14):** to be applied to `samples/innkjop-og-lager.md` only, and reported in full at G2:
  - **K1 (formatting-only):** remove the six `---` separators (input lines 5, 33, 66, 102, 120, 165).
  - **K2 (substantive, approved):** replace the page 4 section (input lines 104–118: the heading "Side 4 – Vareflyt i detaljhandelen", the production instruction, the arrow line and the diagram description) with the single line `![](vareflyt.jpg)`. The original text stays unchanged in the external input file.
  - **K3 (substantive, approved):** remove only "– utkast til Story 1.12" from the subtitle (input line 3); the rest of the subtitle is kept.
  - **No other change** to the approved wording is authorized; the G2 word-level comparison may differ from the input only by the K2 and K3 words.
- **G1 — satisfied (developer, Checkpoint 7, 2026-11-14):** P1 and P2 are supplied. The developer reviewed and approved the generated diagram, which shows Leverandør, Innkjøp, Lager, Butikk and Kunde, includes the reverse information flow, and explains that purchasing is a coordination and decision-making function, not a physical location goods pass through. The independent reviewer found its meaning acceptable.
- **G2 — approved (developer, 2026-11-14):** the transcription `samples/innkjop-og-lager.md` (183 lines, 8,648 bytes, SHA-256 `c4d3f690e08a7050bbc603ce9485551f17af1ed98bd60493c2c0ed348c5da64f`) is accepted.
  - **Changes applied:** only K1 (six `---` separators removed, plus the six double blank lines they left collapsed to single blank lines, whitespace only), K2 (input lines 104–118 replaced by `![](vareflyt.jpg)`) and K3 (only "– utkast til Story 1.12" and its preceding space removed from the subtitle). The mechanical word-level comparison found no other difference; the 1,031 lecture words outside K2/K3 are identical.
  - **Diagram copy:** `samples/vareflyt.jpg` is a byte-for-byte copy, SHA-256 `65e77aa4471a18230e095ce06815385c2fb21ae6b2e21cff104ba69e4856e63b`.
  - **Original inputs:** both files in the external input folder are unchanged; their SHA-256 hashes still match the values recorded at Checkpoint 5.
- **G3 — approved (developer, 2026-11-14):** the six-page `samples/innkjop-og-lager.pdf` passed the developer's visual review with no layout changes requested. Approved PDF: 471,258 bytes, SHA-256 `2e831fac413529b552fe97dae13b58f41947d2e99f41b306a3e3cd8686f45e63`, built by `samples/build_sample_pdf.py` from the G2-approved source and the approved JPEG. This SHA-256 is pinned in `backend/tests/test_sample_pdf.py` (Checkpoint 13).
- **G4 — approved (developer, 2026-11-14):** `samples/PROVENANCE.md` (Checkpoint 14) approved; its approval history now records G4. It is checked by `test_sample_provenance`, which completes the 33-row matrix.

## Spec Change Log

- **2026-11-14, revision 2 (Checkpoint 2A):** applied the developer's answers and review corrections A–F:
  - **OQ1:** the diagram is supplied by the developer as an approved JPEG; P3 removed from G1.
  - **OQ2, OQ8:** D9 records the developer's contribution and ChatGPT (GPT-6) assistance with structuring, expanding and polishing on 2026-11-14; the provenance note discloses AI-assisted wording; U-1 stays open.
  - **OQ3:** D13, the capitals are required only if present in the source.
  - **OQ4:** D12 provisional typography; overflow goes to the developer.
  - **OQ5–OQ7:** D14 `/Producer` only; D15 2 MiB; the script stays in `samples/`.
  - **A:** D11, metrics from pypdf's bundled Adobe Core 14 data instead of hand-written tables; character set widened to all printable WinAnsi characters with a metrics entry.
  - **B:** new "Transcription rules"; inline emphasis supported; empty image alt text; a "Source fidelity" test row.
  - **C:** "Nothing inserted for tests"; the heading, calculation and capital-letter rows take their expected values from the source.
  - **D:** new "The diagram" section: a simplified conceptual flow of roles and functions, not five physical locations.
  - **E:** status stays `draft`; the frozen block is replaced by pending-approval markers until the developer approves.
  - **F:** new "Conflicts to resolve" section (C-3 and AI expansion; AC3 if a letter is missing).
  - **Matrix:** 26 → 30 rows.
- **2026-11-14, revision 3 (Checkpoint 2B):** applied the independent review's three findings:
  - **Page 6 table:** the source format supports exactly one structure more, a plain two-column table with a header row; it is drawn as one line per row with a fixed column-2 position, a bold header and a ruled line, using the existing fonts and metrics. Tables were removed from the error list; table rules, transcription rules, the source-fidelity definition and three matrix rows (page 6 table, table layout, table build errors) were added.
  - **Diagram semantics:** the five steps are a conceptual purchasing and retail process; physical goods flow through suppliers, logistics, storage and retail; purchasing coordinates decisions and orders; the image must not imply goods pass through purchasing (checked at G1 and G3).
  - **C-3:** "Conflicts to resolve" became "Points for the developer's acknowledgement"; the spec makes no compliance finding; U-1 stays unresolved until the course rules are checked. The authorship record (D9) is unchanged.
  - **Matrix:** 30 → 33 rows.
- **2026-11-14, Checkpoint 3 (approval):** the developer approved revision 3 without changes. The status went from `draft` to `ready-for-dev`, and the pending-approval markers were replaced by the frozen block. No requirement, decision, page plan, test expectation or gate changed; the matrix stays at 33 rows.
- **2026-11-14, revision 4 (Checkpoint 7, K4 provenance correction):** renegotiated and authorized by the developer after the approved inputs showed that the diagram was generated with ChatGPT's image-generation tool from the developer's approved concept, then reviewed and approved by the developer. Six frozen wordings changed: the Intent (page 4), D9 (the diagram bullet), the page plan (row 4), the provenance note's developer contribution and diagram lines, and the provenance matrix row (it now also requires naming the image-generation tool). The approval comment notes revision 4. No other requirement, decision, gate or test expectation changed; no academic-integrity or U-1 determination is made; the status stays `ready-for-dev` and the matrix stays at 33 rows.

## Review Triage Log

- **2026-11-14 — independent review of revision 2:** three findings (the page 6 table, the diagram's meaning, the C-3 wording), all applied in revision 3.
- **2026-11-14 — Checkpoint 3: APPROVED by the developer** (revision 3).
  - **The decision:** the spec is frozen and set to `ready-for-dev`; gate G0 is met.
  - **What it fixes:** the requirements, D1–D15, the page plan, the diagram's meaning, the transcription and source-format rules (including the two-column table), the PDF generation rules, the provenance contents, the approval gates G0–G5, the 33-row acceptance matrix and the seven-file implementation scope.
  - **What changed at approval:** this status change, the approval comment, the frozen-block markers and these log entries only.

## Design Notes

- **Font metrics, options considered (correction A):**
  1. **Hand-written AFM tables** (revision 1): no dependency, but a few hundred numbers typed by hand, easy to get wrong, and Adobe's AFM licence asks for its notice to be kept with copies. Rejected.
  2. **pypdf's bundled Core 14 metrics (chosen):** pypdf 6.21.4 ships the Adobe Core 14 AFM widths, with Adobe's notice, in `pypdf._codecs.core_font_metrics`. Checked at spec time: Helvetica and Helvetica-Bold each have 316 entries and cover every printable WinAnsi character except the no-break space and the soft hyphen. No new dependency and no typed tables. The cost: it is a private pypdf module, so a pypdf upgrade could move it. pypdf is locked at 6.21.4 (`>=6.21,<6.22`), the build fails clearly if the module is missing, and the pinned-hash test catches any change in layout.
  3. **Courier (monospaced):** every character is 600/1000 em wide, so no table is needed at all. The simplest code, but the lecture would look like typewriter text. Kept as the fallback if option 2 becomes unavailable.
  4. **Line breaks written into the source by hand:** changes the layout of the approved text and still needs widths to check for overflow. Rejected.
- **Why a script and not a word processor:** an export from Word or LibreOffice adds headers, footers, page numbers and author metadata by default, and cannot be rebuilt byte for byte.
- **Why Helvetica with WinAnsi:** it needs no font files, covers every Norwegian letter, and pypdf already extracts it exactly (`test_stage2_extract.py:174`). The cost: viewers substitute a similar font, so the look varies slightly between viewers; extraction does not.
- **Why the JPEG is embedded unchanged:** PDF can carry JPEG data directly (`DCTDecode`), so no image library is needed, and the bytes are stable.
- **Why `.gitattributes` is needed:** this repository has `core.autocrlf=true`. A pypdf PDF has no NUL byte in its first 8,000 bytes (checked at spec time), so git would treat it as text and could rewrite its line endings, breaking the byte offsets and the pinned hash.
- **Why CRLF is normalised in the source:** the md file is a text file and is checked out with CRLF on Windows; without normalising, Windows and CI would build different bytes.
- **Why a minimal table, not a general one:** the approved text has one simple two-column table. Supporting exactly that shape (header, separator, plain cells, no wrapping, no alignment marks) keeps the parser and layout deterministic and small, while anything richer fails closed and goes to the developer. Converting the table to prose or bullets would be a substantive edit.
- **Why the source-fidelity test:** it proves mechanically that the PDF holds exactly the approved wording, which is what AR-20 approval and correction B require; wrapping only at spaces makes the comparison exact after whitespace normalisation.

## Verification

**Commands:**
- `cd backend && uv sync --locked && uv run pytest -q` -- expected: all pass
- `cd backend && uv run pytest -q -W error tests/test_sample_pdf.py` -- expected: all pass
- `uv run --project backend python samples/build_sample_pdf.py && git diff --exit-code -- samples/innkjop-og-lager.pdf` -- expected: no change
- `git check-attr binary -- samples/innkjop-og-lager.pdf samples/vareflyt.jpg` -- expected: `set` for both
- `git diff -- backend/uv.lock backend/pyproject.toml backend/app` -- expected: empty
