import { vi } from "vitest";
import type { StatusResponse } from "../lib/contracts";

/** The backend's default `GET /api/status` reply (demo mode). */
export function validStatus(): StatusResponse {
  return {
    mode: "demo",
    limits: { max_upload_bytes: 10485760, max_pdf_pages: 80, max_text_chars: 200000 },
    options: {
      detail_level: { values: ["brief", "standard", "detailed"], default: "standard" },
      output_language: { values: ["nb", "en"], default: "nb" },
    },
    accepted_types: ["application/pdf", "text/plain"],
  };
}

/** A minimal stand-in for a fetch `Response`. */
export function fakeResponse(status: number, body: unknown, invalidJson = false): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (invalidJson) throw new SyntaxError("Unexpected token");
      return body;
    },
  } as unknown as Response;
}

export interface PendingRequest {
  url: string;
  init: RequestInit;
  signal: AbortSignal;
  resolve: (response: Response) => void;
  reject: (error: unknown) => void;
}

/**
 * Stubs global `fetch` with requests that stay open until a test settles them.
 * An aborted signal rejects the request, as real `fetch` does.
 */
export function stubControllableFetch() {
  const requests: PendingRequest[] = [];
  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init: RequestInit = {}) =>
      new Promise<Response>((resolve, reject) => {
        const signal = init.signal as AbortSignal;
        signal.addEventListener("abort", () =>
          reject(new DOMException("The operation was aborted.", "AbortError")),
        );
        requests.push({ url: String(input), init, signal, resolve, reject });
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, requests };
}
