"use client";

export default function RenewalHistoryModal({ member, renewalHistory, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-3xl max-h-[80vh] overflow-hidden">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Renewal History
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="p-4">
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
                    <div className="space-y-3 overflow-y-auto max-h-[50vh]">
                        {renewalHistory && renewalHistory.length > 0 ? (
                            renewalHistory.map((renewal, index) => (
                                <div
                                    key={index}
                                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                {renewalHistory.length - index}
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
                                            <p className="font-bold text-gray-900">₹{renewal.price}</p>
                                            <p className="text-xs text-gray-500">{renewal.duration} days</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-xs text-gray-600">Amount Paid</p>
                                            <p className="font-medium text-gray-900">
                                                ₹{renewal.paymentAmount}
                                            </p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-xs text-gray-600">Payment Mode</p>
                                            <p className="font-medium text-gray-900 capitalize">
                                                {renewal.paymentMode}
                                            </p>
                                        </div>
                                    </div>

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

                                    {renewal.price - renewal.paymentAmount > 0 && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600 bg-orange-50 rounded-lg p-2">
                                            <span>⚠️</span>
                                            <span>
                                                Due: ₹{renewal.price - renewal.paymentAmount}
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
                    {renewalHistory && renewalHistory.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-blue-600 mb-1">Total Renewals</p>
                                    <p className="text-xl font-bold text-blue-700">
                                        {renewalHistory.length}
                                    </p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-green-600 mb-1">Total Paid</p>
                                    <p className="text-xl font-bold text-green-700">
                                        ₹
                                        {renewalHistory.reduce(
                                            (sum, r) => sum + r.paymentAmount,
                                            0
                                        )}
                                    </p>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-orange-600 mb-1">Total Due</p>
                                    <p className="text-xl font-bold text-orange-700">
                                        ₹
                                        {renewalHistory.reduce(
                                            (sum, r) => sum + (r.price - r.paymentAmount),
                                            0
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full mt-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
