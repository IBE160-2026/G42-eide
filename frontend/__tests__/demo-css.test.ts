import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

/*
 * Story 1.15: the CSS added for the demo screen (rows B6 and G4; D6, D15, D17, D19).
 * jsdom does not apply globals.css, so it is read as text, as in globals-css.test.ts
 * (whose general limits — no fixed height, one :focus-visible, 27 colour tokens, no raw
 * colours — keep applying to the whole file). Helpers are local to this module.
 */

const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8").replace(/\r\n/g, "\n");
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The body of the rule whose full selector (list) is exactly `selector`. */
function ruleBody(selector: string): string {
  const pattern = selector
    .split(",")
    .map((part) => escape(part.trim()))
    .join(",\\s*");
  const match = rules.match(new RegExp(`(^|\\n)\\s*${pattern}\\s*\\{([^}]*)\\}`));
  expect(match, `${selector} rule exists`).not.toBeNull();
  return match![2];
}

describe("loading indicator and reduced motion (B6, D6)", () => {
  test("the arc animates", () => {
    const arc = ruleBody(".loading-indicator__arc");
    expect(arc).toMatch(/animation:\s*loading-indicator-turn\b[^;]*infinite;/);
    expect(arc).toMatch(/color:\s*var\(--color-primary\);/);
    expect(ruleBody(".loading-indicator__track")).toMatch(/color:\s*var\(--color-border-subtle\);/);
    expect(rules).toMatch(/@keyframes\s+loading-indicator-turn\s*\{\s*to\s*\{\s*transform:\s*rotate\(360deg\);\s*\}\s*\}/);
  });

  test("a prefers-reduced-motion: reduce rule makes it static", () => {
    expect(rules).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.loading-indicator__arc\s*\{\s*animation:\s*none;\s*\}\s*\}/,
    );
  });
});

describe("disabled controls (G4, D19)", () => {
  test("a separate :disabled / :disabled:hover rule keeps Last opp disabled-looking on hover", () => {
    const body = ruleBody(".button-primary:disabled, .button-primary:disabled:hover");
    expect(body).toMatch(/background:\s*var\(--color-disabled-bg\);/);
    expect(body).toMatch(/color:\s*var\(--color-disabled-fg\);/);
    expect(body).toMatch(/border:\s*var\(--border-hairline\) dashed var\(--color-disabled-border\);/);
    expect(body).toMatch(/cursor:\s*not-allowed;/);
    // It comes after the existing hover rule, which has the same specificity (0,3,0).
    const hoverAt = rules.indexOf('.button-primary:hover:not([aria-disabled="true"])');
    const disabledAt = rules.indexOf(".button-primary:disabled,");
    expect(hoverAt).toBeGreaterThanOrEqual(0);
    expect(disabledAt).toBeGreaterThan(hoverAt);
  });

  test("the existing hover and aria-disabled rules are unchanged", () => {
    expect(ruleBody('.button-primary:hover:not([aria-disabled="true"])').replace(/\s+/g, " ").trim()).toBe(
      "background: var(--color-primary-hover); color: var(--color-on-primary); border-color: var(--color-primary-hover);",
    );
    expect(ruleBody('.button-primary[aria-disabled="true"]').replace(/\s+/g, " ").trim()).toBe(
      "background: var(--color-disabled-bg); color: var(--color-disabled-fg); border: var(--border-hairline) dashed var(--color-disabled-border); cursor: not-allowed;",
    );
  });

  test("disabled selects keep a readable explicit colour and no fading", () => {
    const body = ruleBody(".settings-field select:disabled");
    expect(body).toMatch(/color:\s*var\(--color-disabled-fg\);/);
    expect(body).toMatch(/background:\s*var\(--color-disabled-bg\);/);
    expect(body).toMatch(/border:\s*var\(--border-hairline\) solid var\(--color-disabled-border\);/);
    expect(body).toMatch(/opacity:\s*1;/);
    expect(body).toMatch(/-webkit-text-fill-color:\s*var\(--color-disabled-fg\);/);
  });
});

describe("texts, notices and the error detail (G4, D2, D8, D17)", () => {
  test("the error detail line is small and muted", () => {
    const body = ruleBody(".error-state__detail");
    expect(body).toMatch(/color:\s*var\(--color-text-muted\);/);
    expect(body).toMatch(/font-size:\s*var\(--font-small-size\);/);
  });

  test("long words in the error headline and action wrap (appended rule; existing rule unchanged)", () => {
    const appendedAt = rules.indexOf(".demo-banner {");
    const wrap = rules.slice(appendedAt).match(/(^|\n)\s*\.error-state__content\s*\{([^}]*)\}/);
    expect(wrap?.[2]).toMatch(/overflow-wrap:\s*anywhere;/);
    // The original Story 1.5 rule (before the Story 1.15 section) is unchanged.
    expect(ruleBody(".error-state__content").replace(/\s+/g, " ").trim()).toBe("min-width: 0;");
  });

  test("the disabled selects use the settings-value typography tokens", () => {
    const select = ruleBody(".settings-field select");
    expect(select).toMatch(/font-size:\s*var\(--font-settings-value-size\);/);
    expect(select).toMatch(/font-weight:\s*var\(--font-settings-value-weight\);/);
    expect(select).toMatch(/line-height:\s*var\(--font-settings-value-line-height\);/);
  });

  test("the guidance is muted body text and the note muted small text", () => {
    const guidance = ruleBody(".demo-guidance");
    expect(guidance).toMatch(/color:\s*var\(--color-text-muted\);/);
    expect(guidance).toMatch(/font-size:\s*var\(--font-body-size\);/);
    const note = ruleBody(".settings-note");
    expect(note).toMatch(/color:\s*var\(--color-text-muted\);/);
    expect(note).toMatch(/font-size:\s*var\(--font-small-size\);/);
  });

  test("the DEMO banner and the Verification Notice use their tokens", () => {
    const banner = ruleBody(".demo-banner");
    expect(banner).toMatch(/font-weight:\s*var\(--font-ui-weight\);/);
    expect(banner).not.toMatch(/font-weight:\s*\d/);
    expect(banner).toMatch(/background:\s*var\(--color-demo-bg\);/);
    expect(banner).toMatch(/color:\s*var\(--color-demo-fg\);/);
    expect(banner).toMatch(/border-left:\s*var\(--border-emphasis\) solid var\(--color-demo-border\);/);
    const notice = ruleBody(".notice-warning");
    expect(notice).toMatch(/background:\s*var\(--color-notice-warning-bg\);/);
    expect(notice).toMatch(/color:\s*var\(--color-notice-warning-fg\);/);
    expect(notice).toMatch(/border-left:\s*var\(--border-emphasis\) solid var\(--color-notice-warning-border\);/);
  });

  test("the demo results heading uses the demo-heading tokens", () => {
    const heading = ruleBody(".demo-results-heading");
    expect(heading).toMatch(/font-size:\s*var\(--font-demo-heading-size\);/);
    expect(heading).toMatch(/font-weight:\s*var\(--font-demo-heading-weight\);/);
  });
});

describe("reflow (D15)", () => {
  test("the upload bar wraps instead of scrolling; selects never overflow", () => {
    const bar = ruleBody(".upload-bar");
    expect(bar).toMatch(/display:\s*flex;/);
    expect(bar).toMatch(/flex-wrap:\s*wrap;/);
    expect(bar).toMatch(/background:\s*var\(--color-surface\);/);
    expect(ruleBody(".settings-field select")).toMatch(/max-width:\s*100%;/);
    expect(ruleBody(".settings-field select")).toMatch(/min-height:\s*var\(--control-min-height\);/);
  });

  test("the Story 1.15 rules use no raw colour, fixed height or fixed width", () => {
    const start = rules.indexOf(".demo-banner {");
    expect(start).toBeGreaterThan(0);
    const added = rules.slice(start);
    expect(added).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(added).not.toMatch(/\b(rgba?|hsla?)\(/i);
    expect(added).not.toMatch(/(^|[^-\w])height\s*:/i);
    expect(added).not.toMatch(/(^|[^-\w])width\s*:/i);
  });
});
