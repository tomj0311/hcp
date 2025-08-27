def test_health_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_unauthorized_without_token(client_no_auth):
    # FastAPI's HTTPBearer returns 403 when the Authorization header is missing
    for path in [
        "/users/providers",
        "/users/consumers",
        "/profile/profile",
        "/profile/profile/completeness",
        "/meetups/",
        "/uploads/files",
    ]:
        assert client_no_auth.get(path).status_code == 403


def test_unauthorized_with_invalid_token_401(client_no_auth):
    # Providing an invalid/garbled token should yield 401 from our middleware
    headers = {"Authorization": "Bearer not_a_real_token"}
    r = client_no_auth.get("/users/providers", headers=headers)
    assert r.status_code == 401