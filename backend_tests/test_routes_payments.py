def test_payments_checkout_session_success(client, set_auth_user, monkeypatch):
    set_auth_user({"role": "consumer", "id": "c1", "email": "c1@example.com"})
    r = client.post("/payments/checkout-session", json={"plan": "consultation"})
    assert r.status_code == 200
    data = r.json()
    assert data["id"].startswith("sess_") and data["url"].startswith("https://")


def test_payments_checkout_session_error(client, set_auth_user, monkeypatch):
    # Replace stripe in router with an erroring fake
    from src.routes import payments as payments_routes

    class _ErrStripe:
        class checkout:
            class Session:
                @staticmethod
                def create(**kwargs):
                    raise _ErrStripe.StripeError("boom")

        class StripeError(Exception):
            pass

    monkeypatch.setattr(payments_routes, "stripe", _ErrStripe, raising=False)

    set_auth_user({"role": "consumer", "id": "c1", "email": "c1@example.com"})
    r = client.post("/payments/checkout-session", json={"plan": "enterprise"})
    assert r.status_code == 500
