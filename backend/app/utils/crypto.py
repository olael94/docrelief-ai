from cryptography.fernet import Fernet
import base64
from app.config import settings


def get_fernet():
    """Create Fernet instance using SECRET_KEY"""
    # Use SECRET_KEY from config, padded or hashed to 32 bytes for Fernet
    import hashlib

    key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_token(token: str) -> str:
    """Encrypt GitHub token"""
    if not token:
        return None
    f = get_fernet()
    return f.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt GitHub token"""
    if not encrypted_token:
        return None
    try:
        f = get_fernet()
        return f.decrypt(encrypted_token.encode()).decode()
    except Exception:
        return None
