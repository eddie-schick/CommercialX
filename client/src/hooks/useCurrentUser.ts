/**
 * @deprecated Use useAuth instead. This hook is kept for backward compatibility.
 * It now wraps useAuth to maintain existing functionality.
 */
import { useAuth } from './useAuth';

interface UseCurrentUserReturn {
  user: ReturnType<typeof useAuth>['user'];
  profile: ReturnType<typeof useAuth>['profile'];
  permissions: ReturnType<typeof useAuth>['permissions'];
  dealerId: ReturnType<typeof useAuth>['dealerId'];
  loading: ReturnType<typeof useAuth>['loading'];
  error: ReturnType<typeof useAuth>['error'];
  refetch: ReturnType<typeof useAuth>['refreshProfile'];
}

export function useCurrentUser(): UseCurrentUserReturn {
  const auth = useAuth();
  
  return {
    user: auth.user,
    profile: auth.profile,
    permissions: auth.permissions,
    dealerId: auth.dealerId,
    loading: auth.loading,
    error: auth.error,
    refetch: auth.refreshProfile,
  };
}
