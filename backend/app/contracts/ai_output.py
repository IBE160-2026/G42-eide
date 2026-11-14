"""The AD-9 AI output models: the shape of the AI's JSON reply (AR-10, D5, D6).

Shape only: no empty-text checks, item counts or page validation (Story 1.10, Gate 2 and
Gate 3). Field names and order match the D-11 ``Response`` block in ``stage3_prompt.py``.

``hide_input_in_errors`` keeps the raw input out of ``str()``/``repr()`` of a
``ValidationError`` only; ``errors()`` and ``json()`` still contain it unless called with
``include_input=False``. The models show all AI text in ``repr()`` and ``model_dump()``.
Never log raw or parsed AI content.

A contracts module imports from the app only other ``app.contracts`` modules (A9).
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

AiStatus = Literal["ok", "insufficient_content"]

Pages = list[Annotated[int, Field(strict=True)]]


class _AiModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, hide_input_in_errors=True)


class Summary(_AiModel):
    text: str
    pages: Pages


class Flashcard(_AiModel):
    front: str
    back: str
    pages: Pages


class QuizItem(_AiModel):
    question: str
    answer: str
    pages: Pages


class KeyConcept(_AiModel):
    term: str
    explanation: str
    pages: Pages


class AiOutput(_AiModel):
    """The full AD-9 reply that Gate 2 parses when ``status`` is ``ok``."""

    status: AiStatus
    summary: Summary
    flashcards: list[Flashcard]
    quiz: list[QuizItem]
    key_concepts: list[KeyConcept]
