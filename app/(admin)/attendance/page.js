"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";

// Mock data
const mockAttendance = [
  {
    id: 1,
    memberId: 1,
    name: "John Doe",
    checkIn: "06:30 AM",
    checkOut: "08:00 AM",
    status: "checked-out",
  },
  {
    id: 2,
    memberId: 2,
    name: "Jane Smith",
    checkIn: "07:15 AM",
    checkOut: null,
    status: "checked-in",
  },
  {
    id: 3,
    memberId: 3,
    name: "Mike Johnson",
    checkIn: "06:45 AM",
    checkOut: "08:30 AM",
    status: "checked-out",
  },
  {
    id: 4,
    memberId: 4,
    name: "Sarah Wilson",
    checkIn: "08:00 AM",
    checkOut: null,
    status: "checked-in",
  },
  {
    id: 5,
    memberId: 5,
    name: "Tom Brown",
    checkIn: "05:30 AM",
    checkOut: "07:00 AM",
    status: "checked-out",
  },
];

const mockMembers = [
  { id: 1, name: "John Doe", phone: "9876543210", plan: "Premium" },
  { id: 2, name: "Jane Smith", phone: "9876543211", plan: "Basic" },
  { id: 3, name: "Mike Johnson", phone: "9876543212", plan: "Premium" },
  { id: 4, name: "Sarah Wilson", phone: "9876543213", plan: "Basic" },
  { id: 5, name: "Tom Brown", phone: "9876543214", plan: "Premium" },
  { id: 6, name: "Emily Davis", phone: "9876543215", plan: "Standard" },
  { id: 7, name: "Chris Lee", phone: "9876543216", plan: "Premium" },
];

export default function AttendancePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [activeTab, setActiveTab] = useState("today");
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState(mockAttendance);

  const todayStats = {
    total: attendance.length,
    checkedIn: attendance.filter((a) => a.status === "checked-in").length,
    checkedOut: attendance.filter((a) => a.status === "checked-out").length,
  };

  const handleCheckOut = (id) => {
    setAttendance((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
            ...a,
            checkOut: new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: "checked-out",
          }
          : a
      )
    );
  };

  return (
    <div className="min-h-screen bg-page pb-24">
      <Header title="Attendance" showBack={false} />

      <main className="px-4 py-4">
        {/* Date Selector */}
        <div className="flex items-center gap-3 mb-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F97316] outline-none transition-all"
          />
          <button
            onClick={() =>
              setSelectedDate(new Date().toISOString().split("T")[0])
            }
            className="px-4 py-3 btn-gradient-orange text-white rounded-xl text-sm font-semibold"
          >
            Today
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card padding="md" className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {todayStats.total}
            </p>
            <p className="text-xs text-gray-600 font-medium">Total</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {todayStats.checkedIn}
            </p>
            <p className="text-xs text-gray-600 font-medium">Active</p>
          </Card>
          <Card padding="md" className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {todayStats.checkedOut}
            </p>
            <p className="text-xs text-gray-600 font-medium">Completed</p>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {["today", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${activeTab === tab
                ? "btn-gradient-orange text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200"
                }`}
            >
              {tab === "today" ? "Today's Log" : "History"}
            </button>
          ))}
        </div>

        {/* Today's Attendance List */}
        {activeTab === "today" && (
          <div className="space-y-3">
            {attendance.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm">
                <span className="text-4xl">📋</span>
                <p className="text-gray-500 mt-2">No attendance records yet</p>
                <button
                  onClick={() => setShowMarkModal(true)}
                  className="mt-4 px-6 py-2 btn-gradient-orange text-white rounded-lg text-sm font-semibold"
                >
                  Mark First Entry
                </button>
              </div>
            ) : (
              attendance.map((record) => (
                <div
                  key={record.id}
                  className="bg-white rounded-xl p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{
                        background: 'linear-gradient(135deg, #F97316 0%, #FF8C42 100%)'
                      }}>
                        {record.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {record.name}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="text-green-500">
                            ↓ {record.checkIn}
                          </span>
                          {record.checkOut && (
                            <span className="text-red-500">
                              ↑ {record.checkOut}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {record.status === "checked-in" ? (
                        <button
                          onClick={() => handleCheckOut(record.id)}
                          className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm font-medium"
                        >
                          Check Out
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-sm">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">
                Attendance History
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { date: "Jan 15, 2025", count: 45, peakTime: "6-8 AM" },
                { date: "Jan 14, 2025", count: 52, peakTime: "6-8 AM" },
                { date: "Jan 13, 2025", count: 38, peakTime: "5-7 PM" },
                { date: "Jan 12, 2025", count: 41, peakTime: "6-8 AM" },
                { date: "Jan 11, 2025", count: 35, peakTime: "7-9 AM" },
              ].map((day, index) => (
                <div
                  key={index}
                  onClick={() =>
                    router.push(`/attendance/history?date=${day.date}`)
                  }
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{day.date}</p>
                    <p className="text-sm text-gray-500">
                      Peak: {day.peakTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{day.count}</p>
                    <p className="text-xs text-gray-500">check-ins</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mark Attendance FAB */}
      <button
        onClick={() => setShowMarkModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 btn-gradient-orange text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40"
      >
        ✓
      </button>

      {/* Mark Attendance Modal */}
      {showMarkModal && (
        <MarkAttendanceModal
          members={mockMembers}
          attendance={attendance}
          onClose={() => setShowMarkModal(false)}
          onMarkAttendance={(member) => {
            const newRecord = {
              id: attendance.length + 1,
              memberId: member.id,
              name: member.name,
              checkIn: new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              checkOut: null,
              status: "checked-in",
            };
            setAttendance((prev) => [newRecord, ...prev]);
            setShowMarkModal(false);
          }}
        />
      )}
    </div>
  );
}

// Mark Attendance Modal Component
function MarkAttendanceModal({
  members,
  attendance,
  onClose,
  onMarkAttendance,
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const alreadyCheckedIn = attendance
    .filter((a) => a.status === "checked-in")
    .map((a) => a.memberId);

  const filteredMembers = members.filter(
    (m) =>
      !alreadyCheckedIn.includes(m.id) &&
      (m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery))
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Mark Attendance</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="Search member by name or phone..."
            className="w-full px-4 py-3 bg-gray-100 rounded-xl outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-4">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No members found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => onMarkAttendance(member)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{
                    background: 'linear-gradient(135deg, #F97316 0%, #FF8C42 100%)'
                  }}>
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-500">
                      {member.phone} • {member.plan}
                    </p>
                  </div>
                  <span className="text-green-500 text-xl">+</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
