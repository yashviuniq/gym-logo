"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";

export default function DietPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dietPlans, setDietPlans] = useState([]);
  const [water, setWater] = useState(0);

  useEffect(() => {
    fetchDietData();
  }, []);

  const fetchDietData = async () => {
    try {
      setLoading(true);
      
      // Get logged-in member from localStorage
      const storedMember = localStorage.getItem("member");
      if (!storedMember) {
        router.push("/auth/login");
        return;
      }

      const member = JSON.parse(storedMember);

      // Fetch assigned diet plans
      const { data: memberDiets, error } = await supabase
        .from("member_diets")
        .select(`
          id,
          assigned_at,
          diet_plan_id,
          diet_plans (
            id,
            title,
            created_at
          )
        `)
        .eq("member_id", member.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      if (memberDiets && memberDiets.length > 0) {
        setDietPlans(memberDiets.map(md => ({
          id: md.id,
          title: md.diet_plans?.title || "Diet Plan",
          assignedAt: md.assigned_at,
        })));
      }

    } catch (error) {
      console.error("Error fetching diet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const addWater = () => {
    setWater((prev) => Math.min(prev + 250, 3000));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Diet Plan" showBack={false} />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Diet Plan" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Diet Plans Overview */}
        {dietPlans.length > 0 ? (
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-green-100 text-sm">Active Diet Plan</p>
                <p className="text-2xl font-bold">
                  {dietPlans[0]?.title || "Diet Plan"}
                </p>
              </div>
              <span className="text-3xl">🥗</span>
            </div>
            <p className="text-green-100 text-sm">
              Assigned: {new Date(dietPlans[0]?.assignedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-green-100 text-sm">No Diet Plan Assigned</p>
                <p className="text-xl font-bold">Contact your trainer</p>
              </div>
              <span className="text-3xl">🥗</span>
            </div>
          </div>
        )}

        {/* Water Tracker */}
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💧</span>
              <div>
                <p className="font-medium text-blue-900">Water Intake</p>
                <p className="text-sm text-blue-600">
                  {water}ml / 3000ml
                </p>
              </div>
            </div>
            <button
              onClick={addWater}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              + 250ml
            </button>
          </div>
          <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${(water / 3000) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Assigned Diet Plans */}
        {dietPlans.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">My Diet Plans</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {dietPlans.map((plan) => (
                <div key={plan.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{plan.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Assigned: {new Date(plan.assignedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🥗</span>
            </div>
            <p className="text-gray-700 font-medium mb-2">No Diet Plan Assigned</p>
            <p className="text-gray-500 text-sm">
              Contact your trainer to get a personalized diet plan
            </p>
          </div>
        )}

        {/* Health Tip */}
        <div className="bg-yellow-50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="font-medium text-yellow-900">Health Tip</p>
              <p className="text-sm text-yellow-700">
                Stay hydrated throughout the day. Aim for at least 3L of water daily for better performance and recovery.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
