"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { Skeleton } from "@/components/shared/Skeleton";
import {
  TrendingUp,
  IndianRupee,
  Users,
  Wallet,
  PiggyBank,
  BarChart3,
  UserPlus,
  Activity,
  RefreshCw,
  ArrowLeft,
  X,
  Phone,
  ChevronRight,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatCurrency(value) {
  const num = Number(value) || 0;
  if (num >= 10000000) {
    return "₹" + (num / 10000000).toFixed(2) + " Cr";
  }
  if (num >= 100000) {
    return "₹" + (num / 100000).toFixed(2) + " L";
  }
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ─── Week/Day Breakdown Helpers ───────────────────────────────

function getWeeksForMonth(month, year) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks = [];
  let weekStart = new Date(firstDay);
  let weekNum = 1;

  while (weekStart <= lastDay) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    // Clamp to end of month
    const clampedEnd = weekEnd > lastDay ? new Date(lastDay) : weekEnd;
    weeks.push({
      num: weekNum,
      start: new Date(weekStart),
      end: new Date(clampedEnd),
      label: `Week ${weekNum}`,
      range: `${formatShortDate(weekStart)} – ${formatShortDate(clampedEnd)}`,
    });
    weekStart = new Date(clampedEnd);
    weekStart.setDate(weekStart.getDate() + 1);
    weekNum++;
  }
  return weeks;
}

function formatShortDate(d) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function isDateInRange(dateStr, start, end) {
  // dateStr can be "2026-03-01" or ISO timestamp
  const d = new Date(dateStr.length <= 10 ? dateStr + "T00:00:00" : dateStr);
  d.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);
  return d >= s && d <= e;
}

function isDateOnDay(dateStr, targetDate) {
  const d = new Date(dateStr.length <= 10 ? dateStr + "T00:00:00" : dateStr);
  return (
    d.getFullYear() === targetDate.getFullYear() &&
    d.getMonth() === targetDate.getMonth() &&
    d.getDate() === targetDate.getDate()
  );
}

function getPaymentDate(p) {
  return p.paid_at || p.created_at;
}

function computeWeekData(data, weekStart, weekEnd) {
  const revenueList = (data?.month_revenue_list || []).filter((p) =>
    isDateInRange(getPaymentDate(p), weekStart, weekEnd)
  );
  const newJoinsList = (data?.month_new_joins_list || []).filter((m) =>
    isDateInRange(m.join_date, weekStart, weekEnd)
  );
  const renewalsList = (data?.month_renewals_list || []).filter((r) =>
    isDateInRange(r.start_date || r.created_at, weekStart, weekEnd)
  );
  const revenue = revenueList.reduce((s, p) => s + Number(p.amount || 0), 0);
  return { revenue, revenueList, newJoinsList, renewalsList };
}

function getDaysInRange(start, end) {
  const days = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function computeDayData(data, day) {
  const revenueList = (data?.month_revenue_list || []).filter((p) =>
    isDateOnDay(getPaymentDate(p), day)
  );
  const newJoinsList = (data?.month_new_joins_list || []).filter((m) =>
    isDateOnDay(m.join_date, day)
  );
  const renewalsList = (data?.month_renewals_list || []).filter((r) =>
    isDateOnDay(r.start_date || r.created_at, day)
  );
  const revenue = revenueList.reduce((s, p) => s + Number(p.amount || 0), 0);
  return { revenue, revenueList, newJoinsList, renewalsList };
}

// Skeleton loader for the page
function InsightsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="px-4 py-4 space-y-5">
        {/* Summary Cards Skeleton */}
        <div>
          <Skeleton className="h-5 w-36 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <Skeleton className="w-9 h-9 rounded-xl mb-3" />
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        </div>
        {/* Month Selector Skeleton */}
        <Skeleton className="h-12 w-full rounded-xl" />
        {/* Month Breakdown Skeleton */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinanceInsightsPage() {
  const router = useRouter();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedGym, setSelectedGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);
  const [data, setData] = useState(null);
  const [drillDown, setDrillDown] = useState(null); // null | "new_joins" | "revenue" | "renewals"

  // Week & Day drill-down state
  const [weekModal, setWeekModal] = useState(null); // { week, type: "revenue"|"new_joins"|"renewals"|null }
  const [dayModal, setDayModal] = useState(null);   // { day: Date, type: "revenue"|"new_joins"|"renewals" }

  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      try {
        setSelectedGym(JSON.parse(storedGym));
      } catch {
        setSelectedGym(null);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchInsights = useCallback(
    async (gymId, month, year, isMonthChange = false) => {
      if (isMonthChange) {
        setMonthLoading(true);
      } else {
        setLoading(true);
      }

      try {
        const res = await fetch("/api/finance/insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            p_gym_id: gymId,
            p_month: month + 1, // API expects 1-indexed
            p_year: year,
          }),
        });

        const json = await res.json();
        if (res.ok && json.data) {
          setData(json.data);
        } else {
          console.error("Failed to fetch insights:", json.error);
        }
      } catch (err) {
        console.error("Error fetching insights:", err);
      } finally {
        setLoading(false);
        setMonthLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedGym?.id) {
      fetchInsights(selectedGym.id, selectedMonth, selectedYear);
    }
  }, [selectedGym, fetchInsights]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMonthChange = (monthIndex) => {
    setSelectedMonth(monthIndex);
    if (selectedGym?.id) {
      fetchInsights(selectedGym.id, monthIndex, selectedYear, true);
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    // If switching to current year and selected month is in the future, reset to current month
    const newMonth = (year === now.getFullYear() && selectedMonth > now.getMonth())
      ? now.getMonth()
      : selectedMonth;
    setSelectedMonth(newMonth);
    if (selectedGym?.id) {
      fetchInsights(selectedGym.id, newMonth, year, true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header title="Finance Insights" showBack backUrl="/finance" />
        <InsightsSkeleton />
      </div>
    );
  }

  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header title="Finance Insights" showBack backUrl="/finance" />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BarChart3 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No Gym Selected</h2>
            <p className="text-gray-500 text-sm mb-6 px-4">
              Please select a gym to view finance insights
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Revenue",
      value: formatCurrency(data?.total_revenue_all_time),
      icon: <IndianRupee className="w-5 h-5" />,
      color: "from-emerald-500 to-green-600",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
    },
    {
      label: "Salary Paid",
      value: formatCurrency(data?.total_salary_paid_all_time),
      icon: <Wallet className="w-5 h-5" />,
      color: "from-orange-500 to-amber-600",
      textColor: "text-orange-700",
      bgColor: "bg-orange-50",
    },
    {
      label: "Pending Dues",
      value: formatCurrency(data?.total_dues_all_time),
      icon: <PiggyBank className="w-5 h-5" />,
      color: "from-red-500 to-rose-600",
      textColor: "text-red-700",
      bgColor: "bg-red-50",
    },
    {
      label: "Net Profit",
      value: formatCurrency(data?.net_profit_all_time),
      icon: <TrendingUp className="w-5 h-5" />,
      color: "from-blue-500 to-indigo-600",
      textColor: (data?.net_profit_all_time ?? 0) >= 0 ? "text-blue-700" : "text-red-700",
      bgColor: (data?.net_profit_all_time ?? 0) >= 0 ? "bg-blue-50" : "bg-red-50",
    },
    {
      label: "Avg Monthly Revenue",
      value: formatCurrency(data?.avg_monthly_revenue),
      icon: <BarChart3 className="w-5 h-5" />,
      color: "from-violet-500 to-purple-600",
      textColor: "text-violet-700",
      bgColor: "bg-violet-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom pb-32">
      <Header title="Finance Insights" showBack backUrl="/finance" />

      <main className="px-4 py-4 space-y-5">
        {/* ─── All Time Summary ─── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
            All Time Overview
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {summaryCards.map((card, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow ${
                  idx === summaryCards.length - 1 ? "col-span-2 sm:col-span-1" : ""
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 shadow-sm`}
                >
                  <span className="text-white">{card.icon}</span>
                </div>
                <p className="text-xs font-medium text-gray-500 mb-1">{card.label}</p>
                <p className={`text-xl font-bold ${card.textColor}`}>{card.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Year & Month Selector ─── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Monthly Breakdown
            </h2>
            <div className="flex items-center gap-1.5">
              {(() => {
                const startYear = 2024;
                const years = [];
                for (let y = startYear; y <= now.getFullYear(); y++) years.push(y);
                return years.map((y) => (
                  <button
                    key={y}
                    onClick={() => handleYearChange(y)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      y === selectedYear
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95"
                    }`}
                  >
                    {y}
                  </button>
                ));
              })()}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {MONTHS.map((m, idx) => {
                const isSelected = idx === selectedMonth;
                const isFuture =
                  selectedYear === now.getFullYear() && idx > now.getMonth();
                return (
                  <button
                    key={m}
                    disabled={isFuture}
                    onClick={() => handleMonthChange(idx)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isSelected
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md scale-105"
                        : isFuture
                        ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95"
                    }`}
                    style={{ minWidth: "52px" }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── Month Wise Breakdown ─── */}
        <section>
          {monthLoading ? (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Revenue Card - Clickable */}
              <div
                onClick={() => (data?.month_revenue_list?.length > 0) && setDrillDown("revenue")}
                className={`bg-white rounded-2xl p-5 border border-gray-100 shadow-sm ${data?.month_revenue_list?.length > 0 ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm">
                    <IndianRupee className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Revenue</h3>
                  <span className="ml-auto text-xs font-medium text-gray-400">
                    {MONTHS[selectedMonth]} {selectedYear}
                  </span>
                </div>
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-emerald-600 mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        {formatCurrency(data?.month_revenue)}
                      </p>
                    </div>
                    {data?.month_revenue_list?.length > 0 && (
                      <ChevronRight className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Members Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Members</h3>
                  <span className="ml-auto text-xs font-medium text-gray-400">
                    {MONTHS[selectedMonth]} {selectedYear}
                  </span>
                </div>

                {/* New Joins - Clickable */}
                <div
                  onClick={() => (data?.month_new_joins_list?.length > 0) && setDrillDown("new_joins")}
                  className={`bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 mb-3 ${data?.month_new_joins_list?.length > 0 ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus className="w-4 h-4 text-violet-600" />
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                      New Joins
                    </p>
                    {data?.month_new_joins_list?.length > 0 && (
                      <ChevronRight className="w-4 h-4 text-violet-400 ml-auto" />
                    )}
                  </div>
                  <p className="text-3xl font-extrabold text-violet-700">
                    {data?.month_new_joins ?? 0}
                  </p>
                  <p className="text-xs text-violet-500 mt-1">
                    Members joined in {MONTHS[selectedMonth]}
                  </p>
                </div>

                {/* Renewals & Active - Secondary */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Renewals - Clickable */}
                  <div
                    onClick={() => (data?.month_renewals_list?.length > 0) && setDrillDown("renewals")}
                    className={`bg-gray-50 rounded-xl p-3 border border-gray-100 ${data?.month_renewals_list?.length > 0 ? "cursor-pointer active:scale-[0.98] transition-transform" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-xs font-medium text-gray-500">Renewals</p>
                      {data?.month_renewals_list?.length > 0 && (
                        <ChevronRight className="w-3 h-3 text-gray-400 ml-auto" />
                      )}
                    </div>
                    <p className="text-lg font-bold text-gray-800">
                      {data?.month_renewals ?? 0}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Activity className="w-3.5 h-3.5 text-green-500" />
                      <p className="text-xs font-medium text-gray-500">Active</p>
                    </div>
                    <p className="text-lg font-bold text-gray-800">
                      {data?.month_active_members ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ─── Week Breakdown ─── */}
        {!monthLoading && data && (
          <section className="mb-20">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Week Breakdown
              </h2>
              <span className="text-xs text-gray-400 ml-auto">
                {MONTHS[selectedMonth]} {selectedYear}
              </span>
            </div>
            <div className="space-y-3">
              {getWeeksForMonth(selectedMonth, selectedYear).map((week) => {
                const wd = computeWeekData(data, week.start, week.end);
                const hasData = wd.revenue > 0 || wd.newJoinsList.length > 0 || wd.renewalsList.length > 0;
                return (
                  <div
                    key={week.num}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    {/* Week Header */}
                    <div
                      className={`p-4 ${hasData ? "cursor-pointer active:scale-[0.99] transition-transform" : ""}`}
                      onClick={() => hasData && setWeekModal({ week, type: null })}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
                            <span className="text-white text-xs font-bold">W{week.num}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{week.label}</p>
                            <p className="text-xs text-gray-400">{week.range}</p>
                          </div>
                        </div>
                        {hasData && <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </div>
                      {/* Week Stats */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-100 text-center">
                          <p className="text-[10px] font-medium text-emerald-600 uppercase">Revenue</p>
                          <p className="text-sm font-bold text-emerald-700">{formatCurrency(wd.revenue)}</p>
                        </div>
                        <div className="bg-violet-50 rounded-xl p-2.5 border border-violet-100 text-center">
                          <p className="text-[10px] font-medium text-violet-600 uppercase">New Joins</p>
                          <p className="text-sm font-bold text-violet-700">{wd.newJoinsList.length}</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-2.5 border border-blue-100 text-center">
                          <p className="text-[10px] font-medium text-blue-600 uppercase">Renewals</p>
                          <p className="text-sm font-bold text-blue-700">{wd.renewalsList.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* ─── Drill-Down Modal ─── */}
      {drillDown && (
        <div className="fixed inset-0 mb-3 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setDrillDown(null)}>
          <div
            className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-4 flex items-center gap-3 border-b border-gray-100 ${
              drillDown === "revenue" ? "bg-gradient-to-r from-emerald-50 to-green-50" :
              drillDown === "new_joins" ? "bg-gradient-to-r from-violet-50 to-purple-50" :
              "bg-gradient-to-r from-blue-50 to-indigo-50"
            }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                drillDown === "revenue" ? "bg-gradient-to-br from-emerald-500 to-green-600" :
                drillDown === "new_joins" ? "bg-gradient-to-br from-violet-500 to-purple-600" :
                "bg-gradient-to-br from-blue-500 to-indigo-600"
              }`}>
                {drillDown === "revenue" && <IndianRupee className="w-5 h-5 text-white" />}
                {drillDown === "new_joins" && <UserPlus className="w-5 h-5 text-white" />}
                {drillDown === "renewals" && <RefreshCw className="w-5 h-5 text-white" />}
              </div>
              <div className="flex-1 ">
                <h3 className="font-bold text-gray-900 text-base">
                  {drillDown === "revenue" && "Revenue Details"}
                  {drillDown === "new_joins" && "New Members"}
                  {drillDown === "renewals" && "Renewals"}
                </h3>
                <p className="text-xs text-gray-500">{MONTHS[selectedMonth]} {selectedYear}</p>
              </div>
              <button
                onClick={() => setDrillDown(null)}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 mb-15 space-y-2">
              {/* Revenue Drill-Down */}
              {drillDown === "revenue" && (
                <>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-medium text-gray-500">
                      {data?.month_revenue_list?.length || 0} payments
                    </span>
                    <span className="text-sm font-bold text-emerald-600">
                      Total: {formatCurrency(data?.month_revenue)}
                    </span>
                  </div>
                  {(data?.month_revenue_list || []).map((p, i) => (
                    <div key={p.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(p.member_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{p.member_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.phone && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />{p.phone}
                            </span>
                          )}
                          <span className="text-xs text-gray-400 capitalize">• {p.payment_mode}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(p.paid_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <p className="font-bold text-emerald-600 text-sm whitespace-nowrap">
                        ₹{Number(p.amount).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </>
              )}

              {/* New Joins Drill-Down */}
              {drillDown === "new_joins" && (
                <>
                  <div className="flex items-center justify-between mb-5 px-1">
                    <span className="text-xs font-medium text-gray-500">
                      {data?.month_new_joins_list?.length || 0} members
                    </span>
                  </div>
                  {(data?.month_new_joins_list || []).map((m, i) => (
                    <div
                      key={m.id || i}
                      onClick={() => router.push(`/members/${m.id}`)}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(m.full_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{m.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {m.phone && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />{m.phone}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Joined {new Date(m.join_date + 'T00:00:00').toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-medium text-violet-600">{m.plan_name}</p>
                        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto mt-1" />
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Renewals Drill-Down */}
              {drillDown === "renewals" && (
                <>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-medium text-gray-500">
                      {data?.month_renewals_list?.length || 0} renewals
                    </span>
                  </div>
                  {(data?.month_renewals_list || []).map((r, i) => (
                    <div key={r.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(r.member_name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{r.member_name}</p>
                        {r.phone && (
                          <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" />{r.phone}
                          </span>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(r.start_date + 'T00:00:00').toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          {" → "}
                          {new Date(r.end_date + 'T00:00:00').toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">
                          {r.plan_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Empty state */}
              {((drillDown === "revenue" && !(data?.month_revenue_list?.length)) ||
                (drillDown === "new_joins" && !(data?.month_new_joins_list?.length)) ||
                (drillDown === "renewals" && !(data?.month_renewals_list?.length))) && (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No data found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Week Drill-Down Modal ─── */}
      {weekModal && (() => {
        const week = weekModal.week;
        const wd = computeWeekData(data, week.start, week.end);
        const days = getDaysInRange(week.start, week.end);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={() => setWeekModal(null)}>
            <div
              className="bg-white w-full max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-sm font-bold">W{week.num}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base">{week.label}</h3>
                  <p className="text-xs text-gray-500">{week.range}</p>
                </div>
                <button
                  onClick={() => setWeekModal(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Week Summary Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={() => wd.revenueList.length > 0 && setWeekModal({ week, type: "revenue" })}
                    className={`bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center ${wd.revenueList.length > 0 ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
                  >
                    <IndianRupee className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-emerald-600 uppercase">Revenue</p>
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(wd.revenue)}</p>
                  </div>
                  <div
                    onClick={() => wd.newJoinsList.length > 0 && setWeekModal({ week, type: "new_joins" })}
                    className={`bg-violet-50 rounded-xl p-3 border border-violet-100 text-center ${wd.newJoinsList.length > 0 ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
                  >
                    <UserPlus className="w-4 h-4 text-violet-600 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-violet-600 uppercase">New Joins</p>
                    <p className="text-sm font-bold text-violet-700">{wd.newJoinsList.length}</p>
                  </div>
                  <div
                    onClick={() => wd.renewalsList.length > 0 && setWeekModal({ week, type: "renewals" })}
                    className={`bg-blue-50 rounded-xl p-3 border border-blue-100 text-center ${wd.renewalsList.length > 0 ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
                  >
                    <RefreshCw className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-blue-600 uppercase">Renewals</p>
                    <p className="text-sm font-bold text-blue-700">{wd.renewalsList.length}</p>
                  </div>
                </div>

                {/* Week Lists (if a type is selected) */}
                {weekModal.type === "revenue" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="text-xs font-medium text-gray-500">{wd.revenueList.length} payments</span>
                      <span className="text-sm font-bold text-emerald-600">Total: {formatCurrency(wd.revenue)}</span>
                    </div>
                    {wd.revenueList.map((p, i) => (
                      <div key={p.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(p.member_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{p.member_name}</p>
                          {p.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(getPaymentDate(p)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • {p.payment_mode}</p>
                        </div>
                        <p className="font-bold text-emerald-600 text-sm whitespace-nowrap">₹{Number(p.amount).toLocaleString("en-IN")}</p>
                      </div>
                    ))}
                  </div>
                )}
                {weekModal.type === "new_joins" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="text-xs font-medium text-gray-500">{wd.newJoinsList.length} members</span>
                    </div>
                    {wd.newJoinsList.map((m, i) => (
                      <div key={m.id || i} onClick={() => router.push(`/members/${m.id}`)} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(m.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{m.full_name}</p>
                          {m.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>}
                          <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(m.join_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-medium text-violet-600">{m.plan_name}</p>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {weekModal.type === "renewals" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="text-xs font-medium text-gray-500">{wd.renewalsList.length} renewals</span>
                    </div>
                    {wd.renewalsList.map((r, i) => (
                      <div key={r.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(r.member_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{r.member_name}</p>
                          {r.phone && <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{r.phone}</span>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(r.start_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            {" → "}
                            {new Date(r.end_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">{r.plan_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Day-wise Breakdown */}
                {!weekModal.type && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      Day-wise Breakdown
                    </h4>
                    <div className="space-y-2">
                      {days.map((day) => {
                        const dd = computeDayData(data, day);
                        const dayHasData = dd.revenue > 0 || dd.newJoinsList.length > 0 || dd.renewalsList.length > 0;
                        const dayLabel = day.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
                        return (
                          <div
                            key={day.toISOString()}
                            className={`rounded-xl border border-gray-100 p-3 ${dayHasData ? "bg-white cursor-pointer active:scale-[0.98] transition-transform" : "bg-gray-50"}`}
                            onClick={() => dayHasData && setDayModal({ day, type: null })}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-gray-800">{dayLabel}</p>
                              {dayHasData && <ChevronRight className="w-4 h-4 text-gray-400" />}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center">
                                <p className="text-[10px] text-emerald-600 font-medium">Revenue</p>
                                <p className="text-xs font-bold text-emerald-700">{dd.revenue > 0 ? formatCurrency(dd.revenue) : "₹0"}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-violet-600 font-medium">New Joins</p>
                                <p className="text-xs font-bold text-violet-700">{dd.newJoinsList.length}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-blue-600 font-medium">Renewals</p>
                                <p className="text-xs font-bold text-blue-700">{dd.renewalsList.length}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Day Detail Modal ─── */}
      {dayModal && (() => {
        const dd = computeDayData(data, dayModal.day);
        const dayStr = dayModal.day.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
        return (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center" onClick={() => setDayModal(null)}>
            <div
              className="bg-white w-full max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base">Day Details</h3>
                  <p className="text-xs text-gray-500">{dayStr}</p>
                </div>
                <button
                  onClick={() => setDayModal(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Day Summary */}
                <div className="grid grid-cols-3 gap-2">
                  <div
                    onClick={() => dd.revenueList.length > 0 && setDayModal({ day: dayModal.day, type: "revenue" })}
                    className={`bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center ${dd.revenueList.length > 0 ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
                  >
                    <IndianRupee className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-emerald-600 uppercase">Revenue</p>
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(dd.revenue)}</p>
                  </div>
                  <div
                    onClick={() => dd.newJoinsList.length > 0 && setDayModal({ day: dayModal.day, type: "new_joins" })}
                    className={`bg-violet-50 rounded-xl p-3 border border-violet-100 text-center ${dd.newJoinsList.length > 0 ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
                  >
                    <UserPlus className="w-4 h-4 text-violet-600 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-violet-600 uppercase">New Joins</p>
                    <p className="text-sm font-bold text-violet-700">{dd.newJoinsList.length}</p>
                  </div>
                  <div
                    onClick={() => dd.renewalsList.length > 0 && setDayModal({ day: dayModal.day, type: "renewals" })}
                    className={`bg-blue-50 rounded-xl p-3 border border-blue-100 text-center ${dd.renewalsList.length > 0 ? "cursor-pointer active:scale-95 transition-transform" : ""}`}
                  >
                    <RefreshCw className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <p className="text-[10px] font-medium text-blue-600 uppercase">Renewals</p>
                    <p className="text-sm font-bold text-blue-700">{dd.renewalsList.length}</p>
                  </div>
                </div>

                {/* Day Detail Lists */}
                {dayModal.type === "revenue" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <span className="text-xs font-medium text-gray-500">{dd.revenueList.length} payments</span>
                      <span className="text-sm font-bold text-emerald-600">Total: {formatCurrency(dd.revenue)}</span>
                    </div>
                    {dd.revenueList.map((p, i) => (
                      <div key={p.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(p.member_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{p.member_name}</p>
                          {p.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
                          <p className="text-xs text-gray-400 mt-0.5 capitalize">{p.payment_mode}</p>
                        </div>
                        <p className="font-bold text-emerald-600 text-sm whitespace-nowrap">₹{Number(p.amount).toLocaleString("en-IN")}</p>
                      </div>
                    ))}
                  </div>
                )}
                {dayModal.type === "new_joins" && (
                  <div className="space-y-2">
                    <div className="px-1 mb-2">
                      <span className="text-xs font-medium text-gray-500">{dd.newJoinsList.length} members</span>
                    </div>
                    {dd.newJoinsList.map((m, i) => (
                      <div key={m.id || i} onClick={() => router.push(`/members/${m.id}`)} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(m.full_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{m.full_name}</p>
                          {m.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-medium text-violet-600">{m.plan_name}</p>
                          <ChevronRight className="w-4 h-4 text-gray-400 ml-auto mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {dayModal.type === "renewals" && (
                  <div className="space-y-2">
                    <div className="px-1 mb-2">
                      <span className="text-xs font-medium text-gray-500">{dd.renewalsList.length} renewals</span>
                    </div>
                    {dd.renewalsList.map((r, i) => (
                      <div key={r.id || i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(r.member_name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{r.member_name}</p>
                          {r.phone && <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{r.phone}</span>}
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(r.start_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            {" → "}
                            {new Date(r.end_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-100">{r.plan_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state for day with no details selected yet */}
                {!dayModal.type && (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-xs">Tap a stat above to see details</p>
                  </div>
                )}

                {/* Empty state for selected type with no data */}
                {dayModal.type && (
                  (dayModal.type === "revenue" && dd.revenueList.length === 0) ||
                  (dayModal.type === "new_joins" && dd.newJoinsList.length === 0) ||
                  (dayModal.type === "renewals" && dd.renewalsList.length === 0)
                ) && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No data found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
