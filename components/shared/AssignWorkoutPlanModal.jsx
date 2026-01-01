"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/contexts/ToastContext";

export default function AssignWorkoutPlanModal({ member, gymId, onClose, onAssign }) {
    const { showSuccess, showError } = useToast();
    const [workoutPlans, setWorkoutPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingPlans, setLoadingPlans] = useState(true);

    // Fetch workout plans from database
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
                    .from("workout_plans")
                    .select("id, title, description, goal, level, is_template")
                    .eq("gym_id", targetGymId)
                    .order("title", { ascending: true });

                if (error) {
                    console.error("Error fetching workout plans:", error);
                    showError("Failed to load workout plans");
                } else {
                    setWorkoutPlans(data || []);
                }
            } catch (err) {
                console.error("Error:", err);
                showError("Failed to load workout plans");
            }
            setLoadingPlans(false);
        };

        fetchPlans();
    }, [gymId, member.gymId]);

    const handleAssign = async () => {
        if (!selectedPlan) {
            showError("Please select a workout plan");
            return;
        }

        setLoading(true);
        try {
            const storedUser = localStorage.getItem("gymUser");
            const currentUser = storedUser ? JSON.parse(storedUser) : null;
            const assignedBy = currentUser?.id;

            // Check if member already has this workout plan assigned
            const { data: existing } = await supabase
                .from("member_workouts")
                .select("id")
                .eq("member_id", member.id)
                .eq("workout_plan_id", selectedPlan)
                .maybeSingle();

            if (existing) {
                showError("This workout plan is already assigned to this member");
                setLoading(false);
                return;
            }

            // Assign workout plan to member
            const { error } = await supabase
                .from("member_workouts")
                .insert({
                    member_id: member.id,
                    workout_plan_id: selectedPlan,
                });

            if (error) {
                throw error;
            }

            showSuccess("Workout plan assigned successfully!");
            if (onAssign) {
                onAssign();
            }
            onClose();
        } catch (error) {
            console.error("Error assigning workout plan:", error);
            showError("Failed to assign workout plan. Please try again.");
        }
        setLoading(false);
    };

    const getLevelColor = (level) => {
        switch (level?.toLowerCase()) {
            case "beginner":
                return "bg-green-100 text-green-700";
            case "intermediate":
                return "bg-yellow-100 text-yellow-700";
            case "advanced":
                return "bg-red-100 text-red-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">
                                Assign Workout Plan
                            </h3>
                            <p className="text-gray-500 text-sm mt-1">
                                Select a workout plan for {member.name}
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
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : workoutPlans.length === 0 ? (
                        <div className="text-center py-8">
                            <span className="text-4xl">💪</span>
                            <p className="text-gray-500 mt-2">No workout plans available</p>
                            <p className="text-gray-400 text-sm mt-1">
                                Create workout plans in Settings first
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Select Workout Plan *
                            </label>
                            {workoutPlans.map((plan) => (
                                <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => setSelectedPlan(plan.id)}
                                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                                        selectedPlan === plan.id
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300 bg-white"
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-gray-900">
                                                    {plan.title}
                                                </p>
                                                {plan.is_template && (
                                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                                        Template
                                                    </span>
                                                )}
                                                {plan.level && (
                                                    <span className={`px-2 py-0.5 text-xs rounded-full ${getLevelColor(plan.level)}`}>
                                                        {plan.level}
                                                    </span>
                                                )}
                                            </div>
                                            {plan.goal && (
                                                <p className="text-xs text-blue-600 mt-1">
                                                    🎯 {plan.goal}
                                                </p>
                                            )}
                                            {plan.description && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    {plan.description}
                                                </p>
                                            )}
                                        </div>
                                        {selectedPlan === plan.id && (
                                            <span className="text-blue-500 text-xl">✓</span>
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
                        className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
                    >
                        {loading ? "Assigning..." : "Assign Plan"}
                    </button>
                </div>
            </div>
        </div>
    );
}
