import type { StatusResponse } from "./contracts";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000";

const AI_MODES: readonly string[] = ["demo", "real"];
const DETAIL_LEVELS: readonly string[] = ["brief", "standard", "detailed"];
const OUTPUT_LANGUAGES: readonly string[] = ["nb", "en"];

/**
 * The backend base URL from `NEXT_PUBLIC_API_BASE_URL`, trimmed and without
 * one trailing slash; `http://127.0.0.1:8000` when missing or empty.
 */
export function apiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
  if (raw === "") return DEFAULT_API_BASE_URL;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Limits are `PositiveInt` in the backend settings. */
function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isOption(value: unknown, allowed: readonly string[]): boolean {
  if (!isRecord(value)) return false;
  const { values, default: fallback } = value;
  return (
    isStringArray(values) &&
    values.every((item) => allowed.includes(item)) &&
    typeof fallback === "string" &&
    allowed.includes(fallback) &&
    values.includes(fallback)
  );
}

/** Runtime shape check of a `GET /api/status` body. */
export function isStatusResponse(value: unknown): value is StatusResponse {
  if (!isRecord(value)) return false;
  const { mode, limits, options, accepted_types } = value;
  if (typeof mode !== "string" || !AI_MODES.includes(mode)) return false;
  if (
    !isRecord(limits) ||
    !isPositiveInteger(limits.max_upload_bytes) ||
    !isPositiveInteger(limits.max_pdf_pages) ||
    !isPositiveInteger(limits.max_text_chars)
  ) {
    return false;
  }
  if (
    !isRecord(options) ||
    !isOption(options.detail_level, DETAIL_LEVELS) ||
    !isOption(options.output_language, OUTPUT_LANGUAGES)
  ) {
    return false;
  }
  return isStringArray(accepted_types);
}

/**
 * `GET {base}/api/status`. Resolves with the validated status; rejects on a
 * network error, an abort, a non-2xx reply, invalid JSON or a failed shape check.
 */
export async function fetchStatus(signal: AbortSignal): Promise<StatusResponse> {
  const response = await fetch(`${apiBaseUrl()}/api/status`, {
    method: "GET",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error("Status request failed");
  }
  const body: unknown = await response.json();
  if (!isStatusResponse(body)) {
    throw new Error("Status response has an unexpected shape");
  }
  return body;
}
