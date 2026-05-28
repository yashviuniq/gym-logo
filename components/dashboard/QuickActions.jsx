"use client";

import { useRouter } from "next/navigation";
import {
  UserPlus,
  CheckCircle,
  MessageCircle,
  UserCheck,
  CreditCard,
  Users,
  ClipboardList,
} from "lucide-react";
import { hasPermission, PERMISSIONS } from "@/lib/constants/permissions";

const ACTIONS = [
  { label: "Add Member", icon: <UserPlus className="w-4 h-4" />, href: "/members/add", color: "bg-blue-500", permission: PERMISSIONS.MEMBERS },
  { label: "Attendance", icon: <CheckCircle className="w-4 h-4" />, href: "/attendance", color: "bg-green-500", permission: PERMISSIONS.ATTENDANCE },
  { label: "Messaging", icon: <MessageCircle className="w-4 h-4" />, href: "/messaging", color: "bg-emerald-500", permission: PERMISSIONS.MEMBERS },
  { label: "Trainer Att.", icon: <UserCheck className="w-4 h-4" />, href: "/settings/trainers/attendance", color: "bg-violet-500", permission: PERMISSIONS.SETTINGS, adminOnly: true },
  { label: "Payment", icon: <CreditCard className="w-4 h-4" />, href: "/finance", color: "bg-indigo-500", permission: PERMISSIONS.FINANCE },
  { label: "Members", icon: <Users className="w-4 h-4" />, href: "/members", color: "bg-blue-600", permission: PERMISSIONS.MEMBERS },
  { label: "Inquiries", icon: <ClipboardList className="w-4 h-4" />, href: "/inquiries", color: "bg-purple-500", permission: PERMISSIONS.INQUIRIES },
];

const colorStyles = {
  "bg-blue-500":
    "bg-[#3768f8]/10 text-[#3768f8] border border-[#3768f8]/10",

  "bg-green-500":
    "bg-[#d9ff3f]/20 text-[#84cc16] border border-[#d9ff3f]/30",

  "bg-emerald-500":
    "bg-emerald-100 text-emerald-600 border border-emerald-200",

  "bg-violet-500":
    "bg-violet-100 text-violet-600 border border-violet-200",

  "bg-indigo-500":
    "bg-indigo-100 text-indigo-600 border border-indigo-200",

  "bg-blue-600":
    "bg-sky-100 text-sky-600 border border-sky-200",

  "bg-purple-500":
    "bg-purple-100 text-purple-600 border border-purple-200",
};
export default function QuickActions({ permissions, canCreateTrainer }) {
  const router = useRouter();

  const visibleActions = ACTIONS.filter((action) => {
    if (!hasPermission(permissions, action.permission)) return false;
    if (action.adminOnly && !canCreateTrainer) return false;
    return true;
  });

  if (visibleActions.length === 0) return null;

  return (
    <div className="bg-white border border-[#ececec] rounded-3xl p-5 shadow-[0_10px_40px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-black text-[#1a1c1c] tracking-tight font-heading">
  Quick Actions
</h3>
      </div>
      <div className="flex space-x-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {visibleActions.map((action) => {
          const style = colorStyles[action.color] || colorStyles["bg-blue-500"];
          return (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="flex-shrink-0 w-24 flex flex-col items-center justify-center p-3 rounded-2xl bg-[#fafafa] hover:bg-white border border-[#ececec] hover:border-[#f0813d]/25 active-scale transition-all duration-300 group"
              style={{ minHeight: "80px" }}
            >
              <div
                className={`w-12 h-12 ${style} rounded-2xl flex items-center justify-center mb-2 transition-all duration-300`}
              >
                {action.icon}
              </div>
              <span className="text-[10px] font-bold text-[#5f5e5e] text-center leading-tight tracking-wide px-0.5 transition-colors truncate w-full group-hover:text-[#1a1c1c]">
  {action.label}
</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
