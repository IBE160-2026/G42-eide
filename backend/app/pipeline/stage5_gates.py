"""Stage 5: validate the AI reply with three gates and build ValidatedResults (AD-10).

Gate 1 (completeness): ``stop`` must be ``complete``.
Gate 2 (shape): parse ``raw_json``, read ``status`` first, then validate fully into the AD-9
models and apply the shared text rule.
Gate 3 (counts and page-marker validation): at least ``MIN_ITEMS`` of each list, then page
numbers by document kind.

Gate 3 is page-marker validation: it proves only that each cited page is one of the PDF page
markers supplied for this pass. It does not check that the page supports the item; semantic
support is checked manually (fixture review and real-AI sessions), never here.

Items are never dropped: only page numbers are filtered and normalised, and every text value
is kept exactly as the AI wrote it.

Privacy: this module writes no logs and never calls ``errors()`` or ``json()`` on a caught
error. A caught exception only sets a flag inside its ``except`` clause; the ``PassFailure``
is raised after the clause has ended, so stage 5 chains no exception it caught. The raised
failure's ``__traceback__`` still references this module's frames, whose locals can hold AI
text, and a caller already handling an exception adds its own ``__context__``.
"""

import json
from collections.abc import Iterable, Iterator

from pydantic import ValidationError

from app.contracts.ai_output import AiOutput
from app.contracts.connector import ConnectorReply
from app.contracts.results import (
    ValidatedFlashcard,
    ValidatedKeyConcept,
    ValidatedQuizItem,
    ValidatedResults,
    ValidatedSummary,
    is_valid_result_text,
)
from app.pipeline.failures import PassFailure
from app.pipeline.stage2_extract import ExtractedDocument

# Product rule (FR-3): at least this many flashcards, quiz items and key concepts.
MIN_ITEMS = 5

_INVALID = "ai_output_invalid"


def _texts(output: AiOutput) -> Iterator[str]:
    yield output.summary.text
    for card in output.flashcards:
        yield card.front
        yield card.back
    for item in output.quiz:
        yield item.question
        yield item.answer
    for concept in output.key_concepts:
        yield concept.term
        yield concept.explanation


def _parse(raw_json: str) -> AiOutput:
    """Gate 2: parse, read ``status`` first, validate fully, apply the shared text rule."""
    parsed: object = None
    parse_failed = False
    try:
        parsed = json.loads(raw_json)
    except (ValueError, RecursionError):
        parse_failed = True
    if parse_failed or type(parsed) is not dict:
        raise PassFailure(_INVALID)

    status = parsed.get("status")
    if type(status) is str and status == "insufficient_content":
        raise PassFailure("insufficient_content")
    if not (type(status) is str and status == "ok"):
        raise PassFailure(_INVALID)

    output: AiOutput | None = None
    try:
        output = AiOutput.model_validate(parsed)
    except ValidationError:
        output = None
    if output is None:
        raise PassFailure(_INVALID)

    if not all(is_valid_result_text(text) for text in _texts(output)):
        raise PassFailure(_INVALID)
    return output


def _normalise(pages: Iterable[int], supplied: frozenset[int]) -> tuple[int, ...]:
    """Keep only supplied page markers, sorted ascending and de-duplicated."""
    return tuple(sorted({page for page in pages if page in supplied}))


def _check_pages(output: AiOutput, extracted: ExtractedDocument) -> list[tuple[int, ...]]:
    """Gate 3 page-marker validation; returns the output pages in item order.

    Order: summary, then each flashcard, quiz item and key concept.
    """
    item_pages = [
        *(card.pages for card in output.flashcards),
        *(item.pages for item in output.quiz),
        *(concept.pages for concept in output.key_concepts),
    ]
    if extracted.kind == "pdf":
        supplied = frozenset(extracted.supplied_pages)
        filtered = [_normalise(pages, supplied) for pages in item_pages]
        if any(not pages for pages in filtered):
            raise PassFailure(_INVALID)
        return [_normalise(output.summary.pages, supplied), *filtered]
    if extracted.kind == "text":
        if output.summary.pages or any(item_pages):
            raise PassFailure(_INVALID)
        return [() for _ in range(1 + len(item_pages))]
    raise ValueError("unknown document kind")


def _build(output: AiOutput, pages: list[tuple[int, ...]]) -> ValidatedResults:
    """Build every Validated* model inside one guarded block (catches ValidationError only)."""
    summary_pages, *rest = pages
    n_cards, n_quiz = len(output.flashcards), len(output.quiz)
    card_pages, quiz_pages, concept_pages = (
        rest[:n_cards],
        rest[n_cards : n_cards + n_quiz],
        rest[n_cards + n_quiz :],
    )
    built: ValidatedResults | None = None
    try:
        built = ValidatedResults(
            summary=ValidatedSummary(text=output.summary.text, pages=summary_pages),
            flashcards=tuple(
                ValidatedFlashcard(front=card.front, back=card.back, pages=card_page)
                for card, card_page in zip(output.flashcards, card_pages, strict=True)
            ),
            quiz=tuple(
                ValidatedQuizItem(question=item.question, answer=item.answer, pages=item_page)
                for item, item_page in zip(output.quiz, quiz_pages, strict=True)
            ),
            key_concepts=tuple(
                ValidatedKeyConcept(
                    term=concept.term, explanation=concept.explanation, pages=concept_page
                )
                for concept, concept_page in zip(output.key_concepts, concept_pages, strict=True)
            ),
        )
    except ValidationError:
        built = None
    if built is None:
        raise PassFailure(_INVALID)
    return built


def validate_output(reply: ConnectorReply, extracted: ExtractedDocument) -> ValidatedResults:
    """Run Gates 1 → 2 → 3 and return a new ``ValidatedResults``, or raise ``PassFailure``.

    Raises ``ValueError("unknown document kind")`` only for a programming error (a
    ``kind`` other than ``pdf`` or ``text``), after the minimum counts have passed.
    """
    # Gate 1: completeness. raw_json is not read before this passes.
    if reply.stop != "complete":
        raise PassFailure(_INVALID)

    # Gate 2: shape.
    output = _parse(reply.raw_json)

    # Gate 3: counts first, then page-marker validation by document kind.
    if min(len(output.flashcards), len(output.quiz), len(output.key_concepts)) < MIN_ITEMS:
        raise PassFailure(_INVALID)
    pages = _check_pages(output, extracted)
    return _build(output, pages)
