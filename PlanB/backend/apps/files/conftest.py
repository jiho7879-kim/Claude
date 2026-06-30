"""Fixture helpers for apps.files tests.

Django's FileField may leave open file handles when saving uploaded files
during tests. The handles are closed during garbage collection, which can
trigger a ResourceWarning (→ PytestUnraisableExceptionWarning) at
unpredictable points. This autouse fixture forces GC after every test.
"""

import gc

import pytest


@pytest.fixture(autouse=True)
def _force_gc_after_upload():
    """Force garbage collection after each test to clean up file handles.

    Without this, Django's FileField may emit ResourceWarning from unclosed
    file handles during the *next* test (when GC happens to fire), which
    pytest's unraisable-exception plugin converts to a hard failure.
    """
    yield
    gc.collect()
