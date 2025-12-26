"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";

// Mock data - will replace with Supabase later
const mockMembers = [
  {
    id: 1,
    name: "John Doe",
    phone: "9876543210",
    plan: "Premium",
    status: "active",
    validTill: "2025-12-31",
    dueAmount: 0,
  },
  {
    id: 2,
    name: "Jane Smith",
    phone: "9876543211",
    plan: "Basic",
    status: "active",
    validTill: "2025-06-15",
    dueAmount: 500,
  },
  {
    id: 3,
    name: "Mike Johnson",
    phone: "9876543212",
    plan: "Premium",
    status: "expired",
    validTill: "2025-01-10",
    dueAmount: 2000,
  },
  {
    id: 4,
    name: "Sarah Wilson",
    phone: "9876543213",
    plan: "Basic",
    status: "active",
    validTill: "2025-08-20",
    dueAmount: 0,
  },
  {
    id: 5,
    name: "Tom Brown",
    phone: "9876543214",
    plan: "Premium",
    status: "inactive",
    validTill: "2024-12-01",
    dueAmount: 3000,
  },
];

export default function MembersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredMembers = mockMembers.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery);
    const matchesFilter =
      filterStatus === "all" || member.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "expired":
        return "bg-red-100 text-red-700";
      case "inactive":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-page pb-24">
      <Header title="Members" showBack={false} />

      <main className="px-4 py-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {mockMembers.length}
            </p>
            <p className="text-xs text-gray-600 font-medium">Total</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {mockMembers.filter((m) => m.status === "active").length}
            </p>
            <p className="text-xs text-gray-600 font-medium">Active</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {mockMembers.filter((m) => m.dueAmount > 0).length}
            </p>
            <p className="text-xs text-gray-600 font-medium">Dues</p>
          </Card>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {["all", "active", "expired", "inactive"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${filterStatus === status
                ? "btn-gradient-orange text-white shadow-md"
                : "bg-white text-gray-600 border border-gray-200 hover:border-[#F97316]/30"
                }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Members List */}
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <Card
              key={member.id}
              padding="md"
              className="active:scale-[0.98] transition cursor-pointer hover:shadow-md"
              onClick={() => router.push(`/members/${member.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{
                  background: 'linear-gradient(135deg, #F97316 0%, #FF8C42 100%)'
                }}>
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {member.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        member.status
                      )}`}
                    >
                      {member.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{member.phone}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">
                      {member.plan} • Valid till {member.validTill}
                    </span>
                    {member.dueAmount > 0 && (
                      <span className="text-xs text-red-500 font-medium">
                        ₹{member.dueAmount} due
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl">🔍</span>
            <p className="text-gray-500 mt-2">No members found</p>
          </div>
        )}
      </main>

      {/* Floating Add Button */}
      <button
        onClick={() => router.push("/members/add")}
        className="fixed bottom-24 right-4 w-14 h-14 btn-gradient-orange text-white rounded-full shadow-lg flex items-center justify-center text-2xl z-40"
      >
        +
      </button>
    </div>
  );
}
