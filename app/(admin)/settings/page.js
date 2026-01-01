"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";
import { supabase } from "@/lib/supabaseClient";

const settingsSections = [
  {
    id: "gym",
    title: "Gym Settings",
    description: "Name, address, operating hours, QR code",
    icon: "🏋️",
    href: "/settings/gym",
    color: "from-orange-500 to-amber-500"
  },
  {
    id: "plans",
    title: "Membership Plans",
    description: "Create, edit plans, pricing, freeze options",
    icon: "📋",
    href: "/settings/plans",
    color: "from-blue-500 to-indigo-500"
  },
  {
    id: "diet-plans",
    title: "Diet Plans",
    description: "Create and manage diet plans with meals",
    icon: "🥗",
    href: "/settings/diet-plans",
    color: "from-green-500 to-emerald-500"
  },
  {
    id: "workout-plans",
    title: "Workout Plans",
    description: "Create and manage workout routines",
    icon: "💪",
    href: "/settings/workout-plans",
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Reminders, alerts, payment notifications",
    icon: "🔔",
    href: "/settings/notifications",
    color: "from-emerald-500 to-teal-500"
  },
  {
    id: "staff",
    title: "Staff & Access",
    description: "Sub-admin roles, permissions",
    icon: "👥",
    href: "/settings/staff",
    badge: "Coming Soon",
    color: "from-purple-500 to-violet-500"
  },
];

const quickActions = [
  { 
    label: "Export Data", 
    icon: "📥", 
    action: "export",
    description: "Export member data",
    color: "from-blue-50 to-blue-100"
  },
  { 
    label: "Backup", 
    icon: "💾", 
    action: "backup",
    description: "Create backup",
    color: "from-emerald-50 to-emerald-100"
  },
  { 
    label: "Help", 
    icon: "❓", 
    action: "help",
    description: "Get support",
    color: "from-amber-50 to-amber-100"
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [gymName, setGymName] = useState("Loading...");
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [appStats, setAppStats] = useState({
    version: "1.2.5",
    lastUpdated: "Jan 15, 2025",
    databaseSize: "2.4 GB"
  });

  useEffect(() => {
    fetchGymData();
  }, []);

  const fetchGymData = async () => {
    try {
      setLoading(true);
      
      const storedGym = localStorage.getItem("selectedGym");
      if (!storedGym) {
        console.error("No gym selected");
        router.push("/admin/dashboard");
        return;
      }

      const gym = JSON.parse(storedGym);
      setGymName(gym.name || "My Gym");

      const { count, error } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("gym_id", gym.id);

      if (error) throw error;
      setTotalMembers(count || 0);
    } catch (error) {
      console.error("Error fetching gym data:", error);
      const storedGym = localStorage.getItem("selectedGym");
      if (storedGym) {
        const gym = JSON.parse(storedGym);
        setGymName(gym.name || "My Gym");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case "export":
        alert("Export functionality coming soon!");
        break;
      case "backup":
        alert("Backup functionality coming soon!");
        break;
      case "help":
        alert("Help & Support coming soon!");
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header title="Settings" showBack={false} />

      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        {/* Gym Profile Card */}
        <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl border-2 border-white/30">
              🏋️
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">{gymName}</h2>
              <p className="text-white/90">Administrator Dashboard</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-white/80">👥</span>
                  <p className="text-white/90">{loading ? "..." : totalMembers} Members</p>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-1">
                  <span className="text-white/80">🔄</span>
                  <p className="text-white/90">Active Today</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">⚙️</span>
              </div>
              <p className="text-xs text-white/80">Settings</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">📊</span>
              </div>
              <p className="text-xs text-white/80">Analytics</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">🛠️</span>
              </div>
              <p className="text-xs text-white/80">Tools</p>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {settingsSections.map((section) => (
            <div
              key={section.id}
              onClick={() => !section.badge && router.push(section.href)}
              className={`bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-300 ${section.badge ? "opacity-80 cursor-not-allowed" : "cursor-pointer hover:border-orange-200 group"}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center text-white text-2xl`}>
                  {section.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900">{section.title}</h3>
                    {section.badge && (
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        {section.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{section.description}</p>
                  {!section.badge && (
                    <div className="flex items-center text-orange-600 text-sm font-medium group-hover:translate-x-1 transition-transform duration-300">
                      <span>Configure</span>
                      <span className="ml-1">→</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">Quick Actions</h3>
              <p className="text-sm text-gray-500">Frequently used settings and tools</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl flex items-center justify-center">
              <span className="text-orange-600">⚡</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.action}
                onClick={() => handleQuickAction(action.action)}
                className={`bg-gradient-to-br ${action.color} border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-md`}
              >
                <div className="w-12 h-12 bg-white/80 rounded-xl flex items-center justify-center text-2xl mb-1">
                  {action.icon}
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-900 text-sm">{action.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* App Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">App Information</h3>
              <p className="text-sm text-gray-500">System details and statistics</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
              <span className="text-blue-600">📱</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600">🏷️</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Version</p>
                  <p className="text-xs text-gray-500">Current app version</p>
                </div>
              </div>
              <span className="font-semibold text-gray-900">{appStats.version}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600">🕒</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Updated</p>
                  <p className="text-xs text-gray-500">Most recent update</p>
                </div>
              </div>
              <span className="font-semibold text-gray-900">{appStats.lastUpdated}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600">👥</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Total Members</p>
                  <p className="text-xs text-gray-500">Active member count</p>
                </div>
              </div>
              <span className="font-semibold text-gray-900">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                ) : (
                  totalMembers.toLocaleString()
                )}
              </span>
            </div>

          
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-4">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="w-full py-4 bg-gradient-to-r from-gray-700 to-gray-800 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>←</span>
            Back to Dashboard
          </button>

          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                localStorage.removeItem("selectedGym");
                router.push("/auth/login");
              }
            }}
            className="w-full py-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-600 font-medium rounded-xl hover:shadow-sm transition-all duration-300 flex items-center justify-center gap-2"
          >
            <span>🚪</span>
            Logout
          </button>

          {/* Support Info */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-500">
              Need help?{" "}
              <button 
                onClick={() => handleQuickAction("help")}
                className="text-orange-600 font-medium hover:text-orange-700"
              >
                Contact Support
              </button>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              © {new Date().getFullYear()} Gym Management System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}