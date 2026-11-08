# Validation Report — AI Study Buddy

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux-designs/ux-G42-eide-2026-10-27/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux-designs/ux-G42-eide-2026-10-27/EXPERIENCE.md`
- **Run at:** 2026-11-08

## Overall verdict

The spine pair is a strong, extractable contract. UJ-1 is fully realised as Key Flow 1. Every colour token has a hex value, every `{token}` reference in DESIGN.md resolves, all contrast ratios recompute exactly, and every approved Norwegian UI string from the memlog appears character-for-character in EXPERIENCE.md. Three high-severity gaps remain before a story-dev agent can build without guessing: (1) an uncommitted wording decision for unknown error codes that contradicts the disabled Generer rule, (2) no disabled visual for secondary buttons although Forrige/Neste are disabled at the deck ends, and (3) no focus rule for when the focused control becomes disabled. The medium findings are mostly unresolved visual details (control typography, paddings, icons, unmocked surfaces) that the spines already list honestly as Open Questions.

The accessibility reviewer (WCAG 2.2 AA and the WAI-ARIA APG as targets) shifts the picture. It raises gap (3) to **Critical**: Generer, Vis eksempel, Neste/Forrige at the deck ends and Prøv igjen all become `disabled` while focused, so focus drops to `<body>` and the promise that results are "the next `Tab`" away is not reliable. Both reviewers flagged this independently, and it is merged here into one finding. It also raises the rubric's low double-announcement note to High as part of underspecified live regions, and adds four High findings the rubric did not cover: an incomplete tabs pattern, revealed answers placed before their button in reading order, silent flashcard navigation, and a 200% zoom target that is weaker than the 320 CSS px Reflow criterion. So the spines are extractable, but a developer following them exactly would still ship keyboard and screen-reader bugs. After merging duplicates across reviewers: **1 critical, 7 high, 19 medium, 20 low**.

## Category verdicts

- Flow coverage — strong
- Token completeness — adequate
- Component coverage — adequate
- State coverage — adequate
- Visual reference coverage — adequate
- Bloat & overspecification — adequate
- Inheritance discipline — adequate
- Shape fit — strong

## Findings by severity

Counts are after merging duplicates across reviewers (4 findings were raised by both the rubric walker and the accessibility reviewer).

### Critical (1)

**[State coverage + Accessibility — raised by both]** — C-1 Focused controls become `disabled`, so focus drops to `<body>` (§ EXPERIENCE.md Component Patterns (Upload bar, Generer, Vis eksempel, Flashcard, Prøv igjen, Results arrival); State Patterns S0/S3/S4; Interaction Primitives → Focus management; AF-1)
Raised by both (rubric: State coverage, high; accessibility: critical). A focused native `<button disabled>` loses focus and `document.activeElement` becomes `<body>`. This happens on the main path: Generer is disabled in S3/S4 right after being pressed, so when `Resultatene er klare` is announced focus is nowhere, and Firefox, NVDA browse mode and Narrator scan mode may restart from the top. The spec's promise that results are "reached with the next `Tab`" (Results arrival; AF-1; Key Flow 1 step 6) is not reliable. Same for Vis eksempel in demo, Neste on the second-to-last card, Forrige on the second card, and Prøv igjen (S0x → S0, "all controls disabled"). A keyboard user stepping through flashcards loses focus once every deck. WCAG 2.4.3, 2.4.7, 2.1.1; APG "keyboard focus is not lost".
Fix: Add one rule to Interaction Primitives: "A control that may be disabled while it has focus uses `aria-disabled="true"` instead of `disabled`. It stays focusable, gets the disabled styling, and its handler does nothing while `aria-disabled` is true." Apply to Generer, Vis eksempel, Forrige, Neste and Prøv igjen. Style `[aria-disabled="true"]` like `:disabled` (needs `button-secondary-disabled` too). Use `type="button"` with no form so submit isn't triggered. Acceptable alternative for Neste/Forrige: keep native `disabled` but move focus to the other button first. Add to T-1: "after every action, `document.activeElement` must never be `<body>`".

### High (7)

**[Component coverage]** — No disabled visual for secondary buttons (§ DESIGN.md YAML components; Components → Button — secondary; EXPERIENCE.md Flashcard row)
`Forrige` (first card) and `Neste` (last card) are secondary buttons that become disabled, but only `button-primary-disabled` exists. If the Critical focus fix uses `aria-disabled`, this style must match `[aria-disabled="true"]` too.
Fix: Add `button-secondary-disabled` (e.g. `{colors.disabled-fg}` text, dashed `{colors.disabled-border}`, `{colors.surface}` or `{colors.disabled-bg}` fill) and reference it in the Button — secondary bullet.

**[State coverage]** — Unknown-code text contradicts disabled Generer (§ EXPERIENCE.md error table, last row; S5 groups → Reload required; Open Questions 5)
The fallback action text `Prøv igjen.` tells the user to retry, but the Reload-required group keeps Generer disabled and says to reload. The spine flags this but ships both.
Fix: User picks the wording, e.g. `Noe gikk galt` / `Last inn siden på nytt, og prøv igjen.` (mirrors `invalid_request`). Log it in the memlog and update the table. See Needs user decision.

**[State coverage + Accessibility — raised by both]** — H-1 Live regions are underspecified, and errors are announced twice (§ EXPERIENCE.md AF-6; Component Patterns → Loading indicator, Error state, Results arrival; State Patterns S3/S4/S5)
Raised by both (rubric: State coverage, low — double announcement; accessibility: high). AF-6 says what to announce, not how. Live regions only work if they exist, empty, before the text changes; the mockup inserts `role="status"` and `role="alert"` with the state. Errors are both pushed to the live region and focused, so the headline is read twice or cut off. Repeated identical text (second generation, second Prøv igjen failure) may be silent. No politeness level is stated. WCAG 4.1.3, 1.3.1.
Fix: One visually hidden `<div role="status" aria-live="polite" aria-atomic="true" id="announcer">` from first render. S3: `Lager studiemateriell …` (demo: `Henter eksempel …`); S4: `Resultatene er klare`; polite. S5: no live region and no `role="alert"` — clear the announcer and move focus to the error headline (`<h2 tabindex="-1">`); add `aria-describedby` to the action text if needed. Clear the text, then set it next tick, so repeats are announced. Assertive is not needed anywhere.

**[Accessibility]** — H-2 The ARIA tabs pattern is incomplete in the spec and wrong in the mockup (§ EXPERIENCE.md AF-3; Component Patterns → Result tabs; mockup frames 1, 2, 5)
AF-3 leaves out `aria-controls`/`aria-labelledby` (the mockup has no ids at all), roving tabindex (without it `Tab` stops on all four tabs, contradicting AF-1's "one Tab stop"), `tabindex="0"` on a panel with no focusable content (Sammendrag may have no page links, so `Tab` jumps past the text users need most), keeping inactive panels mounted with `hidden`, and a name for the tab list. The mockup puts `role="tabpanel"` on the quiz `<ol>`, destroying its list semantics. WCAG 4.1.2, 1.3.1, 2.1.1, 2.4.3.
Fix: Expand AF-3 to a checklist: `div role="tablist" aria-label="Resultater"` → `button role="tab" id aria-selected aria-controls tabindex={selected?0:-1}` → `div role="tabpanel" id aria-labelledby tabindex="0" hidden={!selected}`; arrows wrap; focus follows selection; the quiz `<ol>` sits inside the panel. Add to DESIGN.md: the tab panel gets the standard focus ring.

**[Accessibility]** — H-3 Revealed answers appear before the reveal button in reading order (§ DESIGN.md Components → Flashcard, Quiz item; EXPERIENCE.md Flashcard, Quiz item)
The answer renders above `Forrige / Vis svar / Neste` (flashcard) and above the reveal row (quiz). After pressing `Vis svar`, a screen-reader user is on the button and the answer is behind them; reading forward goes to Neste or the next question. That undermines the "practise" goal. `aria-controls` doesn't rescue it. WCAG 1.3.2, 2.4.3.
Fix: Pick one and record it. (a) Recommended: in DOM order the reveal button sits directly before the answer — flashcard: counter → term → `Vis svar` → answer (+ page links) → Forrige/Neste; quiz: question → `Vis svar` → answer → page links. (b) Keep the layout; answer gets `tabindex="-1"` and the spec documents Shift+↓ — weaker. Either way: answer is `hidden` when collapsed, has an `id` in `aria-controls`, button carries `aria-expanded`.

**[Accessibility]** — H-4 Flashcard navigation changes content silently (§ EXPERIENCE.md AF-7; Component Patterns → Flashcard)
On `Neste`/`Forrige` focus stays on the button while counter and term change. Nothing is announced, so a screen-reader user doesn't know which card is shown. AF-7 only says "`Kort N av M` readable". WCAG 4.1.3, 1.3.1.
Fix: Make the visible counter a polite live region present from the start of the panel: `<p aria-live="polite" aria-atomic="true">Kort 4 av 8</p>`. Leave the term out of the region. Combine with C-1 so focus stays on the last-card Neste.

**[Accessibility]** — H-5 Reflow target is 200% zoom, but WCAG 2.2 AA requires 320 CSS px (§ EXPERIENCE.md AF-11; Responsive & Platform; DESIGN.md Layout & Spacing)
200% (≈ 640 CSS px) meets 1.4.4 Resize Text but not 1.4.10 Reflow, which requires 320 CSS px (400% on a 1280 px laptop). Likely failures at 320 px: four tabs in one row (`Nøkkelbegreper` is long), the 28 px flashcard term with long words, the page-link row, the not-saved note beside Ny fil, the demo heading beside Tilbake til start. "Laptop only" is no exemption — zoom is a laptop feature.
Fix: AF-11: "Usable at 200% zoom (1.4.4) and reflows without horizontal scrolling at 320 CSS px / 400% zoom (1.4.10)." Tab list and rows use `flex-wrap: wrap`; terms and answers use `overflow-wrap: anywhere`; add a 320 px check to T-1. See Needs user decision.

### Medium (19)

**[Flow coverage]** — Demo climax depends on an unapproved architecture amendment (§ EXPERIENCE.md Key Flow 2 step 5; Component Patterns → Page link; Open Questions 2)
Key Flow 2's climax ("working PDF page references") depends on pending architecture amendment (2). The spine says the demo page-link mechanism is undecided until approved, and no fallback is committed if the amendment is rejected.
Fix: Commit a fallback now, e.g. "If no sample-PDF endpoint exists, demo page references are shown as plain `PDF-side N` labels without a link." The demo climax then holds either way.

**[Token completeness]** — No committed typography for controls (§ DESIGN.md Open Questions 1; YAML components)
`button-primary`, `button-secondary`, `result-tab`, settings-field values, the quiz question heading and the demo results heading have no `typography` token. Mapping controls to `{typography.ui}` 17px is marked [ASSUMPTION], and the mockup uses off-scale 16/18/22px.
Fix: The user picks the scale step for each; add `typography:` to each of those component tokens.

**[Token completeness]** — Component paddings mostly untokenised (§ DESIGN.md Open Questions 2; YAML components)
Only `upload-bar` has `padding`. Notice, flashcard card, quiz card, error state, dialog and page side padding are missing; mockup values are off-scale.
Fix: Snap each to a `{spacing.N}` step and add a `padding` entry to each component token.

**[Token completeness]** — Notice line-height override not tokenised (§ DESIGN.md Typography table, row Small; YAML notice-info / notice-warning / demo-banner)
Notices use `{typography.small}` (line-height 1.35), but the Typography table says "1.45 in notices per mockup". Token and prose disagree.
Fix: Either add a `notice` typography token (15/400/1.45) and reference it, or drop the 1.45 note.

**[Component coverage]** — Several behavioural components have no visual spec (§ EXPERIENCE.md Component Patterns (Browser pre-check, Sammendrag panel, Nøkkelbegreper panel); DESIGN.md Open Questions 4)
Missing: the Browser pre-check inline message (colour, icon, position), the demo fixed-settings note, the Sammendrag and Nøkkelbegreper panels, the S0 Checking and S1 Empty guidance blocks, and S0x "server not reachable".
Fix: Add one DESIGN Components bullet each, mostly by reuse: pre-check message = `error-fg` text + error icon under the chip; S0x uses `error-state`; fixed-settings note = `notice-info`; Nøkkelbegreper = term in body 600, explanation in body, page links in a `page-link` row.

**[Component coverage]** — Icons are load-bearing but undefined (§ DESIGN.md Components; EXPERIENCE.md AF-10)
AF-10 makes an icon mandatory on every notice, error and the DEMO banner; the file chip uses file / lock / ✕ icons. No icon source, set or shapes are committed.
Fix: Name the source (e.g. inline SVGs from the refined mockup, or a named open-licence set), list the icon per surface, and state `aria-hidden="true"` on decorative icons.

**[Component coverage]** — No rendering rule for multi-paragraph plain text (§ EXPERIENCE.md Component Patterns → Sammendrag panel)
AD-18 requires plain-text rendering, but nothing says whether newlines in AI text are preserved. A long Summary would collapse into one block.
Fix: Commit "line breaks in AI text are preserved (`white-space: pre-line`); no Markdown interpretation".

**[State coverage]** — Exit from S5 unspecified (§ EXPERIENCE.md State Patterns → S5; S5 groups)
When the user replaces the file or changes a setting after an error, the spine doesn't say whether the error clears and the page returns to S2/S1, or stays until the next Generer.
Fix: Commit e.g. "choosing a new file clears the error state and returns to S2; changing settings alone keeps the error visible".

**[State coverage]** — Hard-coded limits inside "exact text" (§ EXPERIENCE.md Voice and Tone; Screens and controls table; error table)
Voice and Tone says limits come from `/api/status`, but the exact strings contain the literals `10 MB` and `80 sider` (S1 text, pre-check size text, `file_too_large`) with no placeholder marking or formatting rule. A copy-paste implementation will hard-code them.
Fix: Mark the variable parts, e.g. `maks {max_mb} MB` / `mer enn {max_pdf_pages} sider` (in a placeholder syntax that does not collide with token references — see Mechanical notes), and state the conversion (`max_upload_bytes / 1 048 576`, decimal comma, no trailing `,0`). See Needs user decision.

**[Visual reference coverage]** — Approved visual reference not promoted to `mockups/` (§ DESIGN.md intro; EXPERIENCE.md Foundation → Visual reference)
Both spines link the build reference into `.working/` (a draft folder), contrary to the finalize step "Promote `.working/` keepers to `mockups/`".
Fix: At finalize, copy `direction-refined-rolig.html` to `mockups/` and update both links. Keep unchosen directions in `.working/`.

**[Inheritance discipline]** — Unlisted upstream conflict: architecture glossary rule vs Norwegian labels (§ EXPERIENCE.md Open Questions 4; memlog final PENDING entry; ARCHITECTURE-SPINE.md Consistency Conventions → Glossary)
Architecture says "Code and UI use the PRD Glossary terms (… Summary, Flashcard Set, Key Concepts …)". The Norwegian UI labels (`Sammendrag`, `Flashkort`, `Nøkkelbegreper`) contradict the UI half, and the conflict is missing from the pending-upstream list.
Fix: Add to pending item (4): "Conventions → Glossary: 'Code and UI use…' → 'Code uses the PRD Glossary terms; UI uses the approved Norwegian labels mapped in EXPERIENCE.md → Language & Terminology'". Needs user approval, like the other pending changes.

**[State coverage + Accessibility — raised by both]** — M-1 File-choice feedback and pre-check errors are not tied to the control or announced (§ EXPERIENCE.md AF-6; Browser pre-check; File chip; S2; S5 Invalid-file / Too-big / Too-little groups)
Raised by both (rubric: State coverage, medium; accessibility: medium). Choosing a file makes the chip appear silently. Pre-check messages (`Bare PDF- og TXT-filer støttes.` / `Filen er større enn 10 MB. Velg en mindre fil.`) have no association and no announcement; AF-6 doesn't list them. The problem chip is marked only by ✕ icon + colour. S5 file errors appear far from the file control. WCAG 3.3.1, 4.1.3, 1.3.1, 1.4.1.
Fix: Last opp is a real `<button>` that clicks a visually hidden native `<input type="file" accept=".pdf,.txt,application/pdf,text/plain">` (or a styled `<label>`). Announce `Valgt fil: {navn}, {størrelse}` or the pre-check message via the shared announcer (H-1). Give the inline message an id and point to it with `aria-describedby` from Last opp (and Generer while disabled for the file). Add sr-only `Problem med filen:` to the problem chip; ✕ gets `aria-hidden="true"`. For S5 file errors, `aria-describedby` from Last opp to the action text.

**[Accessibility]** — M-2 `lang="en"` scope would mispronounce Norwegian interface text inside results (§ EXPERIENCE.md AF-5; State Patterns S4)
The easy implementation puts `lang="en"` on the whole panel, so `PDF-side N ↗`, `Vis svar/Skjul svar`, `Kort N av M`, `Forrige/Neste`, tab names and the Verification Notice get read with an English voice. WCAG 3.1.2.
Fix: Put `lang={outputLanguage}` only on elements holding generated text (summary paragraphs, concept term + explanation, card term/answer, quiz question/answer), never on a container with controls or page links. Take `output_language` from the success envelope, not the select. Add the voice check to T-3.

**[Accessibility]** — M-3 Page links: target size and accessible-name construction (§ DESIGN.md Components → Page link; EXPERIENCE.md Page link, AF-7, AF-12)
Page links are ≈ 20 px tall, not inside a sentence, so the 2.5.8 inline exception doesn't apply and AF-12's own "nothing interactive is smaller than 24×24" is broken. `↗` reads as "north east arrow". AF-7 gives the name `PDF-side N, åpnes i ny fane` but not how to build it; an `aria-label` could break 2.5.3. WCAG 2.5.8, 2.5.3, 2.4.4.
Fix: `display:inline-flex; min-height:24px; padding:2px 4px`, ≥ 8 px gaps. Markup: `<a href={blobUrl + '#page=' + n} target="_blank" rel="noopener">PDF-side {n}<span aria-hidden="true"> ↗</span><span class="sr-only">, åpnes i ny fane</span></a>` — no `aria-label`. Separator `·` gets `aria-hidden="true"`. Create the blob URL once per results session; revoke on Fortsett.

**[Accessibility]** — M-4 Ny fil dialog: build details missing, and the card is invisible against the page (§ EXPERIENCE.md Ny fil dialog, AF-4; DESIGN.md Components → Ny fil dialog, Open Questions 3)
AF-4 doesn't say which element to use or what labels the dialog; there is no heading. The dialog is `surface` (#FFFDF7) with no shadow, border or backdrop decided — 1.04:1 against the background, so its edge is practically invisible at zoom. WCAG 4.1.2, 2.4.3, 1.4.11, 1.3.1.
Fix: Native `<dialog>` with `showModal()` (inert background, Esc `cancel`, `::backdrop` for free). `aria-labelledby` the question text, `autofocus` on Avbryt, handle `cancel` as Avbryt. Focus Ny fil explicitly after close; focus Last opp after S1 renders on Fortsett. Add `1px solid {colors.border}` (3.68:1) and a backdrop such as `rgb(42 40 35 / .45)`.

**[State coverage + Accessibility — raised by both]** — M-5 Heading structure is not defined (AF-8 says only "logical") (§ EXPERIENCE.md AF-8; DESIGN.md Typography, row Heading)
Raised by both (rubric: State coverage, medium; accessibility: medium). Only the error headline (h2) and the demo results heading are specified. Real-mode S4 has no results heading, so screen-reader users can't press H to jump to results. The brand is a `<span>` in the mockup; quiz questions are "headings" with no level. WCAG 1.3.1, 2.4.6, 2.4.1.
Fix: Record the outline: `h1` AI Study Buddy (in `<header>`); `h2` `Resultater` (visible or sr-only in real S4; the demo heading in demo); `h2` error headline (S5/S0x); no extra heading in the selected panel; `h3` per quiz question inside `ol > li`; flashcard term a `p` (or `h3`). Landmarks: `<header>`, `<main>`, `<section aria-labelledby>` for upload bar and results.

**[Accessibility]** — M-6 The locked upload bar loses its semantics (§ DESIGN.md Upload bar, File chip; EXPERIENCE.md Upload bar)
Locked settings shown as "plain read-only values" drop the `<label for>` link; the mockup uses spans with a decorative `▾`. Lock state is icon + dashed border only, signalled by changing the region's `aria-label` to "(låst)" — name changes aren't announced. WCAG 1.3.1, 4.1.2, 1.4.1.
Fix: Locked: `<dl>` with `<dt>Språk på resultatene</dt><dd>Norsk bokmål</dd>` etc.; lock icon `aria-hidden` plus visible or sr-only `Låst`. Keep the region name fixed. Unlocked: real `<label for>`. Course-code input: `maxlength="100"`, `autocomplete="off"`.

**[Accessibility]** — M-7 Fixed `height` tokens will clip text under text-spacing overrides and zoom (§ DESIGN.md YAML components file-chip, settings-field, button-*, result-tab)
Front matter uses `height: '{spacing.control-min-height}'` while the prose says "min 44px". A fixed height clips labels when users raise line-height/letter-spacing or when file name and meta wrap. WCAG 1.4.12, 1.4.10.
Fix: Rename to `minHeight` / CSS `min-height`, padding for rhythm. No `overflow:hidden` on text, except the file-name ellipsis, which falls back to `overflow-wrap:anywhere` at narrow widths.

**[Accessibility]** — M-8 The testing plan relies on Lighthouse for things Lighthouse cannot check (§ EXPERIENCE.md Accessibility Floor → Testing T-1..T-3)
Lighthouse can't check focus loss, tab order, roving tabindex, the dialog trap, live-region timing, reading order after reveal, 320 px reflow, text spacing or pronunciation. T-1 and T-3 have no pass criteria. Process adequacy for the "designed and tested against WCAG 2.2 AA" claim.
Fix: Give T-1..T-3 pass criteria: T-1 focus never on `<body>`, Generer → one `Tab` reaches Ny fil, dialog Avbryt/Esc/Fortsett, 320 px + text-spacing check. T-2 add Accessibility Insights for Web (FastPass + Tab stops). T-3 name NVDA + Firefox/Chrome or Narrator + Edge; check error read once, `Kort N av M` announced, answer reachable reading forward, English voice for results, file choice announced.

### Low (20)

**[Flow coverage]** — Key Flow 1 has no TXT variant (§ EXPERIENCE.md Key Flows → Key Flow 1)
Key Flow 1 walks only a PDF. A plain-text Document (supported by FR-1) has no page references, so step 9 ("Verify") cannot happen as written.
Fix: Add one line: "With a TXT file, results have no page links; verification is against the open text file."

**[Flow coverage]** — Failure-path list omits two entries (§ EXPERIENCE.md Key Flow 1 → Failure paths)
"Network failure during generation" and the browser pre-check failure (type/size before upload) appear elsewhere but not in the flow's failure list.
Fix: Add both, pointing to the error table and the Browser pre-check row.

**[Token completeness]** — Contrast table omits focus-on-tint pairs; pair count wrong (§ DESIGN.md Colors)
Focus ring on notice/error/demo tints is not listed (recomputed: 6.53 / 6.77 / 6.48 / 6.40, all pass). The intro says "27 checked pairs" but the table lists about 22.
Fix: Add one row "focus on notice/error/demo tints ≥ 6.40:1" and make the pair count match the table.

**[Token completeness]** — `spacing` group holds non-spacing values (§ DESIGN.md YAML spacing)
Border widths, the focus ring and `measure-answer: 65ch` sit under `spacing`. Consumers can still resolve them; cosmetic.
Fix: Optional: move them to a `border` / `size` group if the token pipeline allows it.

**[Component coverage]** — No hover or pressed states (§ DESIGN.md Components)
Buttons, tabs and page links have no hover/pressed styling specified.
Fix: One line: either a hover rule (underline for links, darker primary fill) or "no hover styling beyond the cursor".

**[State coverage]** — S0x content while the mode is still unknown (§ EXPERIENCE.md Demo mode variants, row S0/S0x)
Not stated whether the external-AI notice, DEMO banner and upload bar are shown before `/api/status` answers (already marked [ASSUMPTION]).
Fix: "S0/S0x show the header and the status message only; no notices, no upload bar."

**[State coverage]** — Demo fixed-settings note visibility in demo S4 (§ EXPERIENCE.md Notices table (Demo S1); Demo S4 row)
Not specified whether the note stays visible in demo S4 (locked bar) or only in demo S1.
Fix: State it.

**[Visual reference coverage]** — Spines-win rule stated twice (§ DESIGN.md intro; EXPERIENCE.md Foundation)
The rule should be stated once.
Fix: Keep the full statement in one spine and point to it from the other.

**[Visual reference coverage]** — Mockup ↔ spine drift not listed (§ DESIGN.md Open Questions 5)
Mockup labels are `◀ Forrige` / `Neste ▶` (spine: `Forrige` / `Neste`), and it uses region labels `Opplasting og innstillinger` / `Resultater` that the spines don't contain. The accessibility reviewer's tabs and heading fixes (H-2, M-5) would use `Resultater`.
Fix: Add both to OQ5. Either adopt the region labels as approved copy (useful for landmarks) or drop them.

**[Bloat & overspecification]** — Repetition has already caused drift (§ EXPERIENCE.md S5 groups, Temporary row (and IA, Component Patterns, Demo mode variants, Key Flow 2))
Demo S4 is described four times, focus rules three times, leave/reload twice. The S5 group table says "wait at least a minute for rate limits", but the approved `ai_rate_limited` text says `Vent litt før du prøver igjen.`
Fix: Make State Patterns and Focus management the single source and reference them elsewhere. Change "at least a minute" to "wait a little (approved text)".

**[Bloat & overspecification]** — Process provenance is noise for consumers (§ Several places in both spines)
"decided in Step 8", "(user wording)", "Step 4/5 and Step 8 demo decisions".
Fix: Remove in polish; the memlog keeps the history.

**[Accessibility]** — L-1 `Vis svar` / `Skjul svar` label change plus `aria-expanded` (§ EXPERIENCE.md AF-7, Flashcard, Quiz item)
"Skjul svar, expanded" is understandable and the copy is approved. The real risk is a "fix" that adds a constant `aria-label="Vis svar"`, breaking 2.5.3.
Fix: Keep the toggle copy with `aria-expanded` + `aria-controls`. No `aria-label`, no `aria-pressed`. Note: "accessible name = visible label".

**[Accessibility]** — L-2 External-AI notice link: same tab would lose results (§ EXPERIENCE.md Notices (external-AI))
`Les mer om hvordan Anthropic behandler data` is visible in real S4. Same tab triggers the leave warning and can lose results; new tab should say so.
Fix: `target="_blank" rel="noopener"` with sr-only `, åpnes i ny fane` and `aria-hidden` `↗`.

**[Accessibility]** — L-3 Leave/reload warning text is browser-controlled (§ EXPERIENCE.md Leaving and reloading)
The native `beforeunload` prompt is accessible but its text can't be changed. Fine, since the visible `Resultatene lagres ikke…` note carries the explanation.
Fix: No behaviour change. Note that the in-page not-saved note is the accessible explanation; register the listener only in real S4, remove it on Fortsett.

**[Accessibility]** — L-4 S0 / S0x on load: announcement and focus not defined (§ EXPERIENCE.md State Patterns S0/S0x; Focus management)
Live-region changes right after load are often missed, and the S0x error (`Får ikke kontakt med appens server`) has no focus rule — the S5 rule doesn't cover it.
Fix: Treat S0x like S5: focus its `h2` (`tabindex="-1"`); re-focus on repeated failures after `Prøv igjen`. Don't announce `Starter …`.

**[Accessibility]** — L-5 Discoverability of disabled controls (§ EXPERIENCE.md Generer; DESIGN.md Button — primary disabled)
A native-disabled Generer is skipped by `Tab`; the reason is only nearby text. Disabled fill is 1.11:1 against the page, so the dashed border carries the shape — already intended.
Fix: Optional `aria-describedby` from Generer to the S1 guidance or current error action text. Keep the dashed border; never opacity alone.

**[Accessibility]** — L-6 Focus-ring implementation and Focus Not Obscured (§ DESIGN.md Focus ring; EXPERIENCE.md AF-2)
The ring passes everywhere checked; the spec just needs to protect it. A sticky header or banner added later would risk 2.4.11.
Fix: Add "header, DEMO banner and notices are not sticky/fixed" and "global `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px }`; a `tabindex="-1"` headline may show the ring".

**[Accessibility]** — L-7 No page title (§ EXPERIENCE.md Foundation / Information Architecture)
No `<title>` is specified. WCAG 2.4.2.
Fix: `<title>AI Study Buddy</title>`, optionally `AI Study Buddy – Demo` in demo mode. Landmarks per M-5.

**[Accessibility]** — L-8 Tab label counts (§ EXPERIENCE.md Result tabs)
`Flashkort (8)` reads as "Flashkort, 8" — acceptable. Risk is hiding the count or adding a differing `aria-label` (2.5.3).
Fix: Keep the visible text as the accessible name.

**[Accessibility]** — L-9 WCAG 2.2 applicability notes for the test notes (§ EXPERIENCE.md Accessibility Floor → Testing)
2.5.7 n/a (no drag); 3.2.6 n/a; 3.3.7 met for S5; 3.3.8 n/a (no login); 2.4.11 met if L-6 kept; 2.5.8 met except page links (M-3); 2.2.1 n/a (server wait, not a user time limit); 2.2.2 covered by AF-13; 3.2.2 met (only Generer starts a pass).
Fix: Copy these into the test notes as evidence for the WCAG 2.2 AA target claim.

## Mechanical notes

- Token-syntax collision: `{reference_id}` in the `internal_error` action text uses the same brace syntax as token references, so a `{path.to.token}` resolver will flag it. Use a distinct placeholder form (e.g. `‹reference_id›` or `<reference_id>`) or state that error-copy placeholders are runtime values. Same for any limit placeholders added (State coverage).
- Frontmatter: DESIGN.md is complete. EXPERIENCE.md has no `description`. Both are `status: draft`; set to `final` at handoff.
- Cross-references: `[DESIGN.md](DESIGN.md)`, `[EXPERIENCE.md](EXPERIENCE.md#open-questions)` and `.working/direction-refined-rolig.html` all resolve.
- Name consistency: "Notice (info / warning)" vs "Notices", "Settings field" vs "Settings fields" — singular/plural only; token keys identical.
- Mermaid: none in either spine.
- Mockup URLs (`localhost:8000`, `?demo=1`) are already listed as spines-win conflicts in DESIGN.md Open Questions 5.

## Needs user decision

1. **Unknown-error wording vs disabled Generer.** Fallback text `Prøv igjen.` asks for a retry while the Reload-required group keeps Generer disabled. Choose the wording (e.g. `Noe gikk galt` / `Last inn siden på nytt, og prøv igjen.`) or change the group's behaviour. (State coverage, high)
2. **How upload limits appear in text.** Keep the literals `10 MB` / `80 sider` or switch to placeholders filled from `/api/status` — and if so, the number format (decimal comma, no `,0`) and a placeholder syntax that doesn't collide with `{token}` references. (State coverage, medium; Mechanical notes)
3. **Reflow target: 200% zoom vs 320 CSS px.** Keep AF-11 at 200% zoom or adopt WCAG 1.4.10 Reflow at 320 CSS px / 400% zoom, which brings wrapping rules for tabs, rows and long words. (Accessibility H-5)
4. **Architecture glossary vs Norwegian UI labels.** Approve changing Architecture Conventions → Glossary to "Code uses the PRD Glossary terms; UI uses the approved Norwegian labels", and add it to the pending upstream changes, item (4). (Inheritance discipline, medium)
5. **Disabled-while-focused pattern.** `aria-disabled` on Generer, Vis eksempel, Forrige, Neste and Prøv igjen, or native `disabled` with focus moved first (e.g. Neste → Forrige). (Accessibility C-1, raised by both)
6. **Reveal order for answers.** (a) DOM reorder so `Vis svar` sits directly before the answer, or (b) keep the visual order and rely on `tabindex="-1"` + Shift+↓. (Accessibility H-3)
7. **Demo page-link fallback.** What demo page references show if architecture amendment (2) is rejected, e.g. plain `PDF-side N` labels without a link. (Flow coverage, medium)
8. **Control typography and hover styling.** Scale step per control (Open Questions 1) and whether buttons/tabs/links get hover styling at all. (Token completeness, medium; Component coverage, low)
9. **Region labels from the mockup.** Adopt `Opplasting og innstillinger` / `Resultater` as approved copy (useful for landmarks, tabs and the S4 heading) or drop them. (Visual reference coverage, low; Accessibility H-2, M-5)

## Reviewer files

- `_bmad-output/planning-artifacts/ux-designs/ux-G42-eide-2026-10-27/review-rubric.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-G42-eide-2026-10-27/review-accessibility.md`
