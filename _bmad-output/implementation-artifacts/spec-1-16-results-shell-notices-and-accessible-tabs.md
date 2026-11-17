---
title: 'Story 1.16: Results shell, notices and accessible tabs'
type: 'feature'
created: '2026-11-17'
status: 'done'
route: 'dispatch'
review_loop_iteration: 2
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

**How to read this spec.** Every normative rule carries one of four tags:
- **[BINDING]** — an approved requirement from `epics.md`, `EXPERIENCE.md`, `DESIGN.md`, `ARCHITECTURE-SPINE.md` or the PRD, with its source;
- **[APPROVED-CP111]** — a decision the developer approved at Checkpoint 111 (D-1, D-2, D-5 for S4, the S3 locked-bar ownership);
- **[APPROVED-CP113]** — a decision the developer approved at Checkpoint 113 (OQ1–OQ7, CF-A, CF-B, the shared test helper, the Story 1.15 supersession);
- **[FOR-G0]** — an implementation decision written by the author after the Checkpoint 112 review, with no open alternative left; **approved by the developer at G0 (Checkpoint 118, 2026-11-17) and now binding**. Wording inside the frozen block such as "becomes binding only through the developer's G0 approval" records how the decision was approved; that approval has now been given.

<!-- APPROVED at Checkpoint 118 (G0) by the developer on 2026-11-17: Story 1.16, revision 3a (SHA-256 of the whole file before the freeze edits 24e1c9fc77c409291d10c3f810c89223ed4ad329b20ce6fe9023442cf9b5124b; SHA-256 of the normative text from "## Intent" to the end of the I/O & Edge-Case Matrix 75ba9c36deeaadef6bcd8f92619e527c9a5aa8c191284d4fa0004367e1a645ae). Approved together: the complete revision 3a; decisions D3–D17 [FOR-G0]; the decisions approved at Checkpoints 111 (D-1, D-2, D-5, S3 locked-bar ownership) and 113 (OQ1–OQ7, CF-A, CF-B, the shared test helper, the Story 1.15 supersession); the 72-row I/O & Edge-Case Matrix; the binding C2 compatibility-correction scope stated in the OQ6 bullet under "Decisions" (two named tests only, the listed assertions and comments only, every other assertion and every other test unchanged); the visible "Låst" indicator on its own line at the start of the locked upload bar, using flex-basis: 100% (D15); and the boundaries separating Story 1.16 from Stories 1.17–1.21 and Epic 2. Freeze boundary: from "## Intent" through the last row (R9) of "## I/O & Edge-Case Matrix", inclusive; "## Code Map" and everything after it are outside the block. The block below is frozen: any change to it requires explicit renewed approval by the developer. This approval authorizes no implementation; implementation starts at a later checkpoint. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**User story** (`epics.md`, "Story 1.16", lines 860–888): as a reviewer, I want the results area organised under clear notices and accessible tabs, so that I can move between the four kinds of study material with mouse or keyboard.

**Problem:** after Story 1.15, demo S4 shows only the demo results heading and the Verification Notice. The validated `GenerationResponse` is held in the provider's state, but there are no tabs, no skipped-pages notice, and the upload bar keeps its S1 appearance during S3 and S4 (Story 1.15 D6a: the behavioural lock only).

**Approach:** in demo S4 the results section shows, in this order, the visible demo `h2`, the Verification Notice, the skipped-pages notice when `skipped_pages` is non-empty, and a full WAI-ARIA APG tab set (Sammendrag | Nøkkelbegreper | Flashkort | Quiz) with four mounted panels, each holding only a visually hidden `h3` for now. The demo upload bar switches to the locked variant (`upload-bar-locked`) in S3 and S4: a dashed paper-coloured bar with, in order, the visible `Låst` beside a decorative padlock, the natively disabled `Last opp`, the fixed settings as a `<dl>`, the fixed-settings note, and the aria-disabled `Vis eksempel`, which stays the same DOM node and keeps focus. The notices and tabs are built as mode-independent components fed by response data, so Story 2.6 can reuse them in real mode; this story renders them in demo mode only.

**In scope:**
- demo S4 results shell: heading `id`, notices, tablist, four panels;
- the skipped-pages notice (singular, two-item, 3+ wording);
- the demo locked upload bar in S3 **and** S4;
- decisions D-1, D-2, D-5 applied to demo, with D-1's real-mode part recorded for Story 2.6;
- the CSS for `notice-info`, `upload-bar-locked` and `result-tab` (+ hover, selected), the locked settings and the panels;
- two decorative icons (info circle, padlock);
- Vitest coverage, a new shared test helper, and the named compatibility correction C2 to two Story 1.15 tests.

**Out of scope:**
- summary text and the page-link component (Story 1.17); Nøkkelbegreper, Flashkort, Quiz content (Stories 1.18–1.20), including card position, `Vis svar`, `h4` per quiz question and remembering revealed answers (this story only provides the mounted-`hidden` structure that makes it possible);
- `Tilbake til start`, its row with the heading, and demo acceptance (Story 1.21);
- real-mode S3/S4 rendering, the file chip, `Generer`, the real `h2` `Resultater`, the not-saved note, `Ny fil`, `lang="en"` (Epic 2: Stories 2.4–2.7, 2.10);
- any change to the demo request lifecycle, `DemoProvider`, the error matrix, CF-2, or the known stuck-`loading` limitation (`issues.md:70`);
- any backend, `samples/` or dependency change; any new route, `<Link>`, client-side navigation or React `<Activity>` in application code.

## Boundaries & Constraints

**Always:**
- **[BINDING] Exact approved texts only** (`epics.md:216`: EXPERIENCE.md governs "exact copy"; `EXPERIENCE.md:135`: "Approved labels are preserved character-for-character"). The strings this story renders are listed in "Strings" below; nothing else is added.
- **[BINDING] Same page:** results stay on the single page (UX-DR-40: no separate results screen). No new route, no `next/link`, no `router` call, no `<Activity>` in application code.
- **[BINDING] Demo only for now:** nothing new renders unless `useAppStatus()` reports `phase === "ready"` and `status.mode === "demo"`. Real mode, S0 and S0x are unchanged.
- **[BINDING] No network change:** no new fetch; the only calls remain `GET /api/status` and `POST /api/demo` (AD-13: no live AI call, no external resource).
- **[BINDING] No content rendering beyond this story:** none of the response's summary text, key concepts, flashcards or quiz items is rendered; only the counts (array lengths) and `skipped_pages` are used.
- **[BINDING] `Vis eksempel` is never natively disabled** and stays focusable (UX-DR-18, UX-DR-40); its Story 1.15 behaviour is unchanged.
- **[BINDING] Region names never change** (UX-DR-5, `EXPERIENCE.md:162`): the upload section keeps `aria-label="Opplasting og innstillinger"` in every state; the mockup's `(låst)` suffix is not used (DESIGN.md Open Question 4, line 422).
- **[BINDING] Icons:** inline SVG, one default-exported component per file, `aria-hidden="true"`, `focusable="false"`, stroke `currentColor`, sized with SVG `width`/`height` attributes (DESIGN.md → Components → Icons).
- **[BINDING] CSS within the existing tests:** rules are appended only, as one Story 1.16 section at the end of `globals.css` whose first rule is `.notice-info {` (the section runs from that anchor to the end of the file); existing rules are not modified. In particular:
  - **no `width:` and no `height:` declaration** in any rule after `.demo-banner {` (only the `min-`/`max-` forms): both are enforced by `frontend/__tests__/demo-css.test.ts:140–148`, which checks everything from `.demo-banner {` to the end of `globals.css` (lines 146–147); `height:` is additionally banned by `globals-css.test.ts:241`;
  - no raw colour (`#…`, `rgb()`/`hsl()`), no new `--color-*` token (exactly 27), exactly one `:focus-visible` rule, no `box-shadow`, gradient, `url()`, `@import`, `@font-face`, `position: sticky/fixed`, `outline: none` or dark-mode rule;
  - only existing `--color-*`, `--font-*`, `--space-*`, `--radius-*`, border and size tokens.
- **[BINDING] No new dependency;** `package.json` and `package-lock.json` unchanged (no `@testing-library/user-event`).

**Ask First:**
- Any Norwegian text not in "Strings", any change to an approved string, or any change to a file listed under "Never".

**Never:**
- Changes to `backend/`, `samples/`, `frontend/lib/status.ts`, `frontend/lib/generation.ts`, `frontend/lib/demo.ts`, `frontend/lib/demo-errors.ts`, `frontend/lib/focus-target.ts`, `frontend/lib/contracts.ts`, `frontend/components/DemoProvider.tsx`, `AppStatusProvider.tsx`, `StartupCheck.tsx`, `StatusRegion.tsx`, `DemoBanner.tsx`, the existing icon files, `frontend/app/layout.tsx`, `frontend/app/page.tsx`, `frontend/next.config.ts`, `frontend/__tests__/status-fixtures.ts`, the dependency files, or any existing test file except compatibility correction C2.
- Any change to the frozen block of the Story 1.15 spec (or any other spec).
- `_bmad-output/planning-artifacts/architecture/technology.md` as a source.

## Strings

All exact, character for character; source in brackets.

| Use | Text | Source |
|---|---|---|
| Demo results heading (existing) | `Eksempelresultater (ikke generert nå)` | `EXPERIENCE.md:73` [BINDING] |
| Verification Notice (existing) | `Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.` | `EXPERIENCE.md:66` [BINDING] |
| Skipped pages, 1 entry | `PDF-side N hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.` | `EXPERIENCE.md:69` [BINDING] |
| Skipped pages, 2 entries | `PDF-side A og B hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.` | `EXPERIENCE.md:68` [BINDING] |
| Skipped pages, 3+ entries | `PDF-side A, B og C hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.` (comma list, `og` before the last) | `EXPERIENCE.md:67` [BINDING] |
| Tab labels | `Sammendrag`, `Nøkkelbegreper`, `Flashkort (N)`, `Quiz (N)` | `EXPERIENCE.md:87` [BINDING] |
| Panel `h3` (visually hidden) | `Sammendrag`, `Nøkkelbegreper`, `Flashkort`, `Quiz` (the tab name, no count) | `EXPERIENCE.md:36` [BINDING]; OQ2 [APPROVED-CP113] |
| Locked settings labels/values | `Språk på resultatene` / `Norsk bokmål`; `Detaljnivå` / `Standard` | `EXPERIENCE.md:88–89` [BINDING] |
| Lock-state text | `Låst` | D-2 [APPROVED-CP111] |
| Fixed-settings note (existing) | `Demoen viser ferdiglagde resultater på norsk bokmål med standard detaljnivå. Innstillingene kan ikke endres, og det lages ingen ny oversettelse.` | `EXPERIENCE.md:72`; D-5 [APPROVED-CP111], OQ4 [APPROVED-CP113] |
| `Last opp`, `Vis eksempel` (existing) | unchanged | `EXPERIENCE.md:84, 86` [BINDING] |

Page numbers are the integers from `skipped_pages`, written as plain decimal digits.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| Story 1.16 AC 1 | demo S4: Verification Notice; skipped-pages notice with singular / two-item / 3+ wording; upload bar locked with the fixed settings as a `<dl>` | D4, D6–D9; rows N1–N9, L1–L14 |
| Story 1.16 AC 2 | full APG tabs, fixed order, Sammendrag selected, counts on Flashkort and Quiz; Left/Right automatic activation with wrapping, Home/End; one Tab stop; inactive panels mounted with `hidden`; `h3` per panel | D10–D13; rows T1–T12, K1–K13, P1–P4 |
| Story 1.16 AC 3 | Nøkkelbegreper, Flashkort, Quiz exist as empty panels (expected in-between state) | D12, CF-A; rows P1–P4 |
| Story 1.16 AC 4 | D-1, D-2, D-5 decided here; D-2 wording approved by the developer | D1, D2, D5 |
| Story 1.16 AC 5 | Vitest covers skipped-pages wording, tab keyboard behaviour and roving tabindex | rows N1–N9, K1–K13, T5–T7; plus the other rows |
| FR-5 | Results shown after a successful pass; not on failure | D3; rows S1–S4 |
| FR-6 | Verification Notice visible with Results, no extra clicks | D6; row N1 |
| AR-25 / spine "Notices with Results" | Verification Notice always; skipped-pages notice only when non-empty; demo banner in demo | D6, D7; rows N1–N3 |
| AR-21 layer 3 | small focused frontend tests incl. the skipped-pages notice | the matrix |
| UX-DR-2 | `notice-info`, `upload-bar-locked`, `result-tab` (+ hover, selected) styled from tokens | D15; rows R1–R9 |
| UX-DR-10, -11 | Verification Notice; skipped-pages notice (`notice-info`) | D6, D7 |
| UX-DR-13 | locked read-only bar in S3 and S4, `<dl>`, lock icon `aria-hidden`, lock in text; unlocks on S5; demo S4 locked with fixed settings; wraps | D2, D4, D8, D9; rows L1–L14 |
| UX-DR-14 | `Last opp` disabled in demo and while locked | D8 (OQ1); rows L7, L13 |
| UX-DR-19 | "everything locked" in S3 | D4, D8 (the visual lock in S3) |
| UX-DR-21 | S4: `h2`, notices above the tabs, upload bar locked, focus not moved | D3, D6, D14; row F2 |
| UX-DR-22 / AF-3 | APG tabs | D10–D13 |
| UX-DR-35 | keyboard operable, tab order = visual order, focus never lost to `<body>`, no custom shortcuts | D9, D13, D14; rows K6, K11, F1–F7 |
| UX-DR-36 | accessible name = visible label | D10; row T10 |
| UX-DR-38 (G-4, `issues.md:25`) | 320 px reflow, 200% zoom, targets ≥ 44px | D16; rows R6–R9; M-3 |
| UX-DR-5 / AF-8 | heading outline h1 → h2 → h3 per panel; region names fixed | D1, D3, D12 |
| `issues.md:72` | demo S3 visual locked bar has no owning story | D-S3; D4, D8; closes at closeout if verified |
| `issues.md:70` | stuck-`loading` limitation; recovery needed before a second route | not touched; D17 |

## Decisions

### Approved by the developer

- **D1 — D-1, heading visibility [APPROVED-CP111]:**
  - real-mode S4 `h2` `Resultater`: **visible** (implemented by Story 2.6; recorded here);
  - demo-mode S4 `h2` `Eksempelresultater (ikke generert nå)`: **visible** (already so since Story 1.15);
  - panel `h3`s: present in the DOM, **visually hidden** with the existing `.sr-only` class, so they do not duplicate the visible tab labels; their text is the tab name without a count (OQ2 [APPROVED-CP113]).
- **D2 — D-2, lock-state text [APPROVED-CP111; placement APPROVED-CP113, OQ3]:** the locked bar shows the visible text `Låst` beside a decorative padlock icon (`aria-hidden="true"`), as the **first** child of the bar; its text content is exactly `Låst` (no leading or trailing whitespace); the upload section's accessible name stays `Opplasting og innstillinger`; the locked settings are a description list of `<dt>`/`<dd>` pairs.
- **D5 — D-5, fixed-settings note [APPROVED-CP111 for S4; extended to S3 APPROVED-CP113, OQ4]:** the approved note stays visible, with the exact EXPERIENCE.md wording, in demo S3 and demo S4 (and, unchanged, in S1 and S5); no replacement text.
- **D-S3 — ownership of the S3 locked bar [APPROVED-CP111]:** Story 1.16 owns the visual locked-bar treatment in both demo S3 and demo S4 (read-only appearance, dashed border, lock-state text, existing tokens), without changing S3 behaviour or the request lifecycle.
- **Approved at Checkpoint 113 [APPROVED-CP113]:**
  - **OQ1:** `Last opp` stays visible in the locked bar, natively `disabled`;
  - **OQ5:** an empty list shows `(0)`; counts are the real array lengths;
  - **OQ6:** compatibility correction C2. Its binding scope, at baseline `056f66c` of `frontend/__tests__/demo-start.test.tsx`, is exactly:
    - **only two tests may change:** "click: one POST, focus kept, loading shown and announced, indicator, locked (B1, B3–B5, B14)" and "success: heading, notice, guidance gone, focus kept, announced, no repeat, no content (C1–C5)"; their names stay unchanged;
    - **in the first test, only** the assertions on the two settings `combobox`es (their lookup, `disabled`, `value`, option count, and the `fireEvent.change` check), the comment "B14: the behavioural S3 lock.", and the two explanatory comment lines directly above `fireEvent.change` ("A change event on the disabled select changes nothing …" and "(Writing a new value into the DOM first would be a jsdom artefact …)", baseline L796–L797) may change; they are replaced by locked-bar assertions (no `combobox` in the upload section, `upload-bar-locked` on the root, the two `<dl>` pairs, `Låst`);
    - **in the second test, only** the single `getByRole("note")` lookup (it becomes the first `role="note"` in Resultater), the "no tablist" assertion (it becomes "a tablist exists") and the comment "C4: nothing of the response's content is rendered (Stories 1.16–1.20)." may change;
    - **every other assertion in both tests stays unchanged**, in particular: one `POST /api/demo` per activation, `Vis eksempel` `aria-disabled` and keeping focus in S3 and on success, `Last opp` natively disabled, the DEMO banner visible, the Verification Notice text and classes, the announcements, no summary text and no `<a>` in Resultater, and the fixed-settings note in the upload section;
    - **no other test in any file changes**; in particular "a repeated identical error moves focus to the headline again (E15, E16)", "decision by error_code on the page (E7)" and "only /api/status and /api/demo are fetched (B12)" stay unchanged and must pass.
    The line-level detail is in "Compatibility correction C2" below (explanatory; the scope above governs);
  - **OQ7:** empty panels are semantically valid, focusable when active (`tabindex="0"`), and padded so the focus ring is visible;
  - **CF-A:** the Sammendrag panel is empty in this story (Story 1.17 owns the summary);
  - **CF-B:** no temporary `Tilbake til start` button and no heading-row wrapper (Story 1.21);
  - **shared test helper:** `frontend/__tests__/demo-fixtures.ts` (Code Map);
  - **supersession:** Story 1.16 supersedes, for demo S3 and S4 only, Story 1.15's frozen D3 (two natively disabled `<select>`s, `spec-1-15…md:73`), D6a ("in Story 1.15 the bar keeps its S1 appearance during S3 and S4", `spec-1-15…md:77`), D8 in part (`spec-1-15…md:89`: the S4 composition of heading and notice only, "nothing of its content is rendered" as far as counts, skipped pages and the empty tab structure are concerned, and the interim upload bar that "stays as in S1"), matrix row B14 (the S3 selects) and row C4 ("no tablist"); the Story 1.15 spec is not edited, and its S1 and S5 rules stay in force.

### Implementation decisions [FOR-G0]

- **D3 — results shell in demo S4:** `DemoOutcome`'s `success` branch renders, as direct children of `<section aria-label="Resultater">` (via a Fragment), in this DOM and visual order:
  1. `<h2 id="results-heading" className="demo-results-heading">Eksempelresultater (ikke generert nå)</h2>` (the existing heading gains only the `id`);
  2. `<ResultNotices skippedPages={response.skipped_pages} />`, which returns a Fragment: the Verification Notice, then the skipped-pages notice when present (D6, D7);
  3. `<ResultTabs results={response.results} labelledBy="results-heading" />`, which returns a Fragment: the tablist, then the four panels (D10–D12).
  So the section's element children in S4 are, in order: `h2`, `div.notice-warning`, [`div.notice-info`], `div[role=tablist]`, four `div[role=tabpanel]`. The S1 guidance, the S3 loading view and the S5 error state are unchanged.
- **D4 — when the demo bar is locked:** locked ⇔ `useDemoFlow().state.phase` is `"loading"` (S3) or `"success"` (S4). In `idle` (S1) and `error` (S5, both groups) the bar keeps its Story 1.15 appearance ("unlocks on S5", UX-DR-13). The value is derived in `DemoControls`; `DemoProvider` is not changed.
- **D6 — Verification Notice:** moved unchanged (markup, classes, `role="note"`, `WarningIcon`) from `DemoOutcome` into `ResultNotices`, first.
- **D7 — skipped-pages notice:**
  - a pure function `skippedPagesText(pages: readonly number[]): string | null` in `frontend/lib/skipped-pages.ts`;
  - **input contract:** `pages` is a list of positive integers in strictly increasing order, as already validated upstream (`frontend/lib/generation.ts:11`; AD-11 "sorted"); the function does not sort, de-duplicate or re-validate;
  - `[]` → `null`; 1 entry → `PDF-side A hadde …`; 2 → `PDF-side A og B hadde …`; n ≥ 3 → `PDF-side A, B, …, Y og Z hadde …` (`, ` between items, ` og ` before the last); the suffix ` hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.` is one constant;
  - rendered only when the text is not `null`, as `<div className="notice-info" role="note"><InfoIcon className="notice-info__icon" /><p>{text}</p></div>`, directly after the Verification Notice and above the tabs (UX-DR-21);
  - the demo fixture has `skipped_pages: [4]`, so demo S4 shows `PDF-side 4 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.`
- **D8 — locked bar structure:** in the locked state the bar's element children are, in order:
  1. `<p className="upload-bar__lock"><LockIcon className="upload-bar__lock-icon" />Låst</p>` — no whitespace text node, so `textContent === "Låst"`; spacing by CSS `gap` (D2, OQ3);
  2. `Last opp`, unchanged and natively `disabled` (OQ1; UX-DR-14);
  3. `<dl className="locked-settings">` with exactly two `<div>` groups, each holding one `<dt>` and one `<dd>`: `Språk på resultatene`/`Norsk bokmål`, `Detaljnivå`/`Standard`; no `<select>`, `<label>` or other form control for the settings while locked (DESIGN.md:382 "no input chrome"); no `Emnekode` row (Story 1.15 D3, AD-13) and no file name (demo has no file);
  4. the fixed-settings note, unchanged (D5, OQ4);
  5. `Vis eksempel`, unchanged (D9).
  The root element additionally gets the class `upload-bar-locked`. Unlocked, the children are exactly as in Story 1.15: `Last opp`, two `div.settings-field`, the note, `Vis eksempel`.
- **D9 — `Vis eksempel` keeps its DOM node and focus [enforces BINDING UX-DR-35 and Story 1.15 CF-1]:** `Vis eksempel` must be the **same DOM node** across S1 → S3 → S4, S3 → S5 and S5 → S3. A React `key` alone does not guarantee this, so `DemoControls` must satisfy all of:
  - it returns **one** JSX tree whose root is always the same `<div className="upload-bar …">` element at the same position (only its `className` changes); it never switches between separate components or between two different root elements for the locked and unlocked variants;
  - **no state-dependent `key`** is placed on the upload-bar root or on any other ancestor of `Vis eksempel` (a key that changes with the demo state would remount the subtree);
  - the state-dependent children sit in **stable conditional slots** inside that root (for example `{locked && <p …>Låst</p>}`, `Last opp`, `{locked ? <dl …/> : <>…two settings fields…</>}`, the note);
  - `Vis eksempel` is the **last** child of that root and is rendered **unconditionally**: never inside a conditional Fragment, a ternary branch or a variant sub-component; a `key` on it is allowed but not relied on;
  - its `ref` callback (the G-2 focus-target registration, `useCallback(…, [])`) therefore runs once per mount, not per state change.
  Verified by rows F1–F3, F7, L11 and, in `frontend/__tests__/demo-start.test.tsx` at baseline `056f66c`, the existing focus guards in the tests "click: one POST, focus kept, loading shown and announced, indicator, locked (B1, B3–B5, B14)", "success: heading, notice, guidance gone, focus kept, announced, no repeat, no content (C1–C5)" and "a repeated identical error moves focus to the headline again (E15, E16)".
- **D10 — tab list:**
  - `<div role="tablist" aria-labelledby="results-heading" className="result-tabs">` holding four `<button type="button" role="tab" className="result-tab">` in the order Sammendrag, Nøkkelbegreper, Flashkort, Quiz;
  - ids by PRD glossary key: `result-tab-summary`, `result-tab-key-concepts`, `result-tab-flashcards`, `result-tab-quiz`; each tab has `aria-controls` = its panel's id and `aria-selected="true"|"false"`;
  - labels: `Sammendrag`, `Nøkkelbegreper`, `Flashkort (${results.flashcards.length})`, `Quiz (${results.quiz.length})`; an empty list shows `(0)` (OQ5); the accessible name is the visible label (no `aria-label`);
  - no `aria-orientation` (horizontal is the default).
- **D11 — selection and roving tabindex [BINDING pattern]:** Sammendrag is selected on mount; exactly one tab has `aria-selected="true"` and `tabIndex={0}`, the others `aria-selected="false"` and `tabIndex={-1}`. The selection is local state in `ResultTabs`, so it resets on every new mount (a new results session; Story 1.21 relies on this).
- **D12 — panels:** four `<div role="tabpanel" className="result-panel">` with ids `result-panel-summary`, `result-panel-key-concepts`, `result-panel-flashcards`, `result-panel-quiz`, `aria-labelledby` = their tab's id, `tabIndex={0}`, always mounted, and the `hidden` attribute on every panel except the selected one. Each holds only `<h3 className="sr-only">` with the tab name without a count (D1, OQ2). All four panels are empty in this story, including Sammendrag (CF-A); they are padded so the focus ring has a visible box (OQ7, D15). No CSS rule sets `display` on `.result-panel` (author `display` would override the UA `[hidden]` style).
- **D13 — keyboard and pointer [BINDING behaviour]:**
  - one `onKeyDown` handler on the tablist. If `event.altKey`, `event.ctrlKey` or `event.metaKey` is set, the event is **not handled** and `preventDefault()` is **not** called (browser shortcuts such as Alt+ArrowLeft stay intact; UX-DR-35 "no custom keyboard shortcuts");
  - otherwise: `ArrowRight` → next tab, wrapping from Quiz to Sammendrag; `ArrowLeft` → previous, wrapping from Sammendrag to Quiz; `Home` → Sammendrag; `End` → Quiz; each selects the target tab (automatic activation), moves focus to it, and calls `preventDefault()`; `Shift` does not change this;
  - the **current index is the index of the event's target among the tablist's tabs** (not the selection state); a keydown whose target is not a tab (for example the tablist element itself) is ignored: nothing changes and `preventDefault()` is not called. The tab elements are found in the handler (for example via `event.currentTarget.querySelectorAll('[role="tab"]')`, or refs read only in handlers), never by reading `ref.current` during render;
  - every other key is not handled (no Up/Down, no letters);
  - **pointer:** the tab's `onClick` selects that tab **and** calls `focus()` on it, because Safari, Firefox on macOS and jsdom do not focus a button on click; this also keeps focus off `<body>` when focus was inside a panel that becomes `hidden`. `Enter`/`Space` on a focused tab reach the same `onClick` through the native button;
  - `Tab` from the selected tab goes to the visible panel (`tabIndex={0}`), then onward; unselected tabs and hidden panels are skipped;
  - the index arithmetic is a pure helper `nextTabIndex(current: number, key: string, count: number): number | null` in `frontend/lib/tabs.ts` (the modifier check stays in the handler).
- **D14 — focus and screen-reader behaviour [BINDING]:**
  - results arrive (S4): focus is not moved; it stays on the aria-disabled `Vis eksempel`; `Resultatene er klare` is announced once by the existing provider (unchanged); the results area follows the upload section in tab order;
  - no new live region, announcement or `role="alert"`; the notices are `role="note"`; tab state is conveyed by `role="tab"` and `aria-selected`; `Låst` and the `<dl>` pairs are read as normal content;
  - focus is never lost to `<body>` through the lock/unlock, tab changes (keyboard or pointer) or the notices.
- **D15 — visual treatment [FOR-G0 rules; BINDING tokens]** (a new section appended at the end of `globals.css`, starting with the rule `.notice-info {`; existing rules, including the grouped `.demo-banner p, .notice-warning p, .demo-loading p` rule at `globals.css:308–313`, are not edited):
  - `.notice-info`: as `.notice-warning` (flex, gap, margin, `--padding-notice`, radius, small type), with `--color-notice-info-bg/-fg` and a `--border-emphasis` left rule in `--color-notice-info-border`; `.notice-info__icon { flex: none }`; `.notice-info p { margin: 0; min-width: 0 }`;
  - `.upload-bar.upload-bar-locked`: `background: var(--color-background)`; `border-style: dashed` (width and colour stay `--border-hairline` / `--color-border`);
  - `.upload-bar__lock`: `display: flex; align-items: center; gap: var(--space-1); margin: 0; flex-basis: 100%` (its own line at the start of the bar — a proposed [FOR-G0] implementation decision by the author, not an already approved requirement; OQ3 approved only that `Låst` comes first; this own-line layout becomes binding only through the developer's G0 approval), `--font-caption-*`, `--color-text-muted`; `.upload-bar__lock-icon { flex: none }`;
  - `.locked-settings`: `display: flex; flex-wrap: wrap; gap: var(--space-3) var(--space-4); margin: 0`; its `div` groups: `display: flex; flex-direction: column; gap: var(--space-1); min-width: 0`; `dt`: `--font-caption-*`, `--color-text-muted`; `dd`: `margin: 0`, `--font-settings-value-*`, `--color-text`, `min-height: var(--control-min-height)`, `display: flex; align-items: center`, `overflow-wrap: anywhere`;
  - `.result-tabs`: `display: flex; flex-wrap: wrap`; `border-bottom: var(--border-hairline) solid var(--color-border-subtle)`; `margin-top` from `--space-*`;
  - `.result-tab`: `border: 0; border-bottom: var(--border-emphasis) solid transparent` (UA button border reset), `background: transparent`, `padding: 0 var(--space-3)`, `min-height: var(--control-min-height)`, `--font-ui-*`, `--color-text-muted`;
  - `.result-tab:hover`: only `background: var(--color-hover-tint)`;
  - `.result-tab[aria-selected="true"]`: `color: var(--color-primary)`, `font-weight: var(--font-subheading-weight)` (600), `border-bottom-color: var(--color-primary)` (kept on hover, because the hover rule changes only the background);
  - `.result-panel`: `padding: var(--space-4)` (the focus-ring box, OQ7); no `display`;
  - no `width:` or `height:` declaration anywhere in the section.
- **D16 — reflow [BINDING UX-DR-38]:** the tab list, the locked bar, the `<dl>` groups and the notices wrap; long words wrap; no horizontal scroll at 320 CSS px or 200% zoom; tabs and the `dd` rows are ≥ 44px tall.
- **D17 — navigation and the Story 1.15 limitation [BINDING constraint from `issues.md:70`]:** no route, client-side navigation or `<Activity>` is added; tabs are in-page state. The stuck-`loading` limitation remains unreachable and unchanged; `DemoProvider` is not touched.

## Conflicts and source findings (all resolved)

- **CF-A — Sammendrag missing from the empty-panels AC:** resolved [APPROVED-CP113]: Sammendrag is empty too; Story 1.17 owns the summary (`epics.md:890–902`).
- **CF-B — `Tilbake til start` on the heading row** (UX-DR-21; DESIGN.md "Demo results heading"): resolved [APPROVED-CP113]: no placeholder button or row wrapper; Story 1.21 adds both (UX-DR-30).
- **CF-C — Story 1.15 rules and tests describe the interim:** resolved [APPROVED-CP113]: the supersession of Story 1.15 D3, D6a, D8 (in part), B14 and C4 for S3/S4 (see "Approved by the developer"); the two affected tests are corrected by C2; the Story 1.15 spec is not edited.
- **CF-D — the fixed-settings note is listed for "Demo S1" (`EXPERIENCE.md:72`):** resolved: D-5 [APPROVED-CP111] extends it to S4, OQ4 [APPROVED-CP113] to S3.
- **CF-E — mockup vs spine:** the mockup's `aria-label="… (låst)"`, its `title="Låst"` tooltip on the file chip and its natively `disabled` `Generer` are not followed; the spine wins (DESIGN.md Open Question 4): fixed region name, visible `Låst` (D-2), aria-disabled `Vis eksempel`.
- **CF-F — real mode:** Story 2.6 (`epics.md:1214–1246`) reuses "the Epic 1 tabs and panels" and adds the real `h2`, the file name in the `<dl>` and `lang="en"`. This story keeps `ResultNotices` and `ResultTabs` free of demo-only assumptions but adds no real-mode rendering.
- **Empty focusable panels:** resolved [APPROVED-CP113, OQ7]: accepted as the AC 3 in-between state, with padding for the focus ring.

## I/O & Edge-Case Matrix

72 rows. "Page" rows render `<Home />` with the shared helper (`demo-fixtures.ts`: status `mode: "demo"`, then the recorded `samples/demo-response.json` reply); "component" rows render `ResultTabs` or `ResultNotices` directly with hand-built props; "unit" rows call a pure function. jsdom limits: there is no Tab-key navigation and no Enter/Space-to-click conversion, so the sequential focus order is **computed** (focusable elements in DOM order — `button`, `select`, `input`, `a[href]`, `[tabindex]` — excluding `disabled`, `[tabindex="-1"]`, and anything inside `[hidden]`), and Enter/Space are covered by manual check M-1.

**Skipped-pages wording (unit)**

| Row | Input | Expected |
|---|---|---|
| N2 | `[]` | `null` |
| N4 | `[2, 7]` | `PDF-side 2 og 7 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.` |
| N5 | `[2, 7, 9]` | `PDF-side 2, 7 og 9 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.` |
| N6 | `[1, 2, 3, 4, 5]` | `PDF-side 1, 2, 3, 4 og 5 hadde …` (exact full string) |
| N7 | `[12, 80]` | `PDF-side 12 og 80 hadde …` (exact) |
| N8 | `[3]` and the cases above | exact singular string for `[3]`; no U+00A0; exactly one normal space on each side of `og`; `, ` between items |

**Notices (page and component)**

| Row | Situation | Expected |
|---|---|---|
| N1 | page, S4 | the first `role="note"` in Resultater is `div.notice-warning`, exact Verification Notice text, icon `aria-hidden` |
| N3 | page, S4 (fixture `[4]`) | a `div.notice-info` `role="note"` directly after the Verification Notice and before the tablist, text `PDF-side 4 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.`, info icon `aria-hidden` `focusable="false"` |
| N9 | component, `skippedPages: []` and `[2, 7]` | `[]`: only the Verification Notice, no `.notice-info`; `[2, 7]`: the notice text is a text node (no element inside the `p`) |

**Results shell and panels**

| Row | Situation | Expected |
|---|---|---|
| S1 | page, S4 | the element children of Resultater are, in order: `h2#results-heading`, `div.notice-warning`, `div.notice-info`, `div[role=tablist]`, four `div[role=tabpanel]` |
| S2 | page, S1, S3, S5 | no tablist, no tabpanel, no `.notice-info` |
| S3 | page, S4 | none of the fixture's summary text, concept terms, flashcard fronts or quiz questions is in the document; no `<a>` in Resultater |
| S4 | page, real mode | no tablist, notices or locked bar (re-asserts Story 1.15 row G1) |
| P1 | page, S4 | four `role="tabpanel"` in the DOM, each with `aria-labelledby` = its tab id and `tabindex="0"` |
| P2 | page, S4 | only the Sammendrag panel lacks `hidden`; the other three have it and are still in the DOM |
| P3 | page, S4 | each panel holds exactly one element, an `h3.sr-only` with the tab name without a count |
| P4 | page, S4 | `document.querySelectorAll("h3")` finds four, in tab order; `getAllByRole("heading", { level: 3 })` (hidden content excluded) finds one, `Sammendrag`; no `h4` |

**Tabs**

| Row | Situation | Expected |
|---|---|---|
| T1 | page, S4 | one `role="tablist"` with `aria-labelledby="results-heading"`; accessible name `Eksempelresultater (ikke generert nå)` |
| T2 | page, S4 | four `role="tab"` `<button type="button">` in order `Sammendrag`, `Nøkkelbegreper`, `Flashkort (5)`, `Quiz (5)` (fixture counts) |
| T3 | component, 8 flashcards, 6 quiz items, 3 key concepts | `Flashkort (8)`, `Quiz (6)`; `Sammendrag` and `Nøkkelbegreper` show no count |
| T4 | component, empty `flashcards` and `quiz` | `Flashkort (0)`, `Quiz (0)` (OQ5) |
| T5 | page, S4 initial | Sammendrag `aria-selected="true"`, `tabindex="0"`; the others `"false"`, `"-1"` |
| T6 | page, S4 | each tab's `id` and `aria-controls` match the panel ids of D10/D12 |
| T7 | component, after each change in K1–K4 and T8 | exactly one tab has `tabindex="0"`, and it is the selected one |
| T8 | component, click Quiz | Quiz selected, its panel visible, the other three `hidden` and still mounted |
| T9 | component, click through all tabs | each panel is the same DOM node before and after (not remounted) |
| T10 | page, S4 | no tab has `aria-label`; each tab's accessible name equals its text |
| T11 | unit, `nextTabIndex` | Right 0→1, 3→0; Left 0→3, 2→1; Home → 0; End → 3; `ArrowUp`, `ArrowDown`, `a` → `null` |
| T12 | component | select Quiz, unmount `ResultTabs`, mount it again → Sammendrag selected |

**Keyboard and pointer (component unless stated)**

| Row | Situation | Expected |
|---|---|---|
| K1 | focus Sammendrag, `ArrowRight` | Nøkkelbegreper focused **and** selected; its panel visible |
| K2 | focus Quiz, `ArrowRight` | wraps to Sammendrag (focused, selected) |
| K3 | focus Sammendrag, `ArrowLeft` | wraps to Quiz |
| K4 | `Home` / `End` from a middle tab | Sammendrag / Quiz focused and selected |
| K5 | K1–K4 | `fireEvent.keyDown` returns `false` (default prevented) |
| K6 | `ArrowUp`, `ArrowDown`, a letter; and `Alt+ArrowLeft`, `Ctrl+Home`, `Meta+ArrowRight` | no selection or focus change; `fireEvent.keyDown` returns `true` (default not prevented) |
| K7 | page, S4, computed focus order | … `Vis eksempel` (aria-disabled, focusable) → the selected tab → the visible panel; unselected tabs, hidden panels and natively disabled `Last opp` are not in it |
| K8 | page, S4, after K1, computed focus order | the newly selected tab, then its panel; the previously selected tab is no longer in the order |
| K9 | click a tab | the click path selects it; Enter/Space reaching `onClick` is checked manually (M-1), because jsdom does not convert them |
| K10 | page, S4, K1–K4 and clicks | no new request; the status region is not written |
| K11 | focus the visible Sammendrag panel, then `fireEvent.click` on the Quiz tab | Quiz selected, `document.activeElement` is the Quiz tab (never `<body>`), the Sammendrag panel `hidden` |
| K12 | focus Sammendrag, `Shift+ArrowRight` | as K1: Nøkkelbegreper focused and selected; `fireEvent.keyDown` returns `false` (Shift does not change the arrow behaviour) |
| K13 | `ArrowRight` dispatched on the tablist element itself (target is not a tab) | no selection or focus change; `fireEvent.keyDown` returns `true` (default not prevented) |

**Locked bar (page)**

| Row | Situation | Expected |
|---|---|---|
| L1 | S1 | root has no `upload-bar-locked`; the two `select`s as in Story 1.15; no `Låst`; no `<dl>` |
| L2 | S3 | root has `upload-bar upload-bar-locked`; no `combobox` in the upload section; a `<dl>` with the two pairs `Språk på resultatene`/`Norsk bokmål`, `Detaljnivå`/`Standard` |
| L3 | S4 | as L2 |
| L4 | S3, S4 | the padlock `svg` in `.upload-bar__lock` has `aria-hidden="true"` and `focusable="false"` |
| L5 | S3, S4 | the section's `aria-label` is exactly `Opplasting og innstillinger` |
| L6 | S3, S4 | the fixed-settings note is present with the exact text |
| L7 | S3, S4 | `Last opp` present and natively `disabled`; no file input |
| L8 | S3, S4 | `Vis eksempel` present, `aria-disabled="true"`, not natively disabled; clicking sends nothing |
| L9 | S5 Temporary (`generation_in_progress`) and S5 Reload-required (`invalid_request`) | the bar is unlocked again (L1 shape); `Vis eksempel` availability per the Story 1.15 groups |
| L10 | S3, S4 | no `Emnekode` and no file name in the bar |
| L11 | S1 → S3 → S4 | the root `div.upload-bar` is the same DOM node throughout |
| L12 | S3, S4 | computed focus order inside the bar contains only `Vis eksempel` |
| L13 | S3, S4 | the root's element children, in order: `p.upload-bar__lock`, `Last opp`, `dl.locked-settings`, `p.settings-note`, `Vis eksempel`; `.upload-bar__lock` `textContent` is exactly `Låst` |
| L14 | S3, S4 | the `<dl>`'s element children are exactly two `div`s, each with exactly one `dt` then one `dd`; the bar contains no `label` and no `select` |

**Focus (page)**

| Row | Situation | Expected |
|---|---|---|
| F1 | focus `Vis eksempel` in S1, click | in S3 the `Vis eksempel` element is the same node and is `document.activeElement` |
| F2 | reply arrives (S4) | the same node, still focused; `Resultatene er klare` announced once; nothing else announced |
| F3 | S3 → S5 (`generation_in_progress`) | the same `Vis eksempel` node; focus on the error headline (Story 1.15 behaviour unchanged) |
| F4 | S4, arrow keys and clicks in the tablist | `document.activeElement` is never `<body>` |
| F5 | after a successful startup `Prøv igjen` | focus moves to `Vis eksempel` (Story 1.15 row F1 unchanged) |
| F6 | page in `<StrictMode>` through S4 | one demo request; one tablist; all ids in the document unique |
| F7 | S5 Temporary → focus and click `Vis eksempel` → S3 | the same node before and after the lock, still `document.activeElement`; one new request |

**CSS (string checks on `globals.css`, in a new test file)**

| Row | Check |
|---|---|
| R1 | `.notice-info` uses `--color-notice-info-bg`, `--color-notice-info-fg`, a `--border-emphasis` left rule with `--color-notice-info-border`, and `--padding-notice` |
| R2 | `.upload-bar.upload-bar-locked` uses `--color-background` and `dashed` |
| R3 | `.result-tab` resets `border: 0`, sets a transparent `--border-emphasis` bottom border, `--font-ui-*`, `--color-text-muted`, `min-height: var(--control-min-height)` |
| R4 | `.result-tab:hover` sets only a `--color-hover-tint` background; `.result-tab[aria-selected="true"]` sets `--color-primary`, `var(--font-subheading-weight)` and a `--color-primary` bottom border colour |
| R5 | in the Story 1.16 section (from `.notice-info {` to the end of `globals.css`), no rule sets `display` on a selector containing `.result-panel`; `.result-panel` has a `--space-*` padding |
| R6 | `.result-tabs`, `.locked-settings` (and `.upload-bar`, unchanged) have `flex-wrap: wrap` |
| R7 | the Story 1.16 section (from `.notice-info {` to the end of `globals.css`) has no `width:` or `height:` declaration (only `min-`/`max-` forms), no raw colour and no `rgb()`/`hsl()`; `demo-css.test.ts:140–148` and `globals-css.test.ts` pass unchanged |
| R8 | `globals-css.test.ts` still finds 27 `--color-*` tokens and one `:focus-visible` rule |
| R9 | `.upload-bar__lock` uses `--font-caption-*` and `--color-text-muted`; `.locked-settings dt` uses `--font-caption-*` and `--color-text-muted`; `.locked-settings dd` uses `margin: 0`, `--font-settings-value-*`, `--color-text`, `min-height: var(--control-min-height)`; `.notice-info p` sets `margin: 0` |

</frozen-after-approval>

## Code Map

- `frontend/lib/skipped-pages.ts` (new) -- `skippedPagesText` -- D7.
- `frontend/lib/tabs.ts` (new) -- `nextTabIndex` -- D13.
- `frontend/components/ResultNotices.tsx` (new) -- Verification Notice + skipped-pages notice; props `{ skippedPages: readonly number[] }`; returns a Fragment; mode-independent -- D6, D7.
- `frontend/components/ResultTabs.tsx` (new) -- tablist, four panels, selection state, keyboard and pointer handlers; props `{ results: ValidatedResults; labelledBy: string }`; returns a Fragment; mode-independent -- D10–D13.
- `frontend/components/InfoIcon.tsx`, `LockIcon.tsx` (new, one icon each; paths from the mockup's info circle and padlock) -- D7, D8.
- `frontend/components/DemoOutcome.tsx` (modified) -- the `success` branch only (heading `id`, `ResultNotices`, `ResultTabs`; the inline Verification Notice moves into `ResultNotices`); the header comment's S4 line is updated -- D3.
- `frontend/components/DemoControls.tsx` (modified) -- locked variant in S3/S4 under the D9 structure rules. Two stale header-comment passages must be updated: (1) lines 13–14, "`Last opp` and the two settings are natively disabled in every demo state …", which is no longer true once the settings are a read-only `<dl>` in S3/S4 (the comment must say that `Last opp` is natively disabled in every demo state, the two settings are disabled `select`s in S1/S5 and a read-only `<dl>` in the locked S3/S4 bar); (2) line 19, "The bar keeps its S1 appearance in S3 and S4; the visual locked bar is Story 1.16 (D6a)" -- D4, D8, D9.
- `frontend/app/globals.css` (modified, a new Story 1.16 section appended at the end) -- D15, D16.
- `frontend/__tests__/demo-fixtures.ts` (new, test helper) -- copies, from `demo-start.test.tsx` at `056f66c` (which is not changed except by C2 and does not import this module):
  - **the fetch fake** (`demo-start.test.tsx:48–128`): request records, header and body delivery, abort/`AbortError` semantics; **response contracts kept as today:** `/api/status` answers through a `json()`-capable response (as `statusReply`, L623–625, and `status-fixtures.ts` `fakeResponse`), `/api/demo` through `text()`;
  - **per-test setup and cleanup** (`demo-start.test.tsx:132–144`), exported as an installer (e.g. `setupDemoTest()`) that each new test file calls once: `beforeEach` → `vi.useFakeTimers()`, `vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "")`, a new fetch fake; `afterEach` → `cleanup()`, `vi.useRealTimers()`, `vi.unstubAllEnvs()`, `vi.unstubAllGlobals()`, `vi.restoreAllMocks()`;
  - **one shared fake instance** per test: the installer stores the current fake in a module-level variable, read by all helpers through an accessor (e.g. `currentFake()`), so `renderHome`, `demoRequests` and `replyDemo` always use the fake of the running test;
  - **the helpers** `flush`, `advance` (fake-timer advance inside `act`), `region` (the status region), `watchRegion` and `count` (announcement recording), `statusReply`, `renderHome`, `demoRequests`, `replyDemo`, the section getters (`main`, `uploadSection`, `resultsSection`, `showExample`, `headline`), and the recorded fixture text read from `samples/demo-response.json`;
  - it may import `status-fixtures.ts` read-only.
- `frontend/__tests__/skipped-pages.test.ts` (new) -- N2, N4–N8.
- `frontend/__tests__/result-tabs.test.tsx` (new) -- the unit row T11 (`nextTabIndex`); the component rows N9 (`ResultNotices`) and T3, T4, T7–T9, T12, K1–K6, K9, K11–K13 (`ResultTabs`); and the page rows T1, T2, T5, T6, T10, K7, K8, K10, P1–P4.
- `frontend/__tests__/results-shell.test.tsx` (new) -- N1, N3, S1–S4, L1–L14, F1–F7.
- `frontend/__tests__/results-css.test.ts` (new) -- R1–R9.
- `frontend/__tests__/demo-start.test.tsx` (modified, **compatibility correction C2 only**).
- Read-only: everything under "Never".

## Compatibility correction C2 (`frontend/__tests__/demo-start.test.tsx`) [APPROVED-CP113, OQ6]

Line numbers are those of `main` at `056f66c`, read at Checkpoints 112 and 113 (not run).

**Test "click: one POST, focus kept, loading shown and announced, indicator, locked (B1, B3–B5, B14)" (L767–L803):**
- **Change:** L785 (comment "B14: the behavioural S3 lock." → names the locked bar); L787–L788 (the two `combobox` lookups); L790–L793 (the selects' `disabled`, `value` and options-length checks); L796–L800 (the comments, `fireEvent.change(language)` and its value and options checks). Replacement assertions: no `combobox` in the upload section; the root has `upload-bar-locked`; the `<dl>` has the two pairs; `.upload-bar__lock` text is `Låst`.
- **Stay unchanged:** L768–L784 (one POST, `aria-disabled`, focus identity at L775, loading text, indicator, guidance gone, announcement); L786 and L789 (`Last opp` natively disabled); L794–L795 (the banner stays); L801–L802 (one request; focus kept on `Vis eksempel`).

**Test "success: heading, notice, guidance gone, focus kept, announced, no repeat, no content (C1–C5)" (L805–L837):**
- **Change:** L814 (`getByRole("note")` would throw with two notes → the first `role="note"` in Resultater, e.g. `getAllByRole("note")[0]`); L828 (comment "C4: nothing of the response's content is rendered (Stories 1.16–1.20)." → no summary content; tabs from Story 1.16); L831 (`queryByRole("tablist")` is `null` → a tablist exists).
- **Stay unchanged:** L806–L813, L815–L826 (heading, the Verification Notice checks — still valid because D3 puts it first —, guidance gone, focus identity at L820, announcement, aria-disabled, no repeat); L829–L830 (no summary text); L832 (no `<a>`); L834–L836 (the banner and the fixed-settings note stay).
- The test names stay unchanged: "locked" and "no content" remain accurate.

**Regression guards that must pass unchanged (not edited):** L775, L802, L820; the E15/E16 test at L897–L909 (it passes through S5 → locked S3 → S5; L906 asserts the same `Vis eksempel` keeps focus, guarding D9); E7 at L839–L844; B12 at L846–L851; all A-, B-provider, C-provider, E-, F-, G-rows and the other tests in the file.

**Other files, confirmed unaffected:** `page.test.tsx`, `startup-check.test.tsx`, `globals-css.test.ts`, `demo-css.test.ts` (unchanged, but constraining the new CSS), `status*.test.ts`, `generation.test.ts`, `focus-target.test.ts`, `demo-request.test.ts`.

## Approval gates

- **G0:** this spec independently re-reviewed, approved by the developer and frozen; the spec commit on branch `story/1-16-results-shell-notices-and-accessible-tabs`. Until then, nothing is implemented.
- **G1 — code and tests:** the Code Map files and C2; `npm test`, `npm run build`, `npm run lint` and `tsc --noEmit` pass; the backend suite is unchanged and passes.
- **G2 — manual checks** (session log):
  - **M-1 keyboard:** Tab to the tablist (one stop); Left/Right with wrapping, Home/End; Enter and Space on a tab; Alt+Left still navigates browser history (not swallowed); Tab moves to the visible panel; focus stays on `Vis eksempel` through S3 and S4.
  - **M-2 locked bar:** with network throttling, the S3 bar is already locked (dashed, `Låst` on its own line, `Last opp` disabled, `<dl>`, note); S4 the same; after a forced network failure (backend stopped) the bar is unlocked again.
  - **M-3 reflow (G-4):** 320 CSS px and 200% zoom: the tab list, locked bar and notices wrap; no horizontal scroll.
  - **M-4 visual:** tab hover tint; the selected indicator kept on hover; the focus ring visible on tabs and on the empty panel; mouse click on a tab in a browser that does not focus buttons on click still leaves focus on the tab.
- **G3 — commit:** approval of the exact staged file list.
- **Wording gate:** none further; the only new string, `Låst`, was approved at Checkpoint 111.

## Tasks & Acceptance

**Execution** (after G0):
- [ ] `skipped-pages.ts`, `tabs.ts` with their unit tests -- D7, D13.
- [ ] Icons, `ResultNotices`, `ResultTabs`, `DemoOutcome` success branch -- D3, D6–D13.
- [ ] `DemoControls` locked variant under D9 -- D4, D8, D9.
- [ ] `globals.css` section with `results-css.test.ts` -- D15, D16.
- [ ] `demo-fixtures.ts`, the page and component tests; C2 -- the matrix.
- [ ] Manual checks M-1 to M-4 (G2).

**Acceptance Criteria:**
- Given the frontend, when `npm test`, `npm run build` and `npm run lint` run, then all pass with no new dependency: the existing tests (reference value 362, GitHub CI run 44025055823 on 2026-11-17; not re-run for this draft), of which only the two C2 tests change, plus the new ones.
- Given the backend, when `uv run pytest -q` runs, then it is unchanged (reference value 1,132, same run).
- Given the implementation commit, when its changed paths are listed, then they are exactly the Code Map files and C2; the spec freeze, session log, `issues.md` and `sprint-status.yaml` changes are separate commits.
- Given every row of the I/O & Edge-Case Matrix, then a named test or manual check covers it.

## Dependencies & deferred work

- **Depends on:** Story 1.15 (done, `92e2a9c`): `DemoProvider` state with the validated response, `DemoOutcome`, `DemoControls`, `WarningIcon`, the existing CSS and tests; Story 1.13 (`samples/demo-response.json`, `isGenerationResponse`).
- **Provides for:** Story 1.17 (the Sammendrag panel slot; the page-link component goes inside it), Stories 1.18–1.20 (the three panel slots; panels stay mounted, so card position and revealed answers can survive tab switches), Story 1.21 (the heading row with `Tilbake til start`; tab selection resets on remount), Story 2.6 (`ResultNotices` and `ResultTabs` reused in real mode with the visible `h2` `Resultater` per D1; the real locked bar adds the file name to the `<dl>`).
- **Closes at closeout, if verified:** `issues.md:72` (the demo S3 visual locked bar).
- **Updates at closeout:** `issues.md:25` (G-4) with the M-3 result.
- **Not affected:** `issues.md:70` (stuck `loading`; D17), `:71` (CF-2), `:73` (accessibility spot checks; a tab-pattern screen-reader check could be added at closeout if the developer agrees), `:23` (G-2 real-mode part).

## Open questions

None. OQ1–OQ7 were decided by the developer at Checkpoint 113 and are recorded in "Decisions".

## Assumptions

- `POST /api/demo` returns exactly `samples/demo-response.json` (`skipped_pages: [4]`, 5 flashcards, 5 quiz items, 5 key concepts) as merged in Stories 1.13–1.15.
- `skipped_pages` is strictly increasing and positive on both sides (AD-11; `generation.ts:11`; `backend/app/contracts/results.py` `_check_pages`).
- React keeps a child's DOM node when the parent element keeps its type and position and the child keeps its type and position (or key) among its siblings; D9 is written so that this holds without relying on a key.

## Independent-review checklist

- [ ] Every Story 1.16 AC maps to matrix rows; nothing in the AC is missing.
- [ ] Every visible string is in "Strings" and matches EXPERIENCE.md exactly; `Låst` is the only new string and has no surrounding whitespace.
- [ ] D-1, D-2, D-5 and the S3 ownership, and OQ1–OQ7, are applied as approved and not widened.
- [ ] The APG pattern is complete (roles, ids, `aria-controls`, `aria-labelledby`, roving tabindex, automatic activation, wrapping, Home/End, modifier keys ignored, click focuses, one Tab stop, mounted `hidden` panels).
- [ ] Focus is never lost to `<body>`; D9 guarantees the same `Vis eksempel` node across S1/S3/S4/S5.
- [ ] No route, navigation, `<Activity>`, provider change or backend change; the stuck-`loading` limitation is untouched.
- [ ] No content of Stories 1.17–1.20 leaks in; no `Tilbake til start`.
- [ ] The CSS stays within `globals-css.test.ts` and `demo-css.test.ts` (no `width:`/`height:`); `hidden` panels stay hidden.
- [ ] C2 is limited to the named lines; the regression guards are untouched.
- [ ] Real mode, S0, S0x and S5 are unchanged.
- [ ] No unresolved marker remains inside the block to be frozen.

## Approval and freeze boundary

- **G0 done:** the developer approved revision 3a at Checkpoint 118 on 2026-11-17, including D3–D17 [FOR-G0], the "Låst" own-line layout and the binding C2 scope. Revisions 1–3a before approval are recorded in the Spec Change Log. Implementation was authorized afterwards (Checkpoint 120 onwards); PR #40 was merged as `a18813bcd1452108af800e2d1f94eac5a1c04f88`. `status` is now `done`: the story is administratively closed with two accepted manual-verification exceptions — M-2 and M-4 remain NOT TESTED manually and the G2 gate was not fully completed (see the Review Triage Log and Verification).
- The sections from "Intent" to the end of "I/O & Edge-Case Matrix" (including "Strings", "Requirements traceability", "Decisions" and "Conflicts and source findings") are wrapped in `<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">…</frozen-after-approval>`, preceded by the `<!-- APPROVED … -->` comment. Only the developer can change the frozen block.
- Code Map, C2, gates, Tasks, Dependencies, Open questions, Assumptions, the checklist, Implementation Notes, Spec Change Log, Review Triage Log and Verification stay outside the frozen block.

## Implementation Notes

- **2026-11-17 — implementation commit `626f7654c1847c04be14f036633a422fef44eda0`** (`feat(story-1.16): implement results shell, notices and accessible tabs`): exactly the 15 Code Map files (4 modified, 11 new), built in five stages A–E, each independently reviewed (all PASS), plus a whole-story review (PASS, Checkpoint 127). C2 was applied within the OQ6 scope (C2a in Stage C, C2b in Stage D). Session log: [975-2026-11-17-21-38-22-story-1-16-results-shell.md](../../.logs/amma-kwaasi-eide/975-2026-11-17-21-38-22-story-1-16-results-shell.md).
- **`focusOrder` test helper:** kept as a local copy in `result-tabs.test.tsx` and `results-shell.test.tsx` rather than added to `demo-fixtures.ts`, because the Code Map lists that module's helpers explicitly.
- **Test hardening after the whole-story review (Checkpoint 128):** the class names `result-tabs`, `result-tab` and `result-panel` and the absence of `aria-orientation` are asserted on the rendered page; the K10 status-region watcher stops in `try/finally`.

## Spec Change Log

- **2026-11-17 — revision 1 (draft, Checkpoint 111):** first draft from Story 1.16 (`epics.md:860–888`), UX-DR-2, -5, -10, -11, -13, -19, -21, -22, -35, -36, -38, AR-21, AR-25, FR-5, FR-6, `EXPERIENCE.md`, `DESIGN.md`, the mockup, `ARCHITECTURE-SPINE.md` (notices convention, AD-11, AD-13), the Story 1.15 spec and code, and `issues.md` items 25, 70–73; applying the developer's Checkpoint 111 decisions (D-1, D-2, D-5, S3 ownership). Six findings (CF-A to CF-F), seven open questions, one compatibility correction (C2). Not reviewed, not approved.
- **2026-11-17 — revision 2 (draft, Checkpoint 113):** applies the Checkpoint 112 review (M-1 to M-7, L-1 to L-11) and the developer's Checkpoint 113 decisions (OQ1–OQ7, CF-A, CF-B, `demo-fixtures.ts`, the Story 1.15 supersession):
  - M-1: modifier keys ignored and not prevented (D13; K6 extended); M-2: click selects and focuses (D13; K11); M-3: C2 rewritten with exact lines and regression guards; M-4: `demo-fixtures.ts` in the Code Map; M-5: D9 rewritten as a structural rule (one tree, stable root, conditional slots, `Vis eksempel` last and unconditional; F7 added); M-6: all OQ references and [PROPOSED] tags removed from the block to be frozen, tags now [APPROVED-CP113] or [FOR-G0]; M-7: `width:`/`height:` ban stated (Boundaries, D15, R7);
  - L-1: citations `epics.md:216`, `EXPERIENCE.md:135`; L-2: `DemoProvider.tsx` only under "Never"; L-3: superseded Story 1.15 D3, D6a, B14, C4 named; L-4: `Last opp` in the Approach; L-5: `Låst` without whitespace; L-6: CSS details (border reset, `.notice-info p`, `dl`/`dd` margins, panel padding); L-7: matrix count corrected (70 rows after additions) and page rows separated; L-8: index from the event target, no `ref.current` in render; L-9: commit-scope wording; L-10: stale comments L785, L828 and the two `DemoControls`/`DemoOutcome` header comments named; L-11: `skippedPagesText` input contract;
  - new rows: K11, F7, L13, L14, R9; reworded: P4, R5, R7, K6–K9, T3, T4 (component level), N9, S1 (Fragment structure stated in D3).
  Not yet re-reviewed, not approved.
- **2026-11-17 — revision 3 (draft, Checkpoint 115, editorial):** applies the Checkpoint 114 findings F-1 to F-9 and two nits: F-1 Story 1.15 D8 (in part) added to the supersession (Decisions, CF-C); F-2 the binding C2 scope restated inside the block to be frozen (OQ6 bullet), the line-level C2 section kept as explanation; F-3 the stale `DemoControls.tsx:13–14` comment named in the Code Map; F-4 rows K12 (Shift+ArrowRight) and K13 (keydown on the tablist itself) added, D13 states "default not prevented" for non-tab targets; F-5 D9 forbids a state-dependent `key` on the bar root and any ancestor of `Vis eksempel`; F-6 the `demo-fixtures.ts` entry extended (setup/cleanup installer, fake timers, base-URL stub, unstubbing, shared fake accessor, the `advance`/`region`/`watchRegion`/`count` helpers, the `json()`/`text()` contracts); F-7 the Story 1.16 CSS section anchored at `.notice-info {` (Boundaries, D15, R5, R7); F-8 K8 marked "page"; F-9 D9 cites the guard tests by name at `056f66c`; nits: the `globals-css.test.ts:241` citation narrowed to `height:`, `review_loop_iteration: 2`. The `Låst` own-line layout (D15) is marked as an author choice for G0. Matrix: 72 rows. Not approved.
- **2026-11-17 — revision 3a (draft, Checkpoint 117, editorial):** applies the Checkpoint 116 findings R-1 to R-3: R-1 the binding C2 scope (OQ6 bullet) also permits the two explanatory comment lines above `fireEvent.change` (baseline L796–L797), matching the C2 detail section; R-2 D15 tagged "[FOR-G0 rules; BINDING tokens]" and the `Låst` own-line layout described as a proposed [FOR-G0] decision that becomes binding only through G0 approval; R-3 the Code Map labels T11 as a unit row and N9 as a component row (assignments unchanged). Matrix unchanged (72 rows). Not approved.
- **2026-11-17 — Checkpoint 118: APPROVED by the developer (G0)** (revision 3a) and frozen: status `draft` → `ready-for-dev`; the APPROVED comment and the `frozen-after-approval` markers added around "Intent" … "I/O & Edge-Case Matrix"; the draft header comment replaced; the tag legend and this "Approval and freeze boundary" section updated. No normative text inside the block was changed.

## Review Triage Log

- **2026-11-17 — Checkpoint 112, independent adversarial review of revision 1:** PASS WITH CHANGES; no Critical findings; 7 Major (M-1 to M-7), 11 Minor (L-1 to L-11); all strings verified character for character against EXPERIENCE.md; story boundaries confirmed; C2 line list corrected; tests verified by reading only.
- **2026-11-17 — Checkpoint 113, developer decisions:** OQ1–OQ7, CF-A, CF-B, the shared test helper and the Story 1.15 supersession approved; all review findings accepted and applied in revision 2. This approval covers the spec revision only, not G0 or implementation.
- **2026-11-17 — Checkpoint 114, independent verification of revision 2:** PASS WITH CHANGES; M-1 to M-7 and L-1 to L-11 confirmed resolved; no Critical or Major findings; 9 new Minor findings (F-1 to F-9) and 2 nits; strings, fixture facts and story boundaries confirmed; 70 rows counted; C2 confirmed narrowly scoped with no other affected test; recommended an editorial revision 3 with a diff-only check before G0.
- **2026-11-17 — Checkpoint 115:** the developer authorized editorial revision 3 only (F-1 to F-9, two nits); applied. G0, the freeze and implementation are not authorized.
- **2026-11-17 — Checkpoint 116, independent verification of revision 3 (no historical diff available; checked against the Checkpoint 114 findings and the sources):** PASS WITH CHANGES; F-1 to F-9 and both nits confirmed; 72 rows confirmed; one Minor finding (R-1, C2 comment scope) and nits R-2 to R-4.
- **2026-11-17 — Checkpoint 117:** R-1, R-2 and R-3 applied (revision 3a); R-4 (row order in the notices tables) left as cosmetic. G0, the freeze and implementation are not authorized.
- **2026-11-17 — Closeout: Story 1.16 done, with two accepted manual-verification exceptions.**
  - **Merge:** PR #40 merged as `a18813bcd1452108af800e2d1f94eac5a1c04f88` (approved head `2217c00e730b64e1d60589ec03812a437d1e26ed`; parents `056f66c` and `2217c00`).
  - **CI:** GitHub Actions run 44172204593 on `2217c00e730b64e1d60589ec03812a437d1e26ed`: Backend (pytest, 1,132 passed) and Frontend (Vitest, 465 passed), both successful.
  - **Reviews:** the independent reviews of Stages A–E and of the whole story (Checkpoint 127) all passed.
  - **Exceptions:** M-2 (S5 unlocking with the backend actually unavailable) and M-4 (click focus in Safari or Firefox on macOS) remain **NOT TESTED manually** (automated rows L9 and K11 only). The developer explicitly accepted both as tracked exceptions for the merge (Checkpoint 133). The **G2 manual gate was not fully completed**; the outstanding checks are tracked in `.logs/amma-kwaasi-eide/issues.md`.
  - **Meaning of `done`:** the implementation is merged and the story is administratively closed with these accepted exceptions; it does **not** mean that all manual checks passed.
  - **What changed:** the status changed from `ready-for-dev` to `done`; the frozen block remains unchanged.

## Verification

- **G1 (Checkpoint 128, on the code committed as `626f765`):** frontend 465 tests passed in 15 files (103 new for Story 1.16; all 72 matrix rows mapped to tests); `tsc --noEmit` pass; ESLint pass; `next build` pass; backend 1,132 tests passed (unchanged).
- **G2 (Checkpoint 128), partly complete:** 22 scripted checks passed in Chrome 156 (headless; trusted keyboard and mouse input, throttling, viewport emulation) covering M-1, M-2 (S3 and S4), M-3 (320 CSS px and a 200% zoom emulation) and M-4 (hover, selected underline, focus rings, click focus in Chrome); the developer reported real browser zoom as readable.
- **Deferred, NOT TESTED (accepted by the developer for the implementation commit only):** M-2 S5 unlocking with the backend actually unavailable (automated row L9 only); M-4 click focus in Safari or Firefox on macOS (automated row K11 only). The G2 gate is not complete; tracked in `.logs/amma-kwaasi-eide/issues.md`.
- **G3:** the implementation commit contains exactly the 15 approved files.
