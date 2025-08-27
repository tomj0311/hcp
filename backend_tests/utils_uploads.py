from __future__ import annotations

import os
import io
from datetime import datetime
from typing import List, Tuple


def make_dummy_files() -> List[Tuple[str, Tuple[str, bytes, str]]]:
    """Return a list of (field, (filename, content, mimetype)) tuples.

    Includes: jpeg, png, txt, json, csv, pdf, docx
    """
    files: List[Tuple[str, Tuple[str, bytes, str]]] = []

    # Minimal-ish content; server validates content-type, not file structure
    files.append(("files", ("sample.jpg", b"\xff\xd8\xffDUMMYJPEG", "image/jpeg")))
    files.append(("files", ("sample.png", b"\x89PNG\r\n\x1a\nDUMMYPNG", "image/png")))
    files.append(("files", ("sample.txt", b"hello world", "text/plain")))
    files.append(("files", ("sample.json", b"{\n  \"ok\": true\n}", "application/json")))
    files.append(("files", ("sample.csv", b"a,b,c\n1,2,3\n", "text/csv")))
    files.append(("files", ("sample.pdf", b"%PDF-1.4\n%Dummy PDF\n", "application/pdf")))
    files.append(("files", ("sample.docx", b"DUMMY-DOCX", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")))

    return files


def upload_samples_via_api(client, set_auth_user, email: str = "test@test.com"):
    """Use FastAPI test client to upload dummy files as a given user."""
    set_auth_user({"role": "consumer", "id": "test", "email": email})
    files = make_dummy_files()
    r = client.post("/uploads/upload", files=files)
    assert r.status_code == 200, r.text
    return r.json()
