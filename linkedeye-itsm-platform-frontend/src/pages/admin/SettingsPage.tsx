import { useState } from 'react';
import { Save, Building, Bell, Shield, Clock, Mail, Loader2 } from 'lucide-react';
import { Card, Button, Input, Select, Tabs, TabList, Tab, TabPanel } from '@/components/ui';
import { useAppSelector } from '@/hooks/useRedux';
import toast from 'react-hot-toast';

interface GeneralSettings {
  organizationName: string;
  timezone: string;
  dateFormat: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  slackIntegration: boolean;
  microsoftTeams: boolean;
  inAppNotifications: boolean;
}

interface SecuritySettings {
  sessionTimeout: number;
  minPasswordLength: number;
  mfaRequired: boolean;
}

interface SlaSettings {
  businessHoursStart: string;
  businessHoursEnd: string;
  slaConfigs: Array<{
    priority: string;
    response: number;
    resolution: number;
  }>;
}

interface EmailSettings {
  smtpServer: string;
  smtpPort: number;
  encryption: string;
  fromEmail: string;
}

const SettingsPage = () => {
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    organizationName: 'LinkedEye-FinSpot',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    slackIntegration: false,
    microsoftTeams: true,
    inAppNotifications: true,
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    sessionTimeout: 30,
    minPasswordLength: 8,
    mfaRequired: false,
  });

  // SLA Settings State
  const [slaSettings, setSlaSettings] = useState<SlaSettings>({
    businessHoursStart: '09:00',
    businessHoursEnd: '17:00',
    slaConfigs: [
      { priority: 'Critical', response: 15, resolution: 4 },
      { priority: 'High', response: 30, resolution: 8 },
      { priority: 'Medium', response: 60, resolution: 24 },
      { priority: 'Low', response: 120, resolution: 72 },
    ],
  });

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    smtpServer: '',
    smtpPort: 587,
    encryption: 'tls',
    fromEmail: '',
  });

  const saveSettings = async (section: string, _data: unknown) => {
    setIsSaving(section);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In production, this would be:
      // await settingsService.updateSettings(section, _data);

      toast.success(`${section} settings saved successfully`);
    } catch (error) {
      toast.error(`Failed to save ${section} settings`);
    } finally {
      setIsSaving(null);
    }
  };

  const handleSaveGeneral = () => saveSettings('General', generalSettings);
  const handleSaveNotifications = () => saveSettings('Notification', notificationSettings);
  const handleSaveSecurity = () => saveSettings('Security', securitySettings);
  const handleSaveSla = () => saveSettings('SLA', slaSettings);
  const handleSaveEmail = () => saveSettings('Email', emailSettings);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Settings</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Configure system preferences and options</p>
        </div>
      </div>

      <Card padding="none">
        <Tabs defaultValue="general">
          <TabList className="px-5">
            <Tab value="general" icon={<Building size={16} />}>General</Tab>
            <Tab value="notifications" icon={<Bell size={16} />}>Notifications</Tab>
            <Tab value="security" icon={<Shield size={16} />}>Security</Tab>
            <Tab value="sla" icon={<Clock size={16} />}>SLA</Tab>
            <Tab value="email" icon={<Mail size={16} />}>Email</Tab>
          </TabList>

          {/* General Settings */}
          <TabPanel value="general" className="p-5">
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Organization Settings</h3>
                <div className="space-y-4">
                  <Input
                    label="Organization Name"
                    value={generalSettings.organizationName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, organizationName: e.target.value })}
                  />
                  <Select
                    label="Default Timezone"
                    value={generalSettings.timezone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                    options={[
                      { value: 'UTC', label: 'UTC' },
                      { value: 'America/New_York', label: 'Eastern Time' },
                      { value: 'America/Los_Angeles', label: 'Pacific Time' },
                      { value: 'Europe/London', label: 'London' },
                      { value: 'Asia/Tokyo', label: 'Tokyo' },
                      { value: 'Asia/Kolkata', label: 'India Standard Time' },
                    ]}
                  />
                  <Select
                    label="Date Format"
                    value={generalSettings.dateFormat}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value })}
                    options={[
                      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                    ]}
                  />
                </div>
              </div>
              <Button
                leftIcon={isSaving === 'General' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                onClick={handleSaveGeneral}
                disabled={isSaving === 'General'}
              >
                {isSaving === 'General' ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabPanel>

          {/* Notification Settings */}
          <TabPanel value="notifications" className="p-5">
            <div className="max-w-2xl space-y-6">
              <h3 className="text-lg font-medium mb-4">Notification Preferences</h3>
              {[
                { key: 'emailNotifications', label: 'Email notifications', description: 'Receive email notifications for important events' },
                { key: 'slackIntegration', label: 'Slack integration', description: 'Send notifications to Slack channels' },
                { key: 'microsoftTeams', label: 'Microsoft Teams', description: 'Send notifications to Microsoft Teams' },
                { key: 'inAppNotifications', label: 'In-app notifications', description: 'Show notifications within the application' },
              ].map((item) => (
                <label key={item.key} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div>
                    <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{item.label}</span>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings[item.key as keyof NotificationSettings]}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                </label>
              ))}
              <Button
                leftIcon={isSaving === 'Notification' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                onClick={handleSaveNotifications}
                disabled={isSaving === 'Notification'}
              >
                {isSaving === 'Notification' ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabPanel>

          {/* Security Settings */}
          <TabPanel value="security" className="p-5">
            <div className="max-w-2xl space-y-6">
              <h3 className="text-lg font-medium mb-4">Security Settings</h3>
              <Input
                label="Session Timeout (minutes)"
                type="number"
                value={securitySettings.sessionTimeout.toString()}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) || 30 })}
                min={5}
                max={120}
              />
              <Input
                label="Minimum Password Length"
                type="number"
                value={securitySettings.minPasswordLength.toString()}
                onChange={(e) => setSecuritySettings({ ...securitySettings, minPasswordLength: parseInt(e.target.value) || 8 })}
                min={6}
                max={32}
              />
              <label className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer ${isDark ? 'border-white/10 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                <div>
                  <span className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Require MFA for all users</span>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Enforce multi-factor authentication for all users</p>
                </div>
                <input
                  type="checkbox"
                  checked={securitySettings.mfaRequired}
                  onChange={(e) => setSecuritySettings({ ...securitySettings, mfaRequired: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
              </label>
              <Button
                leftIcon={isSaving === 'Security' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                onClick={handleSaveSecurity}
                disabled={isSaving === 'Security'}
              >
                {isSaving === 'Security' ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabPanel>

          {/* SLA Settings */}
          <TabPanel value="sla" className="p-5">
            <div className="max-w-2xl space-y-6">
              <h3 className="text-lg font-medium mb-4">SLA Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Business Hours Start"
                  type="time"
                  value={slaSettings.businessHoursStart}
                  onChange={(e) => setSlaSettings({ ...slaSettings, businessHoursStart: e.target.value })}
                />
                <Input
                  label="Business Hours End"
                  type="time"
                  value={slaSettings.businessHoursEnd}
                  onChange={(e) => setSlaSettings({ ...slaSettings, businessHoursEnd: e.target.value })}
                />
              </div>
              <div className={`border rounded-lg overflow-hidden ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                <table className="w-full">
                  <thead className={isDark ? 'bg-white/5' : 'bg-gray-50'}>
                    <tr>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Priority</th>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Response (min)</th>
                      <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Resolution (hours)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaSettings.slaConfigs.map((sla, index) => (
                      <tr key={sla.priority} className={`border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                        <td className={`px-4 py-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{sla.priority}</td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            value={sla.response.toString()}
                            onChange={(e) => {
                              const newConfigs = [...slaSettings.slaConfigs];
                              newConfigs[index].response = parseInt(e.target.value) || 0;
                              setSlaSettings({ ...slaSettings, slaConfigs: newConfigs });
                            }}
                            className="w-24"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            value={sla.resolution.toString()}
                            onChange={(e) => {
                              const newConfigs = [...slaSettings.slaConfigs];
                              newConfigs[index].resolution = parseInt(e.target.value) || 0;
                              setSlaSettings({ ...slaSettings, slaConfigs: newConfigs });
                            }}
                            className="w-24"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button
                leftIcon={isSaving === 'SLA' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                onClick={handleSaveSla}
                disabled={isSaving === 'SLA'}
              >
                {isSaving === 'SLA' ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </TabPanel>

          {/* Email Settings */}
          <TabPanel value="email" className="p-5">
            <div className="max-w-2xl space-y-6">
              <h3 className="text-lg font-medium mb-4">Email Configuration</h3>
              <Input
                label="SMTP Server"
                placeholder="smtp.example.com"
                value={emailSettings.smtpServer}
                onChange={(e) => setEmailSettings({ ...emailSettings, smtpServer: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="SMTP Port"
                  type="number"
                  value={emailSettings.smtpPort.toString()}
                  onChange={(e) => setEmailSettings({ ...emailSettings, smtpPort: parseInt(e.target.value) || 587 })}
                />
                <Select
                  label="Encryption"
                  value={emailSettings.encryption}
                  onChange={(e) => setEmailSettings({ ...emailSettings, encryption: e.target.value })}
                  options={[
                    { value: 'tls', label: 'TLS' },
                    { value: 'ssl', label: 'SSL' },
                    { value: 'none', label: 'None' },
                  ]}
                />
              </div>
              <Input
                label="From Email"
                type="email"
                placeholder="noreply@example.com"
                value={emailSettings.fromEmail}
                onChange={(e) => setEmailSettings({ ...emailSettings, fromEmail: e.target.value })}
              />
              <div className="flex gap-3">
                <Button
                  leftIcon={isSaving === 'Email' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  onClick={handleSaveEmail}
                  disabled={isSaving === 'Email'}
                >
                  {isSaving === 'Email' ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline">Test Connection</Button>
              </div>
            </div>
          </TabPanel>
        </Tabs>
      </Card>
    </div>
  );
};

export default SettingsPage;
