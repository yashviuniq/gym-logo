"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/contexts/ToastContext";
import { 
  PlusCircle, 
  Edit2, 
  Trash2, 
  XCircle,
  Plus,
  Filter,
  Calendar,
  ChevronRight,
  Apple,
  ChefHat,
  Tag,
  Clock,
  User,
  Users,
  Flame,
  X,
  AlertCircle,
  CheckCircle,
  Search,
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

// Wrapper component to handle Suspense for useSearchParams
export default function DietPlansSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        <p className="mt-6 text-gray-600 font-medium text-sm">Loading...</p>
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
  const [dietPlans, setDietPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [gymId, setGymId] = useState(null);
  const [selectedGym, setSelectedGym] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      setGymId(gym.id);
      fetchDietPlans(gym.id);
    } else {
      setLoading(false);
    }
  }, []);

  // Handle edit URL parameter
  useEffect(() => {
    const editPlanId = searchParams.get("edit");
    if (editPlanId && dietPlans.length > 0 && !editingPlan) {
      // First check if plan exists in the list (general plans)
      let planToEdit = dietPlans.find(p => p.id === editPlanId);
      
      if (planToEdit) {
        setEditingPlan(planToEdit);
      } else {
        // Plan not found in general list, try to fetch it directly (might be member-specific)
        fetchAndEditPlan(editPlanId);
      }
    }
  }, [searchParams, dietPlans]);

  const fetchAndEditPlan = async (planId) => {
    try {
      const { data, error } = await supabase
        .from("diet_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (error) throw error;
      if (data) {
        setEditingPlan(data);
      } else {
        showError("Diet plan not found");
      }
    } catch (error) {
      console.error("Error fetching diet plan:", error);
      showError("Failed to load diet plan for editing");
    }
  };

  const fetchDietPlans = async (gymId) => {
    try {
      setLoading(true);

      // Fetch general diet plans with creator info (not member-specific ones)
      const { data, error } = await supabase
        .from("diet_plans")
        .select(`
          *,
          creator:created_by(id, role, first_name, last_name)
        `)
        .eq("gym_id", gymId)
        .is("member_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Include all plans (admin can see trainer-created plans)
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
      fetchDietPlans(gymId);
    } catch (error) {
      console.error("Error deleting diet plan:", error);
      showError("Failed to delete diet plan");
    }
  };

  const filteredPlans = dietPlans.filter(plan => {
    const matchesSearch = plan.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (plan.description && plan.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === "all" || 
                         (filterType === "template" && plan.is_template) ||
                         (filterType === "regular" && !plan.is_template);
    return matchesSearch && matchesFilter;
  });

  const activeTemplates = dietPlans.filter(p => p.is_template).length;
  const regularPlans = dietPlans.filter(p => !p.is_template).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-14 h-14 border-4 border-transparent border-t-blue-500 rounded-full animate-spin animation-delay-200"></div>
        </div>
        <p className="mt-6 text-gray-600 font-medium text-sm">Loading diet plans...</p>
      </div>
    );
  }

  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
        <Header title="Diet Plans" showBack={false} />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Apple className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No Gym Selected</h2>
            <p className="text-gray-500 text-sm mb-6 px-4">
              Please select a gym to view and manage diet plans
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm active:scale-95 transition-transform"
              style={{ minHeight: '44px' }}
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 safe-area-inset-bottom">
      <Header title="Diet Plans" showBack={false} />

      <main className="px-3 py-3 space-y-4">
        {/* Back Button */}
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-gray-700 font-medium text-sm"
          style={{ minHeight: '44px' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </button>

        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 gap-2 px-1">
          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Plans</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{dietPlans.length}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                <Apple className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Templates</p>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">{activeTemplates}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Regular Plans</p>
                <p className="text-xl font-bold text-indigo-600 mt-0.5">{regularPlans}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Today</p>
                <p className="text-xl font-bold text-amber-600 mt-0.5">
                  {dietPlans.filter(p => {
                    const today = new Date().toDateString();
                    const createdDate = new Date(p.created_at).toDateString();
                    return createdDate === today;
                  }).length}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Add Plan */}
        <div className="bg-white rounded-xl p-3 mx-1 border border-gray-200 shadow-sm space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search diet plans..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm placeholder:text-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Add Plan Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            style={{ minHeight: '44px' }}
          >
            <Plus className="w-5 h-5" />
            Add New Diet Plan
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl p-3 mx-1 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by Type</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "all", label: "All", count: dietPlans.length },
              { id: "template", label: "Templates", count: activeTemplates },
              { id: "regular", label: "Regular", count: regularPlans }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterType(filter.id)}
                className={`py-2.5 rounded-lg text-xs font-medium transition-all duration-200 flex flex-col items-center justify-center ${
                  filterType === filter.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
                style={{ minHeight: '64px' }}
              >
                <span>{filter.label}</span>
                <span className={`mt-1 px-2 py-0.5 text-xs rounded-full ${
                  filterType === filter.id 
                    ? "bg-white/20" 
                    : "bg-white text-gray-600"
                }`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Diet Plans List */}
        <div className="space-y-3 pb-20">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-semibold text-gray-900 text-sm">Diet Plans</h3>
            <span className="text-xs text-gray-500">
              {filteredPlans.length} {filteredPlans.length === 1 ? 'plan' : 'plans'} found
            </span>
          </div>
          
          {filteredPlans.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center border border-gray-200 shadow-sm mx-1">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Apple className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">No diet plans yet</h3>
              <p className="text-gray-500 text-sm mb-4">
                Create your first diet plan to get started
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
                style={{ minHeight: '44px' }}
              >
                <Plus className="w-5 h-5" />
                Create First Plan
              </button>
            </div>
          ) : (
            filteredPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-md transition-all duration-200 mx-1"
              >
                <div className="flex items-start gap-3">
                  {/* Plan Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm ${
                      plan.is_template 
                        ? "bg-gradient-to-br from-emerald-600 to-emerald-500" 
                        : "bg-gradient-to-br from-blue-600 to-indigo-600"
                    }`}>
                      <Apple className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Plan Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {plan.title}
                          </h3>
                          {plan.is_template && (
                            <div className="px-2 py-1 rounded-lg border bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700 flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5" />
                              <span className="text-xs font-medium">Template</span>
                            </div>
                          )}
                        </div>
                        {plan.description && (
                          <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    </div>

                    {/* Plan Details */}
                    <div className="mt-3 space-y-2">
                      {/* Creator Info */}
                      {plan.creator && (
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            plan.creator.role === 'trainer'
                              ? 'bg-purple-50'
                              : 'bg-indigo-50'
                          }`}>
                            <User className={`w-3.5 h-3.5 ${
                              plan.creator.role === 'trainer'
                                ? 'text-purple-600'
                                : 'text-indigo-600'
                            }`} />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Created by</p>
                            <p className="text-sm font-medium text-gray-900">
                              {plan.creator.role === 'trainer' ? 'Trainer' : 'Admin'} {plan.creator.first_name} {plan.creator.last_name}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Created</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(plan.created_at).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Last Updated</p>
                          <p className="text-sm font-medium text-gray-900">
                            {plan.updated_at 
                              ? new Date(plan.updated_at).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric"
                                })
                              : "Never"
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Horizontal Scroll on Mobile */}
                    <div className="flex space-x-2 overflow-x-auto mt-3 pt-3 border-t border-gray-100 pb-1 -mx-1 px-1 no-scrollbar">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPlan(plan);
                          setShowAddModal(true);
                        }}
                        className="flex-shrink-0 px-3 py-2 bg-blue-50 text-blue-700 cursor-pointer text-xs font-medium rounded-lg active:bg-blue-100 transition-all flex items-center gap-2"
                        style={{ minHeight: '36px' }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      
                    
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(plan.id);
                        }}
                        className="flex-shrink-0 px-3 py-2 bg-red-50 cursor-pointer text-red-700 text-xs font-medium rounded-lg active:bg-red-100 transition-all flex items-center gap-2"
                        style={{ minHeight: '36px' }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Add/Edit Diet Plan Modal */}
      {(showAddModal || editingPlan) && (
        <DietPlanModal
          plan={editingPlan}
          gymId={gymId}
          onClose={() => {
            setShowAddModal(false);
            setEditingPlan(null);
            // Clear URL params when closing
            if (searchParams.get("edit")) {
              router.replace("/settings/diet-plans");
            }
          }}
          onSave={() => {
            fetchDietPlans(gymId);
            setShowAddModal(false);
            setEditingPlan(null);
            // Clear URL params when saving
            if (searchParams.get("edit")) {
              router.replace("/settings/diet-plans");
            }
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
  const [activeDay, setActiveDay] = useState(1);

  useEffect(() => {
    if (plan) {
      setFormData({
        title: plan.title || "",
        description: plan.description || "",
        is_template: plan.is_template || false,
      });
      fetchPlanDetails();
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
            meals: day.diet_meals.map(meal => ({
              ...meal,
              items: meal.diet_meal_items || []
            })) || [],
          };
        });
      }

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

        const { error: deleteError } = await supabase
          .from("diet_plan_days")
          .delete()
          .eq("diet_plan_id", plan.id);

        if (deleteError) throw deleteError;
      } else {
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 mb-20">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden shadow-2xl animate-slide-up">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {plan ? "Edit Diet Plan" : "Create New Diet Plan"}
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                {plan ? "Update your diet plan details" : "Add a new diet plan for your gym"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[60vh] p-4">
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-gray-900 text-sm">Basic Information</h4>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Plan Title *
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g., Weight Loss Plan, Muscle Gain Plan"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-sm"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this diet plan"
                />
              </div>

              <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 text-sm">Template Plan</p>
                  <p className="text-xs text-gray-500">Use as reusable template</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_template: !formData.is_template })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    formData.is_template ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      formData.is_template ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Days Navigation */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 text-sm">Weekly Meal Plan</h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveDay(prev => Math.max(1, prev - 1))}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDay(prev => Math.min(7, prev + 1))}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                {[1, 2, 3, 4, 5, 6, 7].map(dayNum => (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setActiveDay(dayNum)}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex flex-col items-center justify-center min-w-[60px] ${
                      activeDay === dayNum
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    style={{ minHeight: '56px' }}
                  >
                    <span>{DAY_NAMES[dayNum]?.slice(0, 3)}</span>
                    <span className={`text-xs mt-0.5 ${
                      activeDay === dayNum ? "text-white/80" : "text-gray-500"
                    }`}>
                      Day {dayNum}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Day's Meals */}
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-semibold text-gray-900 text-sm">{DAY_NAMES[activeDay]}</h5>
                <button
                  type="button"
                  onClick={() => addMealToDay(activeDay)}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Meal
                </button>
              </div>

              {days[activeDay]?.meals && days[activeDay].meals.length > 0 && (
                <div className="space-y-3">
                  {days[activeDay].meals.map((meal, mealIndex) => (
                    <div key={mealIndex} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Meal Type *
                              </label>
                              <select
                                className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={meal.meal_type}
                                onChange={(e) => updateMeal(activeDay, mealIndex, "meal_type", e.target.value)}
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
                                className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                value={meal.meal_time || ""}
                                onChange={(e) => updateMeal(activeDay, mealIndex, "meal_time", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMeal(activeDay, mealIndex)}
                          className="ml-2 p-1.5 text-red-600 hover:bg-red-50 rounded-lg active:scale-95 transition-transform"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Instructions (Optional)
                        </label>
                        <textarea
                          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                          rows={2}
                          value={meal.instructions || ""}
                          onChange={(e) => updateMeal(activeDay, mealIndex, "instructions", e.target.value)}
                          placeholder="Cooking instructions or notes"
                        />
                      </div>

                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium text-gray-700">Food Items</label>
                          <button
                            type="button"
                            onClick={() => addItemToMeal(activeDay, mealIndex)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium active:scale-95 transition-transform"
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
                                    className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Food name *"
                                    value={item.food_name || ""}
                                    onChange={(e) => updateMealItem(activeDay, mealIndex, itemIndex, "food_name", e.target.value)}
                                    required
                                  />
                                  <input
                                    type="text"
                                    className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Quantity"
                                    value={item.quantity || ""}
                                    onChange={(e) => updateMealItem(activeDay, mealIndex, itemIndex, "quantity", e.target.value)}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    className="px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    placeholder="Calories"
                                    value={item.calories || ""}
                                    onChange={(e) => updateMealItem(activeDay, mealIndex, itemIndex, "calories", e.target.value)}
                                  />
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                      placeholder="Notes"
                                      value={item.notes || ""}
                                      onChange={(e) => updateMealItem(activeDay, mealIndex, itemIndex, "notes", e.target.value)}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeMealItem(activeDay, mealIndex, itemIndex)}
                                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs active:scale-95 transition-transform"
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-200 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg active:scale-95 transition-all duration-200 text-sm"
              disabled={loading}
              style={{ minHeight: '44px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:shadow-lg active:scale-95 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '44px' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {plan ? "Saving..." : "Creating..."}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {plan ? "Update Plan" : "Create Plan"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}