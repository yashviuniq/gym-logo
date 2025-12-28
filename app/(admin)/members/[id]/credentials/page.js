"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";

export default function MemberCredentialsPage() {
    const router = useRouter();
    const params = useParams();
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasAppAccess, setHasAppAccess] = useState(false);

    useEffect(() => {
        fetchMemberCredentials();
    }, [params.id]);

    const fetchMemberCredentials = async () => {
        setLoading(true);
        try {
            // Fetch member data
            const { data: memberData, error: memberError } = await supabase
                .from("members")
                .select(`
                    id,
                    full_name,
                    phone,
                    email,
                    created_at,
                    memberships (
                        status,
                        membership_plans (name)
                    )
                `)
                .eq("id", params.id)
                .single();

            if (memberError) {
                console.error("Error fetching member:", memberError);
                setLoading(false);
                return;
            }

            // Fetch credentials separately using member_id
            const { data: credentialsData, error: credError } = await supabase
                .from("member_credentials")
                .select("*")
                .eq("member_id", params.id)
                .single();

            if (credError && credError.code !== "PGRST116") {
                // PGRST116 means no rows found, which is ok
                console.error("Error fetching credentials:", credError);
            }

            const activeMembership = memberData.memberships?.find(m => m.status === "active") || memberData.memberships?.[0];

            setMember({
                id: memberData.id,
                name: memberData.full_name,
                phone: memberData.phone,
                email: memberData.email,
                memberSince: new Date(memberData.created_at).toLocaleDateString("en-IN"),
                currentPlan: activeMembership?.membership_plans?.name || "No Plan",
                status: activeMembership?.status || "inactive",
                credentials: credentialsData ? {
                    loginType: credentialsData.login_type,
                    loginValue: credentialsData.login_value,
                    password: credentialsData.password,
                    createdAt: credentialsData.created_at,
                    hasAppAccess: true,
                } : null
            });
            setHasAppAccess(!!credentialsData);
        } catch (err) {
            console.error("Error:", err);
        }
        setLoading(false);
    };

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopied(field);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleResetPassword = async () => {
        const newPassword = prompt("Enter new password for member:");
        if (!newPassword) return;

        try {
            const { error } = await supabase
                .from("member_credentials")
                .update({ password: newPassword })
                .eq("member_id", member.id);

            if (error) {
                alert("Failed to reset password");
            } else {
                alert("Password updated successfully!");
                fetchMemberCredentials();
            }
        } catch (err) {
            alert("An error occurred");
        }
    };

    const handleCreateCredentials = async () => {
        const loginValue = member.phone || member.email;
        const defaultPassword = `Gym@${Math.random().toString(36).slice(-6)}`;

        try {
            const { error } = await supabase
                .from("member_credentials")
                .insert({
                    member_id: member.id,
                    login_type: member.phone ? "phone" : "email",
                    login_value: loginValue,
                    password: defaultPassword
                });

            if (error) {
                console.error("Error creating credentials:", error);
                alert("Failed to create credentials");
            } else {
                alert(`Credentials created!\nLogin: ${loginValue}\nPassword: ${defaultPassword}`);
                fetchMemberCredentials();
            }
        } catch (err) {
            alert("An error occurred");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-page pb-24">
                <Header title="Member Credentials" />
                <main className="px-4 py-4">
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </main>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="min-h-screen bg-page pb-24">
                <Header title="Member Credentials" />
                <main className="px-4 py-4">
                    <div className="text-center py-12">
                        <span className="text-4xl">👤</span>
                        <p className="text-gray-500 mt-2">Member not found</p>
                    </div>
                </main>
            </div>
        );
    }

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

                {/* No Credentials - Create New */}
                {!member.credentials && (
                    <div className="bg-white rounded-xl p-6 shadow-sm text-center">
                        <span className="text-4xl">🔐</span>
                        <h3 className="font-semibold text-gray-900 mt-3">No App Credentials</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            This member doesn't have login credentials for the mobile app yet.
                        </p>
                        <button
                            onClick={handleCreateCredentials}
                            className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:shadow-lg transition"
                        >
                            ➕ Create Credentials
                        </button>
                    </div>
                )}

                {/* Login Credentials */}
                {member.credentials && (
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

                            {/* Share Credentials Button */}
                            <button
                                onClick={() => {
                                    const text = `Your Gym App Login:\nUsername: ${member.credentials.loginValue}\nPassword: ${member.credentials.password}`;
                                    copyToClipboard(text, "all");
                                }}
                                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:shadow-lg transition"
                            >
                                {copied === "all" ? "✓ Copied!" : "📤 Copy All Credentials"}
                            </button>

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
                )}

                {/* Actions */}
                {member.credentials && (
                    <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
                      

                    
                        
                    </div>
                )}

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
