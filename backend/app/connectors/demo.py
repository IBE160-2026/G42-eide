"""The demo connector: returns the bundled TEMPORARY fixture (Story 1.13; AD-4, AD-13).

``DemoConnector`` reads ``samples/demo-ai-output.json`` on every call and returns its text
unparsed (Gate 2 parses it), with ``stop="complete"`` and zero token counts. It creates no
provider client, makes no network call, never reads or parses the request, never logs and
never retries.

Installation faults (Story 1.13, D14): a missing or unreadable fixture raises ``OSError``
(or ``UnicodeDecodeError``). This is a documented, approved deviation from the
``Connector`` docstring's "may raise ``ConnectorError`` and nothing else", for local
installation faults only: no AI provider is involved, so no ``ConnectorError`` code fits.
Stage 4 lets the exception propagate and the catch-all turns it into ``internal_error``.
"""

from pathlib import Path

from app.contracts.connector import ConnectorReply, ConnectorRequest


class DemoConnector:
    """Returns the fixture file's text as the AI reply, read fresh on each call."""

    def __init__(self, fixture_path: Path) -> None:
        self._fixture_path = fixture_path

    def count_input_tokens(self, request: ConnectorRequest) -> int:
        """Always ``0``: the demo makes no paid call (D4)."""
        return 0

    def generate(self, request: ConnectorRequest) -> ConnectorReply:
        """The fixture's text (CRLF read as LF), ``stop="complete"``, zero tokens."""
        raw_json = self._fixture_path.read_text(encoding="utf-8")
        return ConnectorReply(raw_json=raw_json, stop="complete", input_tokens=0, output_tokens=0)
