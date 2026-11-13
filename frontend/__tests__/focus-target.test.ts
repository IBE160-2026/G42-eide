import { afterEach, beforeEach, expect, test } from "vitest";
import { focusAfterStartupRecovery, registerStartupFocusTarget } from "../lib/focus-target";

let title: HTMLHeadingElement;
const cleanups: (() => void)[] = [];

function addButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  document.body.append(button);
  return button;
}

function register(element: HTMLElement): () => void {
  const unregister = registerStartupFocusTarget(element);
  cleanups.push(unregister);
  return unregister;
}

beforeEach(() => {
  title = document.createElement("h1");
  title.id = "app-title";
  title.tabIndex = -1;
  title.textContent = "AI Study Buddy";
  document.body.append(title);
});

afterEach(() => {
  cleanups.splice(0).forEach((unregister) => unregister());
  document.body.replaceChildren();
});

test("without a registered target, focus goes to the header h1", () => {
  focusAfterStartupRecovery();
  expect(document.activeElement).toBe(title);
});

test("a registered, connected target receives focus", () => {
  const target = addButton("Vis eksempel");
  register(target);
  focusAfterStartupRecovery();
  expect(document.activeElement).toBe(target);
});

test("register then unregister falls back to the h1", () => {
  const target = addButton("Vis eksempel");
  const unregister = register(target);
  unregister();
  focusAfterStartupRecovery();
  expect(document.activeElement).toBe(title);
});

test("a stale unregister keeps the newer target", () => {
  const older = addButton("Last opp");
  const newer = addButton("Vis eksempel");
  const unregisterOlder = register(older);
  register(newer);
  unregisterOlder();
  focusAfterStartupRecovery();
  expect(document.activeElement).toBe(newer);
});

test("a disconnected target falls back to the h1", () => {
  const target = addButton("Vis eksempel");
  register(target);
  target.remove();
  focusAfterStartupRecovery();
  expect(document.activeElement).toBe(title);
});

test("a target that cannot take focus falls back to the h1", () => {
  const target = document.createElement("div");
  target.textContent = "not focusable";
  document.body.append(target);
  register(target);
  focusAfterStartupRecovery();
  expect(document.activeElement).toBe(title);
});

test("without an h1 nothing is focused and nothing throws", () => {
  title.remove();
  const before = document.activeElement;
  expect(() => focusAfterStartupRecovery()).not.toThrow();
  expect(document.activeElement).toBe(before);

  const target = addButton("Vis eksempel");
  register(target);
  target.remove();
  expect(() => focusAfterStartupRecovery()).not.toThrow();
  expect(document.activeElement).toBe(before);
});
