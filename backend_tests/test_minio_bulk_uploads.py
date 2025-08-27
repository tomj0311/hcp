from backend_tests.utils_uploads import make_dummy_files, upload_samples_via_api


def test_bulk_uploads_to_minio_prefix(client, set_auth_user):
    email = "test@test.com"
    data = upload_samples_via_api(client, set_auth_user, email=email)
    assert data["userEmail"] == email
    assert data["bucket"] == "hcp"
    # We created 7 files
    assert len(data["files"]) == 7

    # Check list endpoint shows those files
    r = client.get("/uploads/files")
    assert r.status_code == 200
    listing = r.json()["files"]
    names = {f["filename"] for f in data["files"]}
    assert names.issubset({f["filename"] for f in listing})
