import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode, useCallback, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import Home from "../app/page";
import { AppStatusProvider, useAppStatus } from "../components/AppStatusProvider";
import StartupCheck from "../components/StartupCheck";
import { registerStartupFocusTarget } from "../lib/focus-target";
import { fakeResponse, stubControllableFetch, validStatus } from "./status-fixtures";

const HEADLINE = "Får ikke kontakt med appens server";
const ACTION = "Sjekk at serveren er startet, og trykk «Prøv igjen».";

let requests: ReturnType<typeof stubControllableFetch>["requests"];
let fetchMock: ReturnType<typeof stubControllableFetch>["fetchMock"];

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
  ({ requests, fetchMock } = stubControllableFetch());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function results(): HTMLElement {
  return screen.getByRole("region", { name: "Resultater" });
}

function upload(): HTMLElement {
  return screen.getByRole("region", { name: "Opplasting og innstillinger" });
}

function title(): HTMLElement {
  return screen.getByRole("heading", { level: 1 });
}

function headline(): HTMLElement {
  return within(results()).getByRole("heading", { level: 2, name: HEADLINE });
}

function retryButton(): HTMLElement {
  return within(results()).getByRole("button", { name: "Prøv igjen" });
}

async function settle(index: number, outcome: Response | Error): Promise<void> {
  await act(async () => {
    if (outcome instanceof Error) requests[index].reject(outcome);
    else requests[index].resolve(outcome);
  });
}

async function advance(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

/**
 * The 10-second status timer is cleared. React may leave a 0 ms scheduler
 * timer after a focus change, so zero-delay timers are flushed first; a leaked
 * status timer would still be counted.
 */
async function expectNoStatusTimer(): Promise<void> {
  await advance(0);
  expect(vi.getTimerCount()).toBe(0);
}

function expectS0xUnannounced(): void {
  expect(document.querySelector('[role="alert"]')).toBeNull();
  expect(screen.getByRole("status").textContent).toBe("");
  const interactive = screen
    .getByRole("main")
    .querySelectorAll("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
  expect([...interactive].map((el) => el.textContent)).toEqual(["Prøv igjen"]);
}

async function renderFailed(): Promise<void> {
  render(<Home />);
  await settle(0, new TypeError("Failed to fetch"));
  expect(headline()).toBeTruthy();
}

describe("S0 Starter …", () => {
  test("pending: Starter … in Resultater, no button, nothing announced", () => {
    render(<Home />);
    expect(results().textContent).toBe("Starter …");
    expect(upload().textContent).toBe("");
    expect(within(screen.getByRole("main")).queryByRole("button")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("");
    expect(document.querySelector('[role="alert"]')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("missing base URL: requests http://127.0.0.1:8000/api/status without cache", () => {
    render(<Home />);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("http://127.0.0.1:8000/api/status");
    expect(requests[0].init.cache).toBe("no-store");
  });

  test("first-load success: Starter … gone, Resultater empty, focus not moved", async () => {
    render(<Home />);
    await settle(0, fakeResponse(200, validStatus()));
    expect(results().textContent).toBe("");
    expect(results().children).toHaveLength(0);
    expect(document.activeElement).toBe(document.body);
    expect(screen.getByRole("status").textContent).toBe("");
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("S0x on failure", () => {
  test("network error: S0x with icon, headline, action and button; focus on headline", async () => {
    render(<Home />);
    await settle(0, new TypeError("Failed to fetch"));

    const h2 = headline();
    expect(h2.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(h2);
    expect(within(results()).getByText(ACTION).tagName).toBe("P");

    const state = results().querySelector(".error-state");
    expect(state).not.toBeNull();
    const icon = state!.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.getAttribute("focusable")).toBe("false");

    const button = retryButton();
    expect(button.getAttribute("type")).toBe("button");
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(button.classList.contains("button-primary")).toBe(true);

    expect(results().textContent).toBe(`${HEADLINE}${ACTION}Prøv igjen`);
    expectS0xUnannounced();
    expect(upload().textContent).toBe("");
    await expectNoStatusTimer();
  });

  test("non-2xx with an error envelope: S0x without the backend message, reference or status", async () => {
    render(<Home />);
    await settle(
      0,
      fakeResponse(500, {
        error_code: "internal_error",
        message: "Noe gikk uventet galt i backend",
        reference_id: "a1b2c3d4",
      }),
    );
    expect(document.activeElement).toBe(headline());
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("Noe gikk uventet galt i backend");
    expect(text).not.toContain("a1b2c3d4");
    expect(text).not.toContain("500");
    expect(text).not.toContain("internal_error");
    expectS0xUnannounced();
  });

  const malformed: [string, Response][] = [
    ["invalid JSON", fakeResponse(200, null, true)],
    ["wrong mode", fakeResponse(200, { ...validStatus(), mode: "test" })],
    ["missing limits", fakeResponse(200, { ...validStatus(), limits: undefined })],
    ["missing options", fakeResponse(200, { ...validStatus(), options: undefined })],
    ["missing accepted_types", fakeResponse(200, { ...validStatus(), accepted_types: undefined })],
  ];

  test.each(malformed)("malformed body (%s): S0x", async (_label, response) => {
    render(<Home />);
    await settle(0, response);
    expect(document.activeElement).toBe(headline());
    expectS0xUnannounced();
  });

  test("timeout: still S0 at 9.999 s, aborted at 10 s, then S0x", async () => {
    render(<Home />);
    await advance(9_999);
    expect(requests[0].signal.aborted).toBe(false);
    expect(results().textContent).toBe("Starter …");

    await advance(1);
    expect(requests[0].signal.aborted).toBe(true);
    expect(document.activeElement).toBe(headline());
    expectS0xUnannounced();
    await expectNoStatusTimer();
  });
});

describe("Prøv igjen", () => {
  test("retry running: aria-disabled, keeps focus, S0x stays, one new request", async () => {
    await renderFailed();
    const button = retryButton();
    button.focus();
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retryButton()).toBe(button);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(false);
    expect(document.activeElement).toBe(button);
    expect(headline()).toBeTruthy();
    expect(within(results()).getByText(ACTION)).toBeTruthy();
    expectS0xUnannounced();
  });

  test("activation while checking does nothing and sends no extra request", async () => {
    await renderFailed();
    const button = retryButton();
    button.focus();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(button);
  });

  test("repeated failure: button available again, focus on the headline again", async () => {
    await renderFailed();
    const button = retryButton();
    button.focus();
    fireEvent.click(button);
    await settle(1, new TypeError("Failed to fetch"));

    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(document.activeElement).toBe(headline());
    expectS0xUnannounced();

    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("repeated failure by timeout: focus on the headline again", async () => {
    await renderFailed();
    const button = retryButton();
    button.focus();
    fireEvent.click(button);
    await advance(9_999);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    await advance(1);
    expect(requests[1].signal.aborted).toBe(true);
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(document.activeElement).toBe(headline());
  });

  test("retry success without a registered target: S0x gone, focus on the header h1", async () => {
    await renderFailed();
    const button = retryButton();
    button.focus();
    fireEvent.click(button);
    await settle(1, fakeResponse(200, validStatus()));

    expect(results().textContent).toBe("");
    expect(title().id).toBe("app-title");
    expect(document.activeElement).toBe(title());
  });
});

function ModeTarget() {
  const { phase, status } = useAppStatus();
  const ref = useCallback((node: HTMLButtonElement | null) => {
    if (node === null) return;
    return registerStartupFocusTarget(node);
  }, []);
  if (phase !== "ready" || status === null) return null;
  return (
    <button type="button" ref={ref}>
      Vis eksempel
    </button>
  );
}

test("retry success with a registered target: focus on that element", async () => {
  render(
    <>
      <h1 id="app-title" tabIndex={-1}>
        AI Study Buddy
      </h1>
      <AppStatusProvider>
        <main>
          <section aria-label="Opplasting og innstillinger">
            <ModeTarget />
          </section>
          <section aria-label="Resultater">
            <StartupCheck />
          </section>
        </main>
      </AppStatusProvider>
    </>,
  );
  await settle(0, new TypeError("Failed to fetch"));
  const button = retryButton();
  button.focus();
  fireEvent.click(button);
  await settle(1, fakeResponse(200, validStatus()));

  const target = screen.getByRole("button", { name: "Vis eksempel" });
  expect(document.activeElement).toBe(target);
  expect(results().textContent).toBe("");
});

function StatusProbe({ label }: { label: string }) {
  const { phase, status } = useAppStatus();
  return <p data-testid={label}>{`${phase}:${status?.mode ?? "none"}`}</p>;
}

test("shared status: consumers in both sections see the same state from one request", async () => {
  render(
    <AppStatusProvider>
      <main>
        <section aria-label="Opplasting og innstillinger">
          <StatusProbe label="upload" />
        </section>
        <section aria-label="Resultater">
          <StatusProbe label="results" />
        </section>
      </main>
    </AppStatusProvider>,
  );
  expect(screen.getByTestId("upload").textContent).toBe("starting:none");
  expect(screen.getByTestId("results").textContent).toBe("starting:none");
  await settle(0, fakeResponse(200, { ...validStatus(), mode: "real" }));
  expect(screen.getByTestId("upload").textContent).toBe("ready:real");
  expect(screen.getByTestId("results").textContent).toBe("ready:real");
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

let capturedRetry: (() => void) | null = null;

/** Exposes `retry` from `useAppStatus()` so tests can call it directly. */
function RetryProbe() {
  const { retry } = useAppStatus();
  useEffect(() => {
    capturedRetry = retry;
    return () => {
      capturedRetry = null;
    };
  }, [retry]);
  return <StatusProbe label="probe" />;
}

function callRetry(times = 1): void {
  act(() => {
    for (let i = 0; i < times; i += 1) capturedRetry!();
  });
}

test("retry() itself is guarded: no request in starting or ready, one per failure", async () => {
  render(
    <AppStatusProvider>
      <RetryProbe />
    </AppStatusProvider>,
  );
  const probe = () => screen.getByTestId("probe").textContent;

  callRetry();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(probe()).toBe("starting:none");
  expect(requests[0].signal.aborted).toBe(false);

  await settle(0, new TypeError("Failed to fetch"));
  expect(probe()).toBe("failed:none");

  callRetry(2);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(probe()).toBe("retrying:none");

  await settle(1, fakeResponse(200, validStatus()));
  expect(probe()).toBe("ready:demo");

  callRetry();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(probe()).toBe("ready:demo");
});

test("shared status across a retry: both consumers see retrying, then ready, from two requests", async () => {
  render(
    <AppStatusProvider>
      <main>
        <section aria-label="Opplasting og innstillinger">
          <StatusProbe label="upload" />
        </section>
        <section aria-label="Resultater">
          <RetryProbe />
        </section>
      </main>
    </AppStatusProvider>,
  );
  const both = () => [
    screen.getByTestId("upload").textContent,
    screen.getByTestId("probe").textContent,
  ];

  await settle(0, new TypeError("Failed to fetch"));
  expect(both()).toEqual(["failed:none", "failed:none"]);

  callRetry();
  expect(both()).toEqual(["retrying:none", "retrying:none"]);

  await settle(1, fakeResponse(200, { ...validStatus(), mode: "real" }));
  expect(both()).toEqual(["ready:real", "ready:real"]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("unmount while retrying: request aborted, no state update, no console error", async () => {
  const errorSpy = vi.spyOn(console, "error");
  const warnSpy = vi.spyOn(console, "warn");
  const { unmount } = render(<Home />);
  await settle(0, new TypeError("Failed to fetch"));
  fireEvent.click(retryButton());
  expect(fetchMock).toHaveBeenCalledTimes(2);

  act(() => unmount());
  expect(requests[1].signal.aborted).toBe(true);
  await expectNoStatusTimer();
  await act(async () => {
    requests[1].resolve(fakeResponse(200, validStatus()));
  });
  expect(errorSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();
});

test("unmount while pending: request aborted, no state update, no warning", async () => {
  const errorSpy = vi.spyOn(console, "error");
  const warnSpy = vi.spyOn(console, "warn");
  const { unmount } = render(<Home />);
  act(() => unmount());
  expect(requests[0].signal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  await act(async () => {
    requests[0].resolve(fakeResponse(200, validStatus()));
  });
  expect(errorSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();
});

test("strict mode: the first request is aborted by cleanup without showing S0x", async () => {
  render(
    <StrictMode>
      <Home />
    </StrictMode>,
  );
  expect(requests).toHaveLength(2);
  expect(requests[0].signal.aborted).toBe(true);
  await act(async () => {});
  expect(results().textContent).toBe("Starter …");
  expect(requests[1].signal.aborted).toBe(false);
  await settle(1, fakeResponse(200, validStatus()));
  expect(results().textContent).toBe("");
  expect(document.activeElement).toBe(document.body);
});

test("useAppStatus outside the provider throws a clear error", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  expect(() => render(<StatusProbe label="orphan" />)).toThrow(/AppStatusProvider/);
});
