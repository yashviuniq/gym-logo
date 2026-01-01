"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/contexts/ToastContext";
import { PlusCircle, Edit2, Trash2, XCircle } from "lucide-react";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const GOALS = ["Fat Loss", "Muscle Gain", "Strength", "Endurance", "Flexibility", "General Fitness"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function WorkoutPlansSettingsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [gymId, setGymId] = useState(null);

  useEffect(() => {
    fetchWorkoutPlans();
  }, []);

  const fetchWorkoutPlans = async () => {
    try {
      setLoading(true);
      const storedGym = localStorage.getItem("selectedGym");
      if (!storedGym) {
        showError("No gym selected");
        setLoading(false);
        return;
      }
      const gym = JSON.parse(storedGym);
      setGymId(gym.id);

      const { data, error } = await supabase
        .from("workout_plans")
        .select("*")
        .eq("gym_id", gym.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkoutPlans(data || []);
    } catch (error) {
      console.error("Error fetching workout plans:", error);
      showError("Failed to load workout plans");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this workout plan? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("workout_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
      showSuccess("Workout plan deleted successfully");
      fetchWorkoutPlans();
    } catch (error) {
      console.error("Error deleting workout plan:", error);
      showError("Failed to delete workout plan");
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Workout Plans" />
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Workout Plans" />

      <main className="px-4 py-4">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Workout Plans</h2>
            <p className="text-gray-500 text-sm mt-1">Create and manage workout plans for your members</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>New Plan</span>
          </button>
        </div>

        {/* Workout Plans List */}
        {workoutPlans.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">💪</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Workout Plans Yet</h3>
            <p className="text-gray-500 mb-6">Create your first workout plan to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg transition"
            >
              Create Workout Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workoutPlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{plan.title}</h3>
                      {plan.is_template && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                          Template
                        </span>
                      )}
                      {plan.level && (
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getLevelColor(plan.level)}`}>
                          {plan.level}
                        </span>
                      )}
                    </div>
                    {plan.goal && (
                      <p className="text-sm text-blue-600 mb-1">🎯 {plan.goal}</p>
                    )}
                    {plan.description && (
                      <p className="text-sm text-gray-600 mb-2">{plan.description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Created: {new Date(plan.created_at).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setEditingPlan(plan);
                      setShowAddModal(true);
                    }}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Workout Plan Modal */}
      {(showAddModal || editingPlan) && (
        <WorkoutPlanModal
          plan={editingPlan}
          gymId={gymId}
          onClose={() => {
            setShowAddModal(false);
            setEditingPlan(null);
          }}
          onSave={() => {
            fetchWorkoutPlans();
            setShowAddModal(false);
            setEditingPlan(null);
          }}
        />
      )}
    </div>
  );
}

// Workout Plan Modal Component
function WorkoutPlanModal({ plan, gymId, onClose, onSave }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goal: "",
    level: "",
    is_template: false,
  });
  const [days, setDays] = useState({});

  useEffect(() => {
    if (plan) {
      setFormData({
        title: plan.title || "",
        description: plan.description || "",
        goal: plan.goal || "",
        level: plan.level || "",
        is_template: plan.is_template || false,
      });
      fetchPlanDetails();
    } else {
      // Initialize with all days (1-6, Monday to Saturday)
      const initialDays = {};
      for (let i = 1; i <= 6; i++) {
        initialDays[i] = {
          day_of_week: i,
          day_name: DAY_NAMES[i],
          focus: "",
          exercises: [],
        };
      }
      setDays(initialDays);
    }
  }, [plan]);

  const fetchPlanDetails = async () => {
    if (!plan) return;

    try {
      const { data: planDays, error } = await supabase
        .from("workout_plan_days")
        .select(`
          id,
          day_of_week,
          day_name,
          focus,
          workout_exercises (
            id,
            exercise_name,
            sets,
            reps,
            weight,
            rest_seconds,
            notes,
            exercise_order
          )
        `)
        .eq("workout_plan_id", plan.id)
        .order("day_of_week", { ascending: true });

      if (error) throw error;

      const organizedDays = {};
      if (planDays) {
        planDays.forEach(day => {
          organizedDays[day.day_of_week] = {
            id: day.id,
            day_of_week: day.day_of_week,
            day_name: day.day_name || DAY_NAMES[day.day_of_week],
            focus: day.focus || "",
            exercises: (day.workout_exercises || []).sort((a, b) => (a.exercise_order || 0) - (b.exercise_order || 0)),
          };
        });
      }

      // Fill in missing days
      for (let i = 1; i <= 6; i++) {
        if (!organizedDays[i]) {
          organizedDays[i] = {
            day_of_week: i,
            day_name: DAY_NAMES[i],
            focus: "",
            exercises: [],
          };
        }
      }

      setDays(organizedDays);
    } catch (error) {
      console.error("Error fetching plan details:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showError("Please enter a title for the workout plan");
      return;
    }

    if (!gymId) {
      showError("No gym selected");
      return;
    }

    setLoading(true);
    try {
      const storedUser = localStorage.getItem("gymUser");
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const createdBy = currentUser?.id;

      let planId;

      if (plan) {
        // Update existing plan
        const { error: updateError } = await supabase
          .from("workout_plans")
          .update({
            title: formData.title,
            description: formData.description || null,
            goal: formData.goal || null,
            level: formData.level || null,
            is_template: formData.is_template,
            updated_at: new Date().toISOString(),
          })
          .eq("id", plan.id);

        if (updateError) throw updateError;
        planId = plan.id;

        // Delete existing days and recreate
        const { error: deleteError } = await supabase
          .from("workout_plan_days")
          .delete()
          .eq("workout_plan_id", plan.id);

        if (deleteError) throw deleteError;
      } else {
        // Create new plan
        const { data: newPlan, error: insertError } = await supabase
          .from("workout_plans")
          .insert({
            gym_id: gymId,
            title: formData.title,
            description: formData.description || null,
            goal: formData.goal || null,
            level: formData.level || null,
            is_template: formData.is_template,
            created_by: createdBy,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        planId = newPlan.id;
      }

      // Create days and exercises
      for (const dayNum of Object.keys(days)) {
        const day = days[dayNum];
        if ((day.exercises && day.exercises.length > 0) || day.focus) {
          // Create day
          const { data: dayData, error: dayError } = await supabase
            .from("workout_plan_days")
            .insert({
              workout_plan_id: planId,
              day_of_week: parseInt(dayNum),
              day_name: day.day_name,
              focus: day.focus || null,
            })
            .select()
            .single();

          if (dayError) throw dayError;

          // Create exercises for this day
          if (day.exercises && day.exercises.length > 0) {
            const exercisesToInsert = day.exercises
              .filter(ex => ex.exercise_name && ex.exercise_name.trim())
              .map((ex, index) => ({
                workout_day_id: dayData.id,
                exercise_name: ex.exercise_name,
                sets: ex.sets || null,
                reps: ex.reps || null,
                weight: ex.weight || null,
                rest_seconds: ex.rest_seconds || null,
                notes: ex.notes || null,
                exercise_order: index + 1,
              }));

            if (exercisesToInsert.length > 0) {
              const { error: exercisesError } = await supabase
                .from("workout_exercises")
                .insert(exercisesToInsert);

              if (exercisesError) throw exercisesError;
            }
          }
        }
      }

      showSuccess(plan ? "Workout plan updated successfully!" : "Workout plan created successfully!");
      onSave();
    } catch (error) {
      console.error("Error saving workout plan:", error);
      showError("Failed to save workout plan: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const addExerciseToDay = (dayNum) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        exercises: [...(prev[dayNum].exercises || []), {
          exercise_name: "",
          sets: "",
          reps: "",
          weight: "",
          rest_seconds: "",
          notes: "",
        }],
      },
    }));
  };

  const updateDayFocus = (dayNum, focus) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        focus: focus,
      },
    }));
  };

  const updateExercise = (dayNum, exerciseIndex, field, value) => {
    setDays(prev => {
      const newDays = { ...prev };
      const newExercises = [...newDays[dayNum].exercises];
      newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], [field]: value };
      newDays[dayNum] = { ...newDays[dayNum], exercises: newExercises };
      return newDays;
    });
  };

  const removeExercise = (dayNum, exerciseIndex) => {
    setDays(prev => {
      const newDays = { ...prev };
      const newExercises = [...newDays[dayNum].exercises];
      newExercises.splice(exerciseIndex, 1);
      newDays[dayNum] = { ...newDays[dayNum], exercises: newExercises };
      return newDays;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {plan ? "Edit Workout Plan" : "Create New Workout Plan"}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                {plan ? "Update your workout plan details" : "Add a new workout plan for your gym"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XCircle className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <h4 className="font-semibold text-gray-900">Basic Information</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Title *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Beginner Muscle Gain, Advanced Fat Loss"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Goal
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  >
                    <option value="">Select Goal</option>
                    {GOALS.map(goal => (
                      <option key={goal} value={goal}>{goal}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  >
                    <option value="">Select Level</option>
                    {LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this workout plan"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Template Plan</p>
                  <p className="text-sm text-gray-500">Use as reusable template</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_template: !formData.is_template })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.is_template ? "bg-blue-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.is_template ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Days and Exercises */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Weekly Workout Plan (Mon-Sat)</h4>
              
              {[1, 2, 3, 4, 5, 6].map(dayNum => {
                const day = days[dayNum];
                if (!day) return null;

                return (
                  <div key={dayNum} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h5 className="font-semibold text-gray-900">{day.day_name || DAY_NAMES[dayNum]}</h5>
                        <input
                          type="text"
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="Focus (e.g., Chest & Triceps)"
                          value={day.focus}
                          onChange={(e) => updateDayFocus(dayNum, e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => addExerciseToDay(dayNum)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                      >
                        + Add Exercise
                      </button>
                    </div>

                    {day.exercises && day.exercises.length > 0 && (
                      <div className="space-y-2">
                        {day.exercises.map((exercise, exerciseIndex) => (
                          <div key={exerciseIndex} className="bg-gray-50 rounded-lg p-3">
                            <div className="grid grid-cols-6 gap-2 items-center">
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                  placeholder="Exercise name"
                                  value={exercise.exercise_name}
                                  onChange={(e) => updateExercise(dayNum, exerciseIndex, "exercise_name", e.target.value)}
                                />
                              </div>
                              <div>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                  placeholder="Sets"
                                  value={exercise.sets}
                                  onChange={(e) => updateExercise(dayNum, exerciseIndex, "sets", e.target.value)}
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                  placeholder="Reps"
                                  value={exercise.reps}
                                  onChange={(e) => updateExercise(dayNum, exerciseIndex, "reps", e.target.value)}
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                  placeholder="Weight"
                                  value={exercise.weight}
                                  onChange={(e) => updateExercise(dayNum, exerciseIndex, "weight", e.target.value)}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                  placeholder="Rest(s)"
                                  value={exercise.rest_seconds}
                                  onChange={(e) => updateExercise(dayNum, exerciseIndex, "rest_seconds", e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeExercise(dayNum, exerciseIndex)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <div className="mt-2">
                              <input
                                type="text"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Notes (optional)"
                                value={exercise.notes || ""}
                                onChange={(e) => updateExercise(dayNum, exerciseIndex, "notes", e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(!day.exercises || day.exercises.length === 0) && (
                      <p className="text-gray-400 text-sm text-center py-2">No exercises added</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-100 flex-shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
          >
            {loading ? "Saving..." : (plan ? "Update Plan" : "Create Plan")}
          </button>
        </div>
      </div>
    </div>
  );
}
