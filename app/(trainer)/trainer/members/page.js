"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import {
  Users,
  Search,
  User,
  Phone,
  ChevronRight,
  Calendar,
  Dumbbell,
  Apple,
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";

export default function TrainerMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [trainerId, setTrainerId] = useState(null);
  const [gymId, setGymId] = useState(null);

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

        if (gymTrainerData) {
          setGymId(gymTrainerData.gym_id);
          await fetchMembers(gymTrainerData.gym_id, authData.user.id);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const fetchMembers = async (gymId, trainerId) => {
    try {
      // Get assigned members with their details
      const { data: assignmentsData, error } = await supabase
        .from("trainer_member_assignments")
        .select(`
          id,
          member_id,
          assigned_at,
          members:member_id (
            id,
            full_name,
            phone,
            profile_image,
            memberships (
              status,
              end_date,
              membership_plans (name)
            )
          )
        `)
        .eq("gym_id", gymId)
        .eq("trainer_id", trainerId)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      // Get diet and workout counts for each member
      const memberIds = assignmentsData?.map(a => a.member_id) || [];
      
      let dietCounts = {};
      let workoutCounts = {};
      let attendanceCounts = {};

      if (memberIds.length > 0) {
        // Diet plans assigned by this trainer
        const { data: dietData } = await supabase
          .from("member_diets")
          .select("member_id")
          .in("member_id", memberIds)
          .eq("assigned_by_trainer_id", trainerId);

        dietData?.forEach(d => {
          dietCounts[d.member_id] = (dietCounts[d.member_id] || 0) + 1;
        });

        // Workout plans assigned by this trainer
        const { data: workoutData } = await supabase
          .from("member_workouts")
          .select("member_id")
          .in("member_id", memberIds)
          .eq("assigned_by_trainer_id", trainerId);

        workoutData?.forEach(w => {
          workoutCounts[w.member_id] = (workoutCounts[w.member_id] || 0) + 1;
        });

        // This month's attendance
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const startDate = startOfMonth.toISOString().split("T")[0];

        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("member_id")
          .eq("gym_id", gymId)
          .in("member_id", memberIds)
          .gte("check_in_date", startDate);

        attendanceData?.forEach(a => {
          attendanceCounts[a.member_id] = (attendanceCounts[a.member_id] || 0) + 1;
        });
      }

      // Map members with enriched data
      const enrichedMembers = assignmentsData?.map(a => {
        const activeMembership = a.members?.memberships?.find(m => m.status === "active") 
          || a.members?.memberships?.[0];
        
        let membershipStatus = "inactive";
        let daysRemaining = null;

        if (activeMembership) {
          const endDate = new Date(activeMembership.end_date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          
          daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysRemaining >= 0 && activeMembership.status === "active") {
            membershipStatus = "active";
          } else {
            membershipStatus = "expired";
          }
        }

        return {
          id: a.member_id,
          assignmentId: a.id,
          name: a.members?.full_name,
          phone: a.members?.phone,
          profileImage: a.members?.profile_image,
          assignedAt: a.assigned_at,
          membershipStatus,
          planName: activeMembership?.membership_plans?.name || "No Plan",
          daysRemaining,
          dietPlans: dietCounts[a.member_id] || 0,
          workoutPlans: workoutCounts[a.member_id] || 0,
          monthlyAttendance: attendanceCounts[a.member_id] || 0
        };
      }) || [];

      setMembers(enrichedMembers);
    } catch (err) {
      console.error("Error fetching members:", err);
    }
  };

  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery);
    
    const matchesFilter = 
      filterStatus === "all" || 
      member.membershipStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: members.length,
    active: members.filter(m => m.membershipStatus === "active").length,
    expired: members.filter(m => m.membershipStatus === "expired").length
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="My Members" />

      <main className="px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-xl font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-xl font-bold text-red-600">{stats.expired}</p>
            <p className="text-xs text-gray-500">Expired</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Members List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">
              {searchQuery ? "No members found" : "No members assigned"}
            </h3>
            <p className="text-gray-500 text-sm">
              {searchQuery 
                ? "Try a different search term" 
                : "Members will appear here when admin assigns them to you"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                onClick={() => router.push(`/trainer/members/${member.id}`)}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {member.profileImage ? (
                      <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {member.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        member.membershipStatus === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {member.membershipStatus}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <Phone className="w-3 h-3" />
                      <span>{member.phone}</span>
                      {member.daysRemaining !== null && (
                        <>
                          <span className="text-gray-300">•</span>
                          <Calendar className="w-3 h-3" />
                          <span className={member.daysRemaining <= 7 ? "text-amber-600 font-medium" : ""}>
                            {member.daysRemaining > 0 
                              ? `${member.daysRemaining} days left` 
                              : "Expired"}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Stats Row */}
                    <div className="flex gap-4 text-xs">
                      <div className="flex items-center gap-1 text-green-600">
                        <Apple className="w-3 h-3" />
                        <span>{member.dietPlans} diet{member.dietPlans !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-1 text-orange-600">
                        <Dumbbell className="w-3 h-3" />
                        <span>{member.workoutPlans} workout{member.workoutPlans !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>{member.monthlyAttendance} this month</span>
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
