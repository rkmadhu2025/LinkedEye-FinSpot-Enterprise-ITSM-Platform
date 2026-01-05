import { useState } from 'react';
import { BarChart, TrendingUp, PieChart, Activity, TrendingDown, Users } from 'lucide-react';
import { Card, CardHeader, CardBody, Select, StatsCard } from '@/components/ui';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';

// Sample data for charts
const incidentTrendData = [
  { name: 'Mon', created: 24, resolved: 20 },
  { name: 'Tue', created: 18, resolved: 22 },
  { name: 'Wed', created: 32, resolved: 28 },
  { name: 'Thu', created: 28, resolved: 25 },
  { name: 'Fri', created: 22, resolved: 30 },
  { name: 'Sat', created: 12, resolved: 15 },
  { name: 'Sun', created: 8, resolved: 10 },
];

const categoryData = [
  { name: 'Software', value: 35, color: '#3b82f6' },
  { name: 'Hardware', value: 25, color: '#10b981' },
  { name: 'Network', value: 20, color: '#f59e0b' },
  { name: 'Security', value: 12, color: '#ef4444' },
  { name: 'Access', value: 8, color: '#8b5cf6' },
];

const resolutionTimeData = [
  { range: '0-1h', count: 45 },
  { range: '1-4h', count: 78 },
  { range: '4-8h', count: 56 },
  { range: '8-24h', count: 34 },
  { range: '24h+', count: 12 },
];

const slaComplianceData = [
  { month: 'Jul', compliance: 92 },
  { month: 'Aug', compliance: 88 },
  { month: 'Sep', compliance: 94 },
  { month: 'Oct', compliance: 91 },
  { month: 'Nov', compliance: 96 },
  { month: 'Dec', compliance: 94.5 },
];

const teamPerformanceData = [
  { team: 'IT Operations', resolved: 145, avgTime: 3.2, sla: 96 },
  { team: 'Service Desk', resolved: 238, avgTime: 2.8, sla: 92 },
  { team: 'Infrastructure', resolved: 89, avgTime: 5.1, sla: 98 },
  { team: 'Security Team', resolved: 45, avgTime: 4.5, sla: 100 },
  { team: 'Network Team', resolved: 67, avgTime: 3.8, sla: 94 },
];

const priorityDistribution = [
  { name: 'Critical', value: 12, color: '#dc2626' },
  { name: 'High', value: 28, color: '#f97316' },
  { name: 'Medium', value: 45, color: '#eab308' },
  { name: 'Low', value: 15, color: '#22c55e' },
];

const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState('30');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Insights and trends from your ITSM data</p>
        </div>
        <Select
          options={[
            { value: '7', label: 'Last 7 days' },
            { value: '30', label: 'Last 30 days' },
            { value: '90', label: 'Last 90 days' },
            { value: '365', label: 'Last year' },
          ]}
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Incidents Created"
          value="156"
          icon={<Activity size={24} />}
          change={{ value: 12, type: 'increase', period: 'vs last period' }}
        />
        <StatsCard
          title="Avg Resolution Time"
          value="4.2h"
          icon={<TrendingDown size={24} />}
          change={{ value: 8, type: 'decrease', period: 'vs last period' }}
          variant="success"
        />
        <StatsCard
          title="SLA Compliance"
          value="94.5%"
          icon={<TrendingUp size={24} />}
          variant="success"
        />
        <StatsCard
          title="First Call Resolution"
          value="68%"
          icon={<Users size={24} />}
          change={{ value: 3, type: 'increase', period: 'vs last period' }}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incident Trends */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart size={20} className="text-primary-600" />
              <span>Incident Trends</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={incidentTrendData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="created" name="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Incidents by Category */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart size={20} className="text-primary-600" />
              <span>Incidents by Category</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Resolution Time Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart size={20} className="text-primary-600" />
              <span>Resolution Time Distribution</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={resolutionTimeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="range" type="category" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" name="Incidents" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* SLA Compliance Trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-600" />
              <span>SLA Compliance Trend</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={slaComplianceData}>
                  <defs>
                    <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Compliance']}
                  />
                  <Area
                    type="monotone"
                    dataKey="compliance"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorCompliance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Priority Distribution & Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Distribution */}
        <Card>
          <CardHeader>Priority Distribution</CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={priorityDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Team Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>Team Performance</CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Team</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Resolved</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Avg Time</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">SLA %</th>
                    <th className="py-3 px-4 font-medium text-gray-600">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformanceData.map((team) => (
                    <tr key={team.team} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{team.team}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{team.resolved}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{team.avgTime}h</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-medium ${
                            team.sla >= 95
                              ? 'text-green-600'
                              : team.sla >= 90
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {team.sla}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              team.sla >= 95
                                ? 'bg-green-500'
                                : team.sla >= 90
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${team.sla}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* AI Insights Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-purple-600" />
            <span>AI-Powered Insights</span>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Trend Alert</h4>
              <p className="text-sm text-blue-700">
                Network-related incidents increased by 23% this week. Consider reviewing network
                infrastructure.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Performance Win</h4>
              <p className="text-sm text-green-700">
                Security Team achieved 100% SLA compliance. Average resolution time improved by 15%.
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-2">Recommendation</h4>
              <p className="text-sm text-yellow-700">
                40% of software incidents are password resets. Consider implementing self-service
                password reset.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
