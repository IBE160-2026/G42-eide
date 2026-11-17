import type { ErrorEnvelope, GenerationResponse } from "./contracts";
import { isGenerationResponse } from "./generation";
import { apiBaseUrl } from "./status";

/*
 * The demo request and its reply classification (Story 1.15, D7 and D11).
 *
 * `requestDemo` sends `POST {base}/api/demo` with no body and never throws: it resolves
 * to a `DemoTransport`, either the whole body text or `rejected` (a network error, or an
 * abort while waiting for the headers or reading the body). It owns no timer: the caller
 * creates the `AbortController` and the `DEMO_TIMEOUT_MS` timer, keeps the timer armed
 * until the reply is classified, and decides before classifying whether a result is
 * cancelled (unmounted or stale), in which case `classifyDemoReply` is never called.
 *
 * `classifyDemoReply` is pure. The HTTP status is never used: success and failure are
 * decided by the parsed body (`error_code` present or not), as AD-11 and AR-12 require.
 */

/** The client timeout for one demo request, covering headers and body (UX-DR-19). */
export const DEMO_TIMEOUT_MS = 120_000;

/** What `requestDemo` hands over: the whole body text, or a rejection of any kind. */
export type DemoTransport = { kind: "body"; text: string } | { kind: "rejected" };

/** The classified reply. `code` is any valid envelope's code, known or not. */
export type DemoOutcome =
  | { kind: "success"; response: GenerationResponse }
  | { kind: "error"; code: string; message: string; referenceId?: string }
  | { kind: "network" }
  | { kind: "unknown" };

const ENVELOPE_KEYS: readonly string[] = ["error_code", "message", "limit", "reference_id"];
const LIMIT_KINDS: readonly string[] = ["bytes", "pages", "characters", "tokens"];
const REFERENCE_ID = /^[0-9a-f]{8}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Runtime check of an AD-11 error body, mirroring the backend's `ErrorResponse`
 * (`extra="forbid"`): only the four keys; a non-empty string code; a string message;
 * `limit` exactly for `file_too_large` and one of the four kinds; `reference_id` exactly
 * for `internal_error` and eight lowercase hexadecimal characters. Optional keys must be
 * absent, not present with another value.
 */
export function isErrorEnvelope(value: unknown): value is ErrorEnvelope {
  if (!isRecord(value)) return false;
  if (!Object.keys(value).every((key) => ENVELOPE_KEYS.includes(key))) return false;
  const code = value.error_code;
  if (typeof code !== "string" || code === "") return false;
  if (typeof value.message !== "string") return false;

  const hasLimit = Object.hasOwn(value, "limit");
  if (hasLimit !== (code === "file_too_large")) return false;
  if (hasLimit && (typeof value.limit !== "string" || !LIMIT_KINDS.includes(value.limit))) {
    return false;
  }

  const hasReference = Object.hasOwn(value, "reference_id");
  if (hasReference !== (code === "internal_error")) return false;
  if (hasReference && (typeof value.reference_id !== "string" || !REFERENCE_ID.test(value.reference_id))) {
    return false;
  }
  return true;
}

/** The pure classification of D11 (rules 1–5). */
export function classifyDemoReply(transport: DemoTransport): DemoOutcome {
  // Rule 1: any rejection, including the timeout abort, is a network failure.
  if (transport.kind === "rejected") return { kind: "network" };

  // Rule 2: a fully received body that is not JSON.
  let body: unknown;
  try {
    body = JSON.parse(transport.text);
  } catch {
    return { kind: "unknown" };
  }

  // Rule 3: an `error_code` decides that this is an error, whatever the HTTP status.
  if (isRecord(body) && Object.hasOwn(body, "error_code")) {
    if (!isErrorEnvelope(body)) return { kind: "unknown" };
    return body.reference_id === undefined
      ? { kind: "error", code: body.error_code, message: body.message }
      : { kind: "error", code: body.error_code, message: body.message, referenceId: body.reference_id };
  }

  // Rule 4: a valid demo success reply.
  if (isGenerationResponse(body) && body.mode === "demo") {
    return { kind: "success", response: body };
  }

  // Rule 5: anything else.
  return { kind: "unknown" };
}

/**
 * `POST {base}/api/demo` with no body and no `Content-Type` (a CORS simple request;
 * the backend refuses any non-empty body). Resolves with the whole body text, or with
 * `rejected` if `fetch` or reading the body rejects for any reason. Never throws.
 */
export async function requestDemo(signal: AbortSignal): Promise<DemoTransport> {
  try {
    const response = await fetch(`${apiBaseUrl()}/api/demo`, {
      method: "POST",
      cache: "no-store",
      signal,
    });
    const text = await response.text();
    return { kind: "body", text };
  } catch {
    return { kind: "rejected" };
  }
}
