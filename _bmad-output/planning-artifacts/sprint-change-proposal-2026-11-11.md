# Sprint Change Proposal — G-1: error statuses for unknown routes and unsupported methods

- **Date:** 2026-11-11
- **Project:** G42-eide (AI Study Buddy)
- **Workflow:** `bmad-correct-course`, Batch mode
- **Status:** approved by the developer on 2026-11-11
- **Scope:** Minor (direct adjustment, handed to the developer agent)

## 1. Issue summary

**Trigger:** gap G-1 from the sprint-planning readiness check (2026-11-10), still open after Story 1.2.

**Problem:** AD-11 required the common error body `{error_code, message, limit?, reference_id?}` on every non-2xx reply, including unknown routes. Its closed list of error codes, each with one fixed HTTP status, had no code for 404 or 405. A status could therefore not be chosen without amending AD-11. AD-11 also said nothing about CORS preflight replies or `HEAD`.

**Evidence:** a read-only probe of the Story 1.2 backend (`main` at `49ec7c4`) showed:

| Request | Status | Body |
|---|---|---|
| Unknown route (`GET /nope`) | 404 | `{"detail":"Not Found"}` |
| Wrong method (`POST`/`DELETE`/plain `OPTIONS` on `/api/status`) | 405 | `{"detail":"Method Not Allowed"}`, `Allow: GET` |
| `HEAD /api/status` | 405 | empty |
| CORS preflight from the allowed origin, any path | 200 | `OK` |
| CORS preflight from a rejected origin, method or header | 400 | plain text |

## 2. Developer decisions

1. **Option A:**
   - Unknown routes return HTTP 404 with `not_found`.
   - Unsupported methods return HTTP 405 with `method_not_allowed`, keeping the `Allow` header.
   - Both use the common error body.
2. **P1:** Starlette's standard CORS preflight behaviour is kept and documented as an exception to the error-body rule. A plain `OPTIONS` request (not a preflight) is an unsupported method.
3. **H1:** no route accepts `HEAD`. A `HEAD` request returns 405 with `Allow`, or 404 for an unknown path, with headers only and no body.
4. **Messages** (Norwegian Bokmål):
   - `not_found`: `Adressen finnes ikke.`
   - `method_not_allowed`: `Metoden støttes ikke for denne adressen.`
5. **Story 1.14:**
   - No new query-string requirement. The existing AD-20 wording ("ignores any query input") stays.
   - Unknown paths follow the 404 rule, and unsupported methods on the existing route follow the 405 rule.
6. **Included:** the Conventions "Errors" clarification, the AD-20 test reference, and memlog entries for the architecture and UX documents.

## 3. Impact analysis

- **Epics:**
  - Epic 1 can be completed as planned; no story is added, removed or reordered, so `sprint-status.yaml` is unchanged.
  - Story 1.3 and Story 1.14 acceptance criteria become explicit.
  - Epics 2 and 3 need no acceptance-criteria change, because their routes get 405 automatically once Story 1.3 is in place.
- **PRD:** no conflict and no change (FR-7 does not name status codes).
- **Architecture:** AD-11 (rule and table), AD-20 (sample PDF tests) and the Conventions "Errors" row.
- **Epics document:** AR-12, UX-DR-33, Story 1.3 and Story 1.14.
- **UX:** no new interface text. The two codes join the existing "unknown / other" row and the Reload-required group, which show `Noe gikk galt` / `Last inn siden på nytt, og prøv igjen.`.
- **Technical:**
  - No code changes in this correction.
  - Story 1.3 will add the two codes to the closed list in `contracts/`, error handlers for 404/405/validation errors, and the catch-all inside CORS.
  - `epic-1-context.md` becomes out of date and is rebuilt by `bmad-build` because the planning documents are newer.

## 4. Recommended approach

**Direct adjustment:** amend the planning documents before the Story 1.3 spec.
- **Effort:** low.
- **Risk:** low.
- **Not needed:**
  - a rollback, because Story 1.2 left this behaviour unchanged on purpose
  - an MVP review, because the MVP is unaffected

## 5. Detailed changes

1. **`architecture/…/ARCHITECTURE-SPINE.md`:**
   - **`updated:`** set to `2026-11-11`.
   - **AD-11 rule:**
     - names unsupported methods
     - adds the two exceptions: (1) CORS preflight replies keep the middleware defaults on any path, and a plain `OPTIONS` is an unsupported method; (2) no route accepts `HEAD`, which gets 405 with `Allow` (or 404 for an unknown path), headers only.
   - **AD-11 table:** adds `not_found` (404) and `method_not_allowed` (405, with an `Allow` header listing the supported methods).
   - **AD-20:** the sample PDF tests add "other paths return 404 `not_found` and methods other than `GET` (including `HEAD`) return 405 `method_not_allowed` with `Allow: GET`". "ignores any query input" is unchanged.
   - **Conventions "Errors" row:** "(CORS preflight and `HEAD` exceptions in AD-11)".
2. **`architecture/…/.memlog.md`:** one `(change)` entry.
3. **`epics.md`:**
   - **AR-12:** names unsupported methods, adds 404 and 405 to the status list, and exempts CORS preflight and bodyless `HEAD` replies.
   - **UX-DR-33:** adds `not_found` and `method_not_allowed` to the unknown/other codes.
   - **Story 1.3:**
     - the first acceptance criterion now says "any request fails" and names unsupported methods
     - new acceptance criteria for an unknown path (`not_found`, 404, `Adressen finnes ikke.`, the path never echoed), an unsupported method including plain `OPTIONS` (`method_not_allowed`, 405, `Metoden støttes ikke for denne adressen.`, `Allow`), a validation error (`invalid_request`, 400), `HEAD` (405 or 404, headers only) and CORS preflights (unchanged middleware replies, exempt)
     - the test acceptance criterion now covers the unsupported method, `HEAD` and both preflight cases.
   - **Story 1.14:**
     - "no other file is reachable; a path that matches no route follows the AD-11 unknown-route rule (`not_found`, 404)"
     - plus a new acceptance criterion: a method other than `GET` on `/api/demo/sample.pdf`, including `HEAD`, follows the 405 rule with `Allow: GET`; `HEAD` has headers only, and CORS preflights follow AD-11.
4. **`ux-designs/…/EXPERIENCE.md`:** the two codes are added to the "unknown / other" error row and the Reload-required group.
5. **`ux-designs/…/.memlog.md`:** one `(change)` entry.
6. **This proposal document.**
7. **`.logs/amma-kwaasi-eide/issues.md`:** G-1 and the Story 1.3 CORS-rejection item are marked resolved.
8. **`.logs/amma-kwaasi-eide/992-2026-11-11-20-23-01-g1-error-statuses.md`:** session log.

## 6. Implementation handoff

- **Developer agent, now:** apply changes 1–8 on branch `docs/g1-error-statuses` (from `main` at `49ec7c4`). Every commit, push and merge needs the developer's approval.
- **Developer agent, next:** run `bmad-build` for Story 1.3, which builds its spec from the amended AD-11, AR-12 and Story 1.3 acceptance criteria.
- **Done when:**
  - AD-11, AR-12, Story 1.3, Story 1.14 and the UX code lists agree
  - G-1 is closed in `issues.md`
  - the Story 1.3 spec has no open question about statuses, preflights or `HEAD`
