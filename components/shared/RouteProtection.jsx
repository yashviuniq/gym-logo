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

  useEffect(() => {
    if (loading) return;

    // No user logged in
    if (!userRole) {
      router.push("/auth/login");
      return;
    }

    // Check route access
    const hasAccess = hasRouteAccess(permissions, pathname);

    if (!hasAccess) {
      // Redirect to dashboard if no permission
      router.push("/admin/dashboard");
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
