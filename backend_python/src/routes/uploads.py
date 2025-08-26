import os
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.responses import StreamingResponse
from io import BytesIO

from ..db import get_db, get_bucket, get_collections
from ..utils.auth import verify_token_middleware

logger = logging.getLogger(__name__)

router = APIRouter()

# Allowed file types
ALLOWED_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/json'
}

# File size limit (200MB)
MAX_FILE_SIZE = 200 * 1024 * 1024


def validate_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed"
        )
    
    # Note: FastAPI doesn't provide file size during upload
    # Size validation would need to be done during reading


@router.post("/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    user: dict = Depends(verify_token_middleware)
):
    """Upload files to GridFS"""
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded"
        )
    
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many files. Maximum is 10 files."
        )
    
    try:
        bucket = get_bucket()
        user_email = user.get("email")
        results = []
        
        for file in files:
            validate_file(file)
            
            # Read file content
            content = await file.read()
            
            # Check file size
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {file.filename} too large. Maximum size is 200MB."
                )
            
            # Generate unique filename
            timestamp = int(datetime.now().timestamp() * 1000)
            random_part = os.urandom(4).hex()
            filename = f"{timestamp}-{random_part}-{file.filename}"
            
            # Upload to GridFS
            file_id = await bucket.upload_from_stream(
                filename,
                BytesIO(content),
                metadata={"email": user_email}
            )
            
            results.append({
                "filename": filename,
                "size": len(content),
                "mimetype": file.content_type,
                "id": str(file_id)
            })
        
        return {
            "message": "Files uploaded successfully",
            "files": results,
            "userEmail": user_email
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Upload failed"
        )


@router.get("/files")
async def get_user_files(user: dict = Depends(verify_token_middleware)):
    """Get user's uploaded files"""
    try:
        bucket = get_bucket()
        user_email = user.get("email")
        
        # Find files for this user
        cursor = bucket.find({"metadata.email": user_email})
        files = await cursor.to_list(None)
        
        file_list = []
        for f in files:
            file_list.append({
                "filename": f.filename,
                "size": f.length,
                "uploadDate": f.upload_date,
                "id": str(f._id)
            })
        
        return {"files": file_list}
        
    except Exception as e:
        logger.error(f"Error fetching files: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch files"
        )


@router.get("/files/{filename}")
async def download_file(
    filename: str,
    user: dict = Depends(verify_token_middleware)
):
    """Download a file by filename"""
    try:
        bucket = get_bucket()
        user_email = user.get("email")
        
        # Find the file
        file_doc = await bucket.find_one({
            "filename": filename,
            "metadata.email": user_email
        })
        
        if not file_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Get file content
        file_content = await bucket.open_download_stream(file_doc._id).read()
        
        # Create streaming response
        def iterfile():
            yield file_content
        
        return StreamingResponse(
            iterfile(),
            media_type=file_doc.content_type or "application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Download error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download file"
        )
