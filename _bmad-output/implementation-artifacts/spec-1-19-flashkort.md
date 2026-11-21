---
title: 'Story 1.19: Flashkort'
type: 'feature'
created: '2026-11-21'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

**How to read this spec.** Every normative rule carries one of three tags:
- **[BINDING]** — an approved requirement from `epics.md`, `EXPERIENCE.md`, `DESIGN.md`, `ARCHITECTURE-SPINE.md`, the PRD or an earlier approved spec, with its source;
- **[FOR-G0]** — an implementation decision proposed by the author; **approved by the developer at G0 (Checkpoint 209, 2026-11-21) and now binding**;
- **[OPEN]** — a question that was open before G0; all of them were resolved at G0 (see "Open questions").
- **D3a** is tagged **[BINDING]** for a different reason than the upstream requirements: it is a binding, developer-approved amendment (Checkpoint 223, 2026-11-21; see the AMENDED comment) to the earlier design decision Story 1.4 D-9 and to this spec's Checkpoint 209 baseline. The passages it directly affected, including D9's last bullet (the D3a media block), FR11 and FR13, come from the same amendment, although the Decisions introduction inside the frozen block names only the Checkpoint 209 approval (R224-04).

**Naming:** this spec's compatibility correction is called **CC-19**. Story 1.15's matrix row C4 and Story 1.18's CC-18 are referred to by those names.

<!-- APPROVED at Checkpoint 209 (G0) by the developer on 2026-11-21: Story 1.19, revision 2b (SHA-256 of the whole file as reviewed after Checkpoint 208, before the approval and freeze edits: 6f8bbec921f7068b41415e128052c1af2b1882cd6a024d170fd82ced3fba3c82; SHA-256 of the frozen normative text from "## Intent" to the end of the I/O & Edge-Case Matrix, after the two approval edits listed in the Spec Change Log: 30bec0aa38302926747ee697f599cae1664b98693e1fbd7b193750fb743d1b17). Approved together: decisions D1, D2 and D4–D11, including the binding CC-19 compatibility scope in D10 (test changes authorized only within its seven items); D3 recorded as binding from Story 1.4 D-9 (--padding-flashcard: 32px 48px) with the documented 320 CSS px trade-off (CF-1); D8 with the counter above the card (selected at Checkpoint 208); the CF-3 supersession of earlier frozen statements for the Flashkort panel only, without editing those specs; OQ1 (a) only the current card in the DOM; OQ2 (a) per-card revealed state; OQ4 (a) a reusable .button-secondary; OQ5 (a) an empty deck renders nothing; OQ6 (a) one useId() per deck; OQ3 closed by D-9; the 40 automated rows and the manual checks 1.19-M1 to M4, with M4 in Windows Narrator with Chrome; the eleven-file Code Map. Freeze boundary: from "## Intent" through the last row (FR12) of "## I/O & Edge-Case Matrix", inclusive; "## Code Map" and everything after it are outside the block. The block below is frozen: any change to it requires explicit renewed approval by the developer. This approval authorizes no implementation; implementation starts at a later checkpoint. Story 1.16's M-2/M-4 exceptions and its incomplete G2 gate remain open and are not affected. -->

<!-- AMENDED at Checkpoint 223 by the developer on 2026-11-21 (the D3a responsive padding amendment). The APPROVED comment above and its hashes are kept unchanged as the previous baseline for audit history. Previous baseline: whole file c3b4be6518b229044eee72a82e55bc583fa0a3bdce60d35261a9d51819537b56 (committed in f93ef78); frozen block through FR12 30bec0aa38302926747ee697f599cae1664b98693e1fbd7b193750fb743d1b17. Approved in this amendment only: D3a, one `@media (max-width: 480px) { .flashcard { padding: var(--space-7) var(--space-4); } }` rule after the flat Story 1.19 rules, as a narrow-viewport refinement of Story 1.4 D-9 within this scope only (--padding-flashcard: 32px 48px and the base .flashcard rule unchanged); the directly affected passages (In scope, Out of scope, Boundaries, Ask First, traceability, Decisions intro, D3, D9, CF-1); FR11 as amended; the new row FR13 (41 automated rows); the amended 1.19-M2. Superseded within this scope only: the Checkpoint 209 acceptance of the 320 CSS px trade-off (CF-1) and the closure of OQ3. Not re-approved: every other requirement, which stands as approved at Checkpoint 209. New normative baseline: the frozen block from "## Intent" through the last row (FR13) of "## I/O & Edge-Case Matrix", inclusive, SHA-256 6f78cc7d8310b10c9fc1133bd71ad3e29372e8785d9124b115b54316021f1862 (LF line endings, no trailing newline, the same convention as Checkpoint 209). This amendment authorizes no implementation; the CSS and test change starts at a later checkpoint. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**User story** (`epics.md:940–966`): as a student, I want to practise one flashcard at a time and reveal the answer when I'm ready, so that I can test myself.

**Problem:** after Story 1.18 the Flashkort panel holds only its visually hidden `h3`. The validated `results.flashcards` (`{front, back, pages}[]`) reaches the browser but is not shown, and there is no secondary-button style in the code base yet.

**Approach:** the Flashkort panel shows a deck that renders exactly one flashcard at a time: the counter `Kort N av M` as its own polite live region, the term, the `Vis svar` / `Skjul svar` toggle, the answer (hidden until revealed) with its page links from the existing `PageLinks`, and the `Forrige` / `Neste` buttons below the card. The deck keeps the current card and each card's revealed state in component state; because the panel stays mounted while hidden, both survive tab switches, and both reset when a new results session mounts `ResultTabs` again. No backend, contract, fixture or `PageLinks` change.

**In scope:**
- the flashcard deck in the Flashkort panel (counter, term, toggle, answer with page links, Forrige/Neste);
- passing the existing `pdfSource` from `ResultTabs` to that panel;
- CSS for the deck, the card and a reusable secondary button (existing tokens), including the single narrow-viewport card padding rule (D3a);
- Vitest coverage, and the narrow compatibility correction CC-19 to existing Story 1.16–1.18 tests (D10).

**Out of scope:**
- Quiz content (Story 1.20); `Tilbake til start`, the new-results-session trigger and demo acceptance (Story 1.21);
- real-mode results (Story 2.6), real-mode PDF sources (Story 2.7), `lang="en"` on English results (Story 2.6, AF-5);
- any change to `backend/`, `samples/` (including `demo-response.json`), the API contract, dependencies or configuration;
- any change to `PageLinks`, `SummaryContent`, `KeyConceptsContent`, `pdf-source.ts`, `DemoOutcome.tsx`, the Story 1.17 and 1.18 CSS rules, the existing `.button-primary` rules, the `--padding-*` tokens or the global `.sr-only` rule;
- any responsive breakpoint or narrower card padding other than the single D3a rule (see D3a, CF-1);
- any change to a frozen spec block, and any change to the status of Story 1.16's open manual checks.

## Boundaries & Constraints

**Always:**
- **[BINDING] Content and order** (Story 1.19 AC 1; UX-DR-25, `epics.md:256`; `EXPERIENCE.md:172`): one card at a time; DOM and reading order counter `Kort N av M` → term → `Vis svar` / `Skjul svar` → answer (+ page links) → `Forrige` / `Neste`.
- **[BINDING] Counter** (`EXPERIENCE.md:172`; AF-7, `EXPERIENCE.md:258`): `<p aria-live="polite" aria-atomic="true">`, present from the start of the panel; the term is not in the region; `Kort N av M` is announced on Forrige/Neste.
- **[BINDING] Toggle** (Story 1.19 AC 2; `EXPERIENCE.md:172`, AF-7): each card starts with the answer hidden; `Vis svar` reveals it and becomes `Skjul svar`; `aria-expanded` and `aria-controls` = the answer's `id`; the collapsed answer has the `hidden` attribute; the toggle sits directly before the answer it controls; no `aria-label`, no `aria-pressed`.
- **[BINDING] Deck ends** (Story 1.19 AC 3; UX-DR-18, `epics.md:246`; `EXPERIENCE.md:233, 241`): `Forrige` on the first card and `Neste` on the last are `aria-disabled="true"`, never native `disabled`; they stay focusable, show the disabled style, and click, Enter and Space do nothing (a guarded handler); `type="button"`; focus stays on the pressed button, also when it becomes aria-disabled.
- **[BINDING] Kept state** (Story 1.19 AC 4; UX-DR-25; `EXPERIENCE.md:38, 169, 172`): the current card and revealed answers are kept across tab switches within the same results session, and reset to card 1 with all answers hidden on a new results session.
- **[BINDING] Plain text only** (AR-19, AD-18): term and answer are React text nodes; no `dangerouslySetInnerHTML`, no Markdown-to-HTML.
- **[BINDING] Page links** (UX-DR-27; Story 1.17 D2): rendered only by the existing `PageLinks`, unchanged, inside the answer; plain-text documents get no links (AR-11). The accessible names and Chrome's documented computed name (Story 1.17 D6, OQ7 (a)) are unchanged.
- **[BINDING] Visuals from existing tokens** (UX-DR-2, `epics.md:221`; `DESIGN.md:189–207, 220–228, 386, 389, 406`): the flashcard and secondary-button tokens; no new token, no raw colour.
- **[BINDING] Card padding** (Story 1.4 D-9, option A, `spec-1-4…:42`; `globals.css:110–112`): `.flashcard` uses `padding: var(--padding-flashcard)`, the approved `32px 48px` token (D3). The token and the base rule are not changed; narrow-width effects (CF-1) are addressed only by D3a, which narrows the card's padding to `var(--space-7) var(--space-4)` at viewport widths of 480 CSS px or less (approved by the developer at Checkpoint 223).
- **[BINDING] No breakpoints decided, except D3a** (`DESIGN.md:356`, `EXPERIENCE.md:280`; D3a approved by the developer at Checkpoint 223): this story adds exactly one width-based media query, `@media (max-width: 480px)`, holding only the D3a `.flashcard` padding rule, and no other media query or responsive variant; any other breakpoint would be a new design decision (Ask First). `DESIGN.md` and `EXPERIENCE.md` are not edited by this story.
- **[BINDING] Reflow and targets** (UX-DR-38, `epics.md:278`; AF-11, AF-12; `DESIGN.md:346, 359`): usable at 200% zoom and at 320 CSS px with no two-dimensional scrolling and no clipping under text-spacing overrides; long words in terms and answers wrap; the Forrige / Neste row and the page-link row wrap (`DESIGN.md:359`); buttons at least 44px tall.
- **[BINDING] Language boundary** (AF-5, `EXPERIENCE.md:256`): demo results are `nb`; this story adds no `lang` attribute.
- **[BINDING] One global status region** (AF-6, `EXPERIENCE.md:257`): the existing `role="status"` region is unchanged and receives no flashcard text; the counter is a separate `aria-live` paragraph, as UX-DR-25 requires (D7).
- **[BINDING] Story 1.16's accepted exceptions are untouched:** its M-2 and M-4 remain NOT TESTED manually and its G2 gate remains incomplete (`.logs/amma-kwaasi-eide/issues.md:74`).
- **[BINDING] CSS limits of the existing tests:** no `width:`/`height:` declarations, no raw colour, no new `--color-*` token, no new `:focus-visible` rule, no `outline: none` (`demo-css.test.ts`, `globals-css.test.ts`; `results-css.test.ts` R5/R7/R8, whose section runs to the end of the file); no new selector contains `.result-panel` (Story 1.16 R5; Story 1.17 G7). These tests ban at-rules only inside their own flat sections (`summary-css.test.ts`, `key-concepts-css.test.ts`); they do not forbid a media query elsewhere in the file (`globals.css` already has one, `:441`). The D3a media condition `(max-width: 480px)` is not a `width:` declaration; the `width:` patterns of these tests do not match `max-width`.
- **[FOR-G0] No `display` on an element that uses the `hidden` attribute** (by the same rationale as Story 1.16 D12 for `.result-panel`, `spec-1-16…:180`): an author `display` would override the UA `[hidden]` style, so `.flashcard__answer` gets no `display` declaration.
- **[FOR-G0] Placement of the new CSS:** appended as a "Story 1.19" section after the Story 1.18 section (the convention of Stories 1.17 and 1.18; Story 1.18 OQ5), starting with `.button-secondary {`; the section's ten rules are flat (no grouped or multi-line selector), which is this spec's own choice (FR11), and the section's only at-rule is the D3a media block, placed last, after `.flashcard-nav` (FR11, FR13).
- **[BINDING] No new dependency.**
- **[FOR-G0] No new network call:** toggling and navigation send no request; the PDF opens only when the user follows a link.
- **[FOR-G0] Demo only for now:** nothing new renders outside demo S4.

**Ask First:** any Norwegian text not in "Strings"; any change to a file under "Never"; any change to `PageLinks` or its CSS; any heading for the term; any change to the existing `.button-primary` rules; any narrower card padding or responsive breakpoint beyond the approved D3a rule (a further change to Story 1.4 D-9), and any change to D3a's breakpoint, values or scope. D3a itself was approved by the developer at Checkpoint 223 and is no longer an Ask-First item.

**Never:** changes to `backend/`, `samples/`, the dependency and configuration files, `frontend/lib/*`, `frontend/components/PageLinks.tsx`, `SummaryContent.tsx`, `KeyConceptsContent.tsx`, `DemoOutcome.tsx`, `DemoProvider.tsx`, `DemoControls.tsx`, `ResultNotices.tsx`, `frontend/app/page.tsx`, `frontend/app/layout.tsx`, existing rules or tokens in `globals.css`, the frozen blocks of any spec, or any existing test except as allowed by CC-19 (D10). `_bmad-output/planning-artifacts/architecture/technology.md` is not a source.

## Strings

| Use | Text | Source |
|---|---|---|
| Counter | `Kort N av M` (N = the 1-based card number, M = the number of cards) | `EXPERIENCE.md:100` [BINDING] |
| Toggle | `Vis svar` / `Skjul svar` | `EXPERIENCE.md:101` [BINDING] |
| Navigation | `Forrige` / `Neste` | `EXPERIENCE.md:102` [BINDING] |
| Panel heading (visually hidden `h3`) | `Flashkort` (existing, Story 1.16) | `EXPERIENCE.md:36, 87` [BINDING] |
| Term / answer | the card's `front` / `back`, unchanged | AR-19 [BINDING] |
| Page links | as Story 1.17 | UX-DR-27 [BINDING] |

No other new Norwegian text.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| Story 1.19 AC 1 | `Kort 1 av M` (polite live region from the start), the term, `Vis svar`, the hidden answer with its page links, `Forrige` / `Neste` | D1, D6–D8; rows FC1–FC4, FC6, FP1, FP3, FP6 |
| Story 1.19 AC 2 | `Vis svar` reveals, becomes `Skjul svar`, `aria-expanded` and `aria-controls` correct | D6, D8; rows FC4, FC5, FC11 |
| Story 1.19 AC 3 | first/last card: `Forrige`/`Neste` aria-disabled, keeps focus, ignores activation | D8; rows FC7, FC8, FC13, FP2; 1.19-M3 |
| Story 1.19 AC 4 | after a tab switch, the current card and revealed answers are kept | D2, D8; rows FC10, FP5 |
| Story 1.19 AC 5 | Vitest covers the counter, toggling, the deck ends and kept state | D11; rows FC1–FC15, RT1–RT4, FP1–FP9 |
| FR-5 (`epics.md:60, 946`) | the student sees the Flashcard Set after a successful pass | D8; rows FP1–FP3 |
| UX-DR-2, DESIGN flashcard / button-secondary | styled from tokens | D3, D3a, D4, D9; rows FR1–FR13 |
| Story 1.4 D-9 | the flashcard padding token; its narrow-viewport refinement | D3, D3a; rows FR5, FR13 |
| UX-DR-18 | aria-disabled, focusable, guarded, `type="button"`, never `disabled` | D4, D8; rows FC7, FC8, FC14, FC15 |
| UX-DR-25, AF-7 | order, counter region, toggle semantics | D1, D6–D8; rows FC1–FC11, FP6 |
| UX-DR-25 | reset on a new results session | D2; row RT4 |
| AF-6 | one global status region | D7; row FP7 |
| UX-DR-27 | page links in the answer | D8; rows FC6, FP3 |
| UX-DR-38 / AF-11 / AF-12 (G-4); `DESIGN.md:359` | reflow, zoom, text spacing, targets; the Forrige / Neste row wraps | D3, D3a, D9; rows FR5, FR7, FR9, FR10, FR13; 1.19-M2 |
| AR-11 / AD-10 | ≥ 5 cards (backend); each PDF card ≥ 1 page; plain text none | D5; rows FC6, FC12 |

## Decisions

All decisions below were proposed [FOR-G0] and were **approved by the developer at G0 (Checkpoint 209, 2026-11-21)**; they are binding. **D3** records the binding Story 1.4 D-9 padding. **D3a** was approved by the developer at Checkpoint 223 (2026-11-21) as an amendment to this frozen block; it is binding.

- **D1 — render only the current card [FOR-G0]:** the deck renders exactly one `.flashcard`, for the current index; the other cards are not in the DOM. Alternative: render all cards and hide all but the current one (more DOM, five answer ids, more links in hidden content). Recommended: one card (OQ1).
- **D2 — per-card revealed state [FOR-G0]:** the deck keeps the current index and the set of revealed card indices. Navigating to a card shows its answer revealed only if it was revealed before; a card never revealed starts hidden. Both survive tab switches (the panel stays mounted) and reset when `ResultTabs` mounts again for a new results session: `DemoOutcome` renders `ResultTabs` only in the success phase (`DemoOutcome.tsx:82–95`), and every new pass goes through the loading phase first (`DemoProvider.tsx:107–126`), which unmounts it; Story 1.21 owns the `Tilbake til start` trigger. Row RT4 tests the reset by unmounting and rendering again. Alternative: reset the answer to hidden on every Forrige/Neste. Recommended: the per-card set, the plain reading of "revealed answers kept" (OQ2).
- **D3 — card padding [BINDING] (Story 1.4 D-9):** `.flashcard` uses `padding: var(--padding-flashcard)`, the approved token `32px 48px` (`globals.css:112`; `spec-1-4…:42`, "D-9 … option A … flashcard 32px / 48px"). The mockup's 36/48px was already snapped there, so `DESIGN.md:420` open question 2 is closed for the card. Measured at 320 CSS px without D3a: the viewport minus the page padding (2 × `--padding-page-inline` 48px) and the panel padding (2 × `--space-4` 16px) leaves 192px; minus the card's 1px borders and its 2 × 48px horizontal padding, the text gets about 94px. With `overflow-wrap: anywhere` nothing scrolls horizontally, but a 28px term breaks into very short lines. Above 480 CSS px this remains the card's padding; at 480 CSS px or less D3a narrows only the horizontal padding (CF-1, 1.19-M2). Any further narrowing or breakpoint needs approval (Ask First).
- **D3a — narrow-viewport card padding [BINDING] (approved by the developer at Checkpoint 223, 2026-11-21; a narrow-viewport refinement of Story 1.4 D-9, recorded only in this spec):** the last item of the Story 1.19 CSS section, after the `.flashcard-nav` rule, is exactly:
  ```css
  @media (max-width: 480px) {
    .flashcard {
      padding: var(--space-7) var(--space-4);
    }
  }
  ```
  At viewport widths of 480 CSS px or less the card keeps 32px vertical padding and gets 16px horizontal padding; above 480 CSS px nothing changes. The base `.flashcard` rule keeps `padding: var(--padding-flashcard)` (D3, D9, FR5), and `--padding-flashcard: 32px 48px` and every other token are unchanged; `--space-7` (32px) and `--space-4` (16px) are existing tokens. It is the only width-based media query of Story 1.19; it holds only this one rule with this one declaration, and it comes after the base rule so that it wins at equal specificity. No typography, component, behaviour or other layout change. Because it is a viewport-width query, it also applies when browser zoom brings the viewport to 480 CSS px or less; at 200% zoom on a 1280px-wide window (640 CSS px) the D3 padding applies. Estimated text width (the D3 arithmetic with 2 × 16px instead of 2 × 48px of card padding): about 158px at 320 CSS px and about 213px at 375 CSS px; at 481 CSS px the D3 padding applies again (about 255px), so the text width steps down at the 480/481 transition, which is expected. Long words of the 28px term can still break inside the word at 320 CSS px (for example `julehandelen`, `sikkerhetslager?`). These widths are estimates; only a browser check (1.19-M2) verifies the layout. Within this scope only, D3a supersedes the Checkpoint 209 acceptance of the narrow-width trade-off (CF-1) and the closure of OQ3; the Story 1.4 spec, `DESIGN.md` and `EXPERIENCE.md` are not edited.
- **D4 — reusable `.button-secondary` [FOR-G0]:** a new global class from the DESIGN `button-secondary` / `-hover` / `-disabled` tokens, mirroring the existing `.button-primary` rule structure (`globals.css:206–234`): base, `:hover:not([aria-disabled="true"])`, and `[aria-disabled="true"]`. It is used here for the toggle and Forrige/Neste and is meant for later stories' secondary buttons (`Tilbake til start`, `Ny fil`, `Avbryt`). Alternative: a flashcard-only class. Recommended: the reusable class (OQ4).
- **D5 — empty deck [FOR-G0]:** an empty `cards` array renders nothing (`null`): no counter, no buttons, no invented text. Unreachable in demo S4 only because the backend's Gate 3 requires at least 5 flashcards (`stage5_gates.py:42`, AR-11); the frontend shape check allows an empty list (`generation.ts:10`) (OQ5). The `return null` comes after all React hook calls (`useState`, `useId`), as the rules of hooks require. A one-card deck renders normally with both Forrige and Neste aria-disabled (row FC13).
- **D6 — answer id [FOR-G0]:** one `useId()` value per deck for the single answer element; the toggle's `aria-controls` always equals the rendered answer's `id`. Because only one card is rendered (D1) and the answer element keeps its position, the id stays valid across cards; two decks on one page get different ids. Tests read the id from the toggle's `aria-controls` and look the element up with `document.getElementById(thatId)`, so they assume no particular id format (React 19.3 produces ids such as `_r_1_`) (OQ6).
- **D7 — counter live region [FOR-G0]:** `<p className="flashcard__counter" aria-live="polite" aria-atomic="true">`, rendered from the first render of the deck, also while the Flashkort panel is still hidden (row FP6); it is the deck's only `aria-live` element (row FC2). It announces only when its text changes, which happens on Forrige/Neste; toggling does not change it. It has no `role`; the global `role="status"` region (AF-6) is unchanged and receives no flashcard text. Its text is a single template string, `` `Kort ${index + 1} av ${cards.length}` ``, so it is one text node (R203-13).
- **D8 — component and markup [FOR-G0]:** a new `frontend/components/FlashcardDeck.tsx` (props `{ cards: readonly ValidatedFlashcard[]; pdfSource: string | null }`) renders:
  ```tsx
  <div className="flashcard-deck">
    <p className="flashcard__counter" aria-live="polite" aria-atomic="true">{`Kort ${index + 1} av ${cards.length}`}</p>
    <div className="flashcard">
      <p className="flashcard__term">{card.front}</p>
      <button type="button" className="button-secondary flashcard__toggle"
              aria-expanded={revealed} aria-controls={answerId} onClick={toggle}>
        {revealed ? "Skjul svar" : "Vis svar"}
      </button>
      <div id={answerId} className="flashcard__answer" hidden={!revealed}>
        <p className="flashcard__answer-text">{card.back}</p>
        <PageLinks pages={card.pages} pdfSource={pdfSource} />
      </div>
    </div>
    <div className="flashcard-nav">
      <button type="button" className="button-secondary" aria-disabled={atFirst ? "true" : undefined} onClick={previous}>Forrige</button>
      <button type="button" className="button-secondary" aria-disabled={atLast ? "true" : undefined} onClick={next}>Neste</button>
    </div>
  </div>
  ```
  - **counter placement (selected by the developer at Checkpoint 208):** the counter sits **above** the card, as the first child of `.flashcard-deck` and the sibling immediately before `.flashcard`, matching the approved mockup (`mockups/direction-refined-rolig.html:265–266`, `.fc-counter` before `.fc-card`). `DESIGN.md:389` lists the counter first in the top-to-bottom order without placing it inside the card's border. The DOM and reading order stays counter → term → toggle → answer (+ page links) → Forrige / Neste; the counter keeps `aria-live="polite"` and `aria-atomic="true"`, its text, its single text node and its announcement behaviour (D7). D8, including this placement, was approved at G0 (Checkpoint 209);
  - the component uses no identifier named `disabled` (variable, prop or attribute), so the FC15 source scan stays unambiguous;
  - `previous` and `next` return immediately when their button is aria-disabled (the guarded handler); a browser fires `click` for Enter and Space on a `<button>` even when it is `aria-disabled`, so the same guard covers them;
  - the buttons are never re-keyed or re-mounted when the card changes, so focus stays on the pressed button (also when it becomes aria-disabled);
  - the term is a paragraph, not a heading (AF-8 reserves `h4` for quiz questions) and not `<strong>`;
  - `.flashcard__toggle` is a hook class only; it has no CSS rule in this story;
  - `ResultTabs` renders `<FlashcardDeck cards={results.flashcards} pdfSource={pdfSource} />` in the panel whose `tab.key === "flashcards"`, after the `h3`; Sammendrag, Nøkkelbegreper and Quiz are unchanged. A new card set arrives only with a new results session, which remounts the deck (D2); the deck does not reset itself on a changed `cards` prop.
- **D9 — CSS [FOR-G0]:** appended after the Story 1.18 section, existing tokens only, in this order:
  - `.button-secondary`: `display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: var(--control-min-height); padding: var(--space-2) var(--space-5); background: var(--color-surface); color: var(--color-primary); border: var(--border-hairline) solid var(--color-primary); border-radius: var(--radius-md); font-family: var(--font-family); font-size: var(--font-ui-size); font-weight: var(--font-ui-weight); line-height: var(--font-ui-line-height); cursor: pointer;`
  - `.button-secondary:hover:not([aria-disabled="true"])`: `background: var(--color-hover-tint);`
  - `.button-secondary[aria-disabled="true"]`: `background: var(--color-disabled-bg); color: var(--color-disabled-fg); border: var(--border-hairline) dashed var(--color-disabled-border); cursor: not-allowed;`
  - `.flashcard-deck`: `display: flex; flex-direction: column; align-items: center; gap: var(--space-4);`
  - `.flashcard`: `align-self: stretch; padding: var(--padding-flashcard); background: var(--color-surface); border: var(--border-hairline) solid var(--color-border-subtle); border-radius: var(--radius-lg); text-align: center;` (D3; its padding is overridden at 480 CSS px or less by D3a)
  - `.flashcard__counter`: `margin: 0; color: var(--color-text-muted);` plus the three `--font-small-*` tokens (above the card; it is centred by `.flashcard-deck`'s `align-items: center`, and the deck's `gap` separates it from the card);
  - `.flashcard__term`: `margin: 0 0 var(--space-5); white-space: pre-line; overflow-wrap: anywhere; color: var(--color-text);` plus the three `--font-flashcard-term-*` tokens;
  - `.flashcard__answer`: `max-width: var(--measure-answer); margin: var(--space-5) auto 0; padding-top: var(--space-5); border-top: var(--border-hairline) solid var(--color-border-subtle); text-align: left;` plus the three `--font-answer-*` tokens (no `display`). The answer font is set on this wrapper so that `65ch` is measured in the answer font (19px), matching `DESIGN.md:389` ("`{typography.answer}`, max 65ch"); the page-link row inside keeps its own small type from the Story 1.17 `.page-links` / `.page-link` rules;
  - `.flashcard__answer-text`: `margin: 0; white-space: pre-line; overflow-wrap: anywhere; color: var(--color-text);` (it inherits the answer font);
  - `.flashcard-nav`: `display: flex; flex-wrap: wrap; justify-content: center; gap: var(--space-3);`
  - last, after these ten rules: the D3a media block, exactly as in D3a.
- **D10 — compatibility correction CC-19 [FOR-G0]:** Story 1.19 makes the Flashkort panel non-empty, adds one page link and the first card's text to the DOM, and appends CSS after the Story 1.18 section. This supersedes, **for the Flashkort panel only**, the earlier frozen statements listed in CF-3, without editing those specs. Exactly these existing tests may change, and only as stated; every other assertion, test and test name stays unchanged:
  1. `frontend/__tests__/result-tabs.test.tsx`, **P3** (lines 466–483). Old: Flashkort `["H3.sr-only"]` (the final branch of the expected-children expression, line 476). New: Flashkort `["H3.sr-only", "DIV.flashcard-deck"]`; Sammendrag, Nøkkelbegreper and Quiz unchanged; the name may add "Flashkort the deck". Still protected: every panel starts with its visually hidden `h3` with the tab name and no count.
  2. `frontend/__tests__/summary.test.tsx`, **SC2** (lines 96–102). Old: Flashkort and Quiz each `["H3.sr-only"]`. New: Quiz stays `["H3.sr-only"]`; Flashkort is `["H3.sr-only", "DIV.flashcard-deck"]`; Nøkkelbegreper unchanged; the name changes accordingly. Still protected: the summary is rendered only in the Sammendrag panel.
  3. `frontend/__tests__/summary.test.tsx`, **PS3** (lines 146–164). Old: 5 links in Sammendrag, 6 in Nøkkelbegreper, 11 in total, every link in one of those two panels; no flashcard front anywhere. New: the same 5 and 6, plus exactly 1 in `#result-panel-flashcards` (card 1's hidden answer, page 2), 12 in total, every link in one of the three panels; card 1's front appears in `#result-panel-flashcards` and in no other panel; the fronts of cards 2–5 appear nowhere; the key-concept and quiz assertions unchanged; the name may say "links only in the Sammendrag, Nøkkelbegreper and Flashkort panels; only the current flashcard; no quiz content (PS3)". Still protected: no link or content in the Quiz panel; only the current card is rendered.
  4. `frontend/__tests__/results-shell.test.tsx`, **S3** (lines 180–196). Old: line 189 "no flashcard front in the body"; lines 191–195 "every `<a>` inside the Sammendrag or Nøkkelbegreper panel". New: card 1's front is inside `#result-panel-flashcards` and not in the other panels, and the fronts of cards 2–5 are not in the document; every `<a>` is in one of the three panels; the summary, key-concept and quiz lines unchanged; the name may add "the first flashcard". Still protected: no quiz content.
  5. `frontend/__tests__/demo-start.test.tsx`, test "success: heading, notice, guidance gone, focus kept, announced, no repeat, summary and key concepts (C1–C5)" (lines 806–842). Old: the Story 1.15 row-C4 comment (line 829) and lines 833–837 "every `<a>` inside the Sammendrag or Nøkkelbegreper panel". New: the link check also accepts `#result-panel-flashcards`; the comment names Story 1.19; the name may add "and the first flashcard". Every other assertion unchanged.
  6. `frontend/__tests__/key-concepts.test.tsx`, **RT2** (lines 373–378). Old: Flashkort and Quiz hold only `H3.sr-only`. New: Flashkort `["H3.sr-only", "DIV.flashcard-deck"]`, Quiz `["H3.sr-only"]`, Sammendrag unchanged; the name changes accordingly. Still protected: Sammendrag keeps its summary and links.
  7. `frontend/__tests__/key-concepts-css.test.ts`, `section()` (lines 79–83) and the header comment (lines 13–15). Old: the Story 1.18 section runs to the end of the file. What breaks: only **KR5**'s exact selector list (its `parsed.map(...)` assertion), because the Story 1.19 selectors would be appended; KR1–KR4, the trailing-whitespace check and KR6 pass on their own. New: `section()` ends where the Story 1.19 section starts (`.button-secondary {`); as an addition, KR6 asserts that `.button-secondary {` occurs once and after `.key-concept__explanation {`. Still protected: the Story 1.18 section is flat and holds exactly its four rules.
  No other existing test file changes (`summary-css.test.ts` already ends at `.key-concepts {`).
- **D11 — verification [FOR-G0]:** automated rows in the matrix below; manual checks 1.19-M1 to M4 under "Approval gates". Automated rows prove DOM structure, jsdom-computed names and CSS source text only, never layout, real keyboard activation or speech. Each manual check records the browser and version, the OS, and how width, zoom or text spacing was set.

## Conflicts and source findings

- **CF-1 — the approved card padding at narrow widths:** Story 1.4 D-9 fixed the flashcard padding at `32px 48px` (`--padding-flashcard`), which leaves about 94px of text width at 320 CSS px (D3). Story 1.4's triage accepted the narrow-width effects of the page padding (`spec-1-4…:116`, item 13: "no breakpoints were decided"), but relied on the `h1` wrapping **between** words; at 94px the 28px/600 flashcard term breaks **inside** most words (for example `Hvorfor` is about 99px wide, and `julehandelen` and `sikkerhetslager?` are far wider), which is a different effect. At Checkpoint 221 the developer observed in Chrome that at 320 CSS px the text area was very narrow and the answer hard to read, and at Checkpoint 223 approved D3a. This story keeps the token for the base rule; D3a narrows the card's horizontal padding to 16px at 480 CSS px or less, which raises the estimated text width at 320 CSS px to about 158px (about 213px at 375 CSS px). At 320 CSS px:
  - mid-word wrapping of the longest words of the term is still **expected** (less often than at about 94px); it is recorded as G-4 evidence (`issues.md:25`) at the documentation step;
  - horizontal scrolling, clipping or overlap is a **failure** (UX-DR-38);
  - under a text-spacing override, an inline-flex `PDF-side N ↗` link can be wider than the text width and extend a few pixels into the card's horizontal padding; that is visible, not clipped, and not a failure by itself;
  - if the developer judges the term unusable even with D3a, work **stops** and a further Ask-First design decision is requested; no ad-hoc CSS is added.
- **CF-2 — "revealed answers kept":** `EXPERIENCE.md:172` says each card starts hidden and revealed answers are remembered across tab switches; it does not say whether navigating back to a revealed card shows it revealed. D2 proposes per-card memory (OQ2).
- **CF-3 — supersession of earlier frozen statements [FOR-G0]:** Story 1.19 changes the accepted behaviour **for the Flashkort panel only**; Sammendrag keeps its Story 1.17 behaviour, Nøkkelbegreper its Story 1.18 behaviour, and Quiz its approved empty-panel behaviour. None of the earlier specs is edited. Superseded for Flashkort:
  - **Story 1.15** row **C4** (`spec-1-15…:187`) and **D8** (`spec-1-15…:89`, "nothing of its content is rendered");
  - **Story 1.16** Approach (`spec-1-16…:28`), **[BINDING] No content rendering beyond this story** (`:53`, "none of the response's … flashcards … is rendered"), the protected "no `<a>`" assertions (`:136`), **D12** (`:180`), **OQ7** (`:139`, `:215`), rows **S3** (`:246`) and **P3** (`:250`);
  - **Story 1.17** Approach (`spec-1-17…:27`), **D4** (`:108`, the source "only to the Sammendrag panel"), **D7** items 1–3 (`:126–128`), **CF-3** (`:143`), rows **SC2** (`:187`) and **PS3** (`:192`);
  - **Story 1.18** Intent out-of-scope line (`spec-1-18…:38`), **D4** ("Flashkort and Quiz panels are unchanged", `:122`), **CC-18** items 1 (`:133`, "Flashkort and Quiz stay `["H3.sr-only"]`"), 3–5 (`:135–137`) and 6 (`:138`, links only in the Sammendrag or Nøkkelbegreper panel), **CF-3** (`:147`), the **CF-4** opening sentence (`:148`, "Flashkort and Quiz keep their approved empty-panel behaviour") and closing paragraph (`:164`, "nothing of the Flashkort and Quiz content is rendered"), and row **RT2** (`:187`).
  These are superseded **only** where Story 1.19 adds the Flashkort deck, its first card's text and its page link. Every other part of them stays in force; in particular nothing of the Quiz content is rendered. Not superseded: Story 1.18's fixture assumption (`spec-1-18…:262`, "no flashcard front or quiz question occurs in a concept"), which describes the fixture content and remains true; and Story 1.16 row **K8** (`spec-1-16…:281`), which runs "after K1" with Nøkkelbegreper selected (already superseded for Nøkkelbegreper by Story 1.18) and is not affected by the Flashkort deck. No frozen statement covers the focus order with Flashkort selected; row FP4 defines it.
- **CF-4 — Story 1.18 CSS test boundary:** `key-concepts-css.test.ts` treats the rest of `globals.css` as the Story 1.18 section; appending breaks only its KR5 exact selector list. Corrected by CC-19 item 7, the precedent recorded in Story 1.18 OQ5.
- **CF-5 — no secondary-button CSS:** DESIGN defines `button-secondary` tokens, but `globals.css` has only `.button-primary`; D4 adds the class.

## I/O & Edge-Case Matrix

Component rows render `FlashcardDeck` or `ResultTabs` directly; page rows render `<Home />` with the recorded demo reply (`demo-fixtures`); CSS rows read `globals.css` as text with comments removed first. None of them proves layout, real keyboard activation or speech (see the manual checks). Rows that check that focus stayed on a button compare against the same element reference captured before the action, so a remounted button would fail. The fixture has five cards with pages `[2]`, `[3]`, `[3]`, `[6]`, `[5]`.

| Row | Setup | Expected |
|---|---|---|
| FC1 | component, five cards, source set | one `div.flashcard-deck` with children exactly `P.flashcard__counter`, `DIV.flashcard`, `DIV.flashcard-nav` (the counter above the card, D8); exactly one `.flashcard`; its children exactly `P.flashcard__term`, the toggle `BUTTON`, `DIV.flashcard__answer`; the nav's children exactly two `BUTTON`s, `Forrige` then `Neste`; in document order the counter precedes the term, the toggle, the answer and the nav |
| FC2 | component, first render | the counter's text is `Kort 1 av 5`; `aria-live="polite"`, `aria-atomic="true"`, no `role`; the term is not inside the counter; the deck holds exactly one `[aria-live]` element |
| FC3 | component; texts with `<script>`, HTML-like, Markdown and a newline | term and answer text equal the input exactly, as text nodes only; no `script`, `b`, `strong` or `h1` element |
| FC4 | component, first render | the toggle reads `Vis svar`, `type="button"`, `aria-expanded="false"`; the element found with `getElementById` of its `aria-controls` value is the answer; the answer has `hidden`; no `aria-label` or `aria-pressed` on the toggle |
| FC5 | click the toggle, then again | first: `Skjul svar`, `aria-expanded="true"`, the answer not `hidden`; second: back to `Vis svar`, `false`, `hidden`; focus stays on the toggle; the counter text is unchanged |
| FC6 | component, card with pages `[2]`; then pages `[]`; then source `null` | the answer holds `P.flashcard__answer-text` then `DIV.page-links` with the exact href and name; with `[]` or `null` the answer holds only the text paragraph |
| FC7 | component, card 1 | `Forrige` has `aria-disabled="true"`, no `disabled` attribute, `type="button"`, is focusable; clicking it changes nothing (still `Kort 1 av 5`, same term); `Neste` has no `aria-disabled` |
| FC8 | focus `Neste` and click it four times | the counter goes `Kort 2 av 5` … `Kort 5 av 5`, the term follows the input order; focus stays on `Neste`; on card 5 `Neste` has `aria-disabled="true"` and a further click changes nothing; `Forrige` is no longer aria-disabled from card 2 on |
| FC9 | from card 2, click `Forrige` | back to `Kort 1 av 5` and card 1's term; focus stays on `Forrige`, which is now aria-disabled |
| FC10 | reveal card 1, `Neste`, `Forrige` | card 2 starts hidden (`Vis svar`); back on card 1 the answer is revealed (`Skjul svar`, not `hidden`) |
| FC11 | component; also two decks rendered side by side | on every card the toggle's `aria-controls` value resolves with `getElementById` to the rendered answer; the two decks' answer ids differ |
| FC12 | an empty `cards` array | renders nothing (`container.firstChild` is `null`) |
| FC13 | a one-card deck | `Kort 1 av 1`; both `Forrige` and `Neste` aria-disabled; clicks change nothing |
| FC14 | component | no heading element in the deck; no `[lang]`, `[role]` or `[aria-label]` anywhere in it; no `disabled` attribute on any button; every button `type="button"` |
| FC15 | the component source, scanned by a local copy of the string-aware scanner (Story 1.18 KC12); a narrow source check, not a full JSX parser | positive controls: the literal `flashcard__term` is seen, and the code contains `aria-disabled`; no URL literal (`http`, `/api/demo`), no `dangerouslySetInnerHTML`, no `innerHTML`; no bare `disabled` token, i.e. no `disabled` that is not part of `aria-disabled` (not preceded by `-` or a word character and followed by `=`, `{`, whitespace, `/` or `>`). Because the component uses no identifier named `disabled` (D8), any match is a defect. The scan does not detect every spread-prop case (for example `{...{ disabled: true }}`); FC14's DOM check is the runtime backstop |
| RT1 | `ResultTabs`, source set | the Flashkort panel's children are exactly `H3.sr-only`, `DIV.flashcard-deck` |
| RT2 | `ResultTabs`, source set, summary pages and concept pages non-empty | Sammendrag and Nøkkelbegreper unchanged (Stories 1.17, 1.18); Quiz only `H3.sr-only` |
| RT3 | `ResultTabs`, source `https://example.test/doc.pdf` | the flashcard answer's link uses the same source |
| RT4 | `ResultTabs` with five cards: go to card 3 and reveal it; unmount; render `ResultTabs` again with the same results (a new results session) | the new deck shows `Kort 1 av 5`, card 1's term, `Vis svar` and a `hidden` answer; navigating to card 3 shows it hidden |
| FP1 | page, demo S4, Flashkort selected | the panel is visible; `Kort 1 av 5`; the term equals the fixture's first `front`; the answer is hidden |
| FP2 | page, `Neste` four times, then `Forrige` four times | terms in fixture order and back; focus stays on the pressed button; `Neste` aria-disabled on card 5, `Forrige` on card 1 |
| FP3 | page, reveal each card in turn | each answer text equals the fixture's `back`; each card's links are `http://127.0.0.1:8000/api/demo/sample.pdf#page=N` for its pages, `target="_blank"`, `rel="noopener"`, name `PDF-side N, åpnes i ny fane` |
| FP4 | page, Flashkort selected by click | focus order with the answer hidden: `[Vis eksempel, Flashkort tab, panel, toggle, Forrige, Neste]`; after `Vis svar`: `[…, panel, toggle, PDF-side 2 link, Forrige, Neste]` |
| FP5 | page: card 3, answer revealed; switch to Quiz and back | still `Kort 3 av 5`, still revealed, the same `.flashcard-deck` DOM node |
| FP6 | page, Sammendrag selected (default, right after S4 arrives) | the Flashkort panel is `hidden`; its counter already exists inside it with the text `Kort 1 av 5`; none of its buttons or links is in the focus order |
| FP7 | page; flush the `Resultatene er klare` announcement first (`advance(0)`, as K10), then start `watchRegion`; toggle and navigate | no request beyond `/api/status` and `/api/demo`; nothing written to the global status region (the watcher's texts stay empty) |
| FP8 | page, real mode | no `.flashcard-deck` |
| FP9 | page, `NEXT_PUBLIC_API_BASE_URL` = `http://localhost:9000` | the flashcard link uses that base |
| FR1 | CSS | `.button-secondary` has exactly the D9 declarations |
| FR2 | CSS | `.button-secondary:hover:not([aria-disabled="true"])` has exactly `background: var(--color-hover-tint)` |
| FR3 | CSS | `.button-secondary[aria-disabled="true"]` has exactly the D9 declarations |
| FR4 | CSS | `.flashcard-deck` has exactly the D9 declarations |
| FR5 | CSS | `.flashcard` has exactly the D9 declarations, including `padding: var(--padding-flashcard)` |
| FR6 | CSS | `.flashcard__counter` has exactly the D9 declarations |
| FR7 | CSS | `.flashcard__term` has exactly the D9 declarations, including `overflow-wrap: anywhere` |
| FR8 | CSS | `.flashcard__answer` has exactly the D9 declarations, including the three `--font-answer-*` tokens and `max-width: var(--measure-answer)`, and no `display` |
| FR9 | CSS | `.flashcard__answer-text` has exactly the D9 declarations (no font declarations) |
| FR10 | CSS | `.flashcard-nav` has exactly the D9 declarations |
| FR11 | CSS, comments removed first | the Story 1.19 section holds exactly the ten flat rules above, in order (no grouped or multi-line selector; this spec's own choice, D9), followed by exactly one at-rule, the D3a block `@media (max-width: 480px)`, which contains exactly one nested rule, `.flashcard`, with exactly one declaration, `padding: var(--space-7) var(--space-4)`; no other at-rule and no other nested selector in the section; every rule in the section uses only tokens defined in `:root`, no `width`/`height`, no `#`/`rgb`/`hsl`, no `.result-panel` selector, no `:focus-visible`, no `outline`; nothing but whitespace follows the media block |
| FR12 | CSS, comments removed first | `.button-secondary {` occurs once, after `.key-concept__explanation {`; none of the new class names appears before it |
| FR13 | CSS, comments removed first | the D3a block: `@media (max-width: 480px)` occurs exactly once in `globals.css`; its query is exactly `(max-width: 480px)`; it comes after the `.flashcard-nav` rule; it holds exactly one rule, whose selector is exactly `.flashcard`, with exactly one declaration, `padding: var(--space-7) var(--space-4)`; `:root` defines `--space-7: 32px` and `--space-4: 16px`; the base `.flashcard` rule still has `padding: var(--padding-flashcard)`; `:root` still has `--padding-flashcard: 32px 48px`; the section has no second media block and no other at-rule |

</frozen-after-approval>

## Code Map [FOR-G0]

| File | Change |
|---|---|
| `frontend/components/FlashcardDeck.tsx` | new (D1, D2, D5–D8) |
| `frontend/components/ResultTabs.tsx` | render `FlashcardDeck` in the Flashkort panel; header comment (D8) |
| `frontend/app/globals.css` | append the Story 1.19 section (D3, D3a, D4, D9) |
| `frontend/__tests__/flashcards.test.tsx` | new: rows FC1–FC15, RT1–RT4, FP1–FP9 |
| `frontend/__tests__/flashcards-css.test.ts` | new: rows FR1–FR13 |
| `frontend/__tests__/result-tabs.test.tsx` | CC-19 item 1 only |
| `frontend/__tests__/summary.test.tsx` | CC-19 items 2–3 only |
| `frontend/__tests__/results-shell.test.tsx` | CC-19 item 4 only |
| `frontend/__tests__/demo-start.test.tsx` | CC-19 item 5 only |
| `frontend/__tests__/key-concepts.test.tsx` | CC-19 item 6 only |
| `frontend/__tests__/key-concepts-css.test.ts` | CC-19 item 7 only |

Eleven files: 3 new, 8 modified. No backend, fixture, contract or dependency file; `DemoOutcome.tsx`, `PageLinks.tsx`, `KeyConceptsContent.tsx` and `summary-css.test.ts` are deliberately excluded.

## Approval gates

- **G0:** the developer approves D1, D2, D4–D11, the CC-19 scope, the CF-3 supersession and the answers to OQ1, OQ2 and OQ4–OQ6 (D3 is binding from Story 1.4; D8's counter placement above the card was selected at Checkpoint 208); the block from "## Intent" through the last matrix row is then frozen.
- **G0 amendment (Checkpoint 223):** the developer approved D3a, the amended FR11, the new row FR13 and the amended 1.19-M2; the block from "## Intent" through the last matrix row (now FR13) was frozen again (hashes in the AMENDED comment). No other requirement was re-approved.
- **G1:** `npm test`, `npx tsc --noEmit --incremental false`, `npm run lint`, `npm run build` pass; the backend suite passes unchanged.
- **G2 — manual checks** (Story 1.19's own; distinct from Story 1.16's still-open M-2 and M-4). Each records the browser and version, the OS, and how width, zoom or text spacing was set; any check not performed is recorded as NOT TESTED, never as passed:
  - **1.19-M1 — content and navigation (Chrome):** Flashkort shows `Kort 1 av 5` and the first term with its answer hidden; `Neste` steps through the five cards in fixture order and `Forrige` back; `Vis svar` / `Skjul svar` reveal and hide each answer; each revealed answer shows its page link(s) (`[2]`, `[3]`, `[3]`, `[6]`, `[5]`), and one of them opens the PDF at the right page in a new tab;
  - **1.19-M2 — layout, reflow, zoom, text spacing (amended at Checkpoint 223 for D3a):** the card matches DESIGN and the mockup (the counter centred **above** the card, the term centred inside it, left-aligned answer below a divider, Forrige/Neste centred below the card, secondary-button and disabled styles); check with card 1 and card 5 revealed (the longest answers) and with the toggle reading `Skjul svar`. At every width below: `document.documentElement.scrollWidth > document.documentElement.clientWidth` is `false` (no horizontal overflow, no two-dimensional scrolling); nothing is clipped or overlapped; the toggle, `Forrige` / `Neste` and the page links stay visible and usable; long answers wrap and the Forrige / Neste row wraps if needed; record how long Norwegian words in the term and the answer read:
    - **setting and confirming each width (R224-02):** set the CSS viewport width with the Chrome DevTools device toolbar (Responsive mode), not by resizing the browser window, because the window's outer width is not the CSS viewport and the media query is evaluated against the viewport. At 320, 375, 480, 481 and 768 CSS px and at the desktop width, run these three expressions in the DevTools console and record the actual results: `window.innerWidth`; `matchMedia('(max-width: 480px)').matches`; `getComputedStyle(document.querySelector('.flashcard')).paddingLeft`. Expected: at 320, 375 and 480 CSS px the query is `true` and the padding is `16px`; at 481 and 768 CSS px and at the desktop width the query is `false` and the padding is `48px`. A width whose recorded `window.innerWidth` differs from the intended width is retested at the intended width; any other result is a failure of the check;
    - at 320 CSS px (D3a applies; estimated text width about 158px): mid-word wrapping of the longest words of the 28px term is still **expected** and is recorded as G-4 evidence, not as a failure (CF-1);
    - at 375 CSS px (D3a applies; about 213px);
    - at 480 CSS px (D3a applies; the widest width with the narrow padding) and at 481 CSS px (the D3 padding `32px 48px` applies again): the card's side padding steps from 16px to 48px between the two widths; this is the expected 480/481 transition, recorded, not a defect;
    - at 768 CSS px and at a desktop width (for example 1280 CSS px): the D3 padding applies and the card looks as it did before D3a;
    - horizontal scrolling, clipping or overlap at any of these widths **fails** the check; D3a's text widths are estimates and do not replace this check. If the term is unusable even with D3a, stop and request a further Ask-First design decision;
    - at 200% browser zoom: the same expression is `false` and nothing overlaps; record whether D3a applies (only if the zoomed viewport is 480 CSS px or less);
    - with a text-spacing override (WCAG 1.4.12 values): nothing is clipped or overlapped in the term, the answer text, the buttons or the **page-link row** inside the revealed answer (a link reaching a few pixels into the card padding is recorded, not failed; CF-1). **Widths (R224-03):** this check is done at 320 CSS px (D3a applies) and at 768 CSS px (the D3 padding applies), each set as above. At both widths record that: no text is clipped; no content overlaps; the overflow expression above is `false`; the toggle and `Forrige` / `Neste` remain usable; the PDF page links remain usable; and a visible focus indicator appears where applicable (Tab to the toggle, a revealed page link and `Neste`). A button label may wrap onto two lines (for example `Skjul svar` at 320 CSS px) if its text stays fully visible, the button stays usable and it keeps at least its 44px minimum height (`--control-min-height`); such a wrap is recorded, not failed;
  - **1.19-M3 — keyboard:** keyboard only, Tab reaches the panel, the toggle, any revealed link, `Forrige` and `Neste` with a visible focus ring; Enter and Space on the toggle reveal and hide; Enter and Space on `Neste` / `Forrige` move cards and keep focus on the button; at the deck ends Enter, Space and a mouse click on the aria-disabled button do nothing and focus stays; after switching to another tab and back, the card and revealed answer are kept;
  - **1.19-M4 — screen reader:** Windows Narrator in Chrome, the combination used in Stories 1.17 and 1.18 and approved for this story at G0 (Checkpoint 209) (note: T-3, `EXPERIENCE.md:272`, names NVDA with Firefox or Chrome, or Narrator with Edge; the deviation is recorded). Record: `Kort N av M` announced on `Neste` / `Forrige`; whether anything is announced when switching to the Flashkort tab; the toggle announced with its expanded or collapsed state; after `Vis svar`, reading forward reaches the answer; how an aria-disabled `Forrige` / `Neste` is announced; one page link read with its accessible name; the term read as ordinary text, not as a heading.
  The 1.19-M2 result is new evidence for the open G-4 item (`issues.md:25`), added at the documentation step; it does not close G-4.
- **G3:** an independent scope and regression review, then approval of the exact staged file list (the eleven Code Map files). The later documentation step (session log, `issues.md`, this spec's Implementation Notes and Verification) is a separate commit outside the implementation scope, as in Stories 1.17 and 1.18.

## Proposed implementation stages

- **Stage A:** `FlashcardDeck` and rows FC1–FC15 (component only).
- **Stage B:** `ResultTabs` integration, rows RT1–RT4 and FP1–FP9, and CC-19 items 1–6.
- **Stage C:** the CSS section, rows FR1–FR12, and CC-19 item 7.
- **Stage C amendment (after Checkpoint 223):** the D3a media block in `globals.css` and rows FR11 (amended) and FR13 in `flashcards-css.test.ts`; no other file.
Each stage is followed by an independent review.

## Dependencies & deferred work

- **Depends on:** Story 1.4 (the `--padding-flashcard` token, D-9), Story 1.17 (`PageLinks`, the `pdfSource` prop), Story 1.18 (its CSS section and test boundary), merged in `1b979b4`.
- **Provides for:** Story 1.20 (the reusable `.button-secondary` for `Vis svar` / `Skjul svar`; the same CSS-boundary pattern for `flashcards-css.test.ts`), Story 1.21 (`Tilbake til start` reuses `.button-secondary`; the new-results flow must leave the success phase so that `ResultTabs` unmounts and mounts again, which resets the deck; the deck does not reset on a changed `cards` prop, so without that remount a shorter card list could leave an out-of-range card index), Story 2.6 (real-mode reuse; `lang="en"` on the term and answer elements), Story 2.7 (object-URL source).
- **Still open, not closed by this story:** Story 1.16's M-2/M-4 exceptions and incomplete G2 gate (`issues.md:74`); G-4 (`:25`), which receives the 1.19-M2 evidence and the CF-1 observation; the screen-reader follow-up (`:73`), whose note about "the remaining empty panels" changes for Flashkort at the documentation step; the stale `DemoOutcome.tsx` comment (Story 1.18 D4); `DESIGN.md:356` and `EXPERIENCE.md:280` still say that no breakpoints were decided, so recording D3a there is a later UX-documentation follow-up, to be noted in `issues.md` at the documentation step.

## Open questions

OQ1, OQ2 and OQ4–OQ6 were **resolved by the developer at G0 (Checkpoint 209, 2026-11-21)**, each as recommended (option a); OQ3 was closed by Story 1.4 D-9, and reopened and resolved by D3a at Checkpoint 223. The options as presented before G0 are kept below.

- **OQ1 — one card in the DOM or all [RESOLVED at G0]:** **Decision:** only the current card is in the DOM (D1). *Options before G0:* (a) only the current card (D1), recommended; (b) all cards, all but one hidden. (b) changes D6 (five answer ids), FC1, FC11, CC-19 items 3–4 (more links and fronts in the DOM) and FP4.
- **OQ2 — revealed state per card [RESOLVED at G0]:** **Decision:** each card's revealed state is remembered while navigating and across tab switches, and resets on a new results session (D2). *Options before G0:* (a) remember each card's revealed state while navigating (D2), recommended; (b) reset the answer to hidden on every Forrige/Neste. (b) changes D2 and FC10; FP5 still keeps the current card's state across tab switches, and RT4 is unchanged.
- **OQ3 — card padding [CLOSED, not a G0 question]:** Story 1.4 D-9 approved `--padding-flashcard` (`32px 48px`), which this story uses (D3). Narrowing it at small widths, or adding a breakpoint, would be a separate design change outside this story (Ask First; CF-1). **Reopened and resolved at Checkpoint 223:** after the 1.19-M2 observations at Checkpoint 221, the developer approved D3a (16px horizontal card padding at 480 CSS px or less); the token is unchanged.
- **OQ4 — secondary-button class [RESOLVED at G0]:** **Decision:** a reusable global `.button-secondary` (D4). *Options before G0:* (a) a reusable global `.button-secondary` (D4), recommended; (b) a flashcard-only class. (b) changes D4, D8, D9, FR1–FR3 and Story 1.20/1.21 reuse.
- **OQ5 — empty deck [RESOLVED at G0]:** **Decision:** an empty deck renders nothing (D5). *Options before G0:* (a) render nothing (D5), recommended, as Story 1.18 did; (b) render the counter `Kort 0 av 0` with disabled buttons (not recommended: invented state).
- **OQ6 — answer id [RESOLVED at G0]:** **Decision:** one `useId()` per deck (D6). *Options before G0:* (a) one `useId()` per deck (D6), recommended; (b) an id derived from the card index (not unique across two decks).

## Assumptions

- The demo fixture stays as committed: five cards, pages `[2]`, `[3]`, `[3]`, `[6]`, `[5]`, no line breaks; no flashcard front or back occurs in the summary, the key concepts or the quiz, and no front occurs in another card; the longest space-separated word is `leveringspålitelighet,` (22 characters including the comma).
- `DemoOutcome` unmounts `ResultTabs` before a new results session (every new pass goes through the loading phase), so the deck's state resets on remount (row RT4); Story 1.21 owns the `Tilbake til start` trigger.
- jsdom does not synthesize `click` from Enter/Space on a focused button, so automated rows drive activation with `click`; real keyboard activation is covered by 1.19-M3.

## Independent-review checklist

- [ ] All five Story 1.19 ACs and FR-5 are traced to decisions and rows.
- [ ] The DOM order, the counter region, the toggle semantics and the deck-end behaviour match UX-DR-18, UX-DR-25 and `EXPERIENCE.md:172, 233, 241`.
- [ ] The base card padding is the approved D-9 token; the only breakpoint is D3a, exactly as approved.
- [ ] `PageLinks` is reused unchanged; no link markup duplicated.
- [ ] Only existing tokens; the CSS limits of the older tests hold; no `display` on the hidden answer.
- [ ] CC-19 names every old assertion that Story 1.19 breaks, and nothing else; CF-3 lists every superseded frozen statement.
- [ ] No scope from Stories 1.20, 1.21 or Epic 2.

## Approval and freeze boundary

- **G0 done:** the developer approved revision 2b at Checkpoint 209 on 2026-11-21: D1, D2 and D4–D11 (D3 is binding from Story 1.4 D-9, `--padding-flashcard: 32px 48px`, with the documented 320 CSS px trade-off in CF-1); D8 with the counter **above** the card (selected at Checkpoint 208); the answers to OQ1, OQ2 and OQ4–OQ6 (option a each; OQ3 closed by D-9); the seven CC-19 items; the CF-3 supersession for the Flashkort panel only (the earlier frozen specs are not edited); the 40 automated rows and the manual checks 1.19-M1 to M4, with M4 run with Windows Narrator in Chrome; and the eleven-file Code Map. `status` is `ready-for-dev`; implementation starts at a later checkpoint.
- The sections from "Intent" to the end of "I/O & Edge-Case Matrix" (including Boundaries, Strings, traceability, the Decisions with the binding CC-19 scope (D10), and the conflicts with the CF-3 supersession) are wrapped in `<frozen-after-approval …>…</frozen-after-approval>`, preceded by the `<!-- APPROVED … -->` comment. Only the developer can change the frozen block.
- The Code Map, the gates, the stages, the dependencies, the open questions and the later sections stay outside the frozen block.
- **Amendment (Checkpoint 223, 2026-11-21):** the developer approved D3a (one `@media (max-width: 480px)` rule narrowing the card's horizontal padding to `--space-4`), the amended FR11, the new row FR13 and the amended 1.19-M2, and authorized the frozen block to be amended for these and their directly affected passages only. The block was frozen again from "## Intent" through the last matrix row (now FR13); the new hash is in the AMENDED comment. The Checkpoint 209 APPROVED comment and its hashes are kept unchanged as the previous baseline for audit history; this amendment re-approves no other requirement. The matrix now has 41 rows.

## Implementation Notes

(none yet)

## Spec Change Log

- **2026-11-21 — revision 1 (draft, Checkpoint 202):** first draft from Story 1.19 (`epics.md:940–966`), UX-DR-18, UX-DR-25, UX-DR-27, AF-5–AF-8, the DESIGN flashcard and button-secondary tokens (`DESIGN.md:189–227, 386, 389, 420`), the Story 1.16–1.18 specs and the existing frontend; decisions D1–D11 proposed (FOR-G0), six open questions, compatibility correction CC-19. Not reviewed, not approved.
- **2026-11-21 — revision 2 (draft, Checkpoint 204):** applies the Checkpoint 203 review (R203-01 to R203-14): the card padding is the binding Story 1.4 D-9 token `var(--padding-flashcard)` (D3, D9, FR5; OQ3 closed; CF-1 rewritten as the narrow-width concern; R203-01); the media-query rationale corrected, with "no breakpoints decided" as the binding source and FR11's flatness as this spec's own choice (R203-02); row RT4 tests the reset on a new results session and the traceability is corrected (R203-03); FC15 forbids only a bare JSX `disabled`, with an `aria-disabled` positive control (R203-04); CF-3 completed with CC-18 items 1 and 6, the CF-4 opening sentence and Story 1.16 K8, and `spec-1-18…:262` moved to "not superseded" (R203-05); D6's id rationale corrected (R203-06); the answer font moved to `.flashcard__answer` so `65ch` is measured in the answer font (R203-07); 1.19-M2 uses `clientWidth` with cards 1 and 5 revealed (R203-08); FC2 and FP6 check the counter's uniqueness and its presence in the hidden panel (R203-09); 1.19-M4 records the T-3 deviation, the tab-switch announcement and the aria-disabled announcement (R203-10); FP7 flushes the results announcement first (R203-11); FR-5 traced (R203-12); the counter is one template string and the toggle hook class and remount assumption are stated (R203-13); the longest-word assumption corrected (R203-14); `review_loop_iteration: 1`. Matrix 40 rows; Code Map eleven files. Not approved.
- **2026-11-21 — revision 2a (draft, Checkpoint 206, text only):** applies the Checkpoint 205 re-review (R205-01 to R205-09): Story 1.16 K8 removed from the CF-3 supersession list and recorded as not superseded (R205-01); CF-1 and 1.19-M2 state that mid-word wrapping of the term at about 94px is expected and recorded as G-4 evidence, that horizontal scrolling, clipping or overlap fails, that an unusable term stops work for an Ask-First decision, and M2 adds the page-link row under text spacing (R205-02); CC-19 item 5 lines 806–842 (R205-03); FC15 described as a narrow source check with FC14 as the runtime backstop, and D8 states that no identifier is named `disabled` (R205-04); `DESIGN.md:359` cited for the wrapping Forrige / Neste row and FR10 added to the UX-DR-38 trace row (R205-05; the re-review cited `:358`, the 200% zoom line, while `:359` is the reflow line that names the Forrige / Neste row); the counter placement inside the card stated in D8 as a proposal needing G0 approval (R205-06); the no-`display` rule retagged FOR-G0, the DESIGN ranges corrected to `189–207` and `220–228`, and `EXPERIENCE.md:36` cited for the panel `h3` (R205-07); "Provides for: Story 1.21" states the remount requirement (R205-08); D5 places `return null` after all hooks (R205-09). Decisions, open questions, the matrix (40 rows), CC-19 (seven items) and the Code Map (eleven files) otherwise unchanged; `review_loop_iteration` stays 1. Not approved.
- **2026-11-21 — revision 2b (draft, Checkpoint 208, text only):** the developer selected the counter **above** the card, matching the approved mockup (`direction-refined-rolig.html:265–266`). D8's markup moves `p.flashcard__counter` out of `.flashcard` to the first child of `.flashcard-deck`, immediately before the card; the D8 placement bullet records the choice; D9's `.flashcard__counter` note states that the deck centres it and its `gap` separates it from the card, and `.flashcard__term`'s top margin becomes `0` (it is now the card's first child); FC1 expects deck children `P.flashcard__counter`, `DIV.flashcard`, `DIV.flashcard-nav` and card children `P.flashcard__term`, the toggle, `DIV.flashcard__answer`; 1.19-M2 checks the counter above the card; the G0 gate notes the selection. The reading order, the counter's live-region attributes and behaviour, the padding token and all other decisions, rows and scope are unchanged; D8 as a whole and the other decisions remain pending G0. Not approved.
- **2026-11-21 — Checkpoint 209: APPROVED by the developer (G0)** (revision 2b) and frozen: `status` `draft` → `ready-for-dev`; the DRAFT comment replaced by the APPROVED comment, and the `frozen-after-approval` markers added around "Intent" … "I/O & Edge-Case Matrix"; inside the block only two approval edits — the Decisions intro states that the decisions are approved and binding, and D8's placement bullet states that D8 including the placement was approved; outside the block the tag legend, the Open questions (OQ1, OQ2, OQ4–OQ6 resolved), the M4 setup note and the new "Approval and freeze boundary" section. No technical requirement, the counter placement, the padding token, the 40-row matrix, the seven CC-19 items, the eleven-file Code Map, the four manual checks or the scope changed.
- **2026-11-21 — Checkpoint 223: AMENDED with developer approval (D3a)** and frozen again. Inside the block: In scope and Out of scope name D3a; the Boundaries' card-padding and no-breakpoint lines, the CSS-limits line (the `max-width` media condition), the placement line and Ask First allow exactly the D3a rule; the traceability rows for UX-DR-2, Story 1.4 D-9 and UX-DR-38 add D3a and FR13; the Decisions intro, D3 (the 94px figure marked "without D3a"; the closing sentence), the new D3a, D9 (`.flashcard` note; the media block last), CF-1 (the Checkpoint 221 observation, about 158px / 213px, mid-word breaks still expected); FR11 amended (ten flat rules followed by exactly the one D3a block) and the new row FR13. Outside the block: the new AMENDED comment, the Code Map entries for `globals.css` and `flashcards-css.test.ts` (still eleven files), the G0 amendment gate, 1.19-M2 (320, 375, 480, 481, 768 CSS px and desktop; 200% zoom; text spacing; the 480/481 transition), the Stage C amendment, the DESIGN/EXPERIENCE follow-up under Dependencies, OQ3, the checklist and the Approval and freeze boundary. Matrix 41 rows (FC1–15, RT1–4, FP1–9, FR1–13). No other decision, row, string, CC-19 item, file or scope changed; the Checkpoint 209 approval record is kept unchanged.
- **2026-11-21 — Checkpoint 225 (text only, outside the frozen block):** applies the Checkpoint 224 review: the tag legend explains D3a's [BINDING] tag as a developer-approved amendment (R224-04); 1.19-M2 adds how to set and confirm each width with the DevTools device toolbar and three recorded console expressions with the expected `16px` / `48px` results (R224-02), and the text-spacing check names its widths (320 and 768 CSS px), what is recorded at both, and when a wrapped button label is acceptable (R224-03). The frozen block (hash `6f78cc7d…1862`), the matrix (41 rows) and the approval records are unchanged.

## Review Triage Log

- **2026-11-21 — Checkpoint 203, independent adversarial review of revision 1:** FAIL; 1 BLOCKER (R203-01), 3 MAJOR (R203-02 to R203-04), 5 MINOR (R203-05 to R203-09), 5 NOTE (R203-10 to R203-14). Dispositions in revision 2:
  - R203-01 (padding already decided in Story 1.4 D-9) — fixed: D3 binding, D9 and FR5 use `var(--padding-flashcard)`, OQ3 closed, CF-1 rewritten; the developer decided at Checkpoint 204 to keep the approved token and record the about 94px text width at 320 CSS px for real-browser verification.
  - R203-02 (media-query rationale circular) — fixed: Boundaries, D3, D9, FR11.
  - R203-03 (no reset row) — fixed: row RT4, traceability, D2.
  - R203-04 (FC15 rejects `aria-disabled`) — fixed: FC15.
  - R203-05 (CF-3 incomplete) — fixed: CF-3.
  - R203-06 (useId rationale) — fixed: D6, FC4, FC11.
  - R203-07 (65ch measured in the body font) — fixed: D9, FR8, FR9 (the answer font on the wrapper; DESIGN unchanged).
  - R203-08 (overflow check) — fixed: 1.19-M2.
  - R203-09 (counter presence and uniqueness) — fixed: FC2, FP6.
  - R203-10 (T-3 combination; more M4 observations) — recorded: 1.19-M4.
  - R203-11 (FP7 ordering) — fixed: FP7.
  - R203-12 (FR-5 not traced) — fixed: traceability.
  - R203-13 (counter text nodes; hook class; remount) — applied: D7, D8.
  - R203-14 (longest word) — fixed: Assumptions.
- **2026-11-21 — Checkpoint 205, independent re-review of revision 2:** PASS WITH FINDINGS; R203-01 to R203-04 and R203-06 to R203-14 RESOLVED, R203-05 PARTIALLY RESOLVED (the K8 entry); 2 MINOR (R205-01, R205-02), 7 NOTE (R205-03 to R205-09); no blocker or major. Dispositions in revision 2a:
  - R205-01 (K8 wrongly superseded) — fixed: CF-3 (K8 listed as not superseded).
  - R205-02 (narrow-width expectations) — fixed: CF-1, 1.19-M2; the padding token and the no-breakpoint rule unchanged.
  - R205-03 (item 5 range) — fixed: CC-19 item 5.
  - R205-04 (FC15 limits) — fixed: FC15, D8.
  - R205-05 (FR10 and the wrapping row) — fixed: Boundaries, traceability (cited `DESIGN.md:359`).
  - R205-06 (counter placement) — fixed: D8, as a proposal for G0.
  - R205-07 (tags and citations) — fixed: Boundaries, Strings.
  - R205-08 (reset depends on Story 1.21) — fixed: Dependencies.
  - R205-09 (rules of hooks) — fixed: D5.
- **2026-11-21 — Checkpoint 208, developer choice:** D8's counter placement — counter above the card (the mockup's placement), not inside it. Applied in revision 2b. This is not a G0 approval: D1, D2, D4–D11, CC-19, CF-3 and OQ1, OQ2, OQ4–OQ6 remain pending.
- **2026-11-21 — Checkpoint 209, developer decisions (G0):** D1, D2 and D4–D11 approved (D3 binding from Story 1.4 D-9); D8 with the counter above the card; OQ1 (a) one card in the DOM; OQ2 (a) per-card revealed state; OQ4 (a) reusable `.button-secondary`; OQ5 (a) render nothing for an empty deck; OQ6 (a) one `useId()` per deck; OQ3 closed; the 320 CSS px trade-off accepted as documented in CF-1; CC-19 items 1–7 and the CF-3 supersession for Flashkort only; the 40 rows and M1–M4, with M4 in Windows Narrator with Chrome; the eleven-file scope. Story 1.16's M-2/M-4 and its incomplete G2 remain open.
- **2026-11-21 — Checkpoints 221–223, 1.19-M2 readability and the D3a amendment:** the developer's Chrome observations at Checkpoint 221 (320 CSS px: very narrow text area, awkward mid-word breaks, `Skjul svar` on two lines, the answer hard to read, no visible overlap or clipping; 375 CSS px more readable; 768 CSS px and desktop readable); horizontal overflow not measured, so 1.19-M2 stayed PENDING. Checkpoint 222 compared a media query, `clamp()`, narrower page padding and `hyphens: auto`, and proposed the media query. At Checkpoint 223 the developer approved D3a exactly as proposed (480 CSS px; `var(--space-7) var(--space-4)`), FR11 amended, FR13 and the amended M2. 1.19-M2 is to be repeated in full after the amendment is implemented.
- **2026-11-21 — Checkpoint 224, independent review of the D3a amendment:** PASS WITH FINDINGS; 0 BLOCKER, 0 MAJOR, 2 MINOR (R224-02, R224-03), 4 NOTE (R224-01, R224-04 to R224-06); both hashes reproduced; the approved block passes every other CSS suite in a simulation. Dispositions at Checkpoint 225:
  - R224-01 (a duplicate width query outside the Story 1.19 section would pass) — carried forward to the Stage C amendment: the FR13 test is to detect any duplicate of the approved 480px query, including whitespace variants; no stricter whole-file media-query count is added, because the approved rows do not require one.
  - R224-02 (no method to confirm the active padding) — fixed: 1.19-M2.
  - R224-03 (no width for the text-spacing check) — fixed: 1.19-M2.
  - R224-04 (tag legend) — fixed: the legend, outside the frozen block; the Decisions introduction is unchanged.
  - R224-05 (`DESIGN.md:356` / `EXPERIENCE.md:280` stale) — carried forward: to be recorded in `issues.md` at the documentation step (Dependencies).
  - R224-06 (`flashcards-css.test.ts` must change) — carried forward to the Stage C amendment: the parser is split into the flat rules and the one media block.

## Verification

(none yet)
