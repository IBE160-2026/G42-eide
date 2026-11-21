import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Activity, StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Home from "../app/page";
import { DemoProvider, useDemoFlow } from "../components/DemoProvider";
import StatusRegion from "../components/StatusRegion";
import { DEMO_TIMEOUT_MS } from "../lib/demo";
import { validStatus } from "./status-fixtures";

/*
 * Story 1.15 — the demo flow. Stage B1: the provider (D5–D10, D7 lifecycle) through a
 * minimal test harness that stands in for the UI. The UI rows (banner, controls, texts in
 * the DOM, focus, page integration) are added with the components in Stage B2.
 *
 * Timer-lifecycle rows (the 120-second timer in B7/B8, B10 "no timer left", B11 unmount)
 * live here rather than in demo-request.test.ts, because the timer belongs to the provider
 * (D7); `requestDemo` owns none.
 *
 * Local fetch fake (the shared `fakeResponse` implements only `json()`): the fake `fetch`
 * promise rejects with an `AbortError` DOMException when its signal aborts before headers,
 * as `stubControllableFetch` does; a pending `text()` rejects with an `AbortError` when the
 * signal aborts during the body read, as real fetch does.
 */

const RECORDED_TEXT = readFileSync(resolve(__dirname, "../../samples/demo-response.json"), "utf8");
const INTERNAL_ERROR = JSON.stringify({
  error_code: "internal_error",
  message: "Det oppstod en uventet feil i serveren.",
  reference_id: "5e7ff8bd",
});
const IN_PROGRESS = JSON.stringify({
  error_code: "generation_in_progress",
  message: "En annen generering kjører allerede.",
});
const INVALID_REQUEST = JSON.stringify({
  error_code: "invalid_request",
  message: "Forespørselen hadde feil format.",
});
const DEMO_NOT_ENABLED = JSON.stringify({
  error_code: "demo_not_enabled",
  message: "Demoen er bare tilgjengelig i demomodus.",
});

// ---- the local controllable fetch fake -------------------------------------------------

function abortError(): DOMException {
  return new DOMException("The operation was aborted.", "AbortError");
}

interface FakeRequest {
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

let fake: ReturnType<typeof stubDemoFetch>;

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
});

// ---- harness ----------------------------------------------------------------------------

/** Stands in for the Stage B2 UI: shows the provider state and a `Vis eksempel` button. */
function Harness() {
  const { state, canStart, start } = useDemoFlow();
  return (
    <div>
      <p data-testid="phase">{state.phase}</p>
      {state.phase === "error" && (
        <p data-testid="error" data-group={state.error.group} data-error-id={state.errorId}>
          {state.error.headline}
          {"|"}
          {state.error.action}
          {"|"}
          {state.error.detail ?? ""}
        </p>
      )}
      <button type="button" aria-disabled={canStart ? undefined : "true"} onClick={start}>
        Vis eksempel
      </button>
    </div>
  );
}

function renderFlow(strict = false) {
  const tree = (
    <DemoProvider>
      <Harness />
    </DemoProvider>
  );
  const status = render(<StatusRegion />);
  const flow = render(strict ? <StrictMode>{tree}</StrictMode> : tree);
  return { status, flow };
}

function phase(): string {
  return screen.getByTestId("phase").textContent ?? "";
}

function button(): HTMLElement {
  return screen.getByRole("button", { name: "Vis eksempel" });
}

function region(): HTMLElement {
  return screen.getByRole("status");
}

function errorView(): { text: string; group: string | null; id: string | null } {
  const element = screen.getByTestId("error");
  return {
    text: element.textContent ?? "",
    group: element.getAttribute("data-group"),
    id: element.getAttribute("data-error-id"),
  };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

/** Delivers headers and the whole body for request `index`, then lets React settle. */
async function reply(index: number, text: string, status = 200): Promise<void> {
  await act(async () => {
    const body = fake.requests[index].respond(status);
    await flush();
    body.body(text);
    await flush();
  });
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await flush();
  });
}

/**
 * Records every text the status region shows, in order (one entry per DOM mutation), so a
 * test can count how often a message was announced. Call `stop()` when done.
 */
function watchRegion(): { texts: string[]; stop: () => void } {
  const node = region();
  const texts: string[] = [];
  const observer = new MutationObserver(() => texts.push(node.textContent ?? ""));
  observer.observe(node, { childList: true, characterData: true, subtree: true });
  return { texts, stop: () => observer.disconnect() };
}

function count(texts: string[], text: string): number {
  return texts.filter((value) => value === text).length;
}

/** Flushes zero-delay timers (the status region's next-tick write), then counts what is left. */
async function remainingTimers(): Promise<number> {
  await advance(0);
  return vi.getTimerCount();
}

// ---- rows ---------------------------------------------------------------------------------

describe("DemoProvider: start and loading (S1 → S3)", () => {
  test("S1: idle, Vis eksempel available, no request (A7, A9)", async () => {
    renderFlow();
    expect(phase()).toBe("idle");
    expect(button().hasAttribute("aria-disabled")).toBe(false);
    expect(fake.fetchMock).not.toHaveBeenCalled();
    expect(await remainingTimers()).toBe(0);
  });

  test("one click sends exactly one bodiless POST (B1)", () => {
    renderFlow();
    fireEvent.click(button());
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
    const { url, init } = fake.requests[0];
    expect(url).toBe("http://127.0.0.1:8000/api/demo");
    expect(Object.keys(init).sort()).toEqual(["cache", "method", "signal"]);
    expect(init.method).toBe("POST");
  });

  test("repeated activation in the same tick sends one request (B2)", () => {
    renderFlow();
    act(() => {
      fireEvent.click(button());
      fireEvent.click(button());
      fireEvent.click(button());
    });
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
  });

  test("after a re-render the button is aria-disabled and further clicks send nothing (B3)", () => {
    renderFlow();
    fireEvent.click(button());
    expect(phase()).toBe("loading");
    expect(button().getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button());
    fireEvent.click(button());
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
  });

  test("loading is announced exactly once, on the next tick (B4)", async () => {
    renderFlow();
    const watch = watchRegion();
    fireEvent.click(button());
    fireEvent.click(button());
    expect(region().textContent).toBe("");
    await advance(0);
    expect(region().textContent).toBe("Henter eksempel …");
    await advance(1_000);
    watch.stop();
    expect(count(watch.texts, "Henter eksempel …")).toBe(1);
  });
});

describe("DemoProvider: success (S4)", () => {
  test("the recorded reply is applied and announced; no repeat; no timer left (C1–C3, B10)", async () => {
    renderFlow();
    const watch = watchRegion();
    fireEvent.click(button());
    await reply(0, RECORDED_TEXT);
    expect(phase()).toBe("success");
    await advance(0);
    expect(region().textContent).toBe("Resultatene er klare");
    await advance(1_000);
    watch.stop();
    expect(count(watch.texts, "Henter eksempel …")).toBeLessThanOrEqual(1);
    expect(count(watch.texts, "Resultatene er klare")).toBe(1);
    expect(button().getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button());
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
    expect(await remainingTimers()).toBe(0);
  });

  test("decision by error_code, not HTTP status (E7)", async () => {
    renderFlow();
    fireEvent.click(button());
    await reply(0, RECORDED_TEXT, 500);
    expect(phase()).toBe("success");
    cleanup();

    fake = stubDemoFetch();
    renderFlow();
    fireEvent.click(button());
    await reply(0, INTERNAL_ERROR, 200);
    expect(phase()).toBe("error");
    expect(errorView().text.startsWith("Noe gikk uventet galt|")).toBe(true);
  });
});

describe("DemoProvider: errors (S5) and retry", () => {
  test("internal_error: texts with reference, Temporary, available again (E1)", async () => {
    renderFlow();
    fireEvent.click(button());
    await reply(0, INTERNAL_ERROR, 500);
    expect(phase()).toBe("error");
    expect(errorView()).toEqual({
      text:
        "Noe gikk uventet galt|Prøv igjen. Hvis feilen gjentar seg, oppgi referansen: 5e7ff8bd.|Det oppstod en uventet feil i serveren.",
      group: "temporary",
      id: "1",
    });
    expect(button().hasAttribute("aria-disabled")).toBe(false);
    expect(await remainingTimers()).toBe(0);
  });

  test("network failure: Temporary, no detail, available (E4)", async () => {
    renderFlow();
    fireEvent.click(button());
    await act(async () => {
      fake.requests[0].fail(new TypeError("Failed to fetch"));
      await flush();
    });
    expect(errorView().text).toBe("Mistet kontakten med serveren|Sjekk at serveren kjører, og prøv igjen.|");
    expect(errorView().group).toBe("temporary");
    expect(button().hasAttribute("aria-disabled")).toBe(false);
    expect(await remainingTimers()).toBe(0);
  });

  test("invalid_request: Reload required, aria-disabled, no retry (E5, E17)", async () => {
    renderFlow();
    fireEvent.click(button());
    await reply(0, INVALID_REQUEST, 400);
    expect(errorView().group).toBe("reload");
    expect(button().getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button());
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
  });

  test("demo_not_enabled falls back to Noe gikk galt, Reload required (E6)", async () => {
    renderFlow();
    fireEvent.click(button());
    await reply(0, DEMO_NOT_ENABLED, 403);
    expect(errorView().text).toBe(
      "Noe gikk galt|Last inn siden på nytt, og prøv igjen.|Demoen er bare tilgjengelig i demomodus.",
    );
    expect(button().getAttribute("aria-disabled")).toBe("true");
  });

  test("malformed JSON: unknown, no detail, Reload required, no timer left (E8, B10)", async () => {
    renderFlow();
    fireEvent.click(button());
    await reply(0, "not json");
    expect(errorView().text).toBe("Noe gikk galt|Last inn siden på nytt, og prøv igjen.|");
    expect(errorView().group).toBe("reload");
    expect(await remainingTimers()).toBe(0);
  });

  test("an error is not announced; the region is cleared (E14)", async () => {
    renderFlow();
    fireEvent.click(button());
    await advance(0);
    expect(region().textContent).toBe("Henter eksempel …");
    await reply(0, INTERNAL_ERROR, 500);
    expect(region().textContent).toBe("");
    await advance(0);
    expect(region().textContent).toBe("");
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  test("an error before the loading announcement cancels it (E14, OQ6)", async () => {
    renderFlow();
    fireEvent.click(button());
    await act(async () => {
      fake.requests[0].fail(new TypeError("Failed to fetch"));
      await flush();
    });
    await advance(0);
    expect(region().textContent).toBe("");
  });

  test("retry after a Temporary error sends exactly one new request (E15)", async () => {
    renderFlow();
    fireEvent.click(button());
    await reply(0, INTERNAL_ERROR, 500);
    fireEvent.click(button());
    fireEvent.click(button());
    expect(fake.fetchMock).toHaveBeenCalledTimes(2);
    expect(phase()).toBe("loading");
    await reply(1, RECORDED_TEXT);
    expect(phase()).toBe("success");
  });

  test("a repeated identical error gets a new errorId, so focus can move again (E16)", async () => {
    renderFlow();
    fireEvent.click(button());
    await reply(0, IN_PROGRESS, 409);
    const first = errorView().id;
    fireEvent.click(button());
    await reply(1, IN_PROGRESS, 409);
    const second = errorView().id;
    expect(first).not.toBeNull();
    expect(second).not.toBe(first);
    expect(errorView().group).toBe("temporary");
  });
});

describe("DemoProvider: timeout and timer lifecycle (D7)", () => {
  test("timeout before headers aborts the request: network failure, no timer left (B7, E18, B10)", async () => {
    renderFlow();
    fireEvent.click(button());
    await advance(DEMO_TIMEOUT_MS - 1);
    expect(phase()).toBe("loading");
    expect(fake.requests[0].signal.aborted).toBe(false);
    await advance(1);
    expect(fake.requests[0].signal.aborted).toBe(true);
    expect(phase()).toBe("error");
    expect(errorView().text.startsWith("Mistet kontakten med serveren|")).toBe(true);
    expect(await remainingTimers()).toBe(0);
  });

  test("timeout during the body read aborts the pending text(): network failure (B8, E18)", async () => {
    renderFlow();
    fireEvent.click(button());
    await act(async () => {
      fake.requests[0].respond(200);
      await flush();
    });
    expect(fake.requests[0].pendingTextCalls()).toBe(1);
    await advance(DEMO_TIMEOUT_MS);
    expect(fake.requests[0].pendingTextCalls()).toBe(0);
    expect(errorView().text.startsWith("Mistet kontakten med serveren|")).toBe(true);
    expect(await remainingTimers()).toBe(0);
  });

  test("the timer stays armed while the body is read, and a body just in time succeeds (D7)", async () => {
    renderFlow();
    fireEvent.click(button());
    const held: { body?: (text: string) => void } = {};
    await act(async () => {
      held.body = fake.requests[0].respond(200).body;
      await flush();
    });
    await advance(DEMO_TIMEOUT_MS - 1);
    expect(fake.requests[0].signal.aborted).toBe(false);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    await act(async () => {
      held.body?.(RECORDED_TEXT);
      await flush();
    });
    expect(phase()).toBe("success");
    await advance(1);
    expect(fake.requests[0].signal.aborted).toBe(false);
    expect(await remainingTimers()).toBe(0);
  });

  test("a transport failure during the body read is a network failure (B9)", async () => {
    renderFlow();
    fireEvent.click(button());
    await act(async () => {
      const body = fake.requests[0].respond(200);
      await flush();
      body.failBody(new TypeError("network error"));
      await flush();
    });
    expect(errorView().text.startsWith("Mistet kontakten med serveren|")).toBe(true);
    expect(await remainingTimers()).toBe(0);
  });

  test("unmount while loading aborts; the late reply changes nothing (B11, E19)", async () => {
    const { flow } = renderFlow();
    fireEvent.click(button());
    await advance(0);
    expect(region().textContent).toBe("Henter eksempel …");
    flow.unmount();
    expect(fake.requests[0].signal.aborted).toBe(true);
    // The abort makes the pending fetch reject; that rejection must be dropped.
    await act(async () => {
      await flush();
    });
    expect(region().textContent).toBe("Henter eksempel …");
    expect(await remainingTimers()).toBe(0);
  });

  test("unmount during the body read drops the outcome without classifying it (B11, E19)", async () => {
    const { flow } = renderFlow();
    fireEvent.click(button());
    const held: { body?: (text: string) => void } = {};
    await act(async () => {
      held.body = fake.requests[0].respond(200).body;
      await flush();
    });
    // The loading announcement is visible before the unmount; a classified error outcome
    // would clear it (announce("")), so it must still be there afterwards.
    await advance(0);
    expect(region().textContent).toBe("Henter eksempel …");
    flow.unmount();
    await act(async () => {
      held.body?.(INTERNAL_ERROR);
      await flush();
    });
    await advance(0);
    expect(screen.queryByTestId("phase")).toBeNull();
    expect(region().textContent).toBe("Henter eksempel …");
    expect(await remainingTimers()).toBe(0);
  });
});

describe("DemoProvider: React Strict Mode", () => {
  test("one click sends one request and the outcome is applied; each announced once (B13)", async () => {
    renderFlow(true);
    const watch = watchRegion();
    fireEvent.click(button());
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
    await advance(0);
    expect(region().textContent).toBe("Henter eksempel …");
    await reply(0, RECORDED_TEXT);
    expect(phase()).toBe("success");
    await advance(0);
    expect(region().textContent).toBe("Resultatene er klare");
    await advance(1_000);
    watch.stop();
    expect(count(watch.texts, "Henter eksempel …")).toBe(1);
    expect(count(watch.texts, "Resultatene er klare")).toBe(1);
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
    expect(await remainingTimers()).toBe(0);
  });

  test("no request is started by mounting (A10)", async () => {
    renderFlow(true);
    await advance(0);
    expect(fake.fetchMock).not.toHaveBeenCalled();
    expect(phase()).toBe("idle");
  });

  test("effect cleanup then setup while a request is in flight drops its outcome (stale id, D7)", async () => {
    // <Activity mode="hidden"> runs effect cleanups and "visible" runs the setups again while
    // keeping state: the same sequence as Fast Refresh (and Strict Mode's re-run) mid-request.
    const tree = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <DemoProvider>
          <Harness />
        </DemoProvider>
      </Activity>
    );
    render(<StatusRegion />);
    const { rerender } = render(tree("visible"));
    fireEvent.click(button());
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
    rerender(tree("hidden"));
    expect(fake.requests[0].signal.aborted).toBe(true);
    rerender(tree("visible"));
    // The aborted fetch rejects now; with the request id made stale by the cleanup, that
    // rejection is dropped instead of being shown as a network failure.
    await act(async () => {
      await flush();
    });
    expect(screen.queryByTestId("error")).toBeNull();
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
    expect(await remainingTimers()).toBe(0);
    // KNOWN LIMITATION (documented in DemoProvider.tsx and the spec's Implementation Notes):
    // the retained state stays `loading` with no request in flight, so Vis eksempel stays
    // aria-disabled until a reload. Frozen D7 allows no state update for a cancelled request;
    // recovery must be added (and this assertion flipped) before a second route exists.
    expect(phase()).toBe("loading");
    expect(button().getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button());
    expect(fake.fetchMock).toHaveBeenCalledTimes(1);
  });
});

test("useDemoFlow outside the provider throws", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<Harness />)).toThrow("useDemoFlow must be used inside <DemoProvider>.");
});

// ==========================================================================================
// Stage B2: the demo screen in the real page (<Home />): rows A, B, C, E, F and G in the DOM.
// ==========================================================================================

const BANNER = "DEMO – du ser et ferdig eksempel. Ingen KI-tjeneste brukes, og egne filer kan ikke lastes opp.";
const GUIDANCE =
  "Prøv appen med en ferdig eksempelforelesning om lagerstyring og logistikk. Trykk «Vis eksempel» for å se resultatene.";
const NOTE =
  "Demoen viser ferdiglagde resultater på norsk bokmål med standard detaljnivå. Innstillingene kan ikke endres, og det lages ingen ny oversettelse.";
const RESULTS_HEADING = "Eksempelresultater (ikke generert nå)";
const VERIFICATION = "Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.";

function statusReply(mode: "demo" | "real"): Response {
  return { ok: true, status: 200, json: async () => ({ ...validStatus(), mode }) } as unknown as Response;
}

/** Renders the page and answers the (last) status request. */
async function renderHome(mode: "demo" | "real" = "demo", strict = false) {
  const result = render(
    strict ? (
      <StrictMode>
        <Home />
      </StrictMode>
    ) : (
      <Home />
    ),
  );
  await act(async () => {
    fake.requests[fake.requests.length - 1].resolveWith(statusReply(mode));
    await flush();
  });
  return result;
}

function demoRequests(): FakeRequest[] {
  return fake.requests.filter((request) => request.url.endsWith("/api/demo"));
}

async function replyDemo(text: string, status = 200): Promise<void> {
  const requests = demoRequests();
  await act(async () => {
    const body = requests[requests.length - 1].respond(status);
    await flush();
    body.body(text);
    await flush();
  });
}

function main(): HTMLElement {
  return screen.getByRole("main");
}

function uploadSection(): HTMLElement {
  return screen.getByRole("region", { name: "Opplasting og innstillinger" });
}

function resultsSection(): HTMLElement {
  return screen.getByRole("region", { name: "Resultater" });
}

function showExample(): HTMLElement {
  return within(uploadSection()).getByRole("button", { name: "Vis eksempel" });
}

function headline(): HTMLElement {
  return within(resultsSection()).getByRole("heading", { level: 2 });
}

describe("demo S1 on the page (A1–A10)", () => {
  test("banner: exact text, icon, role note, first child of main (A1, A2)", async () => {
    await renderHome();
    const banner = main().firstElementChild as HTMLElement;
    expect(banner.classList.contains("demo-banner")).toBe(true);
    expect(banner.getAttribute("role")).toBe("note");
    expect(banner.textContent).toBe(BANNER);
    const icon = banner.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.getAttribute("focusable")).toBe("false");
    expect(within(main()).getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual([
      "Opplasting og innstillinger",
      "Resultater",
    ]);
  });

  test("no external-AI notice (A3)", async () => {
    await renderHome();
    expect(document.body.textContent).not.toContain("Teksten i dokumentet ditt sendes til Anthropic");
  });

  test("Last opp is natively disabled and no file input exists (A4)", async () => {
    await renderHome();
    const upload = within(uploadSection()).getByRole("button", { name: "Last opp" });
    expect(upload.hasAttribute("disabled")).toBe(true);
    expect(upload.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  test("fixed settings: two disabled single-option selects, the note, no Emnekode (A5)", async () => {
    await renderHome();
    const language = screen.getByRole("combobox", { name: "Språk på resultatene" }) as HTMLSelectElement;
    const detail = screen.getByRole("combobox", { name: "Detaljnivå" }) as HTMLSelectElement;
    const expected: [HTMLSelectElement, string, string][] = [
      [language, "nb", "Norsk bokmål"],
      [detail, "standard", "Standard"],
    ];
    for (const [select, value, label] of expected) {
      expect(select.disabled).toBe(true);
      expect(select.options).toHaveLength(1);
      expect(select.value).toBe(value);
      expect(select.options[0].textContent).toBe(label);
      expect(select.closest(".settings-field")).not.toBeNull();
    }
    expect(within(uploadSection()).getByText(NOTE).tagName).toBe("P");
    expect(screen.queryByLabelText(/Emnekode/)).toBeNull();
  });

  test("S1 guidance is in Resultater; Vis eksempel available (A6, A7)", async () => {
    await renderHome();
    expect(resultsSection().textContent).toBe(GUIDANCE);
    const button = showExample();
    expect(button.getAttribute("type")).toBe("button");
    expect(button.classList.contains("button-primary")).toBe(true);
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
  });

  test("nothing demo-specific before the mode is known (A8)", () => {
    render(<Home />);
    expect(document.querySelector(".demo-banner")).toBeNull();
    expect(uploadSection().children).toHaveLength(0);
    expect(resultsSection().textContent).toBe("Starter …");
  });

  test("first load in demo: only the guidance, focus not moved, nothing announced, no timers, no POST (A9)", async () => {
    await renderHome();
    expect(resultsSection().textContent).toBe(GUIDANCE);
    expect(document.activeElement).toBe(document.body);
    expect(region().textContent).toBe("");
    expect(await remainingTimers()).toBe(0);
    expect(demoRequests()).toHaveLength(0);
  });

  test("Strict Mode startup in demo: S1 rendered once, no S0x, no POST (A10)", async () => {
    await renderHome("demo", true);
    expect(document.querySelectorAll(".demo-banner")).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Vis eksempel" })).toHaveLength(1);
    // The aborted first status request never shows S0x.
    expect(screen.queryByRole("heading", { name: "Får ikke kontakt med appens server" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Prøv igjen" })).toBeNull();
    expect(resultsSection().querySelector(".error-state")).toBeNull();
    expect(document.activeElement).toBe(document.body);
    expect(demoRequests()).toHaveLength(0);
  });
});

describe("demo S3 and S4 on the page (B, C)", () => {
  test("click: one POST, focus kept, loading shown and announced, indicator, locked (B1, B3–B5, B14)", async () => {
    await renderHome();
    const button = showExample();
    button.focus();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(demoRequests()).toHaveLength(1);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(button);

    const loading = resultsSection().querySelector(".demo-loading");
    expect(loading?.textContent).toBe("Henter eksempel …");
    const indicator = resultsSection().querySelector("svg.loading-indicator");
    expect(indicator?.getAttribute("aria-hidden")).toBe("true");
    expect(resultsSection().textContent).not.toContain(GUIDANCE);
    await advance(0);
    expect(region().textContent).toBe("Henter eksempel …");

    // B14: the S3 lock, shown as the locked bar (Story 1.16).
    const upload = within(uploadSection()).getByRole("button", { name: "Last opp" });
    expect(within(uploadSection()).queryByRole("combobox")).toBeNull();
    expect(uploadSection().firstElementChild?.classList.contains("upload-bar-locked")).toBe(true);
    expect(upload.hasAttribute("disabled")).toBe(true);
    const pairs = Array.from(uploadSection().querySelectorAll("dl > div")).map((group) => [
      group.querySelector("dt")?.textContent,
      group.querySelector("dd")?.textContent,
    ]);
    expect(pairs).toEqual([
      ["Språk på resultatene", "Norsk bokmål"],
      ["Detaljnivå", "Standard"],
    ]);
    // C5: the banner stays in S3.
    expect(main().firstElementChild?.textContent).toBe(BANNER);
    // The lock state is stated in text.
    expect(uploadSection().querySelector(".upload-bar__lock")?.textContent).toBe("Låst");
    expect(demoRequests()).toHaveLength(1);
    expect(document.activeElement).toBe(button);
  });

  test("success: heading, notice, guidance gone, focus kept, announced, no repeat, summary and key concepts and the first flashcard (C1–C5)", async () => {
    await renderHome();
    const button = showExample();
    button.focus();
    fireEvent.click(button);
    await replyDemo(RECORDED_TEXT);

    const heading = within(resultsSection()).getByRole("heading", { level: 2, name: RESULTS_HEADING });
    expect(heading.classList.contains("demo-results-heading")).toBe(true);
    const notice = within(resultsSection()).getAllByRole("note")[0];
    expect(notice.classList.contains("notice-warning")).toBe(true);
    expect(notice.textContent).toBe(VERIFICATION);
    expect(notice.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(resultsSection().textContent).not.toContain(GUIDANCE);

    expect(document.activeElement).toBe(button);
    await advance(0);
    expect(region().textContent).toBe("Resultatene er klare");

    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    expect(demoRequests()).toHaveLength(1);

    // C4: only the summary, the key concepts and the current flashcard with their page links are rendered, in the Sammendrag (Story 1.17), Nøkkelbegreper (Story 1.18) and Flashkort (Story 1.19) panels; the tabs come from Story 1.16.
    const recorded = JSON.parse(RECORDED_TEXT);
    expect(document.getElementById("result-panel-summary")?.textContent).toContain(recorded.results.summary.text);
    expect(screen.getByRole("tablist")).toBeTruthy();
    expect(
      Array.from(resultsSection().querySelectorAll("a")).every(
        (link) =>
          link.closest("#result-panel-summary") !== null ||
          link.closest("#result-panel-key-concepts") !== null ||
          link.closest("#result-panel-flashcards") !== null,
      ),
    ).toBe(true);

    // C5: the banner and the fixed-settings note stay.
    expect(screen.getByText(BANNER)).toBeTruthy();
    expect(within(uploadSection()).getByText(NOTE)).toBeTruthy();
  });

  test("decision by error_code on the page (E7)", async () => {
    await renderHome();
    fireEvent.click(showExample());
    await replyDemo(RECORDED_TEXT, 500);
    expect(headline().textContent).toBe(RESULTS_HEADING);
  });

  test("only /api/status and /api/demo are fetched (B12)", async () => {
    await renderHome();
    fireEvent.click(showExample());
    await replyDemo(RECORDED_TEXT);
    expect(fake.requests.map((request) => new URL(request.url).pathname)).toEqual(["/api/status", "/api/demo"]);
  });
});

describe("demo S5 on the page (E)", () => {
  test("internal_error: headline focused, exact texts, detail, not announced, guidance gone (E1, E14)", async () => {
    await renderHome();
    fireEvent.click(showExample());
    await replyDemo(INTERNAL_ERROR, 500);
    const h2 = headline();
    expect(h2.textContent).toBe("Noe gikk uventet galt");
    expect(h2.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(h2);
    const state = resultsSection().querySelector(".error-state");
    expect(state?.querySelector(".error-state__action")?.textContent).toBe(
      "Prøv igjen. Hvis feilen gjentar seg, oppgi referansen: 5e7ff8bd.",
    );
    expect(state?.querySelector(".error-state__detail")?.textContent).toBe("Det oppstod en uventet feil i serveren.");
    expect(state?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(resultsSection().textContent).not.toContain(GUIDANCE);
    expect(document.querySelector('[role="alert"]')).toBeNull();
    await advance(0);
    expect(region().textContent).toBe("");
    expect(showExample().hasAttribute("aria-disabled")).toBe(false);
    // C5: the banner and the fixed-settings note stay in S5.
    expect(main().firstElementChild?.textContent).toBe(BANNER);
    expect(within(uploadSection()).getByText(NOTE)).toBeTruthy();
  });

  test("the backend message is plain text, never HTML (E12)", async () => {
    await renderHome();
    fireEvent.click(showExample());
    await replyDemo(JSON.stringify({ error_code: "xyz", message: "<b>x</b>" }), 500);
    const detail = resultsSection().querySelector(".error-state__detail");
    expect(detail?.textContent).toBe("<b>x</b>");
    expect(detail?.querySelector("b")).toBeNull();
    expect(headline().textContent).toBe("Noe gikk galt");
  });

  test("an empty message gives no detail line (E13)", async () => {
    await renderHome();
    fireEvent.click(showExample());
    await replyDemo(JSON.stringify({ error_code: "generation_in_progress", message: "" }), 409);
    expect(resultsSection().querySelector(".error-state__detail")).toBeNull();
    expect(headline().textContent).toBe("En generering pågår allerede");
  });

  test("a repeated identical error moves focus to the headline again (E15, E16)", async () => {
    await renderHome();
    fireEvent.click(showExample());
    await replyDemo(IN_PROGRESS, 409);
    expect(document.activeElement).toBe(headline());
    const button = showExample();
    button.focus();
    fireEvent.click(button);
    expect(demoRequests()).toHaveLength(2);
    expect(document.activeElement).toBe(button);
    await replyDemo(IN_PROGRESS, 409);
    expect(document.activeElement).toBe(headline());
  });

  test("Reload required: aria-disabled, no retry, focus stays on the headline (E5, E17)", async () => {
    await renderHome();
    fireEvent.click(showExample());
    await replyDemo(INVALID_REQUEST, 400);
    expect(headline().textContent).toBe("Forespørselen var ugyldig");
    const button = showExample();
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    expect(demoRequests()).toHaveLength(1);
    expect(document.activeElement).toBe(headline());
  });

  test("network failure: exact texts, no detail line, retry available (E4)", async () => {
    await renderHome();
    fireEvent.click(showExample());
    await act(async () => {
      demoRequests()[0].fail(new TypeError("Failed to fetch"));
      await flush();
    });
    expect(headline().textContent).toBe("Mistet kontakten med serveren");
    expect(resultsSection().querySelector(".error-state__action")?.textContent).toBe(
      "Sjekk at serveren kjører, og prøv igjen.",
    );
    expect(resultsSection().querySelector(".error-state__detail")).toBeNull();
    expect(showExample().hasAttribute("aria-disabled")).toBe(false);
  });
});

describe("startup retry focus (F) and real mode (G1)", () => {
  async function failThenRetry(mode: "demo" | "real"): Promise<void> {
    render(<Home />);
    await act(async () => {
      fake.requests[0].fail(new TypeError("Failed to fetch"));
      await flush();
    });
    const retry = within(resultsSection()).getByRole("button", { name: "Prøv igjen" });
    retry.focus();
    fireEvent.click(retry);
    await act(async () => {
      fake.requests[1].resolveWith(statusReply(mode));
      await flush();
    });
  }

  test("successful Prøv igjen in demo focuses Vis eksempel (F1, G-2)", async () => {
    await failThenRetry("demo");
    expect(document.activeElement).toBe(showExample());
  });

  test("successful Prøv igjen in real mode focuses the header h1 (F2)", async () => {
    await failThenRetry("real");
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
  });

  test("real mode: no banner, no demo controls, both sections empty (G1)", async () => {
    await renderHome("real");
    expect(document.querySelector(".demo-banner")).toBeNull();
    expect(uploadSection().children).toHaveLength(0);
    expect(resultsSection().children).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Vis eksempel" })).toBeNull();
  });
});

describe("keyboard order and names (G2, G3)", () => {
  test("only Vis eksempel is in the tab order in demo S1 (G2)", async () => {
    await renderHome();
    const focusable = main().querySelectorAll(
      "button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea, a[href], [tabindex]:not([tabindex='-1'])",
    );
    expect([...focusable].map((element) => element.textContent)).toEqual(["Vis eksempel"]);
  });

  test("accessible names equal the visible labels (G3)", async () => {
    await renderHome();
    for (const name of ["Last opp", "Vis eksempel"]) {
      const button = screen.getByRole("button", { name });
      expect(button.textContent).toBe(name);
      expect(button.hasAttribute("aria-label")).toBe(false);
    }
    for (const label of ["Språk på resultatene", "Detaljnivå"]) {
      const select = screen.getByRole("combobox", { name: label });
      expect(select.hasAttribute("aria-label")).toBe(false);
      expect(document.querySelector(`label[for="${select.id}"]`)?.textContent).toBe(label);
    }
  });
});
