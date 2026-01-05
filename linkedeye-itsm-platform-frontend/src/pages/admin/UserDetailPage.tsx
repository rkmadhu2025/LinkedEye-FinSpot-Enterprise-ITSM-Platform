import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Mail, Phone, Calendar, Shield, Building, Briefcase } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Avatar, Badge, StatusBadge, Modal, Input, Select, Spinner } from '@/components/ui';
import { userService } from '@/services/userService';
import { User, Role, Group } from '@/types';
import toast from 'react-hot-toast';

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUser = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const [userData, rolesData, groupsData] = await Promise.all([
        userService.getUserById(id),
        userService.getRoles(),
        userService.getGroups(),
      ]);
      setUser(userData);
      setAllRoles(rolesData);
      setAllGroups(groupsData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      toast.error('Failed to load user details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleEditUser = () => {
    if (user) {
      setEditingUser({ ...user });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser || !id) return;

    try {
      setIsSaving(true);
      await userService.updateUser(id, {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        email: editingUser.email,
        department: editingUser.department,
        jobTitle: editingUser.jobTitle,
        phone: editingUser.phone,
        status: editingUser.status,
      });
      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      fetchUser();
    } catch (error) {
      console.error('Failed to update user:', error);
      toast.error('Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!id || !confirm('Are you sure you want to delete this user?')) return;

    try {
      await userService.deleteUser(id);
      toast.success('User deleted successfully');
      navigate('/users');
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleAssignRole = async (roleId: string) => {
    if (!id) return;

    try {
      await userService.assignRole(id, roleId);
      toast.success('Role assigned successfully');
      fetchUser();
    } catch (error) {
      console.error('Failed to assign role:', error);
      toast.error('Failed to assign role');
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!id || !confirm('Are you sure you want to remove this role?')) return;

    try {
      await userService.removeRole(id, roleId);
      toast.success('Role removed successfully');
      fetchUser();
    } catch (error) {
      console.error('Failed to remove role:', error);
      toast.error('Failed to remove role');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">User not found</h2>
        <p className="text-gray-500 mt-2">The user you're looking for doesn't exist.</p>
        <Link to="/users" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          Back to Users
        </Link>
      </div>
    );
  }

  const displayName = user.displayName || `${user.firstName} ${user.lastName}`;
  const userRoleIds = new Set(user.roles?.map((r) => r.id) || []);
  const availableRoles = allRoles.filter((r) => !userRoleIds.has(r.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/users" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leftIcon={<Edit size={16} />} onClick={handleEditUser}>
            Edit
          </Button>
          <Button variant="outline" leftIcon={<Trash2 size={16} />} onClick={handleDeleteUser}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardBody className="text-center">
            <Avatar name={displayName} size="xl" className="mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
            <p className="text-gray-500">{user.jobTitle || 'No job title'}</p>
            <div className="flex justify-center gap-2 mt-3">
              <StatusBadge status={user.status} />
              {user.roles && user.roles.length > 0 && (
                <Badge variant="primary">{user.roles[0].name}</Badge>
              )}
            </div>
            <div className="mt-6 space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-gray-400" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone size={16} className="text-gray-400" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.department && (
                <div className="flex items-center gap-3 text-sm">
                  <Building size={16} className="text-gray-400" />
                  <span>{user.department}</span>
                </div>
              )}
              {user.jobTitle && (
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase size={16} className="text-gray-400" />
                  <span>{user.jobTitle}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-gray-400" />
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <Button
              variant="outline"
              fullWidth
              className="mt-6"
              leftIcon={<Edit size={16} />}
              onClick={handleEditUser}
            >
              Edit Profile
            </Button>
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <span>Roles & Permissions</span>
              {availableRoles.length > 0 && (
                <Select
                  value=""
                  onChange={(e) => e.target.value && handleAssignRole(e.target.value)}
                  options={[
                    { value: '', label: 'Add Role...' },
                    ...availableRoles.map((role) => ({ value: role.id, label: role.name })),
                  ]}
                  className="w-40"
                />
              )}
            </CardHeader>
            <CardBody>
              {user.roles && user.roles.length > 0 ? (
                <div className="space-y-3">
                  {user.roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Shield size={18} className="text-primary-600" />
                        <div>
                          <span className="font-medium">{role.name}</span>
                          {role.description && (
                            <p className="text-xs text-gray-500">{role.description}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRole(role.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">No roles assigned</div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Group Memberships</CardHeader>
            <CardBody>
              {user.groups && user.groups.length > 0 ? (
                <div className="space-y-3">
                  {user.groups.map((group) => (
                    <Link
                      key={group.id}
                      to={`/groups/${group.id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <span className="font-medium">{group.name}</span>
                      <Badge variant="secondary">{group.groupType}</Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">Not a member of any groups</div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit User" size="md">
        {editingUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={editingUser.firstName}
                onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
              />
              <Input
                label="Last Name"
                value={editingUser.lastName}
                onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={editingUser.email}
              onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
            />
            <Input
              label="Phone"
              value={editingUser.phone || ''}
              onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
            />
            <Input
              label="Department"
              value={editingUser.department || ''}
              onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
            />
            <Input
              label="Job Title"
              value={editingUser.jobTitle || ''}
              onChange={(e) => setEditingUser({ ...editingUser, jobTitle: e.target.value })}
            />
            <Select
              label="Status"
              value={editingUser.status}
              onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as User['status'] })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'pending', label: 'Pending' },
              ]}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveUser} isLoading={isSaving}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UserDetailPage;
