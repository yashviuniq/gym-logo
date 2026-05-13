"use client";

import { useState } from "react";
import { Activity, Clock } from "lucide-react";
import ListModal from "./ListModal";

function ActivityRow({ activity, size = "sm" }) {
  return (
    <div
      className={`flex items-center justify-between ${
        size === "lg" ? "p-3 bg-gray-50 rounded-xl" : "p-2"
      }`}
      style={{ minHeight: "52px" }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className={`${size === "lg" ? "w-10 h-10" : "w-8 h-8"} rounded-lg flex items-center justify-center flex-shrink-0 ${
            activity.type === "attendance" ? "bg-green-100" : "bg-blue-100"
          }`}
        >
          <span className={size === "lg" ? "text-lg" : "text-sm"}>
            {activity.icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {activity.text}
          </p>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500">{activity.time}</p>
          </div>
        </div>
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0 pl-2">
        {activity.time === "Today" ? "Just now" : activity.time}
      </span>
    </div>
  );
}

export default function RecentActivitySection({ topActivity, allActivity }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl p-3 mx-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium active:bg-indigo-100 transition-colors"
          >
            View all
          </button>
        </div>
        <div className="space-y-2">
          {topActivity.length > 0 ? (
            topActivity.map((a) => <ActivityRow key={a.id} activity={a} />)
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Activity className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No recent activity</p>
            </div>
          )}
        </div>
      </div>

      <ListModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Recent Activity"
        subtitle={`${allActivity.length} activities`}
        icon={<Activity className="w-5 h-5" />}
        iconBg="bg-blue-100"
        iconColor="text-blue-600"
        footer={
          <button
            onClick={() => setShowModal(false)}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium active:bg-gray-300 transition-colors"
          >
            Close
          </button>
        }
      >
        {allActivity.length > 0 ? (
          allActivity.map((a) => (
            <ActivityRow key={a.id} activity={a} size="lg" />
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No recent activity</p>
            <p className="text-xs text-gray-400 mt-1">
              Activity will appear here as events happen
            </p>
          </div>
        )}
      </ListModal>
    </>
  );
}
