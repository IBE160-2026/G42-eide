import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import FlashcardDeck from "../components/FlashcardDeck";
import ResultTabs from "../components/ResultTabs";
import type { ValidatedFlashcard, ValidatedResults } from "../lib/contracts";
import {
  RECORDED_TEXT,
  advance,
  currentFake,
  demoRequests,
  main,
  renderHome,
  replyDemo,
  setupDemoTest,
  showExample,
  watchRegion,
} from "./demo-fixtures";

/*
 * Story 1.19: the Flashkort deck — Stage A, matrix rows FC1–FC15 for `FlashcardDeck`; Stage B,
 * rows RT1–RT4 for `ResultTabs` and FP1–FP9 on the page (<Home /> with the recorded demo reply).
 * jsdom applies no CSS and does not turn Enter or Space into a click, so these rows drive
 * activation with `click` and prove the DOM structure and the names computed from it only;
 * layout, real keyboard activation and speech are the manual checks 1.19-M2 to 1.19-M4.
 *
 * Special characters are built with String.fromCharCode so the test source holds no
 * escape sequences.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const TAB = String.fromCharCode(9);
const BACKSLASH = String.fromCharCode(92);
const SOURCE = "https://example.test/doc.pdf";

/** Five cards with the page lists of the demo fixture: [2], [3], [3], [6], [5]. */
function makeCards(): ValidatedFlashcard[] {
  return [
    { front: "Kort en", back: "Svar en.", pages: [2] },
    { front: "Kort to", back: "Svar to.", pages: [3] },
    { front: "Kort tre", back: "Svar tre.", pages: [3] },
    { front: "Kort fire", back: "Svar fire.", pages: [6] },
    { front: "Kort fem", back: "Svar fem.", pages: [5] },
  ];
}

function shape(element: Element): string[] {
  return Array.from(element.children).map((child) => `${child.tagName}.${child.className}`);
}

function deck(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>("div.flashcard-deck");
  expect(element, "div.flashcard-deck is rendered").not.toBeNull();
  return element as HTMLElement;
}

function counter(root: HTMLElement): HTMLElement {
  return root.querySelector("p.flashcard__counter") as HTMLElement;
}

function term(root: HTMLElement): HTMLElement {
  return root.querySelector("p.flashcard__term") as HTMLElement;
}

function toggle(root: HTMLElement): HTMLButtonElement {
  return root.querySelector("button.flashcard__toggle") as HTMLButtonElement;
}

/** The answer element the toggle's `aria-controls` points to, looked up by its exact id. */
function answer(root: HTMLElement): HTMLElement {
  const id = toggle(root).getAttribute("aria-controls");
  expect(id, "the toggle has aria-controls").toBeTruthy();
  return document.getElementById(id as string) as HTMLElement;
}

function navButton(root: HTMLElement, name: "Forrige" | "Neste"): HTMLButtonElement {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("div.flashcard-nav > button"));
  const found = buttons.find((button) => button.textContent === name);
  expect(found, `${name} button`).toBeTruthy();
  return found as HTMLButtonElement;
}

/** True when the element holds text nodes only (no element children). */
function textOnly(element: Element): boolean {
  return Array.from(element.childNodes).every((node) => node.nodeType === Node.TEXT_NODE);
}

function renderDeck(cards: ValidatedFlashcard[] = makeCards(), pdfSource: string | null = SOURCE): HTMLElement {
  const { container } = render(<FlashcardDeck cards={cards} pdfSource={pdfSource} />);
  return deck(container);
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

/**
 * The positions of a bare `disabled` token: not part of `aria-disabled` or another word
 * (the character before is not `-` or a word character) and followed by `=`, `{`,
 * whitespace, `/` or `>` (FC15; a narrow check, not a JSX parser).
 */
function bareDisabled(code: string): number[] {
  const word = "disabled";
  const after = ["=", "{", " ", NL, CR, TAB, "/", ">"];
  const isWordChar = (ch: string) =>
    (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$";
  const found: number[] = [];
  let i = code.indexOf(word);
  while (i !== -1) {
    const before = i === 0 ? "" : code[i - 1];
    const following = code[i + word.length] ?? "";
    if (before !== "-" && !isWordChar(before) && after.includes(following)) found.push(i);
    i = code.indexOf(word, i + word.length);
  }
  return found;
}

describe("FlashcardDeck (D1, D2, D5–D8)", () => {
  test("one deck: the counter above the card, one card, the nav; exact children and order (FC1)", () => {
    const root = renderDeck();
    expect(shape(root)).toEqual(["P.flashcard__counter", "DIV.flashcard", "DIV.flashcard-nav"]);
    expect(root.querySelectorAll(".flashcard")).toHaveLength(1);
    const card = root.querySelector(".flashcard") as HTMLElement;
    expect(shape(card)).toEqual([
      "P.flashcard__term",
      "BUTTON.button-secondary flashcard__toggle",
      "DIV.flashcard__answer",
    ]);
    const nav = root.querySelector(".flashcard-nav") as HTMLElement;
    expect(Array.from(nav.children).map((child) => `${child.tagName}:${child.textContent}`)).toEqual([
      "BUTTON:Forrige",
      "BUTTON:Neste",
    ]);
    const order = [counter(root), term(root), toggle(root), answer(root), nav];
    for (let k = 1; k < order.length; k += 1) {
      expect(order[k - 1].compareDocumentPosition(order[k]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  test("the counter: Kort 1 av 5, polite and atomic, no role, the only live region (FC2)", () => {
    const root = renderDeck();
    const region = counter(root);
    expect(region.textContent).toBe("Kort 1 av 5");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-atomic")).toBe("true");
    expect(region.hasAttribute("role")).toBe(false);
    expect(region.contains(term(root))).toBe(false);
    expect(root.querySelectorAll("[aria-live]")).toHaveLength(1);
    expect(region.childNodes).toHaveLength(1);
  });

  test("term and answer are the input texts, rendered literally as text nodes (FC3)", () => {
    const front = ["<script>alert(1)</script>", "**fet** <b>x</b>"].join(NL);
    const back = ["# Overskrift", "<strong>sterk</strong> og <h1>tittel</h1>"].join(NL);
    const root = renderDeck([{ front, back, pages: [1] }]);
    expect(term(root).textContent).toBe(front);
    const text = answer(root).querySelector("p.flashcard__answer-text") as HTMLElement;
    expect(text.textContent).toBe(back);
    expect(textOnly(term(root)) && textOnly(text)).toBe(true);
    for (const tag of ["script", "b", "strong", "h1"]) {
      expect(root.querySelector(tag), tag).toBeNull();
    }
  });

  test("the toggle starts collapsed and controls the hidden answer (FC4)", () => {
    const root = renderDeck();
    const button = toggle(root);
    expect(button.textContent).toBe("Vis svar");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    const region = answer(root);
    expect(region).not.toBeNull();
    expect(region.className).toBe("flashcard__answer");
    expect(region.hidden).toBe(true);
    expect(button.hasAttribute("aria-label")).toBe(false);
    expect(button.hasAttribute("aria-pressed")).toBe(false);
  });

  test("the toggle reveals and hides the answer; focus stays; the counter is unchanged (FC5)", () => {
    const root = renderDeck();
    const button = toggle(root);
    button.focus();
    fireEvent.click(button);
    expect(toggle(root)).toBe(button);
    expect(button.textContent).toBe("Skjul svar");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(answer(root).hidden).toBe(false);
    expect(document.activeElement).toBe(button);
    expect(counter(root).textContent).toBe("Kort 1 av 5");
    fireEvent.click(button);
    expect(button.textContent).toBe("Vis svar");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(answer(root).hidden).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(counter(root).textContent).toBe("Kort 1 av 5");
  });

  test("the answer holds its text then the page links; none for empty pages or no source (FC6)", () => {
    const withLinks = renderDeck([{ front: "F", back: "B", pages: [2] }]);
    const region = answer(withLinks);
    expect(shape(region)).toEqual(["P.flashcard__answer-text", "DIV.page-links"]);
    const links = Array.from(region.querySelectorAll("a"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([`${SOURCE}#page=2`]);
    fireEvent.click(toggle(withLinks));
    expect(within(region).getByRole("link", { name: "PDF-side 2, åpnes i ny fane" })).toBe(links[0]);
    cleanup();

    const noPages = renderDeck([{ front: "F", back: "B", pages: [] }]);
    expect(shape(answer(noPages))).toEqual(["P.flashcard__answer-text"]);
    cleanup();

    const noSource = renderDeck([{ front: "F", back: "B", pages: [2] }], null);
    expect(shape(answer(noSource))).toEqual(["P.flashcard__answer-text"]);
    expect(noSource.querySelector("a")).toBeNull();
  });

  test("on card 1, Forrige is aria-disabled, focusable and does nothing; Neste is available (FC7)", () => {
    const root = renderDeck();
    const previous = navButton(root, "Forrige");
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    expect(previous.hasAttribute("disabled")).toBe(false);
    expect(previous.getAttribute("type")).toBe("button");
    expect(previous.getAttribute("tabindex")).not.toBe("-1");
    // Still in the Tab order: an aria-disabled button keeps its default tabIndex of 0.
    expect(previous.tabIndex).toBe(0);
    previous.focus();
    expect(document.activeElement).toBe(previous);
    fireEvent.click(previous);
    expect(counter(root).textContent).toBe("Kort 1 av 5");
    expect(term(root).textContent).toBe("Kort en");
    expect(document.activeElement).toBe(previous);
    expect(navButton(root, "Neste").hasAttribute("aria-disabled")).toBe(false);
  });

  test("Neste steps to the last card, keeps focus, then becomes aria-disabled and does nothing (FC8)", () => {
    const root = renderDeck();
    const next = navButton(root, "Neste");
    // The live region must be the same element throughout: a newly inserted region is often
    // not announced, so it must not be remounted on navigation (D7).
    const region = counter(root);
    next.focus();
    const fronts = makeCards().map((card) => card.front);
    for (let n = 2; n <= 5; n += 1) {
      fireEvent.click(next);
      expect(counter(root)).toBe(region);
      expect(counter(root).textContent).toBe(`Kort ${n} av 5`);
      expect(term(root).textContent).toBe(fronts[n - 1]);
      expect(navButton(root, "Neste")).toBe(next);
      expect(document.activeElement).toBe(next);
      expect(navButton(root, "Forrige").hasAttribute("aria-disabled")).toBe(false);
    }
    expect(next.getAttribute("aria-disabled")).toBe("true");
    expect(next.hasAttribute("disabled")).toBe(false);
    expect(next.tabIndex).toBe(0);
    fireEvent.click(next);
    expect(counter(root)).toBe(region);
    expect(counter(root).textContent).toBe("Kort 5 av 5");
    expect(term(root).textContent).toBe("Kort fem");
    expect(document.activeElement).toBe(next);
    expect(next.tabIndex).toBe(0);
  });

  test("Forrige from card 2 returns to card 1 and keeps focus, now aria-disabled (FC9)", () => {
    const root = renderDeck();
    fireEvent.click(navButton(root, "Neste"));
    const previous = navButton(root, "Forrige");
    previous.focus();
    fireEvent.click(previous);
    expect(counter(root).textContent).toBe("Kort 1 av 5");
    expect(term(root).textContent).toBe("Kort en");
    expect(navButton(root, "Forrige")).toBe(previous);
    expect(document.activeElement).toBe(previous);
    expect(previous.getAttribute("aria-disabled")).toBe("true");
  });

  test("each card keeps its own revealed state while navigating (FC10)", () => {
    const root = renderDeck();
    // The card, the toggle and the answer stay the same elements across navigation (D8).
    const card = root.querySelector(".flashcard") as HTMLElement;
    const button = toggle(root);
    const region = answer(root);
    fireEvent.click(button);
    fireEvent.click(navButton(root, "Neste"));
    expect(root.querySelector(".flashcard")).toBe(card);
    expect(toggle(root)).toBe(button);
    expect(answer(root)).toBe(region);
    expect(toggle(root).textContent).toBe("Vis svar");
    expect(answer(root).hidden).toBe(true);
    fireEvent.click(navButton(root, "Forrige"));
    expect(root.querySelector(".flashcard")).toBe(card);
    expect(toggle(root)).toBe(button);
    expect(answer(root)).toBe(region);
    expect(toggle(root).textContent).toBe("Skjul svar");
    expect(toggle(root).getAttribute("aria-expanded")).toBe("true");
    expect(answer(root).hidden).toBe(false);
  });

  test("aria-controls resolves to the rendered answer on every card; two decks get different ids (FC11)", () => {
    const { container } = render(
      <>
        <FlashcardDeck cards={makeCards()} pdfSource={SOURCE} />
        <FlashcardDeck cards={makeCards()} pdfSource={SOURCE} />
      </>,
    );
    const decks = Array.from(container.querySelectorAll<HTMLElement>("div.flashcard-deck"));
    expect(decks).toHaveLength(2);
    for (const root of decks) {
      for (let n = 1; n <= 5; n += 1) {
        const rendered = root.querySelector(".flashcard__answer");
        expect(answer(root)).toBe(rendered);
        if (n < 5) fireEvent.click(navButton(root, "Neste"));
      }
    }
    const ids = decks.map((root) => toggle(root).getAttribute("aria-controls"));
    expect(ids[0]).not.toBe(ids[1]);
  });

  test("an empty deck renders nothing (FC12)", () => {
    const { container } = render(<FlashcardDeck cards={[]} pdfSource={SOURCE} />);
    expect(container.firstChild).toBeNull();
  });

  test("a one-card deck: Kort 1 av 1, both buttons aria-disabled and inert (FC13)", () => {
    const root = renderDeck([{ front: "Eneste", back: "Svar.", pages: [1] }]);
    expect(counter(root).textContent).toBe("Kort 1 av 1");
    const previous = navButton(root, "Forrige");
    const next = navButton(root, "Neste");
    expect(previous.getAttribute("aria-disabled")).toBe("true");
    expect(next.getAttribute("aria-disabled")).toBe("true");
    for (const button of [previous, next]) {
      expect(button.hasAttribute("disabled")).toBe(false);
      expect(button.tabIndex).toBe(0);
    }
    fireEvent.click(previous);
    fireEvent.click(next);
    expect(counter(root).textContent).toBe("Kort 1 av 1");
    expect(term(root).textContent).toBe("Eneste");
    expect(previous.tabIndex).toBe(0);
    expect(next.tabIndex).toBe(0);
  });

  test("no heading, lang, role or aria-label; no disabled attribute; every button type=button (FC14)", () => {
    const root = renderDeck();
    expect(root.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
    expect(root.querySelectorAll("[lang], [role], [aria-label]")).toHaveLength(0);
    expect(within(root).queryAllByRole("heading")).toHaveLength(0);
    const buttons = Array.from(root.querySelectorAll("button"));
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.hasAttribute("disabled"), button.textContent ?? "").toBe(false);
      expect(button.getAttribute("type")).toBe("button");
    }
  });

  test("the component source holds no URL, no HTML injection and no bare disabled (FC15)", () => {
    // The scanner keeps a URL inside a string intact and removes real comments.
    const sample = ['const a = "http://x/api/demo"; // http comment', "/* /api/demo */ const b = 1;"].join(NL);
    const scanned = scanSource(sample);
    expect(scanned.literals).toEqual(["http://x/api/demo"]);
    expect(scanned.code.includes("http comment")).toBe(false);
    expect(scanned.code.includes("/* /api/demo */")).toBe(false);
    // The bare-disabled check: it finds a native attribute and ignores aria-disabled and other words.
    expect(bareDisabled("<button disabled>")).toHaveLength(1);
    expect(bareDisabled("<button disabled={x}>")).toHaveLength(1);
    expect(bareDisabled('<button aria-disabled="true" isDisabled={y}>')).toHaveLength(0);
    // Negative controls for the "preceded by a word character" rule.
    expect(bareDisabled("<button _disabled={x}>")).toHaveLength(0);
    expect(bareDisabled("<button notdisabled={x}>")).toHaveLength(0);
    // Positive controls for the whitespace and "/" followers.
    expect(bareDisabled(["<button", "  disabled", ">"].join(NL))).toHaveLength(1);
    expect(bareDisabled("<input disabled/>")).toHaveLength(1);

    const source = readFileSync(resolve(__dirname, "../components/FlashcardDeck.tsx"), "utf8");
    const { code, literals } = scanSource(source);
    // Positive controls: the scan saw the component's literals and its aria-disabled attributes.
    expect(literals).toContain("flashcard__term");
    expect(code.includes("aria-disabled")).toBe(true);
    for (const literal of literals) {
      expect(literal.includes("http"), literal).toBe(false);
      expect(literal.includes("/api/demo"), literal).toBe(false);
      expect(literal.includes("innerHTML"), literal).toBe(false);
    }
    expect(code.includes("http")).toBe(false);
    expect(code.includes("/api/demo")).toBe(false);
    expect(code.includes("dangerouslySetInnerHTML")).toBe(false);
    expect(code.includes("innerHTML")).toBe(false);
    expect(bareDisabled(code)).toEqual([]);
  });
});

// ---- ResultTabs (RT1–RT4) ----------------------------------------------------------------------

function panel(key: string): HTMLElement {
  return document.getElementById(`result-panel-${key}`) as HTMLElement;
}

function makeResults(): ValidatedResults {
  return {
    summary: { text: "Sammendragstekst.", pages: [1, 2] },
    flashcards: makeCards(),
    quiz: [{ question: "Spørsmål", answer: "Svar", pages: [1] }],
    key_concepts: [{ term: "Begrep", explanation: "Forklaring", pages: [1] }],
  };
}

function renderTabs(pdfSource: string | null = SOURCE) {
  return render(
    <section aria-label="Resultater">
      <h2 id="results-heading">Eksempelresultater (ikke generert nå)</h2>
      <ResultTabs results={makeResults()} labelledBy="results-heading" pdfSource={pdfSource} />
    </section>,
  );
}

describe("ResultTabs with the flashcard deck (D8)", () => {
  test("the Flashkort panel holds its h3 and the deck (RT1)", () => {
    renderTabs();
    expect(shape(panel("flashcards"))).toEqual(["H3.sr-only", "DIV.flashcard-deck"]);
    expect(panel("flashcards").children[0].textContent).toBe("Flashkort");
  });

  test("Sammendrag and Nøkkelbegreper are unchanged; Quiz holds only its h3 (RT2)", () => {
    renderTabs();
    expect(shape(panel("summary"))).toEqual(["H3.sr-only", "P.summary-text", "DIV.page-links"]);
    expect(shape(panel("key-concepts"))).toEqual(["H3.sr-only", "UL.key-concepts"]);
    expect(shape(panel("quiz"))).toEqual(["H3.sr-only"]);
  });

  test("the flashcard link uses the same source as the summary links (RT3)", () => {
    renderTabs();
    const prefix = `${SOURCE}#page=`;
    const summaryHrefs = Array.from(panel("summary").querySelectorAll("a")).map((link) => link.getAttribute("href"));
    const flashcardHrefs = Array.from(panel("flashcards").querySelectorAll("a")).map((link) =>
      link.getAttribute("href"),
    );
    expect(summaryHrefs).toEqual([`${prefix}1`, `${prefix}2`]);
    expect(flashcardHrefs).toEqual([`${prefix}2`]);
  });

  test("a new results session starts at card 1 with every answer hidden (RT4)", () => {
    const first = renderTabs();
    const deckPanel = panel("flashcards");
    fireEvent.click(navButton(deckPanel, "Neste"));
    fireEvent.click(navButton(deckPanel, "Neste"));
    fireEvent.click(toggle(deckPanel));
    expect(counter(deckPanel).textContent).toBe("Kort 3 av 5");
    expect(toggle(deckPanel).textContent).toBe("Skjul svar");
    first.unmount();

    renderTabs();
    const fresh = panel("flashcards");
    expect(counter(fresh).textContent).toBe("Kort 1 av 5");
    expect(term(fresh).textContent).toBe("Kort en");
    expect(toggle(fresh).textContent).toBe("Vis svar");
    expect(answer(fresh).hidden).toBe(true);
    fireEvent.click(navButton(fresh, "Neste"));
    fireEvent.click(navButton(fresh, "Neste"));
    expect(counter(fresh).textContent).toBe("Kort 3 av 5");
    expect(toggle(fresh).textContent).toBe("Vis svar");
    expect(answer(fresh).hidden).toBe(true);
  });
});

// ---- the page (FP1–FP9) ------------------------------------------------------------------------

const RECORDED = JSON.parse(RECORDED_TEXT) as { results: ValidatedResults };
const FIXTURE_CARDS = RECORDED.results.flashcards;

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

/** Demo S4 on the page: S1, `Vis eksempel` focused and clicked, the recorded reply applied. */
async function showResults(): Promise<HTMLElement> {
  await renderHome();
  const button = showExample();
  button.focus();
  fireEvent.click(button);
  await replyDemo(RECORDED_TEXT);
  return button;
}

function selectFlashcards(): HTMLElement {
  const tab = screen.getByRole("tab", { name: "Flashkort (5)" });
  fireEvent.click(tab);
  return tab;
}

describe("demo S4 on the page: the flashcard deck", () => {
  setupDemoTest();

  test("Flashkort shows Kort 1 av 5, the fixture's first term and a hidden answer (FP1)", async () => {
    await showResults();
    selectFlashcards();
    const deckPanel = panel("flashcards");
    expect(deckPanel.hidden).toBe(false);
    expect(counter(deckPanel).textContent).toBe("Kort 1 av 5");
    expect(term(deckPanel).textContent).toBe(FIXTURE_CARDS[0].front);
    expect(answer(deckPanel).hidden).toBe(true);
    expect(FIXTURE_CARDS.map((card) => card.pages)).toEqual([[2], [3], [3], [6], [5]]);
  });

  test("Neste and Forrige step through the fixture in order, keeping focus; the ends are aria-disabled (FP2)", async () => {
    await showResults();
    selectFlashcards();
    const deckPanel = panel("flashcards");
    const next = navButton(deckPanel, "Neste");
    const previous = navButton(deckPanel, "Forrige");
    next.focus();
    for (let n = 2; n <= 5; n += 1) {
      fireEvent.click(next);
      expect(term(deckPanel).textContent).toBe(FIXTURE_CARDS[n - 1].front);
      expect(document.activeElement).toBe(next);
    }
    expect(next.getAttribute("aria-disabled")).toBe("true");
    previous.focus();
    for (let n = 4; n >= 1; n -= 1) {
      fireEvent.click(previous);
      expect(term(deckPanel).textContent).toBe(FIXTURE_CARDS[n - 1].front);
      expect(document.activeElement).toBe(previous);
    }
    expect(previous.getAttribute("aria-disabled")).toBe("true");
  });

  test("each revealed answer is the fixture's back with its links to the sample PDF (FP3)", async () => {
    await showResults();
    selectFlashcards();
    const deckPanel = panel("flashcards");
    FIXTURE_CARDS.forEach((card, index) => {
      if (index > 0) fireEvent.click(navButton(deckPanel, "Neste"));
      fireEvent.click(toggle(deckPanel));
      const region = answer(deckPanel);
      expect(region.hidden).toBe(false);
      expect((region.querySelector("p.flashcard__answer-text") as HTMLElement).textContent).toBe(card.back);
      const links = Array.from(region.querySelectorAll("a"));
      expect(links.map((link) => link.getAttribute("href"))).toEqual(
        card.pages.map((page) => `http://127.0.0.1:8000/api/demo/sample.pdf#page=${page}`),
      );
      for (const link of links) {
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener");
      }
      expect(within(region).getAllByRole("link").map((link) => link)).toEqual(
        card.pages.map((page) => within(region).getByRole("link", { name: `PDF-side ${page}, åpnes i ny fane` })),
      );
    });
  });

  test("focus order with Flashkort selected, before and after Vis svar (FP4)", async () => {
    const button = await showResults();
    const tab = selectFlashcards();
    const deckPanel = panel("flashcards");
    const showAnswer = toggle(deckPanel);
    const previous = navButton(deckPanel, "Forrige");
    const next = navButton(deckPanel, "Neste");
    expect(focusOrder(main())).toEqual([button, tab, deckPanel, showAnswer, previous, next]);
    fireEvent.click(showAnswer);
    const link = answer(deckPanel).querySelector("a.page-link") as HTMLElement;
    expect(link).not.toBeNull();
    expect(focusOrder(main())).toEqual([button, tab, deckPanel, showAnswer, link, previous, next]);
  });

  test("after switching to Quiz and back, the current card and its revealed answer are kept (FP5)", async () => {
    await showResults();
    selectFlashcards();
    const deckPanel = panel("flashcards");
    fireEvent.click(navButton(deckPanel, "Neste"));
    fireEvent.click(navButton(deckPanel, "Neste"));
    fireEvent.click(toggle(deckPanel));
    const deckNode = deckPanel.querySelector(".flashcard-deck");
    fireEvent.click(screen.getByRole("tab", { name: "Quiz (5)" }));
    expect(deckPanel.hidden).toBe(true);
    selectFlashcards();
    expect(deckPanel.querySelector(".flashcard-deck")).toBe(deckNode);
    expect(counter(deckPanel).textContent).toBe("Kort 3 av 5");
    expect(toggle(deckPanel).textContent).toBe("Skjul svar");
    expect(answer(deckPanel).hidden).toBe(false);
  });

  test("with Sammendrag selected, the counter already exists in the hidden panel; nothing is focusable (FP6)", async () => {
    await showResults();
    const deckPanel = panel("flashcards");
    expect(deckPanel.hidden).toBe(true);
    expect(counter(deckPanel)).not.toBeNull();
    expect(counter(deckPanel).textContent).toBe("Kort 1 av 5");
    const order = focusOrder(main());
    for (const element of Array.from(deckPanel.querySelectorAll<HTMLElement>("button, a"))) {
      expect(order).not.toContain(element);
    }
  });

  test("toggling and navigating send no request and write nothing to the status region (FP7)", async () => {
    await showResults();
    await advance(0); // flushes the "Resultatene er klare" announcement
    const fetchCalls = currentFake().fetchMock.mock.calls.length;
    const requests = demoRequests().length;
    const watcher = watchRegion();
    try {
      selectFlashcards();
      const deckPanel = panel("flashcards");
      fireEvent.click(toggle(deckPanel));
      fireEvent.click(navButton(deckPanel, "Neste"));
      fireEvent.click(navButton(deckPanel, "Forrige"));
      fireEvent.click(toggle(deckPanel));
      await advance(0);

      expect(currentFake().fetchMock.mock.calls.length).toBe(fetchCalls);
      expect(demoRequests()).toHaveLength(requests);
      const urls = currentFake().fetchMock.mock.calls.map(([input]) => String(input));
      expect(urls.some((url) => url.includes("sample.pdf"))).toBe(false);
      expect(urls.every((url) => url.endsWith("/api/status") || url.endsWith("/api/demo"))).toBe(true);
      expect(watcher.texts).toEqual([]);
    } finally {
      watcher.stop();
    }
  });

  test("real mode: no flashcard deck (FP8)", async () => {
    await renderHome("real");
    expect(document.querySelector(".flashcard-deck")).toBeNull();
  });

  test("with a set base URL, the flashcard link uses it (FP9)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:9000");
    await showResults();
    const hrefs = Array.from(panel("flashcards").querySelectorAll("a")).map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["http://localhost:9000/api/demo/sample.pdf#page=2"]);
  });
});
