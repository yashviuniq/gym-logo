"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";

export default function AddPaymentPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState(null);
  const [selectedGym, setSelectedGym] = useState(null);
  const [formData, setFormData] = useState({
    amount: "",
    type: "membership",
    mode: "cash",
    notes: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      fetchMemberData(params.id);
    }
  }, [params.id]);

  const fetchMemberData = async (memberId) => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, phone, balance")
        .eq("id", memberId)
        .single();

      if (error) throw error;
      
      setMember({
        id: data.id,
        name: data.full_name,
        phone: data.phone,
        dueAmount: Math.max(0, data.balance || 0),
        balance: data.balance || 0
      });

      // Auto-fill amount if there's a due amount
      if (data.balance > 0) {
        setFormData(prev => ({ ...prev, amount: data.balance.toString() }));
      }
    } catch (error) {
      console.error("Error fetching member:", error);
      alert("Failed to load member data");
    }
  };

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
          member_id: member.id,
          amount: amount,
          payment_mode: formData.mode,
          status: "paid",
          paid_at: new Date(formData.date).toISOString(),
          created_at: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      // Update member balance (reduce the due amount)
      const newBalance = Math.max(0, member.balance - amount);
      const { error: balanceError } = await supabase
        .from("members")
        .update({ balance: newBalance })
        .eq("id", member.id);

      if (balanceError) throw balanceError;

      alert("Payment recorded successfully!");
      router.back();
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

      {!member ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          {/* Member Info */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                {member.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{member.name}</p>
                <p className="text-sm text-gray-500">{member.phone}</p>
                {member.dueAmount > 0 && (
                  <p className="text-sm font-semibold text-red-500">
                    Due: ₹{member.dueAmount}
                  </p>
                )}
              </div>
            </div>
          </div>

        {/* Payment Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Amount *
            </label>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none text-xl font-semibold transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
              placeholder="₹ 0"
              value={formData.amount}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  updateForm("amount", value);
                }
              }}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Enter amount greater than 0</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["membership", "personal_training", "supplements", "other"].map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateForm("type", type)}
                    className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition ${
                      formData.type === type
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {type.replace("_", " ")}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Mode
            </label>
            <div className="flex gap-2">
              {["cash", "upi", "card", "bank"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateForm("mode", mode)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition ${
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
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Date
            </label>
            <input
              type="date"
              className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all duration-200 text-gray-900 bg-white"
              value={formData.date}
              onChange={(e) => updateForm("date", e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Notes (Optional)
            </label>
            <textarea
              className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none resize-none transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
              rows={3}
              placeholder="Payment notes..."
              value={formData.notes}
              onChange={(e) => updateForm("notes", e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.amount || loading}
              className="flex-1 py-3.5 bg-gradient-to-r from-[#F97316] to-[#FF8C42] text-white rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {loading ? "Processing..." : "Record Payment"}
            </button>
          </div>
        </div>
      </form>
      )}
    </div>
  );
}
