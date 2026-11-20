"use client";

import { useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import type { ValidatedResults } from "../lib/contracts";
import { nextTabIndex } from "../lib/tabs";
import KeyConceptsContent from "./KeyConceptsContent";
import SummaryContent from "./SummaryContent";

/*
 * The result tabs (Story 1.16, D10–D13; UX-DR-22, AF-3: WAI-ARIA APG tabs with automatic
 * activation). Mode-independent: it receives only the validated results and the id of the
 * heading that names the tab list.
 *
 * - Four tabs in fixed order; counts only on Flashkort and Quiz (the real list lengths,
 *   `(0)` for an empty list). The accessible name is the visible label.
 * - Roving tabindex: only the selected tab is in the Tab order. Selection is local state, so
 *   a new mount (a new results session) starts on Sammendrag.
 * - Keys: ArrowRight/ArrowLeft (wrapping), Home, End select and focus the target tab and
 *   prevent the default. Keys with Alt, Ctrl or Meta, keys whose target is not a tab, and
 *   every other key are not handled and their default is kept. The current index is the
 *   event target's index among the tabs, found in the handler (no ref is read in render).
 * - Click selects the tab and focuses it (Safari, Firefox on macOS and jsdom do not focus a
 *   button on click), so focus never falls to <body> when a focused panel becomes hidden.
 * - All four panels stay mounted; inactive ones get `hidden`. Each panel is focusable and
 *   starts with a visually hidden h3 with the tab name. The Sammendrag panel then shows the
 *   summary and its page links (`SummaryContent`, Story 1.17), using the PDF source passed
 *   in (`pdfSource`; `null` means no links). The Nøkkelbegreper panel shows the key
 *   concepts with their page links (`KeyConceptsContent`, Story 1.18), using the same
 *   source. Flashkort and Quiz hold only their h3; their content is Stories 1.19–1.20.
 *
 * Returns a Fragment, so the tab list and the panels are direct children of the results
 * section (D3).
 */

interface TabDefinition {
  /** The PRD glossary key used in the ids. */
  key: "summary" | "key-concepts" | "flashcards" | "quiz";
  /** The tab name, used for the panel heading. */
  name: string;
  /** The visible tab label (with the count on Flashkort and Quiz). */
  label: string;
}

function tabDefinitions(results: ValidatedResults): TabDefinition[] {
  return [
    { key: "summary", name: "Sammendrag", label: "Sammendrag" },
    { key: "key-concepts", name: "Nøkkelbegreper", label: "Nøkkelbegreper" },
    { key: "flashcards", name: "Flashkort", label: `Flashkort (${results.flashcards.length})` },
    { key: "quiz", name: "Quiz", label: `Quiz (${results.quiz.length})` },
  ];
}

export default function ResultTabs({
  results,
  labelledBy,
  pdfSource,
}: {
  results: ValidatedResults;
  labelledBy: string;
  /** The PDF the page links open; `null` renders no links (Story 1.17, D3). */
  pdfSource: string | null;
}) {
  const [selected, setSelected] = useState(0);
  const tabs = tabDefinitions(results);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const tabElements = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const current = tabElements.indexOf(event.target as HTMLButtonElement);
    if (current === -1) return;
    const next = nextTabIndex(current, event.key, tabElements.length);
    if (next === null) return;
    event.preventDefault();
    setSelected(next);
    tabElements[next].focus();
  }

  function handleClick(index: number, event: MouseEvent<HTMLButtonElement>) {
    setSelected(index);
    event.currentTarget.focus();
  }

  return (
    <>
      <div role="tablist" aria-labelledby={labelledBy} className="result-tabs" onKeyDown={handleKeyDown}>
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            id={`result-tab-${tab.key}`}
            className="result-tab"
            aria-selected={index === selected}
            aria-controls={`result-panel-${tab.key}`}
            tabIndex={index === selected ? 0 : -1}
            onClick={(event) => handleClick(index, event)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={`result-panel-${tab.key}`}
          className="result-panel"
          aria-labelledby={`result-tab-${tab.key}`}
          tabIndex={0}
          hidden={index !== selected}
        >
          <h3 className="sr-only">{tab.name}</h3>
          {tab.key === "summary" && <SummaryContent summary={results.summary} pdfSource={pdfSource} />}
          {tab.key === "key-concepts" && <KeyConceptsContent concepts={results.key_concepts} pdfSource={pdfSource} />}
        </div>
      ))}
    </>
  );
}
