import io


def test_upload_list_and_download_files(client, set_auth_user):
    set_auth_user({"role": "consumer", "id": "c1", "email": "c1@example.com"})

    # Upload two files
    files = [
        ("files", ("a.txt", b"hello", "text/plain")),
        ("files", ("b.json", b"{}", "application/json")),
    ]
    r = client.post("/uploads/upload", files=files)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["message"]
    assert len(data["files"]) == 2
    fname = data["files"][0]["filename"]

    # List
    r = client.get("/uploads/files")
    assert r.status_code == 200
    listing = r.json()["files"]
    assert any(f["filename"] == fname for f in listing)

    # Download
    r = client.get(f"/uploads/files/{fname}")
    assert r.status_code == 200
    assert r.content in (b"hello", b"{}")


def test_upload_rejects_disallowed_type_and_too_many_files(client, set_auth_user):
    set_auth_user({"role": "consumer", "id": "c1", "email": "c1@example.com"})

    # Disallowed content type
    r = client.post("/uploads/upload", files=[("files", ("evil.exe", b"bin", "application/x-msdownload"))])
    assert r.status_code == 400

    # Too many files (11)
    files = [("files", (f"f{i}.txt", b"x", "text/plain")) for i in range(11)]
    r = client.post("/uploads/upload", files=files)
    assert r.status_code == 400
