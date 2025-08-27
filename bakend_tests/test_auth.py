def test_password_hashing_and_verification():
    from src.utils.auth import hash_password, verify_password

    password = "test123"
    hashed = hash_password(password)
    assert verify_password(password, hashed)


def test_jwt_token_roundtrip():
    from src.utils.auth import generate_token, verify_token

    payload = {"user_id": "test", "role": "consumer"}
    token = generate_token(payload.copy())
    decoded = verify_token(token)
    assert decoded["user_id"] == "test"
    assert decoded["role"] == "consumer"
