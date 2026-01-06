import { useState, useEffect } from 'react';
import { OWNER_PERMISSIONS } from '@/lib/constants/permissions';

/**
 * Hook to get user permissions from localStorage
 * Returns user permissions and loading state
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      
      if (!userStr) {
        setPermissions(null);
        setLoading(false);
        return;
      }

      const user = JSON.parse(userStr);
      setUserRole(user.role);

      // Owners have all permissions
      if (user.role === 'owner') {
        setPermissions(OWNER_PERMISSIONS);
      } 
      // Admin permissions come from user object
      else if (user.role === 'admin' && user.permissions) {
        setPermissions(user.permissions);
      } 
      // No permissions for other roles
      else {
        setPermissions(null);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  };

  return { permissions, loading, userRole, refetchPermissions: fetchPermissions };
}
