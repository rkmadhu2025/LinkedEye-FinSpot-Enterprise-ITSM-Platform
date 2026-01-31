import sys
import os
import json
from datetime import datetime
import uuid

# Integration defaults (overridable via env in k8s)
PROMETHEUS_URL = os.getenv(
    "PROMETHEUS_URL",
    "http://prometheus-svc.fs-linkedeye.svc.cluster.local:9090"
)
LOKI_URL = os.getenv(
    "LOKI_URL",
    "http://loki-svc.fs-linkedeye.svc.cluster.local:3100"
)
LOKI_ORG_ID = os.getenv("LOKI_ORG_ID", "fake")
GRAFANA_URL = os.getenv(
    "GRAFANA_URL",
    "http://grafana-svc.fs-linkedeye.svc.cluster.local:3000"
)
GRAFANA_USERNAME = os.getenv("GRAFANA_USERNAME", "admin")
# Passwords must be provided via environment in production; do NOT commit plaintext defaults.
GRAFANA_PASSWORD = os.getenv("GRAFANA_PASSWORD")
STACKSTORM_URL = os.getenv("STACKSTORM_URL", "https://fs-le-dev-stackstorm.finspot.in")
STACKSTORM_USERNAME = os.getenv("STACKSTORM_USERNAME", "st2admin")
STACKSTORM_PASSWORD = os.getenv("STACKSTORM_PASSWORD")

# Add app to path
try:
    sys.path.append('/app')
    from app.core.database import SessionLocal
    from app.models.integration import Integration, IntegrationType, IntegrationStatus, AuthenticationType
except ImportError:
    # Local dev fallback if needed
    sys.path.append(os.getcwd())
    try:
        from app.core.database import SessionLocal
        from app.models.integration import Integration, IntegrationType, IntegrationStatus, AuthenticationType
    except ImportError:
        # If still failing, check subdirectories
        sys.path.append(os.path.join(os.getcwd(), 'linkedeye-itsm-platform-backend'))
        from app.core.database import SessionLocal
        from app.models.integration import Integration, IntegrationType, IntegrationStatus, AuthenticationType

def seed_integrations():
    print("Starting integration seeding...")
    try:
        db = SessionLocal()
    except Exception as e:
        print(f"Failed to connect to database: {e}")
        return

    # 1. Prometheus
    if not db.query(Integration).filter(Integration.provider == 'prometheus').first():
        print("Creating Prometheus integration...")
        prometheus = Integration(
            name="Prometheus",
            integration_type=IntegrationType.MONITORING,
            provider="prometheus",
            status=IntegrationStatus.ACTIVE,
            auth_type=AuthenticationType.CUSTOM,
            configuration={
                "url": PROMETHEUS_URL,
            },
            sync_interval_minutes=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Internal Prometheus server"}
        )
        db.add(prometheus)
    else:
        print("Prometheus integration already exists.")

    # 2. Loki
    if not db.query(Integration).filter(Integration.provider == 'loki').first():
        print("Creating Loki integration...")
        loki = Integration(
            name="Loki",
            integration_type=IntegrationType.MONITORING,
            provider="loki",
            status=IntegrationStatus.ACTIVE,
            auth_type=AuthenticationType.CUSTOM,
            configuration={
                "url": LOKI_URL,
                "org_id": LOKI_ORG_ID
            },
            sync_interval_minutes=1,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Internal Loki server"}
        )
        db.add(loki)
    else:
        print("Loki integration already exists.")

    # 3. Grafana
    if not db.query(Integration).filter(Integration.provider == 'grafana').first():
        print("Creating Grafana integration...")
        grafana = Integration(
            name="Grafana",
            integration_type=IntegrationType.MONITORING,
            provider="grafana",
            status=IntegrationStatus.ACTIVE,
            auth_type=AuthenticationType.BASIC_AUTH,
            configuration={
                "url": GRAFANA_URL
            },
            credentials={
                "username": GRAFANA_USERNAME,
                "password": GRAFANA_PASSWORD
            },
            sync_interval_minutes=60,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Internal Grafana dashboard"}
        )
        db.add(grafana)
    else:
        print("Grafana integration already exists.")

    # 4. Kubernetes
    if not db.query(Integration).filter(Integration.provider == 'kubernetes').first():
        print("Creating Kubernetes integration...")
        
        # Read token if available
        token = ""
        try:
            if os.path.exists("/var/run/secrets/kubernetes.io/serviceaccount/token"):
                with open("/var/run/secrets/kubernetes.io/serviceaccount/token", "r") as f:
                    token = f.read().strip()
                print("Found service account token.")
            else:
                print("Warning: Service account token file not found.")
        except Exception as e:
            print(f"Warning: Could not read service account token: {e}")

        kubernetes = Integration(
            name="Kubernetes Cluster",
            integration_type=IntegrationType.CLOUD,
            provider="kubernetes",
            status=IntegrationStatus.ACTIVE,
            auth_type=AuthenticationType.BEARER_TOKEN,
            configuration={
                "url": "https://kubernetes.default.svc:443"
            },
            credentials={
                "token": token
            },
            sync_interval_minutes=5,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Local Kubernetes Cluster"}
        )
        db.add(kubernetes)
    else:
        print("Kubernetes integration already exists.")

    # 5. StackStorm
    stackstorm_existing = db.query(Integration).filter(Integration.provider == 'stackstorm').first()
    if not stackstorm_existing:
        print("Creating StackStorm integration...")
        stackstorm = Integration(
            name="StackStorm",
            integration_type=IntegrationType.MONITORING,
            provider="stackstorm",
            status=IntegrationStatus.ACTIVE,
            auth_type=AuthenticationType.USERNAME_PASSWORD,
            configuration={
                "url": STACKSTORM_URL,
            },
            credentials={
                "username": STACKSTORM_USERNAME,
                "password": STACKSTORM_PASSWORD
            },
            sync_interval_minutes=5,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Event-driven automation platform"}
        )
        db.add(stackstorm)
    else:
        print("Updating existing StackStorm integration with new credentials...")
        stackstorm_existing.configuration = {
            "url": STACKSTORM_URL,
        }
        stackstorm_existing.credentials = {
            "username": STACKSTORM_USERNAME,
            "password": STACKSTORM_PASSWORD
        }
        stackstorm_existing.auth_type = AuthenticationType.USERNAME_PASSWORD
        stackstorm_existing.updated_at = datetime.utcnow()
        print("StackStorm integration updated.")

    # 6. Microsoft Teams
    teams_existing = db.query(Integration).filter(Integration.provider == 'teams').first()
    if not teams_existing:
        print("Creating Microsoft Teams integration...")
        teams = Integration(
            name="Microsoft Teams",
            integration_type=IntegrationType.NOTIFICATION,
            provider="teams",
            status=IntegrationStatus.ACTIVE,
            auth_type=AuthenticationType.API_KEY,
            configuration={
                "webhook_url": os.getenv("TEAMS_WEBHOOK_URL", ""),  # Set via environment variable
            },
            credentials={},
            sync_interval_minutes=0,  # Webhook doesn't need sync
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Microsoft Teams notifications via webhook"}
        )
        db.add(teams)
    else:
        print("Microsoft Teams integration already exists.")

    # 7. Slack
    if not db.query(Integration).filter(Integration.provider == 'slack').first():
        print("Creating Slack integration...")
        slack = Integration(
            name="Slack",
            integration_type=IntegrationType.NOTIFICATION,
            provider="slack",
            status=IntegrationStatus.ACTIVE,
            auth_type=AuthenticationType.BEARER_TOKEN,
            configuration={},
            credentials={
                "bot_token": os.getenv("SLACK_BOT_TOKEN", ""),  # Set via environment variable
            },
            sync_interval_minutes=60,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Slack team messaging and collaboration"}
        )
        db.add(slack)
    else:
        print("Slack integration already exists.")

    # 8. Jira
    if not db.query(Integration).filter(Integration.provider == 'jira').first():
        print("Creating Jira integration...")
        jira = Integration(
            name="Jira",
            integration_type=IntegrationType.TICKETING,
            provider="jira",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.BASIC_AUTH,
            configuration={
                "domain": os.getenv("JIRA_DOMAIN", ""),
                "project": os.getenv("JIRA_PROJECT", ""),
            },
            credentials={
                "email": os.getenv("JIRA_EMAIL", ""),
                "api_token": os.getenv("JIRA_API_TOKEN", ""),
            },
            sync_interval_minutes=30,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Jira project tracking and issue management"}
        )
        db.add(jira)
    else:
        print("Jira integration already exists.")

    # 9. ServiceNow
    if not db.query(Integration).filter(Integration.provider == 'servicenow').first():
        print("Creating ServiceNow integration...")
        servicenow = Integration(
            name="ServiceNow",
            integration_type=IntegrationType.TICKETING,
            provider="servicenow",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.USERNAME_PASSWORD,
            configuration={
                "instance": os.getenv("SERVICENOW_INSTANCE", ""),
            },
            credentials={
                "username": os.getenv("SERVICENOW_USERNAME", ""),
                "password": os.getenv("SERVICENOW_PASSWORD", ""),
            },
            sync_interval_minutes=30,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "ServiceNow enterprise IT service management"}
        )
        db.add(servicenow)
    else:
        print("ServiceNow integration already exists.")

    # 10. Zendesk
    if not db.query(Integration).filter(Integration.provider == 'zendesk').first():
        print("Creating Zendesk integration...")
        zendesk = Integration(
            name="Zendesk",
            integration_type=IntegrationType.TICKETING,
            provider="zendesk",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.BASIC_AUTH,
            configuration={
                "subdomain": os.getenv("ZENDESK_SUBDOMAIN", ""),
            },
            credentials={
                "email": os.getenv("ZENDESK_EMAIL", ""),
                "api_token": os.getenv("ZENDESK_API_TOKEN", ""),
            },
            sync_interval_minutes=30,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Zendesk customer service platform"}
        )
        db.add(zendesk)
    else:
        print("Zendesk integration already exists.")

    # 11. Jenkins
    if not db.query(Integration).filter(Integration.provider == 'jenkins').first():
        print("Creating Jenkins integration...")
        jenkins = Integration(
            name="Jenkins",
            integration_type=IntegrationType.CICD,
            provider="jenkins",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.BASIC_AUTH,
            configuration={
                "url": os.getenv("JENKINS_URL", ""),
            },
            credentials={
                "username": os.getenv("JENKINS_USERNAME", ""),
                "api_token": os.getenv("JENKINS_API_TOKEN", ""),
            },
            sync_interval_minutes=15,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Jenkins CI/CD automation server"}
        )
        db.add(jenkins)
    else:
        print("Jenkins integration already exists.")

    # 12. GitLab CI
    if not db.query(Integration).filter(Integration.provider == 'gitlab').first():
        print("Creating GitLab CI integration...")
        gitlab = Integration(
            name="GitLab CI",
            integration_type=IntegrationType.CICD,
            provider="gitlab",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.BEARER_TOKEN,
            configuration={
                "url": os.getenv("GITLAB_URL", "https://gitlab.com"),
                "project_id": os.getenv("GITLAB_PROJECT_ID", ""),
            },
            credentials={
                "access_token": os.getenv("GITLAB_ACCESS_TOKEN", ""),
            },
            sync_interval_minutes=15,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "GitLab CI/CD pipelines"}
        )
        db.add(gitlab)
    else:
        print("GitLab CI integration already exists.")

    # 13. GitHub Actions
    if not db.query(Integration).filter(Integration.provider == 'github').first():
        print("Creating GitHub Actions integration...")
        github = Integration(
            name="GitHub Actions",
            integration_type=IntegrationType.CICD,
            provider="github",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.BEARER_TOKEN,
            configuration={
                "owner": os.getenv("GITHUB_OWNER", ""),
                "repo": os.getenv("GITHUB_REPO", ""),
            },
            credentials={
                "access_token": os.getenv("GITHUB_ACCESS_TOKEN", ""),
            },
            sync_interval_minutes=15,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "GitHub CI/CD workflows"}
        )
        db.add(github)
    else:
        print("GitHub Actions integration already exists.")

    # 14. Email (SMTP)
    if not db.query(Integration).filter(Integration.provider == 'email').first():
        print("Creating Email (SMTP) integration...")
        email = Integration(
            name="Email (SMTP)",
            integration_type=IntegrationType.NOTIFICATION,
            provider="email",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.USERNAME_PASSWORD,
            configuration={
                "smtp_host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
                "smtp_port": int(os.getenv("SMTP_PORT", "587")),
                "from_email": os.getenv("SMTP_FROM_EMAIL", ""),
            },
            credentials={
                "username": os.getenv("SMTP_USERNAME", ""),
                "password": os.getenv("SMTP_PASSWORD", ""),
            },
            sync_interval_minutes=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Email notifications via SMTP"}
        )
        db.add(email)
    else:
        print("Email (SMTP) integration already exists.")

    # 15. SMS (Twilio)
    if not db.query(Integration).filter(Integration.provider == 'sms').first():
        print("Creating SMS (Twilio) integration...")
        sms = Integration(
            name="SMS (Twilio)",
            integration_type=IntegrationType.NOTIFICATION,
            provider="sms",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.BASIC_AUTH,
            configuration={
                "from_number": os.getenv("TWILIO_FROM_NUMBER", ""),
            },
            credentials={
                "account_sid": os.getenv("TWILIO_ACCOUNT_SID", ""),
                "auth_token": os.getenv("TWILIO_AUTH_TOKEN", ""),
            },
            sync_interval_minutes=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "SMS notifications via Twilio"}
        )
        db.add(sms)
    else:
        print("SMS (Twilio) integration already exists.")

    # 16. Datadog
    if not db.query(Integration).filter(Integration.provider == 'datadog').first():
        print("Creating Datadog integration...")
        datadog = Integration(
            name="Datadog",
            integration_type=IntegrationType.MONITORING,
            provider="datadog",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.API_KEY,
            configuration={
                "site": os.getenv("DATADOG_SITE", "datadoghq.com"),
            },
            credentials={
                "api_key": os.getenv("DATADOG_API_KEY", ""),
                "app_key": os.getenv("DATADOG_APP_KEY", ""),
            },
            sync_interval_minutes=5,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Datadog cloud monitoring and security platform"}
        )
        db.add(datadog)
    else:
        print("Datadog integration already exists.")

    # 17. New Relic
    if not db.query(Integration).filter(Integration.provider == 'newrelic').first():
        print("Creating New Relic integration...")
        newrelic = Integration(
            name="New Relic",
            integration_type=IntegrationType.MONITORING,
            provider="newrelic",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.API_KEY,
            configuration={},
            credentials={
                "api_key": os.getenv("NEWRELIC_API_KEY", ""),
            },
            sync_interval_minutes=5,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "New Relic application performance monitoring"}
        )
        db.add(newrelic)
    else:
        print("New Relic integration already exists.")

    # 18. Webhook (Generic)
    if not db.query(Integration).filter(Integration.provider == 'webhook').first():
        print("Creating Webhook integration...")
        webhook = Integration(
            name="Webhook",
            integration_type=IntegrationType.NOTIFICATION,
            provider="webhook",
            status=IntegrationStatus.INACTIVE,  # Inactive until configured
            auth_type=AuthenticationType.CUSTOM,
            configuration={
                "url": os.getenv("WEBHOOK_URL", ""),
                "method": os.getenv("WEBHOOK_METHOD", "POST"),
            },
            credentials={},
            sync_interval_minutes=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            meta_data={"description": "Generic HTTP webhook integration"}
        )
        db.add(webhook)
    else:
        print("Webhook integration already exists.")
    
    try:
        db.commit()
        print("\n✅ All integrations seeded successfully!")
        print("\n📋 Summary:")
        print("   - Active integrations: Prometheus, Loki, Grafana, Kubernetes, StackStorm, Teams, Slack")
        print("   - Inactive integrations (require configuration): Jira, ServiceNow, Zendesk, Jenkins, GitLab, GitHub, Email, SMS, Datadog, New Relic, Webhook")
        print("\n💡 Note: Inactive integrations need credentials to be configured via the UI or environment variables.")
    except Exception as e:
        print(f"Error committing integrations: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_integrations()
