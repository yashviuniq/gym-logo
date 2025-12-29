"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";

export default function AddPaymentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null);
  const [formData, setFormData] = useState({
    amount: "",
    type: "membership",
    mode: "cash",
    notes: "",
  });

  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      fetchMembers(gym.id);
    }
  }, []);

  const fetchMembers = async (gymId) => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, phone, balance")
        .eq("gym_id", gymId)
        .order("full_name");

      if (error) throw error;

      const formattedMembers = data.map(m => ({
        id: m.id,
        name: m.full_name,
        phone: m.phone,
        dueAmount: Math.max(0, m.balance || 0),
        balance: m.balance || 0
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      alert("Failed to load members");
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery)
  );

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount);
      
      if (amount <= 0) {
        alert("Please enter a valid amount");
        setLoading(false);
        return;
      }

      // Record payment in database
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          gym_id: selectedGym.id,
          member_id: selectedMember.id,
          amount: amount,
          payment_mode: formData.mode,
          status: "paid",
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      // Update member balance (reduce the due amount)
      const newBalance = Math.max(0, selectedMember.balance - amount);
      const { error: balanceError } = await supabase
        .from("members")
        .update({ balance: newBalance })
        .eq("id", selectedMember.id);

      if (balanceError) throw balanceError;

      alert("Payment recorded successfully!");
      router.push("/finance");
    } catch (error) {
      console.error("Error recording payment:", error);
      alert("Failed to record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Add Payment" />

      <main className="px-4 py-4">
        {/* Step 1: Select Member */}
        {step === 1 && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search member by name or phone..."
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />

            {loading && !members.length ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <p className="text-gray-500">No members found</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setSelectedMember(member);
                        // Auto-fill amount with due amount if exists
                        if (member.dueAmount > 0) {
                          setFormData(prev => ({ ...prev, amount: member.dueAmount.toString() }));
                        }
                        setStep(2);
                      }}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold">
                          {member.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">
                            {member.name}
                          </p>
                          <p className="text-sm text-gray-500">{member.phone}</p>
                        </div>
                      </div>
                      {member.dueAmount > 0 && (
                        <span className="text-sm text-red-500">
                          ₹{member.dueAmount} due
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Payment Details */}
        {step === 2 && selectedMember && (
          <div className="space-y-4">
            {/* Selected Member */}
            <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold">
                {selectedMember.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {selectedMember.name}
                </p>
                {selectedMember.dueAmount > 0 && (
                  <p className="text-sm text-red-500">
                    Due: ₹{selectedMember.dueAmount}
                  </p>
                )}
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-sm text-blue-600"
              >
                Change
              </button>
            </div>

            {/* Payment Form */}
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-semibold outline-none"
                  placeholder="₹ 0"
                  value={formData.amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
                      updateForm("amount", value);
                    }
                  }}
                  min="0.01"
                  step="0.01"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter amount greater than 0</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "membership",
                    "personal_training",
                    "supplements",
                    "other",
                  ].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateForm("type", type)}
                      className={`py-2 rounded-lg text-sm font-medium capitalize ${
                        formData.type === type
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {type.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode
                </label>
                <div className="flex gap-2">
                  {["cash", "upi", "card"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateForm("mode", mode)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize ${
                        formData.mode === mode
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none resize-none"
                  rows={2}
                  placeholder="Payment notes..."
                  value={formData.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.amount || loading}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Record Payment"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
