"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import RenewMembershipModal from "@/components/shared/RenewMembershipModal";
import ShareReceiptModal from "@/components/shared/ShareReceiptModal";
import { MembersPageSkeleton } from "@/components/shared/Skeleton";
import { useUserRole } from "@/lib/hooks/useUserRole";
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  Clock,
  Search,
  Plus,
  Filter,
  User as UserIcon,
  Calendar,
  CreditCard,
  Key,
  Trash2,
  RefreshCw,
  ChevronRight,
  Building,
  Phone,
  Mail,
  MoreVertical,
  Share2,
  UserCheck
} from "lucide-react";

export default function MembersPage() {
  const router = useRouter();
  const { canViewFinance, isTrainer, user } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showMyMembers, setShowMyMembers] = useState(false);
  const [myMemberIds, setMyMemberIds] = useState(new Set());
  const [myMembersLoading, setMyMembersLoading] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showShareReceiptModal, setShowShareReceiptModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [membersWithCredentials, setMembersWithCredentials] = useState(new Set());
  const [rawMembers, setRawMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    dues: 0
  });

  // Get gym from localStorage
  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      setSelectedGym(JSON.parse(storedGym));
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch all members data via single RPC call
  const fetchMembers = async (gymId) => {
    if (!gymId) return;
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc('get_members_list', {
        p_gym_id: gymId,
        p_user_id: user?.id || null,
        p_is_trainer: isTrainer || false
      });

      if (error || !result) {
        console.error("Error fetching members:", error);
        setRawMembers([]);
        setLoading(false);
        return;
      }

      const memberData = result.members || [];
      const credentialIds = result.credentials || [];
      const trainerAssignments = result.trainer_assignments || [];
      const myMemberIdsList = result.my_member_ids || [];

      // Build trainer assignments map
      const trainerAssignmentsMap = {};
      trainerAssignments.forEach(a => {
        let trainerPlanDaysRemaining = null;
        if (a.plan_end_date) {
          const endDate = new Date(a.plan_end_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          trainerPlanDaysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        }
        trainerAssignmentsMap[a.member_id] = {
          trainerName: `${a.first_name || ""} ${a.last_name || ""}`.trim(),
          planEndDate: a.plan_end_date,
          trainerPlanDaysRemaining
        };
      });

      // Enrich members with creator info and trainer assignments
      const finalMembers = memberData.map(member => {
        const trainerName = member.created_by_name ||
          (member.creator_profile_name && member.creator_profile_name.trim() ? member.creator_profile_name : null);
        return {
          ...member,
          createdByTrainerName: trainerName && trainerName.trim() ? trainerName : null,
          trainerAssignment: trainerAssignmentsMap[member.id] || null
        };
      });

      setRawMembers(finalMembers);

      // Set credentials
      setMembersWithCredentials(new Set(credentialIds));

      // Set my member IDs (for trainer role)
      if (isTrainer) {
        setMyMemberIds(new Set(myMemberIdsList));
      }

    } catch (err) {
      console.error("Error:", err);
      setRawMembers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedGym?.id) {
      fetchMembers(selectedGym.id);
    }
  }, [selectedGym?.id]);

  // Transform members data with memoization
  const members = useMemo(() => {
    if (!rawMembers?.length) return [];

    return rawMembers.map((member) => {
      const activeMembership = member.memberships?.find(
        (m) => m.status === "active"
      ) || member.memberships?.[0];

      let memberStatus = "inactive";
      if (activeMembership) {
        const endDate = new Date(activeMembership.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        if (endDate >= today && activeMembership.status === "active") {
          memberStatus = "active";
        } else if (endDate < today || activeMembership.status === "expired") {
          memberStatus = "expired";
        }
      }

      // Calculate days remaining
      let daysRemaining = null;
      if (activeMembership?.end_date) {
        const endDate = new Date(activeMembership.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
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
        daysRemaining: daysRemaining,
        createdByTrainerName: member.createdByTrainerName || null,
        trainerAssignment: member.trainerAssignment || null,
      };
    });
  }, [rawMembers, membersWithCredentials]);

  // Calculate stats whenever members change
  useEffect(() => {
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

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter =
      filterStatus === "all" || member.status === filterStatus;
    const matchesMyMembers =
      !showMyMembers || myMemberIds.has(member.id);
    return matchesSearch && matchesFilter && matchesMyMembers;
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case "active":
        return {
          color: "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200",
          text: "text-emerald-700",
          dot: "bg-emerald-500",
          label: "Active",
          icon: <CheckCircle className="w-3.5 h-3.5" />
        };
      case "expired":
        return {
          color: "bg-gradient-to-br from-red-50 to-red-100 border-red-200",
          text: "text-red-700",
          dot: "bg-red-500",
          label: "Expired",
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case "inactive":
        return {
          color: "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200",
          text: "text-gray-700",
          dot: "bg-gray-500",
          label: "Inactive",
          icon: <AlertTriangle className="w-3.5 h-3.5" />
        };
      default:
        return {
          color: "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200",
          text: "text-gray-700",
          dot: "bg-gray-500",
          label: "Inactive",
          icon: <AlertTriangle className="w-3.5 h-3.5" />
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
    // Refresh members data
    if (selectedGym?.id) {
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

      // Refresh members data after deletion
      if (selectedGym?.id) {
        fetchMembers(selectedGym.id);
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member. Please try again.");
    }
  };

  if (loading) {
    return <MembersPageSkeleton />;
  }

  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
        <Header title="Members" showBack={false} />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Building className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No Gym Selected</h2>
            <p className="text-gray-500 text-sm mb-6 px-4">
              Please select a gym to view and manage members
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              style={{ minHeight: '44px' }}
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
      <Header title="Members" showBack={false} />

      <main className="px-3 py-3 space-y-4">
        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 gap-2 px-1">
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.total}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Active</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">{stats.active}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Dues</p>
                <p className="text-xl font-bold text-amber-600 mt-0.5">{stats.dues}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Expired</p>
                <p className="text-xl font-bold text-red-600 mt-0.5">{stats.expired}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-red-50 to-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Add Member */}
        <div className="bg-white rounded-xl p-3 mx-1 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Add Member Button */}
          <button
            onClick={() => router.push("/members/add")}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Plus className="w-5 h-5" />
            Add New Member
          </button>
        </div>

        {/* My Members Toggle for Trainers */}
        {isTrainer && (
          <div className="bg-white rounded-xl p-3 mx-1">
            <button
              onClick={() => setShowMyMembers(!showMyMembers)}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                showMyMembers
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={{ minHeight: '40px' }}
            >
              <UserCheck className="w-4 h-4" />
              {showMyMembers ? "Showing My Members" : "My Members"}
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                showMyMembers ? "bg-white/20" : "bg-white text-gray-600"
              }`}>
                {myMembersLoading ? "..." : myMemberIds.size}
              </span>
            </button>
          </div>
        )}

        {/* Filter Tabs - Horizontal Scroll on Mobile */}
        <div className="bg-white rounded-xl p-3 mx-1">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Filter by Status</span>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {[
              { id: "all", label: "All", count: stats.total },
              { id: "active", label: "Active", count: stats.active },
              { id: "expired", label: "Expired", count: stats.expired },
              { id: "inactive", label: "Inactive", count: stats.total - stats.active - stats.expired }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterStatus(filter.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                  filterStatus === filter.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{ minHeight: '36px' }}
              >
                {filter.label}
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  filterStatus === filter.id 
                    ? "bg-white/20" 
                    : "bg-white text-gray-600"
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
                className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md active:scale-95 transition-all duration-200 cursor-pointer mx-1"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base truncate">
                          {member.name}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-500 text-xs truncate">{member.phone}</span>
                          </div>
                          {member.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-500 text-xs truncate hidden sm:block">
                                {member.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className={`px-2.5 py-1.5 rounded-lg border ${statusConfig.color} ${statusConfig.text} flex items-center gap-1.5`}>
                          <div className={statusConfig.text}>
                            {statusConfig.icon}
                          </div>
                          <span className="text-xs font-medium">{statusConfig.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    {/* Plan and Status Info */}
                    <div className="mt-3 space-y-2">
                      {/* Show if created by trainer */}
                      {member.createdByTrainerName && (
                        <div className="flex items-center gap-2 bg-purple-50 rounded-lg px-2 py-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                          <span className="text-xs text-purple-700">
                            Created by Trainer ({member.createdByTrainerName})
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Plan</p>
                            <p className="text-sm font-medium text-gray-900">{member.plan}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Valid Till</p>
                          <p className="text-sm font-medium text-gray-900">{member.validTill}</p>
                        </div>
                      </div>

                      {/* Show days remaining for active memberships */}
                      {member.daysRemaining !== null && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className={`text-xs ${getDaysRemainingColor(member.daysRemaining)}`}>
                            {member.daysRemaining > 0 
                              ? `${member.daysRemaining} days remaining`
                              : 'Membership expired'}
                          </span>
                        </div>
                      )}

                      {/* Show trainer plan expiry */}
                      {member.trainerAssignment && member.trainerAssignment.trainerPlanDaysRemaining !== null && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-400" />
                          <span className={`text-xs ${
                            member.trainerAssignment.trainerPlanDaysRemaining <= 0 
                              ? 'text-red-600 font-semibold' 
                              : member.trainerAssignment.trainerPlanDaysRemaining <= 7 
                                ? 'text-amber-600 font-semibold' 
                                : 'text-purple-600'
                          }`}>
                            {member.trainerAssignment.trainerPlanDaysRemaining > 0 
                              ? `Trainer plan: ${member.trainerAssignment.trainerPlanDaysRemaining} days remaining`
                              : 'Trainer plan expired'}
                          </span>
                        </div>
                      )}

                      {member.dueAmount > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Pending Payment</p>
                            <p className="text-sm font-semibold text-amber-600">
                              {canViewFinance ? `₹${member.dueAmount}` : '*****'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Horizontal Scroll on Mobile */}
                    <div className="flex space-x-2 overflow-x-auto mt-3 pt-3 border-t border-gray-100 pb-1 -mx-1 px-1 no-scrollbar">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/members/${member.id}/credentials`);
                        }}
                        className="flex-shrink-0 px-3 py-2 bg-blue-50 text-blue-700 cursor-pointer text-xs font-medium rounded-lg active:bg-blue-100 transition-all flex items-center gap-2"
                        style={{ minHeight: '36px' }}
                      >
                        <Key className="w-3.5 h-3.5" />
                        {member.hasCredentials ? 'Credentials' : 'Setup Login'}
                      </button>
                      
                      {/* Share Receipt Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMember(member);
                          setShowShareReceiptModal(true);
                        }}
                        className="flex-shrink-0 px-3 py-2 bg-green-50 text-green-700 cursor-pointer text-xs font-medium rounded-lg active:bg-green-100 transition-all flex items-center gap-2"
                        style={{ minHeight: '36px' }}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share Receipt
                      </button>
                      
                      {member.status === "expired" && (
                        <button
                          onClick={(e) => handleRenewClick(e, member)}
                          className="flex-shrink-0 px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-medium rounded-lg active:scale-95 transition-all flex items-center gap-2"
                          style={{ minHeight: '36px' }}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Renew
                        </button>
                      )}
                      
                      {!isTrainer && (
                        <button
                          onClick={(e) => handleDeleteMember(e, member)}
                          className="flex-shrink-0 px-3 py-2 bg-red-50 cursor-pointer text-red-700 text-xs font-medium rounded-lg active:bg-red-100 transition-all flex items-center gap-2"
                          style={{ minHeight: '36px' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredMembers.length === 0 && (
          <div className="text-center py-8 px-4">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {searchQuery || filterStatus !== "all" 
                ? "No members found" 
                : "No members yet"}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || filterStatus !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "Add your first member to get started"}
            </p>
            {(searchQuery || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
                className="px-4 py-2 text-blue-600 text-sm font-medium hover:text-blue-700 active:scale-95 transition-transform"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </main>

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

      {/* Share Receipt Modal */}
      {showShareReceiptModal && selectedMember && (
        <ShareReceiptModal
          member={selectedMember}
          gymData={selectedGym}
          onClose={() => {
            setShowShareReceiptModal(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
}