import uuid
import secrets
import string
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, validator

from ..db import get_collections
from ..utils.auth import (
    hash_password, 
    verify_password, 
    normalize_email,
    verify_token_middleware
)
from ..services.email_service import send_registration_email

router = APIRouter()

# Pydantic models
class ConsumerRegistration(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    confirmPassword: str
    phone: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    address1: Optional[str] = None
    address2: Optional[str] = None

    @validator('confirmPassword')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('password')
    def password_length(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

    @validator('phone')
    def phone_length(cls, v):
        if v and (len(v) < 7 or len(v) > 20):
            raise ValueError('Phone length invalid')
        return v


class ProviderRegistration(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: Optional[str] = None
    confirmPassword: Optional[str] = None
    phone: Optional[str] = None
    organization: Optional[str] = None
    specialization: Optional[str] = None
    bio: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    address1: Optional[str] = None
    address2: Optional[str] = None
    postalCode: Optional[str] = None
    aiAgent: Optional[str] = None

    @validator('confirmPassword')
    def passwords_match(cls, v, values):
        if 'password' in values and values['password'] and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('password')
    def password_length(cls, v):
        if v and len(v) < 8:
            raise ValueError('Password must be at least 8 characters when provided')
        return v


class ConsumerLogin(BaseModel):
    email: EmailStr
    password: str


class VerifyToken(BaseModel):
    token: str


# Helper functions
async def email_exists(email: str) -> bool:
    """Check if email exists in either providers or consumers collection"""
    target = normalize_email(email)
    collections = get_collections()
    
    provider = await collections['providers'].find_one({"email": target})
    consumer = await collections['consumers'].find_one({"email": target})
    
    return bool(provider or consumer)


async def phone_exists(phone: str) -> bool:
    """Check if phone exists in either providers or consumers collection"""
    if not phone:
        return False
    
    target = phone.strip()
    collections = get_collections()
    
    provider = await collections['providers'].find_one({"phone": target})
    consumer = await collections['consumers'].find_one({"phone": target})
    
    return bool(provider or consumer)


def generate_random_password() -> str:
    """Generate a random password"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(12))


# Routes
@router.post("/consumers", status_code=status.HTTP_201_CREATED)
async def register_consumer(registration: ConsumerRegistration):
    """Register a new consumer"""
    
    # Check for duplicate email
    if await email_exists(registration.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please log in or use a different email."
        )
    
    # Check for duplicate phone
    if registration.phone and await phone_exists(registration.phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already associated with an existing account."
        )
    
    # Create consumer
    collections = get_collections()
    hashed_password = hash_password(registration.password)
    consumer_id = str(uuid.uuid4())
    
    consumer_data = {
        "id": consumer_id,
        "role": "consumer",
        "active": False,
        "password": hashed_password,
        "createdAt": datetime.utcnow().timestamp() * 1000,  # milliseconds
        "firstName": registration.firstName,
        "lastName": registration.lastName,
        "name": f"{registration.firstName} {registration.lastName}".strip(),
        "email": normalize_email(registration.email),
        "emailOriginal": registration.email,
        "phone": registration.phone,
        "postalCode": registration.postalCode,
        "country": registration.country,
        "state": registration.state,
        "city": registration.city,
        "address1": registration.address1,
        "address2": registration.address2
    }
    
    # Remove None values
    consumer_data = {k: v for k, v in consumer_data.items() if v is not None}
    
    await collections['consumers'].insert_one(consumer_data)
    
    # Create verification token
    verification_token = str(uuid.uuid4())
    await collections['verificationTokens'].insert_one({
        "token": verification_token,
        "consumerId": consumer_id,
        "createdAt": datetime.utcnow()
    })
    
    # Send verification email
    try:
        await send_registration_email(consumer_data["email"], "consumer", verification_token)
    except Exception:
        pass  # Continue even if email fails
    
    return {"id": consumer_id, "verifyToken": verification_token}


@router.post("/consumers/verify")
async def verify_consumer(verification: VerifyToken):
    """Verify consumer email"""
    collections = get_collections()
    
    # Find verification token
    token_record = await collections['verificationTokens'].find_one({"token": verification.token})
    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="invalid token"
        )
    
    # Find consumer
    consumer = await collections['consumers'].find_one({"id": token_record["consumerId"]})
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="consumer not found"
        )
    
    # Activate consumer
    await collections['consumers'].update_one(
        {"id": consumer["id"]},
        {"$set": {"active": True}}
    )
    
    # Remove verification token
    await collections['verificationTokens'].delete_one({"token": verification.token})
    
    return {"status": "verified"}


@router.post("/consumers/login")
async def login_consumer(login_data: ConsumerLogin):
    """Login consumer"""
    collections = get_collections()
    target_email = normalize_email(login_data.email)
    
    consumer = await collections['consumers'].find_one({
        "$or": [
            {"email": target_email},
            {"emailOriginal": target_email}
        ]
    })
    
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid credentials"
        )
    
    if not consumer.get("active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="not verified"
        )
    
    if not verify_password(login_data.password, consumer["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid credentials"
        )
    
    return {
        "id": consumer["id"],
        "name": consumer["name"],
        "email": consumer["email"],
        "role": "consumer"
    }


@router.get("/providers")
async def get_providers(user: dict = Depends(verify_token_middleware)):
    """Get list of providers (authenticated users only)"""
    collections = get_collections()
    providers = await collections['providers'].find(
        {},
        {"_id": 0, "password": 0}
    ).sort("rank", -1).to_list(None)
    
    return providers


@router.post("/providers", status_code=status.HTTP_201_CREATED)
async def register_provider(registration: ProviderRegistration):
    """Register a new provider"""
    
    # Check for duplicate email
    if await email_exists(registration.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )
    
    # Check for duplicate phone
    if registration.phone and await phone_exists(registration.phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already associated with an existing account."
        )
    
    # Handle password
    password = registration.password
    generated_password = False
    if not password:
        password = generate_random_password()
        generated_password = True
    
    # Create provider
    collections = get_collections()
    hashed_password = hash_password(password)
    provider_id = str(uuid.uuid4())
    
    provider_data = {
        "id": provider_id,
        "role": "provider",
        "active": True,
        "password": hashed_password,
        "rank": secrets.randbelow(100),  # Random rank 0-99
        "aiAgent": registration.aiAgent,
        "createdAt": datetime.utcnow().timestamp() * 1000,  # milliseconds
        "firstName": registration.firstName,
        "lastName": registration.lastName,
        "name": f"{registration.firstName} {registration.lastName}".strip(),
        "email": normalize_email(registration.email),
        "emailOriginal": registration.email,
        "phone": registration.phone,
        "organization": registration.organization,
        "specialization": registration.specialization,
        "bio": registration.bio,
        "country": registration.country,
        "state": registration.state,
        "city": registration.city,
        "address1": registration.address1,
        "address2": registration.address2,
        "postalCode": registration.postalCode
    }
    
    # Remove None values
    provider_data = {k: v for k, v in provider_data.items() if v is not None}
    
    await collections['providers'].insert_one(provider_data)
    
    # Send registration email
    try:
        await send_registration_email(provider_data["email"], "provider")
    except Exception:
        pass  # Continue even if email fails
    
    # Prepare response
    response_data = {k: v for k, v in provider_data.items() if k != "password"}
    if generated_password:
        response_data["tempPassword"] = password
    
    return response_data


@router.get("/consumers")
async def get_consumers(user: dict = Depends(verify_token_middleware)):
    """Get list of consumers (authenticated users only)"""
    collections = get_collections()
    consumers = await collections['consumers'].find(
        {},
        {"_id": 0, "password": 0}
    ).to_list(None)
    
    return consumers


@router.post("/consumers/admin", status_code=status.HTTP_201_CREATED)
async def create_consumer_admin(
    registration: ConsumerRegistration,
    user: dict = Depends(verify_token_middleware)
):
    """Admin-only: create and activate consumer directly (no email verification)"""
    
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="admin only"
        )
    
    # Check for duplicate email
    if await email_exists(registration.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered."
        )
    
    # Check for duplicate phone
    if registration.phone and await phone_exists(registration.phone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already associated with an existing account."
        )
    
    # Handle password
    password = registration.password
    generated_password = False
    if not password:
        password = generate_random_password()
        generated_password = True
    
    # Create consumer
    collections = get_collections()
    hashed_password = hash_password(password)
    consumer_id = str(uuid.uuid4())
    
    consumer_data = {
        "id": consumer_id,
        "role": "consumer",
        "active": True,  # Admin created consumers are active immediately
        "password": hashed_password,
        "createdAt": datetime.utcnow().timestamp() * 1000,
        "firstName": registration.firstName,
        "lastName": registration.lastName,
        "name": f"{registration.firstName} {registration.lastName}".strip(),
        "email": normalize_email(registration.email),
        "emailOriginal": registration.email,
        "phone": registration.phone,
        "postalCode": registration.postalCode,
        "country": registration.country,
        "state": registration.state,
        "city": registration.city,
        "address1": registration.address1,
        "address2": registration.address2
    }
    
    # Remove None values
    consumer_data = {k: v for k, v in consumer_data.items() if v is not None}
    
    await collections['consumers'].insert_one(consumer_data)
    
    # Send registration email
    try:
        await send_registration_email(consumer_data["email"], "consumer")
    except Exception:
        pass  # Continue even if email fails
    
    # Prepare response
    response_data = {k: v for k, v in consumer_data.items() if k != "password"}
    if generated_password:
        response_data["tempPassword"] = password
    
    return response_data


# Legacy routes for backwards compatibility
@router.post("/patients", status_code=status.HTTP_410_GONE)
async def legacy_patients():
    return {"message": "Route renamed to /consumers"}


@router.post("/patients/verify", status_code=status.HTTP_410_GONE)
async def legacy_patients_verify():
    return {"message": "Route renamed to /consumers/verify"}


@router.post("/patients/login", status_code=status.HTTP_410_GONE)
async def legacy_patients_login():
    return {"message": "Route renamed to /consumers/login"}


@router.get("/patients", status_code=status.HTTP_410_GONE)
async def legacy_get_patients():
    return {"message": "Route renamed to /consumers"}


@router.post("/patients/admin", status_code=status.HTTP_410_GONE)
async def legacy_patients_admin():
    return {"message": "Route renamed to /consumers/admin"}


@router.get("/doctors", status_code=status.HTTP_410_GONE)
async def legacy_get_doctors():
    return {"message": "Route renamed to /providers"}


@router.post("/doctors", status_code=status.HTTP_410_GONE)
async def legacy_post_doctors():
    return {"message": "Route renamed to /providers"}
