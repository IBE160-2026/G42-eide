---
review: rubric-walker
target: ../ARCHITECTURE-SPINE.md
companions: [../.memlog.md, ../../../prds/prd-G42-eide-2026-09-16/prd.md]
date: 2026-10-26
---

# Rubric Review — Architecture Spine (AI Study Buddy)

## Verdict

The spine is solid and close to build-ready: it has a clear paradigm, a closed error list, one owner for each contract, verified versions, and good cost and secret controls for a public repo with a USD 5–10 budget. It still has a handful of **contract gaps where two stories could reasonably build different things**. The biggest are: a Gate 2/Gate 3 ordering problem that turns honest `insufficient_content` replies into `ai_output_invalid`; an unclear demo/contract fixture shape; error codes that are not fixed for the cost gate and the call cap; and replies that are not in the envelope (framework 404/422 bodies). None of these needs a redesign. Each can be fixed with one line in the spine.

## Rubric walk

| Check | Result |
| --- | --- |
| Fixes the real divergence points | Mostly. Gaps: F1–F7 |
| Rules are enforceable and prevent their divergence | Mostly. F1, F4, F6, F8 weaken specific rules |
| Nothing deferred could let units diverge | Pass. Deferred items are UX, prompt wording, configurable values and out-of-scope features |
| Named tech verified-current | Pass. The memlog has dated `version` entries (PyPI, npm, nodejs.org, platform.claude.com). Minor: F11 |
| Greenfield (no codebase to ratify) | Pass |
| Covers FR-1..FR-7, SM-1..SM-3, constraints | Pass. All FRs are mapped. SM-2 and SM-C1 are bound but not mapped (F13) |
| Every owned dimension decided, deferred or open | Mostly. The frontend→backend base-URL config and the local run commands are not covered (F9) |
| Terse: decisions, not rationale | Mostly. Some process and procedure content could move out (F14) |

## Findings

### F1 — AD-10 Gate 2 vs Gate 3 ordering breaks `insufficient_content` · **high**
- **Issue:** Gate 2 requires "all fields present; no empty text" before Gate 3 checks `status`. A model that honestly answers `status: "insufficient_content"` will often send an empty or short summary and empty lists. Gate 2 then fails it, and the reply becomes `ai_output_invalid` instead of `insufficient_content`. This undermines FR-7 and SM-1, and the story that builds Gate 2 and the story that builds the prompt will disagree about what an "insufficient" reply looks like.
- **Fix:** Have Gate 2 read `status` first: when it is `insufficient_content`, only check shape (lists may be empty, text may be blank) and go straight to the `insufficient_content` code.

### F2 — AD-12 / AD-13: the shared fixture's shape is ambiguous · **high**
- **Issue:** The demo connector returns the raw AI result (the AD-9 shape *with* `status`, plus a stop reason). The frontend consumes the AD-11 success envelope (`mode`, results *without* `status`, `skipped_pages`). AD-12 says this one fixture is validated by both backend Pydantic and frontend TS types, but it cannot match both shapes. Backend and frontend stories will pick different shapes.
- **Fix:** State that `samples/` holds the raw AI-output fixture (AD-9 + stop reason), and that frontend contract tests use a committed success-envelope fixture derived from it (or a backend test that generates it).

### F3 — AD-15 / AD-11: error codes for the cost gate and the call cap are not fixed · **medium**
- **Issue:** AD-15 says the backend "refuses above the AD-14 ceiling" and "refuses further real calls" at the call cap, but does not name codes. The memlog says `file_too_large` for the first and "`ai_credits_exhausted`-style" for the second. Using `ai_credits_exhausted` for a local cap would wrongly tell the user that their Anthropic credit is gone, and implementers will invent different answers.
- **Fix:** In AD-15, map the token ceiling to `file_too_large` (limit: tokens) and the call cap to a named code, either an explicit new `ai_call_cap_reached` or a documented reuse with its own message.

### F4 — AD-11 / Conventions: some replies fall outside the envelope · **medium**
- **Issue:** The rule says "only the AD-11 envelope". In practice:
  - `POST /api/demo` returns a plain HTTP 404 in real mode.
  - FastAPI returns `{"detail": ...}` 422 bodies for malformed multipart or forms.
  - The HTTP status per code is only "4xx/5xx". It is unclear what `insufficient_content`, `generation_in_progress` and `ai_output_invalid` return.

  The frontend `fetch` handling will vary from story to story.
- **Fix:** Add exception handlers for 404/422/500 that return the envelope. Fix a per-code HTTP status table, or state that "the frontend always parses the JSON body and ignores the status".

### F5 — AD-4: the connector's "typed failure" set and the provider-error mapping are not defined · **medium**
- **Issue:** AD-4 says the connector returns "a typed failure" but never lists those failures, and it does not say which layer maps Anthropic errors (429, 529 overloaded, credit balance too low, timeout, connection error) to `ai_unavailable`, `ai_rate_limited` or `ai_credits_exhausted`. The real connector, the test fakes and the stage-6 mapping could each do this differently.
- **Fix:** List the connector failure kinds (`unavailable`, `rate_limited`, `credits_exhausted`, `timeout`), state that only `connectors.real` maps provider errors to them, and state that the pipeline maps them 1:1 to AD-11 codes.

### F6 — AD-12: the frontend fixture check cannot be enforced as written · **medium**
- **Issue:** "Frontend tests validate it against the TS types" does nothing at runtime, and when imported JSON is type-checked its string unions widen (for example `"demo"` becomes `string`). Drift would not fail CI as claimed.
- **Fix:** Name the mechanism: a small hand-written runtime type guard (or a schema library) that runs in Vitest over the fixture.

### F7 — AD-17 / Open Questions: the option lists are unresolved but the contracts depend on them · **medium**
- **Issue:** The `detail_level` and `output_language` values are still open. They live in the backend contracts, the TS mirror, the form and the prompt, so the stories touching each of these will each pick their own values.
- **Fix:** Fix a minimal MVP list now, for example `detail_level: brief|standard|detailed` and `output_language: en|nb`, and allow it to be extended later as an AD-11-style "change all together" rule.

### F8 — AD-14 / AD-7: the "abort while receiving" rule conflicts with FastAPI's default upload handling · **medium**
- **Issue:** With FastAPI `UploadFile` / `File()`, the whole multipart body is parsed and spooled (to disk above about 1 MB) *before* the handler runs. Counting bytes "while reading" in the handler is too late, and the spooling creates the temp file that AD-7 then has to delete. A beginner will probably build the default version and believe it complies.
- **Fix:** Name the enforcement point: a Content-Length check plus a streaming byte-limit in ASGI middleware or a `request.stream()` reader, with the temp-file cleanup tested.

### F9 — Operational envelope: the frontend's backend URL and the local run setup are not covered · **medium**
- **Issue:** The environment diagram shows the ports, but nothing says how the frontend learns the backend URL. It would most likely be a `NEXT_PUBLIC_API_BASE_URL`, which is allowed under AD-6 because it is not secret, but it is unnamed. Nothing covers `frontend/.env.example`, the one-line start commands for each server (`uv run uvicorn …`, `npm run dev`), the log destination (console or file?), or the Windows-dev vs Linux-CI difference. These are owned dimensions that are neither decided nor deferred.
- **Fix:** Add a "Local run" row to the Conventions table covering: the API base URL env var plus `frontend/.env.example`, the start commands, logs to the console only, and CI on `ubuntu-latest`.

### F10 — AD-3: the CORS origin only matches `localhost` · **low**
- **Issue:** Opening the frontend at `http://127.0.0.1:3000` gives a CORS failure that a beginner will find hard to diagnose.
- **Fix:** Allow both `http://localhost:3000` and `http://127.0.0.1:3000` by default, or add a note telling users to always use `localhost`.

### F11 — Stack: TypeScript is not listed · **low**
- **Issue:** The memlog verified TypeScript 7.0.2, which is a major-version change (the native compiler). The version `create-next-app` installs may differ, and TypeScript is not in the Stack table, so stories may diverge on compiler behaviour.
- **Fix:** Add a TypeScript row (the version `create-next-app` 16.4 installs, pinned via the lockfile).

### F12 — Open Questions vs Stack: runtime versions · **low**
- **Issue:** The Stack table states Python 3.13 and Node 22 as fact, but the memlog marks this as ADOPTED-PENDING and the spine lists it as an open question.
- **Fix:** Mark these Stack rows "(pending OQ1)", or close the open question once the user confirms.

### F13 — Capability map: SM-2 and SM-C1 are bound but not mapped · **low**
- **Issue:** The front matter `binds` lists SM-2 and SM-C1, but the Capability map has no rows for explainability or the scope counter-metric.
- **Fix:** Add one row each, for example SM-2 → the reviewer explainer plus AD-1/AD-4 seams, and SM-C1 → Deferred / out-of-scope list.

### F14 — Terseness: some process content and rationale could move out · **low**
- **Issue:** AD-6 (7)–(8), the AD-7 citation-wording procedure, the AD-5 Gemini fallback detail (duplicated in Deferred), and parts of AD-19 and AD-21 (approval per commit) are operating procedures or rationale, not invariants that units could diverge on. They add length.
- **Fix:** Move the procedures to the memlog or a short CONTRIBUTING/SECURITY note, and keep a one-line rule in the spine.

### F15 — AD-16: the concurrency lock scope is not stated · **low**
- **Issue:** It is not stated whether `POST /api/demo` shares the one-pass lock, or whether the lock is released on every error path, including the token-count failure.
- **Fix:** "One process-wide lock covers both generate endpoints and is always released in `finally`."

### F16 — AD-10: page-list normalisation · **low**
- **Issue:** Gate 3 filters invalid pages but does not say whether duplicates are removed or the list is sorted. The display and contract tests may disagree.
- **Fix:** Add "pages are de-duplicated and sorted ascending after filtering."

## Strengths (keep)
- The closed error enum has an explicit "change together" rule (AD-11).
- Demo mode is enforced on the backend, labelled three times, and fully offline (AD-13).
- Paid-call controls are strong: free token count, `max_retries=0`, timeout, call cap, prepaid credit only (AD-15).
- Page markers have anti-spoofing, and the doc is honest that automated checks only prove a page exists (AD-8, AD-10, AD-20).
- Versions are verified in the memlog against registries and official docs, with dates.
