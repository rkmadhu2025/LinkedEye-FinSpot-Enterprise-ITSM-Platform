import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
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
import { fetchProblemById, updateProblem } from '@/store/slices/problemsSlice';
import { fetchGroups, fetchUsers } from '@/store/slices/usersSlice';
import toast from 'react-hot-toast';

const problemSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  status: z.enum(['open', 'investigating', 'root_cause_identified', 'known_error', 'resolved', 'closed']).optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum(['hardware', 'software', 'network', 'security', 'access', 'database', 'other']),
  impact: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assignedTo: z.string().optional(),
  assignedGroupId: z.string().optional(),
  rootCause: z.string().optional(),
  workaround: z.string().optional(),
  permanentFix: z.string().optional(),
  tags: z.string().optional(),
});

type ProblemFormData = z.infer<typeof problemSchema>;

const ProblemEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentProblem: problem, isLoading, isSubmitting } = useAppSelector((state) => state.problems);
  const { users, groups } = useAppSelector((state) => state.users);
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (id) {
      dispatch(fetchProblemById(id));
      dispatch(fetchGroups());
      dispatch(fetchUsers({ page: 1, limit: 100 }));
    }
  }, [dispatch, id]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProblemFormData>({
    resolver: zodResolver(problemSchema),
  });

  useEffect(() => {
    if (problem) {
      reset({
        title: problem.title,
        description: problem.description || '',
        status: problem.status,
        priority: problem.priority,
        category: problem.category,
        impact: problem.impact,
        assignedTo: problem.assignedTo || '',
        assignedGroupId: problem.assignedGroupId || '',
        rootCause: problem.rootCause || '',
        workaround: problem.workaround || '',
        permanentFix: problem.permanentFix || '',
        tags: problem.tags?.join(', ') || '',
      });
    }
  }, [problem, reset]);

  const onSubmit = async (data: ProblemFormData) => {
    if (!id) return;

    const tags = data.tags
      ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const result = await dispatch(
      updateProblem({
        id,
        data: {
          ...data,
          tags,
          assignedTo: data.assignedTo || undefined,
          assignedGroupId: data.assignedGroupId || undefined,
        },
      })
    );

    if (updateProblem.fulfilled.match(result)) {
      toast.success('Problem updated successfully');
      navigate(`/problems/${id}`);
    } else {
      toast.error(result.payload as string || 'Failed to update problem');
    }
  };

  if (isLoading || !problem) {
    return <PageLoader message="Loading problem..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/problems/${id}`} className="p-2 rounded-lg transition-colors" style={{ color: isDark ? '#f8fafc' : undefined }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>Edit Problem</h1>
          <p className="mt-1" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Update problem details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Problem Details</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title <span className="text-danger-500">*</span>
              </label>
              <Input
                {...register('title')}
                error={errors.title?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <Textarea
                {...register('description')}
                rows={6}
                error={errors.description?.message}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <Select
                  {...register('status')}
                  options={[
                    { value: 'open', label: 'Open' },
                    { value: 'investigating', label: 'Investigating' },
                    { value: 'root_cause_identified', label: 'Root Cause Identified' },
                    { value: 'known_error', label: 'Known Error' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'closed', label: 'Closed' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority <span className="text-danger-500">*</span>
                </label>
                <Select
                  {...register('priority')}
                  options={[
                    { value: 'critical', label: 'Critical' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' },
                  ]}
                  error={errors.priority?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category <span className="text-danger-500">*</span>
                </label>
                <Select
                  {...register('category')}
                  options={[
                    { value: 'hardware', label: 'Hardware' },
                    { value: 'software', label: 'Software' },
                    { value: 'network', label: 'Network' },
                    { value: 'security', label: 'Security' },
                    { value: 'access', label: 'Access' },
                    { value: 'database', label: 'Database' },
                    { value: 'other', label: 'Other' },
                  ]}
                  error={errors.category?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assigned To
                </label>
                <Select
                  {...register('assignedTo')}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...users.map((u) => ({
                      value: u.id,
                      label: `${u.firstName} ${u.lastName}`,
                    })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Group
                </label>
                <Select
                  {...register('assignedGroupId')}
                  options={[
                    { value: '', label: 'No Group' },
                    ...groups.map((g) => ({
                      value: g.id,
                      label: g.name,
                    })),
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Root Cause
              </label>
              <Textarea
                {...register('rootCause')}
                rows={4}
                placeholder="Root cause analysis..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workaround
              </label>
              <Textarea
                {...register('workaround')}
                rows={4}
                placeholder="Temporary workaround..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Permanent Fix
              </label>
              <Textarea
                {...register('permanentFix')}
                rows={4}
                placeholder="Permanent solution..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <Input
                {...register('tags')}
                placeholder="Comma-separated tags"
              />
            </div>
          </CardBody>
          <CardFooter className="flex justify-end gap-3">
            <Link to={`/problems/${id}`}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" leftIcon={<Save size={16} />} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default ProblemEditPage;
