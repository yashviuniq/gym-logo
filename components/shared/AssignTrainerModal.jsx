"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Loader2, User, Phone, Save, AlertCircle } from "lucide-react";
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
      setShowWarning(false); // Reset warning when modal opens
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

    console.log("handleSave - currentTrainerId:", currentTrainerId);
    console.log("handleSave - selectedTrainerId:", selectedTrainerId);
    console.log("handleSave - showWarning:", showWarning);

    // Show warning if member is already assigned to a different trainer
    if (currentTrainerId && currentTrainerId !== selectedTrainerId && !showWarning) {
      console.log("Showing warning modal");
      setShowWarning(true);
      return;
    }

    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const assignedBy = authData?.user?.id;

      // CRITICAL: First, deactivate ALL existing active assignments for this member in this gym
      // This ensures the member can only be assigned to ONE trainer at a time
      await supabase
        .from("trainer_member_assignments")
        .update({ is_active: false })
        .eq("member_id", memberId)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      // Then, create or activate the new assignment
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-slideUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-bold text-white">Assign Trainer</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4 max-h-96 overflow-y-auto">
          {/* Current Trainer Info */}
          {currentTrainer && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-2">Currently Assigned</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                  {currentTrainer.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{currentTrainer.name}</p>
                  {currentTrainer.phone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {currentTrainer.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-xs text-amber-800 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Selecting a different trainer will remove this member from {currentTrainer.name}
                </p>
              </div>
            </div>
          )}

          {/* Trainer Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Select Trainer</label>
            {fetching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              </div>
            ) : trainers.length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No trainers available</p>
              </div>
            ) : (
              <div className="space-y-2">
                {trainers.map((trainer) => (
                  <label
                    key={trainer.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedTrainerId === trainer.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="trainer"
                        value={trainer.id}
                        checked={selectedTrainerId === trainer.id}
                        onChange={() => setSelectedTrainerId(trainer.id)}
                        disabled={loading}
                        className="w-4 h-4"
                      />
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {trainer.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{trainer.name}</p>
                          {trainer.id === currentTrainerId && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        {trainer.phone && (
                          <p className="text-xs text-gray-500">{trainer.phone}</p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-2xl border-t border-gray-200">
          {showWarning ? (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">
                      Switch Trainer Assignment?
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      This member is currently assigned to <strong>{currentTrainer?.name}</strong>. 
                      Proceeding will remove the member from {currentTrainer?.name}'s list and assign them to{" "}
                      <strong>{trainers.find(t => t.id === selectedTrainerId)?.name}</strong>.
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
                  className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Yes, Switch Trainer
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              {currentTrainerId && (
                <button
                  onClick={handleRemoveTrainer}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    "Remove"
                  )}
                </button>
              )}
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !selectedTrainerId || selectedTrainerId === currentTrainerId}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Assign
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
