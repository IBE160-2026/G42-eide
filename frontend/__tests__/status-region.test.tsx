import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import StatusRegion, { announce } from "../components/StatusRegion";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function region(): HTMLElement {
  return screen.getByRole("status");
}

test("announce clears the region, then sets the text on the next tick", () => {
  render(<StatusRegion />);
  announce("Henter eksempel …");
  expect(region().textContent).toBe("");
  vi.runAllTimers();
  expect(region().textContent).toBe("Henter eksempel …");
});

test("repeating the same text clears and sets it again", () => {
  render(<StatusRegion />);
  announce("Resultatene er klare");
  vi.runAllTimers();
  expect(region().textContent).toBe("Resultatene er klare");

  announce("Resultatene er klare");
  expect(region().textContent).toBe("");
  vi.runAllTimers();
  expect(region().textContent).toBe("Resultatene er klare");
});

test("announcing an empty string leaves the region empty", () => {
  render(<StatusRegion />);
  announce("A");
  vi.runAllTimers();
  announce("");
  expect(region().textContent).toBe("");
  vi.runAllTimers();
  expect(region().textContent).toBe("");
});

test("an empty announce cancels a pending message", () => {
  render(<StatusRegion />);
  announce("A");
  announce("");
  expect(region().textContent).toBe("");
  expect(vi.getTimerCount()).toBe(0);
  vi.runAllTimers();
  expect(region().textContent).toBe("");
});

test("announce before the region is mounted does nothing and does not throw", () => {
  expect(() => announce("Henter eksempel …")).not.toThrow();
  expect(vi.getTimerCount()).toBe(0);
  render(<StatusRegion />);
  vi.runAllTimers();
  expect(region().textContent).toBe("");
});

test("rapid announces set only the latest message", () => {
  render(<StatusRegion />);
  announce("A");
  announce("B");
  expect(region().textContent).toBe("");
  expect(vi.getTimerCount()).toBe(1);
  vi.runAllTimers();
  expect(region().textContent).toBe("B");
});

test("unmounting while an announcement is pending sets nothing and logs nothing", () => {
  const errorSpy = vi.spyOn(console, "error");
  const warnSpy = vi.spyOn(console, "warn");
  const { unmount } = render(<StatusRegion />);
  const node = region();
  announce("Henter eksempel …");
  act(() => unmount());
  expect(vi.getTimerCount()).toBe(0);
  vi.runAllTimers();
  expect(node.textContent).toBe("");
  expect(() => announce("Etter avmontering")).not.toThrow();
  expect(vi.getTimerCount()).toBe(0);
  expect(errorSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();
});
