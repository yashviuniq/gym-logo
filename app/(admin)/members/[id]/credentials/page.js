"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/layout/Header";

// Mock data - will be replaced with actual API call
const mockMemberCredentials = {
    id: 1,
    name: "John Doe",
    phone: "9876543210",
    email: "john@example.com",
    profileImage: null,
    credentials: {
        loginType: "email", // 'email' or 'phone'
        loginValue: "john@example.com",
        password: "Gym@123456", // In real app, this should be hashed
        lastLogin: "2025-12-27T10:30:00Z",
        fcmToken: "fcm_token_xyz123",
        createdAt: "2024-01-15T08:00:00Z",
        hasAppAccess: true,
    },
    memberSince: "2024-01-15",
    currentPlan: "Premium",
    status: "active",
};

export default function MemberCredentialsPage() {
    const router = useRouter();
    const params = useParams();
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    const member = mockMemberCredentials; // Replace with actual fetch

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleResetPassword = () => {
        // In real app, this would call API to reset password
        alert("Password reset link sent to member's email/phone");
    };

    const handleToggleAppAccess = () => {
        // In real app, this would call API to enable/disable app access
        alert("App access toggled");
    };

    return (
        <div className="min-h-screen bg-page pb-24">
            <Header title="Member Credentials" />

            <main className="px-4 py-4 space-y-4">
                {/* Member Info Card */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-2xl font-bold">
                            {member.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">{member.name}</h2>
                            <p className="text-white/90 text-sm">{member.phone}</p>
                            <p className="text-white/80 text-xs">Member since {member.memberSince}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
                        <div>
                            <p className="text-white/80 text-xs">Current Plan</p>
                            <p className="font-semibold">{member.currentPlan}</p>
                        </div>
                        <div>
                            <p className="text-white/80 text-xs">Status</p>
                            <p className="font-semibold capitalize">{member.status}</p>
                        </div>
                    </div>
                </div>

                {/* App Access Status */}
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-900">App Access</p>
                            <p className="text-sm text-gray-500">
                                {member.credentials.hasAppAccess
                                    ? "Member can login to mobile app"
                                    : "App access disabled"}
                            </p>
                        </div>
                        <button
                            onClick={handleToggleAppAccess}
                            className={`w-12 h-6 rounded-full transition ${member.credentials.hasAppAccess ? "bg-green-500" : "bg-gray-300"
                                }`}
                        >
                            <div
                                className={`w-5 h-5 bg-white rounded-full shadow transition transform ${member.credentials.hasAppAccess ? "translate-x-6" : "translate-x-1"
                                    }`}
                            ></div>
                        </button>
                    </div>
                </div>

                {/* Login Credentials */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <span className="text-xl">🔐</span>
                            Login Credentials
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                            Member uses these credentials to login to the mobile app
                        </p>
                    </div>

                    <div className="p-4 space-y-4">
                        {/* Login Type */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Login Type
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium capitalize">
                                    {member.credentials.loginType}
                                </span>
                            </div>
                        </div>

                        {/* Login Value (Email or Phone) */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                {member.credentials.loginType === "email" ? "Email Address" : "Phone Number"}
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <p className="font-medium text-gray-900">
                                        {member.credentials.loginValue}
                                    </p>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(member.credentials.loginValue, "login")}
                                    className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                                >
                                    {copied === "login" ? "✓" : "📋"}
                                </button>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Password
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <p className="font-medium text-gray-900 font-mono">
                                        {showPassword ? member.credentials.password : "••••••••••"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition"
                                >
                                    {showPassword ? "🙈" : "👁️"}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(member.credentials.password, "password")}
                                    className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
                                >
                                    {copied === "password" ? "✓" : "📋"}
                                </button>
                            </div>
                        </div>

                        {/* Last Login */}
                        {member.credentials.lastLogin && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                    Last Login
                                </label>
                                <div className="px-4 py-3 bg-green-50 rounded-xl border border-green-200">
                                    <p className="text-sm text-green-700 font-medium">
                                        {new Date(member.credentials.lastLogin).toLocaleString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Account Created */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Account Created
                            </label>
                            <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                                <p className="text-sm text-gray-700 font-medium">
                                    {new Date(member.credentials.createdAt).toLocaleString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                    <h3 className="font-semibold text-gray-900 mb-3">Account Actions</h3>

                    <button
                        onClick={handleResetPassword}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:shadow-lg transition"
                    >
                        🔄 Reset Password
                    </button>

                    <button
                        onClick={() => router.push(`/members/${member.id}/edit`)}
                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                    >
                        ✏️ Edit Member Details
                    </button>
                </div>

                {/* Security Notice */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <p className="font-semibold text-red-900 mb-1">Security Notice</p>
                            <p className="text-sm text-red-700">
                                Keep these credentials confidential. Only share with the member directly.
                                Never share via public channels or screenshots.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
