"use client";

const COLOR_MAP = {
  blue: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100/80",
    border: "border-blue-200/60",
    text: "text-blue-900",
    iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
    trendBg: "bg-blue-100 text-blue-600",
  },
  green: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/80",
    border: "border-emerald-200/60",
    text: "text-emerald-900",
    iconBg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    trendBg: "bg-emerald-100 text-emerald-600",
  },
  amber: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100/80",
    border: "border-amber-200/60",
    text: "text-amber-900",
    iconBg: "bg-gradient-to-br from-amber-500 to-amber-600",
    trendBg: "bg-amber-100 text-amber-600",
  },
  indigo: {
    bg: "bg-gradient-to-br from-indigo-50 to-indigo-100/80",
    border: "border-indigo-200/60",
    text: "text-indigo-900",
    iconBg: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    trendBg: "bg-indigo-100 text-indigo-600",
  },
};

export default function KPICard({ title, value, icon, color = "blue", trend, onClick }) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <button
      onClick={onClick}
      className={`${c.bg} ${c.border} rounded-xl p-3 border active:shadow-none text-left w-full active:scale-[0.97] transition-transform`}
      style={{ minHeight: "100px" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 ${c.iconBg} rounded-xl flex items-center justify-center text-white`}
        >
          {icon}
        </div>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 ${c.trendBg} rounded-full`}
          >
            {trend}
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${c.text} mb-1`}>{value}</p>
      <p className="text-xs font-medium text-gray-600 truncate">{title}</p>
    </button>
  );
}
