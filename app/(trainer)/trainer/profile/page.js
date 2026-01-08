"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Card from "@/components/shared/Card";
import { useToast } from "@/contexts/ToastContext";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Users,
  Utensils,
  Dumbbell,
  LogOut,
  ChevronRight,
  Award,
  MapPin,
  Building
} from "lucide-react";

export default function TrainerProfilePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [trainerData, setTrainerData] = useState(null);
  const [stats, setStats] = useState({
    assignedMembers: 0,
    dietPlansAssigned: 0,
    workoutPlansAssigned: 0
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Get trainer data with gym info
      const { data: trainer } = await supabase
        .from("gym_trainers")
        .select(`
          *,
          gyms:gym_id(name, address)
        `)
        .eq("profile_id", user.id)
        .eq("is_active", true)
        .single();

      if (trainer) {
        setTrainerData(trainer);
        // Update profile with gym info from trainer data
        if (trainer.gyms) {
          setProfile(prev => ({
            ...prev,
            gyms: trainer.gyms
          }));
        }
      }

      // Get stats
      const [membersRes, dietsRes, workoutsRes] = await Promise.all([
        supabase
          .from("trainer_member_assignments")
          .select("id", { count: "exact" })
          .eq("trainer_id", user.id)
          .eq("is_active", true),
        supabase
          .from("member_diets")
          .select("id", { count: "exact" })
          .eq("assigned_by_trainer_id", user.id),
        supabase
          .from("member_workouts")
          .select("id", { count: "exact" })
          .eq("assigned_by_trainer_id", user.id)
      ]);

      setStats({
        assignedMembers: membersRes.count || 0,
        dietPlansAssigned: dietsRes.count || 0,
        workoutPlansAssigned: workoutsRes.count || 0
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("gymUser");
      localStorage.removeItem("gymUserExpiry");
      router.push("/auth/login");
    } catch (error) {
      showToast("Error logging out", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header with Profile */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 pt-4 pb-20 px-4 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">My Profile</h1>
            <p className="text-blue-100 text-sm">Trainer Account</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-16">
        <Card className="p-5 border-0 shadow-lg text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto flex items-center justify-center mb-4">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile?.full_name || trainerData?.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-3xl font-bold text-white">
                {(profile?.full_name || trainerData?.name)?.[0]?.toUpperCase() || "T"}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{profile?.full_name || trainerData?.name || "Trainer"}</h2>
          <p className="text-blue-600 font-medium text-sm">Personal Trainer</p>
          
          {trainerData?.specialization && Array.isArray(trainerData.specialization) && trainerData.specialization.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-3">
              {trainerData.specialization.map((spec, index) => (
                <span 
                  key={index}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center border-0 shadow-md">
            <div className="w-10 h-10 rounded-full bg-blue-100 mx-auto flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.assignedMembers}</p>
            <p className="text-xs text-gray-500">Members</p>
          </Card>
          <Card className="p-4 text-center border-0 shadow-md">
            <div className="w-10 h-10 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-2">
              <Utensils className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.dietPlansAssigned}</p>
            <p className="text-xs text-gray-500">Diet Plans</p>
          </Card>
          <Card className="p-4 text-center border-0 shadow-md">
            <div className="w-10 h-10 rounded-full bg-purple-100 mx-auto flex items-center justify-center mb-2">
              <Dumbbell className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{stats.workoutPlansAssigned}</p>
            <p className="text-xs text-gray-500">Workouts</p>
          </Card>
        </div>
      </div>

      {/* Contact Information */}
      <div className="px-4 mt-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
        <Card className="divide-y divide-gray-100 border-0 shadow-md">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{profile?.email || trainerData?.email || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-sm font-medium text-gray-900">{profile?.phone || trainerData?.phone || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Gym</p>
              <p className="text-sm font-medium text-gray-900">{trainerData?.gyms?.name || profile?.gyms?.name || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Joined</p>
              <p className="text-sm font-medium text-gray-900">
                {trainerData?.hired_date 
                  ? new Date(trainerData.hired_date).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })
                  : "Not set"
                }
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="px-4 mt-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <Card className="divide-y divide-gray-100 border-0 shadow-md">
          <button 
            onClick={() => router.push("/trainer/members")}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">My Members</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={() => router.push("/trainer/diet-plans")}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <Utensils className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">Diet Plans</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={() => router.push("/trainer/workout-plans")}
            className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">Workout Plans</span>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </Card>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-6">
        <button
          onClick={handleLogout}
          className="w-full py-4 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </button>
      </div>
    </div>
  );
}
