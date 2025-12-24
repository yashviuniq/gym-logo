"use client";

import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";

const mockData = {
  name: "Rahul",
  membership: {
    plan: "Premium",
    daysLeft: 166,
    status: "active",
  },
  todayWorkout: "Chest & Triceps",
  streak: 5,
  thisMonthAttendance: 12,
};

const quickLinks = [
  { label: "Workout", icon: "💪", href: "/workout", color: "bg-blue-100" },
  { label: "Diet", icon: "🥗", href: "/diet", color: "bg-green-100" },
  {
    label: "Attendance",
    icon: "📅",
    href: "/my-attendance",
    color: "bg-purple-100",
  },
  { label: "Schedule", icon: "🗓️", href: "/schedule", color: "bg-orange-100" },
];

export default function CustomerDashboard() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Home" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Hey, {mockData.name}! 👋
          </h2>
          <p className="text-gray-500 text-sm">Let's crush your goals today</p>
        </div>

        {/* Membership Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-gray-300 text-sm">
                {mockData.membership.plan} Plan
              </p>
              <p className="text-2xl font-bold">
                {mockData.membership.daysLeft} days left
              </p>
            </div>
            <span className="px-3 py-1 bg-green-500 rounded-full text-sm">
              Active
            </span>
          </div>
          <button
            onClick={() => router.push("/profile")}
            className="w-full py-2 bg-white/10 rounded-lg text-sm font-medium"
          >
            View Details →
          </button>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔥</span>
              <span className="text-sm text-gray-500">Streak</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {mockData.streak} days
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📅</span>
              <span className="text-sm text-gray-500">This Month</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {mockData.thisMonthAttendance} days
            </p>
          </div>
        </div>

        {/* Today's Workout */}
        <div
          onClick={() => router.push("/workout")}
          className="bg-blue-50 rounded-xl p-4 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm">Today's Workout</p>
              <p className="text-lg font-bold text-blue-900">
                {mockData.todayWorkout}
              </p>
            </div>
            <span className="text-3xl">💪</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Access</h3>
          <div className="grid grid-cols-4 gap-2">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => router.push(link.href)}
                className={`${link.color} p-3 rounded-xl flex flex-col items-center gap-1`}
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="text-xs font-medium text-gray-700">
                  {link.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Knowledge Tip */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-semibold">Tip of the Day</p>
              <p className="text-sm text-purple-100">
                Drink at least 3L water daily for better performance.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
