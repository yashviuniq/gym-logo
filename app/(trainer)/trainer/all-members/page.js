"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import RenewMembershipModal from "@/components/shared/RenewMembershipModal";
import CollectPaymentModal from "@/components/shared/CollectPaymentModal";
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Search,
  Plus,
  User as UserIcon,
  Calendar,
  Phone,
  RefreshCw,
  ChevronRight,
  Filter,
  UserCheck,
  DollarSign
} from "lucide-react";
import Link from "next/link";

export default function TrainerAllMembersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [gymId, setGymId] = useState(null);
  const [gymData, setGymData] = useState(null);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [rawMembers, setRawMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trainerId, setTrainerId] = useState(null);
  const [trainerName, setTrainerName] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    dues: 0
  });

  // Get gym from trainer's association
  useEffect(() => {
    const init = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        
        if (!authData?.user) {
          router.push("/auth/login");
          return;
        }

        setTrainerId(authData.user.id);

        // Get trainer profile info
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", authData.user.id)
          .single();

        if (profileData) {
          setTrainerName(`${profileData.first_name} ${profileData.last_name}`.trim());
        }

        // Get gym association
        const { data: gymTrainerData } = await supabase
          .from("gym_trainers")
          .select("gym_id, gyms (id, name, address, phone)")
          .eq("profile_id", authData.user.id)
          .eq("is_active", true)
          .single();

        if (gymTrainerData) {
          setGymId(gymTrainerData.gym_id);
          setGymData(gymTrainerData.gyms);
          await fetchMembers(gymTrainerData.gym_id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error:", err);
        setLoading(false);
      }
    };

    init();
  }, [router]);

  // Fetch all gym members
  const fetchMembers = async (gymId) => {
    if (!gymId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          email,
          gym_id,
          balance,
          profile_image,
          created_at,
          memberships (
            id,
            plan_id,
            start_date,
            end_date,
            status,
            membership_plans (
              id,
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
        setRawMembers([]);
      } else {
        setRawMembers(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
      setRawMembers([]);
    }
    setLoading(false);
  };

  // Transform members data with memoization
  const members = useMemo(() => {
    if (!rawMembers?.length) return [];

    return rawMembers.map((member) => {
      const activeMembership = member.memberships?.find(
        (m) => m.status === "active"
      ) || member.memberships?.[0];

      let memberStatus = "inactive";
      let daysRemaining = null;
      
      if (activeMembership) {
        const endDate = new Date(activeMembership.end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        
        daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        
        if (endDate >= today && activeMembership.status === "active") {
          memberStatus = "active";
        } else {
          memberStatus = "expired";
        }
      }

      const validTill = activeMembership?.end_date
        ? new Date(activeMembership.end_date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "N/A";

      return {
        id: member.id,
        name: member.full_name,
        phone: member.phone,
        email: member.email,
        gymId: member.gym_id,
        balance: member.balance || 0,
        profileImage: member.profile_image,
        status: memberStatus,
        plan: activeMembership?.membership_plans?.name || "No Plan",
        planId: activeMembership?.plan_id,
        validTill,
        daysRemaining,
        createdAt: member.created_at
      };
    });
  }, [rawMembers]);

  // Calculate stats
  useEffect(() => {
    const activeCount = members.filter((m) => m.status === "active").length;
    const expiredCount = members.filter((m) => m.status === "expired" || m.status === "inactive").length;
    const totalDues = members.reduce((sum, m) => sum + (m.balance || 0), 0);

    setStats({
      total: members.length,
      active: activeCount,
      expired: expiredCount,
      dues: totalDues
    });
  }, [members]);

  // Filter members based on search and status
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.phone?.includes(searchQuery);
      
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "active" && member.status === "active") ||
        (filterStatus === "expired" && (member.status === "expired" || member.status === "inactive")) ||
        (filterStatus === "dues" && member.balance > 0);

      return matchesSearch && matchesFilter;
    });
  }, [members, searchQuery, filterStatus]);

  const handleRenewMembership = (member) => {
    setSelectedMember(member);
    setShowRenewModal(true);
  };

  const handleCollectPayment = (member) => {
    setSelectedMember(member);
    setShowCollectPaymentModal(true);
  };

  const handlePaymentCollected = () => {
    setShowCollectPaymentModal(false);
    setSelectedMember(null);
    if (gymId) {
      fetchMembers(gymId);
    }
  };

  const handleRenewalComplete = () => {
    setShowRenewModal(false);
    setSelectedMember(null);
    if (gymId) {
      fetchMembers(gymId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Members" />

      <main className="px-4 py-4 space-y-4">
        {/* Tab Navigation */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
          <div className="flex-1 py-2.5 text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium text-sm">
            All Members
          </div>
          <Link 
            href="/trainer/members" 
            className="flex-1 py-2.5 text-center text-gray-600 hover:bg-gray-100 rounded-lg font-medium text-sm flex items-center justify-center gap-1"
          >
            <UserCheck className="w-4 h-4" />
            Assigned
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-2">
          <div 
            onClick={() => setFilterStatus("all")}
            className={`bg-white rounded-xl p-3 shadow-sm text-center cursor-pointer transition-all ${
              filterStatus === "all" ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <p className="text-lg font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div 
            onClick={() => setFilterStatus("active")}
            className={`bg-white rounded-xl p-3 shadow-sm text-center cursor-pointer transition-all ${
              filterStatus === "active" ? "ring-2 ring-green-500" : ""
            }`}
          >
            <p className="text-lg font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div 
            onClick={() => setFilterStatus("expired")}
            className={`bg-white rounded-xl p-3 shadow-sm text-center cursor-pointer transition-all ${
              filterStatus === "expired" ? "ring-2 ring-red-500" : ""
            }`}
          >
            <p className="text-lg font-bold text-red-600">{stats.expired}</p>
            <p className="text-xs text-gray-500">Expired</p>
          </div>
          <div 
            onClick={() => setFilterStatus("dues")}
            className={`bg-white rounded-xl p-3 shadow-sm text-center cursor-pointer transition-all ${
              filterStatus === "dues" ? "ring-2 ring-amber-500" : ""
            }`}
          >
            <p className="text-lg font-bold text-amber-600">₹{stats.dues.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Dues</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Members List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">
              {searchQuery ? "No members found" : "No members yet"}
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {searchQuery 
                ? "Try a different search term" 
                : "Add your first member to get started"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => router.push("/trainer/all-members/add")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div 
                    onClick={() => router.push(`/trainer/all-members/${member.id}`)}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center overflow-hidden flex-shrink-0 cursor-pointer"
                  >
                    {member.profileImage ? (
                      <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {member.name?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div 
                    onClick={() => router.push(`/trainer/all-members/${member.id}`)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {member.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        member.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {member.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Phone className="w-3 h-3" />
                      <span>{member.phone}</span>
                      <span className="text-gray-300">•</span>
                      <span>{member.plan}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span className={member.daysRemaining !== null && member.daysRemaining <= 7 ? "text-amber-600 font-medium" : ""}>
                        {member.daysRemaining !== null && member.daysRemaining > 0 
                          ? `${member.daysRemaining} days left` 
                          : member.validTill !== "N/A" 
                            ? "Expired" 
                            : "No membership"}
                      </span>
                      {member.balance > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-red-600 font-medium">₹{member.balance} due</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Renew Button - Only show for expired/inactive members */}
                  {(member.status === "expired" || member.status === "inactive") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRenewMembership(member);
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-medium rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Renew
                    </button>
                  )}

                  {/* Collect Payment Button - Show for members with dues */}
                  {member.balance > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCollectPayment(member);
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-xs font-medium rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center gap-1"
                    >
                      <DollarSign className="w-3 h-3" />
                      Collect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Add Button */}
        <button
          onClick={() => router.push("/trainer/all-members/add")}
          className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:from-blue-700 hover:to-indigo-700 transition-all z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      </main>

      {/* Renew Modal */}
      {showRenewModal && selectedMember && (
        <RenewMembershipModal
          member={selectedMember}
          gymId={gymId}
          gymData={gymData}
          onClose={() => {
            setShowRenewModal(false);
            setSelectedMember(null);
          }}
          onRenew={handleRenewalComplete}
        />
      )}

      {/* Collect Payment Modal */}
      {showCollectPaymentModal && selectedMember && (
        <CollectPaymentModal
          member={selectedMember}
          gymId={gymId}
          gymData={gymData}
          trainerId={trainerId}
          trainerName={trainerName}
          onClose={() => {
            setShowCollectPaymentModal(false);
            setSelectedMember(null);
          }}
          onPaymentCollected={handlePaymentCollected}
        />
      )}
    </div>
  );
}
