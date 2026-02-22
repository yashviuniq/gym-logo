"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  X, Loader2, User, Phone, Save, AlertCircle,
  ChevronRight, Check, Sparkles, IndianRupee,
  CalendarDays, Clock
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { formatTrainerCost, DAYS_OF_WEEK } from "@/lib/constants/trainerSchedule";

export default function AssignTrainerModal({ isOpen, onClose, memberId, selectedGym, onSuccess, currentTrainerId }) {
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState(null);
  const [activeDay, setActiveDay] = useState(""); // currently viewed day tab
  // Multi-day, multi-slot selection: { "Monday": ["12-1 PM", "2-3 PM"], "Tuesday": ["5-6 PM"] }
  const [selectedSlots, setSelectedSlots] = useState({});
  // Booked slots for ALL days: { "Monday": [{time_slot, member_id}], ... }
  const [bookedSlotsMap, setBookedSlotsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const { showSuccess, showError } = useToast();

  // Current booking info for the member (if already booked with a trainer)
  const [currentBooking, setCurrentBooking] = useState(null);

  useEffect(() => {
    if (isOpen && selectedGym?.id) {
      fetchTrainers();
      fetchCurrentBookings();
      setSelectedTrainerId(currentTrainerId || null);
      setActiveDay("");
      setSelectedSlots({});
      setBookedSlotsMap({});
      setShowWarning(false);
    }
  }, [isOpen, selectedGym?.id, currentTrainerId]);

  // Fetch ALL booked slots for the selected trainer (all days at once)
  useEffect(() => {
    if (selectedTrainerId && selectedGym?.id) {
      fetchAllBookedSlots(selectedTrainerId);
    } else {
      setBookedSlotsMap({});
    }
  }, [selectedTrainerId, selectedGym?.id]);

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
            phone,
            trainer_cost,
            available_days,
            available_time_slots
          )
        `)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      if (error) throw error;

      setTrainers(
        trainersData?.map((t) => ({
          id: t.profile_id,
          gymTrainerId: t.id,
          name: `${t.profiles?.first_name || ""} ${t.profiles?.last_name || ""}`.trim(),
          phone: t.profiles?.phone,
          cost: t.profiles?.trainer_cost,
          availableDays: t.profiles?.available_days || [],
          availableTimeSlots: t.profiles?.available_time_slots || {},
        })).sort((a, b) => a.name.localeCompare(b.name)) || []
      );
    } catch (err) {
      console.error("Error fetching trainers:", err);
      showError("Failed to load trainers");
    } finally {
      setFetching(false);
    }
  };

  const fetchCurrentBookings = async () => {
    if (!memberId || !selectedGym?.id) return;
    try {
      const { data, error } = await supabase
        .from("trainer_bookings")
        .select("id, trainer_id, day, time_slot")
        .eq("member_id", memberId)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      if (!error && data && data.length > 0) {
        setCurrentBooking(data);
      } else {
        setCurrentBooking(null);
      }
    } catch (err) {
      console.error("Error fetching current bookings:", err);
    }
  };

  // Fetch booked slots for ALL days for a trainer at once
  const fetchAllBookedSlots = async (trainerId) => {
    setFetchingSlots(true);
    try {
      const { data, error } = await supabase
        .from("trainer_bookings")
        .select("time_slot, member_id, day")
        .eq("trainer_id", trainerId)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      if (error) throw error;

      // Group by day
      const map = {};
      (data || []).forEach((b) => {
        if (!map[b.day]) map[b.day] = [];
        map[b.day].push({ time_slot: b.time_slot, member_id: b.member_id });
      });
      setBookedSlotsMap(map);
    } catch (err) {
      console.error("Error fetching booked slots:", err);
      setBookedSlotsMap({});
    } finally {
      setFetchingSlots(false);
    }
  };

  const handleSave = async () => {
    if (!selectedTrainerId || !memberId || !selectedGym?.id) return;

    // Validate day and slot selection
    const selectedTrainer = trainers.find((t) => t.id === selectedTrainerId);
    const totalSelectedSlots = Object.values(selectedSlots).flat().length;
    if (selectedTrainer?.availableDays?.length > 0) {
      if (totalSelectedSlots === 0) {
        showError("Please select at least one day and time slot");
        return;
      }
    }

    if (currentTrainerId && currentTrainerId !== selectedTrainerId && !showWarning) {
      setShowWarning(true);
      return;
    }

    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const assignedBy = authData?.user?.id;

      // 1. Deactivate existing trainer assignments for this member
      await supabase
        .from("trainer_member_assignments")
        .update({ is_active: false })
        .eq("member_id", memberId)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      // 2. Upsert the trainer-member assignment
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

      // 3. Handle bookings if slots selected (multi-day, multi-slot)
      if (totalSelectedSlots > 0) {
        // Deactivate all existing bookings for this member at this gym
        await supabase
          .from("trainer_bookings")
          .update({ is_active: false })
          .eq("member_id", memberId)
          .eq("gym_id", selectedGym.id)
          .eq("is_active", true);

        // Build booking rows for all selected day+slot combos
        const bookingRows = [];
        for (const [day, slots] of Object.entries(selectedSlots)) {
          for (const slot of slots) {
            bookingRows.push({
              trainer_id: selectedTrainerId,
              member_id: memberId,
              gym_id: selectedGym.id,
              day,
              time_slot: slot,
              is_active: true,
            });
          }
        }

        // Check for conflicts on all selected slots
        for (const row of bookingRows) {
          const { data: conflict } = await supabase
            .from("trainer_bookings")
            .select("id")
            .eq("trainer_id", row.trainer_id)
            .eq("gym_id", row.gym_id)
            .eq("day", row.day)
            .eq("time_slot", row.time_slot)
            .eq("is_active", true)
            .maybeSingle();

          if (conflict) {
            showError(`${row.day} ${row.time_slot} was just booked. Please deselect it and try again.`);
            await fetchAllBookedSlots(selectedTrainerId);
            setLoading(false);
            return;
          }
        }

        // Insert all bookings
        const { error: bookingError } = await supabase
          .from("trainer_bookings")
          .insert(bookingRows);

        if (bookingError) {
          if (bookingError.code === "23505") {
            showError("One or more slots were just booked. Please refresh and try again.");
            await fetchAllBookedSlots(selectedTrainerId);
            setLoading(false);
            return;
          }
          throw bookingError;
        }
      }

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

      // Also deactivate any booking
      await supabase
        .from("trainer_bookings")
        .update({ is_active: false })
        .eq("member_id", memberId)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      showSuccess("Trainer removed successfully!");
      setSelectedTrainerId(null);
      setActiveDay("");
      setSelectedSlots({});
      setCurrentBooking(null);
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

  // Get available slots for selected trainer
  const trainerDays = selectedTrainer?.availableDays || [];
  const activeDaySlots = activeDay
    ? (selectedTrainer?.availableTimeSlots?.[activeDay] || [])
    : [];
  // Booked slots for the active day (by others)
  const activeDayBooked = (bookedSlotsMap[activeDay] || [])
    .filter((b) => b.member_id !== memberId)
    .map((b) => b.time_slot);
  // This member's existing slots for active day
  const memberExistingSlots = (bookedSlotsMap[activeDay] || [])
    .filter((b) => b.member_id === memberId)
    .map((b) => b.time_slot);

  // Total selections count for summary
  const totalSelections = Object.entries(selectedSlots)
    .filter(([, slots]) => slots.length > 0)
    .reduce((sum, [, slots]) => sum + slots.length, 0);

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
              <p className="text-blue-100 text-sm opacity-90">Select trainer & schedule</p>
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
        <div className="bg-white flex-1 overflow-y-auto">
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
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {currentTrainer.phone && (
                        <p className="text-gray-600 text-sm flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {currentTrainer.phone}
                        </p>
                      )}
                      {currentTrainer.cost != null && (
                        <p className="text-green-700 text-sm font-medium flex items-center gap-1">
                          <IndianRupee className="w-3.5 h-3.5" />
                          {formatTrainerCost(currentTrainer.cost)}
                        </p>
                      )}
                    </div>
                    {currentBooking && Array.isArray(currentBooking) && currentBooking.length > 0 && (
                      <div className="text-blue-600 text-xs mt-1 flex items-center gap-1 flex-wrap">
                        <CalendarDays className="w-3 h-3" />
                        {currentBooking.map((b, i) => (
                          <span key={i}>{b.day} · {b.time_slot}{i < currentBooking.length - 1 ? ' | ' : ''}</span>
                        ))}
                      </div>
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
                      onClick={() => {
                        if (loading) return;
                        setSelectedTrainerId(trainer.id);
                        setActiveDay("");
                        setSelectedSlots({});
                      }}
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
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {trainer.phone && (
                              <p className="text-gray-600 text-xs flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {trainer.phone}
                              </p>
                            )}
                            {trainer.cost != null && (
                              <p className="text-green-700 text-xs font-semibold flex items-center gap-0.5">
                                <IndianRupee className="w-3 h-3" />
                                {formatTrainerCost(trainer.cost)}
                              </p>
                            )}
                          </div>
                          {trainer.availableDays?.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">
                              {trainer.availableDays.map((d) => (
                                <span key={d} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded font-medium">
                                  {d.slice(0, 3)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

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

          {/* Day & Slot Selection (only if trainer has schedule) */}
          {selectedTrainer && trainerDays.length > 0 && (
            <div className="px-5 pb-5 space-y-4">
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Select Schedule
                  {totalSelections > 0 && (
                    <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {totalSelections} slot{totalSelections > 1 ? 's' : ''} selected
                    </span>
                  )}
                </h3>

                {/* Day Tabs */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Day
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {trainerDays.map((day) => {
                      const dayCount = (selectedSlots[day] || []).length;
                      const isActive = activeDay === day;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setActiveDay(isActive ? "" : day)}
                          disabled={loading}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 relative ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-sm'
                              : dayCount > 0
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          } disabled:opacity-50`}
                        >
                          {day.slice(0, 3)}
                          {dayCount > 0 && (
                            <span className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${
                              isActive ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                            }`}>
                              {dayCount}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slot Grid */}
                {activeDay && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Time Slots — {activeDay}
                      <span className="text-gray-400 ml-1">(tap to toggle)</span>
                    </label>

                    {fetchingSlots ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        <span className="ml-2 text-sm text-gray-500">Checking availability...</span>
                      </div>
                    ) : activeDaySlots.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-xl">
                        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No slots configured for {activeDay}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {activeDaySlots.map((slot) => {
                          const isBooked = activeDayBooked.includes(slot);
                          const isMemberSlot = memberExistingSlots.includes(slot);
                          const isSlotSelected = (selectedSlots[activeDay] || []).includes(slot);

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBooked || loading}
                              onClick={() => {
                                setSelectedSlots(prev => {
                                  const daySlots = prev[activeDay] || [];
                                  const updated = daySlots.includes(slot)
                                    ? daySlots.filter(s => s !== slot)
                                    : [...daySlots, slot];
                                  return { ...prev, [activeDay]: updated };
                                });
                              }}
                              className={`
                                px-2 py-2 rounded-lg text-xs font-medium transition-all duration-150 text-center
                                ${isBooked
                                  ? 'bg-red-50 text-red-300 border border-red-100 cursor-not-allowed line-through'
                                  : isSlotSelected
                                    ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                                    : isMemberSlot
                                      ? 'bg-green-50 text-green-700 border-2 border-green-300 hover:bg-green-100'
                                      : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                }
                              `}
                              title={isBooked ? "Already booked" : isMemberSlot ? "Your current slot" : "Available"}
                            >
                              {slot}
                              {isBooked && (
                                <span className="block text-[9px] text-red-400 mt-0.5">Booked</span>
                              )}
                              {isMemberSlot && !isSlotSelected && (
                                <span className="block text-[9px] text-green-600 mt-0.5">Your slot</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-white border border-gray-200" /> Available
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200" /> Booked
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Selected
                      </span>
                    </div>
                  </div>
                )}

                {/* Selected Slots Summary */}
                {totalSelections > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs font-semibold text-blue-800 mb-1.5">Selected Schedule:</p>
                    <div className="space-y-1">
                      {Object.entries(selectedSlots)
                        .filter(([, slots]) => slots.length > 0)
                        .map(([day, slots]) => (
                          <p key={day} className="text-xs text-blue-700">
                            <span className="font-medium">{day}:</span> {slots.join(', ')}
                          </p>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
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
                      {totalSelections > 0 && (
                        <span className="block mt-1">
                          New schedule: {Object.entries(selectedSlots)
                            .filter(([, s]) => s.length > 0)
                            .map(([d, s]) => `${d} (${s.join(', ')})`)
                            .join(' · ')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowWarning(false);
                    setSelectedTrainerId(currentTrainerId);
                    setActiveDay("");
                    setSelectedSlots({});
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
              <div className={`flex gap-3 ${currentTrainerId ? 'order-1 sm:order-2' : ''} flex-1`}>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl font-medium hover:from-gray-200 hover:to-gray-300 transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={
                    loading ||
                    !selectedTrainerId ||
                    selectedTrainerId === currentTrainerId ||
                    (trainerDays.length > 0 && totalSelections === 0)
                  }
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