import { FileText, Download, Calendar, BarChart, PieChart, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Select, Input } from '@/components/ui';
import { useAppSelector } from '@/hooks/useRedux';

const ReportsPage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const reports = [
    { id: '1', name: 'Incident Summary', type: 'incident', description: 'Overview of all incidents', icon: FileText },
    { id: '2', name: 'SLA Performance', type: 'sla', description: 'SLA compliance metrics', icon: TrendingUp },
    { id: '3', name: 'Change Success Rate', type: 'change', description: 'Change management statistics', icon: BarChart },
    { id: '4', name: 'Team Performance', type: 'team', description: 'Team productivity metrics', icon: PieChart },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Reports</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Generate and view ITSM reports</p>
        </div>
        <Button leftIcon={<FileText size={16} />}>Create Report</Button>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <Select
              options={[
                { value: 'all', label: 'All Report Types' },
                { value: 'incident', label: 'Incidents' },
                { value: 'change', label: 'Changes' },
                { value: 'sla', label: 'SLA' },
              ]}
              className="w-40"
            />
            <Input type="date" className="w-40" />
            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>to</span>
            <Input type="date" className="w-40" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((report) => (
              <div key={report.id} className={`p-6 border rounded-xl hover:shadow-md transition-all ${isDark ? 'border-white/10 hover:border-primary-500/30' : 'border-gray-200 hover:border-primary-300'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-primary-500/10' : 'bg-primary-100'}`}>
                      <report.icon size={24} className="text-primary-600" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{report.name}</h3>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{report.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" leftIcon={<Calendar size={14} />}>Schedule</Button>
                  <Button size="sm" leftIcon={<Download size={14} />}>Generate</Button>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default ReportsPage;
