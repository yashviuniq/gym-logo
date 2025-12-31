"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";
import RenewMembershipModal from "@/components/shared/RenewMembershipModal";

export default function MembersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    dues: 0
  });

  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      fetchMembers(gym.id);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Calculate stats whenever members change
    const activeCount = members.filter(m => m.status === "active").length;
    const expiredCount = members.filter(m => m.status === "expired").length;
    const duesCount = members.filter(m => m.dueAmount > 0).length;
    
    setStats({
      total: members.length,
      active: activeCount,
      expired: expiredCount,
      dues: duesCount
    });
  }, [members]);

  const fetchMembers = async (gymId) => {
    setLoading(true);
    try {
      const { data: membersData, error } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          email,
          balance,
          gym_id,
          created_at,
          memberships (
            id,
            plan_id,
            start_date,
            end_date,
            status,
            membership_plans (
              name,
              price,
              duration_days
            )
          )
        `)
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const memberIds = membersData?.map(m => m.id) || [];
      const { data: credentialsData } = await supabase
        .from("member_credentials")
        .select("member_id")
        .in("member_id", memberIds);

      const membersWithCredentials = new Set(credentialsData?.map(c => c.member_id) || []);

      const transformedMembers = membersData?.map((member) => {
        const activeMembership = member.memberships?.find(
          (m) => m.status === "active"
        ) || member.memberships?.[0];

        let memberStatus = "inactive";
        if (activeMembership) {
          const endDate = new Date(activeMembership.end_date);
          const today = new Date();
          if (endDate > today && activeMembership.status === "active") {
            memberStatus = "active";
          } else if (endDate <= today) {
            memberStatus = "expired";
          }
        }

        return {
          id: member.id,
          gymId: member.gym_id,
          name: member.full_name,
          phone: member.phone,
          email: member.email,
          plan: activeMembership?.membership_plans?.name || "No Plan",
          status: memberStatus,
          validTill: activeMembership?.end_date
            ? new Date(activeMembership.end_date).toLocaleDateString("en-IN")
            : "N/A",
          dueAmount: Math.max(0, member.balance || 0),
          balance: member.balance || 0,
          hasCredentials: membersWithCredentials.has(member.id),
          daysRemaining: activeMembership?.end_date 
            ? Math.ceil((new Date(activeMembership.end_date) - new Date()) / (1000 * 60 * 60 * 24))
            : null,
        };
      }) || [];

      setMembers(transformedMembers);
    } catch (err) {
      console.error("Error:", err);
      setMembers([]);
    }
    setLoading(false);
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter =
      filterStatus === "all" || member.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case "active":
        return {
          color: "bg-emerald-50 border-emerald-200",
          text: "text-emerald-700",
          dot: "bg-emerald-500",
          label: "Active"
        };
      case "expired":
        return {
          color: "bg-red-50 border-red-200",
          text: "text-red-700",
          dot: "bg-red-500",
          label: "Expired"
        };
      case "inactive":
        return {
          color: "bg-gray-50 border-gray-200",
          text: "text-gray-700",
          dot: "bg-gray-500",
          label: "Inactive"
        };
      default:
        return {
          color: "bg-gray-50 border-gray-200",
          text: "text-gray-700",
          dot: "bg-gray-500",
          label: "Inactive"
        };
    }
  };

  const getDaysRemainingColor = (days) => {
    if (days === null) return "text-gray-500";
    if (days <= 0) return "text-red-600 font-semibold";
    if (days <= 7) return "text-amber-600 font-semibold";
    return "text-gray-600";
  };

  const handleRenewClick = (e, member) => {
    e.stopPropagation();
    setSelectedMember(member);
    setShowRenewModal(true);
  };

  const handleRenewal = (renewalData) => {
    setShowRenewModal(false);
    setSelectedMember(null);
    if (selectedGym) {
      fetchMembers(selectedGym.id);
    }
  };

  const handleDeleteMember = async (e, member) => {
    e.stopPropagation();
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${member.name}? This action cannot be undone. All associated data including memberships, payments, and attendance records will be permanently deleted.`
    );
    
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;

      if (selectedGym) {
        fetchMembers(selectedGym.id);
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header title="Members" showBack={false} />
        <div className="p-6">
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-orange-200 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-t-orange-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="mt-4 text-gray-600 font-medium">Loading members...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header title="Members" showBack={false} />
        <div className="p-6">
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-50 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-3xl">🏢</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Gym Selected</h3>
            <p className="text-gray-500 text-center mb-6 max-w-sm">
              Please select a gym to view and manage members
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header title="Members" showBack={false} />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Members</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-blue-600">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Active</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl flex items-center justify-center">
                <span className="text-emerald-600">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Pending Dues</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{stats.dues}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl flex items-center justify-center">
                <span className="text-amber-600">💰</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">Expired</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{stats.expired}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-red-50 to-red-100 rounded-xl flex items-center justify-center">
                <span className="text-red-600">⏰</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all placeholder:text-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => router.push("/members/add")}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-xl hover:shadow-lg transition-all duration-300 flex items-center gap-2 whitespace-nowrap"
            >
              <span>+</span>
              Add Member
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: "all", label: "All", count: stats.total },
              { id: "active", label: "Active", count: stats.active },
              { id: "expired", label: "Expired", count: stats.expired },
              { id: "inactive", label: "Inactive", count: stats.total - stats.active - stats.expired }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterStatus(filter.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  filterStatus === filter.id
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
                }`}
              >
                {filter.label}
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  filterStatus === filter.id 
                    ? "bg-white/20" 
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-3 pb-20">
          {filteredMembers.map((member) => {
            const statusConfig = getStatusConfig(member.status);
            
             
            return (
              <div
                key={member.id}
                onClick={() => router.push(`/members/${member.id}`)}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-orange-200 group"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg truncate">
                          {member.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-gray-500 text-sm">{member.phone}</span>
                          {member.email && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-gray-500 text-sm truncate">{member.email}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full border ${statusConfig.color} ${statusConfig.text} flex items-center gap-1.5`}>
                          <div className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></div>
                          {statusConfig.label}
                        </div>
                      </div>
                    </div>

                    {/* Plan and Due Info */}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">📋</span>
                        <span className="text-sm font-medium text-gray-700">{member.plan}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">📅</span>
                        <span className="text-sm text-gray-600">
                          Valid till <span className="font-medium">{member.validTill}</span>
                        </span>
                        {member.daysRemaining !== null && (
                          <span className={`text-xs ${getDaysRemainingColor(member.daysRemaining)}`}>
                            ({member.daysRemaining > 0 ? `${member.daysRemaining} days left` : 'Expired'})
                          </span>
                        )}
                      </div>

                      {member.dueAmount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-500">💰</span>
                          <span className="text-sm font-semibold text-amber-600">
                            ₹{member.dueAmount} due
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/members/${member.id}/credentials`);
                          }}
                          className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-all flex items-center gap-2"
                        >
                          {member.hasCredentials ? (
                            <>
                              <span>🔐</span>
                              View Credentials
                            </>
                          ) : (
                            <>
                              <span>🔑</span>
                              Create Credentials
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={(e) => handleDeleteMember(e, member)}
                          className="px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-all flex items-center gap-2"
                        >
                          <span>🗑️</span>
                          Delete
                        </button>
                      </div>
                      
                      {member.status === "expired" && (
                        <button
                          onClick={(e) => handleRenewClick(e, member)}
                          className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:shadow-md transition-all flex items-center gap-2"
                        >
                          <span>🔄</span>
                          Renew Plan
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">👤</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No members found</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              {searchQuery || filterStatus !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Get started by adding your first member"}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("all");
              }}
              className="px-6 py-2 text-orange-600 font-medium hover:text-orange-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Renew Membership Modal */}
      {showRenewModal && selectedMember && (
        <RenewMembershipModal
          member={selectedMember}
          gymId={selectedGym?.id}
          onClose={() => {
            setShowRenewModal(false);
            setSelectedMember(null);
          }}
          onRenew={handleRenewal}
        />
      )}
    </div>
  );
}