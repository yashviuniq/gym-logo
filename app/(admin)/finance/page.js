"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";

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
    // Get selected gym from localStorage
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

      // Calculate date ranges based on filter
      let startDate = today;
      if (dateFilter === "week") {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        startDate = weekStart.toISOString().split('T')[0];
      } else if (dateFilter === "month") {
        startDate = firstDayOfMonth.toISOString().split('T')[0];
      }

      // Fetch payments data
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

      // Fetch members with pending dues
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

      // Fetch expenses for the period
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
        console.log("Payments data:", payments); // Debug log
        
        // Calculate financial stats
        const todayPayments = payments.filter(p => 
          new Date(p.created_at).toDateString() === new Date().toDateString()
        );
        
        const todayCollection = todayPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

        console.log("Today payments:", todayPayments.length, "Total:", todayCollection); // Debug log
        console.log("All payments:", payments.length, "Total:", totalRevenue); // Debug log

        const monthlyExpenses = expensesData?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;

        setFinancialData(prev => ({
          ...prev,
          todayCollection,
          monthlyRevenue: dateFilter === "month" ? totalRevenue : prev.monthlyRevenue,
          pendingDues: membersData?.reduce((sum, m) => sum + (m.balance || 0), 0) || 0,
          monthlyExpenses: monthlyExpenses,
        }));

        // Set recent transactions (last 10)
        const transformedTransactions = payments.slice(0, 10).map((payment) => ({
          id: payment.id,
          name: payment.members?.full_name || "Unknown",
          type: "membership", // Could be enhanced with payment type
          amount: payment.amount,
          mode: payment.payment_mode,
          date: formatDate(payment.created_at),
          status: payment.status,
        }));
        setRecentTransactions(transformedTransactions);

        // Calculate payment modes breakdown
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
        console.log("Members with balance:", membersData); // Debug log
        // Set pending payments
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
            dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : "No due date",
            daysOverdue,
          };
        });
        setPendingPayments(pendingData);
      }

    } catch (err) {
      console.error("Error fetching financial data:", err);
      if (err.message) {
        console.error("Error message:", err.message);
      }
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString("en-US", { 
        hour: "2-digit", 
        minute: "2-digit" 
      })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      });
    }
  };

  const handleCollectPayment = async (memberId, amount) => {
    try {
      const { error } = await supabase
        .from("payments")
        .insert({
          member_id: memberId,
          gym_id: selectedGym.id,
          amount,
          payment_mode: "cash", // Can be updated based on selection
          status: "completed",
          paid_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update member balance
      await supabase
        .from("members")
        .update({ balance: 0 })
        .eq("id", memberId);

      // Refresh data
      fetchFinancialData(selectedGym.id);
    } catch (error) {
      console.error("Error collecting payment:", error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4 pb-20">
        <Header title="Finance" />
        <div className="flex items-center justify-center mt-20">
          <div className="text-white">Loading financial data...</div>
        </div>
      </div>
    );
  }

  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 p-4 pb-20">
        <Header title="Finance" />
        <div className="flex items-center justify-center mt-20">
          <div className="text-white text-center">
            <p>Please select a gym from the dashboard to view financial data.</p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="mt-4 px-6 py-2 bg-white text-purple-600 rounded-lg font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page pb-24">
      <Header title="Finance" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Date Filter */}
        <div className="flex gap-2">
          {["today", "week", "month"].map((filter) => (
            <button
              key={filter}
              onClick={() => setDateFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${dateFilter === filter
                ? "btn-gradient-orange text-white"
                : "bg-white text-gray-600 border border-gray-200"
                }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-green-600 text-sm">Today's Collection</p>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(financialData.todayCollection)}
            </p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-blue-600 text-sm">
              {dateFilter === "today" ? "Today" : dateFilter === "week" ? "Weekly" : "Monthly"} Revenue
            </p>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(financialData.monthlyRevenue)}
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-red-600 text-sm">Pending Dues</p>
            <p className="text-2xl font-bold text-red-700">
              {formatCurrency(financialData.pendingDues)}
            </p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-purple-600 text-sm">Net Profit</p>
            <p className="text-2xl font-bold text-purple-700">
              {formatCurrency(financialData.monthlyRevenue - financialData.monthlyExpenses)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {["overview", "pending", "expenses"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize ${activeTab === tab
                ? "btn-gradient-orange text-white"
                : "bg-white text-gray-600 border border-gray-200"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Payment Modes Breakdown */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">
                Payment Modes
              </h3>
              <div className="space-y-3">
                {paymentModes.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No payment data available</p>
                ) : (
                  paymentModes.map((item) => (
                    <div key={item.mode}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.mode}</span>
                        <span className="font-medium">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.percentage}%`,
                            background: 'linear-gradient(135deg, #F97316 0%, #FF8C42 100%)'
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">
                  Recent Transactions
                </h3>
                <button
                  onClick={() => router.push("/finance/transactions")}
                  className="text-sm text-blue-600"
                >
                  View All
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {recentTransactions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p>No recent transactions</p>
                  </div>
                ) : (
                  recentTransactions.map((txn) => (
                    <div
                      key={txn.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600">₹</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{txn.name}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {txn.type.replace("_", " ")} • {txn.mode} • {txn.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          +{formatCurrency(txn.amount)}
                        </p>
                        {txn.status === "partial" && (
                          <span className="text-xs text-orange-500">Partial</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Pending Tab */}
        {activeTab === "pending" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Pending Payments</h3>
              <p className="text-sm text-gray-500">
                {pendingPayments.length} members with dues
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingPayments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No pending payments</p>
                </div>
              ) : (
                pendingPayments.map((member) => (
                  <div key={member.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.phone}</p>
                      </div>
                      <p className="text-lg font-bold text-red-500">
                        {formatCurrency(member.amount)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${member.daysOverdue > 0
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-600"
                          }`}
                      >
                        {member.daysOverdue > 0
                          ? `${member.daysOverdue} days overdue`
                          : `Due: ${member.dueDate}`}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            window.open(`https://wa.me/91${member.phone}`)
                          }
                          className="px-3 py-1 text-sm bg-green-100 text-green-600 rounded-lg"
                        >
                          Remind
                        </button>
                        
                      </div>
                    </div>
                  </div>
                ))
              )}
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
        className="fixed bottom-24 right-4 w-14 h-14 btn-gradient-orange text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40"
      >
        +
      </button>
    </div>
  );
}

// Expenses Section Component
function ExpensesSection({ router, selectedGym, dateFilter }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const expenseCategories = {
    rent: { name: "Rent", icon: "🏠" },
    electricity: { name: "Electricity", icon: "⚡" },
    salary: { name: "Trainer Salary", icon: "👨‍🏫" },
    equipment: { name: "Equipment", icon: "🏋️" },
    maintenance: { name: "Maintenance", icon: "🔧" },
    supplements: { name: "Supplements", icon: "💊" },
    marketing: { name: "Marketing", icon: "📢" },
    other: { name: "Other", icon: "📦" },
  };

  useEffect(() => {
    if (selectedGym) {
      fetchExpenses(selectedGym.id);
    }
  }, [selectedGym, dateFilter]);

  const fetchExpenses = async (gymId) => {
    try {
      setLoading(true);
      
      // Calculate date range based on filter
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
        category: expenseCategories[expense.category]?.name || expense.category,
        amount: parseFloat(expense.amount),
        date: new Date(expense.expense_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric"
        }),
        icon: expenseCategories[expense.category]?.icon || "📦",
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
      <div className="bg-white rounded-xl p-8 text-center">
        <p className="text-gray-500">Loading expenses...</p>
      </div>
    );
  }

  return (
    <>
      {/* Expense Summary */}
      <div className="bg-orange-50 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-orange-600 text-sm">
              Total Expenses ({dateFilter === "today" ? "Today" : dateFilter === "week" ? "This Week" : getMonthName()})
            </p>
            <p className="text-2xl font-bold text-orange-700">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <button
            onClick={() => router.push("/finance/expenses/add")}
            className="px-4 py-2 btn-gradient-orange text-white rounded-lg text-sm font-medium"
          >
            + Add
          </button>
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Expenses</h3>
        </div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No expenses recorded yet</p>
            <button
              onClick={() => router.push("/finance/expenses/add")}
              className="mt-4 px-4 py-2 btn-gradient-orange text-white rounded-lg text-sm font-medium"
            >
              Add First Expense
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span>{expense.icon}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {expense.category}
                    </p>
                    <p className="text-xs text-gray-500">{expense.date}</p>
                    {expense.notes && (
                      <p className="text-xs text-gray-400 mt-1">{expense.notes}</p>
                    )}
                  </div>
                </div>
                <p className="font-semibold text-red-500">
                  -{formatCurrency(expense.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
