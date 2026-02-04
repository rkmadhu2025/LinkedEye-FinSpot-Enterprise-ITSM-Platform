/**
 * User Notification Settings Page
 * Page for users to manage their personal notification preferences
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Settings, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useRedux';
import { Card, Button, Tabs, TabList, Tab, TabPanel } from '@/components/ui';
import { NotificationPreferences, AlertSuppressionList } from '@/components/notifications';
import { AlertSuppression } from '@/types';
import alertSuppressionService from '@/services/alertSuppressionService';
import toast from 'react-hot-toast';

const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('preferences');
  const [suppressions, setSuppressions] = useState<AlertSuppression[]>([]);
  const [loadingSuppressions, setLoadingSuppressions] = useState(true);

  useEffect(() => {
    loadSuppressions();
  }, []);

  const loadSuppressions = async () => {
    setLoadingSuppressions(true);
    try {
      const data = await alertSuppressionService.listSuppressions({ active_only: false });
      setSuppressions(data);
    } catch (err) {
      console.error('Failed to load suppressions:', err);
    } finally {
      setLoadingSuppressions(false);
    }
  };

  const handlePreferencesSaved = () => {
    toast.success('Notification preferences saved');
  };

  const handleSuppressionRemoved = (suppression: AlertSuppression) => {
    setSuppressions((prev) => prev.filter((s) => s.id !== suppression.id));
    toast.success('Alert suppression removed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              <Bell className="text-primary-600" size={24} />
              Notification Settings
            </h1>
            <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage how and when you receive notifications
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <Card padding="none">
        <Tabs defaultValue="preferences" value={activeTab} onValueChange={setActiveTab}>
          <TabList className={`px-5 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <Tab value="preferences" icon={<Settings size={16} />}>
              Preferences
            </Tab>
            <Tab value="suppressions" icon={<BellOff size={16} />}>
              Alert Suppressions
              {suppressions.filter((s) => s.is_active).length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-warning-100 text-warning-700 rounded-full">
                  {suppressions.filter((s) => s.is_active).length}
                </span>
              )}
            </Tab>
          </TabList>

          {/* Preferences Tab */}
          <TabPanel value="preferences" className="p-0">
            <NotificationPreferences onSave={handlePreferencesSaved} />
          </TabPanel>

          {/* Alert Suppressions Tab */}
          <TabPanel value="suppressions" className="p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-lg font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Active Suppressions</h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    View and manage alert suppressions across your assets and devices
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSuppressions}
                    disabled={loadingSuppressions}
                  >
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Active Suppressions"
                  value={suppressions.filter((s) => s.is_active).length}
                  icon={<BellOff size={20} />}
                  color="warning"
                  isDark={isDark}
                />
                <StatCard
                  title="Manual"
                  value={suppressions.filter((s) => s.is_active && s.suppression_type === 'manual').length}
                  color="blue"
                  isDark={isDark}
                />
                <StatCard
                  title="Scheduled"
                  value={suppressions.filter((s) => s.is_active && s.suppression_type === 'scheduled').length}
                  color="purple"
                  isDark={isDark}
                />
                <StatCard
                  title="Maintenance"
                  value={suppressions.filter((s) => s.is_active && s.suppression_type === 'maintenance').length}
                  color="orange"
                  isDark={isDark}
                />
              </div>

              {/* Suppressions List */}
              <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <AlertSuppressionList
                  activeOnly={false}
                  onRemove={handleSuppressionRemoved}
                  onExtend={() => loadSuppressions()}
                />
              </div>

              {/* Help Text */}
              <div className={`border rounded-lg p-4 ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                <h4 className={`font-medium mb-2 ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>Managing Alert Suppressions</h4>
                <ul className={`text-sm space-y-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  <li>• To suppress alerts for an asset, go to the asset detail page and click "Suppress Alerts"</li>
                  <li>• Suppressions can be scheduled for maintenance windows</li>
                  <li>• Critical alerts are never suppressed for safety</li>
                  <li>• You can extend or remove suppressions at any time</li>
                </ul>
              </div>
            </div>
          </TabPanel>
        </Tabs>
      </Card>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon?: React.ReactNode;
  color: 'warning' | 'blue' | 'purple' | 'orange';
}

const StatCard: React.FC<StatCardProps & { isDark?: boolean }> = ({ title, value, icon, color, isDark }) => {
  const colorClasses = isDark ? {
    warning: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  } : {
    warning: 'bg-warning-50 text-warning-700 border-warning-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        {icon && <div className="opacity-60">{icon}</div>}
      </div>
    </div>
  );
};

export default NotificationSettingsPage;
