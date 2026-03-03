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
              {/* Revenue Card */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
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
                  <p className="text-xs font-medium text-emerald-600 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(data?.month_revenue)}
                  </p>
                </div>
              </div>

              {/* Members Card */}
              <div className="bg-white rounded-2xl p-5 border mb-10 border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700">Members</h3>
                  <span className="ml-auto text-xs font-medium text-gray-400">
                    {MONTHS[selectedMonth]} {selectedYear}
                  </span>
                </div>

                {/* New Joins - Highlighted */}
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200 mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <UserPlus className="w-4 h-4 text-violet-600" />
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">
                      New Joins
                    </p>
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
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                      <p className="text-xs font-medium text-gray-500">Renewals</p>
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
      </main>
    </div>
  );
}
