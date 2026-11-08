---
name: AI Study Buddy
description: Visual identity for AI Study Buddy, a local single-page web app that turns one lecture Document into study material. Refined "Rolig notatbok" (calm notebook) direction, light mode only, no UI component library.
status: final
created: 2026-10-27
updated: 2026-11-08
sources:
  - ../../prds/prd-G42-eide-2026-09-16/prd.md
  - ../../architecture/architecture-G42-eide-2026-10-26/ARCHITECTURE-SPINE.md
colors:
  # Light mode only (no dark-mode tokens by decision).
  background: '#F7F3EA'
  surface: '#FFFDF7'
  text: '#2A2823'
  text-muted: '#5B5649'
  primary: '#1D5C63'
  primary-hover: '#174B51'
  on-primary: '#FFFFFF'
  hover-tint: '#E2EEEC'
  border: '#857D6C'
  border-subtle: '#DDD5C4'
  focus: '#1D5C63'
  notice-info-bg: '#E7EFF3'
  notice-info-fg: '#1F4A63'
  notice-info-border: '#1F4A63'
  notice-warning-bg: '#FBF1DC'
  notice-warning-fg: '#6E4600'
  notice-warning-border: '#6E4600'
  error-bg: '#FBE9E7'
  error-fg: '#8E2A20'
  error-border: '#8E2A20'
  demo-bg: '#E2EEEC'
  demo-fg: '#1D5C63'
  demo-border: '#1D5C63'
  disabled-bg: '#ECE7DC'
  disabled-fg: '#5F5A4E'
  disabled-border: '#857D6C'
  # Dialog backdrop: {colors.text} #2A2823 at 55% opacity (= rgb(42 40 35 / 0.55); hex alpha 8C = 140/255, the nearest 8-bit value to 55%).
  backdrop: '#2A28238C'
typography:
  # System font stack only: no web fonts, no CDN (AD-13: demo loads no external resources).
  caption:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.35'
  small:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.35'
  body:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.65'
  ui:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 17px
    fontWeight: '500'
    lineHeight: '1.35'
  answer:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 19px
    fontWeight: '400'
    lineHeight: '1.7'
  heading:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.25'
  subheading:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 17px
    fontWeight: '600'
    lineHeight: '1.35'
  brand:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.25'
  flashcard-term:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.25'
rounded:
  sm: 6px
  md: 10px
  lg: 12px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 32px
  '8': 48px
  # Size values below are MINIMUMS (CSS min-height / min-width), never fixed heights.
  control-min-height: 44px
  target-min: 24px
  reflow-min-width: 320px
  measure-answer: 65ch
  content-max-width: 960px
  border-hairline: 1px
  border-header-rule: 2px
  border-emphasis: 3px
  focus-ring-width: 3px
  focus-ring-offset: 2px
components:
  app-header:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    typography: '{typography.brand}'
    borderBottom: '{spacing.border-header-rule} solid {colors.primary}'
    logoColor: '{colors.primary}'
  demo-banner:
    backgroundColor: '{colors.demo-bg}'
    textColor: '{colors.demo-fg}'
    borderLeft: '{spacing.border-emphasis} solid {colors.demo-border}'
    rounded: '{rounded.sm}'
    typography: '{typography.small}'
    fontWeight: '500'
  notice-info:
    backgroundColor: '{colors.notice-info-bg}'
    textColor: '{colors.notice-info-fg}'
    borderLeft: '{spacing.border-emphasis} solid {colors.notice-info-border}'
    rounded: '{rounded.sm}'
    typography: '{typography.small}'
  notice-warning:
    backgroundColor: '{colors.notice-warning-bg}'
    textColor: '{colors.notice-warning-fg}'
    borderLeft: '{spacing.border-emphasis} solid {colors.notice-warning-border}'
    rounded: '{rounded.sm}'
    typography: '{typography.small}'
  not-saved-note:
    textColor: '{colors.text-muted}'
    typography: '{typography.small}'
  upload-bar:
    backgroundColor: '{colors.surface}'
    border: '{spacing.border-hairline} solid {colors.border}'
    rounded: '{rounded.md}'
    padding: '{spacing.3} {spacing.4}'
  upload-bar-locked:
    backgroundColor: '{colors.background}'
    border: '{spacing.border-hairline} dashed {colors.border}'
    rounded: '{rounded.md}'
  file-chip:
    backgroundColor: '{colors.surface}'
    border: '{spacing.border-hairline} solid {colors.border}'
    rounded: '{rounded.sm}'
    minHeight: '{spacing.control-min-height}'
    iconColor: '{colors.primary}'
    nameTextColor: '{colors.text}'
    metaTextColor: '{colors.text-muted}'
    metaTypography: '{typography.caption}'
  file-chip-problem:
    backgroundColor: '{colors.error-bg}'
    border: '{spacing.border-hairline} solid {colors.error-border}'
    textColor: '{colors.error-fg}'
    iconColor: '{colors.error-fg}'
  settings-field:
    labelTextColor: '{colors.text-muted}'
    labelTypography: '{typography.caption}'
    backgroundColor: '{colors.surface}'
    border: '{spacing.border-hairline} solid {colors.border}'
    rounded: '{rounded.md}'
    minHeight: '{spacing.control-min-height}'
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.on-primary}'
    border: '{spacing.border-hairline} solid {colors.primary}'
    rounded: '{rounded.md}'
    typography: '{typography.ui}'
    minHeight: '{spacing.control-min-height}'
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
    textColor: '{colors.on-primary}'
    border: '{spacing.border-hairline} solid {colors.primary-hover}'
  button-primary-disabled:
    # Applies to [aria-disabled="true"] (and :disabled if ever used).
    backgroundColor: '{colors.disabled-bg}'
    textColor: '{colors.disabled-fg}'
    border: '{spacing.border-hairline} dashed {colors.disabled-border}'
    rounded: '{rounded.md}'
    typography: '{typography.ui}'
    minHeight: '{spacing.control-min-height}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.primary}'
    border: '{spacing.border-hairline} solid {colors.primary}'
    rounded: '{rounded.md}'
    typography: '{typography.ui}'
    minHeight: '{spacing.control-min-height}'
  button-secondary-hover:
    backgroundColor: '{colors.hover-tint}'
    textColor: '{colors.primary}'
    border: '{spacing.border-hairline} solid {colors.primary}'
  button-secondary-disabled:
    # Applies to [aria-disabled="true"] (and :disabled if ever used).
    backgroundColor: '{colors.disabled-bg}'
    textColor: '{colors.disabled-fg}'
    border: '{spacing.border-hairline} dashed {colors.disabled-border}'
    rounded: '{rounded.md}'
    typography: '{typography.ui}'
    minHeight: '{spacing.control-min-height}'
  result-tab:
    textColor: '{colors.text-muted}'
    backgroundColor: transparent
    typography: '{typography.ui}'
    minHeight: '{spacing.control-min-height}'
    listBaseline: '{spacing.border-hairline} solid {colors.border-subtle}'
  result-tab-hover:
    backgroundColor: '{colors.hover-tint}'
  result-tab-selected:
    textColor: '{colors.primary}'
    fontWeight: '600'
    borderBottom: '{spacing.border-emphasis} solid {colors.primary}'
  flashcard:
    backgroundColor: '{colors.surface}'
    border: '{spacing.border-hairline} solid {colors.border-subtle}'
    rounded: '{rounded.lg}'
    termTypography: '{typography.flashcard-term}'
    answerTypography: '{typography.answer}'
    answerMaxWidth: '{spacing.measure-answer}'
    counterTextColor: '{colors.text-muted}'
    counterTypography: '{typography.small}'
  quiz-item:
    backgroundColor: '{colors.surface}'
    border: '{spacing.border-hairline} solid {colors.border-subtle}'
    rounded: '{rounded.lg}'
    answerRule: '{spacing.border-emphasis} solid {colors.primary}'
    answerMaxWidth: '{spacing.measure-answer}'
  page-link:
    textColor: '{colors.primary}'
    typography: '{typography.small}'
    textDecoration: underline
    minHeight: '{spacing.target-min}'
    padding: '0 {spacing.1}'
    gap: '{spacing.2}'
    separatorTextColor: '{colors.text-muted}'
  dialog:
    backgroundColor: '{colors.surface}'
    border: '{spacing.border-hairline} solid {colors.border}'
    rounded: '{rounded.lg}'
    textColor: '{colors.text}'
    typography: '{typography.body}'
    backdropColor: '{colors.backdrop}'
  loading-indicator:
    arcColor: '{colors.primary}'
    trackColor: '{colors.border-subtle}'
    textColor: '{colors.text}'
    subTextColor: '{colors.text-muted}'
  error-state:
    backgroundColor: '{colors.error-bg}'
    headlineColor: '{colors.error-fg}'
    headlineTypography: '{typography.heading}'
    actionTextColor: '{colors.text}'
    actionTypography: '{typography.body}'
    detailTextColor: '{colors.text-muted}'
    detailTypography: '{typography.small}'
    borderLeft: '{spacing.border-emphasis} solid {colors.error-border}'
    rounded: '{rounded.sm}'
  focus-ring:
    outline: '{spacing.focus-ring-width} solid {colors.focus}'
    outlineOffset: '{spacing.focus-ring-offset}'
---

# AI Study Buddy — Design Spine

Visual identity only. Behaviour, states, copy and accessibility rules live in [EXPERIENCE.md](EXPERIENCE.md). The approved visual reference is the refined mockup [mockups/direction-refined-rolig.html](mockups/direction-refined-rolig.html). Where the mockup and this spine (or EXPERIENCE.md) disagree, **the spines win**.

## Brand & Style

AI Study Buddy is a quiet study tool for one student, one lecture, one evening before an exam. The chosen direction is a refined **"Rolig notatbok" (calm notebook)**: warm off-white paper, one deep teal accent, calm system typography, flat surfaces with hairline borders. Nothing competes with the study content; the page should feel like a tidy notebook rather than an app dashboard.

Two elements are borrowed from the explored "Vennlig" direction: the flat **file chip** (clear presentation of the uploaded file) and a slightly more prominent **app header** (24px bold "AI Study Buddy", teal logo mark, 2px teal bottom rule).

Explored alternatives, not chosen (draft working files, kept for traceability only): `.working/direction-rolig-notatbok.html` (the unrefined foundation), `.working/direction-vennlig.html`, `.working/direction-akademisk.html`, `.working/direction-hoykontrast.html`, index `.working/directions-index.html`.

**Light mode only** for the MVP. No dark mode tokens exist and none should be added.

## Colors

All contrast values were verified by calculation (WCAG 2.x relative luminance); every pair in the table below passes. The visual layout is still to be eyeballed in the implemented app.

- **Paper `{colors.background}` (#F7F3EA)** — page background; also the fill of the locked upload bar.
- **Surface `{colors.surface}` (#FFFDF7)** — header band, upload bar, file chip, inputs, flashcard and quiz cards, secondary buttons, dialog.
- **Ink `{colors.text}` (#2A2823)** — body text, study content, error action text, dialog text; also the base of the dialog backdrop.
- **Muted `{colors.text-muted}` (#5B5649)** — field labels, file-chip meta, flashcard counter, the "not saved" note, unselected tabs, the backend detail line in the error state, the separator between page links. Never for study content.
- **Teal `{colors.primary}` (#1D5C63)** — the single accent: primary buttons, secondary button text/border, selected-tab indicator, page links, file icon, logo mark, header rule, loader arc. `{colors.on-primary}` (#FFFFFF) is text on teal.
- **Hover** — `{colors.primary-hover}` (#174B51, a darker teal) is the primary-button fill on hover; `{colors.hover-tint}` (#E2EEEC, the same tint as the DEMO banner) is the hover background of secondary buttons and result tabs. Hover is a subtle extra cue only (see Components).
- **Control border `{colors.border}` (#857D6C)** — every *meaningful* boundary: inputs, upload bar, file chip, locked-bar dashed border, dialog border.
- **Decorative line `{colors.border-subtle}` (#DDD5C4)** — card edges, tab-list baseline, loader track, flashcard answer divider. **Decorative only — never carries meaning** (it does not meet 3:1).
- **Focus `{colors.focus}` (#1D5C63)** — the focus ring (see Components).
- **Backdrop `{colors.backdrop}`** — `{colors.text}` at 55% opacity (`rgb(42 40 35 / 0.55)`), the dimmed backdrop behind the Ny fil dialog.
- **Notice tints** — each notice has its own calm tint plus an ink colour used for text, icon and the 3px left rule:
  - info `{colors.notice-info-bg}` / `{colors.notice-info-fg}` / `{colors.notice-info-border}` — external-AI notice, skipped-pages notice;
  - warning `{colors.notice-warning-bg}` / `{colors.notice-warning-fg}` / `{colors.notice-warning-border}` — Verification Notice;
  - error `{colors.error-bg}` / `{colors.error-fg}` / `{colors.error-border}` — error state, problem file chip;
  - demo `{colors.demo-bg}` / `{colors.demo-fg}` / `{colors.demo-border}` — DEMO banner;
  - disabled `{colors.disabled-bg}` / `{colors.disabled-fg}` / `{colors.disabled-border}` — disabled primary and secondary buttons.

Load-bearing contrast pairs:

| Pair | Ratio | Requirement |
|---|---|---|
| `text` on `background` | 13.30:1 | text ≥ 4.5:1 |
| `text` on `surface` | 14.48:1 | text ≥ 4.5:1 |
| `text-muted` on `background` / `surface` | 6.60:1 / 7.19:1 | text ≥ 4.5:1 |
| `primary` on `background` / `surface` (links, selected tab, secondary button) | 6.86:1 / 7.47:1 | text ≥ 4.5:1 |
| `on-primary` on `primary` | 7.60:1 | text ≥ 4.5:1 |
| `on-primary` on `primary-hover` (primary button, hover) | 9.71:1 | text ≥ 4.5:1 |
| `primary` / `text-muted` on `hover-tint` (secondary button / tab, hover) | 6.40:1 / 6.15:1 | text ≥ 4.5:1 |
| `notice-info-fg` on `notice-info-bg` | 8.13:1 | text ≥ 4.5:1 |
| `notice-warning-fg` on `notice-warning-bg` | 7.37:1 | text ≥ 4.5:1 |
| `error-fg` on `error-bg` / `text` on `error-bg` | 7.16:1 / 12.56:1 | text ≥ 4.5:1 |
| `text-muted` on `error-bg` (error detail line) | 6.24:1 | text ≥ 4.5:1 |
| `demo-fg` on `demo-bg` | 6.40:1 (lowest text) | text ≥ 4.5:1 |
| `disabled-fg` on `disabled-bg` | 5.57:1 | exempt, still passes |
| `focus` on `background` / `surface` | 6.86:1 / 7.47:1 | non-text ≥ 3:1 |
| `focus` on notice-info / warning / error / demo tints | 6.53:1 / 6.77:1 / 6.48:1 / 6.40:1 | non-text ≥ 3:1 |
| `border` on `surface` / `background` | 4.01:1 / 3.68:1 | non-text ≥ 3:1 |
| dialog `surface` against the dimmed backdrop (backdrop over `surface` / `background` / lightest tint) | 3.48:1 / 3.68:1 / ≥ 3.72:1 (3.44:1 over pure white pixels) | non-text ≥ 3:1 |
| `disabled-border` on `disabled-bg` | 3.31:1 (lowest non-text) | exempt, still passes |

Hard rule (AF-9 in EXPERIENCE.md): body text ≥ 4.5:1; large text, icons and control borders ≥ 3:1. Colour is never the only signal (AF-10): every notice, error and the DEMO banner carries an icon and text.

## Typography

One system font stack (`system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`); no web fonts, no CDN — required anyway because demo mode loads no external resources (AD-13).

| Role | Token | Size / weight / line-height | Used for |
|---|---|---|---|
| Caption | `{typography.caption}` | 14 / 400 / 1.35 | field labels, file-chip meta |
| Small | `{typography.small}` | 15 / 400 / 1.35 | notices, not-saved note, flashcard counter, page links, file name |
| Body | `{typography.body}` | 17 / 400 / 1.65 | base text, Sammendrag, Nøkkelbegreper explanations, dialog text |
| UI | `{typography.ui}` | 17 / 500 / 1.35 | buttons (primary and secondary) and result tabs |
| Answer | `{typography.answer}` | 19 / 400 / 1.7 | flashcard answers |
| Heading | `{typography.heading}` | 20 / 600 / 1.25 | h2: error headline, section headings |
| Subheading | `{typography.subheading}` | 17 / 600 / 1.35 | h3: tab panel heading (the tab name); h4: quiz question (composed from the approved 17px size and 600 weight — no new scale step) |
| Brand | `{typography.brand}` | 24 / **700** / 1.25 | "AI Study Buddy" (h1) in the header — the only bold-700 text |
| Flashcard term | `{typography.flashcard-term}` | 28 / 600 / 1.25 | flashcard front (term/question) |

Weights: 400 regular, 500 medium (buttons, tabs, file name, DEMO banner), 600 semibold (headings, selected tab, flashcard term), 700 brand only. Longer answers never exceed `{spacing.measure-answer}` (65ch). Long words in terms and answers wrap (`overflow-wrap: anywhere`) so they never force horizontal scrolling.

## Layout & Spacing

Spacing scale: `{spacing.1}` 4 · `{spacing.2}` 8 · `{spacing.3}` 12 · `{spacing.4}` 16 · `{spacing.5}` 20 · `{spacing.6}` 24 · `{spacing.7}` 32 · `{spacing.8}` 48 px.

Single page, single column, top to bottom: header band → notices → upload + settings bar (one horizontal row: Last opp + file chip, three settings fields, Generer) → results area. Page content is centred with a maximum width of `{spacing.content-max-width}` (960px); flashcard and quiz answers additionally stay within `{spacing.measure-answer}` (65ch). Vertical space above the results area is deliberately tight (header 12px padding, notices 8px apart, upload bar 12px padding) so the tabs and the study content sit high on a laptop screen. Header, DEMO banner and notices are in normal flow — **never sticky or fixed** (keeps focused content from being covered, WCAG 2.4.11).

All size values are **minimums**: controls (buttons, tabs, inputs, file chip) are at least `{spacing.control-min-height}` (44px) tall (CSS `min-height`, padding for rhythm, never a fixed `height`); nothing interactive is smaller than `{spacing.target-min}` (24×24px). No `overflow: hidden` on text, except the file-name ellipsis in the file chip, which falls back to wrapping (`overflow-wrap: anywhere`) at narrow widths.

Laptop/desktop browser only; no breakpoints were decided. Zoom and reflow (AF-11 in EXPERIENCE.md):

- **200% zoom:** no lost or overlapping content; the upload bar wraps its fields onto new lines.
- **Reflow at `{spacing.reflow-min-width}` (320 CSS px, ≈ 400% zoom on a laptop, WCAG 1.4.10):** no two-dimensional scrolling (vertical scrolling only). The result tab list wraps onto several lines (`flex-wrap: wrap`); every button row wraps (upload bar, Ny fil / Tilbake til start row with the not-saved note or demo heading, Forrige / Neste row, quiz reveal row, page-link row, dialog buttons); long words wrap.

## Elevation & Depth

Flat. **No shadows** on the app (the mockup's shadow belongs to the fake browser frame only). Depth comes from tonal layering only: `{colors.surface}` cards and bars on `{colors.background}` paper, separated by 1px borders. The locked upload bar drops back to the paper colour with a dashed border to read as "not editable right now". The only overlay is the Ny fil dialog, separated by its border and the dimmed `{colors.backdrop}` — still no shadow.

## Shapes

- `{rounded.sm}` 6px — file chip, notices, DEMO banner, error state.
- `{rounded.md}` 10px — buttons, upload bar, inputs/selects.
- `{rounded.lg}` 12px — flashcard and quiz cards, dialog.

Border widths: `{spacing.border-hairline}` 1px for all boundaries; `{spacing.border-header-rule}` 2px for the header rule; `{spacing.border-emphasis}` 3px for notice left rules, the selected-tab indicator and the quiz-answer rule; focus ring `{spacing.focus-ring-width}` 3px at `{spacing.focus-ring-offset}` 2px offset.

## Components

Visual specs only; behaviour is in EXPERIENCE.md → Component Patterns. No UI component library is used.

- **Icons** — inline SVG only (stroke `currentColor`, taken from the refined mockup); **no icon library**, no icon font, no external assets. Every icon is decorative: `aria-hidden="true"` and `focusable="false"`; the adjacent text carries the meaning. Icon per surface: logo mark (open book) in the header; info circle (`i`) for info notices; warning triangle (`!`) for the Verification Notice; circle with ✕ for the error state and the problem file chip; screen-with-play symbol for the DEMO banner; file outline in the file chip; padlock for the locked state; upward arrow in Last opp.
- **App header** — `{colors.surface}` band, 2px `{colors.primary}` bottom rule, teal logo mark (30px in the mockup) + "AI Study Buddy" (h1) in `{typography.brand}`.
- **DEMO banner** — demo tint, 3px left rule in `{colors.demo-border}`, icon + text, `{typography.small}` at weight 500, single line where possible.
- **Notice (info / warning)** — compact: icon + text, slim padding, distinct tint, 3px left rule in the notice ink colour, `{typography.small}` (line-height 1.35 per the token), single line where possible; links inside use the notice ink colour, underlined.
- **Not-saved note** — plain `{colors.text-muted}` text in `{typography.small}`, no box; sits on the same row as the Ny fil button (the row wraps at narrow widths). Real mode only (not shown in demo S4).
- **Upload bar** — `{colors.surface}`, 1px `{colors.border}`, `{rounded.md}`. **Locked** variant: `{colors.background}` fill, dashed border, settings shown as plain read-only values (no input chrome), Generer shown in the disabled style. Demo S4 shows the bar in the locked variant with the fixed settings. Wraps its fields onto new lines when the row does not fit (no horizontal scrolling).
- **File chip** — flat (no shadow): file icon in `{colors.primary}`, file name (weight 500, truncated with ellipsis), meta line "type · actual file size" in `{colors.text-muted}`, lock icon when the bar is locked. **Problem** variant: error tint, `{colors.error-border}` border, ✕ icon, all chip text in `{colors.error-fg}`; the problem is also stated in text (see EXPERIENCE.md → File chip). File sizes in the mockup ("2,4 MB", "3,1 MB") are illustrative; the app shows the actual size, formatted with a Norwegian decimal comma (e.g. "2,4 MB").
- **Settings field** — visible label above in `{typography.caption}` muted; select or text input on `{colors.surface}` with 1px `{colors.border}`, `{rounded.md}`, min 44px.
- **Button — primary** (Last opp, Generer, Vis eksempel, Prøv igjen, Fortsett in the Ny fil dialog) — teal fill, white text, `{rounded.md}`, min 44px, `{typography.ui}` (17px / 500). **Hover**: fill and border `{colors.primary-hover}` (white text 9.71:1). **Disabled** (`button-primary-disabled`, applied to `[aria-disabled="true"]`): `{colors.disabled-bg}` fill, `{colors.disabled-fg}` text, dashed `{colors.disabled-border}`, no hover change. Never opacity alone.
- **Button — secondary** (Ny fil, Tilbake til start, Vis svar / Skjul svar, Forrige / Neste, Avbryt in the Ny fil dialog) — `{colors.surface}` fill, teal text and 1px teal border, `{typography.ui}` (17px / 500), min 44px. **Hover**: `{colors.hover-tint}` background. **Disabled** (`button-secondary-disabled`, applied to `[aria-disabled="true"]`, e.g. Forrige on the first card, Neste on the last): same disabled style as the primary button — `{colors.disabled-bg}` fill, `{colors.disabled-fg}` text, dashed `{colors.disabled-border}`, no hover change.
- **Hover rule (all controls)** — hover is subtle and never the only indicator: buttons keep their label and border, tabs keep the selected-tab indicator, links stay underlined, and keyboard focus is always shown by the focus ring.
- **Result tabs** — simple underlined tabs on a 1px `{colors.border-subtle}` baseline; `{typography.ui}` (17px / 500); unselected `{colors.text-muted}`; selected `{colors.primary}`, weight 600, 3px teal bottom indicator. **Hover**: `{colors.hover-tint}` background. Min 44px tall. Counts in the label: "Flashkort (8)", "Quiz (6)". The tab list wraps onto several lines at narrow widths. The tab panel itself is focusable and gets the standard focus ring.
- **Flashcard** — one centred card, `{colors.surface}`, 1px `{colors.border-subtle}`, `{rounded.lg}`, no shadow. Top to bottom (visual order = reading order): counter centred in muted small text → term/question centred in `{typography.flashcard-term}` → `Vis svar` / `Skjul svar` button, centred → answer below a 1px divider, **left-aligned**, `{typography.answer}`, max 65ch, page link(s) underneath → Forrige / Neste row centred below the card.
- **Quiz item** — `{colors.surface}` card, 1px `{colors.border-subtle}`, `{rounded.lg}`. Top to bottom (visual order = reading order): numbered question as heading → `Vis svar` / `Skjul svar` button → revealed answer, left-aligned with a 3px `{colors.primary}` left rule, max 65ch → page link(s).
- **Page link** — `{colors.primary}`, underlined (3px offset), `{typography.small}`, label "PDF-side N ↗". Each link is a target of at least `{spacing.target-min}` (24px) height (`display: inline-flex`, `min-height: 24px`, horizontal padding `{spacing.1}`), with at least `{spacing.2}` (8px) between links. Several page references on one item sit inline on one row (wrapping when needed), one link per page, separated by a muted " · ": "PDF-side 4 ↗ · PDF-side 5 ↗". The "↗" and the separator are hidden from screen readers (EXPERIENCE.md → Page link). **Hover**: underline stays; no colour change needed.
- **Loading indicator** — small circular indicator (teal arc on `{colors.border-subtle}` track) beside two lines of text (main line in `{colors.text}`, second line muted). Static under `prefers-reduced-motion` (AF-13). No progress bar.
- **Error state** — error tint, 3px `{colors.error-border}` left rule, `{rounded.sm}`, error icon. Order top to bottom: headline (h2) in `{typography.heading}` `{colors.error-fg}` → action text in `{typography.body}` `{colors.text}` → backend detail line, smaller and muted (`{typography.small}`, `{colors.text-muted}`). Also used for S0x (server not reachable), with the `Prøv igjen` primary button below the action text. When the headline receives programmatic focus (`tabindex="-1"`) it may show the focus ring.
- **Demo results heading** — "Eksempelresultater (ikke generert nå)" as a heading (h2) on the same row as the Tilbake til start button (the row wraps at narrow widths).
- **Ny fil dialog** (`dialog`) — card style: `{colors.surface}` fill, **1px `{colors.border}` border** (4.01:1 against the dialog surface), `{rounded.lg}`, no shadow (consistent with Elevation). Text in `{typography.body}` `{colors.text}`. Buttons: `Fortsett` is the teal primary button, `Avbryt` the secondary button; the button row wraps at narrow widths. **Backdrop**: the native `::backdrop` filled with `{colors.backdrop}` (`rgb(42 40 35 / 0.55)`). The dialog edge (surface fill against the dimmed page) is ≥ 3.44:1 against everything it can sit on (3.48:1 over surface areas, 3.68:1 over the page background, 11.10:1 over teal), so the edge meets 3:1 even without the border.
- **Focus ring** — 3px solid `{colors.focus}`, 2px offset, on every focusable element (including tab panels and controls in the aria-disabled state); always visible on keyboard focus. Implemented globally, e.g. `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px }`; never removed.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use `{colors.primary}` as the only accent | Add a second accent or decorative colour |
| Use `{colors.border}` for any boundary that carries meaning | Use `{colors.border-subtle}` for anything meaningful |
| Pair every notice/error/banner tint with an icon and text | Signal state by colour alone |
| Keep surfaces flat with 1px borders | Add shadows, gradients or elevation |
| Centre the flashcard term; left-align answers at max 65ch | Centre long answer text |
| Keep controls ≥ 44px tall (min-height) and the 3px focus ring visible | Use fixed heights, or remove/restyle the focus outline away |
| Use subtle hover as an extra cue only | Make hover the only indicator of anything |
| Use inline SVG icons with `aria-hidden="true"` | Add an icon library, icon font or external assets |
| Use the system font stack | Load web fonts or CDN assets |
| Show the actual uploaded file size | Hard-code the mockup's example sizes |
| Wrap rows and tabs at narrow widths | Allow horizontal (two-dimensional) scrolling |
| Light mode only | Add dark-mode styles in the MVP |

## Open Questions

Items 1–3 are deferred to implementation (non-blocking; user-approved deferral 2026-11-08) and revisited at the point named; item 4 is a record only.

1. **Type sizes outside the approved scale (remaining).** Buttons and tabs are now decided (`{typography.ui}`, 17px / 500). The refined mockup still uses 16px (settings-field values), 18px (quiz question heading), 22px (demo results heading) and 13px (mock browser chrome only), none of which are in the approved scale (14/15/17/19/20/24/28). Which scale step should settings-field values and the demo results heading use? (The quiz question heading now uses `{typography.subheading}`.) *Revisit:* at the first styled component; pick existing scale steps only.
2. **Off-scale paddings in the mockup** (notice 7/14px, flashcard card 36/48px, quiz card 18/24px, page side padding 56px). Padding tokens were not recorded except via the spacing scale; confirm whether to snap to the nearest scale step and add `padding` entries to the notice, flashcard, quiz-item, error-state and dialog tokens. *Revisit:* at the first styled component; snap to `{spacing.*}` steps.
3. **Unmocked surfaces**: S0 Checking, S1 Empty (real and demo) guidance blocks, S2 File ready, the browser pre-check inline message, the demo fixed-settings note, the Sammendrag and Nøkkelbegreper panels, the dialog. Their visuals follow the tokens above; no frame exists. Proposed reuse (not decided): pre-check message in `{colors.error-fg}` text with the error icon under the file chip; fixed-settings note as `notice-info`; Nøkkelbegreper term in `{typography.body}` at weight 600, explanation in `{typography.body}`, page links in a `page-link` row. *Revisit:* when each surface is built, reusing existing components and tokens. (S0x uses the `error-state` component — see Components.)
4. **Mockup ↔ spine conflicts (resolved by the rule in the intro):** mockup URL bar shows `localhost:8000` (AD-3: app opened at `localhost:3000`) and `?demo=1` for demo (AD-4: mode fixed at backend startup via `AI_MODE`); demo frame 5 shows no Verification Notice (FR-6 / architecture notices convention: always with Results) and no upload bar (decided: demo S4 shows the locked upload bar with the fixed settings); mockup labels `◀ Forrige` / `Neste ▶` (spine: `Forrige` / `Neste`); mockup places `Vis svar` after the answer (spine: the reveal button precedes the answer in visual and DOM order); mockup changes the region name to `Opplasting og innstillinger (låst)` (spine: region names are fixed); mockup uses `role="alert"` on the error state and a state-inserted `role="status"` on loading (spine: one persistent status region; errors announced by focus — EXPERIENCE.md AF-6); mockup puts `role="tabpanel"` on the quiz `<ol>` and has no tab ids (spine: EXPERIENCE.md AF-3); mockup type sizes 16/18/22px (see Open Question 1).

The upstream PRD and architecture changes that this design depended on were applied and verified on 2026-11-08 (PRD commit `50b403d`, architecture commit `44059f6`), including the binary 10 MB definition used for file sizes and the demo sample-PDF endpoint; history in [EXPERIENCE.md → Open Questions](EXPERIENCE.md#open-questions).
