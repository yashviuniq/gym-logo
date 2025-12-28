"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";

export default function MembersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);

  useEffect(() => {
    // Get selected gym from localStorage
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      fetchMembers(gym.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMembers = async (gymId) => {
    setLoading(true);
    try {
      // Fetch members with their active membership status and due amounts
      const { data: membersData, error } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          email,
          balance,
          created_at,
          memberships (
            id,
            plan_id,
            start_date,
            end_date,
            status,
            membership_plans (
              name,
              price,
              duration_days
            )
          )
        `)
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching members:", error);
        setMembers([]);
      } else {
        // Transform the data to match our component structure
        const transformedMembers = membersData?.map((member) => {
          const activeMembership = member.memberships?.find(
            (m) => m.status === "active"
          ) || member.memberships?.[0];

          // Calculate membership status based on end_date
          let memberStatus = "inactive";
          if (activeMembership) {
            const endDate = new Date(activeMembership.end_date);
            const today = new Date();
            if (endDate > today && activeMembership.status === "active") {
              memberStatus = "active";
            } else if (endDate <= today) {
              memberStatus = "expired";
            }
          }

          return {
            id: member.id,
            name: member.full_name,
            phone: member.phone,
            email: member.email,
            plan: activeMembership?.membership_plans?.name || "No Plan",
            status: memberStatus,
            validTill: activeMembership?.end_date
              ? new Date(activeMembership.end_date).toLocaleDateString("en-IN")
              : "N/A",
            dueAmount: Math.max(0, member.balance || 0), // Positive balance means member owes money
          };
        }) || [];

        setMembers(transformedMembers);
      }
    } catch (err) {
      console.error("Error:", err);
      setMembers([]);
    }
    setLoading(false);
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery) ||
      (member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()));
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

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-page pb-24">
        <Header title="Members" showBack={false} />
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
        <Header title="Members" showBack={false} />
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

  return (
    <div className="min-h-screen bg-page pb-24">
      <Header title="Members" showBack={false} />

      <main className="px-4 py-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {members.length}
            </p>
            <p className="text-xs text-gray-600 font-medium">Total</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {members.filter((m) => m.status === "active").length}</p>
            <p className="text-xs text-gray-600 font-medium">Active</p>
          </Card>
          <Card padding="sm" className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {members.filter((m) => m.dueAmount > 0).length}</p>
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
