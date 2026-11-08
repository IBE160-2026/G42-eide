# Targeted Re-check — AI Study Buddy UX

- **Run at:** 2026-11-08
- **Checked:** `DESIGN.md`, `EXPERIENCE.md` (revised), against `validation-report.md` (1 critical + 7 high) and `.memlog.md` (later entries override earlier).
- **Architecture contract:** `ARCHITECTURE-SPINE.md` → Conventions → Endpoints (`GET /api/status` → `mode`, `limits: {max_upload_bytes, max_pdf_pages, max_text_chars}`, `options`, `accepted_types`). Not edited.

## A. Critical and high findings

| ID | Finding | Verdict | Where it is resolved | Justification |
|---|---|---|---|---|
| C-1 | Focused controls become `disabled`; focus drops to `<body>` | **RESOLVED** | EXPERIENCE Interaction Primitives → *Temporarily unavailable controls* + *Focus management*; Component Patterns → Generer, Vis eksempel, Flashcard, Prøv igjen, Results arrival; AF-1; T-1; Banned list; DESIGN `button-primary-disabled` / `button-secondary-disabled` (applied to `[aria-disabled="true"]`) | All five controls (Generer, Vis eksempel, Prøv igjen, Forrige, Neste) are named; native `disabled` is banned for them; activation blocked for click/Enter/Space by a guarded handler; `type="button"`; no duplicate Generer/Vis eksempel request; focus stays on Generer through S3 into S4 and the next `Tab` reaches the results area (Ny fil); Forrige/Neste keep focus at deck ends; T-1 tests `activeElement !== <body>`. Advisory: the spine does not say in so many words that the locked bar must not re-mount the Generer element; "focus stays on Generer" + the T-1 criterion catch it. |
| High | No disabled visual for secondary buttons | **RESOLVED** | DESIGN YAML `button-secondary-disabled`; Components → Button — secondary | Token exists with disabled fill/text/dashed border, applies to `[aria-disabled="true"]`, names Forrige/Neste at deck ends; "no hover change". |
| High | Unknown-code text `Prøv igjen.` contradicts aria-disabled Generer | **RESOLVED** | EXPERIENCE error table (last row); S5 groups → Reload required | Text is `Last inn siden på nytt, og prøv igjen.` (memlog validation decision 1); `Prøv igjen.` no longer live for this row. |
| H-1 | Live regions underspecified; errors announced twice | **RESOLVED** | EXPERIENCE AF-6; Component Patterns → Loading indicator, Error state; State Patterns S3/S4/S5 | One persistent polite `role="status"` region from first render; clear-then-set-next-tick for repeats; polite only; errors via focus to `<h2 tabindex="-1">` only, no `role="alert"`, no region text; loading block has no role. |
| H-2 | ARIA tabs pattern incomplete | **RESOLVED** | EXPERIENCE AF-3; Component Patterns → Result tabs, Quiz item; DESIGN Components → Result tabs (panel focus ring) | Named tablist, `id`/`aria-selected`/`aria-controls`, roving tabindex, panel `tabindex="0"` + `aria-labelledby`, inactive panels `hidden` but mounted, wrap + Home/End, quiz `<ol>` inside a wrapper panel. |
| H-3 | Revealed answers before the reveal button in reading order | **RESOLVED** | EXPERIENCE Flashcard, Quiz item, AF-7; DESIGN Components → Flashcard, Quiz item ("visual order = reading order"); DESIGN OQ4 lists the mockup conflict | Option (a) adopted: button directly before the answer in DOM; `aria-expanded`, `aria-controls`, collapsed answer `hidden`. |
| H-4 | Flashcard navigation changes content silently | **RESOLVED** | EXPERIENCE Flashcard; AF-6; AF-7; T-3 | Counter is `<p aria-live="polite" aria-atomic="true">` present from panel start; term excluded; focus stays on the pressed button. |
| H-5 | Reflow target 200% instead of 320 CSS px | **RESOLVED** | EXPERIENCE AF-11, Responsive & Platform, T-1; DESIGN Layout & Spacing (`{spacing.reflow-min-width}`), Typography (`overflow-wrap: anywhere`) | 320 CSS px / 1.4.10 added alongside 200%; tab list and every button row wrap; long words wrap; size values are minimums; 320 px + text-spacing in T-1. |

**Totals: 8 RESOLVED, 0 PARTIALLY RESOLVED, 0 OPEN.**

## B. New-inconsistency scan

### B1. Approved strings

- Every approved Norwegian UI string in the memlog (notices, screens/controls, settings labels and options, all error headlines and action texts, dialog, demo texts, `Henter eksempel …`, `Resultatene er klare`, region labels `Opplasting og innstillinger` / `Resultater`, accessible name `PDF-side N, åpnes i ny fane`) appears character-for-character in EXPERIENCE.md, with numeric limits replaced by `<max_upload_mb>` / `<max_pdf_pages>` per validation decision 2.
- Superseding strings are live: `Last inn siden på nytt, og prøv igjen.` (unknown/other and `invalid_request`), `Du har sendt for mange forespørsler på kort tid. Vent litt før du prøver igjen.` (`ai_rate_limited`), `Appen har en grense for antall KI-kall per oppstart …` (`session_call_limit_reached`).
- No superseded string remains as live copy: no `Prøv igjen.` as the unknown-code action, no `Appen tillater 20 KI-kall …`, no `{reference_id}`, no hard-coded `10 MB` / `80 sider` in copy (they appear only as "currently renders …" notes and in pending item 6).

### B2. New user-facing Norwegian text not in the memlog (needs user approval)

1. `Detaljnivå` — label of the detail-level field (EXPERIENCE Screens and controls; Language & Terminology; DESIGN-adjacent). The memlog approves the options `Kort / Standard / Detaljert` but never the field label. It comes from the mockup.
2. Page `<title>` `AI Study Buddy` — uses the approved product name, but its use as the page title is new (low risk; confirm in passing).

No other new Norwegian copy. The lock-state wording (OQ9) and a valid-file announcement (OQ10) are correctly left open instead of invented; `Låst` appears only as a description of the mockup.

### B3. Behavioural / visual decisions in the spines not recorded in the memlog

Behaviour:

1. Focus after a successful `Prøv igjen` → `Last opp` (real) / `Vis eksempel` (demo) — marked [ASSUMPTION], OQ14.
2. `Prøv igjen` stays in place, aria-disabled, while the re-check runs, and the S0x message stays (no return to S0).
3. Error headline is re-focused on every repeated failure (S5 and S0x).
4. S0x focuses its headline on page load (derivable from "after an error → headline", but S0x is not an AD-11 error; record explicitly).
5. `Starter …` is not announced (AF-6).
6. Dialog details: `autofocus` on Avbryt, `Esc` via the `cancel` event, explicit focus return to Ny fil, `aria-labelledby` = the question text.
7. Heading levels below h3: `h4` per quiz question; `h3` per panel shows the tab name (memlog records h1/h2/h3 only); tablist named via `aria-labelledby` the results `h2` (in demo, the demo heading).
8. Locked settings rendered as `<dl>`; region name never changes with lock state; lock icon `aria-hidden`.
9. `Last opp` is a real `<button>` driving a visually hidden `<input type="file">`; `accept` built from `accepted_types`.
10. Problem chip carries the pre-check message or the S5 headline as (visually hidden) text.
11. `lang="en"` driven by the submitted, locked `output_language` value; demo results are `nb`.
12. Page-link object URL created once per results session, revoked on Fortsett.
13. Header, DEMO banner and notices never sticky/fixed; global `:focus-visible` rule; programmatically focused headline may show the ring.
14. Page `<title>` `AI Study Buddy` (also B2).

Visual / tokens:

15. `colors.primary-hover` `#174B51` (memlog only says "slightly darker teal").
16. `colors.hover-tint` `#E2EEEC` (= `demo-bg`) for secondary-button and tab hover.
17. `colors.backdrop` `#2A28238C` (text at ~55%) and dialog border `{colors.border}` (memlog: "visible border and dimmed backdrop", no values).
18. New component tokens `button-primary-hover`, `button-secondary-hover`, `result-tab-hover`; page-link hover = no change; disabled buttons have no hover change.
19. New size tokens `reflow-min-width` 320px, `target-min` 24px; page-link `minHeight` 24px, `padding 0 {spacing.1}`, `gap {spacing.2}`.
20. Icon-per-surface mapping (open book, info circle, warning triangle, circle-✕, screen-with-play, file outline, padlock, upward arrow) and `focusable="false"`.

### B4. Contradictions

No blocking contradictions between DESIGN.md and EXPERIENCE.md or within either file. Checked: aria-disabled vs disabled wording (only Last opp and the demo upload use plain "disabled", and neither is among the five controls that can be disabled while focused); heading levels (IA, AF-8, DESIGN Typography/Components agree); demo behaviour (S4 locked bar, no not-saved note, no warning, Tilbake til start focus); focus rules (single source in Focus management, repeated consistently in AF-1/AF-4/T-1).

Minor nits (non-blocking):

1. **Backdrop alpha:** YAML `#2A28238C` is 54.9% opacity, while the prose says `rgb(42 40 35 / 0.55)`. The contrast table's "3.68:1 over background" matches `8C`, but exactly 0.55 gives 3.72:1. Pick one value; both pass.
2. **Typography for h3/h4:** the panel `h3` and the quiz-question `h4` have no typography role (DESIGN Typography maps Heading to h2 only; quiz heading size is still open in DESIGN OQ1). This is a gap, not a conflict.
3. **`accept` example** includes `.pdf,.txt`, which `/api/status` `accepted_types` (MIME only) does not provide. The spine should say that the extensions are a frontend mapping.
4. **Duplicated text in reading order:** the problem chip repeats the S5 headline as hidden text, so a screen reader reads it twice in linear reading (once in the chip, once in the error h2). This is not a live-region double announcement, but consider using the action text or a shorter label.

### B5. Mechanical

- **`/api/status`:** only existing fields are used: `mode`, `limits.max_upload_bytes` (→ `<max_upload_mb>`), `limits.max_pdf_pages`, `limits.max_text_chars` (explicitly not shown), `options`, `accepted_types`. No invented fields. Token ceiling and call cap are stated as not exposed and never shown.
- **Token references:** all 56 distinct `{colors|typography|rounded|spacing|components.*}` references resolve in DESIGN.md front matter. Runtime placeholders use angle brackets (`<max_upload_mb>`, `<max_pdf_pages>`, `<reference_id>`). The only other brace form is `{n}` inside the JSX page-link snippet; it has no dot, so a `{path.to.token}` resolver will not flag it.
- **Mockup links:** DESIGN intro and EXPERIENCE Foundation/Inspiration point to `mockups/direction-refined-rolig.html` (file exists). Alternatives stay in `.working/` (files exist).
- **Spines-win:** stated once in each file (DESIGN intro; EXPERIENCE Foundation).
- **Status:** both `status: draft`. EXPERIENCE now has a `description`.
- **Pending upstream items:** EXPERIENCE Open Questions lists items 1–6 (AD-13 heading; sample-PDF endpoint; PRD Quiz glossary; English UI wording in architecture; glossary convention; MB unit definition), each marked **NOT APPLIED**, matching the memlog. DESIGN points to this list.
- **Process provenance:** no "Step N" or "(user wording)" remnants. The "at least a minute" drift is gone.

### B6. Contrast recomputation (WCAG 2.x relative luminance)

| Pair | Spine value | Recomputed | Result |
|---|---|---|---|
| `on-primary` #FFFFFF on `primary-hover` #174B51 | 9.71:1 | 9.715:1 | matches, passes 4.5:1 |
| `primary` #1D5C63 on `hover-tint` #E2EEEC | 6.40:1 | 6.396:1 | matches, passes 4.5:1 |
| Dialog border `border` #857D6C vs dialog `surface` #FFFDF7 | 4.01:1 | 4.011:1 | matches, passes 3:1 |
| (extra) dialog `surface` vs backdrop over surface / background / white / teal | 3.48 / 3.68 / 3.44 / 11.10 | 3.481 / 3.680 / 3.439 / 11.099 (alpha `8C`) | matches, passes 3:1 |
| (extra) `text-muted` on `hover-tint` | 6.15:1 | 6.154:1 | matches |

## C. Medium and low findings

- **Medium (19):** 13 resolved, 4 partly resolved, 2 open.
  - Partly resolved: control typography, where settings values, the quiz heading and the demo heading are still open (OQ1); S5 exit, where changing settings alone is open (OQ11); file-choice feedback, where announcing a valid file is open (OQ10); locked-bar semantics, where the lock-text wording is open (OQ9).
  - Open: component paddings (OQ2); visual spec for unmocked surfaces, which is proposed but not decided (OQ3).
- **Low (20):** 16 resolved, 4 open: `spacing` group still holds non-spacing values (optional); S0/S0x content before mode is known (OQ15); demo fixed-settings note in demo S4 (OQ12); external-AI link target (OQ13).
- **Regressions:** none found.

## Overall verdict

**Ready to finalise once the memlog is updated.** All 1 critical and 7 high findings are resolved. The fixes are specific enough that a developer following the spines cannot reintroduce them, and T-1/T-3 give testable pass criteria. Approved copy is intact, superseded copy is gone, `/api/status` usage is clean, all tokens resolve and the recomputed contrast values match. Before setting `status: final`:

1. Get user approval for `Detaljnivå` (and acknowledge the page `<title>`).
2. Record the unrecorded decisions in B3 in the memlog, or have the user confirm them. Items 1 and 15–17 are the most visible.
3. Optionally align the backdrop alpha (0.55 vs `8C`).

The remaining Open Questions (OQ7–15 in EXPERIENCE, OQ1–3 in DESIGN) are honestly flagged and non-blocking. They can ship as open, or be answered first.
