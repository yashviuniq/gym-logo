"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";

export default function AttendancePage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [activeTab, setActiveTab] = useState("today");
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    // Get selected gym from localStorage
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      fetchAttendanceData(gym.id, selectedDate);
      fetchMembers(gym.id);
      fetchHistoryData(gym.id);
    } else {
      setLoading(false);
    }
  }, [selectedDate]);

  const fetchAttendanceData = async (gymId, date) => {
    setLoading(true);
    try {
      const { data: attendanceData, error } = await supabase
        .from("attendance")
        .select(`
          id,
          member_id,
          check_in_time,
          check_out_time,
          count,
          members (
            id,
            full_name,
            phone
          )
        `)
        .eq("gym_id", gymId)
        .eq("check_in_date", date)
        .order("check_in_time", { ascending: false });

      if (error) {
        console.error("Error fetching attendance:", error);
        setAttendance([]);
      } else {
        const transformedAttendance = attendanceData?.map((record) => ({
          id: record.id,
          memberId: record.member_id,
          name: record.members?.full_name || "Unknown",
          checkIn: new Date(`1970-01-01T${record.check_in_time}`).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          checkOut: record.check_out_time
            ? new Date(`1970-01-01T${record.check_out_time}`).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : null,
          status: record.check_out_time ? "checked-out" : "checked-in",
        })) || [];
        setAttendance(transformedAttendance);
      }
    } catch (err) {
      console.error("Error:", err);
      setAttendance([]);
    }
    setLoading(false);
  };

  const fetchMembers = async (gymId) => {
    try {
      const { data: membersData, error } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          memberships (
            id,
            status,
            end_date,
            membership_plans (name)
          )
        `)
        .eq("gym_id", gymId);

      if (error) {
        console.error("Error fetching members:", error);
        setMembers([]);
      } else {
        const transformedMembers = membersData?.map((member) => {
          const activeMembership = member.memberships?.find(m => m.status === "active");
          return {
            id: member.id,
            name: member.full_name,
            phone: member.phone,
            plan: activeMembership?.membership_plans?.name || "No Plan",
          };
        }) || [];
        setMembers(transformedMembers);
      }
    } catch (err) {
      console.error("Error:", err);
      setMembers([]);
    }
  };

  const fetchHistoryData = async (gymId) => {
    try {
      // Fetch last 7 days of attendance data
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      });

      const historyPromises = last7Days.map(async (date) => {
        const { data, error } = await supabase
          .from("attendance")
          .select("id, check_in_time")
          .eq("gym_id", gymId)
          .eq("check_in_date", date);

        if (error) return null;

        // Calculate peak time
        const hours = data?.map(record => {
          const hour = new Date(`1970-01-01T${record.check_in_time}`).getHours();
          return hour;
        }) || [];

        const hourCounts = {};
        hours.forEach(hour => {
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const peakHour = Object.keys(hourCounts).reduce((a, b) => 
          hourCounts[a] > hourCounts[b] ? a : b, 0);

        const peakTime = peakHour ? `${peakHour}:00-${parseInt(peakHour) + 2}:00` : "N/A";

        return {
          date: new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          }),
          count: data?.length || 0,
          peakTime: peakTime,
          rawDate: date,
        };
      });

      const historyResults = await Promise.all(historyPromises);
      setHistoryData(historyResults.filter(Boolean));
    } catch (err) {
      console.error("Error fetching history:", err);
      setHistoryData([]);
    }
  };

  const todayStats = {
    total: attendance.length,
    checkedIn: attendance.filter((a) => a.status === "checked-in").length,
    checkedOut: attendance.filter((a) => a.status === "checked-out").length,
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-page pb-24">
        <Header title="Attendance" showBack={false} />
        <main className="px-4 py-4">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </main>
      </div>
    );
  }

  // Show message if no gym selected
  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-page pb-24">
        <Header title="Attendance" showBack={false} />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <span className="text-4xl">🏢</span>
            <p className="text-gray-500 mt-2">Please select a gym first</p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="mt-4 px-6 py-2 bg-[#F97316] text-white rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const handleCheckOut = async (id, memberId) => {
    try {
      const currentTime = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      const { error } = await supabase
        .from("attendance")
        .update({ check_out_time: currentTime })
        .eq("id", id);

      if (error) {
        console.error("Error checking out:", error);
        alert("Failed to check out. Please try again.");
        return;
      }

      // Update local state
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
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to check out. Please try again.");
    }
  };

  const handleMarkAttendance = async (member) => {
    if (!selectedGym) return;

    try {
      const currentTime = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      const { data: newRecord, error } = await supabase
        .from("attendance")
        .insert({
          gym_id: selectedGym.id,
          member_id: member.id,
          check_in_date: selectedDate,
          check_in_time: currentTime,
          count: 1,
        })
        .select(`
          id,
          member_id,
          check_in_time,
          check_out_time,
          members (
            id,
            full_name,
            phone
          )
        `)
        .single();

      if (error) {
        console.error("Error marking attendance:", error);
        if (error.code === "23505") { // Unique constraint violation
          alert("Member already checked in today!");
        } else {
          alert("Failed to mark attendance. Please try again.");
        }
        return;
      }

      // Add to local state
      const transformedRecord = {
        id: newRecord.id,
        memberId: newRecord.member_id,
        name: newRecord.members?.full_name || member.name,
        checkIn: new Date(`1970-01-01T${newRecord.check_in_time}`).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        checkOut: null,
        status: "checked-in",
      };

      setAttendance((prev) => [transformedRecord, ...prev]);
      setShowMarkModal(false);
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to mark attendance. Please try again.");
    }
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
                          onClick={() => handleCheckOut(record.id, record.memberId)}
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
              {historyData.length > 0 ? (
                historyData.map((day, index) => (
                  <div
                    key={index}
                    onClick={() =>
                      router.push(`/attendance/history?date=${day.rawDate}`)
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
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No attendance history available
                </div>
              )}
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
          members={members}
          attendance={attendance}
          onClose={() => setShowMarkModal(false)}
          onMarkAttendance={handleMarkAttendance}
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
