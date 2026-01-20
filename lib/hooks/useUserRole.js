import { useState, useEffect } from 'react';
import { getSession, SESSION_KEYS } from '@/lib/sessionStorage';

/**
 * Hook to get the current user's role
 * Returns the role and loading state
 */
export function useUserRole() {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      setLoading(true);
      
      const userStr = await getSession(SESSION_KEYS.USER);
      
      if (!userStr) {
        setRole(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const userData = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
      setUser(userData);
      setRole(userData.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setRole(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for role checks
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isTrainer = role === 'trainer';
  const isMember = role === 'member';
  
  // Can access admin dashboard (owner, admin, trainer)
  const canAccessAdmin = isOwner || isAdmin || isTrainer;
  
  // Can view finance data (owner, admin only - NOT trainer)
  const canViewFinance = isOwner || isAdmin;
  
  // Can create trainers (owner, admin only - NOT trainer)
  const canCreateTrainer = isOwner || isAdmin;
  
  // Can manage staff (owner, admin only)
  const canManageStaff = isOwner || isAdmin;

  return { 
    role, 
    user,
    loading, 
    isOwner,
    isAdmin,
    isTrainer,
    isMember,
    canAccessAdmin,
    canViewFinance,
    canCreateTrainer,
    canManageStaff,
    refetchRole: fetchUserRole 
  };
}
