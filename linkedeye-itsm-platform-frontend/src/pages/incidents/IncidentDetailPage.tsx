import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Edit,
  MoreVertical,
  Clock,
  User,
  Users,
  Tag,
  Paperclip,
  MessageSquare,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Send,
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
  Timeline,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Textarea,
  Input,
  Select,
  Modal,
  PageLoader,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchIncidentById, updateIncident, addIncidentComment } from '@/store/slices/incidentsSlice';
import { TimelineItem } from '@/components/ui/Timeline';
import clsx from 'clsx';

const IncidentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentIncident: incident, isLoading, isSubmitting } = useAppSelector(
    (state) => state.incidents
  );

  const [activeTab, setActiveTab] = useState('details');
  const [comment, setComment] = useState('');
  const [isPublicComment, setIsPublicComment] = useState(true);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchIncidentById(id));
    }
  }, [dispatch, id]);

  const handleAddComment = async () => {
    if (!id || !comment.trim()) return;
    await dispatch(addIncidentComment({ id, comment: comment.trim(), isPublic: isPublicComment }));
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

  const getSlaStatus = () => {
    if (!incident.slaResolutionDue) return null;
    const now = new Date();
    const due = new Date(incident.slaResolutionDue);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (incident.resolvedAt) return { status: 'met', label: 'SLA Met', color: 'text-success-600' };
    if (diffHours < 0) return { status: 'breached', label: 'SLA Breached', color: 'text-danger-600' };
    if (diffHours < 2) return { status: 'at_risk', label: 'At Risk', color: 'text-warning-600' };
    return { status: 'on_track', label: 'On Track', color: 'text-success-600' };
  };

  const slaStatus = getSlaStatus();

  const timelineItems: TimelineItem[] = (incident.activities || []).map((activity) => ({
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
    isPublic: activity.isPublic,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/incidents"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-primary-600">{incident.incidentNumber}</span>
              <PriorityBadge priority={incident.priority} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{incident.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={incident.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'pending', label: 'Pending' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
            className="w-40"
          />
          <Link to={`/incidents/${id}/edit`}>
            <Button variant="outline" leftIcon={<Edit size={16} />}>
              Edit
            </Button>
          </Link>
          <Button variant="ghost" className="p-2">
            <MoreVertical size={20} />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description Card */}
          <Card>
            <CardHeader>Description</CardHeader>
            <CardBody>
              <p className="text-gray-700 whitespace-pre-wrap">
                {incident.description || 'No description provided.'}
              </p>
            </CardBody>
          </Card>

          {/* Tabs for Timeline, Comments, Related */}
          <Card padding="none">
            <Tabs defaultValue="timeline" value={activeTab} onChange={setActiveTab}>
              <TabList className="px-5">
                <Tab value="timeline" icon={<History size={16} />}>
                  Timeline
                </Tab>
                <Tab value="comments" icon={<MessageSquare size={16} />} badge={incident.activities?.filter(a => a.activityType === 'comment').length}>
                  Comments
                </Tab>
                <Tab value="worknotes" icon={<MessageSquare size={16} />}>
                  Work Notes
                </Tab>
              </TabList>

              <TabPanel value="timeline" className="px-5 pb-5">
                {timelineItems.length > 0 ? (
                  <Timeline items={timelineItems} />
                ) : (
                  <p className="text-gray-500 text-center py-8">No activity yet</p>
                )}
              </TabPanel>

              <TabPanel value="comments" className="px-5 pb-5">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Avatar name="Current User" size="sm" />
                    <div className="flex-1">
                      <Textarea
                        placeholder="Add a comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                      />
                      <div className="flex items-center justify-between mt-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={isPublicComment}
                            onChange={(e) => setIsPublicComment(e.target.checked)}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          Visible to customer
                        </label>
                        <Button
                          size="sm"
                          onClick={handleAddComment}
                          disabled={!comment.trim()}
                          isLoading={isSubmitting}
                          leftIcon={<Send size={14} />}
                        >
                          Add Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabPanel>

              <TabPanel value="worknotes" className="px-5 pb-5">
                <p className="text-gray-500 text-center py-8">Internal work notes will appear here</p>
              </TabPanel>
            </Tabs>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* SLA Card */}
          {slaStatus && (
            <Card className={clsx(
              'border-l-4',
              slaStatus.status === 'breached' && 'border-l-danger-500',
              slaStatus.status === 'at_risk' && 'border-l-warning-500',
              slaStatus.status === 'on_track' && 'border-l-success-500',
              slaStatus.status === 'met' && 'border-l-success-500'
            )}>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">SLA Status</span>
                  <span className={clsx('text-sm font-medium', slaStatus.color)}>
                    {slaStatus.label}
                  </span>
                </div>
                {incident.slaResolutionDue && (
                  <div className="text-sm text-gray-600">
                    <Clock size={14} className="inline mr-1" />
                    Due: {format(new Date(incident.slaResolutionDue), 'MMM d, h:mm a')}
                  </div>
                )}
                {/* SLA Progress Bar */}
                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      slaStatus.status === 'breached' && 'bg-danger-500 w-full',
                      slaStatus.status === 'at_risk' && 'bg-warning-500 w-4/5',
                      slaStatus.status === 'on_track' && 'bg-success-500 w-1/2',
                      slaStatus.status === 'met' && 'bg-success-500 w-full'
                    )}
                  />
                </div>
              </CardBody>
            </Card>
          )}

          {/* Details Card */}
          <Card>
            <CardHeader>Details</CardHeader>
            <CardBody className="space-y-4">
              <DetailItem label="Category" value={incident.category} />
              <DetailItem label="Impact" value={incident.impact} />
              <DetailItem label="Urgency" value={incident.urgency} />
              <DetailItem
                label="Environment"
                value={incident.environment?.name || 'Not specified'}
              />
              <DetailItem
                label="Created"
                value={format(new Date(incident.createdAt), 'MMM d, yyyy h:mm a')}
              />
              {incident.resolvedAt && (
                <DetailItem
                  label="Resolved"
                  value={format(new Date(incident.resolvedAt), 'MMM d, yyyy h:mm a')}
                />
              )}
            </CardBody>
          </Card>

          {/* People Card */}
          <Card>
            <CardHeader>People</CardHeader>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Reporter</p>
                {incident.reporter && (
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={`${incident.reporter.firstName} ${incident.reporter.lastName}`}
                      size="sm"
                    />
                    <span className="text-sm font-medium">
                      {incident.reporter.firstName} {incident.reporter.lastName}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Assigned To</p>
                {incident.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={`${incident.assignee.firstName} ${incident.assignee.lastName}`}
                      size="sm"
                    />
                    <span className="text-sm font-medium">
                      {incident.assignee.firstName} {incident.assignee.lastName}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Unassigned</span>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Assignment Group</p>
                {incident.assignedGroup ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <Users size={14} className="text-primary-600" />
                    </div>
                    <span className="text-sm font-medium">{incident.assignedGroup.name}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Not assigned</span>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Tags Card */}
          {incident.tags && incident.tags.length > 0 && (
            <Card>
              <CardHeader>Tags</CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {incident.tags.map((tag) => (
                    <Badge key={tag} variant="default">
                      <Tag size={12} className="mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Resolution Card */}
          {incident.resolutionNotes && (
            <Card className="border-l-4 border-l-success-500">
              <CardHeader>Resolution</CardHeader>
              <CardBody>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {incident.resolutionNotes}
                </p>
                {incident.rootCause && (
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-1">Root Cause</p>
                    <p className="text-sm text-gray-700">{incident.rootCause}</p>
                  </div>
                )}
              </CardBody>
            </Card>
          )}
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
            <Button variant="secondary" onClick={() => setShowResolveModal(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleResolve}
              disabled={!resolutionNotes.trim()}
              isLoading={isSubmitting}
            >
              Resolve Incident
            </Button>
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

interface DetailItemProps {
  label: string;
  value: string | undefined;
}

const DetailItem = ({ label, value }: DetailItemProps) => (
  <div>
    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-gray-900 capitalize">{value || '-'}</p>
  </div>
);

export default IncidentDetailPage;
