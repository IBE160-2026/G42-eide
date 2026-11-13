"""The normalised Generation Inputs for one pass (A2, FR-2).

Raw inputs are normalised by the pipeline (``read_generation_inputs``); this model only
holds the result. A contracts module imports only other ``app.contracts`` modules (A9).
"""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.contracts.options import DetailLevel, OutputLanguage

MAX_COURSE_CODE_CHARS = 100


class GenerationInputs(BaseModel):
    """``course_code`` is sanitised text (``""`` when unset); the options are closed values."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    course_code: Annotated[str, Field(max_length=MAX_COURSE_CODE_CHARS)]
    detail_level: DetailLevel
    output_language: OutputLanguage
