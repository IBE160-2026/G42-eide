"""The request a pass sends to an AI connector (AD-1, A1).

Story 1.9 adds ``ConnectorReply``, ``ConnectorError``, the connector interface and the
fakes next to this model. A contracts module imports only other ``app.contracts``
modules (A9).
"""

from pydantic import BaseModel, ConfigDict

from app.contracts.inputs import GenerationInputs


class ConnectorRequest(BaseModel):
    """The system instruction, the delimited data block and the normalised inputs."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    system: str
    document_block: str
    inputs: GenerationInputs
