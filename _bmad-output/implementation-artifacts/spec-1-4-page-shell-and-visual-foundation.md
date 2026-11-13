---
title: 'Story 1.4: Page shell and visual foundation'
type: 'feature'
created: '2026-11-13'
status: 'done'
route: 'dispatch'
baseline_commit: 'b1c1214'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The frontend is still the starter page (`lang="en"`, title "Create Next App", "Hello world!"), with no design tokens, focus ring, landmarks or status region, so no later UI story has an accessible, approved foundation to build on.

**Approach:** Turn every DESIGN.md token into a CSS custom property, add the global focus ring and base styles, and render the single-page shell (`lang="nb"`, title, header with `h1` and logo, `main` with the two named regions, one empty status region with a clear-then-set helper), covered by Vitest.

## Boundaries & Constraints

**Always:**
- Every DESIGN.md frontmatter token exists as a CSS custom property with its exact value: 27 colours, 9 typography roles (size, weight, line height; one shared system font stack), 3 radii, the spacing scale and every size token (UX-DR-1).
- Light mode only; system font stack only (no web fonts, `@font-face`, CDN or external asset); no shadows or gradients; sizes are minimums (`min-height`/`min-width`), never fixed `height` (UX-DR-1, AD-13).
- `:focus-visible { outline: var(--focus-ring-width) solid var(--color-focus); outline-offset: var(--focus-ring-offset) }` applies to every focusable element and is never removed or overridden (UX-DR-3).
- `<html lang="nb">`, `<title>AI Study Buddy</title>`; `<header>` with `h1` `AI Study Buddy` and the inline open-book logo (`aria-hidden="true"`, `focusable="false"`, stroke `currentColor`); `<main>` with `<section aria-label="Opplasting og innstillinger">` then `<section aria-label="Resultater">`, names fixed; content centred, at most 960px; nothing sticky or fixed (UX-DR-4, UX-DR-5).
- Exactly one visually hidden `<div role="status" aria-live="polite" aria-atomic="true">`, present and empty from the first render, with a helper that clears it and sets the new text on the next tick, so repeated messages are announced (UX-DR-20).
- All interface text is Norwegian Bokmål as approved; rendered as plain text (AD-18).

**Never:**
- Add npm packages, a CSS framework, a component library, an icon library, dark-mode styles or `next/font`.
- Call the backend or `/api/status`, or build the startup states (Story 1.5), the DEMO banner (1.15), the upload bar contents (2.4–2.5) or the results area contents (1.16+); announce errors through the status region.
- Change the backend, CI, README, dependencies or lockfiles.
- Use anything from `architecture/technology.md` (an external reference, not this project's architecture).
- Touch `.claude/`, `_bmad/`, `CLAUDE.md`, `.logs/`, planning documents or `sprint-status.yaml`; stage, commit or push without the developer's approval.

## Decisions (developer)

- Architecture source: `architecture/architecture-G42-eide-2026-10-26/ARCHITECTURE-SPINE.md` only; visual source: DESIGN.md frontmatter; behaviour source: EXPERIENCE.md. Where the refined mockup conflicts with these (for example its header `span` instead of an `h1`), the approved documents win (DESIGN.md Open Question 4 rule).
- **D-8 (type sizes outside the scale, option A, 2026-11-13):** the settings-field value uses the `ui` role (17px / 500); the demo results heading uses the `heading` role (20px / 600). Recorded as role-assignment tokens; the surfaces are built in Stories 2.4 and 1.16.
- **D-9 (paddings outside the scale, option A, 2026-11-13):** snap to the nearest spacing step and add padding tokens: notice 8px / 16px, flashcard 32px / 48px, quiz card 16px / 24px, page side padding 48px (header 12px / 48px). Only the page and header padding are used in this story.
- **Spec length:** kept whole, as for Stories 1.2 and 1.3, although it exceeds the workflow's 1,600-token guideline.
- **Status helper:** safe for repeated and rapid announcements and for cleanup, with no extra machinery: at most one pending timer; a new `announce` cancels the previous pending one, so only the latest message is set; unmounting the region cancels any pending timer and stops further updates.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First render | page loads | `lang="nb"`, title, header `h1` + logo, `main` with the two named regions in order, one empty status region | N/A |
| Keyboard focus | Tab to any focusable element | 3px outline in the focus colour, 2px offset | N/A |
| Announce | `announce("Henter eksempel …")` | region empty, then the text on the next tick | N/A |
| Repeat announce | same text twice | cleared and set again, so it is announced twice | N/A |
| Empty announce | `announce("")` | region stays empty | N/A |
| Region not mounted | `announce()` before the region exists | no error, nothing announced | no exception |
| Rapid announces | `announce("A")` then `announce("B")` before the tick | region empty, then only "B" | the pending "A" is cancelled |
| Unmount while pending | region unmounts before the tick | nothing set after unmount | pending timer cleared; no warning or error |

</frozen-after-approval>

## Code Map

- `frontend/app/layout.tsx` -- starter `RootLayout` with `lang="en"` and metadata title "Create Next App"; set `lang="nb"` and `title: "AI Study Buddy"` (remove the starter description). Server component.
- `frontend/app/page.tsx` -- starter `Home` (`<main><div>Hello world!</div></main>`); becomes the shell. Server component; client parts go into their own components.
- `frontend/app/globals.css` -- only the system font stack today ("Design tokens arrive in Story 1.4"); becomes the token sheet and base styles. Imported once by `layout.tsx`.
- `frontend/__tests__/page.test.tsx` -- one rendering test (`getByRole("main")`); extend or replace.
- `frontend/vitest.config.mts` -- jsdom, `globals: true`; jsdom does not apply `globals.css` (Next.js imports CSS at build), so token and focus-ring tests must read the CSS file as text.
- `frontend/package.json` -- no new dependencies needed; adding any would hit the npm 10.9.3 lockfile limitation (deferred-work.md).
- DESIGN.md frontmatter (`_bmad-output/planning-artifacts/ux-designs/ux-G42-eide-2026-10-27/DESIGN.md`, lines 1–268) -- the token source: `colors` (27), `typography` (9 roles, same font stack), `rounded` (sm 6, md 10, lg 12), `spacing` (1–8 = 4–48px; `control-min-height` 44px, `target-min` 24px, `reflow-min-width` 320px, `measure-answer` 65ch, `content-max-width` 960px, `border-hairline` 1px, `border-header-rule` 2px, `border-emphasis` 3px, `focus-ring-width` 3px, `focus-ring-offset` 2px); `components.app-header` (surface background, 2px primary bottom rule, brand typography, primary logo colour).
- Refined mockup (`…/mockups/direction-refined-rolig.html`, line 237) -- the logo: `<svg viewBox="0 0 24 24"><path d="M3 6.5c3-1.5 6-1.5 9 0v13c-3-1.5-6-1.5-9 0zM21 6.5c-3-1.5-6-1.5-9 0v13c3-1.5 6-1.5 9 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`, rendered 30×30px; header layout `display:flex; align-items:center; gap:12px`.
- `layout.tsx` uses the Next-generated global `LayoutProps` type; `next build` generates it (CI runs `npm run build`).

## Tasks & Acceptance

**Execution:**
- [x] `frontend/app/globals.css` -- every DESIGN.md token as a custom property on `:root` (`--color-*`, `--font-family`, `--font-<role>-size/-weight/-line-height`, `--radius-*`, `--space-1…8` and the size tokens; the D-8 role tokens `--font-settings-value-*` (= `ui`) and `--font-demo-heading-*` (= `heading`); the D-9 padding tokens `--padding-notice: 8px 16px`, `--padding-flashcard: 32px 48px`, `--padding-quiz-item: 16px 24px`, `--padding-page-inline: 48px`, `--padding-header: 12px 48px`); base `html`/`body` styles (background, text colour, body typography); the global `:focus-visible` rule; a `.sr-only` visually-hidden class; the page frame (centred, `max-width: var(--content-max-width)`, side padding `--padding-page-inline`) and the header band (surface background, header rule, logo colour, brand typography, `--padding-header`) -- UX-DR-1, UX-DR-3, UX-DR-5, D-8, D-9.
- [x] `frontend/app/layout.tsx` -- `lang="nb"`, `title: "AI Study Buddy"` -- UX-DR-5.
- [x] `frontend/components/Logo.tsx` -- the mockup's open-book SVG, `aria-hidden="true"`, `focusable="false"`, stroke `currentColor` -- UX-DR-4.
- [x] `frontend/components/StatusRegion.tsx` -- client component rendering the single empty, visually hidden status region, and an exported `announce(message)` that clears the region and sets the message on the next tick; at most one pending timer (a new call cancels the previous one); the effect cleanup on unmount clears the pending timer and detaches the setter; no-op when the region is not mounted; never used for errors -- UX-DR-20.
- [x] `frontend/app/page.tsx` -- the shell: `<header>` (logo + `h1` `AI Study Buddy`), `<main>` with the two named, empty sections in order, and the status region -- UX-DR-5.
- [x] `frontend/__tests__/` -- Vitest for every matrix row and AC: landmarks, `h1`, region names and order, the empty status region and its attributes, `announce` (fake timers: clear then set, repeats, empty, unmounted, rapid calls set only the latest, unmount while pending sets nothing and logs no React warning), the logo attributes, `lang` and title (from `RootLayout`'s returned element and the `metadata` export, since jsdom cannot render `<html>` inside a container), and the CSS file read as text: every token with its exact value, the focus-ring rule, and no `box-shadow`, gradient, `@font-face`, `prefers-color-scheme: dark`, fixed `height:`, `position: sticky/fixed` or `outline: none`.

**Acceptance Criteria:**
- Given the frontend, when `npm ci && npm test && npm run build` run, then all tests pass and the build compiles and type-checks.
- Given `npm run dev`, when the page is opened, then it shows the header band with the logo and `AI Study Buddy` and the two empty regions, and makes no request to any external host.
- Given the repository, when inspected, then no npm dependency, backend file, README or planning document changed.

## Implementation Notes

- `announce` writes the region's `textContent` directly; React never renders children into the region, so the clear and the set cannot be batched into one render (a repeated message is still announced).
- The header title uses `{colors.text}` per DESIGN.md `app-header`; only the logo is teal (the mockup's teal title is overridden by the approved documents).
- The status region is rendered after `<main>` (the spec does not fix its position).
- `.sr-only` uses `max-height: 1px` (not `height`) to respect the no-fixed-`height:` rule; it stays hidden via `width: 1px`, `overflow: hidden` and `clip-path: inset(50%)`.
- `.page` has `max-width: calc(var(--content-max-width) + 2 * var(--padding-page-inline))`, so the content itself is at most 960px.

## Spec Change Log

## Review Triage Log

Review iteration 1 (2026-11-13): blind-hunter (BH), edge-case-hunter (ECH), verification-gap (VG: no gaps found). No intent_gap or bad_spec entries, so no loopback; patches sent to the implementation subagent.

| # | Source | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | BH, ECH | Page-frame test matches `max-width`/`margin: 0 auto` anywhere in the file | low | `.app-header__inner` has both declarations, so the test passes with `.page` removed | patch |
| 2 | BH | Header band and base `body` styles from the `globals.css` task are not tested | low | The CSS tests check tokens, the focus rule, `.sr-only` existence and forbidden patterns only; a regression in `.app-header`, its title or `body` goes unnoticed | patch |
| 3 | BH | Tests do not check that the markup carries the CSS classes | low | `page.test.tsx` never reads `className` on `header`, `h1`, `svg` or `main`; a rename on either side breaks the layout with all tests green | patch |
| 4 | BH, ECH | "Nothing sticky or fixed" DOM test cannot fail | low | It reads inline `el.style.position`; the shell sets no inline styles and jsdom does not apply `globals.css`. The CSS-text test already covers this | patch (delete) |
| 5 | BH | No test for `announce("")` cancelling a pending message | low | The empty-announce test runs the timers between the two calls, so the cancel path for an empty message is never exercised | patch |
| 6 | BH, ECH | A non-owning `StatusRegion` unmounting cancels the owner's pending announcement | low | The cleanup calls `cancelPending()` before the `regionNode === node` check. Unreachable today (one instance), but the fix only moves the call inside the existing guard | patch |
| 7 | BH, ECH | A second `StatusRegion` silently takes over; no dev warning | low | Only `page.tsx` renders it and the spec requires exactly one; a warning adds a new branch for an unreachable case | reject |
| 8 | ECH | Region remounting with a new node between `announce` and the tick writes to an uncleared node | false | Unmount cleanup cancels the pending timer, so the old timer can never fire into the new node; a new node also renders empty | reject |
| 9 | ECH | Forbidden `outline: none` pattern misses `outline: 0px`, `outline-width: 0`, `outline-style: none` | low | The regex only matches `outline:` followed by `none` or `0` | patch |
| 10 | ECH | "Never overridden" focus ring not enforced | low | The test reads only the first `:focus-visible` block; a later `button:focus-visible` override would pass | patch |
| 11 | ECH | `tokenValue` reads only the first definition | low | A later redefinition of a token with a wrong value would pass the exact-value checks | patch |
| 12 | BH | `.sr-only` uses `max-height: 1px` instead of the standard `height: 1px` | false | The region stays hidden: `width: 1px`, `overflow: hidden`, `white-space: nowrap` and `clip-path: inset(50%)`; the spec forbids fixed `height:` | reject |
| 13 | BH, ECH | No narrow-screen handling; 48px side padding at 320px leaves 224px | false | DESIGN.md: "no breakpoints were decided"; AF-11 requires no two-dimensional scrolling at 320px, which holds (the `h1` wraps between words, nothing has a fixed width). 48px is the approved D-9 value | reject |
| 14 | BH | Form controls do not inherit the font | low | Real for future controls, but the shell has none; not caused by this change | defer (Story 1.5, first control) |
| 15 | BH, ECH | `sprint-status.yaml` changed despite the Never list; spec `in-review` vs sprint `in-progress` | false | The orchestrator made the change under the bmad-build workflow with the developer's explicit approval (2026-11-13); the Never list binds the implementation. `in-review` is the spec's internal status; the story moves to `review` in step 5, as in Story 1.3 | reject |

## Design Notes

- Page order matches EXPERIENCE.md: header → (notices, Story 1.15/2.4) → `Opplasting og innstillinger` → `Resultater`; the results section follows the upload section directly in tab order.
- The shell has no focusable element yet; the focus-ring rule is verified as CSS text, and by hand once a later story adds a control (Story 1.5 adds `Prøv igjen`).

## Verification

**Commands:**
- `cd frontend && npm ci && npm test` -- expected: all pass
- `cd frontend && npm run build` -- expected: compiles and type-checks
- `cd frontend && npm run lint` -- expected: no errors

**Manual checks:**
- `npm run dev`, open `http://localhost:3000`: header band with teal logo and `AI Study Buddy`, light background, no external requests in the browser's network panel, page tab title `AI Study Buddy`, `<html lang="nb">` in the inspector.
- `git status`: only the frontend files above and this spec changed; BMAD folders still untracked.
