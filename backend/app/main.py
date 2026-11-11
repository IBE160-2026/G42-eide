"""Module-level app for the README command ``uv run uvicorn app.main:app ...``."""

from app.application import build_app

app = build_app()
