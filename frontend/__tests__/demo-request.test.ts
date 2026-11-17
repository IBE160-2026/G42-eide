import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ErrorCode } from "../lib/contracts";
import { DEMO_TIMEOUT_MS, classifyDemoReply, isErrorEnvelope, requestDemo } from "../lib/demo";
import type { DemoOutcome, DemoTransport } from "../lib/demo";
import { demoErrorView } from "../lib/demo-errors";

/*
 * Story 1.15, Stage A: the demo request (D7's hand-over type), the pure reply
 * classification (D11) and the error texts (D10, D12, CF-2). The React lifecycle —
 * timer, request ids, unmount, Strict Mode, focus and announcements — is tested with
 * the provider and UI in `demo-start.test.tsx`.
 *
 * A local fetch fake is used because the shared `fakeResponse` (status-fixtures.ts)
 * implements only `json()`. Like `stubControllableFetch`, the fake `fetch` promise rejects
 * with an `AbortError` DOMException when its signal aborts before headers; separately,
 * a pending `text()` rejects with an `AbortError` when the signal aborts during the body
 * read, as real fetch does.
 */

const RECORDED_TEXT = readFileSync(resolve(__dirname, "../../samples/demo-response.json"), "utf8");

// The backend's approved messages (backend/app/contracts/errors.py → MESSAGES).
const MESSAGE = {
  invalid_request: "Forespørselen hadde feil format.",
  demo_not_enabled: "Demoen er bare tilgjengelig i demomodus.",
  not_found: "Adressen finnes ikke.",
  generation_in_progress: "En annen generering kjører allerede.",
  file_too_large: "Dokumentet overskrider en av grensene for opplasting.",
  internal_error: "Det oppstod en uventet feil i serveren.",
  ai_output_invalid: "Svaret fra KI-tjenesten besto ikke valideringen.",
} as const;

// ---- the local controllable fetch fake -------------------------------------------------

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

interface FakeRequest {
  url: string;
  init: RequestInit;
  signal: AbortSignal;
  /** Delivers the headers; `text()` then waits until `body()` or `failBody()` is called. */
  respond: (status?: number) => FakeBody;
  fail: (error: unknown) => void;
  /** Number of `text()` calls that have started and are still pending. */
  pendingTextCalls: () => number;
}

interface FakeBody {
  body: (text: string) => void;
  failBody: (error: unknown) => void;
}

function stubDemoFetch() {
  const requests: FakeRequest[] = [];
  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init: RequestInit = {}) =>
      new Promise<Response>((resolveFetch, rejectFetch) => {
        const signal = init.signal as AbortSignal;
        let headersDelivered = false;
        let pending = 0;
        signal.addEventListener("abort", () => {
          if (!headersDelivered) rejectFetch(abortError());
        });
        requests.push({
          url: String(input),
          init,
          signal,
          fail: rejectFetch,
          pendingTextCalls: () => pending,
          respond: (status = 200) => {
            headersDelivered = true;
            let settleBody: FakeBody = { body: () => {}, failBody: () => {} };
            const text = () =>
              new Promise<string>((resolveText, rejectText) => {
                if (signal.aborted) {
                  rejectText(abortError());
                  return;
                }
                pending += 1;
                const done = <T,>(settle: (value: T) => void) => (value: T) => {
                  pending -= 1;
                  settle(value);
                };
                signal.addEventListener("abort", () => done(rejectText)(abortError()), { once: true });
                settleBody = { body: done(resolveText), failBody: done(rejectText) };
              });
            resolveFetch({ ok: status >= 200 && status < 300, status, text } as unknown as Response);
            return {
              body: (value: string) => settleBody.body(value),
              failBody: (error: unknown) => settleBody.failBody(error),
            };
          },
        });
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, requests };
}

/** Lets pending promise callbacks run (the fake's `text()` is created after headers). */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

let fake: ReturnType<typeof stubDemoFetch>;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
  fake = stubDemoFetch();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---- requestDemo (D7 hand-over) ---------------------------------------------------------

describe("requestDemo", () => {
  test("sends one bodiless POST to the demo route with no-store and the signal (B1)", async () => {
    const controller = new AbortController();
    void requestDemo(controller.signal);
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
    const { url, init, signal } = fake.requests[0];
    expect(url).toBe("http://127.0.0.1:8000/api/demo");
    // Exactly these options: no body, headers, credentials, mode or anything else.
    expect(Object.keys(init).sort()).toEqual(["cache", "method", "signal"]);
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(signal).toBe(controller.signal);
  });

  test("uses NEXT_PUBLIC_API_BASE_URL without a trailing slash", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", " http://localhost:9000/ ");
    void requestDemo(new AbortController().signal);
    expect(fake.requests[0].url).toBe("http://localhost:9000/api/demo");
  });

  test("resolves with the whole body text, whatever the status", async () => {
    for (const status of [200, 409, 500]) {
      const pending = requestDemo(new AbortController().signal);
      const reply = fake.requests.at(-1)!.respond(status);
      await flush();
      reply.body("{\"x\":1}");
      await expect(pending).resolves.toEqual({ kind: "body", text: "{\"x\":1}" });
    }
  });

  test("a network error before headers is rejected (E4)", async () => {
    const pending = requestDemo(new AbortController().signal);
    fake.requests[0].fail(new TypeError("Failed to fetch"));
    await expect(pending).resolves.toEqual({ kind: "rejected" });
  });

  test("an abort before headers is rejected (B7: the pending fetch rejects with AbortError)", async () => {
    const controller = new AbortController();
    const pending = requestDemo(controller.signal);
    controller.abort();
    await expect(pending).resolves.toEqual({ kind: "rejected" });
  });

  test("an abort while reading the body is rejected (B8: the pending text() rejects with AbortError)", async () => {
    const controller = new AbortController();
    const pending = requestDemo(controller.signal);
    fake.requests[0].respond(200);
    await flush();
    // text() has been called and is still waiting for the body when the abort happens.
    expect(fake.requests[0].pendingTextCalls()).toBe(1);
    controller.abort();
    await expect(pending).resolves.toEqual({ kind: "rejected" });
    expect(fake.requests[0].pendingTextCalls()).toBe(0);
  });

  test("a transport failure while reading the body is rejected (B9)", async () => {
    const pending = requestDemo(new AbortController().signal);
    const reply = fake.requests[0].respond(200);
    await flush();
    reply.failBody(new TypeError("network error"));
    await expect(pending).resolves.toEqual({ kind: "rejected" });
  });

  test("never throws, even if fetch throws synchronously", async () => {
    vi.stubGlobal("fetch", () => {
      throw new TypeError("boom");
    });
    await expect(requestDemo(new AbortController().signal)).resolves.toEqual({ kind: "rejected" });
  });

  test("the timeout constant is 120 seconds (D7, UX-DR-19)", () => {
    expect(DEMO_TIMEOUT_MS).toBe(120_000);
  });
});

// ---- classifyDemoReply (D11) ------------------------------------------------------------

function body(value: unknown): DemoTransport {
  return { kind: "body", text: JSON.stringify(value) };
}

describe("classifyDemoReply", () => {
  test("rule 1: a rejection, including the timeout abort, is a network failure (E4, E18)", () => {
    expect(classifyDemoReply({ kind: "rejected" })).toEqual({ kind: "network" });
  });

  test("rule 4: the recorded demo reply is a success, returned unchanged (C1)", () => {
    const outcome = classifyDemoReply({ kind: "body", text: RECORDED_TEXT });
    expect(outcome.kind).toBe("success");
    expect(outcome).toEqual({ kind: "success", response: JSON.parse(RECORDED_TEXT) });
  });

  test.each([
    ["not JSON", "not json"],
    ["empty body", ""],
    ["truncated JSON", RECORDED_TEXT.slice(0, 200)],
  ])("rule 2: a fully received body that is not JSON is unknown (%s, E8)", (_label, text) => {
    expect(classifyDemoReply({ kind: "body", text })).toEqual({ kind: "unknown" });
  });

  test.each([
    ["null", null],
    ["a number", 5],
    ["a string", "ok"],
    ["an array", []],
    ["an empty object", {}],
    ["a success with mode real", { ...JSON.parse(RECORDED_TEXT), mode: "real" }],
    ["a success missing results", { mode: "demo", skipped_pages: [] }],
    ["a success with an extra key", { ...JSON.parse(RECORDED_TEXT), extra: 1 }],
  ])("rule 5: a body that is neither a valid error nor a valid demo success is unknown (%s, E11)", (_label, value) => {
    expect(classifyDemoReply(body(value))).toEqual({ kind: "unknown" });
  });

  test.each([
    ["invalid_request", { error_code: "invalid_request", message: MESSAGE.invalid_request }],
    ["demo_not_enabled", { error_code: "demo_not_enabled", message: MESSAGE.demo_not_enabled }],
    ["generation_in_progress", { error_code: "generation_in_progress", message: MESSAGE.generation_in_progress }],
    ["ai_output_invalid", { error_code: "ai_output_invalid", message: MESSAGE.ai_output_invalid }],
    ["not_found", { error_code: "not_found", message: MESSAGE.not_found }],
    ["an unknown code", { error_code: "xyz", message: "Noe annet." }],
  ])("rule 3: a valid envelope is an error with its code and message (%s)", (_label, envelope) => {
    expect(classifyDemoReply(body(envelope))).toEqual({
      kind: "error",
      code: envelope.error_code,
      message: envelope.message,
    });
  });

  test("rule 3: internal_error carries its validated reference (E1)", () => {
    const envelope = { error_code: "internal_error", message: MESSAGE.internal_error, reference_id: "5e7ff8bd" };
    expect(classifyDemoReply(body(envelope))).toEqual({
      kind: "error",
      code: "internal_error",
      message: MESSAGE.internal_error,
      referenceId: "5e7ff8bd",
    });
  });

  test("rule 3: file_too_large with a valid limit is an error", () => {
    const envelope = { error_code: "file_too_large", message: MESSAGE.file_too_large, limit: "pages" };
    expect(classifyDemoReply(body(envelope))).toEqual({
      kind: "error",
      code: "file_too_large",
      message: MESSAGE.file_too_large,
    });
  });

  // The UI-level E7 check (an envelope with HTTP 200, a success with HTTP 500) is in
  // demo-start.test.tsx; this function never sees the HTTP status.
  test("a success body with an extra error_code key is unknown, never success (E9, E11)", () => {
    const mixed = { ...JSON.parse(RECORDED_TEXT), error_code: "internal_error" };
    expect(classifyDemoReply(body(mixed))).toEqual({ kind: "unknown" });
  });

  test("rule 3: an error_code that fails the envelope check is unknown, never success (E9)", () => {
    expect(classifyDemoReply(body({ error_code: 5, message: "x" }))).toEqual({ kind: "unknown" });
  });
});

// ---- isErrorEnvelope (D11, OQ3) -----------------------------------------------------------

describe("isErrorEnvelope", () => {
  test.each([
    ["invalid_request", { error_code: "invalid_request", message: MESSAGE.invalid_request }],
    ["internal_error with reference", { error_code: "internal_error", message: MESSAGE.internal_error, reference_id: "0a1b2c3d" }],
    ["file_too_large with limit", { error_code: "file_too_large", message: MESSAGE.file_too_large, limit: "bytes" }],
    ["each limit kind: characters", { error_code: "file_too_large", message: "m", limit: "characters" }],
    ["each limit kind: tokens", { error_code: "file_too_large", message: "m", limit: "tokens" }],
    ["an unknown code", { error_code: "xyz", message: "m" }],
    ["an empty message", { error_code: "invalid_request", message: "" }],
  ])("accepts %s", (_label, value) => {
    expect(isErrorEnvelope(value)).toBe(true);
  });

  test.each([
    ["not an object", "x"],
    ["null", null],
    ["an array", [{ error_code: "x", message: "m" }]],
    ["a number code", { error_code: 5, message: "x" }],
    ["an empty code", { error_code: "", message: "x" }],
    ["no message", { error_code: "x" }],
    ["a number message", { error_code: "x", message: 3 }],
    ["an extra key", { error_code: "x", message: "m", detail: "d" }],
    ["limit on another code", { error_code: "invalid_request", message: "m", limit: "pages" }],
    ["file_too_large without limit", { error_code: "file_too_large", message: "m" }],
    ["an unknown limit", { error_code: "file_too_large", message: "m", limit: "lines" }],
    ["a null limit", { error_code: "file_too_large", message: "m", limit: null }],
    ["a reference on another code", { error_code: "invalid_request", message: "m", reference_id: "5e7ff8bd" }],
  ])("rejects %s (E9)", (_label, value) => {
    expect(isErrorEnvelope(value)).toBe(false);
  });

  test.each([
    ["missing", undefined],
    ["upper case", "5E7FF8BD"],
    ["seven characters", "5e7ff8b"],
    ["nine characters", "5e7ff8bdz"],
    ["nine hex characters", "5e7ff8bd0"],
    ["non-hex", "5e7ff8bg"],
    ["a number", 12345678],
    ["null", null],
    ["surrounded by spaces", " 5e7ff8bd "],
  ])("rejects internal_error with a %s reference (E10)", (_label, reference) => {
    const value: Record<string, unknown> = { error_code: "internal_error", message: MESSAGE.internal_error };
    if (reference !== undefined) value.reference_id = reference;
    expect(isErrorEnvelope(value)).toBe(false);
    expect(classifyDemoReply(body(value))).toEqual({ kind: "unknown" });
  });
});

// ---- demoErrorView (D10, D12, CF-2) ------------------------------------------------------

describe("demoErrorView", () => {
  function error(code: string, message = "Melding fra serveren.", referenceId?: string): DemoOutcome & { kind: "error" } {
    return referenceId === undefined ? { kind: "error", code, message } : { kind: "error", code, message, referenceId };
  }

  test("internal_error: exact texts with the reference, detail, Temporary (E1)", () => {
    expect(demoErrorView(error("internal_error", MESSAGE.internal_error, "5e7ff8bd"))).toEqual({
      headline: "Noe gikk uventet galt",
      action: "Prøv igjen. Hvis feilen gjentar seg, oppgi referansen: 5e7ff8bd.",
      detail: MESSAGE.internal_error,
      group: "temporary",
    });
  });

  test("generation_in_progress: exact texts, Temporary (E2)", () => {
    expect(demoErrorView(error("generation_in_progress", MESSAGE.generation_in_progress))).toEqual({
      headline: "En generering pågår allerede",
      action: "Vent til den er ferdig – den kan være startet i en annen fane – og prøv igjen.",
      detail: MESSAGE.generation_in_progress,
      group: "temporary",
    });
  });

  test("ai_output_invalid: exact texts, Temporary (E3)", () => {
    expect(demoErrorView(error("ai_output_invalid", MESSAGE.ai_output_invalid))).toEqual({
      headline: "Svaret besto ikke kvalitetskontrollen",
      action:
        "KI-svaret var ufullstendig eller manglet gyldige sidehenvisninger, så det vises ikke. Du kan prøve igjen.",
      detail: MESSAGE.ai_output_invalid,
      group: "temporary",
    });
  });

  test("network failure: exact texts, no detail line, Temporary (E4)", () => {
    expect(demoErrorView({ kind: "network" })).toEqual({
      headline: "Mistet kontakten med serveren",
      action: "Sjekk at serveren kjører, og prøv igjen.",
      detail: null,
      group: "temporary",
    });
  });

  test("invalid_request: exact texts, Reload required (E5)", () => {
    expect(demoErrorView(error("invalid_request", MESSAGE.invalid_request))).toEqual({
      headline: "Forespørselen var ugyldig",
      action: "Last inn siden på nytt, og prøv igjen.",
      detail: MESSAGE.invalid_request,
      group: "reload",
    });
  });

  test("malformed reply: unknown texts, no detail line, Reload required (E8–E11)", () => {
    expect(demoErrorView({ kind: "unknown" })).toEqual({
      headline: "Noe gikk galt",
      action: "Last inn siden på nytt, og prøv igjen.",
      detail: null,
      group: "reload",
    });
  });

  const fallbackCodes: ErrorCode[] = [
    "demo_not_enabled",
    "demo_mode_no_uploads",
    "not_found",
    "method_not_allowed",
    "insufficient_content",
    "unsupported_file_type",
    "bad_text_encoding",
    "unreadable_file",
    "no_extractable_text",
    "file_too_large",
    "ai_rate_limited",
    "ai_unavailable",
    "ai_credits_exhausted",
    "session_call_limit_reached",
  ];

  test.each([...fallbackCodes, "xyz"])(
    "%s falls back to the unknown texts with the message as detail, Reload required (E6, CF-2)",
    (code) => {
      expect(demoErrorView(error(code, "Melding."))).toEqual({
        headline: "Noe gikk galt",
        action: "Last inn siden på nytt, og prøv igjen.",
        detail: "Melding.",
        group: "reload",
      });
    },
  );

  test("every backend ErrorCode is either mapped or a fallback (18 codes)", () => {
    const mapped: ErrorCode[] = ["generation_in_progress", "internal_error", "ai_output_invalid", "invalid_request"];
    expect(new Set([...mapped, ...fallbackCodes]).size).toBe(18);
    for (const code of mapped) {
      expect(demoErrorView(error(code, "m", "5e7ff8bd")).headline).not.toBe("Noe gikk galt");
    }
  });

  test("an empty message gives no detail line (E13)", () => {
    expect(demoErrorView(error("generation_in_progress", "")).detail).toBeNull();
    expect(demoErrorView(error("xyz", "")).detail).toBeNull();
  });

  test("the message is passed through as plain text, unchanged (E12)", () => {
    expect(demoErrorView(error("xyz", "<b>x</b>")).detail).toBe("<b>x</b>");
  });

  test("an inherited property name is not treated as a mapped code", () => {
    expect(demoErrorView(error("toString")).headline).toBe("Noe gikk galt");
    expect(demoErrorView(error("constructor")).headline).toBe("Noe gikk galt");
  });
});
