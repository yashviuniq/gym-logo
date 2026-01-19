"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import RenewMembershipModal from "@/components/shared/RenewMembershipModal";
import RenewalHistoryModal from "@/components/shared/RenewalHistoryModal";
import ResolvePendingPaymentModal from "@/components/shared/ResolvePendingPaymentModal";
import CollectPaymentModal from "@/components/shared/CollectPaymentModal";
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
  RefreshCw,
  FileText,
  ChevronLeft,
  History,
  Utensils,
  Dumbbell,
  Trash2,
  Plus,
  Wallet
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function TrainerMemberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showResolvePaymentModal, setShowResolvePaymentModal] = useState(false);
  const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);
  const [selectedPendingPayment, setSelectedPendingPayment] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gymId, setGymId] = useState(null);
  const [gymData, setGymData] = useState(null);
  const [trainerId, setTrainerId] = useState(null);
  const [trainerName, setTrainerName] = useState("");
  const [renewalHistory, setRenewalHistory] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [assignedDietPlans, setAssignedDietPlans] = useState([]);
  const [assignedWorkoutPlans, setAssignedWorkoutPlans] = useState([]);
  const [memberCredentials, setMemberCredentials] = useState(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        
        if (!authData?.user) {
          router.push("/auth/login");
          return;
        }

        setTrainerId(authData.user.id);

        // Get trainer profile info
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", authData.user.id)
          .single();

        if (profileData) {
          setTrainerName(`${profileData.first_name} ${profileData.last_name}`.trim());
        }

        // Get gym association
        const { data: gymTrainerData } = await supabase
          .from("gym_trainers")
          .select("gym_id, gyms (id, name, address, phone)")
          .eq("profile_id", authData.user.id)
          .eq("is_active", true)
          .single();

        if (gymTrainerData) {
          setGymId(gymTrainerData.gym_id);
          setGymData(gymTrainerData.gyms);
          await fetchMemberDetails(params.id, gymTrainerData.gym_id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error:", err);
        setLoading(false);
      }
    };

    init();
  }, [params.id, router]);

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
            created_at,
            membership_id
          )
        `)
        .eq("id", memberId)
        .eq("gym_id", gymId)
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
        daysRemaining: daysRemaining,
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
        created_at: p.created_at
      })) || [];
      setPendingPayments(pending);

      const history = memberData.memberships?.map(m => {
        // Try to find payment by membership_id first
        let membershipPayment = memberData.payments?.find(p => p.membership_id === m.id);
        
        // If not found by membership_id, try to match by created_at proximity and amount
        if (!membershipPayment) {
          const membershipDate = new Date(m.created_at);
          const planPrice = m.membership_plans?.price || 0;
          
          // Find payments created within 5 minutes of membership creation
          // and matching the plan price
          membershipPayment = memberData.payments?.find(p => {
            if (p.membership_id && p.membership_id !== m.id) return false; // Skip if linked to another membership
            
            const paymentDate = new Date(p.created_at);
            const timeDiff = Math.abs(paymentDate - membershipDate);
            const withinTimeWindow = timeDiff < 5 * 60 * 1000; // 5 minutes in milliseconds
            
            // Check if amount is close to plan price (within ₹1 to account for decimals)
            const amountMatch = Math.abs((p.amount || 0) - planPrice) < 1;
            
            return withinTimeWindow && amountMatch;
          });
        }
        
        return {
          planName: m.membership_plans?.name || "Unknown",
          duration: m.membership_plans?.duration_days || 0,
          price: m.membership_plans?.price || 0,
          paymentAmount: membershipPayment?.amount || 0,
          paymentMode: membershipPayment?.payment_mode || "N/A",
          newEndDate: m.end_date,
          renewedAt: m.created_at
        };
      }) || [];

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

      await fetchAssignedDietPlans(memberId);
      await fetchAssignedWorkoutPlans(memberId);
      await fetchMemberCredentials(memberId);

    } catch (err) {
      console.error("Error:", err);
    }
    setLoading(false);
  };

  const fetchAssignedDietPlans = async (memberId) => {
    try {
      const { data, error } = await supabase
        .from("member_diets")
        .select(`
          id,
          assigned_at,
          diet_plans (
            id,
            title,
            description,
            member_id,
            is_template
          )
        `)
        .eq("member_id", memberId)
        .order("assigned_at", { ascending: false });

      if (!error && data) {
        setAssignedDietPlans(data.map(d => ({
          id: d.id,
          planId: d.diet_plans?.id,
          title: d.diet_plans?.title || "Unknown Plan",
          description: d.diet_plans?.description,
          assignedAt: d.assigned_at,
          isCustom: !!d.diet_plans?.member_id,
          isTemplate: d.diet_plans?.is_template
        })));
      }
    } catch (err) {
      console.error("Error fetching diet plans:", err);
    }
  };

  const fetchAssignedWorkoutPlans = async (memberId) => {
    try {
      const { data, error } = await supabase
        .from("member_workouts")
        .select(`
          id,
          assigned_at,
          workout_plans (
            id,
            title,
            description,
            member_id
          )
        `)
        .eq("member_id", memberId)
        .order("assigned_at", { ascending: false });

      if (!error && data) {
        setAssignedWorkoutPlans(data.map(w => ({
          id: w.id,
          planId: w.workout_plans?.id,
          title: w.workout_plans?.title || "Unknown Plan",
          description: w.workout_plans?.description,
          assignedAt: w.assigned_at,
          isCustom: !!w.workout_plans?.member_id
        })));
      }
    } catch (err) {
      console.error("Error fetching workout plans:", err);
    }
  };

  const fetchMemberCredentials = async (memberId) => {
    try {
      const { data, error } = await supabase
        .from("member_credentials")
        .select("*")
        .eq("member_id", memberId)
        .maybeSingle();

      if (!error && data) {
        setMemberCredentials({
          loginType: data.login_type,
          loginValue: data.login_value,
          password: data.password,
          createdAt: data.created_at
        });
      }
    } catch (err) {
      console.error("Error fetching credentials:", err);
    }
  };

  const handleRemoveDietPlan = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to remove this diet plan?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("member_diets")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      showSuccess("Diet plan removed successfully");
      fetchAssignedDietPlans(member.id);
    } catch (err) {
      console.error("Error removing diet plan:", err);
      showError("Failed to remove diet plan");
    }
  };

  const handleRemoveWorkoutPlan = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to remove this workout plan?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("member_workouts")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      showSuccess("Workout plan removed successfully");
      fetchAssignedWorkoutPlans(member.id);
    } catch (err) {
      console.error("Error removing workout plan:", err);
      showError("Failed to remove workout plan");
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

  const handleRenewal = () => {
    setShowRenewModal(false);
    if (gymId) {
      fetchMemberDetails(params.id, gymId);
    }
    showSuccess("Membership renewed successfully!");
  };

  const handlePaymentResolved = () => {
    if (gymId) {
      fetchMemberDetails(params.id, gymId);
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Member Not Found</h3>
            <button
              onClick={() => router.push("/trainer/all-members")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg flex items-center gap-2 mx-auto"
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-24">
      <Header title="Member Details" />

      <main className="px-3 py-3 space-y-4">
        {/* Profile Header */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center overflow-hidden flex-shrink-0">
              {member.profileImage ? (
                <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-2xl">
                  {member.name?.charAt(0)?.toUpperCase()}
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h1>
              
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusConfig.color} ${statusConfig.text} flex items-center gap-1.5`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {member.plan}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-3.5 h-3.5" />
                <span>{member.phone}</span>
              </div>
              {member.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center">
              <Calendar className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600 mb-0.5">Valid Till</p>
              <p className="text-sm font-semibold text-gray-900">{member.validTill}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 text-center">
              <Clock className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600 mb-0.5">Days Left</p>
              <p className="text-sm font-semibold text-gray-900">
                {member.daysRemaining !== null && member.daysRemaining >= 0 ? member.daysRemaining : "0"}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 text-center">
              <DollarSign className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-xs text-gray-600 mb-0.5">Dues</p>
              <p className="text-sm font-semibold text-gray-900">₹{member.dueAmount}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {(member.status === "expired" || member.status === "inactive") && (
              <button
                onClick={() => setShowRenewModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:from-orange-600 hover:to-orange-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Renew
              </button>
            )}
            {member.dueAmount > 0 && (
              <button
                onClick={() => setShowCollectPaymentModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:from-green-600 hover:to-green-700 transition"
              >
                <Wallet className="w-4 h-4" />
                Collect Dues
              </button>
            )}
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition"
            >
              <History className="w-4 h-4" />
              History
            </button>
          </div>
        </div>

        {/* Pending Payments */}
        {pendingPayments.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">Pending Payments</h3>
            </div>
            <div className="space-y-2">
              {pendingPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                  <div>
                    <p className="font-medium text-gray-900">₹{payment.amount}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(payment.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleResolvePendingPayment(payment)}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition ${
                activeTab === "overview"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition ${
                activeTab === "payments"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Payments
            </button>
            <button
              onClick={() => setActiveTab("plans")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition ${
                activeTab === "plans"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Plans
            </button>
            <button
              onClick={() => setActiveTab("credentials")}
              className={`flex-1 py-3 px-4 text-sm font-medium transition ${
                activeTab === "credentials"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Login
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Join Date</p>
                    <p className="text-sm font-medium text-gray-900">{member.joinDate}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Plan Price</p>
                    <p className="text-sm font-medium text-gray-900">₹{member.planPrice}</p>
                  </div>
                </div>

                {/* Recent Attendance */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Recent Attendance</h4>
                  {member.attendance.length > 0 ? (
                    <div className="space-y-2">
                      {member.attendance.slice(0, 5).map((att, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                          <span className="text-sm text-gray-700">{att.date}</span>
                          <div className="text-xs text-gray-500">
                            <span className="font-medium text-green-600">{att.checkIn}</span>
                            {att.checkOut !== "-" && (
                              <span className="ml-2 font-medium text-red-600">{att.checkOut}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No attendance records</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "payments" && (
              <div>
                {member.payments.length > 0 ? (
                  <div className="space-y-2">
                    {member.payments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="font-medium text-gray-900">₹{payment.amount}</p>
                          <p className="text-xs text-gray-500">{payment.date}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            payment.status === "paid" 
                              ? "bg-green-100 text-green-700" 
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {payment.status}
                          </span>
                          <p className="text-xs text-gray-500 mt-1 capitalize">{payment.payment_mode}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No payment records</p>
                )}
              </div>
            )}

            {activeTab === "plans" && (
              <div className="space-y-4">
                {/* Diet Plans */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-green-600" />
                      Diet Plans
                    </h4>
                    <div className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg">
                      Only for Assigned Members
                    </div>
                  </div>
                  {assignedDietPlans.length > 0 ? (
                    <div className="space-y-2">
                      {assignedDietPlans.map((plan) => (
                        <div key={plan.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 text-sm">{plan.title}</h5>
                              {plan.description && (
                                <p className="text-xs text-gray-600 mt-1">{plan.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Assigned: {new Date(plan.assignedAt).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                      No diet plans assigned
                    </p>
                  )}
                </div>

                {/* Workout Plans */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <Dumbbell className="w-4 h-4 text-blue-600" />
                      Workout Plans
                    </h4>
                    <div className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg">
                      Only for Assigned Members
                    </div>
                  </div>
                  {assignedWorkoutPlans.length > 0 ? (
                    <div className="space-y-2">
                      {assignedWorkoutPlans.map((plan) => (
                        <div key={plan.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 text-sm">{plan.title}</h5>
                              {plan.description && (
                                <p className="text-xs text-gray-600 mt-1">{plan.description}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Assigned: {new Date(plan.assignedAt).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                      No workout plans assigned
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "credentials" && (
              <div className="space-y-4">
                {memberCredentials ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">Login Credentials</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Login Type</p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{memberCredentials.loginType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Login Value</p>
                        <p className="text-sm font-medium text-gray-900">{memberCredentials.loginValue}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Password</p>
                        <p className="text-sm font-mono font-medium text-gray-900">{memberCredentials.password}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Created</p>
                        <p className="text-sm text-gray-900">
                          {new Date(memberCredentials.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <h4 className="font-semibold text-gray-900 mb-2">No Credentials</h4>
                    <p className="text-sm text-gray-600">Login credentials have not been set up for this member yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      {showRenewModal && (
        <RenewMembershipModal
          member={member}
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
          onResolve={handlePaymentResolved}
        />
      )}

      {showCollectPaymentModal && (
        <CollectPaymentModal
          member={member}
          gymId={gymId}
          gymData={gymData}
          trainerId={trainerId}
          trainerName={trainerName}
          onClose={() => setShowCollectPaymentModal(false)}
          onPaymentCollected={() => {
            setShowCollectPaymentModal(false);
            if (gymId) {
              fetchMemberDetails(params.id, gymId);
            }
            showSuccess("Payment collected successfully!");
          }}
        />
      )}
    </div>
  );
}
