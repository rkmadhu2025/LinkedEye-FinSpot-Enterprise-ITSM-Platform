"""
Email Template model for customizable notification templates.
"""
from sqlalchemy import Column, String, Text, Boolean, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base import BaseModel
import enum


class TemplateCategory(str, enum.Enum):
    """Email template categories."""
    INCIDENT = "incident"
    CHANGE = "change"
    PROBLEM = "problem"
    ALERT = "alert"
    ASSET = "asset"
    SYSTEM = "system"
    CUSTOM = "custom"


class EmailTemplate(BaseModel):
    """
    Customizable email templates using Jinja2 syntax.

    Stores HTML and plain text templates for all notification types,
    with support for versioning and custom variables.
    """
    __tablename__ = "email_templates"

    # Template Identity
    name = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), default=TemplateCategory.SYSTEM.value, nullable=False, index=True)

    # Template Content (Jinja2)
    subject_template = Column(Text, nullable=False)
    html_template = Column(Text, nullable=False)
    text_template = Column(Text, nullable=False)

    # Template Variables Documentation
    variables = Column(JSONB, default=list, nullable=False)

    # Versioning
    version = Column(Integer, default=1, nullable=False)
    previous_version_id = Column(UUID(as_uuid=True), ForeignKey("email_templates.id"), nullable=True)

    # Template Settings
    is_default = Column(Boolean, default=False, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)  # Cannot be deleted

    # Preview/Test Data
    sample_data = Column(JSONB, default=dict, nullable=False)

    # Management
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    previous_version = relationship("EmailTemplate", remote_side="EmailTemplate.id", backref="newer_versions")
    created_by = relationship("User", foreign_keys=[created_by_id], backref="created_templates")
    updated_by = relationship("User", foreign_keys=[updated_by_id], backref="updated_templates")

    def __repr__(self):
        return f"<EmailTemplate(name={self.name}, category={self.category}, v{self.version})>"

    def render(self, context: dict) -> tuple:
        """
        Render the template with the given context.

        Args:
            context: Dictionary of variables to render the template with

        Returns:
            Tuple of (subject, html_body, text_body)
        """
        from jinja2 import Environment, BaseLoader, select_autoescape

        env = Environment(
            loader=BaseLoader(),
            autoescape=select_autoescape(['html', 'xml'])
        )

        # Add custom filters
        env.filters['format_datetime'] = self._format_datetime
        env.filters['format_date'] = self._format_date
        env.filters['truncate'] = self._truncate

        subject = env.from_string(self.subject_template).render(context)
        html_body = env.from_string(self.html_template).render(context)
        text_body = env.from_string(self.text_template).render(context)

        return subject, html_body, text_body

    @staticmethod
    def _format_datetime(value, format_str: str = "%Y-%m-%d %H:%M:%S %Z"):
        """Format a datetime value."""
        if value is None:
            return ""
        if isinstance(value, str):
            from datetime import datetime
            try:
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                return value
        return value.strftime(format_str)

    @staticmethod
    def _format_date(value, format_str: str = "%Y-%m-%d"):
        """Format a date value."""
        if value is None:
            return ""
        if isinstance(value, str):
            from datetime import datetime
            try:
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                return value
        return value.strftime(format_str)

    @staticmethod
    def _truncate(value, length: int = 255, end: str = "..."):
        """Truncate a string to a maximum length."""
        if value is None:
            return ""
        value = str(value)
        if len(value) <= length:
            return value
        return value[:length - len(end)] + end

    def create_new_version(self, updated_by_id=None) -> "EmailTemplate":
        """
        Create a new version of this template.

        Args:
            updated_by_id: ID of user creating the new version

        Returns:
            New EmailTemplate instance
        """
        return EmailTemplate(
            name=self.name,
            display_name=self.display_name,
            description=self.description,
            category=self.category,
            subject_template=self.subject_template,
            html_template=self.html_template,
            text_template=self.text_template,
            variables=self.variables,
            version=self.version + 1,
            previous_version_id=self.id,
            is_default=self.is_default,
            is_system=self.is_system,
            sample_data=self.sample_data,
            created_by_id=updated_by_id or self.created_by_id,
            updated_by_id=updated_by_id
        )

    def get_variable_names(self) -> list:
        """Get list of variable names from template documentation."""
        return [v.get('name') for v in self.variables if v.get('name')]

    def validate_context(self, context: dict) -> list:
        """
        Validate that all required variables are present in context.

        Args:
            context: Dictionary of variables

        Returns:
            List of missing variable names
        """
        required_vars = self.get_variable_names()
        missing = []
        for var in required_vars:
            if var not in context:
                missing.append(var)
        return missing
