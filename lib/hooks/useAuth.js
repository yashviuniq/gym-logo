"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useRouter } from "next/navigation";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial user state
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        if (event === "SIGNED_OUT") {
          router.push("/auth/login");
        }
      }
    );

    return () => listener?.subscription?.unsubscribe();
  }, [router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }, [router]);

  const isAdmin = user?.role === "owner" || user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const isMember = user?.role === "member";

  return { 
    user, 
    loading, 
    signOut,
    isAdmin,
    isTrainer,
    isMember,
    isAuthenticated: !!user 
  };
}
