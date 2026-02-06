"""
GitHub OAuth service for handling OAuth flow.
"""
import logging
from urllib.parse import urlencode
from typing import Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"


def generate_authorization_url(state: Optional[str] = None) -> str:
    """
    Generates the GitHub OAuth authorization URL.
    
    Args:
        state: Optional state parameter for CSRF protection
        
    Returns:
        str: The GitHub authorization URL
    """
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "repo",  # Access to private repositories
    }
    
    if state:
        params["state"] = state
    
    authorization_url = f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"
    logger.info(f"[GitHub OAuth] Generated authorization URL")
    
    return authorization_url


async def exchange_code_for_token(code: str) -> str:
    """
    Exchanges the authorization code for an access token.
    
    Args:
        code: The authorization code received from GitHub callback
        
    Returns:
        str: The access token
        
    Raises:
        Exception: If the token exchange fails
    """
    payload = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
    }
    
    headers = {
        "Accept": "application/json",
    }
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info("[GitHub OAuth] Exchanging code for access token")
            response = await client.post(
                GITHUB_TOKEN_URL,
                data=payload,
                headers=headers,
                timeout=10.0
            )
            
            if response.status_code != 200:
                logger.error(f"[GitHub OAuth] Token exchange failed: {response.status_code}")
                raise Exception(f"GitHub OAuth token exchange failed: {response.status_code}")
            
            data = response.json()
            
            if "error" in data:
                error_description = data.get("error_description", data.get("error"))
                logger.error(f"[GitHub OAuth] Token exchange error: {error_description}")
                raise Exception(f"GitHub OAuth error: {error_description}")
            
            access_token = data.get("access_token")
            
            if not access_token:
                logger.error("[GitHub OAuth] No access token in response")
                raise Exception("No access token received from GitHub")
            
            logger.info("[GitHub OAuth] Successfully obtained access token")
            return access_token
            
        except httpx.HTTPError as e:
            logger.error(f"[GitHub OAuth] HTTP error: {str(e)}")
            raise Exception(f"Connection error with GitHub: {str(e)}")
