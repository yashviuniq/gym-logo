"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import Card from "@/components/shared/Card";

export default function AnnouncementsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      fetchAnnouncements(gym.id);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchAnnouncements = async (gymId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnnouncements = announcements.filter((announcement) => {
    const matchesSearch =
      announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      announcement.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      filterStatus === "all" || announcement.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (selectedGym) {
        fetchAnnouncements(selectedGym.id);
      }
    } catch (error) {
      console.error("Error deleting announcement:", error);
      alert("Failed to delete announcement");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const { error } = await supabase
        .from("announcements")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      if (selectedGym) {
        fetchAnnouncements(selectedGym.id);
      }
    } catch (error) {
      console.error("Error updating announcement status:", error);
      alert("Failed to update announcement status");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No expiry";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Announcements" showBack={false} />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Announcements" showBack={false} />

      <main className="px-4 py-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card padding="md" className="bg-blue-50">
            <p className="text-blue-600 text-sm">Total</p>
            <p className="text-2xl font-bold text-blue-700">
              {announcements.length}
            </p>
          </Card>
          <Card padding="md" className="bg-green-50">
            <p className="text-green-600 text-sm">Active</p>
            <p className="text-2xl font-bold text-green-700">
              {announcements.filter((a) => a.status === "active").length}
            </p>
          </Card>
          <Card padding="md" className="bg-gray-50">
            <p className="text-gray-600 text-sm">Inactive</p>
            <p className="text-2xl font-bold text-gray-700">
              {announcements.filter((a) => a.status === "inactive").length}
            </p>
          </Card>
        </div>

        {/* Search and Add Button */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search announcements..."
              className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#F97316]/50 focus:border-[#F97316]/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
          </div>
          <button
            onClick={() => router.push("/announcements/add")}
            className="px-6 py-3 bg-[#F97316] text-white rounded-xl font-semibold hover:bg-[#F97316]/90 transition shadow-md"
          >
            + Add
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {["all", "active", "inactive"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filterStatus === status
                  ? "btn-gradient-orange text-white shadow-md"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-[#F97316]/30"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Announcements List */}
        <div className="space-y-3">
          {filteredAnnouncements.length === 0 ? (
            <Card padding="md" className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No announcements found</p>
              <button
                onClick={() => router.push("/announcements/add")}
                className="text-[#F97316] font-medium"
              >
                Create your first announcement
              </button>
            </Card>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <Card
                key={announcement.id}
                padding="md"
                className="hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {announcement.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            announcement.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {announcement.status}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {announcement.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                      <span>📅 {formatDate(announcement.announced_at)}</span>
                      {announcement.expires_at && (
                        <span>⏰ Expires: {formatDate(announcement.expires_at)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() =>
                        router.push(`/announcements/${announcement.id}`)
                      }
                      className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/announcements/${announcement.id}/edit`)
                      }
                      className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        handleToggleStatus(announcement.id, announcement.status)
                      }
                      className="flex-1 py-2 bg-yellow-50 text-yellow-600 rounded-lg font-medium hover:bg-yellow-100 transition text-sm"
                    >
                      {announcement.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

