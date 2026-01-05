import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Asset, AssetFilters, PaginatedResponse, CreateAssetData } from '@/types';
import { assetService } from '@/services/assetService';

interface AssetsState {
  assets: Asset[];
  currentAsset: Asset | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: AssetFilters;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: AssetsState = {
  assets: [],
  currentAsset: null,
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

export const fetchAssets = createAsyncThunk(
  'assets/fetchAssets',
  async ({ page = 1, limit = 20, filters }: { page?: number; limit?: number; filters?: AssetFilters }, { rejectWithValue }) => {
    try {
      const response = await assetService.getAssets(page, limit, filters);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch assets');
    }
  }
);

export const fetchAssetById = createAsyncThunk(
  'assets/fetchAssetById',
  async (id: string, { rejectWithValue }) => {
    try {
      const asset = await assetService.getAssetById(id);
      return asset;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch asset');
    }
  }
);

export const createAsset = createAsyncThunk(
  'assets/createAsset',
  async (data: CreateAssetData, { rejectWithValue }) => {
    try {
      const asset = await assetService.createAsset(data);
      return asset;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to create asset');
    }
  }
);

export const updateAsset = createAsyncThunk(
  'assets/updateAsset',
  async ({ id, data }: { id: string; data: Partial<CreateAssetData> }, { rejectWithValue }) => {
    try {
      const asset = await assetService.updateAsset(id, data);
      return asset;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to update asset');
    }
  }
);

export const deleteAsset = createAsyncThunk(
  'assets/deleteAsset',
  async (id: string, { rejectWithValue }) => {
    try {
      await assetService.deleteAsset(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to delete asset');
    }
  }
);

const assetsSlice = createSlice({
  name: 'assets',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<AssetFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearCurrentAsset: (state) => {
      state.currentAsset = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Assets
      .addCase(fetchAssets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAssets.fulfilled, (state, action: PayloadAction<PaginatedResponse<Asset>>) => {
        state.isLoading = false;
        state.assets = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAssets.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch Asset By Id
      .addCase(fetchAssetById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAssetById.fulfilled, (state, action: PayloadAction<Asset>) => {
        state.isLoading = false;
        state.currentAsset = action.payload;
      })
      .addCase(fetchAssetById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create Asset
      .addCase(createAsset.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createAsset.fulfilled, (state, action: PayloadAction<Asset>) => {
        state.isSubmitting = false;
        state.assets.unshift(action.payload);
      })
      .addCase(createAsset.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      // Update Asset
      .addCase(updateAsset.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateAsset.fulfilled, (state, action: PayloadAction<Asset>) => {
        state.isSubmitting = false;
        state.currentAsset = action.payload;
        const index = state.assets.findIndex((a) => a.id === action.payload.id);
        if (index !== -1) {
          state.assets[index] = action.payload;
        }
      })
      .addCase(updateAsset.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      })
      // Delete Asset
      .addCase(deleteAsset.fulfilled, (state, action: PayloadAction<string>) => {
        state.assets = state.assets.filter((a) => a.id !== action.payload);
        if (state.currentAsset?.id === action.payload) {
          state.currentAsset = null;
        }
      });
  },
});

export const { setFilters, clearFilters, clearCurrentAsset, clearError } = assetsSlice.actions;
export default assetsSlice.reducer;
