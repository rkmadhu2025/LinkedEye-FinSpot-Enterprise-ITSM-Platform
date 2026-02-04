"""
Hardware Alert Type Definitions for Server Monitoring.

Supports:
- iDRAC (Dell) - Prometheus Alert Names
- iLO (HP) - Prometheus Alert Names
- Node Exporter - Prometheus Alert Names (Linux/Server)
"""
from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass


class AlertCategory(str, Enum):
    """Alert category enumeration."""
    POWER = "power"
    FAN = "fan"
    TEMPERATURE = "temperature"
    CPU = "cpu"
    MEMORY = "memory"
    DISK = "disk"
    RAID = "raid"
    HARDWARE = "hardware"
    SYSTEM = "system"
    NETWORK = "network"
    LOAD = "load"
    PROCESS = "process"
    FILESYSTEM = "filesystem"


class AlertSource(str, Enum):
    """Alert source enumeration."""
    IDRAC = "idrac"
    ILO = "ilo"
    NODE_EXPORTER = "node_exporter"
    PROMETHEUS = "prometheus"
    CUSTOM = "custom"


@dataclass
class HardwareAlertDefinition:
    """Definition for a hardware alert type."""
    name: str
    category: AlertCategory
    source: AlertSource
    severity: str  # critical, high, medium, low
    description: str
    runbook_url: Optional[str] = None
    auto_create_incident: bool = True
    resolution_hint: Optional[str] = None


# =============================================================================
# iDRAC (Dell) Alert Definitions
# =============================================================================

IDRAC_ALERTS: Dict[str, HardwareAlertDefinition] = {
    # Power Alerts
    "iDRACPowerSupplyFailure": HardwareAlertDefinition(
        name="iDRACPowerSupplyFailure",
        category=AlertCategory.POWER,
        source=AlertSource.IDRAC,
        severity="critical",
        description="Dell iDRAC detected power supply failure. Server may lose power redundancy or experience complete power loss.",
        auto_create_incident=True,
        resolution_hint="Check physical power supply units (PSUs). Replace failed PSU immediately to restore redundancy."
    ),
    "iDRACPowerRedundancyLost": HardwareAlertDefinition(
        name="iDRACPowerRedundancyLost",
        category=AlertCategory.POWER,
        source=AlertSource.IDRAC,
        severity="high",
        description="Dell iDRAC reports power redundancy lost. Server is running on single power supply.",
        auto_create_incident=True,
        resolution_hint="Verify both PSUs are connected and functioning. Check power cables and PDU connections."
    ),

    # Fan Alerts
    "iDRACFanFailure": HardwareAlertDefinition(
        name="iDRACFanFailure",
        category=AlertCategory.FAN,
        source=AlertSource.IDRAC,
        severity="critical",
        description="Dell iDRAC detected fan failure. Server cooling is compromised, thermal shutdown may occur.",
        auto_create_incident=True,
        resolution_hint="Replace failed cooling fan immediately. Monitor server temperatures closely."
    ),

    # Temperature Alerts
    "iDRACTemperatureCritical": HardwareAlertDefinition(
        name="iDRACTemperatureCritical",
        category=AlertCategory.TEMPERATURE,
        source=AlertSource.IDRAC,
        severity="critical",
        description="Dell iDRAC detected critical temperature threshold exceeded. Server may thermal shutdown.",
        auto_create_incident=True,
        resolution_hint="Check datacenter cooling, fan status, and airflow. May require immediate workload migration."
    ),
    "iDRACTemperatureWarning": HardwareAlertDefinition(
        name="iDRACTemperatureWarning",
        category=AlertCategory.TEMPERATURE,
        source=AlertSource.IDRAC,
        severity="high",
        description="Dell iDRAC detected elevated temperature. Server approaching thermal limits.",
        auto_create_incident=True,
        resolution_hint="Monitor temperature trends. Check cooling system and ambient datacenter temperature."
    ),

    # CPU Alerts
    "iDRACCPUFailure": HardwareAlertDefinition(
        name="iDRACCPUFailure",
        category=AlertCategory.CPU,
        source=AlertSource.IDRAC,
        severity="critical",
        description="Dell iDRAC detected CPU failure or degradation. Server performance severely impacted.",
        auto_create_incident=True,
        resolution_hint="Schedule immediate hardware replacement. Migrate workloads if possible."
    ),

    # Memory Alerts
    "iDRACMemoryFailure": HardwareAlertDefinition(
        name="iDRACMemoryFailure",
        category=AlertCategory.MEMORY,
        source=AlertSource.IDRAC,
        severity="critical",
        description="Dell iDRAC detected memory module (DIMM) failure. Server memory capacity reduced.",
        auto_create_incident=True,
        resolution_hint="Identify failed DIMM slot and replace memory module. Schedule maintenance window."
    ),
    "iDRACMemoryCorrectableError": HardwareAlertDefinition(
        name="iDRACMemoryCorrectableError",
        category=AlertCategory.MEMORY,
        source=AlertSource.IDRAC,
        severity="medium",
        description="Dell iDRAC detected correctable memory errors (ECC). May indicate impending failure.",
        auto_create_incident=True,
        resolution_hint="Monitor error rate. Schedule DIMM replacement if errors increase."
    ),

    # Disk/Storage Alerts
    "iDRACDiskFailure": HardwareAlertDefinition(
        name="iDRACDiskFailure",
        category=AlertCategory.DISK,
        source=AlertSource.IDRAC,
        severity="critical",
        description="Dell iDRAC detected physical disk failure. Data redundancy may be compromised.",
        auto_create_incident=True,
        resolution_hint="Replace failed disk immediately. RAID should rebuild automatically if redundancy exists."
    ),
    "iDRACRAIDDegraded": HardwareAlertDefinition(
        name="iDRACRAIDDegraded",
        category=AlertCategory.RAID,
        source=AlertSource.IDRAC,
        severity="high",
        description="Dell iDRAC detected degraded RAID array. Data protection reduced until rebuild completes.",
        auto_create_incident=True,
        resolution_hint="Identify and replace failed disk. Monitor rebuild progress. Avoid additional disk failures."
    ),
    "iDRACRAIDFailed": HardwareAlertDefinition(
        name="iDRACRAIDFailed",
        category=AlertCategory.RAID,
        source=AlertSource.IDRAC,
        severity="critical",
        description="Dell iDRAC detected RAID array failure. Data loss may have occurred.",
        auto_create_incident=True,
        resolution_hint="Critical data loss risk. Engage storage team immediately. Restore from backup if needed."
    ),

    # Hardware/System Alerts
    "iDRACHardwareFault": HardwareAlertDefinition(
        name="iDRACHardwareFault",
        category=AlertCategory.HARDWARE,
        source=AlertSource.IDRAC,
        severity="high",
        description="Dell iDRAC detected generic hardware fault. Check iDRAC logs for specific component.",
        auto_create_incident=True,
        resolution_hint="Review iDRAC system event log for detailed fault information."
    ),
    "iDRACSystemRebooted": HardwareAlertDefinition(
        name="iDRACSystemRebooted",
        category=AlertCategory.SYSTEM,
        source=AlertSource.IDRAC,
        severity="medium",
        description="Dell iDRAC detected unexpected system reboot.",
        auto_create_incident=False,
        resolution_hint="Check system logs for reboot cause. May indicate hardware or OS issue."
    ),
    "iDRACSystemDown": HardwareAlertDefinition(
        name="iDRACSystemDown",
        category=AlertCategory.SYSTEM,
        source=AlertSource.IDRAC,
        severity="critical",
        description="Dell iDRAC detected system is down or unresponsive.",
        auto_create_incident=True,
        resolution_hint="Check physical server status, power, and network connectivity. May require remote iDRAC access."
    ),
}


# =============================================================================
# iLO (HP) Alert Definitions
# =============================================================================

ILO_ALERTS: Dict[str, HardwareAlertDefinition] = {
    # Power Alerts
    "iLOPowerSupplyFailure": HardwareAlertDefinition(
        name="iLOPowerSupplyFailure",
        category=AlertCategory.POWER,
        source=AlertSource.ILO,
        severity="critical",
        description="HP iLO detected power supply failure. Server may lose power redundancy.",
        auto_create_incident=True,
        resolution_hint="Check physical power supply units. Replace failed PSU to restore redundancy."
    ),
    "iLOPowerRedundancyLost": HardwareAlertDefinition(
        name="iLOPowerRedundancyLost",
        category=AlertCategory.POWER,
        source=AlertSource.ILO,
        severity="high",
        description="HP iLO reports power redundancy lost. Server running on single PSU.",
        auto_create_incident=True,
        resolution_hint="Verify PSU connections and functionality. Check power cables."
    ),

    # Fan Alerts
    "iLOFanFailure": HardwareAlertDefinition(
        name="iLOFanFailure",
        category=AlertCategory.FAN,
        source=AlertSource.ILO,
        severity="critical",
        description="HP iLO detected fan failure. Server cooling compromised.",
        auto_create_incident=True,
        resolution_hint="Replace failed cooling fan. Monitor temperatures until resolved."
    ),

    # Temperature Alerts
    "iLOTemperatureCritical": HardwareAlertDefinition(
        name="iLOTemperatureCritical",
        category=AlertCategory.TEMPERATURE,
        source=AlertSource.ILO,
        severity="critical",
        description="HP iLO detected critical temperature. Thermal shutdown imminent.",
        auto_create_incident=True,
        resolution_hint="Check datacenter cooling and fan status. Migrate workloads if possible."
    ),
    "iLOTemperatureWarning": HardwareAlertDefinition(
        name="iLOTemperatureWarning",
        category=AlertCategory.TEMPERATURE,
        source=AlertSource.ILO,
        severity="high",
        description="HP iLO detected elevated temperature approaching limits.",
        auto_create_incident=True,
        resolution_hint="Monitor temperature. Check cooling system and ambient temperature."
    ),

    # CPU Alerts
    "iLOCPUFailure": HardwareAlertDefinition(
        name="iLOCPUFailure",
        category=AlertCategory.CPU,
        source=AlertSource.ILO,
        severity="critical",
        description="HP iLO detected CPU failure or degradation.",
        auto_create_incident=True,
        resolution_hint="Schedule hardware replacement. Migrate workloads."
    ),

    # Memory Alerts
    "iLOMemoryFailure": HardwareAlertDefinition(
        name="iLOMemoryFailure",
        category=AlertCategory.MEMORY,
        source=AlertSource.ILO,
        severity="critical",
        description="HP iLO detected memory module failure.",
        auto_create_incident=True,
        resolution_hint="Identify and replace failed DIMM. Schedule maintenance."
    ),

    # Disk/Storage Alerts
    "iLODiskFailure": HardwareAlertDefinition(
        name="iLODiskFailure",
        category=AlertCategory.DISK,
        source=AlertSource.ILO,
        severity="critical",
        description="HP iLO detected physical disk failure.",
        auto_create_incident=True,
        resolution_hint="Replace failed disk. RAID rebuild should start automatically."
    ),
    "iLORAIDDegraded": HardwareAlertDefinition(
        name="iLORAIDDegraded",
        category=AlertCategory.RAID,
        source=AlertSource.ILO,
        severity="high",
        description="HP iLO detected degraded RAID array.",
        auto_create_incident=True,
        resolution_hint="Replace failed disk. Monitor rebuild progress."
    ),
    "iLORAIDFailed": HardwareAlertDefinition(
        name="iLORAIDFailed",
        category=AlertCategory.RAID,
        source=AlertSource.ILO,
        severity="critical",
        description="HP iLO detected RAID array failure. Data loss risk.",
        auto_create_incident=True,
        resolution_hint="Critical! Engage storage team. Restore from backup if needed."
    ),

    # Hardware/System Alerts
    "iLOHardwareFault": HardwareAlertDefinition(
        name="iLOHardwareFault",
        category=AlertCategory.HARDWARE,
        source=AlertSource.ILO,
        severity="high",
        description="HP iLO detected generic hardware fault.",
        auto_create_incident=True,
        resolution_hint="Review iLO event log for detailed information."
    ),
    "iLOSystemRebooted": HardwareAlertDefinition(
        name="iLOSystemRebooted",
        category=AlertCategory.SYSTEM,
        source=AlertSource.ILO,
        severity="medium",
        description="HP iLO detected unexpected system reboot.",
        auto_create_incident=False,
        resolution_hint="Check system logs for reboot cause."
    ),
    "iLOSystemDown": HardwareAlertDefinition(
        name="iLOSystemDown",
        category=AlertCategory.SYSTEM,
        source=AlertSource.ILO,
        severity="critical",
        description="HP iLO detected system is down or unresponsive.",
        auto_create_incident=True,
        resolution_hint="Check server status, power, and network. Use iLO remote access."
    ),
}


# =============================================================================
# Node Exporter (Linux/Server) Alert Definitions
# =============================================================================

NODE_EXPORTER_ALERTS: Dict[str, HardwareAlertDefinition] = {
    # CPU Alerts
    "NodeCPUHighUsage": HardwareAlertDefinition(
        name="NodeCPUHighUsage",
        category=AlertCategory.CPU,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected high CPU utilization exceeding threshold.",
        auto_create_incident=True,
        resolution_hint="Identify high CPU processes with top/htop. Consider scaling or optimization."
    ),
    "NodeCPUStealHigh": HardwareAlertDefinition(
        name="NodeCPUStealHigh",
        category=AlertCategory.CPU,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected high CPU steal time. VM host may be oversubscribed.",
        auto_create_incident=True,
        resolution_hint="Contact cloud/VM provider. Consider VM migration or host rebalancing."
    ),

    # Memory Alerts
    "NodeMemoryHighUsage": HardwareAlertDefinition(
        name="NodeMemoryHighUsage",
        category=AlertCategory.MEMORY,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected high memory utilization.",
        auto_create_incident=True,
        resolution_hint="Identify memory-hungry processes. Consider scaling memory or optimization."
    ),
    "NodeMemoryCritical": HardwareAlertDefinition(
        name="NodeMemoryCritical",
        category=AlertCategory.MEMORY,
        source=AlertSource.NODE_EXPORTER,
        severity="critical",
        description="Node Exporter detected critical memory exhaustion. OOM killer may activate.",
        auto_create_incident=True,
        resolution_hint="Immediate action required. Free memory or restart services."
    ),
    "NodeSwapUsageHigh": HardwareAlertDefinition(
        name="NodeSwapUsageHigh",
        category=AlertCategory.MEMORY,
        source=AlertSource.NODE_EXPORTER,
        severity="medium",
        description="Node Exporter detected high swap usage indicating memory pressure.",
        auto_create_incident=True,
        resolution_hint="Increase available memory or identify memory leaks."
    ),
    "NodeOOMKillerInvoked": HardwareAlertDefinition(
        name="NodeOOMKillerInvoked",
        category=AlertCategory.MEMORY,
        source=AlertSource.NODE_EXPORTER,
        severity="critical",
        description="Node Exporter detected OOM Killer was invoked. Processes were terminated.",
        auto_create_incident=True,
        resolution_hint="Check dmesg/journalctl for killed processes. Add memory or fix memory leaks."
    ),
    "NodePressureMemory": HardwareAlertDefinition(
        name="NodePressureMemory",
        category=AlertCategory.MEMORY,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected PSI memory pressure indicating resource contention.",
        auto_create_incident=True,
        resolution_hint="Reduce workload or increase memory capacity."
    ),

    # Disk/Filesystem Alerts
    "NodeDiskUsageHigh": HardwareAlertDefinition(
        name="NodeDiskUsageHigh",
        category=AlertCategory.DISK,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected high disk space utilization.",
        auto_create_incident=True,
        resolution_hint="Clean up disk space, remove old logs, or expand storage."
    ),
    "NodeDiskCritical": HardwareAlertDefinition(
        name="NodeDiskCritical",
        category=AlertCategory.DISK,
        source=AlertSource.NODE_EXPORTER,
        severity="critical",
        description="Node Exporter detected critical disk space exhaustion.",
        auto_create_incident=True,
        resolution_hint="Immediate disk cleanup required. System may become unusable."
    ),
    "NodeFilesystemReadOnly": HardwareAlertDefinition(
        name="NodeFilesystemReadOnly",
        category=AlertCategory.FILESYSTEM,
        source=AlertSource.NODE_EXPORTER,
        severity="critical",
        description="Node Exporter detected filesystem mounted as read-only.",
        auto_create_incident=True,
        resolution_hint="Check dmesg for disk errors. May indicate hardware failure."
    ),
    "NodeDiskInodeUsageHigh": HardwareAlertDefinition(
        name="NodeDiskInodeUsageHigh",
        category=AlertCategory.DISK,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected high inode usage. May exhaust before disk space.",
        auto_create_incident=True,
        resolution_hint="Remove small files or reformat with more inodes."
    ),

    # Load Alerts
    "NodeLoadHigh": HardwareAlertDefinition(
        name="NodeLoadHigh",
        category=AlertCategory.LOAD,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected high system load average.",
        auto_create_incident=True,
        resolution_hint="Identify processes causing load. Consider scaling or optimization."
    ),

    # Network Alerts
    "NodeNetworkInterfaceDown": HardwareAlertDefinition(
        name="NodeNetworkInterfaceDown",
        category=AlertCategory.NETWORK,
        source=AlertSource.NODE_EXPORTER,
        severity="critical",
        description="Node Exporter detected network interface is down.",
        auto_create_incident=True,
        resolution_hint="Check physical network connection, cable, and switch port."
    ),
    "NodeNetworkReceiveErrors": HardwareAlertDefinition(
        name="NodeNetworkReceiveErrors",
        category=AlertCategory.NETWORK,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected network receive errors indicating packet loss.",
        auto_create_incident=True,
        resolution_hint="Check network cable, NIC driver, and switch configuration."
    ),
    "NodeNetworkTransmitErrors": HardwareAlertDefinition(
        name="NodeNetworkTransmitErrors",
        category=AlertCategory.NETWORK,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected network transmit errors.",
        auto_create_incident=True,
        resolution_hint="Check network cable, NIC driver, and switch port."
    ),

    # System Alerts
    "NodeSystemUptimeLow": HardwareAlertDefinition(
        name="NodeSystemUptimeLow",
        category=AlertCategory.SYSTEM,
        source=AlertSource.NODE_EXPORTER,
        severity="medium",
        description="Node Exporter detected low system uptime indicating recent reboot.",
        auto_create_incident=False,
        resolution_hint="Check system logs for reboot cause."
    ),
    "NodeClockSkewDetected": HardwareAlertDefinition(
        name="NodeClockSkewDetected",
        category=AlertCategory.SYSTEM,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected clock skew. Time synchronization issue.",
        auto_create_incident=True,
        resolution_hint="Check NTP configuration and connectivity to time servers."
    ),
    "NodeClockNotSynchronised": HardwareAlertDefinition(
        name="NodeClockNotSynchronised",
        category=AlertCategory.SYSTEM,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected clock is not synchronized to NTP.",
        auto_create_incident=True,
        resolution_hint="Verify chronyd/ntpd is running and can reach time servers."
    ),

    # Hardware Alerts
    "NodeHardwareError": HardwareAlertDefinition(
        name="NodeHardwareError",
        category=AlertCategory.HARDWARE,
        source=AlertSource.NODE_EXPORTER,
        severity="critical",
        description="Node Exporter detected hardware error via kernel messages.",
        auto_create_incident=True,
        resolution_hint="Check dmesg and hardware management interface for details."
    ),

    # Process Alerts
    "NodeProcessDown": HardwareAlertDefinition(
        name="NodeProcessDown",
        category=AlertCategory.PROCESS,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected critical process is not running.",
        auto_create_incident=True,
        resolution_hint="Restart the affected service and check logs for crash cause."
    ),

    # Optional/Extension Alerts
    "NodeFileDescriptorUsageHigh": HardwareAlertDefinition(
        name="NodeFileDescriptorUsageHigh",
        category=AlertCategory.SYSTEM,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected high file descriptor usage.",
        auto_create_incident=True,
        resolution_hint="Identify process with too many open files. Increase ulimit if needed."
    ),
    "NodePressureCPU": HardwareAlertDefinition(
        name="NodePressureCPU",
        category=AlertCategory.CPU,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected PSI CPU pressure indicating resource contention.",
        auto_create_incident=True,
        resolution_hint="Reduce CPU load or add more CPU resources."
    ),
    "NodePressureIO": HardwareAlertDefinition(
        name="NodePressureIO",
        category=AlertCategory.DISK,
        source=AlertSource.NODE_EXPORTER,
        severity="high",
        description="Node Exporter detected PSI I/O pressure indicating storage bottleneck.",
        auto_create_incident=True,
        resolution_hint="Optimize disk I/O, upgrade storage, or distribute load."
    ),
}


# =============================================================================
# Combined Alert Registry
# =============================================================================

ALL_HARDWARE_ALERTS: Dict[str, HardwareAlertDefinition] = {
    **IDRAC_ALERTS,
    **ILO_ALERTS,
    **NODE_EXPORTER_ALERTS,
}


def get_alert_definition(alert_name: str) -> Optional[HardwareAlertDefinition]:
    """Get alert definition by name."""
    return ALL_HARDWARE_ALERTS.get(alert_name)


def get_alerts_by_source(source: AlertSource) -> Dict[str, HardwareAlertDefinition]:
    """Get all alerts for a specific source."""
    source_map = {
        AlertSource.IDRAC: IDRAC_ALERTS,
        AlertSource.ILO: ILO_ALERTS,
        AlertSource.NODE_EXPORTER: NODE_EXPORTER_ALERTS,
    }
    return source_map.get(source, {})


def get_alerts_by_category(category: AlertCategory) -> Dict[str, HardwareAlertDefinition]:
    """Get all alerts for a specific category."""
    return {
        name: alert for name, alert in ALL_HARDWARE_ALERTS.items()
        if alert.category == category
    }


def get_severity_priority(severity: str) -> int:
    """Get numeric priority for severity (higher = more severe)."""
    priority_map = {
        "critical": 4,
        "high": 3,
        "medium": 2,
        "low": 1,
    }
    return priority_map.get(severity.lower(), 0)


def should_auto_create_incident(alert_name: str) -> bool:
    """Check if alert should auto-create incident."""
    alert_def = get_alert_definition(alert_name)
    return alert_def.auto_create_incident if alert_def else True


def get_alert_category_icon(category: AlertCategory) -> str:
    """Get icon for alert category."""
    icon_map = {
        AlertCategory.POWER: "⚡",
        AlertCategory.FAN: "🌀",
        AlertCategory.TEMPERATURE: "🌡️",
        AlertCategory.CPU: "🔲",
        AlertCategory.MEMORY: "💾",
        AlertCategory.DISK: "💿",
        AlertCategory.RAID: "🗄️",
        AlertCategory.HARDWARE: "🔧",
        AlertCategory.SYSTEM: "🖥️",
        AlertCategory.NETWORK: "🌐",
        AlertCategory.LOAD: "📊",
        AlertCategory.PROCESS: "⚙️",
        AlertCategory.FILESYSTEM: "📁",
    }
    return icon_map.get(category, "⚠️")


def get_alert_source_display_name(source: AlertSource) -> str:
    """Get display name for alert source."""
    display_map = {
        AlertSource.IDRAC: "Dell iDRAC",
        AlertSource.ILO: "HP iLO",
        AlertSource.NODE_EXPORTER: "Node Exporter",
        AlertSource.PROMETHEUS: "Prometheus",
        AlertSource.CUSTOM: "Custom",
    }
    return display_map.get(source, str(source))
