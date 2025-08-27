import asyncio


def test_profile_get_update_and_completeness(client, set_auth_user):
    from src.routes import users as users_routes
    from src.utils.auth import hash_password

    cols = users_routes.get_collections()

    async def seed():
        await cols["consumers"].insert_one({
            "id": "c1",
            "role": "consumer",
            "email": "c1@example.com",
            "password": hash_password("passw0rd"),
            "firstName": "C",
            "lastName": "One",
            "name": "C One",
            "active": True,
        })
        await cols["providers"].insert_one({
            "id": "p1",
            "role": "provider",
            "email": "p1@example.com",
            "password": hash_password("passw0rd"),
            "firstName": "P",
            "lastName": "One",
            "name": "P One",
            "active": True,
        })

    asyncio.run(seed())

    # Consumer get profile
    set_auth_user({"role": "consumer", "id": "c1", "email": "c1@example.com"})
    r = client.get("/profile/profile")
    assert r.status_code == 200
    assert r.json()["email"] == "c1@example.com"

    # Update adds phone and updates name
    r = client.put("/profile/profile", json={"phone": "1234567", "firstName": "New"})
    assert r.status_code == 200
    out = r.json()
    assert out["phone"] == "1234567" and out["name"].startswith("New ")

    # Completeness for consumer requires phone
    r = client.get("/profile/profile/completeness")
    assert r.status_code == 200
    comp = r.json()
    assert comp["completionPercentage"] >= 50

    # Provider completeness requires org and specialization
    set_auth_user({"role": "provider", "id": "p1", "email": "p1@example.com"})
    r = client.get("/profile/profile/completeness")
    assert r.status_code == 200
    comp = r.json()
    assert not comp["isComplete"]

    # Update provider
    r = client.put("/profile/profile", json={"organization": "Clinic", "specialization": "General", "phone": "5555555"})
    assert r.status_code == 200
    r = client.get("/profile/profile/completeness")
    assert r.status_code == 200
    assert r.json()["isComplete"] is True
