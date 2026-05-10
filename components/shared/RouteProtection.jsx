"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { hasRouteAccess } from "@/lib/constants/permissions";

/**
 * Route protection component - blocks unauthorized access
 */
export default function RouteProtection({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { permissions, loading, userRole } = usePermissions();
  const [authorized, setAuthorized] = useState(false);

  // Handle browser back/forward navigation and bfcache restoration after logout
  useEffect(() => {
    const checkAuthOnPageShow = (e) => {
      // persisted = true means page was restored from bfcache (back button)
      if (e.persisted) {
        const user = localStorage.getItem("gymUser");
        if (!user) {
          window.location.replace("/auth/login");
        }
      }
    };

    const checkAuthOnPopState = () => {
      const user = localStorage.getItem("gymUser");
      if (!user) {
        window.location.replace("/auth/login");
      }
    };

    window.addEventListener("pageshow", checkAuthOnPageShow);
    window.addEventListener("popstate", checkAuthOnPopState);

    return () => {
      window.removeEventListener("pageshow", checkAuthOnPageShow);
      window.removeEventListener("popstate", checkAuthOnPopState);
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    // No user logged in
    if (!userRole) {
      router.replace("/auth/login");
      return;
    }

    // Check route access
    const hasAccess = hasRouteAccess(permissions, pathname);

    if (!hasAccess) {
      // Redirect to dashboard if no permission
      router.replace("/admin/dashboard");
      return;
    }

    setAuthorized(true);
  }, [permissions, loading, userRole, pathname, router]);

  // Loading state
  if (loading || !authorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
