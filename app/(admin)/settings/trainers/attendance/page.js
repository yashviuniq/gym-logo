"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { useUserRole } from "@/lib/hooks/useUserRole";
import {
  Search,
  UserCheck,
  CalendarDays,
  CheckCircle,
  RefreshCw,
  Users,
  IndianRupee,
  Clock,
  ChevronRight,
} from "lucide-react";

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatLocalMonth = (date) => formatLocalDate(date).slice(0, 7);

export default function TrainerAttendanceQuickPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canCreateTrainer, loading: roleLoading } = useUserRole();
  const [selectedGym, setSelectedGym] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trainers, setTrainers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrainerId, setSelectedTrainerId] = useState(searchParams.get("trainerId") || null);
  const [selectedMonth, setSelectedMonth] = useState(formatLocalMonth(new Date()));
  const [viewMode, setViewMode] = useState("today");
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceData, setAttendanceData] = useState({ month: null, summary: null, attendance: [], pt_sessions: [] });

  useEffect(() => {
    if (!roleLoading && !canCreateTrainer) {
      router.push("/admin/dashboard");
      return;
    }

    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      setSelectedGym(JSON.parse(storedGym));
    } else if (!roleLoading) {
      setLoading(false);
    }
  }, [canCreateTrainer, roleLoading, router]);

  const fetchTrainers = useCallback(async () => {
    if (!selectedGym?.id) return;
    setLoading(true);
    try {
      const response = await fetch("/api/trainers/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p_gym_id: selectedGym.id }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        console.error("Error fetching trainers:", result.error);
        setTrainers([]);
        return;
      }

      const list = (result.data?.trainers || []).map((trainer) => ({
        gymTrainerId: trainer.id,
        profileId: trainer.profile_id,
        name: `${trainer.first_name || ""} ${trainer.last_name || ""}`.trim(),
        specialization: trainer.specialization,
        isActive: trainer.is_active,
        monthlySalary: trainer.monthly_salary || 0,
      }));

      setTrainers(list);

      if (list.length > 0) {
        const requestedTrainerId = searchParams.get("trainerId");
        const requestedExists = requestedTrainerId && list.some((trainer) => trainer.gymTrainerId === requestedTrainerId);
        if (requestedExists) {
          setSelectedTrainerId(requestedTrainerId);
        } else if (!selectedTrainerId || !list.some((trainer) => trainer.gymTrainerId === selectedTrainerId)) {
          setSelectedTrainerId(list[0].gymTrainerId);
        }
      }
    } catch (error) {
      console.error("Error fetching trainers:", error);
      setTrainers([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams, selectedGym?.id, selectedTrainerId]);

  const fetchAttendanceSummary = useCallback(async (trainerId, monthValue) => {
    if (!selectedGym?.id || !trainerId) return;
    setAttendanceLoading(true);
    try {
      const response = await fetch("/api/trainers/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_gym_id: selectedGym.id,
          p_trainer_id: trainerId,
          p_month: `${monthValue}-01`,
        }),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        console.error("Error fetching trainer attendance summary:", result.error);
        setAttendanceData({ month: null, summary: null, attendance: [], pt_sessions: [] });
        return;
      }

      setAttendanceData({
        month: result.data?.month || null,
        summary: result.data?.summary || null,
        attendance: result.data?.attendance || [],
        pt_sessions: result.data?.pt_sessions || [],
      });
    } catch (error) {
      console.error("Error fetching trainer attendance summary:", error);
      setAttendanceData({ month: null, summary: null, attendance: [], pt_sessions: [] });
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedGym?.id]);

  useEffect(() => {
    if (selectedGym?.id && canCreateTrainer) {
      fetchTrainers();
    }
  }, [selectedGym?.id, canCreateTrainer, fetchTrainers]);

  useEffect(() => {
    if (selectedGym?.id && selectedTrainerId) {
      fetchAttendanceSummary(selectedTrainerId, selectedMonth);
    }
  }, [selectedGym?.id, selectedTrainerId, selectedMonth, fetchAttendanceSummary]);

  const selectedTrainer = trainers.find((trainer) => trainer.gymTrainerId === selectedTrainerId) || null;

  const attendanceMap = attendanceData.attendance.reduce((map, entry) => {
    map.set(`${entry.attendance_date}-${entry.shift_number}`, entry);
    return map;
  }, new Map());

  const filteredTrainers = (() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return trainers;
    return trainers.filter((trainer) =>
      trainer.name.toLowerCase().includes(query) ||
      String(trainer.specialization || "").toLowerCase().includes(query)
    );
  })();

  const getMonthDays = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const totalDays = new Date(year, month, 0).getDate();

    return Array.from({ length: totalDays }, (_, index) => {
      const currentDate = new Date(year, month - 1, index + 1);
      const dateValue = formatLocalDate(currentDate);
      const isSunday = currentDate.getDay() === 0;
      const closed = attendanceData.month?.sunday_off && isSunday;

      return {
        dateValue,
        label: currentDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        weekday: currentDate.toLocaleDateString("en-IN", { weekday: "short" }),
        closed,
        closedReason: isSunday && attendanceData.month?.sunday_off ? "Gym closed" : "",
      };
    });
  };

  const visibleDays = (() => {
    const monthDays = getMonthDays();
    if (viewMode === "month") return monthDays;

    const currentMonth = formatLocalMonth(new Date());
    const focusDate = currentMonth === selectedMonth
      ? formatLocalDate(new Date())
      : `${selectedMonth}-01`;

    return monthDays.filter((day) => day.dateValue === focusDate).slice(0, 1);
  })();

  const toggleAttendanceShift = async (attendanceDate, shiftNumber) => {
    if (!selectedGym?.id || !selectedTrainer?.profileId) return;

    const existingEntry = attendanceMap.get(`${attendanceDate}-${shiftNumber}`);
    const storedUser = localStorage.getItem("gymUser");
    const user = storedUser ? JSON.parse(storedUser) : null;

    setAttendanceSaving(true);
    try {
      if (existingEntry) {
        const { error } = await supabase
          .from("trainer_attendance")
          .delete()
          .eq("id", existingEntry.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("trainer_attendance")
          .insert({
            gym_id: selectedGym.id,
            trainer_id: selectedTrainer.profileId,
            attendance_date: attendanceDate,
            shift_number: shiftNumber,
            marked_by: user?.id || null,
          });

        if (error) throw error;
      }

      await fetchAttendanceSummary(selectedTrainer.gymTrainerId, selectedMonth);
    } catch (error) {
      console.error("Error updating trainer attendance:", error);
      alert("Failed to update trainer attendance");
    } finally {
      setAttendanceSaving(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Trainer Attendance" />
        <div className="flex items-center justify-center py-16">
          <div className="w-9 h-9 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Trainer Attendance" />
        <main className="px-4 py-6">
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <p className="text-gray-600">No gym selected. Open the dashboard first and choose a gym.</p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Trainer Attendance" />

      <main className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Quick Mark Trainer Attendance</h2>
              <p className="text-sm text-gray-500">Select a trainer, mark today first, or switch to full month view.</p>
            </div>
            <button
              onClick={() => router.push("/settings/trainers")}
              className="px-3 py-2 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100"
            >
              Open Trainer Management
            </button>
          </div>

          <div className="flex gap-3 flex-col lg:flex-row">
            <div className="lg:w-80 shrink-0 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search trainer..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              <div className="max-h-[28rem] overflow-y-auto space-y-2 pr-1">
                {filteredTrainers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                    No trainers found.
                  </div>
                ) : (
                  filteredTrainers.map((trainer) => {
                    const isSelected = trainer.gymTrainerId === selectedTrainerId;
                    return (
                      <button
                        key={trainer.gymTrainerId}
                        onClick={() => {
                          setSelectedTrainerId(trainer.gymTrainerId);
                          setViewMode("today");
                        }}
                        className={`w-full text-left rounded-xl border px-3 py-3 transition-colors ${
                          isSelected
                            ? "border-violet-300 bg-violet-50"
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{trainer.name}</p>
                            <p className="text-xs text-gray-500">
                              {trainer.specialization || "Trainer"}
                              {trainer.monthlySalary ? ` • ₹${Number(trainer.monthlySalary).toLocaleString("en-IN")}` : ""}
                            </p>
                          </div>
                          <ChevronRight className={`w-4 h-4 ${isSelected ? "text-violet-600" : "text-gray-400"}`} />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex-1 space-y-4">
              {selectedTrainer ? (
                <>
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-violet-600 font-semibold">Selected Trainer</p>
                        <h3 className="text-xl font-bold text-gray-900 mt-1">{selectedTrainer.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{selectedTrainer.specialization || "Trainer"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => setViewMode("today")}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${viewMode === "today" ? "bg-violet-600 text-white" : "bg-white text-gray-700 border border-gray-200"}`}
                        >
                          Today First
                        </button>
                        <button
                          onClick={() => setViewMode("month")}
                          className={`px-3 py-2 rounded-lg text-sm font-medium ${viewMode === "month" ? "bg-violet-600 text-white" : "bg-white text-gray-700 border border-gray-200"}`}
                        >
                          View All
                        </button>
                        <button
                          onClick={() => fetchAttendanceSummary(selectedTrainer.gymTrainerId, selectedMonth)}
                          className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50"
                          title="Refresh"
                        >
                          <RefreshCw className={`w-4 h-4 text-gray-500 ${attendanceLoading ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <SummaryCard icon={<CalendarDays className="w-4 h-4 text-gray-600" />} label="Working Days" value={Number(attendanceData.month?.working_days || 0).toLocaleString("en-IN")} />
                    <SummaryCard icon={<UserCheck className="w-4 h-4 text-blue-600" />} label="Attendance Days" value={Number(attendanceData.summary?.attendance_days || 0).toLocaleString("en-IN")} tone="blue" />
                    <SummaryCard icon={<IndianRupee className="w-4 h-4 text-emerald-600" />} label="Salary Earned" value={`₹${Number(attendanceData.summary?.salary_earned || 0).toLocaleString("en-IN")}`} tone="emerald" />
                    <SummaryCard icon={<IndianRupee className="w-4 h-4 text-violet-600" />} label="Total Payable" value={`₹${Number(attendanceData.summary?.total_payable || 0).toLocaleString("en-IN")}`} tone="violet" />
                  </div>

                  <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-gray-900">{viewMode === "today" ? "Today’s Shift Marking" : "Monthly Shift Marking"}</h3>
                        <p className="text-xs text-gray-500">One marked shift counts as half day. Two marked shifts count as full day.</p>
                      </div>
                      <button
                        onClick={() => router.push(`/settings/trainers/${selectedTrainer.gymTrainerId}?tab=attendance`)}
                        className="text-sm font-medium text-violet-700 bg-violet-50 px-3 py-2 rounded-lg hover:bg-violet-100"
                      >
                        Open Full Trainer Page
                      </button>
                    </div>

                    {attendanceLoading ? (
                      <div className="py-10 text-center text-gray-500">Loading attendance...</div>
                    ) : (
                      <div className="space-y-2 max-h-112 overflow-y-auto pr-1">
                        {visibleDays.map((day) => (
                          <div key={day.dateValue} className="rounded-xl border border-gray-100 px-3 py-3 flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <p className="font-medium text-gray-900">{day.label}</p>
                              <p className="text-xs text-gray-500">{day.weekday}{day.closedReason ? ` • ${day.closedReason}` : ""}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {[1, 2].map((shiftNumber) => {
                                const isMarked = attendanceMap.has(`${day.dateValue}-${shiftNumber}`);
                                return (
                                  <button
                                    key={shiftNumber}
                                    type="button"
                                    onClick={() => toggleAttendanceShift(day.dateValue, shiftNumber)}
                                    disabled={day.closed || attendanceSaving}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                      day.closed
                                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                        : isMarked
                                          ? "bg-violet-600 text-white border-violet-600"
                                          : "bg-white text-gray-700 border-gray-200 hover:bg-violet-50 hover:border-violet-200"
                                    }`}
                                  >
                                    Shift {shiftNumber}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <IndianRupee className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">PT Charges from Trainer Earnings</h3>
                        <p className="text-xs text-gray-500">Taken automatically from paid trainer-plan earnings for this month.</p>
                      </div>
                    </div>

                    {attendanceData.pt_sessions.length === 0 ? (
                      <div className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                        No trainer earnings recorded for this month.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {attendanceData.pt_sessions.map((session) => (
                          <div key={session.id} className="rounded-xl border border-gray-100 p-3 flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-gray-900">{session.member_name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(session.session_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                {session.plan_name ? ` • ${session.plan_name}` : ""}
                              </p>
                              {session.notes && <p className="text-sm text-gray-600 mt-1">{session.notes}</p>}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-blue-700">₹{Number(session.amount || 0).toLocaleString("en-IN")}</p>
                              <p className="text-xs text-gray-500">Trainer share</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl p-8 shadow-sm text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">Select a Trainer</h3>
                  <p className="text-gray-500 text-sm">Choose a trainer from the list to start marking attendance.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ icon, label, value, tone = "gray" }) {
  const toneClasses = {
    gray: "border-gray-200 bg-gray-50 text-gray-900",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    violet: "border-violet-100 bg-violet-50 text-violet-800",
  };

  return (
    <div className={`rounded-xl border p-3 ${toneClasses[tone] || toneClasses.gray}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}