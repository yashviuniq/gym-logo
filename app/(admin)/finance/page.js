"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CreditCard,
  Wallet,
  Calendar,
  Filter,
  ChevronRight,
  Plus,
  Download,
  Receipt,
  Users,
  BarChart3,
  History,
  Search,
  Phone,
  Mail,
  FileText,
  Zap,
  Home,
  Briefcase,
  Wrench,
  Pill,
  Megaphone,
  Package
} from "lucide-react";

export default function FinancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateFilter, setDateFilter] = useState("month");
  const [selectedGym, setSelectedGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [financialData, setFinancialData] = useState({
    todayCollection: 0,
    monthlyRevenue: 0,
    pendingDues: 0,
    monthlyExpenses: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [paymentModes, setPaymentModes] = useState([]);

  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      fetchFinancialData(gym.id);
    } else {
      setLoading(false);
    }
  }, [dateFilter]);

  const fetchFinancialData = async (gymId) => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);

      let startDate = today;
      if (dateFilter === "week") {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        startDate = weekStart.toISOString().split('T')[0];
      } else if (dateFilter === "month") {
        startDate = firstDayOfMonth.toISOString().split('T')[0];
      }

      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          payment_mode,
          status,
          paid_at,
          created_at,
          members (
            id,
            full_name,
            phone
          )
        `)
        .eq("gym_id", gymId)
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          balance,
          memberships (
            id,
            end_date,
            status
          )
        `)
        .eq("gym_id", gymId)
        .gt("balance", 0);

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("amount")
        .eq("gym_id", gymId)
        .gte("expense_date", startDate);

      if (expensesError) {
        console.error("Expenses query error:", expensesError);
      }

      if (paymentsError) {
        console.error("Payments query error:", paymentsError);
      }
      
      if (membersError) {
        console.error("Members query error:", membersError);
      }

      if (!paymentsError && payments) {
        const todayPayments = payments.filter(p => 
          new Date(p.created_at).toDateString() === new Date().toDateString()
        );
        
        const todayCollection = todayPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

        const monthlyExpenses = expensesData?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;

        setFinancialData(prev => ({
          ...prev,
          todayCollection,
          monthlyRevenue: dateFilter === "month" ? totalRevenue : prev.monthlyRevenue,
          pendingDues: membersData?.reduce((sum, m) => sum + (m.balance || 0), 0) || 0,
          monthlyExpenses: monthlyExpenses,
        }));

        const transformedTransactions = payments.slice(0, 10).map((payment) => ({
          id: payment.id,
          name: payment.members?.full_name || "Unknown",
          type: "membership",
          amount: payment.amount,
          mode: payment.payment_mode,
          date: formatDate(payment.created_at),
          status: payment.status,
        }));
        setRecentTransactions(transformedTransactions);

        const modeStats = payments.reduce((acc, payment) => {
          const mode = payment.payment_mode?.toUpperCase() || "UNKNOWN";
          acc[mode] = (acc[mode] || 0) + payment.amount;
          return acc;
        }, {});

        const totalAmount = Object.values(modeStats).reduce((sum, amount) => sum + amount, 0);
        const modesArray = Object.entries(modeStats).map(([mode, amount]) => ({
          mode,
          amount,
          percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
        }));
        setPaymentModes(modesArray);
      }

      if (!membersError && membersData) {
        const pendingData = membersData.map((member) => {
          const activeMembership = member.memberships?.find(m => m.status === "active");
          const dueDate = activeMembership?.end_date || null;
          const daysOverdue = dueDate ? 
            Math.max(0, Math.ceil((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24))) : 0;

          return {
            id: member.id,
            name: member.full_name,
            phone: member.phone,
            amount: member.balance,
            dueDate: dueDate ? new Date(dueDate).toLocaleDateString("en-IN") : "No due date",
            daysOverdue,
          };
        });
        setPendingPayments(pendingData);
      }

    } catch (err) {
      console.error("Error fetching financial data:", err);
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString("en-IN", { 
        hour: "2-digit", 
        minute: "2-digit" 
      })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-IN", { 
        month: "short", 
        day: "numeric" 
      });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getPaymentModeIcon = (mode) => {
    switch(mode?.toLowerCase()) {
      case 'cash': return <Wallet className="w-4 h-4" />;
      case 'upi': return <CreditCard className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-14 h-14 border-4 border-transparent border-t-blue-500 rounded-full animate-spin animation-delay-200"></div>
        </div>
        <p className="mt-6 text-gray-600 font-medium text-sm">Loading financial data...</p>
      </div>
    );
  }

  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
        <Header title="Finance" showBack={false} />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <DollarSign className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No Gym Selected</h2>
            <p className="text-gray-500 text-sm mb-6 px-4">
              Please select a gym to view financial data
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              style={{ minHeight: '44px' }}
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
      <Header title="Finance" showBack={false} />

      <main className="px-3 py-3 space-y-4">
        {/* Date Filter - Mobile Optimized */}
        <div className="bg-white rounded-xl p-3 mx-1 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Period</span>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {["today", "week", "month"].map((filter) => (
              <button
                key={filter}
                onClick={() => setDateFilter(filter)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 capitalize flex items-center gap-2 ${
                  dateFilter === filter
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{ minHeight: '36px' }}
              >
                <Calendar className="w-3.5 h-3.5" />
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 gap-2 px-1">
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Today's Collection</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">
                  {formatCurrency(financialData.todayCollection)}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">
                  {dateFilter === "today" ? "Today" : dateFilter === "week" ? "Weekly" : "Monthly"} Revenue
                </p>
                <p className="text-xl font-bold text-blue-600 mt-0.5">
                  {formatCurrency(financialData.monthlyRevenue)}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Pending Dues</p>
                <p className="text-xl font-bold text-amber-600 mt-0.5">
                  {formatCurrency(financialData.pendingDues)}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Net Profit</p>
                <p className="text-xl font-bold text-indigo-600 mt-0.5">
                  {formatCurrency(financialData.monthlyRevenue - financialData.monthlyExpenses)}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs - Mobile Optimized */}
        <div className="bg-white rounded-xl p-3 mx-1 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">View</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
              { id: "pending", label: "Pending", icon: <Clock className="w-4 h-4" /> },
              { id: "expenses", label: "Expenses", icon: <Receipt className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-3 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{ minHeight: '64px' }}
              >
                <div className="mb-1">
                  {tab.icon}
                </div>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-3 pb-20">
            {/* Payment Modes Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm mx-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Payment Modes</h3>
                <span className="text-xs text-gray-500">
                  {paymentModes.reduce((sum, item) => sum + item.amount, 0) > 0 
                    ? formatCurrency(paymentModes.reduce((sum, item) => sum + item.amount, 0))
                    : 'No data'}
                </span>
              </div>
              
              <div className="space-y-3">
                {paymentModes.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <CreditCard className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No payment data available</p>
                  </div>
                ) : (
                  paymentModes.map((item) => (
                    <div key={item.mode} className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            {getPaymentModeIcon(item.mode)}
                          </div>
                          <span className="text-gray-600 font-medium">{item.mode}</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm mx-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Recent Transactions</h3>
                <button
                  onClick={() => router.push("/finance/transactions")}
                  className="text-xs text-blue-600 font-medium active:scale-95 transition-transform"
                >
                  View All
                </button>
              </div>
              
              <div className="space-y-2">
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Receipt className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No recent transactions</p>
                  </div>
                ) : (
                  recentTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-all active:scale-95 cursor-pointer"
                      onClick={() => router.push(`/finance/transactions/${txn.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{txn.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 capitalize">
                              {txn.type.replace("_", " ")}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{txn.mode}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-600 text-sm">
                          +{formatCurrency(txn.amount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{txn.date}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pending Tab */}
        {activeTab === "pending" && (
          <div className="space-y-3 pb-20">
            <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm mx-1">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Pending Payments</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pendingPayments.length} members with dues
                  </p>
                </div>
                <span className="text-xs font-semibold text-amber-600">
                  {formatCurrency(financialData.pendingDues)}
                </span>
              </div>
              
              <div className="space-y-2">
                {pendingPayments.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No pending payments</p>
                  </div>
                ) : (
                  pendingPayments.map((member) => (
                    <div
                      key={member.id}
                      className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-3 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{member.phone}</span>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-amber-600">
                          {formatCurrency(member.amount)}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span
                          className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
                            member.daysOverdue > 0
                              ? "bg-gradient-to-br from-red-50 to-red-100 text-red-700 border border-red-200"
                              : "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {member.daysOverdue > 0
                            ? `${member.daysOverdue} days overdue`
                            : `Due: ${member.dueDate}`}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://wa.me/91${member.phone}`);
                            }}
                            className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg active:scale-95 transition-transform flex items-center gap-1"
                            style={{ minHeight: '32px' }}
                          >
                            Remind
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/members/${member.id}/payment`);
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-medium rounded-lg active:scale-95 transition-transform flex items-center gap-1"
                            style={{ minHeight: '32px' }}
                          >
                            Collect
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <ExpensesSection 
            router={router} 
            selectedGym={selectedGym}
            dateFilter={dateFilter}
          />
        )}
      </main>

      {/* Add Payment FAB */}
      <button
        onClick={() => router.push("/finance/add-payment")}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center z-40 hover:shadow-2xl transition-all hover:scale-105 active:scale-95"
        style={{
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
        }}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Export FAB */}
      
    </div>
  );
}

// Expenses Section Component
function ExpensesSection({ router, selectedGym, dateFilter }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const expenseCategories = {
    rent: { name: "Rent", icon: <Home className="w-4 h-4" /> },
    electricity: { name: "Electricity", icon: <Zap className="w-4 h-4" /> },
    salary: { name: "Salary", icon: <Briefcase className="w-4 h-4" /> },
    equipment: { name: "Equipment", icon: <DollarSign className="w-4 h-4" /> },
    maintenance: { name: "Maintenance", icon: <Wrench className="w-4 h-4" /> },
    supplements: { name: "Supplements", icon: <Pill className="w-4 h-4" /> },
    marketing: { name: "Marketing", icon: <Megaphone className="w-4 h-4" /> },
    other: { name: "Other", icon: <Package className="w-4 h-4" /> },
  };

  useEffect(() => {
    if (selectedGym) {
      fetchExpenses(selectedGym.id);
    }
  }, [selectedGym, dateFilter]);

  const fetchExpenses = async (gymId) => {
    try {
      setLoading(true);
      
      const today = new Date();
      let startDate = today.toISOString().split('T')[0];
      
      if (dateFilter === "week") {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        startDate = weekStart.toISOString().split('T')[0];
      } else if (dateFilter === "month") {
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        startDate = firstDayOfMonth.toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("gym_id", gymId)
        .gte("expense_date", startDate)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedExpenses = (data || []).map(expense => ({
        id: expense.id,
        category: expense.category,
        categoryName: expenseCategories[expense.category]?.name || expense.category,
        amount: parseFloat(expense.amount),
        date: new Date(expense.expense_date).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric"
        }),
        fullDate: new Date(expense.expense_date).toLocaleDateString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric"
        }),
        icon: expenseCategories[expense.category]?.icon || <Package className="w-4 h-4" />,
        notes: expense.notes,
      }));

      setExpenses(formattedExpenses);
      
      const total = formattedExpenses.reduce((sum, e) => sum + e.amount, 0);
      setTotalExpenses(total);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getMonthName = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthNames[new Date().getMonth()];
  };

  if (loading) {
    return (
      <div className="space-y-3 pb-20">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mx-1 text-center">
          <p className="text-gray-500 text-sm">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-20">
      {/* Expense Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm mx-1">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 font-medium">
              Total Expenses ({dateFilter === "today" ? "Today" : dateFilter === "week" ? "This Week" : getMonthName()})
            </p>
            <p className="text-xl font-bold text-orange-600 mt-0.5">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <button
            onClick={() => router.push("/finance/expenses/add")}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform flex items-center gap-2"
            style={{ minHeight: '36px' }}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm mx-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm">Recent Expenses</h3>
          <span className="text-xs text-gray-500">
            {expenses.length} items
          </span>
        </div>
        
        {expenses.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-4">No expenses recorded yet</p>
            <button
              onClick={() => router.push("/finance/expenses/add")}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform"
              style={{ minHeight: '36px' }}
            >
              Add First Expense
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-all active:scale-95 cursor-pointer"
                onClick={() => router.push(`/finance/expenses/${expense.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                    <div className="text-orange-600">
                      {expense.icon}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{expense.categoryName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{expense.fullDate}</span>
                      {expense.notes && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-400 truncate max-w-[100px]">
                            {expense.notes}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="font-semibold text-red-500 text-sm">
                  -{formatCurrency(expense.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}