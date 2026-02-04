"""
Email Service for sending notifications via SMTP or AWS SES.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr, make_msgid
from typing import List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class EmailResult:
    """Result of email send operation."""
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    sent_at: Optional[datetime] = None


@dataclass
class Attachment:
    """Email attachment."""
    filename: str
    content: bytes
    content_type: str = "application/octet-stream"


class EmailService:
    """
    Enterprise email service with SMTP and AWS SES support.

    Handles email sending with template rendering, attachments,
    and delivery tracking.
    """

    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.from_email = settings.smtp_from_email
        self.from_name = settings.smtp_from_name
        self.use_tls = settings.smtp_use_tls
        self.use_ssl = settings.smtp_use_ssl
        self.aws_ses_enabled = settings.aws_ses_enabled

    async def send_email(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[List[Attachment]] = None,
        priority: str = "normal",
        tracking_id: Optional[str] = None
    ) -> EmailResult:
        """
        Send an email via SMTP or AWS SES.

        Args:
            to: List of recipient email addresses
            subject: Email subject line
            html_body: HTML content of the email
            text_body: Plain text fallback content
            cc: Optional list of CC recipients
            bcc: Optional list of BCC recipients
            reply_to: Optional reply-to address
            attachments: Optional list of attachments
            priority: Email priority (low, normal, high)
            tracking_id: Optional tracking ID for logging

        Returns:
            EmailResult with success status and message ID
        """
        if self.aws_ses_enabled:
            return await self._send_via_ses(
                to, subject, html_body, text_body,
                cc, bcc, reply_to, attachments, priority
            )
        else:
            return await self._send_via_smtp(
                to, subject, html_body, text_body,
                cc, bcc, reply_to, attachments, priority
            )

    async def _send_via_smtp(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[List[Attachment]] = None,
        priority: str = "normal"
    ) -> EmailResult:
        """Send email via SMTP."""
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = formataddr((self.from_name, self.from_email))
            msg["To"] = ", ".join(to)
            msg["Message-ID"] = make_msgid(domain=self.from_email.split("@")[-1])

            if cc:
                msg["Cc"] = ", ".join(cc)
            if reply_to:
                msg["Reply-To"] = reply_to

            # Set priority headers
            if priority == "high":
                msg["X-Priority"] = "1"
                msg["X-MSMail-Priority"] = "High"
                msg["Importance"] = "High"
            elif priority == "low":
                msg["X-Priority"] = "5"
                msg["X-MSMail-Priority"] = "Low"
                msg["Importance"] = "Low"

            # Attach text and HTML parts
            text_part = MIMEText(text_body, "plain", "utf-8")
            html_part = MIMEText(html_body, "html", "utf-8")
            msg.attach(text_part)
            msg.attach(html_part)

            # Add attachments if any
            if attachments:
                for attachment in attachments:
                    from email.mime.base import MIMEBase
                    from email import encoders

                    part = MIMEBase(*attachment.content_type.split("/", 1))
                    part.set_payload(attachment.content)
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename={attachment.filename}"
                    )
                    msg.attach(part)

            # Build recipient list
            recipients = to.copy()
            if cc:
                recipients.extend(cc)
            if bcc:
                recipients.extend(bcc)

            # Send email
            if not self.smtp_user or not self.smtp_password:
                logger.warning("SMTP credentials not configured, skipping email send")
                return EmailResult(
                    success=False,
                    error="SMTP credentials not configured"
                )

            if self.use_ssl:
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port)
            else:
                server = smtplib.SMTP(self.smtp_host, self.smtp_port)
                if self.use_tls:
                    server.starttls()

            server.login(self.smtp_user, self.smtp_password)
            server.sendmail(self.from_email, recipients, msg.as_string())
            server.quit()

            logger.info(f"Email sent successfully to {to}, subject: {subject}")
            return EmailResult(
                success=True,
                message_id=msg["Message-ID"],
                sent_at=datetime.now(timezone.utc)
            )

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed: {e}")
            return EmailResult(success=False, error=f"Authentication failed: {e}")
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error sending email: {e}")
            return EmailResult(success=False, error=f"SMTP error: {e}")
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return EmailResult(success=False, error=str(e))

    async def _send_via_ses(
        self,
        to: List[str],
        subject: str,
        html_body: str,
        text_body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        reply_to: Optional[str] = None,
        attachments: Optional[List[Attachment]] = None,
        priority: str = "normal"
    ) -> EmailResult:
        """Send email via AWS SES."""
        try:
            import boto3
            from botocore.exceptions import ClientError

            client = boto3.client(
                "ses",
                region_name=settings.aws_ses_region,
                aws_access_key_id=settings.aws_ses_access_key,
                aws_secret_access_key=settings.aws_ses_secret_key
            )

            destination = {"ToAddresses": to}
            if cc:
                destination["CcAddresses"] = cc
            if bcc:
                destination["BccAddresses"] = bcc

            response = client.send_email(
                Source=formataddr((self.from_name, self.from_email)),
                Destination=destination,
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {
                        "Text": {"Data": text_body, "Charset": "UTF-8"},
                        "Html": {"Data": html_body, "Charset": "UTF-8"}
                    }
                },
                ReplyToAddresses=[reply_to] if reply_to else []
            )

            logger.info(f"Email sent via SES to {to}, MessageId: {response['MessageId']}")
            return EmailResult(
                success=True,
                message_id=response["MessageId"],
                sent_at=datetime.now(timezone.utc)
            )

        except ImportError:
            logger.error("boto3 not installed for AWS SES")
            return EmailResult(success=False, error="boto3 not installed")
        except Exception as e:
            logger.error(f"Error sending email via SES: {e}")
            return EmailResult(success=False, error=str(e))

    async def send_templated_email(
        self,
        to: List[str],
        template_name: str,
        context: dict,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        reply_to: Optional[str] = None,
        priority: str = "normal",
        subject: Optional[str] = None
    ) -> EmailResult:
        """
        Send an email using a stored template.

        Args:
            to: List of recipient email addresses
            template_name: Name of the email template
            context: Template variables for rendering
            cc: Optional CC recipients
            bcc: Optional BCC recipients
            reply_to: Optional reply-to address
            priority: Email priority
            subject: Optional subject override
        """
        from sqlalchemy.orm import Session
        from app.core.database import SessionLocal
        from app.models import EmailTemplate

        db: Session = SessionLocal()
        try:
            template = db.query(EmailTemplate).filter(
                EmailTemplate.name == template_name,
                EmailTemplate.is_active == True
            ).first()

            if not template:
                logger.error(f"Email template not found: {template_name}")
                return EmailResult(success=False, error=f"Template not found: {template_name}")

            # Ensure app_url is in context
            if "app_url" not in context:
                context["app_url"] = settings.app_url

            # Render template
            rendered_subject, html_body, text_body = template.render(context)
            
            # Use override subject if provided
            final_subject = subject if subject else rendered_subject

            return await self.send_email(
                to=to,
                subject=final_subject,
                html_body=html_body,
                text_body=text_body,
                cc=cc,
                bcc=bcc,
                reply_to=reply_to,
                priority=priority
            )

        except Exception as e:
            logger.error(f"Error rendering template {template_name}: {e}")
            return EmailResult(success=False, error=str(e))
        finally:
            db.close()

    async def render_template(
        self,
        template_name: str,
        context: dict
    ) -> Tuple[str, str, str]:
        """
        Render an email template without sending.

        Args:
            template_name: Name of the template
            context: Template variables

        Returns:
            Tuple of (subject, html_body, text_body)
        """
        from sqlalchemy.orm import Session
        from app.core.database import SessionLocal
        from app.models import EmailTemplate

        db: Session = SessionLocal()
        try:
            template = db.query(EmailTemplate).filter(
                EmailTemplate.name == template_name,
                EmailTemplate.is_active == True
            ).first()

            if not template:
                raise ValueError(f"Template not found: {template_name}")

            if "app_url" not in context:
                context["app_url"] = settings.app_url

            return template.render(context)
        finally:
            db.close()

    async def send_test_email(self, to: str) -> EmailResult:
        """Send a test email to verify configuration."""
        return await self.send_email(
            to=[to],
            subject="LinkedEye ITSM - Test Email",
            html_body="""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h1 style="color: #2563eb;">Email Configuration Test</h1>
                <p>This is a test email from LinkedEye-FinSpot ITSM Platform.</p>
                <p>If you received this email, your email configuration is working correctly.</p>
                <hr>
                <p style="color: #6b7280; font-size: 12px;">
                    Sent at: {timestamp}
                </p>
            </body>
            </html>
            """.format(timestamp=datetime.now(timezone.utc).isoformat()),
            text_body=f"Email Configuration Test\n\nThis is a test email from LinkedEye-FinSpot ITSM Platform.\n\nSent at: {datetime.now(timezone.utc).isoformat()}",
            priority="normal"
        )


# Singleton instance
email_service = EmailService()
