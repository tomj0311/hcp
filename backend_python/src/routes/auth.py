import os
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr
from typing import Optional

from ..db import get_collections
from ..utils.auth import (
    generate_token, 
    verify_password, 
    normalize_email, 
    verify_token_middleware
)

router = APIRouter()

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    role: str
    name: Optional[str] = None


# Admin credentials with development fallbacks
ADMIN_USER = os.getenv('ADMIN_USER', 'admin')
ADMIN_PASS = os.getenv('ADMIN_PASS', '123')


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login endpoint for admin, consumers, and providers"""
    if not request.username or not request.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required"
        )
    
    normalized_username = normalize_email(request.username)
    
    # Admin login
    if normalized_username == normalize_email(ADMIN_USER) and request.password == ADMIN_PASS:
        token = generate_token({"role": "admin", "username": request.username})
        return LoginResponse(token=token, role="admin")
    
    collections = get_collections()
    
    # Consumer login
    consumer = await collections['consumers'].find_one({
        "$or": [
            {"email": normalized_username},
            {"emailOriginal": normalized_username}
        ]
    })
    
    if consumer and consumer.get('active') and verify_password(request.password, consumer['password']):
        token = generate_token({
            "role": "consumer",
            "id": consumer['id'],
            "email": consumer['email']
        })
        return LoginResponse(token=token, role="consumer", name=consumer.get('name'))
    
    # Provider login
    provider = await collections['providers'].find_one({
        "$or": [
            {"email": normalized_username},
            {"emailOriginal": normalized_username}
        ]
    })
    
    if provider and provider.get('active') and verify_password(request.password, provider['password']):
        token = generate_token({
            "role": "provider",
            "id": provider['id'],
            "email": provider['email']
        })
        return LoginResponse(token=token, role="provider", name=provider.get('name'))
    
    # Invalid credentials
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="invalid credentials"
    )


# Google OAuth routes would go here
# For now, including placeholder endpoints

@router.get("/google")
async def google_auth():
    """Initiate Google OAuth flow"""
    # TODO: Implement Google OAuth with authlib
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google OAuth not yet implemented"
    )


@router.get("/google/callback")
async def google_callback():
    """Handle Google OAuth callback"""
    # TODO: Implement Google OAuth callback
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google OAuth callback not yet implemented"
    )


@router.post("/logout")
async def logout(user: dict = Depends(verify_token_middleware)):
    """Logout endpoint (token-based, so just return success)"""
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_current_user(user: dict = Depends(verify_token_middleware)):
    """Get current user information"""
    return {
        "role": user.get("role"),
        "id": user.get("id"),
        "email": user.get("email"),
        "username": user.get("username")
    }
