---
title: 'Story 1.17: Summary rendering and PDF page links'
type: 'feature'
created: '2026-11-18'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 3
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

**How to read this spec.** Every normative rule carries one of three tags:
- **[BINDING]** — an approved requirement from `epics.md`, `EXPERIENCE.md`, `DESIGN.md`, `ARCHITECTURE-SPINE.md`, the PRD or an earlier approved spec, with its source;
- **[FOR-G0]** — an implementation decision proposed by the author (including the provisional choices given by the developer at Checkpoints 142 and 144); **approved by the developer at G0 (Checkpoint 148, 2026-11-18) and now binding**;
- **[OPEN]** — a question that was open before G0; all of them were resolved at G0 (see "Open questions").

<!-- APPROVED at Checkpoint 148 (G0) by the developer on 2026-11-18: Story 1.17, revision 4 (SHA-256 of the whole file as reviewed at Checkpoint 147, before the approval and freeze edits: 375d54fa3cb1d5bd6c55549fbd7404351a76dd242f11c8715d4200a7900fd98d; SHA-256 of the frozen normative text from "## Intent" to the end of the I/O & Edge-Case Matrix, after the three approval edits listed in the Spec Change Log: f7524f577f59349d0d787a22882df82db840db9045b7f1335adb1ead7fa8a4ef). Approved together: decisions D1–D10, including the binding C3 compatibility scope in D7 (test changes authorized only within D7); OQ1–OQ6 as provisionally resolved in revision 4, including OQ6's v4 inline-block wrapper layout; OQ7 option (a) — the approved UX-DR-27 markup, inline-flex links and the global .sr-only are retained; the known Chrome computed-name discrepancy ("PDF-side N , åpnes i ny fane") is documented without weakening the approved accessible-name requirement; manual check 1.17-M4 may be deferred only if it cannot be performed, and is then recorded as NOT TESTED with Chrome's computed name, the unverified screen-reader speech and the OQ7 decision added to the existing accessibility follow-up (issues.md:73); the rejected inline-link name variant formerly called "v4" is renamed n1. Freeze boundary: from "## Intent" through the last row (CR7) of "## I/O & Edge-Case Matrix", inclusive; "## Code Map" and everything after it are outside the block. The block below is frozen: any change to it requires explicit renewed approval by the developer. This approval authorizes no implementation; implementation starts at a later checkpoint. Story 1.16's M-2/M-4 exceptions and its incomplete G2 gate remain open and are not affected. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**User story** (`epics.md:890–918`): as a reviewer, I want the summary shown as readable plain text with working page links, so that I can read the overview and check it against the sample PDF.

**Problem:** after Story 1.16 the Sammendrag panel holds only a visually hidden `h3`. The validated `results.summary` (`{text, pages}`) reaches the browser but is not shown, and nothing links to the bundled sample PDF that `GET /api/demo/sample.pdf` (Story 1.14) already serves.

**Approach:** the Sammendrag panel shows the summary text as one plain-text paragraph with its line breaks preserved, followed by a separate row of page links — one per summary page — built by a reusable page-link component that receives its PDF source as an input. In demo mode `DemoOutcome` supplies the source `<API base URL>/api/demo/sample.pdf`; each link opens `…#page=N` in a new tab. The other three panels stay empty (Stories 1.18–1.20).

**In scope:**
- the summary text in the Sammendrag panel (plain text, line breaks preserved);
- a reusable page-link component (pages + source in, links out), used here only by the summary;
- the demo PDF source and its hand-over from `DemoOutcome` to the Sammendrag panel;
- CSS for the summary text, the page links, the arrow, the separator and the link row (existing tokens);
- Vitest coverage, and the narrow compatibility correction C3 to existing Story 1.15 and 1.16 tests.

**Out of scope:**
- Nøkkelbegreper, Flashkort and Quiz content and their page links (Stories 1.18–1.20; they will reuse the page-link component);
- `Tilbake til start` and demo acceptance (Story 1.21);
- real-mode PDF sources (object URLs, Story 2.7), real-mode results (Story 2.6), `lang="en"` on English results (Story 2.6, AF-5);
- any backend, `samples/`, dependency or configuration change; any change to `GET /api/demo/sample.pdf`;
- any change to the global `.sr-only` rule.

## Boundaries & Constraints

**Always:**
- **[BINDING] Plain text only** (AR-19, AD-18, UX-DR-23): the summary text is rendered as a React text node; no `dangerouslySetInnerHTML`, no Markdown-to-HTML, no HTML parsing of AI text.
- **[BINDING] Exact approved texts** (`epics.md:216`; `EXPERIENCE.md:98–99, 135`): see "Strings". No new Norwegian text.
- **[BINDING] Page-link markup** (UX-DR-27, `epics.md:258`; `EXPERIENCE.md:174`): `<a href={url + '#page=' + n} target="_blank" rel="noopener">PDF-side {n}<span aria-hidden="true"> ↗</span><span class="sr-only">, åpnes i ny fane</span></a>`; no `aria-label`; one link per page; separator ` · ` `aria-hidden`; target ≥ 24px. The only additions are the class names and the `page-links__item` wrapper in D2 (F12, OQ6).
- **[BINDING] Accessible name** `PDF-side N, åpnes i ny fane` (`EXPERIENCE.md:99`, AF-7); see D6 for the measured browser value (G3).
- **[BINDING] No hard-coded PDF URL in the page-link component** (Story 1.17 AC 2).
- **[BINDING] Demo source** `<NEXT_PUBLIC_API_BASE_URL>/api/demo/sample.pdf` (Story 1.17 AC 2; AD-13; Story 1.14 spec line 109).
- **[BINDING] Story 1.16's accepted exceptions are untouched:** its M-2 and M-4 remain NOT TESTED manually and its G2 gate remains incomplete (`.logs/amma-kwaasi-eide/issues.md:74`); this story neither tests nor closes them.
- **[BINDING] CSS within the existing tests:** appended rules only; no `width:`/`height:` declarations (only `min-`/`max-` forms), no raw colour, no new `--color-*` token, one `:focus-visible` rule (`demo-css.test.ts:140–148`, `globals-css.test.ts`, and the Story 1.16 `results-css.test.ts`, whose section check runs from `.notice-info {` to the end of the file and therefore also covers rules appended after it). No new rule's selector contains `.result-panel` (Story 1.16 R5 forbids `display` on such selectors; G7).
- **[BINDING] No new dependency.**
- **[FOR-G0] No new network call:** the app never fetches the PDF itself; the browser opens it only when the user follows a link (inferred from AD-13 and UX-DR-27; F18).
- **[FOR-G0] Demo only for now:** nothing new renders outside demo S4; real mode, S0, S0x, S1, S3 and S5 are unchanged (inferred from Story 2.6 owning real-mode results; F18).

**Ask First:** any Norwegian text not in "Strings"; any change to a file under "Never"; any deviation from the binding page-link markup or the global `.sr-only` rule (OQ7).

**Never:** changes to `backend/`, `samples/`, the dependency and configuration files, `frontend/lib/status.ts`, `frontend/lib/generation.ts`, `frontend/lib/contracts.ts`, `frontend/lib/demo.ts`, `frontend/components/DemoProvider.tsx`, `DemoControls.tsx`, `ResultNotices.tsx`, `frontend/app/page.tsx`, `frontend/app/layout.tsx`, the existing `.sr-only` rule in `globals.css`, the frozen blocks of any spec, or any existing test except as allowed by C3 (D7). `_bmad-output/planning-artifacts/architecture/technology.md` is not a source.

## Strings

| Use | Text | Source |
|---|---|---|
| Page link, visible | `PDF-side N ↗` (`↗` is U+2197, preceded by one normal space) | `EXPERIENCE.md:98` [BINDING] |
| Page link, accessible name | `PDF-side N, åpnes i ny fane` | `EXPERIENCE.md:99`, AF-7 [BINDING] |
| Separator between links | ` · ` (U+00B7 with one normal space on each side) | `EXPERIENCE.md:98` [BINDING] |
| Summary text | the response's `results.summary.text`, unchanged | AR-19 [BINDING] |

`N` is the page integer from `results.summary.pages`, written as plain decimal digits.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| Story 1.17 AC 1 | Sammendrag text plain, line breaks preserved, no Markdown or HTML | D1; rows X1–X5, CR1 |
| Story 1.17 AC 2 | reusable page-link component takes the source as input, no hard-coded URL; demo source `<API base>/api/demo/sample.pdf` | D2–D4; rows PL5, PL9, DS1–DS2, PS2, PS8 |
| Story 1.17 AC 3 | `PDF-side N ↗`, name `PDF-side N, åpnes i ny fane`, `…/sample.pdf#page=N`, new tab, `rel="noopener"`, separator `aria-hidden`, target ≥ 24px | D2, D5, D6, D9, D10; rows PL1–PL4, PL8, PS2, CR2–CR4, CR6, CR7; 1.17-M1, 1.17-M4 |
| Story 1.17 AC 4 | a summary with no pages shows no page links | D2; rows PL6, SC3 |
| Story 1.17 AC 5 | D-10: the panel's visual treatment reuses existing tokens | D1, D5; rows CR1–CR7 |
| Story 1.17 AC 6 | Vitest: plain text of a `<script>` string, page-link markup, URL from the supplied source | rows X1, PL1, PL5 |
| UX-DR-2 (`epics.md:221`) | page-link component styled from its tokens | D5, D9, D10; rows CR2–CR4, CR6, CR7 |
| FR-4, FR-5 | page references; results shown | D1–D4 |
| AR-19 / AD-18 | plain-text rendering | D1; rows X1–X4 |
| UX-DR-23 | `white-space: pre-line`; page links only where the Summary has pages | D1, D2; rows X5, CR1, PL6 |
| UX-DR-27 / AF-7 / AF-12 | page-link markup, names, ≥ 24px targets | D2, D6, D9 |
| UX-DR-38 (G-4) | reflow at 320 CSS px | D6, D10; rows CR4, CR7; 1.17-M2 |
| AD-10 | Summary pages may be empty | D2; row PL6 |
| AD-13, Story 1.14 | demo PDF served read-only by the backend | D4 |

## Decisions

All decisions below (D1–D10) were **approved by the developer at G0 (Checkpoint 148, 2026-11-18) and are binding implementation instructions**. The [FOR-G0] tags and the "provisional" notes record how each decision was proposed; the developer's provisional choices at Checkpoints 142 and 144 were confirmed at G0.

- **D1 — summary text:** inside the Sammendrag panel, directly after the existing `h3.sr-only`, a `<p className="summary-text">{summary.text}</p>`: one React text node, so `<`, `&`, `**` or `<script>` appear literally and no element is created from them. CSS `white-space: pre-line` preserves line breaks (UX-DR-23); body typography and `--color-text` (DESIGN.md:338, D-10); `overflow-wrap: anywhere`. No `max-width` (provisional OQ5). No `lang` attribute (demo results are `nb`, AF-5).
- **D2 — reusable page links:** a new `frontend/components/PageLinks.tsx`, props `{ pages: readonly number[]; pdfSource: string | null }`:
  - returns `null` when `pages` is empty or `pdfSource` is `null`;
  - otherwise one `<div className="page-links">`: a separate block **after** the summary paragraph, never inside a `<p>` or any other phrasing context (a `div` is flow content and cannot be nested in a `<p>` either; G2, provisional OQ3);
  - its children, in page order: the **first** link directly, then for **each following page** one `<span className="page-links__item">` holding `<span className="page-links__separator" aria-hidden="true"> · </span>` followed by that page's link (provisional OQ6, v4) — so a separator always travels with the link after it;
  - each link has the exact UX-DR-27 markup plus `className="page-link"`; the class names and the `page-links__item` wrapper are the only additions to the binding markup (F12);
  - React keys (H5): the first link is keyed by `pages[0]`; each `span.page-links__item` is keyed by its own page number; the separator and the link inside a keyed wrapper are a fixed pair and need no keys of their own;
  - the label is written as in the binding markup (`PDF-side {n}`); React may render it as several adjacent text nodes, which is acceptable — tests compare the joined text before the first `<span>` (F1);
  - `href` is `` `${pdfSource}#page=${n}` ``; `target="_blank"`; `rel="noopener"`;
  - preconditions (not re-validated): `pages` is strictly increasing positive integers (`frontend/lib/generation.ts:11`); `pdfSource` has no `#` fragment (true for the demo URL and for `blob:` object URLs; F11);
  - the component contains no URL string and no reference to `/api/demo`.
- **D3 — `pdfSource: string | null`:** `null` means "no PDF to link to" and gives no links. Real-mode hand-over, documented and not built: Story 2.6 renders real-mode PDF results without links (`epics.md:1244–1245`, `pdfSource = null`), Story 2.7 supplies an object URL, plain-text Documents never have pages. The demo URL is never used in real mode. `ResultTabs` gets a **required** prop `pdfSource: string | null` (provisional OQ1).
- **D4 — demo source:** a new `frontend/lib/pdf-source.ts` with `demoPdfSource(): string` returning `` `${apiBaseUrl()}/api/demo/sample.pdf` ``, reusing `apiBaseUrl()` (`frontend/lib/status.ts:13–17`) and its documented fallback `http://127.0.0.1:8000` when `NEXT_PUBLIC_API_BASE_URL` is missing or empty (provisional OQ2; CF-1). `DemoOutcome`'s success branch passes `pdfSource={demoPdfSource()}` to `ResultTabs`; `ResultTabs` passes it, with `results.summary`, only to the Sammendrag panel.
- **D5 — tokens:** existing tokens only (DESIGN.md:235–242, 391); none of the new selectors contains `.result-panel` (G7):
  - `.page-link`: `display: inline-flex; align-items: center; min-height: var(--target-min); padding: 0 var(--space-1)`; `color: var(--color-primary)`; `text-decoration: underline; text-underline-offset: 3px` (a literal, because no token exists for the 3px offset and no new token is introduced); `--font-small-*`; no hover rule (the underline stays, DESIGN.md:391);
  - `.page-links__item`: `display: inline-block` (D10);
  - `.page-links__separator`: `white-space: pre; color: var(--color-text-muted)`, `--font-small-*` (D10);
  - `.page-links`: `margin: var(--space-3) 0 0`, `--font-small-*` (no `display: flex`, no `gap`);
  - `.summary-text`: `margin: 0; white-space: pre-line; overflow-wrap: anywhere`, `--font-body-*`, `--color-text`.
  The rules are appended at the end of `globals.css` under a Story 1.17 comment, after the Story 1.16 section.
- **D6 — accessibility:** each link's name follows the approved string `PDF-side N, åpnes i ny fane` (visible text + the sr-only suffix; `↗` and the separator hidden); no `aria-label`; each link ≥ 24px tall (`--target-min`); links use the existing global focus ring; the Sammendrag panel keeps `tabindex="0"` (AF-3), so the sequential order in demo S4 becomes `Vis eksempel` → selected tab → panel → its page links in page order; the wrappers are not focusable; links inside a `hidden` panel are not focusable.
  - **Measured browser name (G3; Checkpoint 144 probe, reproduced at Checkpoint 145; headless Chrome 156, CDP accessibility tree):** with the approved markup Chrome computes `PDF-side N , åpnes i ny fane` — one extra space before the comma. jsdom (testing-library) applies no CSS and computes the exact approved name.
  - **Cause (H2):** when it builds a name from content, Chrome inserts a space around a contributing child box that is not an inline box (AccName leaves this whitespace to the user agent; the non-inline boxes follow from CSS 2.1 §9.7 and CSS Flexbox §4). Two independent things create such boxes in the approved design: (1) the **`inline-flex` link** — every child of a flex container becomes a blockified flex item, i.e. the text run `PDF-side N`, the `aria-hidden` arrow span and the suffix span; and (2) the **global `.sr-only`** — its `position: absolute` blockifies the suffix span even when the link is not a flex container. So the space is not caused by the hidden suffix alone: removing only one of the two causes leaves the space (an `inline` link with `.sr-only`, and an `inline-flex` link with an inline-hidden suffix, both still give it).
  - **Variants that give the exact name in Chrome (H1)** — every one of them replaces the global `.sr-only` on the suffix with a local inline hiding technique (`display: inline; clip-path: inset(50%); white-space: nowrap; font-size: 0`), whose screen-reader robustness has **not** been established:
    - **n1 (Checkpoint 144; called "v4" before G0, renamed to avoid confusion with the approved OQ6 v4 wrapper layout):** an `inline` link (not `inline-flex`) with the inline-hidden suffix — exact name, but 20px tall (below the 24px target);
    - **w2 (Checkpoint 145):** an `inline-block` link with the inline-hidden suffix — exact name, **24px**;
    - **w3 (Checkpoint 145):** an `inline-flex` link whose whole content sits inside one extra inner inline `span`, with the inline-hidden suffix — exact name, **24px**; it also adds markup inside the `<a>`.
    The earlier statement that every exact-name variant is 20px tall was incorrect. Every variant that keeps the global `.sr-only` still gives the space (including an `inline-block` link, an `inline` link with `position: relative`, and an inner wrapper).
  - The exact-name requirement is **not** weakened: PL1 asserts the exact approved name in jsdom; Chrome's computed name is recorded as a known, CSS-induced browser computation; whether screen readers *speak* it differently from the approved name (a space before a comma is not normally voiced) has **not** been tested and is decided by the manual check 1.17-M4. OQ7 was decided at G0 (Checkpoint 148) as **option (a)**: the approved UX-DR-27 markup, the `inline-flex` links and the global `.sr-only` are kept, and none of the variants above is used; any later change to the markup, the link display or `.sr-only` to remove the space is a deviation that needs the developer's explicit approval ("Ask First").
- **D7 — compatibility correction C3 (binding scope; provisional OQ4: rename):** Story 1.17 supersedes, for the Sammendrag panel only, Story 1.15 row C4 (no response content, no `<a>`) and Story 1.16 rows S3, P3 and K7; the frozen Story 1.15 and 1.16 specs are not edited. At baseline `f51ad09` the existing tests may change **only** as follows:
  1. `frontend/__tests__/demo-start.test.tsx`, test "success: heading, notice, guidance gone, focus kept, announced, no repeat, no content (C1–C5)" (line 806): its name may change "no content" to "summary only"; the comment at line 829 may name Story 1.17; the assertion at line 831 becomes "the summary text is inside `#result-panel-summary`"; the assertion at line 833 becomes "every `<a>` in Resultater is inside `#result-panel-summary`".
  2. `frontend/__tests__/results-shell.test.tsx`, test "no response content is rendered; no links (S3)" (line 180): its name may change to "only the summary and its page links are rendered (S3)"; line 184 becomes "the summary text is inside `#result-panel-summary`"; line 188 becomes "every `<a>` in Resultater is inside `#result-panel-summary`"; lines 185–187 (key concepts, flashcard fronts, quiz questions absent) stay unchanged.
  3. `frontend/__tests__/result-tabs.test.tsx`, P3 (lines 466–476): its name may change to say that the Sammendrag panel holds its `h3` and the summary; the Sammendrag panel's children become `h3.sr-only`, `p.summary-text`, `div.page-links`; the other three panels keep exactly one child, `h3.sr-only`.
  4. `frontend/__tests__/result-tabs.test.tsx`, K7 (lines 491–497): its name may change to include "and its page links"; the expected order gains the five summary links after the panel.
  5. `frontend/__tests__/result-tabs.test.tsx`, the `renderTabs` helper (line 95): adds `pdfSource={null}` (required prop, D3), so the component tests compile; no component test assertion changes.
  Every other assertion, test and test name stays unchanged (in particular K8, S1, P1, P2, P4, F4, F6, the L rows, B12, K10 and the CSS tests).
- **D8 — line-break test input:** the recorded fixture's summary has no newline, so line-break preservation is tested with explicit component input (e.g. `"Første avsnitt."` + newline + `"Andre avsnitt."`).
- **D9 — the space before ↗ (provisional choice for F2):** inside an `inline-flex` link the arrow span is a flex item, and its leading space is removed; `.page-link > [aria-hidden="true"] { white-space: pre; }` keeps it. Probe at Checkpoint 142: the arrow span measured 11.0px without the rule and 15.1px with it (reproduced at Checkpoint 143). Checked again in 1.17-M1.
- **D10 — the link row (provisional choice for OQ6: v4):** `.page-links` is a block `div` in normal inline flow; the links are `inline-flex`; each separator sits with the **following** link inside an `inline-block` `span.page-links__item`, and the separator keeps both spaces with `white-space: pre`. The line breaker sees only atomic boxes (the first link and the items), so a line can break only *before* a separator, never after it.
  - **Measurements (Checkpoint 144 probe, headless Chrome 156; a scratch page loading the real `globals.css`, with the row inside `main.page > section > div.result-panel` so that the panel padding applies; G1):** for pages `[1, 2, 3, 5, 6]` and a nine-page multi-digit row: at 1280px, 640 CSS px × 2 (≈ 200% zoom), 400px, 360px and 320px no separator ever ends a line; consecutive links on the same line are **11.5px** apart (≥ `{spacing.2}`); every link is **24px** tall; no horizontal scroll (`scrollWidth = clientWidth` at every width); at 320px the row is 192px wide and holds one link per line (the five-page row takes five lines); the separator does not appear in the accessibility tree; Chrome's link names are as in D6.
  - **Earlier figures corrected (G1):** revision 2's "three lines at 320 CSS px" came from a probe without the panel padding and does not hold for the app; the Checkpoint 143 review measured the inline-flow design (v0) in the real structure and found every separator ending a line at 320px.
  - **Trade-offs, recorded explicitly:** one extra `span.page-links__item` per link after the first; a wrapped line starts with ` · ` including its leading space (a visual indent of about one space width, ≈ 4px); without `white-space: pre` the spacing drops to 7.4px (below 8px), so CR3 guards it.

## Conflicts and source findings

- **CF-1 — "`<NEXT_PUBLIC_API_BASE_URL>`" vs. the fallback:** the AC names the environment variable literally; `apiBaseUrl()` falls back to `http://127.0.0.1:8000` when it is empty. D4 follows the existing helper (provisional OQ2); PS8 tests a set variable.
- **CF-2 — existing tests assert "no summary content" and "no links":** handled by C3 (D7).
- **CF-3 — empty-panel acceptance (Story 1.16 OQ7):** no longer applies to the Sammendrag panel; it still applies to the other three panels.
- **CF-4 — DESIGN's `page-link` has a `gap` token (DESIGN.md:241):** with D10 the visible separation comes from the link padding and the separator's preserved spaces, not a flex gap; the measured 11.5px satisfies "at least `{spacing.2}`" (DESIGN.md:391).
- **CF-5 — approved markup vs. Chrome's computed name:** see D6 and OQ7.

## I/O & Edge-Case Matrix

35 rows. "Unit" rows call a pure function; "component" rows render the named component directly; "page" rows render `<Home />` with `demo-fixtures.ts` (demo S4 from the recorded reply; `NEXT_PUBLIC_API_BASE_URL` stubbed `""` unless stated).

**Plain text (component: `SummaryContent`, with `pdfSource null`)**

| Row | Input | Expected |
|---|---|---|
| X1 | `text "<script>alert(1)</script>"` | `p.summary-text` `textContent` equals the input; no `script` element in the container; the paragraph's child nodes are text nodes only |
| X2 | `"<b>fet</b> & <i>kursiv</i>"` | rendered literally; no `b` or `i` element |
| X3 | `"**fet** og _kursiv_ og # Overskrift"` | rendered literally (no Markdown) |
| X4 | text with a newline (D8) | `textContent` contains the newline unchanged; text nodes only |
| X5 | page: demo S4 | `p.summary-text` in `#result-panel-summary` with exactly the fixture's summary text |

**Page links (component: `PageLinks`)**

| Row | Input | Expected |
|---|---|---|
| PL1 | `pages [4]`, `pdfSource "https://example.test/doc.pdf"` | one `a.page-link`, a direct child of `div.page-links`: `href` `https://example.test/doc.pdf#page=4`, `target="_blank"`, `rel="noopener"`, no `aria-label`; the joined text of the child nodes before the first `span` is `PDF-side 4`; then `<span aria-hidden="true">` with ` ↗`; then `<span class="sr-only">` with `, åpnes i ny fane`; accessible name exactly `PDF-side 4, åpnes i ny fane`; `textContent` `PDF-side 4 ↗, åpnes i ny fane`; no separator and no `page-links__item` |
| PL2 | `pages [4, 5]` | `div.page-links` children: `a.page-link` (4), then one `span.page-links__item` whose children are `span.page-links__separator` (`aria-hidden="true"`, text exactly ` · `) and `a.page-link` (5) |
| PL3 | `pages [1, 2, 3, 5, 6]` | children: the link for 1, then four `span.page-links__item`, each `[separator, link]` for 2, 3, 5, 6 in order; four separators in total; no separator before the first link and none after the last; the row's `textContent` equals the five link texts joined with ` · ` |
| PL4 | `pages [12, 80]` | multi-digit numbers unchanged in text and `href` |
| PL5 | two different sources (`blob:abc`, `https://example.test/x.pdf`) | each `href` is the supplied source followed by `#page=N`; nothing else is prefixed |
| PL6 | `pages []` | renders nothing |
| PL7 | `pdfSource null`, `pages [4]` | renders nothing |
| PL8 | any | no NBSP or zero-width character in the rendered text; exactly one normal space before `↗` |
| PL9 | the source text of `PageLinks.tsx`, with comments removed by a string-aware scan (`//` and `/* */` outside string, template and regex literals; G4) | no string or template literal contains `/api/demo` or `http` |

**Demo source (unit: `demoPdfSource`)**

| Row | Situation | Expected |
|---|---|---|
| DS1 | `NEXT_PUBLIC_API_BASE_URL` stubbed `""` | `http://127.0.0.1:8000/api/demo/sample.pdf` |
| DS2 | stubbed `"http://localhost:9000/"` | `http://localhost:9000/api/demo/sample.pdf` |

**Summary content and integration**

| Row | Situation | Expected |
|---|---|---|
| SC1 | component `ResultTabs` with a summary (pages `[1]`) and a source | the Sammendrag panel's element children, in order: `h3.sr-only`, `p.summary-text`, `div.page-links` (the row is a sibling of the paragraph, not inside it) |
| SC2 | component `ResultTabs` | the other three panels still hold exactly one child, `h3.sr-only` |
| SC3 | component `SummaryContent`, `pages []`, a source | `p.summary-text` only; no `div.page-links`, no link |
| SC4 | component `SummaryContent`, `pdfSource null` | `p.summary-text` only; no link |
| PS1 | page, demo S4 | the Sammendrag panel shows the fixture text and five links for pages 1, 2, 3, 5, 6 |
| PS2 | page, env `""` | each `href` is `http://127.0.0.1:8000/api/demo/sample.pdf#page=N` |
| PS3 | page | no `<a>` in Resultater outside `#result-panel-summary`; no key-concept term, flashcard front or quiz question in the document |
| PS4 | page, computed focus order | `Vis eksempel`, the Sammendrag tab, the Sammendrag panel, then its five links in page order (no wrapper is focusable) |
| PS5 | page, after selecting another tab | the summary links are inside a `hidden` panel and not in the focus order |
| PS6 | page | no fetch to `/api/demo/sample.pdf`; the only calls remain `/api/status` and `/api/demo` |
| PS7 | page, real mode | nothing new renders (as Story 1.16 S4) |
| PS8 | page, env stubbed `"http://localhost:9000"` | each `href` is `http://localhost:9000/api/demo/sample.pdf#page=N` (F8) |

**CSS (string checks on `globals.css`, comments stripped)**

| Row | Check |
|---|---|
| CR1 | `.summary-text`: `white-space: pre-line`, `--font-body-*`, `--color-text`, `margin: 0`, `overflow-wrap: anywhere` |
| CR2 | `.page-link`: `display: inline-flex`, `min-height: var(--target-min)`, `padding: 0 var(--space-1)`, `--color-primary`, `text-decoration: underline`, `text-underline-offset: 3px`, `--font-small-*` |
| CR3 | `.page-links__separator`: `white-space: pre`, `--color-text-muted`, `--font-small-size`, `--font-small-line-height` (G5) |
| CR4 | `.page-links`: `margin: var(--space-3) 0 0`, `--font-small-size`, `--font-small-line-height` (G5); no `display: flex` and no `gap` |
| CR5 | the new rules: no `width:`/`height:`, no raw colour, no selector containing `.result-panel` (G7); `globals-css.test.ts`, `demo-css.test.ts` and `results-css.test.ts` pass unchanged |
| CR6 | `.page-link > [aria-hidden="true"]`: `white-space: pre` (D9) |
| CR7 | `.page-links__item`: `display: inline-block` (D10) |

</frozen-after-approval>

## Code Map [FOR-G0]

- `frontend/lib/pdf-source.ts` (new) -- `demoPdfSource()` -- D4.
- `frontend/components/PageLinks.tsx` (new) -- D2, D6, D10.
- `frontend/components/SummaryContent.tsx` (new) -- props `{ summary: ValidatedSummary; pdfSource: string | null }`; returns a Fragment: `p.summary-text` and then `PageLinks` as a sibling -- D1, D2.
- `frontend/components/ResultTabs.tsx` (modified) -- required prop `pdfSource: string | null`; the Sammendrag panel renders `SummaryContent` after its `h3`; the other panels unchanged; header comment updated -- D3, D4.
- `frontend/components/DemoOutcome.tsx` (modified) -- the success branch passes `pdfSource={demoPdfSource()}`; header comment updated -- D4.
- `frontend/app/globals.css` (modified, appended Story 1.17 section) -- D5, D9, D10.
- `frontend/__tests__/page-links.test.tsx` (new) -- PL1–PL9 (`PageLinks`), X1–X4 and SC3–SC4 (`SummaryContent`), DS1–DS2 (`demoPdfSource`): 17 rows.
- `frontend/__tests__/summary.test.tsx` (new) -- SC1–SC2 (`ResultTabs`), X5, PS1–PS8 (page): 11 rows.
- `frontend/__tests__/summary-css.test.ts` (new) -- CR1–CR7: 7 rows.
- `frontend/__tests__/demo-start.test.tsx`, `results-shell.test.tsx`, `result-tabs.test.tsx` (modified, C3 only, D7).

## Compatibility correction C3 — detail (explanatory; D7 governs)

Line numbers at `main` `f51ad09`, read at Checkpoints 140–144 (not run).

| File, test | Lines | Today | Change |
|---|---|---|---|
| `demo-start.test.tsx`, "success: … no content (C1–C5)" | 806 (name), 829 (comment), 831, 833 | no summary text; no `<a>` in Resultater | name "summary only"; the summary is inside `#result-panel-summary`; every `<a>` is inside it |
| `results-shell.test.tsx`, "no response content is rendered; no links (S3)" | 180 (name), 184, 188 | the same two checks | renamed; the same two changes; 185–187 stay |
| `result-tabs.test.tsx`, P3 | 466–476 | every panel holds exactly one `h3.sr-only` | Sammendrag: `h3`, `p.summary-text`, `div.page-links`; the other three: one `h3` |
| `result-tabs.test.tsx`, K7 | 491–497 | focus order `Vis eksempel`, tab, panel | plus the five links; name updated |
| `result-tabs.test.tsx`, `renderTabs` | 95 | `<ResultTabs results={results} labelledBy="results-heading" />` | adds `pdfSource={null}` |

K8 is unaffected (after ArrowRight the summary links are inside a hidden panel). The v4 wrapper changes nothing in C3: no existing test counts link or span children. Lines 185–187 of `results-shell.test.tsx` and PS3 stay valid only because none of the five key-concept terms, flashcard fronts or quiz questions occurs inside the current fixture's summary text (verified at Checkpoints 141 and 143; F17); a re-recorded fixture would need this re-checked.

## Approval gates

- **G0:** this spec independently re-reviewed, approved by the developer and frozen; the spec commit on branch `story/1-17-summary-rendering-and-pdf-page-links`.
- **G1:** `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` pass; the backend suite passes unchanged.
- **G2 — manual checks (Story 1.17's own; distinct from Story 1.16's still-open M-2 and M-4):**
  - **1.17-M1:** in Chrome, a summary link shows `PDF-side N ↗` with a visible space before the arrow, and a click opens the sample PDF at page N in a new tab;
  - **1.17-M2 (H4), two separate conditions:**
    - **at 320 CSS px:** the summary text and the link row wrap with no horizontal scroll, and **no separator ends a line** (each wrapped line starts with ` · ` and the next link); at this width the row may hold one link per line, so the spacing check does not apply there;
    - **at 200% browser zoom** (on a normal desktop window): no horizontal scroll, no separator ends a line, and wherever **two or more links share a line** they are at least 8px apart;
  - **1.17-M3:** the focus ring is visible on a link, and Tab moves from the panel through the links in page order;
  - **1.17-M4:** a screen reader reads each link as `PDF-side N, åpnes i ny fane`; record whether the extra space in Chrome's computed name (D6) is audible.
  Any check not performed is recorded as **NOT TESTED**, never as passed. 1.17-M4 may be deferred to the accessibility follow-up (`issues.md:73`) **only if it cannot be performed** (G0, Checkpoint 148) and is then recorded as NOT TESTED; in that case the Story 1.17 session log must add to that `issues.md` item (H3): Chrome's computed name `PDF-side N , åpnes i ny fane`, that screen-reader speech is unverified, and the OQ7 decision taken at G0. (This spec does not edit `issues.md`; the entry is made at the story's documentation step.)
- **G3:** approval of the exact staged file list.
- **Wording gate:** none; every string is already approved.

## Proposed implementation stages

- **Stage A:** `pdf-source.ts`, `PageLinks.tsx`, `SummaryContent.tsx` with `page-links.test.tsx`; no integration.
- **Stage B:** `ResultTabs` and `DemoOutcome` integration, `summary.test.tsx` and C3 (in the same stage, so the suite stays green; C3 item 5 is needed as soon as the prop is required).
- **Stage C:** the CSS section and `summary-css.test.ts`.
- Each stage independently reviewed; then a whole-story review and final verification.

## Dependencies & deferred work

- **Depends on:** Story 1.14 (`GET /api/demo/sample.pdf`, done), Story 1.16 (the Sammendrag panel, `ResultTabs`, `demo-fixtures.ts`; done with the tracked, still-open M-2/M-4 exceptions).
- **Provides for:** Stories 1.18–1.20 (`PageLinks`; each passes `pdfSource` on to its panel, as a block after the item's text), Story 2.6 (`pdfSource = null` for real-mode PDF results until 2.7), Story 2.7 (the object-URL source).
- **Still open, not affected:** Story 1.16's M-2/M-4 exceptions and incomplete G2 gate (`issues.md:74`), G-4 (`:25`), the stuck-`loading` limitation (`:70`), the screen-reader follow-up (`:73`).

## Open questions

All open questions were resolved by the developer at G0 (Checkpoint 148, 2026-11-18). The provisional answers below were **confirmed**:
- OQ1 → `pdfSource` required on `ResultTabs` (D3, C3 item 5);
- OQ2 → reuse `apiBaseUrl()` with its fallback (D4);
- OQ3 → `div.page-links`, a block after the summary paragraph (D2);
- OQ4 → rename the four inaccurate test names within C3 (D7);
- OQ5 → no summary `max-width` (D1);
- OQ6 → v4: each separator travels with the following link in an `inline-block` wrapper (D2, D10) — confirmed at G0.

Decided at G0:
- **OQ7 — the extra space in Chrome's computed accessible name** (D6): **resolved as option (a)** at Checkpoint 148. The known Chrome computed-name discrepancy stays documented in D6 without weakening the approved accessible-name requirement. The options as presented before G0:
  - **(a) keep the approved markup, `inline-flex` and the global `.sr-only` — recommended [FOR-G0]:** Chrome's `PDF-side N , åpnes i ny fane` is recorded as a known, CSS-induced browser computation; the exact name stays required and is asserted in jsdom (PL1); 1.17-M4 decides whether the speech differs. It keeps the binding markup, the shared `.sr-only` and the 24px target.
  - **(b) deviate to obtain the exact name in Chrome**, using one of the measured variants, each of which gives up the global `.sr-only` on the suffix for a local inline hiding technique with `font-size: 0` whose screen-reader robustness is unverified:
    - **n1** (called "v4" before G0): an `inline` link (against DESIGN.md:391's `inline-flex`) — 20px tall, below the 24px target;
    - **w2:** an `inline-block` link (against DESIGN.md:391's `inline-flex`) — 24px;
    - **w3:** an `inline-flex` link with one extra inner `span` around its content (extra markup inside the `<a>`, beyond UX-DR-27) — 24px.
  Recommendation before G0: (a). **Decision at G0: (a).** Choosing any (b) variant later is a deviation from the binding markup or design and needs the developer's explicit approval ("Ask First").

## Assumptions

- The recorded fixture's summary has 938 characters, no newline, no `<`, and pages `[1, 2, 3, 5, 6]`; none of the five key-concept terms, flashcard fronts or quiz questions occurs in it.
- `GET /api/demo/sample.pdf` answers 200 `application/pdf` in demo mode (checked at Checkpoint 139).
- The browser's PDF viewer honours `#page=N`; if not, the PDF still opens (EXPERIENCE.md:174).
- `pdfSource` never contains a `#` fragment (D2).
- The probe measurements in D6, D9 and D10 come from scratch pages loading the real `globals.css`, not from the app; they are re-checked in G2.

## Independent-review checklist

- [ ] Every AC maps to matrix rows; no requirement is invented; UX-DR-2 is traced.
- [ ] The markup equals UX-DR-27 character for character plus the stated class names and the `page-links__item` wrapper; the strings match EXPERIENCE.md (U+2197, U+00B7, no NBSP).
- [ ] No HTML or Markdown interpretation anywhere.
- [ ] `PageLinks` holds no URL; the demo source is built in one place; the custom base URL is tested (PS8).
- [ ] C3 (D7) is inside the freeze boundary, narrow and complete; no other existing test breaks.
- [ ] D9 keeps the space before ↗; D10 keeps each separator with the following link, the 8px spacing and 320px reflow; its trade-offs are stated.
- [ ] D6 records Chrome's name without weakening the exact-name requirement; OQ7 is visible.
- [ ] The CSS stays within the existing tests' limits; no new selector contains `.result-panel`.
- [ ] No scope from Stories 1.18–1.21 or Epic 2.
- [ ] Story 1.16's M-2/M-4 exceptions remain open, and Story 1.17's own checks use distinct labels.

## Approval and freeze boundary

- **G0 done:** the developer approved revision 4 at Checkpoint 148 on 2026-11-18, including D1–D10, the binding C3 scope in D7, OQ1–OQ6 as provisionally resolved (OQ6: the v4 wrapper layout), OQ7 option (a), the documented Chrome computed-name discrepancy, the conditional 1.17-M4 deferral rule and the freeze boundary. `status` is `ready-for-dev`; implementation starts at a later checkpoint.
- The sections from "Intent" to the end of "I/O & Edge-Case Matrix" — including Strings, traceability, the Decisions with the binding C3 scope (D7), and the conflicts — are wrapped in `<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">…</frozen-after-approval>`, preceded by the `<!-- APPROVED … -->` comment. Only the developer can change the frozen block.
- The C3 detail table, the Code Map, gates and the later sections stay outside the frozen block.

## Implementation Notes

- **2026-11-19 — implementation commit `12dee31095fc0c590698f56f73a7ed79535b7f97`** (`feat(story-1.17): render summary and PDF page links`): exactly the 12 Code Map files (6 modified: `globals.css`, `ResultTabs.tsx`, `DemoOutcome.tsx`, `demo-start.test.tsx`, `results-shell.test.tsx`, `result-tabs.test.tsx`; 6 new: `lib/pdf-source.ts`, `PageLinks.tsx`, `SummaryContent.tsx`, `page-links.test.tsx`, `summary.test.tsx`, `summary-css.test.ts`), built in three stages A–C, each independently reviewed (A PASS, B PASS, C PASS WITH MINOR CHANGES), plus a whole-story review (PASS, Checkpoint 156). C3 was applied within D7 items 1–5. Session log: [973-2026-11-19-20-58-34-story-1-17-summary-page-links.md](../../.logs/amma-kwaasi-eide/973-2026-11-19-20-58-34-story-1-17-summary-page-links.md).
- **Rendering:** the summary is one plain React text node in `p.summary-text` (no HTML or Markdown interpretation; line breaks by `white-space: pre-line`); the page links follow as a sibling `div.page-links` built by `PageLinks`, which holds no URL and receives its source as an input. Demo mode passes `demoPdfSource()` (`<API base URL>/api/demo/sample.pdf`); each link opens `…#page=N` in a new tab with `rel="noopener"`.
- **Other panels:** Nøkkelbegreper, Flashkort and Quiz still hold only their visually hidden `h3`; their content is Stories 1.18–1.20 (CF-3, row SC2).
- **OQ7:** option (a) as approved at G0: the approved UX-DR-27 markup, the `inline-flex` links and the global `.sr-only` are kept; Chrome's computed name `PDF-side N , åpnes i ny fane` is a known discrepancy (D6).
- **Test hardening:** after the Stage A review, m1–m3 (PL9 `#page=` literal, PL3 every separator `aria-hidden`, PL1 direct children and the exposed sr-only span); after the Stage C review (Checkpoint 155), M1 (the CSS section must be flat: no at-rule, grouped or multi-line selector) and M2 (exact property sets and values, no duplicate property).

## Spec Change Log

- **2026-11-18 — revision 1 (draft, Checkpoint 140):** first draft from Story 1.17 (`epics.md:890–918`), AR-19, AD-10, AD-13, AD-18, UX-DR-23, UX-DR-27, AF-5, AF-7, AF-12, `EXPERIENCE.md`, `DESIGN.md`, the Story 1.14, 1.15 and 1.16 specs and the existing frontend; decisions D1–D8 proposed (FOR-G0), five open questions, compatibility correction C3. Not reviewed, not approved.
- **2026-11-18 — revision 2 (draft, Checkpoint 142):** applies the Checkpoint 141 review (F1–F18) and the developer's provisional choices (OQ1–OQ5, F2, F3): F1 PL1 compares the joined text; F2 D9 (`white-space: pre` on the arrow); F3 D10 (inline flow, `div` row) and OQ6; F4 C3 item 5; F5 all four test names; F6 C3 scope into D7; F7 PL9 strips comments; F8 PS8; F9 UX-DR-2; F10 1.17-M1 to M4 and the NOT TESTED rule; F11–F18 clarifications. Matrix 34 rows. Not approved.
- **2026-11-18 — revision 3 (draft, Checkpoint 144):** applies the Checkpoint 143 review (G1–G7) and the developer's provisional choice of v4 for OQ6: D2 and D10 rewritten for the `inline-block` `span.page-links__item` wrapper (each separator with the following link, `white-space: pre` on the separator), with measurements in the real panel structure and the trade-offs; G1 the incorrect revision-2 320px figures replaced; G2 the `div` rationale corrected (a block after the paragraph, never inside a `<p>`); G3 the accessible-name investigation recorded in D6 (Chrome's `PDF-side N , åpnes i ny fane`, its cause and the variants) without weakening the exact-name requirement, and the new OQ7; G4 PL9 string-aware comment removal; G5 small-font token checks in CR3 and CR4; G6 `review_loop_iteration: 2`; G7 the `.result-panel` selector restriction stated (Boundaries, D5, CR5). PL1–PL3 updated, CR7 added; 1.17-M2 and 1.17-M4 updated; matrix 35 rows. Not approved.
- **2026-11-18 — revision 4 (draft, Checkpoint 146, text only):** applies the Checkpoint 145 review: H1 D6 and OQ7 list all three exact-name variants (v4 20px; w2 and w3 24px), each giving up the global `.sr-only` for an unverified local hiding technique, w3 adding markup inside the `<a>`; the incorrect "every exact-name variant is 20px" claim removed; (a) kept as the recommendation; H2 the cause stated as two independent sources of non-inline boxes (the `inline-flex` children and the absolutely positioned `.sr-only`); H3 the deferral record for 1.17-M4 in the `issues.md:73` follow-up; H4 1.17-M2 split into a 320 CSS px and a 200% zoom condition, the 8px check only where two or more links share a line; H5 React keys stated; `review_loop_iteration: 3`. Matrix unchanged (35 rows). Not approved.
- **2026-11-18 — Checkpoint 148: APPROVED by the developer (G0)** (revision 4) and frozen: `status` `draft` → `ready-for-dev`; the APPROVED comment and the `frozen-after-approval` markers added around "Intent" … "I/O & Edge-Case Matrix"; inside the block only three approval edits — the Decisions intro states that D1–D10 are approved and binding, D6 records OQ7 as decided (option a), and the rejected inline-link name variant formerly called "v4" is renamed **n1** (its technical description unchanged); outside the block the draft header comment, the tag legend, the Open questions (OQ1–OQ6 confirmed, OQ7 resolved), the 1.17-M4 deferral rule ("only if it cannot be performed") and this "Approval and freeze boundary" section are updated. No technical requirement, test expectation, the 35-row matrix or the scope changed.

## Review Triage Log

- **2026-11-18 — Checkpoint 141, independent adversarial review of revision 1:** REVISION REQUIRED; 2 MAJOR (F1, F2), 8 MINOR (F3–F10), 8 observations (F11–F18). All addressed in revision 2.
- **2026-11-18 — Checkpoint 143, independent re-review of revision 2:** PASS WITH MINOR CHANGES; F1–F18: 16 PASS, 2 PARTIAL (F3, F13); 3 MINOR (G1–G3), 4 observations (G4–G7); OQ6 compared (v0–v6) with v4 recommended; C3 confirmed complete; 34 rows confirmed. All addressed in revision 3.
- **2026-11-18 — Checkpoint 145, final focused review of revision 3:** PASS WITH MINOR CHANGES; G1–G7 all PASS; the Checkpoint 144 probes reproduced exactly (Chrome 156.0.8078.82); v4 layout sound; option (a) acceptable; 1 MINOR (H1: two more exact-name variants w2/w3 at 24px), 4 observations (H2–H5); C3 complete; 35 rows and 17 + 11 + 7 confirmed. All addressed in revision 4.
- **2026-11-18 — Checkpoint 147, narrow confirmation of revision 4:** PASS; H1–H5 all PASS; consistency check clean; observations O1 (the label "v4" used for both the OQ6 wrapper layout and an OQ7 name variant) and O2 (review IDs in normative text, harmless).
- **2026-11-18 — Checkpoint 148, developer decisions (G0):** D1–D10 approved including the C3 scope; OQ1–OQ6 confirmed; OQ7 option (a); the Chrome discrepancy documented without weakening the exact-name requirement; 1.17-M4 deferrable only if it cannot be performed (then NOT TESTED, with Chrome's name, the unverified speech and the OQ7 decision recorded in `issues.md:73`); C3 changes authorized only within D7; the freeze boundary approved; O1 resolved by renaming the OQ7 variant to n1.

## Verification

- **G1 (Checkpoint 157A, on the code committed as `12dee31`):** frontend 505 tests passed in 18 files (40 new for Story 1.17; all 35 matrix rows mapped to tests); `tsc --noEmit` pass; ESLint pass; `next build` pass; backend 1,132 tests passed (unchanged); 1,637 in total.
- **G2 (manual checks by the developer, 2026-11-19): PASS, with one observation.**
  - 1.17-M1 PASS: in Chrome, links for pages 1, 2, 3, 5 and 6; `PDF-side 3` opened the sample PDF at page 3 in a new tab; a visible space before ↗.
  - 1.17-M2 at 320 CSS px PASS with observation: no horizontal scroll (Console `scrollWidth > innerWidth` false); that no separator ends a line is supported by visual observation and the layout structure, not measured line by line.
  - 1.17-M2 at 200% zoom PASS: in Chrome, no horizontal scroll; same-line link gaps `[null, 11, 11, null, 11]`, all 11px (at least 8px).
  - 1.17-M3 PASS: visible focus ring; Tab order through the links 1, 2, 3, 5, 6.
  - 1.17-M4 PASS: Windows Narrator in Chrome announced all five links with the page number and "åpnes i ny fane"; it sounded natural, with no unusual pause before the comma. Chrome's computed name `PDF-side N , åpnes i ny fane` has one extra space before the comma and does not exactly match the approved name; the difference was not audible. OQ7 option (a) is unchanged.
- **G3:** the implementation commit `12dee31` contains exactly the 12 approved files. Not pushed; no pull request yet.
- Story 1.16's M-2 and M-4 remain NOT TESTED and its G2 gate incomplete; not affected by this story.
