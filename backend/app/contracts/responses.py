"""The success reply of one Generation Pass (AD-11, D9).

``{mode, results, skipped_pages}``. Collections are tuples internally and JSON arrays in
``model_dump(mode="json")``, ``model_dump_json()`` and ``jsonable_encoder``; plain
``model_dump()`` keeps tuples, so callers serialise in JSON mode. ``results`` must already
be a ``ValidatedResults`` instance: a dict or another model is rejected, not rebuilt.

The model holds AI text and shows it in ``repr()``/``model_dump()``: never log it.

A contracts module imports from the app only other ``app.contracts`` modules (A9).
"""

from pydantic import BaseModel, ConfigDict, InstanceOf

from app.contracts.options import AiMode
from app.contracts.results import ResultPages, ValidatedResults


class GenerationResponse(BaseModel):
    """The success envelope: mode from settings, validated results, skipped PDF pages."""

    model_config = ConfigDict(extra="forbid", frozen=True, hide_input_in_errors=True)

    mode: AiMode
    results: InstanceOf[ValidatedResults]
    skipped_pages: ResultPages
