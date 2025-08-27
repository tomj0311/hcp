"""Pytest configuration and shared fixtures for backend tests.

This adjusts sys.path so tests can import from backend_python/src, and loads
environment variables if a .env file is present at the repo root or backend dir.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path


def _add_backend_to_syspath() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    backend_dir = repo_root / "backend_python"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))


def _load_dotenv_if_available() -> None:
    try:
        from dotenv import load_dotenv  # type: ignore
    except Exception:
        return

    repo_root = Path(__file__).resolve().parents[1]
    backend_dir = repo_root / "backend_python"

    # Load root .env first, then backend one (backend can override)
    root_env = repo_root / ".env"
    backend_env = backend_dir / ".env"
    if root_env.exists():
        load_dotenv(dotenv_path=str(root_env))
    if backend_env.exists():
        load_dotenv(dotenv_path=str(backend_env), override=True)


# Perform setup at import time
_add_backend_to_syspath()
_load_dotenv_if_available()
