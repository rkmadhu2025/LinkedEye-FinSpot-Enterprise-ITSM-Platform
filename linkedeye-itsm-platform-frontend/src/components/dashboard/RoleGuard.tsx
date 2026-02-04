import { ReactNode } from 'react';
import { useAppSelector } from '@/hooks/useRedux';
import { getUserRole, UserRole } from '@/utils/roles';

interface RoleGuardProps {
  allowed: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on current user role.
 * Use this to show/hide dashboard sections per persona.
 */
const RoleGuard = ({ allowed, children, fallback = null }: RoleGuardProps) => {
  const { user } = useAppSelector((state) => state.auth);
  const role = getUserRole(user);
  if (!allowed.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
};

export default RoleGuard;
