"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import {
  Search,
  User,
  Phone,
  CheckCircle,
  Circle,
  UserPlus,
  Users,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Save
} from "lucide-react";

export default function AssignMembersPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [trainer, setTrainer] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [assignedMemberIds, setAssignedMemberIds] = useState(new Set());
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [memberTrainerMap, setMemberTrainerMap] = useState({}); // Maps member_id to trainer name

  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      setSelectedGym(JSON.parse(storedGym));
    }
  }, []);

  useEffect(() => {
    if (id && selectedGym?.id) {
      fetchData();
    }
  }, [id, selectedGym?.id]);

  const fetchData = async () => {
    if (!selectedGym?.id || !id) return;
    setLoading(true);

    try {
      // Fetch trainer details
      const { data: trainerData, error: trainerError } = await supabase
        .from("gym_trainers")
        .select(`
          id,
          profile_id,
          profiles:profile_id (
            first_name,
            last_name
          )
        `)
        .eq("id", id)
        .eq("gym_id", selectedGym.id)
        .single();

      if (trainerError) throw trainerError;

      setTrainer({
        id: trainerData.id,
        profileId: trainerData.profile_id,
        name: `${trainerData.profiles?.first_name || ""} ${trainerData.profiles?.last_name || ""}`.trim()
      });

      // Fetch all members in the gym
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select(`
          id,
          full_name,
          phone,
          profile_image,
          memberships (
            status,
            end_date
          )
        `)
        .eq("gym_id", selectedGym.id)
        .order("full_name", { ascending: true });

      if (membersError) throw membersError;

      setAllMembers(membersData?.map(m => ({
        id: m.id,
        name: m.full_name,
        phone: m.phone,
        profileImage: m.profile_image,
        status: m.memberships?.[0]?.status || "inactive"
      })) || []);

      // Fetch already assigned members to this trainer
      const { data: assignmentsData } = await supabase
        .from("trainer_member_assignments")
        .select("member_id")
        .eq("trainer_id", trainerData.profile_id)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      const assigned = new Set(assignmentsData?.map(a => a.member_id) || []);
      setAssignedMemberIds(assigned);
      setSelectedMembers(new Set(assigned));

      // Fetch ALL active trainer assignments to show which members are assigned to which trainers
      const { data: allAssignments } = await supabase
        .from("trainer_member_assignments")
        .select(`
          member_id,
          trainer_id,
          profiles:trainer_id (first_name, last_name)
        `)
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      // Create a map of member_id -> trainer name (for trainers OTHER than current one)
      const trainerMap = {};
      if (allAssignments) {
        allAssignments.forEach(a => {
          if (a.trainer_id !== trainerData.profile_id) {
            const trainerName = `${a.profiles?.first_name || ''} ${a.profiles?.last_name || ''}`.trim() || 'Unknown Trainer';
            if (!trainerMap[a.member_id]) {
              trainerMap[a.member_id] = [];
            }
            trainerMap[a.member_id].push(trainerName);
          }
        });
      }
      setMemberTrainerMap(trainerMap);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (memberId) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const filtered = filteredMembers.map(m => m.id);
    setSelectedMembers(new Set([...selectedMembers, ...filtered]));
  };

  const deselectAll = () => {
    const filtered = new Set(filteredMembers.map(m => m.id));
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      filtered.forEach(id => newSet.delete(id));
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!trainer?.profileId || !selectedGym?.id) return;

    // Find newly added and removed members
    const newAssignments = [...selectedMembers].filter(id => !assignedMemberIds.has(id));
    const removedAssignments = [...assignedMemberIds].filter(id => !selectedMembers.has(id));

    // Check if any of the new assignments are already assigned to other trainers
    const membersWithOtherTrainers = newAssignments.filter(memberId => 
      memberTrainerMap[memberId] && memberTrainerMap[memberId].length > 0
    );

    if (membersWithOtherTrainers.length > 0) {
      const memberNames = membersWithOtherTrainers
        .map(id => {
          const member = allMembers.find(m => m.id === id);
          const trainers = memberTrainerMap[id];
          return `• ${member?.name} (currently assigned to ${trainers.join(', ')})`;
        })
        .join('\n');

      const confirmed = window.confirm(
        `⚠️ Warning: The following members are already assigned to other trainers:\n\n${memberNames}\n\n` +
        `Proceeding will remove them from their current trainers and assign them to ${trainer.name}.\n\n` +
        `Do you want to continue?`
      );

      if (!confirmed) return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: authData } = await supabase.auth.getUser();
      const assignedBy = authData?.user?.id;

      // CRITICAL: For new assignments, first deactivate ALL existing assignments for those members
      if (newAssignments.length > 0) {
        // Deactivate all existing active assignments for these members
        await supabase
          .from("trainer_member_assignments")
          .update({ is_active: false })
          .eq("gym_id", selectedGym.id)
          .in("member_id", newAssignments)
          .eq("is_active", true);

        // Then create new assignments
        const assignmentsToInsert = newAssignments.map(memberId => ({
          gym_id: selectedGym.id,
          trainer_id: trainer.profileId,
          member_id: memberId,
          assigned_by: assignedBy,
          is_active: true
        }));

        const { error: insertError } = await supabase
          .from("trainer_member_assignments")
          .upsert(assignmentsToInsert, {
            onConflict: "gym_id,member_id,trainer_id"
          });

        if (insertError) throw insertError;
      }

      // Deactivate removed assignments
      if (removedAssignments.length > 0) {
        const { error: updateError } = await supabase
          .from("trainer_member_assignments")
          .update({ is_active: false })
          .eq("trainer_id", trainer.profileId)
          .eq("gym_id", selectedGym.id)
          .in("member_id", removedAssignments);

        if (updateError) throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/settings/trainers/${id}`);
      }, 1000);
    } catch (err) {
      console.error("Error saving assignments:", err);
      setError("Failed to save assignments");
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = allMembers.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.phone?.includes(searchQuery)
  );

  const hasChanges = 
    [...selectedMembers].some(id => !assignedMemberIds.has(id)) ||
    [...assignedMemberIds].some(id => !selectedMembers.has(id));

  const newAssignmentsCount = [...selectedMembers].filter(id => !assignedMemberIds.has(id)).length;
  const removedCount = [...assignedMemberIds].filter(id => !selectedMembers.has(id)).length;

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Members Updated!</h2>
          <p className="text-gray-500">Redirecting back...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Assign Members" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <Header title={`Assign to ${trainer?.name || "Trainer"}`} />

      <main className={`px-4 py-4 space-y-4 ${hasChanges ? 'pb-40' : 'pb-4'}`}>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">
                {selectedMembers.size} member{selectedMembers.size !== 1 ? "s" : ""} selected
              </h3>
              <p className="text-sm text-gray-500">
                {allMembers.length} total members in gym
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>

        {/* Members List */}
        <div className="space-y-2">
          {filteredMembers.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">No Members Found</h3>
              <p className="text-gray-500 text-sm">
                {searchQuery ? "Try a different search term" : "No members in this gym yet"}
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isSelected = selectedMembers.has(member.id);
              const wasAlreadyAssigned = assignedMemberIds.has(member.id);
              const assignedToOtherTrainers = memberTrainerMap[member.id];

              return (
                <div
                  key={member.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMember(member.id);
                  }}
                  className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer transition-all ${
                    isSelected 
                      ? "ring-2 ring-blue-500 bg-blue-50" 
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isSelected 
                        ? "bg-blue-600" 
                        : "border-2 border-gray-300"
                    }`}>
                      {isSelected && <CheckCircle className="w-5 h-5 text-white" />}
                    </div>

                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {member.profileImage ? (
                        <img src={member.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-gray-900 truncate">{member.name}</h4>
                        {wasAlreadyAssigned && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Assigned
                          </span>
                        )}
                        {assignedToOtherTrainers && assignedToOtherTrainers.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Assigned to {assignedToOtherTrainers.join(", ")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone className="w-3 h-3" />
                        <span>{member.phone}</span>
                        <span className={`px-1.5 py-0.5 rounded-full ${
                          member.status === "active" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {member.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Fixed Bottom Save Button */}
      {hasChanges && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-8 pointer-events-none">
          <div className="max-w-screen-md mx-auto">
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 pointer-events-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">
                  {newAssignmentsCount > 0 && (
                    <span className="text-green-600 mr-2">
                      +{newAssignmentsCount} new
                    </span>
                  )}
                  {removedCount > 0 && (
                    <span className="text-red-600">
                      -{removedCount} removed
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Assignments
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
