"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import { DashboardPageSkeleton } from "@/components/shared/Skeleton";
import MessagingDashboard from "@/components/shared/MessagingDashboard";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useUserRole } from "@/lib/hooks/useUserRole";
import { hasPermission, PERMISSIONS } from "@/lib/constants/permissions";
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
  Search,
  X,
  XCircle,
  ClipboardList,
  UserCheck,
  MessageCircle,
  Download
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gyms, setGyms] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null);
  const [loadingGyms, setLoadingGyms] = useState(true);
  const { permissions } = usePermissions();
  const { canViewFinance, canCreateTrainer } = useUserRole();
  const [dataLoading, setDataLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalMembers: 0,
    activeMembers: 0,
    expiredMembers: 0,
    todayAttendance: 0,
    totalRevenue: 0,
    pendingDues: 0,
  });
  const [todayAttendanceList, setTodayAttendanceList] = useState([]);
  const [allTodayAttendance, setAllTodayAttendance] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [allPendingPayments, setAllPendingPayments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]); 
  const [allRecentActivity, setAllRecentActivity] = useState([]);
  const [exportingExcel, setExportingExcel] = useState(false);
  
  // Modal states
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  const hasFetchedRef = useRef(false);

  // Your existing logic remains exactly the same
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const checkAuth = async () => {
      // Check localStorage for admin/owner users (stored as 'gymUser')
      const storedUser = localStorage.getItem("gymUser");
      
      if (storedUser) {
        // Admin/Owner logged in via localStorage
        const userData = JSON.parse(storedUser);
        if (["owner", "admin", "trainer"].includes(userData.role)) {
          setUser(userData);
          setLoading(false);

          const storedGymRaw = localStorage.getItem("selectedGym");
          let storedGymData = null;
          if (storedGymRaw) {
            try {
              storedGymData = JSON.parse(storedGymRaw);
            } catch {
              localStorage.removeItem("selectedGym");
            }
          }

          console.log("[TenantCheck] user.gym_id:", userData.gym_id || null, "selectedGym.id:", storedGymData?.id || null);

          if (userData.gym_id && storedGymData?.id === userData.gym_id) {
            setGyms([storedGymData]);
            setSelectedGym(storedGymData);
            setLoadingGyms(false);
            fetchDashboardData(storedGymData.id);
            return;
          }

          if (storedGymData?.id && userData.gym_id && storedGymData.id !== userData.gym_id) {
            console.warn("[TenantCheck] Ignoring stale selectedGym because it does not match user.gym_id");
            localStorage.removeItem("selectedGym");
          }
          
          // For admin/owner/trainer with gym_id, fetch that specific gym
          if (userData.gym_id) {
            await fetchGymById(userData.gym_id);
          } else if (userData.role === "trainer") {
            // Trainer without gym_id in profile, fetch from gym_trainers table
            await fetchGymForTrainer(userData.id);
          } else if (userData.role === "owner") {
            // Owner without gym_id, fetch gyms by owner_id
            await fetchGyms(userData.id);
          } else {
            // Admin without gym_id and no stored gym
            setLoadingGyms(false);
            setDataLoading(false);
          }
          return;
        }
      }
      
      // Fallback: Check Supabase auth for trainer users
      const { data } = await supabase.auth.getUser();
      const userRole = data.user?.role;
      if (!data.user || !["owner", "admin", "trainer"].includes(userRole)) {
        router.push("/auth/login");
        return;
      }
      setUser(data.user);
      setLoading(false);
      setDataLoading(false);
      await fetchGyms(data.user.id);
    };
    checkAuth();
  }, [router]);

  const fetchGymById = async (gymId) => {
    setLoadingGyms(true);
    try {
      const { data: gymData, error } = await supabase
        .from("gyms")
        .select("id, name, address, timezone, created_at")
        .eq("id", gymId)
        .single();

      if (error) {
        console.error("Error fetching gym:", error);
        setGyms([]);
        setDataLoading(false);
      } else if (gymData) {
        setGyms([gymData]);
        setSelectedGym(gymData);
        localStorage.setItem("selectedGym", JSON.stringify(gymData));
        fetchDashboardData(gymData.id);
      } else {
        setDataLoading(false);
      }
    } catch (err) {
      console.error("Error:", err);
      setGyms([]);
      setDataLoading(false);
    }
    setLoadingGyms(false);
  };

  const fetchGymForTrainer = async (trainerId) => {
    setLoadingGyms(true);
    try {
      // Fetch gym from gym_trainers table
      const { data: trainerData, error } = await supabase
        .from("gym_trainers")
        .select(`
          gym_id,
          gyms (
            id,
            name,
            address,
            timezone,
            created_at
          )
        `)
        .eq("profile_id", trainerId)
        .single();

      if (error) {
        console.error("Error fetching trainer's gym:", error);
        setGyms([]);
        setDataLoading(false);
      } else if (trainerData?.gyms) {
        const gymData = trainerData.gyms;
        setGyms([gymData]);
        setSelectedGym(gymData);
        localStorage.setItem("selectedGym", JSON.stringify(gymData));
        fetchDashboardData(gymData.id);
      } else {
        setDataLoading(false);
      }
    } catch (err) {
      console.error("Error:", err);
      setGyms([]);
      setDataLoading(false);
    }
    setLoadingGyms(false);
  };

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
        setDataLoading(false);
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
            } else {
              setDataLoading(false);
            }
          } else {
            setDataLoading(false);
          }
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setGyms([]);
      setDataLoading(false);
    }
    setLoadingGyms(false);
  };

  const handleSelectGym = (gym) => {
    setSelectedGym(gym);
    localStorage.setItem("selectedGym", JSON.stringify(gym));
    fetchDashboardData(gym.id);
  };

  const fetchDashboardData = async (gymId) => {
    setDataLoading(true);
    try {
      let userId = user?.id || null;
      if (!userId) {
        const rawUser = localStorage.getItem("gymUser");
        if (rawUser) {
          try {
            userId = JSON.parse(rawUser).id || null;
          } catch {
            userId = null;
          }
        }
      }

      console.log("[TenantCheck] Dashboard API request userId:", userId, "requested gymId:", gymId);

      // Single RPC call replaces 3 separate queries
      // Use same-origin API proxy so backend can validate tenant isolation
      let result, rpcError;
      try {
        const res = await fetch('/api/dashboard/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_gym_id: gymId, p_user_id: userId }),
        });
        const json = await res.json();
        if (!res.ok) {
          rpcError = { message: json.error };
        } else {
          result = json.data;
        }
      } catch (apiErr) {
        rpcError = { message: apiErr?.message || "API request failed" };
      }

      if (rpcError || !result) {
        console.error("Error fetching dashboard data:", rpcError);
        setDataLoading(false);
        return;
      }

      const members = result.members || [];
      const attendance = result.attendance || [];
      const payments = result.payments || [];

      // Process members stats
      let activeMembers = 0;
      let expiredMembers = 0;
      let totalRevenue = 0;
      let pendingDues = 0;

      members.forEach((member) => {
        const activeMembership =
          member.memberships?.find((membership) => membership.status === "active") ||
          member.memberships?.[0];

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

        if (memberStatus === "active") {
          activeMembers++;
        } else if (memberStatus === "expired") {
          expiredMembers++;
        }
        
        if (member.balance > 0) {
          pendingDues += parseFloat(member.balance || 0);
        }
      });

      totalRevenue = parseFloat(result.overall_revenue || 0);
      if (!totalRevenue) {
        totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
      }

      setDashboardData({
        totalMembers: members.length,
        activeMembers,
        expiredMembers,
        todayAttendance: attendance.length,
        totalRevenue,
        pendingDues,
      });

      // Process attendance
      const formattedAttendance = attendance.map((att) => ({
        id: att.id,
        name: att.member_name || "Unknown",
        checkIn: new Date(`1970-01-01T${att.check_in_time}`).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        status: att.check_out_time ? "left" : "active",
        membershipStatus: att.membership_status || "ACTIVE",
      }));
      setAllTodayAttendance(formattedAttendance);
      setTodayAttendanceList(formattedAttendance.slice(0, 5));

      // Process pending payments (members with dues)
      const allMembersDue = members
        .filter((m) => m.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .map((member) => ({
          id: member.id,
          name: member.full_name,
          amount: member.balance,
          dueDate: "Overdue",
        }));
      setAllPendingPayments(allMembersDue);
      setPendingPayments(allMembersDue.slice(0, 5));

      // Build recent activity
      let activities = [];
      
      activities = activities.concat(
        attendance.map((att) => ({
          id: `att_${att.id}`,
          type: "attendance",
          text: `${att.member_name || "Member"} checked ${att.check_out_time ? "out" : "in"}`,
          time: "Today",
          icon: att.check_out_time ? "🔴" : "🟢",
        }))
      );

      const recentMembers = members
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);
      
      activities = activities.concat(
        recentMembers.map((member) => ({
          id: `member_${member.id}`,
          type: "member",
          text: `New member: ${member.full_name}`,
          time: new Date(member.created_at).toLocaleDateString(),
          icon: "🆕",
        }))
      );

      // Add recent payments to activities
      const recentPayments = payments.slice(0, 10);
      activities = activities.concat(
        recentPayments.map((payment) => {
          const memberName = payment.member_name || "Member";
          const amount = parseFloat(payment.amount || 0).toLocaleString();
          let text = `Payment of ₹${amount} from ${memberName}`;
          
          if (payment.collected_by && payment.collected_by_name) {
            text = `${payment.collected_by_name} collected ₹${amount} from ${memberName}`;
          }
          
          return {
            id: `payment_${payment.id}`,
            type: "payment",
            text,
            time: new Date(payment.created_at).toLocaleDateString(),
            icon: payment.collected_by ? "👨‍🏫" : "💰",
          };
        })
      );

      setAllRecentActivity(activities);
      setRecentActivity(activities.slice(0, 5));

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  const formatExportDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-GB").replace(/\//g, "-");
  };

  const formatExportMonth = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();
  };

  const handleExportWholeDashboardExcel = async () => {
    if (!selectedGym?.id || !selectedGym?.name) {
      alert("Please select a gym first");
      return;
    }

    setExportingExcel(true);
    try {
      const XLSX = await import("xlsx");

      const res = await fetch("/api/dashboard/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_gym_id: selectedGym.id }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to fetch export data");
      }

      const payload = json.data || {};
      const dashboard = payload.dashboard || {};
      const members = dashboard.members || [];
      const payments = payload.payments_export || dashboard.payments || [];
      const attendance = dashboard.attendance || [];
      const expenses = payload.expenses || [];
      const trainerAssignments = payload.trainer_assignments || [];
      const trainerEarnings = payload.trainer_earnings || [];
      const exportMembers = payload.members || [];
      const exportTrainers = payload.trainers || [];

      const memberNameById = exportMembers.reduce((acc, item) => {
        acc[item.id] = item.full_name || "Member";
        return acc;
      }, {});
      const trainerNameById = exportTrainers.reduce((acc, item) => {
        const fullName = `${item.first_name || ""} ${item.last_name || ""}`.trim();
        acc[item.id] = fullName || "Trainer";
        return acc;
      }, {});
      const earningsByAssignment = trainerEarnings.reduce((acc, item) => {
        if (!acc[item.assignment_id]) {
          acc[item.assignment_id] = [];
        }
        acc[item.assignment_id].push(item);
        return acc;
      }, {});

      const buildSheet = (title, headers, dataRows, colWidths, numericCols = []) => {
        const rows = [
          [title],
          ["Gym", selectedGym.name],
          ["Generated On", new Date().toLocaleString("en-IN")],
          [],
          headers,
          ...(dataRows.length ? dataRows : [headers.map((_, index) => (index === 0 ? "No records found" : ""))]),
        ];

        const sheet = XLSX.utils.aoa_to_sheet(rows);
        sheet["!cols"] = colWidths;

        const titleCell = sheet.A1;
        if (titleCell) {
          titleCell.s = {
            font: { bold: true, color: { rgb: "111827" }, sz: 13 },
            fill: { fgColor: { rgb: "FFF200" } },
            alignment: { horizontal: "left", vertical: "center" },
          };
        }

        const headerRow = 5;
        for (let c = 0; c < headers.length; c += 1) {
          const ref = XLSX.utils.encode_cell({ r: headerRow - 1, c });
          if (!sheet[ref]) continue;
          sheet[ref].s = {
            font: { bold: true, color: { rgb: "1F2937" }, sz: 11 },
            fill: { fgColor: { rgb: "DCEEFF" } },
            alignment: { horizontal: "center", vertical: "center" },
          };
        }

        for (let rowNum = 6; rowNum <= rows.length; rowNum += 1) {
          numericCols.forEach((colIndex) => {
            const ref = XLSX.utils.encode_cell({ r: rowNum - 1, c: colIndex });
            if (sheet[ref] && typeof sheet[ref].v === "number") {
              sheet[ref].z = "#,##0";
            }
          });
        }

        sheet["!autofilter"] = {
          ref: XLSX.utils.encode_range({
            s: { r: headerRow - 1, c: 0 },
            e: { r: Math.max(headerRow, rows.length) - 1, c: headers.length - 1 },
          }),
        };

        return sheet;
      };

      const totalMembers = members.length;
      const activeMembers = members.filter((member) =>
        member.memberships?.some((membership) => membership.status === "active")
      ).length;
      const totalRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const totalPending = members.reduce((sum, member) => sum + Number(member.balance || 0), 0);

      const summaryRows = [
        ["Total Members", totalMembers],
        ["Active Members", activeMembers],
        ["Today Attendance", attendance.length],
        ["Overall Revenue", totalRevenue],
        ["Pending Dues", totalPending],
      ];

      const admissionsRows = [...members]
        .sort((a, b) => new Date(a.join_date || a.created_at || 0) - new Date(b.join_date || b.created_at || 0))
        .map((member) => {
          const activeMembership = member.memberships?.[0] || null;
          const joinDate = member.join_date || member.created_at;
          const admissionType = (member.memberships?.length || 0) > 1 ? "Renewal" : "New Admission";
          const status = activeMembership?.status || "inactive";
          return [
            formatExportDate(joinDate),
            formatExportMonth(joinDate),
            member.full_name || "Member",
            member.phone || "",
            admissionType,
            String(status).toUpperCase(),
            Number(member.balance || 0),
          ];
        });

      const feeRows = [...payments]
        .sort((a, b) => new Date(a.paid_at || a.created_at) - new Date(b.paid_at || b.created_at))
        .map((payment) => {
          const date = payment.paid_at || payment.created_at;
          const paymentMode = String(payment.payment_mode || payment.mode || "cash").toUpperCase();
          const balance = Number(
            payment.remaining_amount ?? payment.member_balance ?? payment.balance ?? 0
          );
          return [
            formatExportDate(date),
            formatExportMonth(date),
            payment.member_name || "Member",
            Number(payment.amount || 0),
            paymentMode,
            balance,
          ];
        });

      const trainerRows = [];
      trainerAssignments.forEach((assignment) => {
        const trainerName = trainerNameById[assignment.trainer_id] || "Trainer";
        const clientName = memberNameById[assignment.member_id] || "Member";
        const earnings = earningsByAssignment[assignment.id] || [];
        const startDate = assignment.plan_start_date || assignment.assigned_at;
        const dueDate = assignment.next_payment_date || assignment.plan_end_date;

        if (earnings.length === 0) {
          trainerRows.push([
            trainerName,
            clientName,
            Number(assignment.plan_total_amount || 0),
            formatExportDate(startDate),
            formatExportDate(dueDate),
            Number(assignment.pending_amount || 0),
            "",
            "",
          ]);
          return;
        }

        earnings.forEach((earning) => {
          trainerRows.push([
            trainerName,
            clientName,
            Number(assignment.plan_total_amount || 0),
            formatExportDate(startDate),
            formatExportDate(dueDate),
            Number(assignment.pending_amount || 0),
            Number(earning.total_amount || 0),
            formatExportDate(earning.created_at),
          ]);
        });
      });

      const expenseRows = [...expenses]
        .sort((a, b) => new Date(a.expense_date || a.created_at) - new Date(b.expense_date || b.created_at))
        .map((expense) => {
          const date = expense.expense_date || expense.created_at;
          return [
            formatExportDate(date),
            formatExportMonth(date),
            expense.notes || String(expense.category || "").toUpperCase(),
            Number(expense.amount || 0),
            "",
          ];
        });

      const attendanceRows = attendance.map((item) => [
        item.member_name || "Member",
        item.check_in_time || "",
        item.check_out_time || "",
        item.check_out_time ? "LEFT" : "ACTIVE",
      ]);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        buildSheet("DASHBOARD SUMMARY", ["Metric", "Value"], summaryRows, [{ wch: 26 }, { wch: 16 }], [1]),
        "Summary"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        buildSheet(
          "ADMISSIONS",
          ["DATE", "MONTH", "NAME", "MOBILE", "ADMISSION TYPE", "STATUS", "BALANCE"],
          admissionsRows,
          [{ wch: 14 }, { wch: 10 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }],
          [6]
        ),
        "Admissions"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        buildSheet(
          "FEES",
          ["DATE", "MONTH", "NAME OF CLIENT", "AMOUNT", "PAYMENT MODE", "BALANCE"],
          feeRows,
          [{ wch: 14 }, { wch: 10 }, { wch: 34 }, { wch: 12 }, { wch: 16 }, { wch: 12 }],
          [3, 5]
        ),
        "Fees"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        buildSheet(
          "TRAINER+PT",
          ["TRAINER NAME", "CLIENT NAME", "AMOUNT", "START DATE", "DUE DATE", "BALANCE", "PAYMENT", "TIME"],
          trainerRows,
          [{ wch: 20 }, { wch: 28 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }],
          [2, 5, 6]
        ),
        "Trainer+PT"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        buildSheet(
          "EXPENSES",
          ["DATE", "MONTH", "PARTICULAR", "AMOUNT", "CASH/ONLINE"],
          expenseRows,
          [{ wch: 14 }, { wch: 10 }, { wch: 42 }, { wch: 12 }, { wch: 16 }],
          [3]
        ),
        "Expenses"
      );
      XLSX.utils.book_append_sheet(
        workbook,
        buildSheet(
          "ATTENDANCE (TODAY)",
          ["MEMBER NAME", "CHECK-IN", "CHECK-OUT", "STATUS"],
          attendanceRows,
          [{ wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 }]
        ),
        "Attendance"
      );

      const safeGymName = (selectedGym.name || "Gym").replace(/\s+/g, "_");
      XLSX.writeFile(workbook, `${safeGymName}_Business_Export_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (error) {
      console.error("Error exporting dashboard excel:", error);
      alert("Failed to export dashboard Excel. Please try again.");
    } finally {
      setExportingExcel(false);
    }
  };

  if (loading || loadingGyms || dataLoading) {
    return <DashboardPageSkeleton />;
  }

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
    <div className="min-h-screen bg-gradient-to-b mb-17 from-gray-50 to-gray-100 safe-area-inset-bottom">
      <Header title="Dashboard" showBack={false} />

      <main className="px-3 py-2 space-y-4">
        {/* Welcome Section - Mobile Optimized */}
        <div className="flex items-start justify-between px-1">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              Welcome back, {user?.name?.split(' ')[0] || 'Admin'}! 👋
            </h1>
            <p className="text-xs text-gray-500 truncate">Here&apos;s your gym overview for today</p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {user?.role === "admin" && (
              <button
                onClick={handleExportWholeDashboardExcel}
                disabled={exportingExcel}
                className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium active:scale-95 transition-transform flex-shrink-0 flex items-center gap-1 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ minHeight: '36px' }}
              >
                <Download className="w-3.5 h-3.5" />
                {exportingExcel ? "Exporting..." : "Export Excel"}
              </button>
            )}
            {gyms.length > 1 && (
              <button
                onClick={() => setSelectedGym(null)}
                className="px-3 py-1.5 bg-white border text-black border-gray-300 rounded-lg text-xs font-medium active:scale-95 transition-transform flex-shrink-0"
                style={{ minHeight: '36px', minWidth: '36px' }}
              >
                Switch gym
              </button>
            )}
          </div>
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

        {/* KPI Cards Grid - 2x2 on mobile - Permission Based */}
        <div className="grid grid-cols-2 gap-2 px-1">
          {hasPermission(permissions, PERMISSIONS.MEMBERS) && (
            <>
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
            </>
          )}
          {hasPermission(permissions, PERMISSIONS.ATTENDANCE) && (
            <MobileKPICard
              title="Today"
              value={dashboardData.todayAttendance}
              icon={<Calendar className="w-4 h-4" />}
              color="indigo"
              onClick={() => router.push("/attendance")}
            />
          )}
        </div>

        {/* Revenue Card - Permission Based */}
        {hasPermission(permissions, PERMISSIONS.FINANCE) && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white mx-1">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-gray-300 text-xs font-medium mb-1">Revenue</p>
              <p className="text-2xl font-bold text-white">
                {canViewFinance ? `₹${(dashboardData.totalRevenue / 1000).toFixed(1)}K` : '*****'}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <p className="text-green-400 text-xs font-medium"></p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 pl-3">
              <p className="text-gray-300 text-xs font-medium mb-1">Pending Dues</p>
              <p className="text-xl font-bold text-blue-400">
                {canViewFinance ? `₹${(dashboardData.pendingDues / 1000).toFixed(1)}K` : '*****'}
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
        )}

        {/* Quick Actions - Permission Based */}
        <div className="bg-white rounded-xl p-3 mx-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
            <button className="text-xs text-blue-600 font-medium active:text-blue-700 transition-colors">
              View all →
            </button>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {[
              { label: "Add Member", icon: <UserPlus className="w-4 h-4" />, href: "/members/add", color: "bg-blue-500", permission: PERMISSIONS.MEMBERS },
              { label: "Attendance", icon: <CheckCircle className="w-4 h-4" />, href: "/attendance", color: "bg-green-500", permission: PERMISSIONS.ATTENDANCE },
              { label: "Messaging", icon: <MessageCircle className="w-4 h-4" />, href: "/messaging", color: "bg-emerald-500", permission: PERMISSIONS.MEMBERS },
              { label: "Trainer Att.", icon: <UserCheck className="w-4 h-4" />, href: "/settings/trainers/attendance", color: "bg-violet-500", permission: PERMISSIONS.SETTINGS, adminOnly: true },
              { label: "Payment", icon: <CreditCard className="w-4 h-4" />, href: "/finance", color: "bg-indigo-500", permission: PERMISSIONS.FINANCE },
              { label: "Members", icon: <Users className="w-4 h-4" />, href: "/members", color: "bg-blue-600", permission: PERMISSIONS.MEMBERS },
              { label: "Inquiries", icon: <ClipboardList className="w-4 h-4" />, href: "/inquiries", color: "bg-purple-500", permission: PERMISSIONS.INQUIRIES }
            ].filter((action) => {
              if (!hasPermission(permissions, action.permission)) return false;
              if (action.adminOnly && !canCreateTrainer) return false;
              return true;
            }).map((action) => (
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
          {/* Today's Attendance - Permission Based */}
          {hasPermission(permissions, PERMISSIONS.ATTENDANCE) && (
          <div className="bg-white rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Today&apos;s Check-ins</h3>
                  <p className="text-xs text-gray-500">{dashboardData.todayAttendance} members</p>
                </div>
              </div>
              <button
                onClick={() => setShowAttendanceModal(true)}
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
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                          {member.membershipStatus === "EXPIRED" && (
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-red-100 text-red-700 rounded border border-red-300 flex-shrink-0">
                              EXPIRED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-500">{member.checkIn}</p>
                        </div>
                        {member.membershipStatus === "EXPIRED" && (
                          <div className="flex items-center gap-1 mt-1">
                            <XCircle className="w-3 h-3 text-red-500" />
                            <p className="text-[10px] text-red-600 font-medium">Membership expired</p>
                          </div>
                        )}
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
          )}

          {/* Pending Payments - Permission Based */}
          {hasPermission(permissions, PERMISSIONS.FINANCE) && (
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPaymentsModal(true)}
                  className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium active:bg-amber-100 transition-colors"
                  style={{ minHeight: '32px' }}
                >
                  View All
                </button>
                <button
                  onClick={() => router.push("/finance")}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform"
                  style={{ minHeight: '32px' }}
                >
                  Collect All
                </button>
              </div>
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
          )}
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
            <button 
              onClick={() => setShowActivityModal(true)}
className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium active:bg-indigo-100 transition-colors"
            >
              View all 
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

        {/* Quick Messaging Dashboard */}
        {hasPermission(permissions, PERMISSIONS.MEMBERS) && selectedGym?.id && (
          <MessagingDashboard gymId={selectedGym.id} />
        )}
      </main>

      {/* Today's Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Today&apos;s Check-ins</h2>
                  <p className="text-xs text-gray-500">{allTodayAttendance.length} members checked in</p>
                </div>
              </div>
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {allTodayAttendance.length > 0 ? (
                allTodayAttendance.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        member.status === "active" 
                          ? "bg-green-100 text-green-600" 
                          : "bg-gray-200 text-gray-600"
                      }`}>
                        <span className="text-sm font-bold">{member.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-500">{member.checkIn}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`w-2 h-2 rounded-full ${
                        member.status === "active" ? "bg-green-500 animate-pulse" : "bg-gray-300"
                      }`}></div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        member.status === "active" 
                          ? "bg-green-100 text-green-600" 
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {member.status === "active" ? "Active" : "Left"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No check-ins today</p>
                  <p className="text-xs text-gray-400 mt-1">Members will appear here when they check in</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowAttendanceModal(false);
                  router.push("/attendance");
                }}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium active:bg-indigo-700 transition-colors"
              >
                Go to Attendance Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Payments Modal */}
      {showPaymentsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Pending Payments</h2>
                  <p className="text-xs text-gray-500">Total: ₹{dashboardData.pendingDues.toLocaleString()}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentsModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {allPendingPayments.length > 0 ? (
                allPendingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    onClick={() => {
                      setShowPaymentsModal(false);
                      router.push(`/members/${payment.id}`);
                    }}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl active:bg-gray-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-red-600">₹</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{payment.name}</p>
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                          Overdue
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <p className="text-sm font-semibold text-red-600">₹{payment.amount.toLocaleString()}</p>
                      <span className="text-xs text-blue-600 font-medium">View →</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-gray-500 font-medium">All payments up to date!</p>
                  <p className="text-xs text-gray-400 mt-1">Great job managing finances</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowPaymentsModal(false);
                  router.push("/finance");
                }}
                className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium active:bg-amber-600 transition-colors"
              >
                Go to Finance Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                  <p className="text-xs text-gray-500">{allRecentActivity.length} activities</p>
                </div>
              </div>
              <button
                onClick={() => setShowActivityModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {allRecentActivity.length > 0 ? (
                allRecentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        activity.type === "attendance" 
                          ? "bg-green-100" 
                          : "bg-blue-100"
                      }`}>
                        <span className="text-lg">{activity.icon}</span>
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
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Activity className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No recent activity</p>
                  <p className="text-xs text-gray-400 mt-1">Activity will appear here as events happen</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowActivityModal(false)}
                className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium active:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
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