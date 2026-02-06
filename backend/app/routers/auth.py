"""
GitHub OAuth authentication router.

Security: The GitHub token is NEVER sent to the frontend.
Instead, we store it in memory and return a JWT with only the session ID.
"""
import logging
from urllib.parse import urlencode
from fastapi import APIRouter, HTTPException, Query, Header
from fastapi.responses import RedirectResponse, JSONResponse
from typing import Optional
import httpx

from app.config import settings
from app.schemas.auth import GitHubAuthorizationResponse, AuthStatusResponse
from app.services.github_oauth_service import generate_authorization_url, exchange_code_for_token
from app.services.session_store import session_store
from app.services.jwt_service import create_access_token, get_session_id_from_token

logger = logging.getLogger(__name__)

router = APIRouter()


async def get_github_user_info(access_token: str) -> Optional[dict]:
    """
    Fetch user info from GitHub API.
    
    Args:
        access_token: GitHub OAuth access token
        
    Returns:
        User info dict or None if failed
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"token {access_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    "login": user_data.get("login"),
                    "id": user_data.get("id"),
                    "avatar_url": user_data.get("avatar_url"),
                    "name": user_data.get("name"),
                    "email": user_data.get("email")
                }
    except Exception as e:
        logger.warning(f"[GitHub OAuth] Failed to fetch user info: {str(e)}")
    
    return None


@router.get("/authorize", response_model=GitHubAuthorizationResponse)
async def github_authorize():
    """
    Generates and returns the GitHub OAuth authorization URL.
    
    The frontend should redirect the user to this URL to initiate the OAuth flow.
    """
    if not settings.GITHUB_CLIENT_ID:
        logger.error("[GitHub OAuth] GITHUB_CLIENT_ID not configured")
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID."
        )
    
    authorization_url = generate_authorization_url()
    return GitHubAuthorizationResponse(authorization_url=authorization_url)


@router.get("/callback")
async def github_callback(
    code: str = Query(None, description="Authorization code from GitHub"),
    error: str = Query(None, description="Error code if authorization failed"),
    error_description: str = Query(None, description="Error description")
):
    """
    GitHub OAuth callback endpoint.
    
    This endpoint is called by GitHub after the user authorizes (or denies) access.
    
    Security flow:
    1. Exchange authorization code for GitHub access token
    2. Fetch user info from GitHub
    3. Store GitHub token in memory (NOT sent to frontend)
    4. Create JWT with only session ID
    5. Redirect to frontend with JWT (not the GitHub token)
    """
    # Handle error from GitHub (user denied access or other error)
    if error:
        logger.warning(f"[GitHub OAuth] Authorization error: {error} - {error_description}")
        error_params = urlencode({
            "github_error": error,
            "github_error_description": error_description or "Authorization was denied"
        })
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?{error_params}")
    
    # Validate code is present
    if not code:
        logger.error("[GitHub OAuth] No authorization code received")
        error_params = urlencode({
            "github_error": "no_code",
            "github_error_description": "No authorization code received from GitHub"
        })
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?{error_params}")
    
    # Check if OAuth is configured
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        logger.error("[GitHub OAuth] GitHub OAuth not configured")
        error_params = urlencode({
            "github_error": "not_configured",
            "github_error_description": "GitHub OAuth is not configured on the server"
        })
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?{error_params}")
    
    try:
        # 1. Exchange code for GitHub access token
        github_token = await exchange_code_for_token(code)
        
        # 2. Fetch user info from GitHub
        user_info = await get_github_user_info(github_token)
        
        # 3. Store GitHub token in memory (NEVER sent to frontend)
        session_id = session_store.create_session(github_token, user_info)
        
        # 4. Create JWT with only the session ID
        jwt_token = create_access_token(session_id)
        
        # 5. Redirect to frontend with JWT (NOT the GitHub token)
        logger.info(f"[GitHub OAuth] Successfully authenticated user {user_info.get('login') if user_info else 'unknown'}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?token={jwt_token}")
        
    except Exception as e:
        logger.error(f"[GitHub OAuth] Token exchange failed: {str(e)}")
        error_params = urlencode({
            "github_error": "token_exchange_failed",
            "github_error_description": str(e)
        })
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?{error_params}")


@router.get("/status", response_model=AuthStatusResponse)
async def auth_status(authorization: Optional[str] = Header(None)):
    """
    Check authentication status and return user info.
    
    Args:
        authorization: Bearer token from Authorization header
        
    Returns:
        Authentication status and user info if authenticated
    """
    if not authorization or not authorization.startswith("Bearer "):
        return AuthStatusResponse(authenticated=False)
    
    token = authorization.replace("Bearer ", "")
    session_id = get_session_id_from_token(token)
    
    if not session_id:
        return AuthStatusResponse(authenticated=False)
    
    session = session_store.get_session(session_id)
    
    if not session:
        return AuthStatusResponse(authenticated=False)
    
    return AuthStatusResponse(
        authenticated=True,
        user=session.get("user_info")
    )


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """
    Logout the user by removing their session from memory.
    
    Args:
        authorization: Bearer token from Authorization header
        
    Returns:
        Logout confirmation
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    session_id = get_session_id_from_token(token)
    
    if not session_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    deleted = session_store.delete_session(session_id)
    
    if deleted:
        logger.info("[GitHub OAuth] User logged out successfully")
        return {"message": "Successfully logged out"}
    else:
        return {"message": "Session not found or already expired"}
