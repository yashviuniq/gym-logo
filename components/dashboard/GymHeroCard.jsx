"use client";

import { Building, TrendingUp } from "lucide-react";

export default function GymHeroCard({ gym }) {
  if (!gym) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 text-white mx-1">
      <div className="relative">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30 flex-shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-blue-100 text-xs font-medium mb-0.5">
              Currently Managing
            </p>
            <h3 className="font-bold text-base truncate">{gym.name}</h3>
            <p className="text-blue-100 text-xs truncate mt-0.5">
              {gym.address}
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
  );
}
