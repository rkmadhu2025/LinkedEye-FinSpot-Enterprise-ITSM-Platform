import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Users, Mail, UserPlus, X } from 'lucide-react';
import { Card, CardHeader, CardBody, Button, Avatar, Badge, Modal, Input, Spinner } from '@/components/ui';
import { useAppSelector } from '@/hooks/useRedux';
import { userService } from '@/services/userService';
import { Group, User } from '@/types';
import toast from 'react-hot-toast';

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useAppSelector((state) => state.ui);
  const isDark = theme === 'dark';
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchGroup = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const [groupData, membersData] = await Promise.all([
        userService.getGroupById(id),
        userService.getGroupMembers(id),
      ]);
      setGroup(groupData);
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to fetch group:', error);
      toast.error('Failed to load group details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleEditGroup = () => {
    if (group) {
      setEditingGroup({ ...group });
      setIsEditModalOpen(true);
    }
  };

  const handleSaveGroup = async () => {
    if (!editingGroup || !id) return;

    try {
      setIsSaving(true);
      await userService.updateGroup(id, {
        name: editingGroup.name,
        code: editingGroup.code,
        description: editingGroup.description,
        groupType: editingGroup.groupType,
        email: editingGroup.email,
      });
      toast.success('Group updated successfully');
      setIsEditModalOpen(false);
      fetchGroup();
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error('Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!id || !confirm('Are you sure you want to delete this group?')) return;

    try {
      await userService.deleteGroup(id);
      toast.success('Group deleted successfully');
      navigate('/groups');
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.error('Failed to delete group');
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const users = await userService.searchUsers(query);
      // Filter out users who are already members
      const memberIds = new Set(members.map((m) => m.id));
      setSearchResults(users.filter((u) => !memberIds.has(u.id)));
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!id) return;

    try {
      await userService.addGroupMember(id, userId);
      toast.success('Member added successfully');
      setSearchQuery('');
      setSearchResults([]);
      fetchGroup();
    } catch (error) {
      console.error('Failed to add member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!id || !confirm('Are you sure you want to remove this member?')) return;

    try {
      await userService.removeGroupMember(id, userId);
      toast.success('Member removed successfully');
      fetchGroup();
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>Group not found</h2>
        <p className="mt-2" style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>The group you're looking for doesn't exist.</p>
        <Link to="/groups" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/groups" className="p-2 rounded-lg" style={{ color: isDark ? '#f8fafc' : undefined }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{group.name}</h1>
            <p className="text-gray-500 font-mono text-sm">{group.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leftIcon={<Edit size={16} />} onClick={handleEditGroup}>
            Edit
          </Button>
          <Button variant="outline" leftIcon={<Trash2 size={16} />} onClick={handleDeleteGroup}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardBody>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                <Users size={32} className="text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>{group.name}</h2>
                <p className="text-gray-500 font-mono text-sm">{group.code}</p>
              </div>
            </div>

            {group.description && (
              <p className="text-gray-600 mb-4">{group.description}</p>
            )}

            <div className="space-y-3">
              {group.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail size={16} className="text-gray-400" />
                  <span>{group.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Users size={16} className="text-gray-400" />
                <span>{members.length} members</span>
              </div>
              {group.groupType && (
                <div className="mt-3">
                  <Badge variant="secondary">{group.groupType}</Badge>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <span>Members</span>
            <Button size="sm" leftIcon={<UserPlus size={14} />} onClick={() => setIsAddMemberModalOpen(true)}>
              Add Member
            </Button>
          </CardHeader>
          <CardBody>
            {members.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No members in this group yet
              </div>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}
                  >
                    <Link to={`/users/${member.id}`} className="flex items-center gap-3">
                      <Avatar
                        name={member.displayName || `${member.firstName} ${member.lastName}`}
                        size="md"
                      />
                      <div>
                        <p className="font-medium" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                          {member.displayName || `${member.firstName} ${member.lastName}`}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <X size={14} className="text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Edit Group Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Group" size="md">
        {editingGroup && (
          <div className="space-y-4">
            <Input
              label="Group Name"
              value={editingGroup.name}
              onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
            />
            <Input
              label="Code"
              value={editingGroup.code || ''}
              onChange={(e) => setEditingGroup({ ...editingGroup, code: e.target.value })}
            />
            <Input
              label="Description"
              value={editingGroup.description || ''}
              onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={editingGroup.email || ''}
              onChange={(e) => setEditingGroup({ ...editingGroup, email: e.target.value })}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveGroup} isLoading={isSaving}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setSearchQuery('');
          setSearchResults([]);
        }}
        title="Add Member"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Search Users"
            placeholder="Type to search..."
            value={searchQuery}
            onChange={(e) => handleSearchUsers(e.target.value)}
          />

          {isSearching ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer"
                  style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}
                  onClick={() => handleAddMember(user.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={user.displayName || `${user.firstName} ${user.lastName}`}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium" style={{ color: isDark ? '#f8fafc' : '#0f1c3f' }}>
                        {user.displayName || `${user.firstName} ${user.lastName}`}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <UserPlus size={16} className="text-primary-600" />
                </div>
              ))}
            </div>
          ) : searchQuery.length >= 2 ? (
            <div className="text-center py-4 text-gray-500">No users found</div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
};

export default GroupDetailPage;
