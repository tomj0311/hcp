"""Pytest configuration and shared fixtures for backend tests.

This sets up import paths, optional dotenv loading, and provides a FastAPI
TestClient wired with fake in-memory DB/bucket so routes can be exercised
without a running MongoDB or Stripe.
"""
from __future__ import annotations

import sys
import types
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# ---- Pytest per-test logging -------------------------------------------------
try:  # pytest is only present in test environments
    import pytest  # type: ignore
except Exception:  # pragma: no cover - allow file import without pytest installed
    pytest = None  # type: ignore


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


# Emit one-line PASS/FAIL logs for each test and a compact summary at the end.
if pytest is not None:  # only define hooks when pytest is available
    _reported: set[str] = set()
    _counts = {"PASS": 0, "FAIL": 0, "SKIP": 0, "XFAIL": 0, "XPASS": 0}

    def _print(line: str) -> None:
        # Use plain print so output shows even with -q; avoid capturing noise.
        try:
            print(line)
        except Exception:
            pass

    @pytest.hookimpl(hookwrapper=True)
    def pytest_runtest_protocol(item):  # type: ignore
        yield

    @pytest.hookimpl
    def pytest_runtest_logreport(report):  # type: ignore
        nodeid = getattr(report, "nodeid", "")
        if not nodeid or nodeid in _reported:
            if report.when == "teardown" and report.failed and nodeid:
                if nodeid not in _reported:
                    _reported.add(nodeid)
                    _counts["FAIL"] += 1
                    _print(f"❌ FAIL {nodeid} (teardown)")
            return

        status = None
        reason = None
        duration = getattr(report, "duration", 0.0)

        if report.when == "call":
            if report.passed and getattr(report, "wasxfail", None):
                status = "XPASS"
                reason = getattr(report, "wasxfail", None)
            elif report.passed:
                status = "PASS"
            elif report.failed:
                status = "FAIL"
                try:
                    lr = report.longrepr
                    if hasattr(lr, "reprcrash"):
                        reason = getattr(lr.reprcrash, "message", None)
                    else:
                        reason = str(lr)
                except Exception:
                    reason = None
        elif report.when == "setup":
            if report.skipped and getattr(report, "wasxfail", None):
                status = "XFAIL"
                reason = getattr(report, "wasxfail", None)
            elif report.skipped:
                status = "SKIP"
                try:
                    reason = str(report.longrepr)
                except Exception:
                    reason = None

        if status:
            _reported.add(nodeid)
            _counts[status] = _counts.get(status, 0) + 1
            emoji = {
                "PASS": "✅",
                "FAIL": "❌",
                "SKIP": "⏭️",
                "XFAIL": "🟡",
                "XPASS": "⚠️",
            }.get(status, "•")
            tail = f" ({duration:.2f}s)"
            if reason:
                _print(f"{emoji} {status} {nodeid}{tail} — {reason}")
            else:
                _print(f"{emoji} {status} {nodeid}{tail}")

    @pytest.hookimpl
    def pytest_sessionfinish(session, exitstatus):  # type: ignore
        total = sum(_counts.values())
        if total:
            _print(
                f"\n📋 Test results: PASS={_counts['PASS']} FAIL={_counts['FAIL']} "
                f"SKIP={_counts['SKIP']} XFAIL={_counts['XFAIL']} XPASS={_counts['XPASS']} "
                f"(total logged={total})"
            )


# --------------------------- Test scaffolding ---------------------------------
def _match(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    if not query:
        return True
    for k, v in query.items():
        if k == "$or" and isinstance(v, list):
            if any(_match(doc, q) for q in v):
                return True
            return False
        # Support dot path like metadata.email
        if "." in k:
            parts = k.split(".")
            cur: Any = doc
            ok = True
            for p in parts:
                if isinstance(cur, dict) and p in cur:
                    cur = cur[p]
                else:
                    ok = False
                    break
            if not ok or cur != v:
                return False
        else:
            if doc.get(k) != v:
                return False
    return True


class FakeCursor:
    def __init__(self, docs: List[Dict[str, Any]], query: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
        self._docs = [d for d in docs if _match(d, query or {})]
        self._projection = projection
        self._sort_key: Optional[str] = None
        self._sort_dir: int = 1

    def sort(self, key: str, direction: int):
        self._sort_key = key
        self._sort_dir = direction
        return self

    async def to_list(self, limit: Optional[int]):
        items = list(self._docs)
        if self._sort_key is not None:
            items.sort(key=lambda x: x.get(self._sort_key), reverse=(self._sort_dir == -1))
        if self._projection:
            omit = {k for k, v in self._projection.items() if v == 0}
            items = [
                {k: v for k, v in d.items() if k not in omit}
                for d in items
            ]
        return items if limit in (None, 0) else items[:limit]


class FakeCollection:
    def __init__(self):
        self.docs: List[Dict[str, Any]] = []

    async def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, int]] = None):
        for d in self.docs:
            if _match(d, query):
                if projection:
                    omit = {k for k, v in projection.items() if v == 0}
                    return {k: v for k, v in d.items() if k not in omit}
                return d
        return None

    def find(self, query: Optional[Dict[str, Any]] = None, projection: Optional[Dict[str, int]] = None):
        return FakeCursor(self.docs, query or {}, projection)

    async def insert_one(self, doc: Dict[str, Any]):
        self.docs.append(dict(doc))
        return types.SimpleNamespace(inserted_id=doc.get("id") or str(uuid.uuid4()))

    async def update_one(self, filter: Dict[str, Any], update: Dict[str, Any]):
        for d in self.docs:
            if _match(d, filter):
                if "$set" in update:
                    d.update(update["$set"])
                return types.SimpleNamespace(modified_count=1)
        return types.SimpleNamespace(modified_count=0)

    async def delete_one(self, filter: Dict[str, Any]):
        for i, d in enumerate(self.docs):
            if _match(d, filter):
                self.docs.pop(i)
                return types.SimpleNamespace(deleted_count=1)
        return types.SimpleNamespace(deleted_count=0)

    async def estimated_document_count(self):
        return len(self.docs)

    async def create_index(self, *args, **kwargs):  # for compatibility in ensure_indexes
        return "ok"


@dataclass
class FakeFileDoc:
    _id: str
    filename: str
    length: int
    upload_date: datetime
    content_type: Optional[str]
    metadata: Dict[str, Any]
    content: bytes


class FakeBucketCursor:
    def __init__(self, docs: List[FakeFileDoc], query: Dict[str, Any]):
        # Only simple metadata.email and filename filters are used in code
        def match(doc: FakeFileDoc) -> bool:
            for k, v in query.items():
                if k == "filename":
                    if doc.filename != v:
                        return False
                elif k == "metadata.email":
                    if doc.metadata.get("email") != v:
                        return False
                else:
                    return False
            return True

        self._docs = [d for d in docs if match(d)]

    async def to_list(self, limit: Optional[int]):
        return self._docs if limit in (None, 0) else self._docs[:limit]


class FakeBucket:
    def __init__(self):
        self.files: List[FakeFileDoc] = []

    async def upload_from_stream(self, filename: str, stream, metadata: Optional[Dict[str, Any]] = None):
        content = stream.read()
        fid = str(uuid.uuid4())
        doc = FakeFileDoc(
            _id=fid,
            filename=filename,
            length=len(content),
            upload_date=datetime.now(),
            content_type=None,
            metadata=metadata or {},
            content=content,
        )
        self.files.append(doc)
        return fid

    def find(self, query: Dict[str, Any]):
        return FakeBucketCursor(self.files, query)

    async def find_one(self, query: Dict[str, Any]):
        cursor = FakeBucketCursor(self.files, query)
        docs = await cursor.to_list(None)
        return docs[0] if docs else None

    def open_download_stream(self, file_id: str):
        class _Stream:
            def __init__(self, file: FakeFileDoc):
                self._file = file

            async def read(self) -> bytes:
                return self._file.content

        for f in self.files:
            if f._id == file_id:
                return _Stream(f)
        raise FileNotFoundError()


@pytest.fixture()
def fake_collections():
    """Provide isolated in-memory collections per test and helpers to patch routers."""
    collections = {
        "consumers": FakeCollection(),
        "providers": FakeCollection(),
        "verificationTokens": FakeCollection(),
        "events": FakeCollection(),
    }
    return collections


@pytest.fixture()
def fake_bucket():
    return FakeBucket()


@pytest.fixture()
def app_with_routers(monkeypatch, fake_collections, fake_bucket):
    from fastapi import FastAPI
    from src.routes import auth as auth_routes, users as users_routes, payments as payments_routes, uploads as uploads_routes, meetups as meetups_routes, profile as profile_routes
    from src.utils import auth as auth_utils

    app = FastAPI()
    app.include_router(auth_routes.router, prefix="/auth")
    app.include_router(users_routes.router, prefix="/users")
    app.include_router(profile_routes.router, prefix="/profile")
    app.include_router(payments_routes.router, prefix="/payments")
    app.include_router(uploads_routes.router, prefix="/uploads")
    app.include_router(meetups_routes.router, prefix="/meetups")

    @app.get("/health")
    async def _health():
        return {"status": "ok"}

    # Patch DB/bucket accessors used inside routers
    monkeypatch.setattr(auth_routes, "get_collections", lambda: fake_collections, raising=False)
    monkeypatch.setattr(users_routes, "get_collections", lambda: fake_collections, raising=False)
    monkeypatch.setattr(profile_routes, "get_collections", lambda: fake_collections, raising=False)
    monkeypatch.setattr(meetups_routes, "get_collections", lambda: fake_collections, raising=False)
    monkeypatch.setattr(uploads_routes, "get_bucket", lambda: fake_bucket, raising=False)

    # Avoid sending emails during tests
    async def _noop(*args, **kwargs):
        return None
    monkeypatch.setattr(users_routes, "send_registration_email", _noop, raising=False)

    # Auth override machinery: allows tests to change the current user easily
    current_user: Dict[str, Any] = {}

    async def _override_auth():
        return current_user

    app.dependency_overrides[auth_utils.verify_token_middleware] = _override_auth

    # Provide helpers on app state for tests to switch auth identity
    app.state._set_user = lambda user: current_user.clear() or current_user.update(user or {})

    # Default to an admin identity for convenience in some tests
    app.state._set_user({"role": "admin", "id": "admin-1", "email": "admin@example.com", "username": "admin"})

    # Patch Stripe in payments route with a simple fake by default
    class _FakeStripe:
        class checkout:
            class Session:
                @staticmethod
                def create(**kwargs):
                    return types.SimpleNamespace(id="sess_123", url="https://stripe.test/checkout/sess_123")

        class StripeError(Exception):
            pass

    monkeypatch.setattr(payments_routes, "stripe", _FakeStripe, raising=False)

    return app


@pytest.fixture()
def client(app_with_routers):
    from fastapi.testclient import TestClient

    with TestClient(app_with_routers) as c:
        yield c


@pytest.fixture()
def set_auth_user(app_with_routers):
    """Helper to set the current auth user for a test: set_auth_user({role,id,email})."""
    def _set(user: Dict[str, Any]):
        app_with_routers.state._set_user(user)
    return _set


@pytest.fixture()
def client_no_auth(monkeypatch, fake_collections, fake_bucket):
    """A client that does NOT override auth, to assert 401 behavior without tokens."""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from src.routes import auth as auth_routes, users as users_routes, payments as payments_routes, uploads as uploads_routes, meetups as meetups_routes, profile as profile_routes

    app = FastAPI()
    app.include_router(auth_routes.router, prefix="/auth")
    app.include_router(users_routes.router, prefix="/users")
    app.include_router(profile_routes.router, prefix="/profile")
    app.include_router(payments_routes.router, prefix="/payments")
    app.include_router(uploads_routes.router, prefix="/uploads")
    app.include_router(meetups_routes.router, prefix="/meetups")

    @app.get("/health")
    async def _health():
        return {"status": "ok"}

    # Patch DB/bucket accessors used inside routers (but no auth override)
    monkeypatch.setattr(auth_routes, "get_collections", lambda: fake_collections, raising=False)
    monkeypatch.setattr(users_routes, "get_collections", lambda: fake_collections, raising=False)
    monkeypatch.setattr(profile_routes, "get_collections", lambda: fake_collections, raising=False)
    monkeypatch.setattr(meetups_routes, "get_collections", lambda: fake_collections, raising=False)
    monkeypatch.setattr(uploads_routes, "get_bucket", lambda: fake_bucket, raising=False)

    # Avoid emails
    async def _noop(*args, **kwargs):
        return None
    monkeypatch.setattr(users_routes, "send_registration_email", _noop, raising=False)

    with TestClient(app) as c:
        yield c

