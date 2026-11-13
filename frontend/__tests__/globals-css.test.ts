import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

// jsdom does not apply globals.css (Next.js imports CSS at build), so it is read as text.
const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
// Comments stripped so the forbidden-pattern checks only see real rules.
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");

function tokenValue(name: string): string | undefined {
  const pattern = new RegExp(`--${name}\\s*:\\s*([^;]+);`, "g");
  const matches = [...rules.matchAll(pattern)];
  expect(matches, `--${name} defined exactly once`).toHaveLength(1);
  return matches[0]?.[1].trim();
}

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rules.match(new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`));
  expect(match, `${selector} rule exists`).not.toBeNull();
  return match![2];
}

const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const colors: Record<string, string> = {
  background: "#F7F3EA",
  surface: "#FFFDF7",
  text: "#2A2823",
  "text-muted": "#5B5649",
  primary: "#1D5C63",
  "primary-hover": "#174B51",
  "on-primary": "#FFFFFF",
  "hover-tint": "#E2EEEC",
  border: "#857D6C",
  "border-subtle": "#DDD5C4",
  focus: "#1D5C63",
  "notice-info-bg": "#E7EFF3",
  "notice-info-fg": "#1F4A63",
  "notice-info-border": "#1F4A63",
  "notice-warning-bg": "#FBF1DC",
  "notice-warning-fg": "#6E4600",
  "notice-warning-border": "#6E4600",
  "error-bg": "#FBE9E7",
  "error-fg": "#8E2A20",
  "error-border": "#8E2A20",
  "demo-bg": "#E2EEEC",
  "demo-fg": "#1D5C63",
  "demo-border": "#1D5C63",
  "disabled-bg": "#ECE7DC",
  "disabled-fg": "#5F5A4E",
  "disabled-border": "#857D6C",
  backdrop: "#2A28238C",
};

const typography: Record<string, [string, string, string]> = {
  caption: ["14px", "400", "1.35"],
  small: ["15px", "400", "1.35"],
  body: ["17px", "400", "1.65"],
  ui: ["17px", "500", "1.35"],
  answer: ["19px", "400", "1.7"],
  heading: ["20px", "600", "1.25"],
  subheading: ["17px", "600", "1.35"],
  brand: ["24px", "700", "1.25"],
  "flashcard-term": ["28px", "600", "1.25"],
};

const exactTokens: Record<string, string> = {
  "radius-sm": "6px",
  "radius-md": "10px",
  "radius-lg": "12px",
  "space-1": "4px",
  "space-2": "8px",
  "space-3": "12px",
  "space-4": "16px",
  "space-5": "20px",
  "space-6": "24px",
  "space-7": "32px",
  "space-8": "48px",
  "control-min-height": "44px",
  "target-min": "24px",
  "reflow-min-width": "320px",
  "measure-answer": "65ch",
  "content-max-width": "960px",
  "border-hairline": "1px",
  "border-header-rule": "2px",
  "border-emphasis": "3px",
  "focus-ring-width": "3px",
  "focus-ring-offset": "2px",
  "padding-notice": "8px 16px",
  "padding-flashcard": "32px 48px",
  "padding-quiz-item": "16px 24px",
  "padding-page-inline": "48px",
  "padding-header": "12px 48px",
  "font-family": FONT_STACK,
};

describe("design tokens", () => {
  test("all 27 colours have their exact values", () => {
    expect(Object.keys(colors)).toHaveLength(27);
    for (const [name, value] of Object.entries(colors)) {
      expect(tokenValue(`color-${name}`), name).toBe(value);
    }
    expect(rules.match(/--color-[a-z-]+\s*:/g)).toHaveLength(27);
  });

  test("all 9 typography roles have their exact size, weight and line height", () => {
    for (const [role, [size, weight, lineHeight]] of Object.entries(typography)) {
      expect(tokenValue(`font-${role}-size`), role).toBe(size);
      expect(tokenValue(`font-${role}-weight`), role).toBe(weight);
      expect(tokenValue(`font-${role}-line-height`), role).toBe(lineHeight);
    }
  });

  test("radii, spacing, size, padding and font-family tokens have exact values", () => {
    for (const [name, value] of Object.entries(exactTokens)) {
      expect(tokenValue(name), name).toBe(value);
    }
  });

  test("D-8 role tokens map to the ui and heading roles", () => {
    for (const part of ["size", "weight", "line-height"]) {
      expect(tokenValue(`font-settings-value-${part}`)).toBe(`var(--font-ui-${part})`);
      expect(tokenValue(`font-demo-heading-${part}`)).toBe(`var(--font-heading-${part})`);
    }
  });
});

describe("base rules", () => {
  test("global focus ring uses the tokens", () => {
    expect(rules.match(/:focus-visible/g)).toHaveLength(1);
    const body = ruleBody(":focus-visible");
    expect(body).toMatch(/outline:\s*var\(--focus-ring-width\) solid var\(--color-focus\);/);
    expect(body).toMatch(/outline-offset:\s*var\(--focus-ring-offset\);/);
  });

  test("a visually hidden sr-only class exists", () => {
    expect(rules).toMatch(/\.sr-only\s*\{/);
  });

  test("the page frame is centred at the content max width", () => {
    const page = ruleBody(".page");
    expect(page).toMatch(/max-width:[^;]*var\(--content-max-width\)/);
    expect(page).toMatch(/margin:\s*0 auto;/);
    expect(page).toMatch(/padding-inline:\s*var\(--padding-page-inline\);/);
  });

  test("the header band uses its tokens", () => {
    const header = ruleBody(".app-header");
    expect(header).toMatch(/background:\s*var\(--color-surface\);/);
    expect(header).toMatch(
      /border-bottom:\s*var\(--border-header-rule\) solid var\(--color-primary\);/,
    );
    expect(header).toMatch(/padding:\s*var\(--padding-header\);/);

    expect(ruleBody(".app-header__logo")).toMatch(/color:\s*var\(--color-primary\);/);

    const title = ruleBody(".app-header__title");
    expect(title).toMatch(/font-size:\s*var\(--font-brand-size\);/);
    expect(title).toMatch(/font-weight:\s*var\(--font-brand-weight\);/);
    expect(title).toMatch(/line-height:\s*var\(--font-brand-line-height\);/);
  });

  test("body uses the background, text and body typography tokens", () => {
    const body = ruleBody("body");
    expect(body).toMatch(/background:\s*var\(--color-background\);/);
    expect(body).toMatch(/color:\s*var\(--color-text\);/);
    expect(body).toMatch(/font-size:\s*var\(--font-body-size\);/);
    expect(body).toMatch(/font-weight:\s*var\(--font-body-weight\);/);
    expect(body).toMatch(/line-height:\s*var\(--font-body-line-height\);/);
  });

  test.each([
    ["box-shadow", /box-shadow/i],
    ["gradient", /gradient\(/i],
    ["@font-face", /@font-face/i],
    ["@import", /@import/i],
    ["external url()", /url\(/i],
    ["dark mode", /prefers-color-scheme\s*:\s*dark/i],
    ["fixed height", /(^|[^-\w])height\s*:/i],
    ["sticky/fixed position", /position\s*:\s*(sticky|fixed)/i],
    ["outline: none", /outline(-width|-style)?\s*:\s*(none|0(px)?)\b/i],
  ])("contains no %s", (_label, pattern) => {
    expect(rules).not.toMatch(pattern);
  });
});
