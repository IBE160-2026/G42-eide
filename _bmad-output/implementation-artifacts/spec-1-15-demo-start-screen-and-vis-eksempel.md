---
title: 'Story 1.15: Demo start screen and "Vis eksempel"'
type: 'feature'
created: '2026-11-16'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<!-- APPROVED at Checkpoint 89 (G0) by the developer on 2026-11-16: Story 1.15, revision 4 (SHA-256 88be9787a240305f77aaa08988a3a9ca61e4770c6b01fbe7d8ea504805e26851). The block below is frozen: only the developer can change it. This approval authorizes no implementation; implementation starts at a later checkpoint. -->

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**User story** (`epics.md`, "Story 1.15", lines 826–858): as a reviewer, I want a clearly labelled demo start screen and one button that shows the example, so that I understand that I'm seeing prepared results, not an analysis of my own file.

**Problem:** with the backend in demo mode, the page today shows only the header and, after `GET /api/status` succeeds, two empty sections. `POST /api/demo` (Story 1.13) exists, but nothing in the frontend calls it, labels the demo or shows its outcome.

**Approach:** when `/api/status` reports `mode: "demo"`, the page shows the DEMO banner, demo S1 (guidance, a disabled `Last opp`, the fixed settings with their note, and `Vis eksempel`), and handles one demo request through S3 (loading), S4 (the demo results heading and the Verification Notice) and S5 (error state per code and group). The request lifecycle (one request per explicit user action, synchronous guard, 120-second timeout covering the whole reply, abort on unmount) and the reply classification (by `error_code`, with runtime shape checks) live in small pure modules; the UI states live in a small client-side provider shared by the two page sections. Real mode is unchanged.

**Out of scope:** the results tabs, skipped-pages notice and locked upload bar (Story 1.16); summary rendering and page links (Story 1.17); the Nøkkelbegreper, Flashkort and Quiz panels (Stories 1.18–1.20); `Tilbake til start` and demo acceptance (Story 1.21); real-mode S1/S2 and the upload flow (Epic 2, from Story 2.4); the full Epic 2 error system (file errors with problem chips, `file_too_large` limit texts, AI and cost codes in real mode). No backend change.

## Boundaries & Constraints

**Always:**
- **Exact approved texts only:** every visible Norwegian string comes from `EXPERIENCE.md` ("Notices", "Screens and controls", "Error headline + action per code"), character for character (en dash U+2013, ellipsis U+2026 after a normal space, guillemets U+00AB/U+00BB, no non-breaking spaces). No new wording without a separate approval gate.
- **Demo only:** nothing new renders unless `useAppStatus()` reports `phase === "ready"` and `status.mode === "demo"`. In S0, S0x and real mode the page behaves exactly as today.
- **One request per explicit user action:** `POST /api/demo` is started only from the `Vis eksempel` click handler, and only from S1 or from S5 after a Temporary-group error. A synchronous `useRef` guard is set before `fetch` is called (not only React state), so repeated activation in the same tick or a re-render can never send a second request. No request is started from render, a state updater or an effect.
- **The request:** `POST ${apiBaseUrl()}/api/demo`, no body, no `Content-Type` header, `cache: "no-store"`, an `AbortController` whose 120-second timer covers headers **and** body; aborted on unmount. No other network call; no external AI service, CDN, font or icon is loaded (AD-13).
- **Classification by `error_code`:** success and failure are decided by the parsed body, never by the HTTP status alone (UX-DR-33, AD-11, AR-12). Malformed data is never shown as results.
- **`aria-disabled`, never native `disabled`, on `Vis eksempel`** (UX-DR-18, UX-DR-40); it stays focusable and blocks activation in its `onClick` handler.
- **Errors are never announced through the status region** and never use `role="alert"` (UX-DR-20, UX-DR-32, UX-DR-40).
- **Icons:** inline SVG, one default-exported component per file (as `Logo.tsx`, `ErrorIcon.tsx`), sized with SVG `width`/`height` attributes, `aria-hidden="true"`, `focusable="false"`, stroke `currentColor` (DESIGN.md → Components → Icons).
- **CSS within the existing test's limits** (`frontend/__tests__/globals-css.test.ts`): no `height:` property (only hyphenated forms such as `min-height`), exactly one `:focus-visible` rule (the existing one), exactly 27 `--color-*` tokens (no new colour token), no raw colour values or `rgb()`/`hsl()` in rules after `button,`, no `box-shadow`, gradient, `url()`, `@import`, `@font-face`, `position: sticky/fixed`, `outline: none` or dark-mode rule. Only existing `--color-*`, `--font-*`, `--space-*`, `--radius-*` and size tokens are used.
- **No new dependency;** `frontend/package.json` and `package-lock.json` unchanged.

**Ask First:**
- Any new Norwegian text, any change to an approved string, any error mapping beyond the error matrix below, or any change to the backend.

**Never:**
- Changes to `backend/`, `samples/`, `frontend/lib/status.ts`, `frontend/lib/generation.ts`, `frontend/lib/focus-target.ts`, `frontend/components/AppStatusProvider.tsx`, `StartupCheck.tsx`, `StatusRegion.tsx`, `ErrorIcon.tsx`, `Logo.tsx`, `frontend/app/layout.tsx`, `frontend/__tests__/status-fixtures.ts`, the dependency files, or any existing test file except compatibility correction C1.
- Results tabs, the skipped-pages notice, the locked upload bar, page links, `Tilbake til start`, or any real-mode upload behaviour.
- `_bmad-output/planning-artifacts/architecture/technology.md` as a source.

## Requirements traceability

| Source | Requirement | Covered by |
|---|---|---|
| Story 1.15 AC 1 | demo S1: DEMO banner (icon + text), S1 demo text, `Last opp` disabled, fixed settings + note, `Vis eksempel`; no external-AI notice | D1–D4, D17; rows A1–A9 |
| Story 1.15 AC 2 | `Vis eksempel`: one `POST /api/demo`; `aria-disabled`, keeps focus, repeats ignored; `Henter eksempel …` shown and announced; static indicator under reduced motion | D5–D7, D6a; rows B1–B14; manual check M-1 (Enter/Space) |
| Story 1.15 AC 3 | success: heading `Eksempelresultater (ikke generert nå)`, Verification Notice, `Resultatene er klare` announced, focus not moved | D8, CF-1; rows C1–C5 |
| Story 1.15 AC 4 | error/network failure: headline + action + muted `message`; focus to headline; the listed codes; decision by `error_code` | D9–D12, CF-2; rows E1–E19 |
| Story 1.15 AC 5 | Vitest: banner, single request, guard, announcement, error headlines, runtime shape check against `samples/demo-response.json` | the matrix; the shape check already exists (`frontend/__tests__/generation.test.ts:35`, Story 1.13) and is reused (row C6) |
| FR-5, FR-6 | results shown after a successful pass; Verification Notice with them | D8 (heading and notice only; the content panels are Stories 1.16–1.20) |
| FR-7 | failure handling with specific messages | D9–D12; error matrix |
| AR-13, AR-21 | contract mirrors and fixtures; testing layers (frontend focused tests, manual checklist) | D11, D18; Tasks; G2 manual checks |
| UX-DR-6, G-2 (`issues.md:23`) | after a successful `Prøv igjen`, focus moves to `Vis eksempel` in demo | D13; rows F1–F2 |
| UX-DR-34, G-3 (`issues.md:24`) | `Vis eksempel` availability after demo errors follows the S5 groups | D10, CF-2; error matrix; rows E1–E19 |
| UX-DR-9, -10, -17, -19, -20, -32, -33, -2 | banner, Verification Notice, settings fields, loading, status region, error state, per-code texts, component styles | D1–D12, D17, CSS plan |
| UX-DR-35 to -38 (G-4) | keyboard and focus, names = visible labels, contrast (pre-verified tokens), zoom/reflow and targets | D14–D15; rows G1–G3; manual checks M-1 to M-4 |
| AD-11, AD-12 | error envelope `{error_code, message, limit?, reference_id?}`; TS types mirror Pydantic by hand | D11, D18 |
| AD-13 | demo makes no external network or AI-provider calls; demo inputs are fixed; the frontend loads no external resources | Always; D3; row B12 |

## Decisions

Directions given by the developer at Checkpoint 82 and decisions taken at Checkpoint 84 (2026-11-16).

- **D1 — where things render:** the DEMO banner is the first child of `<main>`, before the two sections, shown in every demo state once the mode is known (S1, S3, S4, S5), never in S0/S0x. Source: `DESIGN.md` → Layout & Spacing (line 352: "header band → notices → upload + settings bar → results area") and the mockup (`mockups/direction-refined-rolig.html`, Frame 5, where the banner is the first child of `main`); `EXPERIENCE.md` → Information Architecture lists "App name + DEMO banner" under the header, but the `<header>` sits outside `AppStatusProvider` in `page.tsx` and so cannot know the mode. The upload section (`Opplasting og innstillinger`) holds `Last opp`, the two fixed settings, the fixed-settings note and `Vis eksempel` (an `upload-bar`). The results section (`Resultater`) holds the S1 guidance text, the S3 loading indicator, the S4 heading and Verification Notice, and the S5 error state (OQ4).
- **D2 — banner:** `<div class="demo-banner" role="note">` with the screen-with-play icon (`DemoIcon.tsx`, decorative) and `<p>DEMO – du ser et ferdig eksempel. Ingen KI-tjeneste brukes, og egne filer kan ikke lastes opp.</p>`. `role="note"` follows the mockup.
- **D3 — fixed settings:** two natively `disabled` `<select>` elements with visible `<label for>`, each label-and-select pair wrapped in its own `<div class="settings-field">` (the DESIGN.md `settings-field` component; D19 targets `.settings-field select:disabled`): `Språk på resultatene` with the single option `Norsk bokmål` (`value="nb"`), and `Detaljnivå` with the single option `Standard` (`value="standard"`); then the fixed-settings note `Demoen viser ferdiglagde resultater på norsk bokmål med standard detaljnivå. Innstillingene kan ikke endres, og det lages ingen ny oversettelse.` No `Emnekode` field in demo: the demo inputs are fixed (AD-13: "Demo Generation Inputs are fixed to those recorded values"; Story 1.13 sends `course_code=None`), and UX-DR-17's demo line names only the two selects. (OQ5)
- **D4 — `Last opp`:** a `button-primary` with the upward-arrow icon (`UploadIcon.tsx`, decorative) and the text `Last opp`, natively `disabled` in demo; no file input is rendered. (OQ5)
- **D5 — `Vis eksempel`:** `<button type="button" class="button-primary">Vis eksempel</button>`; `aria-disabled="true"` in S3, in S4 (CF-1) and after Reload-required errors; available (no `aria-disabled`) in S1 and after Temporary-group errors. Only an `onClick` handler (no key handlers): native buttons turn Enter and Space into a click. The handler returns at once when the button is unavailable or the synchronous guard is set.
- **D6 — S3 loading:** on activation the handler synchronously sets the guard, then the state becomes `loading`: the button gets `aria-disabled="true"` and keeps focus (nothing is unmounted or moved); the results section shows the `loading-indicator` (a small circular arc drawn with a border on an element sized by `width`/`min-height` tokens or an SVG, `aria-hidden`) beside `Henter eksempel …`, replacing the S1 guidance; `announce("Henter eksempel …")` is called once. Under `prefers-reduced-motion: reduce` the arc is static (`animation: none`).
- **D6a — S3 locking (UX-DR-19 "everything locked"; decided at Checkpoint 86):** during S3 no control of the demo upload bar can be activated or changed: `Last opp` and both selects are natively `disabled` in every demo state (D3, D4), and `Vis eksempel` is `aria-disabled` with its handler blocked (D5). `Vis eksempel` stays rendered and focusable and keeps focus. This is the behavioural lock. The final visual locked-bar presentation (`upload-bar-locked`: dashed border, settings as a read-only `<dl>`, lock icon and lock-state text, D-2) is **deferred** to Story 1.16; in Story 1.15 the bar keeps its S1 appearance during S3 and S4.
- **D7 — request lifecycle and Strict Mode:**
  - The handler creates the `AbortController` and a 120-second timer (`DEMO_TIMEOUT_MS = 120_000`; UX-DR-19: no client timeout shorter than the backend AI timeout + 30 s, applied to demo for consistency). The timer stays armed until the body has been fully read and classified, then it is cleared; it is also cleared on every other settled outcome and on unmount. After any outcome no timer of this story remains.
  - The reply body is read with `response.text()` and then `JSON.parse`d (D11), so a transport failure while reading and a parse failure are distinguishable.
  - **Hand-over type (L-D):** `requestDemo(signal)` never throws; it resolves to a `DemoTransport` value:
    - `{ kind: "body", text: string }` — headers and the whole body were received;
    - `{ kind: "rejected" }` — `fetch` or `response.text()` rejected for any reason (network error, `TypeError`, or `AbortError` from the 120-second timeout).
    The provider decides what an abort means before classifying: if the request is no longer current or the component has unmounted (`mountedRef.current === false`, or the request id is stale), the result is **cancelled** and is dropped without calling `classifyDemoReply`; otherwise a `rejected` result (including the timeout abort) is classified as a network failure. `classifyDemoReply(transport: DemoTransport): DemoOutcome` is pure: `rejected` → network failure; `body` → rules 2–5 of D11. `DemoOutcome` is `{ kind: "success", response: GenerationResponse } | { kind: "error", code: string, message: string, referenceId?: string } | { kind: "network" } | { kind: "unknown" }`.
  - A `mountedRef` is set to `true` in the provider's effect **setup** and to `false` in its cleanup, so React Strict Mode's mount → cleanup → mount leaves it `true`. The cleanup also aborts an in-flight request and clears its timer. In Strict Mode the double mount happens before any click, so no request exists to abort.
  - An outcome is applied only if the component is still mounted and the request is still the current one (each request has an id held in a ref); otherwise it is ignored (no state update, no announcement, no focus move).
  - The guard is cleared when the outcome has been applied (or ignored).
  - `announce`, `setState` and focus calls happen only in the handler or in the outcome path, never in render or a state updater; focus moves in an effect keyed by the outcome's request id (D9).
- **D8 — S4 success:** the results section shows `<h2>Eksempelresultater (ikke generert nå)</h2>` (`--font-demo-heading-*` tokens) and the Verification Notice (`notice-warning`, `role="note"`, `WarningIcon.tsx` decorative, text `Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.`); the S1 guidance disappears; `announce("Resultatene er klare")`; focus is not moved. The validated `GenerationResponse` is kept in the provider's state for Story 1.16 but nothing of its content is rendered. `Vis eksempel` stays rendered and `aria-disabled` (CF-1). The upload bar, including the fixed-settings note, stays as in S1 (interim until Story 1.16 locks it and decides D-5).
- **D9 — S5 error state:** replaces the S1 introductory guidance in the results section (the guidance appears only in S1, D17), and reuses the existing `error-state` markup and classes (as `StartupCheck`): `ErrorIcon`, `<h2 tabIndex={-1} class="error-state__headline">` headline, `<p class="error-state__action">` action text, and — only when the backend `message` is a non-empty string — `<p class="error-state__detail">` with the message as plain text (React text node, never HTML). Focus moves to the headline on **every** error outcome, also when a retry produces the same error again (EXPERIENCE.md → Interaction Primitives: "again on each repeated failure"); the focus effect is keyed by the request id, not by the code. `announce("")` clears the region (which also cancels a pending `Henter eksempel …`, `StatusRegion.tsx` → `cancelPending`); the error itself is never announced (OQ6).
- **D10 — groups and availability (UX-DR-34, G-3):** see the error matrix; Temporary → `Vis eksempel` available; Reload-required → `aria-disabled`. No Hard-stop code can come from the demo route (CF-2).
- **D11 — reply classification** (pure function `classifyDemoReply(transport: DemoTransport)` in `frontend/lib/demo.ts`; the input type is defined in D7):
  1. `transport.kind === "rejected"`: `fetch` rejected, or reading the body (`response.text()`) rejected, or the request was aborted by the timeout at any point before classification (`AbortError`, `TypeError`, any other rejection) → **network failure** (an abort caused by unmount or a stale request never reaches this function, D7);
  2. the fully read body is not valid JSON (`JSON.parse` throws `SyntaxError`) → **unknown error**;
  3. the parsed body is an object with an own `error_code` property → if it passes `isErrorEnvelope` → **error** with that code; otherwise → **unknown error**;
  4. otherwise, if `isGenerationResponse(body)` and `body.mode === "demo"` → **success**;
  5. otherwise → **unknown error**.
  The HTTP status is not used. An abort caused by unmount is not an outcome (D7).
  `isErrorEnvelope` mirrors the backend's `ErrorResponse` (`backend/app/contracts/errors.py`, `extra="forbid"`): only the keys `error_code`, `message`, `limit`, `reference_id`; `error_code` a non-empty string (unknown codes are allowed and fall back, D12); `message` a string; `limit` present only for `file_too_large` and then one of `bytes`, `pages`, `characters`, `tokens`; `reference_id` present **exactly** for `internal_error` and then matching `^[0-9a-f]{8}$` (OQ3). Any violation → unknown error. (The backend also requires the approved message per code; the frontend does not repeat that check and only displays the text.)
- **D12 — error texts:** a small data module (`frontend/lib/demo-errors.ts`) maps the codes in the error matrix to the exact headline and action texts and the group; every other code falls back to `Noe gikk galt` / `Last inn siden på nytt, og prøv igjen.` (Reload-required; CF-2). `internal_error` fills `<reference_id>` from the validated envelope.
- **D13 — G-2:** `Vis eksempel` registers itself with `registerStartupFocusTarget` through its ref callback (returning the unregister function), so a successful `Prøv igjen` from S0x moves focus to it (EXPERIENCE.md → Interaction Primitives, approved 2026-11-08). Real mode registers nothing (unchanged: focus to `h1#app-title`).
- **D14 — accessibility:** accessible names equal the visible labels; tab order follows visual order (banner → upload section → results); focus is never lost to `<body>` by this story's state changes (CF-1); all controls ≥ 44px tall (`min-height` with the control size token); the focus ring is the existing global `:focus-visible` rule.
- **D15 — reflow:** the upload bar wraps its controls (`flex-wrap`) and the banner, notices and error state wrap their text, so nothing scrolls horizontally at 320 CSS px or at 200% zoom (UX-DR-38, G-4).
- **D16 — real mode and startup:** no change to S0, S0x, `Prøv igjen`, the status request, or real-mode rendering.
- **D17 — visual treatment of unmocked surfaces (D-10; approved by the developer at Checkpoint 86):** simple text, no information box and no icon, existing tokens only:
  - the S1 guidance is a plain `<p>` in the results section in `--font-body-*` and `--color-text-muted` (6.60:1 on `--color-background`, 7.19:1 on `--color-surface`, DESIGN.md → Colors contrast table; ≥ 4.5:1). It appears **only in S1**: S3, S4 and S5 replace it (D6, D8, D9);
  - the fixed-settings note is a plain `<p>` below the two settings in `--font-small-*` and `--color-text-muted` (the existing not-saved-note treatment).
  DESIGN Open Question 3's proposal (the note as `notice-info`) is not adopted. **D-5 interim (approved at Checkpoint 86):** the note stays visible in the temporary S4; the final demo S4 treatment (D-5) and the locked-bar presentation are assigned to Story 1.16.
- **D18 — TS mirrors:** `frontend/lib/contracts.ts` gains `ErrorCode` (the 18 codes of the backend `ErrorCode` Literal, same order), `LimitKind` (`"bytes" | "pages" | "characters" | "tokens"`) and `ErrorEnvelope` (`error_code: string`, so unknown codes still type-check at runtime; `message: string`; `limit?: LimitKind`; `reference_id?: string`). The error-text table is keyed by `ErrorCode`.
- **D19 — disabled controls styling (OQ5, M-NEW, L-E):**
  - **`Last opp`:** a new, separate rule appended to `globals.css`:
    ```css
    .button-primary:disabled,
    .button-primary:disabled:hover {
      background: var(--color-disabled-bg);
      color: var(--color-disabled-fg);
      border: var(--border-hairline) dashed var(--color-disabled-border);
      cursor: not-allowed;
    }
    ```
    The existing `.button-primary:hover:not([aria-disabled="true"])` rule (specificity 0,3,0) would otherwise restyle a natively disabled button on hover; `.button-primary:disabled:hover` (0,3,0, later in the file) wins, so hovering changes nothing (DESIGN.md → Button — primary: "no hover change"). The existing hover rule and the existing `.button-primary[aria-disabled="true"]` rule are **not** modified (`globals-css.test.ts` finds them by their exact selectors).
  - **Selects:** the selector is exactly `.settings-field select:disabled` (D3's wrapper); it sets `color: var(--color-disabled-fg)`, `background: var(--color-disabled-bg)`, `border: var(--border-hairline) solid var(--color-disabled-border)`, `opacity: 1` and `-webkit-text-fill-color: var(--color-disabled-fg)`, overriding the browser's default fading (GrayText or reduced opacity); `--color-disabled-fg` on `--color-disabled-bg` is 5.57:1 (DESIGN.md → Colors).
  - All values are existing tokens; no raw colour, no `height:` property.

## Conflicts and deviations (decided at Checkpoint 84)

- **CF-1 — ACCEPTED: keep `Vis eksempel` rendered and `aria-disabled` in S4.** Direction 1 ("hide the start-screen action controls after success") would drop focus to `<body>`: the button holds focus during S3 (AC 2), focus must not move on success (AC 3) and must never be lost to `<body>` (UX-DR-35). The approved UX already specifies this: EXPERIENCE.md → Interaction Primitives ("Results arrive (S4) → focus is not moved; it stays on the aria-disabled Generer / Vis eksempel") and DESIGN.md → Upload bar (the locked bar shows the action "in the disabled style"). Only the S1 guidance text is hidden in S4. Story 1.16 locks the bar; Story 1.21 adds `Tilbake til start`.
- **CF-2 — ACCEPTED AS A STORY 1.15 DEVIATION from UX-DR-34's general mapping.** UX-DR-34 and EXPERIENCE.md → Demo mode variants say demo errors use the same table and S5 groups as real mode. In this story only the codes in the error matrix get their own texts; every other code reachable from `POST /api/demo` uses the approved unknown-error state (`Noe gikk galt`, Reload-required, `Vis eksempel` `aria-disabled`). Facts (from the backend code and an in-memory probe at Checkpoint 83):
  - `ai_output_invalid` (502) comes from a fixture that is empty, not JSON or does not match the AD-9 shape, or whose items fail stage 5's gates; it **has** its own texts here (Temporary).
  - `insufficient_content` (422) comes from a fixture whose `status` is `"insufficient_content"` (`backend/app/pipeline/stage5_gates.py:71-73`), not from an empty fixture; it falls back here.
  - `unsupported_file_type`, `unreadable_file`, `no_extractable_text` and `file_too_large` (`pages` or `characters`) are reachable only if the bundled sample were replaced or damaged; their approved action texts ask the user to choose another file, which is impossible in demo; they fall back here.
  - `ai_unavailable`, `ai_rate_limited`, `ai_credits_exhausted` and `session_call_limit_reached` cannot come from the demo route (the demo connector raises no `ConnectorError`; the cost gate is real-mode only); they fall back.
  - `demo_not_enabled`, `demo_mode_no_uploads`, `not_found`, `method_not_allowed` and unknown codes fall back, as UX-DR-33 already says.
  The deviation is approved for Story 1.15's scope ("Ask First"); at closeout an `issues.md` item is proposed so that Epic 2 (or a UX-document update) reconciles the demo mapping with EXPERIENCE.md.

## Error and retry matrix

| Outcome | Headline | Action text | Detail line | Group | `Vis eksempel` afterwards |
|---|---|---|---|---|---|
| `generation_in_progress` | `En generering pågår allerede` | `Vent til den er ferdig – den kan være startet i en annen fane – og prøv igjen.` | `message` if non-empty | Temporary | available |
| `internal_error` with a valid `reference_id` | `Noe gikk uventet galt` | `Prøv igjen. Hvis feilen gjentar seg, oppgi referansen: <reference_id>.` | `message` if non-empty | Temporary | available |
| `ai_output_invalid` | `Svaret besto ikke kvalitetskontrollen` | `KI-svaret var ufullstendig eller manglet gyldige sidehenvisninger, så det vises ikke. Du kan prøve igjen.` | `message` if non-empty | Temporary | available |
| network failure (fetch or body read rejects, incl. the 120 s timeout) | `Mistet kontakten med serveren` | `Sjekk at serveren kjører, og prøv igjen.` | none | Temporary | available |
| `invalid_request` | `Forespørselen var ugyldig` | `Last inn siden på nytt, og prøv igjen.` | `message` if non-empty | Reload required | `aria-disabled` |
| any other valid envelope (`demo_not_enabled`, `demo_mode_no_uploads`, `not_found`, `method_not_allowed`, the CF-2 codes, unknown codes) | `Noe gikk galt` | `Last inn siden på nytt, og prøv igjen.` | `message` if non-empty | Reload required | `aria-disabled` |
| malformed reply (body not JSON; `error_code` present but envelope invalid, incl. `internal_error` without a valid `reference_id`; neither shape valid; success with `mode !== "demo"`) | `Noe gikk galt` | `Last inn siden på nytt, og prøv igjen.` | none | Reload required | `aria-disabled` |

No message implies a retry costs money (UX-DR-33). Retries after `ai_output_invalid` or `internal_error` usually fail the same way in demo (the fixture or sample is static); they stay Temporary because the approved table says so.

## I/O & Edge-Case Matrix

Unless a row says otherwise:
- **Render:** `<Home />`; `fetch` stubbed with a **local** controllable fake in the new test files (the shared `fakeResponse` in `status-fixtures.ts` implements only `json()`; the new fake implements `text()`, which can resolve, reject with `TypeError`, or wait; while it waits, aborting the request's signal makes `text()` reject with a `DOMException` named `AbortError`, as real `fetch` does, so B8 exercises a real abort during the body read). Separately, the fake `fetch` promise itself rejects with an `AbortError` `DOMException` when its signal aborts before the response headers arrive, matching the existing `stubControllableFetch` behaviour (`status-fixtures.ts`), so B7 exercises an abort before headers; fake timers; `NEXT_PUBLIC_API_BASE_URL` stubbed as in `startup-check.test.tsx`; `/api/status` settled with `validStatus()` (demo mode); requests after the first are `POST /api/demo`.
- **Activation:** automated rows use `fireEvent.click` (jsdom does not turn a `keydown` on a button into a click, and no `user-event` dependency is added); real Enter and Space activation is checked manually (M-1).
- **Replies:** the success body is `samples/demo-response.json`; error bodies are AD-11 envelopes as the backend produces them.
- **"Focus kept":** `document.activeElement` is the `Vis eksempel` button. **"Announced X":** after `vi.runOnlyPendingTimers()`, the status region's text is X.

| ID | Scenario | Input | Expected Output / Behavior |
|----|----------|-------|---------------------------|
| A1 | Demo S1 renders | status `mode: "demo"` | banner, upload bar (Last opp, two settings, note, Vis eksempel) and S1 guidance (in Resultater) visible |
| A2 | Banner | demo S1 | exact text; inline SVG with `aria-hidden="true"` and `focusable="false"`; `role="note"`; class `demo-banner`; the first child of `main`, before the sections |
| A3 | No external-AI notice | demo S1 | the text `Teksten i dokumentet ditt sendes til Anthropic` appears nowhere |
| A4 | Last opp disabled | demo S1 | a button named `Last opp`, natively `disabled`; no `input[type=file]` |
| A5 | Fixed settings | demo S1 | two disabled selects with accessible names `Språk på resultatene` and `Detaljnivå`, each with exactly one option (`Norsk bokmål`/`nb`, `Standard`/`standard`); the exact fixed-settings note; no `Emnekode` field |
| A6 | S1 guidance | demo S1 | exact text `Prøv appen med en ferdig eksempelforelesning om lagerstyring og logistikk. Trykk «Vis eksempel» for å se resultatene.` in Resultater |
| A7 | Vis eksempel available | demo S1 | `type="button"`, class `button-primary`, no `disabled`, no `aria-disabled` |
| A8 | Nothing before the mode is known | S0 and S0x | no banner, no demo controls (the existing S0/S0x tests keep passing unchanged) |
| A9 | Demo first load (demo equivalent of startup L106) | status OK, demo | `Starter …` gone; Resultater contains exactly the S1 guidance; focus stays on `<body>`; the status region is empty; `vi.getTimerCount()` is 0; no `POST` sent |
| A10 | Demo Strict Mode startup (equivalent of startup L441) | `<StrictMode><Home /></StrictMode>`; the first status request aborted by the Strict Mode cleanup, the second settled demo | no S0x; demo S1 rendered once; focus on `<body>`; no `POST` sent |
| B1 | One request | click `Vis eksempel` | exactly one `POST` to `<base>/api/demo`, no body, no `Content-Type`, `cache: "no-store"`, with a signal |
| B2 | Synchronous guard | two (and three) clicks in the same tick, before React re-renders | still exactly one `POST` |
| B3 | Unavailable while loading | after the first click and a re-render, click again | no further request; `aria-disabled="true"`; focus kept |
| B4 | Loading text and announcement | after the click | `Henter eksempel …` visible in Resultater; announced `Henter eksempel …`, once |
| B5 | Indicator | S3 | the loading indicator element is present, `aria-hidden`, class `loading-indicator` |
| B6 | Reduced motion (CSS) | `globals.css` | the indicator's animation rule exists, and a `@media (prefers-reduced-motion: reduce)` rule sets it to `animation: none` |
| B7 | Timeout before headers | no reply for 120 s (the `fetch` promise still pending) | the request's signal is aborted and the pending `fetch` promise rejects with `AbortError`; S5 network failure (E4) |
| B8 | Timeout during body read | headers at once, `text()` pending, 120 s pass | the signal is aborted and the pending `text()` rejects with `AbortError`; S5 network failure |
| B9 | Transport failure during body read | `text()` rejects with `TypeError` | S5 network failure |
| B10 | No timer left | after each outcome of C1, E1, E4, E8 (and after flushing the announcement tick) | `vi.getTimerCount()` is 0 |
| B11 | Unmount while loading | unmount during S3, then the reply arrives | the signal is aborted; no error, no state update, no announcement; no timer left |
| B12 | No other network call | the whole demo flow | `fetch` called only for `/api/status` and `/api/demo` |
| B13 | Strict Mode request | `<StrictMode><Home /></StrictMode>`, demo S1, click once, success | exactly one `POST`; S4 shown; announced `Henter eksempel …` then `Resultatene er klare`, each once; the outcome is applied (not ignored) |
| B14 | S3 locking (D6a) | during S3 | `Last opp` and both selects are still natively `disabled` and their values unchanged; `Vis eksempel` is `aria-disabled`, focusable and focused; a change event on a select changes nothing; the S1 guidance is not shown |
| C1 | Success | the recorded `demo-response.json` | the exact heading `Eksempelresultater (ikke generert nå)` (h2) and the exact Verification Notice (`notice-warning`, `role="note"`, decorative icon) in Resultater; S1 guidance gone |
| C2 | Announcement, focus | success | announced `Resultatene er klare`; focus kept on `Vis eksempel` (CF-1) |
| C3 | No repeat after success | click in S4 | `aria-disabled="true"`; no further request |
| C4 | No results content | success | none of the fixture's summary text, tab names or page links is rendered (Stories 1.16–1.20) |
| C5 | Banner and note stay | S3, S4, S5 | the banner is visible in each; the fixed-settings note is visible in S4 (D17) |
| C6 | Shape check | `samples/demo-response.json` | accepted by `isGenerationResponse` (the existing Story 1.13 test `generation.test.ts:35`; not duplicated) |
| E1 | `internal_error` | 500 envelope with `reference_id: "5e7ff8bd"` | headline `Noe gikk uventet galt`; action `Prøv igjen. Hvis feilen gjentar seg, oppgi referansen: 5e7ff8bd.`; detail line = `message`; focus on the headline (`tabindex="-1"`); `Vis eksempel` available |
| E2 | `generation_in_progress` | 409 envelope | exact texts; available |
| E3 | `ai_output_invalid` | 502 envelope | exact texts; available |
| E4 | Network failure | `fetch` rejects with `TypeError` | `Mistet kontakten med serveren` / `Sjekk at serveren kjører, og prøv igjen.`; no detail line; available |
| E5 | `invalid_request` | 400 envelope | exact texts; `aria-disabled` |
| E6 | Fallback codes | `demo_not_enabled` (403), `demo_mode_no_uploads`, `not_found`, `method_not_allowed`, `insufficient_content`, `no_extractable_text`, `xyz` | `Noe gikk galt` / `Last inn siden på nytt, og prøv igjen.`; detail = `message`; `aria-disabled` |
| E7 | Decision by `error_code`, not status | an envelope with HTTP 200; a success body with HTTP 500 | the first is an error (S5); the second is success (S4) — intentional (AR-12) |
| E8 | Malformed JSON, fully received | 200, `text()` resolves to `not json` | unknown state, no detail line, `aria-disabled`; nothing shown as results |
| E9 | Invalid envelopes | `{error_code: 5, message: "x"}`; `{error_code: "x"}` (no message); an extra key; `limit` on a code other than `file_too_large`; `reference_id` on a code other than `internal_error` | unknown state; never success |
| E10 | `internal_error` reference missing or malformed | no `reference_id`; `"5E7FF8BD"`; `"5e7ff8b"`; `"5e7ff8bdz"`; a number | unknown state, no detail line, `aria-disabled` |
| E11 | Invalid success | a body that fails `isGenerationResponse`; a valid body with `mode: "real"` | unknown state |
| E12 | Detail line is text | `message` containing `<b>x</b>` | rendered literally; no element created |
| E13 | Empty message | a valid envelope with `message: ""` | no detail line element |
| E14 | Not announced; guidance replaced | any error | no `role="alert"`; the status region is cleared and stays empty; the S1 guidance text is not in the document (D9, D17) |
| E15 | Retry after Temporary | E1, then click `Vis eksempel` | exactly one new `POST`; error state replaced by S3; then the new outcome |
| E16 | Repeated identical error | E2 → click → E2 again | focus on the (new) headline again after the second error |
| E17 | No retry after Reload-required | E5 or E6, then click | no request; focus stays where it is |
| E18 | Timeout as network failure | B7 / B8 | identical to E4 (texts, availability) |
| E19 | Stale outcome ignored | reply of an aborted (unmounted) request arrives | nothing changes (B11) |
| F1 | G-2, demo | S0x → `Prøv igjen` → status OK (demo) | focus on `Vis eksempel` (demo equivalent of startup L250) |
| F2 | G-2, real | same with `mode: "real"` | focus on `h1#app-title` (unchanged) |
| G1 | Real mode unchanged | status `mode: "real"` | no banner, no demo controls, both sections empty (as today) |
| G2 | Tab order | demo S1 | `Vis eksempel` is in the tab order; the disabled `Last opp` and selects are not; focus-ring rules unchanged |
| G3 | Names | demo S1 and S5 | every accessible name equals its visible label |
| G4 | Disabled and detail CSS (`demo-css.test.ts`) | `globals.css` | a rule whose selector list is exactly `.button-primary:disabled` and `.button-primary:disabled:hover`, with the three disabled tokens and `cursor: not-allowed` (D19); a rule whose selector is exactly `.settings-field select:disabled`, with `color: var(--color-disabled-fg)`, `opacity: 1` and `-webkit-text-fill-color: var(--color-disabled-fg)`; a `.error-state__detail` rule with `--font-small-size` and `color: var(--color-text-muted)`; the existing hover and `[aria-disabled="true"]` rules unchanged; all within the `globals-css.test.ts` limits |

</frozen-after-approval>

## Code Map

- `frontend/lib/contracts.ts` (modified, types only) -- `ErrorCode`, `LimitKind`, `ErrorEnvelope` -- D18.
- `frontend/lib/demo.ts` (new) -- `DEMO_TIMEOUT_MS`, `isErrorEnvelope`, `classifyDemoReply`, `requestDemo(signal)` -- D7, D11.
- `frontend/lib/demo-errors.ts` (new) -- the error and retry matrix as data -- D10, D12.
- `frontend/components/DemoProvider.tsx` (new) -- demo state (`idle` / `loading` / `success` / `error`), the synchronous guard, request ids, `mountedRef`, abort on unmount, `announce` and focus calls -- D5–D10.
- `frontend/components/DemoBanner.tsx` (new) -- D2.
- `frontend/components/DemoControls.tsx` (new) -- `Last opp`, fixed settings, note, `Vis eksempel` (G-2 ref callback) -- D3–D5, D13, D17.
- `frontend/components/DemoOutcome.tsx` (new) -- S1 guidance, S3 loading, S4 heading + notice, S5 error state -- D6, D8, D9, D17.
- `frontend/components/DemoIcon.tsx`, `WarningIcon.tsx`, `UploadIcon.tsx` (new, one icon each) -- D2, D4, D8.
- `frontend/app/page.tsx` (modified) -- wraps `main` in `DemoProvider` inside `AppStatusProvider`; renders the banner first in `main` and the two demo components inside the sections -- D1.
- `frontend/app/globals.css` (modified, appended rules only, within the constraints above) -- `demo-banner`, `notice-warning`, `upload-bar`, `settings-field`, disabled selects, `button-primary:disabled`, `loading-indicator` (+ reduced motion), `error-state__detail`, the demo heading, the guidance and note -- D6, D14, D15, D17, D19.
- `frontend/__tests__/demo-request.test.ts` (new) -- D11 classification, the request shape, the timer lifecycle.
- `frontend/__tests__/demo-start.test.tsx` (new) -- rows A1–A10, B1–B5, B7–B14, C1–C5, E1–E19, F1–F2, G1–G3.
- `frontend/__tests__/demo-css.test.ts` (new) -- rows B6 and G4 (reduced motion, the disabled-button and disabled-select rules, the muted `.error-state__detail` rule) and the D15 wrap rules, without changing `globals-css.test.ts`.
- `frontend/__tests__/startup-check.test.tsx` (modified, **compatibility correction C1 only**).
- Read-only: everything under "Never".

## Compatibility correction C1 (`frontend/__tests__/startup-check.test.tsx`)

Exactly three existing tests render `<Home />` with `validStatus()` (demo mode) and assert behaviour this story deliberately changes (verified at Checkpoint 83):

| Test | Line | Assertion that would fail | Why |
|---|---|---|---|
| "first-load success: Starter … gone, Resultater empty, focus not moved" | 106 | L109 `results().textContent` is `""`; L110 `results().children` has length 0 | the demo S1 guidance is now in Resultater |
| "retry success without a registered target: S0x gone, focus on the header h1" | 250 | L257 `results().textContent` is `""` (fails first); L259 focus is `title()` | the demo S1 guidance is now in Resultater; D13 registers `Vis eksempel`, so focus goes there |
| "strict mode: the first request is aborted by cleanup without showing S0x" | 441 | L453 `results().textContent` is `""` | the demo S1 guidance is now in Resultater |

**The change:** in these three tests only, the successful status reply becomes `fakeResponse(200, { ...validStatus(), mode: "real" })`. These tests check mode-independent startup behaviour (S0 → ready, focus not moved, no timers; fallback focus when nothing is registered; Strict Mode abort), and real mode is where that behaviour stays observable; their assertions stay unchanged. No other test in the file changes (all S0/S0x tests, the custom-tree tests at L277, L311, L352, L380 and the unmount tests at L409, L427 are unaffected; `page.test.tsx` is unaffected).

**Demo coverage kept:** the demo-mode equivalents are mandatory new rows: A9 (first-load success: guidance only, focus on `<body>`, nothing announced, no timers, no `POST`), F1 (recovery focus on `Vis eksempel`) and A10 (Strict Mode startup in demo), plus B13 (Strict Mode request).

**Note:** Story 2.4 (real-mode S1 guidance) will affect L106 and L441 again; its spec must handle that.

## Approval gates

- **G0:** this spec approved and frozen; the spec commit on branch `story/1-15-demo-start-screen-and-vis-eksempel`.
- **G1 — code and tests:** the files in the Code Map and C1; `npm test`, `npm run build` and `npm run lint` pass; the backend suite is unchanged and passes.
- **G2 — manual checks** (recorded in the session log):
  - **M-1 keyboard:** Tab to `Vis eksempel`; activate with **Enter**, and in a fresh load with **Space**; a second Enter/Space during S3 sends nothing (DevTools Network); focus stays on the button through S3 and S4; after an error focus is on the headline.
  - **M-2 reduced motion:** DevTools "Emulate prefers-reduced-motion: reduce" → the indicator is static.
  - **M-3 reflow:** 320 CSS px width and 200% zoom → no horizontal scroll; the upload bar, banner, notices and error state wrap (G-4).
  - **M-4 readability and hover:** the disabled selects' values and the disabled `Last opp` are readable (not faded by the browser); hovering over `Last opp` changes nothing (no enabled colours, `not-allowed` cursor).
- **G3 — commit:** the usual approval of the exact staged file list.
- No wording gate: every string is already approved.

## Tasks & Acceptance

**Execution** (after G0):
- [ ] `contracts.ts` types, `lib/demo.ts`, `lib/demo-errors.ts`, with `demo-request.test.ts` -- D7, D10–D12, D18.
- [ ] Icons, banner, controls, outcome, provider, `page.tsx` -- D1–D9, D13, D17.
- [ ] `globals.css` additions with `demo-css.test.ts` -- D6, D14, D15, D19.
- [ ] `demo-start.test.tsx` -- the rows listed in the Code Map.
- [ ] C1 in `startup-check.test.tsx` (the three tests only).
- [ ] Manual checks M-1 to M-4 (G2).

**Acceptance Criteria:**
- Given the frontend, when `npm test`, `npm run build` and `npm run lint` run, then all pass with no new dependency: the existing tests (reference value 214, from GitHub CI run 43746150320 on 2026-11-15; not re-run for this draft), of which only the three C1 tests change their input, plus the new ones.
- Given the backend, when `uv run pytest -q` runs, then it is unchanged (reference value 1,132 from the same CI run).
- Given the implementation commits, when their changed paths are listed per commit, then they are exactly the Code Map files and C1.

## Dependencies & deferred work

- **Depends on:** Story 1.5 (startup check, status region, focus target hook) and Story 1.13 (`POST /api/demo`, `GenerationResponse`, `isGenerationResponse`, `samples/demo-response.json`), both merged.
- **Provides for:** Story 1.16 (the validated response in the provider state; the results section; the banner and settings to be locked; D-5), Story 1.17 (page links), Story 1.21 (`Tilbake til start` resets to demo S1 and focuses `Vis eksempel`), Epic 2 (the error-text module and `ErrorCode`/`LimitKind` mirrors can be extended).
- **Closes, at closeout, if verified:** `issues.md:23` (G-2) for the demo part (Story 2.4 keeps the real-mode part: `Last opp`), and `issues.md:24` (G-3).
- **Proposed `issues.md` items at closeout (for the developer's review):** (1) the CF-2 deviation: reconcile the demo error mapping with UX-DR-34/EXPERIENCE.md; (2) the demo S3 **visual** locked-bar presentation is not assigned to a story (Story 1.16's AC covers S4 only); the behavioural S3 lock is implemented here (D6a).
- **Not affected:** the Story 1.14 documentation-route item, the Story 2.2 duty, U-1, the final fixture, the Story 2.1 duties.
- **Manual-test duty:** G-4 (`issues.md:25`) — M-3.

## Open questions

None. CF-1, CF-2 and OQ3–OQ6 were decided by the developer at Checkpoint 84 (recorded in "Conflicts and deviations", D3, D4, D9, D11, D17 and D19).

## Assumptions

- `POST /api/demo` behaves as merged and as probed at Checkpoint 83: no body → 200 with exactly `samples/demo-response.json`; a body → 400; busy → 409; real mode → 403; missing sample → 500 with an 8-hex `reference_id`; envelopes carry no extra keys; every reply carries `access-control-allow-origin` for the allowed origin.
- A bodiless `POST` without `Content-Type` is a CORS simple request (`allow_methods=["GET", "POST"]` in `application.py`); a preflight would also succeed.
- The demo reply arrives in well under 120 s; the timeout is a safety net only.

## Independent-review checklist

- [ ] Every Story 1.15 acceptance criterion maps to matrix rows.
- [ ] No duplicate request is possible (B2, B3, B13, C3, E15, E17), including in React Strict Mode.
- [ ] Timeouts and transport failures during the body read are network failures; only a parse failure is unknown (B7–B9, E8).
- [ ] Classification never shows malformed or wrong-mode data as results (E7–E11).
- [ ] Focus is never lost to `<body>`; focus moves only to the error headline (every error, E16) and to `Vis eksempel` after a successful startup retry (F1).
- [ ] Errors are not announced; loading and success are announced once each.
- [ ] The texts are exactly the approved strings; no new wording slipped in.
- [ ] No scope leakage into Stories 1.16–1.21 or Epic 2.
- [ ] C1 is limited to the three named tests, and demo coverage is kept (A9, A10, B13, F1).
- [ ] The CSS stays within `globals-css.test.ts`'s limits, and the disabled `Last opp` has no hover change (D19, G4).
- [ ] S3 is behaviourally locked (D6a, B14); only the visual locked bar is deferred to Story 1.16.
- [ ] Real mode and S0/S0x are unchanged (A8, G1, F2).

## Approval and freeze boundary

- **G0 done:** the developer approved revision 4 at Checkpoint 89 on 2026-11-16. Revisions 1–4 before approval are recorded in the Spec Change Log.
- At G0 the sections from "Intent" to the end of "I/O & Edge-Case Matrix" were wrapped in `<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">…</frozen-after-approval>` with an `<!-- APPROVED … -->` comment, and `status` became `ready-for-dev`. Only the developer can change the frozen block.
- Code Map, C1, gates, Tasks, Dependencies, Open questions, Assumptions, the checklist, Implementation Notes, Spec Change Log, Review Triage Log and Verification stay outside the frozen block.

## Implementation Notes

- **2026-11-16 — timer-lifecycle tests at provider level (Checkpoint 92):** `requestDemo` (`frontend/lib/demo.ts`) owns no timer (D7), so the timer parts of rows B7 and B8, and rows B10 and B11, are tested with the provider in `frontend/__tests__/demo-start.test.tsx` rather than in `demo-request.test.ts`, which tests the transport and classification parts of those rows. The same file also tests that an effect cleanup followed by a new setup while a request is in flight (React `<Activity>` hidden → visible, the same sequence as Fast Refresh) drops the aborted request's outcome through the stale request id.
- **2026-11-16 — known limitation: retained `loading` after cleanup → setup (Checkpoints 93–94; developer decision: keep frozen D7, document, defer recovery):** an effect cleanup during an in-flight request correctly aborts that request and makes its id stale (D7), but a following effect setup leaves the retained provider state at `loading` with no request in flight, so `Vis eksempel` stays aria-disabled until the page is reloaded. Reproducible with React `<Activity>` hidden → visible (asserted as current behaviour in `frontend/__tests__/demo-start.test.tsx`) and with Fast Refresh in development. `frontend/next.config.ts` enables `cacheComponents`, under which Next.js hides routes navigated away from with `<Activity>`; with the app's single route this is not reachable in production today. Recovery must be specified and implemented before a second route with client-side navigation is added. No frozen-spec amendment or behavioural change is authorized by Checkpoint 94; an `issues.md` item is proposed for the Story 1.15 closeout.

## Spec Change Log

- **2026-11-16 — revision 1 (draft, Checkpoint 82):** first draft from Story 1.15 (`epics.md:826-858`), UX-DR-2, -6, -9, -10, -17 to -20, -32 to -38, AD-11, AD-13, AR-13, `DESIGN.md`, `EXPERIENCE.md`, the existing frontend, and open items G-2, G-3 and G-4, applying the developer's Checkpoint 82 directions. Two conflicts (CF-1, CF-2), six open questions and one compatibility correction (C1). Not reviewed, not approved.
- **2026-11-16 — revision 2 (draft, Checkpoint 84):** applied the Checkpoint 83 review and the developer's decisions. CF-1 accepted; CF-2 recorded as an approved Story 1.15 deviation with corrected backend facts; OQ3–OQ6 decided. C1 now names exactly three tests (L106, L250, L441) with mandatory demo equivalents (A9, A10, B13, F1). D11: body read with `text()` + `JSON.parse`; transport failure or timeout at any point is a network failure, only a parse failure is unknown; strict envelope check mirroring `ErrorResponse` (keys, `limit`, 8-hex `reference_id` exactly for `internal_error`). D7: timer lifecycle, request ids, Strict-Mode-safe `mountedRef`. D9: focus on every error outcome; no detail line for an empty message. New D17 (unmocked visuals, D-5 interim), D18 (`ErrorCode`/`LimitKind`/`ErrorEnvelope`), D19 (disabled styling). CSS limits from `globals-css.test.ts` recorded. Keyboard rows automated with clicks plus manual M-1. One icon per file; a local `text()`-capable fetch fake; banner and Emnekode sources cited; FR-5/6/7 and AR-21 traced; baseline counts recorded as reference values. Matrix: 53 rows (A1–A10, B1–B13, C1–C6, E1–E19, F1–F2, G1–G3). Not approved.
- **2026-11-16 — revision 3 (draft, Checkpoint 86):** applied the Checkpoint 85 re-review and the developer's Checkpoint 86 decisions. M-NEW: a separate `.button-primary:disabled, .button-primary:disabled:hover` rule (D19), row G4, manual M-4 hover check. L-A: C1 lists L257 and L259 for the L250 test. L-B: the guidance uses `--color-text-muted` (6.60:1), the startup-message comparison removed (D17). L-C: the local fake's `text()` rejects with `AbortError` on abort; B8 states it. L-D: the `DemoTransport` hand-over type and `DemoOutcome`; cancellation (unmount or stale request) is decided before classification, so a timeout stays a network failure (D7, D11). L-E: disabled selects with explicit colour, `opacity: 1` and `-webkit-text-fill-color` (D19). L-F: the guidance appears only in S1 (D6, D17); the muted detail line is asserted (G4). Decisions recorded: D17 simple-text treatment, D-5 interim, and S3 behavioural locking (new D6a, row B14; the visual locked bar stays deferred to Story 1.16). Matrix: 55 rows (A1–A10, B1–B14, C1–C6, E1–E19, F1–F2, G1–G4). Not approved.
- **2026-11-16 — revision 4 (draft, Checkpoint 88):** applied the three LOW findings of the Checkpoint 87 verification; no design decision reopened. F1: D9 states that S5 replaces the S1 guidance (D17); row E14 asserts the guidance is absent in S5. F2: the disabled-select selector is exactly `.settings-field select:disabled` in D19 and G4, and D3 wraps each label-and-select pair in `<div class="settings-field">`. F3: the matrix preamble states that the fake `fetch` promise rejects with an `AbortError` `DOMException` when aborted before headers (as `stubControllableFetch`), separately from the `text()` abort; B7 and B8 name their distinct cases. Matrix: still 55 rows. Not approved.
- **2026-11-16 — Checkpoint 89: G0 approval.** The developer approved revision 4 (SHA-256 `88be9787a240305f77aaa08988a3a9ca61e4770c6b01fbe7d8ea504805e26851`) as the binding implementation specification, including the CF-1, CF-2, OQ3–OQ6 and Checkpoint 86 design decisions. Changes at approval only: `status` set to `ready-for-dev`, the draft comment replaced by the approval comment, the frozen-block markers added around "Intent" to the end of "I/O & Edge-Case Matrix" (content unchanged), the "Approval and freeze boundary" section updated to record G0, and these log entries. Implementation has not started.

## Review Triage Log

- **2026-11-16 — Checkpoint 83, independent adversarial review of revision 1:** REVISE BEFORE G0; no blockers; all approved strings verified character for character; the backend `POST /api/demo` replies probed in memory.
  - **H1 (applied):** C1 missed the Strict Mode startup test (L441) → C1 names L106, L250, L441 exactly.
  - **H2 (applied):** a timeout or transport failure during the body read would have been "unknown" → D11 rule 1, B8–B10, E18.
  - **M1 (applied):** Strict Mode → D7 (`mountedRef` set in setup, request only from the click handler, request ids), A10, B13.
  - **M2 (applied):** Enter/Space not automatable without `user-event` → click-based rows, `onClick` only, manual M-1.
  - **M3 (applied):** CSS limits of `globals-css.test.ts` → Always list.
  - **M4 (applied):** `reference_id` validation and empty message → D11, D9, E10, E13.
  - **M5 (applied):** D-10 visuals for the guidance and the note; D-5 interim → D17, C5.
  - **M6 (applied):** focus on every error outcome → D9, E16.
  - **M7 (applied):** CF-2 recorded as a deviation with corrected facts (`insufficient_content` from a fixture `status`; empty or invalid fixtures give `ai_output_invalid`).
  - **L1 (applied with H1):** demo equivalents A9, A10, B13, F1. **L2–L8 (applied):** banner source, Emnekode source, `ErrorCode`/`LimitKind` mirrors, FR-5/6/7 and AR-21 traced, readable disabled styling (D19), one icon per file, local `text()` fake. **L9 (applied):** counts recorded as reference values.
  - **Observations:** O1 (probe results) recorded under Assumptions; O3 noted under the error matrix; O4 (demo S3 lock) proposed for `issues.md` at closeout; O5 (`aria-describedby`) not adopted (optional in EXPERIENCE.md); O6 noted in E7; O7 confirmed.
  - **Decisions (developer, Checkpoint 84):** CF-1 ACCEPT; CF-2 MODIFY (deviation recorded); OQ3 MODIFY (regex, row, empty-message rule); OQ4 ACCEPT; OQ5 ACCEPT (readable disabled styling); OQ6 ACCEPT.
- **2026-11-16 — Checkpoint 85, independent re-review of revision 2:** REVISE BEFORE G0 (small revision); all 18 earlier findings resolved in substance; backend replies re-probed; 53 rows confirmed; all strings verified.
  - **M-NEW (MEDIUM, applied):** the existing `.button-primary:hover:not([aria-disabled="true"])` rule would restyle the natively disabled `Last opp` on hover → separate `:disabled`/`:disabled:hover` rule (D19), G4, M-4.
  - **L-A (applied):** C1 L250 test fails first at L257, then L259.
  - **L-B (applied):** guidance colour made consistent (`--color-text-muted`).
  - **L-C (applied):** the fake's `text()` rejects with `AbortError` on abort (B8).
  - **L-D (applied):** explicit `DemoTransport`/`DemoOutcome` types; cancellation decided before classification.
  - **L-E (applied):** explicit colour and `opacity: 1` on disabled selects.
  - **L-F (applied):** guidance only in S1; muted detail line asserted (G4).
  - **Decisions (developer, Checkpoint 86):** D17 simple-text treatment approved; D-5 interim approved (note visible in temporary S4); S3 locking per UX-DR-19 applied behaviourally (D6a, B14), with the visual locked bar deferred to Story 1.16.
- **2026-11-16 — Checkpoint 87, independent verification of revision 3:** REVISE BEFORE G0 (three one-line edits); M-NEW and L-A to L-E verified (M-NEW by computed specificity, a jsdom cascade check and the `globals-css.test.ts` lookups re-run in memory with the new rules appended); L-F partly resolved; the three design decisions consistent with the UX documents, with the S3 visual lock openly recorded as unowned (closeout `issues.md` proposal); 55 rows and all 26 Norwegian strings confirmed.
  - **F1 (LOW, applied):** no row checked the guidance is gone in S5 → D9 and E14.
  - **F2 (LOW, applied):** ambiguous disabled-select selector → `.settings-field select:disabled` in D3, D19 and G4.
  - **F3 (LOW, applied):** the fake `fetch` abort before headers was unstated → matrix preamble, B7.
- **2026-11-16 — Checkpoint 89: APPROVED by the developer (G0)** (revision 4).
  - **The decision:** the spec is frozen and set to `ready-for-dev`; gate G0 is met. The approval covers the specification only; no implementation is authorized by this checkpoint.
  - **What it fixes:** the requirements, D1–D19 (with D6a), CF-1 and CF-2, the error and retry matrix and the 55-row I/O matrix.
  - **Open findings:** none from Checkpoints 87 and 88.
  - **What changed at approval:** the status, the approval comment, the frozen-block markers, the "Approval and freeze boundary" wording and these log entries only.

## Verification

**Commands:**
- `cd frontend && npm test` -- expected: all pass
- `cd frontend && npm run build && npm run lint` -- expected: success
- `cd backend && uv run pytest -q` -- expected: unchanged, all pass
- `git show --name-only --format= <implementation commits…> | sort -u` -- expected: exactly the Code Map files and `frontend/__tests__/startup-check.test.tsx` (C1)
- `git diff -- frontend/package.json frontend/package-lock.json backend/` -- expected: empty

**Manual checks (G2):** M-1 to M-4 as listed under "Approval gates".
