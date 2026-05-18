"use client";

import { useRouter } from "next/navigation";
import { DollarSign, TrendingUp } from "lucide-react";

export default function RevenueCard({ totalRevenue, pendingDues, canViewFinance }) {
  const router = useRouter();

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-4 text-white mx-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-gray-300 text-xs font-medium mb-1">Revenue</p>
          <p className="text-2xl font-bold text-white">
            {canViewFinance
              ? `₹${(totalRevenue / 1000).toFixed(1)}K`
              : "*****"}
          </p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <p className="text-green-400 text-xs font-medium"></p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 pl-3">
          <p className="text-gray-300 text-xs font-medium mb-1">Pending Dues</p>
          <p className="text-xl font-bold text-blue-400">
            {canViewFinance
              ? `₹${(pendingDues / 1000).toFixed(1)}K`
              : "*****"}
          </p>
        </div>
      </div>
      <button
        onClick={() => router.push("/finance")}
        className="w-full py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg font-medium active:bg-white/20 transition-colors text-sm"
        style={{ minHeight: "44px" }}
      >
        <div className="flex items-center justify-center gap-2">
          <DollarSign className="w-4 h-4" />
          View Finance Dashboard
        </div>
      </button>
    </div>
  );
}
