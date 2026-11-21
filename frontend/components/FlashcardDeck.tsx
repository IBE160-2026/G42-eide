"use client";

import { useId, useState } from "react";
import type { ValidatedFlashcard } from "../lib/contracts";
import PageLinks from "./PageLinks";

/*
 * The Flashkort panel content (Story 1.19, D1, D2, D5–D8; UX-DR-18, UX-DR-25, AF-6, AF-7).
 *
 * - Exactly one card is in the DOM: the current one (D1). DOM and reading order: the counter
 *   (above the card, D8) → the term → the Vis svar / Skjul svar toggle → the answer with its
 *   page links → Forrige / Neste.
 * - The counter is the deck's only live region: `aria-live="polite"`, `aria-atomic="true"`,
 *   one text node, present from the first render. It changes only on Forrige / Neste (D7).
 *   The global status region is not used.
 * - Each card's revealed state is remembered while navigating; the current card and the
 *   revealed answers survive tab switches because the panel stays mounted, and reset when
 *   ResultTabs mounts again for a new results session (D2). The deck does not reset itself
 *   when the cards change.
 * - One answer element with one `useId()` id; the toggle's `aria-controls` always points to it
 *   (D6). A collapsed answer has the `hidden` attribute.
 * - Forrige on the first card and Neste on the last are `aria-disabled`, never natively
 *   unavailable: they stay focusable, and their click handler does nothing (a browser fires
 *   click for Enter and Space as well). The buttons are never re-keyed, so focus stays on the
 *   pressed button (UX-DR-18, D8).
 * - An empty deck renders nothing, after all hook calls (D5).
 * - Term and answer are plain text nodes; no heading, no `lang`, no `role`, no `aria-label`.
 */
export default function FlashcardDeck({
  cards,
  pdfSource,
}: {
  cards: readonly ValidatedFlashcard[];
  pdfSource: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [revealedCards, setRevealedCards] = useState<ReadonlySet<number>>(() => new Set());
  const answerId = useId();

  if (cards.length === 0) return null;

  const card = cards[index];
  const revealed = revealedCards.has(index);
  const atFirst = index === 0;
  const atLast = index === cards.length - 1;

  function toggle() {
    setRevealedCards((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function previous() {
    if (atFirst) return;
    setIndex(index - 1);
  }

  function next() {
    if (atLast) return;
    setIndex(index + 1);
  }

  return (
    <div className="flashcard-deck">
      <p className="flashcard__counter" aria-live="polite" aria-atomic="true">{`Kort ${index + 1} av ${cards.length}`}</p>
      <div className="flashcard">
        <p className="flashcard__term">{card.front}</p>
        <button
          type="button"
          className="button-secondary flashcard__toggle"
          aria-expanded={revealed}
          aria-controls={answerId}
          onClick={toggle}
        >
          {revealed ? "Skjul svar" : "Vis svar"}
        </button>
        <div id={answerId} className="flashcard__answer" hidden={!revealed}>
          <p className="flashcard__answer-text">{card.back}</p>
          <PageLinks pages={card.pages} pdfSource={pdfSource} />
        </div>
      </div>
      <div className="flashcard-nav">
        <button type="button" className="button-secondary" aria-disabled={atFirst ? "true" : undefined} onClick={previous}>
          Forrige
        </button>
        <button type="button" className="button-secondary" aria-disabled={atLast ? "true" : undefined} onClick={next}>
          Neste
        </button>
      </div>
    </div>
  );
}
