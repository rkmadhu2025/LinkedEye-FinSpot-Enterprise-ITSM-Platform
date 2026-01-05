import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Network, Router, Wifi, Server } from 'lucide-react';
import { Card, CardBody, Button, Input, Select, StatsCard, Badge, StatusBadge } from '@/components/ui';

const NetworkDevicesPage = () => {
  const navigate = useNavigate();
  const devices = [
    { id: '1', name: 'Core Switch 1', type: 'Switch', ip: '192.168.1.1', status: 'healthy', uptime: '45 days' },
    { id: '2', name: 'Edge Router', type: 'Router', ip: '192.168.1.2', status: 'healthy', uptime: '120 days' },
    { id: '3', name: 'Firewall Cluster', type: 'Firewall', ip: '192.168.1.3', status: 'warning', uptime: '30 days' },
    { id: '4', name: 'Access Point Floor 1', type: 'Access Point', ip: '192.168.1.10', status: 'healthy', uptime: '15 days' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Network Devices</h1>
          <p className="text-gray-500 mt-1">Monitor and manage network infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/network/topology">
            <Button variant="outline" leftIcon={<Network size={16} />}>Topology View</Button>
          </Link>
          <Button leftIcon={<Plus size={16} />}>Add Device</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard title="Total Devices" value="156" icon={<Server size={24} />} variant="medium" />
        <StatsCard title="Switches" value="48" icon={<Network size={24} />} variant="success" />
        <StatsCard title="Routers" value="12" icon={<Router size={24} />} variant="medium" />
        <StatsCard title="Access Points" value="96" icon={<Wifi size={24} />} variant="low" />
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex-1 min-w-[200px] max-w-md">
              <Input placeholder="Search devices..." leftIcon={<Search size={18} />} />
            </div>
            <Select
              options={[
                { value: '', label: 'All Types' },
                { value: 'switch', label: 'Switches' },
                { value: 'router', label: 'Routers' },
                { value: 'firewall', label: 'Firewalls' },
                { value: 'access_point', label: 'Access Points' },
              ]}
              className="w-40"
            />
            <Select
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'healthy', label: 'Healthy' },
                { value: 'warning', label: 'Warning' },
                { value: 'critical', label: 'Critical' },
              ]}
              className="w-40"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IP Address</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Uptime</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/network/devices/${device.id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Network size={20} className="text-primary-600" />
                        </div>
                        <Link to={`/network/devices/${device.id}`} className="font-medium hover:text-primary-600">
                          {device.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge>{device.type}</Badge></td>
                    <td className="px-4 py-3 font-mono text-sm">{device.ip}</td>
                    <td className="px-4 py-3"><StatusBadge status={device.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{device.uptime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default NetworkDevicesPage;
