"""Fixture helpers for apps.notifications tests."""

import gc

import pytest


@pytest.fixture(autouse=True)
def _force_gc_after_test():
    """Force garbage collection after each test.

    Copied from apps.files.conftest for consistency across test suites.
    """
    yield
    gc.collect()
