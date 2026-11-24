import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

/*
 * Story 1.19, Stage C: the CSS contract for the Flashkort panel and the secondary button
 * (D3, D3a, D4, D9; matrix rows FR1–FR13). jsdom does not apply globals.css, so it is read as
 * text, as in key-concepts-css.test.ts. These tests check the CSS text only; they prove nothing
 * about browser layout, wrapping, zoom, hover, focus rendering or which padding a browser
 * applies at a given width (manual checks 1.19-M1–M4).
 *
 * - Comments are removed before anything is matched, so a selector named only in a comment
 *   never satisfies a check.
 * - The Story 1.19 section runs from its first rule `.button-secondary {` up to the Story 1.20
 *   section's first rule `.quiz-list {` (CC-20 item 9). It is split at its first `@`: before it, the ten flat rules (no at-rule, no grouped
 *   or multi-line selector; D9); from it, exactly the one D3a block
 *   `@media (max-width: 480px) { .flashcard { padding: var(--space-7) var(--space-4); } }`,
 *   matched on its own, so its nested `.flashcard` is never read as an eleventh flat rule
 *   (FR11, FR13). A later story that appends its own section moves the end boundary.
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
const SECTION_ANCHOR = ".button-secondary {";
/** The first rule of the Story 1.20 section, which ends the Story 1.19 section. */
const NEXT_SECTION_ANCHOR = ".quiz-list {";
const CLASS_NAMES = [
  ".button-secondary",
  ".flashcard-deck",
  ".flashcard",
  ".flashcard__counter",
  ".flashcard__term",
  ".flashcard__answer",
  ".flashcard__answer-text",
  ".flashcard-nav",
];
const SELECTORS = [
  ".button-secondary",
  '.button-secondary:hover:not([aria-disabled="true"])',
  '.button-secondary[aria-disabled="true"]',
  ".flashcard-deck",
  ".flashcard",
  ".flashcard__counter",
  ".flashcard__term",
  ".flashcard__answer",
  ".flashcard__answer-text",
  ".flashcard-nav",
];
/** The D3a media query, exactly as approved. */
const MEDIA_QUERY = "@media (max-width: 480px)";

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
  expect(start, "the Story 1.19 section starts with .button-secondary {").toBeGreaterThan(0);
  const end = rules.indexOf(NEXT_SECTION_ANCHOR);
  expect(end, "the Story 1.20 section starts after the Story 1.19 section").toBeGreaterThan(start);
  return rules.slice(start, end);
}

/** The section split at its first `@`: the flat rules before it, the D3a block from it. */
function splitSection(): { flat: string; media: string } {
  const text = section();
  const at = text.indexOf("@");
  expect(at, "the Story 1.19 section has the D3a media block").toBeGreaterThan(0);
  return { flat: text.slice(0, at), media: text.slice(at) };
}

/** The section's ten flat rules (everything before the D3a block), after checking they are flat. */
function sectionRules(): Rule[] {
  const { flat } = splitSection();
  expect(flat.includes("@"), "no at-rule among the flat Story 1.19 rules").toBe(false);
  const parsed = parseRules(flat);
  for (const candidate of parsed) {
    expect(candidate.selector.includes(LF), `single-line selector: ${candidate.selector}`).toBe(false);
    expect(candidate.selector.includes(","), `no grouped selector: ${candidate.selector}`).toBe(false);
  }
  // Nothing but whitespace lies between the last flat rule and the media block.
  expect(flat.slice(flat.lastIndexOf("}") + 1).trim()).toBe("");
  return parsed;
}

function count(text: string, part: string): number {
  return text.split(part).length - 1;
}

/**
 * The D3a block, checked to be exactly `MEDIA_QUERY { <selector> { <body> } }` with nothing
 * after it: one at-rule, two opening and two closing braces, the closing brace last.
 */
function mediaBlock(): { query: string; selector: string; body: string } {
  const media = splitSection().media.trim();
  expect(count(media, "@"), "exactly one at-rule in the Story 1.19 section").toBe(1);
  expect(count(media, "{"), "the media block holds exactly one nested rule").toBe(2);
  expect(count(media, "}"), "the media block holds exactly one nested rule").toBe(2);
  expect(media.endsWith("}"), "nothing follows the media block").toBe(true);
  const outerOpen = media.indexOf("{");
  const inner = media.slice(outerOpen + 1, media.length - 1);
  const innerOpen = inner.indexOf("{");
  const innerClose = inner.indexOf("}");
  expect(innerOpen, "the nested rule opens inside the media block").toBeGreaterThan(-1);
  expect(innerClose, "the nested rule closes inside the media block").toBeGreaterThan(innerOpen);
  expect(inner.slice(innerClose + 1).trim(), "nothing after the nested rule").toBe("");
  return {
    query: media.slice(0, outerOpen).trim(),
    selector: inner.slice(0, innerOpen).trim(),
    body: inner.slice(innerOpen + 1, innerClose),
  };
}

/** Every character except whitespace, lower-cased (to compare media queries loosely). */
function compact(text: string): string {
  return [...text].filter((ch) => ch.trim() !== "").join("").toLowerCase();
}

/**
 * The media queries in the whole file (comments removed) whose condition is a `max-width` of
 * 480px in any spelling: any whitespace, any case (including the `@media` keyword itself, as
 * CSS at-keywords are case-insensitive; R227-01), and any numeric form equal to 480 (`480`,
 * `480.0`, `0480`). Other media queries, such as the reduced-motion block, are not counted.
 */
function widthQueries480(): string[] {
  // The next `@media` at or after `start`, in any case. Each `@` is compared in place, so the
  // offsets stay those of `rules` (lower-casing the whole text could change its length).
  const nextMedia = (start: number): number => {
    let at = rules.indexOf("@", start);
    while (at !== -1 && rules.slice(at, at + 6).toLowerCase() !== "@media") at = rules.indexOf("@", at + 1);
    return at;
  };
  const found: string[] = [];
  let from = nextMedia(0);
  while (from !== -1) {
    const open = rules.indexOf("{", from);
    const query = rules.slice(from, open === -1 ? rules.length : open);
    const flat = compact(query);
    const key = "max-width:";
    const at = flat.indexOf(key);
    if (at !== -1) {
      const value = flat.slice(at + key.length, flat.indexOf(")", at));
      if (value.endsWith("px") && Number(value.slice(0, -2)) === 480) found.push(query.trim());
    }
    from = nextMedia(from + 1);
  }
  return found;
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

describe("the Flashkort panel and secondary button CSS (FR1–FR13)", () => {
  test("the secondary button: outlined primary, UI type, control height (FR1)", () => {
    expectDeclarations(".button-secondary", {
      display: "inline-flex",
      "align-items": "center",
      "justify-content": "center",
      gap: "var(--space-2)",
      "min-height": "var(--control-min-height)",
      padding: "var(--space-2) var(--space-5)",
      background: "var(--color-surface)",
      color: "var(--color-primary)",
      border: "var(--border-hairline) solid var(--color-primary)",
      "border-radius": "var(--radius-md)",
      "font-family": "var(--font-family)",
      "font-size": "var(--font-ui-size)",
      "font-weight": "var(--font-ui-weight)",
      "line-height": "var(--font-ui-line-height)",
      cursor: "pointer",
    });
  });

  test("the secondary button hover tint, only when not aria-disabled (FR2)", () => {
    expectDeclarations('.button-secondary:hover:not([aria-disabled="true"])', {
      background: "var(--color-hover-tint)",
    });
  });

  test("the aria-disabled secondary button: disabled colours, dashed border (FR3)", () => {
    expectDeclarations('.button-secondary[aria-disabled="true"]', {
      background: "var(--color-disabled-bg)",
      color: "var(--color-disabled-fg)",
      border: "var(--border-hairline) dashed var(--color-disabled-border)",
      cursor: "not-allowed",
    });
  });

  test("the deck: a centred column (FR4)", () => {
    expectDeclarations(".flashcard-deck", {
      display: "flex",
      "flex-direction": "column",
      "align-items": "center",
      gap: "var(--space-4)",
    });
  });

  test("the card uses the Story 1.4 D-9 padding token (FR5)", () => {
    expectDeclarations(".flashcard", {
      "align-self": "stretch",
      padding: "var(--padding-flashcard)",
      background: "var(--color-surface)",
      border: "var(--border-hairline) solid var(--color-border-subtle)",
      "border-radius": "var(--radius-lg)",
      "text-align": "center",
    });
  });

  test("the counter: muted small text (FR6)", () => {
    expectDeclarations(".flashcard__counter", {
      margin: "0",
      color: "var(--color-text-muted)",
      "font-size": "var(--font-small-size)",
      "font-weight": "var(--font-small-weight)",
      "line-height": "var(--font-small-line-height)",
    });
  });

  test("the term: flashcard-term type, line breaks kept, long words wrap (FR7)", () => {
    expectDeclarations(".flashcard__term", {
      margin: "0 0 var(--space-5)",
      "white-space": "pre-line",
      "overflow-wrap": "anywhere",
      color: "var(--color-text)",
      "font-size": "var(--font-flashcard-term-size)",
      "font-weight": "var(--font-flashcard-term-weight)",
      "line-height": "var(--font-flashcard-term-line-height)",
    });
  });

  test("the answer: answer type, at most the answer measure, no display (FR8)", () => {
    expectDeclarations(".flashcard__answer", {
      "max-width": "var(--measure-answer)",
      margin: "var(--space-5) auto 0",
      "padding-top": "var(--space-5)",
      "border-top": "var(--border-hairline) solid var(--color-border-subtle)",
      "text-align": "left",
      "font-size": "var(--font-answer-size)",
      "font-weight": "var(--font-answer-weight)",
      "line-height": "var(--font-answer-line-height)",
    });
    // The hidden attribute must keep hiding the answer: no display in any rule that names it.
    for (const candidate of sectionRules()) {
      if (!candidate.selector.includes(".flashcard__answer")) continue;
      const properties = declarations(candidate.body).map(([property]) => property);
      expect(properties.includes("display"), `${candidate.selector} has no display`).toBe(false);
    }
  });

  test("the answer text: no font declarations, line breaks kept, long words wrap (FR9)", () => {
    expectDeclarations(".flashcard__answer-text", {
      margin: "0",
      "white-space": "pre-line",
      "overflow-wrap": "anywhere",
      color: "var(--color-text)",
    });
  });

  test("Forrige / Neste: a centred row that wraps (FR10)", () => {
    expectDeclarations(".flashcard-nav", {
      display: "flex",
      "flex-wrap": "wrap",
      "justify-content": "center",
      gap: "var(--space-3)",
    });
  });

  test("the section: ten flat rules in order, then only the D3a block; only defined tokens, no width/height, raw colour, .result-panel, :focus-visible or outline (FR11)", () => {
    const parsed = sectionRules();
    expect(parsed.map((candidate) => candidate.selector)).toEqual(SELECTORS);
    // After the ten flat rules: exactly the one D3a block, one nested .flashcard rule with one
    // padding declaration, and nothing after it (mediaBlock() checks the braces and the end).
    const media = mediaBlock();
    expect(media.query).toBe(MEDIA_QUERY);
    expect(media.selector).toBe(".flashcard");
    expect(declarations(media.body)).toEqual([["padding", "var(--space-7) var(--space-4)"]]);
    const nested: Rule = { selector: media.selector, lastLine: media.selector, body: media.body };
    const root = parseRules(rules).filter((candidate) => candidate.lastLine === ":root");
    expect(root, ":root rule exists once").toHaveLength(1);
    const defined = new Set(declarations(root[0].body).map(([property]) => property));
    for (const candidate of [...parsed, nested]) {
      expect(candidate.selector.includes(".result-panel"), candidate.selector).toBe(false);
      expect(candidate.selector.includes(":focus-visible"), candidate.selector).toBe(false);
      for (const [property, value] of declarations(candidate.body)) {
        expect(property === "width" || property === "height", `${candidate.selector} ${property}`).toBe(false);
        expect(property.startsWith("outline"), `${candidate.selector} ${property}`).toBe(false);
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
    expect(section().includes("outline"), "no outline in the Story 1.19 section").toBe(false);
    // The D-9 binding itself is unchanged in :root (D3).
    const padding = declarations(root[0].body).filter(([property]) => property === "--padding-flashcard");
    expect(padding).toEqual([["--padding-flashcard", "32px 48px"]]);
  });

  test(".button-secondary { occurs once, after the Story 1.18 section; no new class appears before it (FR12)", () => {
    expect(rules.split(SECTION_ANCHOR)).toHaveLength(2);
    const start = rules.indexOf(SECTION_ANCHOR);
    const explanation = rules.indexOf(".key-concept__explanation {");
    expect(explanation, "the Story 1.18 explanation rule exists").toBeGreaterThan(0);
    expect(start).toBeGreaterThan(explanation);
    const before = rules.slice(0, start);
    for (const name of CLASS_NAMES) {
      expect(before.includes(name), `${name} before the Story 1.19 section`).toBe(false);
    }
    // CC-20 item 9: the Story 1.20 section starts once, after the D3a block.
    expect(rules.split(NEXT_SECTION_ANCHOR)).toHaveLength(2);
    expect(rules.indexOf(NEXT_SECTION_ANCHOR)).toBeGreaterThan(rules.indexOf(MEDIA_QUERY));
  });

  test("the D3a block: once, 480px, after .flashcard-nav, only .flashcard { padding: var(--space-7) var(--space-4) }; base padding and tokens unchanged (FR13)", () => {
    // 1, 2: the approved query occurs exactly once in the file, with exactly a 480px breakpoint.
    expect(count(rules, MEDIA_QUERY), `${MEDIA_QUERY} occurs once in globals.css`).toBe(1);
    const media = mediaBlock();
    expect(media.query).toBe(MEDIA_QUERY);
    // R224-01: no other media query anywhere in the file has a 480px max-width, in any
    // spelling; other media queries (the reduced-motion block) are not restricted.
    expect(widthQueries480(), "exactly one 480px max-width media query in globals.css").toEqual([MEDIA_QUERY]);
    // 3: after the .flashcard-nav rule, which is the last flat rule.
    const navAt = rules.indexOf(".flashcard-nav {");
    expect(navAt, "the .flashcard-nav rule exists").toBeGreaterThan(0);
    expect(rules.indexOf(MEDIA_QUERY)).toBeGreaterThan(navAt);
    expect(sectionRules().map((candidate) => candidate.selector).at(-1)).toBe(".flashcard-nav");
    // 4-6: exactly one nested selector with exactly one declaration.
    expect(media.selector).toBe(".flashcard");
    expect(declarations(media.body)).toEqual([["padding", "var(--space-7) var(--space-4)"]]);
    // 7, 8, 10: the spacing tokens and the desktop padding token keep their values.
    const root = parseRules(rules).filter((candidate) => candidate.lastLine === ":root");
    expect(root, ":root rule exists once").toHaveLength(1);
    const tokens = new Map(declarations(root[0].body));
    expect(tokens.get("--space-7")).toBe("32px");
    expect(tokens.get("--space-4")).toBe("16px");
    expect(tokens.get("--padding-flashcard")).toBe("32px 48px");
    // 9: the base .flashcard rule keeps the D3 padding.
    const base = sectionRules().filter((candidate) => candidate.selector === ".flashcard");
    expect(base, "the base .flashcard rule exists once").toHaveLength(1);
    expect(declarations(base[0].body).filter(([property]) => property === "padding")).toEqual([
      ["padding", "var(--padding-flashcard)"],
    ]);
  });
});
