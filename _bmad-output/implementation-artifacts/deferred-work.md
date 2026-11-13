# Deferred Work

Findings deferred by the developer during reviews. Each entry names its source spec, the reason it is real, the risk, and a suggested follow-up.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-set-up-the-project-from-the-approved-starters.md`
  summary: The local npm 10.9.3 (bundled with Node 22.19.0) cannot generate a new `frontend/package-lock.json`; the committed lockfile was made once with a temporary npm 11.
  evidence: Triage finding 3. In a scratch copy (2026-11-10), npm 10.9.3 left the committed lockfile byte-identical (`npm install --package-lock-only`: up to date), but generating a lock from `package.json` alone failed with `Cannot read properties of null (reading 'edgesOut')` in arborist. The trigger is vitest 5.0.5's optional `@vitest/browser-*` peers resolving to 5.1.x. `npm ci` and `npm install` with the committed lockfile work on npm 10.9.3.
  risk: The first story that adds or changes a frontend dependency (likely Story 1.4 or later) may hit the same crash on npm 10.9.3.
  follow-up: Before the next frontend dependency change, decide between (a) running that one change through `npx npm@11` and checking `npm ci` on npm 10.9.3 afterwards, as in Story 1.1, or (b) revisiting D-13 to allow an npm-only upgrade. Do not upgrade tools without the developer's approval.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-set-up-the-project-from-the-approved-starters.md`
  summary: `npm audit` reports 8 moderate findings in the frontend, all from one minimatch advisory in the ESLint tooling.
  evidence: Triage finding 4. All 8 trace to GHSA-g3hv-75wg-m249 (minimatch denial of service via globparts amplification, affected `>=7.0.0 <11.0.1`). Installed path: `eslint-config-next` 16.4.6 → `typescript-eslint` 8.72.2 → `@typescript-eslint/typescript-estree` 8.72.2 → `minimatch` 10.2.6. As of 2026-11-10, the latest `@typescript-eslint/typescript-estree` still requires `minimatch ^10.2.2`, so no fix exists within approved ranges; npm's only suggested fix is a downgrade to `eslint-config-next@15.5.29`, which does not match Next.js 16.4.x.
  risk: Low. The package is dev-only lint tooling: it is not in the app bundle and does not run in CI.
  follow-up: Re-check `npm audit` whenever frontend dependencies change; take a `typescript-eslint` or `eslint-config-next` release that allows `minimatch >=11.0.1` once one exists. Do not run `npm audit fix --force` or downgrade `eslint-config-next`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-set-up-the-project-from-the-approved-starters.md`
  summary: No automated test checks that the backend actually serves HTTP; the Story 1.1 test only checks that `app.main.app` is a FastAPI instance.
  evidence: Triage finding 5. `backend/tests/test_app.py` needs only `fastapi`, so removing `uvicorn` from the dependencies would not fail CI. Startup on `127.0.0.1:8000` was verified manually on 2026-11-10.
  risk: Low. The README start command could break without CI noticing.
  follow-up: Story 1.2 (backend settings and the status endpoint), which adds `httpx`, should include an HTTP test of `GET /api/status` through FastAPI's `TestClient`.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-4-page-shell-and-visual-foundation.md`
  summary: The base styles do not make form controls inherit the font, so buttons, inputs, selects and textareas would use the browser default font instead of the token stack.
  evidence: Story 1.4 triage finding 14. `globals.css` sets typography on `html` and `body` only; browsers do not inherit `font` into form controls by default. The Story 1.4 shell has no controls, so nothing is affected yet.
  risk: Low. Visible only once a story adds the first control.
  follow-up: Story 1.5 (first control, `Prøv igjen`) should add `button, input, select, textarea { font: inherit; }` to `globals.css`, with a CSS-text test.
