"""Closed option lists, defaults, accepted file types and the status body.

This module imports nothing from the app (AR-18, AR-4).
"""

from typing import Literal, get_args

from pydantic import BaseModel, ConfigDict

AiMode = Literal["demo", "real"]
DEFAULT_AI_MODE: AiMode = "demo"

DetailLevel = Literal["brief", "standard", "detailed"]
DETAIL_LEVELS: tuple[DetailLevel, ...] = get_args(DetailLevel)
DEFAULT_DETAIL_LEVEL: DetailLevel = "standard"

OutputLanguage = Literal["nb", "en"]
OUTPUT_LANGUAGES: tuple[OutputLanguage, ...] = get_args(OutputLanguage)
DEFAULT_OUTPUT_LANGUAGE: OutputLanguage = "nb"

ACCEPTED_TYPES: tuple[str, ...] = ("application/pdf", "text/plain")


class _Closed(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class StatusLimits(_Closed):
    max_upload_bytes: int
    max_pdf_pages: int
    max_text_chars: int


class DetailLevelOption(_Closed):
    values: list[DetailLevel]
    default: DetailLevel


class OutputLanguageOption(_Closed):
    values: list[OutputLanguage]
    default: OutputLanguage


class StatusOptions(_Closed):
    detail_level: DetailLevelOption
    output_language: OutputLanguageOption


class StatusResponse(_Closed):
    """Body of ``GET /api/status`` (AR-24)."""

    mode: AiMode
    limits: StatusLimits
    options: StatusOptions
    accepted_types: list[str]


def build_status_options() -> StatusOptions:
    """The option lists and defaults exactly as the contract defines them."""
    return StatusOptions(
        detail_level=DetailLevelOption(values=list(DETAIL_LEVELS), default=DEFAULT_DETAIL_LEVEL),
        output_language=OutputLanguageOption(
            values=list(OUTPUT_LANGUAGES), default=DEFAULT_OUTPUT_LANGUAGE
        ),
    )
