import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, toZonedTime } from 'date-fns-tz';
import {
  ArrowLeft,
  Edit,
  Check,
  Flame,
  Search,
  AlertTriangle,
  Bug,
  Microscope,
  BarChart3,
  Wrench,
  Shield,
  Database,
  Server,
  Layers,
  Users,
  GitBranch,
  ChevronRight,
  Clock,
  Send,
  Paperclip,
  AtSign,
  BookOpen,
  Upload,
  Trash2,
  File,
} from 'lucide-react';
import {
  PageLoader,
  Textarea,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchProblemById, updateProblem, addProblemComment } from '@/store/slices/problemsSlice';
import { problemService } from '@/services/problemService';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const ProblemDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentProblem: problem, isLoading, isSubmitting } = useAppSelector(
    (state) => state.problems
  );
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [comment, setComment] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchProblemById(id));
      loadAttachments();
    }
  }, [dispatch, id]);

  const loadAttachments = async () => {
    if (!id) return;
    try {
      const data = await problemService.getAttachments(id);
      setAttachments(data);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!id || !comment.trim()) return;
    const result = await dispatch(addProblemComment({ id, comment: comment.trim(), isPublic: true }));
    if (addProblemComment.fulfilled.match(result)) {
      setComment('');
      toast.success('Comment added');
    } else {
      toast.error('Failed to add comment');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUploadAttachment = async () => {
    if (!id || !uploadFile) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const base64Content = base64Data.split(',')[1];

        await problemService.addAttachment(id, {
          filename: uploadFile.name,
          content_type: uploadFile.type,
          data: base64Content,
          description: uploadDescription || undefined,
        });

        toast.success('Attachment uploaded');
        setUploadFile(null);
        setUploadDescription('');
        await loadAttachments();
      };
      reader.readAsDataURL(uploadFile);
    } catch (error) {
      toast.error('Failed to upload attachment');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      await problemService.deleteAttachment(id, attachmentId);
      toast.success('Attachment deleted');
      await loadAttachments();
    } catch (error) {
      toast.error('Failed to delete attachment');
      console.error(error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading || !problem) {
    return <PageLoader message="Loading problem..." />;
  }

  // Sample related incidents (in real app, this comes from API)
  const relatedIncidents = problem.relatedIncidents || [
    { id: '1', incidentNumber: 'INC0015847', title: 'Database Connection Pool Exhaustion - Trading API', createdAt: new Date().toISOString() },
    { id: '2', incidentNumber: 'INC0015723', title: 'DB Connection Timeout - Order Processing', createdAt: new Date().toISOString() },
    { id: '3', incidentNumber: 'INC0015689', title: 'API Response Slow - Connection Wait Queue', createdAt: new Date().toISOString() },
  ];

  // Sample affected CIs
  const affectedCIs = [
    { id: 'db-01', name: 'prod-db-01.finspot.local', type: 'database', icon: <Database size={14} className="text-blue-500" /> },
    { id: 'api-01', name: 'trading-api-prod-cluster', type: 'server', icon: <Server size={14} className="text-purple-500" /> },
    { id: 'pool-01', name: 'pgbouncer-pool-01', type: 'service', icon: <Layers size={14} className="text-green-500" /> },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: isDark ? '#030712' : undefined }}>
      {/* Main Panel */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Problem Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex gap-2 mb-3">
              <span className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5',
                problem.priority === 'critical' && 'bg-red-500 text-white',
                problem.priority === 'high' && 'bg-orange-500 text-white',
                problem.priority === 'medium' && 'bg-amber-500 text-gray-900',
                problem.priority === 'low' && 'bg-blue-500 text-white'
              )}>
                <Flame size={12} />
                {problem.priority?.charAt(0).toUpperCase() + problem.priority?.slice(1)}
              </span>
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-amber-100 text-amber-700">
                <Search size={12} />
                {problem.status === 'investigating' ? 'Under Investigation' : problem.status?.replace('_', ' ').charAt(0).toUpperCase() + problem.status?.replace('_', ' ').slice(1)}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{problem.problemNumber}</h1>
            <p className="text-base text-gray-500 max-w-xl">{problem.title}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/problems/${id}/edit`}
              className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
              style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, color: isDark ? '#f8fafc' : undefined }}
            >
              <Edit size={14} />
              Edit
            </Link>
            <button className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/30 transition-all">
              <Check size={14} />
              Resolve
            </button>
          </div>
        </div>

        {/* Related Incidents Card */}
        <div className="rounded-xl mb-6" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
          <div className="p-4 flex justify-between items-center" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : undefined }}>
              <AlertTriangle size={16} className="text-blue-500" />
              Related Incidents ({relatedIncidents.length})
            </h3>
            <Link
              to="/incidents"
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, color: isDark ? '#f8fafc' : undefined }}
            >
              View All
            </Link>
          </div>
          <div className="p-4">
            <div className="max-h-60 overflow-y-auto space-y-2">
              {relatedIncidents.map((incident: any) => (
                <Link
                  key={incident.id}
                  to={`/incidents/${incident.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:translate-x-1 transition-all cursor-pointer"
                  style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}
                >
                  <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle size={16} className="text-red-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-blue-600 text-sm">{incident.incidentNumber}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{incident.title}</div>
                  </div>
                  <div className="text-xs text-gray-400 bg-white px-2 py-1 rounded">
                    {format(toZonedTime(new Date(incident.createdAt), 'Asia/Kolkata'), 'MMM d', { timeZone: 'Asia/Kolkata' })}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Root Cause Analysis Card */}
        <div className="rounded-xl mb-6" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
          <div className="p-4" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : undefined }}>
              <Microscope size={16} className="text-blue-500" />
              Root Cause Analysis
            </h3>
          </div>
          <div className="p-5">
            {/* RCA Section with amber gradient */}
            <div className="bg-gradient-to-r from-amber-100 to-amber-200 border border-amber-300 rounded-xl p-5 mb-5">
              <h4 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <Bug size={16} className="text-amber-600" />
                Identified Root Cause
              </h4>
              <p className="text-sm text-amber-900 leading-relaxed mb-3">
                <strong className="text-amber-800">Problem:</strong> {problem.rootCause || 'Root cause is under investigation. Connection leak suspected in trading-api causing progressive exhaustion of PostgreSQL connection pool during high-volume trading periods.'}
              </p>
              <div className="mt-4 bg-white/50 rounded-lg p-4">
                <h5 className="text-xs font-semibold text-amber-800 mb-2">Contributing Factors:</h5>
                <ul className="text-xs text-amber-900 space-y-1.5 list-disc list-inside">
                  <li>No connection timeout configured in pool settings</li>
                  <li>Insufficient connection pool monitoring and alerting thresholds</li>
                  <li>Connection pool size inadequate for peak load</li>
                  <li>Missing connection validation on checkout from pool</li>
                  <li>Retry logic not releasing connections on certain error paths</li>
                </ul>
              </div>
            </div>

            {/* Incident Correlation Chart Placeholder */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                <BarChart3 size={16} className="text-blue-500" />
                Incident Correlation (Last 30 Days)
              </h4>
              <div className="h-48 rounded-lg p-4 flex items-center justify-center" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
                <div className="text-center text-gray-400">
                  <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Incident correlation chart</p>
                </div>
              </div>
            </div>

            {/* Fix Tracking */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                <Wrench size={16} className="text-blue-500" />
                Fix Tracking
              </h4>
              <div className="space-y-3">
                {/* Workaround Fix */}
                <div className="flex gap-3 p-4 rounded-lg border-l-4 border-amber-500 transition-colors" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Shield size={18} className="text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>Workaround: Scheduled Pool Restart</div>
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {problem.workaround || 'Restart PgBouncer every 4 hours during trading hours + manual connection cleanup script execution'}
                    </div>
                  </div>
                  <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-md h-fit">
                    {problem.workaroundAvailable ? 'Available' : 'Pending'}
                  </span>
                </div>

                {/* Permanent Fix */}
                <div className="flex gap-3 p-4 rounded-lg border-l-4 border-green-500 transition-colors" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Wrench size={18} className="text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>Permanent Fix: Deploy Patched Version</div>
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {problem.permanentFix || 'Connection leak patched, pool timeout configured (30s), enhanced monitoring with Prometheus metrics'}
                    </div>
                  </div>
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md h-fit whitespace-nowrap">
                    In Progress
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Known Error Card */}
        {problem.status === 'known_error' && (
          <div className="rounded-xl mb-6" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
            <div className="p-4" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
              <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : undefined }}>
                <BookOpen size={16} className="text-blue-500" />
                Known Error Database
              </h3>
            </div>
            <div className="p-5">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-5 rounded-xl flex items-center gap-4">
                <Database size={32} className="opacity-90" />
                <div>
                  <div className="font-semibold text-lg">KE0000234</div>
                  <div className="text-sm opacity-85 mt-1">Documented: {format(toZonedTime(new Date(problem.createdAt), 'Asia/Kolkata'), 'MMM d, yyyy', { timeZone: 'Asia/Kolkata' })} - Workaround Available</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Work Notes Card */}
        <div className="rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
          <div className="p-4" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : undefined }}>
              <Users size={16} className="text-blue-500" />
              Work Notes
            </h3>
          </div>
          <div className="p-5">
            <div className="mb-5">
              <textarea
                placeholder="Add a work note... Describe investigation progress, findings, or next steps."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full p-3.5 rounded-lg text-sm resize-y min-h-[100px] focus:outline-none focus:border-blue-500 transition-colors"
                style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, color: isDark ? '#f8fafc' : undefined }}
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
                <button className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, color: isDark ? '#f8fafc' : undefined }}>
                  <AtSign size={14} />
                  Mention
                </button>
                <button className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, color: isDark ? '#f8fafc' : undefined }}>
                  <Paperclip size={14} />
                  Attach
                </button>
              </div>
            </div>

            {/* Work Notes List */}
            <div className="space-y-4">
              {(problem.activities || [])
                .filter((a) => a.activityType === 'comment')
                .map((note, index) => (
                  <div key={note.id || index} className="p-4 rounded-lg border-l-[3px] border-blue-500" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
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
              {(problem.activities || []).filter((a) => a.activityType === 'comment').length === 0 && (
                <p className="text-gray-500 text-center py-8">No work notes yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Attachments Card */}
        <div className="rounded-xl mt-6" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
          <div className="p-4" style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
            <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: isDark ? '#f8fafc' : undefined }}>
              <Paperclip size={16} className="text-blue-500" />
              Attachments ({attachments.length})
            </h3>
          </div>
          <div className="p-5">
            {/* Upload Form */}
            <div className="mb-5 p-4 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
              <h4 className="text-sm font-semibold mb-3" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>Upload Attachment</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">File</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full p-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, color: isDark ? '#f8fafc' : undefined }}
                  />
                  {uploadFile && (
                    <p className="text-xs text-gray-500 mt-1.5">Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Description (optional)</label>
                  <input
                    type="text"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Brief description of this attachment..."
                    className="w-full p-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, color: isDark ? '#f8fafc' : undefined }}
                  />
                </div>
                <button
                  onClick={handleUploadAttachment}
                  disabled={!uploadFile || isUploading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={14} />
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>

            {/* Attachments List */}
            <div className="space-y-3">
              {attachments.length > 0 ? (
                attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <File size={18} className="text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                        {attachment.filename}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatFileSize(attachment.size || 0)} • Uploaded {format(toZonedTime(new Date(attachment.uploaded_at), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' })}
                      </div>
                      {attachment.description && (
                        <div className="text-xs text-gray-400 mt-1">{attachment.description}</div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-colors"
                      title="Delete attachment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No attachments yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-[360px] p-6 overflow-y-auto" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderLeft: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}` }}>
        {/* Investigation Status */}
        <div className="mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Investigation Status</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg text-center" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
              <div className="text-3xl font-bold text-red-500">{relatedIncidents.length}</div>
              <div className="text-xs text-gray-500 mt-1">Related Incidents</div>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
              <div className="text-3xl font-bold text-amber-500">
                {Math.ceil((new Date().getTime() - new Date(problem.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d
              </div>
              <div className="text-xs text-gray-500 mt-1">Investigation Time</div>
            </div>
          </div>
        </div>

        {/* Workaround Steps */}
        {problem.workaround && (
          <div className="mb-6">
            <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Workaround Steps</h4>
            <div className="p-4 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
              <ul className="text-xs text-gray-700 space-y-2 list-disc list-inside">
                <li>Restart PgBouncer every 4 hours during trading (9AM-4PM)</li>
                <li>Run manual connection cleanup script: <code className="bg-gray-200 px-1 rounded">cleanup_pool.sh</code></li>
                <li>Monitor pool usage alerts &gt; 80% threshold</li>
              </ul>
            </div>
          </div>
        )}

        {/* Permanent Fix Status */}
        <div className="mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Permanent Fix Status</h4>
          <div className="p-4 rounded-lg" style={{ background: isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4' }}>
            <div className="font-semibold text-green-600 flex items-center gap-2 mb-1.5">
              <Clock size={14} className="animate-spin" />
              In Progress
            </div>
            <div className="text-sm text-gray-700">Deploy patched version with connection leak fix</div>
            <div className="text-xs text-gray-500 mt-1.5">ETA: Weekend Maintenance Window</div>
          </div>
        </div>

        {/* Related Change Request */}
        <div className="mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Related Change Request</h4>
          <Link
            to="/changes"
            className="flex items-center gap-3 p-4 rounded-lg hover:translate-x-1 transition-all cursor-pointer"
            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}
          >
            <GitBranch size={18} className="text-blue-500" />
            <div className="flex-1">
              <div className="font-semibold text-blue-600 text-sm">CHG0012789</div>
              <div className="text-xs text-gray-500 mt-0.5">API v2.5.0 Production Deployment</div>
            </div>
            <ChevronRight size={14} className="text-gray-400" />
          </Link>
        </div>

        {/* Affected Configuration Items */}
        <div className="mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Affected Configuration Items</h4>
          <div className="p-4 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
            <ul className="space-y-3">
              {affectedCIs.map((ci) => (
                <li key={ci.id} className="flex items-center gap-2 text-sm text-gray-700 pb-3 border-b border-gray-200 last:border-0 last:pb-0">
                  {ci.icon}
                  <span>{ci.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Problem Manager */}
        <div className="mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Problem Manager</h4>
          <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
            <div className="w-11 h-11 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              {problem.assignee?.firstName?.charAt(0) || 'U'}{problem.assignee?.lastName?.charAt(0) || 'N'}
            </div>
            <div>
              <div className="font-semibold text-sm">{problem.assignee ? `${problem.assignee.firstName} ${problem.assignee.lastName}` : 'Unassigned'}</div>
              <div className="text-xs text-gray-500 mt-0.5">Problem Manager</div>
            </div>
          </div>
        </div>

        {/* Problem Information */}
        <div className="mb-6">
          <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Problem Information</h4>
          <div className="space-y-3">
            <InfoRow label="Category" value={problem.category || '-'} />
            <InfoRow label="Environment" value={problem.environment?.name || '-'} />
            <InfoRow label="Created" value={format(toZonedTime(new Date(problem.createdAt), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' })} />
            <InfoRow label="Last Updated" value={format(toZonedTime(new Date(problem.updatedAt), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' })} />
            {problem.resolvedAt && (
              <InfoRow label="Resolved" value={format(toZonedTime(new Date(problem.resolvedAt), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' })} />
            )}
          </div>
        </div>

        {/* Back Button */}
        <Link
          to="/problems"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb'}`, color: isDark ? '#f8fafc' : undefined }}
        >
          <ArrowLeft size={14} />
          Back to Problems
        </Link>
      </div>
    </div>
  );
};

// Info Row Component
interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
  </div>
);

export default ProblemDetailPage;
