import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import type { GenerationResponse } from "../lib/contracts";
import { isGenerationResponse } from "../lib/generation";

// The recorded demo reply, written by backend/scripts/write_fixtures.py (Story 1.13, G3).
const recorded: unknown = JSON.parse(
  readFileSync(resolve(__dirname, "../../samples/demo-response.json"), "utf8"),
);

/** A small valid reply, built fresh for each case so mutations never leak between tests. */
function valid(): GenerationResponse {
  return {
    mode: "demo",
    results: {
      summary: { text: "Sammendrag", pages: [1, 3] },
      flashcards: [{ front: "Forside", back: "Bakside", pages: [1] }],
      quiz: [{ question: "Spørsmål?", answer: "Svar", pages: [2, 5] }],
      key_concepts: [{ term: "Begrep", explanation: "Forklaring", pages: [6] }],
    },
    skipped_pages: [4],
  };
}

/** `valid()` with one change applied; `any` keeps invalid shapes expressible. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function variant(change: (body: any) => void): unknown {
  const body = valid();
  change(body);
  return body;
}

describe("isGenerationResponse: positive cases", () => {
  test("accepts the recorded demo reply (samples/demo-response.json)", () => {
    expect(isGenerationResponse(recorded)).toBe(true);
  });

  test("accepts the small valid reply", () => {
    expect(isGenerationResponse(valid())).toBe(true);
  });

  test.each<[string, (body: GenerationResponse) => void]>([
    ['mode "real"', (b) => void (b.mode = "real")],
    ["empty summary pages", (b) => void (b.results.summary.pages = [])],
    ["empty flashcard pages", (b) => void (b.results.flashcards[0].pages = [])],
    ["empty quiz pages", (b) => void (b.results.quiz[0].pages = [])],
    ["empty key-concept pages", (b) => void (b.results.key_concepts[0].pages = [])],
    ["empty flashcards", (b) => void (b.results.flashcards = [])],
    ["empty quiz", (b) => void (b.results.quiz = [])],
    ["empty key concepts", (b) => void (b.results.key_concepts = [])],
    ["empty skipped_pages", (b) => void (b.skipped_pages = [])],
    ["Norwegian text", (b) => void (b.results.summary.text = "Innkjøp, lagerstyring og vareflyt – ÆØÅ æøå")],
    ["other non-ASCII text", (b) => void (b.results.flashcards[0].front = "Größe × Δ «sitat» …")],
    ["U+FEFF-only text (text for Python)", (b) => void (b.results.flashcards[0].back = "\uFEFF")],
    ["an emoji surrogate pair (U+1F600)", (b) => void (b.results.quiz[0].answer = "\uD83D\uDE00")],
    ["a mathematical symbol pair (U+1D465)", (b) => void (b.results.key_concepts[0].term = "x \uD835\uDC65")],
    ["text with surrounding Python whitespace", (b) => void (b.results.summary.text = "\u0085 tekst \u3000")],
    ["large safe page numbers", (b) => void (b.skipped_pages = [1, 2, 9007199254740991])],
    ["several valid flashcards", (b) => void b.results.flashcards.push({ front: "F2", back: "B2", pages: [2] }, { front: "F3", back: "B3", pages: [] })],
    ["several valid quiz items", (b) => void b.results.quiz.push({ question: "Q2?", answer: "A2", pages: [1, 6] }, { question: "Q3?", answer: "A3", pages: [3] })],
    ["several valid key concepts", (b) => void b.results.key_concepts.push({ term: "T2", explanation: "E2", pages: [5] }, { term: "T3", explanation: "E3", pages: [1] })],
  ])("accepts %s", (_name, change) => {
    expect(isGenerationResponse(variant(change))).toBe(true);
  });
});

describe("isGenerationResponse: negative cases", () => {
  test.each<[string, unknown]>([
    ["null", null],
    ["a string", "not a reply"],
    ["a number", 1],
    ["an array", [valid()]],
  ])("rejects %s", (_name, value) => {
    expect(isGenerationResponse(value)).toBe(false);
  });

  test.each<[string, (body: any) => void]>([ // eslint-disable-line @typescript-eslint/no-explicit-any
    // Missing keys at every level.
    ["missing mode", (b) => void delete b.mode],
    ["missing results", (b) => void delete b.results],
    ["missing skipped_pages", (b) => void delete b.skipped_pages],
    ["missing summary", (b) => void delete b.results.summary],
    ["missing flashcards", (b) => void delete b.results.flashcards],
    ["missing quiz", (b) => void delete b.results.quiz],
    ["missing key_concepts", (b) => void delete b.results.key_concepts],
    ["missing summary text", (b) => void delete b.results.summary.text],
    ["missing summary pages", (b) => void delete b.results.summary.pages],
    ["missing flashcard back", (b) => void delete b.results.flashcards[0].back],
    ["missing quiz pages", (b) => void delete b.results.quiz[0].pages],
    ["missing key-concept term", (b) => void delete b.results.key_concepts[0].term],
    // Extra keys at every level.
    ["extra top-level key", (b) => void (b.status = "ok")],
    ["extra results key", (b) => void (b.results.extra = [])],
    ["extra summary key", (b) => void (b.results.summary.extra = 1)],
    ["extra flashcard key", (b) => void (b.results.flashcards[0].extra = "x")],
    ["extra quiz key", (b) => void (b.results.quiz[0].extra = "x")],
    ["extra key-concept key", (b) => void (b.results.key_concepts[0].extra = "x")],
    // Mode.
    ['mode "other"', (b) => void (b.mode = "other")],
    ['mode "DEMO"', (b) => void (b.mode = "DEMO")],
    ["mode as a number", (b) => void (b.mode = 1)],
    // Page values.
    ["page 0", (b) => void (b.results.summary.pages = [0])],
    ["a negative page", (b) => void (b.results.flashcards[0].pages = [-1])],
    ["a fractional page", (b) => void (b.results.quiz[0].pages = [1.5])],
    ["a page as a string", (b) => void (b.results.key_concepts[0].pages = ["1"])],
    ["a duplicate page", (b) => void (b.results.summary.pages = [1, 1])],
    ["descending pages", (b) => void (b.results.summary.pages = [2, 1])],
    ["an unsafe integer page", (b) => void (b.skipped_pages = [9007199254740992])],
    ["NaN as a page", (b) => void (b.skipped_pages = [Number.NaN])],
    ["skipped_pages not increasing", (b) => void (b.skipped_pages = [4, 4])],
    // Page lists of the wrong type.
    ["summary pages as a number", (b) => void (b.results.summary.pages = 1)],
    ["item pages as null", (b) => void (b.results.flashcards[0].pages = null)],
    ["skipped_pages as an object", (b) => void (b.skipped_pages = { 0: 4 })],
    // Text.
    ["empty text", (b) => void (b.results.summary.text = "")],
    ["spaces-only text", (b) => void (b.results.flashcards[0].front = "   ")],
    ["only U+0085 (whitespace for Python)", (b) => void (b.results.quiz[0].question = "\u0085")],
    ["only U+001C (whitespace for Python)", (b) => void (b.results.key_concepts[0].explanation = "\u001C")],
    ["only mixed Python whitespace", (b) => void (b.results.summary.text = "\t\n\u00A0\u2028\u3000")],
    ["an isolated high surrogate", (b) => void (b.results.summary.text = "a\uD800b")],
    ["a trailing high surrogate", (b) => void (b.results.flashcards[0].back = "tekst\uD83D")],
    ["an isolated low surrogate", (b) => void (b.results.quiz[0].answer = "a\uDC00b")],
    ["a reversed surrogate pair", (b) => void (b.results.key_concepts[0].term = "\uDE00\uD83D")],
    // Text fields of the wrong type.
    ["text as a number", (b) => void (b.results.summary.text = 5)],
    ["text as null", (b) => void (b.results.flashcards[0].front = null)],
    ["text as an array", (b) => void (b.results.quiz[0].question = ["Spørsmål?"])],
    // Objects and arrays of the wrong shape.
    ["results as an array", (b) => void (b.results = [])],
    ["summary as an array", (b) => void (b.results.summary = [])],
    ["flashcards as an object", (b) => void (b.results.flashcards = { 0: b.results.flashcards[0] })],
    ["a flashcard as null", (b) => void (b.results.flashcards = [null])],
    ["a quiz item as a string", (b) => void (b.results.quiz = ["Spørsmål?"])],
    ["a key concept with flashcard keys", (b) => void (b.results.key_concepts = [b.results.flashcards[0]])],
    // Every item is validated, not only the first or the last (independent review, MINOR).
    ["an invalid second flashcard (empty front)", (b) => void b.results.flashcards.push({ front: "", back: "B2", pages: [2] }, { front: "F3", back: "B3", pages: [3] })],
    ["an invalid second quiz item (page 0)", (b) => void b.results.quiz.push({ question: "Q2?", answer: "A2", pages: [0] }, { question: "Q3?", answer: "A3", pages: [3] })],
    ["an invalid second key concept (extra key)", (b) => void b.results.key_concepts.push({ term: "T2", explanation: "E2", pages: [5], extra: 1 }, { term: "T3", explanation: "E3", pages: [1] })],
    ["an invalid first flashcard before a valid one", (b) => void (b.results.flashcards = [{ front: "F1", back: "\u0085", pages: [1] }, { front: "F2", back: "B2", pages: [2] }])],
    ["an invalid first quiz item before a valid one", (b) => void (b.results.quiz = [{ question: "Q1?", answer: "A1", pages: [2, 1] }, { question: "Q2?", answer: "A2", pages: [2] }])],
    ["an invalid first key concept before a valid one", (b) => void (b.results.key_concepts = [{ term: "T1", pages: [1] }, { term: "T2", explanation: "E2", pages: [2] }])],
  ])("rejects %s", (_name, change) => {
    expect(isGenerationResponse(variant(change))).toBe(false);
  });
});

/** Python's `str.isspace()` code points (29): Python 3.13 `[c for c in range(0x110000) if chr(c).isspace()]`. */
const PYTHON_WHITESPACE_CODES = [
  0x0009, 0x000a, 0x000b, 0x000c, 0x000d, 0x001c, 0x001d, 0x001e, 0x001f, 0x0020,
  0x0085, 0x00a0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
  0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
];

function hex(code: number): string {
  return code.toString(16).toUpperCase().padStart(4, "0");
}

describe("isGenerationResponse: Python whitespace parity", () => {
  test("the list has exactly 29 distinct code points", () => {
    expect(new Set(PYTHON_WHITESPACE_CODES).size).toBe(29);
  });

  test.each(PYTHON_WHITESPACE_CODES.map((code) => [hex(code), code] as const))(
    "rejects text that is only U+%s (whitespace for Python)",
    (_hex, code) => {
      const body = valid();
      body.results.summary.text = String.fromCharCode(code);
      expect(isGenerationResponse(body)).toBe(false);
      body.results.summary.text = String.fromCharCode(code, code, code);
      expect(isGenerationResponse(body)).toBe(false);
    },
  );

  test.each([0xfeff, 0x200b, 0x180e].map((code) => [hex(code), code] as const))(
    "accepts text that is only U+%s (text for Python)",
    (_hex, code) => {
      const body = valid();
      body.results.summary.text = String.fromCharCode(code);
      expect(isGenerationResponse(body)).toBe(true);
    },
  );
});
