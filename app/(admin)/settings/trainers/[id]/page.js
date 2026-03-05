"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Users,
  Dumbbell,
  Apple,
  Edit2,
  UserPlus,
  UserMinus,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  MoreVertical,
  Activity,
  Key,
  Eye,
  EyeOff,
  Copy,
  Wallet,
  UserCheck,
  CalendarDays,
  IndianRupee,
  Plus,
  X,
  Trash2,
  XCircle,
  Award,
  Tag,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/constants/trainerSchedule";

export default function TrainerDetailsPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  const [trainer, setTrainer] = useState(null);
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "members");
  const [unassignMember, setUnassignMember] = useState(null);
  const [unassigning, setUnassigning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(null);
  const [trainerPlans, setTrainerPlans] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [plansLoading, setPlansLoading] = useState(false);
  const [trainerEarnings, setTrainerEarnings] = useState([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsSummary, setEarningsSummary] = useState({ total: 0, thisMonth: 0, lastMonth: 0 });
  const [trainerSlotAssignments, setTrainerSlotAssignments] = useState({});
  const [selectedScheduleSlot, setSelectedScheduleSlot] = useState(null);

  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      setSelectedGym(JSON.parse(storedGym));
    }
  }, []);

  useEffect(() => {
    if (id && selectedGym?.id) {
      fetchTrainerDetails();
    }
  }, [id, selectedGym?.id]);

  const fetchTrainerDetails = async () => {
    if (!selectedGym?.id || !id) return;
    setLoading(true);

    try {
      // Single RPC call replaces 8+ separate queries
      const response = await fetch("/api/trainers/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_trainer_id: id, p_gym_id: selectedGym.id }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error("Error fetching trainer details:", result.error);
        return;
      }

      const { trainer: trainerData, assigned_members, activity_log, trainer_plans, trainer_earnings, earnings_summary } = result.data;

      if (!trainerData) return;

      // Map trainer
      setTrainer({
        id: trainerData.id,
        profileId: trainerData.profile_id,
        name: `${trainerData.first_name || ""} ${trainerData.last_name || ""}`.trim(),
        firstName: trainerData.first_name,
        lastName: trainerData.last_name,
        email: trainerData.email,
        phone: trainerData.phone,
        password: trainerData.password,
        specialization: trainerData.specialization,
        bio: trainerData.bio,
        isActive: trainerData.is_active,
        hireDate: trainerData.hire_date,
        createdAt: trainerData.created_at,
        trainerCost: trainerData.trainer_cost,
        availableDays: trainerData.available_days || [],
        availableTimeSlots: trainerData.available_time_slots || {}
      });

      // Fetch active bookings to show shared-session counts and member names by slot.
      const { data: slotBookingsData, error: slotBookingsError } = await supabase
        .from("trainer_bookings")
        .select("day, time_slot, member_id, members:member_id(full_name)")
        .eq("trainer_id", trainerData.profile_id)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      if (slotBookingsError) {
        console.error("Error fetching trainer slot assignments:", slotBookingsError);
        setTrainerSlotAssignments({});
      } else {
        const groupedByDayAndSlot = {};
        (slotBookingsData || []).forEach((booking) => {
          if (!groupedByDayAndSlot[booking.day]) groupedByDayAndSlot[booking.day] = {};
          if (!groupedByDayAndSlot[booking.day][booking.time_slot]) {
            groupedByDayAndSlot[booking.day][booking.time_slot] = [];
          }

          const alreadyAdded = groupedByDayAndSlot[booking.day][booking.time_slot].some(
            (m) => m.memberId === booking.member_id
          );
          if (!alreadyAdded) {
            groupedByDayAndSlot[booking.day][booking.time_slot].push({
              memberId: booking.member_id,
              name: booking.members?.full_name || "Member",
            });
          }
        });
        setTrainerSlotAssignments(groupedByDayAndSlot);
      }
      setSelectedScheduleSlot(null);

      // Map assigned members
      const members = (assigned_members || []).map(a => {
        const planEndDate = a.plan_end_date ? new Date(a.plan_end_date) : null;
        const now = new Date();
        const daysRemaining = planEndDate ? Math.ceil((planEndDate - now) / (1000 * 60 * 60 * 24)) : null;
        const paidAmount = a.paid_amount ? parseFloat(a.paid_amount) : null;

        return {
          assignmentId: a.assignment_id,
          memberId: a.member_id,
          name: a.member_name,
          phone: a.member_phone,
          profileImage: a.member_profile_image,
          assignedAt: a.assigned_at,
          notes: a.notes,
          status: a.membership_status || "inactive",
          membershipEnd: a.membership_end_date,
          planName: a.plan_name || null,
          planPrice: a.plan_price ? parseFloat(a.plan_price) : null,
          paidAmount,
          planEndDate: a.plan_end_date,
          daysRemaining,
        };
      });
      setAssignedMembers(members);

      // Map activity log (already sorted by RPC)
      const activity = (activity_log || []).map(a => ({
        id: a.id,
        type: a.type,
        action: a.action,
        memberName: a.member_name,
        details: a.details,
        date: a.date
      }));
      setActivityLog(activity.slice(0, 20));

      // Map trainer plans
      setTrainerPlans(
        (trainer_plans || []).map(p => ({
          ...p,
          price: parseFloat(p.price),
          subscribers: p.subscribers || 0,
        }))
      );

      // Map trainer earnings
      const earnings = (trainer_earnings || []).map(e => ({
        ...e,
        total_amount: parseFloat(e.total_amount),
        trainer_amount: parseFloat(e.trainer_amount),
        gym_amount: parseFloat(e.gym_amount),
        members: { full_name: e.member_name, phone: e.member_phone },
        trainer_plans: { name: e.plan_name, duration_days: e.plan_duration_days },
      }));
      setTrainerEarnings(earnings);

      // Set earnings summary
      setEarningsSummary({
        total: parseFloat(earnings_summary?.total || 0),
        thisMonth: parseFloat(earnings_summary?.this_month || 0),
        lastMonth: parseFloat(earnings_summary?.last_month || 0),
      });
    } catch (err) {
      console.error("Error fetching trainer details:", err);
    } finally {
      setLoading(false);
    }
  };

  // fetchTrainerPlans and fetchTrainerEarnings are now included in the single RPC call above

  const togglePlanStatus = async (planId) => {
    const plan = trainerPlans.find((p) => p.id === planId);
    if (!plan) return;
    try {
      const { error } = await supabase
        .from("trainer_plans")
        .update({ is_active: !plan.is_active, updated_at: new Date().toISOString() })
        .eq("id", planId);
      if (error) throw error;
      setTrainerPlans((prev) =>
        prev.map((p) => (p.id === planId ? { ...p, is_active: !p.is_active } : p))
      );
    } catch (err) {
      console.error("Error toggling plan:", err);
      alert("Failed to update plan status");
    }
  };

  const deletePlan = async (planId) => {
    const plan = trainerPlans.find((p) => p.id === planId);
    if (!plan) return;
    if (plan.subscribers > 0) {
      alert("Cannot delete a plan with active subscribers");
      return;
    }
    if (!confirm(`Delete "${plan.name}"?`)) return;
    try {
      const { error } = await supabase.from("trainer_plans").delete().eq("id", planId);
      if (error) throw error;
      setTrainerPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err) {
      console.error("Error deleting plan:", err);
      alert("Failed to delete plan");
    }
  };

  const formatDuration = (days) => {
    if (days === 1) return "1 Day";
    if (days === 7) return "1 Week";
    if (days < 30) return `${days} Days`;
    const months = Math.round(days / 30);
    if (months === 1) return "1 Month";
    if (months === 3) return "3 Months";
    if (months === 6) return "6 Months";
    if (months === 12) return "1 Year";
    return `${months} Months`;
  };

  const handleUnassignMember = async () => {
    if (!unassignMember) return;
    setUnassigning(true);

    try {
      const { error } = await supabase
        .from("trainer_member_assignments")
        .update({ is_active: false })
        .eq("id", unassignMember.assignmentId);

      if (error) throw error;

      setAssignedMembers(prev => 
        prev.filter(m => m.assignmentId !== unassignMember.assignmentId)
      );
      setUnassignMember(null);
    } catch (err) {
      console.error("Error unassigning member:", err);
      alert("Failed to unassign member");
    } finally {
      setUnassigning(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return formatDate(dateStr);
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Trainer Details" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Trainer Details" />
        <div className="px-4 py-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Trainer Not Found</h2>
          <p className="text-gray-500 mb-4">This trainer doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push("/settings/trainers")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Trainers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Trainer Details" />

      <main className="px-4 py-4 space-y-4">
        {/* Trainer Profile Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl ${
              trainer.isActive 
                ? "bg-gradient-to-br from-blue-500 to-indigo-600" 
                : "bg-gray-400"
            }`}>
              {trainer.name.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{trainer.name}</h2>
                {trainer.isActive ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              
              {trainer.specialization && (
                <p className="text-blue-600 font-medium mb-2">{trainer.specialization}</p>
              )}

              <div className="space-y-1 text-sm text-gray-500">
                {trainer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{trainer.email}</span>
                  </div>
                )}
                {trainer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{trainer.phone}</span>
                  </div>
                )}
                {trainer.hireDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {formatDate(trainer.hireDate)}</span>
                  </div>
                )}
                {trainer.trainerCost && (
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" />
                    <span>Salary: <span className="font-semibold text-gray-800">₹{trainer.trainerCost.toLocaleString("en-IN")}</span>/hr</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {trainer.bio && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-gray-600 text-sm">{trainer.bio}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => router.push(`/settings/trainers/${id}/edit`)}
              className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
            <button
              onClick={() => router.push(`/settings/trainers/${id}/assign`)}
              className="flex-1 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Assign Members
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{assignedMembers.length}</p>
            <p className="text-[10px] text-gray-500">Members</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <Apple className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">
              {activityLog.filter(a => a.type === "diet").length}
            </p>
            <p className="text-[10px] text-gray-500">Diets</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <Dumbbell className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">
              {activityLog.filter(a => a.type === "workout").length}
            </p>
            <p className="text-[10px] text-gray-500">Workouts</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <IndianRupee className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">
              {earningsSummary.total > 0 ? `₹${(earningsSummary.total / 1000).toFixed(earningsSummary.total >= 1000 ? 1 : 0)}k` : "₹0"}
            </p>
            <p className="text-[10px] text-gray-500">Earnings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm overflow-x-auto no-scrollbar">
          {["members", "plans", "earnings", "availability", "credentials", "activity"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap px-1.5 ${
                activeTab === tab
                  ? tab === "earnings" ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab === "members" ? "Members" : tab === "plans" ? "Plans" : tab === "earnings" ? "Earnings" : tab === "availability" ? "Schedule" : tab === "credentials" ? "Creds" : "Activity"}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "members" && (
          <div className="space-y-3">
            {assignedMembers.length === 0 ? (
              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">No Members Assigned</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Assign members to this trainer to get started
                </p>
                <button
                  onClick={() => router.push(`/settings/trainers/${id}/assign`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign Members
                </button>
              </div>
            ) : (
              assignedMembers.map((member) => (
                <div key={member.assignmentId} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {member.profileImage ? (
                        <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{member.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />
                        <span>{member.phone}</span>
                        <span className={`px-1.5 py-0.5 rounded-full ${
                          member.status === "active" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {member.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/members/${member.memberId}`)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="View Member"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                      <button
                        onClick={() => setUnassignMember(member)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                        title="Unassign"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Plan info: price and days remaining */}
                  {member.planName && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1 text-xs">
                        <Tag className="w-3 h-3 text-orange-500" />
                        <span className="font-medium text-gray-700">{member.planName}</span>
                      </div>
                      {(member.paidAmount || member.planPrice) && (
                        <div className="flex items-center gap-1 text-xs">
                          <IndianRupee className="w-3 h-3 text-green-600" />
                          <span className="font-semibold text-green-700">₹{(member.paidAmount || member.planPrice).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {member.daysRemaining !== null && (
                        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                          member.daysRemaining <= 0
                            ? "bg-red-50 text-red-600"
                            : member.daysRemaining <= 7
                              ? "bg-amber-50 text-amber-600"
                              : "bg-blue-50 text-blue-600"
                        }`}>
                          <CalendarDays className="w-3 h-3" />
                          <span className="font-medium">
                            {member.daysRemaining <= 0
                              ? "Expired"
                              : `${member.daysRemaining} day${member.daysRemaining !== 1 ? "s" : ""} left`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`${member.planName ? "mt-1.5" : "mt-2 pt-2 border-t border-gray-100"} text-xs text-gray-500 flex items-center gap-1`}>
                    <Clock className="w-3 h-3" />
                    Assigned {formatTimeAgo(member.assignedAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "plans" && (
          <div className="space-y-3">
            {/* Add Plan Button */}
            <button
              onClick={() => { setEditingPlan(null); setShowPlanModal(true); }}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              style={{ minHeight: "44px" }}
            >
              <Plus className="w-5 h-5" />
              Create Plan for {trainer.firstName || trainer.name}
            </button>

            {plansLoading ? (
              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                <p className="text-gray-500 text-sm mt-3">Loading plans...</p>
              </div>
            ) : trainerPlans.length === 0 ? (
              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Tag className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">No Plans Yet</h3>
                <p className="text-gray-500 text-sm">
                  Create monthly, quarterly, or yearly plans for this trainer
                </p>
              </div>
            ) : (
              trainerPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0 ${
                        plan.is_active
                          ? "bg-gradient-to-br from-orange-500 to-amber-600"
                          : "bg-gradient-to-br from-gray-400 to-gray-500"
                      }`}
                    >
                      <Award className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900 text-sm truncate">
                              {plan.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                                plan.is_active
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {plan.is_active ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              {plan.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {plan.description && (
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">
                              {plan.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-lg font-bold text-gray-900">
                            ₹{plan.price.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(plan.duration_days)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {plan.subscribers} subscriber{plan.subscribers !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 overflow-x-auto no-scrollbar -mx-1 px-1">
                        <button
                          onClick={() => { setEditingPlan(plan); setShowPlanModal(true); }}
                          className="flex-shrink-0 px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-lg active:bg-orange-100 transition-all flex items-center gap-1.5"
                          style={{ minHeight: "32px" }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => togglePlanStatus(plan.id)}
                          className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg active:scale-95 transition-all flex items-center gap-1.5 text-white ${
                            plan.is_active
                              ? "bg-gradient-to-r from-amber-500 to-amber-600"
                              : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                          }`}
                          style={{ minHeight: "32px" }}
                        >
                          {plan.is_active ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          {plan.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => deletePlan(plan.id)}
                          disabled={plan.subscribers > 0}
                          className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 ${
                            plan.subscribers > 0
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-red-50 text-red-700 active:bg-red-100 transition-all"
                          }`}
                          style={{ minHeight: "32px" }}
                          title={
                            plan.subscribers > 0
                              ? "Cannot delete plan with active subscribers"
                              : "Delete plan"
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "availability" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Weekly Schedule</h3>
                  <p className="text-xs text-gray-500">Trainer availability & timings</p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/settings/trainers/${id}/edit`)}
                className="text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Edit
              </button>
            </div>

            {trainer.availableDays && trainer.availableDays.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {DAYS_OF_WEEK.map((day) => {
                  const isAvailable = trainer.availableDays.includes(day);
                  const slots = trainer.availableTimeSlots?.[day] || [];
                  const daySlotAssignments = trainerSlotAssignments[day] || {};
                  
                  return (
                    <div key={day} className={`px-4 py-3 flex items-start gap-3 ${!isAvailable ? 'opacity-40' : ''}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        isAvailable ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            isAvailable ? 'text-gray-900' : 'text-gray-400'
                          }`}>
                            {day}
                          </span>
                          {!isAvailable && (
                            <span className="text-xs text-gray-400">Off</span>
                          )}
                        </div>
                        {isAvailable && slots.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {slots
                              .sort((a, b) => {
                                const getHour = (s) => parseInt(s.split('-')[0]);
                                const isPM_a = a.includes('PM') && !a.includes('12');
                                const isPM_b = b.includes('PM') && !b.includes('12');
                                return (getHour(a) + (isPM_a ? 12 : 0)) - (getHour(b) + (isPM_b ? 12 : 0));
                              })
                              .map((slot) => {
                                const assignedMembers = daySlotAssignments[slot] || [];
                                const assignedCount = assignedMembers.length;
                                const isSelectedSlot =
                                  selectedScheduleSlot?.day === day &&
                                  selectedScheduleSlot?.slot === slot;

                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => {
                                      setSelectedScheduleSlot((prev) => {
                                        if (prev?.day === day && prev?.slot === slot) return null;
                                        return { day, slot };
                                      });
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border transition-colors ${
                                      isSelectedSlot
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : assignedCount > 0
                                          ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                          : "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                                    }`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {slot}
                                    {assignedCount > 0 && (
                                      <span className={`ml-0.5 ${isSelectedSlot ? "text-blue-100" : "text-amber-700"}`}>
                                        ({assignedCount} member{assignedCount > 1 ? "s" : ""})
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                        {isAvailable &&
                          selectedScheduleSlot?.day === day &&
                          selectedScheduleSlot?.slot && (
                            <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                              <p className="text-xs font-semibold text-gray-700">
                                {selectedScheduleSlot.slot} - Assigned Members
                              </p>
                              {(() => {
                                const selectedMembers =
                                  daySlotAssignments[selectedScheduleSlot.slot] || [];
                                if (selectedMembers.length === 0) {
                                  return (
                                    <p className="text-xs text-gray-500 mt-1">No members assigned</p>
                                  );
                                }
                                return (
                                  <div className="mt-1 space-y-1">
                                    {selectedMembers.map((m) => (
                                      <p key={m.memberId} className="text-xs text-gray-700">
                                        {m.name}
                                      </p>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        {isAvailable && slots.length === 0 && (
                          <p className="text-xs text-gray-400 mt-1">Available (no specific slots set)</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">No Schedule Set</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Set this trainer's weekly availability and time slots
                </p>
                <button
                  onClick={() => router.push(`/settings/trainers/${id}/edit`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Set Availability
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "credentials" && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Key className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Login Credentials</h3>
                <p className="text-xs text-gray-500">Trainer's login information</p>
              </div>
            </div>

            {/* Login Email/Phone */}
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Login Email</p>
                      <p className="font-medium text-gray-900">{trainer.email || "Not set"}</p>
                    </div>
                  </div>
                  {trainer.email && (
                    <button
                      onClick={() => copyToClipboard(trainer.email, "email")}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {copied === "email" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Login Phone</p>
                      <p className="font-medium text-gray-900">{trainer.phone || "Not set"}</p>
                    </div>
                  </div>
                  {trainer.phone && (
                    <button
                      onClick={() => copyToClipboard(trainer.phone, "phone")}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {copied === "phone" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Password</p>
                      <p className="font-medium text-gray-900 font-mono">
                        {showPassword ? (trainer.password || "Not set") : "••••••••"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {trainer.password && (
                      <button
                        onClick={() => copyToClipboard(trainer.password, "password")}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {copied === "password" ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Share these credentials securely with the trainer
              </p>
            </div>
          </div>
        )}

        {activeTab === "earnings" && (
          <div className="space-y-4">
            {/* Earnings Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Total Earned</p>
                <p className="text-lg font-bold text-emerald-700 mt-1">
                  ₹{earningsSummary.total.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 text-center">
                <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">This Month</p>
                <p className="text-lg font-bold text-blue-700 mt-1">
                  ₹{earningsSummary.thisMonth.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Last Month</p>
                <p className="text-lg font-bold text-gray-700 mt-1">
                  ₹{earningsSummary.lastMonth.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Earnings Trend */}
            {earningsSummary.thisMonth > 0 && earningsSummary.lastMonth > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-5 h-5 ${earningsSummary.thisMonth >= earningsSummary.lastMonth ? 'text-emerald-600' : 'text-red-500'}`} />
                  <p className="text-sm text-gray-700">
                    {earningsSummary.thisMonth >= earningsSummary.lastMonth ? (
                      <span className="text-emerald-700 font-medium">
                        +{Math.round(((earningsSummary.thisMonth - earningsSummary.lastMonth) / earningsSummary.lastMonth) * 100)}% from last month
                      </span>
                    ) : (
                      <span className="text-red-600 font-medium">
                        -{Math.round(((earningsSummary.lastMonth - earningsSummary.thisMonth) / earningsSummary.lastMonth) * 100)}% from last month
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Earnings History */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Earning History
              </h3>

              {earningsLoading ? (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                  <p className="text-gray-500 text-sm mt-3">Loading earnings...</p>
                </div>
              ) : trainerEarnings.length === 0 ? (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">No Earnings Yet</h3>
                  <p className="text-gray-500 text-sm">
                    Earnings will appear here when members are assigned with a trainer plan
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trainerEarnings.map((earning) => (
                    <div key={earning.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                          <IndianRupee className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm truncate">
                                {earning.members?.full_name || "Unknown Member"}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {earning.trainer_plans?.name || "Custom Plan"} ({earning.trainer_plans?.duration_days ? formatDuration(earning.trainer_plans.duration_days) : "N/A"})
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className="text-base font-bold text-emerald-700">
                                +₹{earning.trainer_amount.toLocaleString("en-IN")}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                of ₹{earning.total_amount.toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(earning.created_at)}
                            </span>
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] uppercase font-medium">
                              {earning.payment_mode || "cash"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-3">
            {activityLog.length === 0 ? (
              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">No Activity Yet</h3>
                <p className="text-gray-500 text-sm">
                  Activity will appear here when the trainer assigns plans, collects payments, or gets members assigned
                </p>
              </div>
            ) : (
              activityLog.map((activity) => {
                const getActivityIcon = () => {
                  switch (activity.type) {
                    case "diet":
                      return { bg: "bg-green-100", icon: <Apple className="w-5 h-5 text-green-600" /> };
                    case "workout":
                      return { bg: "bg-orange-100", icon: <Dumbbell className="w-5 h-5 text-orange-600" /> };
                    case "payment":
                      return { bg: "bg-blue-100", icon: <Wallet className="w-5 h-5 text-blue-600" /> };
                    case "member_assignment":
                      return { bg: "bg-purple-100", icon: <UserCheck className="w-5 h-5 text-purple-600" /> };
                    default:
                      return { bg: "bg-gray-100", icon: <Activity className="w-5 h-5 text-gray-600" /> };
                  }
                };

                const { bg, icon } = getActivityIcon();

                return (
                  <div key={activity.id} className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg}`}>
                        {icon}
                      </div>
                      
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{activity.action}</span>
                          {activity.details && (
                            <> - <strong>{activity.details}</strong></>
                          )}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Member: <strong>{activity.memberName}</strong>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTimeAgo(activity.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Trainer Plan Modal */}
        {showPlanModal && (
          <TrainerPlanModal
            plan={editingPlan}
            gymId={selectedGym?.id}
            trainerId={trainer?.profileId}
            trainerName={trainer?.firstName || trainer?.name}
            onClose={() => { setShowPlanModal(false); setEditingPlan(null); }}
            onSave={() => {
              fetchTrainerDetails();
              setShowPlanModal(false);
              setEditingPlan(null);
            }}
          />
        )}

        {/* Unassign Confirmation Modal */}
        {unassignMember && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <UserMinus className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Unassign Member</h3>
                  <p className="text-sm text-gray-500">Remove member from trainer</p>
                </div>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to unassign <strong>{unassignMember.name}</strong> from this trainer?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setUnassignMember(null)}
                  className="flex-1 py-2 px-4 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
                  disabled={unassigning}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnassignMember}
                  className="flex-1 py-2 px-4 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
                  disabled={unassigning}
                >
                  {unassigning ? "Removing..." : "Unassign"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Trainer Plan Modal (Create/Edit) ─────────────────────────
function TrainerPlanModal({ plan, gymId, trainerId, trainerName, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: plan?.name || "",
    duration: plan?.duration_days || "",
    price: plan?.price || "",
    active: plan?.is_active ?? true,
    description: plan?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [durationUnit, setDurationUnit] = useState("months");

  const presets = [
    { label: "1 Month", value: 1 },
    { label: "3 Months", value: 3 },
    { label: "6 Months", value: 6 },
    { label: "1 Year", value: 12 },
  ];

  useEffect(() => {
    if (plan?.duration_days) {
      if (plan.duration_days % 30 === 0) {
        setDurationUnit("months");
        setFormData((prev) => ({ ...prev, duration: Math.round(plan.duration_days / 30) }));
      } else if (plan.duration_days % 7 === 0) {
        setDurationUnit("weeks");
        setFormData((prev) => ({ ...prev, duration: Math.round(plan.duration_days / 7) }));
      } else {
        setDurationUnit("days");
      }
    }
  }, [plan]);

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateDays = (value, unit) => {
    const num = parseInt(value);
    if (isNaN(num) || num <= 0) return 0;
    if (unit === "months") return num * 30;
    if (unit === "weeks") return num * 7;
    return num;
  };

  const selectPreset = (preset) => {
    setDurationUnit("months");
    setFormData((prev) => ({
      ...prev,
      duration: preset.value,
      name: prev.name || `${preset.label} Training`,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.duration || !formData.price) {
      alert("Please fill all required fields");
      return;
    }
    const durationInDays = calculateDays(formData.duration, durationUnit);
    if (durationInDays <= 0) {
      alert("Duration must be greater than 0");
      return;
    }

    try {
      setSaving(true);
      if (plan) {
        const { error } = await supabase
          .from("trainer_plans")
          .update({
            name: formData.name.trim(),
            duration_days: durationInDays,
            price: parseFloat(formData.price),
            is_active: formData.active,
            description: formData.description.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("trainer_plans").insert({
          gym_id: gymId,
          trainer_id: trainerId,
          name: formData.name.trim(),
          duration_days: durationInDays,
          price: parseFloat(formData.price),
          is_active: formData.active,
          description: formData.description.trim(),
        });
        if (error) throw error;
      }
      onSave();
    } catch (error) {
      console.error("Error saving trainer plan:", error);
      alert("Failed to save plan: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className=" mb-15 fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center px-0 pb-[env(safe-area-inset-bottom,0px)] sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] sm:max-h-[90vh] overflow-hidden shadow-2xl animate-slide-up flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white z-10 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {plan ? "Edit Plan" : "Create Plan"}
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                {plan ? `Update plan for ${trainerName}` : `New plan for ${trainerName}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 min-h-0 p-4">
          <div className="space-y-4">
            {/* Quick Duration Presets */}
            {!plan && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Select
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {presets.map((preset) => {
                    const isSelected =
                      durationUnit === "months" &&
                      parseInt(formData.duration) === preset.value;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => selectPreset(preset)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-all duration-200 border-2 flex flex-col items-center gap-0.5 ${
                          isSelected
                            ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <Calendar
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "text-orange-600" : "text-gray-400"
                          }`}
                        />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plan Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Plan Name *
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                placeholder="e.g., 1 Month Training, Quarterly PT"
                value={formData.name}
                onChange={(e) => updateForm("name", e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none text-sm"
                placeholder="What's included in this plan..."
                rows={2}
                value={formData.description}
                onChange={(e) => updateForm("description", e.target.value)}
              />
            </div>

            {/* Duration & Price */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Duration *
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                    placeholder="e.g., 1"
                    value={formData.duration}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d+$/.test(v))
                        updateForm("duration", v === "" ? "" : parseInt(v));
                    }}
                    required
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {durationUnit === "days" && `${formData.duration || 0} days`}
                  {durationUnit === "weeks" &&
                    `${formData.duration || 0} wks (${(formData.duration || 0) * 7} days)`}
                  {durationUnit === "months" &&
                    `${formData.duration || 0} mo (${(formData.duration || 0) * 30} days)`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Price (₹) *
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <IndianRupee className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-sm"
                    placeholder="e.g., 3000"
                    value={formData.price}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "" || /^\d*\.?\d*$/.test(v))
                        updateForm("price", v === "" ? "" : parseFloat(v));
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Status Toggle */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Status</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formData.active ? "Available for assigning" : "Hidden from assignments"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateForm("active", !formData.active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.active ? "bg-orange-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
          </div>

          {/* Actions - sticky footer */}
          <div className="flex gap-3 p-4 pb-8 border-t border-gray-200 bg-white shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl active:scale-95 transition-all text-sm"
              disabled={saving}
              style={{ minHeight: "44px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium rounded-xl hover:shadow-lg active:scale-95 transition-all text-sm disabled:opacity-50"
              disabled={saving}
              style={{ minHeight: "44px" }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {plan ? "Saving..." : "Creating..."}
                </span>
              ) : (
                plan ? "Save Changes" : "Create Plan"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
