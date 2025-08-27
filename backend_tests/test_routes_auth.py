from datetime import datetime


def test_auth_login_admin_success(client, set_auth_user):
    set_auth_user({})  # not required for login
    resp = client.post("/auth/login", json={"username": "admin", "password": "123"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "admin"
    assert "token" in data


def test_auth_login_consumer_and_provider_success(client, set_auth_user):
    # Seed a consumer and a provider
    from src.utils.auth import hash_password, normalize_email
    app = client.app
    cols = app.dependency_overrides.get(None)  # not used; access via monkeypatched routes
    # Retrieve fake collections from monkeypatched module via users router's get_collections lambda
    from src.routes import users as users_routes
    collections = users_routes.get_collections()

    consumer = {
        "id": "c-1",
        "email": normalize_email("c@example.com"),
        "emailOriginal": "c@example.com",
        "password": hash_password("passw0rd"),
        "name": "C One",
        "active": True,
    }
    provider = {
        "id": "p-1",
        "email": normalize_email("p@example.com"),
        "emailOriginal": "p@example.com",
        "password": hash_password("passw0rd"),
        "name": "P One",
        "active": True,
    }

    import asyncio

    async def seed():
        await collections["consumers"].insert_one(consumer)
        await collections["providers"].insert_one(provider)

    asyncio.run(seed())

    # Consumer login
    resp = client.post("/auth/login", json={"username": "c@example.com", "password": "passw0rd"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "consumer"

    # Provider login
    resp = client.post("/auth/login", json={"username": "p@example.com", "password": "passw0rd"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "provider"


def test_auth_login_errors(client):
    # Missing fields
    resp = client.post("/auth/login", json={"username": "", "password": ""})
    assert resp.status_code == 400
    # Invalid credentials
    resp = client.post("/auth/login", json={"username": "nope@example.com", "password": "bad"})
    assert resp.status_code == 401


def test_auth_google_placeholders(client):
    assert client.get("/auth/google").status_code == 501
    assert client.get("/auth/google/callback").status_code == 501


def test_auth_logout_and_me_require_auth(client, set_auth_user):
    set_auth_user({"role": "consumer", "id": "c-9", "email": "c9@example.com", "username": "c9"})
    out = client.post("/auth/logout")
    assert out.status_code == 200
    assert out.json()["message"]

    me = client.get("/auth/me")
    assert me.status_code == 200
    data = me.json()
    assert data["role"] == "consumer" and data["id"] == "c-9"
