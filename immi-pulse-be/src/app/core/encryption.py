"""
Fernet encryption for OAuth tokens at rest.
Ported from AgentOS integrations/encryption.py.
"""

import base64
import hashlib
import logging

from cryptography.fernet import Fernet

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class TokenEncryption:
    """AES-128-CBC encryption via Fernet for OAuth credentials."""

    def __init__(self):
        self._fernet = self._get_fernet()

    def _get_fernet(self) -> Fernet:
        secret = settings.encryption_key
        key = hashlib.sha256(secret.encode()).digest()
        fernet_key = base64.urlsafe_b64encode(key)
        return Fernet(fernet_key)

    def encrypt(self, plaintext: str) -> str:
        if not plaintext:
            return ""
        encrypted = self._fernet.encrypt(plaintext.encode())
        return base64.urlsafe_b64encode(encrypted).decode()

    def decrypt(self, ciphertext: str) -> str:
        if not ciphertext:
            return ""
        encrypted = base64.urlsafe_b64decode(ciphertext.encode())
        decrypted = self._fernet.decrypt(encrypted)
        return decrypted.decode()


_token_encryption = None


def get_token_encryption() -> TokenEncryption:
    global _token_encryption
    if _token_encryption is None:
        _token_encryption = TokenEncryption()
    return _token_encryption
