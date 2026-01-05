import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ChangeRequest, ChangeFilters, PaginatedResponse, CreateChangeData } from '@/types';
import { changeService } from '@/services/changeService';

interface ChangesState {
  changes: ChangeRequest[];
  currentChange: ChangeRequest | null;
  calendarChanges: ChangeRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: ChangeFilters;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: ChangesState = {
  changes: [],
  currentChange: null,
  calendarChanges: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  filters: {},
  isLoading: false,
  isSubmitting: false,
  error: null,
};

export const fetchChanges = createAsyncThunk(
  'changes/fetchChanges',
  async ({ page = 1, limit = 20, filters }: { page?: number; limit?: number; filters?: ChangeFilters }, { rejectWithValue }) => {
    try {
      const response = await changeService.getChanges(page, limit, filters);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch changes');
    }
  }
);

export const fetchChangeById = createAsyncThunk(
  'changes/fetchChangeById',
  async (id: string, { rejectWithValue }) => {
    try {
      const change = await changeService.getChangeById(id);
      return change;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch change');
    }
  }
);

export const fetchCalendarChanges = createAsyncThunk(
  'changes/fetchCalendarChanges',
  async ({ startDate, endDate }: { startDate: string; endDate: string }, { rejectWithValue }) => {
    try {
      const changes = await changeService.getCalendarChanges(startDate, endDate);
      return changes;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch calendar changes');
    }
  }
);

export const createChange = createAsyncThunk(
  'changes/createChange',
  async (data: CreateChangeData, { rejectWithValue }) => {
    try {
      const change = await changeService.createChange(data);
      return change;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create change');
    }
  }
);

export const updateChange = createAsyncThunk(
  'changes/updateChange',
  async ({ id, data }: { id: string; data: Partial<CreateChangeData> }, { rejectWithValue }) => {
    try {
      const change = await changeService.updateChange(id, data);
      return change;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update change');
    }
  }
);

export const submitChangeForApproval = createAsyncThunk(
  'changes/submitForApproval',
  async (id: string, { rejectWithValue }) => {
    try {
      const change = await changeService.submitForApproval(id);
      return change;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to submit change');
    }
  }
);

export const approveChange = createAsyncThunk(
  'changes/approveChange',
  async ({ id, comments }: { id: string; comments?: string }, { rejectWithValue }) => {
    try {
      const change = await changeService.approveChange(id, comments);
      return change;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to approve change');
    }
  }
);

export const rejectChange = createAsyncThunk(
  'changes/rejectChange',
  async ({ id, comments }: { id: string; comments: string }, { rejectWithValue }) => {
    try {
      const change = await changeService.rejectChange(id, comments);
      return change;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to reject change');
    }
  }
);

const changesSlice = createSlice({
  name: 'changes',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ChangeFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearCurrentChange: (state) => {
      state.currentChange = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Changes
      .addCase(fetchChanges.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChanges.fulfilled, (state, action: PayloadAction<PaginatedResponse<ChangeRequest>>) => {
        state.isLoading = false;
        state.changes = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchChanges.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Change By Id
      .addCase(fetchChangeById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchChangeById.fulfilled, (state, action: PayloadAction<ChangeRequest>) => {
        state.isLoading = false;
        state.currentChange = action.payload;
      })
      .addCase(fetchChangeById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Calendar Changes
      .addCase(fetchCalendarChanges.fulfilled, (state, action) => {
        state.calendarChanges = action.payload;
      })
      // Create Change
      .addCase(createChange.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createChange.fulfilled, (state, action: PayloadAction<ChangeRequest>) => {
        state.isSubmitting = false;
        state.changes.unshift(action.payload);
      })
      .addCase(createChange.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      // Update Change
      .addCase(updateChange.fulfilled, (state, action: PayloadAction<ChangeRequest>) => {
        state.isSubmitting = false;
        state.currentChange = action.payload;
        const index = state.changes.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.changes[index] = action.payload;
        }
      })
      // Submit for Approval
      .addCase(submitChangeForApproval.fulfilled, (state, action: PayloadAction<ChangeRequest>) => {
        state.currentChange = action.payload;
        const index = state.changes.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.changes[index] = action.payload;
        }
      })
      // Approve Change
      .addCase(approveChange.fulfilled, (state, action: PayloadAction<ChangeRequest>) => {
        state.currentChange = action.payload;
        const index = state.changes.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.changes[index] = action.payload;
        }
      })
      // Reject Change
      .addCase(rejectChange.fulfilled, (state, action: PayloadAction<ChangeRequest>) => {
        state.currentChange = action.payload;
        const index = state.changes.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.changes[index] = action.payload;
        }
      });
  },
});

export const { setFilters, clearFilters, clearCurrentChange, clearError } = changesSlice.actions;
export default changesSlice.reducer;
