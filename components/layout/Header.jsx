"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotification } from "@/contexts/NotificationContext";

export default function Header({ title, showBack = true, gymLogo = null }) {
  const router = useRouter();
  const { unreadCount, clearUnread, items } = useNotification();

  const [open, setOpen] = useState(false);
  const [localLogo, setLocalLogo] = useState(null);

  const toggleOpen = () => {
    setOpen((v) => !v);
    clearUnread();
    console.log('Bell clicked');
  };

  useEffect(() => {
    if (gymLogo) return;

    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      try {
        const gym = JSON.parse(storedGym);
        if (gym.logo_url) {
          setLocalLogo(gym.logo_url);
          return;
        }
      } catch (e) {
        console.error("Error parsing selectedGym", e);
      }
    }

    // Member fallback — fetch from Supabase
    const storedMember = localStorage.getItem("member");
    if (storedMember) {
      try {
        const member = JSON.parse(storedMember);
        const fetchMemberLogo = async () => {
          const { supabase } = await import("@/lib/supabaseClient");
          const { data } = await supabase
            .from("members")
            .select("gym_id")
            .eq("id", member.id)
            .single();
          if (data?.gym_id) {
            const { data: gymData } = await supabase
              .from("gyms")
              .select("logo_url")
              .eq("id", data.gym_id)
              .single();
            if (gymData?.logo_url) {
              setLocalLogo(gymData.logo_url);
            }
          }
        };
        fetchMemberLogo();
      } catch (e) {
        console.error("Error fetching member logo", e);
      }
    }
  }, [gymLogo]);

  const displayLogo = gymLogo || localLogo;

  return (
    <header className="sticky top-0 bg-white/75 backdrop-blur-2xl border-b border-[#ececec] z-50">
      <div className="flex items-center justify-between px-4 py-4 relative">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="p-2.5 bg-[#fafafa] hover:bg-white border border-[#ececec] rounded-2xl text-[#1a1c1c] transition-all active-scale flex items-center justify-center text-lg font-bold shadow-sm"
              style={{ width: '40px', height: '40px' }}
              aria-label="Go back"
            >
              ←
            </button>
          )}
          {displayLogo && (
            <img
              src={displayLogo}
              alt="Gym Logo"
              className="h-11 w-11 rounded-2xl object-cover border border-[#ececec] shadow-[0_6px_18px_rgba(0,0,0,0.06)]"
            />
          )}
          <h1 className="text-xl font-black tracking-tight text-[#1a1c1c] font-heading">{title}</h1>
        </div>
        
        <button
          className="relative p-2.5 bg-[#fafafa] hover:bg-white border border-[#ececec] rounded-2xl text-[#1a1c1c] transition-all active-scale cursor-pointer flex items-center justify-center shadow-sm"
          style={{ width: '40px', height: '40px' }}
          aria-label="Notifications"
          onClick={toggleOpen}
          type="button"
        >
          <span className="text-lg leading-none" role="img" aria-label="bell">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#f0813d] text-white text-[10px] font-extrabold rounded-full px-1.5 py-[2px] min-w-[18px] text-center shadow-[0_0_10px_rgba(240,129,61,0.3)]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-4 top-16 w-80 bg-white border border-[#ececec] rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.08)] backdrop-blur-2xl z-[60] overflow-hidden animate-slideUp">
            <div className="px-4 py-3 bg-black/2 border-b border-black/5 font-bold text-sm text-[#1a1c1c] tracking-wide uppercase font-heading flex justify-between items-center">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-[#f0813d]/10 text-[#9c4400] px-2 py-0.5 rounded-full font-extrabold uppercase">New</span>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto no-scrollbar">
              {items && items.length > 0 ? (
                items.map((n) => (
                <div key={n.id} className="px-4 py-3 hover:bg-[#fafafa] border-b border-[#f1f1f1] last:border-0 transition-colors duration-200">
                   
                    {n.body && (<div className="text-xs text-zinc-500 leading-relaxed">{n.body}</div>)}
                    <div className="text-[9px] text-zinc-400 font-medium mt-1.5 tracking-wider uppercase">{new Date(n.receivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-sm text-zinc-400 font-medium">
                  <div className="text-2xl mb-2">📥</div>
                  No notifications yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
