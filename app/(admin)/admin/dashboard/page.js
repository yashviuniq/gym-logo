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
            dueDate: "Overdue", // You can calculate this based on membership end date
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Show gym selection if no gym is selected or multiple gyms available
  if (!selectedGym && gyms.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Select Gym" showBack={false} />
        <main className="px-4 py-6 space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Welcome, {user?.name}! 👋</h2>
            <p className="text-gray-500 text-sm mt-1">Select a gym to manage</p>
          </div>
          <div className="space-y-3">
            {gyms.map((gym) => (
              <button
                key={gym.id}
                onClick={() => handleSelectGym(gym)}
                className="w-full p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#F97316] transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#F97316]/10 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🏋️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{gym.name}</h3>
                    <p className="text-sm text-gray-500">{gym.address || "No address"}</p>
                  </div>
                  <span className="text-gray-400">→</span>
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
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Dashboard" showBack={false} />
        <main className="px-4 py-6">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🏢</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Gym Assigned</h2>
            <p className="text-gray-500 text-sm">
              Please contact the administrator to assign a gym to your account.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page pb-24">
      <Header title="Dashboard" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Welcome & Gym Info */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Welcome back! 👋</h2>
            <p className="text-gray-500 text-sm">Here's your gym overview</p>
          </div>
          {gyms.length > 1 && (
            <button
              onClick={() => setSelectedGym(null)}
              className="text-xs text-[#F97316] font-medium px-3 py-1.5 bg-[#F97316]/10 rounded-lg hover:bg-[#F97316]/20 transition"
            >
              Switch Gym
            </button>
          )}
        </div>

        {/* Current Gym Card */}
        <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-xl">🏋️</span>
            </div>
            <div>
              <p className="text-white/80 text-xs">Managing</p>
              <h3 className="font-bold text-lg">{selectedGym?.name}</h3>
            </div>
          </div>
        </div>

        {/* KPI Cards - Row 1 */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            title="Total Members"
            value={dashboardData.totalMembers}
            icon="👥"
            onClick={() => router.push("/members")}
          />
          <KPICard
            title="Active"
            value={dashboardData.activeMembers}
            icon="✅"
            color="green"
            onClick={() => router.push("/members?filter=active")}
          />
          <KPICard
            title="Expired"
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
            onClick={() => router.push("/attendance")}
          />
        </div>

        {/* Revenue Card */}
        <Card variant="dark" padding="md" className="card-dark">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-300 text-sm">Monthly Revenue</p>
              <p className="text-3xl font-bold text-white">
                ₹{(dashboardData.monthlyRevenue / 1000).toFixed(1)}K
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-300 text-sm">Pending Dues</p>
              <p className="text-xl font-semibold text-[#F97316]">
                ₹{(dashboardData.pendingDues / 1000).toFixed(1)}K
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/finance")}
            className="w-full py-2.5 btn-gradient-orange rounded-lg text-sm font-semibold text-white"
          >
            View Finance →
          </button>
        </Card>

        {/* Quick Actions */}
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Add Member", icon: "➕", href: "/members/add" },
              { label: "Attendance", icon: "✅", href: "/attendance" },
              { label: "Payment", icon: "💳", href: "/finance" },
              { label: "Reports", icon: "📊", href: "/analytics" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="flex flex-col items-center p-3 rounded-xl hover:bg-[#F97316]/10 transition-all border border-transparent hover:border-[#F97316]/20"
              >
                <span className="text-2xl mb-1">{action.icon}</span>
                <span className="text-xs text-gray-600 font-medium">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* Today's Attendance */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Today's Check-ins</h3>
            <button
              onClick={() => router.push("/attendance")}
              className="text-sm text-[#F97316] font-medium hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {todayAttendanceList.length > 0 ? (
              todayAttendanceList.map((member) => (
                <div
                  key={member.id}
                  className="p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500">{member.checkIn}</p>
                    </div>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${member.status === "active" ? "bg-green-500" : "bg-gray-300"
                      }`}
                  ></span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">
                No check-ins today
              </div>
            )}
          </div>
        </Card>

        {/* Pending Payments */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Pending Payments</h3>
            <button
              onClick={() => router.push("/finance")}
              className="text-sm text-[#F97316] font-medium hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingPayments.length > 0 ? (
              pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.dueDate}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-500">
                    ₹{payment.amount}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">
                No pending payments
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span>{activity.icon}</span>
                    <span className="text-sm text-gray-700">{activity.text}</span>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-gray-500 text-sm">
                No recent activity
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, icon, color = "gray", onClick }) {
  const colorClasses = {
    gray: "bg-white border-gray-200",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
    blue: "bg-blue-50 border-blue-200",
  };

  const valueColors = {
    gray: "text-gray-900",
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} rounded-xl p-4 border shadow-sm text-left w-full hover:shadow-md transition-all hover:scale-[1.02]`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColors[color]}`}>{value}</p>
      <p className="text-xs text-gray-600 font-medium">{title}</p>
    </button>
  );
}
