"""
Unit tests for Integration Service Factory.
Tests service creation for each authentication type and authentication header generation.
"""
import pytest
from unittest.mock import Mock, patch
from app.services.integration_service import IntegrationFactory, EnhancedBaseIntegration
from app.models.integration import AuthenticationType


class TestIntegrationFactory:
    """Test cases for IntegrationFactory."""

    def test_get_available_integrations(self):
        """Test that available integrations are returned correctly."""
        integrations = IntegrationFactory.get_available_integrations()
        
        assert isinstance(integrations, dict)
        assert "monitoring" in integrations
        assert "ticketing" in integrations
        assert "cicd" in integrations
        assert "communication" in integrations
        
        # Check specific providers
        assert "prometheus" in integrations["monitoring"]
        assert "servicenow" in integrations["ticketing"]
        assert "jenkins" in integrations["cicd"]
        assert "slack" in integrations["communication"]

    def test_get_integration_valid_provider(self):
        """Test getting integration with valid provider."""
        config = {"url": "http://localhost:9090"}
        credentials = {"api_key": "test-key"}
        
        integration = IntegrationFactory.get_integration("prometheus", config, credentials)
        
        assert integration is not None
        assert integration.config == config
        assert integration.credentials == credentials

    def test_get_integration_invalid_provider(self):
        """Test getting integration with invalid provider."""
        config = {"url": "http://localhost:9090"}
        credentials = {"api_key": "test-key"}
        
        integration = IntegrationFactory.get_integration("invalid_provider", config, credentials)
        
        assert integration is None

    def test_create_integration_service_valid_provider(self):
        """Test creating integration service with valid provider."""
        config = {"url": "http://localhost:9090"}
        auth_config = {"test_url": "http://localhost:9090/api/v1/status"}
        credentials = {"api_key": "test-key"}
        
        service = IntegrationFactory.create_integration_service(
            provider="prometheus",
            config=config,
            auth_type=AuthenticationType.API_KEY.value,
            auth_config=auth_config,
            credentials=credentials
        )
        
        assert service is not None
        assert isinstance(service, EnhancedBaseIntegration)
        assert service.auth_type == AuthenticationType.API_KEY.value
        assert service.auth_config == auth_config
        assert service.enhanced_credentials == credentials

    def test_create_integration_service_invalid_provider(self):
        """Test creating integration service with invalid provider."""
        config = {"url": "http://localhost:9090"}
        auth_config = {"test_url": "http://localhost:9090/api/v1/status"}
        credentials = {"api_key": "test-key"}
        
        service = IntegrationFactory.create_integration_service(
            provider="invalid_provider",
            config=config,
            auth_type=AuthenticationType.API_KEY.value,
            auth_config=auth_config,
            credentials=credentials
        )
        
        assert service is None

    def test_get_auth_headers_api_key(self):
        """Test authentication header generation for API key."""
        auth_config = {"api_key_header": "X-API-Key"}
        credentials = {"api_key": "test-api-key"}
        
        headers = IntegrationFactory.get_auth_headers(
            AuthenticationType.API_KEY.value,
            auth_config,
            credentials
        )
        
        assert "X-API-Key" in headers
        assert headers["X-API-Key"] == "test-api-key"
        assert headers["Content-Type"] == "application/json"
        assert headers["Accept"] == "application/json"

    def test_get_auth_headers_bearer_token(self):
        """Test authentication header generation for bearer token."""
        auth_config = {}
        credentials = {"token": "test-bearer-token"}
        
        headers = IntegrationFactory.get_auth_headers(
            AuthenticationType.BEARER_TOKEN.value,
            auth_config,
            credentials
        )
        
        assert "Authorization" in headers
        assert headers["Authorization"] == "Bearer test-bearer-token"

    def test_get_auth_headers_basic_auth(self):
        """Test authentication header generation for basic auth."""
        auth_config = {}
        credentials = {"username": "testuser", "password": "testpass"}
        
        headers = IntegrationFactory.get_auth_headers(
            AuthenticationType.BASIC_AUTH.value,
            auth_config,
            credentials
        )
        
        assert "Authorization" in headers
        assert headers["Authorization"].startswith("Basic ")

    def test_get_auth_headers_username_password(self):
        """Test authentication header generation for username/password (uses basic auth)."""
        auth_config = {}
        credentials = {"username": "testuser", "password": "testpass"}
        
        headers = IntegrationFactory.get_auth_headers(
            AuthenticationType.USERNAME_PASSWORD.value,
            auth_config,
            credentials
        )
        
        assert "Authorization" in headers
        assert headers["Authorization"].startswith("Basic ")

    def test_get_auth_headers_oauth2(self):
        """Test authentication header generation for OAuth2."""
        auth_config = {}
        credentials = {"access_token": "test-access-token"}
        
        headers = IntegrationFactory.get_auth_headers(
            AuthenticationType.OAUTH2.value,
            auth_config,
            credentials
        )
        
        assert "Authorization" in headers
        assert headers["Authorization"] == "Bearer test-access-token"

    def test_get_auth_headers_custom(self):
        """Test authentication header generation for custom auth."""
        auth_config = {
            "headers": {
                "X-Custom-Auth": "{api_key}",
                "X-Custom-User": "{username}"
            }
        }
        credentials = {"api_key": "custom-key", "username": "custom-user"}
        
        headers = IntegrationFactory.get_auth_headers(
            AuthenticationType.CUSTOM.value,
            auth_config,
            credentials
        )
        
        assert "X-Custom-Auth" in headers
        assert headers["X-Custom-Auth"] == "custom-key"
        assert "X-Custom-User" in headers
        assert headers["X-Custom-User"] == "custom-user"

    def test_supports_oauth2_flow(self):
        """Test OAuth2 flow support detection."""
        # Providers that support OAuth2
        assert IntegrationFactory.supports_oauth2_flow("jira") is True
        assert IntegrationFactory.supports_oauth2_flow("github") is True
        assert IntegrationFactory.supports_oauth2_flow("gitlab") is True
        assert IntegrationFactory.supports_oauth2_flow("slack") is True
        assert IntegrationFactory.supports_oauth2_flow("teams") is True
        
        # Providers that don't support OAuth2
        assert IntegrationFactory.supports_oauth2_flow("prometheus") is False
        assert IntegrationFactory.supports_oauth2_flow("email") is False
        assert IntegrationFactory.supports_oauth2_flow("webhook") is False

    def test_case_insensitive_provider_lookup(self):
        """Test that provider lookup is case insensitive."""
        config = {"url": "http://localhost:9090"}
        credentials = {"api_key": "test-key"}
        
        # Test different cases
        integration1 = IntegrationFactory.get_integration("PROMETHEUS", config, credentials)
        integration2 = IntegrationFactory.get_integration("Prometheus", config, credentials)
        integration3 = IntegrationFactory.get_integration("prometheus", config, credentials)
        
        assert integration1 is not None
        assert integration2 is not None
        assert integration3 is not None
        assert type(integration1) == type(integration2) == type(integration3)


class TestEnhancedBaseIntegration:
    """Test cases for EnhancedBaseIntegration."""

    def test_enhanced_integration_initialization(self):
        """Test enhanced integration initialization."""
        from app.services.integration_service import PrometheusIntegration
        
        config = {"url": "http://localhost:9090"}
        auth_config = {"test_url": "http://localhost:9090/api/v1/status"}
        credentials = {"api_key": "test-key"}
        
        enhanced = EnhancedBaseIntegration(
            base_integration_class=PrometheusIntegration,
            config=config,
            auth_type=AuthenticationType.API_KEY.value,
            auth_config=auth_config,
            credentials=credentials
        )
        
        assert enhanced.auth_type == AuthenticationType.API_KEY.value
        assert enhanced.auth_config == auth_config
        assert enhanced.enhanced_credentials == credentials
        assert enhanced.base_integration is not None

    def test_enhanced_headers_generation(self):
        """Test enhanced headers generation."""
        from app.services.integration_service import PrometheusIntegration
        
        config = {"url": "http://localhost:9090"}
        auth_config = {"api_key_header": "X-API-Key"}
        credentials = {"api_key": "test-key"}
        
        enhanced = EnhancedBaseIntegration(
            base_integration_class=PrometheusIntegration,
            config=config,
            auth_type=AuthenticationType.API_KEY.value,
            auth_config=auth_config,
            credentials=credentials
        )
        
        headers = enhanced._get_enhanced_headers()
        
        assert "X-API-Key" in headers
        assert headers["X-API-Key"] == "test-key"
        assert headers["Content-Type"] == "application/json"

    def test_oauth2_flow_handling(self):
        """Test OAuth2 flow handling."""
        from app.services.integration_service import JiraIntegration
        
        config = {"domain": "test.atlassian.net"}
        auth_config = {
            "authorization_url": "https://auth.atlassian.com/authorize",
            "token_url": "https://auth.atlassian.com/oauth/token",
            "redirect_uri": "https://app.example.com/callback",
            "scope": "read:jira-user"
        }
        credentials = {
            "client_id": "test-client-id",
            "client_secret": "test-client-secret"
        }
        
        enhanced = EnhancedBaseIntegration(
            base_integration_class=JiraIntegration,
            config=config,
            auth_type=AuthenticationType.OAUTH2.value,
            auth_config=auth_config,
            credentials=credentials
        )
        
        result = enhanced._handle_oauth2_flow()
        
        assert result["success"] is True
        assert "authorization_url" in result
        assert "client_id=test-client-id" in result["authorization_url"]
        assert "scope=read:jira-user" in result["authorization_url"]

    def test_oauth2_flow_missing_config(self):
        """Test OAuth2 flow with missing configuration."""
        from app.services.integration_service import JiraIntegration
        
        config = {"domain": "test.atlassian.net"}
        auth_config = {}  # Missing OAuth config
        credentials = {"client_id": "test-client-id"}
        
        enhanced = EnhancedBaseIntegration(
            base_integration_class=JiraIntegration,
            config=config,
            auth_type=AuthenticationType.OAUTH2.value,
            auth_config=auth_config,
            credentials=credentials
        )
        
        result = enhanced._handle_oauth2_flow()
        
        assert result["success"] is False
        assert "Missing required OAuth 2.0 configuration" in result["message"]

    @pytest.mark.asyncio
    async def test_oauth_code_exchange_success(self):
        """Test successful OAuth code exchange."""
        from app.services.integration_service import JiraIntegration
        
        config = {"domain": "test.atlassian.net"}
        auth_config = {
            "token_url": "https://auth.atlassian.com/oauth/token",
            "redirect_uri": "https://app.example.com/callback"
        }
        credentials = {
            "client_id": "test-client-id",
            "client_secret": "test-client-secret"
        }
        
        enhanced = EnhancedBaseIntegration(
            base_integration_class=JiraIntegration,
            config=config,
            auth_type=AuthenticationType.OAUTH2.value,
            auth_config=auth_config,
            credentials=credentials
        )
        
        # Mock the HTTP response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "test-access-token",
            "refresh_token": "test-refresh-token",
            "token_type": "Bearer"
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            result = await enhanced.exchange_oauth_code("test-auth-code")
            
            assert result["success"] is True
            assert result["access_token"] == "test-access-token"
            assert enhanced.enhanced_credentials["access_token"] == "test-access-token"
            assert enhanced.enhanced_credentials["refresh_token"] == "test-refresh-token"

    @pytest.mark.asyncio
    async def test_oauth_code_exchange_failure(self):
        """Test failed OAuth code exchange."""
        from app.services.integration_service import JiraIntegration
        
        config = {"domain": "test.atlassian.net"}
        auth_config = {
            "token_url": "https://auth.atlassian.com/oauth/token",
            "redirect_uri": "https://app.example.com/callback"
        }
        credentials = {
            "client_id": "test-client-id",
            "client_secret": "test-client-secret"
        }
        
        enhanced = EnhancedBaseIntegration(
            base_integration_class=JiraIntegration,
            config=config,
            auth_type=AuthenticationType.OAUTH2.value,
            auth_config=auth_config,
            credentials=credentials
        )
        
        # Mock failed HTTP response
        mock_response = Mock()
        mock_response.status_code = 400
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post.return_value = mock_response
            
            result = await enhanced.exchange_oauth_code("invalid-auth-code")
            
            assert result["success"] is False
            assert "Token exchange failed" in result["message"]

    def test_attribute_delegation(self):
        """Test that attributes are properly delegated to base integration."""
        from app.services.integration_service import PrometheusIntegration
        
        config = {"url": "http://localhost:9090"}
        auth_config = {}
        credentials = {"api_key": "test-key"}
        
        enhanced = EnhancedBaseIntegration(
            base_integration_class=PrometheusIntegration,
            config=config,
            auth_type=AuthenticationType.API_KEY.value,
            auth_config=auth_config,
            credentials=credentials
        )
        
        # Test that we can access base integration attributes
        assert enhanced.config == config
        assert enhanced.credentials == credentials
        assert enhanced.timeout == config.get("timeout", 30)