"""
Hardware Integration Templates for iDRAC, iLO, and Node Exporter.

Provides pre-configured templates for common hardware monitoring integrations.
"""
from typing import Dict, Any, List
from enum import Enum


class IntegrationType(str, Enum):
    IDRAC = "idrac"
    ILO = "ilo"
    NODE_EXPORTER = "node_exporter"
    PROMETHEUS = "prometheus"
    ALERTMANAGER = "alertmanager"


# =============================================================================
# iDRAC (Dell) Integration Template
# =============================================================================

IDRAC_TEMPLATE: Dict[str, Any] = {
    "name": "Dell iDRAC Integration",
    "type": IntegrationType.IDRAC.value,
    "description": "Monitor Dell PowerEdge servers via iDRAC (Integrated Dell Remote Access Controller)",
    "provider": "dell",
    "icon": "server",
    "category": "hardware",
    "configuration_schema": {
        "type": "object",
        "required": ["host", "port"],
        "properties": {
            "host": {
                "type": "string",
                "title": "iDRAC Host/IP",
                "description": "IP address or hostname of the iDRAC interface",
            },
            "port": {
                "type": "integer",
                "title": "Port",
                "default": 443,
                "description": "HTTPS port (default: 443)",
            },
            "username": {
                "type": "string",
                "title": "Username",
                "description": "iDRAC admin username",
            },
            "password": {
                "type": "string",
                "title": "Password",
                "format": "password",
                "description": "iDRAC admin password",
            },
            "verify_ssl": {
                "type": "boolean",
                "title": "Verify SSL",
                "default": False,
                "description": "Verify SSL certificate",
            },
            "poll_interval_seconds": {
                "type": "integer",
                "title": "Poll Interval (seconds)",
                "default": 60,
                "minimum": 30,
                "maximum": 3600,
            },
            "snmp_enabled": {
                "type": "boolean",
                "title": "Enable SNMP",
                "default": False,
                "description": "Enable SNMP trap receiver",
            },
            "snmp_community": {
                "type": "string",
                "title": "SNMP Community",
                "default": "public",
            },
            "redfish_enabled": {
                "type": "boolean",
                "title": "Enable Redfish API",
                "default": True,
                "description": "Use Redfish API for data collection",
            },
        },
    },
    "supported_alerts": [
        "iDRACPowerSupplyFailure",
        "iDRACPowerRedundancyLost",
        "iDRACFanFailure",
        "iDRACTemperatureCritical",
        "iDRACTemperatureWarning",
        "iDRACCPUFailure",
        "iDRACMemoryFailure",
        "iDRACMemoryCorrectableError",
        "iDRACDiskFailure",
        "iDRACRAIDDegraded",
        "iDRACRAIDFailed",
        "iDRACHardwareFault",
        "iDRACSystemRebooted",
        "iDRACSystemDown",
    ],
    "metrics_collected": [
        {"name": "system_power_state", "type": "gauge", "unit": "state"},
        {"name": "inlet_temperature_celsius", "type": "gauge", "unit": "celsius"},
        {"name": "cpu_temperature_celsius", "type": "gauge", "unit": "celsius"},
        {"name": "fan_speed_rpm", "type": "gauge", "unit": "rpm"},
        {"name": "power_consumption_watts", "type": "gauge", "unit": "watts"},
        {"name": "memory_usage_percent", "type": "gauge", "unit": "percent"},
        {"name": "disk_status", "type": "gauge", "unit": "state"},
        {"name": "raid_status", "type": "gauge", "unit": "state"},
        {"name": "psu_status", "type": "gauge", "unit": "state"},
    ],
    "default_thresholds": {
        "temperature_warning_celsius": 70,
        "temperature_critical_celsius": 85,
        "fan_speed_min_rpm": 1000,
        "power_consumption_max_watts": 800,
    },
}


# =============================================================================
# iLO (HP) Integration Template
# =============================================================================

ILO_TEMPLATE: Dict[str, Any] = {
    "name": "HP iLO Integration",
    "type": IntegrationType.ILO.value,
    "description": "Monitor HP ProLiant servers via iLO (Integrated Lights-Out)",
    "provider": "hp",
    "icon": "server",
    "category": "hardware",
    "configuration_schema": {
        "type": "object",
        "required": ["host", "port"],
        "properties": {
            "host": {
                "type": "string",
                "title": "iLO Host/IP",
                "description": "IP address or hostname of the iLO interface",
            },
            "port": {
                "type": "integer",
                "title": "Port",
                "default": 443,
                "description": "HTTPS port (default: 443)",
            },
            "username": {
                "type": "string",
                "title": "Username",
                "description": "iLO admin username",
            },
            "password": {
                "type": "string",
                "title": "Password",
                "format": "password",
                "description": "iLO admin password",
            },
            "verify_ssl": {
                "type": "boolean",
                "title": "Verify SSL",
                "default": False,
            },
            "poll_interval_seconds": {
                "type": "integer",
                "title": "Poll Interval (seconds)",
                "default": 60,
                "minimum": 30,
                "maximum": 3600,
            },
            "snmp_enabled": {
                "type": "boolean",
                "title": "Enable SNMP",
                "default": False,
            },
            "redfish_enabled": {
                "type": "boolean",
                "title": "Enable Redfish API",
                "default": True,
            },
            "ilo_version": {
                "type": "string",
                "title": "iLO Version",
                "enum": ["ilo4", "ilo5", "ilo6"],
                "default": "ilo5",
            },
        },
    },
    "supported_alerts": [
        "iLOPowerSupplyFailure",
        "iLOPowerRedundancyLost",
        "iLOFanFailure",
        "iLOTemperatureCritical",
        "iLOTemperatureWarning",
        "iLOCPUFailure",
        "iLOMemoryFailure",
        "iLODiskFailure",
        "iLORAIDDegraded",
        "iLORAIDFailed",
        "iLOHardwareFault",
        "iLOSystemRebooted",
        "iLOSystemDown",
    ],
    "metrics_collected": [
        {"name": "system_health", "type": "gauge", "unit": "state"},
        {"name": "ambient_temperature_celsius", "type": "gauge", "unit": "celsius"},
        {"name": "cpu_temperature_celsius", "type": "gauge", "unit": "celsius"},
        {"name": "fan_speed_percent", "type": "gauge", "unit": "percent"},
        {"name": "power_consumption_watts", "type": "gauge", "unit": "watts"},
        {"name": "memory_status", "type": "gauge", "unit": "state"},
        {"name": "storage_status", "type": "gauge", "unit": "state"},
        {"name": "network_status", "type": "gauge", "unit": "state"},
    ],
    "default_thresholds": {
        "temperature_warning_celsius": 70,
        "temperature_critical_celsius": 85,
        "fan_speed_min_percent": 20,
    },
}


# =============================================================================
# Node Exporter Integration Template
# =============================================================================

NODE_EXPORTER_TEMPLATE: Dict[str, Any] = {
    "name": "Prometheus Node Exporter",
    "type": IntegrationType.NODE_EXPORTER.value,
    "description": "Monitor Linux/Unix servers via Prometheus Node Exporter",
    "provider": "prometheus",
    "icon": "activity",
    "category": "monitoring",
    "configuration_schema": {
        "type": "object",
        "required": ["prometheus_url"],
        "properties": {
            "prometheus_url": {
                "type": "string",
                "title": "Prometheus URL",
                "description": "URL of the Prometheus server",
                "format": "uri",
            },
            "node_exporter_port": {
                "type": "integer",
                "title": "Node Exporter Port",
                "default": 9100,
            },
            "scrape_interval": {
                "type": "string",
                "title": "Scrape Interval",
                "default": "15s",
            },
            "scrape_timeout": {
                "type": "string",
                "title": "Scrape Timeout",
                "default": "10s",
            },
            "target_labels": {
                "type": "object",
                "title": "Target Labels",
                "description": "Additional labels to add to metrics",
            },
            "auth_enabled": {
                "type": "boolean",
                "title": "Authentication Enabled",
                "default": False,
            },
            "auth_username": {
                "type": "string",
                "title": "Username",
            },
            "auth_password": {
                "type": "string",
                "title": "Password",
                "format": "password",
            },
            "tls_enabled": {
                "type": "boolean",
                "title": "TLS Enabled",
                "default": False,
            },
        },
    },
    "supported_alerts": [
        "NodeCPUHighUsage",
        "NodeCPUStealHigh",
        "NodeMemoryHighUsage",
        "NodeMemoryCritical",
        "NodeSwapUsageHigh",
        "NodeOOMKillerInvoked",
        "NodePressureMemory",
        "NodeDiskUsageHigh",
        "NodeDiskCritical",
        "NodeFilesystemReadOnly",
        "NodeDiskInodeUsageHigh",
        "NodeLoadHigh",
        "NodeNetworkInterfaceDown",
        "NodeNetworkReceiveErrors",
        "NodeNetworkTransmitErrors",
        "NodeSystemUptimeLow",
        "NodeClockSkewDetected",
        "NodeClockNotSynchronised",
        "NodeHardwareError",
        "NodeProcessDown",
        "NodeFileDescriptorUsageHigh",
        "NodePressureCPU",
        "NodePressureIO",
    ],
    "metrics_collected": [
        {"name": "node_cpu_seconds_total", "type": "counter", "unit": "seconds"},
        {"name": "node_memory_MemTotal_bytes", "type": "gauge", "unit": "bytes"},
        {"name": "node_memory_MemFree_bytes", "type": "gauge", "unit": "bytes"},
        {"name": "node_memory_MemAvailable_bytes", "type": "gauge", "unit": "bytes"},
        {"name": "node_filesystem_size_bytes", "type": "gauge", "unit": "bytes"},
        {"name": "node_filesystem_free_bytes", "type": "gauge", "unit": "bytes"},
        {"name": "node_disk_io_time_seconds_total", "type": "counter", "unit": "seconds"},
        {"name": "node_network_receive_bytes_total", "type": "counter", "unit": "bytes"},
        {"name": "node_network_transmit_bytes_total", "type": "counter", "unit": "bytes"},
        {"name": "node_load1", "type": "gauge", "unit": "load"},
        {"name": "node_load5", "type": "gauge", "unit": "load"},
        {"name": "node_load15", "type": "gauge", "unit": "load"},
        {"name": "node_boot_time_seconds", "type": "gauge", "unit": "seconds"},
        {"name": "node_time_seconds", "type": "gauge", "unit": "seconds"},
    ],
    "default_thresholds": {
        "cpu_usage_warning_percent": 80,
        "cpu_usage_critical_percent": 95,
        "memory_usage_warning_percent": 80,
        "memory_usage_critical_percent": 95,
        "disk_usage_warning_percent": 80,
        "disk_usage_critical_percent": 95,
        "load_warning_ratio": 1.5,
        "load_critical_ratio": 2.0,
    },
    "prometheus_rules": """
groups:
  - name: node_exporter_alerts
    rules:
      # CPU Alerts
      - alert: NodeCPUHighUsage
        expr: 100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: high
        annotations:
          summary: High CPU usage detected
          description: CPU usage is above 80% on {{ $labels.instance }}

      - alert: NodeCPUStealHigh
        expr: avg by(instance) (rate(node_cpu_seconds_total{mode="steal"}[5m])) * 100 > 10
        for: 5m
        labels:
          severity: high
        annotations:
          summary: High CPU steal time
          description: CPU steal is above 10% on {{ $labels.instance }}

      # Memory Alerts
      - alert: NodeMemoryHighUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 80
        for: 5m
        labels:
          severity: high
        annotations:
          summary: High memory usage
          description: Memory usage is above 80% on {{ $labels.instance }}

      - alert: NodeMemoryCritical
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: Critical memory usage
          description: Memory usage is above 95% on {{ $labels.instance }}

      # Disk Alerts
      - alert: NodeDiskUsageHigh
        expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 80
        for: 5m
        labels:
          severity: high
        annotations:
          summary: High disk usage
          description: Disk usage is above 80% on {{ $labels.instance }}

      - alert: NodeDiskCritical
        expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 95
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: Critical disk usage
          description: Disk usage is above 95% on {{ $labels.instance }}

      # Network Alerts
      - alert: NodeNetworkInterfaceDown
        expr: node_network_up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: Network interface down
          description: Network interface {{ $labels.device }} is down on {{ $labels.instance }}

      # System Alerts
      - alert: NodeLoadHigh
        expr: node_load15 / count by(instance) (node_cpu_seconds_total{mode="idle"}) > 1.5
        for: 5m
        labels:
          severity: high
        annotations:
          summary: High system load
          description: System load is high on {{ $labels.instance }}
""",
}


# =============================================================================
# Prometheus Alertmanager Template
# =============================================================================

ALERTMANAGER_TEMPLATE: Dict[str, Any] = {
    "name": "Prometheus Alertmanager",
    "type": IntegrationType.ALERTMANAGER.value,
    "description": "Receive alerts from Prometheus Alertmanager via webhook",
    "provider": "prometheus",
    "icon": "alert-triangle",
    "category": "alerting",
    "configuration_schema": {
        "type": "object",
        "properties": {
            "webhook_path": {
                "type": "string",
                "title": "Webhook Path",
                "default": "/api/v1/webhooks/alertmanager",
                "description": "Path for receiving alerts",
            },
            "auth_token": {
                "type": "string",
                "title": "Auth Token",
                "format": "password",
                "description": "Authentication token for webhook",
            },
            "resolve_timeout": {
                "type": "string",
                "title": "Resolve Timeout",
                "default": "5m",
            },
            "group_by": {
                "type": "array",
                "title": "Group By",
                "items": {"type": "string"},
                "default": ["alertname", "instance"],
            },
            "group_wait": {
                "type": "string",
                "title": "Group Wait",
                "default": "30s",
            },
            "group_interval": {
                "type": "string",
                "title": "Group Interval",
                "default": "5m",
            },
            "repeat_interval": {
                "type": "string",
                "title": "Repeat Interval",
                "default": "4h",
            },
        },
    },
    "alertmanager_config": """
# Alertmanager configuration for LinkedEye ITSM
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'instance']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'linkedeye-webhook'

receivers:
  - name: 'linkedeye-webhook'
    webhook_configs:
      - url: '${LINKEDEYE_WEBHOOK_URL}/api/v1/webhooks/alertmanager'
        send_resolved: true
        http_config:
          bearer_token: '${LINKEDEYE_WEBHOOK_TOKEN}'
""",
}


# =============================================================================
# Get All Templates
# =============================================================================

ALL_TEMPLATES: Dict[str, Dict[str, Any]] = {
    IntegrationType.IDRAC.value: IDRAC_TEMPLATE,
    IntegrationType.ILO.value: ILO_TEMPLATE,
    IntegrationType.NODE_EXPORTER.value: NODE_EXPORTER_TEMPLATE,
    IntegrationType.ALERTMANAGER.value: ALERTMANAGER_TEMPLATE,
}


def get_template(integration_type: str) -> Dict[str, Any]:
    """Get integration template by type."""
    return ALL_TEMPLATES.get(integration_type, {})


def get_all_templates() -> List[Dict[str, Any]]:
    """Get all available integration templates."""
    return list(ALL_TEMPLATES.values())


def get_supported_alerts(integration_type: str) -> List[str]:
    """Get list of supported alerts for an integration type."""
    template = get_template(integration_type)
    return template.get("supported_alerts", [])


def get_configuration_schema(integration_type: str) -> Dict[str, Any]:
    """Get configuration schema for an integration type."""
    template = get_template(integration_type)
    return template.get("configuration_schema", {})
