"use client";

export default function RenewalHistoryModal({ member, renewalHistory, onClose }) {
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
                                            <p className="font-bold text-gray-900">₹{renewal.planPrice || renewal.price}</p>
                                            <p className="text-xs text-gray-500">{renewal.duration} days</p>
                                        </div>
                                    </div>

                                    {/* Price Breakdown */}
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-3 space-y-1.5">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Plan Price</span>
                                            <span className={`font-medium ${renewal.customPrice ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                                ₹{renewal.planPrice || renewal.price}
                                            </span>
                                        </div>
                                        {renewal.customPrice && (
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

                                    {renewal.paymentAmount > 0 && (
                                        <div className="bg-gray-50 rounded-lg p-2 text-sm">
                                            <p className="text-xs text-gray-600">Payment Mode</p>
                                            <p className="font-medium text-gray-900 capitalize">
                                                {renewal.paymentMode}
                                            </p>
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
                    {renewalHistory && renewalHistory.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <p className="text-xs text-blue-600 mb-1">Total Renewals</p>
                                    <p className="text-xl font-bold text-blue-700">
                                        {renewalHistory.length-1}
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
                                            (sum, r) => sum + (r.dueAmount || 0),
                                            0
                                        )}
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
