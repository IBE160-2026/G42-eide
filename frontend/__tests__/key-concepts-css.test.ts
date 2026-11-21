import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

/*
 * Story 1.18, Stage C: the CSS contract for the Nøkkelbegreper panel (D2, D3; matrix rows
 * KR1–KR6). jsdom does not apply globals.css, so it is read as text, as in
 * summary-css.test.ts. These tests check the CSS text only; they prove nothing about browser
 * layout, wrapping or zoom (manual check 1.18-M2).
 *
 * - Comments are removed before anything is matched, so a selector named only in a comment
 *   never satisfies a check.
 * - The Story 1.18 section runs from its first rule `.key-concepts {` to the first rule of the
 *   Story 1.19 section, `.button-secondary {` (Story 1.19 CC-19 item 7; the end boundary moved
 *   as recorded in Story 1.18 D2, OQ5). It must be flat: no at-rule and no grouped or
 *   multi-line selector.
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
const SECTION_ANCHOR = ".key-concepts {";
/** The first rule of the Story 1.19 section, which ends the Story 1.18 section. */
const NEXT_SECTION_ANCHOR = ".button-secondary {";
const CLASS_NAMES = [".key-concepts", ".key-concept", ".key-concept__term", ".key-concept__explanation"];

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

function section(): string {
  const start = rules.indexOf(SECTION_ANCHOR);
  expect(start, "the Story 1.18 section starts with .key-concepts {").toBeGreaterThan(0);
  const end = rules.indexOf(NEXT_SECTION_ANCHOR);
  expect(end, "the Story 1.19 section starts after the Story 1.18 section").toBeGreaterThan(start);
  return rules.slice(start, end);
}

/** The section's rules, after checking it is flat. */
function sectionRules(): Rule[] {
  const text = section();
  expect(text.includes("@"), "no at-rule in the Story 1.18 section").toBe(false);
  const parsed = parseRules(text);
  for (const candidate of parsed) {
    expect(candidate.selector.includes(LF), `single-line selector: ${candidate.selector}`).toBe(false);
    expect(candidate.selector.includes(","), `no grouped selector: ${candidate.selector}`).toBe(false);
  }
  // Nothing but whitespace may follow the last rule.
  expect(text.slice(text.lastIndexOf("}") + 1).trim()).toBe("");
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

/** Plain text that keeps its line breaks and wraps long words, in the text colour (D2, D3). */
const TEXT = {
  "white-space": "pre-line",
  "overflow-wrap": "anywhere",
  color: "var(--color-text)",
  "font-size": "var(--font-body-size)",
  "line-height": "var(--font-body-line-height)",
};

describe("the Nøkkelbegreper panel CSS (KR1–KR6)", () => {
  test("the list has no margin, padding or bullets (KR1)", () => {
    expectDeclarations(".key-concepts", { margin: "0", padding: "0", "list-style": "none" });
  });

  test("concepts are separated by spacing only (KR2)", () => {
    expectDeclarations(".key-concept + .key-concept", { "margin-top": "var(--space-6)" });
  });

  test("the term: body type at weight 600, line breaks kept, long words wrap (KR3)", () => {
    expectDeclarations(".key-concept__term", {
      margin: "0",
      ...TEXT,
      "font-weight": "var(--font-subheading-weight)",
    });
  });

  test("the explanation: body type, line breaks kept, long words wrap (KR4)", () => {
    expectDeclarations(".key-concept__explanation", {
      margin: "var(--space-1) 0 0",
      ...TEXT,
      "font-weight": "var(--font-body-weight)",
    });
  });

  test("the section: flat, exact selectors, only defined tokens, no width/height, no raw colour, no .result-panel (KR5)", () => {
    const parsed = sectionRules();
    expect(parsed.map((candidate) => candidate.selector)).toEqual([
      ".key-concepts",
      ".key-concept + .key-concept",
      ".key-concept__term",
      ".key-concept__explanation",
    ]);
    const root = parseRules(rules).filter((candidate) => candidate.lastLine === ":root");
    expect(root, ":root rule exists once").toHaveLength(1);
    const defined = new Set(declarations(root[0].body).map(([property]) => property));
    for (const candidate of parsed) {
      expect(candidate.selector.includes(".result-panel"), candidate.selector).toBe(false);
      for (const [property, value] of declarations(candidate.body)) {
        expect(property === "width" || property === "height", `${candidate.selector} ${property}`).toBe(false);
        expect(value.includes("#"), `${candidate.selector} ${property}: ${value}`).toBe(false);
        for (const fn of ["rgb(", "rgba(", "hsl(", "hsla("]) {
          expect(value.includes(fn), `${candidate.selector} ${property}: ${value}`).toBe(false);
        }
        const tokens = value.split("var(").slice(1).map((part) => part.slice(0, part.indexOf(")")));
        for (const token of tokens) {
          expect(defined.has(token), `${token} is defined in :root`).toBe(true);
        }
      }
    }
  });

  test(".key-concepts { occurs once, after the Story 1.17 section; no new class appears before it (KR6)", () => {
    expect(rules.split(SECTION_ANCHOR)).toHaveLength(2);
    const start = rules.indexOf(SECTION_ANCHOR);
    const separator = rules.indexOf(".page-links__separator {");
    expect(separator, "the Story 1.17 separator rule exists").toBeGreaterThan(0);
    expect(start).toBeGreaterThan(separator);
    const before = rules.slice(0, start);
    for (const name of CLASS_NAMES) {
      expect(before.includes(name), `${name} before the Story 1.18 section`).toBe(false);
    }
    // The Story 1.19 section starts exactly once, after the last Story 1.18 rule.
    expect(rules.split(NEXT_SECTION_ANCHOR)).toHaveLength(2);
    expect(rules.indexOf(NEXT_SECTION_ANCHOR)).toBeGreaterThan(rules.indexOf(".key-concept__explanation {"));
  });
});
