"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import RouteLoadingScreen from "@/components/shared/RouteLoadingScreen";

function isModifiedClick(event) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export default function RouteTransitionOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [loadingVariant, setLoadingVariant] = useState("default");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsNavigating(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (event) => {
      if (isModifiedClick(event)) return;

      const link = event.target?.closest?.("a[href]");
      if (!link) return;

      const target = link.getAttribute("target");
      const href = link.getAttribute("href");
      if (!href || target === "_blank" || href.startsWith("#")) return;

      const nextUrl = new URL(href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;

      const currentPath = `${window.location.pathname}${window.location.search}`;
      const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
      if (currentPath === nextPath) return;

      if (nextUrl.pathname.includes("/members")) {
        setLoadingVariant("members");
      } else if (nextUrl.pathname.includes("/settings/trainers")) {
        setLoadingVariant("trainers");
      } else if (nextUrl.pathname.includes("/settings/amenities")) {
        setLoadingVariant("amenities");
      } else if (nextUrl.pathname.includes("/settings/notifications")) {
        setLoadingVariant("notifications");
      } else if (nextUrl.pathname.includes("/finance")) {
        setLoadingVariant("finance");
      } else if (nextUrl.pathname.includes("/knowledge")) {
        setLoadingVariant("knowledge");
      } else if (nextUrl.pathname.includes("/shop")) {
        setLoadingVariant("shop");
      } else {
        setLoadingVariant("default");
      }

      setIsNavigating(true);
    };

    const handlePageShow = () => setIsNavigating(false);
    document.addEventListener("click", handleClick, true);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  useEffect(() => {
    if (!isNavigating) return undefined;

    const timeout = window.setTimeout(() => {
      setIsNavigating(false);
    }, 12000);

    return () => window.clearTimeout(timeout);
  }, [isNavigating]);

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <RouteLoadingScreen variant={loadingVariant} />
    </div>
  );
}
