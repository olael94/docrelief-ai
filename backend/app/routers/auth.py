"""
GitHub OAuth authentication router.
"""
import logging
from urllib.parse import urlencode
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.config import settings
from app.schemas.auth import GitHubAuthorizationResponse
from app.services.github_oauth_service import generate_authorization_url, exchange_code_for_token

logger = logging.getLogger(__name__)

router = APIRouter()


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
    It exchanges the authorization code for an access token and redirects to the frontend.
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
        # Exchange code for access token
        access_token = await exchange_code_for_token(code)
        
        # Redirect to frontend with token
        logger.info("[GitHub OAuth] Successfully authenticated, redirecting to frontend")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?github_token={access_token}")
        
    except Exception as e:
        logger.error(f"[GitHub OAuth] Token exchange failed: {str(e)}")
        error_params = urlencode({
            "github_error": "token_exchange_failed",
            "github_error_description": str(e)
        })
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?{error_params}")
