---
name: AI Study Buddy
description: Behaviour, states, exact Norwegian interface copy, accessibility floor and key flows for AI Study Buddy, a local single-page web app that turns one lecture Document into study material.
status: final
created: 2026-10-27
updated: 2026-11-08
sources:
  - ../../prds/prd-G42-eide-2026-09-16/prd.md
  - ../../architecture/architecture-G42-eide-2026-10-26/ARCHITECTURE-SPINE.md
---

# AI Study Buddy — Experience Spine

## Foundation

- **Form factor:** laptop/desktop web browser only. Local app: frontend opened at `http://localhost:3000`, backend on `127.0.0.1:8000` (AD-3). No deployment, so no phone or tablet access.
- **Stack:** Next.js frontend (App Router, TypeScript, React) as a thin client over the FastAPI backend (AD-2). **No UI component library was chosen**; components are built directly from the tokens in [DESIGN.md](DESIGN.md). Icons are inline SVG (no icon library).
- **Visual identity:** [DESIGN.md](DESIGN.md). Token references below use `{path.to.token}` and resolve there. Placeholders in angle brackets (`<max_upload_mb>`, `<max_pdf_pages>`, `<reference_id>`) are **runtime values**, not token references.
- **Modes:** `real` and `demo`, fixed at backend startup (AD-4) and read by the frontend from `GET /api/status`. Demo and live generation never mix. Demo mode makes **no external network or AI-provider calls**; only local browser-to-backend HTTP on the laptop is used (AD-3, AD-13).
- **Product rules inherited, not re-decided here:** one upload → one Generation Pass → Results (FR-3); zero persistence (AD-7); plain-text rendering of all AI and backend text (AD-18); closed error-code list with frontend-owned headlines and the backend `message` as a secondary detail line (AD-11); detail level `brief | standard | detailed`, output language `nb | en` (AD-17); Quiz display-only in v1 (PRD §6.2).
- **Visual reference:** [mockups/direction-refined-rolig.html](mockups/direction-refined-rolig.html) — the approved refined mockup (frames: Flashkort hero, Quiz, error, loading, demo). Explored alternatives stay in `.working/` (see Inspiration). **The spines win on any conflict with mockups.**

## Information Architecture

One page, no routes, no separate results screen. Page `<title>`: `AI Study Buddy`. `<html lang="nb">`. Regions top to bottom:

| # | Region | Landmark / name | Real mode | Demo mode |
|---|---|---|---|---|
| 1 | Header | `<header>`; `h1` `AI Study Buddy` | App name | App name + DEMO banner (always visible) |
| 2 | External-AI notice | inside `<main>` | Shown | Not shown (nothing is sent to AI) |
| 3 | Upload + settings bar | `<section aria-label="Opplasting og innstillinger">` (name never changes) | Last opp + file chip, Språk på resultatene, Detaljnivå, Emnekode (valgfritt), Generer | Upload disabled, settings shown fixed, fixed-settings note, `Vis eksempel` replaces Generer; locked in demo S4 |
| 4 | Results area | `<section aria-label="Resultater">` (name never changes) | Changes state: empty → loading → results or error | Same; results carry the demo heading |

Page content is centred with a maximum width of 960px (`{spacing.content-max-width}`). In keyboard tab order, the results area comes directly after the upload + settings bar.

**Heading outline:** `h1` `AI Study Buddy` (header) → `h2` in the results area: `Resultater` in real S4, the demo heading `Eksempelresultater (ikke generert nå)` in demo S4, the error headline in S5 / S0x → `h3` at the top of each tab panel (the tab's name, e.g. `Sammendrag`) → `h4` per quiz question inside the Quiz panel. Whether the real-S4 `h2` and the panel `h3`s are visible or visually hidden is open (see Open Questions).

**Results navigation** (S4): four tabs in fixed order **Sammendrag | Nøkkelbegreper | Flashkort | Quiz**, one panel visible at a time, Sammendrag selected first. Counts only on Flashkort and Quiz, e.g. "Flashkort (8)", "Quiz (6)". Switching tabs keeps position (Flashkort remembers the current card) and keeps revealed answers visible within the same results session. Above the tabs: Verification Notice (always), skipped-pages notice (when relevant), the not-saved note and the "Ny fil" button (real) / "Tilbake til start" (demo, no not-saved note).

**Leaving the region:** page links open the uploaded PDF (or, in demo, the bundled sample PDF) in a new browser tab. No other navigation exists. "Ny fil" (real) / "Tilbake til start" (demo) is the only way to start over.

## Voice and Tone

Microcopy rules (brand posture lives in DESIGN.md):

- Interface language is **Norwegian Bokmål** only; no language switch. Clear, natural Norwegian.
- **du-form**, short practical sentences.
- **Every problem message states the next action.** No blame.
- Say **"KI"**, never "AI", in Norwegian interface text. The product name stays **"AI Study Buddy"**.
- User-facing text may say **"appens server"** instead of "backend".
- **Retry wording never implies that a retry costs money** — whether a retry triggers another paid API call depends on where the original request failed. Messages say *when* to wait or retry, not what it costs.
- **Numeric limits are never hard-coded in UI text.** They are filled at runtime from `GET /api/status` → `limits`:
  - `<max_upload_mb>` — derived from `limits.max_upload_bytes`. Display rule (architecture AD-14): the **binary convention**, bytes ÷ 1,048,576, the same convention the backend uses for its limit (`max_upload_bytes` = 10,485,760 bytes = 10 MB), rounded to at most one decimal, with the Norwegian decimal comma (currently renders as `10`).
  - `<max_pdf_pages>` — `limits.max_pdf_pages` as an integer (currently renders as `80`).
  - `limits.max_text_chars` also exists; no interface text shows it.
  - The token ceiling and the per-startup KI call cap (AD-15) are **not** exposed by `/api/status` and are **never** shown as numbers anywhere in the UI.
- File sizes (the displayed limit and the uploaded file's actual size) use the same binary convention (bytes ÷ 1,048,576; 10 MB = 10,485,760 bytes, AD-14), at most one decimal and the Norwegian decimal comma, e.g. `2,4 MB`.
- The backend detail line (AD-11 `message`) follows the interface language (Norwegian) and is shown in plain text. Error order: headline → action text → backend detail line (smaller, muted).
- **Accessible name = visible label** for every control and link: no `aria-label` that differs from the visible text (WCAG 2.5.3). Exception by construction: page links add visually hidden text after the visible label (see Page link).

### Notices (exact text)

| Notice | When | Text |
|---|---|---|
| External-AI notice | Real mode, always | `Teksten i dokumentet ditt sendes til Anthropic, en ekstern KI-tjeneste, for å lage studiemateriell. AI Study Buddy lagrer ikke dokumentet eller resultatene. Les mer om hvordan Anthropic behandler data.` — the part `Les mer om hvordan Anthropic behandler data` is a link to Anthropic's official privacy/data-handling information (AD-7) |
| Verification Notice | Always with Results (both modes) | `Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.` |
| Skipped pages (3+) | `skipped_pages` has 3+ entries | Comma list with `og` before the last page: `PDF-side 2, 7 og 9 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.` |
| Skipped pages (plural) | `skipped_pages` has 2 entries | `PDF-side 2 og 7 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.` |
| Skipped pages (singular) | `skipped_pages` has 1 entry | `PDF-side 2 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.` |
| Not saved | Real mode S4 | `Resultatene lagres ikke. De forsvinner hvis du lukker eller laster inn siden på nytt.` |
| DEMO banner | Demo mode, always | `DEMO – du ser et ferdig eksempel. Ingen KI-tjeneste brukes, og egne filer kan ikke lastes opp.` |
| Demo fixed settings | Demo S1 | `Demoen viser ferdiglagde resultater på norsk bokmål med standard detaljnivå. Innstillingene kan ikke endres, og det lages ingen ny oversettelse.` |
| Demo results heading | Demo S4 | `Eksempelresultater (ikke generert nå)` |

(Page numbers in the skipped-pages examples are illustrative; the list comes from `skipped_pages`.)

### Screens and controls (exact text)

| Element | Text |
|---|---|
| App name | `AI Study Buddy` (also the page `<title>`) |
| Upload/settings region name | `Opplasting og innstillinger` |
| Results region name / real-S4 heading | `Resultater` |
| Upload action | `Last opp` |
| Generate action | `Generer` |
| Demo action (replaces Generer) | `Vis eksempel` |
| Result tabs | `Sammendrag`, `Nøkkelbegreper`, `Flashkort`, `Quiz` (counts: `Flashkort (8)`, `Quiz (6)`) |
| Output language field | label `Språk på resultatene`; options `Norsk bokmål` (`nb`, default) / `Engelsk` (`en`) |
| Detail level field | label `Detaljnivå`; options `Kort` (`brief`) / `Standard` (`standard`, default) / `Detaljert` (`detailed`) |
| Course code field | label `Emnekode (valgfritt)`; placeholder `f.eks. LOG201`; max length 100 characters |
| S1 Empty, real mode | `Last opp en PDF- eller TXT-fil (maks <max_upload_mb> MB) for å få sammendrag, nøkkelbegreper, flashkort og quizspørsmål. PDF-filer får også sidehenvisninger.` (currently renders `maks 10 MB`) |
| S1 Empty, demo mode | `Prøv appen med en ferdig eksempelforelesning om lagerstyring og logistikk. Trykk «Vis eksempel» for å se resultatene.` |
| S0 Checking | `Starter …` |
| S3 Loading | `Lager studiemateriell … Dette kan ta opptil to minutter.` |
| S3 Loading, demo mode | `Henter eksempel …` |
| Browser pre-check: type | `Bare PDF- og TXT-filer støttes.` |
| Browser pre-check: size | `Filen er større enn <max_upload_mb> MB. Velg en mindre fil.` (currently renders `10 MB`) |
| Page link (visible) | `PDF-side N ↗`; several on one item: `PDF-side 4 ↗ · PDF-side 5 ↗` |
| Page link (accessible name, AF-7) | `PDF-side N, åpnes i ny fane` |
| Flashcard counter | `Kort N av M` |
| Reveal toggle | `Vis svar` / `Skjul svar` |
| Flashcard navigation | `Forrige` / `Neste` |
| Start over (real) | `Ny fil` |
| Ny fil dialog | `Resultatene blir ikke lagret og vil forsvinne. Vil du fortsette?` buttons `Avbryt` / `Fortsett` |
| Start over (demo) | `Tilbake til start` |
| S0x retry | `Prøv igjen` |
| Status announcement on results (AF-6) | `Resultatene er klare` |

### Error headline + action per code (exact text)

Order in the error state: headline → action text → backend detail line (`message`, smaller and muted). No message claims a retry costs money.

| Code | Headline | Action text |
|---|---|---|
| server unreachable (frontend, `/api/status` fails) | `Får ikke kontakt med appens server` | `Sjekk at serveren er startet, og trykk «Prøv igjen».` |
| `unsupported_file_type` | `Filtypen støttes ikke` | `Velg en PDF- eller TXT-fil.` |
| `bad_text_encoding` | `Tekstfilen kan ikke leses` | `Lagre filen som UTF-8, eller velg en annen fil.` |
| `unreadable_file` | `Filen kan ikke åpnes` | `PDF-en kan være skadet eller passordbeskyttet. Velg en annen fil.` |
| `no_extractable_text` | `Fant ingen lesbar tekst` | `Skannede PDF-er og sider med bare bilder støttes ikke. Velg en PDF med tekst du kan markere.` |
| `file_too_large` | `Dokumentet er for stort` | per `limit`: `bytes` → `Filen er større enn <max_upload_mb> MB.` (currently `10 MB`) · `pages` → `PDF-en har mer enn <max_pdf_pages> sider.` (currently `80 sider`) · `characters` → `Dokumentet inneholder for mye tekst.` — `tokens` → `Dokumentet inneholder for mye tekst.` (same text as `characters`; no number shown) — each followed by `Prøv med én forelesning om gangen.` |
| `insufficient_content` | `For lite innhold` | `Dokumentet har for lite fagstoff til et fullt studiesett. Velg et dokument med mer innhold.` |
| `generation_in_progress` | `En generering pågår allerede` | `Vent til den er ferdig – den kan være startet i en annen fane – og prøv igjen.` |
| `ai_unavailable` (incl. > 90 s timeout) | `KI-tjenesten svarte ikke` | `Tjenesten kan være treg eller utilgjengelig akkurat nå. Vent litt, og prøv igjen.` |
| `ai_rate_limited` | `For mange forespørsler` | `Du har sendt for mange forespørsler på kort tid. Vent litt før du prøver igjen.` |
| `ai_output_invalid` | `Svaret besto ikke kvalitetskontrollen` | `KI-svaret var ufullstendig eller manglet gyldige sidehenvisninger, så det vises ikke. Du kan prøve igjen.` |
| `ai_credits_exhausted` | `KI-kreditten er brukt opp` | `Det må fylles på kreditt i Anthropic-kontoen. Last deretter inn siden på nytt. Demoen fungerer fortsatt.` |
| `session_call_limit_reached` | `Grensen for KI-kall er nådd` | `Appen har en grense for antall KI-kall per oppstart for å beskytte budsjettet. Start serveren på nytt, og last inn siden på nytt.` |
| network failure during generation (frontend) | `Mistet kontakten med serveren` | `Sjekk at serveren kjører, og prøv igjen.` |
| `internal_error` | `Noe gikk uventet galt` | `Prøv igjen. Hvis feilen gjentar seg, oppgi referansen: <reference_id>.` (`<reference_id>` = the envelope's `reference_id`) |
| `invalid_request` | `Forespørselen var ugyldig` | `Last inn siden på nytt, og prøv igjen.` |
| unknown / other, incl. `demo_mode_no_uploads`, `demo_not_enabled`, `not_found`, `method_not_allowed` | `Noe gikk galt` | `Last inn siden på nytt, og prøv igjen.` |

## Language & Terminology

- **Interface text:** Norwegian Bokmål, exactly as in the tables above. Approved labels are preserved character-for-character.
- **Technical documentation** (BMAD documents including this one, headings, explanations): English, aligned with the English IBE160 course manual. Standard technical terms (backend, frontend, API, JSON, state, workflow, FastAPI, Next.js) stay English.
- **Never translated:** code identifiers, error codes, filenames, AD IDs, programming terminology.
- **When explaining to the user:** use the English technical term with a brief explanation.
- **Existing PRD/architecture terminology** is never changed without identifying the change and asking for approval.
- **Generated content language** is the user's choice (`nb` default, `en` selectable) and is independent of the interface language.
- **Code vs UI terms:** code uses the PRD Glossary terms; the UI uses the approved Norwegian labels below (matching architecture convention applied in architecture commit `44059f6`; see Open Questions item 5).

PRD Glossary ↔ interface label:

| PRD / architecture term | Interface label |
|---|---|
| Summary | Sammendrag |
| Key Concepts | Nøkkelbegreper |
| Flashcard Set | Flashkort |
| Quiz | Quiz |
| Page Reference ("PDF page N") | PDF-side N |
| Verification Notice | (notice text above) |
| Generation Inputs: output language / detail level / course code | Språk på resultatene / Detaljnivå / Emnekode (valgfritt) |
| Generate | Generer |

## Component Patterns

Behavioural rules. Visual specs: DESIGN.md → Components. Focus rules: Interaction Primitives → Focus management (single source). Announcements: AF-6 (single source).

| Component | Behavioural rules |
|---|---|
| **Upload bar** (`upload-bar`) | `<section aria-label="Opplasting og innstillinger">`; the name never changes with the lock state. Holds Last opp, file chip, three settings fields and Generer. **Locked** (read-only, showing file name and settings used, `upload-bar-locked`) while generation runs (S3) **and** while results are shown (S4). Locked settings are rendered as a description list (`<dl>`: `<dt>Språk på resultatene</dt><dd>Norsk bokmål</dd>` etc.) so label and value stay associated; the lock icon is `aria-hidden="true"` and the lock state is also given in text (wording open — see Open Questions). Unlocks on failure (S5) so the user can correct and retry. Settings defaults: Norsk bokmål / Standard / empty course code; option lists and defaults come from `/api/status` (AD-17). Demo S4: shown locked with the fixed settings. Wraps per AF-11. |
| **Last opp** | A real `<button>` that opens a visually hidden native `<input type="file">` (one file; `accept` = the MIME types from `/api/status` `accepted_types` plus the extensions `.pdf,.txt`, which the frontend adds itself because `/api/status` sends MIME types only — e.g. `.pdf,.txt,application/pdf,text/plain`. This filter and all browser pre-checks are **convenience only**: the backend still validates file type by content signature, size and every other applicable constraint, per AD-2 and AD-14). Choosing a new file replaces the current one. Disabled in demo mode and while locked. The only upload path: **no drag-and-drop** in the MVP. |
| **File chip** (`file-chip`) | Appears once a file is selected: file icon, file name, type and the **actual** file size (Norwegian decimal comma, e.g. `2,4 MB`); lock icon while the bar is locked. **Problem** variant (`file-chip-problem`) when the browser pre-check fails or the file was rejected for invalid file / too big / too little content. The problem chip **states the problem in text**, not only by ✕ icon and colour: it contains (visually hidden if not shown) the applicable approved message — the pre-check message, or the S5 error headline. The ✕ icon is `aria-hidden="true"`. |
| **Browser pre-check** | On file selection, check type and size (`<max_upload_mb>`, from `/api/status`) for friendliness only (AD-2). On failure: inline message (`Bare PDF- og TXT-filer støttes.` / `Filen er større enn <max_upload_mb> MB. Velg en mindre fil.`) with an `id`; `Last opp` (and Generer while aria-disabled for this reason) points to it with `aria-describedby`; the message is announced through the status region (AF-6); chip in problem state; Generer aria-disabled until the file is replaced. |
| **Settings fields** (`settings-field`) | Visible labels with `<label for>`. Språk på resultatene and Detaljnivå are selects rendered from `/api/status`; Emnekode (valgfritt) is an optional text input with placeholder, `maxlength="100"` (matches AD-17) and `autocomplete="off"`. In demo mode the selects are shown fixed (Norsk bokmål, Standard) with the fixed-settings note. |
| **Generer** (`button-primary`) | `type="button"`, never native `disabled`: unavailable states use `aria-disabled="true"` (Interaction Primitives → Temporarily unavailable controls). Unavailable with no file, with a problem file, while locked, after a hard-stop error, and after `invalid_request` or an unknown error code. Available in S2 and only after errors known to be safe to retry (Temporary group). While a pass runs it stays aria-disabled until a reply or network error arrives, and **never submits a duplicate request** (guarded handler, in addition to the backend `generation_in_progress` guard, AD-16); no client timeout shorter than backend AI timeout + 30 s (AD-16). Optional: `aria-describedby` to the S1 guidance or the current error action text while unavailable. |
| **Vis eksempel** (demo, `button-primary`) | Replaces Generer in demo mode; starts the demo pass (`POST /api/demo`) → short S3 (`Henter eksempel …`) → demo S4. aria-disabled (not native `disabled`) while the demo pass runs and while the bar is locked; never submits a duplicate request. Never offers live generation. |
| **Result tabs** (`result-tab`) | Full WAI-ARIA APG tabs pattern (AF-3). Order Sammendrag, Nøkkelbegreper, Flashkort, Quiz; Sammendrag selected on entry to S4. Left/Right arrows move between tabs with **automatic activation**, wrapping at the ends; `Home` / `End` jump to the first / last tab. One `Tab` stop for the whole tab list (roving tabindex); the next `Tab` goes into the selected panel. The visible label (incl. count) is the accessible name. Switching keeps each panel's position and revealed answers. |
| **Sammendrag panel** | Summary as plain text: **line breaks in AI text are preserved** (`white-space: pre-line`), no Markdown interpretation (AD-18). Page links only where the Summary has pages (optional per AD-10). |
| **Nøkkelbegreper panel** | Each key concept as plain text (term + explanation, line breaks preserved) with its page links. |
| **Flashcard** (`flashcard`) | One card at a time. DOM and reading order: counter `Kort N av M` → term → `Vis svar` / `Skjul svar` button → answer (+ page links) → `Forrige` / `Neste`. The counter is a polite live region present from the start of the panel (`<p aria-live="polite" aria-atomic="true">`), so `Kort N av M` is announced on Forrige/Neste; the term is not in the region. Each card starts with the answer hidden; `Vis svar` reveals and toggles to `Skjul svar` (`aria-expanded`, `aria-controls` = the answer's `id`; the collapsed answer is `hidden`; no `aria-label`, no `aria-pressed`). `Forrige` is aria-disabled on the first card, `Neste` on the last (focus stays on the button). Current card and revealed answers remembered across tab switches within the same results session; all answers reset to hidden on a new results session (Ny fil → Fortsett, Tilbake til start in demo, or any new pass). |
| **Quiz item** (`quiz-item`) | All questions listed as `<ol>` inside the Quiz panel (the list keeps its semantics; the panel is a wrapper element), one `li` per item with the question as `h4`. DOM and reading order per item: question → `Vis svar` / `Skjul svar` button → answer → page links. Each answer hidden by default with its own toggle (`aria-expanded`, `aria-controls`; collapsed answer `hidden`). Revealed answers stay visible across tab switches within the same results session and reset as Flashcard. **No** "Vis alle svar", no typing, selecting, scoring or saving (display-only v1). |
| **Page link** (`page-link`) | Clickable `PDF-side N ↗`; opens the PDF at page N in a new browser tab. Markup: `<a href={url + '#page=' + n} target="_blank" rel="noopener">PDF-side {n}<span aria-hidden="true"> ↗</span><span class="sr-only">, åpnes i ny fane</span></a>` — accessible name `PDF-side N, åpnes i ny fane`, no `aria-label`. Several page references on one item: one link per page, inline on one row (`PDF-side 4 ↗ · PDF-side 5 ↗`); the `·` separator is `aria-hidden="true"`. Target ≥ 24px (DESIGN.md → Page link). Real mode: the selected file is kept in browser memory for the current page session only and opened via a local object URL with a `#page=N` fragment, created once per results session and revoked on Fortsett; nothing is uploaded or stored again (AD-7). If a browser ignores the fragment, the PDF still opens and the `PDF-side N` label stays visible. Plain-text Documents have no page references, so no links. **Demo mode: clickable links that open the bundled sample PDF are required** (no non-clickable fallback). The link is `<NEXT_PUBLIC_API_BASE_URL>/api/demo/sample.pdf#page=N`, opened in a new tab; `GET /api/demo/sample.pdf` is a fixed, read-only, demo-only backend endpoint that serves only the bundled sample PDF (architecture AD-13). |
| **Notices** (`notice-info`, `notice-warning`, `demo-banner`) | Real text (not images), icon + text. Tints: info for the external-AI and skipped-pages notices, warning for the Verification Notice, demo for the DEMO banner. External-AI notice: real mode, always visible. Verification Notice: always with Results, without extra clicks (FR-6). Skipped-pages notice: only when `skipped_pages` is non-empty; singular/plural wording. DEMO banner: always in demo mode. None are dismissible. None are sticky or fixed. |
| **Not-saved note** (`not-saved-note`) | Real mode S4 only, next to Ny fil. It is the accessible explanation for the browser's leave/reload warning (whose text the browser controls). |
| **Ny fil** (real) | Only in S4. Opens the Ny fil dialog. |
| **Ny fil dialog** (`dialog`) | Native `<dialog>` opened with `showModal()` (background inert, `::backdrop` dimmed). `aria-labelledby` the question text `Resultatene blir ikke lagret og vil forsvinne. Vil du fortsette?`. Initial focus on `Avbryt` (`autofocus`). `Avbryt` (or `Esc`, handled through the `cancel` event as Avbryt) keeps everything and returns focus explicitly to Ny fil. `Fortsett` (primary button) disables the leave/reload warning, then clears results (including revealed answers) and the in-memory PDF and returns to S1 with default settings (no double confirmation); focus moves to `Last opp` after S1 renders. |
| **Tilbake til start** (demo) | Replaces Ny fil in demo S4. Returns directly to demo S1; revealed answers reset; focus moves to `Vis eksempel`. **No confirmation dialog and no leave/reload warning** — nothing is lost and the example can be shown again. Introduces no live-generation option. |
| **Loading indicator** (`loading-indicator`) | Animated indicator + loading text (real `Lager studiemateriell …`, demo `Henter eksempel …`); no fake progress bar, no elapsed-time counter, no cancel button. Static under `prefers-reduced-motion`; text stays (AF-13). The visible loading block has no live-region role itself (the shared status region announces it, AF-6). |
| **Error state** (`error-state`) | Headline (`<h2 tabindex="-1">`) → action text → backend detail line (smaller, muted) in the results area. No `role="alert"` and no status-region announcement: the error is announced once, by focus moving to the headline. File and settings stay visible (when safe to keep). |
| **Prøv igjen** (S0x, `button-primary`) | Re-checks the server (`/api/status`). While the re-check runs it stays in place with `aria-disabled="true"` (focus kept) and the S0x message stays; a repeated failure moves focus to the S0x headline again. |
| **Results arrival** | Focus does **not** move automatically when generation finishes (it stays on the aria-disabled Generer / Vis eksempel); `Resultatene er klare` is announced (AF-6). The results area follows the upload + settings bar directly in tab order, so it is reached with the next `Tab`. |

## State Patterns

### Real mode

| State | Trigger | Treatment |
|---|---|---|
| **S0 Checking** | Page load; calling `/api/status` | `Starter …` (not announced); no controls available. |
| **S0x Server not reachable** | `/api/status` fails | `error-state` with `Får ikke kontakt med appens server` / `Sjekk at serveren er startet, og trykk «Prøv igjen».` + `Prøv igjen` button; focus moves to the headline (as S5). |
| **S1 Empty** | Status OK, no file | External-AI notice; welcoming guidance (S1 real text); Last opp + settings active with defaults Norsk bokmål / Standard; Generer aria-disabled. |
| **S2 File ready** | File selected (also: a new file chosen while in S5) | File chip with name, type, actual size. Browser pre-check of type/`<max_upload_mb>`: on failure inline message, problem chip, Generer aria-disabled until replaced; on pass Generer available. |
| **S3 Loading** | Generer pressed | Animated indicator + `Lager studiemateriell … Dette kan ta opptil to minutter.`; everything locked; no progress bar, elapsed counter or cancel. Announced via the status region. |
| **S4 Results** | Success envelope (`mode: "real"`) | `h2` `Resultater`, Verification Notice, skipped-pages notice if any, not-saved note, Ny fil, tabs. Upload bar locked read-only. `Resultatene er klare` announced; focus not moved. Browser leave/reload warning **on** where supported. English results: `lang="en"` on generated text only (AF-5). |
| **S5 Error** | Error envelope or network failure | Headline → action text → backend detail line; focus moves to the error headline. File and settings stay visible (when safe to keep); upload bar unlocked. Generer per error group below. **Exit:** choosing a new file clears the error state and returns to S2 (pre-check runs as usual); pressing an available Generer starts S3. |

**S5 error groups**

| Group | Codes | File / settings | Generer | Message tells the user |
|---|---|---|---|---|
| Invalid file | `unsupported_file_type`, `bad_text_encoding`, `unreadable_file`, `no_extractable_text` | Kept; file marked (problem chip) | aria-disabled until the file is replaced | Choose another / fixed file |
| Too big | `file_too_large` (with `limit`) | Kept; file marked | aria-disabled until replaced | Which limit; one lecture at a time |
| Too little content | `insufficient_content` | Kept; file marked | aria-disabled until replaced | Choose a document with more content |
| Temporary | `ai_unavailable`, `ai_rate_limited`, `ai_output_invalid`, `generation_in_progress`, `internal_error` (with reference), network failure during generation | Kept | **Available** | **When** to retry (wait a little — approved texts above; wait for the running generation) |
| Hard stop | `ai_credits_exhausted`, `session_call_limit_reached` | Kept | **aria-disabled** | The needed action, then reload the page (the app cannot detect resolution); demo still works |
| Reload required | `invalid_request`, unknown/other codes (incl. `demo_mode_no_uploads`, `demo_not_enabled`, `not_found`, `method_not_allowed`) | Kept when safe | **aria-disabled** (not assumed temporary or retryable) | Reload the page (`Last inn siden på nytt, og prøv igjen.`) |

Generer is available after an error only when retrying is known to be safe (the Temporary group).

### Demo mode variants

| State | Treatment |
|---|---|
| S0 / S0x | As real mode. S0: the mode is only known once `/api/status` answers [ASSUMPTION — derived from AD-4/`/api/status`, not separately recorded; see Open Questions]. |
| **S1 Empty (demo)** | DEMO banner; no external-AI notice; upload disabled; settings shown fixed (Norsk bokmål, Standard) with the fixed-settings note; guidance names the bundled sample lecture (S1 demo text); action button `Vis eksempel`. |
| **S3 (demo)** | Short loading with `Henter eksempel …` (announced via the status region). |
| **S4 (demo)** | `h2` `Eksempelresultater (ikke generert nå)`; Verification Notice; upload bar locked with the fixed settings; **no** `Resultatene lagres ikke` note; tabs as real mode; clickable page links to the bundled sample PDF via `GET /api/demo/sample.pdf` (AD-13); `Tilbake til start` instead of Ny fil; **no** leave/reload warning. |
| S2 | Not applicable (upload disabled). |
| S5 (demo) | Errors behave as real mode (e.g. server unreachable → S0x; `internal_error` → Temporary group), using the same error table and S5 groups; `Vis eksempel` takes Generer's place. |

### Leaving and reloading

- Real S4: not-saved note **and** the browser's standard `beforeunload` leave/reload warning where supported. The listener is registered only in real S4 and removed on Ny fil → Fortsett (just before the page is cleared; no double confirmation).
- All other states (real) and all demo states: warning off.
- Hard stops: "resolution" = the user reloads the page.

## Interaction Primitives

- **Pointer:** click to activate buttons, tabs, page links; Last opp opens the browser's file chooser. **No drag-and-drop upload** in the MVP (Last opp button only). Hover is a subtle extra cue only (DESIGN.md), never the only indicator.
- **Keyboard** (AF-1): `Tab` / `Shift+Tab` between controls in visual order; `Enter` / `Space` activate buttons and toggles; `Left` / `Right` arrows within the result tabs (automatic activation, wrapping), `Home` / `End` to the first / last tab; `Esc` closes the Ny fil dialog as Avbryt. No custom keyboard shortcuts.
- **Temporarily unavailable controls:** `Generer`, `Vis eksempel`, `Prøv igjen`, `Forrige` and `Neste` are never given the native `disabled` attribute. When unavailable they get `aria-disabled="true"`: they **stay focusable** (focus is never lost to `<body>`), show the disabled visual style (`button-primary-disabled` / `button-secondary-disabled`), and their activation is **blocked for mouse click, `Enter` and `Space`** by a guarded handler that does nothing while `aria-disabled` is true. They are `type="button"` (no form submit). Generer and Vis eksempel never send a duplicate request while a pass runs.
- **Focus management** (single source):
  - Ny fil dialog opens → focus on `Avbryt`; background inert; `Avbryt` / `Esc` → focus returns to `Ny fil`.
  - Ny fil → `Fortsett` → focus on `Last opp`.
  - Demo `Tilbake til start` → focus on `Vis eksempel`.
  - Error (S5) and S0x → focus on the error headline (`h2`, `tabindex="-1"`); again on each repeated failure.
  - Successful `Prøv igjen` (S0x → S1) → focus on `Last opp` (real) / `Vis eksempel` (demo) (approved 2026-11-08).
  - Results arrive (S4) → focus is **not** moved; it stays on the aria-disabled Generer / Vis eksempel; the results area is next in tab order.
  - Forrige / Neste → focus stays on the pressed button, also when it becomes aria-disabled at the deck end.
- **One pass at a time:** Generer / Vis eksempel aria-disabled while a pass runs (FR-3, AD-16).
- **New tab:** page links open in a new browser tab; the results page stays intact.
- **Banned (recorded anti-patterns):** fake progress bar, elapsed-time counter, cancel button during generation; "Vis alle svar"; quiz typing/selecting/scoring/saving; a separate results screen; any path that mixes demo and live generation; messages implying retries cost money; native `disabled` on the five controls above; `role="alert"` on errors.

## Accessibility Floor

Target: **WCAG 2.2 Level AA as the design and testing target, not a claim of full compliance.** Documentation may say "designed and tested against WCAG 2.2 AA"; "compliant" only for what has been tested in the implemented app, never as a blanket claim.

| ID | Rule |
|---|---|
| AF-1 | Keyboard access to every control, following the appropriate interaction pattern per control: `Tab`/`Shift+Tab` between controls, `Enter`/`Space` activate where appropriate, `Left`/`Right` navigate the ARIA result tabs; tab order follows visual order, with the results area directly after the upload + settings bar. Focus is never lost to `<body>`: temporarily unavailable controls use `aria-disabled` (Interaction Primitives). Focus rules: Interaction Primitives → Focus management. |
| AF-2 | Always-visible focus indicator, ≥ 3:1 contrast (`{components.focus-ring}`: 3px `{colors.focus}`, 2px offset), also on tab panels and aria-disabled controls. No sticky or fixed elements that could cover the focused element. |
| AF-3 | Full WAI-ARIA APG tabs pattern: `<div role="tablist">` named by the results `h2` (`aria-labelledby`); each tab a `<button role="tab">` with `id`, `aria-selected`, `aria-controls` and roving `tabindex` (`0` on the selected tab, `-1` on the others); each panel `<div role="tabpanel">` with `id`, `aria-labelledby` its tab, `tabindex="0"`; inactive panels stay mounted with `hidden` (keeps position and revealed answers); `Left`/`Right` with automatic activation, wrapping; `Home`/`End`; selected state and counts announced through the visible label. |
| AF-4 | Ny fil dialog (real mode): native `<dialog>` with `showModal()`; initial focus on `Avbryt`; background inert; `Esc` = Avbryt; focus returns to Ny fil; after `Fortsett` focus moves to `Last opp`. Demo has no dialog; after `Tilbake til start` focus moves to `Vis eksempel`. |
| AF-5 | `lang="nb"` on the page. When the pass was requested with output language `en` (the submitted, locked `output_language` value), `lang="en"` is set **only on elements holding generated text** (summary text, concept term + explanation, card term and answer, quiz question and answer) — never on a container with Norwegian labels, controls, page links, counters, notices or tab names. Demo results are `nb`. |
| AF-6 | One visually hidden status region, `<div role="status" aria-live="polite" aria-atomic="true">`, present and empty from first render, used for: `Lager studiemateriell …` on loading (demo: `Henter eksempel …`), `Resultatene er klare` on results (focus is not moved), and browser pre-check messages. Before each new message the region is cleared, then the text is set on the next tick, so repeated identical messages are announced. Polite only; no assertive announcements. `Starter …` is not announced. **Errors (S5, S0x) are not announced through any live region and use no `role="alert"`**: focus moves to the error headline, so it is read once. `Kort N av M` is announced by the flashcard counter's own polite region. Notices are real text. |
| AF-7 | Visible labels for all fields; page links named `PDF-side N, åpnes i ny fane` (visible text + hidden suffix, `↗` hidden); `Vis svar`/`Skjul svar` expose `aria-expanded` and `aria-controls` and sit directly before the answer they control in DOM order; `Kort N av M` announced on Forrige/Neste; accessible name = visible label everywhere. |
| AF-8 | Heading structure: `h1` app name; `h2` `Resultater` (demo: demo heading; S5/S0x: error headline); `h3` per tab panel; `h4` per quiz question. Landmarks: `<header>`, `<main>`, the two named regions `Opplasting og innstillinger` and `Resultater`. |
| AF-9 | Contrast: body text ≥ 4.5:1; large text, icons, control borders ≥ 3:1 (all DESIGN.md pairs verified by calculation). |
| AF-10 | Never colour alone: icon + text for errors, notices and the DEMO banner; the problem file chip states the problem in text. Icons are decorative inline SVG with `aria-hidden="true"`. |
| AF-11 | Zoom and reflow: usable at 200% zoom on a laptop (WCAG 1.4.4) with no lost or overlapping content; **and** reflows at 320 CSS px width (≈ 400% zoom, WCAG 1.4.10) with no two-dimensional scrolling. The upload bar wraps its fields onto new lines; the result tab list and all button rows wrap; long words in terms and answers wrap. Size values are minimums (no fixed heights that clip text under text-spacing overrides, WCAG 1.4.12). |
| AF-12 | Targets ≥ 24×24 px (`{spacing.target-min}`; controls are at least `{spacing.control-min-height}` tall; page links have a ≥ 24px target). |
| AF-13 | `prefers-reduced-motion`: loading animation becomes static; text stays. |

**Testing** — at meaningful implementation milestones **and** before final submission; findings and unresolved issues recorded in the manual test notes. Fits AD-20 layer 5 (manual UI checklist); no architecture amendment needed.

| ID | Test | Pass criteria |
|---|---|---|
| T-1 | Keyboard-only walkthrough of Key Flow 1 and the demo flow, plus a reflow and text-spacing check. | After every action `document.activeElement` is never `<body>`; after Generer, focus stays on Generer and one `Tab` reaches the results area (Ny fil); the tab list is one `Tab` stop and arrows/`Home`/`End` work; Forrige/Neste keep focus at the deck ends; Click/`Enter`/`Space` on an aria-disabled control does nothing and Generer sends no duplicate request; dialog: initial focus Avbryt, `Esc` and Avbryt return focus to Ny fil, Fortsett moves focus to Last opp; at 320 CSS px width and with a text-spacing override (WCAG 1.4.12 values) nothing is clipped, overlapped or scrolls horizontally. |
| T-2 | Lighthouse accessibility checks (Chrome/Edge DevTools) on S1 Empty, S3 Loading, S4 Results (each tab), S5 Error, demo S4. Optional complement: the free **Accessibility Insights for Web** extension (FastPass + Tab stops). | No Lighthouse accessibility failures left unexplained in the test notes; any Accessibility Insights findings recorded and either fixed or listed as unresolved. |
| T-3 | Short screen-reader spot check with NVDA + Firefox or Chrome, or Windows Narrator + Edge. | Loading and `Resultatene er klare` announced once; one error headline read once (not twice); tabs announce name, selected state and count; `Kort N av M` announced on Neste/Forrige; after `Vis svar`, reading forward reaches the answer; a page link is read as `PDF-side N, åpnes i ny fane`; English results are read with an English voice while Norwegian labels keep the Norwegian voice; the pre-check message is announced on choosing an invalid file. |

WCAG 2.2 applicability notes for the test notes: 2.5.7 Dragging not applicable (no drag); 3.2.6 Consistent Help not applicable; 3.3.7 Redundant Entry met for S5 (file and settings kept); 3.3.8 Accessible Authentication not applicable (no login); 2.4.11 Focus Not Obscured met while nothing is sticky (AF-2); 2.5.8 Target Size met including page links (AF-12); 2.2.1 Timing Adjustable not applicable (server wait, not a user time limit); 2.2.2 covered by AF-13; 3.2.2 On Input met (only Generer / Vis eksempel starts a pass).

No extra accessibility features beyond these; PRD scope unchanged.

## Responsive & Platform

Laptop/desktop browsers only (Chrome, Edge, Firefox expected for the page-link mechanism). No mobile or tablet layouts; no breakpoints were decided. The responsive requirement is AF-11: usable at 200% browser zoom and reflowing at 320 CSS px width without two-dimensional scrolling (wrapping upload bar, tab list and button rows). Content is centred at a maximum width of 960px.

## Inspiration & Anti-patterns

- **Approved reference:** [mockups/direction-refined-rolig.html](mockups/direction-refined-rolig.html).
- **Explored alternative directions:** Rolig notatbok (chosen foundation, `.working/direction-rolig-notatbok.html`), Vennlig (file chip and stronger header borrowed, `.working/direction-vennlig.html`), Akademisk and Høykontrast (not chosen, `.working/direction-akademisk.html`, `.working/direction-hoykontrast.html`); index `.working/directions-index.html`. Draft working files kept for traceability.
- **Rejected:** loading progress bars and elapsed counters (no real progress to show); a cancel button; "Vis alle svar" on the quiz; interactive quiz scoring in v1; a separate results screen; dark mode in the MVP; a confirmation dialog on demo "Tilbake til start"; non-clickable demo page labels as an automatic fallback.

## Key Flows

### Key Flow 1 — "Odeibea studies one lecture before her exam" (realises PRD UJ-1)

**Protagonist:** Odeibea, a university student preparing for an exam with limited study time, on her laptop browser. Three equally important learning goals: **understand** (Sammendrag, Nøkkelbegreper), **practise** (Flashkort, Quiz), **verify** (PDF page references).

1. Odeibea opens the app (real mode). S0 `Starter …`, then S1 with the external-AI notice and the S1 real guidance.
2. She presses `Last opp` and chooses one lecture PDF. The file chip shows name, type and size (S2); friendly browser pre-checks run early.
3. She chooses output language (`Norsk bokmål` default / `Engelsk`), detail level (`Standard` default) and optionally a course code.
4. She presses `Generer`. The button becomes unavailable (aria-disabled, focus kept) and the upload bar locks while the pass runs.
5. She waits up to about two minutes with `Lager studiemateriell … Dette kan ta opptil to minutter.` (S3).
6. Results appear (S4): Sammendrag, Nøkkelbegreper, Flashkort, Quiz together in tabs, with the Verification Notice always, and the skipped-pages notice when relevant. `Resultatene er klare` is announced; focus stays where it was, and the results are the next stop in tab order.
7. **Understand:** she reads Sammendrag and Nøkkelbegreper.
8. **Practise:** she works through Flashkort (`Vis svar`, `Neste`) and the Quiz answers one by one.
9. **Verify:** she clicks `PDF-side N ↗`; her own PDF opens at that page in a new tab.
10. She continues studying with the original document open beside the results.

With a TXT file, results have no page links; verification is against her open text file.

**CLIMAX:** all three complementary study tools for one lecture together — understand, practise and verify in one place, each traceable to a real PDF page.

**Failure paths** (all map to the error table and S5 groups):

- Backend unreachable → S0x, `Prøv igjen`.
- Browser pre-check fails (type or size, before upload) → inline message, problem chip; choose another file (Browser pre-check).
- `unsupported_file_type`, `bad_text_encoding`, `unreadable_file` → invalid-file group; choose another file.
- `file_too_large` → message names the limit.
- `no_extractable_text` → detected before any AI call.
- `insufficient_content` → reported, never padded.
- `generation_in_progress` → wait for the running generation, retry.
- `ai_unavailable` (incl. > 90 s timeout), `ai_rate_limited` → wait, retry.
- Network failure during generation → `Mistet kontakten med serveren`; check the server, retry.
- `ai_credits_exhausted` → hard stop; demo still works.
- `session_call_limit_reached` → hard stop; restart backend and reload.
- `ai_output_invalid` → no partial results; press `Generer` again.
- `internal_error` → retry; reference number shown.
- `invalid_request` or an unknown error code → Generer unavailable; reload the page.
- Skipped pages → not a failure: notice shown with Results.
- Leaving/reloading in S4 → browser leave warning; results are not saved.

### Key Flow 2 — Demo walkthrough (protagonist: "the examiner")

**Protagonist:** "the examiner" — a course reviewer running the README no-key quickstart (AD-22); a neutral protagonist.

1. The examiner opens the app with the backend in demo mode. S0 `Starter …`, then demo S1 (State Patterns → Demo mode variants).
2. They press `Vis eksempel`. A short loading state follows with `Henter eksempel …`.
3. Demo S4 (State Patterns → Demo mode variants) with the prepared results for the bundled sample lecture.
4. They browse the tabs, flashcards and quiz exactly as in Key Flow 1 steps 7–8; revealed answers stay visible when they switch tabs.
5. They click `PDF-side N ↗`; the bundled sample PDF opens at that page in a new tab, served by the local backend through `GET /api/demo/sample.pdf` (AD-13), so it works without an internet connection.
6. They press `Tilbake til start` and return directly to demo S1 — no dialog, no leave warning; revealed answers reset and focus moves to `Vis eksempel`.

**CLIMAX:** the examiner sees complete, clearly labelled example results and working, clickable PDF page references without an API key or internet connection.

**Failure paths:** demo errors behave as real mode — backend unreachable → S0x; `internal_error` → retry with `Vis eksempel`, reference shown; other codes per the error table and S5 groups.

## Open Questions

### Upstream changes (APPLIED 2026-11-08, verified in the committed PRD and architecture)

Each item below was approved by the user, applied on branch `docs/upstream-reconciliation`, and verified in the committed documents: PRD commit `50b403d`, architecture commit `44059f6`. Item text is kept for traceability.

1. **AD-13 demo heading (architecture, APPLIED in `44059f6`):** AD-13 now reads `Eksempelresultater (ikke generert nå)` instead of the English literal "Example results (not generated live)" (rule unchanged).
2. **Read-only backend access to the bundled sample PDF (architecture, APPLIED in `44059f6`):** AD-13, Conventions → Endpoints, the Structural Seed and AD-20 now define `GET /api/demo/sample.pdf`: GET only, demo mode only, serves only the fixed bundled sample PDF as `application/pdf` (inline); real mode → `demo_not_enabled` (403); missing file → `internal_error` (500); no new error codes; no external network or AI-provider calls. Clickable demo page links are required (no non-clickable fallback).
3. **PRD glossary "Quiz" wording (PRD, APPLIED in `50b403d`):** new sentence: "In v1, the Quiz is display-only: each question is shown with its answer available through a reveal action, and the student does not type or select answers; nothing is scored or saved. Interactive answering and automatic scoring is a planned Phase 2 feature (see §6.2 Out of Scope for MVP)." It replaces: "In v1, the Quiz is display-only: questions and their answers are shown together, not answered interactively. Interactive answering and automatic scoring is a planned Phase 2 feature (see §6.2 Out of Scope for MVP)." The Flashcard Set definition needs no change. The PRD glossary and the quiz reveal behaviour above now agree.
4. **English interface wording in the architecture (architecture, APPLIED in `44059f6`):** AD-8 and Consistency Conventions UI label "PDF page N" → `PDF-side N`; Conventions "backend not reachable" state label → `Får ikke kontakt med appens server`; AD-15 message "local limit reached — restart the backend" (UX text: `Appen har en grense for antall KI-kall per oppstart for å beskytte budsjettet. Start serveren på nytt, og last inn siden på nytt.`); AD-11 "English until then" for the backend `message` (now Norwegian Bokmål; AD-11 also states that the optional English output language applies only to AI-generated study content, never to interface or error messages). Translations of UI-visible wording only; rules unchanged.
5. **Glossary convention (architecture, APPLIED in `44059f6`):** Consistency Conventions → Glossary now reads: "Code uses the PRD Glossary terms (Document, Generation Pass, Results, Summary, Flashcard Set, Quiz, Key Concepts, Page Reference, Generation Inputs, Verification Notice); the UI uses the approved Norwegian labels (EXPERIENCE.md → Language & Terminology)."
6. **MB unit definition (architecture, APPLIED in `44059f6`; PRD aligned in `50b403d`):** AD-14 now defines 10 MB in the binary convention as 10,485,760 bytes (`max_upload_bytes` = 10,485,760; 1 MB = 1,048,576 bytes), used by both the backend check and the frontend formatting (at most one decimal, Norwegian decimal comma); see Voice and Tone.

### Resolved

7. **Demo verification flow (CLOSED 2026-11-08).** Key Flow 2's climax depended on clickable demo page links. Item (2) was approved and applied (architecture AD-13, commit `44059f6`): demo page links open the bundled sample PDF through `GET /api/demo/sample.pdf`, so the demo verification flow stands as designed.

### Deferred to implementation (non-blocking; user-approved deferral 2026-11-08)

Each item is revisited during implementation at the point named below. Any new Norwegian copy that results needs user approval before it ships.

8. **Visibility of structural headings.** Is the real-S4 `h2` `Resultater` and each panel's `h3` visible or visually hidden? (The mockup shows neither; the demo heading is visible.) *Revisit:* when building the results area and tabs; check with T-3 (screen reader) and T-2.
9. **Lock-state text in the upload bar.** The locked bar must state the lock in text, not only by icon and dashed border; the wording is not approved (the mockup uses `Låst` as a tooltip). *Revisit:* when building the locked upload bar (S3/S4); wording needs user approval.
10. **Announcing a valid file choice.** Pre-check failures are announced; whether a successful file choice is also announced (and its wording, e.g. file name and size) is not decided. *Revisit:* when building Last opp and the file chip, and when running T-3.
11. **Changing settings alone after an error.** A new file clears the error (→ S2); whether changing only a setting in S5 keeps or clears the error state is not decided. *Revisit:* when building S5 error handling.
12. **Demo fixed-settings note in demo S4.** Recorded for demo S1; whether it stays visible in demo S4 (locked bar) is not decided. *Revisit:* when building demo mode.
13. **External-AI notice link target.** The link is visible in real S4, where opening it in the same tab triggers the leave warning and can lose results. Same tab, or new tab with the page-link pattern (`↗` hidden, hidden `, åpnes i ny fane`)? *Revisit:* when building the external-AI notice.
14. **S0 / S0x content while the mode is unknown** ([ASSUMPTION] in Demo mode variants): whether only the header and the status message are shown before `/api/status` answers (no notices, no upload bar). *Revisit:* when building the `/api/status` startup check (S0/S0x).

### Noted (no action needed)

15. An earlier estimate recorded the wait as ~1.5 min; the approved loading text says "opptil to minutter" (consistent with AD-16's client timeout ≥ 90 s + 30 s). Not a conflict; noted.
