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

export default function QuickActions({ permissions, canCreateTrainer }) {
  const router = useRouter();

  const visibleActions = ACTIONS.filter((action) => {
    if (!hasPermission(permissions, action.permission)) return false;
    if (action.adminOnly && !canCreateTrainer) return false;
    return true;
  });

  if (visibleActions.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-3 mx-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">Quick Actions</h3>
      </div>
      <div className="flex space-x-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
        {visibleActions.map((action) => (
          <button
            key={action.label}
            onClick={() => router.push(action.href)}
            className="flex-shrink-0 w-20 flex flex-col items-center justify-center p-2 rounded-lg bg-gray-50 active:bg-gray-100 active:scale-95 transition-all"
            style={{ minHeight: "72px" }}
          >
            <div
              className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-2 text-white`}
            >
              {action.icon}
            </div>
            <span className="text-xs font-medium text-gray-700 text-center leading-tight px-1">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
