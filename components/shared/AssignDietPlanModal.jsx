"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/contexts/ToastContext";

export default function AssignDietPlanModal({ member, gymId, onClose, onAssign }) {
    const { showSuccess, showError } = useToast();
    const [dietPlans, setDietPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingPlans, setLoadingPlans] = useState(true);

    // Fetch diet plans from database
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
                    .from("diet_plans")
                    .select("id, title, description, is_template")
                    .eq("gym_id", targetGymId)
                    .order("title", { ascending: true });

                if (error) {
                    console.error("Error fetching diet plans:", error);
                    showError("Failed to load diet plans");
                } else {
                    setDietPlans(data || []);
                }
            } catch (err) {
                console.error("Error:", err);
                showError("Failed to load diet plans");
            }
            setLoadingPlans(false);
        };

        fetchPlans();
    }, [gymId, member.gymId]);

    const handleAssign = async () => {
        if (!selectedPlan) {
            showError("Please select a diet plan");
            return;
        }

        setLoading(true);
        try {
            const storedUser = localStorage.getItem("gymUser");
            const currentUser = storedUser ? JSON.parse(storedUser) : null;
            const assignedBy = currentUser?.id;

            // Check if member already has this diet plan assigned
            const { data: existing } = await supabase
                .from("member_diets")
                .select("id")
                .eq("member_id", member.id)
                .eq("diet_plan_id", selectedPlan)
                .maybeSingle();

            if (existing) {
                showError("This diet plan is already assigned to this member");
                setLoading(false);
                return;
            }

            // Assign diet plan to member
            const { error } = await supabase
                .from("member_diets")
                .insert({
                    member_id: member.id,
                    diet_plan_id: selectedPlan,
                    assigned_by: assignedBy,
                });

            if (error) {
                throw error;
            }

            showSuccess("Diet plan assigned successfully!");
            if (onAssign) {
                onAssign();
            }
            onClose();
        } catch (error) {
            console.error("Error assigning diet plan:", error);
            showError("Failed to assign diet plan. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">
                                Assign Diet Plan
                            </h3>
                            <p className="text-gray-500 text-sm mt-1">
                                Select a diet plan for {member.name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <span className="text-2xl">×</span>
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loadingPlans ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : dietPlans.length === 0 ? (
                        <div className="text-center py-8">
                            <span className="text-4xl">🥗</span>
                            <p className="text-gray-500 mt-2">No diet plans available</p>
                            <p className="text-gray-400 text-sm mt-1">
                                Create diet plans in Settings first
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Select Diet Plan *
                            </label>
                            {dietPlans.map((plan) => (
                                <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                        selectedPlan === plan.id
                                            ? "border-[#F97316] bg-orange-50"
                                            : "border-gray-200 hover:border-gray-300 bg-white"
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-gray-900">
                                                    {plan.title}
                                                </p>
                                                {plan.is_template && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                        Template
                                                    </span>
                                                )}
                                            </div>
                                            {plan.description && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {plan.description}
                                                </p>
                                            )}
                                        </div>
                                        {selectedPlan === plan.id && (
                                            <span className="text-[#F97316] text-xl">✓</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-100 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleAssign}
                        disabled={loading || !selectedPlan || loadingPlans}
                        className="flex-1 py-3 bg-gradient-to-r from-[#F97316] to-[#FF8C42] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                    >
                        {loading ? "Assigning..." : "Assign Plan"}
                    </button>
                </div>
            </div>
        </div>
    );
}

