import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

/*
 * Story 1.17, Stage C: the CSS contract for the summary text and the page links (D5, D9,
 * D10; matrix rows CR1–CR7). jsdom does not apply globals.css, so it is read as text, as in
 * globals-css.test.ts, demo-css.test.ts and results-css.test.ts. These tests check the CSS
 * text only; they prove nothing about browser layout or screen-reader output.
 *
 * - Comments are removed before anything is matched, so a selector named only in a comment
 *   never satisfies a check.
 * - The Story 1.17 section runs from its first rule `.summary-text {` to the end of the file.
 *   It must be flat: no at-rule (`@media`, `@supports`, …) and no grouped or multi-line
 *   selector, so the simple parser below cannot hide a wrapper or an extra selector (M1).
 * - Each rule is found by its exact, whole selector and must occur once; its declarations
 *   must be exactly the approved set — no missing, extra or duplicate property — with exact
 *   values (M2).
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
const SECTION_ANCHOR = ".summary-text {";

interface Rule {
  /** Everything before the rule's `{`, trimmed (several lines if anything else precedes it). */
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
  expect(start, "the Story 1.17 section starts with .summary-text {").toBeGreaterThan(0);
  return rules.slice(start);
}

/** The section's rules, after checking it is flat (M1). */
function sectionRules(): Rule[] {
  const text = section();
  expect(text.includes("@"), "no at-rule in the Story 1.17 section").toBe(false);
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
 * repeated) with the same values (M2).
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

/** The small type role (`--font-small-*`, D5). */
const SMALL = {
  "font-size": "var(--font-small-size)",
  "font-weight": "var(--font-small-weight)",
  "line-height": "var(--font-small-line-height)",
};

describe("the Story 1.17 section boundary", () => {
  test(".summary-text { occurs once, after the Story 1.16 section", () => {
    expect(rules.split(SECTION_ANCHOR)).toHaveLength(2);
    expect(rules.indexOf(".notice-info {")).toBeGreaterThan(-1);
    expect(rules.indexOf(".notice-info {")).toBeLessThan(rules.indexOf(SECTION_ANCHOR));
  });
});

describe("summary text and page links (CR1–CR7)", () => {
  test("summary text keeps line breaks with the body tokens (CR1)", () => {
    expectDeclarations(".summary-text", {
      margin: "0",
      "white-space": "pre-line",
      "overflow-wrap": "anywhere",
      color: "var(--color-text)",
      "font-size": "var(--font-body-size)",
      "font-weight": "var(--font-body-weight)",
      "line-height": "var(--font-body-line-height)",
    });
  });

  test("a page link is an underlined, centred inline-flex target of at least 24px (CR2)", () => {
    expectDeclarations(".page-link", {
      display: "inline-flex",
      "align-items": "center",
      "min-height": "var(--target-min)",
      padding: "0 var(--space-1)",
      color: "var(--color-primary)",
      "text-decoration": "underline",
      "text-underline-offset": "3px",
      ...SMALL,
    });
  });

  test("the separator keeps its spaces, muted, in small type (CR3)", () => {
    expectDeclarations(".page-links__separator", {
      "white-space": "pre",
      color: "var(--color-text-muted)",
      ...SMALL,
    });
  });

  test("the link row is a block in normal flow: margin and small type only, no flex, no gap (CR4)", () => {
    // The exact property set also rules out display and gap.
    expectDeclarations(".page-links", { margin: "var(--space-3) 0 0", ...SMALL });
  });

  test("the new rules: flat, exact selectors, no width/height, no raw colour, no .result-panel, only defined tokens (CR5)", () => {
    const parsed = sectionRules();
    expect(parsed.map((candidate) => candidate.selector)).toEqual([
      ".summary-text",
      ".page-links",
      ".page-link",
      '.page-link > [aria-hidden="true"]',
      ".page-links__item",
      ".page-links__separator",
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
        for (const token of value.split("var(").slice(1).map((part) => part.slice(0, part.indexOf(")")))) {
          expect(defined.has(token), `${token} is defined in :root`).toBe(true);
        }
      }
    }
  });

  test("the space before the arrow is kept inside the inline-flex link (CR6)", () => {
    expectDeclarations('.page-link > [aria-hidden="true"]', { "white-space": "pre" });
  });

  test("each separator wraps together with the following link (CR7)", () => {
    expectDeclarations(".page-links__item", { display: "inline-block" });
  });
});
