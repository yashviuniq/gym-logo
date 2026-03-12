"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/contexts/ToastContext";

const PAYMENT_MODE_OPTIONS = ["cash", "upi", "card", "bank"];

const roundCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getDateInputValue = (value) => {
    if (!value) return "";
    if (typeof value === "string" && value.includes("T")) {
        return value.split("T")[0];
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().split("T")[0];
};

const mergeDateWithOriginalTime = (dateValue, originalDateTime) => {
    if (!dateValue) return null;
    const fallbackTime = "12:00:00.000Z";

    if (originalDateTime) {
        const original = new Date(originalDateTime);
        if (!Number.isNaN(original.getTime())) {
            const timePart = original.toISOString().split("T")[1] || fallbackTime;
            return `${dateValue}T${timePart}`;
        }
    }

    return `${dateValue}T${fallbackTime}`;
};

const calculateExtendedTillDate = (startDate, durationDays) => {
    if (!startDate || !durationDays) return "";

    const endDate = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(endDate.getTime())) return "";

    endDate.setDate(endDate.getDate() + Number(durationDays));
    return endDate.toISOString().split("T")[0];
};

export default function RenewalHistoryModal({ member, renewalHistory, onClose, onPaymentModeUpdated }) {
    const [paymentModeOverrides, setPaymentModeOverrides] = useState({});
    const [renewalOverrides, setRenewalOverrides] = useState({});
    const [savingPaymentId, setSavingPaymentId] = useState(null);
    const [editingMembershipId, setEditingMembershipId] = useState(null);
    const [editingValues, setEditingValues] = useState({
        renewedAt: "",
        customPrice: "",
        paymentAmount: "",
    });
    const [savingMembershipId, setSavingMembershipId] = useState(null);
    const { showSuccess, showError } = useToast();

    const historyItems = (renewalHistory || []).map((item) => ({
        ...item,
        ...renewalOverrides[item.membershipId],
        paymentMode: item.paymentId && paymentModeOverrides[item.paymentId]
            ? paymentModeOverrides[item.paymentId]
            : item.paymentMode,
    }));

    const totalPaid = member?.totalPaid ?? historyItems.reduce(
        (sum, renewal) => sum + (renewal.paymentAmount || 0),
        0
    );
    const totalDue = Math.max(0, member?.balance ?? historyItems.reduce(
        (sum, renewal) => sum + (renewal.dueAmount || 0),
        0
    ));

    const updatePaymentMode = async (renewalIndex, paymentId, nextMode) => {
        if (!paymentId || !nextMode) return;

        const previousMode = historyItems[renewalIndex]?.paymentMode || "cash";
        if (previousMode === nextMode) return;

        setSavingPaymentId(paymentId);
        setPaymentModeOverrides((current) => ({ ...current, [paymentId]: nextMode }));

        const { error } = await supabase
            .from("payments")
            .update({ payment_mode: nextMode })
            .eq("id", paymentId);

        if (error) {
            console.error("Error updating payment mode:", error);
            setPaymentModeOverrides((current) => ({ ...current, [paymentId]: previousMode }));
            showError("Failed to update payment mode");
            setSavingPaymentId(null);
            return;
        }

        setSavingPaymentId(null);
        showSuccess("Payment mode updated");
        onPaymentModeUpdated?.();
    };

    const startEditingRenewal = (renewal) => {
        setEditingMembershipId(renewal.membershipId);
        setEditingValues({
            renewedAt: getDateInputValue(renewal.renewedAt),
            customPrice: renewal.customPrice != null ? String(renewal.customPrice) : "",
            paymentAmount: String(renewal.paymentAmount || 0),
        });
    };

    const cancelEditingRenewal = () => {
        setEditingMembershipId(null);
        setEditingValues({
            renewedAt: "",
            customPrice: "",
            paymentAmount: "",
        });
    };

    const updateRenewalDetails = async (renewal) => {
        if (!renewal?.membershipId) return;

        const renewalDate = editingValues.renewedAt;
        const newEndDate = calculateExtendedTillDate(renewalDate, renewal.duration);
        const customPriceInput = editingValues.customPrice.trim();
        const paymentAmountInput = editingValues.paymentAmount.trim();
        const planPrice = roundCurrency(renewal.planPrice || renewal.price);

        if (!renewalDate || !newEndDate) {
            showError("Please select a valid renewal date");
            return;
        }

        const parsedCustomPrice = customPriceInput === "" ? null : Number(customPriceInput);
        if (parsedCustomPrice != null && (!Number.isFinite(parsedCustomPrice) || parsedCustomPrice < 0)) {
            showError("Please enter a valid applied price");
            return;
        }

        if (paymentAmountInput !== "" && (!Number.isFinite(Number(paymentAmountInput)) || Number(paymentAmountInput) < 0)) {
            showError("Please enter a valid paid amount");
            return;
        }

        const appliedPrice = parsedCustomPrice == null ? planPrice : roundCurrency(parsedCustomPrice);
        const updatedPaymentAmount = roundCurrency(paymentAmountInput === "" ? renewal.paymentAmount || 0 : Number(paymentAmountInput));
        const recalculatedDue = roundCurrency(Math.max(0, appliedPrice - updatedPaymentAmount));
        const customPriceValue = appliedPrice === planPrice ? null : appliedPrice;
        const previousDue = roundCurrency(renewal.dueAmount || 0);

        setSavingMembershipId(renewal.membershipId);

        const membershipUpdate = {
            start_date: renewalDate,
            end_date: newEndDate,
            custom_price: customPriceValue,
            due_amount: recalculatedDue,
        };

        const { error: membershipError } = await supabase
            .from("memberships")
            .update(membershipUpdate)
            .eq("id", renewal.membershipId);

        if (membershipError) {
            console.error("Error updating renewal details:", membershipError);
            showError("Failed to update renewal details");
            setSavingMembershipId(null);
            return;
        }

        if (renewal.paymentId) {
            const updatedPaidAt = mergeDateWithOriginalTime(renewalDate, renewal.renewedAt);
            const { error: paymentDateError } = await supabase
                .from("payments")
                .update({
                    paid_at: updatedPaidAt,
                    amount: updatedPaymentAmount,
                })
                .eq("id", renewal.paymentId);

            if (paymentDateError) {
                console.error("Error updating renewal payment date:", paymentDateError);
                showError("Renewal updated, but failed to update payment date");
                setSavingMembershipId(null);
                return;
            }
        } else if (updatedPaymentAmount > 0) {
            const insertedPaidAt = mergeDateWithOriginalTime(renewalDate, renewal.renewedAt);
            const { error: paymentInsertError } = await supabase
                .from("payments")
                .insert({
                    gym_id: member.gymId,
                    member_id: member.id,
                    membership_id: renewal.membershipId,
                    amount: updatedPaymentAmount,
                    payment_mode: renewal.paymentMode || "cash",
                    status: "paid",
                    paid_at: insertedPaidAt,
                });

            if (paymentInsertError) {
                console.error("Error creating paid renewal payment:", paymentInsertError);
                showError("Renewal updated, but failed to create paid payment");
                setSavingMembershipId(null);
                return;
            }
        }

        const { data: pendingPayments, error: pendingFetchError } = await supabase
            .from("payments")
            .select("id")
            .eq("membership_id", renewal.membershipId)
            .eq("status", "pending");

        if (pendingFetchError) {
            console.error("Error fetching pending renewal payments:", pendingFetchError);
            showError("Renewal updated, but failed to sync pending amount");
            setSavingMembershipId(null);
            return;
        }

        if (recalculatedDue > 0) {
            if ((pendingPayments || []).length > 0) {
                const { error: pendingUpdateError } = await supabase
                    .from("payments")
                    .update({
                        amount: recalculatedDue,
                        remaining_amount: recalculatedDue,
                    })
                    .in("id", pendingPayments.map((payment) => payment.id));

                if (pendingUpdateError) {
                    console.error("Error updating pending renewal payment:", pendingUpdateError);
                    showError("Renewal updated, but failed to sync pending amount");
                    setSavingMembershipId(null);
                    return;
                }
            } else {
                const { error: pendingInsertError } = await supabase
                    .from("payments")
                    .insert({
                        gym_id: member.gymId,
                        member_id: member.id,
                        membership_id: renewal.membershipId,
                        amount: recalculatedDue,
                        payment_mode: renewal.paymentMode || "cash",
                        status: "pending",
                        remaining_amount: recalculatedDue,
                    });

                if (pendingInsertError) {
                    console.error("Error creating pending renewal payment:", pendingInsertError);
                    showError("Renewal updated, but failed to create pending amount");
                    setSavingMembershipId(null);
                    return;
                }
            }
        } else if ((pendingPayments || []).length > 0) {
            const { error: pendingDeleteError } = await supabase
                .from("payments")
                .delete()
                .in("id", pendingPayments.map((payment) => payment.id));

            if (pendingDeleteError) {
                console.error("Error removing pending renewal payment:", pendingDeleteError);
                showError("Renewal updated, but failed to clear pending amount");
                setSavingMembershipId(null);
                return;
            }
        }

        const adjustedBalance = roundCurrency(Math.max(0, (member.balance || 0) - previousDue + recalculatedDue));
        const { error: memberUpdateError } = await supabase
            .from("members")
            .update({ balance: adjustedBalance })
            .eq("id", member.id);

        if (memberUpdateError) {
            console.error("Error updating member balance:", memberUpdateError);
            showError("Renewal updated, but member balance could not be refreshed");
            setSavingMembershipId(null);
            return;
        }

        setRenewalOverrides((current) => ({
            ...current,
            [renewal.membershipId]: {
                renewedAt: mergeDateWithOriginalTime(renewalDate, renewal.renewedAt),
                newEndDate,
                customPrice: customPriceValue,
                price: appliedPrice,
                paymentAmount: updatedPaymentAmount,
                dueAmount: recalculatedDue,
            },
        }));

        setSavingMembershipId(null);
        cancelEditingRenewal();
        showSuccess("Renewal updated");
        onPaymentModeUpdated?.();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Renewal History
                        </h3>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition text-gray-600 hover:text-gray-900 font-bold text-lg"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                    {/* Member Info */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 avatar-gradient rounded-full flex items-center justify-center text-white font-bold">
                                {member.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{member.name}</p>
                                <p className="text-sm text-gray-600">
                                    Current Plan: {member.plan}
                                </p>
                            </div>
                        </div>  
                    </div>

                    {/* Renewal Timeline */}
                    <div className="space-y-3">
                        {historyItems && historyItems.length > 0 ? (
                            historyItems.map((renewal, index) => (
                                <div
                                    key={index}
                                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                {historyItems.length - index}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {renewal.planName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {new Date(renewal.renewedAt).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900">₹{renewal.planPrice || renewal.price}</p>
                                            <p className="text-xs text-gray-500">{renewal.duration} days</p>
                                        </div>
                                    </div>

                                    {/* Price Breakdown */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Plan Price</span>
                                            <span className={`font-medium ${renewal.customPrice != null ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                                ₹{renewal.planPrice || renewal.price}
                                            </span>
                                        </div>
                                        {renewal.customPrice != null && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-blue-600 font-medium">Custom Price Applied</span>
                                                <span className="font-semibold text-blue-700">₹{renewal.customPrice}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-green-600">Paid</span>
                                            <span className="font-medium text-green-700">₹{renewal.paymentAmount || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-t border-blue-200 pt-1.5">
                                            <span className={`font-medium ${(renewal.dueAmount || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>Due</span>
                                            <span className={`font-semibold ${(renewal.dueAmount || 0) > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                                                ₹{renewal.dueAmount || 0}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <p className="text-xs text-gray-600">Renewal Dates</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {new Date(renewal.renewedAt).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                    {renewal.newEndDate ? ` to ${new Date(renewal.newEndDate).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}` : ""}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => startEditingRenewal(renewal)}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                            >
                                                {editingMembershipId === renewal.membershipId ? "Editing" : "Tap to edit"}
                                            </button>
                                        </div>

                                        {editingMembershipId === renewal.membershipId && (
                                            <div className="space-y-3 border-t border-gray-200 pt-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Renewal Date</label>
                                                        <input
                                                            type="date"
                                                            value={editingValues.renewedAt}
                                                            onChange={(e) => setEditingValues((current) => ({ ...current, renewedAt: e.target.value }))}
                                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">Extended Till</label>
                                                        <div className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700">
                                                            {editingValues.renewedAt
                                                                ? new Date(`${calculateExtendedTillDate(editingValues.renewedAt, renewal.duration)}T00:00:00`).toLocaleDateString("en-IN")
                                                                : "Select renewal date"}
                                                        </div>
                                                        <p className="mt-1 text-[11px] text-gray-500">
                                                            Auto-calculated for {renewal.duration} days.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditingRenewal}
                                                        disabled={savingMembershipId === renewal.membershipId}
                                                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateRenewalDetails(renewal)}
                                                        disabled={savingMembershipId === renewal.membershipId}
                                                        className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                                                    >
                                                        {savingMembershipId === renewal.membershipId ? "Saving..." : "Save Dates"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <p className="text-xs text-gray-600">Applied Price</p>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {renewal.customPrice != null
                                                        ? `₹${renewal.customPrice}`
                                                        : `Default ₹${renewal.planPrice || renewal.price}`}
                                                </p>
                                            </div>
                                            {editingMembershipId !== renewal.membershipId && (
                                                <button
                                                    type="button"
                                                    onClick={() => startEditingRenewal(renewal)}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                                >
                                                    Tap to edit
                                                </button>
                                            )}
                                        </div>

                                        {editingMembershipId === renewal.membershipId && (
                                            <div className="space-y-3 border-t border-gray-200 pt-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Applied Price</label>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={editingValues.customPrice}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                                                setEditingValues((current) => ({ ...current, customPrice: value }));
                                                            }
                                                        }}
                                                        placeholder={`Default: ₹${renewal.planPrice || renewal.price}`}
                                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                    <p className="mt-1 text-[11px] text-gray-500">Leave empty to use the original plan price.</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditingRenewal}
                                                        disabled={savingMembershipId === renewal.membershipId}
                                                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateRenewalDetails(renewal)}
                                                        disabled={savingMembershipId === renewal.membershipId}
                                                        className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                                                    >
                                                        {savingMembershipId === renewal.membershipId ? "Saving..." : "Save Price"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <p className="text-xs text-gray-600">Paid Amount</p>
                                                <p className="text-sm font-medium text-gray-900">₹{renewal.paymentAmount || 0}</p>
                                            </div>
                                            {editingMembershipId !== renewal.membershipId && (
                                                <button
                                                    type="button"
                                                    onClick={() => startEditingRenewal(renewal)}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                                >
                                                    Tap to edit
                                                </button>
                                            )}
                                        </div>

                                        {editingMembershipId === renewal.membershipId && (
                                            <div className="space-y-3 border-t border-gray-200 pt-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Paid Amount</label>
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={editingValues.paymentAmount}
                                                        onChange={(e) => {
                                                            const value = e.target.value;
                                                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                                                setEditingValues((current) => ({ ...current, paymentAmount: value }));
                                                            }
                                                        }}
                                                        placeholder="Enter paid amount"
                                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                    <p className="mt-1 text-[11px] text-gray-500">Due amount will recalculate automatically after saving.</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditingRenewal}
                                                        disabled={savingMembershipId === renewal.membershipId}
                                                        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateRenewalDetails(renewal)}
                                                        disabled={savingMembershipId === renewal.membershipId}
                                                        className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                                                    >
                                                        {savingMembershipId === renewal.membershipId ? "Saving..." : "Save Paid"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {renewal.paymentAmount > 0 && (
                                        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-xs text-gray-600">Payment Mode</p>
                                                    <p className="font-medium text-gray-900 capitalize">
                                                        {renewal.paymentMode}
                                                    </p>
                                                </div>
                                                {renewal.paymentId && (
                                                    <span className="text-[11px] text-gray-400">
                                                        {savingPaymentId === renewal.paymentId ? "Updating..." : "Tap to change"}
                                                    </span>
                                                )}
                                            </div>

                                            {renewal.paymentId && (
                                                <div className="grid grid-cols-4 gap-2">
                                                    {PAYMENT_MODE_OPTIONS.map((mode) => (
                                                        <button
                                                            key={mode}
                                                            type="button"
                                                            onClick={() => updatePaymentMode(index, renewal.paymentId, mode)}
                                                            disabled={savingPaymentId === renewal.paymentId}
                                                            className={`py-2 text-xs font-medium rounded-lg capitalize transition-all ${
                                                                renewal.paymentMode === mode
                                                                    ? "bg-blue-600 text-white"
                                                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                                                            } ${savingPaymentId === renewal.paymentId ? "opacity-60 cursor-not-allowed" : ""}`}
                                                        >
                                                            {mode}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {renewal.newEndDate && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                            <p className="text-xs text-gray-600">Extended Till</p>
                                            <p className="font-medium text-blue-600">
                                                {new Date(renewal.newEndDate).toLocaleDateString("en-IN", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    )}

                                    {renewal.notes && (
                                        <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                                            <p className="font-medium text-gray-700 mb-1">Notes:</p>
                                            <p>{renewal.notes}</p>
                                        </div>
                                    )}

                                    {(renewal.dueAmount || 0) > 0 && renewal.paymentAmount <= 0 && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 bg-orange-50 rounded-lg p-2">
                                            <span>⚠️</span>
                                            <span>
                                                No payment recorded - Full amount pending
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-6xl mb-4">📋</div>
                                <p className="text-gray-500 font-medium">No renewal history</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Renewals will appear here
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Summary Stats */}
                    {historyItems && historyItems.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-blue-600 mb-1">Total Renewals</p>
                                    <p className="text-xl font-bold text-blue-700">
                                        {historyItems.length-1}
                                    </p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-green-600 mb-1">Total Paid</p>
                                    <p className="text-xl font-bold text-green-700">
                                        ₹{totalPaid}
                                    </p>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-orange-600 mb-1">Total Due</p>
                                    <p className="text-xl font-bold text-orange-700">
                                        ₹{totalDue}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full mt-4 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition shadow-md"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
