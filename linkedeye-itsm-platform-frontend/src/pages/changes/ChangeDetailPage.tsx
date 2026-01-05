import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Edit,
  MoreVertical,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Send,
  Play,
  Square,
  RotateCcw,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
  StatusBadge,
  PriorityBadge,
  Avatar,
  AvatarGroup,
  Timeline,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Textarea,
  Modal,
  PageLoader,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchChangeById, approveChange, rejectChange, submitChangeForApproval } from '@/store/slices/changesSlice';
import { TimelineItem } from '@/components/ui/Timeline';
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

  const [activeTab, setActiveTab] = useState('details');
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

  const handleSubmitForApproval = async () => {
    if (!id) return;
    const result = await dispatch(submitChangeForApproval(id));
    if (submitChangeForApproval.fulfilled.match(result)) {
      toast.success('Change submitted for approval');
    }
  };

  if (isLoading || !change) {
    return <PageLoader message="Loading change request..." />;
  }

  const canApprove = change.status === 'pending_approval' && change.approvals?.some(
    (a) => a.approverId === user?.id && !a.decision
  );

  const timelineItems: TimelineItem[] = (change.activities || []).map((activity) => ({
    id: activity.id,
    type: activity.activityType as TimelineItem['type'],
    content: activity.comment || `Changed ${activity.fieldName}`,
    user: activity.user
      ? { name: `${activity.user.firstName} ${activity.user.lastName}`, avatar: activity.user.avatarUrl }
      : undefined,
    timestamp: activity.createdAt,
    metadata: {
      oldValue: activity.oldValue || undefined,
      newValue: activity.newValue || undefined,
      fieldName: activity.fieldName || undefined,
    },
  }));

  const statusActions = () => {
    switch (change.status) {
      case 'draft':
        return (
          <Button onClick={handleSubmitForApproval} leftIcon={<Send size={16} />}>
            Submit for Approval
          </Button>
        );
      case 'approved':
      case 'scheduled':
        return (
          <Button variant="success" leftIcon={<Play size={16} />}>
            Start Implementation
          </Button>
        );
      case 'implementing':
        return (
          <>
            <Button variant="success" leftIcon={<CheckCircle size={16} />}>
              Mark Complete
            </Button>
            <Button variant="danger" leftIcon={<XCircle size={16} />}>
              Mark Failed
            </Button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/changes" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-primary-600">{change.changeNumber}</span>
              <Badge className={clsx(
                change.changeType === 'emergency' && 'bg-red-100 text-red-800',
                change.changeType === 'normal' && 'bg-blue-100 text-blue-800',
                change.changeType === 'standard' && 'bg-gray-100 text-gray-800'
              )}>
                {change.changeType}
              </Badge>
              <PriorityBadge priority={change.risk} />
              <StatusBadge status={change.status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{change.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {statusActions()}
          <Link to={`/changes/${id}/edit`}>
            <Button variant="outline" leftIcon={<Edit size={16} />}>
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Approval Banner */}
      {canApprove && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-yellow-600" size={24} />
                <div>
                  <p className="font-medium text-yellow-800">Approval Required</p>
                  <p className="text-sm text-yellow-700">This change is waiting for your approval</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowRejectModal(true)} leftIcon={<XCircle size={16} />}>
                  Reject
                </Button>
                <Button variant="success" onClick={() => setShowApprovalModal(true)} leftIcon={<CheckCircle size={16} />}>
                  Approve
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>Description & Justification</CardHeader>
            <CardBody className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {change.description || 'No description provided.'}
                </p>
              </div>
              {change.justification && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Justification</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{change.justification}</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Plans */}
          <Card padding="none">
            <Tabs defaultValue="implementation" value={activeTab} onChange={setActiveTab}>
              <TabList className="px-5">
                <Tab value="implementation" icon={<FileText size={16} />}>
                  Implementation
                </Tab>
                <Tab value="rollback" icon={<RotateCcw size={16} />}>
                  Rollback
                </Tab>
                <Tab value="test" icon={<CheckCircle size={16} />}>
                  Test Plan
                </Tab>
                <Tab value="timeline">Timeline</Tab>
              </TabList>

              <TabPanel value="implementation" className="px-5 pb-5">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {change.implementationPlan || 'No implementation plan provided.'}
                </pre>
              </TabPanel>

              <TabPanel value="rollback" className="px-5 pb-5">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {change.rollbackPlan || 'No rollback plan provided.'}
                </pre>
              </TabPanel>

              <TabPanel value="test" className="px-5 pb-5">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {change.testPlan || 'No test plan provided.'}
                </pre>
              </TabPanel>

              <TabPanel value="timeline" className="px-5 pb-5">
                {timelineItems.length > 0 ? (
                  <Timeline items={timelineItems} />
                ) : (
                  <p className="text-gray-500 text-center py-8">No activity yet</p>
                )}
              </TabPanel>
            </Tabs>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Schedule */}
          <Card>
            <CardHeader>Schedule</CardHeader>
            <CardBody className="space-y-4">
              <DetailItem
                label="Scheduled Start"
                value={change.scheduledStart
                  ? format(new Date(change.scheduledStart), 'MMM d, yyyy h:mm a')
                  : 'Not scheduled'}
                icon={<Calendar size={14} />}
              />
              <DetailItem
                label="Scheduled End"
                value={change.scheduledEnd
                  ? format(new Date(change.scheduledEnd), 'MMM d, yyyy h:mm a')
                  : 'Not scheduled'}
                icon={<Clock size={14} />}
              />
              {change.downtimeRequired && (
                <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                  <p className="text-sm font-medium text-warning-800">Downtime Required</p>
                  <p className="text-xs text-warning-700">
                    {change.downtimeMinutes} minutes estimated
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Approvals */}
          <Card>
            <CardHeader>Approvals</CardHeader>
            <CardBody>
              {change.approvals && change.approvals.length > 0 ? (
                <div className="space-y-3">
                  {change.approvals.map((approval) => (
                    <div key={approval.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={approval.approver
                            ? `${approval.approver.firstName} ${approval.approver.lastName}`
                            : 'Unknown'}
                          size="sm"
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {approval.approver
                              ? `${approval.approver.firstName} ${approval.approver.lastName}`
                              : 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">{approval.approvalRole || 'Approver'}</p>
                        </div>
                      </div>
                      <div>
                        {approval.decision === 'approved' && (
                          <CheckCircle size={20} className="text-success-500" />
                        )}
                        {approval.decision === 'rejected' && (
                          <XCircle size={20} className="text-danger-500" />
                        )}
                        {!approval.decision && (
                          <Clock size={20} className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No approvers assigned</p>
              )}
            </CardBody>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>Details</CardHeader>
            <CardBody className="space-y-4">
              <DetailItem label="Category" value={change.category} />
              <DetailItem label="Environment" value={change.environment?.name || 'Not specified'} />
              <DetailItem
                label="Created"
                value={format(new Date(change.createdAt), 'MMM d, yyyy h:mm a')}
              />
            </CardBody>
          </Card>

          {/* People */}
          <Card>
            <CardHeader>People</CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Requested By</p>
                {change.requester && (
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={`${change.requester.firstName} ${change.requester.lastName}`}
                      size="sm"
                    />
                    <span className="text-sm font-medium">
                      {change.requester.firstName} {change.requester.lastName}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                {change.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={`${change.assignee.firstName} ${change.assignee.lastName}`}
                      size="sm"
                    />
                    <span className="text-sm font-medium">
                      {change.assignee.firstName} {change.assignee.lastName}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Unassigned</span>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Affected Assets */}
          {change.affectedAssets && change.affectedAssets.length > 0 && (
            <Card>
              <CardHeader>Affected Assets</CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {change.affectedAssets.map((asset) => (
                    <Link
                      key={asset.id}
                      to={`/assets/${asset.id}`}
                      className="block p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">{asset.name}</p>
                      <p className="text-xs text-gray-500">{asset.assetTag}</p>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
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
            <Button variant="secondary" onClick={() => setShowApprovalModal(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleApprove} isLoading={isSubmitting}>
              Approve
            </Button>
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
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              isLoading={isSubmitting}
              disabled={!rejectReason.trim()}
            >
              Reject
            </Button>
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

interface DetailItemProps {
  label: string;
  value: string | undefined;
  icon?: React.ReactNode;
}

const DetailItem = ({ label, value, icon }: DetailItemProps) => (
  <div>
    <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
      {icon}
      {label}
    </p>
    <p className="text-sm font-medium text-gray-900 capitalize">{value || '-'}</p>
  </div>
);

export default ChangeDetailPage;
