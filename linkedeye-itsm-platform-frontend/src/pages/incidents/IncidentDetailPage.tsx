import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
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
  Calendar,
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
import { fetchUsers, fetchGroups } from '@/store/slices/usersSlice';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const IncidentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentIncident: incident, isLoading, isSubmitting } = useAppSelector(
    (state) => state.incidents
  );
  const { users, groups } = useAppSelector((state) => state.users);
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('details');
  const [comment, setComment] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showGroupAssignModal, setShowGroupAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchIncidentById(id));
      dispatch(fetchUsers({ page: 1, limit: 100 }));
      dispatch(fetchGroups());
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

  const handleAssignUser = async () => {
    if (!id) return;
    try {
      const result = await dispatch(updateIncident({ id, data: { assignedTo: selectedUserId || null } }));
      if (updateIncident.fulfilled.match(result)) {
        // Re-fetch to get full assignee details
        await dispatch(fetchIncidentById(id));
        toast.success(selectedUserId ? 'User assigned successfully' : 'User unassigned');
      } else {
        toast.error('Failed to assign user');
      }
      setShowAssignModal(false);
      setSelectedUserId('');
    } catch {
      toast.error('Failed to assign user');
    }
  };

  const handleAssignGroup = async () => {
    if (!id) return;
    try {
      const result = await dispatch(updateIncident({ id, data: { assignedGroupId: selectedGroupId || null } }));
      if (updateIncident.fulfilled.match(result)) {
        // Re-fetch to get full group details
        await dispatch(fetchIncidentById(id));
        toast.success(selectedGroupId ? 'Group assigned successfully' : 'Group unassigned');
      } else {
        toast.error('Failed to assign group');
      }
      setShowGroupAssignModal(false);
      setSelectedGroupId('');
    } catch {
      toast.error('Failed to assign group');
    }
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

  // Get priority gradient class - Using ITSM semantic colors
  // Critical = Red, High = Orange, Medium = Amber, Healthy = Green
  const getPriorityGradient = () => {
    switch (incident.priority) {
      case 'critical':
        return 'from-red-500 to-red-600'; // Critical = Red
      case 'high':
        return 'from-orange-500 to-orange-600'; // High = Orange
      case 'medium':
        return 'from-amber-500 to-amber-600'; // Medium = Amber
      case 'low':
        return 'from-blue-500 to-blue-600'; // Low = Blue (enterprise)
      default:
        return 'from-gray-500 to-gray-600'; // Unknown = Grey
    }
  };

  // Get priority badge styles - Semantic ITSM colors
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
        return { bg: 'bg-white/90', text: 'text-gray-600', icon: <Activity size={12} /> };
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
            className="w-9 h-9 border rounded-lg flex items-center justify-center hover:text-amber-600 hover:border-amber-500 transition-all"
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
              incident.priority === 'low' && 'bg-amber-500 text-white'
            )}>
              {incident.priority === 'critical' && <Flame size={12} />}
              {incident.priority?.charAt(0).toUpperCase() + incident.priority?.slice(1)}
            </span>
            <span className={clsx(
              'px-3 py-1 rounded-full text-xs font-semibold',
              incident.status === 'open' && 'bg-amber-100 text-amber-700',
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
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-xs font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
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

            {/* People Card — ITSM Enterprise Style */}
            <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: isDark ? 'rgba(17,28,50,0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
              <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
                <h3 className="font-semibold text-xs flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                  <div className="w-6 h-6 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                    <Users size={12} className="text-white" />
                  </div>
                  People
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Reporter */}
                <div className="p-3 rounded-lg transition-all hover:bg-blue-50/50" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                    <User size={10} />
                    Reporter
                  </p>
                  {incident.reporter ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {incident.reporter.firstName?.charAt(0)}{incident.reporter.lastName?.charAt(0)}
                      </div>
                      <div>
                        <span className="text-sm font-semibold block" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{incident.reporter.firstName} {incident.reporter.lastName}</span>
                        {incident.reporter.email && <span className="text-[10px]" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>{incident.reporter.email}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9' }}>
                          <User size={14} style={{ color: isDark ? '#64748b' : '#94a3b8' }} />
                        </div>
                        <div>
                          <span className="text-sm font-medium block" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Not specified</span>
                          <span className="text-[10px]" style={{ color: isDark ? '#475569' : '#cbd5e1' }}>No reporter assigned</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assigned To */}
                <div className="p-3 rounded-lg transition-all hover:bg-blue-50/50" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                    <User size={10} />
                    Assigned To
                  </p>
                  {incident.assignee ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {incident.assignee.firstName?.charAt(0)}{incident.assignee.lastName?.charAt(0)}
                        </div>
                        <div>
                          <span className="text-sm font-semibold block" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{incident.assignee.firstName} {incident.assignee.lastName}</span>
                          {incident.assignee.email && <span className="text-[10px]" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>{incident.assignee.email}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedUserId(incident.assignedTo || ''); setShowAssignModal(true); }}
                        className="px-2.5 py-1 text-[10px] font-semibold bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-md hover:shadow-lg hover:shadow-gray-500/30 transition-all"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7' }}>
                          <User size={14} style={{ color: isDark ? '#fbbf24' : '#d97706' }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: isDark ? '#fbbf24' : '#d97706' }}>Unassigned</span>
                      </div>
                      <button
                        onClick={() => setShowAssignModal(true)}
                        className="px-2.5 py-1 text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                      >
                        Assign
                      </button>
                    </div>
                  )}
                </div>

                {/* Assignment Group */}
                <div className="p-3 rounded-lg transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                    <Users size={10} />
                    Assignment Group
                  </p>
                  {incident.assignedGroup ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                          <Users size={14} />
                        </div>
                        <div>
                          <span className="text-sm font-semibold block" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>{incident.assignedGroup.name}</span>
                          <span className="text-[10px]" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Support Team</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelectedGroupId(incident.assignedGroupId || ''); setShowGroupAssignModal(true); }}
                        className="px-2.5 py-1 text-[10px] font-semibold bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-md hover:shadow-lg hover:shadow-gray-500/30 transition-all"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9' }}>
                          <Users size={14} style={{ color: isDark ? '#64748b' : '#94a3b8' }} />
                        </div>
                        <span className="text-sm" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Not assigned</span>
                      </div>
                      <button
                        onClick={() => setShowGroupAssignModal(true)}
                        className="px-2.5 py-1 text-[10px] font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:shadow-lg hover:shadow-blue-500/30 transition-all"
                      >
                        Assign
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Actions — ITSM Enterprise Style */}
            <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: isDark ? 'rgba(17,28,50,0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
              <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
                <h3 className="font-semibold text-xs flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                  <div className="w-6 h-6 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                    <Activity size={12} className="text-white" />
                  </div>
                  Quick Actions
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {['in_progress', 'pending', 'resolved'].filter(s => s !== incident.status).map(s => {
                  const statusConfig: Record<string, { icon: React.ReactNode; gradient: string; hoverBg: string; hoverBorder: string }> = {
                    in_progress: {
                      icon: <Play size={14} />,
                      gradient: 'from-blue-500 to-blue-600',
                      hoverBg: 'hover:bg-blue-50',
                      hoverBorder: 'hover:border-blue-300'
                    },
                    pending: {
                      icon: <Clock size={14} />,
                      gradient: 'from-amber-500 to-amber-600',
                      hoverBg: 'hover:bg-amber-50',
                      hoverBorder: 'hover:border-amber-300'
                    },
                    resolved: {
                      icon: <Check size={14} />,
                      gradient: 'from-emerald-500 to-emerald-600',
                      hoverBg: 'hover:bg-emerald-50',
                      hoverBorder: 'hover:border-emerald-300'
                    }
                  };
                  const config = statusConfig[s];
                  return (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className={clsx(
                        'w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 group border',
                        config.hoverBg,
                        config.hoverBorder
                      )}
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb',
                        color: isDark ? '#cbd5e1' : '#475569',
                      }}
                    >
                      <div className={clsx('w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110', config.gradient)}>
                        {config.icon}
                      </div>
                      <div className="text-left">
                        <span className="font-semibold block">Mark as {s.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                        <span className="text-[10px] opacity-70">
                          {s === 'in_progress' && 'Start working on this incident'}
                          {s === 'pending' && 'Waiting for external action'}
                          {s === 'resolved' && 'Mark incident as resolved'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
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
                        : isDark ? 'text-gray-400 hover:bg-white/10 hover:text-gray-200' : 'text-gray-500 hover:bg-white hover:text-gray-900'
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
                  <div className="space-y-6">
                    {/* Description Section */}
                    <div className="rounded-xl overflow-hidden" style={{
                      background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
                    }}>
                      <div className="px-5 py-3 flex items-center gap-3" style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'}`
                      }}>
                        <FileText size={16} style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                          Description
                        </span>
                      </div>
                      <div className="p-5">
                        <p className="text-sm leading-relaxed" style={{ color: isDark ? '#e2e8f0' : '#475569' }}>
                          {incident.description || 'No description provided.'}
                        </p>
                        {incident.impact && (
                          <div className="mt-4 p-3 rounded-lg" style={{ background: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.2)' : '#fde68a'}` }}>
                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#fbbf24' : '#d97706' }}>Impact: </span>
                            <span className="text-sm" style={{ color: isDark ? '#fde68a' : '#92400e' }}>{incident.impact}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Incident Details - ServiceNow Form Style */}
                    <div className="rounded-xl overflow-hidden" style={{
                      background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`
                    }}>
                      <SNSectionHeader icon={<Info size={14} />} title="Incident Details" isDark={isDark} subtitle="Core Information" />
                      <div>
                        {/* Row 1: Assignment */}
                        <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                          <SNFormGroup label="Assigned To" value={
                            incident.assignee ? (
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                                  {incident.assignee.firstName?.charAt(0)}{incident.assignee.lastName?.charAt(0)}
                                </div>
                                <span>{incident.assignee.firstName} {incident.assignee.lastName}</span>
                              </div>
                            ) : <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Unassigned</span>
                          } isDark={isDark} />
                          <SNFormGroup label="Assignment Group" value={incident.assignedGroup?.name || <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Not assigned</span>} isDark={isDark} />
                        </div>
                        {/* Row 2: Classification */}
                        <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                          <SNFormGroup label="Category" value={incident.category || '-'} isDark={isDark} />
                          <SNFormGroup label="Subcategory" value={incident.subcategory || '-'} isDark={isDark} />
                        </div>
                        {/* Row 3: Priority */}
                        <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                          <SNFormGroup label="Impact" value={
                            <span className="px-2.5 py-1 rounded text-xs font-semibold" style={{
                              background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                              color: isDark ? '#fbbf24' : '#d97706'
                            }}>{incident.impact || '-'}</span>
                          } isDark={isDark} />
                          <SNFormGroup label="Urgency" value={
                            <span className="px-2.5 py-1 rounded text-xs font-semibold" style={{
                              background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                              color: isDark ? '#f87171' : '#dc2626'
                            }}>{incident.urgency || '-'}</span>
                          } isDark={isDark} />
                        </div>
                        {/* Row 4: Timestamps */}
                        <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                          <SNFormGroup label="Created" value={
                            <span className="flex items-center gap-2">
                              <Calendar size={14} style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
                              {format(toZonedTime(new Date(incident.createdAt), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' })}
                            </span>
                          } isDark={isDark} />
                          <SNFormGroup label="Last Updated" value={
                            <span className="flex items-center gap-2">
                              <Clock size={14} style={{ color: isDark ? '#10b981' : '#059669' }} />
                              {format(toZonedTime(new Date(incident.updatedAt), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' })}
                            </span>
                          } isDark={isDark} />
                        </div>
                        {/* Row 5: Source Info */}
                        <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                          <SNFormGroup label="Source" value={
                            <span className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${incident.customFields?.auto_created ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`} />
                              {incident.customFields?.auto_created ? 'Auto-created from Alert' : 'Manual'}
                            </span>
                          } isDark={isDark} />
                          <SNFormGroup label="Alert Name" value={
                            incident.customFields?.labels?.alertname ? (
                              <code className="text-xs px-2 py-1 rounded" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', fontFamily: 'monospace' }}>
                                {incident.customFields?.labels?.alertname}
                              </code>
                            ) : '-'
                          } isDark={isDark} />
                        </div>
                        {/* Row 6: Affected Infrastructure */}
                        <div className="grid grid-cols-2">
                          <SNFormGroup label="Affected Host" value={
                            incident.customFields?.labels?.instance ? (
                              <span className="flex items-center gap-2">
                                <Server size={14} style={{ color: isDark ? '#f59e0b' : '#d97706' }} />
                                <code className="text-xs px-2 py-1 rounded font-mono" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}>
                                  {incident.customFields?.labels?.instance}
                                </code>
                              </span>
                            ) : '-'
                          } isDark={isDark} />
                          <SNFormGroup label="Environment" value={incident.environment || incident.customFields?.environment || '-'} isDark={isDark} />
                        </div>
                      </div>
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

                    {/* Host & Network Information — ITSM Enterprise Style */}
                    <div className="rounded-xl overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
                      <div className="px-5 py-4 flex items-center gap-3" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(16, 185, 129, 0.05))', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                          <Network size={20} className="text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>Host & Network Information</h4>
                          <p className="text-xs" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Infrastructure details for this incident</p>
                        </div>
                      </div>
                      <div className="p-5 grid grid-cols-2 gap-4">
                        {/* Hostname */}
                        <div className="p-4 rounded-xl transition-all hover:shadow-md group" style={{ background: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)', border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(245, 158, 11, 0.2)'}` }}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <Server size={14} className="text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#f59e0b' : '#d97706' }}>Hostname</span>
                          </div>
                          <p className="text-lg font-bold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{alertInfo.hostname || 'Not specified'}</p>
                        </div>
                        {/* IP Address */}
                        <div className="p-4 rounded-xl transition-all hover:shadow-md group" style={{ background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)', border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.2)'}` }}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <Network size={14} className="text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#10b981' : '#059669' }}>IP Address</span>
                          </div>
                          <p className="text-lg font-bold font-mono" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{alertInfo.ipAddress || 'Not specified'}</p>
                        </div>
                        {/* Client */}
                        <div className="p-4 rounded-xl transition-all hover:shadow-md group" style={{ background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.06)', border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.2)'}` }}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <Building2 size={14} className="text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#8b5cf6' : '#7c3aed' }}>Client</span>
                          </div>
                          <p className="text-lg font-bold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                            {incident.client?.display_name || incident.client?.name || alertInfo.client || 'Not specified'}
                          </p>
                          {incident.client?.client_code && (
                            <p className="text-xs font-mono mt-1" style={{ color: isDark ? '#a78bfa' : '#8b5cf6' }}>{incident.client.client_code}</p>
                          )}
                        </div>
                        {/* Product Model */}
                        <div className="p-4 rounded-xl transition-all hover:shadow-md group" style={{ background: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.06)', border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)'}` }}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              <Database size={14} className="text-white" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#3b82f6' : '#2563eb' }}>Product Model</span>
                          </div>
                          <p className="text-lg font-bold capitalize" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{alertInfo.productModel || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Alert Details — ServiceNow Form Style */}
                    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#d2d6dc'}` }}>
                      <SNSectionHeader icon={<Info size={14} />} title="Alert Details" isDark={isDark} subtitle="Technical Information" />
                      <div style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff' }}>
                        {/* Row 1 */}
                        <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                          <SNFormGroup label="Alert Type" value={alertInfo.alertType} isDark={isDark} />
                          <SNFormGroup label="Monitor Status" value={
                            <span className={clsx(
                              'px-2.5 py-1 rounded text-xs font-semibold',
                              alertInfo.monitorStatus === 'critical' ? 'bg-red-100 text-red-700' :
                              alertInfo.monitorStatus === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            )}>
                              {alertInfo.monitorStatus?.toUpperCase()}
                            </span>
                          } isDark={isDark} />
                        </div>
                        {/* Row 2 */}
                        <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                          <SNFormGroup label="Alert Datetime" value={alertInfo.alertDatetime} isDark={isDark} />
                          <SNFormGroup label="Source" value={
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              {incident.source || 'Prometheus'}
                            </span>
                          } isDark={isDark} />
                        </div>
                        {/* Row 3 */}
                        <div className="grid grid-cols-2">
                          <SNFormGroup label="Fingerprint" value={
                            <code className="text-xs px-2 py-1 rounded" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', fontFamily: 'monospace' }}>
                              {incident.customFields?.fingerprint?.slice(0, 16) || '-'}
                            </code>
                          } isDark={isDark} />
                          <SNFormGroup label="Integration" value={
                            incident.customFields?.integration_id ? (
                              <span className="flex items-center gap-2 text-green-600">
                                <Check size={14} /> Connected
                              </span>
                            ) : '-'
                          } isDark={isDark} />
                        </div>
                      </div>
                    </div>

                    {/* Escalation Details — ServiceNow Form Style */}
                    {incident.customFields?.escalation && (
                      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#d2d6dc'}` }}>
                        <SNSectionHeader icon={<Shield size={14} />} title="Escalation Details" isDark={isDark} />
                        <div style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff' }}>
                          <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                            <SNFormGroup label="Current Status" value={incident.customFields.escalation.current_status || 'Level 0'} isDark={isDark} />
                            <SNFormGroup label="Escalation Level" value={
                              <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                                Level {incident.customFields.escalation.level || 0}
                              </span>
                            } isDark={isDark} />
                          </div>
                          <div className="grid grid-cols-2">
                            <SNFormGroup label="Notified To" value={
                              <span className="flex items-center gap-2">
                                <Mail size={14} style={{ color: isDark ? '#94a3b8' : '#6b7280' }} />
                                {incident.customFields.escalation.notified_to || 'rohinth.kumaresan@finspot.in'}
                              </span>
                            } isDark={isDark} />
                            <SNFormGroup label="Created At" value={incident.customFields.escalation.created_at || format(new Date(incident.createdAt), 'yyyy-MM-dd HH:mm:ss')} isDark={isDark} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Labels & Annotations — Terminal Style */}
                    {(Object.keys(alertInfo.labels).length > 0 || Object.keys(alertInfo.annotations).length > 0) && (
                      <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#d2d6dc'}` }}>
                        <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(90deg, #1a1a1a 0%, #2d2d2d 100%)', borderBottom: '2px solid #ff9800' }}>
                          <Terminal size={14} className="text-white" />
                          <span className="text-xs font-semibold text-white uppercase tracking-wider">Raw Alert Data</span>
                        </div>
                        <div className="grid grid-cols-2 gap-0" style={{ background: '#1e1e1e' }}>
                          {Object.keys(alertInfo.labels).length > 0 && (
                            <div style={{ borderRight: '1px solid #333' }}>
                              <div className="px-3 py-2 border-b" style={{ borderColor: '#333', background: 'rgba(255,255,255,0.02)' }}>
                                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Labels</span>
                              </div>
                              <div className="p-3 max-h-48 overflow-y-auto">
                                <pre className="text-[11px] font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
                                  {JSON.stringify(alertInfo.labels, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                          {Object.keys(alertInfo.annotations).length > 0 && (
                            <div>
                              <div className="px-3 py-2 border-b" style={{ borderColor: '#333', background: 'rgba(255,255,255,0.02)' }}>
                                <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">Annotations</span>
                              </div>
                              <div className="p-3 max-h-48 overflow-y-auto">
                                <pre className="text-[11px] font-mono text-gray-300 leading-relaxed whitespace-pre-wrap">
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

                {/* Timeline Tab — ITSM Enterprise Style */}
                {activeTab === 'timeline' && (
                  <div className="relative pl-8">
                    <div className="absolute left-3 top-0 bottom-0 w-0.5" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'linear-gradient(180deg, #3b82f6, #8b5cf6, #10b981)' }} />
                    {(incident.activities || []).length > 0 ? (
                      incident.activities?.map((activity, index) => {
                        const iconInfo = getTimelineIcon(activity.activityType);
                        const iconColors: Record<string, { bg: string; shadow: string }> = {
                          info: { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', shadow: 'rgba(59, 130, 246, 0.3)' },
                          success: { bg: 'linear-gradient(135deg, #10b981, #059669)', shadow: 'rgba(16, 185, 129, 0.3)' },
                          warning: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', shadow: 'rgba(245, 158, 11, 0.3)' },
                          purple: { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', shadow: 'rgba(139, 92, 246, 0.3)' },
                        };
                        const colors = iconColors[iconInfo.color] || iconColors.info;
                        return (
                          <div key={activity.id || index} className="relative pb-6 last:pb-0">
                            <div
                              className="absolute -left-5 w-7 h-7 rounded-lg flex items-center justify-center shadow-md"
                              style={{ background: colors.bg, boxShadow: `0 4px 12px ${colors.shadow}` }}
                            >
                              <span className="text-white">{iconInfo.icon}</span>
                            </div>
                            <div className="rounded-xl p-4 ml-4 transition-all hover:shadow-md" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                                  {activity.activityType?.replace('_', ' ').charAt(0).toUpperCase() + activity.activityType?.replace('_', ' ').slice(1)}
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(59, 130, 246, 0.1)', color: isDark ? '#94a3b8' : '#3b82f6' }}>
                                  {format(toZonedTime(new Date(activity.createdAt), 'Asia/Kolkata'), 'HH:mm:ss', { timeZone: 'Asia/Kolkata' })}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#475569' }}>
                                {activity.comment || `${activity.fieldName} changed from "${activity.oldValue}" to "${activity.newValue}"`}
                              </p>
                              {activity.user && (
                                <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold shadow-sm">
                                    {activity.user.firstName?.charAt(0)}{activity.user.lastName?.charAt(0)}
                                  </div>
                                  <span className="text-xs font-medium" style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>{activity.user.firstName} {activity.user.lastName}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl p-8 text-center" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mx-auto mb-4">
                          <History size={28} style={{ color: isDark ? '#64748b' : '#94a3b8' }} />
                        </div>
                        <p className="font-semibold mb-1" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>No Activity Yet</p>
                        <p className="text-sm" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Timeline events will appear here as the incident progresses</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Metrics Tab - Grafana Panel Style */}
                {activeTab === 'metrics' && (
                  <div className="space-y-5">
                    {/* Grafana Dashboard Panel */}
                    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#d2d6dc'}` }}>
                      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(90deg, #1a1a1a 0%, #2d2d2d 100%)', borderBottom: '2px solid #ff9800' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-[10px] font-bold text-white">G</div>
                          <span className="text-sm font-semibold text-white">Real-time Metrics — {alertInfo.hostname} (Live from Grafana)</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock size={12} />
                          <span>Auto-refresh: 10s</span>
                        </div>
                      </div>
                      <div className="h-96" style={{ background: '#1a1a1a' }}>
                        <iframe
                          src={`https://fs-le-dev-grafana.finspot.in/d/node-exporter?orgId=1&var-instance=${alertInfo.ipAddress}&kiosk=tv`}
                          className="w-full h-full border-0"
                          title="Grafana Metrics Dashboard"
                        />
                      </div>
                      {/* Metrics Grid — 4 Column Layout */}
                      <div className="grid grid-cols-4 gap-0 p-4" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                        <div className="p-4 text-center" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, borderRadius: '4px', margin: '0 4px' }}>
                          <div className="text-3xl font-bold text-red-500">75%</div>
                          <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: isDark ? '#64748b' : '#6b7785' }}>Current CPU</div>
                        </div>
                        <div className="p-4 text-center" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, borderRadius: '4px', margin: '0 4px' }}>
                          <div className="text-3xl font-bold text-orange-500">82%</div>
                          <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: isDark ? '#64748b' : '#6b7785' }}>Memory Usage</div>
                        </div>
                        <div className="p-4 text-center" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, borderRadius: '4px', margin: '0 4px' }}>
                          <div className="text-3xl font-bold text-amber-500">68%</div>
                          <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: isDark ? '#64748b' : '#6b7785' }}>Disk Usage</div>
                        </div>
                        <div className="p-4 text-center" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, borderRadius: '4px', margin: '0 4px' }}>
                          <div className="text-3xl font-bold text-green-500">2.4s</div>
                          <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: isDark ? '#64748b' : '#6b7785' }}>Response Time</div>
                        </div>
                      </div>
                    </div>

                    {/* Metric Details — ServiceNow Form Style */}
                    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#d2d6dc'}` }}>
                      <SNSectionHeader icon={<BarChart3 size={14} />} title="Metric Details" isDark={isDark} />
                      <div style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff' }}>
                        <div className="grid grid-cols-2" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
                          <SNFormGroup label="Current Value" value={<span className="text-red-500 font-bold">75%</span>} isDark={isDark} />
                          <SNFormGroup label="Threshold" value={<span className="font-semibold">≥ 75%</span>} isDark={isDark} />
                        </div>
                        <div className="grid grid-cols-2">
                          <SNFormGroup label="Alert Duration" value={formatDistanceToNow(new Date(incident.createdAt), { addSuffix: false })} isDark={isDark} />
                          <SNFormGroup label="Trend" value={
                            <span className="flex items-center gap-1.5 text-red-500 font-semibold">
                              <TrendingUp size={14} /> Increasing
                            </span>
                          } isDark={isDark} />
                        </div>
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
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
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
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          Info
                        </span>
                      </div>
                      <button className="text-xs text-amber-600 hover:text-amber-700 font-medium">
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
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
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
                          <a href="#" className="flex items-center gap-2 text-amber-600 hover:text-amber-700">
                            <ChevronRight size={12} />
                            Memory Troubleshooting Guide
                          </a>
                          <a href="#" className="flex items-center gap-2 text-amber-600 hover:text-amber-700">
                            <ChevronRight size={12} />
                            Process Optimization Best Practices
                          </a>
                          <a href="#" className="flex items-center gap-2 text-amber-600 hover:text-amber-700">
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
                    {/* Work Notes Input Section */}
                    <div className="mb-6 p-5 rounded-xl border" style={{
                      background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
                    }}>
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={16} style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
                        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                          Add Work Note
                        </span>
                      </div>
                      <textarea
                        placeholder="Describe investigation progress, findings, or next steps..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full p-4 rounded-lg text-sm resize-y min-h-[120px] focus:outline-none transition-all"
                        style={{
                          background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#ffffff',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                          color: isDark ? '#f1f5f9' : '#1e293b',
                        }}
                      />
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={handleAddComment}
                          disabled={!comment.trim() || isSubmitting}
                          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={14} />
                          Add Note
                        </button>
                        <button
                          className="px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                            color: isDark ? '#94a3b8' : '#64748b',
                          }}
                        >
                          <AtSign size={14} />
                          Mention
                        </button>
                        <button
                          className="px-4 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                            color: isDark ? '#94a3b8' : '#64748b',
                          }}
                        >
                          <Paperclip size={14} />
                          Attach
                        </button>
                      </div>
                    </div>

                    {/* Work Notes List */}
                    <div className="space-y-4">
                      {(incident.activities || [])
                        .filter((a) => a.activityType === 'comment')
                        .map((note, index) => (
                          <div
                            key={note.id || index}
                            className="p-4 rounded-xl border-l-4"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                              borderLeftColor: '#3b82f6',
                              borderLeftWidth: '4px',
                            }}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                  {note.user?.firstName?.charAt(0)}{note.user?.lastName?.charAt(0)}
                                </div>
                                <div>
                                  <span className="font-semibold text-sm" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
                                    {note.user?.firstName} {note.user?.lastName}
                                  </span>
                                  <span className="text-xs ml-2" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                                    {format(toZonedTime(new Date(note.createdAt), 'Asia/Kolkata'), 'MMM dd, yyyy HH:mm', { timeZone: 'Asia/Kolkata' })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm leading-relaxed pl-11" style={{ color: isDark ? '#cbd5e1' : '#475569' }}>
                              {note.comment}
                            </p>
                          </div>
                        ))}

                      {/* Empty State */}
                      {(incident.activities || []).filter((a) => a.activityType === 'comment').length === 0 && (
                        <div
                          className="text-center py-12 rounded-xl border"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                            borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
                          }}
                        >
                          <div
                            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                            style={{ background: isDark ? 'rgba(59, 130, 246, 0.1)' : '#dbeafe' }}
                          >
                            <MessageSquare size={28} style={{ color: isDark ? '#60a5fa' : '#3b82f6' }} />
                          </div>
                          <h4 className="text-sm font-semibold mb-2" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
                            No work notes yet
                          </h4>
                          <p className="text-xs max-w-xs mx-auto" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                            Document your investigation progress, findings, and next steps to keep your team informed.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ====== RIGHT COLUMN — Context Panel (CMDB, topology, related) ====== */}
          <div className="space-y-5">
            {/* AI Recommendations Panel - Context Differentiator */}
            <div className="bg-gradient-to-br from-[#0f1c3f] to-[#1e3a5f] rounded-xl p-5 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Recommendations</h3>
                  <p className="text-xs opacity-70">Based on incident patterns and history</p>
                </div>
              </div>

              <div className="space-y-3">
                <AISuggestion
                  icon={<BookOpen size={14} className="text-emerald-400" />}
                  title="Suggested Runbook"
                  description="Execute automated recovery runbook. 92% success rate for similar incidents."
                  actionLabel="Execute Runbook"
                  actionIcon={<Play size={12} />}
                />
                <AISuggestion
                  icon={<Copy size={14} className="text-cyan-400" />}
                  title="Similar Incidents"
                  description="3 similar incidents found. Avg MTTR: 28 minutes."
                  actionLabel="View Similar"
                  actionIcon={<Eye size={12} />}
                />
                <AISuggestion
                  icon={<User size={14} className="text-blue-400" />}
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
                <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  <Link2 size={16} className="text-blue-500" />
                  Related Incidents
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {relatedIncidents.map((related) => (
                  <div
                    key={related.id}
                    className="p-3.5 rounded-lg cursor-pointer transition-colors"
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}
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
                <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                  <Server size={16} className="text-cyan-500" />
                  Affected CIs
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {affectedCIs.map((ci) => (
                  <div
                    key={ci.id}
                    className="p-3.5 rounded-lg"
                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}
                  >
                    <div className="text-cyan-600 font-semibold text-xs mb-1">{ci.id}</div>
                    <div className="text-xs mb-2" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{ci.name}</div>
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

      {/* Assign User Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => { setShowAssignModal(false); setSelectedUserId(''); }}
        title="Assign User"
        size="md"
        footer={
          <>
            <button
              onClick={() => { setShowAssignModal(false); setSelectedUserId(''); }}
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
              style={{ color: isDark ? '#0f172a' : undefined }}
            >
              Cancel
            </button>
            <button
              onClick={handleAssignUser}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Assigning...' : 'Assign User'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#f8fafc' : '#374151' }}>
              Select User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              style={{
                background: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#d1d5db',
                color: isDark ? '#f8fafc' : '#111827'
              }}
            >
              <option value="">-- Unassigned --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
            {users.length === 0 && (
              <p className="mt-2 text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                No users available. Please add users in Admin &gt; Users.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Assign Group Modal */}
      <Modal
        isOpen={showGroupAssignModal}
        onClose={() => { setShowGroupAssignModal(false); setSelectedGroupId(''); }}
        title="Assign Group"
        size="md"
        footer={
          <>
            <button
              onClick={() => { setShowGroupAssignModal(false); setSelectedGroupId(''); }}
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
              style={{ color: isDark ? '#0f172a' : undefined }}
            >
              Cancel
            </button>
            <button
              onClick={handleAssignGroup}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Assigning...' : 'Assign Group'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#f8fafc' : '#374151' }}>
              Select Group
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              style={{
                background: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#d1d5db',
                color: isDark ? '#f8fafc' : '#111827'
              }}
            >
              <option value="">-- No Group --</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {groups.length === 0 && (
              <p className="mt-2 text-xs" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>
                No groups available. Please add groups in Admin &gt; Groups.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ServiceNow-Style Form Components
interface SNFormGroupProps {
  label: string;
  value: React.ReactNode;
  isDark?: boolean;
  fullWidth?: boolean;
}

const SNFormGroup = ({ label, value, isDark = false }: SNFormGroupProps) => (
  <div className="grid grid-cols-[160px_1fr]" style={{ borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}` }}>
    <div className="px-4 py-3 flex items-center text-xs font-medium" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e8eb'}`, color: isDark ? '#94a3b8' : '#475569' }}>
      {label}
    </div>
    <div className="px-4 py-3 flex items-center text-sm font-medium" style={{ color: isDark ? '#f1f5f9' : '#0f1c3f' }}>
      {value}
    </div>
  </div>
);

interface SNSectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  isDark?: boolean;
  subtitle?: string;
}

const SNSectionHeader = ({ icon, title, isDark = false, subtitle }: SNSectionHeaderProps) => (
  <div className="px-5 py-3 flex items-center gap-3" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#e8eef5', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#d2d6dc'}` }}>
    <span style={{ color: isDark ? '#94a3b8' : '#475569' }}>{icon}</span>
    <div>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: isDark ? '#94a3b8' : '#424952' }}>{title}</span>
      {subtitle && <span className="text-[10px] ml-2" style={{ color: isDark ? '#64748b' : '#6b7785' }}>({subtitle})</span>}
    </div>
  </div>
);

// Legacy Info Item Component (for backwards compatibility)
interface InfoItemProps {
  label: string;
  value: React.ReactNode;
}

const InfoItem = ({ label, value }: InfoItemProps) => (
  <div className="p-3.5 bg-gray-50 rounded-lg dark:bg-slate-800/50">
    <label className="text-[10px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
      {label}
    </label>
    <div className="text-sm font-medium text-gray-900 dark:text-slate-100 flex items-center gap-2">
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
      level === 'info' && 'bg-amber-500/20 text-amber-400'
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
