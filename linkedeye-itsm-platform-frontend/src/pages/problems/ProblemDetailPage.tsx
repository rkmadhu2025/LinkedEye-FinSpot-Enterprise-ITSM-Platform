import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Edit, MessageSquare, Send } from 'lucide-react';
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
  PageLoader,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchProblemById, updateProblem, addProblemComment } from '@/store/slices/problemsSlice';
import { TimelineItem } from '@/components/ui/Timeline';
import toast from 'react-hot-toast';

const ProblemDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentProblem: problem, isLoading, isSubmitting } = useAppSelector(
    (state) => state.problems
  );

  const [activeTab, setActiveTab] = useState('details');
  const [comment, setComment] = useState('');
  const [isPublicComment, setIsPublicComment] = useState(true);

  useEffect(() => {
    if (id) {
      dispatch(fetchProblemById(id));
    }
  }, [dispatch, id]);

  const handleAddComment = async () => {
    if (!id || !comment.trim()) return;
    const result = await dispatch(addProblemComment({ id, comment: comment.trim(), isPublic: isPublicComment }));
    if (addProblemComment.fulfilled.match(result)) {
      setComment('');
      toast.success('Comment added');
    } else {
      toast.error('Failed to add comment');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
      open: { label: 'Open', variant: 'info' },
      investigating: { label: 'Investigating', variant: 'warning' },
      root_cause_identified: { label: 'Root Cause Identified', variant: 'info' },
      known_error: { label: 'Known Error', variant: 'warning' },
      resolved: { label: 'Resolved', variant: 'success' },
      closed: { label: 'Closed', variant: 'info' },
    };
    const config = statusMap[status] || statusMap.open;
    return <StatusBadge status={config.label.toLowerCase().replace(' ', '_') as any} />;
  };

  if (isLoading || !problem) {
    return <PageLoader message="Loading problem..." />;
  }

  const timelineItems: TimelineItem[] = (problem.activities || []).map((activity) => ({
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/problems" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-primary-600">{problem.problemNumber}</span>
              <PriorityBadge priority={problem.priority} />
              {getStatusBadge(problem.status)}
            </div>
            <h1 className="text-xl font-bold text-gray-900 mt-1">{problem.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/problems/${id}/edit`}>
            <Button variant="outline" leftIcon={<Edit size={16} />}>
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="details" value={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab value="details">Details</Tab>
          <Tab value="incidents">Related Incidents ({problem.relatedIncidents?.length || 0})</Tab>
          <Tab value="activities">Activity ({problem.activities?.length || 0})</Tab>
        </TabList>

        <TabPanel value="details">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Description</h2>
                </CardHeader>
                <CardBody>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {problem.description || 'No description provided'}
                  </p>
                </CardBody>
              </Card>

              {problem.rootCause && (
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold">Root Cause</h2>
                  </CardHeader>
                  <CardBody>
                    <p className="text-gray-700 whitespace-pre-wrap">{problem.rootCause}</p>
                  </CardBody>
                </Card>
              )}

              {problem.workaround && (
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold">Workaround</h2>
                  </CardHeader>
                  <CardBody>
                    <p className="text-gray-700 whitespace-pre-wrap">{problem.workaround}</p>
                    {problem.workaroundAvailable && (
                      <Badge variant="success" className="mt-2">Workaround Available</Badge>
                    )}
                  </CardBody>
                </Card>
              )}

              {problem.permanentFix && (
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold">Permanent Fix</h2>
                  </CardHeader>
                  <CardBody>
                    <p className="text-gray-700 whitespace-pre-wrap">{problem.permanentFix}</p>
                  </CardBody>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Information</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(problem.status)}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Priority</label>
                    <div className="mt-1">
                      <PriorityBadge priority={problem.priority} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Category</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{problem.category}</p>
                  </div>
                  {problem.environment && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">Environment</label>
                      <p className="mt-1 text-sm text-gray-900">{problem.environment.name}</p>
                    </div>
                  )}
                  {problem.assignee && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">Assigned To</label>
                      <div className="mt-1 flex items-center gap-2">
                        <Avatar name={`${problem.assignee.firstName} ${problem.assignee.lastName}`} size="sm" />
                        <span className="text-sm text-gray-900">
                          {problem.assignee.firstName} {problem.assignee.lastName}
                        </span>
                      </div>
                    </div>
                  )}
                  {problem.reporter && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">Reported By</label>
                      <div className="mt-1 flex items-center gap-2">
                        <Avatar name={`${problem.reporter.firstName} ${problem.reporter.lastName}`} size="sm" />
                        <span className="text-sm text-gray-900">
                          {problem.reporter.firstName} {problem.reporter.lastName}
                        </span>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-gray-500">Created</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {format(new Date(problem.createdAt), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  {problem.resolvedAt && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">Resolved</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {format(new Date(problem.resolvedAt), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="incidents">
          <Card>
            <CardBody>
              {problem.relatedIncidents && problem.relatedIncidents.length > 0 ? (
                <div className="space-y-3">
                  {problem.relatedIncidents.map((incident) => (
                    <Link
                      key={incident.id}
                      to={`/incidents/${incident.id}`}
                      className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-sm text-primary-600">{incident.incidentNumber}</span>
                          <p className="font-medium text-gray-900 mt-1">{incident.title}</p>
                        </div>
                        <StatusBadge status={incident.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No related incidents</p>
              )}
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel value="activities">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Add Comment</h2>
              </CardHeader>
              <CardBody className="space-y-4">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={isPublicComment}
                      onChange={(e) => setIsPublicComment(e.target.checked)}
                      className="rounded"
                    />
                    Public comment
                  </label>
                  <Button
                    onClick={handleAddComment}
                    leftIcon={<Send size={16} />}
                    disabled={!comment.trim() || isSubmitting}
                  >
                    Add Comment
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Activity Timeline</h2>
              </CardHeader>
              <CardBody>
                <Timeline items={timelineItems} />
              </CardBody>
            </Card>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default ProblemDetailPage;
