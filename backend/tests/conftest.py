"""Shared test isolation.

Tests never read ``backend/.env`` or the real environment, never import ``app.main``,
and never use a real key.
"""

import os
import sys
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.application import create_app
from app.config import Settings, load_settings

SETTINGS_FIELDS = frozenset(Settings.model_fields)


@pytest.fixture(scope="session", autouse=True)
def _main_never_imported() -> Iterator[None]:
    # ``app.main`` builds the app from the real environment and ``backend/.env``.
    yield
    assert "app.main" not in sys.modules, "a test imported app.main"


@pytest.fixture(autouse=True)
def _isolate_settings(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    # pydantic-settings matches names case-insensitively, so clear every letter case.
    for name in list(os.environ):
        if name.lower() in SETTINGS_FIELDS:
            monkeypatch.delenv(name, raising=False)
    # Even a settings load without ``_env_file=None`` never sees ``backend/.env``.
    monkeypatch.setitem(Settings.model_config, "env_file", tmp_path / "absent.env")


@pytest.fixture
def make_settings() -> Callable[..., Settings]:
    def _make(**overrides: object) -> Settings:
        return load_settings(_env_file=None, **overrides)

    return _make


@pytest.fixture
def demo_app(make_settings: Callable[..., Settings]) -> FastAPI:
    return create_app(make_settings())


@pytest.fixture
def client(demo_app: FastAPI) -> Iterator[TestClient]:
    with TestClient(demo_app) as test_client:
        yield test_client
