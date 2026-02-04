/**
 * Escalation Dashboard
 * Comprehensive overview of escalation policies, on-call schedules, and escalation metrics
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield,
  ShieldAlert,
  Activity,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  Layers,
  ArrowRight,
  Plus,
  RefreshCw,
  Calendar,
  Bell,
  Phone,
} from 'lucide-react';
import { Card, CardBody, CardHeader, Button, Badge, Select, Spinner, Avatar } from '@/components/ui';
import { onCallService } from '@/services/onCallService';
import { EscalationPolicy, OnCallSchedule, OnCallUrgency } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import clsx from 'clsx';

const COLORS = {
  low: '#10b981',
  high: '#f59e0b',
  critical: '#ef4444',
  active: '#10b981',
  inactive: '#6b7280',
};

// Using the type from onCallService
type CurrentOnCallEntry = {
  id: string;
  user_id: string;
  schedule_id: string;
  schedule_name?: string;
  user?: {
    id: string;
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
    email: string;
    displayName?: string;
  };
  shift_start?: string;
  shift_end?: string;
  role?: string;
  full_name?: string;
};

const EscalationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<EscalationPolicy[]>([]);
  const [schedules, setSchedules] = useState<OnCallSchedule[]>([]);
  const [currentOnCall, setCurrentOnCall] = useState<CurrentOnCallEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [policiesRes, schedulesRes, currentOnCallRes] = await Promise.all([
        onCallService.getEscalationPolicies(1, 100),
        onCallService.getSchedules(1, 100),
        onCallService.getCurrentOnCall().catch(() => []), // Fallback to empty array if fails
      ]);
      setPolicies(policiesRes.data);
      setSchedules(schedulesRes.data);
      setCurrentOnCall(currentOnCallRes || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const totalPolicies = policies.length;
    const activePolicies = policies.filter(p => p.is_active).length;
    const defaultPolicy = policies.find(p => p.is_default);
    const totalSchedules = schedules.length;
    const activeSchedules = schedules.filter(s => s.is_active).length;
    
    const urgencyBreakdown = {
      low: policies.filter(p => p.default_urgency === 'low').length,
      high: policies.filter(p => p.default_urgency === 'high').length,
      critical: policies.filter(p => p.default_urgency === 'critical').length,
    };

    const totalLevels = policies.reduce((sum, p) => sum + (p.levels?.length || 0), 0);
    const avgLevelsPerPolicy = totalPolicies > 0 ? (totalLevels / totalPolicies).toFixed(1) : '0';

    return {
      totalPolicies,
      activePolicies,
      defaultPolicy,
      totalSchedules,
      activeSchedules,
      urgencyBreakdown,
      totalLevels,
      avgLevelsPerPolicy,
    };
  }, [policies, schedules]);

  // Chart data
  const policyDistribution = useMemo(() => {
    return [
      { name: 'Low Urgency', value: stats.urgencyBreakdown.low, color: COLORS.low },
      { name: 'High Urgency', value: stats.urgencyBreakdown.high, color: COLORS.high },
      { name: 'Critical Urgency', value: stats.urgencyBreakdown.critical, color: COLORS.critical },
    ].filter(item => item.value > 0);
  }, [stats]);

  const statusDistribution = useMemo(() => {
    return [
      { name: 'Active Policies', value: stats.activePolicies, color: COLORS.active },
      { name: 'Inactive Policies', value: stats.totalPolicies - stats.activePolicies, color: COLORS.inactive },
    ].filter(item => item.value > 0);
  }, [stats]);

  // Recent policies
  const recentPolicies = useMemo(() => {
    return [...policies]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 5);
  }, [policies]);

  const getUrgencyBadge = (urgency: OnCallUrgency) => {
    const configs: Record<OnCallUrgency, { color: string; label: string }> = {
      low: { color: 'bg-green-100 text-green-800', label: 'Low' },
      high: { color: 'bg-yellow-100 text-yellow-800', label: 'High' },
      critical: { color: 'bg-red-100 text-red-800', label: 'Critical' },
    };
    const config = configs[urgency] || configs.high;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escalation Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of escalation policies and on-call schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={16} />}
            onClick={fetchData}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Link to="/on-call/escalation-policies">
            <Button variant="outline" leftIcon={<Shield size={16} />}>
              Policies
            </Button>
          </Link>
          <Link to="/on-call/schedules">
            <Button variant="outline" leftIcon={<Calendar size={16} />}>
              Schedules
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Policies</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPolicies}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.activePolicies} active
              </p>
            </div>
            <Shield className="text-indigo-500" size={24} />
          </div>
        </Card>

        <Card padding="sm" className="border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Schedules</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeSchedules}</p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalSchedules} total schedules
              </p>
            </div>
            <Calendar className="text-green-500" size={24} />
          </div>
        </Card>

        <Card padding="sm" className="border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Escalation Levels</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalLevels}</p>
              <p className="text-xs text-gray-500 mt-1">
                Avg {stats.avgLevelsPerPolicy} per policy
              </p>
            </div>
            <Layers className="text-blue-500" size={24} />
          </div>
        </Card>

        <Card padding="sm" className="border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Default Policy</p>
              <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                {stats.defaultPolicy?.name || 'None'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats.defaultPolicy ? 'Active' : 'Not set'}
              </p>
            </div>
            <ShieldAlert className="text-purple-500" size={24} />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-4 items-center">
            <Select
              options={[
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
                { value: '90d', label: 'Last 90 Days' },
              ]}
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="w-40"
            />
          </div>
        </CardBody>
      </Card>

      {/* Current On-Call Schedule - Matching Reference Design */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="text-indigo-500" size={18} />
            <h3 className="text-lg font-semibold">On-Call Schedule</h3>
          </div>
        </CardHeader>
        <CardBody>
          {currentOnCall.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active on-call shifts
            </div>
          ) : (
            <div className="space-y-3">
              {currentOnCall.map((entry, index) => {
                const isCurrent = index === 0; // First entry is current
                const user = entry.user;
                const firstName = user?.firstName || user?.first_name || '';
                const lastName = user?.lastName || user?.last_name || '';
                const userName = entry.full_name || 
                  (user ? `${firstName} ${lastName}`.trim() : '') ||
                  user?.displayName ||
                  entry.user_id || 
                  'Unknown User';
                const teamName = entry.schedule_name || 'Primary Rotation';
                
                // Format shift time
                let shiftTime = '24/7';
                if (entry.shift_start && entry.shift_end) {
                  try {
                    const start = format(new Date(entry.shift_start), 'HH:mm');
                    const end = format(new Date(entry.shift_end), 'HH:mm');
                    shiftTime = `${start} - ${end}`;
                  } catch (e) {
                    shiftTime = '24/7';
                  }
                }

                return (
                  <div
                    key={entry.id}
                    className={clsx(
                      'flex items-center gap-4 p-4 rounded-lg transition-all',
                      isCurrent
                        ? 'bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-500'
                        : 'bg-gray-50 border border-gray-200'
                    )}
                  >
                    <Avatar name={userName} size="md" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{userName}</span>
                        {isCurrent && (
                          <Badge className="bg-green-100 text-green-800 text-xs">Current On-Call</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{teamName}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm text-gray-900">{shiftTime}</div>
                      <div className="text-xs text-gray-500">
                        {isCurrent ? 'Current Shift' : entry.role || 'On-Call'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgency Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Policy Urgency Distribution</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={policyDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {policyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Policy Status</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6">
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Policy Levels Overview */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Policy Configuration</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Layers className="text-indigo-500" size={20} />
                  <span className="text-sm font-medium">Total Levels</span>
                </div>
                <span className="text-sm font-bold">{stats.totalLevels}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="text-blue-500" size={20} />
                  <span className="text-sm font-medium">Active Policies</span>
                </div>
                <span className="text-sm font-bold text-green-600">{stats.activePolicies}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="text-green-500" size={20} />
                  <span className="text-sm font-medium">Active Schedules</span>
                </div>
                <span className="text-sm font-bold text-green-600">{stats.activeSchedules}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="text-yellow-500" size={20} />
                  <span className="text-sm font-medium">Avg Levels/Policy</span>
                </div>
                <span className="text-sm font-bold">{stats.avgLevelsPerPolicy}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Quick Actions</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <Link to="/on-call/escalation-policies" className="block">
                <Button variant="outline" className="w-full justify-start" leftIcon={<Plus size={16} />}>
                  Create Escalation Policy
                </Button>
              </Link>
              <Link to="/on-call/schedules" className="block">
                <Button variant="outline" className="w-full justify-start" leftIcon={<Calendar size={16} />}>
                  Create On-Call Schedule
                </Button>
              </Link>
              <Link to="/on-call/escalation-policies" className="block">
                <Button variant="outline" className="w-full justify-start" leftIcon={<Shield size={16} />}>
                  Manage Policies
                </Button>
              </Link>
              <Link to="/on-call/schedules" className="block">
                <Button variant="outline" className="w-full justify-start" leftIcon={<Users size={16} />}>
                  Manage Schedules
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent Policies */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Escalation Policies</h3>
            <Link to="/on-call/escalation-policies">
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={16} />}>
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : recentPolicies.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No escalation policies found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Policy Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Default Urgency</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Levels</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Repeat</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPolicies.map((policy) => (
                    <tr key={policy.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="text-indigo-500" size={16} />
                          <span className="font-medium">{policy.name}</span>
                          {policy.is_default && (
                            <Badge className="bg-indigo-100 text-indigo-800 text-xs">Default</Badge>
                          )}
                        </div>
                        {policy.description && (
                          <p className="text-xs text-gray-500 mt-1">{policy.description}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">{getUrgencyBadge(policy.default_urgency)}</td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium">{policy.levels?.length || 0}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {policy.repeat_count}x @ {policy.repeat_interval_minutes}m
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={policy.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {policy.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {policy.created_at
                          ? formatDistanceToNow(new Date(policy.created_at), { addSuffix: true })
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <Link to={`/on-call/escalation-policies`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default EscalationDashboardPage;
