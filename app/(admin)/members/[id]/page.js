"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import RenewMembershipModal from "@/components/shared/RenewMembershipModal";
import RenewalHistoryModal from "@/components/shared/RenewalHistoryModal";
import ResolvePendingPaymentModal from "@/components/shared/ResolvePendingPaymentModal";
import AssignDietPlanModal from "@/components/shared/AssignDietPlanModal";
import AssignWorkoutPlanModal from "@/components/shared/AssignWorkoutPlanModal";
import {
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  DollarSign,
  CreditCard,
  Key,
  RefreshCw,
  FileText,
  BarChart3,
  Trash2,
  Edit,
  MessageCircle,
  PhoneCall,
  Shield,
  Plus,
  ChevronRight,
  Download,
  Eye,
  MoreVertical,
  ChevronLeft,
  Building,
  History,
  Utensils,
  Dumbbell
} from "lucide-react";

export default function MemberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showResolvePaymentModal, setShowResolvePaymentModal] = useState(false);
  const [showAssignDietModal, setShowAssignDietModal] = useState(false);
  const [showAssignWorkoutModal, setShowAssignWorkoutModal] = useState(false);
  const [selectedPendingPayment, setSelectedPendingPayment] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);
  const [renewalHistory, setRenewalHistory] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);

  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      fetchMemberDetails(params.id, gym.id);
    } else {
      setLoading(false);
    }
  }, [params.id]);

  const fetchMemberDetails = async (memberId, gymId) => {
    setLoading(true);
    try {
      const { data: memberData, error } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          email,
          balance,
          profile_image,
          created_at,
          gym_id,
          memberships (
            id,
            plan_id,
            start_date,
            end_date,
            status,
            created_at,
            membership_plans (
              id,
              name,
              price,
              duration_days
            )
          ),
          payments (
            id,
            amount,
            payment_mode,
            status,
            paid_at,
            created_at
          )
        `)
        .eq("id", memberId)
        .single();

      if (error) {
        console.error("Error fetching member:", error);
        setLoading(false);
        return;
      }

      const activeMembership = memberData.memberships?.find(
        (m) => m.status === "active"
      ) || memberData.memberships?.[0];

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

      const transformedMember = {
        id: memberData.id,
        gymId: memberData.gym_id,
        name: memberData.full_name,
        email: memberData.email || "",
        phone: memberData.phone,
        profileImage: memberData.profile_image || null,
        joinDate: new Date(memberData.created_at).toLocaleDateString("en-IN"),
        plan: activeMembership?.membership_plans?.name || "No Plan",
        planPrice: activeMembership?.membership_plans?.price || 0,
        status: memberStatus,
        validTill: activeMembership?.end_date
          ? new Date(activeMembership.end_date).toLocaleDateString("en-IN")
          : "N/A",
        dueAmount: Math.max(0, memberData.balance || 0),
        balance: memberData.balance || 0,
        attendance: [],
        payments: memberData.payments?.map(p => ({
          id: p.id,
          date: new Date(p.paid_at || p.created_at).toLocaleDateString("en-IN"),
          amount: p.amount,
          type: "Membership",
          status: p.status,
          payment_mode: p.payment_mode,
          created_at: p.created_at
        })) || []
      };

      setMember(transformedMember);

      const pending = memberData.payments?.filter(p => p.status === "pending").map(p => ({
        id: p.id,
        amount: p.amount,
        created_at: p.created_at,
        membership_id: p.membership_id
      })) || [];
      setPendingPayments(pending);

      const history = memberData.memberships?.map(m => ({
        planName: m.membership_plans?.name || "Unknown",
        duration: m.membership_plans?.duration_days || 0,
        price: m.membership_plans?.price || 0,
        paymentAmount: memberData.payments?.find(p => p.membership_id === m.id)?.amount || 0,
        paymentMode: memberData.payments?.find(p => p.membership_id === m.id)?.payment_mode || "cash",
        notes: "",
        newEndDate: m.end_date,
        renewedAt: m.created_at
      })) || [];

      setRenewalHistory(history);

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("member_id", memberId)
        .order("check_in_date", { ascending: false })
        .limit(10);

      if (attendanceData) {
        transformedMember.attendance = attendanceData.map(a => ({
          date: new Date(a.check_in_date).toLocaleDateString("en-IN"),
          checkIn: a.check_in_time,
          checkOut: a.check_out_time || "-"
        }));
        setMember({ ...transformedMember });
      }

    } catch (err) {
      console.error("Error:", err);
    }
    setLoading(false);
  };

  const handleDeleteMember = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${member.name}? This action cannot be undone. All associated data including memberships, payments, and attendance records will be permanently deleted.`
    );
    
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", member.id);

      if (error) {
        throw error;
      }

      showSuccess("Member deleted successfully!");
      router.push("/members");
    } catch (error) {
      console.error("Error deleting member:", error);
      showError("Failed to delete member. Please try again.");
    }
  };

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

  const handleRenewal = (renewalData) => {
    setRenewalHistory((prev) => [renewalData, ...prev]);
    setShowRenewModal(false);
    if (selectedGym) {
      fetchMemberDetails(params.id, selectedGym.id);
    }
    showSuccess("Membership renewed successfully!");
  };

  const handlePaymentResolved = () => {
    if (selectedGym) {
      fetchMemberDetails(params.id, selectedGym.id);
    }
  };

  const handleResolvePendingPayment = (payment) => {
    setSelectedPendingPayment(payment);
    setShowResolvePaymentModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header title="Member Details" />
        <main className="px-3 py-3">
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-14 h-14 border-4 border-transparent border-t-blue-500 rounded-full animate-spin animation-delay-200"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header title="Member Details" />
        <main className="px-3 py-3">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Member Not Found</h3>
            <p className="text-gray-500 text-center mb-6 max-w-sm mx-auto">
              The member you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => router.push("/members")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Members
            </button>
          </div>
        </main>
      </div>
    );
  }

  const statusConfig = getStatusConfig(member.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 mb-17">
      <Header title="Member Details" />

      <main className="px-3 py-3 space-y-4">
        {/* Profile Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-sm overflow-hidden">
              {member.profileImage ? (
                <img
                  src={member.profileImage}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                member.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                    {member.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-600 text-sm">{member.phone}</span>
                  </div>
                  {member.email && (
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-gray-600 text-sm truncate">{member.email}</span>
                    </div>
                  )}
                </div>
                <div className={`px-2.5 py-1.5 rounded-lg border ${statusConfig.color} ${statusConfig.text} flex items-center gap-1.5`}>
                  {statusConfig.icon}
                  <span className="text-xs font-medium">{statusConfig.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{member.plan}</p>
              <p className="text-xs text-gray-500">Current Plan</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {member.attendance.length}
              </p>
              <p className="text-xs text-gray-500">This Month</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${member.dueAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                ₹{member.dueAmount}
              </p>
              <p className="text-xs text-gray-500">Due Amount</p>
            </div>
          </div>
        </div>

        {/* Pending Payments Alert */}
        {pendingPayments.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {pendingPayments.length} Pending Payment{pendingPayments.length > 1 ? 's' : ''}
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  This member has {pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} waiting to be resolved.
                </p>
                <div className="space-y-2">
                  {pendingPayments.map((payment) => (
                    <div 
                      key={payment.id}
                      className="bg-white rounded-lg p-3 border border-amber-200 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">₹{payment.amount}</p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(payment.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleResolvePendingPayment(payment)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-300"
                      >
                        Resolve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Due Amount Alert */}
        {member.dueAmount > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  Outstanding Balance
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  This member has an outstanding balance that needs to be collected.
                </p>
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Total Due Amount</p>
                      <p className="text-2xl font-bold text-red-600">₹{member.dueAmount}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/members/${member.id}/payment`)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
                  >
                    Collect Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => router.push(`/members/${member.id}/credentials`)}
            className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col items-center gap-1 hover:shadow-md transition-all duration-200 active:scale-95"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">Credentials</span>
          </button>
          
          <a
            href={`tel:${member.phone}`}
            className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col items-center gap-1 hover:shadow-md transition-all duration-200 active:scale-95"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">Call</span>
          </a>
          
          <a
            href={`https://wa.me/91${member.phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col items-center gap-1 hover:shadow-md transition-all duration-200 active:scale-95"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">WhatsApp</span>
          </a>
          
          <button
            onClick={() => router.push(`/members/${member.id}/payment`)}
            className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm flex flex-col items-center gap-1 hover:shadow-md transition-all duration-200 active:scale-95"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-gray-600">Payment</span>
          </button>
        </div>

        {/* Diet & Workout Plan Assignment */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowAssignDietModal(true)}
            className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
          >
            <Utensils className="w-4 h-4" />
            <span>Assign Diet</span>
          </button>
          <button
            onClick={() => setShowAssignWorkoutModal(true)}
            className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
          >
            <Dumbbell className="w-4 h-4" />
            <span>Assign Workout</span>
          </button>
        </div>

        {/* Edit and Delete Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push(`/members/edit?id=${member.id}`)}
            className="p-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-300 hover:shadow-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
          >
            <Edit className="w-4 h-4" />
            Edit Member
          </button>
          <button
            onClick={handleDeleteMember}
            className="p-3 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:border-red-300 hover:shadow-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            Delete Member
          </button>
        </div>

        {/* Membership Actions */}
        <div className={`grid gap-3 ${member.status === "active" ? "grid-cols-1" : "grid-cols-2"}`}>
          {member.status !== "active" && (
            <button
              onClick={() => setShowRenewModal(true)}
              className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              Renew Membership
            </button>
          )}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 active:scale-95"
          >
            <History className="w-4 h-4" />
            View History
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-1">
          <div className="flex overflow-x-auto">
            {[
              { id: "overview", label: "Overview", icon: <Eye className="w-4 h-4" /> },
              { id: "attendance", label: "Attendance", icon: <BarChart3 className="w-4 h-4" /> },
              { id: "payments", label: "Payments", icon: <CreditCard className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === tab.id 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Join Date</p>
                <p className="text-sm font-medium text-gray-900">{member.joinDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Valid Till</p>
                <p className="text-sm font-medium text-gray-900">{member.validTill}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Plan Price</p>
                <p className="text-sm font-medium text-gray-900">₹{member.planPrice}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Current Balance</p>
                <p className={`text-sm font-medium ${member.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ₹{member.balance}
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <h4 className="font-semibold text-gray-900 mb-3">Recent Activity</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Payment</span>
                  <span className="font-medium text-gray-900">
                    {member.payments[0] ? `₹${member.payments[0].amount}` : 'No payments yet'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Last Visit</span>
                  <span className="font-medium text-gray-900">
                    {member.attendance[0] ? member.attendance[0].date : 'No visits yet'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Attendance</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {member.attendance.length > 0 ? (
                member.attendance.map((record, index) => (
                  <div
                    key={index}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{record.date}</p>
                      <p className="text-sm text-gray-500">
                        {record.checkIn} - {record.checkOut}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No attendance records found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Payment History</h3>
              <button
                onClick={() => router.push(`/members/${member.id}/payment`)}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Payment
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {member.payments.length > 0 ? (
                member.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            ₹{payment.amount}
                          </p>
                          <p className="text-sm text-gray-500">
                            {payment.type} • {payment.date}
                          </p>
                          {payment.payment_mode && (
                            <p className="text-xs text-gray-400 mt-1">
                              {payment.payment_mode.toUpperCase()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-xs rounded-lg border ${
                        payment.status === 'paid' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {payment.status}
                      </span>
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => {
                            const pendingPayment = pendingPayments.find(p => p.id === payment.id);
                            if (pendingPayment) {
                              handleResolvePendingPayment(pendingPayment);
                            }
                          }}
                          className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded-lg hover:shadow-lg transition-all duration-300"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No payment records found</p>
                  <button
                    onClick={() => router.push(`/members/${member.id}/payment`)}
                    className="mt-4 px-4 py-2 text-blue-600 text-sm font-medium hover:text-blue-700"
                  >
                    Add first payment
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showRenewModal && (
        <RenewMembershipModal
          member={member}
          gymId={selectedGym?.id}
          onClose={() => setShowRenewModal(false)}
          onRenew={handleRenewal}
        />
      )}

      {showHistoryModal && (
        <RenewalHistoryModal
          member={member}
          renewalHistory={renewalHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {showResolvePaymentModal && selectedPendingPayment && (
        <ResolvePendingPaymentModal
          payment={selectedPendingPayment}
          member={member}
          onClose={() => {
            setShowResolvePaymentModal(false);
            setSelectedPendingPayment(null);
          }}
          onResolved={handlePaymentResolved}
        />
      )}

      {showAssignDietModal && (
        <AssignDietPlanModal
          member={member}
          gymId={selectedGym?.id}
          onClose={() => setShowAssignDietModal(false)}
          onAssign={() => {
            if (selectedGym) {
              fetchMemberDetails(params.id, selectedGym.id);
            }
          }}
        />
      )}

      {showAssignWorkoutModal && (
        <AssignWorkoutPlanModal
          member={member}
          gymId={selectedGym?.id}
          onClose={() => setShowAssignWorkoutModal(false)}
          onAssign={() => {
            if (selectedGym) {
              fetchMemberDetails(params.id, selectedGym.id);
            }
          }}
        />
      )}
    </div>
  );
}