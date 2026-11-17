import type { ErrorCode } from "./contracts";
import type { DemoOutcome } from "./demo";

/*
 * The Story 1.15 error and retry matrix as data (D10, D12, CF-2). The texts are the
 * approved strings from EXPERIENCE.md → "Error headline + action per code", character
 * for character. Groups follow UX-DR-34: after a Temporary error `Vis eksempel` is
 * available again; after a Reload-required error it stays aria-disabled.
 *
 * Only the codes below have their own texts in Story 1.15. Every other code — including
 * `insufficient_content`, the file codes and the AI/cost codes, which the demo route
 * cannot meaningfully produce — falls back to the approved unknown-error texts
 * (the approved CF-2 deviation from UX-DR-34's general mapping).
 */

export type DemoErrorGroup = "temporary" | "reload";

export interface DemoErrorView {
  headline: string;
  action: string;
  /** The backend `message`, shown as the muted detail line; `null` when there is none. */
  detail: string | null;
  group: DemoErrorGroup;
}

interface ErrorText {
  headline: string;
  action: (referenceId?: string) => string;
  group: DemoErrorGroup;
}

const TEXTS: Partial<Record<ErrorCode, ErrorText>> = {
  generation_in_progress: {
    headline: "En generering pågår allerede",
    action: () => "Vent til den er ferdig – den kan være startet i en annen fane – og prøv igjen.",
    group: "temporary",
  },
  internal_error: {
    headline: "Noe gikk uventet galt",
    action: (referenceId) =>
      `Prøv igjen. Hvis feilen gjentar seg, oppgi referansen: ${referenceId ?? ""}.`,
    group: "temporary",
  },
  ai_output_invalid: {
    headline: "Svaret besto ikke kvalitetskontrollen",
    action: () =>
      "KI-svaret var ufullstendig eller manglet gyldige sidehenvisninger, så det vises ikke. Du kan prøve igjen.",
    group: "temporary",
  },
  invalid_request: {
    headline: "Forespørselen var ugyldig",
    action: () => "Last inn siden på nytt, og prøv igjen.",
    group: "reload",
  },
};

const NETWORK: Omit<DemoErrorView, "detail"> = {
  headline: "Mistet kontakten med serveren",
  action: "Sjekk at serveren kjører, og prøv igjen.",
  group: "temporary",
};

const UNKNOWN: Omit<DemoErrorView, "detail"> = {
  headline: "Noe gikk galt",
  action: "Last inn siden på nytt, og prøv igjen.",
  group: "reload",
};

/** The approved texts for `code`, or `undefined` (own properties only, so `toString` is not a code). */
function textFor(code: string): ErrorText | undefined {
  return Object.hasOwn(TEXTS, code) ? TEXTS[code as ErrorCode] : undefined;
}

/**
 * The view of a failed outcome: headline, action text, detail line and group.
 * `internal_error` only reaches here with a validated reference (`isErrorEnvelope`);
 * a missing or malformed reference has already made the outcome `unknown` (OQ3).
 * An empty backend message gives no detail line.
 */
export function demoErrorView(
  outcome: Exclude<DemoOutcome, { kind: "success" }>,
): DemoErrorView {
  if (outcome.kind === "network") return { ...NETWORK, detail: null };
  if (outcome.kind === "unknown") return { ...UNKNOWN, detail: null };

  const detail = outcome.message === "" ? null : outcome.message;
  const text = textFor(outcome.code);
  if (text !== undefined) {
    return {
      headline: text.headline,
      action: text.action(outcome.referenceId),
      detail,
      group: text.group,
    };
  }
  return { ...UNKNOWN, detail };
}
