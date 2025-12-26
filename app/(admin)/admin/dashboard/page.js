"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";

// Mock data
const mockStats = {
  totalMembers: 256,
  activeMembers: 198,
  expiredMembers: 42,
  inactiveMembers: 16,
  todayAttendance: 45,
  monthlyRevenue: 125000,
  pendingDues: 15000,
};

const mockRecentActivity = [
  {
    id: 1,
    type: "attendance",
    text: "John Doe checked in",
    time: "2 min ago",
    icon: "🟢",
  },
  {
    id: 2,
    type: "payment",
    text: "₹2,500 received from Jane",
    time: "15 min ago",
    icon: "💰",
  },
  {
    id: 3,
    type: "member",
    text: "New member: Mike Johnson",
    time: "1 hour ago",
    icon: "🆕",
  },
  {
    id: 4,
    type: "attendance",
    text: "Sarah Wilson checked out",
    time: "1 hour ago",
    icon: "🔴",
  },
  {
    id: 5,
    type: "payment",
    text: "₹1,000 received from Tom",
    time: "2 hours ago",
    icon: "💰",
  },
];

const mockTodayAttendance = [
  { id: 1, name: "John Doe", checkIn: "06:30 AM", status: "active" },
  { id: 2, name: "Jane Smith", checkIn: "07:15 AM", status: "active" },
  { id: 3, name: "Mike Johnson", checkIn: "06:45 AM", status: "left" },
];

const mockPendingPayments = [
  { id: 1, name: "Tom Brown", amount: 3000, dueDate: "Jan 20" },
  { id: 2, name: "Emily Davis", amount: 2500, dueDate: "Jan 18" },
  { id: 3, name: "Chris Lee", amount: 1500, dueDate: "Jan 22" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || data.user.role !== "admin") {
        router.push("/auth/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
    };
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page pb-24">
      <Header title="Dashboard" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">Welcome back! 👋</h2>
          <p className="text-gray-500 text-sm">Here's your gym overview</p>
        </div>

        {/* KPI Cards - Row 1 */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            title="Total Members"
            value={mockStats.totalMembers}
            icon="👥"
            onClick={() => router.push("/members")}
          />
          <KPICard
            title="Active"
            value={mockStats.activeMembers}
            icon="✅"
            color="green"
            onClick={() => router.push("/members?filter=active")}
          />
          <KPICard
            title="Expired"
            value={mockStats.expiredMembers}
            icon="⚠️"
            color="red"
            onClick={() => router.push("/members?filter=expired")}
          />
          <KPICard
            title="Today's Attendance"
            value={mockStats.todayAttendance}
            icon="📋"
            color="blue"
            onClick={() => router.push("/attendance")}
          />
        </div>

        {/* Revenue Card */}
        <Card variant="dark" padding="md" className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-300 text-sm">Monthly Revenue</p>
              <p className="text-3xl font-bold text-white">
                ₹{(mockStats.monthlyRevenue / 1000).toFixed(1)}K
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-300 text-sm">Pending Dues</p>
              <p className="text-xl font-semibold text-[#F97316]">
                ₹{(mockStats.pendingDues / 1000).toFixed(1)}K
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/finance")}
            className="w-full py-2.5 btn-gradient-orange rounded-lg text-sm font-semibold text-white"
          >
            View Finance →
          </button>
        </Card>

        {/* Quick Actions */}
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Add Member", icon: "➕", href: "/members/add" },
              { label: "Attendance", icon: "✅", href: "/attendance" },
              { label: "Payment", icon: "💳", href: "/finance" },
              { label: "Reports", icon: "📊", href: "/analytics" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="flex flex-col items-center p-3 rounded-xl hover:bg-[#F97316]/10 transition-all border border-transparent hover:border-[#F97316]/20"
              >
                <span className="text-2xl mb-1">{action.icon}</span>
                <span className="text-xs text-gray-600 font-medium">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Today's Attendance */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Today's Check-ins</h3>
            <button
              onClick={() => router.push("/attendance")}
              className="text-sm text-[#F97316] font-medium hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {mockTodayAttendance.map((member) => (
              <div
                key={member.id}
                className="p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500">{member.checkIn}</p>
                  </div>
                </div>
                <span
                  className={`w-2 h-2 rounded-full ${member.status === "active" ? "bg-green-500" : "bg-gray-300"
                    }`}
                ></span>
              </div>
            ))}
          </div>
        </Card>

        {/* Pending Payments */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Pending Payments</h3>
            <button
              onClick={() => router.push("/finance")}
              className="text-sm text-[#F97316] font-medium hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {mockPendingPayments.map((payment) => (
              <div
                key={payment.id}
                className="p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {payment.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Due: {payment.dueDate}
                  </p>
                </div>
                <span className="text-sm font-semibold text-red-500">
                  ₹{payment.amount}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {mockRecentActivity.map((activity) => (
              <div
                key={activity.id}
                className="p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span>{activity.icon}</span>
                  <span className="text-sm text-gray-700">{activity.text}</span>
                </div>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, icon, color = "gray", onClick }) {
  const colorClasses = {
    gray: "bg-white border-gray-200",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
    blue: "bg-blue-50 border-blue-200",
  };

  const valueColors = {
    gray: "text-gray-900",
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} rounded-xl p-4 border shadow-sm text-left w-full hover:shadow-md transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColors[color]}`}>{value}</p>
      <p className="text-xs text-gray-600 font-medium">{title}</p>
    </button>
  );
}
