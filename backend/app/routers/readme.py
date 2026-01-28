from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from typing import Optional
from app.schemas.readme import (
    GenerateReadmeRequest, 
    GenerateReadmeResponse,
    DownloadReadmeResponse,
    ReadmeDetailResponse # This is for JSON response of README details
)
from app.services.github_service import (
    validate_github_url,
    is_repository_public,
    is_repository_accessible
)
from app.services.readme_generator import process_readme_generation_async, process_zip_readme_generation_async
from app.services.session_service import get_or_create_anonymous_session
from app.db.session import get_db
from app.models.generated_readme import GeneratedReadme, ReadmeStatus, InputMethod
import tempfile
import os
import logging
import asyncio
import zipfile
import aiofiles
import traceback
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/readme", tags=["readme"])


@router.post("/generate", response_model=GenerateReadmeResponse)
async def generate_readme(
    request: GenerateReadmeRequest, 
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates asynchronous README generation for a GitHub repository (public or private with API key).
    
    Receives a GitHub URL, verifies if the repository is accessible,
    creates a database record and returns an ID for status checking.
    
    Args:
        request: Object with the GitHub URL, optional session_id, and optional github_api_key
        db: Database session
        
    Returns:
        GenerateReadmeResponse: Contains UUID and status
        
    Raises:
        HTTPException: In case of validation, access or processing errors
    """
    github_url = request.github_url
    github_api_key = request.github_api_key
    
    # Log the raw input to see if it's being truncated - USE ERROR LEVEL TO ENSURE IT SHOWS
    logger.error(f"===== [DEBUG] README Generation Starting =====")
    logger.error(f"[DEBUG] Raw github_url from request: '{github_url}'")
    logger.error(f"[DEBUG] github_url length: {len(github_url)}")
    logger.error(f"[DEBUG] github_url repr: {repr(github_url)}")
    logger.error(f"[DEBUG] github_api_key provided: {bool(github_api_key)}")
    
    # Also log at info level
    logger.info(f"[README Generation] ===== Starting request =====")
    logger.info(f"[README Generation] Raw github_url: '{github_url}' (length: {len(github_url)})")
    logger.info(f"[README Generation] Raw github_api_key: {'Provided' if github_api_key else 'Not provided'} (length: {len(github_api_key) if github_api_key else 0})")
    
    if github_api_key:
        logger.info(f"[README Generation] GitHub API key provided (for private repo access)")
    
    try:
        # 1. Validate URL
        try:
            owner, repo_name = validate_github_url(github_url)
            logger.info(f"[URL Validation] Valid URL - Owner: '{owner}' (len={len(owner)}), Repo: '{repo_name}' (len={len(repo_name)})")
            logger.info(f"[URL Validation] Full extracted: {owner}/{repo_name}")
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # 2. Check if repository is accessible (public or private with auth)
        try:
            logger.info(f"[Access Check] Checking if {owner}/{repo_name} is accessible...")
            if github_api_key:
                logger.info(f"[Access Check] Using GitHub API key for authentication")
            is_accessible, repo_data, is_public = await is_repository_accessible(github_url, github_api_key)
            logger.info(f"[Access Check] Repository {owner}/{repo_name} is {'PUBLIC' if is_public else 'PRIVATE'} and accessible")
            if not is_accessible:
                if github_api_key:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Repository {owner}/{repo_name} is not accessible. The provided GitHub API key may be invalid or lack permissions."
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Repository {owner}/{repo_name} is private. Provide a GitHub API key to access private repositories."
                    )
        except ValueError as e:
            logger.error(f"[Access Check] ValueError: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except Exception as e:
            logger.error(f"[Access Check] Exception: {str(e)}")
            error_msg = str(e)
            # Check error type to return appropriate status code
            if "401" in error_msg or "Invalid" in error_msg or "invalid" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=error_msg
                )
            elif "403" in error_msg or "Access denied" in error_msg or "permissions" in error_msg.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=error_msg
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Error verifying repository: {error_msg}"
                )
        
        # 3. Get or create session
        session = await get_or_create_anonymous_session(db, request.session_id)
        
        # 4. Create GeneratedReadme record with PENDING status
        readme_record = GeneratedReadme(
            session_id=session.id,
            user_id=None,  # Anonymous for now
            repo_name=repo_name,
            repo_url=github_url,
            input_method=InputMethod.PUBLIC_URL,
            status=ReadmeStatus.PENDING.value,  # Use .value to get the string value
            readme_content=None,
            was_committed=False,
            was_downloaded=False
        )
        
        db.add(readme_record)
        await db.commit()
        await db.refresh(readme_record)
        
        logger.info(f"[README Generation] Created record {readme_record.id} with PENDING status")
        
        # 5. Start background task (pass API key if provided)
        asyncio.create_task(process_readme_generation_async(readme_record.id, github_url, github_api_key))
        logger.info(f"[README Generation] Started background task for {readme_record.id}")
        
        # 6. Return UUID and status immediately
        # status is already a string from the database
        status_str = str(readme_record.status) if readme_record.status else ReadmeStatus.PENDING.value
        return GenerateReadmeResponse(
            id=readme_record.id,
            status=status_str
        )
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Catch any other unexpected error
        logger.error(f"[README Generation] Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


@router.post("/upload", response_model=GenerateReadmeResponse)
async def upload_zip_readme(
    file: UploadFile = File(...),
    session_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates asynchronous README generation from an uploaded ZIP file.
    
    Receives a ZIP file containing a project, validates it,
    creates a database record and returns an ID for status checking.
    
    Args:
        file: Uploaded ZIP file
        session_id: Optional session ID
        db: Database session
        
    Returns:
        GenerateReadmeResponse: Contains UUID and status
        
    Raises:
        HTTPException: In case of validation or processing errors
    """
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    
    logger.info(f"[ZIP Upload] ===== Starting upload request =====")
    logger.info(f"[ZIP Upload] File: {file.filename}")
    logger.info(f"[ZIP Upload] Content type: {file.content_type}")
    logger.info(f"[ZIP Upload] Session ID: {session_id}")
    
    zip_path = None
    try:
        # 1. Validate file type
        logger.debug("[ZIP Upload] Step 1: Validating file type")
        if not file.filename:
            logger.warning("[ZIP Upload] No filename provided")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        file_extension = os.path.splitext(file.filename)[1].lower()
        logger.debug(f"[ZIP Upload] File extension: {file_extension}")
        if file_extension != '.zip':
            logger.warning(f"[ZIP Upload] Invalid file extension: {file_extension}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Expected .zip, got {file_extension}"
            )
        
        # 2. Validate file size
        logger.debug("[ZIP Upload] Step 2: Reading file content and validating size")
        # Read file content to check size and save
        file_content = await file.read()
        file_size = len(file_content)
        logger.info(f"[ZIP Upload] File size: {file_size} bytes ({file_size / (1024*1024):.2f} MB)")
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024*1024):.1f} MB, got {file_size / (1024*1024):.2f} MB"
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is empty"
            )
        
        # 3. Validate ZIP file structure
        logger.debug("[ZIP Upload] Step 3: Validating ZIP file structure")
        try:
            # Check if it's a valid ZIP file by trying to read it
            import io
            zip_file = zipfile.ZipFile(io.BytesIO(file_content))
            zip_file.testzip()  # Test for corrupted files
            zip_file.close()
            logger.debug("[ZIP Upload] ZIP file structure is valid")
        except zipfile.BadZipFile as e:
            logger.error(f"[ZIP Upload] Invalid ZIP file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or corrupted ZIP file"
            )
        except Exception as e:
            logger.error(f"[ZIP Upload] Error validating ZIP file: {str(e)}")
            logger.error(f"[ZIP Upload] Error type: {type(e).__name__}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error validating ZIP file: {str(e)}"
            )
        
        # 4. Save ZIP file to temporary location
        logger.debug("[ZIP Upload] Step 4: Saving ZIP file to temporary location")
        try:
            # Create temp directory for this upload
            temp_dir = tempfile.mkdtemp(prefix="readme_zip_")
            zip_path = os.path.join(temp_dir, file.filename)
            logger.debug(f"[ZIP Upload] Temp directory: {temp_dir}")
            logger.debug(f"[ZIP Upload] ZIP path: {zip_path}")
            
            # Write file content to disk
            async with aiofiles.open(zip_path, 'wb') as f:
                await f.write(file_content)
            
            logger.info(f"[ZIP Upload] Saved ZIP file to {zip_path} ({file_size} bytes)")
        except Exception as e:
            logger.error(f"[ZIP Upload] Error saving ZIP file: {str(e)}")
            logger.error(f"[ZIP Upload] Error type: {type(e).__name__}")
            logger.error(f"[ZIP Upload] Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error saving uploaded file: {str(e)}"
            )
        
        # 5. Get or create session
        logger.debug("[ZIP Upload] Step 5: Getting or creating session (database operation)")
        try:
            session = await get_or_create_anonymous_session(db, session_id)
            logger.info(f"[ZIP Upload] Session ID: {session.id}")
        except Exception as e:
            logger.error(f"[ZIP Upload] Database error when getting/creating session: {str(e)}")
            logger.error(f"[ZIP Upload] Error type: {type(e).__name__}")
            logger.error(f"[ZIP Upload] Traceback: {traceback.format_exc()}")
            # Check if it's a connection error
            error_str = str(e).lower()
            if "connection refused" in error_str or "errno 61" in error_str:
                logger.error("[ZIP Upload] Database connection refused - PostgreSQL may not be running")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection failed. Please ensure PostgreSQL is running."
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )
        
        # 6. Extract project name from filename (remove .zip extension)
        project_name = os.path.splitext(file.filename)[0]
        logger.debug(f"[ZIP Upload] Project name: {project_name}")
        
        # 7. Create GeneratedReadme record with PENDING status
        logger.debug("[ZIP Upload] Step 6: Creating GeneratedReadme record (database operation)")
        try:
            readme_record = GeneratedReadme(
                session_id=session.id,
                user_id=None,  # Anonymous for now
                repo_name=project_name,
                repo_url=None,  # No URL for ZIP uploads
                input_method=InputMethod.FILE_UPLOAD,
                status=ReadmeStatus.PENDING.value,
                readme_content=None,
                was_committed=False,
                was_downloaded=False
            )
            
            logger.debug("[ZIP Upload] Adding record to database session")
            db.add(readme_record)
            
            logger.debug("[ZIP Upload] Committing to database")
            await db.commit()
            
            logger.debug("[ZIP Upload] Refreshing record from database")
            await db.refresh(readme_record)
            
            logger.info(f"[ZIP Upload] Created record {readme_record.id} with PENDING status")
        except Exception as e:
            logger.error(f"[ZIP Upload] Database error when creating record: {str(e)}")
            logger.error(f"[ZIP Upload] Error type: {type(e).__name__}")
            logger.error(f"[ZIP Upload] Traceback: {traceback.format_exc()}")
            # Check if it's a connection error
            error_str = str(e).lower()
            if "connection refused" in error_str or "errno 61" in error_str:
                logger.error("[ZIP Upload] Database connection refused - PostgreSQL may not be running")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database connection failed. Please ensure PostgreSQL is running."
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )
        
        # 8. Start background task
        logger.debug("[ZIP Upload] Step 7: Starting background task")
        asyncio.create_task(process_zip_readme_generation_async(readme_record.id, zip_path))
        logger.info(f"[ZIP Upload] Started background task for {readme_record.id}")
        
        # 9. Return UUID and status immediately
        logger.debug("[ZIP Upload] Step 8: Returning response")
        status_str = str(readme_record.status) if readme_record.status else ReadmeStatus.PENDING.value
        logger.info(f"[ZIP Upload] ===== Upload request completed successfully =====")
        return GenerateReadmeResponse(
            id=readme_record.id,
            status=status_str
        )
            
    except HTTPException:
        # Clean up temp file if created
        if zip_path and os.path.exists(zip_path):
            try:
                os.remove(zip_path)
                # Also try to remove parent temp directory if empty
                temp_dir = os.path.dirname(zip_path)
                if os.path.exists(temp_dir):
                    try:
                        os.rmdir(temp_dir)
                    except:
                        pass
            except:
                pass
        raise
    except HTTPException:
        # Re-raise HTTP exceptions (already logged)
        raise
    except Exception as e:
        # Clean up temp file if created
        if zip_path and os.path.exists(zip_path):
            try:
                logger.debug(f"[ZIP Upload] Cleaning up temp file: {zip_path}")
                os.remove(zip_path)
                temp_dir = os.path.dirname(zip_path)
                if os.path.exists(temp_dir):
                    try:
                        os.rmdir(temp_dir)
                    except:
                        pass
            except Exception as cleanup_error:
                logger.warning(f"[ZIP Upload] Error during cleanup: {str(cleanup_error)}")
        
        # Log detailed error information
        logger.error(f"[ZIP Upload] ===== Unexpected error occurred =====")
        logger.error(f"[ZIP Upload] Error message: {str(e)}")
        logger.error(f"[ZIP Upload] Error type: {type(e).__name__}")
        logger.error(f"[ZIP Upload] Error args: {e.args}")
        logger.error(f"[ZIP Upload] Full traceback:")
        logger.error(traceback.format_exc())
        
        # Check if it's a connection error
        error_str = str(e).lower()
        if "connection refused" in error_str or "errno 61" in error_str:
            logger.error("[ZIP Upload] Connection refused error detected")
            logger.error("[ZIP Upload] This usually means:")
            logger.error("[ZIP Upload]   1. PostgreSQL is not running")
            logger.error("[ZIP Upload]   2. Wrong host/port in DATABASE_URL")
            logger.error("[ZIP Upload]   3. Firewall blocking connection")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Database connection failed: {str(e)}. Please ensure PostgreSQL is running and accessible."
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )


@router.get("/{readme_uuid}", response_model=ReadmeDetailResponse)
async def get_readme(
    readme_uuid: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves README details by UUID for preview.

    Returns JSON with status and content (unlike download which returns a file).
    Frontend can poll this endpoint to check generation status.

    Args:
        readme_uuid: UUID of the GeneratedReadme record
        db: Database session

    Returns:
        ReadmeDetailResponse: README details including status and content

    Raises:
        HTTPException: If README not found
    """
    logger.info(f"[Get README] Request for README {readme_uuid}")

    # Query database for GeneratedReadme by UUID
    result = await db.execute(
        select(GeneratedReadme).where(GeneratedReadme.id == readme_uuid)
    )
    readme_record = result.scalar_one_or_none()

    if not readme_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"README with ID {readme_uuid} not found"
        )

    # Return the record as JSON
    return ReadmeDetailResponse(
        id=readme_record.id,
        status=str(readme_record.status),
        readme_content=readme_record.readme_content,
        repo_name=readme_record.repo_name,
        repo_url=readme_record.repo_url,
        created_at=readme_record.created_at,
        updated_at=readme_record.updated_at
    )

# GET
@router.get("/download/{readme_uuid}")
async def download_readme(
    readme_uuid: UUID,
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Downloads a generated README by UUID.
    
    Checks the status of the README generation:
    - If COMPLETED: returns the file for download
    - If PENDING or PROCESSING: returns status 202 (Accepted)
    - If FAILED: returns error 500
    - If not found: returns 404
    
    Args:
        readme_uuid: UUID of the GeneratedReadme record
        db: Database session
        
    Returns:
        FileResponse if completed, DownloadReadmeResponse otherwise
    """
    logger.info(f"[Download] Request for README {readme_uuid}")
    
    # Query database for GeneratedReadme by UUID
    result = await db.execute(
        select(GeneratedReadme).where(GeneratedReadme.id == readme_uuid)
    )
    readme_record = result.scalar_one_or_none()
    
    if not readme_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"README with ID {readme_uuid} not found"
        )
    
    # Check status (status is stored as string in DB)
    status_value = str(readme_record.status)
    
    if status_value == ReadmeStatus.COMPLETED.value:
        if not readme_record.readme_content:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="README content is missing"
            )
        
        # Create temporary file
        try:
            with tempfile.NamedTemporaryFile(
                mode='w',
                suffix='.md',
                delete=False,
                encoding='utf-8'
            ) as tmp_file:
                tmp_file.write(readme_record.readme_content)
                tmp_path = tmp_file.name
            
            # Mark as downloaded
            readme_record.was_downloaded = True
            await db.commit()
            
            logger.info(f"[Download] Returning file for README {readme_uuid}")
            
            background_tasks.add_task(os.unlink, tmp_path)
            
            return FileResponse(
                tmp_path,
                media_type="text/markdown",
                filename="README.md"
            )
        except Exception as e:
            logger.error(f"[Download] Error creating file: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating file: {str(e)}"
            )
    
    elif status_value == ReadmeStatus.PENDING.value or status_value == ReadmeStatus.PROCESSING.value:
        # Still processing - return 202 Accepted
        logger.debug(f"[Download] README {readme_uuid} status: {status_value}")
        response_data = DownloadReadmeResponse(
            status=status_value,
            readme_content=None
        )
        return JSONResponse(
            content=response_data.model_dump(),
            status_code=status.HTTP_202_ACCEPTED
        )
    
    elif status_value == ReadmeStatus.FAILED.value:
        # Generation failed
        error_message = readme_record.readme_content or "Unknown error"
        logger.error(f"[Download] README {readme_uuid} failed: {error_message}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"README generation failed: {error_message}"
        )
    
    else:
        # Unknown status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unknown status: {readme_record.status}"
        )

# PATCH to update was_downloaded flag whn README is downloaded
@router.patch("/{readme_uuid}")
async def update_readme(
    readme_uuid: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the was_downloaded flag for a README.

    Args:
        readme_uuid: UUID of the GeneratedReadme record
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If README not found
    """
    logger.info(f"[Update README] Updating was_downloaded flag for {readme_uuid}")

    # Query database for GeneratedReadme by UUID
    result = await db.execute(
        select(GeneratedReadme).where(GeneratedReadme.id == readme_uuid)
    )
    readme_record = result.scalar_one_or_none()

    if not readme_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"README with ID {readme_uuid} not found"
        )

    # Update was_downloaded flag
    readme_record.was_downloaded = True
    await db.commit()

    logger.info(f"[Update README] Successfully updated was_downloaded for {readme_uuid}")

    return {"message": "README marked as downloaded", "id": str(readme_uuid)}