import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Problem, ProblemFilters, PaginatedResponse, CreateProblemData, UpdateProblemData } from '@/types';
import { problemService } from '@/services/problemService';

interface ProblemsState {
  problems: Problem[];
  currentProblem: Problem | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: ProblemFilters;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: ProblemsState = {
  problems: [],
  currentProblem: null,
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

export const fetchProblems = createAsyncThunk(
  'problems/fetchProblems',
  async ({ page = 1, limit = 20, filters }: { page?: number; limit?: number; filters?: ProblemFilters }, { rejectWithValue }) => {
    try {
      const response = await problemService.getProblems(page, limit, filters);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch problems');
    }
  }
);

export const fetchProblemById = createAsyncThunk(
  'problems/fetchProblemById',
  async (id: string, { rejectWithValue }) => {
    try {
      const problem = await problemService.getProblemById(id);
      return problem;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch problem');
    }
  }
);

export const createProblem = createAsyncThunk(
  'problems/createProblem',
  async (data: CreateProblemData, { rejectWithValue }) => {
    try {
      const problem = await problemService.createProblem(data);
      return problem;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create problem');
    }
  }
);

export const updateProblem = createAsyncThunk(
  'problems/updateProblem',
  async ({ id, data }: { id: string; data: UpdateProblemData }, { rejectWithValue }) => {
    try {
      const problem = await problemService.updateProblem(id, data);
      return problem;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update problem');
    }
  }
);

export const addProblemComment = createAsyncThunk(
  'problems/addComment',
  async ({ id, comment, isPublic }: { id: string; comment: string; isPublic: boolean }, { rejectWithValue }) => {
    try {
      const activity = await problemService.addComment(id, comment, isPublic);
      return activity;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to add comment');
    }
  }
);

const problemsSlice = createSlice({
  name: 'problems',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ProblemFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearCurrentProblem: (state) => {
      state.currentProblem = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProblems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProblems.fulfilled, (state, action: PayloadAction<PaginatedResponse<Problem>>) => {
        state.isLoading = false;
        state.problems = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchProblems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchProblemById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProblemById.fulfilled, (state, action: PayloadAction<Problem>) => {
        state.isLoading = false;
        state.currentProblem = action.payload;
      })
      .addCase(fetchProblemById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createProblem.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createProblem.fulfilled, (state, action: PayloadAction<Problem>) => {
        state.isSubmitting = false;
        state.problems.unshift(action.payload);
      })
      .addCase(createProblem.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      .addCase(updateProblem.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateProblem.fulfilled, (state, action: PayloadAction<Problem>) => {
        state.isSubmitting = false;
        state.currentProblem = action.payload;
        const index = state.problems.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.problems[index] = action.payload;
        }
      })
      .addCase(updateProblem.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      .addCase(addProblemComment.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(addProblemComment.fulfilled, (state, action) => {
        state.isSubmitting = false;
        if (state.currentProblem && state.currentProblem.activities) {
          state.currentProblem.activities.push(action.payload);
        }
      })
      .addCase(addProblemComment.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearCurrentProblem, clearError } = problemsSlice.actions;
export default problemsSlice.reducer;
