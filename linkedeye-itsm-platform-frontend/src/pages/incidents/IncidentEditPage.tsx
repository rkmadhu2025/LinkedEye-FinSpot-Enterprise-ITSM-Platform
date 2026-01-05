import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, X } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Input,
  Select,
  Textarea,
  PageLoader,
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { fetchIncidentById, updateIncident } from '@/store/slices/incidentsSlice';
import { fetchGroups, fetchUsers } from '@/store/slices/usersSlice';
import toast from 'react-hot-toast';

const incidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'pending', 'resolved', 'closed']),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum(['hardware', 'software', 'network', 'security', 'access', 'database', 'other']),
  impact: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  urgency: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assignedTo: z.string().optional(),
  assignedGroupId: z.string().optional(),
  environmentId: z.string().optional(),
  resolutionNotes: z.string().optional(),
  rootCause: z.string().optional(),
  workaround: z.string().optional(),
  tags: z.string().optional(),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

const IncidentEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentIncident: incident, isLoading, isSubmitting } = useAppSelector(
    (state) => state.incidents
  );
  const { users, groups } = useAppSelector((state) => state.users);

  const [environments] = useState([
    { id: '1', name: 'Production' },
    { id: '2', name: 'Staging' },
    { id: '3', name: 'Development' },
    { id: '4', name: 'QA' },
  ]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchIncidentById(id));
      dispatch(fetchGroups());
      dispatch(fetchUsers({ page: 1, limit: 100 }));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (incident) {
      reset({
        title: incident.title,
        description: incident.description || '',
        status: incident.status,
        priority: incident.priority,
        category: incident.category,
        impact: incident.impact,
        urgency: incident.urgency,
        assignedTo: incident.assignedTo || '',
        assignedGroupId: incident.assignedGroupId || '',
        environmentId: incident.environmentId || '',
        resolutionNotes: incident.resolutionNotes || '',
        rootCause: incident.rootCause || '',
        workaround: incident.workaround || '',
        tags: incident.tags?.join(', ') || '',
      });
    }
  }, [incident, reset]);

  const onSubmit = async (data: IncidentFormData) => {
    if (!id) return;

    const tags = data.tags
      ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const result = await dispatch(
      updateIncident({
        id,
        data: {
          ...data,
          tags,
          assignedTo: data.assignedTo || undefined,
          assignedGroupId: data.assignedGroupId || undefined,
          environmentId: data.environmentId || undefined,
        },
      })
    );

    if (updateIncident.fulfilled.match(result)) {
      toast.success('Incident updated successfully');
      navigate(`/incidents/${id}`);
    } else {
      toast.error('Failed to update incident');
    }
  };

  if (isLoading || !incident) {
    return <PageLoader message="Loading incident..." />;
  }

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'pending', label: 'Pending' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  const priorityOptions = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const categoryOptions = [
    { value: 'hardware', label: 'Hardware' },
    { value: 'software', label: 'Software' },
    { value: 'network', label: 'Network' },
    { value: 'security', label: 'Security' },
    { value: 'access', label: 'Access' },
    { value: 'database', label: 'Database' },
    { value: 'other', label: 'Other' },
  ];

  const userOptions = [
    { value: '', label: 'Unassigned' },
    ...users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` })),
  ];

  const groupOptions = [
    { value: '', label: 'No Group' },
    ...groups.map((g) => ({ value: g.id, label: g.name })),
  ];

  const environmentOptions = [
    { value: '', label: 'Not Specified' },
    ...environments.map((e) => ({ value: e.id, label: e.name })),
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={`/incidents/${id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-primary-600">{incident.incidentNumber}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Incident</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>Basic Information</CardHeader>
            <CardBody className="space-y-4">
              <Input
                label="Title"
                placeholder="Brief description of the incident"
                error={errors.title?.message}
                required
                {...register('title')}
              />

              <Textarea
                label="Description"
                placeholder="Provide detailed information about the incident..."
                rows={5}
                error={errors.description?.message}
                {...register('description')}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Status"
                  options={statusOptions}
                  error={errors.status?.message}
                  required
                  {...register('status')}
                />
                <Select
                  label="Category"
                  options={categoryOptions}
                  error={errors.category?.message}
                  required
                  {...register('category')}
                />
              </div>
            </CardBody>
          </Card>

          {/* Priority */}
          <Card>
            <CardHeader>Priority & Impact</CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Priority"
                  options={priorityOptions}
                  error={errors.priority?.message}
                  required
                  {...register('priority')}
                />
                <Select
                  label="Impact"
                  options={priorityOptions}
                  {...register('impact')}
                />
                <Select
                  label="Urgency"
                  options={priorityOptions}
                  {...register('urgency')}
                />
              </div>
            </CardBody>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>Assignment</CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Assignment Group"
                  options={groupOptions}
                  {...register('assignedGroupId')}
                />
                <Select
                  label="Assigned To"
                  options={userOptions}
                  {...register('assignedTo')}
                />
              </div>
            </CardBody>
          </Card>

          {/* Resolution (if resolved/closed) */}
          <Card>
            <CardHeader>Resolution</CardHeader>
            <CardBody className="space-y-4">
              <Textarea
                label="Resolution Notes"
                placeholder="Describe how the incident was resolved..."
                rows={4}
                {...register('resolutionNotes')}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Textarea
                  label="Root Cause"
                  placeholder="What was the root cause?"
                  rows={3}
                  {...register('rootCause')}
                />
                <Textarea
                  label="Workaround"
                  placeholder="Any workaround applied?"
                  rows={3}
                  {...register('workaround')}
                />
              </div>
            </CardBody>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>Additional Information</CardHeader>
            <CardBody className="space-y-4">
              <Select
                label="Environment"
                options={environmentOptions}
                {...register('environmentId')}
              />

              <Input
                label="Tags"
                placeholder="Enter tags separated by commas"
                hint="e.g., database, production, critical-app"
                {...register('tags')}
              />
            </CardBody>
          </Card>

          {/* Actions */}
          <Card>
            <CardFooter className="flex justify-between">
              <div>
                {isDirty && (
                  <span className="text-sm text-warning-600">You have unsaved changes</span>
                )}
              </div>
              <div className="flex gap-3">
                <Link to={`/incidents/${id}`}>
                  <Button variant="secondary" leftIcon={<X size={16} />}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
                  Save Changes
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default IncidentEditPage;
