import { Plus, Shield, Check } from 'lucide-react';
import { Card, CardBody, Button, Badge } from '@/components/ui';

const RolesPage = () => {
  const roles = [
    { id: '1', name: 'Super Admin', code: 'super_admin', description: 'Full system access', users: 2, isSystem: true },
    { id: '2', name: 'Administrator', code: 'admin', description: 'Manage users and settings', users: 5, isSystem: true },
    { id: '3', name: 'Incident Manager', code: 'incident_manager', description: 'Manage all incidents', users: 8, isSystem: false },
    { id: '4', name: 'Change Manager', code: 'change_manager', description: 'Approve and manage changes', users: 4, isSystem: false },
    { id: '5', name: 'Analyst', code: 'analyst', description: 'Create and work on incidents', users: 15, isSystem: true },
  ];

  const permissions = ['incidents.read', 'incidents.write', 'changes.read', 'changes.write', 'assets.read', 'assets.write', 'users.manage', 'settings.manage'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 mt-1">Configure access control and permissions</p>
        </div>
        <Button leftIcon={<Plus size={16} />}>Create Role</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardBody>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <Shield size={20} className="text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{role.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">{role.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {role.isSystem && <Badge variant="default">System</Badge>}
                  <Badge variant="primary">{role.users} users</Badge>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4">{role.description}</p>
              <div className="flex flex-wrap gap-2">
                {permissions.slice(0, role.id === '1' ? 8 : role.id === '2' ? 6 : 4).map((perm) => (
                  <div key={perm} className="flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded">
                    <Check size={12} />
                    {perm}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                <Button variant="ghost" size="sm">Edit Role</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RolesPage;
