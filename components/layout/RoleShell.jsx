"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Apple,
  BookOpen,
  CalendarCheck,
  Dumbbell,
  Home,
  ShoppingBag,
  Settings,
  Trophy,
  User,
  Users,
} from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";

const memberNavItems = [
  { href: "/user/dashboard", label: "Home", icon: Home },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/diet", label: "Diet", icon: Apple },
  { href: "/leaderboard", label: "Ranks", icon: Trophy },
  { href: "/shop", label: "Shop", icon: ShoppingBag },
  { href: "/knowledge", label: "Know", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: User },
];

const trainerNavItems = [
  { href: "/trainer/dashboard", label: "Home", icon: Home },
  { href: "/members", label: "Members", icon: Users },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/settings/diet-plans", label: "Diet", icon: Apple },
  { href: "/settings/workout-plans", label: "Workout", icon: Dumbbell },
  { href: "/admin/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
];

function DesktopNav({ role }) {
  const pathname = usePathname();
  const navItems = role === "trainer" ? trainerNavItems : memberNavItems;
  const homePath = navItems[0]?.href;

  return (
    <header className="hidden md:block sticky top-0 z-40 border-b border-[#eadbd1] bg-[#fffaf6]/92 px-6 py-4 backdrop-blur-xl shadow-[0_10px_30px_rgba(26,28,28,0.04)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
        <Link href={homePath} className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f0813d] text-lg font-black text-black">
            SS
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-[#1a1c1c]">
              {role === "trainer" ? "Trainer Portal" : "Member Portal"}
            </p>
            <p className="text-xs font-semibold text-[#897267]">Hybrid web and mobile dashboard</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== homePath && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                  active
                    ? "bg-[#f0813d] text-black shadow-[0_12px_30px_rgba(240,129,61,0.24)]"
                    : "text-[#897267] hover:bg-[#f0813d]/10 hover:text-[#1a1c1c]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export default function RoleShell({ children, role }) {
  return (
    <div className="member-light-theme min-h-screen bg-[#f5f0ec] font-sans md:bg-[#f5f0ec]">
      <DesktopNav role={role} />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden bg-[#f5f0ec] md:min-h-[calc(100vh-80px)] md:max-w-6xl md:bg-transparent md:px-6 md:py-6">
        <div className="flex-1 overflow-y-auto pb-24 no-scrollbar md:overflow-visible md:pb-8">
          {children}
        </div>
        <BottomNav role={role} />
      </div>
    </div>
  );
}
