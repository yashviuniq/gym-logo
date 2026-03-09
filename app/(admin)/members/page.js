"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import RenewMembershipModal from "@/components/shared/RenewMembershipModal";
import ShareReceiptModal from "@/components/shared/ShareReceiptModal";
import { MembersPageSkeleton } from "@/components/shared/Skeleton";
import { useUserRole } from "@/lib/hooks/useUserRole";
import {
  Users,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Clock,
  Search,
  Plus,
  Filter,
  User as UserIcon,
  Calendar,
  CreditCard,
  Key,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Building,
  Phone,
  Mail,
  MessageCircle,
  Share2,
  UserCheck,
  Download,
} from "lucide-react";

const PAGE_SIZE = 20;

function MemberAvatar({ name, profileImage }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (profileImage && !imageFailed) {
    return (
      <img
        src={profileImage}
        alt={name}
        className="w-12 h-12 rounded-xl object-cover shadow-sm"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// Transform server response to the shape expected by the UI
const transformMember = (m) => ({
  id: m.id,
  gymId: m.gym_id,
  name: m.full_name || "N/A",
  profileImage: m.profile_image || null,
  phone: m.phone || "N/A",
  email: m.email,
  plan: m.plan_name || "No Plan",
  status: m.computed_status || "inactive",
  validTill: m.valid_till
    ? new Date(m.valid_till).toLocaleDateString("en-IN")
    : "N/A",
  dueAmount: m.due_amount || 0,
  balance: m.balance || 0,
  hasCredentials: m.has_credentials || false,
  daysRemaining: m.days_remaining ?? null,
  createdByTrainerName: m.created_by_trainer_name || null,
  trainerAssignment: m.trainer_assignment
    ? {
        trainerName: m.trainer_assignment.trainer_name,
        planEndDate: m.trainer_assignment.plan_end_date,
        trainerPlanDaysRemaining:
          m.trainer_assignment.trainer_plan_days_remaining ?? null,
      }
    : null,
});

const sortRenewalMembers = (memberList) => {
  return [...memberList].sort((leftMember, rightMember) => {
    const leftIsExpired =
      leftMember.status === "expired" ||
      leftMember.daysRemaining === null ||
      leftMember.daysRemaining <= 0;
    const rightIsExpired =
      rightMember.status === "expired" ||
      rightMember.daysRemaining === null ||
      rightMember.daysRemaining <= 0;

    if (leftIsExpired !== rightIsExpired) {
      return leftIsExpired ? 1 : -1;
    }

    if (!leftIsExpired && !rightIsExpired) {
      if (leftMember.daysRemaining !== rightMember.daysRemaining) {
        return leftMember.daysRemaining - rightMember.daysRemaining;
      }
    }

    return leftMember.name.localeCompare(rightMember.name);
  });
};

export default function MembersPage() {
  const router = useRouter();
  const { canViewFinance, isTrainer, user, loading: roleLoading } = useUserRole();

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showMyMembers, setShowMyMembers] = useState(false);
  const searchTimerRef = useRef(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Data
  const [selectedGym, setSelectedGym] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0, dues: 0, renewal: 0 });
  const [myMembersCount, setMyMembersCount] = useState(0);

  // UI states
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showShareReceiptModal, setShowShareReceiptModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Refresh trigger for manual refreshes (delete, renew, etc.)
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ─── Get gym from localStorage ───────────────────────────────
  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      setSelectedGym(JSON.parse(storedGym));
    } else {
      setLoading(false);
    }
  }, []);

  // ─── Debounce search input (300ms) ──────────────────────────
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // ─── Fetch stats (independent of pagination) ────────────────
  useEffect(() => {
    if (!selectedGym?.id || roleLoading) return;
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/members/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            p_gym_id: selectedGym.id,
            p_user_id: user?.id || null,
            p_is_trainer: isTrainer || false,
          }),
        });
        const json = await res.json();
        if (res.ok && json.data) {
          setStats({
            total: json.data.total || 0,
            active: json.data.active || 0,
            expired: json.data.expired || 0,
            dues: json.data.dues || 0,
            renewal: json.data.renewal || 0,
          });
          if (isTrainer) setMyMembersCount(json.data.my_members || 0);
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };
    fetchStats();
  }, [selectedGym?.id, user?.id, isTrainer, roleLoading, refreshTrigger]);

  // ─── Fetch paginated members ─────────────────────────────────
  useEffect(() => {
    if (!selectedGym?.id || roleLoading) return;
    let cancelled = false;

    const fetchMembersList = async () => {
      setMembersLoading(true);
      try {
        let result;
        try {
          const res = await fetch("/api/members/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              p_gym_id: selectedGym.id,
              p_search: debouncedSearch,
              p_status: filterStatus,
              p_page: currentPage,
              p_page_size: PAGE_SIZE,
              p_user_id: user?.id || null,
              p_is_trainer: isTrainer || false,
              p_show_my_members: showMyMembers,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error);
          result = json.data;
        } catch (apiErr) {
          console.warn("API proxy failed, falling back to direct Supabase:", apiErr);
          const { data, error } = await supabase.rpc("get_members_paginated", {
            p_gym_id: selectedGym.id,
            p_search: debouncedSearch,
            p_status: filterStatus,
            p_page: currentPage,
            p_page_size: PAGE_SIZE,
            p_user_id: user?.id || null,
            p_is_trainer: isTrainer || false,
            p_show_my_members: showMyMembers,
          });
          if (error) throw error;
          result = data;
        }

        if (cancelled) return;

        if (result) {
          // If current page is beyond total pages (e.g. after deletion), reset
          if (result.members?.length === 0 && result.total_count > 0 && currentPage > 1) {
            setCurrentPage(Math.max(1, result.total_pages || 1));
            return;
          }
          const transformedMembers = (result.members || []).map(transformMember);
          setMembers(
            filterStatus === "renewal"
              ? sortRenewalMembers(transformedMembers)
              : transformedMembers
          );
          setTotalCount(result.total_count || 0);
          setTotalPages(Math.max(1, result.total_pages || 1));
        } else {
          setMembers([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching members:", err);
        setMembers([]);
        setTotalCount(0);
        setTotalPages(1);
      }
      if (!cancelled) {
        setMembersLoading(false);
        setLoading(false);
      }
    };

    fetchMembersList();
    return () => {
      cancelled = true;
    };
  }, [
    selectedGym?.id,
    debouncedSearch,
    filterStatus,
    currentPage,
    showMyMembers,
    user?.id,
    isTrainer,
    roleLoading,
    refreshTrigger,
  ]);

  // ─── Refresh handler for mutations (delete, renew) ───────────
  const refreshData = () => setRefreshTrigger((t) => t + 1);

  // ─── Export Members PDF (fetches its own data directly) ──────
  const exportMembersPDF = async () => {
    try {
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      if (!selectedGym) {
        alert("No gym selected!");
        return;
      }

      const gym = selectedGym;

      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          join_date,
          created_at,
          balance,
          memberships (
            id,
            status,
            start_date,
            end_date,
            membership_plans (
              name,
              price
            )
          )
        `)
        .eq("gym_id", gym.id);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        alert("No members found to export!");
        return;
      }

      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("member_id, amount, status")
        .eq("gym_id", gym.id);

      if (paymentsError) throw paymentsError;

      const memberRows = (membersData || []).map((member) => {
        const memberPayments =
          payments?.filter(
            (p) => p.member_id === member.id && p.status === "paid"
          ) || [];
        const totalPaid = Math.round(
          memberPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        );
        const dueAmount = Math.round(member.balance || 0);
        const allMemberships = member.memberships || [];
        const activeMembership = allMemberships.find((m) => m.status === "active");
        const planName = activeMembership?.membership_plans?.name || "No Plan";
        const totalPlans = allMemberships.length;

        let totalMembershipDays = 0;
        allMemberships.forEach((membership) => {
          if (membership.start_date && membership.end_date) {
            const startDate = new Date(membership.start_date);
            const endDate = new Date(membership.end_date);
            const days = Math.ceil(
              (endDate - startDate) / (1000 * 60 * 60 * 24)
            );
            totalMembershipDays += days > 0 ? days : 0;
          }
        });

        const isRegularCustomer =
          (totalPlans >= 2 && totalMembershipDays >= 180) ||
          totalMembershipDays >= 365;
        const displayName = isRegularCustomer
          ? `${member.full_name || "N/A"} (Regular)`
          : member.full_name || "N/A";

        return {
          name: displayName,
          phone: member.phone || "N/A",
          plan: planName,
          joinDate: member.join_date || member.created_at
            ? new Date(
                member.join_date
                  ? member.join_date + "T00:00:00"
                  : member.created_at
              ).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A",
          totalPaid,
          dueAmount,
          isRegularCustomer,
        };
      });

      memberRows.sort((a, b) => b.totalPaid - a.totalPaid);

      const doc = new jsPDF("landscape");
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(gym.name || "Gym", pageWidth / 2, 18, { align: "center" });
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Member Payment Report", pageWidth / 2, 28, { align: "center" });
      doc.setFontSize(10);
      doc.text(
        `Generated on: ${new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        pageWidth / 2,
        36,
        { align: "center" }
      );

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, 52);

      const formatCurrency = (value) =>
        `Rs. ${Math.round(value || 0).toLocaleString("en-IN")}`;
      const totalMembersCount = memberRows.length;
      const grandTotalPaid = Math.round(
        memberRows.reduce((sum, m) => sum + m.totalPaid, 0)
      );
      const grandTotalDue = Math.round(
        memberRows.reduce((sum, m) => sum + m.dueAmount, 0)
      );

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 56, pageWidth - 28, 24, 3, 3, "F");
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      const summaryY = 66;
      const colWidth = (pageWidth - 28) / 3;
      doc.text("Total Members", 14 + colWidth * 0 + 10, summaryY);
      doc.text("Total Collected", 14 + colWidth * 1 + 10, summaryY);
      doc.text("Total Due", 14 + colWidth * 2 + 10, summaryY);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(totalMembersCount.toString(), 14 + colWidth * 0 + 10, summaryY + 8);
      doc.setTextColor(34, 197, 94);
      doc.text(
        formatCurrency(grandTotalPaid),
        14 + colWidth * 1 + 10,
        summaryY + 8
      );
      doc.setTextColor(239, 68, 68);
      doc.text(
        formatCurrency(grandTotalDue),
        14 + colWidth * 2 + 10,
        summaryY + 8
      );

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Member Details (Sorted by Total Paid)", 14, 92);

      const tableData = memberRows.map((member, index) => [
        (index + 1).toString(),
        member.name,
        member.phone,
        member.plan,
        member.joinDate,
        formatCurrency(member.totalPaid),
        formatCurrency(member.dueAmount),
      ]);

      autoTable(doc, {
        startY: 98,
        head: [["#", "Name", "Phone", "Plan", "Join Date", "Total Paid", "Due Amount"]],
        body: tableData,
        theme: "striped",
        styles: { cellPadding: 4 },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
        columnStyles: {
          0: { halign: "center", cellWidth: 12 },
          1: { halign: "left", cellWidth: 45 },
          2: { halign: "center", cellWidth: 30 },
          3: { halign: "center", cellWidth: 25 },
          4: { halign: "center", cellWidth: 28 },
          5: {
            halign: "right",
            cellWidth: 55,
            textColor: [34, 197, 94],
            fontStyle: "bold",
          },
          6: {
            halign: "right",
            cellWidth: 55,
            textColor: [239, 68, 68],
            fontStyle: "bold",
          },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        didDrawPage: function (data) {
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${data.pageNumber}`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: "center" }
          );
        },
      });

      const fileName = `${gym.name?.replace(/\s+/g, "_") || "Gym"}_Members_Report_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      alert("PDF exported successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF. Please try again.");
    }
  };

  // ─── Helper functions ────────────────────────────────────────
  const getStatusConfig = (status) => {
    switch (status) {
      case "active":
        return {
          color: "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200",
          text: "text-emerald-700",
          dot: "bg-emerald-500",
          label: "Active",
          icon: <CheckCircle className="w-3.5 h-3.5" />,
        };
      case "expired":
        return {
          color: "bg-gradient-to-br from-red-50 to-red-100 border-red-200",
          text: "text-red-700",
          dot: "bg-red-500",
          label: "Expired",
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      case "inactive":
        return {
          color: "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200",
          text: "text-gray-700",
          dot: "bg-gray-500",
          label: "Inactive",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
      default:
        return {
          color: "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200",
          text: "text-gray-700",
          dot: "bg-gray-500",
          label: "Inactive",
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
        };
    }
  };

  const getDaysRemainingColor = (days) => {
    if (days === null) return "text-gray-500";
    if (days <= 0) return "text-red-600 font-semibold";
    if (days <= 7) return "text-amber-600 font-semibold";
    return "text-gray-600";
  };

  const handleRenewalReminder = (e, member) => {
    e.stopPropagation();

    const gymName = selectedGym?.name || "Our Gym";
    const validTillText = member.validTill || "your membership expiry date";
    const statusLine =
      member.status === "expired"
        ? " *Status:* Your membership has already expired"
        : member.daysRemaining !== null
        ? ` *Days Remaining:* ${member.daysRemaining} day${member.daysRemaining === 1 ? "" : "s"}`
        : " *Renewal Reminder:* Your membership is due for renewal soon";
    const message = `Dear ${member.name},

Greetings from *${gymName}*! 

This is a friendly reminder that your *${member.plan}* membership is due for renewal.

*Current Plan:* ${member.plan}
 *Valid Till:* ${validTillText}
${statusLine}

To continue enjoying uninterrupted access to our gym facilities, we request you to renew your membership at the earliest.

You can visit the gym reception for quick renewal assistance.

If you have any questions, feel free to contact us.

Thank you for being a valued member! 

Best regards,
*${gymName} Team*`;

    const phone = `${member.phone || ""}`.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/91${phone}?text=${encodedMessage}`);
  };

  // ─── Event handlers ──────────────────────────────────────────
  const handleFilterChange = (newStatus) => {
    setFilterStatus(newStatus);
    setCurrentPage(1);
  };

  const handleRenewClick = (e, member) => {
    e.stopPropagation();
    setSelectedMember(member);
    setShowRenewModal(true);
  };

  const handleRenewal = () => {
    setShowRenewModal(false);
    setSelectedMember(null);
    refreshData();
  };

  const handleDeleteMember = async (e, member) => {
    e.stopPropagation();

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${member.name}? This action cannot be undone. All associated data including memberships, payments, and attendance records will be permanently deleted.`
    );

    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", member.id);

      if (error) throw error;

      refreshData();
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member. Please try again.");
    }
  };

  // ─── Loading / no-gym states ─────────────────────────────────
  if (loading) {
    return <MembersPageSkeleton />;
  }

  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
        <Header title="Members" showBack={false} />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Building className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              No Gym Selected
            </h2>
            <p className="text-gray-500 text-sm mb-6 px-4">
              Please select a gym to view and manage members
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              style={{ minHeight: "44px" }}
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
      <Header title="Members" showBack={false} />

      <main className="px-3 py-3 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2 px-1">
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {stats.total}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Active</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">
                  {stats.active}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Dues</p>
                <p className="text-xl font-bold text-amber-600 mt-0.5">
                  {stats.dues}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Expired</p>
                <p className="text-xl font-bold text-red-600 mt-0.5">
                  {stats.expired}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-red-50 to-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Add Member */}
        <div className="bg-white rounded-xl p-3 mx-1 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.push("/members/add")}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
              style={{ minHeight: "44px" }}
            >
              <Plus className="w-5 h-5" />
              Add New Member
            </button>
            {canViewFinance && (
              <button
                onClick={async () => {
                  setExporting(true);
                  try {
                    await exportMembersPDF();
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={exporting}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-lg hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ minHeight: "44px" }}
              >
                {exporting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span className="text-sm">
                  {exporting ? "Exporting..." : "Export Member Analytics"}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* My Members Toggle for Trainers */}
        {isTrainer && (
          <div className="bg-white rounded-xl p-3 mx-1">
            <button
              onClick={() => {
                setShowMyMembers(!showMyMembers);
                setCurrentPage(1);
              }}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                showMyMembers
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={{ minHeight: "40px" }}
            >
              <UserCheck className="w-4 h-4" />
              {showMyMembers ? "Showing My Members" : "My Members"}
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  showMyMembers ? "bg-white/20" : "bg-white text-gray-600"
                }`}
              >
                {myMembersCount}
              </span>
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl p-3 mx-1">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">
              Filter by Status
            </span>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {[
              { id: "all", label: "All", count: stats.total },
              { id: "active", label: "Active", count: stats.active },
              { id: "expired", label: "Expired", count: stats.expired },
              { id: "renewal", label: "Renewal", count: stats.renewal },
              {
                id: "inactive",
                label: "Inactive",
                count: stats.total - stats.active - stats.expired,
              },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleFilterChange(filter.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                  filterStatus === filter.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{ minHeight: "36px" }}
              >
                {filter.label}
                <span
                  className={`px-2 py-0.5 text-xs rounded-full ${
                    filterStatus === filter.id
                      ? "bg-white/20"
                      : "bg-white text-gray-600"
                  }`}
                >
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Members List */}
        <div
          className={`space-y-3 ${
            membersLoading && members.length > 0
              ? "opacity-60 pointer-events-none"
              : ""
          } transition-opacity duration-200`}
        >
          {members.map((member) => {
            const statusConfig = getStatusConfig(member.status);
            const canShowRenewReminder =
              member.status === "expired" ||
              member.status === "renewal" ||
              (member.daysRemaining !== null && member.daysRemaining <= 7);

            return (
              <div
                key={member.id}
                onClick={() => router.push(`/members/${member.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md active:scale-95 transition-all duration-200 cursor-pointer mx-1"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <MemberAvatar
                      name={member.name}
                      profileImage={member.profileImage}
                    />
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-base truncate">
                          {member.name}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-500 text-xs truncate">
                              {member.phone}
                            </span>
                          </div>
                          {member.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-500 text-xs truncate hidden sm:block">
                                {member.email}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div
                          className={`px-2.5 py-1.5 rounded-lg border ${statusConfig.color} ${statusConfig.text} flex items-center gap-1.5`}
                        >
                          <div className={statusConfig.text}>
                            {statusConfig.icon}
                          </div>
                          <span className="text-xs font-medium">
                            {statusConfig.label}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                    
                      {/* Days remaining for active memberships */}
                      {member.daysRemaining !== null && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span
                            className={`text-xs ${getDaysRemainingColor(
                              member.daysRemaining
                            )}`}
                          >
                            {member.daysRemaining > 0
                              ? `${member.daysRemaining} days remaining`
                              : "Membership expired"}
                          </span>
                        </div>
                      )}
                    {/* Plan and Status Info */}
                    <div className="mt-3 space-y-2">
                      {/* Show if created by trainer */}
                   

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Plan</p>
                            <p className="text-sm font-medium text-gray-900">
                              {member.plan}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-500">Valid Till</p>
                          <p className="text-sm font-medium text-gray-900">
                            {member.validTill}
                          </p>
                        </div>
                      </div>


                      {/* Trainer plan expiry */}
                      {member.trainerAssignment &&
                        member.trainerAssignment.trainerPlanDaysRemaining !==
                          null && (
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-400" />
                            <span
                              className={`text-xs ${
                                member.trainerAssignment
                                  .trainerPlanDaysRemaining <= 0
                                  ? "text-red-600 font-semibold"
                                  : member.trainerAssignment
                                      .trainerPlanDaysRemaining <= 7
                                  ? "text-amber-600 font-semibold"
                                  : "text-purple-600"
                              }`}
                            >
                              {member.trainerAssignment
                                .trainerPlanDaysRemaining > 0
                                ? `Trainer plan: ${member.trainerAssignment.trainerPlanDaysRemaining} days remaining`
                                : "Trainer plan expired"}
                            </span>
                          </div>
                        )}

                      {member.dueAmount > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">
                              Pending Payment
                            </p>
                            <p className="text-sm font-semibold text-amber-600">
                              {canViewFinance
                                ? `₹${member.dueAmount}`
                                : "*****"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 overflow-x-auto mt-3 pt-3 border-t border-gray-100 pb-1 -mx-1 px-1 no-scrollbar">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/members/${member.id}/credentials`);
                        }}
                        title={member.hasCredentials ? "Credentials" : "Setup Login"}
                        aria-label={member.hasCredentials ? "Credentials" : "Setup Login"}
                        className="flex-shrink-0 px-2.5 sm:px-3 py-2 bg-blue-50 text-blue-700 cursor-pointer text-xs font-medium rounded-lg active:bg-blue-100 transition-all flex items-center justify-center gap-0 sm:gap-2"
                        style={{ minHeight: "36px" }}
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {member.hasCredentials ? "Credentials" : "Setup Login"}
                        </span>
                      </button>

                      {/* Share Receipt Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMember(member);
                          setShowShareReceiptModal(true);
                        }}
                        title="Share Receipt"
                        aria-label="Share Receipt"
                        className="flex-shrink-0 px-2.5 sm:px-3 py-2 bg-green-50 text-green-700 cursor-pointer text-xs font-medium rounded-lg active:bg-green-100 transition-all flex items-center justify-center gap-0 sm:gap-2"
                        style={{ minHeight: "36px" }}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Share Receipt</span>
                      </button>

                      {canShowRenewReminder && (
                        <button
                          onClick={(e) => handleRenewalReminder(e, member)}
                          title="Remind"
                          aria-label="Remind"
                          className="flex-shrink-0 px-2.5 sm:px-3 py-2 bg-emerald-100 text-emerald-700 cursor-pointer text-xs font-medium rounded-lg active:bg-emerald-200 transition-all flex items-center justify-center gap-0 sm:gap-2"
                          style={{ minHeight: "36px" }}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Remind</span>
                        </button>
                      )}

                      {(member.status === "expired" || member.status === "renewal") && (
                        <button
                          onClick={(e) => handleRenewClick(e, member)}
                          title="Renew"
                          aria-label="Renew"
                          className="flex-shrink-0 px-2.5 sm:px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-medium rounded-lg active:scale-95 transition-all flex items-center justify-center gap-0 sm:gap-2"
                          style={{ minHeight: "36px" }}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Renew</span>
                        </button>
                      )}

                      {!isTrainer && (
                        <button
                          onClick={(e) => handleDeleteMember(e, member)}
                          title="Delete"
                          aria-label="Delete"
                          className="flex-shrink-0 px-2.5 sm:px-3 py-2 bg-red-50 cursor-pointer text-red-700 text-xs font-medium rounded-lg active:bg-red-100 transition-all flex items-center justify-center gap-0 sm:gap-2"
                          style={{ minHeight: "36px" }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading spinner for subsequent page/filter loads */}
        {membersLoading && members.length === 0 && !loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-gray-500 mt-3">Loading members...</p>
          </div>
        )}

        {/* Empty State */}
        {members.length === 0 && !membersLoading && (
          <div className="text-center py-8 px-4">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {searchQuery || filterStatus !== "all"
                ? "No members found"
                : "No members yet"}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Add your first member to get started"}
            </p>
            {(searchQuery || filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStatus("all");
                  setCurrentPage(1);
                }}
                className="px-4 py-2 text-blue-600 text-sm font-medium hover:text-blue-700 active:scale-95 transition-transform"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-white rounded-xl p-3 mx-1 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || membersLoading}
                className="p-2 rounded-lg bg-gray-100 disabled:opacity-40 active:scale-95 transition-all"
                style={{ minHeight: "36px" }}
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage >= totalPages || membersLoading}
                className="p-2 rounded-lg bg-gray-100 disabled:opacity-40 active:scale-95 transition-all"
                style={{ minHeight: "36px" }}
              >
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom spacing for bottom nav */}
        <div className="pb-16" />
      </main>

      {/* Renew Membership Modal */}
      {showRenewModal && selectedMember && (
        <RenewMembershipModal
          member={selectedMember}
          gymId={selectedGym?.id}
          onClose={() => {
            setShowRenewModal(false);
            setSelectedMember(null);
          }}
          onRenew={handleRenewal}
        />
      )}

      {/* Share Receipt Modal */}
      {showShareReceiptModal && selectedMember && (
        <ShareReceiptModal
          member={selectedMember}
          gymData={selectedGym}
          onClose={() => {
            setShowShareReceiptModal(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
}
