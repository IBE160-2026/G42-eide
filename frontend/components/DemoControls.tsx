"use client";

import { useCallback } from "react";
import { useAppStatus } from "./AppStatusProvider";
import { useDemoFlow } from "./DemoProvider";
import UploadIcon from "./UploadIcon";
import { registerStartupFocusTarget } from "../lib/focus-target";

/*
 * The demo upload bar (Story 1.15, D3–D5, D6a, D13, D17, D19), inside the
 * `Opplasting og innstillinger` section; demo mode only.
 *
 * - `Last opp` and the two settings are natively disabled in every demo state (uploads and
 *   settings are not available in demo; UX-DR-18/-40 restrict only the five listed buttons).
 * - `Vis eksempel` is never natively disabled: it is aria-disabled when unavailable (S3, S4,
 *   after Reload-required errors), stays focusable, and keeps focus (CF-1). Its only handler
 *   is `onClick`; `start()` itself ignores activation when unavailable.
 * - It registers as the focus target after a successful startup retry (G-2).
 * - The bar keeps its S1 appearance in S3 and S4; the visual locked bar is Story 1.16 (D6a).
 */
const FIXED_SETTINGS_NOTE =
  "Demoen viser ferdiglagde resultater på norsk bokmål med standard detaljnivå. Innstillingene kan ikke endres, og det lages ingen ny oversettelse.";

export default function DemoControls() {
  const { phase, status } = useAppStatus();
  const { canStart, start } = useDemoFlow();
  const registerFocusTarget = useCallback(
    (element: HTMLButtonElement | null) =>
      element === null ? undefined : registerStartupFocusTarget(element),
    [],
  );

  if (phase !== "ready" || status?.mode !== "demo") return null;

  return (
    <div className="upload-bar">
      <button type="button" className="button-primary" disabled>
        <UploadIcon />
        Last opp
      </button>
      <div className="settings-field">
        <label htmlFor="demo-output-language">Språk på resultatene</label>
        <select id="demo-output-language" disabled defaultValue="nb">
          <option value="nb">Norsk bokmål</option>
        </select>
      </div>
      <div className="settings-field">
        <label htmlFor="demo-detail-level">Detaljnivå</label>
        <select id="demo-detail-level" disabled defaultValue="standard">
          <option value="standard">Standard</option>
        </select>
      </div>
      <p className="settings-note">{FIXED_SETTINGS_NOTE}</p>
      <button
        type="button"
        className="button-primary"
        ref={registerFocusTarget}
        aria-disabled={canStart ? undefined : "true"}
        onClick={start}
      >
        Vis eksempel
      </button>
    </div>
  );
}
