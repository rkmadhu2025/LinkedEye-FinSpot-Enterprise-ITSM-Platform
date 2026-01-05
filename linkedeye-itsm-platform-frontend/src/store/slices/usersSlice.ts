import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, Group, Role, PaginatedResponse } from '@/types';
import { userService } from '@/services/userService';

interface UsersState {
  users: User[];
  groups: Group[];
  roles: Role[];
  currentUser: User | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  groups: [],
  roles: [],
  currentUser: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  isSubmitting: false,
  error: null,
};

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async ({ page = 1, limit = 20, search }: { page?: number; limit?: number; search?: string }, { rejectWithValue }) => {
    try {
      const response = await userService.getUsers(page, limit, search);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch users');
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'users/fetchUserById',
  async (id: string, { rejectWithValue }) => {
    try {
      const user = await userService.getUserById(id);
      return user;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch user');
    }
  }
);

export const fetchGroups = createAsyncThunk(
  'users/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const groups = await userService.getGroups();
      return groups;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch groups');
    }
  }
);

export const fetchRoles = createAsyncThunk(
  'users/fetchRoles',
  async (_, { rejectWithValue }) => {
    try {
      const roles = await userService.getRoles();
      return roles;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch roles');
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (data: Partial<User> & { password: string }, { rejectWithValue }) => {
    try {
      const user = await userService.createUser(data);
      return user;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create user');
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, data }: { id: string; data: Partial<User> }, { rejectWithValue }) => {
    try {
      const user = await userService.updateUser(id, data);
      return user;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update user');
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action: PayloadAction<PaginatedResponse<User>>) => {
        state.isLoading = false;
        state.users = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch User By Id
      .addCase(fetchUserById.fulfilled, (state, action: PayloadAction<User>) => {
        state.currentUser = action.payload;
      })
      // Fetch Groups
      .addCase(fetchGroups.fulfilled, (state, action: PayloadAction<Group[]>) => {
        state.groups = action.payload;
      })
      // Fetch Roles
      .addCase(fetchRoles.fulfilled, (state, action: PayloadAction<Role[]>) => {
        state.roles = action.payload;
      })
      // Create User
      .addCase(createUser.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(createUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isSubmitting = false;
        state.users.unshift(action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(updateUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isSubmitting = false;
        state.currentUser = action.payload;
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentUser, clearError } = usersSlice.actions;
export default usersSlice.reducer;
