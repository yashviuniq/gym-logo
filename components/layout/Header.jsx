"use client";

import { useRouter } from "next/navigation";

export default function Header({ title, showBack = true }) {
  const router = useRouter();

  return (
    <header className="sticky top-0 bg-white border-b border-gray-100 z-40">
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition text-gray-700 text-2xl font-bold min-w-[40px] flex items-center justify-center"
              aria-label="Go back"
            >
              ←
            </button>
          )}
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        </div>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition">
          🔔
        </button>
      </div>
    </header>
  );
}
