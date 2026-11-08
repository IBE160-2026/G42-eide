# Spine Pair Review — AI Study Buddy

Reviewer: BMad UX rubric walker (read-only). Date: 2026-11-08.
Inputs: `DESIGN.md`, `EXPERIENCE.md`, `.memlog.md` (authority), `prd.md`, `ARCHITECTURE-SPINE.md`, `.working/direction-refined-rolig.html`.
Pending upstream changes marked PENDING / NOT APPLIED in the memlog are treated as known, not as defects.

## Overall verdict

The spine pair is a strong, extractable contract. UJ-1 is fully realised as Key Flow 1. Every colour token has a hex value, every `{token}` reference in DESIGN.md resolves, all contrast ratios recompute exactly, and every approved Norwegian UI string from the memlog appears character-for-character in EXPERIENCE.md. Three high-severity gaps remain before a story-dev agent can build without guessing: (1) an uncommitted wording decision for unknown error codes that contradicts the disabled Generer rule, (2) no disabled visual for secondary buttons although Forrige/Neste are disabled at the deck ends, and (3) no focus rule for when the focused control becomes disabled. The medium findings are mostly unresolved visual details (control typography, paddings, icons, unmocked surfaces) that the spines already list honestly as Open Questions.

## 1. Flow coverage — strong

Checked: every UJ in the PRD (only **UJ-1**, including its two edge cases) and FR-1…FR-7 against Key Flows. Key Flow 1 names a protagonist (Odeibea), has 10 numbered steps, a stated CLIMAX and a failure-path list mapped to every AD-11 code. Key Flow 2 (demo) has a protagonist (neutral "the examiner", user-approved in Step 8 decision B), 6 numbered steps, a climax and failure paths. UJ-1 edge cases are covered: type/size rejection (browser pre-check + `unsupported_file_type` / `file_too_large`) and "results may be imperfect" (Verification Notice in step 6).

### Findings

- **medium** Key Flow 2 step 5 and its CLIMAX ("working PDF page references") depend on pending architecture amendment (2). EXPERIENCE says "Until approved, the demo page-link mechanism is undecided", and no fallback is committed if the amendment is rejected (EXPERIENCE.md Component Patterns → Page link; Open Questions 2; Key Flow 2 step 5). *Fix:* commit a fallback now, e.g. "If no sample-PDF endpoint exists, demo page references are shown as plain `PDF-side N` labels without a link." Then the demo climax holds either way.
- **low** Key Flow 1 walks only a PDF. A plain-text (TXT) Document, which FR-1 explicitly supports, has no page references, so step 9 ("Verify") cannot happen. The variant is not stated in the flow (Key Flows → Key Flow 1). *Fix:* add one line, e.g. "With a TXT file, results have no page links; verification is against the open text file."
- **low** Key Flow 1's failure-path list omits two entries that appear elsewhere: "network failure during generation" and the browser pre-check failure (type/size before upload) (Key Flow 1 → Failure paths). *Fix:* add both, pointing to the error table and the Browser pre-check row.

## 2. Token completeness — adequate

Checked: all 24 colour tokens have hex values (no critical misses). DESIGN.md has 52 `{path}` references and all resolve to frontmatter. EXPERIENCE.md has 5 real token references, and all resolve (`{spacing.content-max-width}`, `{components.focus-ring}`, `{colors.focus}`, `{spacing.target-min}`, `{spacing.control-min-height}`). I recomputed the WCAG 2.x ratios myself, and every stated value matches: text/background 13.30, primary/background 6.86, on-primary/primary 7.60, notice-info 8.13, notice-warning 7.37, error 7.16, text-muted/error-bg 6.24, demo 6.40, border/background 3.68, disabled-border/disabled-bg 3.31. `border-subtle` on surface is 1.43:1, which is correctly restricted to decorative use only.

### Findings

- **medium** No committed typography for controls. `button-primary`, `button-secondary`, `result-tab`, the settings-field values, the quiz question heading and the demo results heading have no `typography` token. The mapping of controls to `{typography.ui}` 17px is marked **[ASSUMPTION]**, and the mockup uses off-scale 16/18/22px (DESIGN.md Open Questions 1; YAML `components`). *Fix:* the user decides the scale step for each, then adds `typography:` to each of those component tokens.
- **medium** Component paddings are mostly untokenised. Only `upload-bar` has `padding`. Notice, flashcard card, quiz card, error state, dialog and page side padding are missing, and the mockup values are off-scale (DESIGN.md Open Questions 2). *Fix:* snap each to a `{spacing.N}` step and add a `padding` entry to each component token.
- **medium** The notice line-height override is not tokenised. Notices use `{typography.small}` (line-height 1.35), but the Typography table says "1.45 in notices per mockup". The component token and the prose therefore disagree (DESIGN.md Typography table, row Small; YAML `notice-info` / `notice-warning` / `demo-banner`). *Fix:* either add a `notice` typography token (15/400/1.45) and reference it, or drop the 1.45 note.
- **low** The contrast table omits some load-bearing pairs: the focus ring on tinted surfaces (the link inside the external-AI notice, a button inside the error state). I recomputed them: on notice-info-bg 6.53, warning-bg 6.77, error-bg 6.48, demo-bg 6.40, so all pass. The intro says "27 checked pairs", but the table lists about 22 (DESIGN.md Colors). *Fix:* add one row "focus on notice/error/demo tints ≥ 6.40:1" and make the pair count match the table.
- **low** The `spacing` group also holds border widths, the focus ring and `measure-answer: 65ch`, which are not spacing (DESIGN.md YAML `spacing`). Consumers can still resolve these, so this is cosmetic. *Fix (optional):* move them to a `border` / `size` group if the token pipeline allows it.

## 3. Component coverage — adequate

Checked: all 22 YAML component names, every component named in DESIGN.md prose, and every row in EXPERIENCE.md Component Patterns, cross-matched. Most have real rules on both sides: upload bar, file chip, settings field, buttons, result tabs, flashcard, quiz item, page link, notices, not-saved note, dialog, loading indicator and error state. `app-header` and `focus-ring` have no behavioural row, which is acceptable: the header is static and the focus ring is covered by AF-2.

### Findings

- **high** No disabled visual for secondary buttons. `Forrige` (first card) and `Neste` (last card) are secondary buttons that become disabled, but only `button-primary-disabled` exists (DESIGN.md YAML `components`; Components → Button — secondary; EXPERIENCE.md Flashcard row). *Fix:* add `button-secondary-disabled` (e.g. `{colors.disabled-fg}` text, dashed `{colors.disabled-border}`, `{colors.surface}` or `{colors.disabled-bg}` fill) and reference it in the Button — secondary bullet.
- **medium** Several behavioural components have no visual spec:
  - the Browser pre-check inline message (colour, icon, position relative to the chip);
  - the demo fixed-settings note (is it a notice? which tint?);
  - the Sammendrag and Nøkkelbegreper panels (paragraphs? a term/explanation list? where page links go);
  - S0 Checking and S1 Empty guidance blocks;
  - S0x "server not reachable" (does it reuse `error-state`?).

  (EXPERIENCE.md Component Patterns rows Browser pre-check, Sammendrag panel, Nøkkelbegreper panel; DESIGN.md Open Questions 4.) *Fix:* add one DESIGN Components bullet each, mostly by reuse, e.g. "pre-check message = `error-fg` text + error icon under the chip", "S0x uses `error-state`", "fixed-settings note = `notice-info`", "Nøkkelbegreper = term in body 600, explanation in body, page links in `page-link` row".
- **medium** Icons are load-bearing but undefined. AF-10 makes the icon mandatory on every notice, error and the DEMO banner, and the file chip uses file / lock / ✕ icons. No icon source, set or shapes are committed, and no UI library supplies them (DESIGN.md Components; EXPERIENCE.md AF-10). *Fix:* name the source (e.g. "inline SVGs copied from the refined mockup", or a specific open-licence set), list the icon per surface, and state `aria-hidden="true"` on decorative icons.
- **medium** No rendering rule for multi-paragraph plain text. AD-18 requires plain-text rendering, but the Sammendrag and Nøkkelbegreper rows don't say whether newlines in the AI text are preserved (e.g. `white-space: pre-line`) or collapsed. A long Summary would become one block (EXPERIENCE.md Sammendrag panel row). *Fix:* commit "line breaks in AI text are preserved; no Markdown interpretation".
- **low** No hover or pressed states are specified for buttons, tabs or page links (DESIGN.md Components). *Fix:* one line, e.g. "hover = underline for links; for buttons, primary fill darkens to …", or "no hover styling beyond the cursor" (pick one).

## 4. State coverage — adequate

Checked: every IA region against S0, S0x, S1, S2, S3, S4 and S5 in both modes, plus loading, empty, focus, error, offline/backend-unreachable, leave/reload, and the six S5 error groups. The coverage is unusually thorough: the error table covers all 17 AD-11 codes plus the frontend failures, and every code maps to a group with a Generer rule.

### Findings

- **high** Uncommitted decision: unknown-code text contradicts behaviour. The fallback action text `Prøv igjen.` tells the user to retry, but the Reload-required group keeps Generer disabled and says to reload. The spine flags this but ships both (EXPERIENCE.md error table last row; S5 groups "Reload required"; Open Questions 5). *Fix:* the user picks the wording now, e.g. `Noe gikk galt` / `Last inn siden på nytt, og prøv igjen.` (mirrors `invalid_request`). Log it in the memlog and update the table.
- **high** No focus rule for when the focused control becomes disabled. Pressing `Generer` (or `Vis eksempel`) disables it in S3. Pressing `Neste` on the second-to-last card disables `Neste`, and the same happens with `Forrige`. In each case keyboard focus falls to `<body>`, which T-1 will catch (EXPERIENCE.md Interaction Primitives → Focus management; AF-1). *Fix:* commit a rule, e.g. "during S3 focus moves to the loading status text (`tabindex=-1`)"; "when Neste/Forrige becomes disabled, focus moves to the other navigation button". Alternatively use `aria-disabled` and keep the buttons focusable.
- **medium** Browser pre-check messages are not announced. AF-6 lists announcements for loading, results and errors, but not the inline pre-check message (`Bare PDF- og TXT-filer støttes.` / `Filen er større enn 10 MB. Velg en mindre fil.`) (EXPERIENCE.md AF-6; Browser pre-check row). *Fix:* add "pre-check message announced via the live region and tied to Last opp with `aria-describedby`".
- **medium** The exit from S5 is unspecified. When the user replaces the file or changes a setting after an error, the spine doesn't say whether the error state clears and the page returns to S2 (or S1), or whether the error stays until the next Generer (EXPERIENCE.md State Patterns → S5; S5 groups). *Fix:* commit, e.g., "choosing a new file clears the error state and returns to S2; changing settings alone keeps the error visible."
- **medium** Hard-coded numbers in "exact text" that must be dynamic. Voice and Tone says limits come from `/api/status`, but the exact strings contain the literals `10 MB` and `80 sider` (S1 real text, pre-check size text, `file_too_large`), with no placeholder marking or formatting rule (bytes→MB, Norwegian decimal). A copy-paste implementation will hard-code them (EXPERIENCE.md Voice and Tone; Screens and controls table; error table). *Fix:* mark the variable parts, e.g. `maks {max_mb} MB` / `mer enn {max_pdf_pages} sider`, and state the conversion (e.g. `max_upload_bytes / 1 048 576`, decimal comma, no trailing `,0`).
- **medium** The heading structure is not committed. AF-8 says only "logical heading structure". There is no h1, no level for the demo results heading or the error headline (DESIGN says "h2" for the heading token), and no rule on whether tab panels carry headings (EXPERIENCE.md AF-8; DESIGN.md Typography, row Heading). *Fix:* list it, e.g. h1 = "AI Study Buddy"; h2 = demo results heading / error headline / visually hidden panel heading; h3 = quiz questions.
- **low** Possible double announcement: the error headline is both pushed to the live region and receives focus (AF-6 + Focus management). *Fix:* pick one, e.g. focus the headline (`tabindex=-1`) and skip the live-region push for errors.
- **low** S0x while the mode is still unknown: the spine doesn't say whether the external-AI notice, the DEMO banner and the upload bar are shown before `/api/status` answers (EXPERIENCE.md Demo mode variants, row S0/S0x, already marked [ASSUMPTION]). *Fix:* "S0/S0x show the header and the status message only; no notices, no upload bar."
- **low** Not specified: whether the demo fixed-settings note stays visible in demo S4 (locked bar) or only in demo S1 (EXPERIENCE.md Notices table, "Demo S1"; Demo S4 row). *Fix:* state it.

## 5. Visual reference coverage — adequate

Checked: `mockups/` and `wireframes/` do not exist; `imports/` exists and is empty; `.working/` holds 6 HTML files. All six are named in DESIGN.md Brand & Style (the refined one is linked in both spines), so there are no orphans. The spines-win rule is stated. The mockup's visible strings match the approved copy except where noted below.

### Findings

- **medium** The approved visual reference has not been promoted. Both spines link the build reference into `.working/` (a draft folder) instead of `mockups/`, contrary to the bmad-ux finalize step "Promote `.working/` keepers to `mockups/`" (DESIGN.md intro; EXPERIENCE.md Foundation → Visual reference). *Fix:* at finalize, copy `direction-refined-rolig.html` to `mockups/` and update both links. Keep the unchosen directions in `.working/`.
- **low** The spines-win rule is stated twice (DESIGN.md intro and EXPERIENCE.md Foundation) instead of once. *Fix:* keep the full statement in one spine and point to it from the other.
- **low** Mockup ↔ spine drift not listed in DESIGN Open Questions 5: the mockup labels are `◀ Forrige` / `Neste ▶` (spine: `Forrige` / `Neste`), and it uses region labels `Opplasting og innstillinger` / `Resultater` that the spines don't contain. *Fix:* add both to OQ5. Either adopt the region labels as approved copy (useful for landmarks) or drop them.

## 6. Bloat & overspecification — adequate

The spines are dense but almost everything is load-bearing. The duplication carries drift risk.

### Findings

- **low** Repetition: demo S4 is described four times (IA, Component Patterns, Demo mode variants, Key Flow 2), the focus rules three times (Component Patterns, Interaction Primitives, AF-4/AF-6), and the leave/reload rules twice. One drift has already appeared: the S5 group table says "wait at least a minute for rate limits", but the approved `ai_rate_limited` text says `Vent litt før du prøver igjen.` (EXPERIENCE.md S5 groups, Temporary row). *Fix:* make State Patterns and Focus management the single source and reference them elsewhere. Change "at least a minute" to "wait a little (approved text)".
- **low** Process provenance ("decided in Step 8", "(user wording)", "Step 4/5 and Step 8 demo decisions") is noise for a downstream consumer (several places in both spines). *Fix:* remove it in polish; the memlog keeps the history.

## 7. Inheritance discipline — adequate

Checked: both `sources:` paths resolve. UJ-1 is cited verbatim by ID. PRD glossary terms are mapped one-to-one to interface labels (Language & Terminology table). FR-2 values (Brief / Standard / Detailed; Norwegian (Bokmål) / English) map correctly to `Kort / Standard / Detaljert` and `Norsk bokmål / Engelsk`. Component names are consistent across both spines (`dialog` = Ny fil dialog, `quiz-item`, `result-tab`, `not-saved-note`, …). EXPERIENCE token references all resolve to DESIGN tokens. **Memlog strings:** all 116 quoted memlog strings were extracted. Every approved UI string appears character-for-character in EXPERIENCE.md. The only absent strings are the superseded `Appen tillater 20 KI-kall…` (replaced by Step 8 decision A, correctly) and the illustrative examples `Kort 3 av 8` and `3,1 MB`. No contradictions between memlog decisions and the spines were found beyond the drift noted in §6.

### Findings

- **medium** An unlisted upstream conflict. Architecture Consistency Conventions, row Glossary, says "Code **and UI** use the PRD Glossary terms (… Summary, Flashcard Set, Key Concepts …)". The Norwegian UI labels (`Sammendrag`, `Flashkort`, `Nøkkelbegreper`) contradict the UI half of that rule, and the conflict is missing from the pending-upstream list (EXPERIENCE.md Open Questions 4; memlog final PENDING entry). *Fix:* add to pending item (4): "Conventions → Glossary: 'Code and UI use…' → 'Code uses the PRD Glossary terms; UI uses the approved Norwegian labels mapped in EXPERIENCE.md → Language & Terminology'". Needs user approval, like the others.

## 8. Shape fit — strong

DESIGN.md follows the canonical order exactly (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts), with an appended Open Questions section. EXPERIENCE.md has all required defaults (Foundation, Information Architecture, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows), plus the required-when-applicable Responsive & Platform and Inspiration & Anti-patterns. The invented sections earn their place: **Language & Terminology** carries the approved bilingual rule and the glossary mapping, and **Open Questions** carries the pending upstream changes. The course requirement (journeys, navigation, accessibility, error and loading states) maps to Key Flows, IA, the Accessibility Floor and State Patterns.

### Findings

- None beyond the mechanical notes.

## Mechanical notes

- **Token-syntax collision:** `{reference_id}` in the `internal_error` action text uses the same brace syntax as token references, so a `{path.to.token}` resolver will flag or try to resolve it (EXPERIENCE.md error table). Use a distinct placeholder form (e.g. `‹reference_id›` or `<reference_id>`) or state that error-copy placeholders are runtime values. The same applies to any placeholders added for limits (§4).
- **Frontmatter:** DESIGN.md is complete (name, description, status, created, updated, sources, tokens). EXPERIENCE.md has no `description`. Both files are `status: draft`; set them to `final` at handoff per bmad-ux.
- **Cross-references:** the in-file links `[DESIGN.md](DESIGN.md)`, `[EXPERIENCE.md](EXPERIENCE.md#open-questions)` and `.working/direction-refined-rolig.html` all resolve. The unchosen direction files are named as code spans, not links (acceptable).
- **Name consistency:** "Notice (info / warning)" (DESIGN) vs "Notices" (EXPERIENCE), and "Settings field" vs "Settings fields". These are singular/plural only; the token keys are identical.
- **Mermaid:** none in either spine; nothing to validate.
- **Mockup URLs** (`localhost:8000`, `?demo=1`) are already listed as spine-wins conflicts in DESIGN.md Open Questions 5.
