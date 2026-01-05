import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Edit, Trash2 } from 'lucide-react';
import { Card, CardBody, Button, Input, Avatar, AvatarGroup, Badge, Modal, Spinner } from '@/components/ui';
import { userService } from '@/services/userService';
import { Group } from '@/types';
import toast from 'react-hot-toast';

const GroupsPage = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    code: '',
    description: '',
    groupType: 'support',
    email: '',
  });

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      const groupsData = await userService.getGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleEditGroup = (group: Group) => {
    setEditingGroup({ ...group });
    setIsEditModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!editingGroup) return;

    try {
      setIsSaving(true);
      await userService.updateGroup(editingGroup.id, {
        name: editingGroup.name,
        code: editingGroup.code,
        description: editingGroup.description,
        groupType: editingGroup.groupType,
        email: editingGroup.email,
      });
      toast.success('Group updated successfully');
      setIsEditModalOpen(false);
      setEditingGroup(null);
      fetchGroups();
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error('Failed to update group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      setIsSaving(true);
      await userService.createGroup({
        name: newGroup.name,
        code: newGroup.code || newGroup.name.toLowerCase().replace(/\s+/g, '-'),
        description: newGroup.description,
        groupType: newGroup.groupType,
        email: newGroup.email,
      });
      toast.success('Group created successfully');
      setIsCreateModalOpen(false);
      setNewGroup({ name: '', code: '', description: '', groupType: 'support', email: '' });
      fetchGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    try {
      await userService.deleteGroup(groupId);
      toast.success('Group deleted successfully');
      fetchGroups();
    } catch (error) {
      console.error('Failed to delete group:', error);
      toast.error('Failed to delete group');
    }
  };

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-gray-500 mt-1">Manage teams and assignment groups</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setIsCreateModalOpen(true)}>
          Create Group
        </Button>
      </div>

      <Card>
        <CardBody>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search groups..."
                leftIcon={<Search size={18} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No groups found matching your search' : 'No groups found'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className="p-4 border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Link to={`/groups/${group.id}`} className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Users size={24} className="text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{group.name}</h3>
                        <p className="text-xs text-gray-500 font-mono">{group.code}</p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditGroup(group)}>
                        <Edit size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteGroup(group.id)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <AvatarGroup max={3}>
                      {[...Array(Math.min(group.memberCount || 0, 4))].map((_, i) => (
                        <Avatar key={i} name={`Member ${i + 1}`} size="sm" />
                      ))}
                    </AvatarGroup>
                    <Badge>{group.memberCount || 0} members</Badge>
                  </div>
                  {group.description && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

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

      {/* Create Group Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Group" size="md">
        <div className="space-y-4">
          <Input
            label="Group Name"
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            required
          />
          <Input
            label="Code"
            value={newGroup.code}
            onChange={(e) => setNewGroup({ ...newGroup, code: e.target.value })}
            placeholder="Auto-generated from name if empty"
          />
          <Input
            label="Description"
            value={newGroup.description}
            onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={newGroup.email}
            onChange={(e) => setNewGroup({ ...newGroup, email: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateGroup} isLoading={isSaving}>Create Group</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GroupsPage;
