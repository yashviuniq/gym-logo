"use client";

import BottomNav from "@/components/layout/BottomNav";
import RouteProtection from "@/components/shared/RouteProtection";

export default function AdminLayout({ children }) {
  return (
    <RouteProtection>
      <div>
        {children}
        <BottomNav role="admin" />
      </div>
    </RouteProtection>
  );
}
