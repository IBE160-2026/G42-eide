import type { ValidatedKeyConcept } from "../lib/contracts";
import PageLinks from "./PageLinks";

/*
 * The Nøkkelbegreper panel content (Story 1.18, D1, D3, D5, D6; UX-DR-24, AR-19, AF-8).
 *
 * - The key concepts in response order as an unordered list: each item holds the term and
 *   the explanation as separate paragraphs, then the concept's page links (`PageLinks`, a
 *   sibling block, never inside a paragraph).
 * - Term and explanation are plain React text nodes: nothing is interpreted as HTML or
 *   Markdown. Line breaks and long words are handled by CSS (`white-space: pre-line`,
 *   `overflow-wrap: anywhere`), not by markup.
 * - `PageLinks` renders nothing for a concept without pages or without a PDF source.
 * - An empty list renders nothing. The backend guarantees at least five concepts, but the
 *   frontend shape check allows an empty list (D5).
 * - Keys are the index: terms are not guaranteed unique and the list is never reordered.
 * - No heading, no `lang`, no `role` or `aria-label`; the term's weight is visual only (D2).
 */
export default function KeyConceptsContent({
  concepts,
  pdfSource,
}: {
  concepts: readonly ValidatedKeyConcept[];
  pdfSource: string | null;
}) {
  if (concepts.length === 0) return null;
  return (
    <ul className="key-concepts">
      {concepts.map((concept, index) => (
        <li key={index} className="key-concept">
          <p className="key-concept__term">{concept.term}</p>
          <p className="key-concept__explanation">{concept.explanation}</p>
          <PageLinks pages={concept.pages} pdfSource={pdfSource} />
        </li>
      ))}
    </ul>
  );
}
