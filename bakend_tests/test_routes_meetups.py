import asyncio
from datetime import datetime, timedelta


def test_meetups_crud_and_permissions(client, set_auth_user):
    from src.routes import users as users_routes
    from src.utils.auth import hash_password, normalize_email

    cols = users_routes.get_collections()

    loop = asyncio.new_event_loop()

    consumer = {
        "id": "c1",
        "email": normalize_email("c1@example.com"),
        "emailOriginal": "c1@example.com",
        "password": hash_password("passw0rd"),
        "name": "C One",
        "active": True,
    }
    provider = {
        "id": "p1",
        "email": normalize_email("p1@example.com"),
        "emailOriginal": "p1@example.com",
        "password": hash_password("passw0rd"),
        "name": "P One",
        "active": True,
    }

    async def seed():
        await cols["consumers"].insert_one(consumer)
        await cols["providers"].insert_one(provider)

    loop.run_until_complete(seed())

    # Create meetup as consumer targeting provider
    set_auth_user({"role": "consumer", "id": "c1", "email": "c1@example.com"})
    start = (datetime.utcnow() + timedelta(hours=1)).isoformat() + "Z"
    end = (datetime.utcnow() + timedelta(hours=2)).isoformat() + "Z"
    r = client.post("/meetups/", json={
        "targetUserId": "p1",
        "start": start,
        "end": end,
        "title": "Intro",
        "description": "Hi",
    })
    assert r.status_code == 201, r.text
    event = r.json()
    event_id = event["id"]
    assert event["requesterId"] == "c1" and event["participantId"] == "p1"

    # Listing for consumer should include the meetup
    r = client.get("/meetups/")
    assert r.status_code == 200
    assert any(e["id"] == event_id for e in r.json())

    # Provider can view it as well
    set_auth_user({"role": "provider", "id": "p1", "email": "p1@example.com"})
    r = client.get(f"/meetups/{event_id}")
    assert r.status_code == 200

    # Random user cannot view
    set_auth_user({"role": "consumer", "id": "c2", "email": "c2@example.com"})
    r = client.get(f"/meetups/{event_id}")
    assert r.status_code == 403

    # Admin can view
    set_auth_user({"role": "admin", "id": "a1", "email": "admin@example.com"})
    r = client.get(f"/meetups/{event_id}")
    assert r.status_code == 200

    # Update title and status
    set_auth_user({"role": "provider", "id": "p1", "email": "p1@example.com"})
    r = client.patch(f"/meetups/{event_id}", json={"title": "Updated", "status": "cancelled"})
    assert r.status_code == 200
    out = r.json()
    assert out["title"] == "Updated" and out["status"] == "cancelled"

    # Invalid timing
    r = client.patch(f"/meetups/{event_id}", json={"start": end, "end": start})
    assert r.status_code == 400
