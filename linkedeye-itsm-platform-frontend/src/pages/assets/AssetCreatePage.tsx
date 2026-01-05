import { Link } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter, Button, Input, Select, Textarea } from '@/components/ui';

const AssetCreatePage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/assets" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Asset</h1>
          <p className="text-gray-500 mt-1">Register a new asset in the CMDB</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>Basic Information</CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Asset Tag" placeholder="AST000001" />
              <Input label="Name" placeholder="Asset name" required />
            </div>
            <Textarea label="Description" placeholder="Describe the asset..." rows={3} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Type"
                options={[
                  { value: 'server', label: 'Server' },
                  { value: 'workstation', label: 'Workstation' },
                  { value: 'laptop', label: 'Laptop' },
                  { value: 'network_device', label: 'Network Device' },
                  { value: 'storage', label: 'Storage' },
                  { value: 'virtual_machine', label: 'Virtual Machine' },
                ]}
                required
              />
              <Select
                label="Status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'maintenance', label: 'Maintenance' },
                ]}
              />
              <Select
                label="Criticality"
                options={[
                  { value: 'critical', label: 'Critical' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'low', label: 'Low' },
                ]}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>Hardware Details</CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Manufacturer" placeholder="e.g., Dell, HP" />
              <Input label="Model" placeholder="Model name/number" />
              <Input label="Serial Number" placeholder="Serial number" />
              <Input label="IP Address" placeholder="192.168.1.100" />
              <Input label="MAC Address" placeholder="00:00:00:00:00:00" />
              <Input label="Location" placeholder="Data Center, Rack A1" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>System Information</CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Operating System" placeholder="e.g., Ubuntu 22.04" />
              <Input label="OS Version" placeholder="Version number" />
              <Input label="CPU" placeholder="e.g., Intel Xeon E5-2680" />
              <Input label="RAM (GB)" type="number" placeholder="32" />
              <Input label="Storage (GB)" type="number" placeholder="500" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardFooter className="flex justify-end gap-3">
            <Link to="/assets">
              <Button variant="secondary" leftIcon={<X size={16} />}>Cancel</Button>
            </Link>
            <Button leftIcon={<Save size={16} />}>Create Asset</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default AssetCreatePage;
