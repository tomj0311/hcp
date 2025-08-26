import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, validator

from ..db import get_collections
from ..utils.auth import verify_token_middleware, normalize_email

router = APIRouter()

# Pydantic models
class MeetupCreate(BaseModel):
    targetUserId: str
    start: str  # ISO datetime string
    end: str    # ISO datetime string
    title: Optional[str] = None
    description: Optional[str] = None

    @validator('title')
    def title_length(cls, v):
        if v is not None and len(v) > 120:
            raise ValueError('Title must be 120 characters or less')
        return v

    @validator('description')
    def description_length(cls, v):
        if v is not None and len(v) > 2000:
            raise ValueError('Description must be 2000 characters or less')
        return v


class MeetupUpdate(BaseModel):
    status: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None

    @validator('status')
    def valid_status(cls, v):
        if v is not None and v not in ['scheduled', 'cancelled', 'completed']:
            raise ValueError('Status must be scheduled, cancelled, or completed')
        return v


def parse_datetime(date_string: str) -> datetime:
    """Parse ISO datetime string"""
    try:
        return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid datetime format: {date_string}"
        )


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_meetup(
    meetup_data: MeetupCreate,
    user: dict = Depends(verify_token_middleware)
):
    """Create a new one-to-one meetup (consumer<->provider)"""
    
    # Validate user role
    user_role = user.get("role")
    user_id = user.get("id")
    
    if user_role not in ["consumer", "provider"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="only authenticated consumer or provider can create meetups"
        )
    
    # Parse and validate dates
    start_date = parse_datetime(meetup_data.start)
    end_date = parse_datetime(meetup_data.end)
    
    if end_date <= start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )
    
    # Find target user
    collections = get_collections()
    target_user = None
    target_role = None
    
    if user_role == "consumer":
        target_user = await collections['providers'].find_one({"id": meetup_data.targetUserId})
        target_role = "provider"
    elif user_role == "provider":
        target_user = await collections['consumers'].find_one({"id": meetup_data.targetUserId})
        target_role = "consumer"
    
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="target user not found"
        )
    
    # Create event
    event_id = str(uuid.uuid4())
    event = {
        "id": event_id,
        "type": "meetup",
        "title": meetup_data.title or "Meetup",
        "description": meetup_data.description or "",
        "start": start_date.isoformat(),
        "end": end_date.isoformat(),
        "createdAt": datetime.now().timestamp() * 1000,  # milliseconds
        "requesterId": user_id,
        "requesterRole": user_role,
        "participantId": meetup_data.targetUserId,
        "participantRole": target_role,
        "status": "scheduled"
    }
    
    await collections['events'].insert_one(event)
    
    # Remove MongoDB _id from response
    event.pop('_id', None)
    
    return event


@router.get("/")
async def get_meetups(user: dict = Depends(verify_token_middleware)):
    """List events for current user"""
    user_id = user.get("id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="unauthorized"
        )
    
    collections = get_collections()
    
    # Find events where user is requester or participant
    events = await collections['events'].find(
        {
            "$or": [
                {"requesterId": user_id},
                {"participantId": user_id}
            ]
        },
        {"_id": 0}
    ).to_list(None)
    
    # Sort by start time
    events.sort(key=lambda x: datetime.fromisoformat(x['start'].replace('Z', '+00:00')))
    
    return events


@router.get("/{event_id}")
async def get_meetup(
    event_id: str,
    user: dict = Depends(verify_token_middleware)
):
    """Get single event (must be participant)"""
    user_id = user.get("id")
    user_role = user.get("role")
    
    collections = get_collections()
    
    event = await collections['events'].find_one(
        {"id": event_id},
        {"_id": 0}
    )
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="not found"
        )
    
    # Check if user has access to this event
    if (event['requesterId'] != user_id and 
        event['participantId'] != user_id and 
        user_role != 'admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="forbidden"
        )
    
    return event


@router.patch("/{event_id}")
async def update_meetup(
    event_id: str,
    update_data: MeetupUpdate,
    user: dict = Depends(verify_token_middleware)
):
    """Update status (cancel) or details"""
    user_id = user.get("id")
    user_role = user.get("role")
    
    collections = get_collections()
    
    # Find the event
    event = await collections['events'].find_one({"id": event_id})
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="not found"
        )
    
    # Check if user has permission to update this event
    if (event['requesterId'] != user_id and 
        event['participantId'] != user_id and 
        user_role != 'admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="forbidden"
        )
    
    # Prepare update data
    update_fields = {}
    
    if update_data.status is not None:
        update_fields['status'] = update_data.status
    
    if update_data.title is not None:
        update_fields['title'] = update_data.title
    
    if update_data.description is not None:
        update_fields['description'] = update_data.description
    
    if update_data.start is not None:
        start_date = parse_datetime(update_data.start)
        update_fields['start'] = start_date.isoformat()
    
    if update_data.end is not None:
        end_date = parse_datetime(update_data.end)
        update_fields['end'] = end_date.isoformat()
    
    # Validate that end is still after start if both are being updated
    if 'start' in update_fields and 'end' in update_fields:
        start_dt = datetime.fromisoformat(update_fields['start'].replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(update_fields['end'].replace('Z', '+00:00'))
        if end_dt <= start_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time"
            )
    
    # Update the event
    if update_fields:
        await collections['events'].update_one(
            {"id": event_id},
            {"$set": update_fields}
        )
    
    # Return updated event
    updated_event = await collections['events'].find_one(
        {"id": event_id},
        {"_id": 0}
    )
    
    return updated_event
