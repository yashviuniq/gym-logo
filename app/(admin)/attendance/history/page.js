"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";

const mockHistoryData = [
  {
    id: 1,
    name: "John Doe",
    checkIn: "06:30 AM",
    checkOut: "08:00 AM",
    duration: "1h 30m",
  },
  {
    id: 2,
    name: "Jane Smith",
    checkIn: "07:15 AM",
    checkOut: "09:00 AM",
    duration: "1h 45m",
  },
  {
    id: 3,
    name: "Mike Johnson",
    checkIn: "06:45 AM",
    checkOut: "08:30 AM",
    duration: "1h 45m",
  },
  {
    id: 4,
    name: "Sarah Wilson",
    checkIn: "08:00 AM",
    checkOut: "09:30 AM",
    duration: "1h 30m",
  },
  {
    id: 5,
    name: "Tom Brown",
    checkIn: "05:30 AM",
    checkOut: "07:00 AM",
    duration: "1h 30m",
  },
];

function AttendanceHistoryContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date") || "Jan 15, 2025";
  const [filterTime, setFilterTime] = useState("all");

  const timeFilters = ["all", "morning", "afternoon", "evening"];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title={`Attendance - ${dateParam}`} />

      <main className="px-4 py-4">
        {/* Summary */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-6 text-white mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold">{mockHistoryData.length}</p>
              <p className="text-gray-300 text-sm">Total</p>
            </div>
            <div>
              <p className="text-3xl font-bold">6-8 AM</p>
              <p className="text-gray-300 text-sm">Peak Time</p>
            </div>
            <div>
              <p className="text-3xl font-bold">1h 36m</p>
              <p className="text-gray-300 text-sm">Avg Duration</p>
            </div>
          </div>
        </div>

        {/* Time Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {timeFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterTime(filter)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filterTime === filter
                  ? "bg-black text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>

        {/* Attendance List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {mockHistoryData.map((record) => (
              <div key={record.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {record.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{record.name}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="text-green-500">
                          ↓ {record.checkIn}
                        </span>
                        <span className="text-red-500">
                          ↑ {record.checkOut}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {record.duration}
                    </p>
                    <p className="text-xs text-gray-500">duration</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AttendanceHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Attendance History" />
        <main className="px-4 py-4">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        </main>
      </div>
    }>
      <AttendanceHistoryContent />
    </Suspense>
  );
}
