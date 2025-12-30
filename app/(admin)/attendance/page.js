"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";
import { Search, User, Clock, Calendar, CheckCircle, XCircle } from "lucide-react";

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
  const [searchModalQuery, setSearchModalQuery] = useState("");

  useEffect(() => {
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
        console.log("Fetched members:", membersData); // Debug log
        const transformedMembers = membersData?.map((member) => {
          const activeMembership = member.memberships?.find(m => m.status === "active");
          return {
            id: member.id,
            name: member.full_name || "Unnamed Member",
            phone: member.phone || "No Phone",
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

        const hours = data?.map(record => {
          const hour = new Date(`1970-01-01T${record.check_in_time}`).getHours();
          return hour;
        }) || [];

        const hourCounts = {};
        hours.forEach(hour => {
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        const peakHour = Object.keys(hourCounts).reduce((a, b) => 
          hourCounts[a] > hourCounts[b] ? a : b, null);

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

  // Filter attendance by search query
  const filteredAttendance = useMemo(() => {
    if (!searchQuery) return attendance;
    return attendance.filter(record =>
      record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.memberId?.toString().includes(searchQuery)
    );
  }, [attendance, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-24">
        <Header title="Attendance" showBack={false} />
        <main className="px-4 py-4">
          <div className="flex items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-24">
        <Header title="Attendance" showBack={false} />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏢</span>
            </div>
            <p className="text-gray-600 text-lg font-medium mb-2">No Gym Selected</p>
            <p className="text-gray-500 mb-6">Please select a gym first to manage attendance</p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all"
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
        if (error.code === "23505") {
          alert("Member already checked in today!");
        } else {
          alert("Failed to mark attendance. Please try again.");
        }
        return;
      }

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
      setSearchModalQuery("");
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to mark attendance. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-24">
      <Header title="Attendance" showBack={false} />

      <main className="px-4 py-4">
        {/* Date Selector */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button
            onClick={() =>
              setSelectedDate(new Date().toISOString().split("T")[0])
            }
            className="px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            Today
          </button>
        </div>

        {/* Search Bar for Attendance List */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search attendance records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-sm"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl mb-3 mx-auto">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900 text-center">
              {todayStats.total}
            </p>
            <p className="text-xs text-gray-600 font-medium text-center">Total</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl mb-3 mx-auto">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600 text-center">
              {todayStats.checkedIn}
            </p>
            <p className="text-xs text-gray-600 font-medium text-center">Active</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl mb-3 mx-auto">
              <XCircle className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600 text-center">
              {todayStats.checkedOut}
            </p>
            <p className="text-xs text-gray-600 font-medium text-center">Completed</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
          {["today", "history"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "today" ? "Today's Log" : "History"}
            </button>
          ))}
        </div>

        {/* Today's Attendance List */}
        {activeTab === "today" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Attendance Records</h3>
              <span className="text-sm text-gray-500">
                {filteredAttendance.length} {filteredAttendance.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            
            {filteredAttendance.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-gray-700 font-medium mb-2">No attendance records</p>
                <p className="text-gray-500 text-sm mb-6">No one has checked in for this date yet</p>
                <button
                  onClick={() => setShowMarkModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  Mark First Entry
                </button>
              </div>
            ) : (
              filteredAttendance.map((record) => (
                <div
                  key={record.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-md">
                        {record.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {record.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-sm text-green-600">
                            <Clock className="w-3 h-3" />
                            <span>In: {record.checkIn}</span>
                          </div>
                          {record.checkOut && (
                            <div className="flex items-center gap-1 text-sm text-red-600">
                              <Clock className="w-3 h-3" />
                              <span>Out: {record.checkOut}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      {record.status === "checked-in" ? (
                        <button
                          onClick={() => handleCheckOut(record.id, record.memberId)}
                          className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-sm font-medium shadow-sm hover:shadow-md transition-all"
                        >
                          Check Out
                        </button>
                      ) : (
                        <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">
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
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-lg">
                Attendance History
              </h3>
              <p className="text-gray-500 text-sm mt-1">Last 7 days</p>
            </div>
            <div className="divide-y divide-gray-100">
              {historyData.length > 0 ? (
                historyData.map((day, index) => (
                  <div
                    key={index}
                    onClick={() =>
                      router.push(`/attendance/history?date=${day.rawDate}`)
                    }
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-all"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{day.date}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <p className="text-sm text-gray-500">
                          Peak: {day.peakTime}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 text-xl">{day.count}</p>
                      <p className="text-xs text-gray-500">check-ins</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">No attendance history available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mark Attendance FAB */}
      <button
        onClick={() => setShowMarkModal(true)}
        className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-xl flex items-center justify-center text-2xl z-40 hover:shadow-2xl transition-all hover:scale-105"
      >
        <User className="w-6 h-6" />
      </button>

      {/* Mark Attendance Modal */}
      {showMarkModal && (
        <MarkAttendanceModal
          members={members}
          attendance={attendance}
          searchQuery={searchModalQuery}
          setSearchQuery={setSearchModalQuery}
          onClose={() => {
            setShowMarkModal(false);
            setSearchModalQuery("");
          }}
          onMarkAttendance={handleMarkAttendance}
        />
      )}
    </div>
  );
}

// Improved Mark Attendance Modal Component
function MarkAttendanceModal({
  members,
  attendance,
  searchQuery,
  setSearchQuery,
  onClose,
  onMarkAttendance,
}) {
  // Get members already checked in today
  const alreadyCheckedIn = attendance
    .filter((a) => a.status === "checked-in")
    .map((a) => a.memberId);

  // Filter members based on search and exclude already checked-in
  const filteredMembers = members.filter((member) => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery);
    
    const isAlreadyCheckedIn = alreadyCheckedIn.includes(member.id);
    
    return matchesSearch && !isAlreadyCheckedIn;
  });

  // Debug log to see what's happening
  useEffect(() => {
    console.log("All members:", members);
    console.log("Filtered members:", filteredMembers);
    console.log("Search query:", searchQuery);
    console.log("Already checked in IDs:", alreadyCheckedIn);
  }, [members, filteredMembers, searchQuery]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Mark Attendance</h3>
              <p className="text-gray-500 text-sm mt-1">Select a member to check in</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XCircle className="w-6 h-6 text-gray-400" />
            </button>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search member by name or phone..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          
          {/* Summary */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <span className="text-gray-600">
              {filteredMembers.length} members found
            </span>
            <span className="text-orange-600">
              {alreadyCheckedIn.length} already checked in
            </span>
          </div>
        </div>

        {/* Member List */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          {filteredMembers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-700 font-medium mb-2">No members found</p>
              <p className="text-gray-500 text-sm">
                {searchQuery 
                  ? "Try a different search term" 
                  : "All members are already checked in or no members available"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => onMarkAttendance(member)}
                  className="flex items-center gap-4 p-4 hover:bg-orange-50 rounded-xl transition-all cursor-pointer border border-gray-100 hover:border-orange-200 group"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {member.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {member.phone}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {member.plan}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}