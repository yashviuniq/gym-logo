"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";

// Mock data
const mockProfile = {
  id: 1,
  name: "Rahul Sharma",
  email: "rahul@example.com",
  phone: "9876543210",
  gender: "Male",
  age: 28,
  address: "123 Main St, Mumbai",
  joinDate: "2024-06-15",
  profileImage: null,
};

const mockMembership = {
  plan: "Premium",
  status: "active",
  startDate: "2025-01-01",
  endDate: "2025-06-30",
  daysLeft: 166,
  totalDays: 180,
};

const mockPayments = [
  {
    id: 1,
    date: "2025-01-01",
    amount: 4500,
    type: "Membership",
    status: "paid",
  },
  {
    id: 2,
    date: "2024-07-01",
    amount: 4500,
    type: "Membership",
    status: "paid",
  },
  {
    id: 3,
    date: "2024-06-15",
    amount: 1000,
    type: "Registration",
    status: "paid",
  },
];

const mockGymInfo = {
  name: "FitZone Gym",
  address: "456 Fitness Road, Mumbai - 400001",
  phone: "9876543200",
  email: "info@fitzone.com",
  timings: "5:00 AM - 11:00 PM",
};

export default function CustomerProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("membership");

  const membershipProgress =
    ((mockMembership.totalDays - mockMembership.daysLeft) /
      mockMembership.totalDays) *
    100;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="My Profile" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {mockProfile.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {mockProfile.name}
              </h2>
              <p className="text-gray-500">{mockProfile.phone}</p>
              <p className="text-gray-400 text-sm">{mockProfile.email}</p>
            </div>
            <button
              onClick={() => router.push("/profile/edit")}
              className="p-2 bg-gray-100 rounded-lg"
            >
              ✏️
            </button>
          </div>

          {/* Member Since */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Member since</span>
            <span className="font-medium text-gray-900">
              {new Date(mockProfile.joinDate).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Membership Status Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-300 text-sm">Current Plan</p>
              <p className="text-xl font-bold">{mockMembership.plan}</p>
            </div>
            <span className="px-3 py-1 bg-green-500 rounded-full text-sm font-medium">
              {mockMembership.status}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mb-2">
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${membershipProgress}%` }}
              ></div>
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-300">
              {mockMembership.daysLeft} days left
            </span>
            <span className="text-gray-300">
              Expires: {mockMembership.endDate}
            </span>
          </div>

          {/* Renew Button */}
          <button
            onClick={() => router.push("/profile/renew")}
            className="w-full mt-4 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>Renew Membership</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {["membership", "payments", "gym"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize ${activeTab === tab
                  ? "bg-black text-white"
                  : "bg-white text-gray-600 border border-gray-200"
                }`}
            >
              {tab === "gym" ? "Gym Info" : tab}
            </button>
          ))}
        </div>

        {/* Membership Tab */}
        {activeTab === "membership" && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Membership Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Plan</p>
                <p className="font-medium text-gray-900">
                  {mockMembership.plan}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="font-medium text-green-600 capitalize">
                  {mockMembership.status}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="font-medium text-gray-900">
                  {mockMembership.startDate}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <p className="font-medium text-gray-900">
                  {mockMembership.endDate}
                </p>
              </div>
            </div>

            {/* Personal Info */}
            <div className="pt-4 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3">
                Personal Information
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Gender</p>
                  <p className="font-medium text-gray-900">
                    {mockProfile.gender}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Age</p>
                  <p className="font-medium text-gray-900">
                    {mockProfile.age} years
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-500">Address</p>
                <p className="font-medium text-gray-900">
                  {mockProfile.address}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Payment History</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {mockPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      ₹{payment.amount}
                    </p>
                    <p className="text-sm text-gray-500">
                      {payment.type} • {payment.date}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gym Info Tab */}
        {activeTab === "gym" && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">{mockGymInfo.name}</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-lg">📍</span>
                <div>
                  <p className="text-xs text-gray-500">Address</p>
                  <p className="text-sm text-gray-900">{mockGymInfo.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">📞</span>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <a
                    href={`tel:${mockGymInfo.phone}`}
                    className="text-sm text-blue-600"
                  >
                    {mockGymInfo.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">✉️</span>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{mockGymInfo.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-lg">🕐</span>
                <div>
                  <p className="text-xs text-gray-500">Timings</p>
                  <p className="text-sm text-gray-900">{mockGymInfo.timings}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => window.open(`tel:${mockGymInfo.phone}`)}
                className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium"
              >
                📞 Call
              </button>
              <button
                onClick={() =>
                  window.open(`https://wa.me/91${mockGymInfo.phone}`)
                }
                className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium"
              >
                💬 WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Logout Button */}
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
