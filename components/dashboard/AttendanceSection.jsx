"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, XCircle } from "lucide-react";
import ListModal from "./ListModal";

function AttendanceRow({ member, size = "sm" }) {
  const isActive = member.status === "active";
  const isExpired = member.membershipStatus === "EXPIRED";
  const avatarSize = size === "lg" ? "w-10 h-10" : "w-8 h-8";

  return (
    <div
      className={`flex items-center justify-between ${size === "lg" ? "p-3 bg-gray-50 rounded-xl" : "p-2 active:bg-gray-50 rounded-lg"}`}
      style={{ minHeight: "52px" }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className={`${avatarSize} rounded-full flex items-center justify-center flex-shrink-0 ${
            isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
          }`}
        >
          <span className="text-xs font-bold">{member.name.charAt(0)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-gray-900 truncate">
              {member.name}
            </p>
            {isExpired && (
              <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-red-100 text-red-700 rounded border border-red-300 flex-shrink-0">
                EXPIRED
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500">{member.checkIn}</p>
          </div>
          {isExpired && (
            <div className="flex items-center gap-1 mt-1">
              <XCircle className="w-3 h-3 text-red-500" />
              <p className="text-[10px] text-red-600 font-medium">
                Membership expired
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div
          className={`w-2 h-2 rounded-full ${
            isActive ? "bg-green-500 animate-pulse" : "bg-gray-300"
          }`}
        />
        <span
          className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
            isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
          }`}
        >
          {isActive ? "Active" : "Left"}
        </span>
      </div>
    </div>
  );
}

export default function AttendanceSection({ todayList, allAttendance, totalCount }) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="bg-white rounded-xl p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Today&apos;s Check-ins
              </h3>
              <p className="text-xs text-gray-500">{totalCount} members</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium active:bg-indigo-100 transition-colors"
            style={{ minHeight: "32px" }}
          >
            View All
          </button>
        </div>
        <div className="space-y-2">
          {todayList.length > 0 ? (
            todayList.map((m) => <AttendanceRow key={m.id} member={m} />)
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No check-ins today</p>
              <button
                onClick={() => router.push("/attendance/manual")}
                className="mt-2 text-xs text-blue-600 active:text-blue-700 font-medium"
              >
                Take manual attendance
              </button>
            </div>
          )}
        </div>
      </div>

      <ListModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Today's Check-ins"
        subtitle={`${allAttendance.length} members checked in`}
        icon={<Calendar className="w-5 h-5" />}
        iconBg="bg-indigo-100"
        iconColor="text-indigo-600"
        footer={
          <button
            onClick={() => {
              setShowModal(false);
              router.push("/attendance");
            }}
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium active:bg-indigo-700 transition-colors"
          >
            Go to Attendance Page
          </button>
        }
      >
        {allAttendance.length > 0 ? (
          allAttendance.map((m) => (
            <AttendanceRow key={m.id} member={m} size="lg" />
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No check-ins today</p>
            <p className="text-xs text-gray-400 mt-1">
              Members will appear here when they check in
            </p>
          </div>
        )}
      </ListModal>
    </>
  );
}
