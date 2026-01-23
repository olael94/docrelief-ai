from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from app.schemas.readme import GitHubUrlRequest
from app.services.github_service import (
    validate_github_url,
    is_repository_public,
    fetch_repository_content
)
from app.services.readme_generator import generate_readme_with_langchain
import tempfile
import os
import logging
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/readme", tags=["readme"])


@router.post("/generate")
async def generate_readme(request: GitHubUrlRequest, background_tasks: BackgroundTasks):
    """
    Generates a README.md for a public GitHub repository.
    
    Receives a GitHub URL, verifies if the repository is public,
    analyzes the code and generates a complete README using AI.
    
    Args:
        request: Object with the GitHub URL
        
    Returns:
        FileResponse: README.md file for download
        
    Raises:
        HTTPException: In case of validation, access or processing errors
    """
    start_time = datetime.now()
    github_url = request.github_url
    
    logger.info(f"[README Generation] Starting request for: {github_url}")
    
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
        
        # 2. Check if repository is public and get repo info (to avoid duplicate request)
        repo_info = None
        try:
            logger.debug(f"[Public Check] Checking if {owner}/{repo_name} is public...")
            is_public, repo_info = await is_repository_public(github_url)
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
        
        # 3. Fetch repository content (pass repo_info to avoid duplicate API call)
        try:
            logger.info(f"[Content Fetch] Fetching content from {owner}/{repo_name}...")
            repo_data = await fetch_repository_content(github_url, repo_info=repo_info)
            logger.info(f"[Content Fetch] Successfully fetched content for {repo_data.get('name', 'unknown')}")
            logger.debug(f"   - Language: {repo_data.get('language', 'Unknown')}")
            logger.debug(f"   - Description: {repo_data.get('description', 'N/A')[:100]}...")
            logger.debug(f"   - Config files found: {len(repo_data.get('config_files', {}))}")
            logger.debug(f"   - Code files found: {len(repo_data.get('main_files', {}))}")
            logger.debug(f"   - Directories in structure: {len(repo_data.get('structure', []))}")
            logger.debug(f"   - Existing README: {'Yes' if repo_data.get('readme') else 'No'}")
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error fetching repository content: {str(e)}"
            )
        
        # 4. Generate README using LangChain + OpenAI
        try:
            logger.info(f"[OpenAI] Generating README with AI for {owner}/{repo_name}...")
            readme_content = await generate_readme_with_langchain(repo_data)
            readme_size = len(readme_content)
            logger.info(f"[OpenAI] README generated successfully ({readme_size} characters)")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error generating README: {str(e)}"
            )
        
        # 5. Create temporary file and return for download
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(
                mode='w',
                suffix='.md',
                delete=False,
                encoding='utf-8'
            ) as tmp_file:
                tmp_file.write(readme_content)
                tmp_path = tmp_file.name
            
            # Add temporary file cleanup task
            background_tasks.add_task(os.unlink, tmp_path)
            
            # Return file for download
            elapsed_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"[Complete] README generation completed in {elapsed_time:.2f}s for {owner}/{repo_name}")
            logger.debug(f"   - File saved to: {tmp_path}")
            logger.debug(f"   - File size: {len(readme_content)} characters")
            
            return FileResponse(
                tmp_path,
                media_type="text/markdown",
                filename="README.md"
            )
        except Exception as e:
            # Clean up temporary file in case of error
            if 'tmp_path' in locals() and os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating file: {str(e)}"
            )
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Catch any other unexpected error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )
