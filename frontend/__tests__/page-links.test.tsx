import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import PageLinks from "../components/PageLinks";
import SummaryContent from "../components/SummaryContent";
import { demoPdfSource } from "../lib/pdf-source";

/*
 * Story 1.17, Stage A: the page links, the summary content and the demo PDF source
 * (matrix rows PL1–PL9 for `PageLinks`, X1–X4 and SC3–SC4 for `SummaryContent`, DS1–DS2
 * for `demoPdfSource`). jsdom applies no CSS, so the accessible names here are the names
 * computed from the DOM; they do not prove what a screen reader speaks (manual 1.17-M4).
 *
 * Special characters are built with String.fromCharCode so the test source holds no
 * escape sequences.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const NL = String.fromCharCode(10);
const BACKSLASH = String.fromCharCode(92);
const ARROW = String.fromCharCode(0x2197);
const DOT = String.fromCharCode(0xb7);
const SEPARATOR = ` ${DOT} `;
const SUFFIX = ", åpnes i ny fane";
const FORBIDDEN_SPACES = [0xa0, 0x202f, 0x2007, 0x200b, 0x2060, 0xfeff].map((c) => String.fromCharCode(c));

function row(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>("div.page-links");
  expect(element, "div.page-links is rendered").not.toBeNull();
  return element as HTMLElement;
}

/** The joined text of a link's child nodes before its first `<span>` (React may split it). */
function leadingText(link: Element): string {
  let text = "";
  for (const node of Array.from(link.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "SPAN") break;
    text += node.textContent ?? "";
  }
  return text;
}

function linkText(page: number): string {
  return `PDF-side ${page} ${ARROW}${SUFFIX}`;
}

/**
 * A small source scanner: removes line and block comments outside string and template
 * literals, and collects those literals. A double slash inside a string (as in a URL) is kept.
 * Sufficient for this component, which has no regular-expression literals.
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

// ---- PageLinks (PL1–PL9) ----------------------------------------------------------------------

describe("PageLinks (D2, D6, D10)", () => {
  test("one page: the exact approved link markup and accessible name (PL1)", () => {
    const { container } = render(<PageLinks pages={[4]} pdfSource="https://example.test/doc.pdf" />);
    const links = Array.from(row(container).querySelectorAll("a"));
    expect(links).toHaveLength(1);
    const link = links[0];
    expect(link.parentElement).toBe(row(container));
    expect(link.className).toBe("page-link");
    expect(link.getAttribute("href")).toBe("https://example.test/doc.pdf#page=4");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener");
    expect(link.hasAttribute("aria-label")).toBe(false);

    expect(leadingText(link)).toBe("PDF-side 4");
    // The arrow and the suffix are the link's only element children (direct children).
    const spans = Array.from(link.children);
    expect(spans.map((span) => span.tagName)).toEqual(["SPAN", "SPAN"]);
    expect(spans[0].getAttribute("aria-hidden")).toBe("true");
    expect(spans[0].textContent).toBe(` ${ARROW}`);
    expect(spans[1].className).toBe("sr-only");
    expect(spans[1].hasAttribute("aria-hidden")).toBe(false);
    expect(spans[1].textContent).toBe(SUFFIX);

    expect(screen.getByRole("link", { name: "PDF-side 4, åpnes i ny fane" })).toBe(link);
    expect(link.textContent).toBe(linkText(4));
    expect(container.querySelector(".page-links__separator")).toBeNull();
    expect(container.querySelector(".page-links__item")).toBeNull();
  });

  test("two pages: the second link travels with its separator in one item (PL2)", () => {
    const { container } = render(<PageLinks pages={[4, 5]} pdfSource="https://example.test/doc.pdf" />);
    const children = Array.from(row(container).children);
    expect(children.map((child) => `${child.tagName}.${child.className}`)).toEqual([
      "A.page-link",
      "SPAN.page-links__item",
    ]);
    expect(children[0].textContent).toBe(linkText(4));
    const itemChildren = Array.from(children[1].children);
    expect(itemChildren.map((child) => `${child.tagName}.${child.className}`)).toEqual([
      "SPAN.page-links__separator",
      "A.page-link",
    ]);
    expect(itemChildren[0].getAttribute("aria-hidden")).toBe("true");
    expect(itemChildren[0].textContent).toBe(SEPARATOR);
    expect(itemChildren[1].textContent).toBe(linkText(5));
  });

  test("five pages: first link, then four [separator, link] items in order (PL3)", () => {
    const pages = [1, 2, 3, 5, 6];
    const { container } = render(<PageLinks pages={pages} pdfSource="https://example.test/doc.pdf" />);
    const element = row(container);
    const children = Array.from(element.children);
    expect(children).toHaveLength(5);
    expect(children[0].tagName).toBe("A");
    expect(children[0].getAttribute("href")).toBe("https://example.test/doc.pdf#page=1");
    children.slice(1).forEach((item, index) => {
      expect(item.className).toBe("page-links__item");
      const [separator, link] = Array.from(item.children);
      expect(separator.className).toBe("page-links__separator");
      expect(separator.getAttribute("aria-hidden")).toBe("true");
      expect(separator.textContent).toBe(SEPARATOR);
      expect(link.getAttribute("href")).toBe(`https://example.test/doc.pdf#page=${pages[index + 1]}`);
      expect(item.children).toHaveLength(2);
    });
    expect(element.querySelectorAll(".page-links__separator")).toHaveLength(4);
    expect(element.textContent).toBe(pages.map(linkText).join(SEPARATOR));
  });

  test("multi-digit page numbers are unchanged in text and href (PL4)", () => {
    const { container } = render(<PageLinks pages={[12, 80]} pdfSource="https://example.test/doc.pdf" />);
    const links = Array.from(row(container).querySelectorAll("a"));
    expect(links.map((link) => leadingText(link))).toEqual(["PDF-side 12", "PDF-side 80"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://example.test/doc.pdf#page=12",
      "https://example.test/doc.pdf#page=80",
    ]);
  });

  test.each(["blob:abc", "https://example.test/x.pdf"])(
    "the href is the supplied source plus #page=N (%s) (PL5)",
    (source) => {
      const { container } = render(<PageLinks pages={[2, 7]} pdfSource={source} />);
      const hrefs = Array.from(row(container).querySelectorAll("a")).map((link) => link.getAttribute("href"));
      expect(hrefs).toEqual([`${source}#page=2`, `${source}#page=7`]);
    },
  );

  test("no pages: renders nothing (PL6)", () => {
    const { container } = render(<PageLinks pages={[]} pdfSource="https://example.test/doc.pdf" />);
    expect(container.firstChild).toBeNull();
  });

  test("no source: renders nothing (PL7)", () => {
    const { container } = render(<PageLinks pages={[4]} pdfSource={null} />);
    expect(container.firstChild).toBeNull();
  });

  test.each([[[4]], [[4, 5]], [[1, 2, 3, 5, 6]], [[12, 80]]])(
    "%j: no non-breaking or zero-width space; one normal space before the arrow (PL8)",
    (pages) => {
      const { container } = render(<PageLinks pages={pages} pdfSource="https://example.test/doc.pdf" />);
      const text = row(container).textContent ?? "";
      for (const character of FORBIDDEN_SPACES) expect(text.includes(character)).toBe(false);
      for (const arrow of Array.from(container.querySelectorAll('a > span[aria-hidden="true"]'))) {
        expect(arrow.textContent).toBe(` ${ARROW}`);
        expect((arrow.textContent ?? "").charCodeAt(0)).toBe(32);
      }
    },
  );

  test("the component source holds no URL and no /api/demo outside comments (PL9)", () => {
    // The scanner keeps a URL inside a string intact and removes real comments.
    const sample = ['const a = "http://x/api/demo"; // http comment', "/* /api/demo */ const b = 1;"].join(NL);
    const scanned = scanSource(sample);
    expect(scanned.literals).toEqual(["http://x/api/demo"]);
    expect(scanned.code.includes("http comment")).toBe(false);
    expect(scanned.code.includes("/* /api/demo */")).toBe(false);

    const source = readFileSync(resolve(__dirname, "../components/PageLinks.tsx"), "utf8");
    const { code, literals } = scanSource(source);
    // The scan really saw the component's literals: the href template holds "#page=".
    expect(literals.some((literal) => literal.includes("#page="))).toBe(true);
    for (const literal of literals) {
      expect(literal.includes("/api/demo"), literal).toBe(false);
      expect(literal.includes("http"), literal).toBe(false);
    }
    expect(code.includes("/api/demo")).toBe(false);
    expect(code.includes("http")).toBe(false);
  });
});

// ---- SummaryContent (X1–X4, SC3–SC4) -------------------------------------------------------------

function renderSummary(text: string, pages: number[] = [1], pdfSource: string | null = null) {
  return render(<SummaryContent summary={{ text, pages }} pdfSource={pdfSource} />);
}

function summaryParagraph(container: HTMLElement): HTMLParagraphElement {
  const paragraph = container.querySelector<HTMLParagraphElement>("p.summary-text");
  expect(paragraph, "p.summary-text is rendered").not.toBeNull();
  return paragraph as HTMLParagraphElement;
}

function onlyTextNodes(element: Element): boolean {
  return Array.from(element.childNodes).every((node) => node.nodeType === Node.TEXT_NODE);
}

describe("SummaryContent: plain text (D1; AR-19, AD-18)", () => {
  test("a <script> string is rendered as text, never as an element (X1)", () => {
    const input = "<script>alert(1)</script>";
    const { container } = renderSummary(input);
    const paragraph = summaryParagraph(container);
    expect(paragraph.textContent).toBe(input);
    expect(container.querySelector("script")).toBeNull();
    expect(onlyTextNodes(paragraph)).toBe(true);
  });

  test("HTML-like text is rendered literally (X2)", () => {
    const input = "<b>fet</b> & <i>kursiv</i>";
    const { container } = renderSummary(input);
    expect(summaryParagraph(container).textContent).toBe(input);
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("i")).toBeNull();
  });

  test("Markdown is not interpreted (X3)", () => {
    const input = "**fet** og _kursiv_ og # Overskrift";
    const { container } = renderSummary(input);
    const paragraph = summaryParagraph(container);
    expect(paragraph.textContent).toBe(input);
    expect(onlyTextNodes(paragraph)).toBe(true);
    for (const tag of ["strong", "em", "h1"]) expect(container.querySelector(tag)).toBeNull();
  });

  test("a line break is kept unchanged in the text (X4)", () => {
    const input = `Første avsnitt.${NL}Andre avsnitt.`;
    const { container } = renderSummary(input);
    const paragraph = summaryParagraph(container);
    expect(paragraph.textContent).toBe(input);
    expect(paragraph.textContent?.includes(NL)).toBe(true);
    expect(onlyTextNodes(paragraph)).toBe(true);
  });
});

describe("SummaryContent: no links without pages or source (D2, D3)", () => {
  test("no pages: the paragraph only, no link row (SC3)", () => {
    const { container } = renderSummary("Tekst.", [], "https://example.test/doc.pdf");
    expect(Array.from(container.children).map((child) => `${child.tagName}.${child.className}`)).toEqual([
      "P.summary-text",
    ]);
    expect(container.querySelector("div.page-links")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });

  test("no source: the paragraph only, no link (SC4)", () => {
    const { container } = renderSummary("Tekst.", [1, 2], null);
    expect(Array.from(container.children).map((child) => `${child.tagName}.${child.className}`)).toEqual([
      "P.summary-text",
    ]);
    expect(container.querySelector("a")).toBeNull();
  });
});

// ---- demoPdfSource (DS1–DS2) -------------------------------------------------------------------

describe("demoPdfSource (D4)", () => {
  test("empty base URL falls back to 127.0.0.1:8000 (DS1)", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    expect(demoPdfSource()).toBe("http://127.0.0.1:8000/api/demo/sample.pdf");
  });

  test("a set base URL is used without its trailing slash (DS2)", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:9000/");
    expect(demoPdfSource()).toBe("http://localhost:9000/api/demo/sample.pdf");
  });
});
