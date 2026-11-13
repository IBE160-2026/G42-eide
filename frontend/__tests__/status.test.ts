import { afterEach, describe, expect, test, vi } from "vitest";
import { apiBaseUrl, fetchStatus, isStatusResponse } from "../lib/status";
import { fakeResponse, validStatus } from "./status-fixtures";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("apiBaseUrl", () => {
  test("falls back to 127.0.0.1:8000 when the variable is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined);
    expect(apiBaseUrl()).toBe("http://127.0.0.1:8000");
  });

  test.each(["", "   "])("falls back when the variable is empty (%j)", (value) => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", value);
    expect(apiBaseUrl()).toBe("http://127.0.0.1:8000");
  });

  test("uses the trimmed value and removes one trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "  http://localhost:9000/  ");
    expect(apiBaseUrl()).toBe("http://localhost:9000");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:9000");
    expect(apiBaseUrl()).toBe("http://localhost:9000");
  });
});

describe("isStatusResponse", () => {
  test("accepts the backend's default reply, and real mode", () => {
    expect(isStatusResponse(validStatus())).toBe(true);
    expect(isStatusResponse({ ...validStatus(), mode: "real" })).toBe(true);
  });

  const malformed: [string, (s: Record<string, unknown>) => unknown][] = [
    ["null", () => null],
    ["an array", () => []],
    ["a string", () => "ok"],
    ["an unknown mode", (s) => ({ ...s, mode: "test" })],
    ["a missing mode", (s) => ({ ...s, mode: undefined })],
    ["missing limits", (s) => ({ ...s, limits: undefined })],
    [
      "a non-numeric limit",
      (s) => ({ ...s, limits: { ...(s.limits as object), max_pdf_pages: "80" } }),
    ],
    ...[0, -1, 0.5].map(
      (bad): [string, (s: Record<string, unknown>) => unknown] => [
        `a limit of ${bad}`,
        (s) => ({ ...s, limits: { ...(s.limits as object), max_text_chars: bad } }),
      ],
    ),
    [
      "a missing limit",
      (s) => ({ ...s, limits: { max_upload_bytes: 1, max_pdf_pages: 1 } }),
    ],
    ["missing options", (s) => ({ ...s, options: undefined })],
    [
      "a missing detail_level option",
      (s) => ({ ...s, options: { output_language: { values: ["nb"], default: "nb" } } }),
    ],
    [
      "a default not in values",
      (s) => ({
        ...s,
        options: {
          ...(s.options as object),
          detail_level: { values: ["brief", "detailed"], default: "standard" },
        },
      }),
    ],
    [
      "an unknown language value",
      (s) => ({
        ...s,
        options: {
          ...(s.options as object),
          output_language: { values: ["nb", "de"], default: "nb" },
        },
      }),
    ],
    [
      "non-string values",
      (s) => ({
        ...s,
        options: {
          ...(s.options as object),
          output_language: { values: "nb", default: "nb" },
        },
      }),
    ],
    ["missing accepted_types", (s) => ({ ...s, accepted_types: undefined })],
    ["non-string accepted_types", (s) => ({ ...s, accepted_types: [1, 2] })],
    [
      "an error envelope",
      () => ({ error_code: "internal_error", message: "Noe gikk galt", reference_id: "a1b2c3d4" }),
    ],
  ];

  test.each(malformed)("rejects %s", (_label, make) => {
    const base = validStatus() as unknown as Record<string, unknown>;
    expect(isStatusResponse(make(base))).toBe(false);
  });
});

describe("fetchStatus", () => {
  test("GETs {base}/api/status without cache and returns the parsed body", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    const fetchMock = vi.fn(async () => fakeResponse(200, validStatus()));
    vi.stubGlobal("fetch", fetchMock);
    const signal = new AbortController().signal;

    await expect(fetchStatus(signal)).resolves.toEqual(validStatus());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/status", {
      method: "GET",
      cache: "no-store",
      signal,
    });
  });

  test("uses the configured base URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:9000/");
    const fetchMock = vi.fn(async () => fakeResponse(200, validStatus()));
    vi.stubGlobal("fetch", fetchMock);
    await fetchStatus(new AbortController().signal);
    expect(fetchMock.mock.calls[0]).toEqual([
      "http://localhost:9000/api/status",
      expect.objectContaining({ cache: "no-store" }),
    ]);
  });

  test("throws on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(fetchStatus(new AbortController().signal)).rejects.toThrow();
  });

  test("throws on a non-2xx reply, even a valid-looking body", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fakeResponse(500, validStatus())));
    await expect(fetchStatus(new AbortController().signal)).rejects.toThrow();
  });

  test("throws on invalid JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fakeResponse(200, null, true)));
    await expect(fetchStatus(new AbortController().signal)).rejects.toThrow();
  });

  test("throws on a body that fails the shape check", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => fakeResponse(200, { ...validStatus(), mode: "x" })));
    await expect(fetchStatus(new AbortController().signal)).rejects.toThrow();
  });
});
