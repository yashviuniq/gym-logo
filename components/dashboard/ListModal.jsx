"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Reusable bottom-sheet modal for the dashboard.
 * Replaces three identical modal patterns (attendance, payments, activity).
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - title: string
 *  - subtitle: string
 *  - icon: ReactNode (lucide icon)
 *  - iconBg: tailwind bg class, e.g. "bg-indigo-100"
 *  - iconColor: tailwind text class, e.g. "text-indigo-600"
 *  - footer: ReactNode (optional CTA button)
 *  - children: list content
 */
export default function ListModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  iconBg = "bg-gray-100",
  iconColor = "text-gray-600",
  footer,
  children,
}) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}
            >
              <div className={iconColor}>{icon}</div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              {subtitle && (
                <p className="text-xs text-gray-500">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
