import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, toZonedTime } from 'date-fns-tz';
import {
  ArrowLeft,
  Edit,
  Copy,
  Play,
  Check,
  GitBranch,
  Calendar,
  Clock,
  Server,
  Info,
  ClipboardList,
  RotateCcw,
  Shield,
  UserCheck,
  Link2,
  AlertTriangle,
  Database,
  Box,
  Search,
  XCircle,
  CheckCircle,
  Lock,
} from 'lucide-react';
import {
  PageLoader,
  Modal,
  Textarea,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchChangeById, approveChange, rejectChange, submitChangeForApproval } from '@/store/slices/changesSlice';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const ChangeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentChange: change, isLoading, isSubmitting } = useAppSelector(
    (state) => state.changes
  );
  const { user } = useAppSelector((state) => state.auth);
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvalComments, setApprovalComments] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchChangeById(id));
    }
  }, [dispatch, id]);

  const handleApprove = async () => {
    if (!id) return;
    const result = await dispatch(approveChange({ id, comments: approvalComments }));
    if (approveChange.fulfilled.match(result)) {
      toast.success('Change approved successfully');
      setShowApprovalModal(false);
      setApprovalComments('');
    }
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) return;
    const result = await dispatch(rejectChange({ id, comments: rejectReason }));
    if (rejectChange.fulfilled.match(result)) {
      toast.success('Change rejected');
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  if (isLoading || !change) {
    return <PageLoader message="Loading change request..." />;
  }

  const canApprove = change.status === 'pending_approval' && change.approvals?.some(
    (a) => a.approverId === user?.id && !a.decision
  );

  // Get status gradient for header
  const getStatusGradient = () => {
    switch (change.status) {
      case 'approved':
      case 'scheduled':
        return 'from-green-500 to-green-600';
      case 'implementing':
        return 'from-blue-500 to-blue-600';
      case 'pending_approval':
        return 'from-amber-500 to-amber-600';
      case 'rejected':
      case 'failed':
        return 'from-red-500 to-red-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  // Sample implementation steps (in real app, this would come from API)
  const implementationSteps = [
    { id: 1, title: 'Pre-Implementation Verification', description: 'Verify current settings, backup config', status: 'done' },
    { id: 2, title: 'Update Configuration', description: change.implementationPlan?.substring(0, 50) || 'Apply configuration changes', status: 'current' },
    { id: 3, title: 'Reload Service', description: 'Execute service reload (no restart required)', status: 'pending' },
    { id: 4, title: 'Verify New Settings', description: 'Confirm changes applied correctly', status: 'pending' },
    { id: 5, title: 'Monitor for 15 Minutes', description: 'Watch dashboard for anomalies', status: 'pending' },
  ];

  // Sample affected CIs
  const affectedCIs = change.affectedAssets?.map((asset) => ({
    id: asset.id,
    name: asset.name,
    type: asset.assetType || 'Asset',
    icon: <Database size={14} className="text-blue-500" />,
  })) || [
    { id: 'pgbouncer-01', name: 'pgbouncer-trading-01', type: 'PgBouncer Instance', icon: <Database size={14} className="text-blue-500" /> },
    { id: 'db-primary', name: 'trading-db-primary', type: 'PostgreSQL Primary', icon: <Database size={14} className="text-blue-500" /> },
    { id: 'order-service', name: 'order-service', type: 'Kubernetes Deployment', icon: <Box size={14} className="text-blue-500" /> },
  ];

  // Sample related records
  const relatedRecords = [
    { id: 'INC0015847', type: 'incident', title: 'Related Incident', icon: <AlertTriangle size={14} className="text-red-500" /> },
    { id: 'PRB0004521', type: 'problem', title: 'Related Problem', icon: <Search size={14} className="text-purple-500" /> },
  ];

  return (
    <div className="min-h-screen">
      {/* Header Bar */}
      <div className="fixed top-16 left-64 right-0 h-14 border-b flex items-center justify-between px-6 z-40" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
        <div className="flex items-center gap-4">
          <Link
            to="/changes"
            className="w-9 h-9 border rounded-lg flex items-center justify-center hover:text-blue-600 hover:border-blue-500 transition-all"
            style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb', color: isDark ? '#94a3b8' : '#6b7280' }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{change.changeNumber}</h1>
            <span className={clsx(
              'px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1',
              change.status === 'approved' && 'bg-green-100 text-green-700',
              change.status === 'scheduled' && 'bg-green-100 text-green-700',
              change.status === 'pending_approval' && 'bg-amber-100 text-amber-700',
              change.status === 'implementing' && 'bg-blue-100 text-blue-700',
              change.status === 'completed' && 'bg-gray-100 text-gray-700',
              change.status === 'rejected' && 'bg-red-100 text-red-700',
              change.status === 'failed' && 'bg-red-100 text-red-700'
            )}>
              <Check size={12} />
              {change.status?.replace('_', ' ').charAt(0).toUpperCase() + change.status?.replace('_', ' ').slice(1)}
            </span>
            <span className={clsx(
              'px-3 py-1 rounded-full text-xs font-semibold',
              change.changeType === 'normal' && 'bg-blue-100 text-blue-700',
              change.changeType === 'standard' && 'bg-gray-100 text-gray-700',
              change.changeType === 'emergency' && 'bg-red-100 text-red-700'
            )}>
              {change.changeType?.charAt(0).toUpperCase() + change.changeType?.slice(1)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/changes/${id}/edit`}
            className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600 transition-all"
          >
            <Edit size={14} />
            Edit
          </Link>
          <button className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-xs font-medium flex items-center gap-2 hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600 transition-all">
            <Copy size={14} />
            Clone
          </button>
          {(change.status === 'approved' || change.status === 'scheduled') && (
            <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/30 transition-all">
              <Play size={14} />
              Start Implementation
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-14 p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Change Header Card */}
            <div className={clsx(
              'rounded-xl overflow-hidden text-white bg-gradient-to-r',
              getStatusGradient()
            )}>
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="bg-white/20 px-3 py-1.5 rounded-md font-semibold text-sm">
                    {change.changeNumber}
                  </span>
                  <span className="bg-white/90 text-green-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <GitBranch size={12} />
                    {change.changeType?.charAt(0).toUpperCase() + change.changeType?.slice(1)} Change
                  </span>
                  <span className="bg-blue-500/90 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {change.status?.replace('_', ' ').charAt(0).toUpperCase() + change.status?.replace('_', ' ').slice(1)}
                  </span>
                </div>
                <h1 className="text-2xl font-bold mb-3">{change.title}</h1>
                <div className="flex items-center gap-5 text-sm opacity-90">
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    {change.scheduledStart ? format(toZonedTime(new Date(change.scheduledStart), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' }) : 'Not scheduled'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    Duration: {change.downtimeMinutes || 30} minutes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Server size={14} />
                    {change.environment?.name || 'Production'}
                  </span>
                </div>
              </div>
            </div>

            {/* 3-Tier Approval Pipeline */}
            {(change as any).approval_chain && (change as any).approval_chain.length > 0 && (
              <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <UserCheck size={16} className="text-blue-500" />
                    Approval Pipeline
                  </h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    {(change as any).approval_chain.map((tier: any, index: number) => {
                      const isApproved = tier.status === 'approved';
                      const isPending = tier.status === 'pending' && (index === 0 || (change as any).approval_chain[index - 1]?.status === 'approved');
                      const isLocked = tier.status === 'pending' && !isPending;
                      const isRejected = tier.status === 'rejected';

                      return (
                        <div key={tier.tier} className="flex items-center flex-1">
                          {/* Step Circle */}
                          <div className="flex flex-col items-center flex-1">
                            <div className={clsx(
                              'w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all',
                              isApproved && 'bg-green-500 text-white shadow-lg shadow-green-500/30',
                              isPending && 'bg-amber-500 text-white animate-pulse shadow-lg shadow-amber-500/30',
                              isLocked && (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'),
                              isRejected && 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                            )}>
                              {isApproved && <CheckCircle size={24} />}
                              {isPending && <Clock size={24} />}
                              {isLocked && <Lock size={24} />}
                              {isRejected && <XCircle size={24} />}
                            </div>

                            {/* Tier Label */}
                            <div className="text-center">
                              <div className={clsx(
                                'text-xs font-semibold mb-1',
                                isDark ? 'text-gray-300' : 'text-gray-700'
                              )}>
                                Tier {tier.tier}
                              </div>
                              <div className={clsx(
                                'text-[10px] font-medium',
                                isDark ? 'text-gray-500' : 'text-gray-500'
                              )}>
                                {tier.role === 'requester_manager' && 'Requester Manager'}
                                {tier.role === 'client_approver' && 'Client Approver'}
                                {tier.role === 'cab_reviewer' && 'CAB Reviewer'}
                              </div>

                              {/* Status */}
                              <div className={clsx(
                                'text-[10px] font-semibold mt-1',
                                isApproved && 'text-green-600',
                                isPending && 'text-amber-600',
                                isLocked && 'text-gray-400',
                                isRejected && 'text-red-600'
                              )}>
                                {isApproved && 'Approved'}
                                {isPending && 'Pending'}
                                {isLocked && 'Locked'}
                                {isRejected && 'Rejected'}
                              </div>

                              {/* Approved Date */}
                              {tier.approved_at && (
                                <div className={clsx(
                                  'text-[9px] mt-1',
                                  isDark ? 'text-gray-500' : 'text-gray-400'
                                )}>
                                  {format(toZonedTime(new Date(tier.approved_at), 'Asia/Kolkata'), 'MMM d, HH:mm', { timeZone: 'Asia/Kolkata' })}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Connecting Line */}
                          {index < (change as any).approval_chain.length - 1 && (
                            <div className={clsx(
                              'h-0.5 flex-1 -mx-2 transition-all',
                              isApproved ? 'bg-green-500' : (isDark ? 'bg-gray-700' : 'bg-gray-300')
                            )} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Change Details Card */}
            <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Info size={16} className="text-blue-500" />
                  Change Details
                </h3>
              </div>
              <div className="p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Description</h4>
                <p className="text-sm text-gray-700 leading-relaxed mb-5">
                  {change.description || 'No description provided.'}
                </p>

                {change.justification && (
                  <>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Business Justification</h4>
                    <p className="text-sm text-gray-700 leading-relaxed mb-5">
                      {change.justification}
                    </p>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <InfoItem
                    label="Requested By"
                    value={
                      change.requester ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                            {change.requester.firstName?.charAt(0)}{change.requester.lastName?.charAt(0)}
                          </div>
                          <span>{change.requester.firstName} {change.requester.lastName}</span>
                        </div>
                      ) : 'Unknown'
                    }
                  />
                  <InfoItem
                    label="Assigned To"
                    value={
                      change.assignee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                            {change.assignee.firstName?.charAt(0)}{change.assignee.lastName?.charAt(0)}
                          </div>
                          <span>{change.assignee.firstName} {change.assignee.lastName}</span>
                        </div>
                      ) : 'Unassigned'
                    }
                  />
                  <InfoItem label="Change Type" value={change.changeType || '-'} />
                  <InfoItem label="Category" value={change.category || '-'} />
                  <InfoItem label="Environment" value={change.environment?.name || '-'} />
                  <InfoItem label="Maintenance Window" value={change.scheduledStart ? 'Scheduled' : 'TBD'} />
                </div>
              </div>
            </div>

            {/* Implementation Plan Card */}
            <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <ClipboardList size={16} className="text-blue-500" />
                  Implementation Plan
                </h3>
              </div>
              <div className="p-5">
                <div className="relative pl-6">
                  <div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-gray-200" />
                  {implementationSteps.map((step, index) => (
                    <div key={step.id} className="relative pb-5 last:pb-0">
                      <div className={clsx(
                        'absolute -left-6 w-4 h-4 rounded-full border-2',
                        step.status === 'done' && 'bg-green-500 border-green-500',
                        step.status === 'current' && 'bg-blue-500 border-blue-500 animate-pulse',
                        step.status === 'pending' && 'bg-white border-gray-300'
                      )} />
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="font-semibold text-sm text-gray-900 mb-1">{step.id}. {step.title}</div>
                        <div className="text-xs text-gray-500">{step.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rollback Plan Card */}
            <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <RotateCcw size={16} className="text-blue-500" />
                  Rollback Plan
                </h3>
              </div>
              <div className="p-5">
                <div className="bg-gradient-to-r from-red-50 to-amber-50 border border-dashed border-amber-400 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={18} className="text-amber-500" />
                    <span className="font-semibold text-sm text-gray-900">Emergency Rollback Procedure</span>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {change.rollbackPlan ? (
                      <p className="whitespace-pre-wrap">{change.rollbackPlan}</p>
                    ) : (
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Restore configuration from backup</li>
                        <li>Reload/restart affected services</li>
                        <li>Verify rollback successful</li>
                        <li>Notify stakeholders via appropriate channels</li>
                        <li>Create incident ticket for root cause analysis</li>
                      </ol>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Risk Assessment */}
            <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Shield size={16} className="text-blue-500" />
                  Risk Assessment
                </h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-xs text-gray-500 mb-1">Risk Level</div>
                    <div className={clsx(
                      'text-lg font-bold',
                      change.risk === 'low' && 'text-green-500',
                      change.risk === 'medium' && 'text-amber-500',
                      change.risk === 'high' && 'text-red-500',
                      change.risk === 'critical' && 'text-red-600'
                    )}>
                      {change.risk?.charAt(0).toUpperCase() + change.risk?.slice(1) || 'Low'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-xs text-gray-500 mb-1">Impact</div>
                    <div className="text-lg font-bold text-green-500">Low</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-xs text-gray-500 mb-1">Complexity</div>
                    <div className="text-lg font-bold text-green-500">Low</div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {change.risk === 'low' || !change.risk
                    ? 'This is a low-risk configuration change. Service supports hot reload without interruption. No downtime expected.'
                    : 'Review risk factors carefully before proceeding with implementation.'}
                </p>
              </div>
            </div>

            {/* Approval Workflow */}
            <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <UserCheck size={16} className="text-blue-500" />
                  Approval Workflow
                </h3>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {change.approvals && change.approvals.length > 0 ? (
                    change.approvals.map((approval, index) => (
                      <div key={approval.id} className="relative">
                        {index < (change.approvals?.length || 0) - 1 && (
                          <div className="absolute left-[18px] top-[44px] w-0.5 h-4 bg-gray-200" />
                        )}
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className={clsx(
                            'w-9 h-9 rounded-full flex items-center justify-center text-white',
                            approval.decision === 'approved' && 'bg-green-500',
                            approval.decision === 'rejected' && 'bg-red-500',
                            !approval.decision && 'bg-gray-300'
                          )}>
                            {approval.decision === 'approved' && <Check size={16} />}
                            {approval.decision === 'rejected' && <XCircle size={16} />}
                            {!approval.decision && <Clock size={16} />}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{approval.approvalRole || 'Approval'}</div>
                            <div className="text-xs text-gray-500">
                              {approval.approver ? `${approval.approver.firstName} ${approval.approver.lastName}` : 'Pending'}
                            </div>
                          </div>
                          {approval.decidedAt && (
                            <div className="text-xs text-gray-500">
                              {format(toZonedTime(new Date(approval.decidedAt), 'Asia/Kolkata'), 'MMM d, HH:mm', { timeZone: 'Asia/Kolkata' })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      No approvals configured
                    </div>
                  )}
                </div>

                {canApprove && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setShowRejectModal(true)}
                      className="flex-1 px-4 py-2 border border-gray-200 bg-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                    <button
                      onClick={() => setShowApprovalModal(true)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                    >
                      <CheckCircle size={14} />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Affected CIs */}
            <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Server size={16} className="text-blue-500" />
                  Affected CIs
                </h3>
              </div>
              <div className="p-5 space-y-3">
                {affectedCIs.map((ci) => (
                  <div key={ci.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      {ci.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{ci.name}</div>
                      <div className="text-xs text-gray-500">{ci.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Records */}
            <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Link2 size={16} className="text-blue-500" />
                  Related Records
                </h3>
              </div>
              <div className="p-5 space-y-3">
                {relatedRecords.map((record) => (
                  <Link
                    key={record.id}
                    to={record.type === 'incident' ? `/incidents/${record.id}` : `/problems/${record.id}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className={clsx(
                      'w-8 h-8 rounded-lg flex items-center justify-center',
                      record.type === 'incident' && 'bg-red-100',
                      record.type === 'problem' && 'bg-purple-100'
                    )}>
                      {record.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">{record.id}</div>
                      <div className="text-xs text-gray-500">{record.title}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Schedule Info */}
            <div className="border rounded-xl" style={{ background: isDark ? 'rgba(17, 28, 50, 0.95)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
              <div className="p-4 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb' }}>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar size={16} className="text-blue-500" />
                  Schedule
                </h3>
              </div>
              <div className="p-5 space-y-3">
                <InfoRow
                  label="Scheduled Start"
                  value={change.scheduledStart ? format(toZonedTime(new Date(change.scheduledStart), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' }) : 'Not scheduled'}
                />
                <InfoRow
                  label="Scheduled End"
                  value={change.scheduledEnd ? format(toZonedTime(new Date(change.scheduledEnd), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' }) : 'Not scheduled'}
                />
                <InfoRow label="Created" value={format(toZonedTime(new Date(change.createdAt), 'Asia/Kolkata'), 'MMM d, yyyy HH:mm', { timeZone: 'Asia/Kolkata' })} />
                {change.downtimeRequired && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-3">
                    <p className="text-sm font-medium text-amber-800">Downtime Required</p>
                    <p className="text-xs text-amber-700">{change.downtimeMinutes} minutes estimated</p>
                  </div>
                )}
              </div>
            </div>

            {/* Back Button */}
            <Link
              to="/changes"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 border rounded-lg text-sm font-medium transition-all"
              style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e8eb', color: isDark ? '#cbd5e1' : undefined }}
            >
              <ArrowLeft size={14} />
              Back to Changes
            </Link>
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title="Approve Change"
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowApprovalModal(false)}
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Approving...' : 'Approve'}
            </button>
          </>
        }
      >
        <Textarea
          label="Comments (optional)"
          placeholder="Add any comments for this approval..."
          value={approvalComments}
          onChange={(e) => setApprovalComments(e.target.value)}
          rows={4}
        />
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Change"
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={isSubmitting || !rejectReason.trim()}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Rejecting...' : 'Reject'}
            </button>
          </>
        }
      >
        <Textarea
          label="Reason for rejection"
          placeholder="Please explain why this change is being rejected..."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
          required
        />
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

// Info Row Component
interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow = ({ label, value }: InfoRowProps) => (
  <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);

export default ChangeDetailPage;
