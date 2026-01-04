"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/shared/Card";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { 
  Plus, 
  Utensils, 
  Search, 
  Clock, 
  Users,
  ChevronRight,
  Apple,
  ChefHat,
  Edit2,
  Trash2,
  Eye,
  X,
  Flame,
  ArrowLeft
} from "lucide-react";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = [
  { value: "early_morning", label: "Early Morning", icon: <Clock className="w-4 h-4" /> },
  { value: "breakfast", label: "Breakfast", icon: <ChefHat className="w-4 h-4" /> },
  { value: "mid_morning", label: "Mid Morning", icon: <Clock className="w-4 h-4" /> },
  { value: "lunch", label: "Lunch", icon: <ChefHat className="w-4 h-4" /> },
  { value: "pre_workout", label: "Pre Workout", icon: <Flame className="w-4 h-4" /> },
  { value: "post_workout", label: "Post Workout", icon: <Flame className="w-4 h-4" /> },
  { value: "evening_snack", label: "Evening Snack", icon: <Apple className="w-4 h-4" /> },
  { value: "dinner", label: "Dinner", icon: <ChefHat className="w-4 h-4" /> },
  { value: "bedtime", label: "Bedtime", icon: <Clock className="w-4 h-4" /> },
];

export default function TrainerDietPlansPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DietPlansContent />
    </Suspense>
  );
}

function DietPlansContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [dietPlans, setDietPlans] = useState([]);
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
    
    if (viewPlanId && dietPlans.length > 0) {
      const plan = dietPlans.find(p => p.id === viewPlanId);
      if (plan) setViewingPlan(plan);
      else fetchAndViewPlan(viewPlanId);
    }
    
    if (editPlanId && dietPlans.length > 0) {
      const plan = dietPlans.find(p => p.id === editPlanId);
      if (plan) setEditingPlan(plan);
      else fetchAndEditPlan(editPlanId);
    }
  }, [searchParams, dietPlans]);

  const fetchAndViewPlan = async (planId) => {
    try {
      const { data, error } = await supabase
        .from("diet_plans")
        .select(`
          *,
          diet_plan_days(
            id,
            day_of_week,
            day_name,
            diet_meals(
              id,
              meal_type,
              meal_time,
              instructions,
              diet_meal_items(id, food_name, quantity, calories, notes)
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
        .from("diet_plans")
        .select(`
          *,
          diet_plan_days(
            id,
            day_of_week,
            day_name,
            diet_meals(
              id,
              meal_type,
              meal_time,
              instructions,
              diet_meal_items(id, food_name, quantity, calories, notes)
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

      // Fetch diet plans created by this trainer
      const { data: plans, error } = await supabase
        .from("diet_plans")
        .select(`
          *,
          diet_plan_days(
            id,
            day_of_week,
            day_name,
            diet_meals(
              id,
              meal_type,
              meal_time,
              instructions,
              diet_meal_items(id, food_name, quantity, calories, notes)
            )
          ),
          member_diets(count)
        `)
        .eq("gym_id", trainerData.gym_id)
        .eq("created_by", user.id)
        .is("member_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDietPlans(plans || []);
    } catch (error) {
      console.error("Error fetching diet plans:", error);
      showError("Failed to load diet plans");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this diet plan?")) return;

    try {
      const { error } = await supabase
        .from("diet_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;
      
      showSuccess("Diet plan deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting diet plan:", error);
      showError("Failed to delete diet plan");
    }
  };

  const filteredPlans = dietPlans.filter(plan =>
    plan.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMealCount = (plan) => {
    let count = 0;
    plan.diet_plan_days?.forEach(day => {
      count += day.diet_meals?.length || 0;
    });
    return count;
  };

  const getDayCount = (plan) => {
    return plan.diet_plan_days?.length || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Loading diet plans...</p>
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
            <h1 className="text-2xl font-bold text-white">Diet Plans</h1>
            <p className="text-blue-100 text-sm">Create and manage diet plans</p>
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
            placeholder="Search diet plans..."
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
              <p className="text-2xl font-bold text-blue-600">{dietPlans.length}</p>
              <p className="text-xs text-gray-500">My Plans</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {dietPlans.reduce((acc, plan) => acc + (plan.member_diets?.[0]?.count || 0), 0)}
              </p>
              <p className="text-xs text-gray-500">Assigned</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Diet Plans List */}
      <div className="px-4 space-y-3">
        {filteredPlans.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title="No diet plans found"
            description={searchQuery ? "Try a different search term" : "Create your first diet plan"}
            action={
              <button 
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Diet Plan
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Utensils className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{plan.title}</h3>
                      <p className="text-xs text-gray-500 line-clamp-1">{plan.description || "No description"}</p>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{getDayCount(plan)} days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Apple className="w-3.5 h-3.5" />
                      <span>{getMealCount(plan)} meals</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{plan.member_diets?.[0]?.count || 0} assigned</span>
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
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add/Edit Modal */}
      {(showAddModal || editingPlan) && (
        <DietPlanModal
          plan={editingPlan}
          gymId={gymId}
          trainerId={trainerInfo?.id}
          onClose={() => {
            setShowAddModal(false);
            setEditingPlan(null);
            router.replace("/trainer/diet-plans");
          }}
          onSaved={() => {
            setShowAddModal(false);
            setEditingPlan(null);
            router.replace("/trainer/diet-plans");
            fetchData();
          }}
        />
      )}

      {/* View Modal */}
      {viewingPlan && (
        <ViewDietPlanModal
          plan={viewingPlan}
          onClose={() => {
            setViewingPlan(null);
            router.replace("/trainer/diet-plans");
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

// View Diet Plan Modal
function ViewDietPlanModal({ plan, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{plan.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {plan.description && (
            <p className="text-sm text-gray-600">{plan.description}</p>
          )}
          
          {plan.diet_plan_days?.length > 0 ? (
            plan.diet_plan_days
              .sort((a, b) => a.day_of_week - b.day_of_week)
              .map((day) => (
                <div key={day.id} className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{day.day_name}</h3>
                  {day.diet_meals?.length > 0 ? (
                    <div className="space-y-3">
                      {day.diet_meals.map((meal) => (
                        <div key={meal.id} className="bg-white rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {meal.meal_type?.replace(/_/g, " ")}
                          </p>
                          {meal.meal_time && (
                            <p className="text-xs text-gray-500">{meal.meal_time}</p>
                          )}
                          {meal.diet_meal_items?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {meal.diet_meal_items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700">{item.food_name}</span>
                                  <span className="text-gray-500">
                                    {item.quantity && `${item.quantity}`}
                                    {item.calories && ` • ${item.calories} kcal`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {meal.instructions && (
                            <p className="mt-2 text-xs text-gray-500 italic">{meal.instructions}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No meals added</p>
                  )}
                </div>
              ))
          ) : (
            <p className="text-center text-gray-500 py-8">No meal plan details added yet</p>
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

// Diet Plan Modal (Add/Edit)
function DietPlanModal({ plan, gymId, trainerId, onClose, onSaved }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: plan?.title || "",
    description: plan?.description || "",
  });
  const [days, setDays] = useState({});
  const [activeDay, setActiveDay] = useState(1);

  // Initialize days
  useEffect(() => {
    if (plan?.diet_plan_days?.length > 0) {
      const existingDays = {};
      plan.diet_plan_days.forEach(day => {
        existingDays[day.day_of_week] = {
          id: day.id,
          day_of_week: day.day_of_week,
          day_name: day.day_name,
          meals: day.diet_meals?.map(meal => ({
            id: meal.id,
            meal_type: meal.meal_type,
            meal_time: meal.meal_time || "",
            instructions: meal.instructions || "",
            items: meal.diet_meal_items?.map(item => ({
              id: item.id,
              food_name: item.food_name,
              quantity: item.quantity || "",
              calories: item.calories || "",
              notes: item.notes || "",
            })) || [],
          })) || [],
        };
      });
      // Fill in missing days
      for (let i = 1; i <= 7; i++) {
        if (!existingDays[i]) {
          existingDays[i] = {
            day_of_week: i,
            day_name: DAY_NAMES[i],
            meals: [],
          };
        }
      }
      setDays(existingDays);
    } else {
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

  const addMealToDay = (dayNum) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        meals: [...(prev[dayNum].meals || []), {
          meal_type: "",
          meal_time: "",
          instructions: "",
          items: [{ food_name: "", quantity: "", calories: "", notes: "" }],
        }],
      },
    }));
  };

  const removeMealFromDay = (dayNum, mealIndex) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        meals: prev[dayNum].meals.filter((_, i) => i !== mealIndex),
      },
    }));
  };

  const updateMeal = (dayNum, mealIndex, field, value) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        meals: prev[dayNum].meals.map((meal, i) =>
          i === mealIndex ? { ...meal, [field]: value } : meal
        ),
      },
    }));
  };

  const addItemToMeal = (dayNum, mealIndex) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        meals: prev[dayNum].meals.map((meal, i) =>
          i === mealIndex
            ? { ...meal, items: [...meal.items, { food_name: "", quantity: "", calories: "", notes: "" }] }
            : meal
        ),
      },
    }));
  };

  const updateMealItem = (dayNum, mealIndex, itemIndex, field, value) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        meals: prev[dayNum].meals.map((meal, i) =>
          i === mealIndex
            ? {
                ...meal,
                items: meal.items.map((item, j) =>
                  j === itemIndex ? { ...item, [field]: value } : item
                ),
              }
            : meal
        ),
      },
    }));
  };

  const removeItemFromMeal = (dayNum, mealIndex, itemIndex) => {
    setDays(prev => ({
      ...prev,
      [dayNum]: {
        ...prev[dayNum],
        meals: prev[dayNum].meals.map((meal, i) =>
          i === mealIndex
            ? { ...meal, items: meal.items.filter((_, j) => j !== itemIndex) }
            : meal
        ),
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
          .from("diet_plans")
          .update({
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", plan.id);

        if (updateError) throw updateError;

        // Delete existing days and meals
        await supabase.from("diet_plan_days").delete().eq("diet_plan_id", plan.id);
      } else {
        // Create new plan
        const { data: newPlan, error: insertError } = await supabase
          .from("diet_plans")
          .insert({
            gym_id: gymId,
            title: formData.title.trim(),
            description: formData.description.trim() || null,
            created_by: trainerId,
            is_template: false,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        planId = newPlan.id;
      }

      // Insert days and meals
      for (const dayNum of Object.keys(days)) {
        const day = days[dayNum];
        if (day.meals && day.meals.length > 0) {
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

            const itemsToInsert = meal.items
              ?.filter(item => item.food_name && item.food_name.trim())
              .map(item => ({
                diet_meal_id: mealData.id,
                food_name: item.food_name.trim(),
                quantity: item.quantity || null,
                calories: item.calories ? parseInt(item.calories) : null,
                notes: item.notes || null,
              }));

            if (itemsToInsert?.length > 0) {
              const { error: itemsError } = await supabase
                .from("diet_meal_items")
                .insert(itemsToInsert);

              if (itemsError) throw itemsError;
            }
          }
        }
      }

      showSuccess(plan ? "Diet plan updated successfully!" : "Diet plan created successfully!");
      onSaved();
    } catch (error) {
      console.error("Error saving diet plan:", error);
      showError(error.message || "Failed to save diet plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 mb-20 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-900">
            {plan ? "Edit Diet Plan" : "Create Diet Plan"}
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
                placeholder="e.g., Weight Loss Diet Plan"
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
                placeholder="Brief description of the diet plan..."
              />
            </div>
          </div>

          {/* Day Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => (
              <button
                key={dayNum}
                type="button"
                onClick={() => setActiveDay(dayNum)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeDay === dayNum
                    ? "bg-blue-600 text-white"
                    : days[dayNum]?.meals?.length > 0
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {DAY_NAMES[dayNum].slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Active Day Meals */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{DAY_NAMES[activeDay]}</h3>
              <button
                type="button"
                onClick={() => addMealToDay(activeDay)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Meal
              </button>
            </div>

            {days[activeDay]?.meals?.length > 0 ? (
              <div className="space-y-4">
                {days[activeDay].meals.map((meal, mealIndex) => (
                  <div key={mealIndex} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <select
                        value={meal.meal_type}
                        onChange={(e) => updateMeal(activeDay, mealIndex, "meal_type", e.target.value)}
                        className="text-sm font-medium bg-transparent border-0 focus:ring-0 p-0"
                      >
                        <option value="">Select Meal Type</option>
                        {MEAL_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeMealFromDay(activeDay, mealIndex)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="time"
                      value={meal.meal_time}
                      onChange={(e) => updateMeal(activeDay, mealIndex, "meal_time", e.target.value)}
                      className="w-full text-xs px-2 py-1 border border-gray-200 rounded mb-2"
                      placeholder="Time"
                    />

                    {/* Food Items */}
                    <div className="space-y-2">
                      {meal.items?.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={item.food_name}
                            onChange={(e) => updateMealItem(activeDay, mealIndex, itemIndex, "food_name", e.target.value)}
                            className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded"
                            placeholder="Food item"
                          />
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => updateMealItem(activeDay, mealIndex, itemIndex, "quantity", e.target.value)}
                            className="w-20 text-xs px-2 py-1 border border-gray-200 rounded"
                            placeholder="Qty"
                          />
                          <input
                            type="number"
                            value={item.calories}
                            onChange={(e) => updateMealItem(activeDay, mealIndex, itemIndex, "calories", e.target.value)}
                            className="w-16 text-xs px-2 py-1 border border-gray-200 rounded"
                            placeholder="Cal"
                          />
                          <button
                            type="button"
                            onClick={() => removeItemFromMeal(activeDay, mealIndex, itemIndex)}
                            className="text-red-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addItemToMeal(activeDay, mealIndex)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        + Add food item
                      </button>
                    </div>

                    <textarea
                      value={meal.instructions}
                      onChange={(e) => updateMeal(activeDay, mealIndex, "instructions", e.target.value)}
                      className="w-full mt-2 text-xs px-2 py-1 border border-gray-200 rounded"
                      placeholder="Instructions (optional)"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 text-sm py-4">
                No meals added for this day
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              plan ? "Update Diet Plan" : "Create Diet Plan"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
