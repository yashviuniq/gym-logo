"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
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
  UserCheck
} from "lucide-react";

export default function TrainerDetailsPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [trainer, setTrainer] = useState(null);
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);
  const [activeTab, setActiveTab] = useState("members");
  const [unassignMember, setUnassignMember] = useState(null);
  const [unassigning, setUnassigning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(null);

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
      // Fetch trainer details
      const { data: trainerData, error: trainerError } = await supabase
        .from("gym_trainers")
        .select(`
          id,
          profile_id,
          specialization,
          bio,
          is_active,
          hire_date,
          created_at,
          profiles:profile_id (
            id,
            first_name,
            last_name,
            email,
            phone,
            password
          )
        `)
        .eq("id", id)
        .eq("gym_id", selectedGym.id)
        .single();

      if (trainerError) throw trainerError;

      setTrainer({
        id: trainerData.id,
        profileId: trainerData.profile_id,
        name: `${trainerData.profiles?.first_name || ""} ${trainerData.profiles?.last_name || ""}`.trim(),
        firstName: trainerData.profiles?.first_name,
        lastName: trainerData.profiles?.last_name,
        email: trainerData.profiles?.email,
        phone: trainerData.profiles?.phone,
        password: trainerData.profiles?.password,
        specialization: trainerData.specialization,
        bio: trainerData.bio,
        isActive: trainerData.is_active,
        hireDate: trainerData.hire_date,
        createdAt: trainerData.created_at
      });

      // Fetch assigned members
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("trainer_member_assignments")
        .select(`
          id,
          member_id,
          assigned_at,
          notes,
          is_active,
          members:member_id (
            id,
            full_name,
            phone,
            profile_image,
            memberships (
              status,
              end_date
            )
          )
        `)
        .eq("trainer_id", trainerData.profile_id)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });

      if (!assignmentsError) {
        const members = assignmentsData?.map(a => ({
          assignmentId: a.id,
          memberId: a.member_id,
          name: a.members?.full_name,
          phone: a.members?.phone,
          profileImage: a.members?.profile_image,
          assignedAt: a.assigned_at,
          notes: a.notes,
          status: a.members?.memberships?.[0]?.status || "inactive",
          membershipEnd: a.members?.memberships?.[0]?.end_date
        })) || [];

        setAssignedMembers(members);
      }

      // Fetch activity log (diet/workout assignments, member assignments, payments collected)
      const trainerId = trainerData.profile_id;
      
      // Get diet assignments by trainer
      const { data: dietAssignments } = await supabase
        .from("member_diets")
        .select(`
          id,
          assigned_at,
          members:member_id (full_name),
          diet_plans:diet_plan_id (title)
        `)
        .eq("assigned_by_trainer_id", trainerId)
        .order("assigned_at", { ascending: false })
        .limit(15);

      // Get workout assignments by trainer
      const { data: workoutAssignments } = await supabase
        .from("member_workouts")
        .select(`
          id,
          assigned_at,
          members:member_id (full_name),
          workout_plans:workout_plan_id (title)
        `)
        .eq("assigned_by_trainer_id", trainerId)
        .order("assigned_at", { ascending: false })
        .limit(15);

      // Get member assignments to this trainer
      const { data: memberAssignments } = await supabase
        .from("trainer_member_assignments")
        .select(`
          id,
          assigned_at,
          is_active,
          members:member_id (full_name)
        `)
        .eq("trainer_id", trainerId)
        .eq("gym_id", selectedGym.id)
        .order("assigned_at", { ascending: false })
        .limit(15);

      // Get payments collected by this trainer
      const { data: paymentsCollected } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          created_at,
          members:member_id (full_name)
        `)
        .eq("gym_id", selectedGym.id)
        .eq("collected_by", trainerId)
        .order("created_at", { ascending: false })
        .limit(15);

      // Combine and sort activity
      const activity = [
        ...(dietAssignments?.map(d => ({
          id: `diet-${d.id}`,
          type: "diet",
          action: "Assigned diet plan",
          memberName: d.members?.full_name,
          details: d.diet_plans?.title,
          date: d.assigned_at
        })) || []),
        ...(workoutAssignments?.map(w => ({
          id: `workout-${w.id}`,
          type: "workout",
          action: "Assigned workout plan",
          memberName: w.members?.full_name,
          details: w.workout_plans?.title,
          date: w.assigned_at
        })) || []),
        ...(memberAssignments?.map(m => ({
          id: `member-${m.id}`,
          type: "member_assignment",
          action: m.is_active ? "Member assigned" : "Member unassigned",
          memberName: m.members?.full_name,
          details: null,
          date: m.assigned_at
        })) || []),
        ...(paymentsCollected?.map(p => ({
          id: `payment-${p.id}`,
          type: "payment",
          action: "Collected payment",
          memberName: p.members?.full_name,
          details: `₹${parseFloat(p.amount).toLocaleString("en-IN")}`,
          date: p.created_at
        })) || [])
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setActivityLog(activity.slice(0, 20));
    } catch (err) {
      console.error("Error fetching trainer details:", err);
    } finally {
      setLoading(false);
    }
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
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <Users className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">{assignedMembers.length}</p>
            <p className="text-xs text-gray-500">Members</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <Apple className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">
              {activityLog.filter(a => a.type === "diet").length}
            </p>
            <p className="text-xs text-gray-500">Diet Plans</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <Dumbbell className="w-6 h-6 text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-gray-900">
              {activityLog.filter(a => a.type === "workout").length}
            </p>
            <p className="text-xs text-gray-500">Workouts</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("members")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "members"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveTab("credentials")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "credentials"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Credentials
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "activity"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Activity
          </button>
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
                  
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Assigned {formatTimeAgo(member.assignedAt)}
                  </div>
                </div>
              ))
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
