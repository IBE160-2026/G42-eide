"use client";

import { useEffect, useRef } from "react";
import { useAppStatus } from "./AppStatusProvider";
import { useDemoFlow } from "./DemoProvider";
import ErrorIcon from "./ErrorIcon";
import WarningIcon from "./WarningIcon";

/*
 * The demo results area (Story 1.15, D6, D8, D9, D17), inside the `Resultater` section;
 * demo mode only.
 *
 * - S1: the guidance text (shown only in S1).
 * - S3: the loading indicator (decorative, static under reduced motion) and the loading
 *   text. The announcement goes through the page's status region (the provider).
 * - S4: the demo results heading and the Verification Notice. Nothing of the response's
 *   content is rendered (D8, C4): the tabs and panels are Stories 1.16–1.20.
 * - S5: the error state; the backend message is plain text. Focus moves to the headline
 *   on every error outcome, keyed by `errorId`, so a repeated identical error moves focus
 *   again; errors are never announced and never use role="alert".
 */

const GUIDANCE =
  "Prøv appen med en ferdig eksempelforelesning om lagerstyring og logistikk. Trykk «Vis eksempel» for å se resultatene.";
const LOADING = "Henter eksempel …";
const RESULTS_HEADING = "Eksempelresultater (ikke generert nå)";
const VERIFICATION_NOTICE =
  "Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.";

export default function DemoOutcome() {
  const { phase, status } = useAppStatus();
  const { state } = useDemoFlow();
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const errorId = state.phase === "error" ? state.errorId : null;

  useEffect(() => {
    if (errorId !== null) headlineRef.current?.focus();
  }, [errorId]);

  if (phase !== "ready" || status?.mode !== "demo") return null;

  switch (state.phase) {
    case "idle":
      return <p className="demo-guidance">{GUIDANCE}</p>;
    case "loading":
      return (
        <div className="demo-loading">
          <svg
            className="loading-indicator"
            viewBox="0 0 28 28"
            width="28"
            height="28"
            aria-hidden="true"
            focusable="false"
          >
            <circle
              className="loading-indicator__track"
              cx="14"
              cy="14"
              r="11"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="loading-indicator__arc"
              d="M14 3a11 11 0 0 1 11 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <p>{LOADING}</p>
        </div>
      );
    case "success":
      return (
        <>
          <h2 className="demo-results-heading">{RESULTS_HEADING}</h2>
          <div className="notice-warning" role="note">
            <WarningIcon className="notice-warning__icon" />
            <p>{VERIFICATION_NOTICE}</p>
          </div>
        </>
      );
    case "error":
      return (
        <div className="error-state">
          <ErrorIcon className="error-state__icon" />
          <div className="error-state__content">
            <h2 ref={headlineRef} tabIndex={-1} className="error-state__headline">
              {state.error.headline}
            </h2>
            <p className="error-state__action">{state.error.action}</p>
            {state.error.detail !== null && <p className="error-state__detail">{state.error.detail}</p>}
          </div>
        </div>
      );
  }
}
