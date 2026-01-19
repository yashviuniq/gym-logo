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

        // Check if credentials were updated by admin (force re-login)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("credentials_updated_at")
          .eq("id", data.user.id)
          .single();

        if (profileData?.credentials_updated_at) {
          const lastLoginStr = localStorage.getItem("trainer_login_at");
          const credentialsUpdatedAt = new Date(profileData.credentials_updated_at).getTime();
          const lastLoginAt = lastLoginStr ? parseInt(lastLoginStr, 10) : 0;

          // If credentials were updated after the trainer's last login, force logout
          if (credentialsUpdatedAt > lastLoginAt) {
            localStorage.removeItem("gymUser");
            localStorage.removeItem("trainer_login_at");
            await supabase.auth.signOut();
            router.push("/auth/login?message=credentials_changed");
            return;
          }
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
