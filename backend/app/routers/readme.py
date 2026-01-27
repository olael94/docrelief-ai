from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from app.schemas.readme import (
    GenerateReadmeRequest, 
    GenerateReadmeResponse,
    DownloadReadmeResponse,
    ReadmeDetailResponse # This is for JSON response of README details
)
from app.services.github_service import (
    validate_github_url,
    is_repository_public
)
from app.services.readme_generator import process_readme_generation_async
from app.services.session_service import get_or_create_anonymous_session
from app.db.session import get_db
from app.models.generated_readme import GeneratedReadme, ReadmeStatus, InputMethod
import tempfile
import os
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/readme", tags=["readme"])


@router.post("/generate", response_model=GenerateReadmeResponse)
async def generate_readme(
    request: GenerateReadmeRequest, 
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates asynchronous README generation for a public GitHub repository.
    
    Receives a GitHub URL, verifies if the repository is public,
    creates a database record and returns an ID for status checking.
    
    Args:
        request: Object with the GitHub URL and optional session_id
        db: Database session
        
    Returns:
        GenerateReadmeResponse: Contains UUID and status
        
    Raises:
        HTTPException: In case of validation, access or processing errors
    """
    github_url = request.github_url
    
    logger.info(f"[README Generation] Starting async request for: {github_url}")
    
    try:
        # 1. Validate URL
        try:
            owner, repo_name = validate_github_url(github_url)
            logger.debug(f"[URL Validation] Valid URL - Owner: {owner}, Repo: {repo_name}")
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        
        # 2. Check if repository is public
        try:
            logger.debug(f"[Public Check] Checking if {owner}/{repo_name} is public...")
            is_public, _ = await is_repository_public(github_url)
            logger.info(f"[Public Check] Repository {owner}/{repo_name} is {'PUBLIC' if is_public else 'PRIVATE'}")
            if not is_public:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Repository {owner}/{repo_name} is private. Only public repositories are supported."
                )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error verifying repository: {str(e)}"
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
        
        # 5. Start background task
        asyncio.create_task(process_readme_generation_async(readme_record.id, github_url))
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