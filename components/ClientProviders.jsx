"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { ToastProvider } from "@/contexts/ToastContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import SessionRestoration from "@/components/shared/SessionRestoration";
import NumberScrollPrevention from "@/components/shared/NumberScrollPrevention";
import PWASetup from "@/components/PWASetup";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import RouteTransitionOverlay from "@/components/shared/RouteTransitionOverlay";

// Lazy-load NotificationManager — it imports Firebase (~80KB gzipped)
// and is not needed for initial render. ssr:false is fine here
// because this file is a Client Component.
const NotificationManager = dynamic(
  () => import("@/components/shared/NotificationManager"),
  { ssr: false }
);

export default function ClientProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <NotificationProvider>
          <ThemeProvider>
            <SessionRestoration />
            <NumberScrollPrevention />
            <PWASetup />
            <NotificationManager />
            <Suspense fallback={null}>
              <RouteTransitionOverlay />
            </Suspense>
            {children}
          </ThemeProvider>
        </NotificationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
