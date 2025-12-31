"use client";

import { useEffect } from "react";

export default function Toast({ message, type = "success", isVisible, onClose }) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-close after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const typeStyles = {
    success: {
      bg: "bg-green-50 border-green-200",
      text: "text-green-800",
      icon: "✓",
      iconBg: "bg-green-500",
    },
    error: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-800",
      icon: "✕",
      iconBg: "bg-red-500",
    },
    warning: {
      bg: "bg-yellow-50 border-yellow-200",
      text: "text-yellow-800",
      icon: "⚠",
      iconBg: "bg-yellow-500",
    },
    info: {
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-800",
      icon: "ℹ",
      iconBg: "bg-blue-500",
    },
  };

  const styles = typeStyles[type] || typeStyles.success;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div
        className={`${styles.bg} ${styles.text} border-2 rounded-xl shadow-lg p-4 min-w-[300px] max-w-[400px] flex items-start gap-3`}
      >
        <div
          className={`${styles.iconBg} text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0`}
        >
          {styles.icon}
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm leading-relaxed">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

