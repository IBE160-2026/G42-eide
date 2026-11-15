"""Write the two recorded envelopes of Story 1.13 (D8, D10). The only writer of these files.

Run from ``backend/``::

    uv run python -m scripts.write_fixtures

It builds the real app with default settings and records:

- ``samples/demo-response.json``: the exact ``POST /api/demo`` success reply (AR-13, AD-12);
- ``frontend/__tests__/status-response.json``: the default demo-mode ``GET /api/status``
  reply, a test-only artifact for the frontend status-drift check.

``render_fixtures()`` produces both files' bytes in memory and writes nothing; ``main()``
writes them. Settings are built with ``_env_file=None`` and every field passed explicitly at
its default, so neither the environment nor ``backend/.env`` can change the output.

Byte format: ``json.dumps(value, ensure_ascii=False, indent=2) + "\\n"``, UTF-8 without a
byte-order mark, LF line endings (written as bytes), keys in the order the reply produced
them. Tests compare parsed JSON, so a CRLF checkout on Windows still compares equal.
"""

import json
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from app.application import create_app
from app.config import Settings, load_settings
from app.samples import DEMO_RESPONSE, SAMPLES_DIR

REPO_ROOT = SAMPLES_DIR.parent
DEMO_RESPONSE_PATH = SAMPLES_DIR / DEMO_RESPONSE
STATUS_RESPONSE_PATH = REPO_ROOT / "frontend" / "__tests__" / "status-response.json"


def default_settings() -> Settings:
    """Settings at their declared defaults, ignoring the environment and any ``.env`` file."""
    defaults = {
        name: field.get_default(call_default_factory=True) for name, field in Settings.model_fields.items()
    }
    return load_settings(_env_file=None, **defaults)


def encode(value: Any) -> bytes:
    """The fixed byte format of both recorded files."""
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def render_fixtures() -> dict[Path, bytes]:
    """Both recorded files' bytes, rendered in memory from the real app; writes nothing."""
    application = create_app(default_settings())
    with TestClient(application) as client:
        demo = client.post("/api/demo")
        status = client.get("/api/status")
    if demo.status_code != 200 or status.status_code != 200:
        raise RuntimeError(f"unexpected replies: demo {demo.status_code}, status {status.status_code}")
    return {
        DEMO_RESPONSE_PATH: encode(demo.json()),
        STATUS_RESPONSE_PATH: encode(status.json()),
    }


def main() -> int:
    for path, data in render_fixtures().items():
        path.write_bytes(data)
        print(f"wrote {path.relative_to(REPO_ROOT).as_posix()} ({len(data)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
