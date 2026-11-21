import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import ResultNotices from "../components/ResultNotices";
import ResultTabs from "../components/ResultTabs";
import type { ValidatedResults } from "../lib/contracts";
import { nextTabIndex } from "../lib/tabs";
import {
  RECORDED_TEXT,
  advance,
  currentFake,
  demoRequests,
  main,
  renderHome,
  replyDemo,
  resultsSection,
  setupDemoTest,
  showExample,
  watchRegion,
} from "./demo-fixtures";

/*
 * Story 1.16: the result tabs and notices.
 * - Stage A: the unit row T11 (`nextTabIndex`, D13).
 * - Stage B: the component rows N9 (`ResultNotices`, D6/D7) and T3, T4, T7–T9, T12,
 *   K1–K6, K9, K11–K13 (`ResultTabs`, D10–D13).
 * - Stage C: the page rows T1, T2, T5, T6, T10, K7, K8, K10 and P1–P4 (demo S4 in <Home />).
 */

afterEach(() => {
  cleanup();
});

describe("nextTabIndex (D13, T11)", () => {
  test("ArrowRight moves to the next tab and wraps from the last to the first", () => {
    expect(nextTabIndex(0, "ArrowRight", 4)).toBe(1);
    expect(nextTabIndex(1, "ArrowRight", 4)).toBe(2);
    expect(nextTabIndex(2, "ArrowRight", 4)).toBe(3);
    expect(nextTabIndex(3, "ArrowRight", 4)).toBe(0);
  });

  test("ArrowLeft moves to the previous tab and wraps from the first to the last", () => {
    expect(nextTabIndex(0, "ArrowLeft", 4)).toBe(3);
    expect(nextTabIndex(3, "ArrowLeft", 4)).toBe(2);
    expect(nextTabIndex(2, "ArrowLeft", 4)).toBe(1);
    expect(nextTabIndex(1, "ArrowLeft", 4)).toBe(0);
  });

  test("Home goes to the first tab and End to the last, from any tab", () => {
    for (const current of [0, 1, 2, 3]) {
      expect(nextTabIndex(current, "Home", 4)).toBe(0);
      expect(nextTabIndex(current, "End", 4)).toBe(3);
    }
  });

  test.each(["ArrowUp", "ArrowDown", "a", "Enter", " ", "Tab", "PageDown"])(
    "%j is not handled (null)",
    (key) => {
      expect(nextTabIndex(1, key, 4)).toBeNull();
    },
  );
});

// ---- component helpers --------------------------------------------------------------------

const VERIFICATION =
  "Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.";
const LABELS_5_5 = ["Sammendrag", "Nøkkelbegreper", "Flashkort (5)", "Quiz (5)"];

/** Hand-built results with the given list lengths (the component does not validate them). */
function makeResults(flashcards: number, quiz: number, keyConcepts: number): ValidatedResults {
  return {
    summary: { text: "Sammendragstekst.", pages: [1] },
    flashcards: Array.from({ length: flashcards }, (_, i) => ({
      front: `Kort ${i + 1}`,
      back: `Svar ${i + 1}`,
      pages: [1],
    })),
    quiz: Array.from({ length: quiz }, (_, i) => ({
      question: `Spørsmål ${i + 1}`,
      answer: `Svar ${i + 1}`,
      pages: [1],
    })),
    key_concepts: Array.from({ length: keyConcepts }, (_, i) => ({
      term: `Begrep ${i + 1}`,
      explanation: `Forklaring ${i + 1}`,
      pages: [1],
    })),
  };
}

function renderTabs(results: ValidatedResults = makeResults(5, 5, 5)) {
  return render(
    <section aria-label="Resultater">
      <h2 id="results-heading">Eksempelresultater (ikke generert nå)</h2>
      <ResultTabs results={results} labelledBy="results-heading" pdfSource={null} />
    </section>,
  );
}

function tabs(): HTMLElement[] {
  return screen.getAllByRole("tab");
}

function tab(name: string): HTMLElement {
  return screen.getByRole("tab", { name });
}

function tablist(): HTMLElement {
  return screen.getByRole("tablist");
}

/** All four panels, including the hidden ones (role queries skip `[hidden]` content). */
function panels(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
}

function selectedLabel(): string | null {
  return tabs().find((t) => t.getAttribute("aria-selected") === "true")?.textContent ?? null;
}

/** T7: exactly one tab has tabindex 0, and it is the selected one; only its panel is visible. */
function expectRoving(label: string) {
  const all = tabs();
  const inOrder = all.filter((t) => t.getAttribute("tabindex") === "0");
  expect(inOrder).toHaveLength(1);
  expect(inOrder[0].textContent).toBe(label);
  expect(inOrder[0].getAttribute("aria-selected")).toBe("true");
  for (const t of all) {
    if (t !== inOrder[0]) {
      expect(t.getAttribute("tabindex")).toBe("-1");
      expect(t.getAttribute("aria-selected")).toBe("false");
    }
  }
  const index = all.indexOf(inOrder[0]);
  panels().forEach((panel, i) => expect(panel.hidden).toBe(i !== index));
}

function key(target: Element, init: KeyboardEventInit): boolean {
  return fireEvent.keyDown(target, init);
}

// ---- N9: ResultNotices ---------------------------------------------------------------------

describe("ResultNotices (D6, D7, N9)", () => {
  test("no skipped pages: only the Verification Notice, no info notice", () => {
    const { container } = render(<ResultNotices skippedPages={[]} />);
    const notes = screen.getAllByRole("note");
    expect(notes).toHaveLength(1);
    expect(notes[0].classList.contains("notice-warning")).toBe(true);
    expect(notes[0].textContent).toBe(VERIFICATION);
    expect(container.querySelector(".notice-info")).toBeNull();
  });

  test("[2, 7]: the info notice follows, its text a single plain text node", () => {
    const { container } = render(<ResultNotices skippedPages={[2, 7]} />);
    const notes = screen.getAllByRole("note");
    expect(notes).toHaveLength(2);
    expect(notes[0].classList.contains("notice-warning")).toBe(true);
    expect(notes[1].classList.contains("notice-info")).toBe(true);
    // Both notices are direct children of the render container (a Fragment, D3).
    expect(Array.from(container.children)).toEqual(notes);

    const paragraph = notes[1].querySelector("p") as HTMLParagraphElement;
    expect(paragraph.childNodes).toHaveLength(1);
    expect(paragraph.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(paragraph.textContent).toBe(
      "PDF-side 2 og 7 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.",
    );
    const icon = notes[1].querySelector("svg");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.getAttribute("focusable")).toBe("false");
  });
});

// ---- ResultTabs: labels, counts, selection -------------------------------------------------

describe("ResultTabs: labels and counts (T3, T4)", () => {
  test("counts from the real list lengths on Flashkort and Quiz only (T3)", () => {
    renderTabs(makeResults(8, 6, 3));
    expect(tabs().map((t) => t.textContent)).toEqual([
      "Sammendrag",
      "Nøkkelbegreper",
      "Flashkort (8)",
      "Quiz (6)",
    ]);
  });

  test("empty lists show (0) (T4)", () => {
    renderTabs(makeResults(0, 0, 0));
    expect(tabs().map((t) => t.textContent)).toEqual([
      "Sammendrag",
      "Nøkkelbegreper",
      "Flashkort (0)",
      "Quiz (0)",
    ]);
  });
});

describe("ResultTabs: selection, panels and remounting (T7, T8, T9, T12)", () => {
  test("initially Sammendrag is the only tab in the Tab order (T7)", () => {
    renderTabs();
    expect(tabs().map((t) => t.textContent)).toEqual(LABELS_5_5);
    expectRoving("Sammendrag");
  });

  test("click Quiz: Quiz selected and visible; the other three hidden but mounted (T8, T7)", () => {
    renderTabs();
    fireEvent.click(tab("Quiz (5)"));
    expect(selectedLabel()).toBe("Quiz (5)");
    expect(panels()).toHaveLength(4);
    const quizPanel = document.getElementById("result-panel-quiz") as HTMLElement;
    expect(quizPanel.hidden).toBe(false);
    for (const id of ["result-panel-summary", "result-panel-key-concepts", "result-panel-flashcards"]) {
      const panel = document.getElementById(id) as HTMLElement;
      expect(panel).not.toBeNull();
      expect(panel.hidden).toBe(true);
    }
    expectRoving("Quiz (5)");
  });

  test("clicking through all tabs keeps the same panel nodes (T9)", () => {
    renderTabs();
    const before = panels();
    for (const label of ["Nøkkelbegreper", "Flashkort (5)", "Quiz (5)", "Sammendrag"]) {
      fireEvent.click(tab(label));
      expectRoving(label);
    }
    const after = panels();
    expect(after).toHaveLength(4);
    after.forEach((panel, i) => expect(panel).toBe(before[i]));
  });

  test("a new mount starts on Sammendrag again (T12)", () => {
    const first = renderTabs();
    fireEvent.click(tab("Quiz (5)"));
    expect(selectedLabel()).toBe("Quiz (5)");
    first.unmount();
    renderTabs();
    expectRoving("Sammendrag");
  });
});

// ---- ResultTabs: keyboard and pointer --------------------------------------------------------

describe("ResultTabs: keyboard (K1–K6, K12, K13)", () => {
  test("ArrowRight selects and focuses the next tab; default prevented (K1, K5, T7)", () => {
    renderTabs();
    tab("Sammendrag").focus();
    expect(key(tab("Sammendrag"), { key: "ArrowRight" })).toBe(false);
    expect(document.activeElement).toBe(tab("Nøkkelbegreper"));
    expectRoving("Nøkkelbegreper");
    expect(document.getElementById("result-panel-key-concepts")?.hidden).toBe(false);
  });

  test("ArrowRight on Quiz wraps to Sammendrag (K2, K5, T7)", () => {
    renderTabs();
    fireEvent.click(tab("Quiz (5)"));
    expect(key(tab("Quiz (5)"), { key: "ArrowRight" })).toBe(false);
    expect(document.activeElement).toBe(tab("Sammendrag"));
    expectRoving("Sammendrag");
  });

  test("ArrowLeft on Sammendrag wraps to Quiz (K3, K5, T7)", () => {
    renderTabs();
    tab("Sammendrag").focus();
    expect(key(tab("Sammendrag"), { key: "ArrowLeft" })).toBe(false);
    expect(document.activeElement).toBe(tab("Quiz (5)"));
    expectRoving("Quiz (5)");
  });

  test("Home and End from a middle tab (K4, K5, T7)", () => {
    renderTabs();
    fireEvent.click(tab("Nøkkelbegreper"));
    expect(key(tab("Nøkkelbegreper"), { key: "End" })).toBe(false);
    expect(document.activeElement).toBe(tab("Quiz (5)"));
    expectRoving("Quiz (5)");

    fireEvent.click(tab("Flashkort (5)"));
    expect(key(tab("Flashkort (5)"), { key: "Home" })).toBe(false);
    expect(document.activeElement).toBe(tab("Sammendrag"));
    expectRoving("Sammendrag");
  });

  test("the current index is the target tab, not the selected one (D13)", () => {
    renderTabs();
    // Sammendrag is selected; a key on Flashkort moves from Flashkort.
    expect(key(tab("Flashkort (5)"), { key: "ArrowRight" })).toBe(false);
    expect(document.activeElement).toBe(tab("Quiz (5)"));
    expectRoving("Quiz (5)");
  });

  test.each([
    { key: "ArrowUp" },
    { key: "ArrowDown" },
    { key: "a" },
    { key: "ArrowLeft", altKey: true },
    { key: "Home", ctrlKey: true },
    { key: "ArrowRight", metaKey: true },
  ])("%j: nothing changes and the default is kept (K6)", (init) => {
    renderTabs();
    fireEvent.click(tab("Nøkkelbegreper"));
    expect(document.activeElement).toBe(tab("Nøkkelbegreper"));
    expect(key(tab("Nøkkelbegreper"), init)).toBe(true);
    expect(document.activeElement).toBe(tab("Nøkkelbegreper"));
    expectRoving("Nøkkelbegreper");
  });

  test("Shift+ArrowRight behaves as ArrowRight (K12)", () => {
    renderTabs();
    tab("Sammendrag").focus();
    expect(key(tab("Sammendrag"), { key: "ArrowRight", shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(tab("Nøkkelbegreper"));
    expectRoving("Nøkkelbegreper");
  });

  test("a key whose target is the tab list itself is ignored (K13)", () => {
    renderTabs();
    tab("Sammendrag").focus();
    expect(key(tablist(), { key: "ArrowRight" })).toBe(true);
    expect(document.activeElement).toBe(tab("Sammendrag"));
    expectRoving("Sammendrag");
  });
});

describe("ResultTabs: pointer (K9, K11)", () => {
  test("a click selects the tab through the click path (K9)", () => {
    renderTabs();
    fireEvent.click(tab("Nøkkelbegreper"));
    expectRoving("Nøkkelbegreper");
    // Clicking the selected tab again keeps it selected.
    fireEvent.click(tab("Nøkkelbegreper"));
    expectRoving("Nøkkelbegreper");
  });

  test("a click focuses the tab, also when focus was in a panel that becomes hidden (K11)", () => {
    renderTabs();
    const summaryPanel = document.getElementById("result-panel-summary") as HTMLElement;
    summaryPanel.focus();
    expect(document.activeElement).toBe(summaryPanel);

    fireEvent.click(tab("Quiz (5)"));
    expect(document.activeElement).toBe(tab("Quiz (5)"));
    expect(document.activeElement).not.toBe(document.body);
    expect(summaryPanel.hidden).toBe(true);
    expectRoving("Quiz (5)");
  });
});

// ---- Stage C: page rows (demo S4 in <Home />) ---------------------------------------------

const RESULTS_HEADING = "Eksempelresultater (ikke generert nå)";
const PAGE_TABS = [
  { label: "Sammendrag", name: "Sammendrag", key: "summary" },
  { label: "Nøkkelbegreper", name: "Nøkkelbegreper", key: "key-concepts" },
  { label: "Flashkort (5)", name: "Flashkort", key: "flashcards" },
  { label: "Quiz (5)", name: "Quiz", key: "quiz" },
];

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

function pagePanel(key: string): HTMLElement {
  return document.getElementById(`result-panel-${key}`) as HTMLElement;
}

/** Demo S4 on the page: S1, `Vis eksempel` focused and clicked, the recorded reply applied. */
async function showResults(): Promise<HTMLElement> {
  await renderHome();
  const button = showExample();
  button.focus();
  fireEvent.click(button);
  await replyDemo(RECORDED_TEXT);
  return button;
}

describe("demo S4 on the page: tabs (T1, T2, T5, T6, T10)", () => {
  setupDemoTest();

  test("one tablist named by the demo results heading (T1)", async () => {
    await showResults();
    const lists = within(resultsSection()).getAllByRole("tablist");
    expect(lists).toHaveLength(1);
    expect(lists[0].getAttribute("aria-labelledby")).toBe("results-heading");
    expect(document.getElementById("results-heading")?.textContent).toBe(RESULTS_HEADING);
    expect(screen.getByRole("tablist", { name: RESULTS_HEADING })).toBe(lists[0]);
    // The tablist carries the class the D15 CSS targets, and no aria-orientation (D10).
    expect(lists[0].className).toBe("result-tabs");
    expect(lists[0].hasAttribute("aria-orientation")).toBe(false);
  });

  test("four tab buttons in order with the fixture counts (T2)", async () => {
    await showResults();
    const all = within(resultsSection()).getAllByRole("tab");
    expect(all.map((t) => t.textContent)).toEqual(PAGE_TABS.map((t) => t.label));
    for (const t of all) {
      expect(t.tagName).toBe("BUTTON");
      expect(t.getAttribute("type")).toBe("button");
      // The class the D15 CSS targets.
      expect(t.className).toBe("result-tab");
    }
  });

  test("Sammendrag is selected and the only tab in the Tab order (T5)", async () => {
    await showResults();
    const all = within(resultsSection()).getAllByRole("tab");
    expect(all.map((t) => [t.getAttribute("aria-selected"), t.getAttribute("tabindex")])).toEqual([
      ["true", "0"],
      ["false", "-1"],
      ["false", "-1"],
      ["false", "-1"],
    ]);
  });

  test("tab ids and aria-controls match the panel ids (T6)", async () => {
    await showResults();
    const all = within(resultsSection()).getAllByRole("tab");
    PAGE_TABS.forEach(({ key }, i) => {
      expect(all[i].id).toBe(`result-tab-${key}`);
      expect(all[i].getAttribute("aria-controls")).toBe(`result-panel-${key}`);
      expect(pagePanel(key)).not.toBeNull();
    });
  });

  test("no aria-label; each accessible name equals the visible text (T10)", async () => {
    await showResults();
    for (const { label } of PAGE_TABS) {
      const t = screen.getByRole("tab", { name: label });
      expect(t.hasAttribute("aria-label")).toBe(false);
      expect(t.textContent).toBe(label);
    }
  });
});

describe("demo S4 on the page: panels (P1–P4)", () => {
  setupDemoTest();

  test("four mounted panels, each labelled by its tab and focusable (P1)", async () => {
    await showResults();
    const panels = Array.from(resultsSection().querySelectorAll<HTMLElement>('[role="tabpanel"]'));
    expect(panels.map((p) => p.id)).toEqual(PAGE_TABS.map(({ key }) => `result-panel-${key}`));
    PAGE_TABS.forEach(({ key }, i) => {
      expect(panels[i].getAttribute("aria-labelledby")).toBe(`result-tab-${key}`);
      expect(panels[i].getAttribute("tabindex")).toBe("0");
      // The class the D15 CSS targets.
      expect(panels[i].className).toBe("result-panel");
    });
  });

  test("only the Sammendrag panel is visible; the other three are hidden but mounted (P2)", async () => {
    await showResults();
    expect(PAGE_TABS.map(({ key }) => pagePanel(key).hidden)).toEqual([false, true, true, true]);
  });

  test("each panel starts with a visually hidden h3 with the tab name, no count; Sammendrag also holds the summary, Nøkkelbegreper the key concepts, Flashkort the deck (P3)", async () => {
    await showResults();
    for (const { key, name } of PAGE_TABS) {
      const panel = pagePanel(key);
      const children = Array.from(panel.children).map((child) => `${child.tagName}.${child.className}`);
      expect(children).toEqual(
        key === "summary"
          ? ["H3.sr-only", "P.summary-text", "DIV.page-links"]
          : key === "key-concepts"
            ? ["H3.sr-only", "UL.key-concepts"]
            : key === "flashcards"
              ? ["H3.sr-only", "DIV.flashcard-deck"]
              : ["H3.sr-only"],
      );
      const heading = panel.children[0];
      expect(heading.tagName).toBe("H3");
      expect(heading.classList.contains("sr-only")).toBe(true);
      expect(heading.textContent).toBe(name);
    }
  });

  test("four h3 in the DOM, one exposed by role; no h4 (P4)", async () => {
    await showResults();
    const all = Array.from(document.querySelectorAll("h3"));
    expect(all.map((h) => h.textContent)).toEqual(PAGE_TABS.map(({ name }) => name));
    const exposed = screen.getAllByRole("heading", { level: 3 });
    expect(exposed.map((h) => h.textContent)).toEqual(["Sammendrag"]);
    expect(document.querySelector("h4")).toBeNull();
  });
});

describe("demo S4 on the page: focus order and side effects (K7, K8, K10)", () => {
  setupDemoTest();

  test("Vis eksempel, then the selected tab, then the visible panel and its page links (K7)", async () => {
    const button = await showResults();
    const summaryLinks = Array.from(pagePanel("summary").querySelectorAll<HTMLElement>("a.page-link"));
    expect(summaryLinks).toHaveLength(5);
    expect(focusOrder(main())).toEqual([
      button,
      screen.getByRole("tab", { name: "Sammendrag" }),
      pagePanel("summary"),
      ...summaryLinks,
    ]);
  });

  test("after ArrowRight the new tab and its panel are in the order, and its page links (K8)", async () => {
    const button = await showResults();
    const summary = screen.getByRole("tab", { name: "Sammendrag" });
    summary.focus();
    fireEvent.keyDown(summary, { key: "ArrowRight" });
    const conceptLinks = Array.from(pagePanel("key-concepts").querySelectorAll<HTMLElement>("a.page-link"));
    expect(conceptLinks).toHaveLength(6);
    expect(focusOrder(main())).toEqual([
      button,
      screen.getByRole("tab", { name: "Nøkkelbegreper" }),
      pagePanel("key-concepts"),
      ...conceptLinks,
    ]);
  });

  test("keys and clicks send no request and write nothing to the status region (K10)", async () => {
    await showResults();
    await advance(0); // flushes the "Resultatene er klare" announcement
    const fetchCalls = currentFake().fetchMock.mock.calls.length;
    const watcher = watchRegion();
    try {
      const summary = screen.getByRole("tab", { name: "Sammendrag" });
      summary.focus();
      fireEvent.keyDown(summary, { key: "ArrowRight" });
      fireEvent.keyDown(screen.getByRole("tab", { name: "Nøkkelbegreper" }), { key: "End" });
      fireEvent.keyDown(screen.getByRole("tab", { name: "Quiz (5)" }), { key: "ArrowLeft" });
      fireEvent.keyDown(screen.getByRole("tab", { name: "Flashkort (5)" }), { key: "Home" });
      fireEvent.click(screen.getByRole("tab", { name: "Quiz (5)" }));
      await advance(0);

      expect(currentFake().fetchMock.mock.calls.length).toBe(fetchCalls);
      expect(demoRequests()).toHaveLength(1);
      expect(watcher.texts).toEqual([]);
    } finally {
      watcher.stop();
    }
  });
});
