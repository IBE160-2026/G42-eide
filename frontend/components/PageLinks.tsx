/*
 * Reusable PDF page links (Story 1.17, D2, D6, D10; UX-DR-27, EXPERIENCE.md → Page link).
 *
 * - Props: the pages to link to and the PDF source. The component holds no URL of its own;
 *   demo mode passes the bundled sample PDF, real mode later an object URL (Story 2.7).
 * - Renders nothing when there are no pages or no source (`null`).
 * - Otherwise a block row after the item's text (never inside a paragraph): the first link,
 *   then for each following page a wrapper holding the separator and that page's link, so a
 *   separator always wraps together with the link after it.
 * - Each link keeps the approved markup: the visible label, the decorative arrow
 *   (aria-hidden) and the visually hidden suffix that completes the accessible name.
 *
 * Preconditions (not re-validated): `pages` is strictly increasing positive integers, and the
 * source has no `#` fragment.
 */

interface PageLinksProps {
  pages: readonly number[];
  pdfSource: string | null;
}

function PageLink({ page, pdfSource }: { page: number; pdfSource: string }) {
  return (
    <a className="page-link" href={`${pdfSource}#page=${page}`} target="_blank" rel="noopener">
      PDF-side {page}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only">, åpnes i ny fane</span>
    </a>
  );
}

export default function PageLinks({ pages, pdfSource }: PageLinksProps) {
  if (pages.length === 0 || pdfSource === null) return null;
  const [first, ...rest] = pages;
  return (
    <div className="page-links">
      <PageLink key={first} page={first} pdfSource={pdfSource} />
      {rest.map((page) => (
        <span key={page} className="page-links__item">
          <span className="page-links__separator" aria-hidden="true">
            {" · "}
          </span>
          <PageLink page={page} pdfSource={pdfSource} />
        </span>
      ))}
    </div>
  );
}
