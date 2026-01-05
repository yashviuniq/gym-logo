"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import AssignDietPlanModal from "@/components/shared/AssignDietPlanModal";
import AssignWorkoutPlanModal from "@/components/shared/AssignWorkoutPlanModal";
import CollectPaymentModal from "@/components/shared/CollectPaymentModal";
import {
  User,
  Phone,
  Calendar,
  Dumbbell,
  Apple,
  CheckCircle,
  Clock,
  ChevronRight,
  Plus,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  Activity,
  Eye,
  Edit2,
  Trash2,
  DollarSign
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function TrainerMemberDetailPage({ params }) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { id: memberId } = use(params);
  const [member, setMember] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trainerId, setTrainerId] = useState(null);
  const [gymId, setGymId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showDietModal, setShowDietModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [trainerName, setTrainerName] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        
        if (!authData?.user) {
          router.push("/auth/login");
          return;
        }

        setTrainerId(authData.user.id);

        // Get gym association
        const { data: gymTrainerData } = await supabase
          .from("gym_trainers")
          .select("gym_id")
          .eq("profile_id", authData.user.id)
          .eq("is_active", true)
          .single();

        // Get trainer name from profiles
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", authData.user.id)
          .single();

        if (profileData) {
          const fullName = [profileData.first_name, profileData.last_name].filter(Boolean).join(" ") || "Trainer";
          setTrainerName(fullName);
        }

        if (gymTrainerData) {
          setGymId(gymTrainerData.gym_id);
          
          // Verify this member is assigned to this trainer
          const { data: assignment } = await supabase
            .from("trainer_member_assignments")
            .select("id")
            .eq("gym_id", gymTrainerData.gym_id)
            .eq("trainer_id", authData.user.id)
            .eq("member_id", memberId)
            .eq("is_active", true)
            .single();

          if (!assignment) {
            // Member not assigned to this trainer
            router.push("/trainer/members");
            return;
          }

          await fetchMemberData(gymTrainerData.gym_id, authData.user.id, memberId);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router, memberId]);

  const fetchMemberData = async (gymId, trainerId, memberId) => {
    try {
      // Fetch member details (limited - no credentials)
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          profile_image,
          created_at,
          balance,
          memberships (
            id,
            status,
            start_date,
            end_date,
            membership_plans (
              name,
              duration_days
            )
          )
        `)
        .eq("id", memberId)
        .single();

      if (memberError) throw memberError;

      const activeMembership = memberData?.memberships?.find(m => m.status === "active") 
        || memberData?.memberships?.[0];

      let daysRemaining = null;
      if (activeMembership?.end_date) {
        const endDate = new Date(activeMembership.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      }

      setMember({
        id: memberData.id,
        name: memberData.full_name,
        phone: memberData.phone,
        profileImage: memberData.profile_image,
        memberSince: memberData.created_at,
        membershipStatus: activeMembership?.status || "inactive",
        planName: activeMembership?.membership_plans?.name || "No Plan",
        membershipStart: activeMembership?.start_date,
        membershipEnd: activeMembership?.end_date,
        daysRemaining,
        balance: memberData.balance || 0
      });

      // Fetch attendance (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("member_id", memberId)
        .eq("gym_id", gymId)
        .gte("check_in_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("check_in_date", { ascending: false });

      setAttendance(attendanceData || []);

      // Fetch assigned diet plans
      const { data: dietData } = await supabase
        .from("member_diets")
        .select(`
          id,
          assigned_at,
          diet_plans:diet_plan_id (
            id,
            title,
            description
          )
        `)
        .eq("member_id", memberId)
        .order("assigned_at", { ascending: false });

      setDietPlans(dietData?.map(d => ({
        id: d.id,
        planId: d.diet_plans?.id,
        title: d.diet_plans?.title,
        description: d.diet_plans?.description,
        assignedAt: d.assigned_at
      })) || []);

      // Fetch assigned workout plans
      const { data: workoutData } = await supabase
        .from("member_workouts")
        .select(`
          id,
          assigned_at,
          workout_plans:workout_plan_id (
            id,
            title,
            goal,
            level
          )
        `)
        .eq("member_id", memberId)
        .order("assigned_at", { ascending: false });

      setWorkoutPlans(workoutData?.map(w => ({
        id: w.id,
        planId: w.workout_plans?.id,
        title: w.workout_plans?.title,
        goal: w.workout_plans?.goal,
        level: w.workout_plans?.level,
        assignedAt: w.assigned_at
      })) || []);

    } catch (err) {
      console.error("Error fetching member data:", err);
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

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  };

  // Delete existing diet plans before assigning new one (only one diet plan allowed)
  const handleAssignDietPlan = async () => {
    try {
      // Remove all existing diet assignments for this member
      if (dietPlans.length > 0) {
        const { error } = await supabase
          .from("member_diets")
          .delete()
          .eq("member_id", memberId);
        
        if (error) throw error;
      }
      setShowDietModal(true);
    } catch (error) {
      console.error("Error removing existing diet plan:", error);
      showError("Failed to prepare for new diet plan");
    }
  };

  // Delete existing workout plans before assigning new one (only one workout plan allowed)
  const handleAssignWorkoutPlan = async () => {
    try {
      // Remove all existing workout assignments for this member
      if (workoutPlans.length > 0) {
        const { error } = await supabase
          .from("member_workouts")
          .delete()
          .eq("member_id", memberId);
        
        if (error) throw error;
      }
      setShowWorkoutModal(true);
    } catch (error) {
      console.error("Error removing existing workout plan:", error);
      showError("Failed to prepare for new workout plan");
    }
  };

  const handleRemoveDietPlan = async (assignmentId) => {
    if (!confirm("Are you sure you want to remove this diet plan from the member?")) return;
    
    try {
      const { error } = await supabase
        .from("member_diets")
        .delete()
        .eq("id", assignmentId);
      
      if (error) throw error;
      
      showSuccess("Diet plan removed successfully");
      fetchMemberData(gymId, trainerId, memberId);
    } catch (error) {
      console.error("Error removing diet plan:", error);
      showError("Failed to remove diet plan");
    }
  };

  const handleRemoveWorkoutPlan = async (assignmentId) => {
    if (!confirm("Are you sure you want to remove this workout plan from the member?")) return;
    
    try {
      const { error } = await supabase
        .from("member_workouts")
        .delete()
        .eq("id", assignmentId);
      
      if (error) throw error;
      
      showSuccess("Workout plan removed successfully");
      fetchMemberData(gymId, trainerId, memberId);
    } catch (error) {
      console.error("Error removing workout plan:", error);
      showError("Failed to remove workout plan");
    }
  };

  const handleDietAssigned = () => {
    setShowDietModal(false);
    if (gymId && trainerId && memberId) {
      fetchMemberData(gymId, trainerId, memberId);
    }
  };

  const handleWorkoutAssigned = () => {
    setShowWorkoutModal(false);
    if (gymId && trainerId && memberId) {
      fetchMemberData(gymId, trainerId, memberId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Member Details" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Member Details" />
        <div className="px-4 py-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Member Not Found</h2>
          <p className="text-gray-500 mb-4">This member is not assigned to you.</p>
          <button
            onClick={() => router.push("/trainer/members")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Members
          </button>
        </div>
      </div>
    );
  }

  // Calculate attendance stats
  const attendanceThisMonth = attendance.filter(a => {
    const checkDate = new Date(a.check_in_date);
    const now = new Date();
    return checkDate.getMonth() === now.getMonth() && checkDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Member Details" />

      <main className="px-4 py-4 space-y-4">
        {/* Member Profile Card */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {member.profileImage ? (
                <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-gray-400" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">{member.name}</h2>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  member.membershipStatus === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}>
                  {member.membershipStatus}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Phone className="w-4 h-4" />
                <span>{member.phone}</span>
              </div>
            </div>
          </div>

          {/* Membership Info */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Plan</p>
              <p className="font-medium text-gray-900">{member.planName}</p>
            </div>
            <div>
              <p className="text-gray-500">Valid Till</p>
              <p className={`font-medium ${
                member.daysRemaining !== null && member.daysRemaining <= 7 
                  ? "text-amber-600" 
                  : "text-gray-900"
              }`}>
                {formatDate(member.membershipEnd)}
                {member.daysRemaining !== null && (
                  <span className="text-xs ml-1">
                    ({member.daysRemaining > 0 ? `${member.daysRemaining}d left` : "Expired"})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <CalendarCheck className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{attendanceThisMonth}</p>
            <p className="text-xs text-gray-500">This Month</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <Apple className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{dietPlans.length > 0 ? 1 : 0}</p>
            <p className="text-xs text-gray-500">Diet Plan</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <Dumbbell className="w-5 h-5 text-orange-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-gray-900">{workoutPlans.length > 0 ? 1 : 0}</p>
            <p className="text-xs text-gray-500">Workout</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleAssignDietPlan}
            className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {dietPlans.length > 0 ? "Change Diet" : "Assign Diet Plan"}
          </button>
          <button
            onClick={handleAssignWorkoutPlan}
            className="flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            {workoutPlans.length > 0 ? "Change Workout" : "Assign Workout"}
          </button>
        </div>

        {/* Collect Payment Button - only show if member has balance */}
        {member.balance > 0 && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all active:scale-95"
          >
            <DollarSign className="w-5 h-5" />
            <span>Collect Payment</span>
            <span className="ml-auto bg-white/20 px-3 py-1 rounded-full text-sm">
              ₹{member.balance.toLocaleString()} due
            </span>
          </button>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
          {["overview", "attendance", "diet", "workout"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Recent Attendance */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Recent Attendance</h3>
              {attendance.length === 0 ? (
                <p className="text-gray-500 text-sm">No attendance records yet</p>
              ) : (
                <div className="space-y-2">
                  {attendance.slice(0, 5).map((record) => (
                    <div key={record.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-900">
                          {formatDate(record.check_in_date)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(record.check_in_time)}
                        {record.check_out_time && ` - ${formatTime(record.check_out_time)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Plans */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Assigned Plans</h3>
              <div className="space-y-3">
                {dietPlans.slice(0, 1).map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Apple className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{plan.title}</p>
                        <p className="text-xs text-gray-500">Assigned {formatDate(plan.assignedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/trainer/diet-plans?view=${plan.planId}`)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveDietPlan(plan.id)}
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {workoutPlans.slice(0, 1).map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Dumbbell className="w-5 h-5 text-orange-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{plan.title}</p>
                        <p className="text-xs text-gray-500">Assigned {formatDate(plan.assignedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/trainer/workout-plans?view=${plan.planId}`)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveWorkoutPlan(plan.id)}
                        className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {dietPlans.length === 0 && workoutPlans.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No plans assigned yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">
              Attendance History <span className="text-sm font-normal text-gray-500">(Last 30 days)</span>
            </h3>
            {attendance.length === 0 ? (
              <div className="text-center py-8">
                <CalendarCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No attendance records</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{formatDate(record.check_in_date)}</p>
                      <p className="text-xs text-gray-500">
                        Check-in: {formatTime(record.check_in_time)}
                        {record.check_out_time && ` • Check-out: ${formatTime(record.check_out_time)}`}
                      </p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "diet" && (
          <div className="space-y-3">
            {dietPlans.length === 0 ? (
              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <Apple className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">No Diet Plan Assigned</h3>
                <p className="text-gray-500 text-sm mb-4">Assign a diet plan to this member</p>
                <button
                  onClick={handleAssignDietPlan}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Assign Diet Plan
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Apple className="w-4 h-4 text-emerald-600" />
                    Current Diet Plan
                  </h4>
                </div>
                {dietPlans.slice(0, 1).map((plan) => (
                  <div
                    key={plan.id}
                    className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{plan.title}</p>
                        {plan.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{plan.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Assigned: {formatDate(plan.assignedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => router.push(`/trainer/diet-plans?view=${plan.planId}`)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="View Plan"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/trainer/diet-plans?edit=${plan.planId}`)}
                          className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveDietPlan(plan.id)}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                          title="Remove Plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleAssignDietPlan}
                  className="mt-3 w-full py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Change Diet Plan
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "workout" && (
          <div className="space-y-3">
            {workoutPlans.length === 0 ? (
              <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">No Workout Plan Assigned</h3>
                <p className="text-gray-500 text-sm mb-4">Assign a workout plan to this member</p>
                <button
                  onClick={handleAssignWorkoutPlan}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Assign Workout
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-orange-600" />
                    Current Workout Plan
                  </h4>
                </div>
                {workoutPlans.slice(0, 1).map((plan) => (
                  <div
                    key={plan.id}
                    className="p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{plan.title}</p>
                        <div className="flex gap-2 mt-1">
                          {plan.goal && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {plan.goal}
                            </span>
                          )}
                          {plan.level && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {plan.level}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Assigned: {formatDate(plan.assignedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => router.push(`/trainer/workout-plans?view=${plan.planId}`)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="View Plan"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/trainer/workout-plans?edit=${plan.planId}`)}
                          className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                          title="Edit Plan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveWorkoutPlan(plan.id)}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                          title="Remove Plan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleAssignWorkoutPlan}
                  className="mt-3 w-full py-2 text-sm text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Change Workout Plan
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Diet Plan Modal */}
      {showDietModal && (
        <AssignDietPlanModal
          memberId={memberId}
          memberName={member.name}
          gymId={gymId}
          trainerId={trainerId}
          onClose={() => setShowDietModal(false)}
          onAssigned={handleDietAssigned}
        />
      )}

      {/* Workout Plan Modal */}
      {showWorkoutModal && (
        <AssignWorkoutPlanModal
          memberId={memberId}
          memberName={member.name}
          gymId={gymId}
          trainerId={trainerId}
          onClose={() => setShowWorkoutModal(false)}
          onAssigned={handleWorkoutAssigned}
        />
      )}

      {/* Collect Payment Modal */}
      {showPaymentModal && (
        <CollectPaymentModal
          member={member}
          gymId={gymId}
          trainerId={trainerId}
          trainerName={trainerName}
          onClose={() => setShowPaymentModal(false)}
          onPaymentCollected={() => {
            setShowPaymentModal(false);
            if (gymId && trainerId && memberId) {
              fetchMemberData(gymId, trainerId, memberId);
            }
          }}
        />
      )}
    </div>
  );
}
