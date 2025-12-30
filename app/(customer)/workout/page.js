"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";

export default function WorkoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [todayWorkout, setTodayWorkout] = useState(null);

  useEffect(() => {
    fetchWorkoutData();
  }, []);

  const fetchWorkoutData = async () => {
    try {
      setLoading(true);
      
      // Get logged-in member from localStorage
      const storedMember = localStorage.getItem("member");
      if (!storedMember) {
        router.push("/auth/login");
        return;
      }

      const member = JSON.parse(storedMember);

      // Fetch assigned workout plans
      const { data: memberWorkouts, error } = await supabase
        .from("member_workouts")
        .select(`
          id,
          assigned_at,
          workout_plan_id,
          workout_plans (
            id,
            title,
            created_at
          )
        `)
        .eq("member_id", member.id)
        .order("assigned_at", { ascending: false });

      if (error) throw error;

      if (memberWorkouts && memberWorkouts.length > 0) {
        setWorkoutPlans(memberWorkouts.map(mw => ({
          id: mw.id,
          title: mw.workout_plans?.title || "Workout Plan",
          assignedAt: mw.assigned_at,
        })));

        // Get today's workout (most recent assignment)
        setTodayWorkout({
          name: memberWorkouts[0].workout_plans?.title || "Workout Plan",
          duration: "45-60 min",
        });
      } else {
        setTodayWorkout({
          name: "No workout assigned",
          duration: "-",
        });
      }

    } catch (error) {
      console.error("Error fetching workout data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Workout" showBack={false} />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Workout" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Assigned Workout Plans */}
        {workoutPlans.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">My Workout Plans</h3>
            <div className="space-y-2">
              {workoutPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <p className="font-medium text-gray-900">{plan.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Assigned: {new Date(plan.assignedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Workout Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-blue-100 text-sm">Today's Workout</p>
              <h2 className="text-xl font-bold">{todayWorkout?.name || "No workout assigned"}</h2>
            </div>
            <span className="text-3xl">💪</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-blue-100">
            <span>⏱️ {todayWorkout?.duration || "-"}</span>
            {workoutPlans.length > 0 && (
              <span>🏋️ {workoutPlans.length} plan{workoutPlans.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Workout Plans Info */}
        {workoutPlans.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">💪</span>
            </div>
            <p className="text-gray-700 font-medium mb-2">No Workout Plan Assigned</p>
            <p className="text-gray-500 text-sm">
              Contact your trainer to get a personalized workout plan
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Assigned Plans</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {workoutPlans.map((plan) => (
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
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
