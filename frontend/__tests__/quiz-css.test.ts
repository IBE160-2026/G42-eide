import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

/*
 * Story 1.20, Stage C: the CSS contract for the Quiz panel (D2, D3, D5, D6; PD5; matrix rows
 * QR1–QR9). jsdom does not apply globals.css, so it is read as text, as in
 * flashcards-css.test.ts. These tests check the CSS text only; they prove nothing about browser
 * layout, list-number rendering, wrapping, zoom, text spacing, focus rendering or readability
 * (manual checks 1.20-M1–M4).
 *
 * - Comments are removed before anything is matched, so a selector named only in a comment
 *   never satisfies a check.
 * - The Story 1.20 section runs from its first rule `.quiz-list {` to the end of the file. It
 *   holds exactly six flat rules (no at-rule, no grouped or multi-line selector). A later,
 *   separately approved story that appends its own section moves the end boundary to that
 *   section's first rule, as flashcards-css.test.ts does (CC-20 item 9; QR7).
 * - Each rule is found by its exact, whole selector and must occur once; its declarations
 *   must be exactly the approved set with exact values.
 *
 * The parsing uses plain string operations (no escaped regular expressions).
 */

const CRLF = String.fromCharCode(13) + String.fromCharCode(10);
const LF = String.fromCharCode(10);

function stripComments(text: string): string {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf("/*", i);
    if (start === -1) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, start);
    const end = text.indexOf("*/", start + 2);
    i = end === -1 ? text.length : end + 2;
  }
  return out;
}

const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8").split(CRLF).join(LF);
const rules = stripComments(css);
const SECTION_ANCHOR = ".quiz-list {";
/** The Story 1.19 D3a media query, which the Story 1.20 section must follow. */
const MEDIA_QUERY = "@media (max-width: 480px)";
const CLASS_NAMES = [".quiz-list", ".quiz-item", ".quiz-item__question", ".quiz-item__answer", ".quiz-item__answer-text"];
const SELECTORS = [
  ".quiz-list",
  ".quiz-item",
  ".quiz-item + .quiz-item",
  ".quiz-item__question",
  ".quiz-item__answer",
  ".quiz-item__answer-text",
];

interface Rule {
  /** Everything before the rule's `{`, trimmed. */
  selector: string;
  /** The last line of `selector`, trimmed (used only to find `:root` in the whole file). */
  lastLine: string;
  body: string;
}

/** `selector { body }` chunks of a CSS text, split at every `}`. */
function parseRules(text: string): Rule[] {
  const parsed: Rule[] = [];
  for (const chunk of text.split("}")) {
    const open = chunk.lastIndexOf("{");
    if (open === -1) continue;
    const selector = chunk.slice(0, open).trim();
    const lines = selector.split(LF);
    parsed.push({ selector, lastLine: lines[lines.length - 1].trim(), body: chunk.slice(open + 1) });
  }
  return parsed;
}

/** The declarations of a rule body as an ordered list of [property, value]. */
function declarations(body: string): Array<[string, string]> {
  return body
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => {
      const colon = part.indexOf(":");
      return [part.slice(0, colon).trim(), part.slice(colon + 1).trim()] as [string, string];
    });
}

function count(text: string, part: string): number {
  return text.split(part).length - 1;
}

/** The Story 1.20 section: from `.quiz-list {` to the end of the file (comments removed). */
function section(): string {
  const start = rules.indexOf(SECTION_ANCHOR);
  expect(start, "the Story 1.20 section starts with .quiz-list {").toBeGreaterThan(0);
  return rules.slice(start);
}

/** The section's rules, after checking that they are flat and that nothing follows the last one. */
function sectionRules(): Rule[] {
  const text = section();
  expect(text.includes("@"), "no at-rule in the Story 1.20 section").toBe(false);
  const parsed = parseRules(text);
  for (const candidate of parsed) {
    expect(candidate.selector.includes(LF), `single-line selector: ${candidate.selector}`).toBe(false);
    expect(candidate.selector.includes(","), `no grouped selector: ${candidate.selector}`).toBe(false);
  }
  expect(text.slice(text.lastIndexOf("}") + 1).trim(), "nothing but whitespace after the last rule").toBe("");
  return parsed;
}

/**
 * Asserts that the rule with exactly this selector occurs once in the section and that its
 * declarations are exactly `expected`: the same properties (none missing, none extra, none
 * repeated) with the same values.
 */
function expectDeclarations(selector: string, expected: Record<string, string>): void {
  const found = sectionRules().filter((candidate) => candidate.selector === selector);
  expect(found, `${selector} rule exists exactly once`).toHaveLength(1);
  const actual = declarations(found[0].body);
  const properties = actual.map(([property]) => property);
  expect(new Set(properties).size, `${selector}: no duplicate property`).toBe(properties.length);
  expect([...properties].sort(), `${selector}: exactly the approved properties`).toEqual(
    Object.keys(expected).sort(),
  );
  for (const [property, value] of actual) {
    expect(value, `${selector} { ${property} }`).toBe(expected[property]);
  }
}

describe("the Quiz panel CSS (QR1–QR9)", () => {
  test("the list: no margin, a 24px left indent for the native numbers (QR1)", () => {
    expectDeclarations(".quiz-list", {
      margin: "0",
      padding: "0 0 0 var(--space-6)",
    });
  });

  test("the item card: the D-9 padding token, surface, subtle border, large radius (QR2)", () => {
    expectDeclarations(".quiz-item", {
      padding: "var(--padding-quiz-item)",
      background: "var(--color-surface)",
      border: "var(--border-hairline) solid var(--color-border-subtle)",
      "border-radius": "var(--radius-lg)",
    });
  });

  test("consecutive items are 12px apart (QR3)", () => {
    expectDeclarations(".quiz-item + .quiz-item", {
      "margin-top": "var(--space-3)",
    });
  });

  test("the question: subheading type, line breaks kept, long words wrap (QR4)", () => {
    expectDeclarations(".quiz-item__question", {
      margin: "0 0 var(--space-3)",
      "white-space": "pre-line",
      "overflow-wrap": "anywhere",
      color: "var(--color-text)",
      "font-size": "var(--font-subheading-size)",
      "font-weight": "var(--font-subheading-weight)",
      "line-height": "var(--font-subheading-line-height)",
    });
  });

  test("the answer: a 12px top margin and no display (QR5)", () => {
    expectDeclarations(".quiz-item__answer", {
      margin: "var(--space-3) 0 0",
    });
    // The hidden attribute must keep hiding the answer: no display in any rule that names it.
    for (const candidate of sectionRules()) {
      if (!candidate.selector.includes(".quiz-item__answer")) continue;
      const properties = declarations(candidate.body).map(([property]) => property);
      expect(properties.includes("display"), `${candidate.selector} has no display`).toBe(false);
    }
  });

  test("the answer text: body type, at most 65ch, a 3px primary rule, long words wrap (QR6)", () => {
    expectDeclarations(".quiz-item__answer-text", {
      "max-width": "var(--measure-answer)",
      margin: "0",
      "padding-left": "var(--space-3)",
      "border-left": "var(--border-emphasis) solid var(--color-primary)",
      "white-space": "pre-line",
      "overflow-wrap": "anywhere",
      color: "var(--color-text)",
      "font-size": "var(--font-body-size)",
      "font-weight": "var(--font-body-weight)",
      "line-height": "var(--font-body-line-height)",
    });
    const text = sectionRules().filter((candidate) => candidate.selector === ".quiz-item__answer-text");
    expect(text[0].body.includes("--font-answer-"), "no answer-type token").toBe(false);
  });

  test("the section: six flat rules in order; only defined tokens; no width/height, raw colour, vw, hyphens, .result-panel, :focus-visible, outline, ::marker, .button-secondary or .quiz-item__toggle (QR7)", () => {
    const parsed = sectionRules();
    expect(parsed.map((candidate) => candidate.selector)).toEqual(SELECTORS);
    const root = parseRules(rules).filter((candidate) => candidate.lastLine === ":root");
    expect(root, ":root rule exists once").toHaveLength(1);
    const defined = new Set(declarations(root[0].body).map(([property]) => property));
    for (const candidate of parsed) {
      for (const forbidden of [".result-panel", ":focus-visible", "::marker", ".button-secondary", ".quiz-item__toggle"]) {
        expect(candidate.selector.includes(forbidden), `${candidate.selector} names ${forbidden}`).toBe(false);
      }
      for (const [property, value] of declarations(candidate.body)) {
        // The exact property name, so max-width, padding-left and border-left are allowed.
        expect(property === "width" || property === "height", `${candidate.selector} ${property}`).toBe(false);
        expect(property.startsWith("outline"), `${candidate.selector} ${property}`).toBe(false);
        expect(property.startsWith("hyphens"), `${candidate.selector} ${property}`).toBe(false);
        expect(value.includes("#"), `${candidate.selector} ${property}: ${value}`).toBe(false);
        expect(value.includes("vw"), `${candidate.selector} ${property}: ${value}`).toBe(false);
        for (const fn of ["rgb(", "rgba(", "hsl(", "hsla("]) {
          expect(value.includes(fn), `${candidate.selector} ${property}: ${value}`).toBe(false);
        }
        if (candidate.selector === ".quiz-item__answer") {
          expect(property, `${candidate.selector} has no display`).not.toBe("display");
        }
        const tokens = value.split("var(").slice(1).map((part) => part.slice(0, part.indexOf(")")));
        for (const token of tokens) {
          expect(defined.has(token), `${token} is defined in :root`).toBe(true);
        }
      }
    }
    expect(section().includes("outline"), "no outline in the Story 1.20 section").toBe(false);
    expect(section().includes("hyphens"), "no hyphens in the Story 1.20 section").toBe(false);
  });

  test("Story 1.20 adds no at-rule and no custom property; .button-secondary { is not redefined (QR8)", () => {
    const text = section();
    expect(text.includes("@"), "no @media or other at-rule in the Story 1.20 section").toBe(false);
    for (const candidate of sectionRules()) {
      for (const [property] of declarations(candidate.body)) {
        expect(property.startsWith("--"), `${candidate.selector} declares ${property}`).toBe(false);
      }
    }
    expect(count(rules, ".button-secondary {"), ".button-secondary { occurs once in globals.css").toBe(1);
  });

  test(".quiz-list { occurs once, after the D3a block; no quiz class before it; nothing after the last rule (QR9)", () => {
    expect(rules.split(SECTION_ANCHOR)).toHaveLength(2);
    const start = rules.indexOf(SECTION_ANCHOR);
    const media = rules.indexOf(MEDIA_QUERY);
    expect(media, "the D3a media block exists").toBeGreaterThan(0);
    expect(start).toBeGreaterThan(media);
    // Outside the D3a block: every brace opened from the media query on is closed before it.
    const between = rules.slice(media, start);
    expect(count(between, "{"), "the D3a block is closed before the Story 1.20 section").toBe(count(between, "}"));
    const before = rules.slice(0, start);
    for (const name of CLASS_NAMES) {
      expect(before.includes(name), `${name} before the Story 1.20 section`).toBe(false);
    }
    const text = section();
    expect(text.slice(text.lastIndexOf("}") + 1).trim(), "nothing but whitespace after the last rule").toBe("");
  });
});
