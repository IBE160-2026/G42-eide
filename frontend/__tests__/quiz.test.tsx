import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import QuizList from "../components/QuizList";
import ResultTabs from "../components/ResultTabs";
import type { ValidatedFlashcard, ValidatedQuizItem, ValidatedResults } from "../lib/contracts";
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
 * Story 1.20: the Quiz list — Stage A, matrix rows QZ1–QZ14 for `QuizList` (QZ3, QZ7 and QZ10
 * amended and QZ15 added by the D7 correction, G2-280-01, Checkpoint 281); Stage B, rows
 * QT1–QT5 for `ResultTabs` and QP1–QP10 on the page (<Home /> with the recorded demo reply).
 * jsdom applies no CSS, computes no focus order from `hidden` and does not turn Enter or Space
 * into a click, so these rows drive activation with `click` and prove the DOM structure and
 * the names computed from it only; layout, real keyboard activation and speech are the manual
 * checks 1.20-M2 to 1.20-M4.
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

/** Five items with the page lists of the demo fixture: [3, 6], [6], [2], [6], [1]. */
function makeItems(): ValidatedQuizItem[] {
  return [
    { question: "Spørsmål en?", answer: "Svar en.", pages: [3, 6] },
    { question: "Spørsmål to?", answer: "Svar to.", pages: [6] },
    { question: "Spørsmål tre?", answer: "Svar tre.", pages: [2] },
    { question: "Spørsmål fire?", answer: "Svar fire.", pages: [6] },
    { question: "Spørsmål fem?", answer: "Svar fem.", pages: [1] },
  ];
}

function shape(element: Element): string[] {
  return Array.from(element.children).map((child) => `${child.tagName}.${child.className}`);
}

/** True when the element holds text nodes only (no element children). */
function textOnly(element: Element): boolean {
  return Array.from(element.childNodes).every((node) => node.nodeType === Node.TEXT_NODE);
}

function list(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>("ol.quiz-list");
  expect(element, "ol.quiz-list is rendered").not.toBeNull();
  return element as HTMLElement;
}

function renderList(items: ValidatedQuizItem[] = makeItems(), pdfSource: string | null = SOURCE): HTMLElement {
  const { container } = render(<QuizList items={items} pdfSource={pdfSource} />);
  return list(container);
}

function listItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(":scope > li"));
}

function question(item: HTMLElement): HTMLElement {
  return item.querySelector("h4") as HTMLElement;
}

function toggle(item: HTMLElement): HTMLButtonElement {
  return item.querySelector("button") as HTMLButtonElement;
}

/** The answer element the toggle's `aria-controls` points to, looked up by its exact id. */
function answer(item: HTMLElement): HTMLElement {
  const id = toggle(item).getAttribute("aria-controls");
  expect(id, "the toggle has aria-controls").toBeTruthy();
  return document.getElementById(id as string) as HTMLElement;
}

/** The element the toggle's `aria-describedby` points to, looked up by its exact id (D7 correction). */
function describedBy(item: HTMLElement): HTMLElement | null {
  const id = toggle(item).getAttribute("aria-describedby");
  expect(id, "the toggle has aria-describedby").toBeTruthy();
  return document.getElementById(id as string);
}

/** The 1-based numbers of the items whose answer is shown, checked against each toggle. */
function revealedNumbers(root: HTMLElement): number[] {
  const shown: number[] = [];
  listItems(root).forEach((item, k) => {
    const open = !answer(item).hidden;
    expect(toggle(item).textContent, `item ${k + 1} label`).toBe(open ? "Skjul svar" : "Vis svar");
    expect(toggle(item).getAttribute("aria-expanded"), `item ${k + 1} aria-expanded`).toBe(String(open));
    if (open) shown.push(k + 1);
  });
  return shown;
}

/**
 * A small source scanner (a copy of the one in `flashcards.test.tsx`, Story 1.19 FC15; not
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
 * whitespace, `/` or `>` (as FC15; a narrow check, not a JSX parser).
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

describe("QuizList (D1–D4, D7, D8)", () => {
  test("one ordered list, five items, each with exactly the question, the toggle and the answer (QZ1)", () => {
    const { container } = render(<QuizList items={makeItems()} pdfSource={SOURCE} />);
    expect(container.querySelectorAll("ol.quiz-list")).toHaveLength(1);
    const root = list(container);
    expect(shape(root)).toEqual(Array(5).fill("LI.quiz-item"));
    for (const item of listItems(root)) {
      expect(Array.from(item.children).map((child) => child.tagName)).toEqual(["H4", "BUTTON", "DIV"]);
      expect(item.children[0].className).toBe("quiz-item__question");
      expect(item.children[2].className).toBe("quiz-item__answer");
    }
    for (const attribute of ["start", "reversed", "type"]) {
      expect(root.hasAttribute(attribute), attribute).toBe(false);
    }
  });

  test("question and answer are the input texts, rendered literally as text nodes (QZ2)", () => {
    // Leading and trailing spaces must survive: the text is never trimmed (R263-01).
    const questionText = ["  <script>alert(1)</script>", "**fet** <b>x</b>  "].join(NL);
    const answerText = ["  # Overskrift", "<strong>sterk</strong> og <h1>tittel</h1>  "].join(NL);
    const root = renderList([{ question: questionText, answer: answerText, pages: [1] }]);
    const [item] = listItems(root);
    const text = answer(item).querySelector("p.quiz-item__answer-text") as HTMLElement;
    // Exact equality also proves that no number prefix is added to the heading text.
    expect(question(item).textContent).toBe(questionText);
    expect(text.textContent).toBe(answerText);
    expect(textOnly(question(item))).toBe(true);
    expect(textOnly(text)).toBe(true);
    for (const tag of ["script", "b", "strong", "h1"]) {
      expect(root.querySelector(tag), tag).toBeNull();
    }
  });

  test("every toggle starts collapsed, controls its own hidden answer and is described by its own question; no extra attributes (QZ3)", () => {
    const root = renderList();
    for (const item of listItems(root)) {
      const button = toggle(item);
      expect(button.textContent).toBe("Vis svar");
      expect(button.getAttribute("type")).toBe("button");
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(button.className).toBe("button-secondary quiz-item__toggle");
      const region = answer(item);
      expect(region).toBe(item.querySelector("div.quiz-item__answer"));
      expect(region.hidden).toBe(true);
      expect(describedBy(item)).toBe(question(item));
      for (const attribute of ["aria-label", "aria-pressed", "aria-disabled", "aria-labelledby", "disabled"]) {
        expect(button.hasAttribute(attribute), attribute).toBe(false);
      }
    }
  });

  test("item 2's toggle reveals and hides only its own answer; focus stays on it (QZ4)", () => {
    const root = renderList();
    const button = toggle(listItems(root)[1]);
    button.focus();
    expect(document.activeElement).toBe(button);

    fireEvent.click(button);
    expect(toggle(listItems(root)[1])).toBe(button);
    expect(button.textContent).toBe("Skjul svar");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(answer(listItems(root)[1]).hidden).toBe(false);
    for (const k of [0, 2, 3, 4]) {
      const other = listItems(root)[k];
      expect(toggle(other).textContent, `item ${k + 1}`).toBe("Vis svar");
      expect(toggle(other).getAttribute("aria-expanded"), `item ${k + 1}`).toBe("false");
      expect(answer(other).hidden, `item ${k + 1}`).toBe(true);
    }
    expect(document.activeElement).toBe(button);

    fireEvent.click(button);
    expect(toggle(listItems(root)[1])).toBe(button);
    expect(button.textContent).toBe("Vis svar");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(answer(listItems(root)[1]).hidden).toBe(true);
    expect(document.activeElement).toBe(button);
  });

  test("items 1, 3 and 5 are revealed independently; hiding 3 leaves 1 and 5 (QZ5)", () => {
    const root = renderList();
    for (const k of [0, 2, 4]) fireEvent.click(toggle(listItems(root)[k]));
    expect(revealedNumbers(root)).toEqual([1, 3, 5]);
    fireEvent.click(toggle(listItems(root)[2]));
    expect(revealedNumbers(root)).toEqual([1, 5]);
  });

  test("the answer holds its text then the page links in page order; none for empty pages or no source (QZ6)", () => {
    const withLinks = renderList([{ question: "Q", answer: "A", pages: [3, 6] }]);
    const [item] = listItems(withLinks);
    const region = answer(item);
    expect(shape(region)).toEqual(["P.quiz-item__answer-text", "DIV.page-links"]);
    const links = Array.from(region.querySelectorAll("a"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([`${SOURCE}#page=3`, `${SOURCE}#page=6`]);
    // While the answer is hidden, its links are inside the [hidden] element.
    expect(region.hidden).toBe(true);
    for (const link of links) expect(link.closest("[hidden]")).toBe(region);
    expect(within(withLinks).queryAllByRole("link")).toHaveLength(0);
    fireEvent.click(toggle(item));
    // Revealed: the links are exposed by role, in page order, with their accessible names.
    expect(within(region).getAllByRole("link")).toEqual(links);
    expect(within(region).getByRole("link", { name: "PDF-side 3, åpnes i ny fane" })).toBe(links[0]);
    expect(within(region).getByRole("link", { name: "PDF-side 6, åpnes i ny fane" })).toBe(links[1]);
    cleanup();

    const noPages = renderList([{ question: "Q", answer: "A", pages: [] }]);
    expect(shape(answer(listItems(noPages)[0]))).toEqual(["P.quiz-item__answer-text"]);
    cleanup();

    const noSource = renderList([{ question: "Q", answer: "A", pages: [3, 6] }], null);
    expect(shape(answer(listItems(noSource)[0]))).toEqual(["P.quiz-item__answer-text"]);
    expect(noSource.querySelector("a")).toBeNull();
  });

  test("answer and question ids are distinct; aria-controls and aria-describedby resolve around their toggle; two lists share no id (QZ7)", () => {
    const { container } = render(
      <>
        <QuizList items={makeItems()} pdfSource={SOURCE} />
        <QuizList items={makeItems()} pdfSource={SOURCE} />
      </>,
    );
    const lists = Array.from(container.querySelectorAll<HTMLElement>("ol.quiz-list"));
    expect(lists).toHaveLength(2);
    const allIds: string[] = [];
    for (const root of lists) {
      const answerIds: string[] = [];
      const questionIds: string[] = [];
      for (const item of listItems(root)) {
        const id = toggle(item).getAttribute("aria-controls") as string;
        expect(document.getElementById(id)).toBe(toggle(item).nextElementSibling);
        expect(answer(item)).toBe(item.querySelector("div.quiz-item__answer"));
        const questionId = toggle(item).getAttribute("aria-describedby") as string;
        expect(document.getElementById(questionId)).toBe(toggle(item).previousElementSibling);
        expect(describedBy(item)).toBe(question(item));
        expect(question(item).getAttribute("id")).toBe(questionId);
        answerIds.push(id);
        questionIds.push(questionId);
      }
      expect(new Set(answerIds).size, "answer ids distinct").toBe(5);
      expect(new Set(questionIds).size, "question ids distinct").toBe(5);
      for (const questionId of questionIds) expect(answerIds, "no answer id equals a question id").not.toContain(questionId);
      allIds.push(...answerIds, ...questionIds);
    }
    expect(new Set(allIds).size).toBe(20);
    // Every id in the rendered output is unique in the document.
    const documentIds = Array.from(container.querySelectorAll("[id]")).map((element) => element.id);
    expect(new Set(documentIds).size).toBe(documentIds.length);
    expect(documentIds).toHaveLength(20);
  });

  test("an empty list renders nothing (QZ8)", () => {
    const { container, rerender } = render(<QuizList items={[]} pdfSource={SOURCE} />);
    expect(container.firstChild).toBeNull();
    // Regression check (R263-02): the empty return comes after the hook calls (D4), so the
    // same instance can later render items without a hook-order error.
    rerender(<QuizList items={makeItems()} pdfSource={SOURCE} />);
    const root = list(container);
    expect(listItems(root)).toHaveLength(5);
    expect(revealedNumbers(root)).toEqual([]);
    fireEvent.click(toggle(listItems(root)[1]));
    expect(revealedNumbers(root)).toEqual([2]);
    fireEvent.click(toggle(listItems(root)[1]));
    expect(revealedNumbers(root)).toEqual([]);
  });

  test("a one-item list: one item; its toggle reveals and hides its answer (QZ9)", () => {
    const root = renderList([{ question: "Eneste?", answer: "Svar.", pages: [1] }]);
    const items = listItems(root);
    expect(items).toHaveLength(1);
    expect(root.querySelectorAll("li.quiz-item")).toHaveLength(1);
    const [item] = items;
    expect(answer(item).hidden).toBe(true);
    fireEvent.click(toggle(item));
    expect(toggle(item).textContent).toBe("Skjul svar");
    expect(answer(item).hidden).toBe(false);
    fireEvent.click(toggle(item));
    expect(toggle(item).textContent).toBe("Vis svar");
    expect(answer(item).hidden).toBe(true);
  });

  test("display-only: no inputs, roles, lang, labels or live regions; one toggle per item; only h4 headings, each describing only its own toggle (QZ10)", () => {
    const { container } = render(<QuizList items={makeItems()} pdfSource={SOURCE} />);
    const root = list(container);
    function check() {
      // The whole rendered output (R263-03): the list is the only top-level element, and no
      // control exists outside it.
      expect(Array.from(container.children)).toEqual([root]);
      expect(container.querySelectorAll("button")).toHaveLength(5);
      expect(
        container.querySelectorAll(
          "input, select, textarea, form, [contenteditable], [role], [lang], [aria-label], [aria-labelledby], [aria-live]",
        ),
      ).toHaveLength(0);
      const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6"));
      expect(headings.map((heading) => heading.tagName)).toEqual(Array(5).fill("H4"));
      // D7 correction (Checkpoint 281): each h4 has an id that only its own item's toggle
      // names in aria-describedby; nothing else carries aria-describedby.
      const describing = Array.from(container.querySelectorAll("[aria-describedby]"));
      expect(describing).toEqual(listItems(root).map((item) => toggle(item)));
      for (const heading of headings) {
        const id = heading.getAttribute("id");
        expect(id, "the h4 has an id").toBeTruthy();
        const users = describing.filter((element) => element.getAttribute("aria-describedby") === id);
        expect(users).toEqual([toggle(heading.closest("li") as HTMLElement)]);
      }
      expect(root.querySelectorAll("button")).toHaveLength(5);
      for (const item of listItems(root)) {
        const buttons = Array.from(item.querySelectorAll("button"));
        expect(buttons).toHaveLength(1);
        expect(buttons[0].getAttribute("type")).toBe("button");
        expect(["Vis svar", "Skjul svar"]).toContain(buttons[0].textContent);
        expect(item.querySelectorAll("h4")).toHaveLength(1);
      }
      const all = [container, ...Array.from(container.querySelectorAll("*"))];
      expect(all.filter((element) => element.textContent === "Vis alle svar")).toHaveLength(0);
    }
    check();
    for (const item of listItems(root)) fireEvent.click(toggle(item));
    check();
  });

  test("the component source holds no URL, HTML injection, storage, cookie, fetch, Vis alle svar or bare disabled (QZ11)", () => {
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
    expect(bareDisabled("<button _disabled={x}>")).toHaveLength(0);
    expect(bareDisabled("<button notdisabled={x}>")).toHaveLength(0);
    expect(bareDisabled(["<button", "  disabled", ">"].join(NL))).toHaveLength(1);
    expect(bareDisabled("<input disabled/>")).toHaveLength(1);

    const source = readFileSync(resolve(__dirname, "../components/QuizList.tsx"), "utf8");
    const { code, literals } = scanSource(source);
    // Scanner input (R263-04): the source and the scanned code are non-empty and hold the
    // component's own code, so the negative checks below scan real code.
    expect(source.length).toBeGreaterThan(0);
    expect(code.length).toBeGreaterThan(0);
    expect(code.includes("export default function QuizList")).toBe(true);
    expect(code.includes("useState")).toBe(true);
    // Positive controls: the scan saw the component's literals.
    expect(literals).toContain("quiz-item__question");
    expect(literals).toContain("Vis svar");
    const forbidden = [
      "http",
      "/api/demo",
      "dangerouslySetInnerHTML",
      "innerHTML",
      "localStorage",
      "sessionStorage",
      "document.cookie",
      "fetch",
      "Vis alle svar",
    ];
    for (const word of forbidden) {
      expect(code.includes(word), word).toBe(false);
      for (const literal of literals) expect(literal.includes(word), `${word} in ${literal}`).toBe(false);
    }
    expect(bareDisabled(code)).toEqual([]);
  });

  test("toggling every item twice writes no storage and makes no fetch (QZ12)", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.reject(new Error("no network")));
    const root = renderList();
    for (const item of listItems(root)) {
      fireEvent.click(toggle(item));
      fireEvent.click(toggle(item));
    }
    expect(revealedNumbers(root)).toEqual([]);
    expect(setItem).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("re-rendering with the same items keeps item 4 revealed and the same li (QZ13)", () => {
    const items = makeItems();
    const { container, rerender } = render(<QuizList items={items} pdfSource={SOURCE} />);
    const before = listItems(list(container))[3];
    fireEvent.click(toggle(before));
    rerender(<QuizList items={items} pdfSource={SOURCE} />);
    const after = listItems(list(container))[3];
    expect(after).toBe(before);
    expect(answer(after).hidden).toBe(false);
    expect(revealedNumbers(list(container))).toEqual([4]);
  });

  test("per item: h4 before its toggle, the toggle directly before its answer, the answer before the next h4 (QZ14)", () => {
    const root = renderList();
    const items = listItems(root);
    const follows = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    items.forEach((item, k) => {
      const heading = question(item);
      const button = toggle(item);
      const region = answer(item);
      expect(follows(heading, button), `item ${k + 1}: h4 before toggle`).toBe(true);
      expect(follows(button, region), `item ${k + 1}: toggle before answer`).toBe(true);
      expect(region.previousElementSibling, `item ${k + 1}: toggle directly before answer`).toBe(button);
      if (k < items.length - 1) {
        expect(follows(region, question(items[k + 1])), `item ${k + 1}: answer before next h4`).toBe(true);
      }
    });
  });

  test("each toggle is described by its own question; its name stays the visible label after a reveal and a hide (QZ15)", () => {
    const items = makeItems();
    const root = renderList(items);
    const headings = listItems(root).map((item) => question(item));
    /** Checks every item's association; `revealed` is the 0-based index of the open item, if any. */
    function check(revealed: number | null): string[] {
      const ids: string[] = [];
      listItems(root).forEach((item, k) => {
        const button = toggle(item);
        const tokens = (button.getAttribute("aria-describedby") ?? "").split(" ").filter((token) => token !== "");
        expect(tokens, `item ${k + 1}: exactly one described-by id`).toHaveLength(1);
        const target = document.getElementById(tokens[0]);
        expect(target, `item ${k + 1}: its own h4`).toBe(headings[k]);
        expect(target?.closest("li"), `item ${k + 1}: in the same li`).toBe(item);
        expect(headings.filter((heading) => heading === target), `item ${k + 1}: no other h4`).toHaveLength(1);
        expect(headings[k].textContent).toBe(items[k].question);
        // The accessible name is exactly the visible label; the description is exactly the question.
        const name = k === revealed ? "Skjul svar" : "Vis svar";
        expect(button.textContent).toBe(name);
        expect(within(item).getByRole("button", { name, description: items[k].question })).toBe(button);
        ids.push(tokens[0]);
      });
      // Across the whole list, each question describes exactly its own toggle, in order.
      items.forEach((entry, k) => {
        expect(within(root).getByRole("button", { description: entry.question }), `question ${k + 1}`).toBe(
          toggle(listItems(root)[k]),
        );
      });
      return ids;
    }
    const before = check(null);
    fireEvent.click(toggle(listItems(root)[1]));
    expect(check(1)).toEqual(before);
    fireEvent.click(toggle(listItems(root)[1]));
    expect(check(null)).toEqual(before);
    expect(listItems(root).map((item) => question(item))).toEqual(headings);
  });
});

// ---- ResultTabs (QT1–QT5) ----------------------------------------------------------------------

function panel(key: string): HTMLElement {
  return document.getElementById(`result-panel-${key}`) as HTMLElement;
}

/** The quiz list in the Quiz panel. */
function quizList(): HTMLElement {
  return list(panel("quiz"));
}

function makeCards(): ValidatedFlashcard[] {
  return [
    { front: "Kort en", back: "Svar en.", pages: [2] },
    { front: "Kort to", back: "Svar to.", pages: [3] },
  ];
}

function makeResults(quiz: ValidatedQuizItem[] = makeItems()): ValidatedResults {
  return {
    summary: { text: "Sammendragstekst.", pages: [1, 2] },
    flashcards: makeCards(),
    quiz,
    key_concepts: [{ term: "Begrep", explanation: "Forklaring", pages: [1] }],
  };
}

function renderTabs(pdfSource: string | null = SOURCE, quiz: ValidatedQuizItem[] = makeItems()) {
  return render(
    <section aria-label="Resultater">
      <h2 id="results-heading">Eksempelresultater (ikke generert nå)</h2>
      <ResultTabs results={makeResults(quiz)} labelledBy="results-heading" pdfSource={pdfSource} />
    </section>,
  );
}

describe("ResultTabs with the quiz list (PD1, PD2, D4)", () => {
  test("the Quiz panel holds exactly its h3 and the quiz list (QT1)", () => {
    renderTabs();
    expect(shape(panel("quiz"))).toEqual(["H3.sr-only", "OL.quiz-list"]);
    expect(panel("quiz").children[0].textContent).toBe("Quiz");
  });

  test("Sammendrag, Nøkkelbegreper and Flashkort are unchanged (QT2)", () => {
    renderTabs();
    expect(shape(panel("summary"))).toEqual(["H3.sr-only", "P.summary-text", "DIV.page-links"]);
    expect(shape(panel("key-concepts"))).toEqual(["H3.sr-only", "UL.key-concepts"]);
    expect(shape(panel("flashcards"))).toEqual(["H3.sr-only", "DIV.flashcard-deck"]);
  });

  test("the quiz links use the same source as the summary links (QT3)", () => {
    renderTabs();
    const prefix = `${SOURCE}#page=`;
    const summaryHrefs = Array.from(panel("summary").querySelectorAll("a")).map((link) => link.getAttribute("href"));
    const quizHrefs = Array.from(panel("quiz").querySelectorAll("a")).map((link) => link.getAttribute("href"));
    expect(summaryHrefs).toEqual([`${prefix}1`, `${prefix}2`]);
    expect(quizHrefs).toEqual(makeItems().flatMap((item) => item.pages.map((page) => `${prefix}${page}`)));
  });

  test("a new results session starts with every quiz answer hidden (QT4)", () => {
    const first = renderTabs();
    fireEvent.click(toggle(listItems(quizList())[1]));
    fireEvent.click(toggle(listItems(quizList())[3]));
    expect(revealedNumbers(quizList())).toEqual([2, 4]);
    first.unmount();

    renderTabs();
    const fresh = quizList();
    expect(listItems(fresh)).toHaveLength(5);
    for (const item of listItems(fresh)) {
      expect(toggle(item).textContent).toBe("Vis svar");
      expect(answer(item).hidden).toBe(true);
    }
  });

  test("an empty quiz: the tab reads Quiz (0) and the panel holds only its h3 (QT5)", () => {
    renderTabs(SOURCE, []);
    expect(screen.getByRole("tab", { name: "Quiz (0)" })).toBeTruthy();
    expect(shape(panel("quiz"))).toEqual(["H3.sr-only"]);
  });
});

// ---- the page (QP1–QP10) -----------------------------------------------------------------------

const RECORDED = JSON.parse(RECORDED_TEXT) as { results: ValidatedResults };
const FIXTURE_QUIZ = RECORDED.results.quiz;
const DEMO_PDF = "http://127.0.0.1:8000/api/demo/sample.pdf";

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

function selectTab(name: string): HTMLElement {
  const tab = screen.getByRole("tab", { name });
  fireEvent.click(tab);
  return tab;
}

function selectQuiz(): HTMLElement {
  return selectTab("Quiz (5)");
}

// Flashcard helpers, named apart from the quiz helpers above.
function deckCounter(): HTMLElement {
  return panel("flashcards").querySelector("p.flashcard__counter") as HTMLElement;
}

function deckToggle(): HTMLButtonElement {
  return panel("flashcards").querySelector("button.flashcard__toggle") as HTMLButtonElement;
}

function deckAnswer(): HTMLElement {
  return document.getElementById(deckToggle().getAttribute("aria-controls") as string) as HTMLElement;
}

function deckNav(name: "Forrige" | "Neste"): HTMLButtonElement {
  const buttons = Array.from(panel("flashcards").querySelectorAll<HTMLButtonElement>("div.flashcard-nav > button"));
  return buttons.find((button) => button.textContent === name) as HTMLButtonElement;
}

describe("demo S4 on the page: the quiz list", () => {
  setupDemoTest();

  test("Quiz shows the fixture's five questions in order, five Vis svar toggles, every answer hidden (QP1)", async () => {
    await showResults();
    selectQuiz();
    expect(panel("quiz").hidden).toBe(false);
    const items = listItems(quizList());
    expect(items.map((item) => question(item).textContent)).toEqual(FIXTURE_QUIZ.map((item) => item.question));
    expect(items.map((item) => toggle(item).textContent)).toEqual(Array(5).fill("Vis svar"));
    for (const item of items) expect(answer(item).hidden).toBe(true);
    expect(FIXTURE_QUIZ.map((item) => item.pages)).toEqual([[3, 6], [6], [2], [6], [1]]);
  });

  test("each revealed answer is the fixture's answer with its links in the fixture's page order (QP2)", async () => {
    await showResults();
    selectQuiz();
    listItems(quizList()).forEach((item, index) => {
      const fixture = FIXTURE_QUIZ[index];
      fireEvent.click(toggle(item));
      const region = answer(item);
      expect(region.hidden).toBe(false);
      expect((region.querySelector("p.quiz-item__answer-text") as HTMLElement).textContent).toBe(fixture.answer);
      const links = Array.from(item.querySelectorAll("a"));
      expect(links.map((link) => link.getAttribute("href"))).toEqual(
        fixture.pages.map((page) => `${DEMO_PDF}#page=${page}`),
      );
      for (const link of links) {
        expect(link.getAttribute("target")).toBe("_blank");
        expect(link.getAttribute("rel")).toBe("noopener");
      }
      // Scoped to the item: PDF-side 6 occurs in items 1, 2 and 4. Each name resolves to the
      // very link element at that position (identity, R267-03).
      expect(links).toHaveLength(fixture.pages.length);
      fixture.pages.forEach((page, k) => {
        expect(within(item).getByRole("link", { name: `PDF-side ${page}, åpnes i ny fane` }), `page ${page}`).toBe(
          links[k],
        );
      });
    });
  });

  test("revealed answers and the list node survive tab switches by click and by arrow keys (QP3)", async () => {
    await showResults();
    const quizTab = selectQuiz();
    const listNode = quizList();
    fireEvent.click(toggle(listItems(listNode)[1]));
    fireEvent.click(toggle(listItems(listNode)[4]));
    expect(revealedNumbers(listNode)).toEqual([2, 5]);

    selectTab("Flashkort (5)");
    expect(panel("quiz").hidden).toBe(true);
    selectQuiz();
    expect(panel("quiz").hidden).toBe(false);
    expect(quizList()).toBe(listNode);
    expect(revealedNumbers(quizList())).toEqual([2, 5]);

    quizTab.focus();
    fireEvent.keyDown(quizTab, { key: "ArrowLeft" });
    expect(panel("quiz").hidden).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Flashkort (5)" }));
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowRight" });
    expect(panel("quiz").hidden).toBe(false);
    expect(document.activeElement).toBe(quizTab);
    expect(quizList()).toBe(listNode);
    expect(revealedNumbers(quizList())).toEqual([2, 5]);
  });

  test("focus order with Quiz selected, before and after revealing item 1 (QP4)", async () => {
    const button = await showResults();
    const tab = selectQuiz();
    const quizPanel = panel("quiz");
    const toggles = listItems(quizList()).map((item) => toggle(item));
    expect(toggles).toHaveLength(5);
    // Element identity, position by position (R267-03).
    const expectOrder = (expected: HTMLElement[]) => {
      const actual = focusOrder(main());
      expect(actual).toHaveLength(expected.length);
      expected.forEach((element, k) => expect(actual[k], `focus stop ${k + 1}`).toBe(element));
    };
    expectOrder([button, tab, quizPanel, ...toggles]);
    fireEvent.click(toggles[0]);
    const links = Array.from(answer(listItems(quizList())[0]).querySelectorAll<HTMLElement>("a.page-link"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([`${DEMO_PDF}#page=3`, `${DEMO_PDF}#page=6`]);
    expectOrder([button, tab, quizPanel, toggles[0], ...links, ...toggles.slice(1)]);
  });

  test("with Sammendrag selected, the quiz list already exists in the hidden panel; nothing of it is focusable (QP5)", async () => {
    await showResults();
    const quizPanel = panel("quiz");
    expect(quizPanel.hidden).toBe(true);
    expect(listItems(quizList())).toHaveLength(5);
    const order = focusOrder(main());
    const controls = Array.from(quizPanel.querySelectorAll<HTMLElement>("button, a"));
    expect(controls.length).toBeGreaterThan(0);
    for (const element of controls) expect(order).not.toContain(element);
    expect(screen.queryAllByRole("heading", { level: 4 })).toHaveLength(0);
  });

  test("toggling the quiz sends no request and writes nothing to the status region (QP6)", async () => {
    await showResults();
    await advance(0); // flushes the "Resultatene er klare" announcement
    const fetchCalls = currentFake().fetchMock.mock.calls.length;
    const requests = demoRequests().length;
    const watcher = watchRegion();
    try {
      selectQuiz();
      for (const item of listItems(quizList())) {
        fireEvent.click(toggle(item));
        fireEvent.click(toggle(item));
      }
      // A bounded window (R267-01), well below the 10 000 ms status timeout
      // (STATUS_TIMEOUT_MS), so a delayed request or announcement would also be recorded.
      await advance(0);
      await advance(1000);

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

  test("real mode: no quiz list (QP7)", async () => {
    await renderHome("real");
    expect(document.querySelector(".quiz-list")).toBeNull();
  });

  test("with a set base URL, the quiz links use it (QP8)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:9000");
    await showResults();
    const hrefs = Array.from(panel("quiz").querySelectorAll("a")).map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(
      FIXTURE_QUIZ.flatMap((item) => item.pages.map((page) => `http://localhost:9000/api/demo/sample.pdf#page=${page}`)),
    );
  });

  test("with Quiz selected: five h4 questions, all in the Quiz panel; the four h3 unchanged (QP9)", async () => {
    await showResults();
    selectQuiz();
    const all = Array.from(document.querySelectorAll("h4"));
    expect(all).toHaveLength(5);
    for (const heading of all) expect(heading.closest("#result-panel-quiz")).not.toBeNull();
    expect(screen.getAllByRole("heading", { level: 4 }).map((heading) => heading.textContent)).toEqual(
      FIXTURE_QUIZ.map((item) => item.question),
    );
    expect(Array.from(document.querySelectorAll("h3")).map((heading) => heading.textContent)).toEqual([
      "Sammendrag",
      "Nøkkelbegreper",
      "Flashkort",
      "Quiz",
    ]);
  });

  test("the deck and the quiz keep their own state across tab switches (QP10)", async () => {
    await showResults();
    selectTab("Flashkort (5)");
    fireEvent.click(deckToggle());
    fireEvent.click(deckNav("Neste"));
    expect(deckCounter().textContent).toBe("Kort 2 av 5");
    expect(deckToggle().textContent).toBe("Vis svar");

    selectQuiz();
    expect(revealedNumbers(quizList())).toEqual([]);
    fireEvent.click(toggle(listItems(quizList())[2]));
    expect(revealedNumbers(quizList())).toEqual([3]);

    for (let round = 1; round <= 2; round += 1) {
      selectTab("Flashkort (5)");
      expect(deckCounter().textContent, `round ${round}`).toBe("Kort 2 av 5");
      expect(deckToggle().textContent, `round ${round}`).toBe("Vis svar");
      expect(revealedNumbers(quizList()), `round ${round}`).toEqual([3]);
      selectQuiz();
      expect(revealedNumbers(quizList()), `round ${round}`).toEqual([3]);
      expect(deckCounter().textContent, `round ${round}`).toBe("Kort 2 av 5");
    }

    selectTab("Flashkort (5)");
    fireEvent.click(deckNav("Forrige"));
    expect(deckCounter().textContent).toBe("Kort 1 av 5");
    expect(deckToggle().textContent).toBe("Skjul svar");
    expect(deckAnswer().hidden).toBe(false);
    expect(revealedNumbers(quizList())).toEqual([3]);
  });
});
