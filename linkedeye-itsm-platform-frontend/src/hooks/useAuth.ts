import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './useRedux';
import { login, logout, getCurrentUser, register } from '@/store/slices/authSlice';
import { LoginCredentials, RegisterData } from '@/types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, user]);

  const handleLogin = async (credentials: LoginCredentials) => {
    const result = await dispatch(login(credentials));
    if (login.fulfilled.match(result)) {
      navigate('/dashboard');
      return true;
    }
    return false;
  };

  const handleRegister = async (data: RegisterData) => {
    const result = await dispatch(register(data));
    if (register.fulfilled.match(result)) {
      navigate('/login');
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.some((role) => role.permissions.includes(permission) || role.permissions.includes('*'));
  };

  const hasRole = (roleCode: string): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.some((role) => role.code === roleCode);
  };

  const isAdmin = (): boolean => {
    return hasRole('admin') || hasRole('super_admin');
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    hasPermission,
    hasRole,
    isAdmin,
  };
};
