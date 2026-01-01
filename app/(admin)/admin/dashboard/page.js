"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
  Building,
  ArrowRight,
  Plus,
  FileText,
  BarChart3,
  CreditCard,
  UserPlus,
  ChevronRight,
  Activity,
  MoreVertical,
  Bell,
  Search
} from "lucide-react";

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

  // Your existing logic remains exactly the same
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      const userRole = data.user?.role;
      if (!data.user || !["owner", "admin", "trainer"].includes(userRole)) {
        router.push("/auth/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
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
        if (gymsData?.length === 1) {
          setSelectedGym(gymsData[0]);
          localStorage.setItem("selectedGym", JSON.stringify(gymsData[0]));
          fetchDashboardData(gymsData[0].id);
        } else {
          const stored = localStorage.getItem("selectedGym");
          if (stored) {
            const storedGym = JSON.parse(stored);
            const found = gymsData?.find((g) => g.id === storedGym.id);
            if (found) {
              setSelectedGym(found);
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
    fetchDashboardData(gym.id);
  };

  const fetchDashboardData = async (gymId) => {
    try {
      // Your existing fetch logic remains exactly the same
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

      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount")
        .eq("gym_id", gymId)
        .gte("created_at", firstDayOfMonth.toISOString())
        .order("created_at", { ascending: false });

      if (!membersError && members) {
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
            pendingDues += parseFloat(member.balance || 0);
          }
        });

        if (payments && !paymentsError) {
          totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
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

      let activities = [];
      
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom flex flex-col items-center justify-center px-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-14 h-14 border-4 border-transparent border-t-blue-500 rounded-full animate-spin animation-delay-200"></div>
        </div>
        <p className="mt-6 text-gray-600 font-medium text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  // Show gym selection if no gym is selected
  if (!selectedGym && gyms.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
        <Header title="Select Gym" showBack={false} />
        <main className="px-4 py-4 space-y-4">
          <div className="text-center mb-6 pt-2">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Building className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Welcome, {user?.name || "Admin"}! 👋
            </h2>
            <p className="text-gray-500 text-xs mt-1">Select a gym to manage</p>
          </div>
          <div className="space-y-3">
            {gyms.map((gym) => (
              <button
                key={gym.id}
                onClick={() => handleSelectGym(gym)}
                className="w-full p-4 bg-white rounded-xl border border-gray-200 shadow-sm active:scale-95 active:shadow-none transition-all text-left active:bg-gray-50"
                style={{ minHeight: '72px' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base truncate">{gym.name}</h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{gym.address || "No address"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {gym.timezone || "UTC"}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-4 h-4" />
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
        <Header title="Dashboard" showBack={false} />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Building className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No Gym Assigned</h2>
            <p className="text-gray-500 text-sm mb-6 px-4">
              Please contact the administrator to assign a gym to your account.
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              style={{ minHeight: '44px' }}
            >
              Refresh Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
      <Header title="Dashboard" showBack={false} />

      <main className="px-3 py-2 space-y-4">
        {/* Welcome Section - Mobile Optimized */}
        <div className="flex items-start justify-between px-1">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              Welcome back, {user?.name?.split(' ')[0] || 'Admin'}! 👋
            </h1>
            <p className="text-xs text-gray-500 truncate">Here's your gym overview for today</p>
          </div>
          {gyms.length > 1 && (
            <button
              onClick={() => setSelectedGym(null)}
              className="px-3 py-1.5 bg-white border text-black border-gray-300 rounded-lg text-xs font-medium ml-2 active:scale-95 transition-transform flex-shrink-0"
              style={{ minHeight: '36px', minWidth: '36px' }}
            >
            
              Switch gym
            </button>
          )}
        </div>

        {/* Current Gym Card - Mobile Compact */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white mx-1">
         
          <div className="relative">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30 flex-shrink-0">
                <Building className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-blue-100 text-xs font-medium mb-0.5">Currently Managing</p>
                <h3 className="font-bold text-base truncate">{selectedGym?.name}</h3>
                <p className="text-blue-100 text-xs truncate mt-0.5">
                  {selectedGym?.address}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/20">
              <div className="text-left">
                <p className="text-blue-100 text-xs font-medium">Performance</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3.5 h-3.5 text-green-300" />
                  <span className="text-sm font-bold"></span>
                </div>
              </div>
              <div className="text-xs text-blue-100">this month</div>
            </div>
          </div>
        </div>

        {/* KPI Cards Grid - 2x2 on mobile */}
        <div className="grid grid-cols-2 gap-2 px-1">
          <MobileKPICard
            title="Total Members"
            value={dashboardData.totalMembers}
            icon={<Users className="w-4 h-4" />}
            color="blue"
            
            onClick={() => router.push("/members")}
          />
          <MobileKPICard
            title="Active"
            value={dashboardData.activeMembers}
            icon={<CheckCircle className="w-4 h-4" />}
            color="green"
          
            onClick={() => router.push("/members?filter=active")}
          />
          <MobileKPICard
            title="Expired"
            value={dashboardData.expiredMembers}
            icon={<AlertTriangle className="w-4 h-4" />}
            color="amber"
            onClick={() => router.push("/members?filter=expired")}
          />
          <MobileKPICard
            title="Today"
            value={dashboardData.todayAttendance}
            icon={<Calendar className="w-4 h-4" />}
            color="indigo"
            
            onClick={() => router.push("/attendance")}
          />
        </div>

        {/* Revenue Card - Mobile Optimized */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white mx-1">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-300 text-xs font-medium mb-1">Monthly Revenue</p>
              <p className="text-2xl font-bold text-white">
                ₹{(dashboardData.monthlyRevenue / 1000).toFixed(1)}K
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <p className="text-green-400 text-xs font-medium"></p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 pl-3">
              <p className="text-gray-300 text-xs font-medium mb-1">Pending Dues</p>
              <p className="text-xl font-bold text-blue-400">
                ₹{(dashboardData.pendingDues / 1000).toFixed(1)}K
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push("/finance")}
            className="w-full py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg font-medium active:bg-white/20 transition-colors text-sm"
            style={{ minHeight: '44px' }}
          >
            <div className="flex items-center justify-center gap-2">
              <DollarSign className="w-4 h-4" />
              View Finance Dashboard
            </div>
          </button>
        </div>

        {/* Quick Actions - Horizontal Scroll on Mobile */}
        <div className="bg-white rounded-xl p-3 mx-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
            <button className="text-xs text-blue-600 font-medium active:text-blue-700 transition-colors">
              View all →
            </button>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {[
              { label: "Add Member", icon: <UserPlus className="w-4 h-4" />, href: "/members/add", color: "bg-blue-500" },
              { label: "Attendance", icon: <CheckCircle className="w-4 h-4" />, href: "/attendance", color: "bg-green-500" },
              { label: "Payment", icon: <CreditCard className="w-4 h-4" />, href: "/finance", color: "bg-indigo-500" },
              { label: "Members", icon: <Users className="w-4 h-4" />, href: "/members", color: "bg-blue-600" }
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="flex-shrink-0 w-20 flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 active:bg-gray-100 active:scale-95 transition-all"
                style={{ minHeight: '72px' }}
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-2`}>
                  <div className="text-white">
                    {action.icon}
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight px-1">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Attendance & Payments - Stacked on Mobile */}
        <div className="space-y-3 px-1">
          {/* Today's Attendance */}
          <div className="bg-white rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Today's Check-ins</h3>
                  <p className="text-xs text-gray-500">{dashboardData.todayAttendance} members</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/attendance")}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium active:bg-indigo-100 transition-colors"
                style={{ minHeight: '32px' }}
              >
                View All
              </button>
            </div>
            <div className="space-y-2">
              {todayAttendanceList.length > 0 ? (
                todayAttendanceList.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 active:bg-gray-50 rounded-lg"
                    style={{ minHeight: '52px' }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        member.status === "active" 
                          ? "bg-green-100 text-green-600" 
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        <span className="text-xs font-bold">{member.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-500">{member.checkIn}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${
                        member.status === "active" ? "bg-green-500 animate-pulse" : "bg-gray-300"
                      }`}></div>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {member.status === "active" ? "Active" : "Left"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No check-ins today</p>
                  <button
                    onClick={() => router.push("/attendance/manual")}
                    className="mt-2 text-xs text-blue-600 active:text-blue-700 font-medium"
                  >
                    Take manual attendance
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Pending Payments</h3>
                  <p className="text-xs text-gray-500">Total: ₹{dashboardData.pendingDues.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/finance")}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform"
                style={{ minHeight: '32px' }}
              >
                Collect All
              </button>
            </div>
            <div className="space-y-2">
              {pendingPayments.length > 0 ? (
                pendingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-2 active:bg-gray-50 rounded-lg"
                    style={{ minHeight: '52px' }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-red-600">₹</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{payment.name}</p>
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                          Overdue
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <p className="text-sm font-semibold text-red-600">₹{payment.amount}</p>
                      <button className="text-xs text-blue-600 active:text-blue-700 font-medium">
                        Collect →
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-gray-500 text-sm">All payments up to date!</p>
                  <p className="text-xs text-gray-400 mt-0.5">Great job managing finances</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-3 mx-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
            </div>
            <button className="text-xs text-gray-500 active:text-gray-700 transition-colors">
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-2"
                  style={{ minHeight: '52px' }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      activity.type === "attendance" 
                        ? "bg-green-100" 
                        : "bg-blue-100"
                    }`}>
                      <span className="text-sm">{activity.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.text}</p>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 pl-2">
                    {activity.time === "Today" ? "Just now" : activity.time}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <Activity className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Mobile-optimized KPI Card Component
function MobileKPICard({ title, value, icon, color = "blue", trend, onClick }) {
  const colorConfig = {
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100",
      border: "border-blue-200",
      text: "text-blue-900",
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      iconColor: "text-white",
      trendBg: "bg-blue-100 text-blue-600"
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-green-100",
      border: "border-green-200",
      text: "text-green-900",
      iconBg: "bg-gradient-to-br from-green-500 to-green-600",
      iconColor: "text-white",
      trendBg: "bg-green-100 text-green-600"
    },
    amber: {
      bg: "bg-gradient-to-br from-amber-50 to-amber-100",
      border: "border-amber-200",
      text: "text-amber-900",
      iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
      iconColor: "text-white",
      trendBg: "bg-amber-100 text-amber-600"
    },
    indigo: {
      bg: "bg-gradient-to-br from-indigo-50 to-indigo-100",
      border: "border-indigo-200",
      text: "text-indigo-900",
      iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
      iconColor: "text-white",
      trendBg: "bg-indigo-100 text-indigo-600"
    }
  };

  const config = colorConfig[color] || colorConfig.blue;

  return (
    <button
      onClick={onClick}
      className={`${config.bg} ${config.border} rounded-xl p-3 border shadow-sm active:shadow-none text-left w-full active:scale-95 transition-transform`}
      style={{ minHeight: '100px' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${config.iconBg} rounded-xl flex items-center justify-center`}>
          <div className={config.iconColor}>
            {icon}
          </div>
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 ${config.trendBg} rounded-full`}>
            {trend}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${config.text} mb-1`}>{value}</p>
      <p className="text-xs font-medium text-gray-600 truncate">{title}</p>
    </button>
  );
}