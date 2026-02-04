"""
Hardware Integrations Module

Provides integration templates and configurations for:
- Dell iDRAC
- HP iLO
- Prometheus Node Exporter
- Prometheus Alertmanager
"""

from app.integrations.hardware_templates import (
    IntegrationType,
    IDRAC_TEMPLATE,
    ILO_TEMPLATE,
    NODE_EXPORTER_TEMPLATE,
    ALERTMANAGER_TEMPLATE,
    ALL_TEMPLATES,
    get_template,
    get_all_templates,
    get_supported_alerts,
    get_configuration_schema,
)

__all__ = [
    "IntegrationType",
    "IDRAC_TEMPLATE",
    "ILO_TEMPLATE",
    "NODE_EXPORTER_TEMPLATE",
    "ALERTMANAGER_TEMPLATE",
    "ALL_TEMPLATES",
    "get_template",
    "get_all_templates",
    "get_supported_alerts",
    "get_configuration_schema",
]
