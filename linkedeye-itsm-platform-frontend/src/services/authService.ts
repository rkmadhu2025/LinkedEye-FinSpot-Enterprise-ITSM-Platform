import api from './api';
import { User, LoginCredentials, RegisterData } from '@/types';

// Backend response uses accessToken
interface BackendAuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Frontend uses token
interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<{ access_token: string; refresh_token: string }>('/auth/login', credentials);
    const { access_token, refresh_token } = response.data;

    // Get user info separately using the new token
    const userResponse = await api.get<User>('/auth/me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    return {
      user: userResponse.data,
      token: access_token,
      refreshToken: refresh_token,
    };
  },

  async register(data: RegisterData): Promise<{ message: string }> {
    await api.post<User>('/auth/register', data);
    return { message: 'Registration successful' };
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  async refreshToken(token: string): Promise<AuthResponse> {
    const response = await api.post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      refresh_token: token,
    });
    const { access_token, refresh_token } = response.data;

    // Get user info separately using the new token
    const userResponse = await api.get<User>('/auth/me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    return {
      user: userResponse.data,
      token: access_token,
      refreshToken: refresh_token,
    };
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    // Backend endpoint is /auth/password-reset
    const response = await api.post<{ message: string }>('/auth/password-reset', {
      email,
    });
    return { message: response.data.message };
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    // Backend endpoint is /auth/password-reset/confirm
    const response = await api.post<{ message: string }>('/auth/password-reset/confirm', {
      token,
      new_password: password,
    });
    return { message: response.data.message };
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return { message: response.data.message };
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/verify-email', {
      token,
    });
    return { message: response.data.message };
  },

  async resendVerificationEmail(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/resend-verification');
    return { message: response.data.message };
  },
};
