import api from './api';
import { User, Group, Role, PaginatedResponse, CreateUserData } from '@/types';

// Backend user response type (camelCase)
interface BackendUser {
  id: string;
  email: string;
  username?: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  role: string;
  department?: string;
  jobTitle?: string;
  phone?: string;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles?: Array<{ id: string; name: string; code: string }>;
}

// Backend group response type (snake_case)
interface BackendGroup {
  id: string;
  name: string;
  code?: string;
  description?: string;
  group_type?: string;
  manager_id?: string;
  email?: string;
  is_active: boolean;
  member_count?: number;
}

// Backend role response type (snake_case)
interface BackendRole {
  id: string;
  name: string;
  code?: string;
  description?: string;
  permissions: string[];
  is_system: boolean;
  is_active: boolean;
}

// Transform backend user to frontend format
function transformUser(backendUser: BackendUser): User {
  const firstName = backendUser.firstName || '';
  const lastName = backendUser.lastName || '';
  const displayName = backendUser.displayName ||
    (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || backendUser.email || 'Unknown User');

  const roleCode = backendUser.role || 'user';
  const roleName = roleCode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    id: backendUser.id,
    organizationId: '',
    email: backendUser.email,
    firstName: firstName,
    lastName: lastName,
    displayName: displayName,
    phone: backendUser.phone,
    jobTitle: backendUser.jobTitle,
    department: backendUser.department,
    timezone: 'UTC',
    authProvider: 'local',
    status: backendUser.status as User['status'],
    emailVerified: true,
    createdAt: backendUser.createdAt,
    updatedAt: backendUser.updatedAt,
    roles: [
      {
        id: roleCode,
        name: roleName,
        code: roleCode,
        permissions: [],
        isSystem: true,
        isActive: true,
      },
    ],
    groups: [],
  };
}

// Transform backend group to frontend format
function transformGroup(backendGroup: BackendGroup): Group {
  return {
    id: backendGroup.id,
    name: backendGroup.name,
    code: backendGroup.code || backendGroup.name.toLowerCase().replace(/\s+/g, '-'),
    description: backendGroup.description,
    groupType: backendGroup.group_type || 'support',
    managerId: backendGroup.manager_id,
    email: backendGroup.email,
    isActive: backendGroup.is_active,
    memberCount: backendGroup.member_count,
  };
}

// Transform backend role to frontend format
function transformRole(backendRole: BackendRole): Role {
  return {
    id: backendRole.id,
    name: backendRole.name,
    code: backendRole.code || backendRole.name.toLowerCase().replace(/\s+/g, '-'),
    description: backendRole.description,
    permissions: backendRole.permissions || [],
    isSystem: backendRole.is_system,
    isActive: backendRole.is_active,
  };
}

export const userService = {
  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string
  ): Promise<PaginatedResponse<User>> {
    // Convert page to skip for backend
    const skip = (page - 1) * limit;
    const params: Record<string, string | number | undefined> = {
      skip,
      limit,
    };
    if (search) params.search = search;

    // Backend returns array directly with pagination in headers
    const axiosResponse = await api.get<BackendUser[]>('/users', { params });
    const backendData = axiosResponse.data;

    // Transform backend snake_case to frontend camelCase
    const data = backendData.map(transformUser);

    // Extract pagination info from headers
    const total = parseInt(axiosResponse.headers['x-total-count'] || '0', 10);
    const totalPages = parseInt(axiosResponse.headers['x-total-pages'] || '1', 10);

    return {
      data,
      pagination: {
        page,
        limit,
        total: total || data.length,
        totalPages: totalPages || Math.ceil((total || data.length) / limit),
      },
    };
  },

  async getUserById(id: string): Promise<User> {
    const response = await api.get<BackendUser>(`/users/${id}`);
    return transformUser(response.data);
  },

  async createUser(data: CreateUserData | (Partial<User> & { password: string })): Promise<User> {
    // Transform frontend camelCase to backend snake_case
    // Support both CreateUserData (snake_case) and User-based (camelCase) formats
    const backendData = {
      email: data.email,
      username: data.email?.split('@')[0],
      first_name: 'first_name' in data ? data.first_name : (data as Partial<User>).firstName,
      last_name: 'last_name' in data ? data.last_name : (data as Partial<User>).lastName,
      password: data.password,
      role: 'role' in data ? data.role : undefined,
      department: data.department,
      job_title: 'job_title' in data ? data.job_title : (data as Partial<User>).jobTitle,
      phone: data.phone,
    };
    const response = await api.post<BackendUser>('/users', backendData);
    return transformUser(response.data);
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    // Transform frontend camelCase to backend snake_case
    const backendData: Record<string, unknown> = {};
    if (data.email !== undefined) backendData.email = data.email;
    if (data.firstName !== undefined) backendData.first_name = data.firstName;
    if (data.lastName !== undefined) backendData.last_name = data.lastName;
    if (data.department !== undefined) backendData.department = data.department;
    if (data.jobTitle !== undefined) backendData.job_title = data.jobTitle;
    if (data.phone !== undefined) backendData.phone = data.phone;
    if (data.status !== undefined) backendData.status = data.status;

    const response = await api.put<BackendUser>(`/users/${id}`, backendData);
    return transformUser(response.data);
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async getGroups(): Promise<Group[]> {
    const response = await api.get<BackendGroup[]>('/groups');
    return response.data.map(transformGroup);
  },

  async getGroupById(id: string): Promise<Group> {
    const response = await api.get<BackendGroup>(`/groups/${id}`);
    return transformGroup(response.data);
  },

  async createGroup(data: Partial<Group>): Promise<Group> {
    // Transform frontend camelCase to backend snake_case
    const backendData = {
      name: data.name,
      code: data.code,
      description: data.description,
      group_type: data.groupType,
      manager_id: data.managerId,
      email: data.email,
    };
    const response = await api.post<BackendGroup>('/groups', backendData);
    return transformGroup(response.data);
  },

  async updateGroup(id: string, data: Partial<Group>): Promise<Group> {
    // Transform frontend camelCase to backend snake_case
    const backendData: Record<string, unknown> = {};
    if (data.name !== undefined) backendData.name = data.name;
    if (data.code !== undefined) backendData.code = data.code;
    if (data.description !== undefined) backendData.description = data.description;
    if (data.groupType !== undefined) backendData.group_type = data.groupType;
    if (data.managerId !== undefined) backendData.manager_id = data.managerId;
    if (data.email !== undefined) backendData.email = data.email;

    const response = await api.put<BackendGroup>(`/groups/${id}`, backendData);
    return transformGroup(response.data);
  },

  async deleteGroup(id: string): Promise<void> {
    await api.delete(`/groups/${id}`);
  },

  async getGroupMembers(groupId: string): Promise<User[]> {
    const response = await api.get<BackendUser[]>(`/groups/${groupId}/members`);
    return response.data.map(transformUser);
  },

  async addGroupMember(groupId: string, userId: string, role?: string): Promise<void> {
    await api.post(`/groups/${groupId}/members`, { user_id: userId, role });
  },

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await api.delete(`/groups/${groupId}/members/${userId}`);
  },

  async getRoles(): Promise<Role[]> {
    const response = await api.get<Array<{ value: string; label: string; description: string }>>('/users/roles');
    return response.data.map((role) => ({
      id: role.value,
      name: role.label,
      code: role.value,
      description: role.description,
      permissions: [],
      isSystem: true,
      isActive: true,
    }));
  },

  async getRoleById(id: string): Promise<Role> {
    const response = await api.get<BackendRole>(`/roles/${id}`);
    return transformRole(response.data);
  },

  async createRole(data: Partial<Role>): Promise<Role> {
    // Transform frontend camelCase to backend snake_case
    const backendData = {
      name: data.name,
      code: data.code,
      description: data.description,
      permissions: data.permissions,
      is_system: data.isSystem,
    };
    const response = await api.post<BackendRole>('/roles', backendData);
    return transformRole(response.data);
  },

  async updateRole(id: string, data: Partial<Role>): Promise<Role> {
    // Transform frontend camelCase to backend snake_case
    const backendData: Record<string, unknown> = {};
    if (data.name !== undefined) backendData.name = data.name;
    if (data.code !== undefined) backendData.code = data.code;
    if (data.description !== undefined) backendData.description = data.description;
    if (data.permissions !== undefined) backendData.permissions = data.permissions;
    if (data.isSystem !== undefined) backendData.is_system = data.isSystem;

    const response = await api.put<BackendRole>(`/roles/${id}`, backendData);
    return transformRole(response.data);
  },

  async deleteRole(id: string): Promise<void> {
    await api.delete(`/roles/${id}`);
  },

  async assignRole(userId: string, roleId: string): Promise<void> {
    await api.put(`/users/${userId}`, { role: roleId });
  },

  async removeRole(userId: string, roleId: string): Promise<void> {
    await api.put(`/users/${userId}`, { role: 'user' });
  },

  async searchUsers(query: string, limit: number = 10): Promise<User[]> {
    const response = await api.get<BackendUser[]>('/users', {
      params: { search: query, limit, skip: 0 },
    });
    return response.data.map(transformUser).slice(0, limit);
  },
};
