import type { ValidatedSummary } from "../lib/contracts";
import PageLinks from "./PageLinks";

/*
 * The Sammendrag panel content (Story 1.17, D1, D2; AR-19, AD-18, UX-DR-23).
 *
 * - The summary text is one plain React text node in `p.summary-text`: nothing in it is
 *   interpreted as HTML or Markdown. Line breaks are preserved by CSS (`white-space:
 *   pre-line`), not by markup.
 * - The page links follow as a separate block, a sibling of the paragraph (never inside it).
 *   `PageLinks` renders nothing for a summary without pages or without a PDF source.
 *
 * Returns a Fragment, so both sit directly in the panel after its heading.
 */
export default function SummaryContent({
  summary,
  pdfSource,
}: {
  summary: ValidatedSummary;
  pdfSource: string | null;
}) {
  return (
    <>
      <p className="summary-text">{summary.text}</p>
      <PageLinks pages={summary.pages} pdfSource={pdfSource} />
    </>
  );
}
