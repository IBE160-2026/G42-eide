import { apiBaseUrl } from "./status";

/*
 * The PDF source for page links in demo mode (Story 1.17, D4).
 *
 * The bundled sample PDF is served read-only by the backend (`GET /api/demo/sample.pdf`,
 * Story 1.14, AD-13). The base URL comes from `apiBaseUrl()`, so it keeps that helper's
 * behaviour: `NEXT_PUBLIC_API_BASE_URL` trimmed and without one trailing slash, and
 * `http://127.0.0.1:8000` when the variable is missing or empty.
 *
 * Real mode never uses this source (D3): Story 2.6 passes `null` (no links) and Story 2.7
 * supplies an object URL.
 */
export function demoPdfSource(): string {
  return `${apiBaseUrl()}/api/demo/sample.pdf`;
}
