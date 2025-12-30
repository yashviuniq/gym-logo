"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";

export default function CustomerProfilePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("membership");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [membership, setMembership] = useState(null);
  const [payments, setPayments] = useState([]);
  const [gymInfo, setGymInfo] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Get logged-in member from localStorage
      const storedMember = localStorage.getItem("member");
      if (!storedMember) {
        router.push("/auth/login");
        return;
      }

      const member = JSON.parse(storedMember);

      // Fetch member details
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          email,
          profile_image,
          gym_id,
          created_at,
          memberships (
            id,
            plan_id,
            start_date,
            end_date,
            status,
            membership_plans (
              name,
              duration_days,
              price
            )
          )
        `)
        .eq("id", member.id)
        .single();

      if (memberError) throw memberError;

      setProfile({
        id: memberData.id,
        name: memberData.full_name,
        email: memberData.email || "",
        phone: memberData.phone,
        profileImage: memberData.profile_image,
        joinDate: memberData.created_at,
      });

      // Get active membership
      const activeMembership = memberData.memberships?.find(m => m.status === 'active') || memberData.memberships?.[0];
      if (activeMembership) {
        const endDate = new Date(activeMembership.end_date);
        const startDate = new Date(activeMembership.start_date);
        const today = new Date();
        const daysLeft = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
        const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

        setMembership({
          plan: activeMembership.membership_plans?.name || "No Plan",
          status: activeMembership.status,
          startDate: activeMembership.start_date,
          endDate: activeMembership.end_date,
          daysLeft: daysLeft,
          totalDays: totalDays,
        });
      } else {
        setMembership({
          plan: "No Plan",
          status: "expired",
          startDate: null,
          endDate: null,
          daysLeft: 0,
          totalDays: 0,
        });
      }

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!paymentsError && paymentsData) {
        setPayments(paymentsData.map(p => ({
          id: p.id,
          date: p.created_at.split('T')[0],
          amount: parseFloat(p.amount),
          type: p.membership_id ? "Membership" : "Other",
          status: p.status,
        })));
      }

      // Fetch gym info
      if (memberData.gym_id) {
        const { data: gymData, error: gymError } = await supabase
          .from("gyms")
          .select("id, name, address, phone, email, weekday_open, weekday_close, weekend_open, weekend_close")
          .eq("id", memberData.gym_id)
          .single();

        if (!gymError && gymData) {
          const formatTime = (time) => {
            if (!time) return "";
            const [hours, minutes] = time.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
          };

          const timings = gymData.weekday_open && gymData.weekday_close
            ? `${formatTime(gymData.weekday_open)} - ${formatTime(gymData.weekday_close)}`
            : "Not set";

          setGymInfo({
            name: gymData.name,
            address: gymData.address || "",
            phone: gymData.phone || "",
            email: gymData.email || "",
            timings: timings,
          });
        }
      }

    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="My Profile" showBack={false} />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="My Profile" showBack={false} />
        <div className="px-4 py-4 text-center">
          <p className="text-gray-500">Failed to load profile data</p>
        </div>
      </div>
    );
  }

  const membershipProgress = membership && membership.totalDays > 0
    ? ((membership.totalDays - membership.daysLeft) / membership.totalDays) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="My Profile" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt={profile.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-gray-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {profile.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {profile.name}
              </h2>
              <p className="text-gray-500">{profile.phone}</p>
              {profile.email && (
                <p className="text-gray-400 text-sm">{profile.email}</p>
              )}
            </div>
            <button
              onClick={() => router.push("/profile/edit")}
              className="p-2 bg-gray-100 rounded-lg"
            >
              ✏️
            </button>
          </div>

          {/* Member Since */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
            <span className="text-gray-500">Member since</span>
            <span className="font-medium text-gray-900">
              {new Date(profile.joinDate).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Membership Status Card */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-300 text-sm">Current Plan</p>
              <p className="text-xl font-bold">{membership?.plan || "No Plan"}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              membership?.status === 'active' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {membership?.status || "expired"}
            </span>
          </div>

          {membership && membership.totalDays > 0 && (
            <>
              {/* Progress Bar */}
              <div className="mb-2">
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: `${membershipProgress}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-300">
                  {membership.daysLeft} days left
                </span>
                {membership.endDate && (
                  <span className="text-gray-300">
                    Expires: {new Date(membership.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Renew Button */}
          <button
            onClick={() => router.push("/profile/renew")}
            className="w-full mt-4 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>Renew Membership</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {["membership", "payments", "gym"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize ${activeTab === tab
                  ? "bg-black text-white"
                  : "bg-white text-gray-600 border border-gray-200"
                }`}
            >
              {tab === "gym" ? "Gym Info" : tab}
            </button>
          ))}
        </div>

        {/* Membership Tab */}
        {activeTab === "membership" && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Membership Details</h3>

            {membership ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Plan</p>
                  <p className="font-medium text-gray-900">
                    {membership.plan}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`font-medium capitalize ${
                    membership.status === 'active' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {membership.status}
                  </p>
                </div>
                {membership.startDate && (
                  <div>
                    <p className="text-xs text-gray-500">Start Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(membership.startDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                )}
                {membership.endDate && (
                  <div>
                    <p className="text-xs text-gray-500">End Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(membership.endDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No active membership</p>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Payment History</h3>
            </div>
            {payments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No payment history found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        ₹{payment.amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {payment.type} • {new Date(payment.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      payment.status === 'paid' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payment.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gym Info Tab */}
        {activeTab === "gym" && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            {gymInfo ? (
              <>
                <h3 className="font-semibold text-gray-900">{gymInfo.name}</h3>

                <div className="space-y-3">
                  {gymInfo.address && (
                    <div className="flex items-start gap-3">
                      <span className="text-lg">📍</span>
                      <div>
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm text-gray-900">{gymInfo.address}</p>
                      </div>
                    </div>
                  )}
                  {gymInfo.phone && (
                    <div className="flex items-start gap-3">
                      <span className="text-lg">📞</span>
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <a
                          href={`tel:${gymInfo.phone}`}
                          className="text-sm text-blue-600"
                        >
                          {gymInfo.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  {gymInfo.email && (
                    <div className="flex items-start gap-3">
                      <span className="text-lg">✉️</span>
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm text-gray-900">{gymInfo.email}</p>
                      </div>
                    </div>
                  )}
                  {gymInfo.timings && (
                    <div className="flex items-start gap-3">
                      <span className="text-lg">🕐</span>
                      <div>
                        <p className="text-xs text-gray-500">Timings</p>
                        <p className="text-sm text-gray-900">{gymInfo.timings}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                {gymInfo.phone && (
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => window.open(`tel:${gymInfo.phone}`)}
                      className="flex-1 py-2 bg-gray-100 rounded-lg text-sm font-medium"
                    >
                      📞 Call
                    </button>
                    <button
                      onClick={() =>
                        window.open(`https://wa.me/91${gymInfo.phone.replace(/\D/g, '')}`)
                      }
                      className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium"
                    >
                      💬 WhatsApp
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-4">Gym information not available</p>
            )}
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={() => router.push("/auth/login")}
          className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-medium"
        >
          Logout
        </button>
      </main>
    </div>
  );
}
