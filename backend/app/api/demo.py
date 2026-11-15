"""``POST /api/demo``: one demo Generation Pass on the bundled sample (Story 1.13; AR-14, AD-13).

Order (spec "Route"):

1. ``demo_preconditions`` (``async``, on the event loop, before the endpoint):
   - real mode (no ``state.demo_runner``): ``demo_not_enabled`` (403);
   - the request body, as delivered by the server, is read one ASGI message at a time; the
     first non-empty message ends the read with ``invalid_request`` (400). Headers never
     decide. A ``ClientDisconnect`` while reading is also ``invalid_request`` (D15).
2. The endpoint (plain ``def``, so FastAPI runs it and ``run_pass`` in its thread pool):
   fixed inputs through ``read_generation_inputs``, the sample's bytes, then ``run_pass``.
   The pass lock is taken only inside ``run_pass``, so a waiting precondition never holds it.

Nothing here logs; failures keep the existing single code-only error line.
"""

from fastapi import APIRouter, Depends, Request
from starlette.requests import ClientDisconnect

from app.api.errors import AppError
from app.contracts.responses import GenerationResponse
from app.pipeline.stage3_prompt import read_generation_inputs
from app.samples import SAMPLE_PDF

router = APIRouter()


async def demo_preconditions(request: Request) -> None:
    """Refuse real mode, then any non-empty body, before the pass lock."""
    if request.app.state.demo_runner is None:
        raise AppError("demo_not_enabled")
    try:
        async for chunk in request.stream():
            if chunk:
                raise AppError("invalid_request")
    except ClientDisconnect:
        raise AppError("invalid_request") from None


@router.post("/api/demo", dependencies=[Depends(demo_preconditions)])
def post_demo(request: Request) -> GenerationResponse:
    """Run one pass on the bundled sample with the fixed demo inputs (``standard``, ``nb``)."""
    state = request.app.state
    inputs = read_generation_inputs(course_code=None, detail_level="standard", output_language="nb")
    pdf = state.demo_sample_pdf.read_bytes()
    return state.demo_runner.run_pass(pdf, SAMPLE_PDF, inputs, "sample")
