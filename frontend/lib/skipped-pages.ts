/*
 * The skipped-pages notice text (Story 1.16, D7; EXPERIENCE.md → Notices, lines 67–69).
 *
 * Input contract: `pages` is a list of positive integers in strictly increasing order, as
 * already validated upstream (`isGenerationResponse` in `lib/generation.ts`; AD-11 "sorted").
 * The function does not sort, de-duplicate or re-validate.
 *
 * - `[]` → `null` (no notice is rendered);
 * - one page → `PDF-side A hadde …`;
 * - two pages → `PDF-side A og B hadde …`;
 * - three or more → `PDF-side A, B, …, Y og Z hadde …` (`, ` between items, ` og ` before the last).
 */

const SUFFIX =
  " hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.";

/** The approved skipped-pages notice text for `pages`, or `null` when there are none. */
export function skippedPagesText(pages: readonly number[]): string | null {
  if (pages.length === 0) return null;
  const numbers = pages.map(String);
  const list =
    numbers.length === 1
      ? numbers[0]
      : `${numbers.slice(0, -1).join(", ")} og ${numbers[numbers.length - 1]}`;
  return `PDF-side ${list}${SUFFIX}`;
}
