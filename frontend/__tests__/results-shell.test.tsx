import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Home from "../app/page";
import {
  RECORDED_TEXT,
  advance,
  count,
  currentFake,
  demoRequests,
  flush,
  headline,
  renderHome,
  replyDemo,
  resultsSection,
  setupDemoTest,
  showExample,
  statusReply,
  uploadSection,
  watchRegion,
} from "./demo-fixtures";

/*
 * Story 1.16: the results shell and the locked upload bar on the page (<Home /> with the
 * recorded demo reply).
 * - Stage C rows: N1, N3 (notices), S1–S4 (shell), F2, F4, F6 (focus and Strict Mode).
 * - Stage D rows: L1–L14 (the locked bar, D2, D4, D5, D8) and F1, F3, F5, F7 (D9: the same
 *   `Vis eksempel` node and focus across the lock and unlock).
 */

setupDemoTest();

const RESULTS_HEADING = "Eksempelresultater (ikke generert nå)";
const VERIFICATION =
  "Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.";
const SKIPPED_4 =
  "PDF-side 4 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.";
const NOTE =
  "Demoen viser ferdiglagde resultater på norsk bokmål med standard detaljnivå. Innstillingene kan ikke endres, og det lages ingen ny oversettelse.";
const IN_PROGRESS = JSON.stringify({
  error_code: "generation_in_progress",
  message: "En annen generering kjører allerede.",
});
const INVALID_REQUEST = JSON.stringify({
  error_code: "invalid_request",
  message: "Forespørselen hadde feil format.",
});

/** Demo S4 on the page: S1, `Vis eksempel` focused and clicked, the recorded reply applied. */
async function showResults(strict = false): Promise<HTMLElement> {
  await renderHome("demo", strict);
  const button = showExample();
  button.focus();
  fireEvent.click(button);
  await replyDemo(RECORDED_TEXT);
  return button;
}

/** Demo S3 (loading) or S4 (results), reached with `Vis eksempel` focused and clicked. */
async function reach(phase: "S3" | "S4"): Promise<HTMLElement> {
  await renderHome();
  const button = showExample();
  button.focus();
  fireEvent.click(button);
  if (phase === "S4") await replyDemo(RECORDED_TEXT);
  return button;
}

function noShell(): void {
  const section = resultsSection();
  expect(section.querySelector('[role="tablist"]')).toBeNull();
  expect(section.querySelector('[role="tabpanel"]')).toBeNull();
  expect(section.querySelector(".notice-info")).toBeNull();
}

/** The upload bar: the root element inside `Opplasting og innstillinger`. */
function bar(): HTMLElement {
  return uploadSection().firstElementChild as HTMLElement;
}

/**
 * The sequential focus order, computed (jsdom has no Tab-key navigation): focusable elements
 * in DOM order, excluding natively disabled ones, `tabindex="-1"` and anything inside `[hidden]`.
 */
function focusOrder(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>("button, select, input, textarea, a[href], [tabindex]"),
  ).filter(
    (element) =>
      !(element as HTMLButtonElement).disabled &&
      element.getAttribute("tabindex") !== "-1" &&
      element.closest("[hidden]") === null,
  );
}

function settingPairs(): Array<[string | null, string | null]> {
  return Array.from(bar().querySelectorAll("dl > div")).map((group) => [
    group.querySelector("dt")?.textContent ?? null,
    group.querySelector("dd")?.textContent ?? null,
  ]);
}

/** L1 / L9: the unlocked bar, as in Story 1.15. */
function expectUnlocked(): void {
  expect(bar().className).toBe("upload-bar");
  const language = screen.getByRole("combobox", { name: "Språk på resultatene" }) as HTMLSelectElement;
  const detail = screen.getByRole("combobox", { name: "Detaljnivå" }) as HTMLSelectElement;
  expect(language.disabled).toBe(true);
  expect(detail.disabled).toBe(true);
  expect(bar().querySelector(".upload-bar__lock")).toBeNull();
  expect(bar().textContent).not.toContain("Låst");
  expect(bar().querySelector("dl")).toBeNull();
}

// ---- Stage C: notices, shell, focus ----------------------------------------------------------

describe("notices on the page (N1, N3)", () => {
  test("the first note in Resultater is the Verification Notice (N1)", async () => {
    await showResults();
    const notes = within(resultsSection()).getAllByRole("note");
    const first = notes[0];
    expect(first.classList.contains("notice-warning")).toBe(true);
    expect(first.textContent).toBe(VERIFICATION);
    expect(first.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  test("the skipped-pages notice for page 4 sits between the Verification Notice and the tabs (N3)", async () => {
    await showResults();
    const warning = resultsSection().querySelector(".notice-warning") as HTMLElement;
    const info = warning.nextElementSibling as HTMLElement;
    expect(info.classList.contains("notice-info")).toBe(true);
    expect(info.getAttribute("role")).toBe("note");
    expect(info.textContent).toBe(SKIPPED_4);
    const icon = info.querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.getAttribute("focusable")).toBe("false");
    expect(info.nextElementSibling?.getAttribute("role")).toBe("tablist");
  });
});

describe("the results shell (S1–S4)", () => {
  test("Resultater's element children in D3 order (S1)", async () => {
    await showResults();
    const children = Array.from(resultsSection().children);
    expect(children.map((child) => child.tagName.toLowerCase())).toEqual([
      "h2",
      "div",
      "div",
      "div",
      "div",
      "div",
      "div",
      "div",
    ]);
    expect(children[0].id).toBe("results-heading");
    expect(children[0].textContent).toBe(RESULTS_HEADING);
    expect(children[1].classList.contains("notice-warning")).toBe(true);
    expect(children[2].classList.contains("notice-info")).toBe(true);
    expect(children[3].getAttribute("role")).toBe("tablist");
    expect(children.slice(4).map((child) => child.getAttribute("role"))).toEqual([
      "tabpanel",
      "tabpanel",
      "tabpanel",
      "tabpanel",
    ]);
  });

  test("no tabs, panels or skipped-pages notice in S1, S3 or S5 (S2)", async () => {
    await renderHome();
    noShell(); // S1

    fireEvent.click(showExample());
    expect(resultsSection().querySelector(".demo-loading")?.textContent).toBe("Henter eksempel …");
    noShell(); // S3

    await replyDemo(IN_PROGRESS, 409);
    expect(headline().textContent).toBe("En generering pågår allerede");
    noShell(); // S5
  });

  test("no response content is rendered; no links (S3)", async () => {
    await showResults();
    const recorded = JSON.parse(RECORDED_TEXT);
    const text = document.body.textContent ?? "";
    expect(text).not.toContain(recorded.results.summary.text.slice(0, 30));
    for (const concept of recorded.results.key_concepts) expect(text).not.toContain(concept.term);
    for (const card of recorded.results.flashcards) expect(text).not.toContain(card.front);
    for (const item of recorded.results.quiz) expect(text).not.toContain(item.question);
    expect(resultsSection().querySelector("a")).toBeNull();
  });

  test("real mode: no tabs, notices or locked bar (S4)", async () => {
    await renderHome("real");
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(document.querySelector(".notice-warning")).toBeNull();
    expect(document.querySelector(".notice-info")).toBeNull();
    expect(document.querySelector(".upload-bar-locked")).toBeNull();
    expect(resultsSection().children).toHaveLength(0);
    expect(uploadSection().children).toHaveLength(0);
  });
});

describe("focus and Strict Mode (F2, F4, F6)", () => {
  test("on success Vis eksempel keeps focus; only Resultatene er klare is announced (F2)", async () => {
    await renderHome();
    const button = showExample();
    button.focus();
    fireEvent.click(button);
    await advance(0); // flushes "Henter eksempel …"
    const watcher = watchRegion();
    try {
      await replyDemo(RECORDED_TEXT);
      expect(showExample()).toBe(button);
      expect(document.activeElement).toBe(button);
      await advance(0);

      const announced = watcher.texts.filter((text) => text !== "");
      expect(count(announced, "Resultatene er klare")).toBe(1);
      expect(announced.every((text) => text === "Resultatene er klare")).toBe(true);
    } finally {
      watcher.stop();
    }
  });

  test("arrow keys and clicks in the tablist move focus to the expected element, never <body> (F4)", async () => {
    await showResults();
    const tab = (name: string) => screen.getByRole("tab", { name });
    const quizPanel = () => document.getElementById("result-panel-quiz") as HTMLElement;
    const steps: Array<[() => void, () => HTMLElement]> = [
      [() => tab("Sammendrag").focus(), () => tab("Sammendrag")],
      [() => fireEvent.keyDown(tab("Sammendrag"), { key: "ArrowRight" }), () => tab("Nøkkelbegreper")],
      [() => fireEvent.keyDown(tab("Nøkkelbegreper"), { key: "End" }), () => tab("Quiz (5)")],
      [() => fireEvent.keyDown(tab("Quiz (5)"), { key: "ArrowRight" }), () => tab("Sammendrag")],
      [() => fireEvent.keyDown(tab("Sammendrag"), { key: "ArrowLeft" }), () => tab("Quiz (5)")],
      [() => quizPanel().focus(), quizPanel],
      [() => fireEvent.click(tab("Flashkort (5)")), () => tab("Flashkort (5)")],
      [() => fireEvent.keyDown(tab("Flashkort (5)"), { key: "Home" }), () => tab("Sammendrag")],
    ];
    for (const [step, expected] of steps) {
      step();
      expect(document.activeElement).not.toBe(document.body);
      expect(document.activeElement).toBe(expected());
    }
  });

  test("Strict Mode: one request, one tablist, unique ids (F6)", async () => {
    await showResults(true);
    expect(demoRequests()).toHaveLength(1);
    expect(screen.getAllByRole("tablist")).toHaveLength(1);
    const ids = Array.from(document.querySelectorAll("[id]")).map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---- Stage D: the locked upload bar -----------------------------------------------------------

describe("the unlocked bar in S1 (L1)", () => {
  test("no upload-bar-locked; the two disabled selects; no Låst; no <dl> (L1)", async () => {
    await renderHome();
    expectUnlocked();
  });
});

describe.each(["S3", "S4"] as const)("the locked bar in %s", (phase) => {
  test(`root class, no combobox, the two <dl> pairs (${phase === "S3" ? "L2" : "L3"})`, async () => {
    await reach(phase);
    expect(bar().className).toBe("upload-bar upload-bar-locked");
    expect(within(uploadSection()).queryByRole("combobox")).toBeNull();
    expect(settingPairs()).toEqual([
      ["Språk på resultatene", "Norsk bokmål"],
      ["Detaljnivå", "Standard"],
    ]);
  });

  test("the padlock is decorative (L4)", async () => {
    await reach(phase);
    const icon = bar().querySelector(".upload-bar__lock svg");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.getAttribute("focusable")).toBe("false");
  });

  test("the region keeps its name (L5)", async () => {
    await reach(phase);
    const section = bar().closest("section") as HTMLElement;
    expect(section.getAttribute("aria-label")).toBe("Opplasting og innstillinger");
    expect(uploadSection()).toBe(section);
  });

  test("the fixed-settings note is shown with the exact text (L6)", async () => {
    await reach(phase);
    expect(bar().querySelector(".settings-note")?.textContent).toBe(NOTE);
  });

  test("Last opp is present and natively disabled; no file input (L7)", async () => {
    await reach(phase);
    const upload = within(uploadSection()).getByRole("button", { name: "Last opp" });
    expect(upload.hasAttribute("disabled")).toBe(true);
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  test("Vis eksempel is aria-disabled, not natively disabled; a click sends nothing (L8)", async () => {
    const button = await reach(phase);
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(false);
    fireEvent.click(button);
    expect(demoRequests()).toHaveLength(1);
  });

  test("no Emnekode and no file name in the bar (L10)", async () => {
    await reach(phase);
    expect(bar().textContent).not.toContain("Emnekode");
    expect(bar().textContent).not.toMatch(/\.pdf|\.txt/i);
    expect(bar().querySelector(".file-chip")).toBeNull();
  });

  test("only Vis eksempel is in the bar's focus order (L12)", async () => {
    const button = await reach(phase);
    expect(focusOrder(bar())).toEqual([button]);
  });

  test("children in D8 order; Låst is exactly the text (L13)", async () => {
    const button = await reach(phase);
    const children = Array.from(bar().children) as HTMLElement[];
    expect(children).toHaveLength(5);
    expect(children[0].tagName).toBe("P");
    expect(children[0].className).toBe("upload-bar__lock");
    expect(children[0].textContent).toBe("Låst");
    expect(children[1].textContent).toBe("Last opp");
    expect(children[1].tagName).toBe("BUTTON");
    expect(children[2].tagName).toBe("DL");
    expect(children[2].className).toBe("locked-settings");
    expect(children[3].tagName).toBe("P");
    expect(children[3].className).toBe("settings-note");
    expect(children[4]).toBe(button);
    expect(children[4].textContent).toBe("Vis eksempel");
  });

  test("the <dl> holds two div groups of one dt then one dd; no label or select (L14)", async () => {
    await reach(phase);
    const dl = bar().querySelector("dl") as HTMLElement;
    const groups = Array.from(dl.children);
    expect(groups.map((group) => group.tagName)).toEqual(["DIV", "DIV"]);
    for (const group of groups) {
      expect(Array.from(group.children).map((child) => child.tagName)).toEqual(["DT", "DD"]);
    }
    expect(bar().querySelector("label")).toBeNull();
    expect(bar().querySelector("select")).toBeNull();
  });
});

describe("unlock in S5 and node identity (L9, L11)", () => {
  test("S5 Temporary: unlocked again, Vis eksempel available (L9)", async () => {
    await reach("S3");
    await replyDemo(IN_PROGRESS, 409);
    expectUnlocked();
    expect(showExample().hasAttribute("aria-disabled")).toBe(false);
  });

  test("S5 Reload-required: unlocked again, Vis eksempel aria-disabled (L9)", async () => {
    await reach("S3");
    await replyDemo(INVALID_REQUEST, 400);
    expectUnlocked();
    expect(showExample().getAttribute("aria-disabled")).toBe("true");
  });

  test("the bar root is the same node from S1 through S3 to S4 (L11)", async () => {
    await renderHome();
    const root = bar();
    fireEvent.click(showExample());
    expect(bar()).toBe(root);
    expect(root.classList.contains("upload-bar-locked")).toBe(true);
    await replyDemo(RECORDED_TEXT);
    expect(bar()).toBe(root);
  });
});

describe("Vis eksempel keeps its node and focus (F1, F3, F5, F7)", () => {
  test("S1 → S3: the same node, still focused (F1)", async () => {
    const button = await reach("S3");
    expect(bar().classList.contains("upload-bar-locked")).toBe(true);
    expect(showExample()).toBe(button);
    expect(document.activeElement).toBe(button);
  });

  test("S3 → S5: the same node; focus on the error headline (F3)", async () => {
    const button = await reach("S3");
    await replyDemo(IN_PROGRESS, 409);
    expect(showExample()).toBe(button);
    expect(document.activeElement).toBe(headline());
    expect(headline().textContent).toBe("En generering pågår allerede");
  });

  test("a successful Prøv igjen still focuses Vis eksempel (F5)", async () => {
    render(<Home />);
    await act(async () => {
      currentFake().requests[0].fail(new TypeError("Failed to fetch"));
      await flush();
    });
    const retry = within(resultsSection()).getByRole("button", { name: "Prøv igjen" });
    retry.focus();
    fireEvent.click(retry);
    await act(async () => {
      currentFake().requests[1].resolveWith(statusReply("demo"));
      await flush();
    });
    expect(document.activeElement).toBe(showExample());
  });

  test("S5 Temporary → click → S3: the same node, still focused, one new request (F7)", async () => {
    const button = await reach("S3");
    await replyDemo(IN_PROGRESS, 409);
    expectUnlocked();
    expect(showExample()).toBe(button);

    button.focus();
    fireEvent.click(button);
    expect(bar().classList.contains("upload-bar-locked")).toBe(true);
    expect(showExample()).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(demoRequests()).toHaveLength(2);
  });
});
