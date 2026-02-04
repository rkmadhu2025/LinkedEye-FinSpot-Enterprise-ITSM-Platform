"""
Business services for the ITSM Platform.
"""
from app.services.email_service import EmailService, email_service
from app.services.notification_service import NotificationService, notification_service
from app.services.client_switching_service import ClientSwitchingService
from app.services.integration_service import (
    IntegrationFactory,
    BaseIntegration,
    # Monitoring
    PrometheusIntegration,
    GrafanaIntegration,
    DatadogIntegration,
    NewRelicIntegration,
    # Ticketing
    ServiceNowIntegration,
    JiraIntegration,
    ZendeskIntegration,
    # CI/CD
    JenkinsIntegration,
    GitLabCIIntegration,
    GitHubActionsIntegration,
    # Communication
    EmailIntegration,
    SlackIntegration,
    TeamsIntegration,
    WebhookIntegration,
    SMSIntegration,
)

__all__ = [
    "EmailService",
    "email_service",
    "NotificationService",
    "notification_service",
    "ClientSwitchingService",
    "IntegrationFactory",
    "BaseIntegration",
    # Monitoring
    "PrometheusIntegration",
    "GrafanaIntegration",
    "DatadogIntegration",
    "NewRelicIntegration",
    # Ticketing
    "ServiceNowIntegration",
    "JiraIntegration",
    "ZendeskIntegration",
    # CI/CD
    "JenkinsIntegration",
    "GitLabCIIntegration",
    "GitHubActionsIntegration",
    # Communication
    "EmailIntegration",
    "SlackIntegration",
    "TeamsIntegration",
    "WebhookIntegration",
    "SMSIntegration",
]
