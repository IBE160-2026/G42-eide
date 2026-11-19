import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import ResultTabs from "../components/ResultTabs";
import type { ValidatedResults } from "../lib/contracts";
import {
  RECORDED_TEXT,
  currentFake,
  main,
  renderHome,
  replyDemo,
  resultsSection,
  setupDemoTest,
  showExample,
} from "./demo-fixtures";

/*
 * Story 1.17, Stage B: the summary and its page links in the results (matrix rows SC1–SC2
 * for `ResultTabs`; X5 and PS1–PS8 on the page, <Home /> with the recorded demo reply).
 */

afterEach(() => {
  cleanup();
});

const RECORDED = JSON.parse(RECORDED_TEXT) as { results: ValidatedResults };
const SUMMARY_PAGES = [1, 2, 3, 5, 6];

function makeResults(): ValidatedResults {
  return {
    summary: { text: "Sammendragstekst.", pages: [1] },
    flashcards: [{ front: "Kort", back: "Svar", pages: [1] }],
    quiz: [{ question: "Spørsmål", answer: "Svar", pages: [1] }],
    key_concepts: [{ term: "Begrep", explanation: "Forklaring", pages: [1] }],
  };
}

function panel(key: string): HTMLElement {
  return document.getElementById(`result-panel-${key}`) as HTMLElement;
}

function shape(element: Element): string[] {
  return Array.from(element.children).map((child) => `${child.tagName}.${child.className}`);
}

/** The joined text of a link's child nodes before its first `<span>`. */
function leadingText(link: Element): string {
  let text = "";
  for (const node of Array.from(link.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "SPAN") break;
    text += node.textContent ?? "";
  }
  return text;
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

function summaryLinks(): HTMLAnchorElement[] {
  return Array.from(panel("summary").querySelectorAll<HTMLAnchorElement>("a.page-link"));
}

// ---- ResultTabs (SC1–SC2) ----------------------------------------------------------------------

describe("ResultTabs with a summary and a source (D2, D3)", () => {
  function renderTabs() {
    return render(
      <section aria-label="Resultater">
        <h2 id="results-heading">Eksempelresultater (ikke generert nå)</h2>
        <ResultTabs results={makeResults()} labelledBy="results-heading" pdfSource="https://example.test/doc.pdf" />
      </section>,
    );
  }

  test("the Sammendrag panel holds its h3, the summary paragraph and the link row as siblings (SC1)", () => {
    renderTabs();
    const summary = panel("summary");
    expect(shape(summary)).toEqual(["H3.sr-only", "P.summary-text", "DIV.page-links"]);
    const row = summary.querySelector("div.page-links") as HTMLElement;
    expect(row.parentElement).toBe(summary);
    expect(summary.querySelector("p.summary-text div")).toBeNull();
    expect(row.querySelector("a")?.getAttribute("href")).toBe("https://example.test/doc.pdf#page=1");
  });

  test("the other three panels still hold only their h3 (SC2)", () => {
    renderTabs();
    for (const key of ["key-concepts", "flashcards", "quiz"]) {
      expect(shape(panel(key)), key).toEqual(["H3.sr-only"]);
    }
  });
});

// ---- the page (X5, PS1–PS8) -------------------------------------------------------------------

/** Demo S4 on the page: S1, `Vis eksempel` focused and clicked, the recorded reply applied. */
async function showResults(): Promise<HTMLElement> {
  await renderHome();
  const button = showExample();
  button.focus();
  fireEvent.click(button);
  await replyDemo(RECORDED_TEXT);
  return button;
}

describe("demo S4 on the page: the summary and its page links", () => {
  setupDemoTest();

  test("the fixture's summary text is in p.summary-text in the Sammendrag panel (X5)", async () => {
    await showResults();
    const paragraph = panel("summary").querySelector("p.summary-text");
    expect(paragraph?.textContent).toBe(RECORDED.results.summary.text);
  });

  test("five page links for pages 1, 2, 3, 5 and 6 (PS1)", async () => {
    await showResults();
    expect(panel("summary").textContent).toContain(RECORDED.results.summary.text);
    expect(summaryLinks().map((link) => leadingText(link))).toEqual(SUMMARY_PAGES.map((page) => `PDF-side ${page}`));
    for (const page of SUMMARY_PAGES) {
      expect(screen.getByRole("link", { name: `PDF-side ${page}, åpnes i ny fane` })).toBeTruthy();
    }
  });

  test("with the base URL empty, the links open the sample PDF on 127.0.0.1:8000 (PS2)", async () => {
    await showResults();
    expect(summaryLinks().map((link) => link.getAttribute("href"))).toEqual(
      SUMMARY_PAGES.map((page) => `http://127.0.0.1:8000/api/demo/sample.pdf#page=${page}`),
    );
    for (const link of summaryLinks()) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener");
    }
  });

  test("no link outside the Sammendrag panel; no other panel content (PS3)", async () => {
    await showResults();
    const links = Array.from(resultsSection().querySelectorAll("a"));
    expect(links).toHaveLength(SUMMARY_PAGES.length);
    expect(links.every((link) => link.closest("#result-panel-summary") !== null)).toBe(true);
    const text = document.body.textContent ?? "";
    for (const concept of RECORDED.results.key_concepts) expect(text).not.toContain(concept.term);
    for (const card of RECORDED.results.flashcards) expect(text).not.toContain(card.front);
    for (const item of RECORDED.results.quiz) expect(text).not.toContain(item.question);
  });

  test("focus order: Vis eksempel, the Sammendrag tab, the panel, then its links in page order (PS4)", async () => {
    const button = await showResults();
    expect(focusOrder(main())).toEqual([
      button,
      screen.getByRole("tab", { name: "Sammendrag" }),
      panel("summary"),
      ...summaryLinks(),
    ]);
    expect(main().querySelectorAll(".page-links__item[tabindex]")).toHaveLength(0);
  });

  test("with another tab selected, the summary links are hidden and out of the focus order (PS5)", async () => {
    await showResults();
    fireEvent.click(screen.getByRole("tab", { name: "Nøkkelbegreper" }));
    expect(panel("summary").hidden).toBe(true);
    const order = focusOrder(main());
    for (const link of summaryLinks()) {
      expect(link.closest("[hidden]")).toBe(panel("summary"));
      expect(order).not.toContain(link);
    }
  });

  test("the app never fetches the PDF; only /api/status and /api/demo are called (PS6)", async () => {
    await showResults();
    const urls = currentFake().fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.includes("sample.pdf"))).toBe(false);
    expect(urls.every((url) => url.endsWith("/api/status") || url.endsWith("/api/demo"))).toBe(true);
  });

  test("real mode: no summary and no page links (PS7)", async () => {
    await renderHome("real");
    expect(document.querySelector("p.summary-text")).toBeNull();
    expect(document.querySelector("div.page-links")).toBeNull();
    expect(document.querySelector("a.page-link")).toBeNull();
  });

  test("with a set base URL, the links use it (PS8)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:9000");
    await showResults();
    expect(summaryLinks().map((link) => link.getAttribute("href"))).toEqual(
      SUMMARY_PAGES.map((page) => `http://localhost:9000/api/demo/sample.pdf#page=${page}`),
    );
  });
});
