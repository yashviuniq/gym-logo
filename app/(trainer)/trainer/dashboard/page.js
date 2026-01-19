"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import {
  Users,
  Dumbbell,
  Apple,
  CalendarCheck,
  TrendingUp,
  ChevronRight,
  User,
  Clock,
  Activity,
  Bell,
  IndianRupee
} from "lucide-react";

export default function TrainerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);
  const [stats, setStats] = useState({
    assignedMembers: 0,
    dietPlans: 0,
    workoutPlans: 0,
    todayAttendance: 0
  });
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentCollections, setRecentCollections] = useState([]);
  const [collectionsStats, setCollectionsStats] = useState({ totalCollected: 0, collectionsCount: 0 });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        
        if (!authData?.user || authData.user.role !== "trainer") {
          router.push("/auth/login");
          return;
        }

        setUser(authData.user);

        // Get trainer's profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authData.user.id)
          .single();

        if (profileData) {
          setTrainer(profileData);
        }

        // Get gym association
        const { data: gymTrainerData } = await supabase
          .from("gym_trainers")
          .select(`
            gym_id,
            gyms:gym_id (
              id,
              name,
              address
            )
          `)
          .eq("profile_id", authData.user.id)
          .eq("is_active", true)
          .single();

        if (gymTrainerData?.gyms) {
          setSelectedGym(gymTrainerData.gyms);
          localStorage.setItem("selectedGym", JSON.stringify(gymTrainerData.gyms));
          await fetchDashboardData(gymTrainerData.gyms.id, authData.user.id);
        }
      } catch (err) {
        console.error("Error initializing:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const fetchDashboardData = async (gymId, trainerId) => {
    try {
      // Get assigned members count
      const { data: assignments, count: membersCount } = await supabase
        .from("trainer_member_assignments")
        .select("member_id, members:member_id(id, full_name, phone, profile_image)", { count: "exact" })
        .eq("gym_id", gymId)
        .eq("trainer_id", trainerId)
        .eq("is_active", true)
        .limit(5);

      // Get diet plans count
      const { count: dietsCount } = await supabase
        .from("diet_plans")
        .select("*", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("trainer_id", trainerId);

      // Get workout plans count
      const { count: workoutsCount } = await supabase
        .from("workout_plans")
        .select("*", { count: "exact", head: true })
        .eq("gym_id", gymId)
        .eq("trainer_id", trainerId);

      // Get today's attendance for assigned members
      const assignedMemberIds = assignments?.map(a => a.member_id) || [];
      let todayAttendance = 0;

      if (assignedMemberIds.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const { count: attendanceCount } = await supabase
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("gym_id", gymId)
          .eq("check_in_date", today)
          .in("member_id", assignedMemberIds);

        todayAttendance = attendanceCount || 0;
      }

      setStats({
        assignedMembers: membersCount || 0,
        dietPlans: dietsCount || 0,
        workoutPlans: workoutsCount || 0,
        todayAttendance
      });

      // Recent members
      setRecentMembers(
        assignments?.slice(0, 5).map(a => ({
          id: a.member_id,
          name: a.members?.full_name,
          phone: a.members?.phone,
          profileImage: a.members?.profile_image
        })) || []
      );

      // Get recent activity (diet/workout assignments by this trainer)
      const { data: recentDiets } = await supabase
        .from("member_diets")
        .select(`
          id,
          assigned_at,
          members:member_id (full_name),
          diet_plans:diet_plan_id (title)
        `)
        .eq("assigned_by_trainer_id", trainerId)
        .order("assigned_at", { ascending: false })
        .limit(5);

      const { data: recentWorkouts } = await supabase
        .from("member_workouts")
        .select(`
          id,
          assigned_at,
          members:member_id (full_name),
          workout_plans:workout_plan_id (title)
        `)
        .eq("assigned_by_trainer_id", trainerId)
        .order("assigned_at", { ascending: false })
        .limit(5);

      const activity = [
        ...(recentDiets?.map(d => ({
          id: `diet-${d.id}`,
          type: "diet",
          memberName: d.members?.full_name,
          planTitle: d.diet_plans?.title,
          date: d.assigned_at
        })) || []),
        ...(recentWorkouts?.map(w => ({
          id: `workout-${w.id}`,
          type: "workout",
          memberName: w.members?.full_name,
          planTitle: w.workout_plans?.title,
          date: w.assigned_at
        })) || [])
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

      setRecentActivity(activity);

      // Fetch trainer's payment collections
      const { data: collections } = await supabase
        .from("payments")
        .select("id, amount, created_at, payment_mode, members:member_id(full_name)")
        .eq("gym_id", gymId)
        .eq("collected_by", trainerId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (collections) {
        setRecentCollections(collections);
        const totalCollected = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
        setCollectionsStats({
          totalCollected,
          collectionsCount: collections.length
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
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
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Dashboard" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Trainer Dashboard" />

      <main className="px-4 py-4 space-y-4">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {trainer?.first_name?.charAt(0) || "T"}
            </div>
            <div>
              <h1 className="text-xl font-bold">
                Welcome, {trainer?.first_name || "Trainer"}!
              </h1>
              <p className="text-blue-100 text-sm">
                {selectedGym?.name || "Your Gym"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div 
            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/trainer/members")}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.assignedMembers}</p>
            <p className="text-sm text-gray-500">Assigned Members</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.todayAttendance}</p>
            <p className="text-sm text-gray-500">Today's Attendance</p>
          </div>

          <div 
            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/trainer/diet-plans")}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Apple className="w-5 h-5 text-green-600" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.dietPlans}</p>
            <p className="text-sm text-gray-500">Diet Plans</p>
          </div>

          <div 
            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push("/trainer/workout-plans")}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-orange-600" />
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.workoutPlans}</p>
            <p className="text-sm text-gray-500">Workout Plans</p>
          </div>

          {/* Collections Stats Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">₹{collectionsStats.totalCollected.toLocaleString("en-IN")}</p>
                <p className="text-sm text-gray-500">Total Collected</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">{collectionsStats.collectionsCount}</p>
                <p className="text-sm text-gray-500">Collections</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => router.push("/trainer/members")}
              className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
            >
              <Users className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">View Members</span>
            </button>
            <button
              onClick={() => router.push("/trainer/diet-plans")}
              className="flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
            >
              <Apple className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Create Diet</span>
            </button>
            <button
              onClick={() => router.push("/trainer/workout-plans")}
              className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
            >
              <Dumbbell className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Create Workout</span>
            </button>
            
          </div>
        </div>

        {/* Recent Members */}
        {recentMembers.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Your Members</h2>
              <button
                onClick={() => router.push("/trainer/members")}
                className="text-sm text-blue-600 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => router.push(`/trainer/members/${member.id}`)}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 -mx-2 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {member.profileImage ? (
                      <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.phone}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === "diet" ? "bg-green-100" : "bg-orange-100"
                  }`}>
                    {activity.type === "diet" ? (
                      <Apple className="w-4 h-4 text-green-600" />
                    ) : (
                      <Dumbbell className="w-4 h-4 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      Assigned <span className="font-medium">{activity.planTitle}</span> to{" "}
                      <span className="font-medium">{activity.memberName}</span>
                    </p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(activity.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Collections */}
        {recentCollections.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">My Collections</h2>
            <div className="space-y-3">
              {recentCollections.map((collection) => (
                <div key={collection.id} className="flex items-center gap-3 p-2 -mx-2 rounded-lg bg-gray-50">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <IndianRupee className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      ₹{collection.amount?.toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-gray-500">
                      From {collection.members?.full_name || "Unknown"} • {collection.payment_mode || "Cash"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatTimeAgo(collection.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
