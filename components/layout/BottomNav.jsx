"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavItems = [
  { href: "/admin/dashboard", label: "Home", icon: "🏠" },
  { href: "/members", label: "Members", icon: "👥" },
  { href: "/attendance", label: "Attendance", icon: "📋" },
  { href: "/announcements", label: "Announcements", icon: "📢" },
  { href: "/finance", label: "Finance", icon: "💰" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

const customerNavItems = [
  { href: "/user/dashboard", label: "Home", icon: "🏠" },
  { href: "/workout", label: "Workout", icon: "💪" },
  { href: "/diet", label: "Diet", icon: "🥗" },
  { href: "/user/announcements", label: "Announcements", icon: "📢" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function BottomNav({ role = "admin" }) {
  const pathname = usePathname();
  const navItems = role === "admin" ? adminNavItems : customerNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 shadow-lg">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all relative ${isActive ? "text-[#F97316]" : "text-gray-400 hover:text-gray-600"
                }`}
            >
              <span className="text-xl mb-1">{item.icon}</span>
              <span className={`text-xs ${isActive ? "font-semibold" : ""}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 bg-[#F97316] rounded-full"></span>
              )}
            </Link>
          );
        })}
        {/* Test link for NotFound page */}
    
      </div>
    </nav>
  );
}
