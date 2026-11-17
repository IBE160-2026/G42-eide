import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { StrictMode, createElement } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import Home from "../app/page";
import { validStatus } from "./status-fixtures";

/*
 * Shared page-test helpers for Story 1.16 (Code Map: `demo-fixtures.ts`).
 *
 * A copy of the Story 1.15 demo fetch fake and page helpers from `demo-start.test.tsx` at
 * `056f66c` (lines 48–128, 132–144, 202–237, 623–679). `demo-start.test.tsx` keeps its own
 * copy and does not import this module.
 *
 * Response contracts kept as today: `/api/status` answers through a `json()`-capable
 * response (`statusReply`, as `status-fixtures.ts` `fakeResponse`); `/api/demo` answers
 * through `text()`, which rejects with an `AbortError` when the signal aborts during the
 * body read; `fetch` itself rejects with an `AbortError` when the signal aborts before the
 * headers.
 *
 * Usage: call `setupDemoTest()` once per test file (or inside a `describe`). It installs:
 * - beforeEach: fake timers, `NEXT_PUBLIC_API_BASE_URL` stubbed to "", a new fetch fake;
 * - afterEach: `cleanup()`, real timers, unstub envs and globals, restore mocks.
 * The fake of the running test is shared by every helper through `currentFake()`.
 */

export const RECORDED_TEXT = readFileSync(
  resolve(__dirname, "../../samples/demo-response.json"),
  "utf8",
);

// ---- the controllable fetch fake -----------------------------------------------------------

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

export interface FakeRequest {
  url: string;
  init: RequestInit;
  signal: AbortSignal;
  /** Delivers the headers; returns controls for the body. */
  respond: (status?: number) => { body: (text: string) => void; failBody: (error: unknown) => void };
  fail: (error: unknown) => void;
  /** Resolves `fetch` with a ready-made response (used for `/api/status`, which reads `json()`). */
  resolveWith: (response: Response) => void;
  pendingTextCalls: () => number;
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
          resolveWith: (response) => {
            headersDelivered = true;
            resolveFetch(response);
          },
          pendingTextCalls: () => pending,
          respond: (status = 200) => {
            headersDelivered = true;
            let settle: { body: (text: string) => void; failBody: (error: unknown) => void } = {
              body: () => {},
              failBody: () => {},
            };
            const text = () =>
              new Promise<string>((resolveText, rejectText) => {
                if (signal.aborted) {
                  rejectText(abortError());
                  return;
                }
                pending += 1;
                signal.addEventListener(
                  "abort",
                  () => {
                    pending -= 1;
                    rejectText(abortError());
                  },
                  { once: true },
                );
                settle = {
                  body: (value) => {
                    pending -= 1;
                    resolveText(value);
                  },
                  failBody: (error) => {
                    pending -= 1;
                    rejectText(error);
                  },
                };
              });
            resolveFetch({ ok: status >= 200 && status < 300, status, text } as unknown as Response);
            return {
              body: (value: string) => settle.body(value),
              failBody: (error: unknown) => settle.failBody(error),
            };
          },
        });
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, requests };
}

export type DemoFake = ReturnType<typeof stubDemoFetch>;

let fake: DemoFake | null = null;

/** The fetch fake of the running test (set by `setupDemoTest`). */
export function currentFake(): DemoFake {
  if (fake === null) throw new Error("setupDemoTest() has not been called for this test");
  return fake;
}

/** Installs the per-test setup and cleanup (see the header comment). */
export function setupDemoTest(): void {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    fake = stubDemoFetch();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fake = null;
  });
}

// ---- timing and the status region ----------------------------------------------------------

export async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

/** Advances the fake timers inside `act`, then lets React settle. */
export async function advance(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await flush();
  });
}

/** The page's persistent status region. */
export function region(): HTMLElement {
  return screen.getByRole("status");
}

/**
 * Records every text the status region shows, in order (one entry per DOM mutation), so a
 * test can count how often a message was announced. Call `stop()` when done.
 */
export function watchRegion(): { texts: string[]; stop: () => void } {
  const node = region();
  const texts: string[] = [];
  const observer = new MutationObserver(() => texts.push(node.textContent ?? ""));
  observer.observe(node, { childList: true, characterData: true, subtree: true });
  return { texts, stop: () => observer.disconnect() };
}

export function count(texts: string[], text: string): number {
  return texts.filter((value) => value === text).length;
}

// ---- the page ------------------------------------------------------------------------------

export function statusReply(mode: "demo" | "real"): Response {
  return { ok: true, status: 200, json: async () => ({ ...validStatus(), mode }) } as unknown as Response;
}

/** Renders the page and answers the (last) status request. */
export async function renderHome(mode: "demo" | "real" = "demo", strict = false) {
  const page = createElement(Home);
  const result = render(strict ? createElement(StrictMode, null, page) : page);
  await act(async () => {
    const requests = currentFake().requests;
    requests[requests.length - 1].resolveWith(statusReply(mode));
    await flush();
  });
  return result;
}

export function demoRequests(): FakeRequest[] {
  return currentFake().requests.filter((request) => request.url.endsWith("/api/demo"));
}

/** Delivers headers and the whole body for the last demo request, then lets React settle. */
export async function replyDemo(text: string, status = 200): Promise<void> {
  const requests = demoRequests();
  await act(async () => {
    const body = requests[requests.length - 1].respond(status);
    await flush();
    body.body(text);
    await flush();
  });
}

export function main(): HTMLElement {
  return screen.getByRole("main");
}

export function uploadSection(): HTMLElement {
  return screen.getByRole("region", { name: "Opplasting og innstillinger" });
}

export function resultsSection(): HTMLElement {
  return screen.getByRole("region", { name: "Resultater" });
}

export function showExample(): HTMLElement {
  return within(uploadSection()).getByRole("button", { name: "Vis eksempel" });
}

export function headline(): HTMLElement {
  return within(resultsSection()).getByRole("heading", { level: 2 });
}
