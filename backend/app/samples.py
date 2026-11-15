"""Fixed paths to the bundled sample files (Story 1.13, D3).

``SAMPLES_DIR`` is the repository's ``samples/`` folder, found from this file's location, so
it is the same whatever the working directory. No setting controls it. Among production
modules only ``app.application`` (paths) and ``app.api.demo`` (the filename passed to stage 1)
import this module; the demo connector receives its path from the caller.
"""

from pathlib import Path

SAMPLES_DIR = Path(__file__).resolve().parents[2] / "samples"
SAMPLE_PDF = "innkjop-og-lager.pdf"
DEMO_FIXTURE = "demo-ai-output.json"
DEMO_RESPONSE = "demo-response.json"
