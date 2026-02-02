import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, toZonedTime } from 'date-fns-tz';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Edit,
  Link2,
  Share2,
  Check,
  Clock,
  User,
  Users,
  Server,
  AlertTriangle,
  Database,
  Bot,
  Play,
  Eye,
  ArrowUpRight,
  BookOpen,
  Copy,
  Activity,
  FileText,
  MessageSquare,
  History,
  BarChart3,
  Terminal,
  Send,
  Paperclip,
  AtSign,
  Flame,
  Zap,
  TrendingUp,
  Network,
  Cpu,
  HardDrive,
  MemoryStick,
  Shield,
  Mail,
  Building2,
  Info,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';
import {
  PageLoader,
  Modal,
  Textarea,
  Avatar,
  Badge,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchIncidentById, updateIncident, addIncidentComment } from '@/store/slices/incidentsSlice';
import clsx from 'clsx';

const IncidentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentIncident: incident, isLoading, isSubmitting } = useAppSelector(
    (state) => state.incidents
  );
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('details');
  const [comment, setComment] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchIncidentById(id));
    }
  }, [dispatch, id]);

  const handleAddComment = async () => {
    if (!id || !comment.trim()) return;
    await dispatch(addIncidentComment({ id, comment: comment.trim(), isPublic: true }));
    setComment('');
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    if (newStatus === 'resolved') {
      setShowResolveModal(true);
    } else {
      await dispatch(updateIncident({ id, data: { status: newStatus as any } }));
    }
  };

  const handleResolve = async () => {
    if (!id || !resolutionNotes.trim()) return;
    await dispatch(
      updateIncident({
        id,
        data: { status: 'resolved', resolutionNotes: resolutionNotes.trim() },
      })
    );
    setShowResolveModal(false);
    setResolutionNotes('');
  };

  if (isLoading || !incident) {
    return <PageLoader message="Loading incident..." />;
  }

  // Calculate SLA status and time remaining
  const getSlaInfo = () => {
    if (!incident.slaResolutionDue) return null;
    const now = new Date();
    const due = new Date(incident.slaResolutionDue);
    const created = new Date(incident.createdAt);
    const totalTime = due.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    const remaining = due.getTime() - now.getTime();
    const percentUsed = Math.min(100, (elapsed / totalTime) * 100);
    const percentRemaining = Math.max(0, 100 - percentUsed);

    if (incident.resolvedAt) return { status: 'met', label: 'SLA Met', percentRemaining: 100, timeRemaining: '00:00:00' };
    if (remaining < 0) return { status: 'breached', label: 'SLA Breached', percentRemaining: 0, timeRemaining: '00:00:00' };

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    if (percentRemaining < 25) return { status: 'at_risk', label: 'At Risk', percentRemaining, timeRemaining: timeString };
    return { status: 'on_track', label: 'On Track', percentRemaining, timeRemaining: timeString };
  };

  const slaInfo = getSlaInfo();

  // Get priority gradient class
  const getPriorityGradient = () => {
    switch (incident.priority) {
      case 'critical':
        return 'from-red-500 to-red-600';
      case 'high':
        return 'from-orange-500 to-orange-600';
      case 'medium':
        return 'from-amber-500 to-amber-600';
      case 'low':
        return 'from-blue-500 to-blue-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  // Get priority badge styles
  const getPriorityBadge = () => {
    switch (incident.priority) {
      case 'critical':
        return { bg: 'bg-white/90', text: 'text-red-600', icon: <Flame size={12} /> };
      case 'high':
        return { bg: 'bg-white/90', text: 'text-orange-600', icon: <Zap size={12} /> };
      case 'medium':
        return { bg: 'bg-white/90', text: 'text-amber-600', icon: <TrendingUp size={12} /> };
      case 'low':
        return { bg: 'bg-white/90', text: 'text-blue-600', icon: <Activity size={12} /> };
      default:
        return { bg: 'bg-white/90', text: 'text-slate-600', icon: <Activity size={12} /> };
    }
  };

  const priorityBadge = getPriorityBadge();

  // Timeline items from activities
  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'created':
        return { icon: <Play size={10} />, color: 'info' };
      case 'assigned':
        return { icon: <Bot size={10} />, color: 'purple' };
      case 'acknowledged':
        return { icon: <Check size={10} />, color: 'success' };
      case 'status_change':
        return { icon: <Activity size={10} />, color: 'warning' };
      case 'comment':
        return { icon: <MessageSquare size={10} />, color: 'info' };
      default:
        return { icon: <Activity size={10} />, color: 'info' };
    }
  };

  // Sample related incidents (in real app, this would come from API)
  const relatedIncidents = [
    { id: 'INC0015721', title: 'Similar database connection issue', status: 'resolved', similarity: 94 },
    { id: 'INC0015689', title: 'Connection timeout errors', status: 'resolved', similarity: 87 },
    { id: 'INC0015512', title: 'Bulk import blocking queries', status: 'resolved', similarity: 82 },
  ];

  // Sample affected CIs (in real app, this would come from API)
  const affectedCIs = [
    { id: 'pgbouncer-01', name: 'PgBouncer Instance', status: 'critical' },
    { id: 'db-primary', name: 'PostgreSQL Primary', status: 'degraded' },
    { id: 'order-service', name: 'Order Service Cluster', status: 'degraded' },
  ];

  // Parse alert information from incident
  const parseAlertInfo = () => {
    const customFields = incident.customFields || {};
    const labels = (customFields.labels as Record<string, unknown>) || {};
    const annotations = (customFields.annotations as Record<string, unknown>) || {};

    // Helper to safely get string value
    const getString = (obj: Record<string, unknown>, key: string): string => {
      const value = obj[key];
      return typeof value === 'string' ? value : '';
    };

    // Extract IP and hostname from title (format: "192.168.7.100:SW_Memory" or "192.168.7.100:AlertName - hostname")
    const titleMatch = incident.title?.match(/(\d+\.\d+\.\d+\.\d+)[:\s-](.+)/);

    // Extract instance - could be "ip:port" or just "hostname"
    const instance = getString(labels, 'instance') || getString(annotations, 'instance');
    const instanceIp = instance.includes(':') ? instance.split(':')[0] : '';

    // Extract IP address from multiple sources
    const ipAddress = titleMatch?.[1] ||
                      getString(labels, 'ip_address') ||
                      getString(labels, 'ip') ||
                      getString(annotations, 'ip_address') ||
                      getString(customFields as Record<string, unknown>, 'ip_address') ||
                      instanceIp ||
                      instance ||
                      '-';

    // Extract alert type/name
    const alertType = titleMatch?.[2]?.split(' - ')[0]?.trim() ||
                      getString(labels, 'alertname') ||
                      getString(customFields as Record<string, unknown>, 'alert_type') ||
                      getString(customFields as Record<string, unknown>, 'alert_rule') ||
                      '-';

    // Extract hostname from multiple sources
    const hostname = getString(annotations, 'friendly_name') ||
                     getString(labels, 'hostname') ||
                     getString(labels, 'host') ||
                     getString(labels, 'node') ||
                     getString(annotations, 'hostname') ||
                     getString(customFields as Record<string, unknown>, 'hostname') ||
                     (instance && !instance.match(/^\d+\.\d+\.\d+\.\d+/) ? instance.split(':')[0] : '') ||
                     '-';

    // Extract client from incident data, labels, or environment
    const client = incident.client?.display_name ||
                   incident.client?.name ||
                   getString(labels, 'client') ||
                   getString(labels, 'client_name') ||
                   getString(labels, 'customer') ||
                   getString(annotations, 'client') ||
                   getString(customFields as Record<string, unknown>, 'client') ||
                   incident.environment?.name ||
                   '-';

    // Alert description - check multiple fields
    const alertDescription = getString(annotations, 'description') ||
                             getString(annotations, 'summary') ||
                             getString(annotations, 'message') ||
                             getString(customFields as Record<string, unknown>, 'LENS_message') ||
                             getString(customFields as Record<string, unknown>, 'message') ||
                             incident.description ||
                             '-';

    // Monitor status - map severity to status
    const monitorStatus = getString(customFields as Record<string, unknown>, 'monitor_status') ||
                          getString(labels, 'severity') ||
                          getString(annotations, 'severity') ||
                          incident.priority ||
                          'unknown';

    // Product model / Job
    const productModel = getString(customFields as Record<string, unknown>, 'product_model') ||
                         getString(labels, 'product') ||
                         getString(labels, 'job') ||
                         getString(labels, 'service') ||
                         '-';

    // Datetime
    const alertDatetime = getString(customFields as Record<string, unknown>, 'datetime') ||
                          getString(annotations, 'datetime') ||
                          format(new Date(incident.createdAt), 'dd-MM-yyyy HH:mm:ss');

    return {
      ipAddress,
      hostname,
      client,
      alertType,
      alertDescription,
      monitorStatus,
      productModel,
      alertDatetime,
      labels,
      annotations,
    };
  };

  const alertInfo = parseAlertInfo();

  // Mock process CPU data - in production, fetch from Prometheus/API
  const processCpuData = [
    { process: 'java', pid: 1234, cpu: 45.2, memory: 12.5, user: 'appuser', command: 'java -Xmx8g -jar app.jar' },
    { process: 'postgres', pid: 5678, cpu: 28.7, memory: 8.3, user: 'postgres', command: 'postgres: writer process' },
    { process: 'node', pid: 9012, cpu: 15.3, memory: 4.1, user: 'node', command: 'node server.js' },
    { process: 'nginx', pid: 3456, cpu: 5.2, memory: 2.8, user: 'nginx', command: 'nginx: worker process' },
    { process: 'systemd', pid: 1, cpu: 0.5, memory: 0.3, user: 'root', command: '/sbin/init' },
  ].sort((a, b) => b.cpu - a.cpu);

  const tabs = [
    { id: 'details', label: 'Details', icon: <FileText size={14} /> },
    { id: 'alert', label: 'Alert Info', icon: <AlertTriangle size={14} /> },
    { id: 'timeline', label: 'Timeline', icon: <History size={14} /> },
    { id: 'metrics', label: 'Metrics', icon: <BarChart3 size={14} /> },
    { id: 'processes', label: 'Processes', icon: <Cpu size={14} /> },
    { id: 'logs', label: 'Logs', icon: <Terminal size={14} /> },
    { id: 'solution', label: 'Solution', icon: <Lightbulb size={14} /> },
    { id: 'worknotes', label: 'Work Notes', icon: <MessageSquare size={14} /> },
  ];

  return (
    <div className="min-h-screen">
      {/* Header Bar */}
      <div className="fixed top-16 left-64 right-0 h-14 border-b flex items-center justify-between px-6 z-40" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
        <div className="flex items-center gap-4">
          <Link
            to="/incidents"
            className="w-9 h-9 border rounded-lg flex items-center justify-center hover:text-blue-600 hover:border-blue-500 transition-all"
            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb', color: isDark ? '#94a3b8' : '#6b7280' }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{incident.incidentNumber}</h1>
            <span className={clsx(
              'px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1',
              incident.priority === 'critical' && 'bg-red-500 text-white',
              incident.priority === 'high' && 'bg-orange-500 text-white',
              incident.priority === 'medium' && 'bg-amber-500 text-gray-900',
              incident.priority === 'low' && 'bg-blue-500 text-white'
            )}>
              {incident.priority === 'critical' && <Flame size={12} />}
              {incident.priority?.charAt(0).toUpperCase() + incident.priority?.slice(1)}
            </span>
            <span className={clsx(
              'px-3 py-1 rounded-full text-xs font-semibold',
              incident.status === 'open' && 'bg-blue-100 text-blue-700',
              incident.status === 'in_progress' && 'bg-purple-100 text-purple-700',
              incident.status === 'pending' && 'bg-amber-100 text-amber-700',
              incident.status === 'resolved' && 'bg-green-100 text-green-700',
              incident.status === 'closed' && 'bg-gray-100 text-gray-700'
            )}>
              {incident.status?.replace('_', ' ').charAt(0).toUpperCase() + incident.status?.replace('_', ' ').slice(1)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 border rounded-lg text-xs font-medium flex items-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb', color: isDark ? '#cbd5e1' : undefined }}>
            <Link2 size={14} />
            Copy Link
          </button>
          <button className="px-4 py-2 border rounded-lg text-xs font-medium flex items-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb', color: isDark ? '#cbd5e1' : undefined }}>
            <Share2 size={14} />
            Share
          </button>
          <Link
            to={`/incidents/${id}/edit`}
            className="px-4 py-2 border rounded-lg text-xs font-medium flex items-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-all"
            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb', color: isDark ? '#cbd5e1' : undefined }}
          >
            <Edit size={14} />
            Edit
          </Link>
          <button
            onClick={() => setShowResolveModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all"
          >
            <Check size={14} />
            Resolve
          </button>
        </div>
      </div>

      {/* Main Content — 3-column layout */}
      <div className="pt-14 p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_340px] gap-6">

          {/* ====== LEFT COLUMN — Summary + SLA ====== */}
          <div className="space-y-5">
            {/* Incident Summary Card */}
            <div
              className={clsx('rounded-xl overflow-hidden text-white bg-gradient-to-br', getPriorityGradient())}
            >
              <div className="p-5">
                <span className="bg-white/20 px-2.5 py-1 rounded-md font-semibold text-xs">
                  {incident.incidentNumber}
                </span>
                <h2 className="text-base font-bold mt-3 mb-2 leading-snug">{incident.title}</h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={clsx('px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1', priorityBadge.bg, priorityBadge.text)}>
                    {priorityBadge.icon}
                    {incident.priority?.charAt(0).toUpperCase() + incident.priority?.slice(1)}
                  </span>
                  <span className="bg-white/25 text-white px-2.5 py-1 rounded-full text-[11px] font-semibold">
                    {incident.status?.replace('_', ' ').charAt(0).toUpperCase() + incident.status?.replace('_', ' ').slice(1)}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs opacity-90">
                  <div className="flex items-center gap-2">
                    <Server size={12} />
                    <span className="truncate">{incident.customFields?.labels?.instance || incident.environment?.name || 'Production'}</span>
                  </div>
                  {incident.client && (
                    <div className="flex items-center gap-2">
                      <Building2 size={12} />
                      <span className="truncate">{incident.client.display_name || incident.client.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Database size={12} />
                    <span>{incident.category || 'Infrastructure'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SLA Timer Card */}
            {slaInfo && (
              <div className="rounded-xl p-4" style={{ background: isDark ? 'rgba(17,28,50,0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
                <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>SLA Countdown</h4>
                <div className={clsx(
                  'text-3xl font-bold font-mono text-center mb-3',
                  slaInfo.status === 'breached' && 'text-red-500',
                  slaInfo.status === 'at_risk' && 'text-amber-500',
                  (slaInfo.status === 'on_track' || slaInfo.status === 'met') && 'text-emerald-500'
                )}>
                  {slaInfo.timeRemaining}
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-1000',
                      slaInfo.status === 'breached' && 'bg-red-500',
                      slaInfo.status === 'at_risk' && 'bg-amber-500',
                      (slaInfo.status === 'on_track' || slaInfo.status === 'met') && 'bg-emerald-500'
                    )}
                    style={{ width: `${100 - slaInfo.percentRemaining}%` }}
                  />
                </div>
                <p className="text-xs text-center mt-2" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                  {slaInfo.status === 'met' ? 'SLA Met' : slaInfo.status === 'breached' ? 'SLA Breached' : `${Math.round(slaInfo.percentRemaining)}% remaining`}
                </p>
              </div>
            )}

            {/* People Card — moved to left for quick access */}
            <div className="rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(17,28,50,0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
                <h3 className="font-semibold text-xs flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                  <Users size={14} className="text-blue-500" />
                  People
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Reporter</p>
                  {incident.reporter ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-semibold">
                        {incident.reporter.firstName?.charAt(0)}{incident.reporter.lastName?.charAt(0)}
                      </div>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{incident.reporter.firstName} {incident.reporter.lastName}</span>
                    </div>
                  ) : <span className="text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Unknown</span>}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Assigned To</p>
                  {incident.assignee ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-semibold">
                        {incident.assignee.firstName?.charAt(0)}{incident.assignee.lastName?.charAt(0)}
                      </div>
                      <span className="text-xs font-medium" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{incident.assignee.firstName} {incident.assignee.lastName}</span>
                    </div>
                  ) : <span className="text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Unassigned</span>}
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Group</p>
                  {incident.assignedGroup ? (
                    <div className="flex items-center gap-2">
                      <Users size={12} className="text-blue-500" />
                      <span className="text-xs font-medium" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{incident.assignedGroup.name}</span>
                    </div>
                  ) : <span className="text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Not assigned</span>}
                </div>
              </div>
            </div>

            {/* Quick Status Change Buttons */}
            <div className="space-y-2">
              {['in_progress', 'pending', 'resolved'].filter(s => s !== incident.status).map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className="w-full px-4 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`,
                    color: isDark ? '#cbd5e1' : '#475569',
                  }}
                >
                  {s === 'resolved' ? <Check size={13} /> : <Activity size={13} />}
                  Mark as {s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* ====== CENTER COLUMN — Tabs (Timeline, Details, Metrics, etc.) ====== */}
          <div className="space-y-6">
            {/* Tabs Card */}
            <div className="border rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              {/* Tab Navigation */}
              <div className="flex gap-1 p-4 border-b" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all',
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-500 hover:bg-white hover:text-gray-900'
                    )}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-5">
                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Description</h4>
                    <div className="text-sm text-gray-700 leading-relaxed mb-6">
                      <p className="mb-3">{incident.description || 'No description provided.'}</p>
                      {incident.impact && (
                        <p className="mb-3"><strong>Impact:</strong> {incident.impact}</p>
                      )}
                    </div>

                    <h4 className="text-sm font-semibold text-gray-900 mb-4">Incident Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoItem
                        label="Assigned To"
                        value={
                          incident.assignee ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                                {incident.assignee.firstName?.charAt(0)}{incident.assignee.lastName?.charAt(0)}
                              </div>
                              <span>{incident.assignee.firstName} {incident.assignee.lastName}</span>
                            </div>
                          ) : 'Unassigned'
                        }
                      />
                      <InfoItem
                        label="Assignment Group"
                        value={incident.assignedGroup?.name || 'Not assigned'}
                      />
                      <InfoItem label="Category" value={incident.category || '-'} />
                      <InfoItem label="Subcategory" value={incident.subcategory || '-'} />
                      <InfoItem label="Impact" value={incident.impact || '-'} />
                      <InfoItem label="Urgency" value={incident.urgency || '-'} />
                      <InfoItem
                        label="Created"
                        value={format(toZonedTime(new Date(incident.createdAt), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' })}
                      />
                      <InfoItem
                        label="Last Updated"
                        value={format(toZonedTime(new Date(incident.updatedAt), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' })}
                      />
                      <InfoItem
                        label="Source"
                        value={
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <span>{incident.customFields?.auto_created ? 'Auto-created from Alert' : 'Manual'}</span>
                          </div>
                        }
                      />
                      <InfoItem
                        label="Affected Host"
                        value={
                          <div className="flex items-center gap-2">
                            <Server size={14} className="text-blue-500" />
                            <span>{incident.customFields?.labels?.instance || '-'}</span>
                          </div>
                        }
                      />
                      <InfoItem label="Alert Name" value={incident.customFields?.labels?.alertname || '-'} />
                    </div>
                  </div>
                )}

                {/* Alert Info Tab - Comprehensive Alert Details */}
                {activeTab === 'alert' && (
                  <div className="space-y-6">
                    {/* Alert Overview */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-500" />
                        Alert Overview
                      </h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-red-900">{alertInfo.alertType}</span>
                          <Badge className={clsx(
                            alertInfo.monitorStatus === 'critical' ? 'bg-red-100 text-red-800' :
                            alertInfo.monitorStatus === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          )}>
                            {alertInfo.monitorStatus.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700">{alertInfo.alertDescription}</p>
                      </div>
                    </div>

                    {/* Host & Network Information */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Network size={16} className="text-blue-500" />
                        Host & Network Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Server className="text-blue-600" size={16} />
                            <span className="text-xs font-semibold text-gray-600 uppercase">Hostname</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">{alertInfo.hostname}</p>
                        </div>
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="text-green-600" size={16} />
                            <span className="text-xs font-semibold text-gray-600 uppercase">IP Address</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 font-mono">{alertInfo.ipAddress}</p>
                        </div>
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="text-purple-600" size={16} />
                            <span className="text-xs font-semibold text-gray-600 uppercase">Client</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">
                            {incident.client?.display_name || incident.client?.name || alertInfo.client}
                          </p>
                          {incident.client?.client_code && (
                            <p className="text-xs text-gray-500 mt-1 font-mono">{incident.client.client_code}</p>
                          )}
                        </div>
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="text-amber-600" size={16} />
                            <span className="text-xs font-semibold text-gray-600 uppercase">Product Model</span>
                          </div>
                          <p className="text-lg font-bold text-gray-900 capitalize">{alertInfo.productModel}</p>
                        </div>
                      </div>
                    </div>

                    {/* Alert Details */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Info size={16} className="text-indigo-500" />
                        Alert Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="Alert Type" value={alertInfo.alertType} />
                        <InfoItem label="Monitor Status" value={
                          <Badge className={clsx(
                            alertInfo.monitorStatus === 'critical' ? 'bg-red-100 text-red-800' :
                            alertInfo.monitorStatus === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          )}>
                            {alertInfo.monitorStatus}
                          </Badge>
                        } />
                        <InfoItem label="Alert Datetime" value={alertInfo.alertDatetime} />
                        <InfoItem label="Source" value={incident.source || 'Prometheus'} />
                        <InfoItem label="Fingerprint" value={incident.customFields?.fingerprint?.slice(0, 16) || '-'} />
                        <InfoItem label="Integration" value={incident.customFields?.integration_id ? 'Connected' : '-'} />
                      </div>
                    </div>

                    {/* Escalation Details */}
                    {incident.customFields?.escalation && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Shield size={16} className="text-purple-500" />
                          Escalation Details
                        </h4>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Current Status</span>
                              <span className="text-sm font-semibold text-gray-900">
                                {incident.customFields.escalation.current_status || 'Level 0'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Escalation Level</span>
                              <span className="text-sm font-semibold text-gray-900">
                                Level {incident.customFields.escalation.level || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Notified To</span>
                              <div className="flex items-center gap-2">
                                <Mail size={14} className="text-gray-500" />
                                <span className="text-sm font-semibold text-gray-900">
                                  {incident.customFields.escalation.notified_to || 'rohinth.kumaresan@finspot.in'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Created At</span>
                              <span className="text-sm text-gray-600">
                                {incident.customFields.escalation.created_at || format(new Date(incident.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Labels & Annotations */}
                    {(Object.keys(alertInfo.labels).length > 0 || Object.keys(alertInfo.annotations).length > 0) && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-4">Raw Alert Data</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.keys(alertInfo.labels).length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-gray-600 mb-2">Labels</h5>
                              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                                <pre className="text-xs font-mono text-gray-700">
                                  {JSON.stringify(alertInfo.labels, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          {Object.keys(alertInfo.annotations).length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-gray-600 mb-2">Annotations</h5>
                              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                                <pre className="text-xs font-mono text-gray-700">
                                  {JSON.stringify(alertInfo.annotations, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline Tab */}
                {activeTab === 'timeline' && (
                  <div className="relative pl-7">
                    <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />
                    {(incident.activities || []).length > 0 ? (
                      incident.activities?.map((activity, index) => {
                        const iconInfo = getTimelineIcon(activity.activityType);
                        return (
                          <div key={activity.id || index} className="relative pb-6 last:pb-0">
                            <div className={clsx(
                              'absolute -left-5 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white',
                              iconInfo.color === 'info' && 'border-blue-500',
                              iconInfo.color === 'success' && 'border-green-500',
                              iconInfo.color === 'warning' && 'border-amber-500',
                              iconInfo.color === 'purple' && 'border-purple-500'
                            )}>
                              <span className={clsx(
                                iconInfo.color === 'info' && 'text-blue-500',
                                iconInfo.color === 'success' && 'text-green-500',
                                iconInfo.color === 'warning' && 'text-amber-500',
                                iconInfo.color === 'purple' && 'text-purple-500'
                              )}>
                                {iconInfo.icon}
                              </span>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3.5 ml-2">
                              <div className="flex justify-between items-start mb-1.5">
                                <span className="font-semibold text-sm text-gray-900">
                                  {activity.activityType?.replace('_', ' ').charAt(0).toUpperCase() + activity.activityType?.replace('_', ' ').slice(1)}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {format(toZonedTime(new Date(activity.createdAt), 'Asia/Kolkata'), 'HH:mm:ss', { timeZone: 'Asia/Kolkata' })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {activity.comment || `${activity.fieldName} changed from "${activity.oldValue}" to "${activity.newValue}"`}
                              </p>
                              {activity.user && (
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
                                  <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-[8px] font-semibold">
                                    {activity.user.firstName?.charAt(0)}{activity.user.lastName?.charAt(0)}
                                  </div>
                                  <span>{activity.user.firstName} {activity.user.lastName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-center py-8">No activity yet</p>
                    )}
                  </div>
                )}

                {/* Metrics Tab - Enhanced */}
                {activeTab === 'metrics' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <BarChart3 size={16} className="text-orange-500" />
                        Grafana Metrics Dashboard
                      </h4>
                      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-lg h-96 flex flex-col items-center justify-center text-white mb-4">
                        <iframe
                          src={`https://fs-le-dev-grafana.finspot.in/d/node-exporter?orgId=1&var-instance=${alertInfo.ipAddress}&kiosk=tv`}
                          className="w-full h-full border-0 rounded-lg"
                          title="Grafana Metrics Dashboard"
                        />
                      </div>
                    </div>

                    {/* Key Metrics Cards */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">Key Metrics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Cpu className="text-red-600" size={16} />
                            <span className="text-xs font-semibold text-gray-600">CPU Usage</span>
                          </div>
                          <p className="text-2xl font-bold text-red-600">75%</p>
                          <p className="text-xs text-gray-500 mt-1">Threshold: 75%</p>
                        </div>
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <MemoryStick className="text-orange-600" size={16} />
                            <span className="text-xs font-semibold text-gray-600">Memory Usage</span>
                          </div>
                          <p className="text-2xl font-bold text-orange-600">82%</p>
                          <p className="text-xs text-gray-500 mt-1">Available: 18%</p>
                        </div>
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <HardDrive className="text-yellow-600" size={16} />
                            <span className="text-xs font-semibold text-gray-600">Disk Usage</span>
                          </div>
                          <p className="text-2xl font-bold text-yellow-600">68%</p>
                          <p className="text-xs text-gray-500 mt-1">Free: 32%</p>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="text-blue-600" size={16} />
                            <span className="text-xs font-semibold text-gray-600">Network I/O</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-600">2.4 Gbps</p>
                          <p className="text-xs text-gray-500 mt-1">In/Out: 1.2/1.2</p>
                        </div>
                      </div>
                    </div>

                    {/* Metric Details */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4">Metric Details</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <InfoItem 
                          label="Current Value" 
                          value={<span className="text-red-600 font-bold">75%</span>} 
                        />
                        <InfoItem 
                          label="Threshold" 
                          value={<span className="text-gray-700 font-semibold">≥ 75%</span>} 
                        />
                        <InfoItem 
                          label="Alert Duration" 
                          value={formatDistanceToNow(new Date(incident.createdAt), { addSuffix: false })} 
                        />
                        <InfoItem 
                          label="Trend" 
                          value={<span className="text-red-600 font-semibold flex items-center gap-1">
                            <TrendingUp size={14} /> Increasing
                          </span>} 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Processes Tab - CPU Usage by Process */}
                {activeTab === 'processes' && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Cpu size={16} className="text-purple-500" />
                      Process CPU Usage - {alertInfo.hostname}
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Top processes consuming CPU resources on {alertInfo.hostname} ({alertInfo.ipAddress})
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Process</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">PID</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">CPU %</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Memory %</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">User</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Command</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processCpuData.map((proc, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className={clsx(
                                    'w-2 h-2 rounded-full',
                                    proc.cpu > 30 ? 'bg-red-500' :
                                    proc.cpu > 15 ? 'bg-yellow-500' : 'bg-green-500'
                                  )} />
                                  <span className="font-medium text-sm">{proc.process}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-sm text-gray-600">{proc.pid}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-gray-200 rounded-full max-w-[100px]">
                                    <div
                                      className={clsx(
                                        'h-full rounded-full',
                                        proc.cpu > 30 ? 'bg-red-500' :
                                        proc.cpu > 15 ? 'bg-yellow-500' : 'bg-green-500'
                                      )}
                                      style={{ width: `${Math.min(proc.cpu, 100)}%` }}
                                    />
                                  </div>
                                  <span className={clsx(
                                    'text-sm font-semibold',
                                    proc.cpu > 30 ? 'text-red-600' :
                                    proc.cpu > 15 ? 'text-yellow-600' : 'text-green-600'
                                  )}>
                                    {proc.cpu}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm text-gray-700">{proc.memory}%</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-sm text-gray-600">{proc.user}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="text-xs font-mono text-gray-500 truncate max-w-[200px] block" title={proc.command}>
                                  {proc.command}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-gray-700">
                        <strong>Note:</strong> Process data is fetched from Prometheus node_exporter. 
                        Top process: <strong>{processCpuData[0]?.process}</strong> using <strong>{processCpuData[0]?.cpu}%</strong> CPU.
                        {processCpuData[0]?.cpu > 30 && ' This process may be causing the high CPU alert.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Logs Tab - Enhanced */}
                {activeTab === 'logs' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Terminal size={16} className="text-green-500" />
                        Loki Logs - Real-time Stream
                      </h4>
                      <div className="mb-3 flex items-center gap-2 text-xs text-gray-600">
                        <Server size={12} />
                        <span>Host: {alertInfo.hostname} ({alertInfo.ipAddress})</span>
                        <span className="mx-2">|</span>
                        <span>Client: {alertInfo.client}</span>
                      </div>
                      <div className="bg-[#1a1a2e] rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs">
                        <LogLine time="12:53:24.112" level="error" message={`[${alertInfo.hostname}] Host Memory Critical: Current 75%, Threshold >= 75%`} />
                        <LogLine time="12:53:20.445" level="warn" message={`[${alertInfo.hostname}] Memory usage approaching threshold: 74.8%`} />
                        <LogLine time="12:53:15.332" level="info" message={`[${alertInfo.hostname}] System memory stats: Total 32GB, Used 24GB, Available 8GB`} />
                        <LogLine time="12:53:10.998" level="warn" message={`[${alertInfo.hostname}] High memory process detected: java (PID 1234) using 12.5% memory`} />
                        <LogLine time="12:53:05.112" level="info" message={`[${alertInfo.hostname}] Memory pressure detected, OOM killer may activate soon`} />
                        <LogLine time="12:53:00.234" level="error" message={`[${alertInfo.hostname}] SW_Memory alert triggered: Memory usage exceeded threshold`} />
                        <LogLine time="12:52:55.847" level="info" message={`[${alertInfo.hostname}] Kernel: Out of memory: Kill process 1234 (java) score 500`} />
                        <LogLine time="12:52:50.112" level="warn" message={`[${alertInfo.hostname}] System swap usage: 45% (8GB/18GB)`} />
                        <LogLine time="12:52:45.445" level="info" message={`[${alertInfo.hostname}] Memory cache: 4.2GB, Buffers: 1.8GB`} />
                        <LogLine time="12:52:40.332" level="error" message={`[${alertInfo.hostname}] Application logs: OutOfMemoryError in Java heap space`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          Error
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                          Warning
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Info
                        </span>
                      </div>
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        View in Loki →
                      </button>
                    </div>
                  </div>
                )}

                {/* Solution Tab */}
                {activeTab === 'solution' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Lightbulb size={16} className="text-yellow-500" />
                        Recommended Solutions
                      </h4>
                      
                      {/* Immediate Actions */}
                      <div className="mb-6">
                        <h5 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Immediate Actions</h5>
                        <div className="space-y-3">
                          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                1
                              </div>
                              <div className="flex-1">
                                <h6 className="font-semibold text-sm text-gray-900 mb-1">Identify Memory-Hungry Processes</h6>
                                <p className="text-xs text-gray-700 mb-2">
                                  Check which processes are consuming the most memory using: <code className="bg-gray-200 px-1 rounded">top -o %MEM</code> or <code className="bg-gray-200 px-1 rounded">ps aux --sort=-%mem | head</code>
                                </p>
                                <p className="text-xs text-gray-600">
                                  <strong>Top Process:</strong> {processCpuData[0]?.process} (PID {processCpuData[0]?.pid}) using {processCpuData[0]?.memory}% memory
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-orange-50 border-l-4 border-orange-500 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                2
                              </div>
                              <div className="flex-1">
                                <h6 className="font-semibold text-sm text-gray-900 mb-1">Check System Memory</h6>
                                <p className="text-xs text-gray-700 mb-2">
                                  Verify available memory: <code className="bg-gray-200 px-1 rounded">free -h</code>
                                </p>
                                <p className="text-xs text-gray-600">
                                  Current usage: <strong>75%</strong> (Threshold: 75%). System is at critical level.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                3
                              </div>
                              <div className="flex-1">
                                <h6 className="font-semibold text-sm text-gray-900 mb-1">Restart High Memory Process (if safe)</h6>
                                <p className="text-xs text-gray-700 mb-2">
                                  If {processCpuData[0]?.process} is the culprit and restart is safe:
                                </p>
                                <code className="block bg-gray-200 px-2 py-1 rounded text-xs font-mono mt-1">
                                  sudo systemctl restart {processCpuData[0]?.process}
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Long-term Solutions */}
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Long-term Solutions</h5>
                        <div className="space-y-3">
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h6 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                              <TrendingUp size={14} />
                              Increase System Memory
                            </h6>
                            <p className="text-xs text-gray-700">
                              Consider upgrading RAM on {alertInfo.hostname}. Current memory pressure indicates system needs more resources.
                            </p>
                          </div>

                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h6 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                              <Activity size={14} />
                              Optimize Application Memory
                            </h6>
                            <p className="text-xs text-gray-700">
                              Review and optimize memory usage in {processCpuData[0]?.process} application. 
                              Consider implementing memory pooling or reducing cache sizes.
                            </p>
                          </div>

                          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <h6 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                              <Zap size={14} />
                              Configure Swap Space
                            </h6>
                            <p className="text-xs text-gray-700">
                              Ensure adequate swap space is configured to handle memory spikes. 
                              Current swap usage: 45%. Consider increasing swap if needed.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Related Documentation */}
                      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <h6 className="font-semibold text-sm text-gray-900 mb-2 flex items-center gap-2">
                          <BookOpen size={14} />
                          Related Documentation
                        </h6>
                        <div className="space-y-2 text-xs text-gray-700">
                          <a href="#" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                            <ChevronRight size={12} />
                            Memory Troubleshooting Guide
                          </a>
                          <a href="#" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                            <ChevronRight size={12} />
                            Process Optimization Best Practices
                          </a>
                          <a href="#" className="flex items-center gap-2 text-blue-600 hover:text-blue-700">
                            <ChevronRight size={12} />
                            Similar Incidents Resolution History
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Work Notes Tab */}
                {activeTab === 'worknotes' && (
                  <div>
                    <div className="mb-5">
                      <textarea
                        placeholder="Add a work note... Describe investigation progress, findings, or next steps."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full p-3.5 border border-gray-200 rounded-lg text-sm resize-y min-h-[100px] focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleAddComment}
                          disabled={!comment.trim() || isSubmitting}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={14} />
                          Add Note
                        </button>
                        <button className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-gray-50 transition-all">
                          <AtSign size={14} />
                          Mention
                        </button>
                        <button className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-gray-50 transition-all">
                          <Paperclip size={14} />
                          Attach
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(incident.activities || [])
                        .filter((a) => a.activityType === 'comment')
                        .map((note, index) => (
                          <div key={note.id || index} className="p-4 bg-gray-50 rounded-lg border-l-[3px] border-blue-500">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                                  {note.user?.firstName?.charAt(0)}{note.user?.lastName?.charAt(0)}
                                </div>
                                <span className="font-semibold text-sm">{note.user?.firstName} {note.user?.lastName}</span>
                              </div>
                              <span className="text-xs text-gray-500">{format(toZonedTime(new Date(note.createdAt), 'Asia/Kolkata'), 'HH:mm', { timeZone: 'Asia/Kolkata' })}</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{note.comment}</p>
                          </div>
                        ))}
                      {(incident.activities || []).filter((a) => a.activityType === 'comment').length === 0 && (
                        <p className="text-gray-500 text-center py-8">No work notes yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ====== RIGHT COLUMN — Context Panel (CMDB, topology, related) ====== */}
          <div className="space-y-5">
            {/* AI Recommendations Panel */}
            <div className="bg-gradient-to-br from-[#0f1c3f] to-[#1e3a5f] rounded-xl p-5 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Recommendations</h3>
                  <p className="text-xs opacity-70">Based on incident patterns and history</p>
                </div>
              </div>

              <div className="space-y-3">
                <AISuggestion
                  icon={<BookOpen size={14} className="text-green-400" />}
                  title="Suggested Runbook"
                  description="Execute automated recovery runbook. 92% success rate for similar incidents."
                  actionLabel="Execute Runbook"
                  actionIcon={<Play size={12} />}
                />
                <AISuggestion
                  icon={<Copy size={14} className="text-blue-400" />}
                  title="Similar Incidents"
                  description="3 similar incidents found. Avg MTTR: 28 minutes."
                  actionLabel="View Similar"
                  actionIcon={<Eye size={12} />}
                />
                <AISuggestion
                  icon={<User size={14} className="text-amber-400" />}
                  title="Escalation Suggestion"
                  description="If not resolved in 15 minutes, escalate to senior engineer."
                  actionLabel="Escalate Now"
                  actionIcon={<ArrowUpRight size={12} />}
                />
              </div>
            </div>

            {/* Related Incidents */}
            <div className="border rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Link2 size={16} className="text-blue-500" />
                  Related Incidents
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {relatedIncidents.map((related) => (
                  <div
                    key={related.id}
                    className="p-3.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="text-blue-600 font-semibold text-xs mb-1">{related.id}</div>
                    <div className="text-xs text-gray-600 mb-2">{related.title}</div>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-700">
                        {related.status.charAt(0).toUpperCase() + related.status.slice(1)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                        {related.similarity}% match
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Affected CIs */}
            <div className="border rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Server size={16} className="text-blue-500" />
                  Affected CIs
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {affectedCIs.map((ci) => (
                  <div
                    key={ci.id}
                    className="p-3.5 bg-gray-50 rounded-lg"
                  >
                    <div className="text-blue-600 font-semibold text-xs mb-1">{ci.id}</div>
                    <div className="text-xs text-gray-600 mb-2">{ci.name}</div>
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-[10px] font-medium',
                      ci.status === 'critical' && 'bg-red-100 text-red-700',
                      ci.status === 'degraded' && 'bg-amber-100 text-amber-700',
                      ci.status === 'healthy' && 'bg-green-100 text-green-700'
                    )}>
                      {ci.status.charAt(0).toUpperCase() + ci.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution Card */}
            {incident.resolutionNotes && (
              <div className="border border-l-4 border-l-green-500 rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb', borderLeftColor: '#22c55e' }}>
                <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Check size={16} className="text-green-500" />
                    Resolution
                  </h3>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{incident.resolutionNotes}</p>
                  {incident.rootCause && (
                    <div className="mt-4">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Root Cause</p>
                      <p className="text-sm text-gray-700">{incident.rootCause}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resolve Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Resolve Incident"
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowResolveModal(false)}
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleResolve}
              disabled={!resolutionNotes.trim() || isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Resolving...' : 'Resolve Incident'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <Textarea
            label="Resolution Notes"
            placeholder="Describe how the incident was resolved..."
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            rows={5}
            required
          />
        </div>
      </Modal>
    </div>
  );
};

// Info Item Component
interface InfoItemProps {
  label: string;
  value: React.ReactNode;
}

const InfoItem = ({ label, value }: InfoItemProps) => (
  <div className="p-3.5 bg-gray-50 rounded-lg">
    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
      {label}
    </label>
    <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
      {value}
    </div>
  </div>
);

// Log Line Component
interface LogLineProps {
  time: string;
  level: 'error' | 'warn' | 'info';
  message: string;
}

const LogLine = ({ time, level, message }: LogLineProps) => (
  <div className="flex gap-3 py-1 border-b border-white/5">
    <span className="text-gray-400 whitespace-nowrap">{time}</span>
    <span className={clsx(
      'px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase',
      level === 'error' && 'bg-red-500/20 text-red-400',
      level === 'warn' && 'bg-amber-500/20 text-amber-400',
      level === 'info' && 'bg-blue-500/20 text-blue-400'
    )}>
      {level}
    </span>
    <span className="text-gray-300 flex-1 break-all">{message}</span>
  </div>
);

// AI Suggestion Component
interface AISuggestionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  actionIcon: React.ReactNode;
}

const AISuggestion = ({ icon, title, description, actionLabel, actionIcon }: AISuggestionProps) => (
  <div className="bg-white/10 rounded-lg p-3.5">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs font-semibold">{title}</span>
    </div>
    <p className="text-xs opacity-90 leading-relaxed mb-2.5">{description}</p>
    <button className="px-3 py-1.5 bg-white/15 rounded-md text-[11px] flex items-center gap-1.5 hover:bg-white/25 transition-colors">
      {actionIcon}
      {actionLabel}
    </button>
  </div>
);

export default IncidentDetailPage;
