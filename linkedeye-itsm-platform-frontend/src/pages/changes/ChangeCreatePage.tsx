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
import { createChange } from '@/store/slices/changesSlice';
import { fetchGroups, fetchUsers } from '@/store/slices/usersSlice';
import toast from 'react-hot-toast';

const changeSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  justification: z.string().optional(),
  changeType: z.enum(['standard', 'normal', 'emergency']),
  risk: z.enum(['critical', 'high', 'medium', 'low']),
  category: z.enum(['infrastructure', 'application', 'database', 'network', 'security', 'hardware', 'other']),
  environmentId: z.string().optional(),
  implementationPlan: z.string().optional(),
  rollbackPlan: z.string().optional(),
  testPlan: z.string().optional(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  downtimeRequired: z.boolean().optional(),
  downtimeMinutes: z.number().optional(),
  assignedTo: z.string().optional(),
  assignedGroupId: z.string().optional(),
});

type ChangeFormData = z.infer<typeof changeSchema>;

const ChangeCreatePage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isSubmitting } = useAppSelector((state) => state.changes);
  const { users, groups } = useAppSelector((state) => state.users);

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
  } = useForm<ChangeFormData>({
    resolver: zodResolver(changeSchema),
    defaultValues: {
      changeType: 'normal',
      risk: 'medium',
      category: 'application',
      downtimeRequired: false,
    },
  });

  const downtimeRequired = watch('downtimeRequired');

  const onSubmit = async (data: ChangeFormData) => {
    const result = await dispatch(createChange(data));

    if (createChange.fulfilled.match(result)) {
      toast.success('Change request created successfully');
      navigate(`/changes/${result.payload.id}`);
    } else {
      toast.error('Failed to create change request');
    }
  };

  const typeOptions = [
    { value: 'standard', label: 'Standard - Pre-approved, low risk' },
    { value: 'normal', label: 'Normal - Requires CAB approval' },
    { value: 'emergency', label: 'Emergency - Urgent, expedited approval' },
  ];

  const riskOptions = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const categoryOptions = [
    { value: 'infrastructure', label: 'Infrastructure' },
    { value: 'application', label: 'Application' },
    { value: 'database', label: 'Database' },
    { value: 'network', label: 'Network' },
    { value: 'security', label: 'Security' },
    { value: 'hardware', label: 'Hardware' },
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
        <Link to="/changes" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Change Request</h1>
          <p className="text-gray-500 mt-1">Submit a new change for review and approval</p>
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
                placeholder="Brief description of the change"
                error={errors.title?.message}
                required
                {...register('title')}
              />

              <Textarea
                label="Description"
                placeholder="Provide detailed information about the change..."
                rows={4}
                {...register('description')}
              />

              <Textarea
                label="Justification"
                placeholder="Why is this change needed?"
                rows={3}
                {...register('justification')}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Change Type"
                  options={typeOptions}
                  required
                  {...register('changeType')}
                />
                <Select
                  label="Risk Level"
                  options={riskOptions}
                  required
                  {...register('risk')}
                />
                <Select
                  label="Category"
                  options={categoryOptions}
                  required
                  {...register('category')}
                />
              </div>
            </CardBody>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader>Schedule</CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Scheduled Start"
                  type="datetime-local"
                  {...register('scheduledStart')}
                />
                <Input
                  label="Scheduled End"
                  type="datetime-local"
                  {...register('scheduledEnd')}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('downtimeRequired')}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium">Downtime Required</span>
                </label>

                {downtimeRequired && (
                  <Input
                    type="number"
                    placeholder="Minutes"
                    className="w-32"
                    {...register('downtimeMinutes', { valueAsNumber: true })}
                  />
                )}
              </div>

              <Select
                label="Environment"
                options={environmentOptions}
                {...register('environmentId')}
              />
            </CardBody>
          </Card>

          {/* Plans */}
          <Card>
            <CardHeader>Implementation Plans</CardHeader>
            <CardBody className="space-y-4">
              <Textarea
                label="Implementation Plan"
                placeholder="Step-by-step implementation instructions..."
                rows={6}
                hint="Include detailed steps, commands, and any dependencies"
                {...register('implementationPlan')}
              />

              <Textarea
                label="Rollback Plan"
                placeholder="How to rollback if the change fails..."
                rows={4}
                hint="Include steps to revert to the previous state"
                {...register('rollbackPlan')}
              />

              <Textarea
                label="Test Plan"
                placeholder="How to verify the change was successful..."
                rows={4}
                hint="Include verification steps and expected outcomes"
                {...register('testPlan')}
              />
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

          {/* Actions */}
          <Card>
            <CardFooter className="flex justify-end gap-3">
              <Link to="/changes">
                <Button variant="secondary" leftIcon={<X size={16} />}>
                  Cancel
                </Button>
              </Link>
              <Button variant="outline" type="submit" name="action" value="draft">
                Save as Draft
              </Button>
              <Button type="submit" isLoading={isSubmitting} leftIcon={<Save size={16} />}>
                Create Change Request
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
};

export default ChangeCreatePage;
