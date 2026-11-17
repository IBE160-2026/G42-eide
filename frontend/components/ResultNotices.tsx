import { skippedPagesText } from "../lib/skipped-pages";
import InfoIcon from "./InfoIcon";
import WarningIcon from "./WarningIcon";

/*
 * The notices above the result tabs (Story 1.16, D6, D7; UX-DR-10, UX-DR-11, UX-DR-21).
 * Mode-independent: it receives only the response's `skipped_pages`.
 *
 * - The Verification Notice always comes first (`notice-warning`).
 * - The skipped-pages notice follows only when there are skipped pages (`notice-info`);
 *   its text is a plain text node from `skippedPagesText`.
 *
 * Returns a Fragment, so both notices are direct children of the results section (D3).
 */

const VERIFICATION_NOTICE =
  "Innholdet er laget av KI og kan inneholde feil. Kontroller det mot originaldokumentet.";

export default function ResultNotices({ skippedPages }: { skippedPages: readonly number[] }) {
  const skipped = skippedPagesText(skippedPages);
  return (
    <>
      <div className="notice-warning" role="note">
        <WarningIcon className="notice-warning__icon" />
        <p>{VERIFICATION_NOTICE}</p>
      </div>
      {skipped !== null && (
        <div className="notice-info" role="note">
          <InfoIcon className="notice-info__icon" />
          <p>{skipped}</p>
        </div>
      )}
    </>
  );
}
