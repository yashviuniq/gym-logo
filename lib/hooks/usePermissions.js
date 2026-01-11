import { useState, useEffect } from 'react';
import { OWNER_PERMISSIONS } from '@/lib/constants/permissions';
import { getSession, isSessionValid, SESSION_KEYS } from '@/lib/sessionStorage';

/**
 * Hook to get user permissions from persistent storage
 * Returns user permissions and loading state
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      
      // Check if session is valid (not expired)
      const valid = await isSessionValid();
      if (!valid) {
        setPermissions(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Get user from persistent storage
      const userStr = await getSession(SESSION_KEYS.USER);
      
      if (!userStr) {
        setPermissions(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      const user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
      setUserRole(user.role);

      // Owners have all permissions
      if (user.role === 'owner') {
        setPermissions(OWNER_PERMISSIONS);
      } 
      // Admin permissions come from user object
      else if (user.role === 'admin' && user.permissions) {
        setPermissions(user.permissions);
      }
      // Trainers have limited permissions
      else if (user.role === 'trainer') {
        setPermissions({
          dashboard: true,
          members: true,
          attendance: true,
          announcements: true,
          finance: false,
          analytics: false,
          monitoring: false,
          settings: false
        });
      }
      // Members have their own permissions
      else if (user.role === 'member') {
        setPermissions({
          dashboard: true,
          profile: true,
          schedule: true,
          diet: true,
          workout: true,
          announcements: true
        });
      }
      // No permissions for unknown roles
      else {
        setPermissions(null);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  return { permissions, loading, userRole, refetchPermissions: fetchPermissions };
}
