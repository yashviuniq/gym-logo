"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createPaymentReceipt } from "@/lib/receiptGenerator";

const preventScrollChange = (e) => {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.blur();
};

export default function RenewMembershipModal({ member, gymId, gymData, onClose, onRenew }) {
    const [membershipPlans, setMembershipPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [customPrice, setCustomPrice] = useState("");
    const [useCustomPrice, setUseCustomPrice] = useState(false);
    const [paymentMode, setPaymentMode] = useState("cash");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [useCustomStartDate, setUseCustomStartDate] = useState(false);
    const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split("T")[0]);

    // Fetch membership plans from database
    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const targetGymId = gymId || member.gymId;
                if (!targetGymId) {
                    console.error("No gym ID available");
                    setLoadingPlans(false);
                    return;
                }

                const { data, error } = await supabase
                    .from("membership_plans")
                    .select("id, name, duration_days, price")
                    .eq("gym_id", targetGymId)
                    .eq("is_active", true)
                    .order("price", { ascending: true });

                if (error) {
                    console.error("Error fetching plans:", error);
                } else {
                    setMembershipPlans(data || []);
                }
            } catch (err) {
                console.error("Error:", err);
            }
            setLoadingPlans(false);
        };

        fetchPlans();
    }, [gymId, member.gymId]);

    const plan = membershipPlans.find((p) => p.id === selectedPlan);
    const finalPrice = useCustomPrice && customPrice ? parseFloat(customPrice) : plan?.price || 0;

    const calculateNewEndDate = () => {
        if (!plan || !plan.duration_days) return null;
        
        let startDate;
        if (useCustomStartDate && customStartDate) {
            // Use custom start date
            startDate = new Date(customStartDate + 'T00:00:00');
        } else {
            // For renewal, start date should be the day AFTER current end date (or today if expired)
            let currentEndDate;
            if (member.validTill && member.validTill !== "N/A") {
                // Parse DD/MM/YYYY format
                const parts = member.validTill.split('/');
                if (parts.length === 3) {
                    const day = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                    const year = parseInt(parts[2], 10);
                    currentEndDate = new Date(year, month, day);
                } else {
                    currentEndDate = new Date();
                }
            } else {
                currentEndDate = new Date();
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            currentEndDate.setHours(0, 0, 0, 0);
            
            // If membership expired, start from today
            // Otherwise, start from the day after current end date
            if (currentEndDate < today) {
                startDate = today;
            } else {
                // Start from the day after current end date
                startDate = new Date(currentEndDate);
                startDate.setDate(startDate.getDate() + 1);
            }
        }
        
        // Calculate end date by adding duration_days
        const newEndDate = new Date(startDate);
        newEndDate.setDate(newEndDate.getDate() + plan.duration_days);
        return newEndDate.toISOString().split("T")[0];
    };

    const getStartDate = () => {
        if (useCustomStartDate && customStartDate) {
            return customStartDate;
        }
        
        // For renewal, start date should be the day AFTER current end date (or today if expired)
        let currentEndDate;
        if (member.validTill && member.validTill !== "N/A") {
            // Parse DD/MM/YYYY format
            const parts = member.validTill.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                const year = parseInt(parts[2], 10);
                currentEndDate = new Date(year, month, day);
            } else {
                currentEndDate = new Date();
            }
        } else {
            currentEndDate = new Date();
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        currentEndDate.setHours(0, 0, 0, 0);
        
        let startDate;
        // If membership expired, start from today
        // Otherwise, start from the day after current end date
        if (currentEndDate < today) {
            startDate = today;
        } else {
            // Start from the day after current end date
            startDate = new Date(currentEndDate);
            startDate.setDate(startDate.getDate() + 1);
        }
        
        return startDate.toISOString().split("T")[0];
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const targetGymId = gymId || member.gymId;
            const newEndDate = calculateNewEndDate();
            const startDate = getStartDate();

            // 1. Create new membership record
            const { data: membership, error: membershipError } = await supabase
                .from("memberships")
                .insert({
                    member_id: member.id,
                    gym_id: targetGymId,
                    plan_id: selectedPlan,
                    start_date: startDate,
                    end_date: newEndDate,
                    status: "active"
                })
                .select()
                .single();

            if (membershipError) {
                console.error("Error creating membership:", membershipError);
                alert("Failed to renew membership. Please try again.");
                setLoading(false);
                return;
            }

            // 2. Update any previous active memberships to expired
            await supabase
                .from("memberships")
                .update({ status: "expired" })
                .eq("member_id", member.id)
                .neq("id", membership.id)
                .eq("status", "active");

            // 3. Create payment record
            const paymentAmountNum = parseFloat(paymentAmount) || 0;
            let paymentId = null;
            if (paymentAmountNum > 0) {
                const { data: paymentData, error: paymentError } = await supabase
                    .from("payments")
                    .insert({
                        gym_id: targetGymId,
                        member_id: member.id,
                        membership_id: membership.id,
                        amount: paymentAmountNum,
                        payment_mode: paymentMode,
                        status: "paid",
                        paid_at: new Date().toISOString()
                    })
                    .select("id")
                    .single();

                if (paymentError) {
                    console.error("Error creating payment:", paymentError);
                } else {
                    paymentId = paymentData?.id;
                    
                    // 3.1 Generate payment receipt (async, don't block)
                    try {
                        // Get gym data for receipt
                        let gymInfo = gymData;
                        if (!gymInfo) {
                            const { data: fetchedGym } = await supabase
                                .from("gyms")
                                .select("id, name, address")
                                .eq("id", targetGymId)
                                .single();
                            gymInfo = fetchedGym;
                        }

                        createPaymentReceipt({
                            gymId: targetGymId,
                            gymName: gymInfo?.name || "Gym",
                            gymAddress: gymInfo?.address || "",
                            gymPhone: gymInfo?.phone || "",
                            memberId: member.id,
                            memberName: member.name,
                            memberPhone: member.phone,
                            memberEmail: member.email,
                            planName: plan.name,
                            planDuration: plan.duration_days,
                            validityStart: startDate,
                            validityEnd: newEndDate,
                            amount: paymentAmountNum,
                            balanceAmount: Math.max(0, finalPrice - paymentAmountNum),
                            paymentMode: paymentMode,
                            paymentId: paymentId,
                            paymentDate: new Date()
                        }).then(result => {
                            if (result.success) {
                                console.log("Receipt generated:", result.receiptNumber);
                            } else {
                                console.error("Failed to generate receipt:", result.error);
                            }
                        });
                    } catch (receiptError) {
                        console.error("Receipt generation error:", receiptError);
                        // Don't fail the renewal if receipt fails
                    }
                }
            }

            // 4. Update member balance (add due amount if partial payment)
            const dueAmount = finalPrice - paymentAmountNum;
            const currentBalance = member.balance || member.dueAmount || 0;
            const newBalance = currentBalance + dueAmount;

            await supabase
                .from("members")
                .update({ balance: newBalance })
                .eq("id", member.id);

            // Success! Prepare renewal data
            const renewalData = {
                planId: selectedPlan,
                planName: plan.name,
                duration: plan.duration_days,
                price: finalPrice,
                paymentAmount: paymentAmountNum,
                paymentMode,
                notes,
                newEndDate,
                renewedAt: new Date().toISOString(),
            };

            setLoading(false);
            
            // Show success message
            alert("Membership renewed successfully!");
            
            // Close modal first
            onClose();
            
            // Then notify parent (wrapped in try-catch to prevent error propagation)
            try {
                onRenew(renewalData);
            } catch (callbackError) {
                console.error("Error in onRenew callback:", callbackError);
            }
        } catch (err) {
            console.error("Error during renewal:", err);
            setLoading(false);
            alert("An error occurred. Please try again.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" style={{ paddingBottom: '80px' }}>
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Renew Membership
                    </h3>
                    <button
                        onClick={onClose}
                        type="button"
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition text-gray-500"
                    >
                        ✕
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: 0 }}>
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
                        {loadingPlans ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-6 h-6 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : membershipPlans.length === 0 ? (
                            <div className="text-center py-6 text-gray-500">
                                <p>No membership plans available.</p>
                                <p className="text-sm">Please add plans in Settings.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {membershipPlans.map((p) => (
                                    <div
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedPlan(p.id);
                                            setCustomPrice(p.price.toString());
                                        }}
                                        className={`p-3 rounded-xl border-2 cursor-pointer transition ${selectedPlan === p.id
                                                ? "border-[#F97316] bg-orange-50"
                                                : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-900">{p.name}</p>
                                                <p className="text-sm text-gray-500">{p.duration_days} days</p>
                                            </div>
                                            <p className="text-lg font-bold text-gray-900">₹{p.price}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* New End Date Preview */}
                    {selectedPlan && (() => {
                        const startDateStr = getStartDate();
                        const endDateStr = calculateNewEndDate();
                        const startDate = startDateStr ? new Date(startDateStr + 'T00:00:00') : null;
                        const endDate = endDateStr ? new Date(endDateStr + 'T00:00:00') : null;
                        return (
                            <div className="bg-blue-50 rounded-xl p-3">
                                <p className="text-sm text-blue-600 mb-1">New Validity Period</p>
                                <p className="font-semibold text-blue-900">
                                    {startDate ? startDate.toLocaleDateString("en-IN") : ""} → {endDate ? endDate.toLocaleDateString("en-IN") : ""}
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    +{plan.duration_days} days extension
                                </p>
                            </div>
                        );
                    })()}

                    {/* Manual Date Selection */}
                    {selectedPlan && (
                        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 text-sm">Custom Start Date</span>
                                <button
                                    type="button"
                                    onClick={() => setUseCustomStartDate(!useCustomStartDate)}
                                    className={`w-10 h-5 rounded-full transition ${useCustomStartDate ? "bg-[#F97316]" : "bg-gray-300"}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow transition transform ${useCustomStartDate ? "translate-x-5" : "translate-x-0.5"}`}></div>
                                </button>
                            </div>
                            {useCustomStartDate && (
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] outline-none text-sm"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    max={new Date().toISOString().split("T")[0]}
                                />
                            )}
                        </div>
                    )}

                    {/* Custom Price Option */}
                    {selectedPlan && (
                        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 text-sm">Custom Price</span>
                                <button
                                    type="button"
                                    onClick={() => setUseCustomPrice(!useCustomPrice)}
                                    className={`w-10 h-5 rounded-full transition ${useCustomPrice ? "bg-[#F97316]" : "bg-gray-300"}`}
                                >
                                    <div className={`w-4 h-4 bg-white rounded-full shadow transition transform ${useCustomPrice ? "translate-x-5" : "translate-x-0.5"}`}></div>
                                </button>
                            </div>
                            {useCustomPrice && (
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    pattern="[0-9]*\.?[0-9]*"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] outline-none text-sm"
                                    placeholder="Enter custom price"
                                    value={customPrice}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                            setCustomPrice(value);
                                        }
                                    }}
                                />
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
    type="text"
    inputMode="decimal"
    pattern="[0-9]*\.?[0-9]*"
    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] outline-none text-lg font-semibold"
    placeholder="₹ 0"
    value={paymentAmount}
    onChange={(e) => {
        const value = e.target.value;
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setPaymentAmount(value);
        }
    }}
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
                                            className={`py-2 rounded-lg text-xs font-medium capitalize transition ${paymentMode === mode
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
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] outline-none resize-none text-sm"
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
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3">
                            <p className="text-sm text-green-600 mb-2">Renewal Summary</p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Plan Price:</span>
                                    <span className="font-medium text-black">₹{finalPrice}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Amount Paid:</span>
                                    <span className="font-medium text-black">₹{paymentAmount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Current Due:</span>
                                    <span className="font-medium text-orange-600">₹{finalPrice - parseFloat(paymentAmount)}</span>
                                </div>
                                {(member.dueAmount > 0 || member.balance > 0) && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Previous Balance:</span>
                                        <span className="font-medium text-orange-600">₹{member.dueAmount || member.balance || 0}</span>
                                    </div>
                                )}
                                <div className="flex justify-between pt-2 border-t border-green-200">
                                    <span className="font-semibold text-gray-900">Total Balance:</span>
                                    <span className={`font-bold ${(finalPrice - parseFloat(paymentAmount) + (member.dueAmount || member.balance || 0)) > 0
                                            ? "text-red-600"
                                            : "text-green-600"
                                        }`}>
                                        ₹{finalPrice - parseFloat(paymentAmount) + (member.dueAmount || member.balance || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer with Action Buttons - Always Visible */}
                <div className="border-t-2 border-gray-200 p-4 bg-white rounded-b-2xl flex-shrink-0">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!selectedPlan || !paymentAmount || loading}
                            className="flex-1 py-3 bg-[#F97316] text-white rounded-xl font-semibold hover:bg-[#ea6c10] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {loading ? "Processing..." : "✓ Renew"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
