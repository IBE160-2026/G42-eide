# Accessibility Review — AI Study Buddy UX spines

Reviewed: `DESIGN.md`, `EXPERIENCE.md`, `.memlog.md` (decision authority; later entries override earlier ones), with `.working/direction-refined-rolig.html` as a draft reference only. Benchmarks: WCAG 2.2 Level AA, used as a design and testing **target**, and the WAI-ARIA Authoring Practices Guide (APG). Reviewed 2026-11-08.

## Overall verdict

The spines are above average for a student project. Keyboard rules, dialog behaviour, focus destinations, reduced motion and a verified colour palette are all written down. Still, a developer who follows the spec exactly would ship real keyboard and screen-reader bugs. The biggest is that several **focused** buttons become `disabled`: Generer, Vis eksempel, Neste/Forrige at the ends and Prøv igjen. When that happens the browser drops focus to `<body>`, which breaks the promise that results are "the next `Tab`" away. The live-region, tabs-pattern and reveal-order rules are also too thin to build correctly without guessing, and the mockup already shows the wrong patterns. One more gap: the 200% zoom rule is weaker than WCAG 2.2 AA Reflow, which requires 320 CSS px.

Counts: **Critical 1 · High 5 · Medium 8 · Low 9**

---

## Critical

### C-1 Focused controls become `disabled`, so focus drops to `<body>`
- **Finding:** When a focused native `<button disabled>` is disabled, it loses focus. `document.activeElement` becomes `<body>` and the screen reader's position resets or becomes unclear. This happens on the main path:
  - **Generer** (focused, because the user just pressed it) becomes disabled in S3 and stays disabled in S4 ("everything locked", "Generer shown disabled"). When `Resultatene er klare` is announced, focus is on `<body>`, not in the upload bar. What the next `Tab` does then depends on the browser. Chrome sometimes resumes from where the removed focus was. Firefox, NVDA browse mode and Narrator scan mode can restart from the top of the page. So the spec's promise that results are "reached with the next `Tab`" (Component Patterns → Results arrival; AF-1; Key Flow 1 step 6) is **not reliable**.
  - **Vis eksempel** (demo): the same problem in demo S3/S4.
  - **Neste** on the second-to-last card: pressing it shows the last card and disables Neste while it has focus. **Forrige** does the same on the first card. A keyboard user stepping through flashcards loses focus once every deck.
  - **Prøv igjen** (S0x): pressing it goes to S0, where "all controls disabled", so the button is disabled or removed while it has focus.
- **WCAG:** 2.4.3 Focus Order, 2.4.7 Focus Visible, 2.1.1 Keyboard (practical effect); APG "Keyboard focus is not lost".
- **Location:** EXPERIENCE.md → Component Patterns (Upload bar, Generer, Vis eksempel, Flashcard, Prøv igjen, Results arrival); State Patterns S0/S3/S4; Interaction Primitives → Focus management.
- **Fix (concrete, no library needed):** Add one rule to Interaction Primitives:
  > "A control that may be disabled **while it has focus** uses `aria-disabled="true"` instead of the `disabled` attribute. It stays focusable, gets the disabled styling, and its click/keydown handler does nothing while `aria-disabled` is true."

  Apply the rule to **Generer, Vis eksempel, Forrige, Neste and Prøv igjen**. Other controls (Last opp, selects, course code) are never focused at the moment they lock, so native `disabled` is fine for them. Result: focus stays on Generer during S3 (the screen reader reads "Generer, unavailable"). When results arrive, focus has not moved, which matches the approved rule. The next `Tab` reliably goes to the first focusable element in the results area (Ny fil). This makes the "results easy to reach by keyboard" claim true in every browser.
  - Style with `[aria-disabled="true"]` as well as `:disabled`, so both look like `button-primary-disabled`.
  - Also guard the *form submit* if Generer lives in a `<form>` (`aria-disabled` does not block submit). The simplest option is to use `type="button"` and no form.
  - For Neste/Forrige there is an acceptable alternative: keep native `disabled` but move focus to the other button first (e.g. Neste → disabled ⇒ focus Forrige). `aria-disabled` is simpler and keeps the user's place.
  - Add to T-1: "after every action, run `document.activeElement` in the DevTools console; it must never be `<body>`."

---

## High

### H-1 Live regions are not specified well enough to work, and the error rule causes double announcements
- **Finding:**
  1. AF-6 says *what* to announce but not *how*. Live regions only work reliably when the region is **already in the DOM, empty, before** the text changes. The mockup shows the opposite pattern: `role="status"` on the loading block and `role="alert"` on the error block, both inserted with the state. NVDA, JAWS and Narrator handle inserted regions inconsistently.
  2. For errors, AF-6 says "error headline immediately" *and* "focus moves to the headline". With `role="alert"` (as in the mockup) or an assertive region, plus the focus move, screen readers read the headline **twice**, or the second read cuts off the first.
  3. Repeated identical text is not announced again. A second generation (Ny fil → … → `Resultatene er klare` again) or a second `Prøv igjen` failure may be silent unless the region is cleared first.
  4. The politeness level (polite or assertive) is not stated for any message.
- **WCAG:** 4.1.3 Status Messages; 1.3.1.
- **Location:** EXPERIENCE.md AF-6; Component Patterns → Loading indicator, Error state, Results arrival; State Patterns S3/S4/S5.
- **Fix:** Add a "Live region" paragraph:
  - Render **one** visually hidden `<div role="status" aria-live="polite" aria-atomic="true" id="announcer">` in the page layout from first render (S0). The visible loading block is *not* a live region.
  - S3: set the text to `Lager studiemateriell …` (demo: `Henter eksempel …`). S4: set it to `Resultatene er klare`. Use **polite** for both.
  - S5: **do not** announce through the live region and **do not** use `role="alert"`. Clear the announcer, then move focus to the error headline (`<h2 tabindex="-1">`). The focus move is the announcement. If the action text should be read too, add `aria-describedby="<action-text-id>"` on the headline.
  - Before every new message, clear the text (`''`), then set it in the next tick (`setTimeout(…, 50)` or `requestAnimationFrame`), so repeated text is announced again.
  - Assertive is not needed anywhere in this app.

### H-2 The ARIA tabs pattern is incomplete in the spec and wrong in the mockup
- **Finding:** AF-3 covers arrows, Home/End, automatic activation and selected state. It leaves out the parts that make tabs work with a screen reader and keyboard:
  - `aria-controls` on each tab and `aria-labelledby` on each panel. The mockup has no ids at all.
  - **Roving tabindex:** the selected tab has `tabindex="0"` and the others `tabindex="-1"`. Without it, `Tab` stops on all four tabs, which contradicts the APG pattern and AF-1's "one Tab stop".
  - **`tabindex="0"` on the tab panel** when the panel has no focusable content. Sammendrag is the default panel and may have **no page links** (optional per AD-10). Then `Tab` from the tab list jumps past the summary text, and keyboard and screen-reader users cannot get to the content they most need.
  - **Inactive panels must stay mounted** (`hidden` attribute) rather than being unmounted. Otherwise remembered card position and revealed answers depend on lifted state, and `aria-controls` points at missing ids.
  - A name for the tab list (`aria-label="Resultater"` or `aria-labelledby` a heading).
  - The mockup puts `role="tabpanel"` **on the quiz `<ol>`**. This removes the list semantics ("list, 6 items") the quiz relies on.
- **WCAG:** 4.1.2 Name, Role, Value; 1.3.1 Info and Relationships; 2.1.1 Keyboard; 2.4.3.
- **Location:** EXPERIENCE.md AF-3 and Component Patterns → Result tabs; mockup frames 1, 2, 5.
- **Fix:** Expand AF-3 to a checklist:
  > `div role="tablist" aria-label="Resultater"` → `button role="tab" id="tab-x" aria-selected aria-controls="panel-x" tabindex={selected?0:-1}` → `div role="tabpanel" id="panel-x" aria-labelledby="tab-x" tabindex="0" hidden={!selected}`; arrows wrap around (last→first); focus moves to the newly selected tab; the quiz `<ol>` sits **inside** the tabpanel, never carrying the role itself.

  Add one line to DESIGN.md: the tab panel gets the standard focus ring when focused.

### H-3 Revealed answers appear *before* the reveal button in reading order
- **Finding:** DESIGN.md places the flashcard answer inside the card (below the term), with `Forrige / Vis svar / Neste` **below** the card. In the quiz, the revealed answer sits above the row with the reveal button and page links. After pressing `Vis svar`, a screen-reader user is on the button, and the new answer is **behind** them in reading order. Reading forward goes to Neste or the next question. The answer is easy to miss, and that undermines the "practise" goal. `aria-controls` does not fix this: only JAWS exposes it, weakly.
- **WCAG:** 1.3.2 Meaningful Sequence; 2.4.3 Focus Order (related).
- **Location:** DESIGN.md → Components → Flashcard, Quiz item; EXPERIENCE.md → Flashcard, Quiz item.
- **Fix (pick one and record it):**
  - **(a) Recommended:** in DOM order, put the reveal button **directly before** the answer container. Flashcard: counter → term → `Vis svar` → answer (+ page links) → Forrige/Neste. Quiz: question → `Vis svar` → answer → page links. The visual layout can match, because the button sits between the term and the divider.
  - **(b)** If the visual layout must stay, the answer container needs `tabindex="-1"`, and focus stays on the button. Document that screen-reader users read the answer with Shift+↓. This is weaker; test it in T-3.

  Either way, the answer container is `hidden` when collapsed (not just visually hidden), has an `id` referenced by the button's `aria-controls`, and the button carries `aria-expanded`.

### H-4 Flashcard navigation changes content silently
- **Finding:** On `Neste`/`Forrige`, focus stays on the button while the counter and term change. Nothing is announced, so a screen-reader user hears nothing and does not know which card is shown. AF-7 only says "`Kort N av M` readable".
- **WCAG:** 4.1.3 Status Messages; 1.3.1.
- **Location:** EXPERIENCE.md AF-7, Component Patterns → Flashcard.
- **Fix:** Make the visible counter a small polite live region: `<p aria-live="polite" aria-atomic="true">Kort 4 av 8</p>`. It must be present from the start of the Flashkort panel, not inserted. Leave the term out of the region (it would be long and noisy). The user hears "Kort 4 av 8", and the term is the next thing in reading order. If the user is on Neste and the card's answer is collapsed, nothing else changes. Combine this with C-1 so focus stays on the (now `aria-disabled`) Neste on the last card.

### H-5 The reflow target is set at 200% zoom, but WCAG 2.2 AA requires 320 CSS px
- **Finding:** AF-11 requires "usable at 200% zoom, no horizontal scrolling". WCAG 1.4.10 Reflow (AA) requires content to reflow at **320 CSS px** width. That is **400% zoom** on a 1280 px laptop. 200% (≈ 640 CSS px) satisfies 1.4.4 Resize Text but not 1.4.10. At 320 px, likely failures are: the four tabs in one row (`Nøkkelbegreper` is long), the flashcard term at 28 px with long words, the inline page-link row, the not-saved note on the same row as Ny fil, and the demo heading on the same row as Tilbake til start. "Laptop only" does not exempt the app, because zoom is a laptop feature.
- **WCAG:** 1.4.10 Reflow; 1.4.4 Resize Text.
- **Location:** EXPERIENCE.md AF-11, Responsive & Platform; DESIGN.md Layout & Spacing.
- **Fix:** Change AF-11 to: "Usable at 200% zoom (1.4.4) and reflows without horizontal scrolling at 320 CSS px / 400% zoom (1.4.10)." Add these layout rules:
  - The tab list uses `flex-wrap: wrap`. Do not scroll it horizontally.
  - Rows (Ny fil + note, demo heading + button, page links, flashcard buttons) use `flex-wrap: wrap`.
  - Long words break with `overflow-wrap: anywhere` on the term and answers.
  - Add a 320 px check to T-1 (DevTools device toolbar at 320 px width, or Ctrl + + to 400%).

---

## Medium

### M-1 File-choice feedback and pre-check errors are not tied to the control or announced
- **Finding:** After the file chooser closes, focus returns to Last opp, but nothing announces that a file was chosen (the chip appears silently). Pre-check failures (`Bare PDF- og TXT-filer støttes.` / `Filen er større enn 10 MB…`) are "inline messages" with no association and no announcement. The problem chip is marked only by **✕ icon + colour**, with no text. S5 file errors appear in the results area, away from the file control.
- **WCAG:** 3.3.1 Error Identification; 4.1.3; 1.3.1; 1.4.1 (the chip uses colour and an icon only).
- **Location:** EXPERIENCE.md → Browser pre-check, File chip, S2, S5 Invalid-file / Too-big / Too-little groups.
- **Fix:**
  - Make Last opp a real `<button>` that calls `inputRef.current.click()` on a visually hidden `<input type="file" accept=".pdf,.txt,application/pdf,text/plain">`. Alternatively use a `<label>` styled as a button. Either way, keep the native input in the DOM.
  - Then set the shared announcer (H-1) to `Valgt fil: {navn}, {størrelse}`. If the pre-check fails, put the pre-check message in the announcer instead.
  - Give the inline message an id. Point to it with `aria-describedby` on Last opp, and also on Generer while Generer is disabled because of the file.
  - Add visually hidden text to the problem chip, e.g. `<span class="sr-only">Problem med filen:</span>`. Give the ✕ icon `aria-hidden="true"`.
  - For S5 file-group errors, also add `aria-describedby` from Last opp to the error action text. The user then hears the reason when tabbing back to fix it.

### M-2 `lang="en"` scope would mispronounce Norwegian interface text inside results
- **Finding:** AF-5 says to mark English content `lang="en"`. The easy way to do that is to put `lang="en"` on the whole panel or results area. But the panels contain Norwegian interface text: `PDF-side N ↗`, `Vis svar/Skjul svar`, `Kort N av M`, `Forrige/Neste`, the tab names and the Verification Notice. Inside a `lang="en"` region, a screen reader reads them with an English voice ("pee-dee-eff side"). The reverse case also exists: `lang="en"` must not leak into the not-saved note or notices.
- **WCAG:** 3.1.2 Language of Parts.
- **Location:** EXPERIENCE.md AF-5, State Patterns S4 ("English results marked `lang="en"`").
- **Fix:** Add a rule: "Put `lang={outputLanguage}` (`en` or `nb`) on the **elements that hold generated text**: summary paragraphs, concept term + explanation, card term, card answer, quiz question, quiz answer. Never put it on a panel, card or row that also contains interface controls or page links." Store `output_language` from the success envelope (not the current select value) so the attribute is right even after settings reset. Add to T-3: "English results are read with an English voice; Vis svar / PDF-side are read in Norwegian."

### M-3 Page links: target size and how to build the accessible name
- **Finding:** Page links use `{typography.small}` (15 px × 1.35 ≈ 20 px tall) and sit inline with `·` separators, often on the same row as `Vis svar`. They are not inside a sentence, so the inline exception in 2.5.8 does not apply. They are below 24 px and AF-12 says "nothing interactive is smaller than 24×24". The `↗` glyph is read as "north east arrow". AF-7 gives the name `PDF-side N, åpnes i ny fane` but not how to build it. An `aria-label` that drops the visible text, or that comes before it, could break 2.5.3.
- **WCAG:** 2.5.8 Target Size (Minimum); 2.5.3 Label in Name; 2.4.4 Link Purpose; 3.2.5 (AAA, advisory: new-window warning).
- **Location:** DESIGN.md → Components → Page link; EXPERIENCE.md → Page link, AF-7, AF-12.
- **Fix:**
  - Use `display:inline-flex; align-items:center; min-height:24px; padding:2px 4px` (or `{spacing.1}`) and at least 8 px gap between links and from adjacent buttons.
  - Markup: `<a href={blobUrl + '#page=' + n} target="_blank" rel="noopener">PDF-side {n}<span aria-hidden="true"> ↗</span><span class="sr-only">, åpnes i ny fane</span></a>`. This avoids `aria-label` and keeps the visible text first (2.5.3).
  - The blob/object URL is fine for accessibility. Create it once per results session, revoke it on Fortsett, and keep the `#page=` fallback note. The new PDF tab's accessibility depends on the PDF itself, which is outside the app's control; mention it in the test notes.
  - The separator `·` gets `aria-hidden="true"`.

### M-4 Ny fil dialog: build details missing, and the card is visually invisible against the page
- **Finding:** AF-4 is correct in intent but does not say which element to use or what labels the dialog. The dialog has no heading, only the question text. DESIGN.md gives the dialog `surface` (#FFFDF7) with **no shadow, no border and no backdrop decided** (DESIGN Open Q3). Surface against background is **1.04:1**, so the dialog's edge is practically invisible, especially for low-vision users at zoom.
- **WCAG:** 4.1.2; 2.4.3; 1.4.11 Non-text Contrast (boundary needed to identify the dialog); 1.3.1.
- **Location:** EXPERIENCE.md → Ny fil dialog, AF-4; DESIGN.md → Components → Ny fil dialog, Open Questions 3.
- **Fix:**
  - Use the **native `<dialog>` element with `showModal()`**. It gives `role="dialog"`, modality, an inert background (a real focus trap without custom code), the `Esc` `cancel` event and `::backdrop` for free in Chrome, Edge and Firefox. That is ideal for a beginner without a component library.
  - Add `aria-labelledby` pointing at the question `<p id="nyfil-text">`, put `autofocus` on Avbryt, and handle the `cancel` event as Avbryt.
  - After close, call `nyFilRef.current.focus()` explicitly; don't rely on the browser restoring focus. For Fortsett, focus Last opp *after* S1 has rendered (in a `useEffect` keyed to the state change).
  - Close the visual question with a `1px solid {colors.border}` dialog border (3.68:1 on background) and a backdrop such as `::backdrop { background: rgb(42 40 35 / .45) }`.

### M-5 Heading structure is not defined (AF-8 says only "logical")
- **Finding:** Only the error headline (h2) and the demo results heading are specified. Real-mode S4 has **no results heading**, so screen-reader users cannot press H to jump to results, and that is the easiest route there besides Tab. The brand is a `<span>` in the mockup, quiz questions are "headings" with no level, and flashcard terms have no stated role.
- **WCAG:** 1.3.1; 2.4.6 Headings and Labels; 2.4.1 Bypass Blocks (headings and landmarks are the practical bypass).
- **Location:** EXPERIENCE.md AF-8; DESIGN.md Typography (h2 role).
- **Fix:** Record the outline:
  - `h1` AI Study Buddy (in `<header>`).
  - `h2` `Resultater`: visible or `sr-only` in real S4; in demo, the demo heading is the h2.
  - `h2` error headline (S5/S0x).
  - The selected panel has no extra heading (the tab names it).
  - `h3` for each quiz question inside `ol > li`.
  - The flashcard term is a `p`, or `h3` if it reads better.

  Landmarks: `<header>`, `<main>`, and `<section aria-labelledby>` for the upload bar and the results.

### M-6 The locked upload bar loses its semantics
- **Finding:** DESIGN.md says the locked variant shows "settings shown as plain read-only values (no input chrome)". When the selects are replaced with text, the label–value link (`<label for>`) disappears, unless it is rebuilt. The mockup uses `<span class="label">` plus `<span class="value">` with a decorative `▾`. That is not a field and not a description list. The lock state is shown by a lock icon and dashed border only, and the mockup signals it by changing the section's `aria-label` to "(låst)". Changes to a region's name are not announced.
- **WCAG:** 1.3.1; 4.1.2; 1.4.1 (lock state shown by icon and border style only).
- **Location:** DESIGN.md → Upload bar, File chip; EXPERIENCE.md → Upload bar.
- **Fix:**
  - Locked: render the settings as `<dl>` with `<dt>Språk på resultatene</dt><dd>Norsk bokmål</dd>`, and so on. Give the lock icon `aria-hidden` plus a short visible or sr-only text, e.g. `Låst` next to the file name.
  - Keep the region's `aria-label` (or heading) fixed.
  - Unlocked: use real `<label for>` on `<select>` and `<input>`, never span labels.
  - The course-code input: `maxlength="100"`, `autocomplete="off"`.

### M-7 Fixed `height` tokens will clip text under text-spacing overrides and at zoom
- **Finding:** DESIGN.md front matter uses `height: '{spacing.control-min-height}'` on buttons, the file chip, settings fields and tabs, while the prose says "min 44px". A fixed height clips labels when users increase line-height or letter-spacing, or when the file name and meta wrap at zoom.
- **WCAG:** 1.4.12 Text Spacing; 1.4.10.
- **Location:** DESIGN.md components `file-chip`, `settings-field`, `button-*`, `result-tab`.
- **Fix:** Rename these to `minHeight` and implement them as CSS `min-height`, with padding for vertical rhythm. Avoid `overflow:hidden` on text containers, except the file name's ellipsis, which should fall back to wrapping at narrow widths (`overflow-wrap:anywhere`) so the name is not lost at 320 px.

### M-8 The testing plan relies on Lighthouse for things Lighthouse cannot check
- **Finding:** T-2 (Lighthouse) runs a subset of the axe-core rules on a static snapshot. It cannot check focus loss (C-1), tab order, roving tabindex behaviour, the dialog focus trap or Esc, live-region timing and double announcements (H-1), reading order after reveal (H-3), reflow at 320 px (H-5), text spacing (M-7) or language pronunciation (M-2). It also cannot judge whether names are *meaningful*. T-1 and T-3 cover some of this, but only as headline tasks, with no pass criteria. T-3 also leaves out the error-plus-focus double announcement and the flashcard counter.
- **WCAG:** Not a criterion; process adequacy for the "designed and tested against WCAG 2.2 AA" claim.
- **Location:** EXPERIENCE.md → Accessibility Floor → Testing T-1..T-3.
- **Fix:** Keep T-1..T-3 but give each one pass criteria:
  - **T-1 (keyboard):** "focus never on `<body>`, check with `document.activeElement`"; "Generer → wait → one `Tab` reaches Ny fil"; "Tab from tabs reaches Sammendrag text"; "Neste to last card keeps focus"; "dialog: Avbryt focused, Tab cycles inside, Esc returns to Ny fil, Fortsett lands on Last opp"; plus 320 px/400% reflow and a text-spacing bookmarklet check.
  - **T-2:** keep Lighthouse, and add the free **Accessibility Insights for Web** extension ("FastPass" + "Tab stops" visualisation). It is beginner-friendly and shows tab order visually.
  - **T-3:** state NVDA + Firefox/Chrome or Narrator + Edge. Add checks for "error headline read once, not twice", "Kort N av M announced on Neste", "revealed answer reachable by reading forward", "English results read in an English voice, PDF-side in Norwegian" and "file choice / pre-check announced".

---

## Low

### L-1 `Vis svar` / `Skjul svar` label change plus `aria-expanded`
- **Finding:** Changing the visible label *and* exposing `aria-expanded` gives "Skjul svar, expanded". APG prefers a constant label when a state attribute is used. Here the combination is understandable, and the copy is approved. The real risk is the "fix" of adding a constant `aria-label="Vis svar"`: the name then no longer matches the visible "Skjul svar" (2.5.3).
- **WCAG:** 4.1.2; 2.5.3.
- **Location:** EXPERIENCE.md AF-7, Flashcard, Quiz item.
- **Fix:** Keep the approved toggle copy and `aria-expanded` + `aria-controls`. Do **not** add `aria-label` or `aria-pressed`. Note in the spec: "accessible name = visible label".

### L-2 The external-AI notice link: new tab or same tab, and naming
- **Finding:** The `Les mer om hvordan Anthropic behandler data` link is visible in **S4** (real mode, always). If it opens in the same tab, it triggers the leave/reload warning and the results can be lost. If it opens a new tab, it should say so, consistent with page links.
- **WCAG:** 3.2.5 (AAA, advisory), 2.4.4; usability of 3.3.4-style loss prevention.
- **Location:** EXPERIENCE.md → Notices (external-AI).
- **Fix:** Open it in a new tab (`target="_blank" rel="noopener"`) and add the same sr-only `, åpnes i ny fane` text plus `↗` (`aria-hidden`). It is inline in a sentence, so it is exempt from 2.5.8.

### L-3 Leave/reload warning (`beforeunload`)
- **Finding:** The native browser prompt is accessible, but its text cannot be changed (it is in the browser's language) and it only fires after user interaction. That is fine, because the visible `Resultatene lagres ikke…` note carries the explanation.
- **WCAG:** 3.3.4 does not strictly apply (no legal or financial data); good practice.
- **Location:** EXPERIENCE.md → Leaving and reloading.
- **Fix:** No change in behaviour. Add the note: "the browser prompt text is browser-controlled; the in-page not-saved note is the accessible explanation". Register the listener only in real S4 and remove it on Fortsett, both done in code from one place.

### L-4 S0 / S0x on page load: announcement and focus not defined
- **Finding:** On load, `Starter …` and then either S1 or `Får ikke kontakt med appens server` appear. Live-region changes in the first moments after load are often not announced, and the S0x error has no focus rule. The S5 rule refers to "the error headline", but S0x is not S5.
- **WCAG:** 4.1.3; 3.3.1.
- **Location:** EXPERIENCE.md State Patterns S0/S0x; Focus management.
- **Fix:** Treat S0x like S5: focus its `h2` headline (`tabindex="-1"`). Repeated failures after `Prøv igjen` re-focus the headline (with C-1's `aria-disabled` on Prøv igjen during the check, or focus the headline afterwards). Do not announce `Starter …`.

### L-5 Discoverability of disabled controls
- **Finding:** A native-disabled Generer in S1 / after a hard stop is skipped by `Tab`. Screen-reader browse mode still finds it ("unavailable"), but the reason is only nearby text. The disabled styling contrast is good (text 5.57:1; dashed border 3.31:1 on its fill, 3.68:1 against the page), but the disabled fill is 1.11:1 against the page, so the dashed border carries the shape. That is fine and already intended.
- **WCAG:** 1.4.3/1.4.11 (exempt for inactive components); 3.3.2 Labels or Instructions (good practice).
- **Location:** EXPERIENCE.md → Generer; DESIGN.md → Button — primary disabled.
- **Fix:** Optional: `aria-describedby` from Generer to the S1 guidance or the current error action text, so the reason is read when the user does land on it. Keep the dashed border as the required shape cue. Never use opacity alone.

### L-6 Focus ring implementation details and Focus Not Obscured
- **Finding:** The ring passes everywhere I checked. The specification just needs to protect it: `:focus-visible`, never `outline: none`, programmatic focus on `tabindex="-1"` headings, and nothing sticky. A sticky header or banner added later would risk 2.4.11.
- **WCAG:** 2.4.7; 2.4.11 Focus Not Obscured (Minimum).
- **Location:** DESIGN.md → Focus ring; EXPERIENCE.md AF-2.
- **Fix:** Add "the header, DEMO banner and notices are **not sticky/fixed**", and "use `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px }` globally; a `tabindex="-1"` headline may show the ring". The ring's teal on teal primary buttons is fine, because the 2 px offset shows page colour between them.

### L-7 Page title and landmarks
- **Finding:** No `<title>` is specified.
- **WCAG:** 2.4.2 Page Titled; 1.3.1.
- **Location:** EXPERIENCE.md Foundation / Information Architecture.
- **Fix:** Use `<title>AI Study Buddy</title>`, optionally `AI Study Buddy – Demo` in demo mode. Landmarks per M-5.

### L-8 Tab label counts
- **Finding:** "Flashkort (8)" reads as "Flashkort, 8". That is acceptable and needs no change. Do not hide the count from assistive tech, and do not add an aria-label that differs from the visible text (2.5.3).
- **WCAG:** 2.5.3; 4.1.2.
- **Location:** EXPERIENCE.md → Result tabs.
- **Fix:** Keep the visible text as the accessible name.

### L-9 Applicability notes for WCAG 2.2 additions and others (for the test notes)
- 2.5.7 Dragging Movements: **n/a** (no drag-and-drop by decision; nothing draggable).
- 3.2.6 Consistent Help: **n/a** (single page, no help mechanism repeated across pages).
- 3.3.7 Redundant Entry: **met** for S5 (file and settings kept). The reset on Ny fil → Fortsett is a user-initiated new process, and the reload after a hard stop is a new session; both are acceptable.
- 3.3.8 Accessible Authentication: **n/a** (no login).
- 2.4.11 Focus Not Obscured: met if L-6 is kept.
- 2.5.8 Target Size: met except page links (M-3).
- 2.2.1 Timing Adjustable: n/a (the ~2 min wait is server processing, not a user time limit). 2.2.2 Pause, Stop, Hide: the loading spinner is a loading indicator, and AF-13 already stops motion under reduced motion.
- 3.2.2 On Input: changing selects must not trigger generation. That is already true, because only Generer starts a pass.

---

## Contrast recheck (WCAG 2.x relative-luminance formula)

I recalculated all the load-bearing pairs from DESIGN.md. **Every listed value reproduces exactly.**

| Pair | Ratio | Result |
|---|---|---|
| text #2A2823 on background #F7F3EA / surface #FFFDF7 | 13.30 / 14.48 | pass |
| text-muted #5B5649 on background / surface | 6.60 / 7.19 | pass |
| primary #1D5C63 on background / surface | 6.86 / 7.47 | pass (text and focus ring) |
| white on primary | 7.60 | pass |
| info fg/bg, warning fg/bg, error fg/bg, demo fg/bg | 8.13 / 7.37 / 7.16 / 6.40 | pass |
| text-muted on error-bg | 6.24 | pass |
| disabled fg/bg · disabled border on disabled bg | 5.57 · 3.31 | exempt; pass anyway |
| border #857D6C on surface / background | 4.01 / 3.68 | pass (non-text) |
| **Additional checks:** focus ring on info / warning / error / demo tints | 6.53 / 6.77 / 6.48 / 6.40 | pass (ring around links and focused headlines inside notices) |
| loader arc (primary) on track (border-subtle) | 5.21 | pass |
| border-subtle on surface / background | 1.43 / 1.32 | decorative only, correct as stated |
| **dialog surface vs page background** | **1.04** | boundary invisible → see M-4 |
| disabled fill vs background | 1.11 | shape carried by the dashed border (3.68) → fine |

Selected and unselected tabs differ by colour **and** weight **and** a 3 px underline, so colour is not the only signal (1.4.1 met).

## What is already strong

- **A clear, honest target:** "designed and tested against WCAG 2.2 AA", with "compliant" only for what was tested. This is the right claim for a student project.
- **The palette is excellent and verified.** Every text pair is ≥ 6.2:1 and the focus ring is ≥ 6.4:1 on every background it can sit on. `border-subtle` is explicitly marked as decorative only, and every notice pairs its tint with an icon and text (AF-10).
- **Focus destinations are decided for every flow transition** (dialog open/close, Fortsett, Tilbake til start, errors). Many specs never get that far. The "don't steal focus when results arrive" decision is user-respectful and correct; it only needs C-1 to work.
- **The tabs decision is sound:** APG tabs with automatic activation, Home/End and preserved panel state, and counts in the visible label.
- **The native-feeling, low-risk choices fit a beginner:** no drag-and-drop, no custom shortcuts, no dismissible notices, no fake progress or timers, plain-text rendering, 44 px controls, no shadows or motion beyond one spinner, and `prefers-reduced-motion` handled.
- **The error design is strong for 3.3.1/3.3.3:** every error has a headline, a concrete next action and a muted detail line, and input is preserved where safe (3.3.7).
- **Language handling was considered from the start** (`lang="nb"` page, `lang="en"` generated content). It needs only the scoping rule in M-2.
- **Testing is planned at milestones *and* before submission**, with findings recorded. Adding pass criteria (M-8) makes it credible evidence.
