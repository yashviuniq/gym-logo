"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import RenewMembershipModal from "@/components/shared/RenewMembershipModal";
import RenewalHistoryModal from "@/components/shared/RenewalHistoryModal";
import ResolvePendingPaymentModal from "@/components/shared/ResolvePendingPaymentModal";

export default function MemberDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showResolvePaymentModal, setShowResolvePaymentModal] = useState(false);
  const [selectedPendingPayment, setSelectedPendingPayment] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);
  const [renewalHistory, setRenewalHistory] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);

  useEffect(() => {
    // Get selected gym from localStorage
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      fetchMemberDetails(params.id, gym.id);
    } else {
      setLoading(false);
    }
  }, [params.id]);

  const fetchMemberDetails = async (memberId, gymId) => {
    setLoading(true);
    try {
      // Fetch member with memberships and payments
      const { data: memberData, error } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          email,
          balance,
          created_at,
          gym_id,
          memberships (
            id,
            plan_id,
            start_date,
            end_date,
            status,
            created_at,
            membership_plans (
              id,
              name,
              price,
              duration_days
            )
          ),
          payments (
            id,
            amount,
            payment_mode,
            status,
            paid_at,
            created_at
          )
        `)
        .eq("id", memberId)
        .single();

      if (error) {
        console.error("Error fetching member:", error);
        setLoading(false);
        return;
      }

      // Get active membership
      const activeMembership = memberData.memberships?.find(
        (m) => m.status === "active"
      ) || memberData.memberships?.[0];

      // Calculate membership status
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

      // Transform member data
      const transformedMember = {
        id: memberData.id,
        gymId: memberData.gym_id,
        name: memberData.full_name,
        email: memberData.email || "",
        phone: memberData.phone,
        joinDate: new Date(memberData.created_at).toLocaleDateString("en-IN"),
        plan: activeMembership?.membership_plans?.name || "No Plan",
        planPrice: activeMembership?.membership_plans?.price || 0,
        status: memberStatus,
        validTill: activeMembership?.end_date
          ? new Date(activeMembership.end_date).toLocaleDateString("en-IN")
          : "N/A",
        dueAmount: Math.max(0, memberData.balance || 0),
        balance: memberData.balance || 0,
        attendance: [], // Will be fetched separately if needed
        payments: memberData.payments?.map(p => ({
          id: p.id,
          date: new Date(p.paid_at || p.created_at).toLocaleDateString("en-IN"),
          amount: p.amount,
          type: "Membership",
          status: p.status,
          payment_mode: p.payment_mode,
          created_at: p.created_at
        })) || []
      };

      setMember(transformedMember);

      // Get pending payments
      const pending = memberData.payments?.filter(p => p.status === "pending").map(p => ({
        id: p.id,
        amount: p.amount,
        created_at: p.created_at,
        membership_id: p.membership_id
      })) || [];
      setPendingPayments(pending);

      // Build renewal history from memberships
      const history = memberData.memberships?.map(m => ({
        planName: m.membership_plans?.name || "Unknown",
        duration: m.membership_plans?.duration_days || 0,
        price: m.membership_plans?.price || 0,
        paymentAmount: memberData.payments?.find(p => p.membership_id === m.id)?.amount || 0,
        paymentMode: memberData.payments?.find(p => p.membership_id === m.id)?.payment_mode || "cash",
        notes: "",
        newEndDate: m.end_date,
        renewedAt: m.created_at
      })) || [];

      setRenewalHistory(history);

      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("member_id", memberId)
        .order("check_in_date", { ascending: false })
        .limit(10);

      if (attendanceData) {
        transformedMember.attendance = attendanceData.map(a => ({
          date: new Date(a.check_in_date).toLocaleDateString("en-IN"),
          checkIn: a.check_in_time,
          checkOut: a.check_out_time || "-"
        }));
        setMember({ ...transformedMember });
      }

    } catch (err) {
      console.error("Error:", err);
    }
    setLoading(false);
  };

  const handleDeleteMember = async () => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${member.name}? This action cannot be undone. All associated data including memberships, payments, and attendance records will be permanently deleted.`
    );
    
    if (!confirmDelete) return;

    try {
      // Delete member (cascading deletes will handle related records)
      const { error } = await supabase
        .from("members")
        .delete()
        .eq("id", member.id);

      if (error) {
        throw error;
      }

      alert("Member deleted successfully!");
      router.push("/members");
    } catch (error) {
      console.error("Error deleting member:", error);
      alert("Failed to delete member. Please try again.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700";
      case "expired":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleRenewal = (renewalData) => {
    // Add new renewal to history
    setRenewalHistory((prev) => [renewalData, ...prev]);
    setShowRenewModal(false);
    // Refresh member data
    if (selectedGym) {
      fetchMemberDetails(params.id, selectedGym.id);
    }
    alert("Membership renewed successfully!");
  };

  const handlePaymentResolved = () => {
    // Refresh member data after payment resolution
    if (selectedGym) {
      fetchMemberDetails(params.id, selectedGym.id);
    }
  };

  const handleResolvePendingPayment = (payment) => {
    setSelectedPendingPayment(payment);
    setShowResolvePaymentModal(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Member Details" />
        <main className="px-4 py-4">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </main>
      </div>
    );
  }

  // No member found
  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Member Details" />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <span className="text-4xl">👤</span>
            <p className="text-gray-500 mt-2">Member not found</p>
            <button
              onClick={() => router.push("/members")}
              className="mt-4 px-6 py-2 bg-[#F97316] text-white rounded-lg"
            >
              Back to Members
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Member Details" />

      <main className="px-4 py-4">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {member.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {member.name}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    member.status
                  )}`}
                >
                  {member.status}
                </span>
              </div>
              <p className="text-gray-500 text-sm">{member.phone}</p>
              <p className="text-gray-400 text-sm">{member.email}</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{member.plan}</p>
              <p className="text-xs text-gray-500">Current Plan</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {member.attendance.length}
              </p>
              <p className="text-xs text-gray-500">This Month</p>
            </div>
            <div className="text-center">
              <p
                className={`text-lg font-bold ${member.dueAmount > 0 ? "text-red-500" : "text-green-500"
                  }`}
              >
                ₹{member.dueAmount}
              </p>
              <p className="text-xs text-gray-500">Due Amount</p>
            </div>
          </div>
        </div>

        {/* Pending Payments Alert */}
        {pendingPayments.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0">
                ⚠️
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {pendingPayments.length} Pending Payment{pendingPayments.length > 1 ? 's' : ''}
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  This member has {pendingPayments.length} payment{pendingPayments.length > 1 ? 's' : ''} waiting to be resolved.
                </p>
                <div className="space-y-2">
                  {pendingPayments.map((payment) => (
                    <div 
                      key={payment.id}
                      className="bg-white rounded-lg p-3 flex items-center justify-between border border-amber-200"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">₹{payment.amount}</p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(payment.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <button
                        onClick={() => handleResolvePendingPayment(payment)}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
                      >
                        Resolve
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Due Amount Alert */}
        {member.dueAmount > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-xl flex-shrink-0">
                💰
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  Outstanding Balance
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  This member has an outstanding balance that needs to be collected.
                </p>
                <div className="bg-white rounded-lg p-4 border border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-gray-500">Total Due Amount</p>
                      <p className="text-2xl font-bold text-red-600">₹{member.dueAmount}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/members/${member.id}/payment`)}
                    className="w-full px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
                  >
                    Collect Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[{
              label: "Credentials",
              icon: "🔐",
              action: () => router.push(`/members/${member.id}/credentials`),
            },
            {
              label: "Call",
              icon: "📞",
              action: () => window.open(`tel:${member.phone}`),
            },
            {
              label: "WhatsApp",
              icon: "💬",
              action: () => window.open(`https://wa.me/91${member.phone}`),
            },
            {
              label: "Payment",
              icon: "💳",
              action: () => router.push(`/members/${member.id}/payment`),
            },
            
          ].map((btn, index) => (
            <button
              key={index}
              onClick={btn.action}
              className="bg-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1 hover:bg-gray-50 transition"
            >
              <span className="text-xl">{btn.icon}</span>
              <span className="text-xs font-medium text-gray-600">
                {btn.label}
              </span>
            </button>
          ))}
        </div>

        {/* Edit and Delete Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => router.push(`/members/edit?id=${member.id}`)}
            className="py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all duration-200"
          >
            ✏️ Edit Member
          </button>
          <button
            onClick={handleDeleteMember}
            className="py-3 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-100 active:scale-[0.98] transition-all duration-200"
          >
            🗑️ Delete Member
          </button>
        </div>

        {/* Membership Actions */}
        <div className={`grid gap-3 mb-4 ${member.status === "active" ? "grid-cols-1" : "grid-cols-2"}`}>
          {member.status !== "active" && (
            <button
              onClick={() => setShowRenewModal(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1 hover:shadow-md transition"
            >
              <span className="text-xl">🔄</span>
              <span className="text-xs font-medium">Renew</span>
            </button>
          )}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl p-3 shadow-sm flex flex-col items-center gap-1 hover:shadow-md transition"
          >
            <span className="text-xl">📜</span>
            <span className="text-xs font-medium">History</span>
          </button>
        
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {["overview", "attendance", "payments"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${activeTab === tab
                ? "bg-black text-white"
                : "bg-white text-gray-600"
                }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">
              Personal Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Gender", value: member.gender },
                { label: "Age", value: member.age },
                { label: "Join Date", value: member.joinDate },
                { label: "Valid Till", value: member.validTill },
              ].map((item, index) => (
                <div key={index}>
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-gray-500">Address</p>
              <p className="text-sm font-medium text-gray-900">
                {member.address}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Emergency Contact</p>
              <p className="text-sm font-medium text-gray-900">
                {member.emergencyContact}
              </p>
            </div>
            {member.notes && (
              <div>
                <p className="text-xs text-gray-500">Notes</p>
                <p className="text-sm text-gray-700">{member.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Recent Attendance</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {member.attendance.map((record, index) => (
                <div
                  key={index}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{record.date}</p>
                    <p className="text-sm text-gray-500">
                      {record.checkIn} - {record.checkOut}
                    </p>
                  </div>
                  <span className="text-green-500">✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Payment History</h3>
              <button
                onClick={() => router.push(`/members/${member.id}/payment`)}
                className="text-sm text-blue-600 font-medium"
              >
                + Add Payment
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {member.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      ₹{payment.amount}
                    </p>
                    <p className="text-sm text-gray-500">
                      {payment.type} • {payment.date}
                    </p>
                    {payment.payment_mode && (
                      <p className="text-xs text-gray-400 mt-1">
                        {payment.payment_mode.toUpperCase()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      payment.status === 'paid' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {payment.status}
                    </span>
                    {payment.status === 'pending' && (
                      <button
                        onClick={() => {
                          const pendingPayment = pendingPayments.find(p => p.id === payment.id);
                          if (pendingPayment) {
                            handleResolvePendingPayment(pendingPayment);
                          }
                        }}
                        className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="mt-6 p-4 bg-white rounded-xl shadow-sm">
          <button className="w-full py-3 text-red-500 font-medium hover:bg-red-50 rounded-lg transition">
            Delete Member
          </button>
        </div>
      </main>

      {/* Renew Membership Modal */}
      {showRenewModal && (
        <RenewMembershipModal
          member={member}
          gymId={selectedGym?.id}
          onClose={() => setShowRenewModal(false)}
          onRenew={handleRenewal}
        />
      )}

      {/* Renewal History Modal */}
      {showHistoryModal && (
        <RenewalHistoryModal
          member={member}
          renewalHistory={renewalHistory}
          onClose={() => setShowHistoryModal(false)}
        />
      )}

      {/* Resolve Pending Payment Modal */}
      {showResolvePaymentModal && selectedPendingPayment && (
        <ResolvePendingPaymentModal
          payment={selectedPendingPayment}
          member={member}
          onClose={() => {
            setShowResolvePaymentModal(false);
            setSelectedPendingPayment(null);
          }}
          onResolved={handlePaymentResolved}
        />
      )}
    </div>
  );
}
