import asyncio
from datetime import datetime, timedelta


def _seed(loop, collections, consumers=None, providers=None):
    async def _go():
        for c in consumers or []:
            await collections["consumers"].insert_one(c)
        for p in providers or []:
            await collections["providers"].insert_one(p)
    loop.run_until_complete(_go())


def test_consumer_registration_verify_and_login_flow(client, set_auth_user):
    from src.routes import users as users_routes
    from src.utils.auth import hash_password, normalize_email

    # Register consumer
    set_auth_user({})  # not needed for register
    body = {
        "firstName": "Jane",
        "lastName": "Doe",
        "email": "jane@example.com",
        "password": "passw0rd",
        "confirmPassword": "passw0rd",
        "phone": "1234567",
    }
    r = client.post("/users/consumers", json=body)
    assert r.status_code == 201, r.text
    data = r.json()
    assert "id" in data and "verifyToken" in data

    # Login before verify should fail with 403
    r = client.post("/users/consumers/login", json={"email": body["email"], "password": body["password"]})
    assert r.status_code == 403

    # Verify
    token = data["verifyToken"]
    r = client.post("/users/consumers/verify", json={"token": token})
    assert r.status_code == 200
    assert r.json()["status"] == "verified"

    # Now login works
    r = client.post("/users/consumers/login", json={"email": body["email"], "password": body["password"]})
    assert r.status_code == 200
    out = r.json()
    assert out["role"] == "consumer" and out["email"] == normalize_email(body["email"]) and out["id"]


def test_duplicate_email_and_phone_rejected_on_register(client, set_auth_user):
    from src.routes import users as users_routes
    from src.utils.auth import hash_password, normalize_email
    cols = users_routes.get_collections()
    loop = asyncio.new_event_loop()

    _seed(loop, cols, consumers=[{
        "id": "c-dup",
        "email": normalize_email("dup@example.com"),
        "emailOriginal": "dup@example.com",
        "password": hash_password("passw0rd"),
        "active": True,
        "phone": "9999999",
        "firstName": "D",
        "lastName": "U",
        "name": "D U",
    }])

    # Duplicate email
    body = {
        "firstName": "New",
        "lastName": "User",
        "email": "dup@example.com",
        "password": "passw0rd",
        "confirmPassword": "passw0rd",
    }
    r = client.post("/users/consumers", json=body)
    assert r.status_code == 400

    # Duplicate phone against consumers
    body["email"] = "notdup@example.com"
    body["phone"] = "9999999"
    r = client.post("/users/consumers", json=body)
    assert r.status_code == 400


def test_provider_register_and_list_requires_auth(client, set_auth_user):
    from src.routes import users as users_routes
    cols = users_routes.get_collections()

    # Register provider without password (should return tempPassword)
    set_auth_user({})
    body = {
        "firstName": "Doc",
        "lastName": "Tor",
        "email": "doc@example.com",
        "phone": "8888888",
        "organization": "Clinic",
        "specialization": "General",
    }
    r = client.post("/users/providers", json=body)
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "doc@example.com".lower()
    assert data.get("tempPassword")
    assert data["active"] is True
    assert "password" not in data

    # Listing providers requires auth
    set_auth_user({"role": "consumer", "id": "c1", "email": "c1@example.com"})
    r = client.get("/users/providers")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_create_consumer_requires_admin_and_sets_active(client, set_auth_user):
    # Non-admin forbidden
    set_auth_user({"role": "consumer", "id": "c2", "email": "c2@example.com"})
    body = {
        "firstName": "A",
        "lastName": "B",
        "email": "ab@example.com",
        "password": "passw0rd",
        "confirmPassword": "passw0rd",
    }
    r = client.post("/users/consumers/admin", json=body)
    assert r.status_code == 403

    # Admin allowed
    set_auth_user({"role": "admin", "id": "admin-1", "email": "admin@example.com"})
    r = client.post("/users/consumers/admin", json=body)
    assert r.status_code == 201
    out = r.json()
    assert out["active"] is True and out["email"] == "ab@example.com"


def test_legacy_endpoints_return_410(client, set_auth_user):
    set_auth_user({"role": "admin", "id": "admin-1", "email": "admin@example.com"})
    assert client.post("/users/patients").status_code == 410
    assert client.post("/users/patients/verify").status_code == 410
    assert client.post("/users/patients/login").status_code == 410
    assert client.get("/users/patients").status_code == 410
    assert client.post("/users/patients/admin").status_code == 410
    assert client.get("/users/doctors").status_code == 410
    assert client.post("/users/doctors").status_code == 410
