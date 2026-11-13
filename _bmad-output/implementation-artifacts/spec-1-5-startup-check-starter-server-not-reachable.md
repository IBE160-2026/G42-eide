---
title: 'Story 1.5: Startup check (Starter … / server not reachable)'
type: 'feature'
created: '2026-11-13'
status: 'done'
route: 'dispatch'
baseline_commit: 'de924d0a0e1b7ce8eacb913ae989510046520827'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The page shell never contacts the backend, so a student or reviewer whose server is not running sees an empty page with no explanation, and later stories have no checked mode, limits or options to build on.

**Approach:** On load, call `GET /api/status` once; show `Starter …` while it runs, keep the validated status in client state on success, and on any failure show the S0x error state with an accessible `Prøv igjen` retry, covered by Vitest.

## Boundaries & Constraints

**Always:**
- S0: the `Resultater` section shows `Starter …` as plain text; not announced (no live region, no `announce()`), no controls (UX-DR-6).
- S0x, inside `Resultater`: error state with error icon, `<h2 tabindex="-1">Får ikke kontakt med appens server</h2>`, action text `Sjekk at serveren er startet, og trykk «Prøv igjen».`, then a `Prøv igjen` primary button; focus moves to the headline; no `role="alert"`, no live-region announcement (UX-DR-32).
- `Prøv igjen` is `type="button"`, never native `disabled`. While its re-check runs it stays in place with `aria-disabled="true"`, keeps focus, the S0x content stays, and activation does nothing; a repeated failure moves focus to the headline again (UX-DR-18).
- Frontend TS types mirror `StatusResponse` with identical `snake_case` names (AR-13, AR-24).
- Copy verbatim as approved (Norwegian Bokmål), rendered as plain text; styles only from existing DESIGN.md tokens.
- Includes the deferred Story 1.4 rule: form controls inherit the font (`deferred-work.md`).

**Never:**
- Add npm packages, change the backend, CI, README, dependencies or lockfiles, or use anything from `architecture/technology.md`.
- Build the upload bar, notices or DEMO banner (2.4–2.5, 1.15), `Vis eksempel` or `Last opp`, results (1.16+), or a Next.js proxy.
- Show a backend `message`, `reference_id` or HTTP status in S0x; retry automatically; cache the status response.
- Touch `.claude/`, `_bmad/`, `CLAUDE.md`, `.logs/`, planning documents or `sprint-status.yaml`; stage, commit or push without the developer's approval.

## Decisions (developer, 2026-11-13, all option A)

- **D-7:** both named sections stay mounted from the first render; S0 and S0x render inside `Resultater`; `Opplasting og innstillinger` stays empty (no upload bar, no notices) before the mode is known.
- **G-2:** a focus-target hook: later stories register the control that receives focus after a *successful retry* (`Last opp` in real mode, Story 2.4; `Vis eksempel` in demo mode, Story 1.15), and it takes priority. Until one is registered, focus goes to the header `h1` (given `tabindex="-1"`), never to `<body>`. A successful first load moves no focus.
- **Failure:** S0x on a network error, a non-2xx reply, or a 2xx reply whose body fails a runtime shape check of the status response.
- **Timeout:** each status request is aborted after 10 seconds and treated as a failure.
- **S0x content:** only the fixed headline, action text and `Prøv igjen`; no backend detail line, even when the reply has an error envelope.
- **Base URL:** `NEXT_PUBLIC_API_BASE_URL`; when missing or empty, `http://127.0.0.1:8000`.
- Architecture source: `ARCHITECTURE-SPINE.md` only; visual source DESIGN.md; behaviour source EXPERIENCE.md.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Pending | page loads, request open | `Starter …` in `Resultater`; no button; status region empty | N/A |
| First-load success | valid 200 body | `Starter …` gone, `Resultater` empty, status kept; focus not moved | N/A |
| Network error | fetch rejects | S0x; focus on headline | no `role="alert"`, nothing announced |
| Non-2xx | e.g. 500 with error envelope | S0x without the backend message | as above |
| Malformed body | 200 with invalid JSON, wrong `mode`, or missing `limits`/`options`/`accepted_types` | S0x | as above |
| Timeout | no reply within 10 s | request aborted at 10 s (still S0 at 9.999 s), then S0x | as above |
| Retry running | `Prøv igjen` activated | button `aria-disabled="true"`, keeps focus; S0x stays; one new request | N/A |
| Activation while checking | click, `Enter` or `Space` again | nothing; no extra request | guarded handler |
| Repeated failure | retry fails or times out | button available again; focus on headline again | as above |
| Retry success, no target | retry gets a valid body | S0x gone; focus on header `h1` | N/A |
| Retry success, target registered | a later story registered an element | S0x gone; focus on that element | N/A |
| Target gone | registered element unmounted, disconnected, or cannot take focus | focus on header `h1` | stale unregister never clears a newer target; no `h1` → no focus move, no error |
| Shared status | several components read the status | all see the same state; one request per load or retry | N/A |
| Unmount while pending | component unmounts mid-request | request aborted; no state update, no warning | N/A |
| Missing base URL | env unset or empty | request to `http://127.0.0.1:8000/api/status` | N/A |

</frozen-after-approval>

## Code Map

- `frontend/app/page.tsx` -- server component from Story 1.4: header (logo + `h1.app-header__title`), `main.page` with the two empty sections, then `<StatusRegion />`. Add `id="app-title"` and `tabIndex={-1}` to the `h1`; wrap `main` in the new status provider and render `StartupCheck` inside `<section aria-label="Resultater">`. Keep the rest unchanged.
- `frontend/components/StatusRegion.tsx` -- the `announce()` helper; must not be called by this story (S0 and S0x are never announced). Its module-level pattern (one node, cleanup on unmount) is the model for the focus-target hook.
- `frontend/app/globals.css` -- tokens and base styles from Story 1.4 (`--color-*`, `--font-ui-*`, `--font-heading-*`, `--font-body-*`, `--radius-*`, `--space-*`, `--control-min-height`, `--border-hairline`, `--border-emphasis`); add rules here (no CSS modules).
- `backend/app/contracts/options.py` -- `StatusResponse{mode: "real"|"demo", limits: StatusLimits{max_upload_bytes, max_pdf_pages, max_text_chars}, options: StatusOptions{detail_level{values, default: "brief"|"standard"|"detailed"}, output_language{values, default: "nb"|"en"}}, accepted_types: list[str]}`; the source of truth to mirror. Read-only.
- `backend/app/config.py:90` -- CORS allows exactly `http://localhost:3000`; no backend change needed.
- `frontend/.env.example` -- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`; the fallback uses the same value.
- `frontend/__tests__/page.test.tsx`, `globals-css.test.ts` -- existing tests that read the shell and the CSS; `ruleBody(selector)` and `tokenValue(name)` helpers can be reused. Rendering `<Home />` now starts a fetch, so those tests must stub `fetch`.
- `frontend/package.json` -- Vitest, Testing Library (`react`, `dom`), jsdom; no `@testing-library/user-event`, and none may be added (npm 10.9.3 lockfile limit).
- DESIGN.md `button-primary`, `button-primary-hover`, `button-primary-disabled` (applies to `[aria-disabled="true"]`: dashed border, disabled colours, no hover change) and `error-state` (error tint, 3px left rule, `rounded.sm`, headline `heading` in error colour, action `body` in text colour). Error icon from the refined mockup (`direction-refined-rolig.html`, line 337), 20×20px: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/lib/contracts.ts` -- TS types mirroring `StatusResponse` and its parts with identical `snake_case` names and literal unions -- AR-13.
- [x] `frontend/lib/status.ts` -- `apiBaseUrl()` (env value, trimmed, one trailing slash removed; fallback `http://127.0.0.1:8000`); `isStatusResponse(value)` runtime shape check (mode in the union, three numeric limits, each option with a string-array `values` containing its `default`, `accepted_types` a string array); `fetchStatus(signal)` doing `GET {base}/api/status` with `cache: "no-store"`, returning the parsed status or throwing on network error, non-2xx, invalid JSON or failed shape check -- decisions Failure, Base URL.
- [x] `frontend/lib/focus-target.ts` -- G-2 hook, module-level like `announce`: `registerStartupFocusTarget(element): () => void` replaces the current target and returns an unregister that clears it only if that element is still the registered one (designed for a React ref callback's cleanup); `focusAfterStartupRecovery()` focuses the target if it is connected, then checks `document.activeElement`; if there is no target, it is disconnected, or focus did not land, it focuses `#app-title`; if that is missing too, it does nothing and never throws. Later stories register only the mode-appropriate control (`Last opp` real, `Vis eksempel` demo), so one target exists at a time -- decision G-2.
- [x] `frontend/components/ErrorIcon.tsx` -- the mockup's error icon, `aria-hidden="true"`, `focusable="false"`, stroke `currentColor`.
- [x] `frontend/components/AppStatusProvider.tsx` -- client component owning the only status request and its state, exposed through React context and `useAppStatus()` → `{phase: "starting" | "failed" | "retrying" | "ready", status: StatusResponse | null, retry()}` (throws a clear error outside the provider). One request on mount and per `retry()`, via an `AbortController` aborted by a 10-second `setTimeout` (cleared when settled) and on unmount; an aborted-by-unmount request changes nothing; `retry()` does nothing unless `phase` is `failed`. Stories 1.15 and 2.4 read `status` and `phase` from this hook instead of fetching -- AR-24, decisions Failure, Timeout.
- [x] `frontend/components/StartupCheck.tsx` -- client component using `useAppStatus()`: renders S0 (`starting`), S0x (`failed`, `retrying` with the button aria-disabled) or nothing (`ready`). Focus in effects on phase changes: headline on every entry into `failed` (including first load), `focusAfterStartupRecovery()` on `retrying` → `ready`, nothing on `starting` → `ready` -- UX-DR-6, UX-DR-18, UX-DR-32.
- [x] `frontend/app/page.tsx` -- `h1` gets `id="app-title"` and `tabIndex={-1}`; `<AppStatusProvider>` wraps `main` (both sections) so either section can read the status; `<StartupCheck />` inside `Resultater` -- D-7, G-2.
- [x] `frontend/app/globals.css` -- `button, input, select, textarea { font: inherit; }`; `.button-primary` (+ `:hover` when not `[aria-disabled="true"]`, + `[aria-disabled="true"]`), `.error-state` and its parts, `.startup-message`, all from tokens -- deferred item, UX-DR-1.
- [x] `frontend/__tests__/` -- `startup-check.test.tsx` with `fetch` stubbed and fake timers for every matrix row (shared status: two `useAppStatus()` consumers in different sections, `fetch` called once); `focus-target.test.ts` (register then unregister → `h1`; stale unregister keeps the newer target; disconnected target → `h1`; target that cannot take focus → `h1`; no `h1` → no throw); `status.test.ts` for `apiBaseUrl`, `isStatusResponse` (valid sample matching the backend's default reply, plus each malformed variant) and `fetchStatus`; update `page.test.tsx` (stub `fetch`; `h1` has `id` and `tabindex="-1"`; `StartupCheck` inside `Resultater`) and `globals-css.test.ts` (font-inherit rule; button, disabled and error-state rules use tokens).

**Acceptance Criteria:**
- Given the frontend, when `npm ci && npm test && npm run lint && npm run build` run, then all pass with no new dependency.
- Given S0x, when it renders, then no element has `role="alert"`, the status region stays empty, and the only interactive element in `main` is `Prøv igjen`.
- Given any S0x render, when inspected, then no backend `message`, `reference_id` or HTTP status appears.
- Given the repository, when inspected, then no backend, CI, README, dependency, lockfile or planning document changed.

## Implementation Notes

- `retry()` is guarded by a ref mirroring `phase` (set in handlers and request callbacks, never during render), so a second activation before React re-renders still sends no request; the button's click handler also returns early while `retrying`.
- S0x renders the same element tree in `failed` and `retrying`, so `Prøv igjen` and the headline keep their identity and focus while checking.
- `isStatusResponse` also requires every option value and default to be in the backend's literal union (stricter than "default in values").
- Shared test helpers (`validStatus`, `fakeResponse`, `stubControllableFetch`) live in `frontend/__tests__/status-fixtures.ts` (not a test file); the stubbed `fetch` rejects on abort like the real one.
- Extra tests beyond the matrix: React `StrictMode` double mount (first request aborted, no S0x, no focus move) and `useAppStatus()` outside the provider throwing.

## Spec Change Log

## Review Triage Log

Review iteration 1 (2026-11-13): blind-hunter (BH), edge-case-hunter (ECH), verification-gap (VG). No intent_gap or bad_spec entries, so no loopback; patches sent to the implementation subagent.

| # | Source | Finding | Verdict | Evidence | Route |
|---|---|---|---|---|---|
| 1 | VG | `retry()` guard outside `failed` is never tested on its own | low | VG (pre-verified): the button's `checking` guard stops repeat clicks first, so deleting the provider guard leaves the suite green; `retry` is the hook contract for Stories 1.15 and 2.4 | patch |
| 2 | BH, ECH | `isStatusResponse` accepts `0`, negative and fractional limits | low | `isNumber` only checks finiteness; the backend declares the limits `PositiveInt` (`backend/app/config.py`) | patch |
| 3 | BH, ECH | "No raw colour" CSS test can pass vacuously; misses `rgb()`/`hsl()` | low | `rules.indexOf("button,")` = -1 would make `slice(-1)` check one character; the pattern only matches `#hex` | patch |
| 4 | ECH | Shared-status test covers only the first load, not a retry | low | The test asserts one `fetch` on load; the retry path with two consumers is untested | patch |
| 5 | BH | Timers cleared, unmount while `retrying`, and `status` null until `ready` are each tested on one path only | low | Timer count is checked only after first-load success; unmount only while `starting`; `status` value never asserted in `failed`/`retrying` | patch |
| 6 | VG, BH | The status fixture and allowed lists are hand-copied from the backend; nothing detects drift | medium | Today they match (verified against the live `TestClient` reply), but a backend change would leave all tests green and stick the app in S0x. Cross-stack test plumbing is outside this story; AR-13 mirrors by hand | defer |
| 7 | ECH | `accepted_types: []` passes the shape check | low | Unreachable: `ACCEPTED_TYPES` is a fixed non-empty constant in `backend/app/contracts/options.py`; the spec's shape check requires a string array only | reject |
| 8 | ECH | `Enter`/`Space` re-activation is not tested | false | Spec Design Notes: a native button maps `Enter`/`Space` to `click`, tests use `fireEvent.click`, keys are checked by hand; `@testing-library/user-event` may not be added | reject |
| 9 | BH | No diagnostics for why S0x appeared | false | Browsers already log network and CORS failures, and the network panel shows the status code and body; the spec forbids showing the cause in the UI | reject |
| 10 | BH | No "checking" text or `aria-busy` while retrying | false | EXPERIENCE.md: while the re-check runs the S0x message stays and the button is aria-disabled; new copy needs approval | reject |
| 11 | BH | Spec status `in-review` vs sprint `in-progress`; no recorded check results | false | `in-review` is the bmad-build step-4 status; the story moves to `review` in step 5, as in Story 1.4; results are recorded at the end of the review | reject |
| 12 | BH | Redundant `cleanup()` in `startup-check.test.tsx` | low | Harmless duplication of Testing Library's auto-cleanup; no named harm | reject |
| 13 | BH | `.button-primary` repeats `font-family`, hover repeats `color` | low | Cosmetic duplication with no rendering effect | reject |
| 14 | BH | `ErrorIcon` uses fixed `width`/`height` 20 instead of a token | false | DESIGN.md has no icon-size token; the logo uses the same pattern (30px) from Story 1.4 | reject |

## Design Notes

- Keyboard activation of a native `<button>` (`Enter`, `Space`) fires `click`, so one guarded click handler blocks all three; no `keydown` handler is added. Tests use `fireEvent.click`; `Enter`/`Space` are checked by hand.
- Use `setTimeout` plus `AbortController`, not `AbortSignal.timeout`, so fake timers control the 10-second limit.
- React development mode mounts effects twice: the first request must be aborted by cleanup without showing S0x.
- Status sharing: plain React context, no state library, no cache and no second fetch. `page.tsx` stays a server component; a client provider may wrap server-rendered children.
- Focus timing: React attaches refs (and runs ref callbacks) during commit, before effects run, so a target rendered in the same update that makes `phase` `ready` is already registered when `StartupCheck`'s effect calls `focusAfterStartupRecovery()`.
- Agent choices (not visible enough to need a decision), following the approved D-9 snap rule: error-state padding and icon gap 16px (`--space-4`; mockup 14/18px), button padding 8px/20px with `min-height: var(--control-min-height)`; the error state fills the `Resultater` width (the mockup's 720px is off-scale); `Starter …` in `body` typography and `text-muted` colour (an unmocked surface).

## Verification

**Commands:**
- `cd frontend && npm ci && npm test` -- expected: all pass
- `cd frontend && npm run lint && npm run build` -- expected: no errors; compiles and type-checks

**Manual checks:**
- Backend stopped, `npm run dev`, open `http://localhost:3000`: `Starter …`, then S0x with focus on the headline.
- Tab to `Prøv igjen`: 3px teal focus ring, 2px offset (the Story 1.4 focus-ring item). Press `Enter` and `Space`: aria-disabled while checking, focus kept, no second request in the network panel; on failure focus returns to the headline.
- Start the backend, press `Prøv igjen`: S0x disappears and focus lands on `AI Study Buddy`. Reload with the backend running: no S0x, focus not moved.
- `git status`: only the files above and this spec changed.
