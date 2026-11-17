import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

/*
 * Story 1.16: the CSS contract (D15, D16; matrix rows R1–R9). jsdom does not apply
 * globals.css, so it is read as text, as in globals-css.test.ts and demo-css.test.ts.
 * Comments are stripped before any rule is matched, so a selector named only in a comment
 * never satisfies a check. The Story 1.16 section runs from its first rule `.notice-info {`
 * to the end of the file (F-7).
 */

const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8").replace(/\r\n/g, "\n");
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const SECTION_ANCHOR = ".notice-info {";

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The body of the rule whose full selector is exactly `selector`. */
function ruleBody(selector: string): string {
  const match = rules.match(new RegExp(`(^|\\n)\\s*${escape(selector)}\\s*\\{([^}]*)\\}`));
  expect(match, `${selector} rule exists`).not.toBeNull();
  return match![2];
}

/** The declarations of a rule body, as trimmed `property: value` strings. */
function declarations(body: string): string[] {
  return body
    .split(";")
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter((part) => part !== "");
}

/** The Story 1.16 section: from its first rule to the end of the file (comments stripped). */
function section(): string {
  const start = rules.indexOf(SECTION_ANCHOR);
  expect(start, "the Story 1.16 section starts with .notice-info {").toBeGreaterThan(0);
  return rules.slice(start);
}

/** Every rule in the section as `{ selector, body }`. */
function sectionRules(): Array<{ selector: string; body: string }> {
  return Array.from(section().matchAll(/([^{}]+)\{([^}]*)\}/g)).map((m) => ({
    selector: m[1].trim(),
    body: m[2],
  }));
}

describe("the Story 1.16 section boundary (F-7)", () => {
  test(".notice-info { occurs once and comes after every Story 1.15 rule", () => {
    expect(rules.split(SECTION_ANCHOR)).toHaveLength(2);
    const start = rules.indexOf(SECTION_ANCHOR);
    for (const earlier of [".demo-banner {", ".error-state__detail {", ".demo-results-heading {"]) {
      expect(rules.indexOf(earlier)).toBeGreaterThan(-1);
      expect(rules.indexOf(earlier)).toBeLessThan(start);
    }
  });
});

describe("notices (R1)", () => {
  test(".notice-info uses the info tokens, an emphasis left rule and the notice padding (R1)", () => {
    const body = ruleBody(".notice-info");
    expect(body).toMatch(/background:\s*var\(--color-notice-info-bg\);/);
    expect(body).toMatch(/(^|[^-])color:\s*var\(--color-notice-info-fg\);/);
    expect(body).toMatch(
      /border-left:\s*var\(--border-emphasis\)\s+solid\s+var\(--color-notice-info-border\);/,
    );
    expect(body).toMatch(/padding:\s*var\(--padding-notice\);/);
    expect(ruleBody(".notice-info__icon")).toMatch(/flex:\s*none;/);
  });
});

describe("the locked upload bar (R2, R9)", () => {
  test(".upload-bar.upload-bar-locked: paper fill and a dashed border (R2)", () => {
    const body = ruleBody(".upload-bar.upload-bar-locked");
    expect(body).toMatch(/background:\s*var\(--color-background\);/);
    expect(body).toMatch(/border-style:\s*dashed;/);
    // The width and colour of the border stay those of the existing .upload-bar rule.
    expect(body).not.toMatch(/(^|[^-])border:/);
    expect(ruleBody(".upload-bar")).toMatch(
      /border:\s*var\(--border-hairline\)\s+solid\s+var\(--color-border\);/,
    );
  });

  test("Låst, the locked settings and the notice paragraph use their tokens (R9)", () => {
    const lock = ruleBody(".upload-bar__lock");
    for (const part of ["size", "weight", "line-height"]) {
      expect(lock).toMatch(new RegExp(`var\\(--font-caption-${part}\\)`));
    }
    expect(lock).toMatch(/(^|[^-])color:\s*var\(--color-text-muted\);/);
    // Låst takes its own line at the start of the bar (D15, approved at G0).
    expect(lock).toMatch(/flex-basis:\s*100%;/);

    const dt = ruleBody(".locked-settings dt");
    for (const part of ["size", "weight", "line-height"]) {
      expect(dt).toMatch(new RegExp(`var\\(--font-caption-${part}\\)`));
    }
    expect(dt).toMatch(/(^|[^-])color:\s*var\(--color-text-muted\);/);

    const dd = ruleBody(".locked-settings dd");
    expect(dd).toMatch(/(^|[^-])margin:\s*0;/);
    for (const part of ["size", "weight", "line-height"]) {
      expect(dd).toMatch(new RegExp(`var\\(--font-settings-value-${part}\\)`));
    }
    expect(dd).toMatch(/(^|[^-])color:\s*var\(--color-text\);/);
    expect(dd).toMatch(/min-height:\s*var\(--control-min-height\);/);

    expect(ruleBody(".notice-info p")).toMatch(/(^|[^-])margin:\s*0;/);
  });
});

describe("the result tabs and panels (R3, R4, R5)", () => {
  test(".result-tab resets the button border and uses the ui and muted tokens (R3)", () => {
    const body = ruleBody(".result-tab");
    expect(body).toMatch(/(^|[^-])border:\s*0;/);
    expect(body).toMatch(/border-bottom:\s*var\(--border-emphasis\)\s+solid\s+transparent;/);
    for (const part of ["size", "weight", "line-height"]) {
      expect(body).toMatch(new RegExp(`var\\(--font-ui-${part}\\)`));
    }
    expect(body).toMatch(/(^|[^-])color:\s*var\(--color-text-muted\);/);
    expect(body).toMatch(/min-height:\s*var\(--control-min-height\);/);
    // The reset comes before the bottom border, so the bottom border wins.
    expect(body.indexOf("border: 0")).toBeLessThan(body.indexOf("border-bottom:"));
  });

  test("hover changes only the background; the selected tab keeps its indicator (R4)", () => {
    expect(declarations(ruleBody(".result-tab:hover"))).toEqual([
      "background: var(--color-hover-tint)",
    ]);
    const selected = ruleBody('.result-tab[aria-selected="true"]');
    expect(selected).toMatch(/(^|[^-])color:\s*var\(--color-primary\);/);
    expect(selected).toMatch(/font-weight:\s*var\(--font-subheading-weight\);/);
    expect(selected).toMatch(/border-bottom-color:\s*var\(--color-primary\);/);
  });

  test("no display on .result-panel, so [hidden] panels stay hidden; a --space-* padding (R5)", () => {
    const panelRules = sectionRules().filter((rule) => rule.selector.includes(".result-panel"));
    expect(panelRules.length).toBeGreaterThan(0);
    for (const rule of panelRules) expect(rule.body).not.toMatch(/(^|[^-])display\s*:/);
    expect(ruleBody(".result-panel")).toMatch(/padding:\s*var\(--space-[1-8]\);/);
  });
});

describe("wrapping and restrictions (R6, R7, R8)", () => {
  test(".result-tabs, .locked-settings and .upload-bar wrap (R6)", () => {
    for (const selector of [".result-tabs", ".locked-settings", ".upload-bar"]) {
      expect(ruleBody(selector), selector).toMatch(/flex-wrap:\s*wrap;/);
    }
  });

  test("the section has no width:/height:, no raw colour and no rgb()/hsl() (R7)", () => {
    const added = section();
    expect(added).not.toMatch(/(^|[^-\w])width\s*:/i);
    expect(added).not.toMatch(/(^|[^-\w])height\s*:/i);
    expect(added).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(added).not.toMatch(/\b(rgba?|hsla?)\(/i);
    expect(sectionRules().length).toBeGreaterThan(10);
  });

  test("still 27 colour tokens and one :focus-visible rule (R8)", () => {
    expect(rules.match(/--color-[a-z-]+\s*:/g)).toHaveLength(27);
    expect(rules.match(/:focus-visible/g)).toHaveLength(1);
    expect(section()).not.toMatch(/--color-[a-z-]+\s*:/);
    expect(section()).not.toMatch(/outline\s*:\s*none/i);
  });
});
