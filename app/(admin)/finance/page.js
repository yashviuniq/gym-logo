"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";

// Mock data
const mockStats = {
  todayCollection: 8500,
  monthlyRevenue: 125000,
  pendingDues: 15000,
  monthlyExpenses: 45000,
};

const mockRecentTransactions = [
  {
    id: 1,
    name: "John Doe",
    type: "membership",
    amount: 2500,
    mode: "upi",
    date: "Today, 10:30 AM",
    status: "paid",
  },
  {
    id: 2,
    name: "Jane Smith",
    type: "personal_training",
    amount: 5000,
    mode: "cash",
    date: "Today, 09:15 AM",
    status: "paid",
  },
  {
    id: 3,
    name: "Mike Johnson",
    type: "membership",
    amount: 1000,
    mode: "card",
    date: "Yesterday",
    status: "partial",
  },
  {
    id: 4,
    name: "Sarah Wilson",
    type: "supplements",
    amount: 1500,
    mode: "upi",
    date: "Yesterday",
    status: "paid",
  },
  {
    id: 5,
    name: "Tom Brown",
    type: "membership",
    amount: 2500,
    mode: "cash",
    date: "Jan 14",
    status: "paid",
  },
];

const mockPendingPayments = [
  {
    id: 1,
    name: "Tom Brown",
    phone: "9876543214",
    amount: 3000,
    dueDate: "Jan 20",
    daysOverdue: 0,
  },
  {
    id: 2,
    name: "Emily Davis",
    phone: "9876543215",
    amount: 2500,
    dueDate: "Jan 18",
    daysOverdue: 2,
  },
  {
    id: 3,
    name: "Chris Lee",
    phone: "9876543216",
    amount: 1500,
    dueDate: "Jan 15",
    daysOverdue: 5,
  },
  {
    id: 4,
    name: "Alex Turner",
    phone: "9876543217",
    amount: 2000,
    dueDate: "Jan 12",
    daysOverdue: 8,
  },
];

const mockPaymentModes = [
  { mode: "UPI", amount: 65000, percentage: 52 },
  { mode: "Cash", amount: 40000, percentage: 32 },
  { mode: "Card", amount: 20000, percentage: 16 },
];

export default function FinancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [dateFilter, setDateFilter] = useState("month");

  const netProfit = mockStats.monthlyRevenue - mockStats.monthlyExpenses;

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
              ₹{mockStats.todayCollection.toLocaleString()}
            </p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-blue-600 text-sm">Monthly Revenue</p>
            <p className="text-2xl font-bold text-blue-700">
              ₹{(mockStats.monthlyRevenue / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-red-600 text-sm">Pending Dues</p>
            <p className="text-2xl font-bold text-red-700">
              ₹{(mockStats.pendingDues / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-purple-600 text-sm">Net Profit</p>
            <p className="text-2xl font-bold text-purple-700">
              ₹{(netProfit / 1000).toFixed(1)}K
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
                {mockPaymentModes.map((item) => (
                  <div key={item.mode}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{item.mode}</span>
                      <span className="font-medium">
                        ₹{item.amount.toLocaleString()}
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
                ))}
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
                {mockRecentTransactions.map((txn) => (
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
                        +₹{txn.amount}
                      </p>
                      {txn.status === "partial" && (
                        <span className="text-xs text-orange-500">Partial</span>
                      )}
                    </div>
                  </div>
                ))}
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
                {mockPendingPayments.length} members with dues
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {mockPendingPayments.map((member) => (
                <div key={member.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.phone}</p>
                    </div>
                    <p className="text-lg font-bold text-red-500">
                      ₹{member.amount}
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
                      <button
                        onClick={() =>
                          router.push(`/members/${member.id}/payment`)
                        }
                        className="px-3 py-1 text-sm btn-gradient-orange text-white rounded-lg"
                      >
                        Collect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === "expenses" && <ExpensesSection router={router} />}
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
function ExpensesSection({ router }) {
  const mockExpenses = [
    { id: 1, category: "Rent", amount: 25000, date: "Jan 01", icon: "🏠" },
    {
      id: 2,
      category: "Electricity",
      amount: 8000,
      date: "Jan 05",
      icon: "⚡",
    },
    {
      id: 3,
      category: "Trainer Salary",
      amount: 15000,
      date: "Jan 01",
      icon: "👨‍🏫",
    },
    { id: 4, category: "Equipment", amount: 5000, date: "Jan 10", icon: "🏋️" },
    {
      id: 5,
      category: "Maintenance",
      amount: 2000,
      date: "Jan 12",
      icon: "🔧",
    },
  ];

  const totalExpenses = mockExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <>
      {/* Expense Summary */}
      <div className="bg-orange-50 rounded-xl p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-orange-600 text-sm">Total Expenses (Jan)</p>
            <p className="text-2xl font-bold text-orange-700">
              ₹{totalExpenses.toLocaleString()}
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
        <div className="divide-y divide-gray-100">
          {mockExpenses.map((expense) => (
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
                </div>
              </div>
              <p className="font-semibold text-red-500">
                -₹{expense.amount.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
