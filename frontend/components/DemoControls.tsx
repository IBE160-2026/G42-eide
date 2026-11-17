"use client";

import { useCallback } from "react";
import { useAppStatus } from "./AppStatusProvider";
import { useDemoFlow } from "./DemoProvider";
import LockIcon from "./LockIcon";
import UploadIcon from "./UploadIcon";
import { registerStartupFocusTarget } from "../lib/focus-target";

/*
 * The demo upload bar (Story 1.15, D3–D5, D6a, D13, D17, D19; Story 1.16, D2, D4, D5, D8,
 * D9), inside the `Opplasting og innstillinger` section; demo mode only.
 *
 * - `Last opp` is natively disabled in every demo state. The two settings are natively
 *   disabled `select`s in S1 and S5, and a read-only `<dl>` in the locked S3/S4 bar (uploads
 *   and settings are not available in demo; UX-DR-18/-40 restrict only the five listed buttons).
 * - `Vis eksempel` is never natively disabled: it is aria-disabled when unavailable (S3, S4,
 *   after Reload-required errors), stays focusable, and keeps focus (CF-1). Its only handler
 *   is `onClick`; `start()` itself ignores activation when unavailable.
 * - It registers as the focus target after a successful startup retry (G-2).
 * - Locked bar (Story 1.16, D4, D8): in S3 (`loading`) and S4 (`success`) the bar gets the
 *   class `upload-bar-locked` and shows, in order: `Låst` with a decorative padlock (its own
 *   line), `Last opp`, the fixed settings as a `<dl>`, the fixed-settings note and
 *   `Vis eksempel`. S1 and S5 keep the unlocked bar.
 * - `Vis eksempel` keeps its DOM node, and so its focus, across every state change (D9):
 *   one JSX tree with the same root `<div>`, state-dependent children in stable conditional
 *   slots, no state-dependent `key`, and `Vis eksempel` as the last, unconditional child.
 */
const FIXED_SETTINGS_NOTE =
  "Demoen viser ferdiglagde resultater på norsk bokmål med standard detaljnivå. Innstillingene kan ikke endres, og det lages ingen ny oversettelse.";

export default function DemoControls() {
  const { phase, status } = useAppStatus();
  const { state, canStart, start } = useDemoFlow();
  const locked = state.phase === "loading" || state.phase === "success";
  const registerFocusTarget = useCallback(
    (element: HTMLButtonElement | null) =>
      element === null ? undefined : registerStartupFocusTarget(element),
    [],
  );

  if (phase !== "ready" || status?.mode !== "demo") return null;

  return (
    <div className={locked ? "upload-bar upload-bar-locked" : "upload-bar"}>
      {locked && (
        <p className="upload-bar__lock">
          <LockIcon className="upload-bar__lock-icon" />Låst
        </p>
      )}
      <button type="button" className="button-primary" disabled>
        <UploadIcon />
        Last opp
      </button>
      {locked ? (
        <dl className="locked-settings">
          <div>
            <dt>Språk på resultatene</dt>
            <dd>Norsk bokmål</dd>
          </div>
          <div>
            <dt>Detaljnivå</dt>
            <dd>Standard</dd>
          </div>
        </dl>
      ) : (
        <>
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
        </>
      )}
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
