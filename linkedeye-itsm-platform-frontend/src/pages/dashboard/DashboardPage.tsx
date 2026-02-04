import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  GitBranch,
  Activity,
  Server,
  Phone,
  Shield,
  Zap,
  Users,
  Timer,
  Layers,
  BarChart3,
  TrendingUp,
  Bell,
  Settings,
  Target,
  Briefcase,
  Calendar,
  Gauge,
} from 'lucide-react';
import { useAppSelector } from '@/hooks/useRedux';
import { dashboardService } from '@/services/dashboardService';
import { onCallService, CurrentOnCallEntry } from '@/services/onCallService';
import { DashboardStats } from '@/types';
import { getUserRole, UserRole, getRoleDisplayName } from '@/utils/roles';
import { KPICard, SLACountdown, ActionPanel, AlertFunnel, RoleGuard, DashboardGrid } from '@/components/dashboard';
import { isFeatureEnabled } from '@/utils/featureFlags';
import clsx from 'clsx';
import toast from 'react-hot-toast';

// Chart.js registration
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement,
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement
);

/**
 * LinkedEye Enterprise Dashboard v6.0
 *
 * Role-based personalization:
 * - Agents: Operational tasks, SLA timers, assigned incidents, on-call status
 * - Managers: Team trends, workload distribution, escalation metrics
 * - Admins: System health, integrations, infrastructure status
 * - Executives: High-level KPIs, business metrics, trend summaries
 *
 * Features:
 * - Modular widget-based layout
 * - Real-time SLA countdown timers
 * - Action-oriented panels
 * - Professional Blue enterprise theme
 */

// Role-based dashboard configurations
const ROLE_CONFIG: Record<UserRole, {
  title: string;
  subtitle: string;
  kpiCount: number;
  showAlertFunnel: boolean;
  showOnCall: boolean;
  showTeamWorkload: boolean;
  showInfrastructure: boolean;
  showIntegrations: boolean;
  showEscalations: boolean;
}> = {
  executive: {
    title: 'Executive Overview',
    subtitle: 'Business metrics and high-level KPIs',
    kpiCount: 4,
    showAlertFunnel: false,
    showOnCall: false,
    showTeamWorkload: true,
    showInfrastructure: false,
    showIntegrations: false,
    showEscalations: false,
  },
  manager: {
    title: 'Team Performance',
    subtitle: 'Trends, workload and escalation metrics',
    kpiCount: 5,
    showAlertFunnel: true,
    showOnCall: true,
    showTeamWorkload: true,
    showInfrastructure: true,
    showIntegrations: false,
    showEscalations: true,
  },
  agent: {
    title: 'Operations Dashboard',
    subtitle: 'Active incidents and SLA timers',
    kpiCount: 5,
    showAlertFunnel: true,
    showOnCall: true,
    showTeamWorkload: false,
    showInfrastructure: false,
    showIntegrations: false,
    showEscalations: false,
  },
  admin: {
    title: 'System Administration',
    subtitle: 'System health and integrations',
    kpiCount: 5,
    showAlertFunnel: true,
    showOnCall: true,
    showTeamWorkload: true,
    showInfrastructure: true,
    showIntegrations: true,
    showEscalations: true,
  },
};

const DashboardPage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);
  const role = getUserRole(user) as UserRole;
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.agent;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentOnCall, setCurrentOnCall] = useState<CurrentOnCallEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardIncidents, setDashboardIncidents] = useState<Array<{
    id: string;
    number: string;
    title: string;
    priority: string;
    status: string;
    sla_due?: string;
  }>>([]);
  const [alertFunnelData, setAlertFunnelData] = useState<{
    stages: Array<{ label: string; count: number; color: string }>;
  } | null>(null);
  const [teamWorkloadData, setTeamWorkloadData] = useState<{
    teams: Array<{ name: string; active: number; capacity: number }>;
  } | null>(null);
  const [slaData, setSlaData] = useState<{
    at_risk: Array<{ id: string; title: string; priority: string; sla_due: string }>;
    breached: Array<{ id: string; title: string; priority: string; sla_due: string }>;
    at_risk_count: number;
    breached_count: number;
  } | null>(null);

  // Client filtering
  const selectedClientId = localStorage.getItem('selectedClientId') || undefined;
  const selectedClientName = localStorage.getItem('selectedClientName') || 'All Clients';

  const fetchStats = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      const [dashboardData, onCallData, incidentsData, funnelData, workloadData, slaRiskData] = await Promise.all([
        dashboardService.getStats(selectedClientId),
        onCallService.getCurrentOnCall().catch(() => []),
        dashboardService.getRecentIncidents(5).catch(() => []),
        isFeatureEnabled('alertFunnel') ? dashboardService.getAlertFunnel().catch(() => null) : Promise.resolve(null),
        isFeatureEnabled('teamWorkload') ? dashboardService.getTeamWorkload().catch(() => null) : Promise.resolve(null),
        isFeatureEnabled('slaCountdown') ? dashboardService.getSlaAtRisk().catch(() => null) : Promise.resolve(null),
      ]);
      setStats(dashboardData);
      setCurrentOnCall(onCallData || []);
      if (funnelData) setAlertFunnelData(funnelData);
      if (workloadData) setTeamWorkloadData(workloadData);
      if (slaRiskData) setSlaData(slaRiskData);
      if (incidentsData && incidentsData.length > 0) {
        setDashboardIncidents(incidentsData.map((i: any) => ({
          id: i.id,
          number: i.number || i.id?.substring(0, 8)?.toUpperCase() || 'N/A',
          title: i.title,
          priority: i.priority,
          status: i.status,
          sla_due: i.sla_resolution_due || i.slaResolutionDue,
        })));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedClientId]);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(refreshInterval);
  }, [fetchStats]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStats(true);
  };

  const isDark = theme === 'dark';
  const cardBg = isDark ? 'var(--bg-card)' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';

  // Prepare action panel items with priority
  const incidentsNeedingAttention = useMemo(() => {
    return (dashboardIncidents.length > 0 ? dashboardIncidents : recentIncidents)
      .filter((i) => ['critical', 'high'].includes(i.priority.toLowerCase()) || i.status.toLowerCase() === 'new')
      .slice(0, 5)
      .map((i) => ({
        id: i.id,
        title: `${i.number} — ${i.title}`,
        subtitle: `${i.priority} · ${i.status}`,
        badge: <PriorityBadge priority={i.priority} />,
        href: `/incidents/${i.id}`,
        priority: i.priority.toLowerCase() as 'critical' | 'high' | 'medium' | 'low',
      }));
  }, [dashboardIncidents]);

  const upcomingChanges = [
    { id: 'c1', title: 'Database migration v3.2', subtitle: 'Scheduled Feb 5 · Normal', href: '/changes', priority: 'medium' as const },
    { id: 'c2', title: 'SSL cert rotation', subtitle: 'Scheduled Feb 6 · Standard', href: '/changes', priority: 'low' as const },
    { id: 'c3', title: 'API Gateway upgrade', subtitle: 'Scheduled Feb 8 · Emergency', href: '/changes', priority: 'high' as const },
  ];

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p style={{ color: textSecondary }} className="text-sm">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Bar + Greeting */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold" style={{ color: textPrimary }}>
              {getGreeting()}, {user?.firstName || 'Operator'}
            </h2>
            {/* Role Badge - Shows the detected dashboard role */}
            <RoleBadge role={role} isDark={isDark} />
          </div>
          <p className="text-sm" style={{ color: textSecondary }}>
            {roleConfig.title} — {roleConfig.subtitle}
            {selectedClientId && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {selectedClientName}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-6">
            <StatusItem label="All Systems Operational" status="healthy" />
            <StatusItem label="99.98% Uptime" status="healthy" />
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-primary-50 dark:hover:bg-primary-900/20"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : '#f4f6f9',
              color: textSecondary,
              border: `1px solid ${borderColor}`,
            }}
          >
            <RefreshCw size={15} className={clsx(isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* === KPI Row - Role-based === */}
      <div className={clsx(
        'grid gap-4',
        roleConfig.kpiCount === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
      )}>
        <KPICard
          title="Active Incidents"
          value={stats?.incidents.critical || 0}
          subtitle="Critical priority"
          icon={<AlertTriangle size={18} />}
          trend={{ value: 2, direction: 'up', label: 'vs yesterday', isPositive: false }}
          status="critical"
          isDark={isDark}
          href="/incidents?priority=critical"
        />
        <KPICard
          title="MTTR"
          value={stats?.incidents.avgResolutionTime ? `${Math.round(stats.incidents.avgResolutionTime)}m` : '42m'}
          subtitle="Mean time to resolve"
          icon={<Timer size={18} />}
          trend={{ value: 12, direction: 'down', label: 'faster', isPositive: true }}
          status="healthy"
          isDark={isDark}
        />
        <KPICard
          title="SLA At Risk"
          value={slaData?.at_risk_count ?? stats?.incidents.slaBreached ?? 3}
          subtitle={`${slaData?.breached_count ?? 0} breached`}
          icon={<Clock size={18} />}
          trend={{ value: slaData?.breached_count ?? 1, direction: 'up', label: 'breached', isPositive: false }}
          status={slaData?.breached_count ? 'critical' : 'medium'}
          isDark={isDark}
          href="/incidents?sla=at_risk"
        />
        <KPICard
          title="Change Success"
          value={stats?.changes ? `${Math.round(((stats.changes.completed || 0) / Math.max(stats.changes.total, 1)) * 100)}%` : '94%'}
          subtitle={`${stats?.changes?.completed || 0} completed`}
          icon={<CheckCircle size={18} />}
          trend={{ value: 3, direction: 'up', label: 'improvement', isPositive: true }}
          status="info"
          isDark={isDark}
          href="/changes"
        />
        {/* 5th card only for non-executive roles */}
        {roleConfig.kpiCount > 4 && (
          <KPICard
            title={role === 'admin' ? 'System Health' : 'Open Problems'}
            value={role === 'admin' ? '98%' : (stats?.problems?.open || 7)}
            subtitle={role === 'admin' ? 'All services up' : 'Root cause analysis'}
            icon={role === 'admin' ? <Server size={18} /> : <Layers size={18} />}
            trend={{ value: 2, direction: 'neutral', label: role === 'admin' ? 'stable' : 'investigating' }}
            status={role === 'admin' ? 'healthy' : 'medium'}
            isDark={isDark}
            href={role === 'admin' ? '/infrastructure' : '/problems'}
          />
        )}
      </div>

      {/* === Charts Row === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Trends - 2 cols */}
        <div
          className="lg:col-span-2 rounded-xl"
          style={{ background: cardBg, border: `1px solid ${borderColor}` }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${borderColor}` }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }}>
                <Activity size={17} className="text-primary-500" />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
                Incident Trends
              </h3>
            </div>
            <div className="flex gap-1.5">
              {['7D', '30D', '90D'].map((period) => (
                <button
                  key={period}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                  style={{
                    background: period === '30D' ? 'var(--color-primary)' : isDark ? 'rgba(255,255,255,0.06)' : '#f4f6f9',
                    color: period === '30D' ? '#fff' : textSecondary,
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <div className="p-5">
            <div className="h-72">
              <Line data={getIncidentTrendsData(isDark)} options={getChartOptions(isDark)} />
            </div>
          </div>
        </div>

        {/* Alert-to-Incident Funnel + Priority Distribution */}
        <div className="space-y-6">
          {/* Alert Funnel — Agents & Managers */}
          {roleConfig.showAlertFunnel && isFeatureEnabled('alertFunnel') && (
            <div
              className="rounded-xl"
              style={{ background: cardBg, border: `1px solid ${borderColor}` }}
            >
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)' }}>
                    <Zap size={17} className="text-high-500" />
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
                    Alert Funnel
                  </h3>
                </div>
              </div>
              <div className="p-5">
                <AlertFunnel
                  isDark={isDark}
                  stages={alertFunnelData?.stages || [
                    { label: 'Total Alerts', count: 247, color: '#3b82f6' },
                    { label: 'Deduplicated', count: 89, color: '#f59e0b' },
                    { label: 'Incidents Created', count: 34, color: '#ef4444' },
                    { label: 'Resolved', count: 28, color: '#10b981' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Priority Distribution — All roles */}
          {isFeatureEnabled('priorityDistribution') && (
            <div
              className="rounded-xl"
              style={{ background: cardBg, border: `1px solid ${borderColor}` }}
            >
              <div className="px-5 py-4" style={{ borderBottom: `1px solid ${borderColor}` }}>
                <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
                  Priority Distribution
                </h3>
              </div>
              <div className="p-5">
                <div className="h-48">
                  <Doughnut data={getPriorityData(isDark)} options={getDoughnutOptions(isDark)} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === Action Panels Row === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents Needing Attention — Agents & Managers */}
        <ActionPanel
          title="Incidents Needing Attention"
          icon={<AlertTriangle size={17} />}
          items={incidentsNeedingAttention}
          emptyText="No critical incidents right now"
          emptyAction={{ label: 'View All Incidents', href: '/incidents' }}
          viewAllHref="/incidents"
          isDark={isDark}
          accentColor="#ef4444"
          variant="default"
        />

        {/* My On-Call Alerts — Agents */}
        {roleConfig.showOnCall && isFeatureEnabled('onCallPanel') && (
          <div
            className="rounded-xl"
            style={{ background: cardBg, border: `1px solid ${borderColor}` }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${borderColor}` }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }}>
                  <Phone size={17} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
                    Current On-Call
                  </h3>
                  <p className="text-xs" style={{ color: textSecondary }}>
                    {currentOnCall.length} active
                  </p>
                </div>
              </div>
              <Link
                to="/on-call/schedules"
                className="text-xs font-medium flex items-center gap-1"
                style={{ color: '#3b82f6' }}
              >
                Manage <ArrowRight size={13} />
              </Link>
            </div>
            <div className="p-5">
              {currentOnCall.length === 0 ? (
                <div className="text-center py-8" style={{ color: textSecondary }}>
                  <Phone size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No active on-call shifts</p>
                  <Link to="/on-call/schedules" className="text-xs mt-2 inline-block" style={{ color: '#3b82f6' }}>
                    Set up schedules
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentOnCall.slice(0, 3).map((entry, index) => {
                    const u = entry.user;
                    const name = u?.displayName || (u?.firstName && u?.lastName ? `${u.firstName} ${u.lastName}` : u?.email || 'Unknown');
                    const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                    const isCurrent = index === 0;
                    return (
                      <div
                        key={entry.id}
                        className={clsx('flex items-center gap-3 p-3 rounded-lg', isCurrent && 'ring-2 ring-emerald-500')}
                        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                          style={{ background: isCurrent ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#3b82f6,#2563eb)' }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate" style={{ color: textPrimary }}>{name}</p>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                On-Call
                              </span>
                            )}
                          </div>
                          <p className="text-xs truncate" style={{ color: textSecondary }}>
                            {entry.schedule_name || 'Primary Rotation'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upcoming Changes */}
        {isFeatureEnabled('upcomingChanges') && (
          <ActionPanel
            title="Upcoming Changes"
            icon={<GitBranch size={17} />}
            items={upcomingChanges}
            emptyText="No upcoming changes"
            viewAllHref="/changes"
            isDark={isDark}
            accentColor="#3b82f6"
          />
        )}
      </div>

      {/* === SLA Countdown Row - Agents focus === */}
      {isFeatureEnabled('slaCountdown') && slaData && (slaData.at_risk.length > 0 || slaData.breached.length > 0) && (
        <div
          className="rounded-xl"
          style={{ background: cardBg, border: `1px solid ${borderColor}` }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${borderColor}` }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)' }}>
                <Clock size={17} className="text-medium-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>
                  SLA Countdown — At Risk
                </h3>
                <p className="text-xs" style={{ color: textSecondary }}>
                  {slaData.at_risk_count + slaData.breached_count} incidents need attention
                </p>
              </div>
            </div>
            <Link to="/incidents?sla=at_risk" className="text-xs font-medium flex items-center gap-1" style={{ color: '#3b82f6' }}>
              View All <ArrowRight size={13} />
            </Link>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...slaData.breached, ...slaData.at_risk].slice(0, 6).map((inc) => (
              <Link key={inc.id} to={`/incidents/${inc.id}`} className="block group">
                <div
                  className="p-4 rounded-lg transition-all group-hover:shadow-md"
                  style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}
                >
                  <p className="text-xs font-medium truncate mb-2" style={{ color: textPrimary }}>{inc.title}</p>
                  <SLACountdown dueDateISO={inc.sla_due} isDark={isDark} compact />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* === Manager/Executive Row — Team & Trend Metrics === */}
      {(roleConfig.showTeamWorkload || roleConfig.showInfrastructure) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workload Distribution */}
          {roleConfig.showTeamWorkload && isFeatureEnabled('teamWorkload') && (
            <div className="rounded-xl" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${borderColor}` }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }}>
                  <Users size={17} className="text-primary-500" />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>Team Workload</h3>
              </div>
              <div className="p-5 space-y-4">
                {(teamWorkloadData?.teams || [
                  { name: 'Platform Ops', active: 12, capacity: 20 },
                  { name: 'Network Ops', active: 8, capacity: 15 },
                  { name: 'Security Team', active: 5, capacity: 10 },
                  { name: 'Database Ops', active: 3, capacity: 8 },
                ]).map((team) => {
                  const utilization = team.active / team.capacity;
                  const color = utilization > 0.8 ? '#ef4444' : utilization > 0.6 ? '#f59e0b' : '#10b981';
                  return (
                    <div key={team.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span style={{ color: textSecondary }}>{team.name}</span>
                        <span className="font-semibold" style={{ color: textPrimary }}>
                          {team.active}/{team.capacity}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${utilization * 100}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Infrastructure Health */}
          {roleConfig.showInfrastructure && isFeatureEnabled('infrastructureHealth') && (
            <div className="rounded-xl" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${borderColor}` }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }}>
                    <Server size={17} className="text-success-500" />
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>Infrastructure Health</h3>
                </div>
                <Link to="/infrastructure" className="text-xs font-medium flex items-center gap-1" style={{ color: '#3b82f6' }}>
                  Details <ArrowRight size={13} />
                </Link>
              </div>
              <div className="p-5 space-y-4">
                <HealthBar label="API Gateway" value={98} isDark={isDark} />
                <HealthBar label="Database Cluster" value={95} isDark={isDark} />
                <HealthBar label="Cache Layer" value={100} isDark={isDark} />
                <HealthBar label="Message Queue" value={87} isDark={isDark} />
                <HealthBar label="CDN" value={100} isDark={isDark} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* === Admin-Only: System Health & Integrations === */}
      {roleConfig.showIntegrations && isFeatureEnabled('systemIntegrations') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
            <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${borderColor}` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)' }}>
                <Shield size={17} className="text-purple-500" />
              </div>
              <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>System Integrations</h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                { name: 'Prometheus', status: 'connected', latency: '12ms' },
                { name: 'StackStorm', status: 'connected', latency: '45ms' },
                { name: 'Grafana', status: 'connected', latency: '8ms' },
                { name: 'n8n Workflows', status: 'connected', latency: '23ms' },
              ].map((integration) => (
                <div key={integration.name} className="flex items-center justify-between p-3 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium" style={{ color: textPrimary }}>{integration.name}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: textSecondary }}>{integration.latency}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Escalation Status */}
          {roleConfig.showEscalations && (
            <div className="rounded-xl" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${borderColor}` }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)' }}>
                    <Bell size={17} className="text-high-500" />
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: textPrimary }}>Escalation Status</h3>
                </div>
                <Link to="/on-call/dashboard" className="text-xs font-medium flex items-center gap-1" style={{ color: '#3b82f6' }}>
                  Dashboard <ArrowRight size={13} />
                </Link>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'Active Policies', value: '5', color: '#10b981' },
                  { label: 'Pending Escalations', value: '2', color: '#f59e0b' },
                  { label: 'Escalation Levels', value: '12', color: '#3b82f6' },
                  { label: 'Avg Response Time', value: '4.2 min', color: '#8b5cf6' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-sm" style={{ color: textSecondary }}>{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: textPrimary }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Helpers ---

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// --- Sub-components ---

interface StatusItemProps {
  label: string;
  status: 'healthy' | 'warning' | 'critical';
}

const StatusItem = ({ label, status }: StatusItemProps) => {
  const colors = { healthy: '#10b981', warning: '#f59e0b', critical: '#ef4444' };
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: '#64748b' }}>
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: colors[status], boxShadow: `0 0 6px ${colors[status]}` }}
      />
      <span>{label}</span>
    </div>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const styles: Record<string, { bg: string; color: string }> = {
    critical: { bg: '#ef4444', color: '#fff' },
    high: { bg: '#f97316', color: '#fff' },
    medium: { bg: '#f59e0b', color: '#78350f' },
    low: { bg: '#3b82f6', color: '#fff' },
  };
  const style = styles[priority.toLowerCase()] || styles.medium;
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: style.bg, color: style.color }}>
      {priority}
    </span>
  );
};

// Role Badge - Shows the user's detected dashboard role
const RoleBadge = ({ role, isDark }: { role: UserRole; isDark: boolean }) => {
  const roleStyles: Record<UserRole, { bg: string; bgDark: string; color: string; icon: string }> = {
    executive: { bg: '#8b5cf6', bgDark: 'rgba(139, 92, 246, 0.2)', color: '#fff', icon: 'E' },
    manager: { bg: '#3b82f6', bgDark: 'rgba(59, 130, 246, 0.2)', color: '#fff', icon: 'M' },
    admin: { bg: '#ef4444', bgDark: 'rgba(239, 68, 68, 0.2)', color: '#fff', icon: 'A' },
    agent: { bg: '#10b981', bgDark: 'rgba(16, 185, 129, 0.2)', color: '#fff', icon: 'O' },
  };
  const style = roleStyles[role];
  const displayName = getRoleDisplayName(role);

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{
        background: isDark ? style.bgDark : style.bg,
        color: isDark ? style.bg : style.color,
        border: isDark ? `1px solid ${style.bg}` : 'none',
      }}
      title={`You are viewing the ${displayName} dashboard. Your dashboard is personalized based on your role.`}
    >
      <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: style.bg, color: '#fff' }}>
        {style.icon}
      </span>
      {displayName} View
    </span>
  );
};

interface HealthBarProps {
  label: string;
  value: number;
  isDark: boolean;
}

const HealthBar = ({ label, value, isDark }: HealthBarProps) => {
  const barColor = value >= 95 ? '#10b981' : value >= 80 ? '#f59e0b' : '#ef4444';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{label}</span>
        <span style={{ color: isDark ? '#fff' : '#0f172a' }} className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: barColor }} />
      </div>
    </div>
  );
};

// --- Chart Data ---

const getIncidentTrendsData = (isDark: boolean) => ({
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [
    {
      label: 'New Incidents',
      data: [12, 19, 15, 25, 22, 10, 8],
      borderColor: '#3b82f6',
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: isDark ? 'rgba(17,28,50,0.95)' : '#ffffff',
      pointBorderWidth: 2,
    },
    {
      label: 'Resolved',
      data: [8, 15, 18, 20, 28, 12, 10],
      borderColor: '#10b981',
      backgroundColor: 'transparent',
      tension: 0.4,
      borderDash: [5, 5],
      pointRadius: 0,
    },
  ],
});

const getChartOptions = (isDark: boolean) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      align: 'end' as const,
      labels: {
        color: isDark ? '#94a3b8' : '#64748b',
        font: { size: 11, weight: '500' as const },
        usePointStyle: true,
        padding: 20,
      },
    },
    tooltip: {
      backgroundColor: isDark ? 'rgba(17,28,50,0.95)' : '#ffffff',
      titleColor: isDark ? '#f8fafc' : '#0f172a',
      bodyColor: isDark ? '#94a3b8' : '#475569',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
      borderWidth: 1,
      padding: 14,
      cornerRadius: 10,
    },
  },
  scales: {
    y: {
      grid: { color: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', drawBorder: false },
      ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11 } },
    },
    x: {
      grid: { display: false },
      ticks: { color: isDark ? '#64748b' : '#94a3b8', font: { size: 11 } },
    },
  },
});

const getPriorityData = (isDark: boolean) => ({
  labels: ['Critical', 'High', 'Medium', 'Low'],
  datasets: [
    {
      data: [8, 15, 35, 42],
      backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6'],
      borderWidth: 0,
      hoverOffset: 6,
    },
  ],
});

const getDoughnutOptions = (isDark: boolean) => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '72%',
  plugins: {
    legend: {
      position: 'right' as const,
      labels: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 11 }, usePointStyle: true, padding: 14 },
    },
  },
});

// --- Fallback Mock Data ---
const recentIncidents = [
  { id: '1', number: 'INC0015847', title: 'Database connection pool exhausted', priority: 'Critical', status: 'In Progress' },
  { id: '2', number: 'INC0015846', title: 'API Gateway timeout on /payments endpoint', priority: 'High', status: 'New' },
  { id: '3', number: 'INC0015845', title: 'SSL certificate expiry warning - 7 days', priority: 'Medium', status: 'In Progress' },
  { id: '4', number: 'INC0015844', title: 'Slow query detected in user-service', priority: 'Low', status: 'Resolved' },
];

export default DashboardPage;
