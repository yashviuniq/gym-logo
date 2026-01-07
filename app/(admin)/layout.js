"use client";

import { useEffect } from "react";
import BottomNav from "@/components/layout/BottomNav";
import RouteProtection from "@/components/shared/RouteProtection";
import { runStartupCleanup } from "@/lib/receiptCleanup";

export default function AdminLayout({ children }) {
  // Run expired receipt cleanup once per day
  useEffect(() => {
    runStartupCleanup();
  }, []);

  return (
    <RouteProtection>
      <div>
        {children}
        <BottomNav role="admin" />
      </div>
    </RouteProtection>
  );
}
