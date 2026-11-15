import type { GenerationResponse } from "./contracts";

/*
 * Runtime shape check of a Generation Pass success reply (Story 1.13, D9, "Frontend mirror").
 *
 * It mirrors the contract as the backend emits it in JSON (`GenerationResponse` serialised
 * in JSON mode); it does not replicate Python's input coercion. Rules:
 * - exactly the contract's keys at every level, nothing missing and nothing extra;
 * - `mode` is "demo" or "real";
 * - the item lists may be empty (minimum counts are a backend stage 5 rule, not the model);
 * - page lists (including `skipped_pages`) are safe integers above 0, strictly increasing,
 *   and may be empty;
 * - texts contain at least one character outside Python's `str.isspace()` set and no
 *   unpaired UTF-16 surrogate (valid pairs, such as emoji, are fine).
 *
 * Numbers: JavaScript cannot tell `1` from `1.0` after JSON parsing and treats integers
 * above 2^53 - 1 as unsafe, so `1.0` is accepted and such large integers are rejected; the
 * backend never emits either.
 */

const AI_MODES: readonly string[] = ["demo", "real"];

const RESPONSE_KEYS = ["mode", "results", "skipped_pages"];
const RESULTS_KEYS = ["summary", "flashcards", "quiz", "key_concepts"];
const SUMMARY_TEXT_KEYS = ["text"];
const ITEM_TEXT_KEYS = {
  flashcards: ["front", "back"],
  quiz: ["question", "answer"],
  key_concepts: ["term", "explanation"],
} as const;

/**
 * Python's `str.isspace()` code points (29), which `str.strip()` removes. Written out
 * because JavaScript's `trim()` differs: it treats U+FEFF as whitespace and U+001C-U+001F
 * and U+0085 as text.
 */
const PYTHON_WHITESPACE: ReadonlySet<number> = new Set([
  0x0009, 0x000a, 0x000b, 0x000c, 0x000d,
  0x001c, 0x001d, 0x001e, 0x001f,
  0x0020, 0x0085, 0x00a0, 0x1680,
  0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a,
  0x2028, 0x2029, 0x202f, 0x205f, 0x3000,
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

/** The backend's `ResultText`: some non-whitespace (Python's rules) and no lone surrogate. */
function isResultText(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let hasContent = false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (isHighSurrogate(code)) {
      if (!isLowSurrogate(value.charCodeAt(index + 1))) return false;
      hasContent = true;
      index += 1; // the low half of a valid pair
    } else if (isLowSurrogate(code)) {
      return false; // a low surrogate not preceded by a high one
    } else if (!PYTHON_WHITESPACE.has(code)) {
      hasContent = true;
    }
  }
  return hasContent;
}

/** The backend's `ResultPages`: safe integers above 0, strictly increasing; may be empty. */
function isResultPages(value: unknown): value is number[] {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    const page: unknown = value[index];
    if (typeof page !== "number" || !Number.isSafeInteger(page) || page <= 0) return false;
    if (index > 0 && page <= (value[index - 1] as number)) return false;
  }
  return true;
}

function isTextsAndPages(value: unknown, textKeys: readonly string[]): boolean {
  if (!isRecord(value) || !hasExactKeys(value, [...textKeys, "pages"])) return false;
  return textKeys.every((key) => isResultText(value[key])) && isResultPages(value.pages);
}

function isItemList(value: unknown, textKeys: readonly string[]): boolean {
  return Array.isArray(value) && value.every((item) => isTextsAndPages(item, textKeys));
}

/** Runtime shape check of a Generation Pass success body (`GenerationResponse`). */
export function isGenerationResponse(value: unknown): value is GenerationResponse {
  if (!isRecord(value) || !hasExactKeys(value, RESPONSE_KEYS)) return false;
  const { mode, results, skipped_pages: skippedPages } = value;
  if (typeof mode !== "string" || !AI_MODES.includes(mode)) return false;
  if (!isResultPages(skippedPages)) return false;
  if (!isRecord(results) || !hasExactKeys(results, RESULTS_KEYS)) return false;
  if (!isTextsAndPages(results.summary, SUMMARY_TEXT_KEYS)) return false;
  return (Object.keys(ITEM_TEXT_KEYS) as (keyof typeof ITEM_TEXT_KEYS)[]).every((kind) =>
    isItemList(results[kind], ITEM_TEXT_KEYS[kind]),
  );
}
