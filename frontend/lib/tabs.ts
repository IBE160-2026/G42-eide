/*
 * Index arithmetic for the result tabs (Story 1.16, D13; WAI-ARIA APG tabs with automatic
 * activation). Pure: the tablist's key handler decides first whether a key is handled at
 * all (Alt, Ctrl or Meta held, or a target that is not a tab, are ignored there) and then
 * asks this function for the target index.
 *
 * `current` is the index of the event's target among the tabs; `count` is the number of
 * tabs (at least 1).
 * - `ArrowRight` → the next tab, wrapping from the last to the first;
 * - `ArrowLeft` → the previous tab, wrapping from the first to the last;
 * - `Home` → the first tab; `End` → the last tab;
 * - any other key → `null` (not handled).
 */
export function nextTabIndex(current: number, key: string, count: number): number | null {
  switch (key) {
    case "ArrowRight":
      return (current + 1) % count;
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
