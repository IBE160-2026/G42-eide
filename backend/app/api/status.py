"""``GET /api/status``: mode, limits, options and accepted types (AR-24)."""

from fastapi import APIRouter, Request

from app.config import Settings
from app.contracts.options import ACCEPTED_TYPES, StatusLimits, StatusResponse, build_status_options

router = APIRouter()


@router.get("/api/status", response_model=StatusResponse)
def get_status(request: Request) -> StatusResponse:
    settings: Settings = request.app.state.settings
    return StatusResponse(
        mode=settings.ai_mode,
        limits=StatusLimits(
            max_upload_bytes=settings.max_upload_bytes,
            max_pdf_pages=settings.max_pdf_pages,
            max_text_chars=settings.max_text_chars,
        ),
        options=build_status_options(),
        accepted_types=list(ACCEPTED_TYPES),
    )
