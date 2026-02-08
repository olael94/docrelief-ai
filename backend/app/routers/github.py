from fastapi import APIRouter, HTTPException, status, Header
from typing import List, Optional
import httpx
import logging

from app.schemas.github import ListReposResponse, RepositoryInfo
from app.services.auth_service import get_github_token_from_auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/github", tags=["github"])


@router.get("/repos", response_model=ListReposResponse)
async def list_repositories(authorization: Optional[str] = Header(None)):
    """
    Lists all GitHub repositories the user has access to.
    
    Requires JWT token in Authorization header (Bearer <token>).
    The GitHub token is retrieved from the server-side session store.
    
    Args:
        authorization: Bearer token from Authorization header
        
    Returns:
        ListReposResponse: Contains total count and list of repositories
        
    Raises:
        HTTPException: In case of authentication or API errors
    """
    logger.info("[GitHub Repos] Starting repository listing request")
    
    # Get GitHub token from session (NOT from frontend)
    github_token = get_github_token_from_auth(authorization, required=True)
    
    try:
        all_repos: List[RepositoryInfo] = []
        page = 1
        per_page = 100  # Maximum allowed by GitHub API
        
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        async with httpx.AsyncClient() as client:
            while True:
                # Use /user/repos endpoint to get all repos user has access to
                # visibility=all includes public and private repos
                # affiliation=owner,collaborator,organization_member includes all types
                api_url = f"https://api.github.com/user/repos?per_page={per_page}&page={page}&visibility=all&affiliation=owner,collaborator,organization_member&sort=updated&direction=desc"
                
                logger.debug(f"[GitHub Repos] Fetching page {page}")
                
                response = await client.get(api_url, headers=headers, timeout=30.0)
                
                if response.status_code == 401:
                    logger.warning("[GitHub Repos] Invalid or expired token")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid or expired GitHub token. Please check your token and ensure it has the 'repo' scope."
                    )
                
                if response.status_code == 403:
                    error_body = response.json() if response.text else {}
                    message = error_body.get("message", "Access forbidden")
                    logger.warning(f"[GitHub Repos] 403 Forbidden: {message}")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"GitHub API access forbidden: {message}. You may have exceeded the rate limit."
                    )
                
                if response.status_code != 200:
                    error_body = response.text[:200] if response.text else "No error details"
                    logger.error(f"[GitHub Repos] Unexpected status {response.status_code}: {error_body}")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Error fetching repositories from GitHub: {response.status_code}"
                    )
                
                repos_data = response.json()
                
                if not repos_data:
                    # No more repositories
                    break
                
                for repo in repos_data:
                    repo_info = RepositoryInfo(
                        id=repo["id"],
                        name=repo["name"],
                        full_name=repo["full_name"],
                        description=repo.get("description"),
                        private=repo["private"],
                        html_url=repo["html_url"],
                        clone_url=repo["clone_url"],
                        default_branch=repo.get("default_branch", "main"),
                        language=repo.get("language"),
                        stargazers_count=repo.get("stargazers_count", 0),
                        forks_count=repo.get("forks_count", 0),
                        updated_at=repo["updated_at"],
                        owner=repo["owner"]["login"]
                    )
                    all_repos.append(repo_info)
                
                logger.debug(f"[GitHub Repos] Page {page}: fetched {len(repos_data)} repositories")
                
                # Check if there are more pages
                if len(repos_data) < per_page:
                    break
                
                page += 1
                
                # Safety limit to prevent infinite loops
                if page > 100:
                    logger.warning("[GitHub Repos] Reached page limit (100 pages)")
                    break
        
        logger.info(f"[GitHub Repos] Successfully fetched {len(all_repos)} repositories")
        
        return ListReposResponse(
            total_count=len(all_repos),
            repositories=all_repos
        )
        
    except HTTPException:
        raise
    except httpx.HTTPError as e:
        logger.error(f"[GitHub Repos] HTTP error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Connection error with GitHub API: {str(e)}"
        )
    except Exception as e:
        logger.error(f"[GitHub Repos] Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}"
        )
