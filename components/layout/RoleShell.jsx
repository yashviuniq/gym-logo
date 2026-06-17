"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
import SSLogo from "@/components/shared/SSLogo";

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
  const [gymLogo, setGymLogo] = useState(null);
  const [gymName, setGymName] = useState("");
  const navItems = role === "trainer" ? trainerNavItems : memberNavItems;
  const homePath = navItems[0]?.href;

  useEffect(() => {
    let cancelled = false;

    const fetchGym = async (gymId) => {
      if (!gymId) return false;
      const { supabase } = await import("@/lib/supabaseClient");
      const { data } = await supabase
        .from("gyms")
        .select("name, logo_url")
        .eq("id", gymId)
        .maybeSingle();

      if (!cancelled && data) {
        setGymName(data.name || "");
        if (data.logo_url) setGymLogo(data.logo_url);
        return Boolean(data.logo_url);
      }

      return false;
    };

    const resolveGymBrand = async () => {
      const storedGym = localStorage.getItem("selectedGym");
      if (storedGym) {
        try {
          const gym = JSON.parse(storedGym);
          setGymName(gym.name || "");
          if (gym.logo_url) {
            setGymLogo(gym.logo_url);
            return;
          }
          if (await fetchGym(gym.id)) return;
        } catch (error) {
          console.error("Error parsing selectedGym", error);
        }
      }

      const storedUser = localStorage.getItem("gymUser");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          setGymName(user.gym_name || user.gymName || "");
          const savedLogo = user.gym_logo || user.gymLogo || user.logo_url;
          if (savedLogo) {
            setGymLogo(savedLogo);
            return;
          }
          if (await fetchGym(user.gym_id || user.gymId)) return;
        } catch (error) {
          console.error("Error parsing gymUser", error);
        }
      }

      const storedMember = localStorage.getItem("member");
      if (storedMember) {
        try {
          const member = JSON.parse(storedMember);
          const savedLogo = member.gym_logo || member.gymLogo || member.logo_url;
          if (savedLogo) {
            setGymLogo(savedLogo);
            return;
          }
          if (await fetchGym(member.gym_id || member.gymId)) return;

          const { supabase } = await import("@/lib/supabaseClient");
          const { data } = await supabase
            .from("members")
            .select("gym_id")
            .eq("id", member.id)
            .maybeSingle();
          await fetchGym(data?.gym_id);
        } catch (error) {
          console.error("Error fetching member gym logo", error);
        }
      }
    };

    resolveGymBrand();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="hidden md:block sticky top-0 z-40 border-b-[5px] border-black bg-white px-6 py-4 shadow-[0_8px_0_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
        <Link href={homePath} className="flex items-center gap-3">
          {gymLogo ? (
            <img
              src={gymLogo}
              alt={gymName ? `${gymName} logo` : "Gym logo"}
              className="h-11 w-11 rounded-2xl border-2 border-black bg-white object-cover shadow-[4px_4px_0_rgba(0,0,0,1)]"
            />
          ) : (
            <SSLogo size="sm" showWordmark={false} />
          )}
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-sm font-black uppercase tracking-widest text-[#1a1c1c]">
              {gymName || (role === "trainer" ? "Trainer Portal" : "Member Portal")}
            </p>
            <img
              src="/icons/ss-hexagon.svg"
              alt="SS hexagon"
              className="h-6 w-6 shrink-0"
            />
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
