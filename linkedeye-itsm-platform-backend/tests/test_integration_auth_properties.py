"""
Property-based tests for integration authentication system.
Feature: integration-auth-enhancement, Property 1: Authentication Method Support
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
"""
import pytest
from hypothesis import given, strategies as st, settings
from app.models.integration import Integration, AuthenticationType, IntegrationStatus
from app.services.authentication_manager import AuthenticationManager
import uuid
import json


class TestIntegrationAuthenticationProperties:
    """Property-based tests for integration authentication support."""
    
    @given(
        name=st.text(min_size=1, max_size=255),
        provider=st.text(min_size=1, max_size=100),
        auth_type=st.sampled_from([
            AuthenticationType.USERNAME_PASSWORD.value,
            AuthenticationType.API_KEY.value,
            AuthenticationType.OAUTH2.value,
            AuthenticationType.BEARER_TOKEN.value,
            AuthenticationType.BASIC_AUTH.value,
            AuthenticationType.CUSTOM.value
        ]),
        auth_config=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(st.text(max_size=100), st.integers(), st.booleans()),
            min_size=0,
            max_size=10
        ),
        sync_interval=st.integers(min_value=1, max_value=10080),  # 1 minute to 1 week
        retry_policy=st.fixed_dictionaries({
            "max_retries": st.integers(min_value=0, max_value=10),
            "backoff_factor": st.floats(min_value=1.0, max_value=5.0)
        }),
        health_check_url=st.one_of(
            st.none(),
            st.text(min_size=10, max_size=500).filter(lambda x: x.startswith('http'))
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_authentication_method_support(self, name, provider, auth_type, 
                                         auth_config, sync_interval, retry_policy, health_check_url):
        """
        Property 1: Authentication Method Support
        For any supported authentication type, the Integration_System should successfully 
        configure and validate integrations using that authentication method.
        **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
        """
        # Create integration with specified authentication method
        integration = Integration(
            id=uuid.uuid4(),
            name=name,
            provider=provider,
            auth_type=auth_type,
            auth_config=auth_config,
            sync_interval_minutes=sync_interval,
            retry_policy=retry_policy,
            health_check_url=health_check_url,
            status=IntegrationStatus.ACTIVE.value
        )
        
        # Properties that must hold for all authentication methods
        
        # 1. All authentication types should be supported
        assert integration.auth_type in [
            AuthenticationType.USERNAME_PASSWORD.value,
            AuthenticationType.API_KEY.value,
            AuthenticationType.OAUTH2.value,
            AuthenticationType.BEARER_TOKEN.value,
            AuthenticationType.BASIC_AUTH.value,
            AuthenticationType.CUSTOM.value
        ]
        
        # 2. Auth config should be preserved
        assert integration.auth_config == auth_config
        
        # 3. Sync interval should be positive
        assert integration.sync_interval_minutes > 0
        assert integration.sync_interval_minutes == sync_interval
        
        # 4. Retry policy should be preserved
        assert integration.retry_policy == retry_policy
        assert "max_retries" in integration.retry_policy
        assert "backoff_factor" in integration.retry_policy
        
        # 5. Health check URL should be preserved if provided
        assert integration.health_check_url == health_check_url
        
        # 6. Integration should support multiple auth methods property
        if auth_type != AuthenticationType.API_KEY.value:
            assert integration.supports_multiple_auth_methods
        
        # 7. Health check requirement should be correct
        if health_check_url:
            assert integration.requires_health_check
        else:
            assert not integration.requires_health_check
        
        # 8. Auth config should be JSON serializable
        json_str = json.dumps(auth_config)
        parsed_config = json.loads(json_str)
        assert parsed_config == auth_config
    
    @given(
        auth_configs=st.lists(
            st.dictionaries(
                st.text(min_size=1, max_size=20),
                st.one_of(st.text(max_size=50), st.integers(), st.booleans()),
                min_size=1,
                max_size=5
            ),
            min_size=2,
            max_size=6
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_auth_config_isolation(self, auth_configs):
        """
        Property 1: Authentication Method Support - Configuration isolation
        For any set of authentication configurations, each integration should 
        maintain its own isolated configuration.
        **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
        """
        integrations = []
        auth_types = [
            AuthenticationType.USERNAME_PASSWORD.value,
            AuthenticationType.API_KEY.value,
            AuthenticationType.OAUTH2.value,
            AuthenticationType.BEARER_TOKEN.value,
            AuthenticationType.BASIC_AUTH.value,
            AuthenticationType.CUSTOM.value
        ]
        
        # Create multiple integrations with different auth configs
        for i, auth_config in enumerate(auth_configs):
            integration = Integration(
                id=uuid.uuid4(),
                name=f"test_integration_{i}",
                provider=f"provider_{i}",
                auth_type=auth_types[i % len(auth_types)],
                auth_config=auth_config,
                sync_interval_minutes=60,
                retry_policy={"max_retries": 3, "backoff_factor": 2},
                status=IntegrationStatus.ACTIVE.value
            )
            integrations.append(integration)
        
        # Properties that must hold for configuration isolation
        for i, integration in enumerate(integrations):
            # 1. Each integration should maintain its own config
            assert integration.auth_config == auth_configs[i]
            
            # 2. Configs should not interfere with each other
            for j, other_integration in enumerate(integrations):
                if i != j:
                    assert integration.auth_config != other_integration.auth_config or i == j
            
            # 3. Auth config should be JSON serializable
            json_str = json.dumps(integration.auth_config)
            parsed_config = json.loads(json_str)
            assert parsed_config == integration.auth_config
    
    @given(
        auth_type=st.sampled_from([
            AuthenticationType.USERNAME_PASSWORD.value,
            AuthenticationType.API_KEY.value,
            AuthenticationType.OAUTH2.value,
            AuthenticationType.BEARER_TOKEN.value,
            AuthenticationType.BASIC_AUTH.value,
            AuthenticationType.CUSTOM.value
        ]),
        config_updates=st.lists(
            st.dictionaries(
                st.text(min_size=1, max_size=20),
                st.one_of(st.text(max_size=50), st.integers(), st.booleans()),
                min_size=1,
                max_size=3
            ),
            min_size=2,
            max_size=5
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_auth_config_updates(self, auth_type, config_updates):
        """
        Property 1: Authentication Method Support - Configuration updates
        For any authentication type, configuration updates should be preserved correctly.
        **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
        """
        # Create initial integration
        integration = Integration(
            id=uuid.uuid4(),
            name="test_config_updates",
            provider="test_provider",
            auth_type=auth_type,
            auth_config=config_updates[0],
            sync_interval_minutes=60,
            retry_policy={"max_retries": 3, "backoff_factor": 2},
            status=IntegrationStatus.ACTIVE.value
        )
        
        # Apply configuration updates
        for new_config in config_updates[1:]:
            integration.auth_config = new_config
            
            # Properties that must hold after each update
            assert integration.auth_config == new_config
            assert integration.auth_type == auth_type  # Auth type should remain unchanged
            
            # Config should be JSON serializable
            json_str = json.dumps(integration.auth_config)
            parsed_config = json.loads(json_str)
            assert parsed_config == integration.auth_config
    
    @given(
        sync_intervals=st.lists(
            st.integers(min_value=1, max_value=10080),
            min_size=3,
            max_size=10
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_sync_interval_validation(self, sync_intervals):
        """
        Property 1: Authentication Method Support - Sync interval validation
        For any positive sync interval, the integration should accept and preserve it.
        **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
        """
        for sync_interval in sync_intervals:
            integration = Integration(
                id=uuid.uuid4(),
                name="test_sync_interval",
                provider="test_provider",
                auth_type=AuthenticationType.API_KEY.value,
                auth_config={},
                sync_interval_minutes=sync_interval,
                retry_policy={"max_retries": 3, "backoff_factor": 2},
                status=IntegrationStatus.ACTIVE.value
            )
            
            # Properties that must hold
            assert integration.sync_interval_minutes == sync_interval
            assert integration.sync_interval_minutes > 0
    
    @given(
        retry_policies=st.lists(
            st.fixed_dictionaries({
                "max_retries": st.integers(min_value=0, max_value=10),
                "backoff_factor": st.floats(min_value=1.0, max_value=5.0)
            }),
            min_size=3,
            max_size=10
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_retry_policy_validation(self, retry_policies):
        """
        Property 1: Authentication Method Support - Retry policy validation
        For any valid retry policy, the integration should accept and preserve it.
        **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
        """
        for retry_policy in retry_policies:
            integration = Integration(
                id=uuid.uuid4(),
                name="test_retry_policy",
                provider="test_provider",
                auth_type=AuthenticationType.API_KEY.value,
                auth_config={},
                sync_interval_minutes=60,
                retry_policy=retry_policy,
                status=IntegrationStatus.ACTIVE.value
            )
            
            # Properties that must hold
            assert integration.retry_policy == retry_policy
            assert "max_retries" in integration.retry_policy
            assert "backoff_factor" in integration.retry_policy
            assert integration.retry_policy["max_retries"] >= 0
            assert integration.retry_policy["backoff_factor"] >= 1.0


class TestCredentialSecurityProperties:
    """Property-based tests for credential security and encryption."""
    
    @given(
        credentials=st.dictionaries(
            st.text(min_size=1, max_size=50),
            st.one_of(
                st.text(min_size=1, max_size=200),
                st.integers(),
                st.booleans(),
                st.floats(allow_nan=False, allow_infinity=False)
            ),
            min_size=1,
            max_size=10
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_credential_security_round_trip(self, credentials):
        """
        Property 2: Credential Security Round Trip
        For any integration credentials, encrypting then decrypting should produce 
        equivalent credential data, and all sensitive operations should maintain security.
        **Validates: Requirements 7.1, 7.2, 7.4, 7.5**
        """
        auth_manager = AuthenticationManager()
        
        # Properties that must hold for credential encryption/decryption
        
        # 1. Round trip property: encrypt then decrypt should yield original data
        encrypted_credentials = auth_manager.encrypt_credentials(credentials)
        decrypted_credentials = auth_manager.decrypt_credentials(encrypted_credentials)
        assert decrypted_credentials == credentials
        
        # 2. Encrypted data should be different from original
        assert encrypted_credentials != credentials
        assert 'encrypted_data' in encrypted_credentials
        assert 'encryption_version' in encrypted_credentials
        
        # 3. Encrypted data should be base64 encoded string
        encrypted_data = encrypted_credentials['encrypted_data']
        assert isinstance(encrypted_data, str)
        assert len(encrypted_data) > 0
        
        # 4. Multiple encryptions of same data should produce different results (due to Fernet's built-in randomness)
        encrypted_credentials_2 = auth_manager.encrypt_credentials(credentials)
        assert encrypted_credentials['encrypted_data'] != encrypted_credentials_2['encrypted_data']
        
        # 5. Both encrypted versions should decrypt to same original data
        decrypted_credentials_2 = auth_manager.decrypt_credentials(encrypted_credentials_2)
        assert decrypted_credentials_2 == credentials
        assert decrypted_credentials == decrypted_credentials_2
        
        # 6. Encryption should preserve data types after round trip
        for key, value in credentials.items():
            assert key in decrypted_credentials
            assert type(decrypted_credentials[key]) == type(value)
            assert decrypted_credentials[key] == value
    
    @given(
        credentials_list=st.lists(
            st.dictionaries(
                st.text(min_size=1, max_size=30),
                st.one_of(
                    st.text(min_size=1, max_size=100),
                    st.integers(min_value=-1000, max_value=1000),
                    st.booleans()
                ),
                min_size=1,
                max_size=5
            ),
            min_size=2,
            max_size=10
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_credential_encryption_isolation(self, credentials_list):
        """
        Property 2: Credential Security Round Trip - Encryption isolation
        For any set of different credentials, each should encrypt and decrypt independently
        without affecting others.
        **Validates: Requirements 7.1, 7.2, 7.4, 7.5**
        """
        auth_manager = AuthenticationManager()
        encrypted_list = []
        
        # Encrypt all credentials
        for credentials in credentials_list:
            encrypted = auth_manager.encrypt_credentials(credentials)
            encrypted_list.append(encrypted)
        
        # Properties that must hold for encryption isolation
        for i, (original_creds, encrypted_creds) in enumerate(zip(credentials_list, encrypted_list)):
            # 1. Each credential set should decrypt to its original
            decrypted = auth_manager.decrypt_credentials(encrypted_creds)
            assert decrypted == original_creds
            
            # 2. Encrypted data should be unique (different from others)
            for j, other_encrypted in enumerate(encrypted_list):
                if i != j:
                    assert encrypted_creds['encrypted_data'] != other_encrypted['encrypted_data']
            
            # 3. Decryption should not affect other encrypted credentials
            for j, other_encrypted in enumerate(encrypted_list):
                if i != j:
                    other_decrypted = auth_manager.decrypt_credentials(other_encrypted)
                    assert other_decrypted == credentials_list[j]
    
    @given(
        auth_type=st.sampled_from([
            AuthenticationType.USERNAME_PASSWORD.value,
            AuthenticationType.API_KEY.value,
            AuthenticationType.OAUTH2.value,
            AuthenticationType.BEARER_TOKEN.value,
            AuthenticationType.BASIC_AUTH.value,
            AuthenticationType.CUSTOM.value
        ]),
        credentials=st.dictionaries(
            st.text(min_size=1, max_size=30),
            st.text(min_size=1, max_size=100),
            min_size=1,
            max_size=8
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_credential_validation_with_encryption(self, auth_type, credentials):
        """
        Property 2: Credential Security Round Trip - Validation with encryption
        For any authentication type and credentials, validation should work correctly
        with encrypted credentials after round trip.
        **Validates: Requirements 7.1, 7.2, 7.4, 7.5**
        """
        auth_manager = AuthenticationManager()
        
        # Test validation before encryption
        validation_before = auth_manager.validate_credentials(auth_type, credentials)
        
        # Encrypt and decrypt credentials
        encrypted_credentials = auth_manager.encrypt_credentials(credentials)
        decrypted_credentials = auth_manager.decrypt_credentials(encrypted_credentials)
        
        # Test validation after round trip
        validation_after = auth_manager.validate_credentials(auth_type, decrypted_credentials)
        
        # Properties that must hold
        # 1. Validation result should be same before and after encryption round trip
        assert validation_before == validation_after
        
        # 2. Decrypted credentials should be identical to original
        assert decrypted_credentials == credentials
        
        # 3. If validation passes, credentials should contain expected fields for auth type
        if validation_after:
            if auth_type == AuthenticationType.USERNAME_PASSWORD.value:
                assert 'username' in decrypted_credentials or 'password' in decrypted_credentials
            elif auth_type == AuthenticationType.API_KEY.value:
                assert 'api_key' in decrypted_credentials
            elif auth_type == AuthenticationType.OAUTH2.value:
                assert 'client_id' in decrypted_credentials or 'client_secret' in decrypted_credentials
            elif auth_type == AuthenticationType.BEARER_TOKEN.value:
                assert 'token' in decrypted_credentials
            elif auth_type == AuthenticationType.BASIC_AUTH.value:
                assert 'username' in decrypted_credentials or 'password' in decrypted_credentials


class TestAuthenticationMethodValidationProperties:
    """Property-based tests for authentication method validation."""
    
    @given(
        auth_type=st.sampled_from([
            AuthenticationType.USERNAME_PASSWORD.value,
            AuthenticationType.API_KEY.value,
            AuthenticationType.OAUTH2.value,
            AuthenticationType.BEARER_TOKEN.value,
            AuthenticationType.BASIC_AUTH.value,
            AuthenticationType.CUSTOM.value
        ]),
        valid_credentials=st.one_of(
            # Username/password credentials
            st.fixed_dictionaries({
                'username': st.text(min_size=1, max_size=50),
                'password': st.text(min_size=1, max_size=100)
            }),
            # API key credentials
            st.fixed_dictionaries({
                'api_key': st.text(min_size=1, max_size=200)
            }),
            # OAuth2 credentials
            st.fixed_dictionaries({
                'client_id': st.text(min_size=1, max_size=100),
                'client_secret': st.text(min_size=1, max_size=200)
            }),
            # Bearer token credentials
            st.fixed_dictionaries({
                'token': st.text(min_size=1, max_size=500)
            }),
            # Basic auth credentials (same as username/password)
            st.fixed_dictionaries({
                'username': st.text(min_size=1, max_size=50),
                'password': st.text(min_size=1, max_size=100)
            }),
            # Custom credentials
            st.dictionaries(
                st.text(min_size=1, max_size=30),
                st.text(min_size=1, max_size=100),
                min_size=1,
                max_size=5
            )
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_authentication_method_validation(self, auth_type, valid_credentials):
        """
        Property 1: Authentication Method Support - Method validation
        For any supported authentication type and appropriate credentials, 
        the Authentication_Manager should successfully validate the credentials.
        **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7**
        """
        auth_manager = AuthenticationManager()
        
        # Properties that must hold for authentication method validation
        
        # 1. Authentication manager should support all defined auth types
        assert auth_manager.supports_auth_type(auth_type)
        
        # 2. All supported auth types should be in the supported list
        supported_types = auth_manager.get_supported_auth_types()
        assert auth_type in supported_types
        
        # 3. Validation should work correctly for matching auth type and credentials
        if auth_type == AuthenticationType.USERNAME_PASSWORD.value:
            if 'username' in valid_credentials and 'password' in valid_credentials:
                assert auth_manager.validate_credentials(auth_type, valid_credentials)
        elif auth_type == AuthenticationType.API_KEY.value:
            if 'api_key' in valid_credentials:
                assert auth_manager.validate_credentials(auth_type, valid_credentials)
        elif auth_type == AuthenticationType.OAUTH2.value:
            if 'client_id' in valid_credentials and 'client_secret' in valid_credentials:
                assert auth_manager.validate_credentials(auth_type, valid_credentials)
        elif auth_type == AuthenticationType.BEARER_TOKEN.value:
            if 'token' in valid_credentials:
                assert auth_manager.validate_credentials(auth_type, valid_credentials)
        elif auth_type == AuthenticationType.BASIC_AUTH.value:
            if 'username' in valid_credentials and 'password' in valid_credentials:
                assert auth_manager.validate_credentials(auth_type, valid_credentials)
        elif auth_type == AuthenticationType.CUSTOM.value:
            # Custom auth should accept any non-empty dictionary
            if isinstance(valid_credentials, dict) and len(valid_credentials) > 0:
                assert auth_manager.validate_credentials(auth_type, valid_credentials)
        
        # 4. Auth headers should be generated for valid credentials
        auth_config = {'base_url': 'https://api.example.com'}
        headers = auth_manager.get_auth_headers(auth_type, auth_config, valid_credentials)
        assert isinstance(headers, dict)
        assert 'Content-Type' in headers
        assert 'Accept' in headers
    
    @given(
        auth_type=st.sampled_from([
            AuthenticationType.USERNAME_PASSWORD.value,
            AuthenticationType.API_KEY.value,
            AuthenticationType.OAUTH2.value,
            AuthenticationType.BEARER_TOKEN.value,
            AuthenticationType.BASIC_AUTH.value,
            AuthenticationType.CUSTOM.value
        ]),
        invalid_credentials=st.one_of(
            # Empty credentials
            st.just({}),
            # Credentials with empty values
            st.fixed_dictionaries({
                'username': st.just(''),
                'password': st.just('')
            }),
            st.fixed_dictionaries({
                'api_key': st.just('')
            }),
            st.fixed_dictionaries({
                'token': st.just('')
            }),
            # Credentials with wrong field names
            st.fixed_dictionaries({
                'wrong_field': st.text(min_size=1, max_size=50)
            }),
            # Non-string values where strings expected
            st.fixed_dictionaries({
                'username': st.integers(),
                'password': st.booleans()
            })
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_authentication_method_validation_failures(self, auth_type, invalid_credentials):
        """
        Property 1: Authentication Method Support - Validation failures
        For any authentication type with invalid credentials, validation should fail appropriately.
        **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7**
        """
        auth_manager = AuthenticationManager()
        
        # Properties that must hold for invalid credentials
        
        # 1. Invalid credentials should fail validation for specific auth types
        if auth_type in [AuthenticationType.USERNAME_PASSWORD.value, AuthenticationType.BASIC_AUTH.value]:
            if not ('username' in invalid_credentials and 'password' in invalid_credentials and
                   isinstance(invalid_credentials.get('username'), str) and
                   isinstance(invalid_credentials.get('password'), str) and
                   len(invalid_credentials['username'].strip()) > 0 and
                   len(invalid_credentials['password'].strip()) > 0):
                assert not auth_manager.validate_credentials(auth_type, invalid_credentials)
        
        elif auth_type == AuthenticationType.API_KEY.value:
            if not ('api_key' in invalid_credentials and
                   isinstance(invalid_credentials.get('api_key'), str) and
                   len(invalid_credentials['api_key'].strip()) > 0):
                assert not auth_manager.validate_credentials(auth_type, invalid_credentials)
        
        elif auth_type == AuthenticationType.OAUTH2.value:
            if not ('client_id' in invalid_credentials and 'client_secret' in invalid_credentials and
                   isinstance(invalid_credentials.get('client_id'), str) and
                   isinstance(invalid_credentials.get('client_secret'), str) and
                   len(invalid_credentials['client_id'].strip()) > 0 and
                   len(invalid_credentials['client_secret'].strip()) > 0):
                assert not auth_manager.validate_credentials(auth_type, invalid_credentials)
        
        elif auth_type == AuthenticationType.BEARER_TOKEN.value:
            if not ('token' in invalid_credentials and
                   isinstance(invalid_credentials.get('token'), str) and
                   len(invalid_credentials['token'].strip()) > 0):
                assert not auth_manager.validate_credentials(auth_type, invalid_credentials)
        
        # 2. Custom auth should only fail for completely empty dictionaries
        if auth_type == AuthenticationType.CUSTOM.value:
            if not isinstance(invalid_credentials, dict) or len(invalid_credentials) == 0:
                assert not auth_manager.validate_credentials(auth_type, invalid_credentials)
    
    @given(
        unsupported_auth_type=st.text(min_size=1, max_size=50).filter(
            lambda x: x not in [
                AuthenticationType.USERNAME_PASSWORD.value,
                AuthenticationType.API_KEY.value,
                AuthenticationType.OAUTH2.value,
                AuthenticationType.BEARER_TOKEN.value,
                AuthenticationType.BASIC_AUTH.value,
                AuthenticationType.CUSTOM.value
            ]
        ),
        credentials=st.dictionaries(
            st.text(min_size=1, max_size=30),
            st.text(min_size=1, max_size=100),
            min_size=1,
            max_size=5
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_unsupported_authentication_types(self, unsupported_auth_type, credentials):
        """
        Property 1: Authentication Method Support - Unsupported types
        For any unsupported authentication type, validation should fail gracefully.
        **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.7**
        """
        auth_manager = AuthenticationManager()
        
        # Properties that must hold for unsupported auth types
        
        # 1. Unsupported auth types should not be supported
        assert not auth_manager.supports_auth_type(unsupported_auth_type)
        
        # 2. Validation should fail for unsupported auth types
        assert not auth_manager.validate_credentials(unsupported_auth_type, credentials)
        
        # 3. Unsupported auth types should not be in supported list
        supported_types = auth_manager.get_supported_auth_types()
        assert unsupported_auth_type not in supported_types
        
        # 4. Auth headers should still be generated (with defaults) even for unsupported types
        auth_config = {'base_url': 'https://api.example.com'}
        headers = auth_manager.get_auth_headers(unsupported_auth_type, auth_config, credentials)
        assert isinstance(headers, dict)
        assert 'Content-Type' in headers
        assert 'Accept' in headers


class TestConfigurationValidationProperties:
    """Property-based tests for integration configuration validation."""
    
    @given(
        auth_type=st.sampled_from([
            AuthenticationType.USERNAME_PASSWORD.value,
            AuthenticationType.API_KEY.value,
            AuthenticationType.OAUTH2.value,
            AuthenticationType.BEARER_TOKEN.value,
            AuthenticationType.BASIC_AUTH.value,
            AuthenticationType.CUSTOM.value
        ]),
        auth_config=st.one_of(
            # Username/password auth config
            st.fixed_dictionaries({
                'username_field': st.text(min_size=1, max_size=50),
                'password_field': st.text(min_size=1, max_size=50),
                'auth_url': st.text(min_size=10, max_size=200).filter(lambda x: x.startswith('http'))
            }),
            # OAuth2 auth config
            st.fixed_dictionaries({
                'client_id': st.text(min_size=1, max_size=100),
                'client_secret': st.text(min_size=1, max_size=200),
                'authorization_url': st.text(min_size=10, max_size=200).filter(lambda x: x.startswith('http')),
                'token_url': st.text(min_size=10, max_size=200).filter(lambda x: x.startswith('http')),
                'scope': st.text(min_size=1, max_size=100),
                'redirect_uri': st.text(min_size=10, max_size=200).filter(lambda x: x.startswith('http'))
            }),
            # Bearer token auth config
            st.fixed_dictionaries({
                'token_field': st.text(min_size=1, max_size=50)
            }),
            # Basic auth config
            st.fixed_dictionaries({
                'username_field': st.text(min_size=1, max_size=50),
                'password_field': st.text(min_size=1, max_size=50)
            }),
            # API key auth config
            st.fixed_dictionaries({
                'api_key_field': st.text(min_size=1, max_size=50),
                'header_name': st.text(min_size=1, max_size=50)
            }),
            # Custom auth config
            st.dictionaries(
                st.text(min_size=1, max_size=30),
                st.one_of(st.text(max_size=100), st.integers(), st.booleans()),
                min_size=0,
                max_size=10
            )
        ),
        required_fields=st.lists(
            st.text(min_size=1, max_size=30),
            min_size=0,
            max_size=5
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_configuration_validation(self, auth_type, auth_config, required_fields):
        """
        Property 8: Configuration Validation
        For any integration configuration attempt, the Integration_System should validate 
        that all required fields are present and provide appropriate feedback.
        **Validates: Requirements 2.4, 2.5**
        """
        from app.api.integrations import IntegrationCreate
        from pydantic import ValidationError
        
        # Properties that must hold for configuration validation
        
        # 1. Valid auth_type should be accepted
        valid_auth_types = [auth_type.value for auth_type in AuthenticationType]
        assert auth_type in valid_auth_types
        
        # 2. Configuration validation should work for matching auth_type and auth_config
        try:
            integration_data = IntegrationCreate(
                name="test_integration",
                provider="test_provider",
                auth_type=auth_type,
                auth_config=auth_config,
                configuration={"required_fields": required_fields}
            )
            
            # If validation passes, check that required fields are properly handled
            assert integration_data.auth_type == auth_type
            assert integration_data.auth_config == auth_config
            
            # 3. Auth config should match expected structure for auth type
            if auth_type == AuthenticationType.USERNAME_PASSWORD.value:
                if 'username_field' in auth_config and 'password_field' in auth_config:
                    assert isinstance(auth_config['username_field'], str)
                    assert isinstance(auth_config['password_field'], str)
                    assert len(auth_config['username_field']) > 0
                    assert len(auth_config['password_field']) > 0
            
            elif auth_type == AuthenticationType.OAUTH2.value:
                if all(field in auth_config for field in ['client_id', 'client_secret', 'authorization_url', 'token_url']):
                    assert isinstance(auth_config['client_id'], str)
                    assert isinstance(auth_config['client_secret'], str)
                    assert isinstance(auth_config['authorization_url'], str)
                    assert isinstance(auth_config['token_url'], str)
                    assert len(auth_config['client_id']) > 0
                    assert len(auth_config['client_secret']) > 0
                    assert auth_config['authorization_url'].startswith('http')
                    assert auth_config['token_url'].startswith('http')
            
            elif auth_type == AuthenticationType.BEARER_TOKEN.value:
                if 'token_field' in auth_config:
                    assert isinstance(auth_config['token_field'], str)
                    assert len(auth_config['token_field']) > 0
            
            elif auth_type == AuthenticationType.BASIC_AUTH.value:
                if 'username_field' in auth_config and 'password_field' in auth_config:
                    assert isinstance(auth_config['username_field'], str)
                    assert isinstance(auth_config['password_field'], str)
                    assert len(auth_config['username_field']) > 0
                    assert len(auth_config['password_field']) > 0
            
            # 4. Sync interval should be positive
            assert integration_data.sync_interval_minutes > 0
            
            # 5. Retry policy should have required fields
            assert 'max_retries' in integration_data.retry_policy
            assert 'backoff_factor' in integration_data.retry_policy
            assert integration_data.retry_policy['max_retries'] >= 0
            assert integration_data.retry_policy['backoff_factor'] >= 1.0
            
        except ValidationError as e:
            # If validation fails, it should be for a good reason
            error_messages = [error['msg'] for error in e.errors]
            
            # Check that validation errors are meaningful
            for error_msg in error_messages:
                assert isinstance(error_msg, str)
                assert len(error_msg) > 0
                
                # Validation should fail for missing required fields
                if auth_type == AuthenticationType.USERNAME_PASSWORD.value:
                    if 'username_field' not in auth_config or 'password_field' not in auth_config:
                        assert 'username_field' in error_msg or 'password_field' in error_msg
                
                elif auth_type == AuthenticationType.OAUTH2.value:
                    required_oauth_fields = ['client_id', 'client_secret', 'authorization_url', 'token_url']
                    missing_fields = [field for field in required_oauth_fields if field not in auth_config]
                    if missing_fields:
                        assert any(field in error_msg for field in missing_fields)
                
                elif auth_type == AuthenticationType.BEARER_TOKEN.value:
                    if 'token_field' not in auth_config:
                        assert 'token_field' in error_msg
                
                elif auth_type == AuthenticationType.BASIC_AUTH.value:
                    if 'username_field' not in auth_config or 'password_field' not in auth_config:
                        assert 'username_field' in error_msg or 'password_field' in error_msg
    
    @given(
        invalid_auth_type=st.text(min_size=1, max_size=50).filter(
            lambda x: x not in [auth_type.value for auth_type in AuthenticationType]
        ),
        auth_config=st.dictionaries(
            st.text(min_size=1, max_size=30),
            st.one_of(st.text(max_size=100), st.integers(), st.booleans()),
            min_size=0,
            max_size=5
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_invalid_auth_type_validation(self, invalid_auth_type, auth_config):
        """
        Property 8: Configuration Validation - Invalid auth types
        For any invalid authentication type, configuration validation should fail 
        with appropriate error messages.
        **Validates: Requirements 2.4, 2.5**
        """
        from app.api.integrations import IntegrationCreate
        from pydantic import ValidationError
        
        # Properties that must hold for invalid auth types
        
        # 1. Invalid auth types should cause validation errors
        with pytest.raises(ValidationError) as exc_info:
            IntegrationCreate(
                name="test_integration",
                provider="test_provider",
                auth_type=invalid_auth_type,
                auth_config=auth_config
            )
        
        # 2. Error message should be meaningful
        error_messages = [error['msg'] for error in exc_info.value.errors]
        assert len(error_messages) > 0
        
        for error_msg in error_messages:
            assert isinstance(error_msg, str)
            assert len(error_msg) > 0
            # Should mention valid auth types or indicate invalid value
            assert 'auth_type' in error_msg.lower() or 'must be one of' in error_msg.lower()
    
    @given(
        auth_type=st.sampled_from([
            AuthenticationType.USERNAME_PASSWORD.value,
            AuthenticationType.OAUTH2.value,
            AuthenticationType.BEARER_TOKEN.value,
            AuthenticationType.BASIC_AUTH.value
        ]),
        incomplete_auth_config=st.one_of(
            # Missing required fields for username/password
            st.fixed_dictionaries({
                'username_field': st.text(min_size=1, max_size=50)
                # Missing password_field
            }),
            # Missing required fields for OAuth2
            st.fixed_dictionaries({
                'client_id': st.text(min_size=1, max_size=100)
                # Missing client_secret, authorization_url, token_url
            }),
            # Missing required fields for bearer token
            st.fixed_dictionaries({
                'some_other_field': st.text(min_size=1, max_size=50)
                # Missing token_field
            }),
            # Empty config
            st.just({})
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_incomplete_auth_config_validation(self, auth_type, incomplete_auth_config):
        """
        Property 8: Configuration Validation - Incomplete configurations
        For any authentication type with incomplete configuration, validation should fail
        with specific error messages about missing required fields.
        **Validates: Requirements 2.4, 2.5**
        """
        from app.api.integrations import IntegrationCreate
        from pydantic import ValidationError
        
        # Properties that must hold for incomplete configurations
        
        # 1. Incomplete configurations should cause validation errors
        with pytest.raises(ValidationError) as exc_info:
            IntegrationCreate(
                name="test_integration",
                provider="test_provider",
                auth_type=auth_type,
                auth_config=incomplete_auth_config
            )
        
        # 2. Error messages should specify missing required fields
        error_messages = [error['msg'] for error in exc_info.value.errors]
        assert len(error_messages) > 0
        
        for error_msg in error_messages:
            assert isinstance(error_msg, str)
            assert len(error_msg) > 0
            
            # Should mention specific missing fields based on auth type
            if auth_type in [AuthenticationType.USERNAME_PASSWORD.value, AuthenticationType.BASIC_AUTH.value]:
                if 'password_field' not in incomplete_auth_config:
                    assert 'password_field' in error_msg
                if 'username_field' not in incomplete_auth_config:
                    assert 'username_field' in error_msg
            
            elif auth_type == AuthenticationType.OAUTH2.value:
                required_fields = ['client_id', 'client_secret', 'authorization_url', 'token_url']
                missing_fields = [field for field in required_fields if field not in incomplete_auth_config]
                if missing_fields:
                    assert any(field in error_msg for field in missing_fields)
            
            elif auth_type == AuthenticationType.BEARER_TOKEN.value:
                if 'token_field' not in incomplete_auth_config:
                    assert 'token_field' in error_msg
    
    @given(
        sync_interval=st.integers(max_value=0),  # Invalid sync intervals (zero or negative)
        retry_policy=st.one_of(
            # Invalid max_retries
            st.fixed_dictionaries({
                'max_retries': st.integers(max_value=-1),
                'backoff_factor': st.floats(min_value=1.0, max_value=5.0)
            }),
            # Invalid backoff_factor
            st.fixed_dictionaries({
                'max_retries': st.integers(min_value=0, max_value=10),
                'backoff_factor': st.floats(max_value=0.9)
            }),
            # Invalid types
            st.fixed_dictionaries({
                'max_retries': st.text(min_size=1, max_size=10),
                'backoff_factor': st.text(min_size=1, max_size=10)
            })
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_invalid_sync_and_retry_validation(self, sync_interval, retry_policy):
        """
        Property 8: Configuration Validation - Invalid sync and retry settings
        For any invalid sync interval or retry policy, validation should fail appropriately.
        **Validates: Requirements 2.4, 2.5**
        """
        from app.api.integrations import IntegrationCreate
        from pydantic import ValidationError
        
        # Properties that must hold for invalid sync/retry settings
        
        # 1. Invalid sync intervals should cause validation errors
        with pytest.raises(ValidationError) as exc_info:
            IntegrationCreate(
                name="test_integration",
                provider="test_provider",
                auth_type=AuthenticationType.API_KEY.value,
                auth_config={},
                sync_interval_minutes=sync_interval,
                retry_policy=retry_policy
            )
        
        # 2. Error messages should be specific about what's invalid
        error_messages = [error['msg'] for error in exc_info.value.errors]
        assert len(error_messages) > 0
        
        for error_msg in error_messages:
            assert isinstance(error_msg, str)
            assert len(error_msg) > 0
            
            # Should mention specific validation issues
            if sync_interval <= 0:
                assert 'sync_interval' in error_msg.lower() or 'greater than' in error_msg.lower()
            
            if 'max_retries' in retry_policy:
                if isinstance(retry_policy['max_retries'], int) and retry_policy['max_retries'] < 0:
                    assert 'max_retries' in error_msg or 'non-negative' in error_msg
                elif not isinstance(retry_policy['max_retries'], int):
                    assert 'max_retries' in error_msg or 'integer' in error_msg
            
            if 'backoff_factor' in retry_policy:
                if isinstance(retry_policy['backoff_factor'], (int, float)) and retry_policy['backoff_factor'] < 1:
                    assert 'backoff_factor' in error_msg or 'greater' in error_msg
                elif not isinstance(retry_policy['backoff_factor'], (int, float)):
                    assert 'backoff_factor' in error_msg or 'number' in error_msg


class TestTemplateLoadingProperties:
    """Property-based tests for integration provider template loading and population."""
    
    @given(
        provider=st.sampled_from([
            "prometheus", "grafana", "datadog", "newrelic",
            "servicenow", "jira", "zendesk",
            "jenkins", "gitlab", "github",
            "email", "slack", "teams", "webhook", "sms"
        ]),
        config_overrides=st.dictionaries(
            st.text(min_size=1, max_size=30),
            st.one_of(st.text(max_size=100), st.integers(), st.booleans()),
            min_size=0,
            max_size=5
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_template_loading_and_population(self, provider, config_overrides):
        """
        Property 9: Template Loading and Population
        For any integration provider template, the Integration_System should load the 
        appropriate template and pre-populate known configuration fields correctly.
        **Validates: Requirements 8.1, 8.2, 8.3**
        """
        from app.services.integration_templates import IntegrationTemplateManager
        
        # Properties that must hold for template loading and population
        
        # 1. Template should exist for all supported providers
        template = IntegrationTemplateManager.get_template(provider)
        assert template is not None, f"Template should exist for provider: {provider}"
        
        # 2. Template should have all required fields
        assert hasattr(template, 'name')
        assert hasattr(template, 'category')
        assert hasattr(template, 'description')
        assert hasattr(template, 'auth_type')
        assert hasattr(template, 'required_config')
        assert hasattr(template, 'required_auth')
        
        # 3. Template fields should be properly typed and non-empty
        assert isinstance(template.name, str)
        assert len(template.name) > 0
        assert isinstance(template.description, str)
        assert len(template.description) > 0
        assert isinstance(template.auth_type, str)
        assert len(template.auth_type) > 0
        assert isinstance(template.required_config, list)
        assert isinstance(template.required_auth, list)
        
        # 4. Auth type should be valid
        from app.models.integration import AuthenticationType
        valid_auth_types = [auth_type.value for auth_type in AuthenticationType]
        assert template.auth_type in valid_auth_types
        
        # 5. Template should convert to dictionary correctly
        template_dict = template.to_dict()
        assert isinstance(template_dict, dict)
        assert 'name' in template_dict
        assert 'category' in template_dict
        assert 'description' in template_dict
        assert 'auth_type' in template_dict
        assert 'required_config' in template_dict
        assert 'required_auth' in template_dict
        
        # 6. Template dictionary should match template object
        assert template_dict['name'] == template.name
        assert template_dict['category'] == template.category.value
        assert template_dict['description'] == template.description
        assert template_dict['auth_type'] == template.auth_type
        assert template_dict['required_config'] == template.required_config
        assert template_dict['required_auth'] == template.required_auth
        
        # 7. Template population should work correctly
        populated_config = IntegrationTemplateManager.populate_template_defaults(provider, config_overrides)
        assert isinstance(populated_config, dict)
        
        # 8. Populated config should include template defaults
        assert 'auth_type' in populated_config
        assert populated_config['auth_type'] == template.auth_type
        
        if template.auth_config:
            assert 'auth_config' in populated_config
            assert isinstance(populated_config['auth_config'], dict)
        
        if template.health_check_endpoint:
            assert 'health_check_url' in populated_config
            assert populated_config['health_check_url'] == template.health_check_endpoint
        
        # 9. Config overrides should be preserved
        for key, value in config_overrides.items():
            if key in populated_config:
                assert populated_config[key] == value
        
        # 10. Default sync settings should be populated
        assert 'sync_interval_minutes' in populated_config
        assert isinstance(populated_config['sync_interval_minutes'], int)
        assert populated_config['sync_interval_minutes'] > 0
        
        assert 'retry_policy' in populated_config
        assert isinstance(populated_config['retry_policy'], dict)
        assert 'max_retries' in populated_config['retry_policy']
        assert 'backoff_factor' in populated_config['retry_policy']
    
    @given(
        category=st.sampled_from(["monitoring", "ticketing", "cicd", "communication"]),
        provider_filter=st.one_of(st.none(), st.text(min_size=1, max_size=20))
    )
    @settings(max_examples=50, deadline=None)
    def test_template_category_filtering(self, category, provider_filter):
        """
        Property 9: Template Loading and Population - Category filtering
        For any category filter, the Integration_System should return only templates 
        that belong to that category.
        **Validates: Requirements 8.1, 8.2, 8.3**
        """
        from app.services.integration_templates import IntegrationTemplateManager, IntegrationCategory
        
        # Properties that must hold for category filtering
        
        # 1. Category should be valid
        try:
            cat_enum = IntegrationCategory(category)
        except ValueError:
            pytest.fail(f"Invalid category: {category}")
        
        # 2. Get templates by category
        templates_by_category = IntegrationTemplateManager.get_templates_by_category(cat_enum)
        assert isinstance(templates_by_category, dict)
        
        # 3. All returned templates should belong to the specified category
        for provider_name, template in templates_by_category.items():
            assert template.category == cat_enum
            assert template.category.value == category
        
        # 4. Category should have at least one template
        assert len(templates_by_category) > 0
        
        # 5. Provider categories should include this category
        provider_categories = IntegrationTemplateManager.get_provider_categories()
        assert isinstance(provider_categories, dict)
        assert category in provider_categories
        assert len(provider_categories[category]) > 0
        
        # 6. All providers in category should match templates by category
        category_providers = set(provider_categories[category])
        template_providers = set(templates_by_category.keys())
        assert category_providers == template_providers
    
    @given(
        provider=st.sampled_from([
            "prometheus", "grafana", "datadog", "newrelic",
            "servicenow", "jira", "zendesk",
            "jenkins", "gitlab", "github",
            "email", "slack", "teams", "webhook", "sms"
        ]),
        config_data=st.dictionaries(
            st.text(min_size=1, max_size=30),
            st.one_of(st.text(max_size=100), st.integers(), st.booleans()),
            min_size=1,
            max_size=8
        ),
        credentials_data=st.dictionaries(
            st.text(min_size=1, max_size=30),
            st.text(min_size=1, max_size=100),
            min_size=1,
            max_size=5
        )
    )
    @settings(max_examples=100, deadline=None)
    def test_template_validation_consistency(self, provider, config_data, credentials_data):
        """
        Property 9: Template Loading and Population - Validation consistency
        For any provider template and configuration data, validation should be 
        consistent and provide meaningful feedback.
        **Validates: Requirements 8.1, 8.2, 8.3**
        """
        from app.services.integration_templates import IntegrationTemplateManager
        
        # Properties that must hold for template validation
        
        # 1. Template should exist
        template = IntegrationTemplateManager.get_template(provider)
        assert template is not None
        
        # 2. Configuration validation should return structured results
        config_validation = IntegrationTemplateManager.validate_configuration(provider, config_data)
        assert isinstance(config_validation, dict)
        assert 'errors' in config_validation
        assert 'warnings' in config_validation
        assert isinstance(config_validation['errors'], list)
        assert isinstance(config_validation['warnings'], list)
        
        # 3. Credentials validation should return structured results
        cred_validation = IntegrationTemplateManager.validate_credentials(provider, credentials_data)
        assert isinstance(cred_validation, dict)
        assert 'errors' in cred_validation
        assert 'warnings' in cred_validation
        assert isinstance(cred_validation['errors'], list)
        assert isinstance(cred_validation['warnings'], list)
        
        # 4. Validation should check required fields
        for required_field in template.required_config:
            if required_field not in config_data:
                assert any(required_field in error for error in config_validation['errors'])
        
        for required_field in template.required_auth:
            if required_field not in credentials_data:
                assert any(required_field in error for error in cred_validation['errors'])
        
        # 5. If all required fields are present, validation should have fewer errors
        all_config_present = all(field in config_data for field in template.required_config)
        all_creds_present = all(field in credentials_data for field in template.required_auth)
        
        if all_config_present and all_creds_present:
            # Should have no missing field errors
            missing_config_errors = [error for error in config_validation['errors'] 
                                   if 'missing' in error.lower()]
            missing_cred_errors = [error for error in cred_validation['errors'] 
                                 if 'missing' in error.lower()]
            assert len(missing_config_errors) == 0
            assert len(missing_cred_errors) == 0
        
        # 6. Validation rules should be applied consistently
        if template.validation_rules:
            for field, rule in template.validation_rules.items():
                if field in config_data:
                    value = config_data[field]
                    
                    # Pattern validation
                    if 'pattern' in rule:
                        import re
                        if not re.match(rule['pattern'], str(value)):
                            assert any(field in error for error in config_validation['errors'])
                    
                    # Enum validation
                    if 'enum' in rule:
                        if value not in rule['enum']:
                            assert any(field in error for error in config_validation['errors'])
                
                if field in credentials_data:
                    value = credentials_data[field]
                    
                    # Pattern validation for credentials
                    if 'pattern' in rule:
                        import re
                        if not re.match(rule['pattern'], str(value)):
                            assert any(field in error for error in cred_validation['errors'])
    
    @given(
        unknown_provider=st.text(min_size=1, max_size=50).filter(
            lambda x: x not in [
                "prometheus", "grafana", "datadog", "newrelic",
                "servicenow", "jira", "zendesk",
                "jenkins", "gitlab", "github",
                "email", "slack", "teams", "webhook", "sms"
            ]
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_unknown_provider_handling(self, unknown_provider):
        """
        Property 9: Template Loading and Population - Unknown provider handling
        For any unknown provider, the Integration_System should handle gracefully 
        and return appropriate error responses.
        **Validates: Requirements 8.1, 8.2, 8.3**
        """
        from app.services.integration_templates import IntegrationTemplateManager
        
        # Properties that must hold for unknown providers
        
        # 1. Unknown provider should return None for template
        template = IntegrationTemplateManager.get_template(unknown_provider)
        assert template is None
        
        # 2. Template dict should return None for unknown provider
        template_dict = IntegrationTemplateManager.get_template_dict(unknown_provider)
        assert template_dict is None
        
        # 3. Validation should return error for unknown provider
        config_validation = IntegrationTemplateManager.validate_configuration(unknown_provider, {})
        assert isinstance(config_validation, dict)
        assert 'errors' in config_validation
        assert len(config_validation['errors']) > 0
        assert any('Unknown provider' in error for error in config_validation['errors'])
        
        cred_validation = IntegrationTemplateManager.validate_credentials(unknown_provider, {})
        assert isinstance(cred_validation, dict)
        assert 'errors' in cred_validation
        assert len(cred_validation['errors']) > 0
        assert any('Unknown provider' in error for error in cred_validation['errors'])
        
        # 4. Template population should return empty dict for unknown provider
        populated_config = IntegrationTemplateManager.populate_template_defaults(unknown_provider)
        assert isinstance(populated_config, dict)
        assert len(populated_config) == 0
    
    @given(
        providers=st.lists(
            st.sampled_from([
                "prometheus", "grafana", "datadog", "newrelic",
                "servicenow", "jira", "zendesk",
                "jenkins", "gitlab", "github",
                "email", "slack", "teams", "webhook", "sms"
            ]),
            min_size=2,
            max_size=10,
            unique=True
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_template_consistency_across_providers(self, providers):
        """
        Property 9: Template Loading and Population - Cross-provider consistency
        For any set of providers, templates should be consistent in structure 
        and provide the same interface.
        **Validates: Requirements 8.1, 8.2, 8.3**
        """
        from app.services.integration_templates import IntegrationTemplateManager
        
        templates = []
        template_dicts = []
        
        # Load all templates
        for provider in providers:
            template = IntegrationTemplateManager.get_template(provider)
            assert template is not None
            templates.append(template)
            
            template_dict = template.to_dict()
            template_dicts.append(template_dict)
        
        # Properties that must hold for template consistency
        
        # 1. All templates should have the same structure
        required_fields = ['name', 'category', 'description', 'auth_type', 
                          'required_config', 'required_auth']
        
        for template_dict in template_dicts:
            for field in required_fields:
                assert field in template_dict
        
        # 2. All templates should have consistent field types
        for template_dict in template_dicts:
            assert isinstance(template_dict['name'], str)
            assert isinstance(template_dict['category'], str)
            assert isinstance(template_dict['description'], str)
            assert isinstance(template_dict['auth_type'], str)
            assert isinstance(template_dict['required_config'], list)
            assert isinstance(template_dict['required_auth'], list)
        
        # 3. All templates should have valid auth types
        from app.models.integration import AuthenticationType
        valid_auth_types = [auth_type.value for auth_type in AuthenticationType]
        
        for template_dict in template_dicts:
            assert template_dict['auth_type'] in valid_auth_types
        
        # 4. All templates should have valid categories
        valid_categories = ['monitoring', 'ticketing', 'cicd', 'communication']
        
        for template_dict in template_dicts:
            assert template_dict['category'] in valid_categories
        
        # 5. Template population should work consistently for all providers
        for provider in providers:
            populated_config = IntegrationTemplateManager.populate_template_defaults(provider)
            assert isinstance(populated_config, dict)
            assert 'auth_type' in populated_config
            assert 'sync_interval_minutes' in populated_config
            assert 'retry_policy' in populated_config
            
            # Sync interval should be positive
            assert populated_config['sync_interval_minutes'] > 0
            
            # Retry policy should have required fields
            assert isinstance(populated_config['retry_policy'], dict)
            assert 'max_retries' in populated_config['retry_policy']
            assert 'backoff_factor' in populated_config['retry_policy']