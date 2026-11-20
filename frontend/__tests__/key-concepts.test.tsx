import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import KeyConceptsContent from "../components/KeyConceptsContent";
import ResultTabs from "../components/ResultTabs";
import type { ValidatedKeyConcept, ValidatedResults } from "../lib/contracts";
import {
  RECORDED_TEXT,
  currentFake,
  demoRequests,
  main,
  renderHome,
  replyDemo,
  setupDemoTest,
  showExample,
} from "./demo-fixtures";

/*
 * Story 1.18: the Nøkkelbegreper panel content — Stage A, matrix rows KC1–KC13 for
 * `KeyConceptsContent`; Stage B, rows RT1–RT3 for `ResultTabs` and KP1–KP9 on the page
 * (<Home /> with the recorded demo reply). jsdom applies no CSS, so these tests prove the DOM
 * structure and the names computed from it; they prove nothing about layout, line wrapping
 * or what a screen reader speaks (manual checks 1.18-M1 to 1.18-M4).
 *
 * Special characters are built with String.fromCharCode so the test source holds no
 * escape sequences.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const NL = String.fromCharCode(10);
const BACKSLASH = String.fromCharCode(92);
const SOURCE = "https://example.test/doc.pdf";

/** Five concepts with the page lists of the demo fixture: [1], [2], [3, 6], [5], [2]. */
function makeConcepts(): ValidatedKeyConcept[] {
  return [
    { term: "Begrep en", explanation: "Forklaring en.", pages: [1] },
    { term: "Begrep to", explanation: "Forklaring to.", pages: [2] },
    { term: "Begrep tre", explanation: "Forklaring tre.", pages: [3, 6] },
    { term: "Begrep fire", explanation: "Forklaring fire.", pages: [5] },
    { term: "Begrep fem", explanation: "Forklaring fem.", pages: [2] },
  ];
}

function list(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>("ul.key-concepts");
  expect(element, "ul.key-concepts is rendered").not.toBeNull();
  return element as HTMLElement;
}

function items(container: HTMLElement): HTMLElement[] {
  return Array.from(list(container).children) as HTMLElement[];
}

function shape(element: Element): string[] {
  return Array.from(element.children).map((child) => `${child.tagName}.${child.className}`);
}

function term(item: Element): HTMLElement {
  return item.querySelector("p.key-concept__term") as HTMLElement;
}

function explanation(item: Element): HTMLElement {
  return item.querySelector("p.key-concept__explanation") as HTMLElement;
}

/** True when the element holds text nodes only (no element children). */
function textOnly(element: Element): boolean {
  return Array.from(element.childNodes).every((node) => node.nodeType === Node.TEXT_NODE);
}

/** Renders one concept with the given term and explanation and returns its item. */
function renderOne(termText: string, explanationText: string): HTMLElement {
  const { container } = render(
    <KeyConceptsContent concepts={[{ term: termText, explanation: explanationText, pages: [1] }]} pdfSource={SOURCE} />,
  );
  return items(container)[0];
}

/**
 * A small source scanner (a copy of the one in `page-links.test.tsx`, Story 1.17 PL9; not
 * shared): removes line and block comments outside string and template literals, and
 * collects those literals. Sufficient for this component, which has no regular-expression
 * literals.
 */
function scanSource(source: string): { code: string; literals: string[] } {
  let code = "";
  const literals: string[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (c === "/" && next === "/") {
      while (i < source.length && source[i] !== NL) i += 1;
      continue;
    }
    if (c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      let literal = "";
      while (j < source.length && source[j] !== c) {
        if (source[j] === BACKSLASH) {
          literal += source[j] + (source[j + 1] ?? "");
          j += 2;
          continue;
        }
        literal += source[j];
        j += 1;
      }
      literals.push(literal);
      code += source.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    code += c;
    i += 1;
  }
  return { code, literals };
}

const WHITESPACE = [" ", NL, String.fromCharCode(13), String.fromCharCode(9)];

/** The opening tags `<name …>` in JSX source code (not `</name>` or longer names like `<link`). */
function openingTags(code: string, name: string): string[] {
  const tags: string[] = [];
  const open = `<${name}`;
  let i = code.indexOf(open);
  while (i !== -1) {
    const next = code[i + open.length];
    if (next === ">" || WHITESPACE.includes(next)) {
      const end = code.indexOf(">", i);
      tags.push(code.slice(i, end + 1));
    }
    i = code.indexOf(open, i + open.length);
  }
  return tags;
}

/** A tag with every whitespace character removed, so formatting does not matter. */
function compact(tag: string): string {
  return Array.from(tag)
    .filter((character) => !WHITESPACE.includes(character))
    .join("");
}

describe("KeyConceptsContent (D1, D3, D5, D6)", () => {
  test("five concepts: one list, five items in order, term, explanation, link row (KC1)", () => {
    const { container } = render(<KeyConceptsContent concepts={makeConcepts()} pdfSource={SOURCE} />);
    expect(shape(container)).toEqual(["UL.key-concepts"]);
    const all = items(container);
    expect(all).toHaveLength(5);
    for (const item of all) {
      expect(item.tagName).toBe("LI");
      expect(item.className).toBe("key-concept");
      expect(shape(item)).toEqual(["P.key-concept__term", "P.key-concept__explanation", "DIV.page-links"]);
    }
    expect(all.map((item) => term(item).textContent)).toEqual(makeConcepts().map((concept) => concept.term));
  });

  test("term and explanation are the input texts, as text nodes only (KC2)", () => {
    const { container } = render(<KeyConceptsContent concepts={makeConcepts()} pdfSource={SOURCE} />);
    items(container).forEach((item, index) => {
      const concept = makeConcepts()[index];
      expect(term(item).textContent).toBe(concept.term);
      expect(explanation(item).textContent).toBe(concept.explanation);
      expect(textOnly(term(item))).toBe(true);
      expect(textOnly(explanation(item))).toBe(true);
    });
  });

  test("a script string is rendered literally (KC3)", () => {
    const text = "<script>alert(1)</script>";
    const item = renderOne(text, text);
    expect(term(item).textContent).toBe(text);
    expect(explanation(item).textContent).toBe(text);
    expect(document.querySelector("script")).toBeNull();
    expect(textOnly(term(item)) && textOnly(explanation(item))).toBe(true);
  });

  test("HTML-like text is rendered literally (KC4)", () => {
    const item = renderOne("<b>x</b>", "<img src=x> og <b>fet</b>");
    expect(term(item).textContent).toBe("<b>x</b>");
    expect(explanation(item).textContent).toBe("<img src=x> og <b>fet</b>");
    expect(item.querySelector("b")).toBeNull();
    expect(item.querySelector("img")).toBeNull();
    expect(textOnly(term(item)) && textOnly(explanation(item))).toBe(true);
  });

  test("Markdown text is rendered literally (KC5)", () => {
    const termText = "**fet**";
    const explanationText = ["# Overskrift", "- punkt"].join(NL);
    const item = renderOne(termText, explanationText);
    expect(term(item).textContent).toBe(termText);
    expect(explanation(item).textContent).toBe(explanationText);
    for (const paragraph of [term(item), explanation(item)]) {
      expect(paragraph.querySelector("strong")).toBeNull();
      expect(paragraph.querySelector("h1")).toBeNull();
      expect(paragraph.querySelector("li")).toBeNull();
      expect(textOnly(paragraph)).toBe(true);
    }
  });

  test("a line break in the term and in the explanation is kept unchanged (KC6)", () => {
    const termText = ["Første linje", "andre linje"].join(NL);
    const explanationText = ["Linje en", "linje to", "linje tre"].join(NL);
    const item = renderOne(termText, explanationText);
    expect(term(item).textContent).toBe(termText);
    expect(explanation(item).textContent).toBe(explanationText);
    expect(textOnly(term(item)) && textOnly(explanation(item))).toBe(true);
  });

  test("a concept with pages [3, 6]: one row, two links on the source, one separator (KC7)", () => {
    const { container } = render(<KeyConceptsContent concepts={makeConcepts()} pdfSource={SOURCE} />);
    const item = items(container)[2];
    const rows = item.querySelectorAll("div.page-links");
    expect(rows).toHaveLength(1);
    const links = Array.from(rows[0].querySelectorAll("a"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([`${SOURCE}#page=3`, `${SOURCE}#page=6`]);
    expect(rows[0].querySelectorAll(".page-links__separator")).toHaveLength(1);
    expect(within(item).getByRole("link", { name: "PDF-side 3, åpnes i ny fane" })).toBe(links[0]);
    expect(within(item).getByRole("link", { name: "PDF-side 6, åpnes i ny fane" })).toBe(links[1]);
  });

  test("a concept with no pages has no link row; the others are unaffected (KC8)", () => {
    const concepts = makeConcepts();
    concepts[1] = { ...concepts[1], pages: [] };
    const { container } = render(<KeyConceptsContent concepts={concepts} pdfSource={SOURCE} />);
    const all = items(container);
    expect(shape(all[1])).toEqual(["P.key-concept__term", "P.key-concept__explanation"]);
    expect(all[1].querySelector("a")).toBeNull();
    for (const index of [0, 2, 3, 4]) {
      expect(shape(all[index])).toEqual(["P.key-concept__term", "P.key-concept__explanation", "DIV.page-links"]);
    }
  });

  test("no PDF source: no link row and no link; the texts are still shown (KC9)", () => {
    const { container } = render(<KeyConceptsContent concepts={makeConcepts()} pdfSource={null} />);
    const all = items(container);
    expect(all).toHaveLength(5);
    for (const item of all) {
      expect(shape(item)).toEqual(["P.key-concept__term", "P.key-concept__explanation"]);
    }
    expect(list(container).querySelector("div.page-links")).toBeNull();
    expect(list(container).querySelector("a")).toBeNull();
    expect(all.map((item) => term(item).textContent)).toEqual(makeConcepts().map((concept) => concept.term));
    expect(all.map((item) => explanation(item).textContent)).toEqual(
      makeConcepts().map((concept) => concept.explanation),
    );
  });

  test("an empty list renders nothing (KC10)", () => {
    const { container } = render(<KeyConceptsContent concepts={[]} pdfSource={SOURCE} />);
    expect(container.firstChild).toBeNull();
  });

  test("two concepts with the same term both render, with no React key warning (KC11)", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const concepts: ValidatedKeyConcept[] = [
      { term: "Samme", explanation: "Første forklaring.", pages: [1] },
      { term: "Samme", explanation: "Andre forklaring.", pages: [2] },
    ];
    const { container } = render(<KeyConceptsContent concepts={concepts} pdfSource={SOURCE} />);
    const all = items(container);
    expect(all).toHaveLength(2);
    expect(all.map((item) => explanation(item).textContent)).toEqual(["Første forklaring.", "Andre forklaring."]);
    expect(error).not.toHaveBeenCalled();
    // React logs a missing-key warning only once per test file, so an earlier render could
    // swallow it. The source must therefore also give the list item its index key (D1): the
    // one opening <li> tag carries both key={index} and className="key-concept", in any
    // attribute order and with any whitespace.
    const { code } = scanSource(readFileSync(resolve(__dirname, "../components/KeyConceptsContent.tsx"), "utf8"));
    const tags = openingTags(code, "li").map(compact);
    expect(tags).toHaveLength(1);
    expect(tags[0].includes("key={index}"), tags[0]).toBe(true);
    expect(tags[0].includes('className="key-concept"'), tags[0]).toBe(true);
  });

  test("the component source holds no URL and no HTML injection (KC12)", () => {
    // The scanner keeps a URL inside a string intact and removes real comments.
    const sample = ['const a = "http://x/api/demo"; // http comment', "/* /api/demo */ const b = 1;"].join(NL);
    const scanned = scanSource(sample);
    expect(scanned.literals).toEqual(["http://x/api/demo"]);
    expect(scanned.code.includes("http comment")).toBe(false);
    expect(scanned.code.includes("/* /api/demo */")).toBe(false);

    const source = readFileSync(resolve(__dirname, "../components/KeyConceptsContent.tsx"), "utf8");
    const { code, literals } = scanSource(source);
    // Positive control: the scan really saw the component's literals.
    expect(literals).toContain("key-concept__term");
    for (const literal of literals) {
      expect(literal.includes("http"), literal).toBe(false);
      expect(literal.includes("/api/demo"), literal).toBe(false);
      expect(literal.includes("innerHTML"), literal).toBe(false);
    }
    expect(code.includes("http")).toBe(false);
    expect(code.includes("/api/demo")).toBe(false);
    expect(code.includes("dangerouslySetInnerHTML")).toBe(false);
    expect(code.includes("innerHTML")).toBe(false);
  });

  test("no heading, no lang anywhere in the list, no aria-label or role on the list or items (KC13)", () => {
    const { container } = render(<KeyConceptsContent concepts={makeConcepts()} pdfSource={SOURCE} />);
    const ul = list(container);
    expect(ul.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
    expect(ul.hasAttribute("lang")).toBe(false);
    expect(ul.querySelectorAll("[lang]")).toHaveLength(0);
    for (const element of [ul, ...items(container)]) {
      expect(element.hasAttribute("aria-label"), element.tagName).toBe(false);
      expect(element.hasAttribute("role"), element.tagName).toBe(false);
    }
    // Nowhere in the list: no role or aria-label (D1), and nothing exposed as a heading.
    expect(ul.querySelectorAll("[role], [aria-label]")).toHaveLength(0);
    expect(within(ul).queryAllByRole("heading")).toHaveLength(0);
    // The only ARIA attribute allowed is PageLinks' own aria-hidden on its arrow and separator.
    const hidden = Array.from(ul.querySelectorAll("[aria-hidden]"));
    expect(hidden.length).toBeGreaterThan(0);
    for (const element of hidden) {
      expect(element.closest("div.page-links"), element.outerHTML).not.toBeNull();
    }
  });

  test("leading and trailing spaces in term and explanation are kept unchanged (D3)", () => {
    // Text only: jsdom does not prove how the browser collapses or shows the spaces.
    const termText = "  Begrep med mellomrom  ";
    const explanationText = "   Forklaring med mellomrom.   ";
    const item = renderOne(termText, explanationText);
    expect(term(item).textContent).toBe(termText);
    expect(explanation(item).textContent).toBe(explanationText);
    expect(textOnly(term(item)) && textOnly(explanation(item))).toBe(true);
  });
});

// ---- ResultTabs (RT1–RT3) ----------------------------------------------------------------------

function panel(key: string): HTMLElement {
  return document.getElementById(`result-panel-${key}`) as HTMLElement;
}

function makeResults(): ValidatedResults {
  return {
    summary: { text: "Sammendragstekst.", pages: [1, 2] },
    flashcards: [{ front: "Kort", back: "Svar", pages: [1] }],
    quiz: [{ question: "Spørsmål", answer: "Svar", pages: [1] }],
    key_concepts: makeConcepts(),
  };
}

describe("ResultTabs with key concepts (D4)", () => {
  function renderTabs(pdfSource: string | null = SOURCE) {
    return render(
      <section aria-label="Resultater">
        <h2 id="results-heading">Eksempelresultater (ikke generert nå)</h2>
        <ResultTabs results={makeResults()} labelledBy="results-heading" pdfSource={pdfSource} />
      </section>,
    );
  }

  test("the Nøkkelbegreper panel holds its h3 and the key-concept list (RT1)", () => {
    renderTabs();
    expect(shape(panel("key-concepts"))).toEqual(["H3.sr-only", "UL.key-concepts"]);
    expect(panel("key-concepts").children[0].textContent).toBe("Nøkkelbegreper");
  });

  test("Sammendrag keeps its summary and links; Flashkort and Quiz hold only their h3 (RT2)", () => {
    renderTabs();
    expect(shape(panel("summary"))).toEqual(["H3.sr-only", "P.summary-text", "DIV.page-links"]);
    expect(shape(panel("flashcards"))).toEqual(["H3.sr-only"]);
    expect(shape(panel("quiz"))).toEqual(["H3.sr-only"]);
  });

  test("the concept links use the same source as the summary links (RT3)", () => {
    renderTabs();
    const prefix = `${SOURCE}#page=`;
    const summaryHrefs = Array.from(panel("summary").querySelectorAll("a")).map((link) => link.getAttribute("href"));
    const conceptHrefs = Array.from(panel("key-concepts").querySelectorAll("a")).map((link) => link.getAttribute("href"));
    expect(summaryHrefs).toEqual([`${prefix}1`, `${prefix}2`]);
    expect(conceptHrefs).toEqual([1, 2, 3, 6, 5, 2].map((page) => `${prefix}${page}`));
  });
});

// ---- the page (KP1–KP9) ------------------------------------------------------------------------

const RECORDED = JSON.parse(RECORDED_TEXT) as { results: ValidatedResults };
const FIXTURE_PAGES = RECORDED.results.key_concepts.map((concept) => concept.pages);

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

function conceptItems(): HTMLElement[] {
  return Array.from(panel("key-concepts").querySelectorAll<HTMLElement>("li.key-concept"));
}

function conceptLinks(): HTMLAnchorElement[] {
  return Array.from(panel("key-concepts").querySelectorAll<HTMLAnchorElement>("a.page-link"));
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

function selectKeyConcepts(): HTMLElement {
  const tab = screen.getByRole("tab", { name: "Nøkkelbegreper" });
  fireEvent.click(tab);
  return tab;
}

describe("demo S4 on the page: the key concepts and their page links", () => {
  setupDemoTest();

  test("the fixture's key concepts, in order, in the visible Nøkkelbegreper panel (KP1)", async () => {
    await showResults();
    selectKeyConcepts();
    expect(panel("key-concepts").hidden).toBe(false);
    const all = conceptItems();
    expect(all).toHaveLength(5);
    expect(all.map((item) => term(item).textContent)).toEqual(RECORDED.results.key_concepts.map((c) => c.term));
    expect(all.map((item) => explanation(item).textContent)).toEqual(
      RECORDED.results.key_concepts.map((c) => c.explanation),
    );
    expect(FIXTURE_PAGES).toEqual([[1], [2], [3, 6], [5], [2]]);
  });

  test("with the base URL empty, each concept links to its pages of the sample PDF (KP2)", async () => {
    await showResults();
    const hrefs = conceptItems().map((item) =>
      Array.from(item.querySelectorAll("a")).map((link) => link.getAttribute("href")),
    );
    expect(hrefs).toEqual(
      FIXTURE_PAGES.map((pages) => pages.map((page) => `http://127.0.0.1:8000/api/demo/sample.pdf#page=${page}`)),
    );
    for (const link of conceptLinks()) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener");
    }
  });

  test("five list items; each item's links carry its own page names; page 2 occurs twice (KP3)", async () => {
    await showResults();
    selectKeyConcepts();
    const listItems = within(panel("key-concepts")).getAllByRole("listitem");
    expect(listItems).toHaveLength(5);
    listItems.forEach((item, index) => {
      // The item's links in DOM order are exactly its pages' named links, in page order.
      const links = within(item).getAllByRole("link");
      expect(links).toHaveLength(FIXTURE_PAGES[index].length);
      expect(links).toEqual(
        FIXTURE_PAGES[index].map((page) => within(item).getByRole("link", { name: `PDF-side ${page}, åpnes i ny fane` })),
      );
    });
    const inPanel = within(panel("key-concepts"));
    expect(inPanel.getAllByRole("link", { name: "PDF-side 2, åpnes i ny fane" })).toHaveLength(2);
    for (const page of [1, 3, 5, 6]) {
      expect(inPanel.getAllByRole("link", { name: `PDF-side ${page}, åpnes i ny fane` })).toHaveLength(1);
    }
  });

  test("focus order: Vis eksempel, the Nøkkelbegreper tab, the panel, then its six links (KP4)", async () => {
    const button = await showResults();
    const tab = selectKeyConcepts();
    const links = conceptLinks();
    expect(links).toHaveLength(6);
    expect(focusOrder(main())).toEqual([button, tab, panel("key-concepts"), ...links]);
  });

  test("with Sammendrag selected, the concept links are hidden and out of the focus order (KP5)", async () => {
    await showResults();
    expect(panel("key-concepts").hidden).toBe(true);
    const order = focusOrder(main());
    expect(conceptLinks()).toHaveLength(6);
    for (const link of conceptLinks()) {
      expect(link.closest("[hidden]")).toBe(panel("key-concepts"));
      expect(order).not.toContain(link);
    }
  });

  test("the app never fetches the PDF; only /api/status and /api/demo are called (KP6)", async () => {
    await showResults();
    selectKeyConcepts();
    const urls = currentFake().fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.includes("sample.pdf"))).toBe(false);
    expect(urls.every((url) => url.endsWith("/api/status") || url.endsWith("/api/demo"))).toBe(true);
  });

  test("real mode: no key-concept list (KP7)", async () => {
    await renderHome("real");
    expect(document.querySelector("ul.key-concepts")).toBeNull();
    expect(document.querySelector(".key-concept")).toBeNull();
  });

  test("with a set base URL, the concept links use it (KP8)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:9000");
    await showResults();
    expect(conceptLinks().map((link) => link.getAttribute("href"))).toEqual(
      FIXTURE_PAGES.flat().map((page) => `http://localhost:9000/api/demo/sample.pdf#page=${page}`),
    );
  });

  test("switching to Flashkort and back keeps the same list and sends no request (KP9)", async () => {
    await showResults();
    const tab = selectKeyConcepts();
    const list = panel("key-concepts").querySelector("ul.key-concepts");
    expect(list).not.toBeNull();
    const requests = demoRequests().length;
    const fetches = currentFake().fetchMock.mock.calls.length;
    tab.focus();
    fireEvent.keyDown(tab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Flashkort (5)" }).getAttribute("aria-selected")).toBe("true");
    expect(panel("key-concepts").hidden).toBe(true);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Flashkort (5)" }), { key: "ArrowLeft" });
    expect(tab.getAttribute("aria-selected")).toBe("true");
    expect(panel("key-concepts").querySelector("ul.key-concepts")).toBe(list);
    expect(conceptItems().map((item) => term(item).textContent)).toEqual(
      RECORDED.results.key_concepts.map((c) => c.term),
    );
    expect(demoRequests()).toHaveLength(requests);
    expect(currentFake().fetchMock.mock.calls.length).toBe(fetches);
  });
});
