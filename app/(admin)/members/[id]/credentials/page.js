"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import { useToast } from "@/contexts/ToastContext";

export default function MemberCredentialsPage() {
    const router = useRouter();
    const params = useParams();
    const { showSuccess, showError } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasAppAccess, setHasAppAccess] = useState(false);
    const [activeTab, setActiveTab] = useState("credentials");

    useEffect(() => {
        fetchMemberCredentials();
    }, [params.id]);

    const fetchMemberCredentials = async () => {
        setLoading(true);
        try {
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

            const { data: credentialsData, error: credError } = await supabase
                .from("member_credentials")
                .select("*")
                .eq("member_id", params.id)
                .single();

            if (credError && credError.code !== "PGRST116") {
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
        if (!member.phone) {
            showError("Phone number is required to create credentials");
            return;
        }

        const defaultPassword = `Gym@${Math.random().toString(36).slice(-6)}`;

        try {
            const { error } = await supabase
                .from("member_credentials")
                .insert({
                    member_id: member.id,
                    login_type: "phone",
                    login_value: member.phone,
                    password: defaultPassword
                });

            if (error) {
                console.error("Error creating credentials:", error);
                showError("Failed to create credentials");
            } else {
                showSuccess(`Credentials created! Login: ${member.phone} | Password: ${defaultPassword}`);
                fetchMemberCredentials();
            }
        } catch (err) {
            showError("An error occurred");
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            active: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Active" },
            expired: { bg: "bg-red-100", text: "text-red-700", label: "Expired" },
            inactive: { bg: "bg-gray-100", text: "text-gray-700", label: "Inactive" }
        };
        const statusConfig = statusMap[status] || statusMap.inactive;
        
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                {statusConfig.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
                <Header title="Member Credentials" />
                <div className="flex flex-col items-center justify-center h-[60vh]">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-orange-200 rounded-full"></div>
                        <div className="w-16 h-16 border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <p className="mt-4 text-gray-600 font-medium">Loading credentials...</p>
                </div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
                <Header title="Member Credentials" />
                <div className="flex flex-col items-center justify-center h-[60vh] p-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mb-6">
                        <span className="text-3xl">👤</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Member Not Found</h3>
                    <p className="text-gray-500 text-center mb-6 max-w-sm">
                        The member you're looking for doesn't exist or has been removed.
                    </p>
                    <button
                        onClick={() => router.push("/members")}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                        Back to Members
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <Header title="Member Credentials" />

            <div className="p-4 sm:p-6 max-w-2xl mx-auto">
                {/* Member Profile Header */}
                <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl font-bold border-2 border-white/30">
                            {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-1">{member.name}</h2>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <span className="text-white/80">📱</span>
                                    <p className="text-white/90">{member.phone}</p>
                                </div>
                                <span className="text-white/30">•</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-white/80">🎯</span>
                                    <p className="text-white/90">Member since {member.memberSince}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
                        <div>
                            <p className="text-white/80 text-xs font-medium mb-1">Current Plan</p>
                            <p className="font-semibold text-lg">{member.currentPlan}</p>
                        </div>
                        <div>
                            <p className="text-white/80 text-xs font-medium mb-1">Status</p>
                            <div className="transform scale-90 origin-left">
                                {getStatusBadge(member.status)}
                            </div>
                        </div>
                        <div>
                            <p className="text-white/80 text-xs font-medium mb-1">App Access</p>
                            <p className={`font-semibold ${member.credentials ? 'text-emerald-200' : 'text-red-200'}`}>
                                {member.credentials ? 'Enabled' : 'Disabled'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl border border-gray-200">
                    <button
                        onClick={() => setActiveTab("credentials")}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === "credentials" 
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm" 
                            : "text-gray-600 hover:text-gray-900"}`}
                    >
                        🔐 Credentials
                    </button>
                    <button
                        onClick={() => setActiveTab("actions")}
                        className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === "actions" 
                            ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm" 
                            : "text-gray-600 hover:text-gray-900"}`}
                    >
                        ⚙️ Actions
                    </button>
                </div>

                {/* Credentials Tab */}
                {activeTab === "credentials" && (
                    <div className="space-y-6">
                        {/* No Credentials State */}
                        {!member.credentials && (
                            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl">🔐</span>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">No App Credentials</h3>
                                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                                    This member doesn't have login credentials for the mobile app yet. Create credentials to enable app access.
                                </p>
                                <button
                                    onClick={handleCreateCredentials}
                                    className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300 flex items-center gap-2 mx-auto"
                                >
                                    <span className="text-lg">+</span>
                                    Create Credentials
                                </button>
                            </div>
                        )}

                        {/* Credentials Card */}
                        {member.credentials && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                                                    <span className="text-blue-600 text-lg">🔐</span>
                                                </div>
                                                Mobile App Credentials
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Share these credentials securely with the member
                                            </p>
                                        </div>
                                        <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                                            Active
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Login Method */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-sm font-medium text-gray-700">Login Method</label>
                                            <span className="text-xs text-gray-400">Uses phone number for login</span>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
                                                    <span className="text-blue-600">📱</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{member.credentials.loginValue}</p>
                                                    <p className="text-xs text-gray-500">Phone Number</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Password Field */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-sm font-medium text-gray-700">Password</label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                                >
                                                    {showPassword ? (
                                                        <>
                                                            <span>🙈</span> Hide
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>👁️</span> Show
                                                        </>
                                                    )}
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button
                                                    onClick={() => copyToClipboard(member.credentials.password, "password")}
                                                    className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                                >
                                                    {copied === "password" ? (
                                                        <>
                                                            <span>✓</span> Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>📋</span> Copy
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <p className={`font-mono ${showPassword ? 'text-gray-900' : 'text-gray-400'}`}>
                                                    {showPassword ? member.credentials.password : '•••••••••••••••'}
                                                </p>
                                                <span className="text-gray-400">🔑</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Share All Button */}
                                    <button
                                        onClick={() => {
                                            const text = `Your Gym App Login Credentials:\n\n📱 Phone: ${member.credentials.loginValue}\n🔑 Password: ${member.credentials.password}\n\nDownload the app from the Play Store/App Store.`;
                                            copyToClipboard(text, "all");
                                        }}
                                        className={`w-full py-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${copied === "all" 
                                            ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" 
                                            : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:shadow-lg"}`}
                                    >
                                        {copied === "all" ? (
                                            <>
                                                <span className="text-lg">✓</span>
                                                Credentials Copied!
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-lg">📤</span>
                                                Copy All Credentials
                                            </>
                                        )}
                                    </button>

                                    {/* Account Info */}
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium">Account Created</p>
                                                <p className="text-sm font-medium text-gray-900 mt-1">
                                                    {new Date(member.credentials.createdAt).toLocaleString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </p>
                                            </div>
                                            <div className="text-gray-400">🕒</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions Tab */}
                {activeTab === "actions" && (
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="font-semibold text-gray-900 text-lg mb-4">Quick Actions</h3>
                            <div className="space-y-3">
                                {member.credentials ? (
                                    <>
                                        <button
                                            onClick={handleResetPassword}
                                            className="w-full p-4 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl text-amber-700 font-medium hover:shadow-sm transition-all duration-300 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-amber-600">🔄</span>
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium">Reset Password</p>
                                                    <p className="text-xs text-amber-600">Generate a new password</p>
                                                </div>
                                            </div>
                                            <span className="text-amber-400">→</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                const text = `Your Gym App Login Credentials:\n\n📱 Phone: ${member.credentials.loginValue}\n🔑 Password: ${member.credentials.password}`;
                                                navigator.clipboard.writeText(text);
                                                showSuccess("Credentials copied to clipboard!");
                                            }}
                                            className="w-full p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl text-blue-700 font-medium hover:shadow-sm transition-all duration-300 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <span className="text-blue-600">📱</span>
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium">Send via SMS</p>
                                                    <p className="text-xs text-blue-600">Share credentials via text</p>
                                                </div>
                                            </div>
                                            <span className="text-blue-400">→</span>
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleCreateCredentials}
                                        className="w-full p-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3"
                                    >
                                        <span className="text-lg">+</span>
                                        Create App Credentials
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Security Warning */}
                        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <span className="text-red-600 text-xl">⚠️</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-red-900 mb-2">Security Guidelines</h4>
                                    <ul className="space-y-2 text-sm text-red-700">
                                        <li className="flex items-start gap-2">
                                            <span className="text-red-400 mt-0.5">•</span>
                                            Share credentials only through secure channels
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-red-400 mt-0.5">•</span>
                                            Never share via public platforms or screenshots
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-red-400 mt-0.5">•</span>
                                            Ask member to change password on first login
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-red-400 mt-0.5">•</span>
                                            Report any suspicious activity immediately
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation */}
                <div className="mt-8 flex gap-3">
                    <button
                        onClick={() => router.push(`/members/${member.id}`)}
                        className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:border-gray-300 transition-all duration-300 flex items-center justify-center gap-2"
                    >
                        <span>👤</span>
                        View Profile
                    </button>
                    <button
                        onClick={() => router.push("/members")}
                        className="flex-1 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
                    >
                        <span>←</span>
                        Back to Members
                    </button>
                </div>
            </div>
        </div>
    );
}