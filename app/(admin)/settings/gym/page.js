"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/contexts/ToastContext";

export default function GymSettingsPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [gymId, setGymId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    weekdayOpen: "05:00",
    weekdayClose: "23:00",
    weekendOpen: "06:00",
    weekendClose: "22:00",
    qrEnabled: true,
    qrType: "dynamic",
  });

  useEffect(() => {
    fetchGymData();
  }, []);

  const fetchGymData = async () => {
    try {
      setFetching(true);
      
      // Get gym ID from localStorage
      const storedGym = localStorage.getItem("selectedGym");
      if (!storedGym) {
        console.error("No gym selected");
        router.push("/admin/dashboard");
        return;
      }

      const gym = JSON.parse(storedGym);
      setGymId(gym.id);

      // Fetch gym data from database
      const { data: gymData, error } = await supabase
        .from("gyms")
        .select("*")
        .eq("id", gym.id)
        .single();

      if (error) throw error;

      if (gymData) {
        setFormData({
          name: gymData.name || "",
          address: gymData.address || "",
          phone: gymData.phone || "",
          email: gymData.email || "",
          website: gymData.website || "",
          weekdayOpen: gymData.weekday_open || "05:00",
          weekdayClose: gymData.weekday_close || "23:00",
          weekendOpen: gymData.weekend_open || "06:00",
          weekendClose: gymData.weekend_close || "22:00",
          qrEnabled: gymData.qr_enabled !== null ? gymData.qr_enabled : true,
          qrType: gymData.qr_type || "dynamic",
        });
      }
    } catch (error) {
      console.error("Error fetching gym data:", error);
      showError("Failed to load gym settings");
    } finally {
      setFetching(false);
    }
  };

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gymId) return;

    // Validate phone number if provided
    if (formData.phone && formData.phone.trim() !== '') {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        showError("Please enter a valid 10-digit phone number");
        return;
      }
    }

    // Validate email format if provided
    if (formData.email && formData.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        showError("Please enter a valid email address");
        return;
      }
    }

    setLoading(true);
    try {
      // Check if gym name already exists (excluding current gym)
      const { data: existingGym, error: checkError } = await supabase
        .from("gyms")
        .select("id, name")
        .eq("name", formData.name.trim())
        .neq("id", gymId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is what we want
        throw checkError;
      }

      if (existingGym) {
        showError("Gym name already exists. Please choose a different name.");
        setLoading(false);
        return;
      }
      // Get current user for updated_by
      const storedUser = localStorage.getItem("gymUser");
      const user = storedUser ? JSON.parse(storedUser) : null;

      // Clean phone number (remove non-digits)
      const cleanPhone = formData.phone ? formData.phone.replace(/\D/g, '') : null;

      const { error } = await supabase
        .from("gyms")
        .update({
          name: formData.name,
          address: formData.address,
          phone: cleanPhone || null,
          email: formData.email?.trim() || null,
          website: formData.website?.trim() || null,
          weekday_open: formData.weekdayOpen,
          weekday_close: formData.weekdayClose,
          weekend_open: formData.weekendOpen,
          weekend_close: formData.weekendClose,
          qr_enabled: formData.qrEnabled,
          qr_type: formData.qrType,
          updated_by: user?.id || null,
        })
        .eq("id", gymId);

      if (error) throw error;

      // Update localStorage with new gym name
      const storedGym = localStorage.getItem("selectedGym");
      if (storedGym) {
        const gym = JSON.parse(storedGym);
        gym.name = formData.name;
        localStorage.setItem("selectedGym", JSON.stringify(gym));
      }

      showSuccess("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving gym settings:", error);
      showError("Failed to save settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Gym Settings" showBack={true} />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Gym Settings" showBack={true} />

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Basic Info */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">Basic Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gym Name *
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"
              value={formData.name}
              onChange={(e) => updateForm("name", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none resize-none"
              rows={2}
              value={formData.address}
              onChange={(e) => updateForm("address", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#F97316]/50 focus:border-[#F97316]/50"
                placeholder="Enter 10-digit phone number"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 10) {
                    updateForm("phone", value);
                  }
                }}
                pattern="[0-9]{10}"
                maxLength="10"
                title="Please enter a valid 10-digit phone number"
              />
              <p className="text-xs text-gray-500 mt-1">Enter 10 digits only (optional)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#F97316]/50 focus:border-[#F97316]/50"
                placeholder="example@email.com"
                value={formData.email}
                onChange={(e) => updateForm("email", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Optional - for contact information</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"
              placeholder="https://"
              value={formData.website}
              onChange={(e) => updateForm("website", e.target.value)}
            />
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <h3 className="font-semibold text-gray-900">Operating Hours</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weekdays (Mon - Fri)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Opening</label>
                <input
                  type="time"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"
                  value={formData.weekdayOpen}
                  onChange={(e) => updateForm("weekdayOpen", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Closing</label>
                <input
                  type="time"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"
                  value={formData.weekdayClose}
                  onChange={(e) => updateForm("weekdayClose", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weekends (Sat - Sun)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500">Opening</label>
                <input
                  type="time"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"
                  value={formData.weekendOpen}
                  onChange={(e) => updateForm("weekendOpen", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Closing</label>
                <input
                  type="time"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none"
                  value={formData.weekendClose}
                  onChange={(e) => updateForm("weekendClose", e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Settings */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">QR Code Attendance</h3>
            <button
              type="button"
              onClick={() => updateForm("qrEnabled", !formData.qrEnabled)}
              className={`w-12 h-6 rounded-full transition ${
                formData.qrEnabled ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transition transform ${
                  formData.qrEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              ></div>
            </button>
          </div>

          {formData.qrEnabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["static", "dynamic"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateForm("qrType", type)}
                      className={`py-3 rounded-xl text-sm font-medium capitalize ${
                        formData.qrType === type
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formData.qrType === "dynamic"
                    ? "QR changes every 5 minutes for security"
                    : "Single QR code for all attendance"}
                </p>
              </div>

              {/* QR Preview */}
              <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center">
                <div className="w-32 h-32 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center mb-3">
                  <span className="text-4xl">📱</span>
                </div>
                <button
                  type="button"
                  className="text-sm text-blue-600 font-medium"
                >
                  Generate New QR
                </button>
              </div>
            </>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
