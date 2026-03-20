"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";

function getStoredGym() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedGym = localStorage.getItem("selectedGym");

  if (!storedGym) {
    return null;
  }

  try {
    return JSON.parse(storedGym);
  } catch {
    return null;
  }
}

export default function TransactionsPage() {
  const router = useRouter();
  const initialGym = getStoredGym();
  const [filterMode, setFilterMode] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(Boolean(initialGym));
  const [selectedGym] = useState(initialGym);

  async function fetchTransactions(gymId) {
    try {
      const { data: payments, error } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          payment_mode,
          status,
          paid_at,
          created_at,
          collected_by,
          collected_by_name,
          collector:profiles!collected_by(
            first_name,
            last_name
          ),
          members (
            id,
            full_name,
            phone
          )
        `)
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error fetching transactions:", error);
        setTransactions([]);
      } else {
        const transformedTransactions = payments.map((payment) => {
          // Resolve collector name: prefer collected_by_name, then profiles join, then null
          let collectorName = null;
          if (payment.collected_by_name && !payment.collected_by_name.includes('@')) {
            collectorName = payment.collected_by_name;
          } else if (payment.collector) {
            const fn = payment.collector.first_name || "";
            const ln = payment.collector.last_name || "";
            const fullName = `${fn} ${ln}`.trim();
            if (fullName) collectorName = fullName;
          }

          return {
            id: payment.id,
            name: payment.members?.full_name || "Unknown",
            type: "membership",
            amount: parseFloat(payment.amount),
            mode: payment.payment_mode?.toLowerCase() || "cash",
            date: payment.paid_at || payment.created_at,
            status: payment.status || "paid",
            collectedBy: collectorName,
            collectedByFallback: payment.collected_by || null,
          };
        });
        setTransactions(transformedTransactions);
      }
    } catch (err) {
      console.error("Error:", err);
      setTransactions([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (selectedGym?.id) {
      const timerId = setTimeout(() => {
        fetchTransactions(selectedGym.id);
      }, 0);

      return () => clearTimeout(timerId);
    }

    return undefined;
  }, [selectedGym]);

  const filteredTransactions = transactions.filter((txn) => {
    const matchesMode = filterMode === "all" || txn.mode === filterMode;
    const matchesType = filterType === "all" || txn.type === filterType;
    return matchesMode && matchesType;
  });

  const totalAmount = filteredTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="All Transactions" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="All Transactions" />
        <div className="px-4 py-4 text-center">
          <p className="text-gray-500">Please select a gym first</p>
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="All Transactions" />

      <main className="px-4 py-4 space-y-4">
        {/* Summary */}
        <div className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">
              Total ({filteredTransactions.length} transactions)
            </p>
            <p className="text-2xl font-bold text-green-600">
              ₹{totalAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", "cash", "upi", "card"].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize whitespace-nowrap ${
                  filterMode === mode
                    ? "bg-black text-white"
                    : "bg-white text-gray-600 border border-gray-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", "membership", "personal_training", "supplements"].map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize whitespace-nowrap ${
                    filterType === type
                      ? "bg-black text-white"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  {type.replace("_", " ")}
                </button>
              )
            )}
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredTransactions.map((txn) => (
              <div
                key={txn.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    txn.collectedBy ? "bg-purple-100" : "bg-green-100"
                  }`}>
                    <span className={`font-bold ${txn.collectedBy ? "text-purple-600" : "text-green-600"}`}>₹</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{txn.name}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {txn.type.replace("_", " ")} • {txn.mode} • {formatDate(txn.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+₹{txn.amount}</p>
                  {txn.status === "partial" && (
                    <span className="text-xs text-orange-500">Partial</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No transactions found</p>
          </div>
        )}
      </main>
    </div>
  );
}
