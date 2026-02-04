import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Clock, Server, Activity, ExternalLink, Bell, BellOff, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAppSelector } from '@/hooks/useRedux';
import { integrationService } from '@/services/integrationService';
import toast from 'react-hot-toast';

interface AlertDetail {
  id: string;
  name: string;
  severity: string;
  status: string;
  source: string;
  message: string;
  startsAt: string;
  endsAt?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  fingerprint?: string;
  incidentId?: string;
  integrationId?: string;
}

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  high: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  medium: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
  low: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
};

const statusColors: Record<string, string> = {
  firing: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  acknowledged: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useAppSelector((state) => state.theme?.mode || 'light');
  const isDark = theme === 'dark';

  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchAlert = async () => {
      try {
        setLoading(true);
        const data = await integrationService.getAlertById(id);
        setAlert(data as unknown as AlertDetail);
      } catch (err) {
        console.error('Failed to fetch alert:', err);
        setError('Failed to load alert details');
      } finally {
        setLoading(false);
      }
    };
    fetchAlert();
  }, [id]);

  const handleAcknowledge = async () => {
    if (!id) return;
    try {
      await integrationService.acknowledgeAlert(id);
      toast.success('Alert acknowledged');
      setAlert((prev) => prev ? { ...prev, status: 'acknowledged' } : prev);
    } catch {
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleCreateIncident = async () => {
    if (!id) return;
    try {
      const result = await integrationService.createIncidentFromAlert(id);
      toast.success(`Incident ${result.incidentNumber} created`);
      navigate(`/incidents/${result.incidentId}`);
    } catch {
      toast.error('Failed to create incident');
    }
  };

  const cardBg = isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#475569';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
        <h2 className="text-xl font-semibold mb-2" style={{ color: textPrimary }}>{error || 'Alert not found'}</h2>
        <button onClick={() => navigate(-1)} className="text-primary-600 hover:underline mt-4">Go back</button>
      </div>
    );
  }

  const sev = severityColors[alert.severity] || severityColors.medium;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={20} style={{ color: textSecondary }} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" style={{ color: textPrimary }}>{alert.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[alert.status] || 'bg-gray-100 text-gray-800'}`}>
              {alert.status.toUpperCase()}
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: textSecondary }}>
            Alert ID: {alert.id}
          </p>
        </div>
        <div className="flex gap-2">
          {alert.status === 'firing' && (
            <button
              onClick={handleAcknowledge}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
            >
              <BellOff size={16} /> Acknowledge
            </button>
          )}
          {!alert.incidentId && (
            <button
              onClick={handleCreateIncident}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700"
            >
              <FileText size={16} /> Create Incident
            </button>
          )}
        </div>
      </div>

      {/* Alert Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: textSecondary }}>Alert Details</h3>
            <div className={`p-4 rounded-lg mb-4 ${sev.bg} border ${sev.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className={sev.text} />
                <span className={`text-sm font-bold uppercase ${sev.text}`}>{alert.severity} Severity</span>
              </div>
              <p className="text-sm" style={{ color: textPrimary }}>{alert.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: textSecondary }}>Source</p>
                <div className="flex items-center gap-2">
                  <Server size={14} style={{ color: textSecondary }} />
                  <span className="text-sm font-medium" style={{ color: textPrimary }}>{alert.source}</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: textSecondary }}>Started</p>
                <div className="flex items-center gap-2">
                  <Clock size={14} style={{ color: textSecondary }} />
                  <span className="text-sm" style={{ color: textPrimary }}>
                    {alert.startsAt ? formatDistanceToNow(new Date(alert.startsAt), { addSuffix: true }) : 'N/A'}
                  </span>
                </div>
              </div>
              {alert.endsAt && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: textSecondary }}>Resolved</p>
                  <span className="text-sm" style={{ color: textPrimary }}>
                    {formatDistanceToNow(new Date(alert.endsAt), { addSuffix: true })}
                  </span>
                </div>
              )}
              {alert.fingerprint && (
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: textSecondary }}>Fingerprint</p>
                  <span className="text-sm font-mono" style={{ color: textPrimary }}>{alert.fingerprint}</span>
                </div>
              )}
            </div>
          </div>

          {/* Labels */}
          {alert.labels && Object.keys(alert.labels).length > 0 && (
            <div className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: textSecondary }}>Labels</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(alert.labels).map(([key, value]) => (
                  <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: textPrimary }}>
                    <span style={{ color: textSecondary }}>{key}:</span> {value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Linked Incident */}
          {alert.incidentId && (
            <div className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: textSecondary }}>Linked Incident</h3>
              <Link
                to={`/incidents/${alert.incidentId}`}
                className="flex items-center gap-2 text-primary-600 hover:underline text-sm font-medium"
              >
                <ExternalLink size={14} />
                View Incident
              </Link>
            </div>
          )}

          {/* Quick Actions */}
          <div className="rounded-xl p-6" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
            <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: textSecondary }}>Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/monitoring" className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ color: textPrimary }}>
                <Activity size={14} /> View All Alerts
              </Link>
              {alert.integrationId && (
                <Link to={`/monitoring/integrations/${alert.integrationId}`} className="flex items-center gap-2 text-sm py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" style={{ color: textPrimary }}>
                  <Bell size={14} /> View Integration
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
