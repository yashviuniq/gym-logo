"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/layout/BottomNav";
import RouteProtection from "@/components/shared/RouteProtection";
import { runStartupCleanup } from "@/lib/receiptCleanup";
import { getSession, SESSION_KEYS } from "@/lib/sessionStorage";

export default function AdminLayout({ children }) {
  const [userRole, setUserRole] = useState("admin");

  // Run expired receipt cleanup once per day
  useEffect(() => {
    runStartupCleanup();
    
    // Get user role to pass to BottomNav
    const fetchRole = async () => {
      const userStr = await getSession(SESSION_KEYS.USER);
      if (userStr) {
        const user = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
        // Trainers use the same admin routes, so we keep role as "admin" for navigation
        // but store actual role for display purposes
        setUserRole(user.role === 'trainer' ? 'admin' : user.role);
      }
    };
    fetchRole();
  }, []);

  return (
    <RouteProtection>
      <div>
        {children}
        <BottomNav role={userRole} />
      </div>
    </RouteProtection>
  );
}
