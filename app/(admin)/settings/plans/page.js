"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import supabase from "@/lib/supabaseClient";

export default function PlansSettingsPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [gymId, setGymId] = useState(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      
      // Get current gym (you can replace this with your auth logic)
      const storedGymId = localStorage.getItem("gymId");
      if (!storedGymId) {
        console.error("No gym ID found");
        return;
      }
      setGymId(storedGymId);

      // Fetch membership plans
      const { data: plansData, error: plansError } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("gym_id", storedGymId)
        .order("duration_days", { ascending: true });

      if (plansError) throw plansError;

      // Fetch member count for each plan
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("memberships")
        .select("plan_id")
        .eq("gym_id", storedGymId)
        .eq("status", "active");

      if (membershipsError) throw membershipsError;

      // Count members per plan
      const memberCounts = membershipsData.reduce((acc, m) => {
        acc[m.plan_id] = (acc[m.plan_id] || 0) + 1;
        return acc;
      }, {});

      // Combine plans with member counts
      const plansWithCounts = plansData.map((plan) => ({
        id: plan.id,
        name: plan.name,
        duration: plan.duration_days,
        price: parseFloat(plan.price),
        active: plan.is_active,
        members: memberCounts[plan.id] || 0,
        created_at: plan.created_at,
      }));

      setPlans(plansWithCounts);
    } catch (error) {
      console.error("Error fetching plans:", error);
      alert("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

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
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Membership Plans" />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Membership Plans" />

      <main className="px-4 py-4 space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-blue-600 text-sm">Active Plans</p>
            <p className="text-2xl font-bold text-blue-700">
              {plans.filter((p) => p.active).length}
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-green-600 text-sm">Total Members</p>
            <p className="text-2xl font-bold text-green-700">
              {plans.reduce((sum, p) => sum + p.members, 0)}
            </p>
          </div>
        </div>

        {/* Plans List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">All Plans</h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-black text-white rounded-lg text-sm font-medium"
            >
              + Add Plan
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`p-4 ${!plan.active ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        plan.active ? "bg-green-100" : "bg-gray-100"
                      }`}
                    >
                      <span className="text-lg">📋</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{plan.name}</p>
                      <p className="text-sm text-gray-500">
                        {plan.duration} days • {plan.members} members
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹{plan.price}</p>
                    <button
                      onClick={() => togglePlanStatus(plan.id)}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        plan.active
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {plan.active ? "Active" : "Inactive"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Created {new Date(plan.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="text-sm text-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-sm text-red-600"
                      disabled={plan.members > 0}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

// Plan Modal Component
function PlanModal({ plan, gymId, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: plan?.name || "",
    duration: plan?.duration || "",
    price: plan?.price || "",
    active: plan?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.duration || !formData.price) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setSaving(true);

      if (plan) {
        // Update existing plan
        const { error } = await supabase
          .from("membership_plans")
          .update({
            name: formData.name,
            duration_days: parseInt(formData.duration),
            price: parseFloat(formData.price),
            is_active: formData.active,
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
            duration_days: parseInt(formData.duration),
            price: parseFloat(formData.price),
            is_active: formData.active,
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {plan ? "Edit Plan" : "Add New Plan"}
          </h3>
          <button onClick={onClose} className="text-gray-400">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plan Name *
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"
              placeholder="e.g., Monthly, Quarterly"
              value={formData.name}
              onChange={(e) => updateForm("name", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (days) *
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"
                placeholder="30"
                value={formData.duration}
                onChange={(e) =>
                  updateForm("duration", parseInt(e.target.value))
                }
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹) *
              </label>
              <input
                type="number"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"
                placeholder="1500"
                value={formData.price}
                onChange={(e) => updateForm("price", parseInt(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
            <span className="font-medium text-gray-900">Active Status</span>
            <button
              type="button"
              onClick={() => updateForm("active", !formData.active)}
              className={`w-12 h-6 rounded-full transition ${
                formData.active ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition transform ${
                  formData.active ? "translate-x-6" : "translate-x-1"
                }`}
              ></div>
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-black text-white rounded-xl font-medium disabled:bg-gray-400"
              disabled={saving}
            >
              {saving ? "Saving..." : plan ? "Save Changes" : "Create Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
