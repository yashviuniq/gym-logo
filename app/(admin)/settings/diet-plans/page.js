"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/contexts/ToastContext";
import { PlusCircle, Edit2, Trash2, XCircle } from "lucide-react";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = [
  { value: "early_morning", label: "Early Morning" },
  { value: "breakfast", label: "Breakfast" },
  { value: "mid_morning", label: "Mid Morning" },
  { value: "lunch", label: "Lunch" },
  { value: "pre_workout", label: "Pre Workout" },
  { value: "post_workout", label: "Post Workout" },
  { value: "evening_snack", label: "Evening Snack" },
  { value: "dinner", label: "Dinner" },
  { value: "bedtime", label: "Bedtime" },
];

export default function DietPlansSettingsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [dietPlans, setDietPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [gymId, setGymId] = useState(null);

  useEffect(() => {
    fetchDietPlans();
  }, []);

  const fetchDietPlans = async () => {
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
        .from("diet_plans")
        .select("*")
        .eq("gym_id", gym.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDietPlans(data || []);
    } catch (error) {
      console.error("Error fetching diet plans:", error);
      showError("Failed to load diet plans");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this diet plan? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("diet_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
      showSuccess("Diet plan deleted successfully");
      fetchDietPlans();
    } catch (error) {
      console.error("Error deleting diet plan:", error);
      showError("Failed to delete diet plan");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Diet Plans" />
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Diet Plans" />

      <main className="px-4 py-4">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Diet Plans</h2>
            <p className="text-gray-500 text-sm mt-1">Create and manage diet plans for your members</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg transition flex items-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>New Plan</span>
          </button>
        </div>

        {/* Diet Plans List */}
        {dietPlans.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🥗</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Diet Plans Yet</h3>
            <p className="text-gray-500 mb-6">Create your first diet plan to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg transition"
            >
              Create Diet Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dietPlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{plan.title}</h3>
                      {plan.is_template && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                          Template
                        </span>
                      )}
                    </div>
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

      {/* Add/Edit Diet Plan Modal */}
      {(showAddModal || editingPlan) && (
        <DietPlanModal
          plan={editingPlan}
          gymId={gymId}
          onClose={() => {
            setShowAddModal(false);
            setEditingPlan(null);
          }}
          onSave={() => {
            fetchDietPlans();
            setShowAddModal(false);
            setEditingPlan(null);
          }}
        />
      )}
    </div>
  );
}

// Diet Plan Modal Component
function DietPlanModal({ plan, gymId, onClose, onSave }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    is_template: false,
  });
  const [days, setDays] = useState({});

  useEffect(() => {
    if (plan) {
      setFormData({
        title: plan.title || "",
        description: plan.description || "",
        is_template: plan.is_template || false,
      });
      fetchPlanDetails();
    } else {
      // Initialize with all days
      const initialDays = {};
      for (let i = 1; i <= 7; i++) {
        initialDays[i] = {
          day_of_week: i,
          day_name: DAY_NAMES[i],
          meals: [],
        };
      }
      setDays(initialDays);
    }
  }, [plan]);

  const fetchPlanDetails = async () => {
    if (!plan) return;

    try {
      const { data: planDays, error } = await supabase
        .from("diet_plan_days")
        .select(`
          id,
          day_of_week,
          day_name,
          diet_meals (
            id,
            meal_type,
            meal_time,
            instructions,
            diet_meal_items (
              id,
              food_name,
              quantity,
              calories,
              notes
            )
          )
        `)
        .eq("diet_plan_id", plan.id)
        .order("day_of_week", { ascending: true });

      if (error) throw error;

      const organizedDays = {};
      if (planDays) {
        planDays.forEach(day => {
          organizedDays[day.day_of_week] = {
            id: day.id,
            day_of_week: day.day_of_week,
            day_name: day.day_name || DAY_NAMES[day.day_of_week],
            meals: day.diet_meals || [],
          };
        });
      }

      // Fill in missing days
      for (let i = 1; i <= 7; i++) {
        if (!organizedDays[i]) {
          organizedDays[i] = {
            day_of_week: i,
            day_name: DAY_NAMES[i],
            meals: [],
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
      showError("Please enter a title for the diet plan");
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
          .from("diet_plans")
          .update({
            title: formData.title,
            description: formData.description || null,
            is_template: formData.is_template,
            updated_at: new Date().toISOString(),
          })
          .eq("id", plan.id);

        if (updateError) throw updateError;
        planId = plan.id;

        // Delete existing days and recreate
        const { error: deleteError } = await supabase
          .from("diet_plan_days")
          .delete()
          .eq("diet_plan_id", plan.id);

        if (deleteError) throw deleteError;
      } else {
        // Create new plan
        const { data: newPlan, error: insertError } = await supabase
          .from("diet_plans")
          .insert({
            gym_id: gymId,
            title: formData.title,
            description: formData.description || null,
            is_template: formData.is_template,
            created_by: createdBy,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        planId = newPlan.id;
      }

      // Create days and meals
      for (const dayNum of Object.keys(days)) {
        const day = days[dayNum];
        if (day.meals && day.meals.length > 0) {
          // Create day
          const { data: dayData, error: dayError } = await supabase
            .from("diet_plan_days")
            .insert({
              diet_plan_id: planId,
              day_of_week: parseInt(dayNum),
              day_name: day.day_name,
            })
            .select()
            .single();

          if (dayError) throw dayError;

          // Create meals for this day
          for (const meal of day.meals) {
            if (!meal.meal_type) continue;

            const { data: mealData, error: mealError } = await supabase
              .from("diet_meals")
              .insert({
                diet_plan_day_id: dayData.id,
                meal_type: meal.meal_type,
                meal_time: meal.meal_time || null,
                instructions: meal.instructions || null,
              })
              .select()
              .single();

            if (mealError) throw mealError;

            // Create meal items
            if (meal.items && meal.items.length > 0) {
              const itemsToInsert = meal.items
                .filter(item => item.food_name && item.food_name.trim())
                .map(item => ({
                  diet_meal_id: mealData.id,
                  food_name: item.food_name,
                  quantity: item.quantity || null,
                  calories: item.calories || null,
                  notes: item.notes || null,
                }));

              if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabase
                  .from("diet_meal_items")
                  .insert(itemsToInsert);

                if (itemsError) throw itemsError;
              }
            }
          }
        }
      }

      showSuccess(plan ? "Diet plan updated successfully!" : "Diet plan created successfully!");
      onSave();
    } catch (error) {
      console.error("Error saving diet plan:", error);
      showError("Failed to save diet plan: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const addMealToDay = (dayNum) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        meals: [...(prev[dayNum].meals || []), {
          meal_type: "",
          meal_time: "",
          instructions: "",
          items: [],
        }],
      },
    }));
  };

  const updateMeal = (dayNum, mealIndex, field, value) => {
    setDays(prev => {
      const newDays = { ...prev };
      const newMeals = [...newDays[dayNum].meals];
      newMeals[mealIndex] = { ...newMeals[mealIndex], [field]: value };
      newDays[dayNum] = { ...newDays[dayNum], meals: newMeals };
      return newDays;
    });
  };

  const removeMeal = (dayNum, mealIndex) => {
    setDays(prev => {
      const newDays = { ...prev };
      newDays[dayNum].meals.splice(mealIndex, 1);
      return newDays;
    });
  };

  const addItemToMeal = (dayNum, mealIndex) => {
    setDays(prev => {
      const newDays = { ...prev };
      const newMeals = [...newDays[dayNum].meals];
      if (!newMeals[mealIndex].items) {
        newMeals[mealIndex].items = [];
      }
      newMeals[mealIndex].items.push({
        food_name: "",
        quantity: "",
        calories: "",
        notes: "",
      });
      newDays[dayNum] = { ...newDays[dayNum], meals: newMeals };
      return newDays;
    });
  };

  const updateMealItem = (dayNum, mealIndex, itemIndex, field, value) => {
    setDays(prev => {
      const newDays = { ...prev };
      const newMeals = [...newDays[dayNum].meals];
      const newItems = [...newMeals[mealIndex].items];
      newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
      newMeals[mealIndex] = { ...newMeals[mealIndex], items: newItems };
      newDays[dayNum] = { ...newDays[dayNum], meals: newMeals };
      return newDays;
    });
  };

  const removeMealItem = (dayNum, mealIndex, itemIndex) => {
    setDays(prev => {
      const newDays = { ...prev };
      const newMeals = [...newDays[dayNum].meals];
      newMeals[mealIndex].items.splice(itemIndex, 1);
      newDays[dayNum] = { ...newDays[dayNum], meals: newMeals };
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
                {plan ? "Edit Diet Plan" : "Create New Diet Plan"}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                {plan ? "Update your diet plan details" : "Add a new diet plan for your gym"}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Weight Loss Plan, Muscle Gain Plan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this diet plan"
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
                    formData.is_template ? "bg-green-500" : "bg-gray-300"
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

            {/* Days and Meals */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Weekly Meal Plan</h4>
              
              {[1, 2, 3, 4, 5, 6, 7].map(dayNum => {
                const day = days[dayNum];
                if (!day) return null;

                return (
                  <div key={dayNum} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-gray-900">{day.day_name || DAY_NAMES[dayNum]}</h5>
                      <button
                        type="button"
                        onClick={() => addMealToDay(dayNum)}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                      >
                        + Add Meal
                      </button>
                    </div>

                    {day.meals && day.meals.length > 0 && (
                      <div className="space-y-3">
                        {day.meals.map((meal, mealIndex) => (
                          <div key={mealIndex} className="bg-gray-50 rounded-lg p-3">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Meal Type *
                                </label>
                                <select
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                  value={meal.meal_type}
                                  onChange={(e) => updateMeal(dayNum, mealIndex, "meal_type", e.target.value)}
                                  required
                                >
                                  <option value="">Select meal type</option>
                                  {MEAL_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Time
                                </label>
                                <input
                                  type="time"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                  value={meal.meal_time || ""}
                                  onChange={(e) => updateMeal(dayNum, mealIndex, "meal_time", e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Instructions
                              </label>
                              <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                                rows={2}
                                value={meal.instructions || ""}
                                onChange={(e) => updateMeal(dayNum, mealIndex, "instructions", e.target.value)}
                                placeholder="Cooking instructions or notes"
                              />
                            </div>

                            <div className="mb-2">
                              <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-gray-700">Food Items</label>
                                <button
                                  type="button"
                                  onClick={() => addItemToMeal(dayNum, mealIndex)}
                                  className="text-xs text-green-600 hover:text-green-700"
                                >
                                  + Add Item
                                </button>
                              </div>
                              {meal.items && meal.items.length > 0 && (
                                <div className="space-y-2">
                                  {meal.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="bg-white rounded-lg p-2 border border-gray-200">
                                      <div className="grid grid-cols-2 gap-2 mb-2">
                                        <input
                                          type="text"
                                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none"
                                          placeholder="Food name *"
                                          value={item.food_name || ""}
                                          onChange={(e) => updateMealItem(dayNum, mealIndex, itemIndex, "food_name", e.target.value)}
                                          required
                                        />
                                        <input
                                          type="text"
                                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none"
                                          placeholder="Quantity"
                                          value={item.quantity || ""}
                                          onChange={(e) => updateMealItem(dayNum, mealIndex, itemIndex, "quantity", e.target.value)}
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <input
                                          type="number"
                                          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none"
                                          placeholder="Calories"
                                          value={item.calories || ""}
                                          onChange={(e) => updateMealItem(dayNum, mealIndex, itemIndex, "calories", e.target.value)}
                                        />
                                        <div className="flex gap-1">
                                          <input
                                            type="text"
                                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 outline-none"
                                            placeholder="Notes"
                                            value={item.notes || ""}
                                            onChange={(e) => updateMealItem(dayNum, mealIndex, itemIndex, "notes", e.target.value)}
                                          />
                                          <button
                                            type="button"
                                            onClick={() => removeMealItem(dayNum, mealIndex, itemIndex)}
                                            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeMeal(dayNum, mealIndex)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Remove Meal
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex gap-3 pt-6 border-t border-gray-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition"
            >
              {loading ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

