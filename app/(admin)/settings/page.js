"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { hasPermission, PERMISSIONS } from "@/lib/constants/permissions";
import {
  Settings as SettingsIcon,
  Users,
  Calendar,
  Bell,
  Shield,
  FileText,
  Dumbbell,
  Utensils,
  Download,
  HelpCircle,
  Database,
  ArrowLeft,
  LogOut,
  Smartphone,
  Clock,
  Activity,
  ChevronRight,
  Building,
  TrendingUp,
  Wrench,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  User,
  Phone,
  Mail,
  CreditCard,
  Key,
  Trash2,
  RefreshCw
} from "lucide-react";

const settingsSections = [
  {
    id: "gym",
    title: "Gym Settings",
    description: "Name, address, operating hours, QR code",
    icon: Building,
    href: "/settings/gym",
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "plans",
    title: "Membership Plans",
    description: "Create, edit plans, pricing, freeze options",
    icon: FileText,
    href: "/settings/plans",
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "diet-plans",
    title: "Diet Plans",
    description: "Create and manage diet plans with meals",
    icon: Utensils,
    href: "/settings/diet-plans",
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "workout-plans",
    title: "Workout Plans",
    description: "Create and manage workout routines",
    icon: Dumbbell,
    href: "/settings/workout-plans",
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Reminders, alerts, payment notifications",
    icon: Bell,
    href: "/settings/notifications",
    color: "from-blue-600 to-indigo-600"
  },
  {
    id: "trainers",
    title: "Trainers",
    description: "Manage trainers and member assignments",
    icon: Shield,
    href: "/settings/trainers",
    color: "from-blue-600 to-indigo-600"
  },
];

const quickActions = [
  {
    label: "Export Member Analytics",
    icon: Download,
    action: "export",
    description: "Generate payment report",
    color: "bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
  },
  {
    label: "Backup",
    icon: Database,
    action: "backup",
    description: "Create backup",
    color: "bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200"
  },
  {
    label: "Help",
    icon: HelpCircle,
    action: "help",
    description: "Get support",
    color: "bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200"
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { permissions } = usePermissions();
  const [gymName, setGymName] = useState("Loading...");
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [appStats, setAppStats] = useState({
    version: "1.2.5",
    lastUpdated: "Jan 15, 2025",
    databaseSize: "2.4 GB"
  });

  useEffect(() => {
    fetchGymData();
  }, []);

  const fetchGymData = async () => {
    try {
      setLoading(true);
      
      const storedGym = localStorage.getItem("selectedGym");
      if (!storedGym) {
        console.error("No gym selected");
        setLoading(false);
        router.push("/admin/dashboard");
        return;
      }

      const gym = JSON.parse(storedGym);
      setGymName(gym.name || "My Gym");

      const { count, error } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("gym_id", gym.id);

      if (error) throw error;
      setTotalMembers(count || 0);
    } catch (error) {
      console.error("Error fetching gym data:", error);
      const storedGym = localStorage.getItem("selectedGym");
      if (storedGym) {
        const gym = JSON.parse(storedGym);
        setGymName(gym.name || "My Gym");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action) => {
    switch (action) {
      case "export":
        setExporting(true);
        try {
          await exportMembersPDF();
        } finally {
          setExporting(false);
        }
        break;
      case "backup":
        alert("Backup functionality coming soon!");
        break;
      case "help":
        alert("Contact details phone no - +91 7498341146                                       email id - shaibyasolutions@gmail.com");
        break;
    }
  };

  const exportMembersPDF = async () => {
    try {
      // Dynamic import for jsPDF and jspdf-autotable
      const jsPDF = (await import("jspdf")).default;
      const autoTable = (await import("jspdf-autotable")).default;

      const storedGym = localStorage.getItem("selectedGym");
      if (!storedGym) {
        alert("No gym selected!");
        return;
      }

      const gym = JSON.parse(storedGym);

      // Fetch members with their payment data and balance
      const { data: members, error: membersError } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
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

      if (!members || members.length === 0) {
        alert("No members found to export!");
        return;
      }

      // Fetch all payments for this gym
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("member_id, amount, status")
        .eq("gym_id", gym.id);

      if (paymentsError) throw paymentsError;

      // Calculate totals for each member
      const memberData = (members || []).map((member) => {
        // Get total paid amount (status is 'paid')
        const memberPayments = payments?.filter(
          (p) => p.member_id === member.id && p.status === "paid"
        ) || [];
        const totalPaid = Math.round(
          memberPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        );

        // Get due amount from member balance field (rounded)
        const dueAmount = Math.round(member.balance || 0);

        // Get membership info
        const allMemberships = member.memberships || [];
        const activeMembership = allMemberships.find((m) => m.status === "active");
        const planName = activeMembership?.membership_plans?.name || "No Plan";

        // Calculate total plans count (number of memberships/renewals)
        const totalPlans = allMemberships.length;

        // Calculate total membership days across all memberships
        let totalMembershipDays = 0;
        allMemberships.forEach((membership) => {
          if (membership.start_date && membership.end_date) {
            const startDate = new Date(membership.start_date);
            const endDate = new Date(membership.end_date);
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            totalMembershipDays += days > 0 ? days : 0;
          }
        });

        // Check if regular customer: (totalPlans >= 2 && totalMembershipDays >= 180) || totalMembershipDays >= 365
        const isRegularCustomer = 
          (totalPlans >= 2 && totalMembershipDays >= 180) || totalMembershipDays >= 365;

        // Add regular customer tag to name
        const displayName = isRegularCustomer 
          ? `${member.full_name || "N/A"} (Regular)`
          : member.full_name || "N/A";

        return {
          name: displayName,
          phone: member.phone || "N/A",
          plan: planName,
          joinDate: member.created_at
            ? new Date(member.created_at).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A",
          totalPaid: totalPaid,
          dueAmount: dueAmount,
          isRegularCustomer: isRegularCustomer,
        };
      });

      // Sort by total paid amount in descending order
      memberData.sort((a, b) => b.totalPaid - a.totalPaid);

      // Create PDF in landscape mode for better spacing
      const doc = new jsPDF("landscape");
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(37, 99, 235); // Blue color
      doc.rect(0, 0, pageWidth, 40, "F");

      // Gym Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(gym.name || "Gym", pageWidth / 2, 18, { align: "center" });

      // Report Title
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Member Payment Report", pageWidth / 2, 28, { align: "center" });

      // Report Date
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

      // Summary Section
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 14, 52);

      // Use "Rs." instead of ₹ for better PDF compatibility
      const formatCurrency = (value) => `Rs. ${Math.round(value || 0).toLocaleString("en-IN")}`;

      const totalMembersCount = memberData.length;
      const grandTotalPaid = Math.round(memberData.reduce((sum, m) => sum + m.totalPaid, 0));
      const grandTotalDue = Math.round(memberData.reduce((sum, m) => sum + m.dueAmount, 0));

      // Summary Box
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
      doc.setTextColor(34, 197, 94); // Green
      doc.text(formatCurrency(grandTotalPaid), 14 + colWidth * 1 + 10, summaryY + 8);
      doc.setTextColor(239, 68, 68); // Red
      doc.text(formatCurrency(grandTotalDue), 14 + colWidth * 2 + 10, summaryY + 8);

      // Table Header
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Member Details (Sorted by Total Paid)", 14, 92);

      // Create table
      const tableData = memberData.map((member, index) => [
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
        styles: {
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontSize: 10,
          fontStyle: "bold",
          halign: "center",
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [50, 50, 50],
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 12 },
          1: { halign: "left", cellWidth: 45 },
          2: { halign: "center", cellWidth: 30 },
          3: { halign: "center", cellWidth: 25 },
          4: { halign: "center", cellWidth: 28 },
          5: { halign: "right", cellWidth: 55, textColor: [34, 197, 94], fontStyle: "bold" },
          6: { halign: "right", cellWidth: 55, textColor: [239, 68, 68], fontStyle: "bold" },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14 },
        didDrawPage: function (data) {
          // Footer on each page
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

      // Save the PDF
      const fileName = `${gym.name?.replace(/\s+/g, "_") || "Gym"}_Members_Report_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      alert("PDF exported successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
      <Header title="Settings" showBack={false} />

      <main className="px-3 py-3 space-y-4">
        {/* Gym Profile Card - Updated to Indigo Theme */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-4 shadow-lg mx-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-white/30">
              <Building className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white mb-1 truncate">{gymName}</h2>
              <p className="text-white/90 text-sm">Administrator Dashboard</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-white/80" />
                  <p className="text-white/90 text-xs">{loading ? "..." : totalMembers} Members</p>
                </div>
                <span className="text-white/30">•</span>
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-white/80" />
                  <p className="text-white/90 text-xs">Active Today</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/20">
            <div className="text-center">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-1">
                <SettingsIcon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-white/80">Settings</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-1">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-white/80">Analytics</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-1">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-white/80">Tools</p>
            </div>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <SettingsIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Settings</span>
          </div>
          
          <div className="space-y-3">
            {settingsSections
              .filter((section) => {
                // Hide membership plans, diet plans, and workout plans if members permission is false
                if (!hasPermission(permissions, PERMISSIONS.MEMBERS)) {
                  return !['plans', 'diet-plans', 'workout-plans'].includes(section.id);
                }
                return true;
              })
              .map((section) => {
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  onClick={() => !section.badge && router.push(section.href)}
                  className={`bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md active:scale-95 transition-all duration-200 ${section.badge ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {section.title}
                        </h3>
                        {section.badge && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full whitespace-nowrap">
                            {section.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-2 truncate">
                        {section.description}
                      </p>
                      {!section.badge && (
                        <div className="flex items-center text-blue-600 text-xs font-medium">
                          <span>Configure</span>
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Quick Actions</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {quickActions
              .filter((action) => {
                // Hide export action if members permission is false
                if (!hasPermission(permissions, PERMISSIONS.MEMBERS)) {
                  return action.action !== 'export';
                }
                return true;
              })
              .map((action) => {
              const Icon = action.icon;
              const isExportAction = action.action === "export";
              const isDisabled = isExportAction && exporting;
              return (
                <button
                  key={action.action}
                  onClick={() => !isDisabled && handleQuickAction(action.action)}
                  disabled={isDisabled}
                  className={`${action.color} rounded-xl p-3 flex flex-col items-center gap-2 transition-all duration-200 hover:shadow-md active:scale-95 ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                    {isExportAction && exporting ? (
                      <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
                    ) : (
                      <Icon className="w-5 h-5 text-gray-700" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-900 text-xs">
                      {isExportAction && exporting ? "Generating..." : action.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{action.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* App Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Smartphone className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">App Information</span>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-4 mx-1 space-y-3">
            {/* Version */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">v</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Version</p>
                  <p className="text-xs text-gray-500">Current app version</p>
                </div>
              </div>
              <span className="font-semibold text-gray-900 text-sm">{appStats.version}</span>
            </div>

            {/* Last Updated */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Updated</p>
                  <p className="text-xs text-gray-500">Most recent update</p>
                </div>
              </div>
              <span className="font-semibold text-gray-900 text-sm">{appStats.lastUpdated}</span>
            </div>

            {/* Total Members */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Total Members</p>
                  <p className="text-xs text-gray-500">Active member count</p>
                </div>
              </div>
              <span className="font-semibold text-gray-900 text-sm">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                ) : (
                  totalMembers.toLocaleString()
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-3 px-1">
          {/* Back to Dashboard - Updated to Indigo Theme */}
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          {/* Logout Button */}
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to logout?")) {
                localStorage.removeItem("selectedGym");
                router.push("/auth/login");
              }
            }}
            className="w-full py-3 bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 text-red-600 rounded-xl font-medium hover:shadow-sm active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>

        {/* Support Info */}
        <div className="text-center pt-2 px-3">
          <p className="text-sm text-gray-500">
            Need help?{" "}
            <button 
              onClick={() => handleQuickAction("help")}
              className="text-blue-600 font-medium hover:text-blue-700 active:text-blue-800"
            >
              Contact Support
            </button>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © {new Date().getFullYear()} Gym Management System
          </p>
        </div>
      </main>
    </div>
  );
}