import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Incident, IncidentFilters, PaginatedResponse, CreateIncidentData, UpdateIncidentData } from '@/types';
import { incidentService } from '@/services/incidentService';

interface IncidentsState {
  incidents: Incident[];
  currentIncident: Incident | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: IncidentFilters;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: IncidentsState = {
  incidents: [],
  currentIncident: null,
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

export const fetchIncidents = createAsyncThunk(
  'incidents/fetchIncidents',
  async ({ page = 1, limit = 20, filters }: { page?: number; limit?: number; filters?: IncidentFilters }, { rejectWithValue }) => {
    try {
      const response = await incidentService.getIncidents(page, limit, filters);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch incidents');
    }
  }
);

export const fetchIncidentById = createAsyncThunk(
  'incidents/fetchIncidentById',
  async (id: string, { rejectWithValue }) => {
    try {
      const incident = await incidentService.getIncidentById(id);
      return incident;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch incident');
    }
  }
);

export const createIncident = createAsyncThunk(
  'incidents/createIncident',
  async (data: CreateIncidentData, { rejectWithValue }) => {
    try {
      const incident = await incidentService.createIncident(data);
      return incident;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create incident');
    }
  }
);

export const updateIncident = createAsyncThunk(
  'incidents/updateIncident',
  async ({ id, data }: { id: string; data: UpdateIncidentData }, { rejectWithValue }) => {
    try {
      const incident = await incidentService.updateIncident(id, data);
      return incident;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update incident');
    }
  }
);

export const addIncidentComment = createAsyncThunk(
  'incidents/addComment',
  async ({ id, comment, isPublic }: { id: string; comment: string; isPublic: boolean }, { rejectWithValue }) => {
    try {
      const activity = await incidentService.addComment(id, comment, isPublic);
      return activity;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to add comment');
    }
  }
);

const incidentsSlice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<IncidentFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearCurrentIncident: (state) => {
      state.currentIncident = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Incidents
      .addCase(fetchIncidents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchIncidents.fulfilled, (state, action: PayloadAction<PaginatedResponse<Incident>>) => {
        state.isLoading = false;
        state.incidents = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchIncidents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Incident By Id
      .addCase(fetchIncidentById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchIncidentById.fulfilled, (state, action: PayloadAction<Incident>) => {
        state.isLoading = false;
        state.currentIncident = action.payload;
      })
      .addCase(fetchIncidentById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Incident
      .addCase(createIncident.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createIncident.fulfilled, (state, action: PayloadAction<Incident>) => {
        state.isSubmitting = false;
        state.incidents.unshift(action.payload);
      })
      .addCase(createIncident.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      // Update Incident
      .addCase(updateIncident.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateIncident.fulfilled, (state, action: PayloadAction<Incident>) => {
        state.isSubmitting = false;
        state.currentIncident = action.payload;
        const index = state.incidents.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.incidents[index] = action.payload;
        }
      })
      .addCase(updateIncident.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      // Add Comment
      .addCase(addIncidentComment.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(addIncidentComment.fulfilled, (state, action) => {
        state.isSubmitting = false;
        if (state.currentIncident && state.currentIncident.activities) {
          state.currentIncident.activities.push(action.payload);
        }
      })
      .addCase(addIncidentComment.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearCurrentIncident, clearError } = incidentsSlice.actions;
export default incidentsSlice.reducer;
