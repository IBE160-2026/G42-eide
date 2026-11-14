"""The validated Results contract: what stage 5 hands to stage 6 (AD-10, AD-11, D1, D2).

Contract-level invariants only: frozen models, extra fields forbidden, the shared text rule,
and strict positive, strictly increasing page numbers. Document-kind rules (a PDF item needs
at least one supplied page; plain text has no pages) and the minimum item counts are stage
5's job. So a ``ValidatedResults`` built directly proves only these contract-level
invariants; only one returned by ``validate_output`` has also passed the minimum counts and
page-marker validation.

Collections are immutable tuples internally; ``model_dump(mode="json")``,
``model_dump_json()`` and FastAPI's ``jsonable_encoder`` emit JSON arrays, while plain
``model_dump()`` returns tuples. The models hold AI text and show it in ``repr()`` and
``model_dump()``: never log them. ``hide_input_in_errors`` hides input only from ``str()``
and ``repr()`` of a validation error, not from ``errors()`` or ``json()``.

A contracts module imports from the app only other ``app.contracts`` modules (A9).
"""

from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StrictStr

_TEXT_MESSAGE = "text must contain non-whitespace characters and no lone surrogates"
_PAGES_MESSAGE = "pages must be strictly increasing"
_SURROGATE_FIRST = 0xD800
_SURROGATE_LAST = 0xDFFF


def is_valid_result_text(value: str) -> bool:
    """The shared text rule (D3): not empty or whitespace-only, and no lone surrogate.

    Whitespace follows ``str.strip()``. The value is never encoded, so no error can carry it.
    """
    if not value.strip():
        return False
    return not any(_SURROGATE_FIRST <= ord(char) <= _SURROGATE_LAST for char in value)


def _check_text(value: str) -> str:
    if not is_valid_result_text(value):
        raise ValueError(_TEXT_MESSAGE)
    return value


def _check_pages(value: tuple[int, ...]) -> tuple[int, ...]:
    if any(earlier >= later for earlier, later in zip(value, value[1:])):
        raise ValueError(_PAGES_MESSAGE)
    return value


ResultText = Annotated[StrictStr, AfterValidator(_check_text)]
ResultPages = Annotated[
    tuple[Annotated[int, Field(strict=True, gt=0)], ...], AfterValidator(_check_pages)
]


class _ResultModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, hide_input_in_errors=True)


class ValidatedSummary(_ResultModel):
    text: ResultText
    pages: ResultPages


class ValidatedFlashcard(_ResultModel):
    front: ResultText
    back: ResultText
    pages: ResultPages


class ValidatedQuizItem(_ResultModel):
    question: ResultText
    answer: ResultText
    pages: ResultPages


class ValidatedKeyConcept(_ResultModel):
    term: ResultText
    explanation: ResultText
    pages: ResultPages


class ValidatedResults(_ResultModel):
    """The four Result types after stage 5; no ``status`` (only ``ok`` produces one).

    Direct construction proves only the contract-level invariants. Only an instance returned
    by ``validate_output`` has also passed stage 5's minimum counts and document-kind and
    page-marker checks.
    """

    summary: ValidatedSummary
    flashcards: tuple[ValidatedFlashcard, ...]
    quiz: tuple[ValidatedQuizItem, ...]
    key_concepts: tuple[ValidatedKeyConcept, ...]
