import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
} from '@/components/ui';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import { createProblem } from '@/store/slices/problemsSlice';
import { fetchGroups, fetchUsers } from '@/store/slices/usersSlice';
import toast from 'react-hot-toast';

const problemSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum(['hardware', 'software', 'network', 'security', 'access', 'database', 'other']),
  impact: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  assignedTo: z.string().optional(),
  assignedGroupId: z.string().optional(),
  environmentId: z.string().optional(),
  tags: z.string().optional(),
});

type ProblemFormData = z.infer<typeof problemSchema>;

const ProblemCreatePage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isSubmitting } = useAppSelector((state) => state.problems);
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
    formState: { errors },
  } = useForm<ProblemFormData>({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      priority: 'medium',
      category: 'software',
      impact: 'medium',
    },
  });

  const onSubmit = async (data: ProblemFormData) => {
    const tags = data.tags
      ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];

    const result = await dispatch(
      createProblem({
        ...data,
        tags,
      })
    );

    if (createProblem.fulfilled.match(result)) {
      toast.success('Problem created successfully');
      navigate(`/problems/${result.payload.id}`);
    } else {
      toast.error(result.payload as string || 'Failed to create problem');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/problems" className="p-2 rounded-lg transition-colors" style={{ color: isDark ? '#f8fafc' : undefined }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>Create Problem</h1>
          <p className="mt-1" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>Create a new problem record</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Problem Details</h2>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDark ? '#e2e8f0' : '#374151' }}>
                Title <span className="text-danger-500">*</span>
              </label>
              <Input
                {...register('title')}
                placeholder="Brief description of the problem"
                error={errors.title?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDark ? '#e2e8f0' : '#374151' }}>
                Description
              </label>
              <Textarea
                {...register('description')}
                placeholder="Detailed description of the problem"
                rows={6}
                error={errors.description?.message}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Impact
                </label>
                <Select
                  {...register('impact')}
                  options={[
                    { value: 'critical', label: 'Critical' },
                    { value: 'high', label: 'High' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'low', label: 'Low' },
                  ]}
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
                Environment
              </label>
              <Select
                {...register('environmentId')}
                options={[
                  { value: '', label: 'Select Environment' },
                  ...environments.map((e) => ({
                    value: e.id,
                    label: e.name,
                  })),
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <Input
                {...register('tags')}
                placeholder="Comma-separated tags (e.g., network, critical, production)"
              />
            </div>
          </CardBody>
          <CardFooter className="flex justify-end gap-3">
            <Link to="/problems">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" leftIcon={<Save size={16} />} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Problem'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
};

export default ProblemCreatePage;
