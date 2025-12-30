"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { PlusCircle, Users, Calendar, IndianRupee, Edit2, Trash2, CheckCircle, XCircle, Zap, Clock } from "lucide-react";

export default function PlansSettingsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [gymId, setGymId] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // "all", "active", "inactive"

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const storedGym = localStorage.getItem("selectedGym");
      if (!storedGym) {
        console.error("No gym selected");
        setLoading(false);
        return;
      }
      const gym = JSON.parse(storedGym);
      setGymId(gym.id);

      const { data: plansData, error: plansError } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("gym_id", gym.id)
        .order("duration_days", { ascending: true });

      if (plansError) throw plansError;

      const { data: membershipsData, error: membershipsError } = await supabase
        .from("memberships")
        .select("plan_id")
        .eq("gym_id", gym.id)
        .eq("status", "active");

      if (membershipsError) throw membershipsError;

      const memberCounts = membershipsData.reduce((acc, m) => {
        acc[m.plan_id] = (acc[m.plan_id] || 0) + 1;
        return acc;
      }, {});

      const plansWithCounts = plansData.map((plan) => ({
        id: plan.id,
        name: plan.name,
        duration: plan.duration_days,
        price: parseFloat(plan.price),
        active: plan.is_active,
        members: memberCounts[plan.id] || 0,
        created_at: plan.created_at,
        description: plan.description || "",
      }));

      setPlans(plansWithCounts);
    } catch (error) {
      console.error("Error fetching plans:", error);
      alert("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = plans.filter(plan => {
    if (activeTab === "active") return plan.active;
    if (activeTab === "inactive") return !plan.active;
    return true;
  });

  const togglePlanStatus = async (id) => {
    try {
      const plan = plans.find((p) => p.id === id);
      const newStatus = !plan.active;

      const { error } = await supabase
        .from("membership_plans")
        .update({ is_active: newStatus })
        .eq("id", id);

      if (error) throw error;

      setPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: newStatus } : p))
      );
    } catch (error) {
      console.error("Error toggling plan status:", error);
      alert("Failed to update plan status");
    }
  };

  const handleDeletePlan = async (id) => {
    const plan = plans.find((p) => p.id === id);
    if (plan.members > 0) {
      alert("Cannot delete a plan with active members");
      return;
    }

    if (!confirm(`Are you sure you want to delete "${plan.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("membership_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting plan:", error);
      alert("Failed to delete plan");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-24">
        <Header title="Membership Plans" />
        <div className="flex flex-col items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  const activePlans = plans.filter(p => p.active);
  const totalMembers = plans.reduce((sum, p) => sum + p.members, 0);
  const totalRevenue = plans.reduce((sum, p) => sum + (p.price * p.members), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-24">
      <Header title="Membership Plans" />

      <main className="px-4 py-4 space-y-6">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Membership Plans</h1>
            <p className="text-gray-600">Manage your gym's membership packages</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <PlusCircle className="w-5 h-5" />
            Add Plan
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Active Plans</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{activePlans.length}</p>
                <p className="text-xs text-gray-500 mt-2">of {plans.length} total</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Members</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalMembers}</p>
                <p className="text-xs text-gray-500 mt-2">across all plans</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">₹{totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-2">estimated</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-200">
          <div className="flex space-x-2">
            {[
              { id: "all", label: "All Plans", count: plans.length },
              { id: "active", label: "Active", count: activePlans.length },
              { id: "inactive", label: "Inactive", count: plans.length - activePlans.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all relative ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  {tab.label}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {tab.count}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Plans List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Plans List</h3>
            <span className="text-sm text-gray-500">
              {filteredPlans.length} {filteredPlans.length === 1 ? 'plan' : 'plans'} found
            </span>
          </div>

          {filteredPlans.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-700 font-medium mb-2">No plans found</p>
              <p className="text-gray-500 text-sm mb-6">
                {activeTab === "all" 
                  ? "Create your first membership plan to get started" 
                  : `No ${activeTab} plans available`}
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Create New Plan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all ${
                    !plan.active ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        plan.active 
                          ? "bg-gradient-to-br from-orange-500 to-orange-600" 
                          : "bg-gray-200"
                      }`}>
                        {plan.active ? (
                          <Calendar className="w-6 h-6 text-white" />
                        ) : (
                          <Clock className="w-6 h-6 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            plan.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}>
                            {plan.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {plan.description && (
                          <p className="text-gray-600 text-sm mt-1">{plan.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-gray-900">₹{plan.price}</p>
                      <p className="text-sm text-gray-500">per plan</p>
                    </div>
                  </div>

                  {/* Plan Details */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-semibold text-gray-900">{plan.duration} days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Members</p>
                        <p className="font-semibold text-gray-900">{plan.members} active</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      Created {new Date(plan.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingPlan(plan)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => togglePlanStatus(plan.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                          plan.active
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-green-50 text-green-600 hover:bg-green-100"
                        }`}
                      >
                        {plan.active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        {plan.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        disabled={plan.members > 0}
                        className={`p-2 rounded-xl ${
                          plan.members > 0
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                        }`}
                        title={plan.members > 0 ? "Cannot delete plan with active members" : "Delete plan"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Plan Modal */}
      {(showAddModal || editingPlan) && (
        <PlanModal
          plan={editingPlan}
          gymId={gymId}
          onClose={() => {
            setShowAddModal(false);
            setEditingPlan(null);
          }}
          onSave={() => {
            fetchPlans();
            setShowAddModal(false);
            setEditingPlan(null);
          }}
        />
      )}
    </div>
  );
}

// Enhanced Plan Modal Component
function PlanModal({ plan, gymId, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: plan?.name || "",
    duration: plan?.duration || "30",
    price: plan?.price || "",
    active: plan?.active ?? true,
    description: plan?.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [durationUnit, setDurationUnit] = useState("days");

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateDays = (value, unit) => {
    if (unit === "months") return parseInt(value) * 30;
    if (unit === "weeks") return parseInt(value) * 7;
    return parseInt(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.duration || !formData.price) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setSaving(true);
      
      // Convert duration to days based on selected unit
      const durationInDays = calculateDays(formData.duration, durationUnit);

      if (plan) {
        // Update existing plan
        const { error } = await supabase
          .from("membership_plans")
          .update({
            name: formData.name,
            duration_days: durationInDays,
            price: parseFloat(formData.price),
            is_active: formData.active,
            description: formData.description,
            updated_at: new Date().toISOString(),
          })
          .eq("id", plan.id);

        if (error) throw error;
      } else {
        // Create new plan
        const { error } = await supabase
          .from("membership_plans")
          .insert({
            gym_id: gymId,
            name: formData.name,
            duration_days: durationInDays,
            price: parseFloat(formData.price),
            is_active: formData.active,
            description: formData.description,
          });

        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error("Error saving plan:", error);
      alert("Failed to save plan: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                {plan ? "Edit Plan" : "Create New Plan"}
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                {plan ? "Update your membership plan details" : "Add a new membership plan to your gym"}
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

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[60vh] p-6">
          <div className="space-y-6">
            {/* Plan Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan Name *
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                placeholder="e.g., Monthly Premium, Quarterly Basic, Annual Gold"
                value={formData.name}
                onChange={(e) => updateForm("name", e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none"
                placeholder="Describe the benefits and features of this plan..."
                rows={3}
                value={formData.description}
                onChange={(e) => updateForm("description", e.target.value)}
              />
            </div>

            {/* Duration and Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration *
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    placeholder="30"
                    value={formData.duration}
                    onChange={(e) => updateForm("duration", parseInt(e.target.value))}
                    required
                    min="1"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {durationUnit === "days" && `${formData.duration} days`}
                  {durationUnit === "weeks" && `${formData.duration} weeks (${formData.duration * 7} days)`}
                  {durationUnit === "months" && `${formData.duration} months (${formData.duration * 30} days)`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (₹) *
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <IndianRupee className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                    placeholder="1500"
                    value={formData.price}
                    onChange={(e) => updateForm("price", parseFloat(e.target.value))}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Status Toggle */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">Plan Status</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formData.active 
                      ? "This plan will be available for new members" 
                      : "This plan will be hidden from new members"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateForm("active", !formData.active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.active ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className={`mt-4 p-3 rounded-lg ${formData.active ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                <p className="text-sm font-medium">
                  {formData.active ? "✓ Active Plan" : "✗ Inactive Plan"}
                </p>
                <p className="text-xs mt-1">
                  {formData.active 
                    ? "Members can purchase this plan" 
                    : "Existing members remain active, but new members cannot join"}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {plan ? "Saving..." : "Creating..."}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {plan ? "Save Changes" : "Create Plan"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}