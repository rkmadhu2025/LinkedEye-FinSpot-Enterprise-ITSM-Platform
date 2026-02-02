import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Error Response type for proper type safety
interface ApiErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

// Type guard for API error response
const isApiErrorResponse = (data: unknown): data is ApiErrorResponse => {
  return typeof data === 'object' && data !== null &&
    ('detail' in data || 'message' in data || 'error' in data);
};

// Determine API URL - prefer relative path for production (works with nginx proxy)
// Use absolute URL only if explicitly set and not empty
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;

  // If VITE_API_URL is set and is an absolute URL, use it
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    if (import.meta.env.DEV) console.log('🌐 Using absolute API URL:', envUrl);
    return envUrl;
  }

  // Otherwise, use relative path (works with nginx /api proxy)
  if (import.meta.env.DEV) console.log('🌐 Using relative API path: /api/v1');
  return '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - uses localStorage directly to avoid circular dependency
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle both 401 (Unauthorized) and 403 (Forbidden/Not authenticated) responses
    const responseData = error.response?.data;
    const isAuthError = error.response?.status === 401 ||
      (error.response?.status === 403 &&
       isApiErrorResponse(responseData) &&
       responseData.detail?.toLowerCase()?.includes('not authenticated'));

    if (isAuthError && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const currentRefreshToken = localStorage.getItem('refreshToken');
        if (!currentRefreshToken) {
          throw new Error('No refresh token');
        }

        const response = await api.post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
          refresh_token: currentRefreshToken,
        });

        const { access_token, refresh_token } = response.data;
        localStorage.setItem('token', access_token);
        localStorage.setItem('refreshToken', refresh_token);
        const token = access_token;

        processQueue(null, token);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');

        // Store a session expired message for the login page to display
        sessionStorage.setItem('sessionExpiredMessage', 'Your session has expired. Please log in again.');

        // Dispatch a custom event that can be caught by React components for toast notification
        window.dispatchEvent(new CustomEvent('session:expired', {
          detail: { message: 'Your session has expired. Please log in again.' }
        }));

        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Helper functions for API calls
export const get = async <T>(url: string, params?: Record<string, unknown>): Promise<T> => {
  const response = await api.get<T>(url, { params });
  return response.data;
};

export const post = async <T>(url: string, data?: unknown): Promise<T> => {
  const response = await api.post<T>(url, data);
  return response.data;
};

export const put = async <T>(url: string, data?: unknown): Promise<T> => {
  const response = await api.put<T>(url, data);
  return response.data;
};

export const patch = async <T>(url: string, data?: unknown): Promise<T> => {
  const response = await api.patch<T>(url, data);
  return response.data;
};

export const del = async <T>(url: string): Promise<T> => {
  const response = await api.delete<T>(url);
  return response.data;
};
