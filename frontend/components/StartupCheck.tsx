"use client";

import { useEffect, useRef } from "react";
import type { StartupPhase } from "./AppStatusProvider";
import { useAppStatus } from "./AppStatusProvider";
import ErrorIcon from "./ErrorIcon";
import { focusAfterStartupRecovery } from "../lib/focus-target";

/*
 * S0 `Starter …` and S0x `Får ikke kontakt med appens server` (UX-DR-6,
 * UX-DR-18, UX-DR-32). Neither is announced: no live region, no role="alert";
 * focus moves to the S0x headline on every failure instead.
 */
export default function StartupCheck() {
  const { phase, retry } = useAppStatus();
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const previousPhase = useRef<StartupPhase | null>(null);

  useEffect(() => {
    const previous = previousPhase.current;
    previousPhase.current = phase;
    if (previous === phase) return;
    if (phase === "failed") {
      headlineRef.current?.focus();
    } else if (phase === "ready" && previous === "retrying") {
      focusAfterStartupRecovery();
    }
  }, [phase]);

  if (phase === "starting") {
    return <p className="startup-message">Starter …</p>;
  }
  if (phase === "ready") {
    return null;
  }

  const checking = phase === "retrying";
  return (
    <div className="error-state">
      <ErrorIcon className="error-state__icon" />
      <div className="error-state__content">
        <h2 ref={headlineRef} tabIndex={-1} className="error-state__headline">
          Får ikke kontakt med appens server
        </h2>
        <p className="error-state__action">
          Sjekk at serveren er startet, og trykk «Prøv igjen».
        </p>
        <button
          type="button"
          className="button-primary"
          aria-disabled={checking ? "true" : undefined}
          onClick={() => {
            if (checking) return;
            retry();
          }}
        >
          Prøv igjen
        </button>
      </div>
    </div>
  );
}
