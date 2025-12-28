"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";

const quickLinks = [
  { label: "Workout", icon: "💪", href: "/workout", color: "bg-blue-100" },
  { label: "Diet", icon: "🥗", href: "/diet", color: "bg-green-100" },
  {
    label: "Attendance",
    icon: "📅",
    href: "/my-attendance",
    color: "bg-purple-100",
  },
  { label: "Schedule", icon: "🗓️", href: "/schedule", color: "bg-orange-100" },
];

export default function CustomerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    name: "",
    membership: {
      plan: "Basic",
      daysLeft: 0,
      status: "expired",
    },
    todayWorkout: "No workout assigned",
    streak: 0,
    thisMonthAttendance: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Get logged-in member from localStorage
      const storedMember = localStorage.getItem("member");
      if (!storedMember) {
        router.push("/auth/login");
        return;
      }

      const member = JSON.parse(storedMember);
      
      // Fetch member details with membership info
      const { data: memberDetails, error: memberError } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          gym_id,
          balance,
          memberships (
            id,
            plan_id,
            start_date,
            end_date,
            status,
            membership_plans (
              name,
              duration_days
            )
          )
        `)
        .eq("id", member.id)
        .single();

      if (memberError) {
        console.error("Error fetching member details:", memberError);
        return;
      }

      setMemberData(memberDetails);

      // Calculate membership days left
      const activeMembership = memberDetails.memberships?.find(m => m.status === 'active');
      let daysLeft = 0;
      let membershipPlan = "No Plan";
      
      if (activeMembership) {
        const endDate = new Date(activeMembership.end_date);
        const today = new Date();
        daysLeft = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
        membershipPlan = activeMembership.membership_plans?.name || "Unknown Plan";
      }

      // Fetch attendance data for streak and monthly count
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("check_in_date")
        .eq("member_id", member.id)
        .order("check_in_date", { ascending: false })
        .limit(100);

      let streak = 0;
      let thisMonthAttendance = 0;

      if (!attendanceError && attendanceData) {
        // Calculate streak
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const sortedDates = attendanceData
          .map(a => new Date(a.check_in_date))
          .sort((a, b) => b - a);

        // Check if attended today or yesterday to start streak
        const latestAttendance = sortedDates[0];
        if (latestAttendance && 
            (latestAttendance.toDateString() === today.toDateString() || 
             latestAttendance.toDateString() === yesterday.toDateString())) {
          
          let currentDate = latestAttendance;
          let i = 0;
          
          while (i < sortedDates.length) {
            const attendanceDate = sortedDates[i];
            if (attendanceDate.toDateString() === currentDate.toDateString()) {
              streak++;
              currentDate = new Date(currentDate);
              currentDate.setDate(currentDate.getDate() - 1);
              i++;
            } else if (attendanceDate < currentDate) {
              break; // Gap in streak
            } else {
              i++;
            }
          }
        }

        // Calculate this month's attendance
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        thisMonthAttendance = attendanceData.filter(a => {
          const attendanceDate = new Date(a.check_in_date);
          return attendanceDate.getMonth() === currentMonth && 
                 attendanceDate.getFullYear() === currentYear;
        }).length;
      }

      // Fetch today's workout if assigned
      const today = new Date().toISOString().split('T')[0];
      const { data: todayWorkoutData, error: workoutError } = await supabase
        .from("member_workouts")
        .select(`
          workout_plans (
            title
          )
        `)
        .eq("member_id", member.id)
        .eq("assigned_date", today)
        .single();

      let todayWorkout = "No workout assigned";
      if (!workoutError && todayWorkoutData) {
        todayWorkout = todayWorkoutData.workout_plans?.title || "Workout Plan";
      }

      // Update dashboard data
      setDashboardData({
        name: memberDetails.full_name.split(' ')[0], // First name only
        membership: {
          plan: membershipPlan,
          daysLeft: daysLeft,
          status: activeMembership ? activeMembership.status : "expired",
        },
        todayWorkout: todayWorkout,
        streak: streak,
        thisMonthAttendance: thisMonthAttendance,
      });

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Home" showBack={false} />
        <div className="flex items-center justify-center mt-20">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Home" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Welcome */}
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Hey, {dashboardData.name}! 👋
          </h2>
          <p className="text-gray-500 text-sm">Let's crush your goals today</p>
        </div>

        {/* Membership Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-gray-300 text-sm">
                {dashboardData.membership.plan} Plan
              </p>
              <p className="text-2xl font-bold">
                {dashboardData.membership.daysLeft} days left
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              dashboardData.membership.status === 'active' 
                ? 'bg-green-500' 
                : dashboardData.membership.status === 'expired' 
                ? 'bg-red-500' 
                : 'bg-yellow-500'
            }`}>
              {dashboardData.membership.status === 'active' ? 'Active' :
               dashboardData.membership.status === 'expired' ? 'Expired' : 'Inactive'}
            </span>
          </div>
          <button
            onClick={() => router.push("/profile")}
            className="w-full py-2 bg-white/10 rounded-lg text-sm font-medium"
          >
            View Details →
          </button>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔥</span>
              <span className="text-sm text-gray-500">Streak</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {dashboardData.streak} days
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">📅</span>
              <span className="text-sm text-gray-500">This Month</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {dashboardData.thisMonthAttendance} days
            </p>
          </div>
        </div>

        {/* Today's Workout */}
        <div
          onClick={() => router.push("/workout")}
          className="bg-blue-50 rounded-xl p-4 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm">Today's Workout</p>
              <p className="text-lg font-bold text-blue-900">
                {dashboardData.todayWorkout}
              </p>
            </div>
            <span className="text-3xl">💪</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Access</h3>
          <div className="grid grid-cols-4 gap-2">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => router.push(link.href)}
                className={`${link.color} p-3 rounded-xl flex flex-col items-center gap-1`}
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="text-xs font-medium text-gray-700">
                  {link.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Knowledge Tip */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-semibold">Tip of the Day</p>
              <p className="text-sm text-purple-100">
                Drink at least 3L water daily for better performance.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
