"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/contexts/ToastContext";
import {
  X,
  CreditCard,
  Wallet,
  Smartphone,
  DollarSign,
  CheckCircle,
} from "lucide-react";

const PAYMENT_MODES = [
  { value: "cash", label: "Cash", icon: Wallet },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
];

export default function CollectPaymentModal({ 
  member, 
  gymId, 
  trainerId, 
  trainerName,
  onClose, 
  onPaymentCollected 
}) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: member?.balance?.toString() || "",
    mode: "cash",
    notes: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      showError("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      // Record payment in database with trainer info
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          gym_id: gymId,
          member_id: member.id,
          amount: amount,
          payment_mode: formData.mode,
          status: "paid",
          paid_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          collected_by: trainerId,
          collected_by_name: trainerName || "Trainer",
        });

      if (paymentError) throw paymentError;

      // Update member balance (reduce the due amount)
      const newBalance = Math.max(0, (member.balance || 0) - amount);
      const { error: balanceError } = await supabase
        .from("members")
        .update({ balance: newBalance })
        .eq("id", member.id);

      if (balanceError) throw balanceError;

      showSuccess(`Payment of ₹${amount.toLocaleString()} collected successfully!`);
      onPaymentCollected?.();
      onClose();
    } catch (error) {
      console.error("Error recording payment:", error);
      showError("Failed to record payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Collect Payment</h2>
            <p className="text-green-100 text-sm">{member?.name}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Current Due Amount */}
          {member?.balance > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Outstanding Balance:</span>{" "}
                <span className="text-lg font-bold">₹{member.balance?.toLocaleString()}</span>
              </p>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Collect *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                placeholder="0.00"
                min="1"
                required
              />
            </div>
            {member?.balance > 0 && (
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, amount: member.balance.toString() }))}
                className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Collect full amount (₹{member.balance.toLocaleString()})
              </button>
            )}
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, mode: mode.value }))}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      formData.mode === mode.value
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={2}
              placeholder="Add any notes about this payment..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount}
              className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Collect Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
