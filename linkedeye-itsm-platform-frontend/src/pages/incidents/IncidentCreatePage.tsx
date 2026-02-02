import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { createIncident } from '@/store/slices/incidentsSlice';
import { fetchGroups, fetchUsers } from '@/store/slices/usersSlice';
import toast from 'react-hot-toast';

const incidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum(['hardware', 'software', 'network', 'security', 'access', 'database', 'other']),
  impact: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  urgency: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assignedTo: z.string().optional(),
  assignedGroupId: z.string().optional(),
  environmentId: z.string().optional(),
  tags: z.string().optional(),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

const IncidentCreatePage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isSubmitting } = useAppSelector((state) => state.incidents);
  const { users, groups } = useAppSelector((state) => state.users);
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  const [environments] = useState([
    { id: '1', name: 'Production' },
    { id: '2', name: 'Staging' },
    { id: '3', name: 'Development' },
    { id: '4', name: 'QA' },
  ]);

  useEffect(() => {
    dispatch(fetchGroups());
    dispatch(fetchUsers({ page: 1, limit: 100 }));
  }, [dispatch]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      priority: 'medium',
      category: 'software',
      impact: 'medium',
      urgency: 'medium',
    },
  });

  const impact = watch('impact');
  const urgency = watch('urgency');

  // Auto-calculate priority based on impact and urgency
  const calculatePriority = (impact?: string, urgency?: string) => {
    const matrix: Record<string, Record<string, string>> = {
      critical: { critical: 'critical', high: 'critical', medium: 'high', low: 'medium' },
      high: { critical: 'critical', high: 'high', medium: 'high', low: 'medium' },
      medium: { critical: 'high', high: 'high', medium: 'medium', low: 'low' },
      low: { critical: 'medium', high: 'medium', medium: 'low', low: 'low' },
    };
    if (!impact || !urgency) return 'medium';
    return matrix[impact]?.[urgency] || 'medium';
  };

  const onSubmit = async (data: IncidentFormData) => {
    const tags = data.tags
      ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const result = await dispatch(
      createIncident({
        ...data,
        tags,
        priority: calculatePriority(data.impact, data.urgency) as any,
      })
    );

    if (createIncident.fulfilled.match(result)) {
      toast.success('Incident created successfully');
      navigate(`/incidents/${result.payload.id}`);
    } else {
      toast.error('Failed to create incident');
    }
  };

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
        <Link to="/incidents" className="p-2 rounded-lg transition-colors" style={{ background: 'transparent' }} onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <ArrowLeft size={20} style={{ color: isDark ? '#cbd5e1' : undefined }} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>Create Incident</h1>
          <p className="mt-1" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Report a new IT incident</p>
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
                required
                {...register('description')}
              />

              <Select
                label="Category"
                options={categoryOptions}
                error={errors.category?.message}
                required
                {...register('category')}
              />
            </CardBody>
          </Card>

          {/* Impact & Urgency */}
          <Card>
            <CardHeader>Impact & Urgency</CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Impact"
                  options={priorityOptions}
                  hint="How many users/systems are affected?"
                  {...register('impact')}
                />
                <Select
                  label="Urgency"
                  options={priorityOptions}
                  hint="How quickly does this need to be resolved?"
                  {...register('urgency')}
                />
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: isDark ? '#cbd5e1' : '#374151' }}>
                    Calculated Priority
                  </label>
                  <div className="px-3 py-2 border rounded-lg text-sm font-medium capitalize" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f3f4f6', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#d1d5db', color: isDark ? '#f8fafc' : undefined }}>
                    {calculatePriority(impact, urgency)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated from impact and urgency
                  </p>
                </div>
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
            <CardFooter className="flex justify-end gap-3">
              <Link to="/incidents">
                <Button variant="secondary" leftIcon={<X size={16} />}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
                Create Incident
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default IncidentCreatePage;
