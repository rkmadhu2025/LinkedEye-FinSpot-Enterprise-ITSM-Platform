import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Activity, Network, Server, Router, Wifi, Shield } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Badge,
  StatusBadge,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  PageLoader,
  Modal,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { useAppSelector } from '@/hooks/useRedux';
import { networkService, NetworkDevice } from '@/services/networkService';
import toast from 'react-hot-toast';

const NetworkDeviceDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<NetworkDevice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Partial<NetworkDevice> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchDevice = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await networkService.getDeviceById(id);
        setDevice(data);
      } catch (error) {
        console.error('Failed to load device:', error);
        toast.error('Failed to load device details');
        navigate('/network/devices');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchDevice();
    }
  }, [id, navigate]);

  const getDeviceIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      Switch: <Network size={24} className="text-primary-600" />,
      Router: <Router size={24} className="text-primary-600" />,
      Firewall: <Shield size={24} className="text-primary-600" />,
      'Access Point': <Wifi size={24} className="text-primary-600" />,
      Server: <Server size={24} className="text-primary-600" />,
    };
    return iconMap[type] || <Network size={24} className="text-primary-600" />;
  };

  if (isLoading || !device) {
    return <PageLoader message="Loading device details..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/network/devices" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              {getDeviceIcon(device.type)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{device.name}</h1>
              <p className="text-sm text-gray-500">{device.type} • {device.ipAddress}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<Edit size={16} />} onClick={() => setIsEditModalOpen(true)}>
            Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="interfaces">Interfaces ({device.interfaces?.length || 0})</Tab>
          <Tab value="metrics">Metrics</Tab>
          <Tab value="history">History</Tab>
        </TabList>

        <TabPanel value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Device Information</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Status</label>
                      <div className="mt-1">
                        <StatusBadge status={device.status} />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Uptime</label>
                      <p className="mt-1 text-sm text-gray-900">{device.uptime}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">IP Address</label>
                      <p className="mt-1 text-sm font-mono text-gray-900">{device.ipAddress}</p>
                    </div>
                    {device.macAddress && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">MAC Address</label>
                        <p className="mt-1 text-sm font-mono text-gray-900">{device.macAddress}</p>
                      </div>
                    )}
                    {device.manufacturer && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">Manufacturer</label>
                        <p className="mt-1 text-sm text-gray-900">{device.manufacturer}</p>
                      </div>
                    )}
                    {device.model && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">Model</label>
                        <p className="mt-1 text-sm text-gray-900">{device.model}</p>
                      </div>
                    )}
                    {device.firmware && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">Firmware</label>
                        <p className="mt-1 text-sm text-gray-900">{device.firmware}</p>
                      </div>
                    )}
                    {device.serialNumber && (
                      <div>
                        <label className="text-xs font-medium text-gray-500">Serial Number</label>
                        <p className="mt-1 text-sm font-mono text-gray-900">{device.serialNumber}</p>
                      </div>
                    )}
                    {device.location && (
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-500">Location</label>
                        <p className="mt-1 text-sm text-gray-900">{device.location}</p>
                      </div>
                    )}
                  </div>
                  {device.description && (
                    <div>
                      <label className="text-xs font-medium text-gray-500">Description</label>
                      <p className="mt-1 text-sm text-gray-700">{device.description}</p>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Quick Stats</h2>
                </CardHeader>
                <CardBody className="space-y-4">
                  {device.metrics && (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">CPU Usage</span>
                          <span className="font-medium">{device.metrics.cpuUsage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${device.metrics.cpuUsage}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Memory Usage</span>
                          <span className="font-medium">{device.metrics.memoryUsage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-warning-500 h-2 rounded-full"
                            style={{ width: `${device.metrics.memoryUsage}%` }}
                          />
                        </div>
                      </div>
                      {device.metrics.temperature && (
                        <div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Temperature</span>
                            <span className="font-medium">{device.metrics.temperature}°C</span>
                          </div>
                        </div>
                      )}
                      {device.metrics.packetLoss !== undefined && (
                        <div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Packet Loss</span>
                            <span className="font-medium">{device.metrics.packetLoss}%</span>
                          </div>
                        </div>
                      )}
                      {device.metrics.latency !== undefined && (
                        <div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Latency</span>
                            <span className="font-medium">{device.metrics.latency}ms</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </TabPanel>

        <TabPanel value="interfaces">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Network Interfaces</h2>
            </CardHeader>
            <CardBody>
              {device.interfaces && device.interfaces.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Interface</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Speed</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">MAC Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {device.interfaces.map((iface) => (
                        <tr key={iface.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{iface.name}</td>
                          <td className="px-4 py-3"><Badge>{iface.type}</Badge></td>
                          <td className="px-4 py-3">
                            <StatusBadge status={iface.status === 'up' ? 'healthy' : 'critical'} />
                          </td>
                          <td className="px-4 py-3 text-sm">{iface.speed}</td>
                          <td className="px-4 py-3 font-mono text-sm">{iface.macAddress}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No interfaces found</p>
              )}
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel value="metrics">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Performance Metrics</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-500 text-center py-8">
                Performance metrics and charts will be displayed here
              </p>
            </CardBody>
          </Card>
        </TabPanel>

        <TabPanel value="history">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Device History</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-500 text-center py-8">
                Device history and events will be displayed here
              </p>
            </CardBody>
          </Card>
        </TabPanel>
      </Tabs>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Network Device"
        size="lg"
      >
        {device && (
          <div className="space-y-4">
            <Input
              label="Device Name"
              value={editingDevice?.name || device.name}
              onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Device Type"
                value={editingDevice?.type || device.type}
                onChange={(e) => setEditingDevice({ ...editingDevice, type: e.target.value })}
                options={[
                  { value: 'Switch', label: 'Switch' },
                  { value: 'Router', label: 'Router' },
                  { value: 'Firewall', label: 'Firewall' },
                  { value: 'Access Point', label: 'Access Point' },
                  { value: 'Server', label: 'Server' },
                ]}
              />
              <Select
                label="Status"
                value={editingDevice?.status || device.status}
                onChange={(e) => setEditingDevice({ ...editingDevice, status: e.target.value as NetworkDevice['status'] })}
                options={[
                  { value: 'healthy', label: 'Healthy' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="IP Address"
                value={editingDevice?.ipAddress || device.ipAddress}
                onChange={(e) => setEditingDevice({ ...editingDevice, ipAddress: e.target.value })}
              />
              <Input
                label="MAC Address"
                value={editingDevice?.macAddress || device.macAddress || ''}
                onChange={(e) => setEditingDevice({ ...editingDevice, macAddress: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Manufacturer"
                value={editingDevice?.manufacturer || device.manufacturer || ''}
                onChange={(e) => setEditingDevice({ ...editingDevice, manufacturer: e.target.value })}
              />
              <Input
                label="Model"
                value={editingDevice?.model || device.model || ''}
                onChange={(e) => setEditingDevice({ ...editingDevice, model: e.target.value })}
              />
            </div>
            <Input
              label="Location"
              value={editingDevice?.location || device.location || ''}
              onChange={(e) => setEditingDevice({ ...editingDevice, location: e.target.value })}
            />
            <Textarea
              label="Description"
              value={editingDevice?.description || device.description || ''}
              onChange={(e) => setEditingDevice({ ...editingDevice, description: e.target.value })}
              rows={3}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  try {
                    setIsSaving(true);
                    if (device && editingDevice) {
                      const updated = await networkService.updateDevice(device.id, editingDevice);
                      setDevice(updated);
                      setIsEditModalOpen(false);
                      toast.success('Device updated successfully');
                    }
                  } catch (error) {
                    toast.error('Failed to update device');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                isLoading={isSaving}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NetworkDeviceDetailPage;
