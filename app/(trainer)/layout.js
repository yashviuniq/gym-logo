"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BottomNav from "@/components/layout/BottomNav";

export default function TrainerLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        
        if (!data?.user) {
          router.push("/auth/login");
          return;
        }

        // Check if user is a trainer
        const userRole = data.user?.role;
        if (userRole !== "trainer") {
          // Redirect to appropriate dashboard
          if (userRole === "owner" || userRole === "admin") {
            router.push("/admin/dashboard");
          } else if (userRole === "member") {
            router.push("/user/dashboard");
          } else {
            router.push("/auth/login");
          }
          return;
        }

        setAuthorized(true);
      } catch (err) {
        console.error("Auth error:", err);
        router.push("/auth/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div>
      {children}
      <BottomNav role="trainer" />
    </div>
  );
}
