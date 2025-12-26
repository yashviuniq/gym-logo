"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";

const settingsSections = [
  {
    id: "gym",
    title: "Gym Settings",
    description: "Name, address, operating hours, QR code",
    icon: "🏋️",
    href: "/settings/gym",
  },
  {
    id: "plans",
    title: "Membership Plans",
    description: "Create, edit plans, pricing, freeze options",
    icon: "📋",
    href: "/settings/plans",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Reminders, alerts, payment notifications",
    icon: "🔔",
    href: "/settings/notifications",
  },
  {
    id: "staff",
    title: "Staff & Access",
    description: "Sub-admin roles, permissions",
    icon: "👥",
    href: "/settings/staff",
    badge: "Coming Soon",
  },
];

const quickActions = [
  { label: "Export Data", icon: "📥", action: "export" },
  { label: "Backup", icon: "💾", action: "backup" },
  { label: "Help", icon: "❓", action: "help" },
];

export default function SettingsPage() {
  const router = useRouter();

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
    <div className="min-h-screen bg-page pb-24">
      <Header title="Settings" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <Card variant="dark" padding="md" className="card-dark">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl" style={{
              background: 'linear-gradient(135deg, #F97316 0%, #FF8C42 100%)'
            }}>
              🏋️
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">FitZone Gym</h2>
              <p className="text-gray-300 text-sm">Admin Dashboard</p>
            </div>
          </div>
        </Card>

        {/* Settings Sections */}
        <div className="space-y-3">
          {settingsSections.map((section) => (
            <Card
              key={section.id}
              padding="md"
              onClick={() => !section.badge && router.push(section.href)}
              className={`flex items-center gap-4 ${section.badge ? "opacity-60" : "cursor-pointer hover:shadow-md transition-all"
                }`}
            >
              <div className="w-12 h-12 bg-[#F97316]/10 rounded-xl flex items-center justify-center text-2xl">
                {section.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{section.title}</p>
                  {section.badge && (
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      {section.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{section.description}</p>
              </div>
              <span className="text-[#F97316]">→</span>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.action}
                onClick={() => handleQuickAction(action.action)}
                className="bg-[#F97316]/5 hover:bg-[#F97316]/10 rounded-xl p-3 flex flex-col items-center gap-2 transition-all border border-transparent hover:border-[#F97316]/20"
              >
                <span className="text-2xl">{action.icon}</span>
                <span className="text-xs font-medium text-gray-700">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* App Info */}
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 mb-3">App Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Updated</span>
              <span className="font-medium">Jan 15, 2025</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Members</span>
              <span className="font-medium">256</span>
            </div>
          </div>
        </Card>

        {/* Logout */}
        <button
          onClick={() => router.push("/auth/login")}
          className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium"
        >
          Logout
        </button>
      </main>
    </div>
  );
}
