"use client";

import { useId, useState } from "react";
import type { ValidatedQuizItem } from "../lib/contracts";
import PageLinks from "./PageLinks";

/*
 * The Quiz panel content (Story 1.20, D1–D4, D7, D8, PD1–PD4; UX-DR-26, AF-7, AF-8).
 *
 * - Every item is shown at once, in response order, as an ordered list: one list item per
 *   question, numbered by the list itself (D2). DOM and reading order per item: the question
 *   (an h4 holding only the question text) → its own Vis svar / Skjul svar toggle → the
 *   answer with its page links (D1).
 * - The revealed items are one set of indices in state; a toggle adds or removes only its own
 *   index (PD2). The revealed answers survive tab switches because the panel stays mounted,
 *   and reset when ResultTabs mounts again for a new results session. The list does not reset
 *   itself when the items change.
 * - One useId() per list; each answer's id and each question's id are that id plus a role
 *   word and the item index (PD3). The toggle's aria-controls points to its answer, and its
 *   aria-describedby to its own question h4, so a screen reader can tell which question a
 *   toggle belongs to while its accessible name stays the visible label (D7 correction,
 *   G2-280-01, Checkpoint 281). A collapsed answer has the hidden attribute, so its page
 *   links stay out of the focus order until it is revealed.
 * - The toggle is always available: never aria-disabled, never natively unavailable. Items
 *   are keyed by index and never re-keyed, so focus stays on the pressed toggle.
 * - Display-only (UX-DR-40): no input, selection, score, saved progress, storage or request,
 *   and no live region; aria-expanded conveys the change (PD4).
 * - An empty list renders nothing, after all hook calls (D4).
 * - Question and answer are plain text nodes; no lang (D8), no role, no aria-label or
 *   aria-labelledby, and no aria-describedby other than the toggle's (D7).
 */
export default function QuizList({
  items,
  pdfSource,
}: {
  items: readonly ValidatedQuizItem[];
  pdfSource: string | null;
}) {
  const [revealedItems, setRevealedItems] = useState<ReadonlySet<number>>(() => new Set());
  const baseId = useId();

  if (items.length === 0) return null;

  function toggle(index: number) {
    setRevealedItems((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <ol className="quiz-list">
      {items.map((item, index) => {
        const revealed = revealedItems.has(index);
        const answerId = `${baseId}-answer-${index}`;
        const questionId = `${baseId}-question-${index}`;
        return (
          <li key={index} className="quiz-item">
            <h4 id={questionId} className="quiz-item__question">{item.question}</h4>
            <button
              type="button"
              className="button-secondary quiz-item__toggle"
              aria-expanded={revealed}
              aria-controls={answerId}
              aria-describedby={questionId}
              onClick={() => toggle(index)}
            >
              {revealed ? "Skjul svar" : "Vis svar"}
            </button>
            <div id={answerId} className="quiz-item__answer" hidden={!revealed}>
              <p className="quiz-item__answer-text">{item.answer}</p>
              <PageLinks pages={item.pages} pdfSource={pdfSource} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
