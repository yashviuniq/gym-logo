"use client";

import { useState } from "react";

const membershipPlans = [
    { id: 1, name: "Basic", duration: 30, price: 1000 },
    { id: 2, name: "Standard", duration: 90, price: 2500 },
    { id: 3, name: "Premium", duration: 180, price: 4500 },
    { id: 4, name: "Annual", duration: 365, price: 8000 },
];

export default function RenewMembershipModal({ member, onClose, onRenew }) {
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [customPrice, setCustomPrice] = useState("");
    const [useCustomPrice, setUseCustomPrice] = useState(false);
    const [paymentMode, setPaymentMode] = useState("cash");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const plan = membershipPlans.find((p) => p.id === selectedPlan);
    const finalPrice = useCustomPrice && customPrice ? parseFloat(customPrice) : plan?.price || 0;

    const calculateNewEndDate = () => {
        if (!plan) return null;
        const currentEndDate = new Date(member.validTill);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() + plan.duration);
        return newEndDate.toISOString().split("T")[0];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const renewalData = {
            planId: selectedPlan,
            planName: plan.name,
            duration: plan.duration,
            price: finalPrice,
            paymentAmount: parseFloat(paymentAmount),
            paymentMode,
            notes,
            newEndDate: calculateNewEndDate(),
            renewedAt: new Date().toISOString(),
        };

        onRenew(renewalData);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Renew Membership
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Member Info */}
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center text-white font-bold">
                                {member.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{member.name}</p>
                                <p className="text-sm text-gray-600">{member.phone}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-600">Current Plan</p>
                                <p className="font-medium text-gray-900">{member.plan}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Valid Till</p>
                                <p className="font-medium text-gray-900">{member.validTill}</p>
                            </div>
                        </div>
                    </div>

                    {/* Select Plan */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Renewal Plan *
                        </label>
                        <div className="space-y-2">
                            {membershipPlans.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        setSelectedPlan(p.id);
                                        setCustomPrice(p.price.toString());
                                    }}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition ${selectedPlan === p.id
                                            ? "border-[#F97316] bg-orange-50"
                                            : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-900">{p.name}</p>
                                            <p className="text-sm text-gray-500">{p.duration} days</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-gray-900">₹{p.price}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* New End Date Preview */}
                    {selectedPlan && (
                        <div className="bg-blue-50 rounded-xl p-4">
                            <p className="text-sm text-blue-600 mb-1">New Validity Period</p>
                            <p className="font-semibold text-blue-900">
                                {member.validTill} → {calculateNewEndDate()}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                +{plan.duration} days extension
                            </p>
                        </div>
                    )}

                    {/* Custom Price Option */}
                    {selectedPlan && (
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">Custom Price</span>
                                <button
                                    type="button"
                                    onClick={() => setUseCustomPrice(!useCustomPrice)}
                                    className={`w-12 h-6 rounded-full transition ${useCustomPrice ? "bg-[#F97316]" : "bg-gray-300"
                                        }`}
                                >
                                    <div
                                        className={`w-5 h-5 bg-white rounded-full shadow transition transform ${useCustomPrice ? "translate-x-6" : "translate-x-1"
                                            }`}
                                    ></div>
                                </button>
                            </div>

                            {useCustomPrice && (
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">
                                        Enter Custom Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F97316] outline-none"
                                        placeholder="Enter custom price"
                                        value={customPrice}
                                        onChange={(e) => setCustomPrice(e.target.value)}
                                        required={useCustomPrice}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment Details */}
                    {selectedPlan && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount Received *
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F97316] outline-none text-lg font-semibold"
                                    placeholder="₹ 0"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    required
                                />
                                {paymentAmount && parseFloat(paymentAmount) < finalPrice && (
                                    <p className="text-sm text-orange-500 mt-1">
                                        Due amount: ₹{finalPrice - parseFloat(paymentAmount)}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Mode *
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {["cash", "upi", "card", "bank"].map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setPaymentMode(mode)}
                                            className={`py-2 rounded-lg text-sm font-medium capitalize transition ${paymentMode === mode
                                                    ? "btn-gradient-orange text-white"
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
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#F97316] outline-none resize-none"
                                    rows={2}
                                    placeholder="Renewal notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </>
                    )}

                    {/* Summary */}
                    {selectedPlan && paymentAmount && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                            <p className="text-sm text-green-600 mb-2">Renewal Summary</p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Plan Price:</span>
                                    <span className="font-medium">₹{finalPrice}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Amount Paid:</span>
                                    <span className="font-medium">₹{paymentAmount}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-green-200">
                                    <span className="font-semibold text-gray-900">Balance:</span>
                                    <span className={`font-bold ${finalPrice - parseFloat(paymentAmount) > 0
                                            ? "text-red-600"
                                            : "text-green-600"
                                        }`}>
                                        ₹{finalPrice - parseFloat(paymentAmount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!selectedPlan || !paymentAmount || loading}
                            className="flex-1 py-3 btn-gradient-orange text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Processing..." : "Renew Membership"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
