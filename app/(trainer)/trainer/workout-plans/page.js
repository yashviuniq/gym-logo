"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/shared/Card";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { 
  Plus, 
  Dumbbell, 
  Search, 
  Clock, 
  Users,
  Target,
  TrendingUp,
  Edit2,
  Trash2,
  Eye,
  X
} from "lucide-react";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const GOALS = ["Fat Loss", "Muscle Gain", "Strength", "Endurance", "Flexibility", "General Fitness"];
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

export default function TrainerWorkoutPlansPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <WorkoutPlansContent />
    </Suspense>
  );
}

function WorkoutPlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [trainerInfo, setTrainerInfo] = useState(null);
  const [gymId, setGymId] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Handle URL parameters for view/edit
  useEffect(() => {
    const viewPlanId = searchParams.get("view");
    const editPlanId = searchParams.get("edit");
    
    if (viewPlanId && workoutPlans.length > 0) {
      const plan = workoutPlans.find(p => p.id === viewPlanId);
      if (plan) setViewingPlan(plan);
      else fetchAndViewPlan(viewPlanId);
    }
    
    if (editPlanId && workoutPlans.length > 0) {
      const plan = workoutPlans.find(p => p.id === editPlanId);
      if (plan) setEditingPlan(plan);
      else fetchAndEditPlan(editPlanId);
    }
  }, [searchParams, workoutPlans]);

  const fetchAndViewPlan = async (planId) => {
    try {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_plan_days(
            id,
            day_of_week,
            day_name,
            focus,
            workout_exercises(
              id,
              exercise_name,
              sets,
              reps,
              weight,
              rest_seconds,
              notes,
              exercise_order
            )
          )
        `)
        .eq("id", planId)
        .single();

      if (error) throw error;
      if (data) setViewingPlan(data);
    } catch (error) {
      console.error("Error fetching plan:", error);
    }
  };

  const fetchAndEditPlan = async (planId) => {
    try {
      const { data, error } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_plan_days(
            id,
            day_of_week,
            day_name,
            focus,
            workout_exercises(
              id,
              exercise_name,
              sets,
              reps,
              weight,
              rest_seconds,
              notes,
              exercise_order
            )
          )
        `)
        .eq("id", planId)
        .single();

      if (error) throw error;
      if (data) setEditingPlan(data);
    } catch (error) {
      console.error("Error fetching plan:", error);
    }
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get trainer info from gym_trainers table
      const { data: trainerData } = await supabase
        .from("gym_trainers")
        .select("id, gym_id, profile_id")
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .single();

      if (!trainerData) {
        showError("Trainer info not found");
        setLoading(false);
        return;
      }

      setTrainerInfo({ ...trainerData, id: user.id });
      setGymId(trainerData.gym_id);

      // Fetch workout plans created by this trainer
      const { data: plans, error } = await supabase
        .from("workout_plans")
        .select(`
          *,
          workout_plan_days(
            id,
            day_of_week,
            day_name,
            focus,
            workout_exercises(
              id,
              exercise_name,
              sets,
              reps,
              weight,
              rest_seconds,
              notes,
              exercise_order
            )
          ),
          member_workouts(count)
        `)
        .eq("gym_id", trainerData.gym_id)
        .eq("created_by", user.id)
        .is("member_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWorkoutPlans(plans || []);
    } catch (error) {
      console.error("Error fetching workout plans:", error);
      showError("Failed to load workout plans");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this workout plan?")) return;

    try {
      const { error } = await supabase
        .from("workout_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;
      
      showSuccess("Workout plan deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting workout plan:", error);
      showError("Failed to delete workout plan");
    }
  };

  const filteredPlans = workoutPlans.filter(plan =>
    plan.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.goal?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getExerciseCount = (plan) => {
    let count = 0;
    plan.workout_plan_days?.forEach(day => {
      count += day.workout_exercises?.length || 0;
    });
    return count;
  };

  const getDayCount = (plan) => {
    return plan.workout_plan_days?.length || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Loading workout plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 pt-4 pb-6 px-4 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Workout Plans</h1>
            <p className="text-blue-100 text-sm">Create and manage workout plans</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors border-0"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search workout plans..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder:text-white/60 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 -mt-3 mb-4">
        <Card className="p-4 bg-white shadow-lg border-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{workoutPlans.length}</p>
              <p className="text-xs text-gray-500">My Plans</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {workoutPlans.reduce((acc, plan) => acc + (plan.member_workouts?.[0]?.count || 0), 0)}
              </p>
              <p className="text-xs text-gray-500">Assigned</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Workout Plans List */}
      <div className="px-4 space-y-3">
        {filteredPlans.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="No workout plans found"
            description={searchQuery ? "Try a different search term" : "Create your first workout plan"}
            action={
              <button 
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Workout Plan
              </button>
            }
          />
        ) : (
          filteredPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className="p-4 hover:shadow-lg transition-all border-0 shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{plan.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">{plan.description || "No description"}</p>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap gap-2">
                    {plan.goal && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {plan.goal}
                      </span>
                    )}
                    {plan.level && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                        {plan.level}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{getDayCount(plan)} days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Dumbbell className="w-3.5 h-3.5" />
                      <span>{getExerciseCount(plan)} exercises</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{plan.member_workouts?.[0]?.count || 0} assigned</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setViewingPlan(plan)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => handleDeletePlan(plan.id, e)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add/Edit Modal */}
      {(showAddModal || editingPlan) && (
        <WorkoutPlanModal
          plan={editingPlan}
          gymId={gymId}
          trainerId={trainerInfo?.id}
          onClose={() => {
            setShowAddModal(false);
            setEditingPlan(null);
            router.replace("/trainer/workout-plans");
          }}
          onSaved={() => {
            setShowAddModal(false);
            setEditingPlan(null);
            router.replace("/trainer/workout-plans");
            fetchData();
          }}
        />
      )}

      {/* View Modal */}
      {viewingPlan && (
        <ViewWorkoutPlanModal
          plan={viewingPlan}
          onClose={() => {
            setViewingPlan(null);
            router.replace("/trainer/workout-plans");
          }}
          onEdit={() => {
            setViewingPlan(null);
            setEditingPlan(viewingPlan);
          }}
        />
      )}
    </div>
  );
}

// View Workout Plan Modal
function ViewWorkoutPlanModal({ plan, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{plan.title}</h2>
            <div className="flex gap-2 mt-1">
              {plan.goal && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {plan.goal}
                </span>
              )}
              {plan.level && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                  {plan.level}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {plan.description && (
            <p className="text-sm text-gray-600">{plan.description}</p>
          )}
          
          {plan.workout_plan_days?.length > 0 ? (
            plan.workout_plan_days
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map((day) => (
                <div key={day.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{day.day_name}</h3>
                    {day.focus && (
                      <span className="text-xs text-gray-500">{day.focus}</span>
                    )}
                  </div>
                  {day.workout_exercises?.length > 0 ? (
                    <div className="space-y-2">
                      {day.workout_exercises
                        .sort((a, b) => a.exercise_order - b.exercise_order)
                        .map((exercise) => (
                          <div key={exercise.id} className="bg-white rounded-lg p-3">
                            <p className="text-sm font-medium text-gray-900">
                              {exercise.exercise_name}
                            </p>
                            <div className="flex gap-3 mt-1 text-xs text-gray-500">
                              {exercise.sets && <span>{exercise.sets} sets</span>}
                              {exercise.reps && <span>{exercise.reps} reps</span>}
                              {exercise.weight && <span>{exercise.weight}</span>}
                              {exercise.rest_seconds && <span>{exercise.rest_seconds}s rest</span>}
                            </div>
                            {exercise.notes && (
                              <p className="mt-1 text-xs text-gray-400 italic">{exercise.notes}</p>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No exercises added</p>
                  )}
                </div>
              ))
          ) : (
            <p className="text-center text-gray-500 py-8">No workout details added yet</p>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Edit Plan
          </button>
        </div>
      </div>
    </div>
  );
}

// Workout Plan Modal (Add/Edit)
function WorkoutPlanModal({ plan, gymId, trainerId, onClose, onSaved }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: plan?.title || "",
    description: plan?.description || "",
    goal: plan?.goal || "",
    level: plan?.level || "",
  });
  const [days, setDays] = useState({});
  const [activeDay, setActiveDay] = useState(1);

  // Initialize days
  useEffect(() => {
    if (plan?.workout_plan_days?.length > 0) {
      const existingDays = {};
      plan.workout_plan_days.forEach(day => {
        existingDays[day.day_of_week] = {
          id: day.id,
          day_of_week: day.day_of_week,
          day_name: day.day_name,
          focus: day.focus || "",
          exercises: day.workout_exercises?.map(ex => ({
            id: ex.id,
            exercise_name: ex.exercise_name,
            sets: ex.sets || "",
            reps: ex.reps || "",
            weight: ex.weight || "",
            rest_seconds: ex.rest_seconds || "",
            notes: ex.notes || "",
          })) || [],
        };
      });
      // Fill in missing days
      for (let i = 1; i <= 6; i++) {
        if (!existingDays[i]) {
          existingDays[i] = {
            day_of_week: i,
            day_name: DAY_NAMES[i],
            focus: "",
            exercises: [],
          };
        }
      }
      setDays(existingDays);
    } else {
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

  const removeExerciseFromDay = (dayNum, exerciseIndex) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        exercises: prev[dayNum].exercises.filter((_, i) => i !== exerciseIndex),
      },
    }));
  };

  const updateExercise = (dayNum, exerciseIndex, field, value) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        exercises: prev[dayNum].exercises.map((ex, i) =>
          i === exerciseIndex ? { ...ex, [field]: value } : ex
        ),
      },
    }));
  };

  const updateDayFocus = (dayNum, focus) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        focus,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      showError("Please enter a plan title");
      return;
    }

    setLoading(true);
    try {
      let planId = plan?.id;

      if (plan) {
        // Update existing plan
        const { error: updateError } = await supabase
          .from("workout_plans")
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            goal: formData.goal || null,
            level: formData.level || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", plan.id);

        if (updateError) throw updateError;

        // Delete existing days and exercises
        await supabase.from("workout_plan_days").delete().eq("workout_plan_id", plan.id);
      } else {
        // Create new plan
        const { data: newPlan, error: insertError } = await supabase
          .from("workout_plans")
          .insert({
            gym_id: gymId,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            goal: formData.goal || null,
            level: formData.level || null,
            created_by: trainerId,
            is_template: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        planId = newPlan.id;
      }

      // Insert days and exercises
      for (const dayNum of Object.keys(days)) {
        const day = days[dayNum];
        if ((day.exercises && day.exercises.length > 0) || day.focus) {
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

          if (day.exercises && day.exercises.length > 0) {
            const exercisesToInsert = day.exercises
              .filter(ex => ex.exercise_name && ex.exercise_name.trim())
              .map((ex, index) => ({
                workout_day_id: dayData.id,
                exercise_name: ex.exercise_name.trim(),
                sets: ex.sets ? parseInt(ex.sets) : null,
                reps: ex.reps || null,
                weight: ex.weight || null,
                rest_seconds: ex.rest_seconds ? parseInt(ex.rest_seconds) : null,
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
      onSaved();
    } catch (error) {
      console.error("Error saving workout plan:", error);
      showError(error.message || "Failed to save workout plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 mb-20 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {plan ? "Edit Workout Plan" : "Create Workout Plan"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Upper Body Strength"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="Brief description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
                <select
                  value={formData.goal}
                  onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Goal</option>
                  {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Day Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5, 6].map((dayNum) => (
              <button
                key={dayNum}
                type="button"
                onClick={() => setActiveDay(dayNum)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeDay === dayNum
                    ? "bg-orange-600 text-white"
                    : days[dayNum]?.exercises?.length > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {DAY_NAMES[dayNum].slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Active Day Exercises */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{DAY_NAMES[activeDay]}</h3>
              <button
                type="button"
                onClick={() => addExerciseToDay(activeDay)}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Exercise
              </button>
            </div>

            <input
              type="text"
              value={days[activeDay]?.focus || ""}
              onChange={(e) => updateDayFocus(activeDay, e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg mb-3"
              placeholder="Day focus (e.g., Chest & Triceps)"
            />

            {days[activeDay]?.exercises?.length > 0 ? (
              <div className="space-y-3">
                {days[activeDay].exercises.map((exercise, exerciseIndex) => (
                  <div key={exerciseIndex} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        value={exercise.exercise_name}
                        onChange={(e) => updateExercise(activeDay, exerciseIndex, "exercise_name", e.target.value)}
                        className="flex-1 text-sm font-medium bg-transparent border-0 focus:ring-0 p-0"
                        placeholder="Exercise name"
                      />
                      <button
                        type="button"
                        onClick={() => removeExerciseFromDay(activeDay, exerciseIndex)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(activeDay, exerciseIndex, "sets", e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded"
                        placeholder="Sets"
                      />
                      <input
                        type="text"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(activeDay, exerciseIndex, "reps", e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded"
                        placeholder="Reps"
                      />
                      <input
                        type="text"
                        value={exercise.weight}
                        onChange={(e) => updateExercise(activeDay, exerciseIndex, "weight", e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded"
                        placeholder="Weight"
                      />
                      <input
                        type="number"
                        value={exercise.rest_seconds}
                        onChange={(e) => updateExercise(activeDay, exerciseIndex, "rest_seconds", e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded"
                        placeholder="Rest(s)"
                      />
                    </div>

                    <input
                      type="text"
                      value={exercise.notes}
                      onChange={(e) => updateExercise(activeDay, exerciseIndex, "notes", e.target.value)}
                      className="w-full mt-2 text-xs px-2 py-1 border border-gray-200 rounded"
                      placeholder="Notes (optional)"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 text-sm py-4">
                No exercises added for this day
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              plan ? "Update Workout Plan" : "Create Workout Plan"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
