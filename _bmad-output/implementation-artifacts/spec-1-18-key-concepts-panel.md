---
title: 'Story 1.18: Nøkkelbegreper panel'
type: 'feature'
created: '2026-11-20'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

**How to read this spec.** Every normative rule carries one of three tags:
- **[BINDING]** — an approved requirement from `epics.md`, `EXPERIENCE.md`, `DESIGN.md`, `ARCHITECTURE-SPINE.md`, the PRD or an earlier approved spec, with its source;
- **[FOR-G0]** — an implementation decision proposed by the author; **approved by the developer at G0 (Checkpoint 176, 2026-11-20) and now binding**;
- **[OPEN]** — a question that was open before G0; all of them were resolved at G0 (see "Open questions").

**Naming:** this spec's compatibility correction is called **CC-18** (not "C4"), to avoid confusion with Story 1.15's matrix row **C4** ("no results content"), whose comment `// C4: …` in `demo-start.test.tsx:829` CC-18 item 6 edits.

<!-- APPROVED at Checkpoint 176 (G0) by the developer on 2026-11-20: Story 1.18, revision 2a (SHA-256 of the whole file as reviewed after Checkpoint 175, before the approval and freeze edits: ad7c6276ee8dc26d8ae2779b957250605512e119a7d0a077a0833567902214d6; SHA-256 of the frozen normative text from "## Intent" to the end of the I/O & Edge-Case Matrix, after the one approval edit listed in the Spec Change Log: 39bba3ed0920b5fb49f0936c5d93ec4aa02a1f53cdbc1303182facc2d127ada6). Approved together: decisions D1–D8, including the binding CC-18 compatibility scope in D7 (test changes authorized only within its seven items); the CF-4 supersession of earlier frozen statements for the Nøkkelbegreper panel only, without editing those specs; OQ1 `ul`/`li` without `role="list"`; OQ2 D2's typography and spacing as written; OQ3 the term as a separate block paragraph; OQ4 an empty concepts array renders null; OQ5 CC-18 items 1–7 and the CSS appended after the Story 1.17 section, keeping the documented precedent for Story 1.19; OQ6 no lang hook (Story 2.6). Freeze boundary: from "## Intent" through the last row (KR6) of "## I/O & Edge-Case Matrix", inclusive; "## Code Map" and everything after it are outside the block. The block below is frozen: any change to it requires explicit renewed approval by the developer. This approval authorizes no implementation; implementation starts at a later checkpoint. Story 1.16's M-2/M-4 exceptions and its incomplete G2 gate remain open and are not affected. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**User story** (`epics.md:922–938`): as a student, I want each key concept with its explanation and page links, so that I can quickly see what matters in the lecture and where it comes from.

**Problem:** after Story 1.17 the Nøkkelbegreper panel holds only its visually hidden `h3`. The validated `results.key_concepts` (`{term, explanation, pages}[]`) reaches the browser but is not shown, although the reusable page-link component (`PageLinks`) and the demo PDF source already exist.

**Approach:** the Nøkkelbegreper panel shows the key concepts, in response order, as an unordered list. Each list item holds the term as a text block, the explanation as a separate text block (both plain text, line breaks preserved), and then the concept's page links, rendered by the existing `PageLinks` with the PDF source that `ResultTabs` already receives. No backend, contract, fixture or `PageLinks` change.

**In scope:**
- the key-concept list in the Nøkkelbegreper panel (term, explanation, page links);
- passing the existing `pdfSource` from `ResultTabs` to that panel;
- CSS for the list, the term and the explanation (existing tokens; D-10);
- Vitest coverage, and the narrow compatibility correction CC-18 to existing Story 1.16 and 1.17 tests (D7).

**Out of scope:**
- Flashkort content (Story 1.19) and Quiz content (Story 1.20); `Tilbake til start` and demo acceptance (Story 1.21);
- real-mode results (Story 2.6), real-mode PDF sources (Story 2.7), `lang="en"` on English results (Story 2.6, AF-5);
- any change to `backend/`, `samples/` (including `demo-response.json`), the API contract, dependencies or configuration;
- any change to `PageLinks`, `SummaryContent`, `pdf-source.ts`, `DemoOutcome.tsx`, the Story 1.17 CSS rules or the global `.sr-only` rule;
- any change to a frozen spec block, and any change to the status of Story 1.16's open manual checks.

## Boundaries & Constraints

**Always:**
- **[BINDING] Content** (Story 1.18 AC 1; UX-DR-24, `epics.md:255`; `EXPERIENCE.md:171`): each key concept shows its term and explanation as plain text with line breaks preserved, followed by its page links.
- **[BINDING] Panel heading** (Story 1.18 AC 2; UX-DR-22; AF-8, `EXPERIENCE.md:259`): the panel keeps its `h3` with the tab name as its first child; AF-8 defines `h4` only for quiz questions, so no heading is added for a concept.
- **[BINDING] Plain text only** (AR-19, AD-18): term and explanation are React text nodes; no `dangerouslySetInnerHTML`, no Markdown-to-HTML, no HTML parsing of AI text.
- **[BINDING] Page links** (UX-DR-27, `epics.md:258`; Story 1.17 D2): rendered only by the existing `PageLinks`, unchanged; no page-link markup is duplicated. Plain-text documents get no links (their `pages` are empty, AR-11). The accessible names, and Chrome's documented computed name `PDF-side N , åpnes i ny fane` (Story 1.17 D6, OQ7 option (a)), are unchanged.
- **[BINDING] Visual treatment from existing tokens** (Story 1.18 AC 4; D-10, `epics.md:299`; `DESIGN.md:338, 421`): no new token, no raw colour.
- **[BINDING] Reflow and targets** (UX-DR-38, `epics.md:278`; AF-11, AF-12): usable at 200% zoom and at 320 CSS px with no two-dimensional scrolling and no clipping under text-spacing overrides; link targets stay ≥ 24px (provided by `PageLinks`).
- **[BINDING] Language boundary** (AF-5, `EXPERIENCE.md:256`): demo results are `nb`; this story adds no `lang` attribute (real-mode `lang="en"` belongs to Story 2.6).
- **[BINDING] Story 1.16's accepted exceptions are untouched:** its M-2 and M-4 remain NOT TESTED manually and its G2 gate remains incomplete (`.logs/amma-kwaasi-eide/issues.md:74`); this story neither tests nor closes them.
- **[BINDING] CSS limits of the existing tests:** no `width:`/`height:` declarations, no raw colour, no new `--color-*` token, no new `:focus-visible` rule (`demo-css.test.ts`, `globals-css.test.ts`; `results-css.test.ts` R5/R7/R8 — R8 (`results-css.test.ts:162–167`) keeps 27 colour tokens, one `:focus-visible` rule, no `--color-*` declaration and no `outline: none` in its section — whose section runs to the end of the file and therefore also covers the new rules). No new selector contains `.result-panel` (Story 1.16 R5; Story 1.17 G7, `spec-1-17…:53`).
- **[FOR-G0] Placement of the new CSS:** appended as a "Story 1.18" section after the Story 1.17 section (the convention of Story 1.17, `spec-1-17…:53`, not a Story 1.18 source; see D2 and OQ5).
- **[BINDING] No new dependency.**
- **[FOR-G0] No new network call:** nothing new is fetched; the PDF opens only when the user follows a link (as Story 1.17).
- **[FOR-G0] Demo only for now:** nothing new renders outside demo S4.

**Ask First:** any Norwegian text not in "Strings"; any change to a file under "Never"; any change to `PageLinks` or its CSS; any heading for a concept.

**Never:** changes to `backend/`, `samples/`, the dependency and configuration files, `frontend/lib/*` (including `contracts.ts`, `generation.ts`, `pdf-source.ts`), `frontend/components/PageLinks.tsx`, `SummaryContent.tsx`, `DemoOutcome.tsx`, `DemoProvider.tsx`, `DemoControls.tsx`, `ResultNotices.tsx`, `frontend/app/page.tsx`, `frontend/app/layout.tsx`, existing rules in `globals.css`, the frozen blocks of any spec, or any existing test except as allowed by CC-18 (D7). `_bmad-output/planning-artifacts/architecture/technology.md` is not a source.

## Strings

| Use | Text | Source |
|---|---|---|
| Panel heading (visually hidden `h3`) | `Nøkkelbegreper` (existing, Story 1.16) | `EXPERIENCE.md:87` [BINDING] |
| Term | the response's `term`, unchanged | AR-19 [BINDING] |
| Explanation | the response's `explanation`, unchanged | AR-19 [BINDING] |
| Page links | as Story 1.17 (`PDF-side N ↗`, name `PDF-side N, åpnes i ny fane`, separator ` · `) | UX-DR-27 [BINDING] |

No new Norwegian text.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| Story 1.18 AC 1 | each concept: term and explanation as plain text, line breaks preserved, followed by its page links (UX-DR-24) | D1, D3, D4; rows KC1–KC9, KP1–KP3 |
| Story 1.18 AC 2 | the panel has an `h3` with the tab name | D1; rows RT1, KP1 |
| Story 1.18 AC 3 | Vitest covers the rendering and the page links | D8; rows KC1–KC13, RT1–RT3, KP1–KP9 |
| Story 1.18 AC 4 | D-10: visual treatment reuses existing tokens | D2; rows KR1–KR6 |
| UX-DR-2 (`epics.md:221`) | components styled from their tokens (`page-link` reused) | D2, D4 |
| FR-4, FR-5 | page references; results shown | D1, D4 |
| AR-19 / AD-18 | plain-text rendering | D3; rows KC2–KC6 |
| AR-11 / AD-10 | ≥ 5 concepts (backend); every PDF concept has ≥ 1 page; plain text has none | D5; rows KC8, KC10, KP2 |
| UX-DR-27 | page-link markup and names | D4; rows KC7, KP2, KP3 |
| UX-DR-38 / AF-11 / AF-12 (G-4) | reflow at 320 CSS px and 200% zoom; text spacing; targets ≥ 24px | D2; rows KR3, KR4; 1.18-M2 |
| AF-5 | `lang` only on generated text, real mode only | D6; row KC13 |
| AF-8 | `h3` per panel; `h4` only for quiz questions | D1; row KC13; 1.18-M4 |

## Decisions

All decisions below were proposed [FOR-G0] and were **approved by the developer at G0 (Checkpoint 176, 2026-11-20)**; they are binding.

- **D1 — semantic structure [FOR-G0]:** a new component `frontend/components/KeyConceptsContent.tsx` (props `{ concepts: readonly ValidatedKeyConcept[]; pdfSource: string | null }`) renders, after the panel's `h3`:
  ```tsx
  <ul className="key-concepts">
    {concepts.map((concept, index) => (
      <li key={index} className="key-concept">
        <p className="key-concept__term">{concept.term}</p>
        <p className="key-concept__explanation">{concept.explanation}</p>
        <PageLinks pages={concept.pages} pdfSource={pdfSource} />
      </li>
    ))}
  </ul>
  ```
  - an unordered list, because the concepts have no ranking and list semantics announce the item count (OQ1);
  - the term and the explanation are separate block paragraphs (OQ3); the term is not a heading (AF-8) and not `<strong>`/`<b>` (its weight is visual, D2);
  - the page-link row is a sibling block after the explanation, never inside a paragraph (Story 1.17 D2);
  - React keys: the index, because terms are not guaranteed unique and the list is never reordered (Story 1.17 H5 analogue);
  - no `aria-label`, no `role` override, no `lang` attribute anywhere in the list.
- **D2 — visual treatment (D-10) [FOR-G0]:** following the proposal in `DESIGN.md:421` (not decided there), from existing tokens only:
  - `.key-concepts`: `margin: 0; padding: 0; list-style: none;` (no bullets; see OQ1 for the WebKit/VoiceOver list-semantics note);
  - `.key-concept + .key-concept`: `margin-top: var(--space-6);` — spacing, not a border or separator (OQ2);
  - `.key-concept__term`: `margin: 0; white-space: pre-line; overflow-wrap: anywhere; color: var(--color-text); font-size: var(--font-body-size); font-weight: var(--font-subheading-weight); line-height: var(--font-body-line-height);` — body type at weight 600, composed from the existing 600 weight token (OQ2, CF-2);
  - `.key-concept__explanation`: `margin: var(--space-1) 0 0; white-space: pre-line; overflow-wrap: anywhere; color: var(--color-text); font-size: var(--font-body-size); font-weight: var(--font-body-weight); line-height: var(--font-body-line-height);`;
  - the page-link row keeps its Story 1.17 rules (`.page-links` `margin: var(--space-3) 0 0`).
  - **Placement (J15, J16):** the rules are appended as a "Story 1.18" section after the Story 1.17 section, starting with `.key-concepts {`. Trade-off: placing them before the Story 1.17 section (after `.result-panel`) would leave `summary-css.test.ts` untouched, but appending keeps the stylesheet sections in chronological story order, the convention since Story 1.15. Appending requires the narrow CC-18 item 7 correction to the Story 1.17 CSS test, and Story 1.19 will need the same kind of boundary adjustment to `key-concepts-css.test.ts` (its KR5 "nothing follows" check). This is a G0 choice (OQ5).
- **D3 — text handling [FOR-G0]:** term and explanation are each one React text node; line breaks are preserved by `white-space: pre-line`; long words wrap by `overflow-wrap: anywhere`; nothing is parsed, trimmed or changed.
- **D4 — data and page references [FOR-G0]:** `ResultTabs` renders `<KeyConceptsContent concepts={results.key_concepts} pdfSource={pdfSource} />` in the panel whose `tab.key === "key-concepts"`, after the `h3`, in response order. It reuses `ValidatedKeyConcept` (`contracts.ts:66–70`) and `PageLinks` unchanged (its preconditions hold: pages strictly increasing per `generation.ts`, and the demo source has no fragment). `DemoOutcome` already passes `pdfSource={demoPdfSource()}` and is not changed. The Sammendrag, Flashkort and Quiz panels are unchanged.
  - **Stale comment (J9):** the `DemoOutcome.tsx` header comment ("the other panels' content is Stories 1.18–1.20") becomes historically outdated after this story; it stays untouched to keep `DemoOutcome.tsx` outside the scope (ten-file Code Map). A later story that edits `DemoOutcome.tsx` may update it.
- **D5 — empty and unavailable data [FOR-G0]:**
  - a concept with `pages: []`, or `pdfSource === null`, renders no link row (`PageLinks` returns `null`; Story 1.17 D2);
  - an empty `concepts` array renders nothing (`null`, no empty `<ul>`, no placeholder text) (OQ4). In demo S4 this state is unreachable only because the **backend** enforces the minimum: Gate 3 requires at least 5 key concepts (`stage5_gates.py:42`, AR-11). The frontend shape check does **not** enforce it — `generation.ts:10` explicitly allows the item lists to be empty — which is why the component needs this rule.
- **D6 — accessibility [FOR-G0]:**
  - the tab pattern, the roving tabindex, the `hidden` inactive panels and the panel `tabIndex={0}` stay unchanged (Story 1.16 D10–D13);
  - in the selected Nøkkelbegreper panel the sequential focus order is: the panel, then the concept links in concept order and, within a concept, page order; when another tab is selected, the concept links are inside a `hidden` panel and not focusable;
  - the link names stay exactly as Story 1.17 (including the documented Chrome computed-name discrepancy, Story 1.17 D6/OQ7 (a));
  - no `lang` attribute (AF-5; Story 2.6 adds `lang="en"` to the term and explanation elements in real mode, OQ6).
- **D7 — compatibility correction CC-18 [FOR-G0]:** Story 1.18 makes the Nøkkelbegreper panel non-empty, adds links outside the Sammendrag panel and appends CSS after the Story 1.17 section. This supersedes, **for the Nøkkelbegreper panel only**, the earlier frozen statements listed in CF-4, without editing those specs. Exactly these existing tests may change, and only as stated; every other assertion, test and test name stays unchanged:
  1. `frontend/__tests__/result-tabs.test.tsx`, **P3** (lines 466–481). Old: the Nøkkelbegreper panel's children are `["H3.sr-only"]`. Obsolete because the panel now holds the list. New: `["H3.sr-only", "UL.key-concepts"]` for `key-concepts`; Sammendrag unchanged; Flashkort and Quiz stay `["H3.sr-only"]`; the name may say that Nøkkelbegreper also holds the key concepts. Still protected: every panel starts with its visually hidden `h3` with the tab name and no count.
  2. `frontend/__tests__/result-tabs.test.tsx`, **K8** (lines 508–518). Old: after ArrowRight the order is `[Vis eksempel, Nøkkelbegreper tab, panel]`. Obsolete because the selected panel now has links. New: `[…, panel, ...conceptLinks]`, with `conceptLinks` the panel's `a.page-link` elements, asserted to have length 6 (the fixture's pages 1 + 1 + 2 + 1 + 1); the name may add "and its page links". Still protected: the new tab and its panel follow `Vis eksempel` in order; the previously selected tab is not in the order; no other element is focusable.
  3. `frontend/__tests__/summary.test.tsx`, **SC2** (lines 96–101). Old: Nøkkelbegreper, Flashkort and Quiz each hold only `["H3.sr-only"]`. New: Flashkort and Quiz stay `["H3.sr-only"]`; Nøkkelbegreper is `["H3.sr-only", "UL.key-concepts"]`; the name changes accordingly. Still protected: the summary is rendered only in the Sammendrag panel.
  4. `frontend/__tests__/summary.test.tsx`, **PS3** (lines 145–154). Old: exactly 5 links in Resultater, all in the Sammendrag panel; no concept term anywhere. New: exactly 5 links in `#result-panel-summary` and exactly 6 in `#result-panel-key-concepts` (11 in Resultater), every link inside one of those two panels; each concept term appears in `#result-panel-key-concepts` and not in `#result-panel-summary`; the flashcard and quiz assertions stay unchanged; the name may become "links only in the Sammendrag and Nøkkelbegreper panels; no flashcard or quiz content (PS3)". Still protected: no link or content in the Flashkort and Quiz panels.
  5. `frontend/__tests__/results-shell.test.tsx`, **S3** (lines 180–191). Old: line 185 "no concept term in the body", line 189 "every `<a>` inside `#result-panel-summary`". New: line 185 becomes "each concept term is inside `#result-panel-key-concepts` and not inside `#result-panel-summary`"; line 189 becomes "every `<a>` in Resultater is inside `#result-panel-summary` or `#result-panel-key-concepts`"; lines 184, 186 and 187 stay unchanged; the name may become "only the summary, the key concepts and their page links are rendered (S3)". Still protected: no flashcard or quiz content.
  6. `frontend/__tests__/demo-start.test.tsx`, test "success: heading, notice, guidance gone, focus kept, announced, no repeat, summary only (C1–C5)" (lines 806–840). Old: the Story 1.15 row-C4 comment (line 829) and line 834 "every `<a>` inside `#result-panel-summary`". New: line 834 accepts `#result-panel-summary` or `#result-panel-key-concepts`; the Story 1.15 row-C4 comment names Story 1.18; the name may change "summary only" to "summary and key concepts". Every other assertion in the test stays unchanged.
  7. `frontend/__tests__/summary-css.test.ts`, `section()` (lines 79–83). Old: the Story 1.17 section runs from `.summary-text {` to the end of the file. What actually breaks: only **CR5**'s exact selector list (lines 174–181), because the Story 1.18 selectors would be appended to it; the trailing-whitespace check (line 95) and the boundary test (lines 125–131) still pass on their own. New: `section()` ends where the Story 1.18 section starts (`.key-concepts {`); as an **addition**, the boundary test asserts that `.key-concepts {` occurs exactly once and after `.page-links__separator`. Every CR1–CR7 assertion stays unchanged, and the trailing check keeps its meaning for the Story 1.17 section. Still protected: the Story 1.17 section is flat and holds exactly its six approved rules.
  No other existing test file changes.
- **D8 — verification [FOR-G0]:** automated rows in the matrix below; manual checks 1.18-M1 to 1.18-M4 under "Approval gates". Automated rows prove DOM structure and CSS source text only, never browser layout or speech. Each manual check records the browser and version, the operating system, and how the width, zoom or text spacing was set.

## Conflicts and source findings

- **CF-1 — D-10 proposal vs. decision:** `DESIGN.md:421` proposes "term in body at weight 600, explanation in body, page links in a `page-link` row" but marks it "not decided"; D2 adopts it for G0.
- **CF-2 — no 600-weight body token:** `{typography.body}` is 400; the 600 weight exists as `--font-subheading-weight`, `--font-heading-weight` and `--font-flashcard-term-weight`. D2 composes body size and line-height with `--font-subheading-weight` (as `DESIGN.md:342` composes `h4`), with no new token (OQ2).
- **CF-3 — Story 1.16 AC 3 for Flashkort and Quiz:** `epics.md:883–885` (the panels stay empty until Stories 1.18–1.20) still applies to Flashkort and Quiz.
- **CF-4 — supersession of earlier frozen statements [FOR-G0] (J1):** Story 1.18 changes the accepted behaviour **for the Nøkkelbegreper panel only**; Sammendrag keeps its Story 1.17 behaviour, and Flashkort and Quiz keep their approved empty-panel behaviour. None of the earlier specs is edited (as Story 1.16 superseded parts of Story 1.15, and Story 1.17 D7 listed the superseded rows). Superseded for Nøkkelbegreper:
  - **Story 1.15** row **C4** (`spec-1-15…:187`): "none of the fixture's summary text, tab names or page links is rendered (Stories 1.16–1.20)" — concept terms and their page links are now rendered;
  - **Story 1.16 D12** (`spec-1-16…:180`): each panel "holds only `<h3 className="sr-only">`" and "all four panels are empty";
  - **Story 1.16 OQ7** empty-panel acceptance (`spec-1-16…:139`, `:215`);
  - **Story 1.16** row **S3** (`spec-1-16…:246`): "no concept terms … no `<a>` in Resultater";
  - **Story 1.16** row **P3** (`spec-1-16…:250`): "each panel holds exactly one element, an `h3.sr-only`";
  - **Story 1.16** row **K8** (`spec-1-16…:281`): "the newly selected tab, then its panel" — the panel's links now follow;
  - **Story 1.17 Approach** (`spec-1-17…:27`, "the other three panels stay empty") and **CF-3** (`spec-1-17…:143`);
  - **Story 1.17** rows **SC2** (`spec-1-17…:187`) and **PS3** (`spec-1-17…:192`);
  - **Story 1.17 D7**'s statement that K8 stays unchanged (`spec-1-17…:131`);
  - **Story 1.17 D4** (`spec-1-17…:108`): "`ResultTabs` passes it, with `results.summary`, only to the Sammendrag panel" — the source now also reaches the Nøkkelbegreper panel;
  - **Story 1.17 D7 items 1–3** (`spec-1-17…:126–128`): "every `<a>` in Resultater is inside `#result-panel-summary`" (items 1 and 2), "lines 185–187 (key concepts, flashcard fronts, quiz questions absent) stay unchanged" (item 2, the key-concept line only) and "the other three panels keep exactly one child, `h3.sr-only`" (item 3, for Nøkkelbegreper only);
  - **Story 1.16** (`spec-1-16…:136`): the protected "no summary text and no `<a>`" assertions of its C2 scope, for the `<a>` part in the Nøkkelbegreper panel;
  - **Story 1.16 Approach** (`spec-1-16…:28`): four panels "each holding only a visually hidden `h3` for now", and **[BINDING] No content rendering beyond this story** (`spec-1-16…:53`): "none of the response's … key concepts … is rendered";
  - **Story 1.15 D8** (`spec-1-15…:89`): in S4 "nothing of its content is rendered" (already superseded in part by Stories 1.16 and 1.17).

  These statements are superseded **only** where Story 1.18 adds Nøkkelbegreper content and its page links. Every other part of them, and every other rule of Stories 1.15, 1.16 and 1.17, stays in force; in particular nothing of the Flashkort and Quiz content is rendered, and the summary rules of Story 1.17 are unchanged.
- **CF-5 — Story 1.17 CSS test boundary (J3, J4):** `summary-css.test.ts` treats the rest of `globals.css` as the Story 1.17 section; appending any rule breaks its CR5 exact selector list (the trailing-whitespace and boundary checks do not fail on their own). Corrected by CC-18 item 7. KR6 also addresses Story 1.17's whole-story review observation O1 (Checkpoint 156; recorded in `.logs/amma-kwaasi-eide/973-2026-11-19-20-58-34-story-1-17-summary-page-links.md:43`) for the new section: the new class names must not appear before their section.

## I/O & Edge-Case Matrix

Component rows render `KeyConceptsContent` or `ResultTabs` directly; page rows render `<Home />` with the recorded demo reply (`demo-fixtures`); CSS rows read `globals.css` as text with comments removed first (as `summary-css.test.ts:26–43`). None of them proves browser layout or speech (see the manual checks).

| Row | Setup | Expected |
|---|---|---|
| KC1 | component, five concepts, source set | one `ul.key-concepts` with five `li.key-concept` in input order; each `li`'s children are exactly `P.key-concept__term`, `P.key-concept__explanation`, `DIV.page-links` |
| KC2 | component | each term and explanation `textContent` equals the input exactly; both paragraphs hold text nodes only |
| KC3 | term and explanation containing `<script>alert(1)</script>` | rendered literally; no `script` element |
| KC4 | HTML-like text (`<b>x</b>`, `<img src=x>`) | rendered literally; no `b` or `img` element |
| KC5 | Markdown text (`**fet**`, `# Overskrift`, `- punkt`) | rendered literally; no `strong`, `h1` or `li` inside the paragraphs |
| KC6 | a newline in the term and in the explanation | `textContent` keeps the newline unchanged; text nodes only |
| KC7 | a concept with pages `[3, 6]` | one link row in that item with `#page=3` then `#page=6` on the supplied source, one separator, names `PDF-side 3, åpnes i ny fane` and `PDF-side 6, åpnes i ny fane` |
| KC8 | a concept with `pages: []` | that item's children are exactly term and explanation; no link row; other items unaffected |
| KC9 | `pdfSource = null` | no link row and no `a` in the list; terms and explanations still shown |
| KC10 | an empty `concepts` array | renders nothing (`container.firstChild` is `null`) |
| KC11 | two concepts with the same term | both items render, in order; no React key warning (`console.error` not called) |
| KC12 | the component source, scanned by a copy of the string-aware `scanSource` from `page-links.test.tsx:57–94` placed in `key-concepts.test.tsx` (not exported or shared; `page-links.test.tsx` unchanged) | positive control first: the scanner sees the string literal `key-concept__term`; then no URL literal (`http`, `/api/demo`) and no `dangerouslySetInnerHTML` or `innerHTML` in literals or code |
| KC13 | component | no heading element inside the list; no `[lang]` anywhere in the list subtree (the `ul`, each `li`, the term and explanation paragraphs and the link rows); no `aria-label` or `role` attribute on the list or its items |
| RT1 | `ResultTabs`, source set | the Nøkkelbegreper panel's children are exactly `H3.sr-only`, `UL.key-concepts`; the `h3` reads `Nøkkelbegreper` |
| RT2 | `ResultTabs`, source set and summary pages non-empty | Sammendrag holds `H3.sr-only`, `P.summary-text`, `DIV.page-links`; Flashkort and Quiz hold only `H3.sr-only` |
| RT3 | `ResultTabs`, source `https://example.test/doc.pdf` | the concept links use the same source as the summary links |
| KP1 | page, demo S4, Nøkkelbegreper selected | the panel is visible; five items; terms and explanations equal the fixture's `key_concepts` in order |
| KP2 | page, base URL empty | per item, the hrefs are `http://127.0.0.1:8000/api/demo/sample.pdf#page=N` for pages `[1]`, `[2]`, `[3, 6]`, `[5]`, `[2]`; every link `target="_blank"`, `rel="noopener"` |
| KP3 | page, Nøkkelbegreper selected | `within(panel).getAllByRole("listitem")` has length 5; within each item, the links (`within(item).getAllByRole("link")`) have exactly the accessible names `PDF-side N, åpnes i ny fane` for that item's pages, in order; across the panel, `getAllByRole("link", { name: "PDF-side 2, åpnes i ny fane" })` has length 2 (items 2 and 5) and every other page name has length 1 |
| KP4 | page, Nøkkelbegreper selected by click | focus order `[Vis eksempel, Nøkkelbegreper tab, panel, …6 concept links in order]` |
| KP5 | page, Sammendrag selected (default) | the Nøkkelbegreper panel is `hidden`; each concept link's closest `[hidden]` is that panel; none is in the focus order |
| KP6 | page | only `/api/status` and `/api/demo` are fetched; no URL contains `sample.pdf` |
| KP7 | page, real mode | no `ul.key-concepts` and no `.key-concept` |
| KP8 | page, `NEXT_PUBLIC_API_BASE_URL` = `http://localhost:9000` | the concept links use that base |
| KP9 | page, Nøkkelbegreper then ArrowRight to Flashkort and back | the list is unchanged (same five items, same DOM node); no request |
| KR1 | CSS | `.key-concepts` has exactly `margin: 0`, `padding: 0`, `list-style: none` |
| KR2 | CSS | `.key-concept + .key-concept` has exactly `margin-top: var(--space-6)` |
| KR3 | CSS | `.key-concept__term` has exactly the D2 properties and values |
| KR4 | CSS | `.key-concept__explanation` has exactly the D2 properties and values |
| KR5 | CSS, comments removed first | the Story 1.18 section is flat (no at-rule, grouped or multi-line selector), holds exactly the four selectors above in order, uses only tokens defined in `:root`, no `width`/`height`, no `#`/`rgb`/`hsl`, no `.result-panel` selector; nothing but whitespace follows it |
| KR6 | CSS, comments removed first | `.key-concepts {` occurs once, after `.page-links__separator`; none of `.key-concepts`, `.key-concept`, `.key-concept__term`, `.key-concept__explanation` appears before it |

</frozen-after-approval>

## Code Map [FOR-G0]

| File | Change |
|---|---|
| `frontend/components/KeyConceptsContent.tsx` | new (D1, D3, D5) |
| `frontend/components/ResultTabs.tsx` | render `KeyConceptsContent` in the Nøkkelbegreper panel; header comment (D4) |
| `frontend/app/globals.css` | append the Story 1.18 section (D2) |
| `frontend/__tests__/key-concepts.test.tsx` | new: rows KC1–KC13, RT1–RT3, KP1–KP9 |
| `frontend/__tests__/key-concepts-css.test.ts` | new: rows KR1–KR6 |
| `frontend/__tests__/result-tabs.test.tsx` | CC-18 items 1–2 only |
| `frontend/__tests__/summary.test.tsx` | CC-18 items 3–4 only |
| `frontend/__tests__/results-shell.test.tsx` | CC-18 item 5 only |
| `frontend/__tests__/demo-start.test.tsx` | CC-18 item 6 only |
| `frontend/__tests__/summary-css.test.ts` | CC-18 item 7 only |

Ten files: 3 new, 7 modified. No backend, fixture, contract or dependency file; `DemoOutcome.tsx` is deliberately excluded (D4, J9).

## Approval gates

- **G0:** the developer approves D1–D8, the CC-18 scope, the CF-4 supersession and the answers to OQ1–OQ6; the block from "## Intent" through the last matrix row is then frozen.
- **G1:** `npm test`, `npx tsc --noEmit --incremental false`, `npm run lint`, `npm run build` pass; the backend suite passes unchanged.
- **G2 — manual checks** (Story 1.18's own; distinct from Story 1.16's still-open M-2 and M-4). Each records the browser and version, the OS, and how width, zoom or text spacing was set:
  - **1.18-M1:** in Chrome, Nøkkelbegreper shows five concepts in fixture order; each term is visibly heavier than its explanation; the link rows read `PDF-side 1`, `PDF-side 2`, `PDF-side 3 · PDF-side 6`, `PDF-side 5`, `PDF-side 2`; `PDF-side 6` under *Bestillingspunkt* opens the sample PDF at page 6 in a new tab;
  - **1.18-M2, three conditions:** at 320 CSS px, no horizontal scroll (`document.documentElement.scrollWidth > window.innerWidth` is `false`), long terms and explanations wrap, no separator ends a line; at 200% browser zoom, no horizontal scroll, no overlap, and wherever two or more links share a line they are at least 8px apart; where practicable, with a text-spacing override (WCAG 1.4.12 values: line height 1.5, paragraph spacing 2em, letter spacing 0.12em, word spacing 0.16em, for example via a bookmarklet or DevTools-injected style), no text is clipped or overlapped — if not practicable, recorded as NOT TESTED;
  - **1.18-M3:** keyboard only: from the Nøkkelbegreper tab, Tab reaches the panel and then the six concept links in order with a visible focus ring; Left/Right still switch tabs; links in hidden panels are never reached;
  - **1.18-M4:** Windows Narrator in Chrome: record how the list is announced (for example its item count), that the term is read as ordinary text and **not** announced as a heading, that the explanation is read, and one link name.
  Any check not performed is recorded as **NOT TESTED**, never as passed. The 1.18-M2 result is new evidence for the open G-4 item (`issues.md:25`), added at the documentation step; it does not close G-4, whose binding checks remain with Stories 1.21 and 3.6.
- **G3:** approval of the exact staged file list (the ten Code Map files). The later documentation step (the session log, the `issues.md` updates and this spec's Implementation Notes and Verification) is a separate commit outside the ten-file implementation scope, as in Story 1.17 (`943a4e7`).

## Proposed implementation stages

- **Stage A:** `KeyConceptsContent` and rows KC1–KC13 (component only).
- **Stage B:** `ResultTabs` integration, rows RT1–RT3 and KP1–KP9, and CC-18 items 1–6.
- **Stage C:** the CSS section, rows KR1–KR6, and CC-18 item 7.
Each stage is followed by an independent review.

## Dependencies & deferred work

- **Depends on:** Story 1.17 (`PageLinks`, `demoPdfSource`, the `pdfSource` prop on `ResultTabs`), merged in `92d2b46`.
- **Provides for:** Story 2.6 (real-mode results reuse `KeyConceptsContent`; `lang="en"` on the term and explanation elements per AF-5), Story 2.7 (object-URL source), Story 1.21 (demo acceptance, T-1 to T-3), Story 1.19 (the same CSS-boundary pattern, D2).
- **Still open, not closed by this story:** Story 1.16's M-2/M-4 exceptions and incomplete G2 gate (`issues.md:74`); G-4 (`:25`), which receives the 1.18-M2 evidence; the screen-reader follow-up (`:73`), whose note about "the empty panels" no longer applies to Nøkkelbegreper after this story (to be updated at the documentation step); the stale `DemoOutcome.tsx` comment (D4).

## Open questions

All six were **resolved by the developer at G0 (Checkpoint 176, 2026-11-20)**, each as recommended; the options as presented before G0 are kept below.

- **OQ1 — list element [RESOLVED at G0]:** **Decision:** use `<ul>`/`<li>` without an explicit `role="list"` (D1). *Options before G0:* (a) `<ul>`/`<li>` with term and explanation paragraphs; (b) `<dl>` with `<div>` groups (`dt` term, `dd` explanation and links). With `list-style: none`, WebKit (Safari/VoiceOver) may drop the list role; `role="list"` would restore it. The browsers in scope are Chrome, Edge and Firefox (`EXPERIENCE.md:280`) and the screen readers NVDA and Narrator (UX-DR-39). Choosing (b) `<dl>` requires coordinated changes to D1 and D2, rows KC1, KC8, KC13, RT1, KP3 and KR1–KR5, and CC-18 items 1 and 3 (which name `UL.key-concepts`); adding `role="list"` to the proposed `<ul>` instead requires only a narrower adjustment to KC13. *Author and reviewer recommendation:* (a) without `role="list"`.
- **OQ2 — visuals [RESOLVED at G0]:** **Decision:** D2's typography and spacing approved as written. *Options before G0:* confirm D2: term weight from `--font-subheading-weight` (600), `--space-6` (24px) between concepts, `--space-1` between term and explanation, no border or separator line between items. *Recommendation:* confirm as written.
- **OQ3 — term layout [RESOLVED at G0]:** **Decision:** the term is a separate block paragraph (D1). *Options before G0:* the term as its own block or as an inline lead-in to the explanation. *Recommendation:* its own block (it also gives Story 2.6 a separate element for `lang`).
- **OQ4 — empty array [RESOLVED at G0]:** **Decision:** an empty `concepts` array renders `null` (D5). *Options before G0:* render nothing or an empty list. *Recommendation:* render nothing.
- **OQ5 — CC-18 scope and CSS placement [RESOLVED at G0]:** **Decision:** CC-18 items 1–7 approved; the Story 1.18 CSS is appended after the Story 1.17 section; the precedent for Story 1.19 (the same boundary adjustment to `key-concepts-css.test.ts`) is kept (D2, D7). *Options before G0:* approve CC-18 items 1–7 as written, and the CSS placement in D2 (append after Story 1.17, accepting item 7 and the same pattern for Story 1.19), or place the section before the Story 1.17 section (after `.result-panel`). The alternative is not merely "CC-18 item 7 not needed": it requires coordinated changes to D2's placement text, KR5's section-end boundary (the section would end at `.summary-text {`, not at the end of the file), KR6's ordering assertion (after `.result-panel`, before `.summary-text {`, instead of after `.page-links__separator`), and the CC-18 compatibility boundary (item 7 dropped, the D7 lead-in and CF-5 reworded). *Recommendation:* append, and approve CC-18 as written.
- **OQ6 — `lang` hook [RESOLVED at G0]:** **Decision:** no `lang` hook now; real-mode language handling is left to Story 2.6 (D6). *Options before G0:* add nothing now, or prepare it. *Recommendation:* add nothing; Story 2.6 adds `lang="en"`.

## Assumptions

- The demo fixture stays as committed (`samples/demo-response.json`: five concepts, pages `[1]`, `[2]`, `[3, 6]`, `[5]`, `[2]`, no line breaks; no concept term occurs in the summary text and no flashcard front or quiz question occurs in a concept); KP rows read it rather than hard-coding the texts.
- jsdom computes the exact approved link names (as in Story 1.17); browser names are covered by 1.18-M4 and Story 1.17 D6.

## Independent-review checklist

- [ ] All four Story 1.18 ACs are traced to decisions and rows.
- [ ] No heading is introduced for a concept (AF-8); no `lang` attribute anywhere in the list (AF-5).
- [ ] `PageLinks` is reused unchanged; no link markup duplicated.
- [ ] Only existing tokens; the CSS limits of the older tests hold.
- [ ] CC-18 names every old assertion that Story 1.18 breaks, and nothing else; CF-4 lists every superseded frozen statement.
- [ ] No scope from Stories 1.19–1.21 or Epic 2.

## Approval and freeze boundary

- **G0 done:** the developer approved revision 2a at Checkpoint 176 on 2026-11-20: D1–D8 (including the seven CC-18 items in D7), the CF-4 supersession for the Nøkkelbegreper panel only (the earlier frozen specs are not edited), and the answers to OQ1–OQ6 recorded under "Open questions". Implementation was authorized afterwards (Checkpoint 177 onwards) and completed; G1, G2 and G3 were completed, and PR #44 was merged into `main` as `d294dc20a8f10b9084109369e96efa31874602d7` after GitHub CI passed (537 frontend and 1,132 backend tests). `status` is now `done`: the story is complete and administratively closed.
- The sections from "Intent" to the end of "I/O & Edge-Case Matrix" (including Boundaries, Strings, traceability, the Decisions with the binding CC-18 scope (D7), and the conflicts with the CF-4 supersession) are wrapped in `<frozen-after-approval …>…</frozen-after-approval>`, preceded by the `<!-- APPROVED … -->` comment. Only the developer can change the frozen block.
- The Code Map, the gates, the stages, the dependencies, the open questions and the later sections stay outside the frozen block.

## Implementation Notes

- **2026-11-20 — implementation commit `0864ce3d261736d14fc0f7cbde6e9d4b2b87f5ed`** (`feat(story-1.18): render key concepts with PDF page links`): exactly the ten Code Map files (7 modified: `ResultTabs.tsx`, `globals.css`, `result-tabs.test.tsx`, `summary.test.tsx`, `results-shell.test.tsx`, `demo-start.test.tsx`, `summary-css.test.ts`; 3 new: `KeyConceptsContent.tsx`, `key-concepts.test.tsx`, `key-concepts-css.test.ts`), built in three stages A–C, each independently reviewed (A PASS WITH FINDINGS, B PASS WITH FINDINGS, C PASS), plus a whole-story review (PASS WITH FINDINGS, Checkpoint 184). CC-18 was applied within D7 items 1–7. `DemoOutcome.tsx` was left untouched (D4, J9). Session log: [971-2026-11-20-22-33-48-story-1-18-key-concepts-panel.md](../../.logs/amma-kwaasi-eide/971-2026-11-20-22-33-48-story-1-18-key-concepts-panel.md).
- **Rendering:** `KeyConceptsContent` renders the concepts in response order as `ul.key-concepts` > `li.key-concept` (index key) with `p.key-concept__term`, `p.key-concept__explanation` (plain text nodes) and the unchanged `PageLinks` as a sibling block; `null` for an empty list. `ResultTabs` passes `results.key_concepts` and the existing `pdfSource` to the Nøkkelbegreper panel only.
- **CSS:** the Story 1.18 section is appended after the Story 1.17 section with exactly the four D2 rules and existing tokens only (OQ5).
- **Test hardening from the reviews:** L1–L3 and a D3 whitespace test (Stage A); M1, KP3 checks the link order within each concept (Stage B review, fixed in Stage C); P1, KC9 also checks the terms, and P2, KC11's index-key source check accepts any attribute order and whitespace on the one `<li>` tag (whole-story review).

## Spec Change Log

- **2026-11-20 — revision 1 (draft, Checkpoint 171):** first draft from Story 1.18 (`epics.md:922–938`), UX-DR-24, UX-DR-27, AF-5, AF-8, D-10 (`DESIGN.md:421`), the Story 1.16 and 1.17 specs and the existing frontend; decisions D1–D8 proposed (FOR-G0), six open questions, compatibility correction C4. Not reviewed, not approved.
- **2026-11-20 — revision 2 (draft, Checkpoint 173):** applies the Checkpoint 172 review (J1–J16): CF-4 lists every superseded frozen statement of Stories 1.15–1.17 for Nøkkelbegreper only (J1); the compatibility correction renamed CC-18 (J14); K8 lines 508–518 (J2); CC-18 item 7 and CF-5 state that only CR5 breaks and the boundary assertion is an addition (J3); the O1 source cited (J4); D5's empty-array rationale corrected (J5); KC12 copies the scanner and adds a positive control (J6); KC13 covers the whole list subtree (J7); KP3 handles the repeated page 2 (J8); the stale `DemoOutcome.tsx` comment recorded and left untouched (J9); RT2 setup (J10); comment stripping in KR5/KR6 (J11); the CSS placement re-tagged FOR-G0 with its sources (J12); CC-18 item 5 aligned with item 4 (J13); G-4 receives the 1.18-M2 evidence (J14); the placement trade-off and the Story 1.19 precedent recorded under D2 and OQ5 (J15, J16); 1.18-M2 adds a text-spacing check and 1.18-M4 the not-a-heading check; `review_loop_iteration: 1`. Matrix 31 rows; Code Map ten files. Not approved.
- **2026-11-20 — revision 2a (draft, Checkpoint 175, text only):** applies the Checkpoint 174 verification (K1–K3): CF-4 adds the remaining superseded frozen statements (Story 1.17 D4 and D7 items 1–3; Story 1.16 `:28`, `:53`, `:136`; Story 1.15 D8) with an explicit Nøkkelbegreper-only limit (K1); OQ5 states the coordinated changes the alternative placement would need (K2); OQ1 states the coordinated changes `<dl>` would need and that `role="list"` changes only KC13 (K3); the CSS limits cite `results-css.test.ts` R8; G3 notes that the documentation step is a separate commit. Decisions, open questions, matrix (31 rows), Code Map (ten files) and manual checks unchanged; `review_loop_iteration` stays 1. Not approved.
- **2026-11-20 — Checkpoint 176: APPROVED by the developer (G0)** (revision 2a) and frozen: `status` `draft` → `ready-for-dev`; the DRAFT comment replaced by the APPROVED comment, and the `frozen-after-approval` markers added around "Intent" … "I/O & Edge-Case Matrix"; inside the block only one approval edit — the Decisions intro states that D1–D8 are approved and binding; outside the block the tag legend, the Open questions (OQ1–OQ6 resolved) and the new "Approval and freeze boundary" section. No technical requirement, test expectation, the 31-row matrix, the seven CC-18 items, the ten-file Code Map, the four manual checks or the scope changed.

## Review Triage Log

- **2026-11-20 — Checkpoint 172, independent adversarial review of revision 1:** PASS WITH FINDINGS; 1 MAJOR (J1), 13 MINOR (J2–J14; the review summary counted 12), 2 QUESTION (J15, J16); no blocker. Dispositions in revision 2:
  - J1 (MAJOR, incomplete supersession) — fixed: CF-4 and D7.
  - J2 (K8 lines) — fixed: CC-18 item 2.
  - J3 (only CR5 breaks) — fixed: CC-18 item 7, CF-5.
  - J4 (O1 ambiguous) — fixed: CF-5 cites Checkpoint 156 and log 973:43.
  - J5 (frontend does not enforce ≥ 5) — fixed: D5.
  - J6 (KC12 scanner) — fixed: KC12.
  - J7 (`lang` on paragraphs) — fixed: KC13, D1.
  - J8 (repeated page 2) — fixed: KP3.
  - J9 (`DemoOutcome.tsx` comment) — decided by the developer at Checkpoint 173: left untouched, recorded in D4 and Dependencies; ten-file scope kept.
  - J10 (RT2 setup) — fixed: RT2.
  - J11 (comment stripping) — fixed: matrix intro, KR5, KR6.
  - J12 (append-only tag) — fixed: re-tagged FOR-G0 with its Story 1.17 source; the CSS limits stay BINDING with sources.
  - J13 (item 5 weaker than item 4) — fixed: CC-18 item 5.
  - J14 (C4 naming; G-4) — fixed: CC-18 naming note, item 6 wording, G2 and Dependencies.
  - J15 (CSS placement alternative) — recorded: D2 trade-off; decision deferred to G0 (OQ5).
  - J16 (Story 1.19 boundary precedent) — recorded: D2, OQ5, Dependencies; decision deferred to G0.
  - Optional checks — added: 1.18-M2 text spacing, 1.18-M4 not announced as a heading.
- **2026-11-20 — Checkpoint 174, independent verification of revision 2:** PASS WITH FINDINGS; J2–J14 RESOLVED (J9 by the developer's decision), J15–J16 DEFERRED TO G0 (OQ5), J1 resolved in substance with a residual gap; CC-18 confirmed complete (exactly seven breaking assertions); 3 MINOR (K1–K3), no blocker or major. Dispositions in revision 2a:
  - K1 (CF-4 incomplete) — fixed: CF-4 adds Story 1.17 D4 and D7 items 1–3, Story 1.16 `:28`, `:53`, `:136`, Story 1.15 D8, and the Nøkkelbegreper-only limit.
  - K2 (OQ5 alternative understated) — fixed: OQ5 lists the coordinated D2, KR5, KR6 and CC-18 changes; still OPEN.
  - K3 (OQ1 impact note incomplete) — fixed: OQ1 lists the coordinated changes for `<dl>` and for `role="list"`; still OPEN.
  - Optional notes — added: R8 cited among the CSS limits; G3 separates the documentation commit.
- **2026-11-20 — Checkpoint 176, developer decisions (G0):** D1–D8 approved, including the seven CC-18 items; the CF-4 supersession approved for Nøkkelbegreper only; OQ1 `ul`/`li` without `role="list"`; OQ2 D2 as written; OQ3 the term as its own block; OQ4 render `null`; OQ5 CC-18 items 1–7 and the CSS appended after Story 1.17, with the Story 1.19 precedent; OQ6 no `lang` hook. Story 1.16's M-2/M-4 and its incomplete G2 remain open.

## Verification

- **G1 (Checkpoint 185, on the code committed as `0864ce3`): PASS.** Frontend 537 tests passed in 20 files (32 new for Story 1.18; all 31 matrix rows mapped to tests); `tsc --noEmit` pass; ESLint pass; `next build` pass; backend 1,132 tests passed (unchanged); 1,669 in total.
- **G2 (manual checks by the developer, 2026-11-20, Google Chrome on Windows; Chrome version, Windows build and Narrator version NOT RECORDED): PASS.**
  - 1.18-M1 PASS: the five concepts in fixture order; terms visibly heavier than explanations; no bullets; link rows 1; 2; 3, 6; 5; 2; `PDF-side 6` under *Bestillingspunkt* opened the PDF at page 6 in a new tab.
  - 1.18-M2 PASS: 320 CSS px and 200% zoom with `scrollWidth > innerWidth` false, wrapping without clipping, no separator stranded at a line end, the two *Bestillingspunkt* links 11px apart at 200%; a temporary text-spacing override (line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, paragraph margin-bottom 2em) showed no clipping or overlap.
  - 1.18-M3 PASS: after selecting the tab by click, Tab reached the panel and then the six links in the order 1, 2, 3, 6, 5, 2 with visible focus outlines; no focus in hidden Flashkort or Quiz content; Left/Right switched tabs.
  - 1.18-M4 PASS: Windows Narrator in Chrome announced a list of five items, read the term as ordinary text (not a heading) and its explanation, and announced the `PDF-side 1` link with its accessible name.
- **G3:** the independent scope check (Checkpoint 187) passed with findings about the G2 evidence draft only, resolved at Checkpoint 188; the implementation commit `0864ce3` contains exactly the ten approved files. Pushed and merged via PR #44 (merge commit d294dc20a8f10b9084109369e96efa31874602d7) after GitHub CI run 44823419524 passed (Backend 1,132 and Frontend 537 tests).
- Story 1.16's M-2 and M-4 remain NOT TESTED and its G2 gate incomplete; not affected by this story.
