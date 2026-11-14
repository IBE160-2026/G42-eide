"""The pass lock: one Generation Pass at a time (AD-16, D5, D6).

One ``PassGuard`` per application instance (``app.state.pass_guard``). In the supported
single-process deployment that is backend-wide; several worker processes or app instances
would each have their own guard. The paid-call counter is added in Story 2.2.

Ownership is a usage rule (``threading.Lock`` has no owner): only a caller whose own
``try_acquire()`` returned ``True`` may call ``release()``, exactly once, in ``finally``.
``locked()`` is observational only and must never decide whether to acquire or release.
"""

import threading


class PassGuard:
    """A non-blocking, non-re-entrant pass lock."""

    def __init__(self) -> None:
        self._lock = threading.Lock()

    def try_acquire(self) -> bool:
        """Take the lock without waiting; ``False`` at once when it is already held."""
        return self._lock.acquire(blocking=False)

    def release(self) -> None:
        """Release a held lock; releasing an unheld lock raises ``RuntimeError``."""
        self._lock.release()

    def locked(self) -> bool:
        """Whether the lock is held at the moment of the call (may be stale at once)."""
        return self._lock.locked()
