"use client";

import BottomNav from "@/components/layout/BottomNav";

export default function AdminLayout({ children }) {
  return (
    <div>
      {children}
      <BottomNav role="admin" />
    </div>
  );
}
