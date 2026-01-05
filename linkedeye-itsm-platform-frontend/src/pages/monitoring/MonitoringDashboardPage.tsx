import { Activity, AlertTriangle, CheckCircle, Clock, Bell, BarChart } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Badge, StatsCard, StatusBadge } from '@/components/ui';

const MonitoringDashboardPage = () => {
  const alerts = [
    { id: '1', name: 'High CPU Usage', severity: 'critical', source: 'prometheus', status: 'firing', time: '5 min ago' },
    { id: '2', name: 'Disk Space Warning', severity: 'warning', source: 'prometheus', status: 'firing', time: '15 min ago' },
    { id: '3', name: 'API Latency High', severity: 'warning', source: 'alertmanager', status: 'acknowledged', time: '1 hour ago' },
    { id: '4', name: 'Memory Usage Normal', severity: 'info', source: 'prometheus', status: 'resolved', time: '2 hours ago' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monitoring Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time infrastructure monitoring and alerts</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<BarChart size={16} />}>Metrics</Button>
          <Button leftIcon={<Bell size={16} />}>Configure Alerts</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Active Alerts" value="8" variant="critical" icon={<AlertTriangle size={24} />} />
        <StatsCard title="Acknowledged" value="3" variant="high" icon={<Clock size={24} />} />
        <StatsCard title="Resolved Today" value="24" variant="success" icon={<CheckCircle size={24} />} />
        <StatsCard title="Services Up" value="98.5%" variant="success" icon={<Activity size={24} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts */}
        <Card padding="none">
          <CardHeader actions={<Button variant="ghost" size="sm">View All</Button>}>Active Alerts</CardHeader>
          <div className="divide-y divide-gray-100">
            {alerts.filter(a => a.status !== 'resolved').map((alert) => (
              <div key={alert.id} className="px-5 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={alert.severity === 'critical' ? 'danger' : alert.severity === 'warning' ? 'warning' : 'info'}>
                      {alert.severity}
                    </Badge>
                    <span className="font-medium">{alert.name}</span>
                  </div>
                  <StatusBadge status={alert.status} />
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Source: {alert.source}</span>
                  <span>{alert.time}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Grafana Embed Placeholder */}
        <Card>
          <CardHeader>System Metrics</CardHeader>
          <CardBody>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Grafana dashboard embed</p>
                <p className="text-xs text-gray-400">Connect your Grafana instance in integrations</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Environment Status */}
      <Card>
        <CardHeader>Environment Health</CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['Production', 'Staging', 'Development', 'QA'].map((env, idx) => (
              <div key={env} className={`p-4 rounded-lg border ${idx === 1 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium">{env}</span>
                  <div className={`w-3 h-3 rounded-full ${idx === 1 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">CPU</span>
                    <span className="font-medium">{45 + idx * 10}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Memory</span>
                    <span className="font-medium">{60 + idx * 5}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Uptime</span>
                    <span className="font-medium">99.9%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default MonitoringDashboardPage;
