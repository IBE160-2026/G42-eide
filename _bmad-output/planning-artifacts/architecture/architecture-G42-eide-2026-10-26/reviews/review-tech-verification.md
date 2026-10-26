---
review: tech-verification
target: ../ARCHITECTURE-SPINE.md
reviewed: 2026-10-26
lens: "Every committed decision web-researched / reality-checked, not asserted from training data"
---

# Technology Verification Review — AI Study Buddy Architecture Spine

**Verdict: PASS with fixes.** Every version and every Anthropic API fact in the spine traces to a dated, official-source `(version)` entry in `.memlog.md`, and spot-checks today (2026-10-26) confirm them. The gaps are in what **create-next-app 16.4.x generates by default**, which the spine relies on ("via create-next-app, TypeScript, App Router") but never checked against AD-13's "fully offline demo / no runtime external frontend resources" rule. There are also a few small toolchain-consistency points.

## 1. Inventory and verification status

| # | Item (spine location) | Memlog evidence | Spot-check today | Status |
|---|---|---|---|---|
| 1 | Python 3.13.x (Stack) | L72 laptop 3.13.7; 3.13 supported to 2029-10 | All Python packages below declare `requires_python` that admits 3.13 and list a 3.13 classifier | verified |
| 2 | uv 0.8.15+ (Stack) | L67 current 0.13.5; L72 installed 0.8.15 | — | verified (see F-5) |
| 3 | FastAPI 0.162.x | L67 | PyPI 0.162.0, py>=3.10, needs `pydantic>=2.9.0`, `starlette>=0.46.0` → compatible with Pydantic 2.14 | verified |
| 4 | Uvicorn 0.54.x | L67 | PyPI 0.54.0, py>=3.10 | verified |
| 5 | Pydantic 2.14.x | L67 | PyPI 2.14.1, py>=3.10 | verified |
| 6 | pydantic-settings 2.16.x | L67 | PyPI 2.16.1, py>=3.11 | verified |
| 7 | python-multipart 0.0.32 | L67 | PyPI 0.0.32, py>=3.10 | verified |
| 8 | anthropic SDK 2.3.x | L67 | PyPI 2.3.0, py>=3.10, `pydantic<3,>=1.10`, uses `httpx2` | verified |
| 9 | pypdf 6.21.x (AD-8) | L45, L47 | PyPI 6.21.2, py>=3.9, BSD-3 | verified |
| 10 | pytest 9.1.x | L67 | PyPI 9.1.1, py>=3.10 | verified |
| 11 | Node 22.x LTS | L72 22.19.0, security support to 2027-04-30 | — | verified |
| 12 | Next.js 16.4.x | L67 | npm 16.4.3, `engines.node >=20.9.0` → Node 22 OK; peer `react ^18.2 \|\| ^19` | verified |
| 13 | React 19.x | L67 | npm 19.3.1; create-next-app 16.4.3 pins `react`/`react-dom` **19.3.0** exactly | verified |
| 14 | Vitest 5.0.x | L67, L72 | npm 5.0.5, `engines.node ^22.12 \|\| ^24 \|\| >=26` → 22.19 OK; peer `vite ^6.4\|\|^7\|\|^8` | verified (see F-4) |
| 15 | @testing-library/react 16.3.x | L67 | npm 16.3.3, peer react ^19, peer `@testing-library/dom ^10` | verified (see F-4) |
| 16 | create-next-app defaults (TypeScript + App Router) | L68 states the choice only; **defaults not checked** | See F-1, F-2, F-3 | **unverified → partially conflicting** |
| 17 | Model `claude-haiku-5-5` (AD-5) | L23 official models overview + pricing | Model listed in current docs (prompting guide for Haiku 5.5) | verified |
| 18 | Effort `low` (AD-5) | L23 says default effort medium; `low` not explicitly confirmed | Effort doc: `low` is a valid level; Haiku 5.5 defaults to `medium`; set via `output_config.effort` | verified (today) |
| 19 | Structured outputs via `output_config.format` (AD-9) | L18, L24 official doc | Structured-outputs doc: `output_config.format`, `client.messages.parse()`; SDK ≥1.0 rejects old `output_format` | verified |
| 20 | `messages.count_tokens`, free (AD-15) | L59 official doc | Python SDK doc and token-counting doc show `client.messages.count_tokens(...)`; it accepts `output_config`, so schema overhead can be counted | verified |
| 21 | `max_retries=0` disables SDK retries (AD-15) | L62 states the decision, **no source cited** | Python SDK doc: "retried by default … use the `max_retries` option … `max_retries=0` (default is 2)" | verified (today) |
| 22 | 90 s timeout (AD-15) | no source | Python SDK doc: `timeout` option (float or `httpx2.Timeout`), default 10 min, raises `APITimeoutError` | verified (today) |
| 23 | Prepaid credits, auto-reload off (AD-15) | L25 official support + pricing FAQ (2026-10-26) | — (Console UI; cannot check without an account) | verified (by memlog); default state of auto-reload unknown, as memlog notes |
| 24 | Dedicated Console workspace with its own spend limit (AD-6) | L33 rate-limits doc | Rate-limits doc today: "You can't set spend limits on the default Workspace." | verified |
| 25 | Provider retention/training wording (AD-7) | L26 privacy.claude.com | — | verified (by memlog) |
| 26 | Gemini paid-tier-only fallback (AD-5) | L19, L27 ai.google.dev terms | — (deferred, not built) | verified, and correctly deferred with a re-check gate |
| 27 | GitHub Actions CI, secret scanning (AD-6, AD-21) | none | not checked: generic, stable features | unverified (low risk) |

## 2. Findings

### F-1: create-next-app default layout loads Google Fonts, which conflicts with AD-13 "fully offline"
- **Status:** incompatible (unverified starter default)
- **Severity:** Medium
- **Evidence:** create-next-app 16.4.3 template `templates/app-tw/ts/app/layout.tsx` imports `Geist`, `Geist_Mono` from `next/font/google`: https://raw.githubusercontent.com/vercel/next.js/v16.4.3/packages/create-next-app/templates/app-tw/ts/app/layout.tsx. next/font docs: "CSS and font files are downloaded at build time and self-hosted … No requests are sent to Google by the browser." https://nextjs.org/docs/app/api-reference/components/font
- **Why it matters:** The browser makes no request to Google, so the letter of AD-13 holds. But the Next.js dev/build process downloads the fonts from Google. The demo runs on `next dev`, so a fresh clone or empty cache with no internet shows font-fetch errors and falls back to other fonts, and `next build` can fail. "Fully offline demo" is therefore not guaranteed out of the box.
- **Fix:** Add to AD-13 (or the Structural Seed): "After scaffolding, remove `next/font/google` from `app/layout.tsx`; use system fonts, `next/font/local` with a committed font file, or the `geist` npm package." Then add the offline demo check (network off, fresh `.next/`) to the AD-20 manual UI checklist.

### F-2: Next.js telemetry and create-next-app "Agent feedback" are on by default
- **Status:** unverified (starter default not considered)
- **Severity:** Medium-Low
- **Evidence:** create-next-app docs, recommended defaults: "TypeScript, ESLint, No React Compiler, Tailwind CSS, No src/ directory, App Router, Cache Components, AGENTS.md, Agent feedback" https://nextjs.org/docs/app/api-reference/cli/create-next-app. The template writes `experimental: { agentFeedback: true }` into `next.config` (templates/index.ts @ v16.4.3). Telemetry is opt-out (`NEXT_TELEMETRY_DISABLED=1` / `next telemetry disable`): https://nextjs.org/telemetry
- **Why it matters:** AD-13 says "no network calls" in demo mode, and the project makes privacy claims. The Next.js dev server sends anonymous telemetry to Vercel by default. Neither of these carries document content, but both are outbound calls that the spine doesn't account for.
- **Fix:** Scaffold with "customize settings" and answer No to Agent feedback (or delete the `experimental.agentFeedback` line). Set `NEXT_TELEMETRY_DISABLED=1` in `frontend/.env` or the npm scripts and in CI. Narrow AD-13's wording to "no network calls from the app at runtime; dev-tool telemetry disabled".

### F-3: Other create-next-app 16.4 defaults the spine doesn't mention (Tailwind, ESLint, Cache Components, AGENTS.md, Turbopack, TypeScript ^5)
- **Status:** unverified (no conflict found)
- **Severity:** Low
- **Evidence:** Same docs page and templates/index.ts @ v16.4.3. Recommended defaults include Tailwind v4 (`@tailwindcss/turbopack` when using Turbopack), ESLint 9, `cacheComponents: true` + `partialPrefetching: true`, no `src/` directory, AGENTS.md. Dev dependencies are pinned `typescript: "^5"` and `@types/node: "^20"`.
- **Why it matters:**
  - No `src/` matches the Structural Seed.
  - Cache Components is harmless for a client-side fetch UI, but it adds concepts a beginner doesn't need.
  - The memlog records "typescript 7.0.2" as the latest version, but the starter installs TS **5.x**. Don't hand-upgrade it.
  - `@types/node ^20` doesn't match Node 22 and Vitest's `@types/node` peer (`^22 || >=24`). Expect a peer warning.
  - A generated AGENTS.md overlaps with the project's own agent instructions.
- **Fix:** Add one line to the Stack table: "create-next-app 16.4.x with recommended defaults except: Agent feedback off; Cache Components optional (off preferred); keep TS ^5 from the starter; bump `@types/node` to ^22." Styling/Tailwind is deferred to `bmad-ux`, so note that it gets installed anyway.

### F-4: Vitest setup for Next.js needs packages the Stack table doesn't list
- **Status:** unverified
- **Severity:** Low
- **Evidence:** npm `vitest@5.0.5` peer `vite ^6.4 || ^7 || ^8`, optional `jsdom`/`happy-dom`. `@testing-library/react@16.3.3` peer `@testing-library/dom ^10`: https://registry.npmjs.org/vitest/latest, https://registry.npmjs.org/@testing-library/react/latest
- **Fix:** At implementation, follow the current Next.js "Vitest" guide (nextjs.org/docs/app/guides/testing/vitest). Add `@vitejs/plugin-react`, `jsdom` and `@testing-library/dom` to the frontend dev dependencies, with versions fixed by `package-lock.json`. Optionally list them in the Stack table.

### F-5: uv version drift between laptop (0.8.15) and CI
- **Status:** outdated (known, deferred)
- **Severity:** Low
- **Evidence:** memlog L67/L72: current uv 0.13.5, installed 0.8.15. CI (`astral-sh/setup-uv`) installs the latest uv unless pinned.
- **Why it matters:** `uv.lock` written by an older uv can be rewritten or flagged by a much newer uv (`uv sync --locked` failures in CI).
- **Fix:** Update uv locally before `uv init` (with approval), or pin the same uv version in the CI workflow. State it in AD-21 or the Stack row: "CI uses the same uv version as the laptop".

### F-6: AD-15 SDK behaviours were asserted, not sourced, in the memlog
- **Status:** verified today (memlog provenance gap only)
- **Severity:** Info
- **Evidence:** https://platform.claude.com/docs/en/api/sdks/python (Retries: `max_retries=0`, default 2. Timeouts: `timeout=` float, default 10 min, `APITimeoutError`. `client.messages.count_tokens`.) https://platform.claude.com/docs/en/build-with-claude/effort (`output_config.effort`, `low` valid, Haiku 5.5 default `medium`.)
- **Fix:** Add one `(version)` memlog entry citing these two pages, dated 2026-10-26. Optionally note in AD-5/AD-15 that both `effort` and `format` go in the same `output_config` object.

### F-7: GitHub Actions / secret scanning not checked
- **Status:** unverified
- **Severity:** Low
- **Fix:** At CI-setup time, confirm the current major versions of `actions/checkout`, `actions/setup-node` (node-version 22) and `astral-sh/setup-uv`. Confirm that secret scanning and push protection are enabled in the public repo's settings.

## 3. Compatibility matrix (checked 2026-10-26)

| Pair | Constraint | Result |
|---|---|---|
| Python 3.13 × fastapi/uvicorn/pydantic/python-multipart/anthropic/pytest | requires_python >=3.10 | OK |
| Python 3.13 × pydantic-settings | >=3.11 | OK |
| Python 3.13 × pypdf | >=3.9 | OK |
| FastAPI 0.162 × Pydantic 2.14 | pydantic>=2.9 | OK |
| anthropic 2.3 × Pydantic 2.14 | pydantic<3,>=1.10 | OK |
| Node 22.19 × next / create-next-app 16.4.3 | >=20.9.0 | OK |
| Node 22.19 × vitest 5.0.5 | ^22.12 | OK |
| React 19.3 × Next 16.4.3 | peer ^19.0.0 (starter pins 19.3.0) | OK |
| React 19 × @testing-library/react 16.3.3 | peer ^19 | OK |
| @types/node ^20 (starter) × vitest peer | ^22 \|\| >=24 | Peer warning (F-3) |
| create-next-app default fonts × AD-13 offline | next/font/google fetched by dev/build | Conflict (F-1) |
| Next telemetry / agentFeedback × AD-13 "no network calls" | opt-out | Conflict in wording (F-2) |

## 4. Sources consulted today
- PyPI JSON: https://pypi.org/pypi/{fastapi,uvicorn,pydantic,pydantic-settings,python-multipart,anthropic,pypdf,pytest}/json
- npm: https://registry.npmjs.org/{next,create-next-app,react,vitest,@testing-library/react}/latest
- https://nextjs.org/docs/app/api-reference/cli/create-next-app
- https://raw.githubusercontent.com/vercel/next.js/v16.4.3/packages/create-next-app/templates/index.ts and `templates/app-tw/ts/app/layout.tsx`
- https://nextjs.org/docs/app/api-reference/components/font, https://nextjs.org/telemetry
- https://platform.claude.com/docs/en/api/sdks/python
- https://platform.claude.com/docs/en/build-with-claude/token-counting
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/build-with-claude/effort
- https://platform.claude.com/docs/en/api/rate-limits
