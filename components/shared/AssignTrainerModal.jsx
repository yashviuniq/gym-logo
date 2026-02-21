"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Loader2, User, Phone, Save, AlertCircle, ChevronRight, Check, Sparkles } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function AssignTrainerModal({ isOpen, onClose, memberId, selectedGym, onSuccess, currentTrainerId }) {
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (isOpen && selectedGym?.id) {
      fetchTrainers();
      setSelectedTrainerId(currentTrainerId || null);
      setShowWarning(false);
    }
  }, [isOpen, selectedGym?.id, currentTrainerId]);

  const fetchTrainers = async () => {
    setFetching(true);
    try {
      const { data: trainersData, error } = await supabase
        .from("gym_trainers")
        .select(`
          id,
          profile_id,
          profiles:profile_id (
            id,
            first_name,
            last_name,
            phone
          )
        `)
        .eq("gym_id", selectedGym.id);

      if (error) throw error;

      setTrainers(
        trainersData?.map((t) => ({
          id: t.profile_id,
          gymTrainerId: t.id,
          name: `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""}`.trim(),
          phone: t.profiles?.phone,
        })).sort((a, b) => a.name.localeCompare(b.name)) || []
      );
    } catch (err) {
      console.error("Error fetching trainers:", err);
      showError("Failed to load trainers");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTrainerId || !memberId || !selectedGym?.id) return;

    if (currentTrainerId && currentTrainerId !== selectedTrainerId && !showWarning) {
      setShowWarning(true);
      return;
    }

    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const assignedBy = authData?.user?.id;

      await supabase
        .from("trainer_member_assignments")
        .update({ is_active: false })
        .eq("member_id", memberId)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      const { error: upsertError } = await supabase
        .from("trainer_member_assignments")
        .upsert(
          {
            gym_id: selectedGym.id,
            trainer_id: selectedTrainerId,
            member_id: memberId,
            assigned_by: assignedBy,
            is_active: true,
          },
          {
            onConflict: "gym_id,member_id,trainer_id",
          }
        );

      if (upsertError) throw upsertError;

      showSuccess("Trainer assigned successfully!");
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Error assigning trainer:", err);
      showError("Failed to assign trainer");
    } finally {
      setLoading(false);
      setShowWarning(false);
    }
  };

  const handleRemoveTrainer = async () => {
    if (!memberId || !selectedGym?.id || !currentTrainerId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("trainer_member_assignments")
        .update({ is_active: false })
        .eq("member_id", memberId)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      if (error) throw error;

      showSuccess("Trainer removed successfully!");
      setSelectedTrainerId(null);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Error removing trainer:", err);
      showError("Failed to remove trainer");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedTrainer = trainers.find((t) => t.id === selectedTrainerId);
  const currentTrainer = trainers.find((t) => t.id === currentTrainerId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-md transform transition-all animate-slideUp max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Assign Trainer</h2>
              <p className="text-blue-100 text-sm opacity-90">Select from available trainers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-white/20 rounded-full transition-all duration-200 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="bg-white flex-1 overflow-y-auto rounded-b-2xl">
          {/* Current Assignment Section */}
          {currentTrainer && !showWarning && (
            <div className="border-b border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current Trainer</h3>
                <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-full">
                  ACTIVE
                </span>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {currentTrainer.name.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-lg">{currentTrainer.name}</h4>
                    {currentTrainer.phone && (
                      <p className="text-gray-600 text-sm flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4" />
                        {currentTrainer.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Selecting a different trainer will remove this assignment</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Trainer Selection Section */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Available Trainers</h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {trainers.length} {trainers.length === 1 ? 'trainer' : 'trainers'}
              </span>
            </div>

            {fetching ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-blue-400 animate-pulse" />
                </div>
                <p className="mt-4 text-gray-500 text-sm">Loading trainers...</p>
              </div>
            ) : trainers.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-xl">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="font-medium text-gray-700">No trainers available</h4>
                <p className="text-sm text-gray-500 mt-1">Add trainers to this gym first</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trainers.map((trainer) => {
                  const isSelected = selectedTrainerId === trainer.id;
                  const isCurrent = trainer.id === currentTrainerId;
                  
                  return (
                    <div
                      key={trainer.id}
                      onClick={() => !loading && setSelectedTrainerId(trainer.id)}
                      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'border-blue-500 bg-gradient-to-r from-blue-50/50 to-blue-100/50 shadow-sm'
                          : 'border-gray-100 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Selection Indicator */}
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {isSelected && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>

                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md transition-transform ${
                          isSelected ? 'scale-105' : ''
                        } ${
                          isCurrent
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}>
                          {trainer.name.charAt(0)}
                        </div>

                        {/* Trainer Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 truncate">{trainer.name}</h4>
                            {isCurrent && (
                              <span className="px-2 py-0.5 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs font-medium rounded-full flex-shrink-0">
                                Current
                              </span>
                            )}
                          </div>
                          {trainer.phone && (
                            <p className="text-gray-600 text-sm flex items-center gap-2 mt-1">
                              <Phone className="w-3.5 h-3.5" />
                              {trainer.phone}
                            </p>
                          )}
                        </div>

                        {/* Chevron for mobile */}
                        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform md:hidden ${
                          isSelected ? 'rotate-90 text-blue-500' : ''
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-t from-white via-white to-gray-50 p-5 rounded-b-2xl border-t border-gray-200/60 shadow-lg">
          {showWarning ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">Switch Trainer?</h4>
                    <p className="text-xs text-amber-800 mt-2 leading-relaxed">
                      This will remove <span className="font-semibold">{currentTrainer?.name}</span> and assign this member to{' '}
                      <span className="font-semibold">{selectedTrainer?.name}</span>.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWarning(false);
                    setSelectedTrainerId(currentTrainerId);
                  }}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-medium hover:from-gray-200 hover:to-gray-300 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-amber-200 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Confirm Switch
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              {currentTrainerId && (
                <button
                  onClick={handleRemoveTrainer}
                  disabled={loading}
                  className="px-5 py-3 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-600 rounded-xl font-medium hover:from-red-100 hover:to-rose-100 hover:border-red-300 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 order-2 sm:order-1"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Remove Trainer"
                  )}
                </button>
              )}
              <div className={`flex gap-3 ${currentTrainerId ? 'order-1 sm:order-2' : ''}`}>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-medium hover:from-gray-200 hover:to-gray-300 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !selectedTrainerId || selectedTrainerId === currentTrainerId}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-200 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Assign Trainer
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}