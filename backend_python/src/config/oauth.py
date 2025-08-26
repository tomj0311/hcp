import os
import logging
from typing import Optional, Dict, Any
from authlib.integrations.starlette_client import OAuth
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

# Environment variables check
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')

logger.info('🔧 OAuth Config - Environment Check:')
if GOOGLE_CLIENT_ID:
    logger.info(f'- GOOGLE_CLIENT_ID: {GOOGLE_CLIENT_ID[:20]}...')
else:
    logger.error('❌ GOOGLE_CLIENT_ID is not set in environment variables')
    logger.error('Please check your .env file')

if GOOGLE_CLIENT_SECRET:
    logger.info('- GOOGLE_CLIENT_SECRET: SET')
else:
    logger.error('❌ GOOGLE_CLIENT_SECRET is not set in environment variables')
    logger.error('Please check your .env file')

# OAuth configuration
oauth = OAuth()

if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid_configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )
    logger.info('✅ Google OAuth configured successfully')
else:
    logger.warning('⚠️ Google OAuth not configured due to missing credentials')


def get_oauth_client():
    """Get the configured OAuth client"""
    if not (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )
    return oauth.google


async def handle_google_user_data(user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Process Google user data and create/update user in database"""
    # This would integrate with the database to find or create users
    # based on Google OAuth data
    
    from ..db import get_collections
    from ..utils.auth import normalize_email
    
    email = normalize_email(user_info.get('email', ''))
    name = user_info.get('name', '')
    first_name = user_info.get('given_name', '')
    last_name = user_info.get('family_name', '')
    
    collections = get_collections()
    
    # Try to find existing user
    consumer = await collections['consumers'].find_one({"email": email})
    provider = await collections['providers'].find_one({"email": email})
    
    if consumer:
        # Update consumer with Google data if needed
        update_data = {}
        if not consumer.get('firstName') and first_name:
            update_data['firstName'] = first_name
        if not consumer.get('lastName') and last_name:
            update_data['lastName'] = last_name
        if not consumer.get('name') and name:
            update_data['name'] = name
        
        if update_data:
            await collections['consumers'].update_one(
                {"id": consumer['id']},
                {"$set": update_data}
            )
        
        return {
            "id": consumer['id'],
            "role": "consumer",
            "email": email,
            "name": consumer.get('name', name)
        }
    
    elif provider:
        # Update provider with Google data if needed
        update_data = {}
        if not provider.get('firstName') and first_name:
            update_data['firstName'] = first_name
        if not provider.get('lastName') and last_name:
            update_data['lastName'] = last_name
        if not provider.get('name') and name:
            update_data['name'] = name
        
        if update_data:
            await collections['providers'].update_one(
                {"id": provider['id']},
                {"$set": update_data}
            )
        
        return {
            "id": provider['id'],
            "role": "provider", 
            "email": email,
            "name": provider.get('name', name)
        }
    
    else:
        # No existing user found - this could create a new user
        # or redirect to a registration completion flow
        return {
            "email": email,
            "name": name,
            "firstName": first_name,
            "lastName": last_name,
            "new_user": True
        }
