"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gyms, setGyms] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    todayAttendance: 0,
    monthlyRevenue: 0,
    pendingDues: 0,
  });
  const [todayAttendanceList, setTodayAttendanceList] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const userRole = data.user?.role;
      // Allow owner, admin, and trainer roles
      if (!data.user || !["owner", "admin", "trainer"].includes(userRole)) {
        router.push("/auth/login");
        return;
      }
      setUser(data.user);
      setLoading(false);

      // Fetch gyms assigned to this admin
      await fetchGyms(data.user.id);
    };
    checkAuth();
  }, [router]);

  const fetchGyms = async (userId) => {
    setLoadingGyms(true);
    try {
      const { data: gymsData, error } = await supabase
        .from("gyms")
        .select("id, name, address, timezone, created_at")
        .eq("owner_id", userId);

      if (error) {
        console.error("Error fetching gyms:", error);
        setGyms([]);
      } else {
        setGyms(gymsData || []);
        // Auto-select if only one gym
        if (gymsData?.length === 1) {
          setSelectedGym(gymsData[0]);
          localStorage.setItem("selectedGym", JSON.stringify(gymsData[0]));
          // Fetch dashboard data for the auto-selected gym
          fetchDashboardData(gymsData[0].id);
        } else {
          // Check if there's a previously selected gym
          const stored = localStorage.getItem("selectedGym");
          if (stored) {
            const storedGym = JSON.parse(stored);
            const found = gymsData?.find((g) => g.id === storedGym.id);
            if (found) {
              setSelectedGym(found);
              // Fetch dashboard data for the stored gym
              fetchDashboardData(found.id);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setGyms([]);
    }
    setLoadingGyms(false);
  };

  const handleSelectGym = (gym) => {
    setSelectedGym(gym);
    localStorage.setItem("selectedGym", JSON.stringify(gym));
    // Fetch dashboard data for the selected gym
    fetchDashboardData(gym.id);
  };

  const fetchDashboardData = async (gymId) => {
    try {
      // Fetch members data
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          balance,
          created_at,
          memberships (
            id,
            status,
            end_date,
            membership_plans (price)
          )
        `)
        .eq("gym_id", gymId);

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: attendance, error: attendanceError } = await supabase
        .from("attendance")
        .select(`
          id,
          check_in_time,
          check_out_time,
          members (full_name)
        `)
        .eq("gym_id", gymId)
        .eq("check_in_date", today)
        .order("check_in_time", { ascending: false });

      // Fetch recent payments for monthly revenue
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("gym_id", gymId)
        .eq("status", "paid")
        .gte("created_at", firstDayOfMonth.toISOString())
        .order("created_at", { ascending: false });

      if (!membersError && members) {
        // Calculate member statistics
        let activeMembers = 0;
        let expiredMembers = 0;
        let totalRevenue = 0;
        let pendingDues = 0;

        members.forEach((member) => {
          const activeMembership = member.memberships?.find(m => m.status === "active");
          if (activeMembership) {
            const endDate = new Date(activeMembership.end_date);
            const today = new Date();
            if (endDate > today) {
              activeMembers++;
            } else {
              expiredMembers++;
            }
          }
          
          if (member.balance > 0) {
            pendingDues += member.balance;
          }
        });

        // Calculate monthly revenue
        if (payments && !paymentsError) {
          totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
        }

        setDashboardData({
          totalMembers: members.length,
          activeMembers,
          expiredMembers,
          todayAttendance: attendance?.length || 0,
          monthlyRevenue: totalRevenue,
          pendingDues,
        });
      }

      // Set today's attendance list
      if (attendance && !attendanceError) {
        setTodayAttendanceList(
          attendance.slice(0, 5).map((att) => ({
            id: att.id,
            name: att.members?.full_name || "Unknown",
            checkIn: new Date(`1970-01-01T${att.check_in_time}`).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }),
            status: att.check_out_time ? "left" : "active",
          }))
        );
      }

      // Set pending payments (members with positive balance)
      if (members && !membersError) {
        const membersDue = members
          .filter((m) => m.balance > 0)
          .sort((a, b) => b.balance - a.balance)
          .slice(0, 5)
          .map((member) => ({
            id: member.id,
            name: member.full_name,
            amount: member.balance,
            dueDate: "Overdue",
          }));
        setPendingPayments(membersDue);
      }

      // Create recent activity from attendance and payments
      let activities = [];
      
      // Add recent check-ins
      if (attendance && !attendanceError) {
        activities = activities.concat(
          attendance.slice(0, 3).map((att) => ({
            id: `att_${att.id}`,
            type: "attendance",
            text: `${att.members?.full_name || "Member"} checked ${att.check_out_time ? "out" : "in"}`,
            time: "Today",
            icon: att.check_out_time ? "🔴" : "🟢",
          }))
        );
      }

      // Add recent new members
      const recentMembers = members
        ?.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 2);
      
      if (recentMembers) {
        activities = activities.concat(
          recentMembers.map((member) => ({
            id: `member_${member.id}`,
            type: "member",
            text: `New member: ${member.full_name}`,
            time: new Date(member.created_at).toLocaleDateString(),
            icon: "🆕",
          }))
        );
      }

      setRecentActivity(activities.slice(0, 5));

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  if (loading || loadingGyms) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 text-gray-600 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  // Show gym selection if no gym is selected or multiple gyms available
  if (!selectedGym && gyms.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
        <Header title="Select Gym" showBack={false} />
        <main className="px-4 py-6 space-y-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white">🏋️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome, {user?.name || "Admin"}! 👋</h2>
            <p className="text-gray-500 text-sm mt-2">Select a gym to manage</p>
          </div>
          <div className="space-y-4">
            {gyms.map((gym) => (
              <button
                key={gym.id}
                onClick={() => handleSelectGym(gym)}
                className="w-full p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-orange-400 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                    <span className="text-xl text-white">🏢</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{gym.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{gym.address || "No address"}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {gym.timezone || "UTC"}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
                    <span className="text-lg">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // No gyms assigned
  if (gyms.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
        <Header title="Dashboard" showBack={false} />
        <main className="px-4 py-6">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-white">🏢</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Gym Assigned</h2>
            <p className="text-gray-500 max-w-sm mx-auto mb-8">
              Please contact the administrator to assign a gym to your account.
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24">
      <Header title="Dashboard" showBack={false} />

      <main className="px-4 py-4 space-y-6">
        {/* Welcome & Gym Info */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back! 👋</h1>
            <p className="text-gray-500 text-sm mt-1">Here's your gym overview</p>
          </div>
          {gyms.length > 1 && (
            <button
              onClick={() => setSelectedGym(null)}
              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
            >
              Switch Gym
            </button>
          )}
        </div>

        {/* Current Gym Card */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl">🏋️</span>
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Managing</p>
                <h3 className="font-bold text-xl">{selectedGym?.name}</h3>
                <p className="text-white/80 text-sm mt-1">{selectedGym?.address}</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-white/80 text-sm">Performance</p>
              <div className="flex items-center justify-end gap-2 mt-2">
                <span className="text-xl font-bold">+24%</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <KPICard
            title="Total Members"
            value={dashboardData.totalMembers}
            icon="👥"
            trend="+12%"
            onClick={() => router.push("/members")}
          />
          <KPICard
            title="Active Members"
            value={dashboardData.activeMembers}
            icon="✅"
            color="green"
            trend="+5%"
            onClick={() => router.push("/members?filter=active")}
          />
          <KPICard
            title="Expired Members"
            value={dashboardData.expiredMembers}
            icon="⚠️"
            color="red"
            onClick={() => router.push("/members?filter=expired")}
          />
          <KPICard
            title="Today's Attendance"
            value={dashboardData.todayAttendance}
            icon="📋"
            color="blue"
            trend="+18%"
            onClick={() => router.push("/attendance")}
          />
        </div>

        {/* Revenue Card */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-300 text-sm font-medium">Monthly Revenue</p>
              <p className="text-3xl font-bold text-white mt-1">
                ₹{(dashboardData.monthlyRevenue / 1000).toFixed(1)}K
              </p>
              <p className="text-green-400 text-xs font-medium mt-2">+32% from last month</p>
            </div>
            <div className="text-right">
              <p className="text-gray-300 text-sm font-medium">Pending Dues</p>
              <p className="text-2xl font-bold text-orange-400 mt-1">
                ₹{(dashboardData.pendingDues / 1000).toFixed(1)}K
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/finance")}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
          >
            View Finance Dashboard →
          </button>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
            <button className="text-sm text-orange-600 font-medium hover:text-orange-700 transition-colors">
              View all →
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Add Member", icon: "➕", href: "/members/add" },
              { label: "Attendance", icon: "✅", href: "/attendance" },
              { label: "Payment", icon: "💳", href: "/finance" },
              { label: "Reports", icon: "📊", href: "/analytics" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all hover:scale-[1.02]"
              >
                <span className="text-3xl mb-2">{action.icon}</span>
                <span className="text-sm text-gray-700 font-medium">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Today's Attendance & Pending Payments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Attendance */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-gray-900">Today's Check-ins</h3>
                <p className="text-sm text-gray-500 mt-1">{dashboardData.todayAttendance} members</p>
              </div>
              <button
                onClick={() => router.push("/attendance")}
                className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {todayAttendanceList.length > 0 ? (
                todayAttendanceList.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"}`}>
                        <span className="text-sm font-bold">{member.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.name}
                        </p>
                        <p className="text-xs text-gray-500">{member.checkIn}</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${member.status === "active" ? "bg-green-500" : "bg-gray-300"}`}></div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">📋</span>
                  </div>
                  <p className="text-gray-500">No check-ins today</p>
                </div>
              )}
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-gray-900">Pending Payments</h3>
                <p className="text-sm text-gray-500 mt-1">Total: ₹{dashboardData.pendingDues.toLocaleString()}</p>
              </div>
              <button
                onClick={() => router.push("/finance")}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                Collect All
              </button>
            </div>
            <div className="space-y-4">
              {pendingPayments.length > 0 ? (
                pendingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {payment.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.dueDate}
                      </p>
                    </div>
                    <span className="font-semibold text-red-600">
                      ₹{payment.amount}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">💳</span>
                  </div>
                  <p className="text-gray-500">No pending payments</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900">Recent Activity</h3>
            <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              View all →
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">{activity.icon}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time === "Today" ? "Just now" : activity.time}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">📊</span>
                </div>
                <p className="text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Enhanced KPI Card Component
function KPICard({ title, value, icon, color = "gray", trend, onClick }) {
  const colorClasses = {
    gray: "bg-white border-gray-200",
    green: "bg-gradient-to-br from-green-50 to-green-100 border-green-200",
    red: "bg-gradient-to-br from-red-50 to-red-100 border-red-200",
    blue: "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200",
    orange: "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200",
  };

  const valueColors = {
    gray: "text-gray-900",
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
  };

  const iconBgColors = {
    gray: "bg-gray-100",
    green: "bg-green-100",
    red: "bg-red-100",
    blue: "bg-blue-100",
    orange: "bg-orange-100",
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} rounded-2xl p-5 border shadow-sm text-left w-full hover:shadow-md transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${iconBgColors[color]} rounded-xl flex items-center justify-center`}>
          <span className="text-xl">{icon}</span>
        </div>
        {trend && (
          <span className="text-xs font-medium bg-white px-3 py-1 rounded-full text-green-600 border border-green-200">
            {trend}
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold ${valueColors[color]}`}>{value}</p>
      <p className="text-sm text-gray-600 font-medium mt-2">{title}</p>
    </button>
  );
}