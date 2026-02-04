"""
Authentication Manager for Integration System.
Handles multiple authentication methods and secure credential management.
"""
import base64
import json
import httpx
from typing import Dict, Any, Optional, Union
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os
import secrets
from app.core.config import settings
from app.core.logging import get_logger
from app.models.integration import AuthenticationType

logger = get_logger(__name__)


class AuthenticationManager:
    """
    Manages authentication for integrations with multiple auth methods.
    Provides secure credential storage and validation.
    """
    
    def __init__(self):
        """Initialize the authentication manager."""
        self._encryption_key = self._get_or_create_encryption_key()
        self._fernet = Fernet(self._encryption_key)
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for credential storage."""
        # In production, this should be stored securely (e.g., environment variable, key management service)
        key_env = getattr(settings, 'integration_encryption_key', None)
        if key_env:
            return key_env.encode()
        
        # Generate a key from a password and salt
        password = getattr(settings, 'secret_key', 'default-secret-key').encode()
        salt = b'integration-auth-salt'  # In production, use a random salt stored securely
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    def validate_credentials(self, auth_type: str, credentials: Dict[str, Any]) -> bool:
        """
        Validate credentials for the specified authentication type.
        
        Args:
            auth_type: The authentication type (username_password, api_key, etc.)
            credentials: Dictionary containing the credentials
            
        Returns:
            bool: True if credentials are valid for the auth type
        """
        try:
            auth_type_enum = AuthenticationType(auth_type)
        except ValueError:
            logger.error(f"Unsupported authentication type: {auth_type}")
            return False
        
        if auth_type_enum == AuthenticationType.USERNAME_PASSWORD:
            return self._validate_username_password(credentials)
        elif auth_type_enum == AuthenticationType.API_KEY:
            return self._validate_api_key(credentials)
        elif auth_type_enum == AuthenticationType.OAUTH2:
            return self._validate_oauth2(credentials)
        elif auth_type_enum == AuthenticationType.BEARER_TOKEN:
            return self._validate_bearer_token(credentials)
        elif auth_type_enum == AuthenticationType.BASIC_AUTH:
            return self._validate_basic_auth(credentials)
        elif auth_type_enum == AuthenticationType.CUSTOM:
            return self._validate_custom(credentials)
        
        return False
    
    def _validate_username_password(self, credentials: Dict[str, Any]) -> bool:
        """Validate username/password credentials."""
        required_fields = ['username', 'password']
        return all(
            field in credentials and 
            isinstance(credentials[field], str) and 
            len(credentials[field].strip()) > 0
            for field in required_fields
        )
    
    def _validate_api_key(self, credentials: Dict[str, Any]) -> bool:
        """Validate API key credentials."""
        api_key = credentials.get('api_key', '')
        return isinstance(api_key, str) and len(api_key.strip()) > 0
    
    def _validate_oauth2(self, credentials: Dict[str, Any]) -> bool:
        """Validate OAuth 2.0 credentials."""
        required_fields = ['client_id', 'client_secret']
        return all(
            field in credentials and 
            isinstance(credentials[field], str) and 
            len(credentials[field].strip()) > 0
            for field in required_fields
        )
    
    def _validate_bearer_token(self, credentials: Dict[str, Any]) -> bool:
        """Validate bearer token credentials."""
        token = credentials.get('token', '')
        return isinstance(token, str) and len(token.strip()) > 0
    
    def _validate_basic_auth(self, credentials: Dict[str, Any]) -> bool:
        """Validate basic auth credentials."""
        required_fields = ['username', 'password']
        return all(
            field in credentials and 
            isinstance(credentials[field], str) and 
            len(credentials[field].strip()) > 0
            for field in required_fields
        )
    
    def _validate_custom(self, credentials: Dict[str, Any]) -> bool:
        """Validate custom authentication credentials."""
        # For custom auth, we just check that there are some credentials provided
        return isinstance(credentials, dict) and len(credentials) > 0
    
    def encrypt_credentials(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """
        Encrypt sensitive credential data.
        
        Args:
            credentials: Dictionary containing credential data
            
        Returns:
            Dict containing encrypted credential data
        """
        if not isinstance(credentials, dict):
            raise ValueError("Credentials must be a dictionary")
        
        try:
            # Convert credentials to JSON string
            credentials_json = json.dumps(credentials, sort_keys=True)
            
            # Encrypt the JSON string
            encrypted_data = self._fernet.encrypt(credentials_json.encode())
            
            # Return as base64 encoded string for storage
            return {
                'encrypted_data': base64.b64encode(encrypted_data).decode(),
                'encryption_version': '1'
            }
        except Exception as e:
            logger.error(f"Failed to encrypt credentials: {e}")
            raise ValueError("Credential encryption failed")
    
    def decrypt_credentials(self, encrypted_credentials: Dict[str, Any]) -> Dict[str, Any]:
        """
        Decrypt credential data.
        
        Args:
            encrypted_credentials: Dictionary containing encrypted credential data
            
        Returns:
            Dict containing decrypted credential data
        """
        if not isinstance(encrypted_credentials, dict):
            raise ValueError("Encrypted credentials must be a dictionary")
        
        encrypted_data = encrypted_credentials.get('encrypted_data')
        if not encrypted_data:
            raise ValueError("No encrypted data found")
        
        try:
            # Decode from base64
            encrypted_bytes = base64.b64decode(encrypted_data.encode())
            
            # Decrypt the data
            decrypted_data = self._fernet.decrypt(encrypted_bytes)
            
            # Parse JSON back to dictionary
            credentials = json.loads(decrypted_data.decode())
            
            return credentials
        except Exception as e:
            logger.error(f"Failed to decrypt credentials: {e}")
            raise ValueError("Credential decryption failed")
    
    async def test_connection(self, integration_id: str, auth_type: str, auth_config: Dict[str, Any], 
                            credentials: Dict[str, Any]) -> Dict[str, Any]:
        """
        Test connection using the provided authentication configuration.
        
        Args:
            integration_id: Unique identifier for the integration
            auth_type: The authentication type
            auth_config: Authentication configuration (URLs, endpoints, etc.)
            credentials: Authentication credentials
            
        Returns:
            Dict containing connection test results
        """
        try:
            # Validate credentials first
            if not self.validate_credentials(auth_type, credentials):
                return {
                    'success': False,
                    'message': f'Invalid credentials for authentication type: {auth_type}'
                }
            
            # Get authentication headers
            headers = self.get_auth_headers(auth_type, auth_config, credentials)
            
            # Determine test endpoint
            test_url = self._get_test_endpoint(auth_config)
            if not test_url:
                return {
                    'success': False,
                    'message': 'No test endpoint configured'
                }
            
            # Perform connection test
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(test_url, headers=headers)
                
                if response.status_code < 400:
                    return {
                        'success': True,
                        'message': f'Connection successful (HTTP {response.status_code})',
                        'status_code': response.status_code
                    }
                else:
                    return {
                        'success': False,
                        'message': f'Connection failed (HTTP {response.status_code})',
                        'status_code': response.status_code
                    }
        
        except Exception as e:
            logger.error(f"Connection test failed for integration {integration_id}: {e}")
            return {
                'success': False,
                'message': f'Connection test error: {str(e)}'
            }
    
    def get_auth_headers(self, auth_type: str, auth_config: Dict[str, Any], 
                        credentials: Dict[str, Any]) -> Dict[str, str]:
        """
        Generate authentication headers for the specified auth type.
        
        Args:
            auth_type: The authentication type
            auth_config: Authentication configuration
            credentials: Authentication credentials
            
        Returns:
            Dict containing HTTP headers for authentication
        """
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        try:
            auth_type_enum = AuthenticationType(auth_type)
        except ValueError:
            logger.error(f"Unsupported authentication type: {auth_type}")
            return headers
        
        if auth_type_enum == AuthenticationType.USERNAME_PASSWORD:
            # For username/password, we typically use basic auth
            username = credentials.get('username', '')
            password = credentials.get('password', '')
            if username and password:
                auth_string = base64.b64encode(f"{username}:{password}".encode()).decode()
                headers['Authorization'] = f'Basic {auth_string}'
        
        elif auth_type_enum == AuthenticationType.API_KEY:
            api_key = credentials.get('api_key', '')
            key_header = auth_config.get('api_key_header', 'X-API-Key')
            if api_key:
                headers[key_header] = api_key
        
        elif auth_type_enum == AuthenticationType.OAUTH2:
            # For OAuth2, we expect an access token
            access_token = credentials.get('access_token', '')
            if access_token:
                headers['Authorization'] = f'Bearer {access_token}'
        
        elif auth_type_enum == AuthenticationType.BEARER_TOKEN:
            token = credentials.get('token', '')
            if token:
                headers['Authorization'] = f'Bearer {token}'
        
        elif auth_type_enum == AuthenticationType.BASIC_AUTH:
            username = credentials.get('username', '')
            password = credentials.get('password', '')
            if username and password:
                auth_string = base64.b64encode(f"{username}:{password}".encode()).decode()
                headers['Authorization'] = f'Basic {auth_string}'
        
        elif auth_type_enum == AuthenticationType.CUSTOM:
            # For custom auth, use the headers directly from auth_config
            custom_headers = auth_config.get('headers', {})
            headers.update(custom_headers)
            
            # Replace placeholders with credential values
            for key, value in headers.items():
                if isinstance(value, str):
                    for cred_key, cred_value in credentials.items():
                        placeholder = f'{{{cred_key}}}'
                        if placeholder in value:
                            headers[key] = value.replace(placeholder, str(cred_value))
        
        return headers
    
    def _get_test_endpoint(self, auth_config: Dict[str, Any]) -> Optional[str]:
        """Get the test endpoint URL from auth configuration."""
        # Try different common endpoint names
        test_endpoints = [
            'test_url',
            'health_check_url',
            'base_url',
            'url'
        ]
        
        for endpoint_key in test_endpoints:
            url = auth_config.get(endpoint_key)
            if url and isinstance(url, str):
                return url
        
        return None
    
    def supports_auth_type(self, auth_type: str) -> bool:
        """Check if the authentication type is supported."""
        try:
            AuthenticationType(auth_type)
            return True
        except ValueError:
            return False
    
    def get_supported_auth_types(self) -> list[str]:
        """Get list of supported authentication types."""
        return [auth_type.value for auth_type in AuthenticationType]