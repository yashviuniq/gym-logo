import { useState, useEffect } from 'react';
import { OWNER_PERMISSIONS } from '@/lib/constants/permissions';

// Session storage key (must match supabaseClient.js)
const SESSION_KEY = "gymUser";
const SESSION_EXPIRY_KEY = "gymUserExpiry";

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
      
      // Check for session in localStorage (gymUser is the key used by auth system)
      const userStr = localStorage.getItem(SESSION_KEY);
      
      if (!userStr) {
        setPermissions(null);
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Check if session has expired
      const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
      if (expiryTime) {
        const expiry = parseInt(expiryTime, 10);
        if (Date.now() > expiry) {
          console.log("Session expired in usePermissions");
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_EXPIRY_KEY);
          setPermissions(null);
          setUserRole(null);
          setLoading(false);
          return;
        }
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
