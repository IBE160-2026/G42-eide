import { describe, expect, test } from "vitest";
import { skippedPagesText } from "../lib/skipped-pages";

/*
 * Story 1.16, D7: the skipped-pages notice wording (matrix rows N2, N4–N8). The expected
 * strings are the approved EXPERIENCE.md texts (lines 67–69), written out in full.
 */

const SUFFIX = "hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.";

describe("skippedPagesText (D7)", () => {
  test("no skipped pages: no notice (N2)", () => {
    expect(skippedPagesText([])).toBeNull();
  });

  test("two pages: «A og B» (N4)", () => {
    expect(skippedPagesText([2, 7])).toBe(
      "PDF-side 2 og 7 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.",
    );
  });

  test("three pages: «A, B og C» (N5)", () => {
    expect(skippedPagesText([2, 7, 9])).toBe(
      "PDF-side 2, 7 og 9 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.",
    );
  });

  test("five pages: comma list with og before the last (N6)", () => {
    expect(skippedPagesText([1, 2, 3, 4, 5])).toBe(`PDF-side 1, 2, 3, 4 og 5 ${SUFFIX}`);
  });

  test("multi-digit page numbers are written unchanged (N7)", () => {
    expect(skippedPagesText([12, 80])).toBe(`PDF-side 12 og 80 ${SUFFIX}`);
  });

  describe("exact spacing and the singular form (N8)", () => {
    test("one page: the exact singular string", () => {
      expect(skippedPagesText([3])).toBe(
        "PDF-side 3 hadde ingen lesbar tekst (for eksempel bilder eller skannede sider) og ble ikke analysert.",
      );
    });

    test.each([[[3]], [[2, 7]], [[2, 7, 9]], [[1, 2, 3, 4, 5]], [[12, 80]]])(
      "%j: no non-breaking space, one normal space around og, «, » between items",
      (pages) => {
        const text = skippedPagesText(pages) as string;
        expect(text).not.toMatch(/[\u00a0\u202f\u2007\u200b\u2060\ufeff]/);
        expect(text).not.toMatch(/ {2}/);
        const list = text.slice("PDF-side ".length, text.indexOf(" hadde "));
        if (pages.length === 1) {
          expect(list).toBe(String(pages[0]));
        } else {
          expect(list.match(/ og /g)).toHaveLength(1);
          expect(list.endsWith(` og ${pages[pages.length - 1]}`)).toBe(true);
          const head = list.slice(0, list.lastIndexOf(" og "));
          expect(head.split(", ")).toEqual(pages.slice(0, -1).map(String));
          expect(head).not.toMatch(/,(?! )/);
        }
      },
    );
  });
});
