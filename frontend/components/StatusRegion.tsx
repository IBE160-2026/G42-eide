"use client";

import { useEffect, useRef } from "react";

/*
 * The page's single polite status region (UX-DR-20). It is rendered empty and
 * React never renders children into it; `announce` writes plain text
 * (textContent) directly, so clearing and setting are never batched together.
 * Never used for errors.
 */

let regionNode: HTMLDivElement | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;

function cancelPending(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
}

/**
 * Clears the status region now and sets `message` on the next tick, so a
 * repeated message is announced again. A new call cancels a pending one, so
 * only the latest message is set. No-op when the region is not mounted.
 */
export function announce(message: string): void {
  cancelPending();
  const node = regionNode;
  if (node === null) return;
  node.textContent = "";
  if (message === "") return;
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    if (regionNode !== null) regionNode.textContent = message;
  }, 0);
}

export default function StatusRegion() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    regionNode = node;
    return () => {
      if (regionNode === node) {
        cancelPending();
        regionNode = null;
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
