"""Application factory and the settings-loading entry point.

Tests import from here; only ``app.main`` builds the app from the real environment.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.status import router as status_router
from app.config import Settings, SettingsRefused, load_settings


def create_app(settings: Settings) -> FastAPI:
    application = FastAPI(title="AI Study Buddy")
    application.state.settings = settings
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.allowed_origin],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        allow_credentials=False,
    )
    application.include_router(status_router)
    return application


def load_settings_or_exit() -> Settings:
    """Load the settings; on refusal exit non-zero printing only the Norwegian message."""
    try:
        return load_settings()
    except SettingsRefused as refusal:
        raise SystemExit(str(refusal)) from None


def build_app() -> FastAPI:
    """Build the app from the environment and ``backend/.env``."""
    return create_app(load_settings_or_exit())
