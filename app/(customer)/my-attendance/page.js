/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";

// Mock data for customer's attendance
const mockMyAttendance = [
  {
    id: 1,
    date: "2025-01-15",
    checkIn: "06:30 AM",
    checkOut: "08:00 AM",
    duration: "1h 30m",
  },
  {
    id: 2,
    date: "2025-01-14",
    checkIn: "07:00 AM",
    checkOut: "08:30 AM",
    duration: "1h 30m",
  },
  {
    id: 3,
    date: "2025-01-13",
    checkIn: "06:45 AM",
    checkOut: "08:15 AM",
    duration: "1h 30m",
  },
  {
    id: 4,
    date: "2025-01-11",
    checkIn: "07:15 AM",
    checkOut: "08:45 AM",
    duration: "1h 30m",
  },
  {
    id: 5,
    date: "2025-01-10",
    checkIn: "06:30 AM",
    checkOut: "08:00 AM",
    duration: "1h 30m",
  },
];

const monthlyStats = {
  totalDays: 15,
  presentDays: 12,
  streak: 5,
  avgDuration: "1h 32m",
};

export default function CustomerAttendancePage() {
  const [selectedMonth, setSelectedMonth] = useState("January 2025");
  const [viewMode, setViewMode] = useState("list"); // list or calendar

  // Generate calendar data
  const generateCalendarDays = () => {
    const days = [];
    const presentDates = mockMyAttendance.map((a) =>
      new Date(a.date).getDate()
    );

    for (let i = 1; i <= 31; i++) {
      days.push({
        day: i,
        isPresent: presentDates.includes(i),
        isToday: i === 15, // Mock today as 15th
      });
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="My Attendance" />

      <main className="px-4 py-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">This Month</p>
                <p className="text-3xl font-bold">{monthlyStats.presentDays}</p>
                <p className="text-green-100 text-sm">
                  of {monthlyStats.totalDays} days
                </p>
              </div>
              <span className="text-4xl opacity-50">📅</span>
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Current Streak</p>
                <p className="text-3xl font-bold">{monthlyStats.streak}</p>
                <p className="text-orange-100 text-sm">days 🔥</p>
              </div>
              <span className="text-4xl opacity-50">⚡</span>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">
              {monthlyStats.avgDuration}
            </p>
            <p className="text-sm text-gray-500">Avg. Session</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(
                (monthlyStats.presentDays / monthlyStats.totalDays) * 100
              )}
              %
            </p>
            <p className="text-sm text-gray-500">Consistency</p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
              viewMode === "list"
                ? "bg-black text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            📋 List View
          </button>
          <button
            onClick={() => setViewMode("calendar")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
              viewMode === "calendar"
                ? "bg-black text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            📅 Calendar
          </button>
        </div>

        {/* List View */}
        {viewMode === "list" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Sessions</h3>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-sm text-gray-600 bg-transparent outline-none"
              >
                <option>January 2025</option>
                <option>December 2024</option>
                <option>November 2024</option>
              </select>
            </div>
            <div className="divide-y divide-gray-100">
              {mockMyAttendance.map((record) => (
                <div key={record.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatDate(record.date)}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          {record.checkIn}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          {record.checkOut}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {record.duration}
                      </p>
                      <p className="text-xs text-gray-500">workout</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg">←</button>
              <h3 className="font-semibold text-gray-900">{selectedMonth}</h3>
              <button className="p-2 hover:bg-gray-100 rounded-lg">→</button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div key={i} className="text-center text-xs text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for first day offset (assuming month starts on Wednesday) */}
              {[...Array(3)].map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square"></div>
              ))}

              {calendarDays.map((day) => (
                <div
                  key={day.day}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium ${
                    day.isToday
                      ? "bg-black text-white"
                      : day.isPresent
                      ? "bg-green-100 text-green-700"
                      : "text-gray-400"
                  }`}
                >
                  {day.day}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-green-100"></div>
                <span className="text-gray-600">Present</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-black"></div>
                <span className="text-gray-600">Today</span>
              </div>
            </div>
          </div>
        )}

        {/* Motivation Card */}
        <div className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💪</span>
            <div>
              <p className="font-semibold">Keep it up!</p>
              <p className="text-sm text-purple-100">
                You're on a {monthlyStats.streak} day streak. Don t break the
                chain!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

