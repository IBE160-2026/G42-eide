/*
 * Focus target after a successful startup retry (G-2). Later stories register
 * the mode-appropriate control (`Last opp` in real mode, `Vis eksempel` in demo
 * mode); until one is registered, focus goes to the header `h1#app-title`.
 * Module-level like `announce`, so one target exists at a time.
 */

const FALLBACK_ID = "app-title";

let target: HTMLElement | null = null;

/**
 * Makes `element` the focus target and returns an unregister function that
 * clears it only if `element` is still the registered target (so a stale
 * cleanup never clears a newer one). Fits a React ref callback's cleanup.
 */
export function registerStartupFocusTarget(element: HTMLElement): () => void {
  target = element;
  return () => {
    if (target === element) target = null;
  };
}

/**
 * Focuses the registered target if it is connected and takes focus; otherwise
 * the header `h1`. Without either, does nothing and never throws.
 */
export function focusAfterStartupRecovery(): void {
  const current = target;
  if (current !== null && current.isConnected) {
    current.focus();
    if (document.activeElement === current) return;
  }
  document.getElementById(FALLBACK_ID)?.focus();
}
