"use client";

import { useAppStatus } from "./AppStatusProvider";
import DemoIcon from "./DemoIcon";

/*
 * The DEMO banner (Story 1.15, D1, D2; UX-DR-9): the first child of `<main>`, shown in every
 * demo state once `/api/status` reports `mode: "demo"`, never in S0/S0x or real mode.
 * The icon is decorative; the text carries the meaning.
 */
export default function DemoBanner() {
  const { phase, status } = useAppStatus();
  if (phase !== "ready" || status?.mode !== "demo") return null;
  return (
    <div className="demo-banner" role="note">
      <DemoIcon className="demo-banner__icon" />
      <p>DEMO – du ser et ferdig eksempel. Ingen KI-tjeneste brukes, og egne filer kan ikke lastes opp.</p>
    </div>
  );
}
