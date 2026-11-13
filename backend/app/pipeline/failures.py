"""The failure a pipeline stage raises to stop a pass (AD-11).

The api layer converts it into an error reply; this module never imports ``app.api``.
"""

from app.contracts.errors import ERROR_CODES, LIMIT_KINDS, ErrorCode, LimitKind

_FRAMEWORK_ONLY: frozenset[ErrorCode] = frozenset({"not_found", "method_not_allowed"})


class PassFailure(Exception):
    """A stage stopped the pass with a code from the closed list."""

    def __init__(self, code: ErrorCode, limit: LimitKind | None = None) -> None:
        if code not in ERROR_CODES:
            raise ValueError("unknown error code")
        if code in _FRAMEWORK_ONLY:
            raise ValueError("this error code comes only from the framework")
        if code == "file_too_large":
            if limit not in LIMIT_KINDS:
                raise ValueError("file_too_large needs a limit")
        elif limit is not None:
            raise ValueError("only file_too_large takes a limit")
        super().__init__(code)
        self.code: ErrorCode = code
        self.limit: LimitKind | None = limit
