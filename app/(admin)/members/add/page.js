"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";

export default function AddMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedGym, setSelectedGym] = useState(null);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "Male",
    age: "",
    address: "",
    emergencyContact: "",
    planId: null,
    startDate: new Date().toISOString().split("T")[0],
    paymentAmount: "",
    paymentMode: "cash",
    notes: "",
    useCustomPrice: false,
    customPrice: "",
  });

  useEffect(() => {
    // Get selected gym from localStorage
    const storedGym = localStorage.getItem("selectedGym");
    if (storedGym) {
      const gym = JSON.parse(storedGym);
      setSelectedGym(gym);
      fetchMembershipPlans(gym.id);
    } else {
      setLoadingPlans(false);
    }
  }, []);

  const fetchMembershipPlans = async (gymId) => {
    setLoadingPlans(true);
    try {
      const { data: plans, error } = await supabase
        .from("membership_plans")
        .select("id, name, duration_days, price, is_active")
        .eq("gym_id", gymId)
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) {
        console.error("Error fetching plans:", error);
        setMembershipPlans([]);
      } else {
        // Transform duration_days to readable format
        const transformedPlans = plans?.map((plan) => ({
          id: plan.id,
          name: plan.name,
          duration: `${plan.duration_days} Days`,
          price: plan.price,
        })) || [];
        setMembershipPlans(transformedPlans);
      }
    } catch (err) {
      console.error("Error:", err);
      setMembershipPlans([]);
    }
    setLoadingPlans(false);
  };

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedPlan = membershipPlans.find((p) => p.id === formData.planId);

  // Show loading while plans are loading
  if (loadingPlans) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Add Member" />
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Show message if no gym selected
  if (!selectedGym) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Add Member" />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <span className="text-4xl">🏢</span>
            <p className="text-gray-500 mt-2">Please select a gym first</p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="mt-4 px-6 py-2 bg-[#F97316] text-white rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Show message if no membership plans available
  if (membershipPlans.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <Header title="Add Member" />
        <main className="px-4 py-4">
          <div className="text-center py-12">
            <span className="text-4xl">📋</span>
            <p className="text-gray-500 mt-2">No membership plans available</p>
            <p className="text-gray-400 text-sm">Please create membership plans first</p>
          </div>
        </main>
      </div>
    );
  }

  const handleSubmit = async (addAnother = false) => {
    if (!selectedGym) {
      alert("No gym selected. Please go back to dashboard.");
      return;
    }

    setLoading(true);
    try {
      // Check if member with same phone number already exists
      const { data: existingMember, error: checkError } = await supabase
        .from("members")
        .select("id, full_name")
        .eq("gym_id", selectedGym.id)
        .eq("phone", formData.phone)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing member:", checkError);
      }

      if (existingMember) {
        alert(`A member with phone number ${formData.phone} already exists: ${existingMember.full_name}. Please use a different phone number or edit the existing member.`);
        setLoading(false);
        return;
      }

      const selectedPlan = membershipPlans.find((p) => p.id === formData.planId);
      const finalPrice = formData.useCustomPrice && formData.customPrice 
        ? parseFloat(formData.customPrice) 
        : selectedPlan?.price;
      const paymentAmount = parseFloat(formData.paymentAmount);
      const balanceOwed = finalPrice - paymentAmount;

      // Get current user from localStorage for created_by
      const storedUser = localStorage.getItem("gymUser");
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const createdBy = currentUser?.id;

      // 1. Create member
      const { data: member, error: memberError } = await supabase
        .from("members")
        .insert({
          gym_id: selectedGym.id,
          full_name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          balance: Math.max(0, balanceOwed), // Only positive balances (amount owed)
          created_by: createdBy,
        })
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      // 2. Calculate membership end date
      const startDate = new Date(formData.startDate);
      const durationDays = membershipPlans.find(p => p.id === formData.planId)?.name === "Basic" ? 30 :
                          membershipPlans.find(p => p.id === formData.planId)?.name === "Standard" ? 90 :
                          membershipPlans.find(p => p.id === formData.planId)?.name === "Premium" ? 180 : 365;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);

      // 3. Create membership
      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          member_id: member.id,
          gym_id: selectedGym.id,
          plan_id: formData.planId,
          start_date: formData.startDate,
          end_date: endDate.toISOString().split('T')[0],
          status: "active",
          updated_by: createdBy,
        });

      if (membershipError) {
        throw membershipError;
      }

      // 4. Create payment record if payment was made
      if (paymentAmount > 0) {
        const { error: paymentError } = await supabase
          .from("payments")
          .insert({
            gym_id: selectedGym.id,
            member_id: member.id,
            amount: paymentAmount,
            mode: formData.paymentMode,
            status: "paid",
            notes: formData.notes || null,
            updated_by: createdBy,
          });

        if (paymentError) {
          console.error("Payment error:", paymentError);
          // Don't throw here as member is already created
        }
      }

      // 5. Create member credentials for app login (optional)
      const defaultPassword = formData.phone.slice(-4) + "123"; // Last 4 digits + 123
      try {
        await supabase
          .from("member_credentials")
          .insert({
            member_id: member.id,
            login_type: "email",
            login_value: formData.email || formData.phone,
            password: defaultPassword, // In production, hash this
            created_by: createdBy,
          });
      } catch (credError) {
        console.log("Credentials creation skipped:", credError);
      }

      alert(`Member added successfully! ${formData.email ? `Login: ${formData.email} | Password: ${defaultPassword}` : ''}`);
      
      if (addAnother) {
        // Reset form and go back to step 1
        setFormData({
          name: "",
          phone: "",
          email: "",
          gender: "Male",
          age: "",
          address: "",
          emergencyContact: "",
          planId: null,
          startDate: new Date().toISOString().split("T")[0],
          paymentAmount: "",
          paymentMode: "cash",
          notes: "",
          useCustomPrice: false,
          customPrice: "",
        });
        setStep(1);
      } else {
        router.push("/members");
      }

    } catch (error) {
      console.error("Error adding member:", error);
      alert("Failed to add member. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <Header title="Add Member" />

      {/* Progress Steps */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s
                  ? "bg-black text-white"
                  : "bg-gray-200 text-gray-500"
                  }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 h-1 mx-2 ${step > s ? "bg-black" : "bg-gray-200"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              Personal Information
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only letters and spaces
                  if (/^[a-zA-Z\s]*$/.test(value) || value === '') {
                    updateForm("name", value);
                  }
                }}
                pattern="[a-zA-Z\s]+"
                title="Please enter a valid name (letters and spaces only)"
                required
                minLength="2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
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
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter 10 digits only</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => updateForm("email", e.target.value.toLowerCase().trim())}
                title="Please enter a valid email address"
              />
              <p className="text-xs text-gray-500 mt-1">Optional - for app login</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Gender
                </label>
                <select
                  className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all duration-200 text-gray-900 bg-white"
                  value={formData.gender}
                  onChange={(e) => updateForm("gender", e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                  placeholder="Age"
                  value={formData.age}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (!isNaN(value) && parseInt(value) >= 0 && parseInt(value) <= 120)) {
                      updateForm("age", value);
                    }
                  }}
                  min="1"
                  max="120"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Address
              </label>
              <textarea
                className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none resize-none transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                rows={3}
                placeholder="Enter address"
                value={formData.address}
                onChange={(e) => updateForm("address", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Emergency Contact
              </label>
              <input
                type="tel"
                className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                placeholder="Emergency contact number (10 digits)"
                value={formData.emergencyContact}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 10) {
                    updateForm("emergencyContact", value);
                  }
                }}
                pattern="[0-9]{10}"
                maxLength="10"
              />
              <p className="text-xs text-gray-500 mt-1">Optional - 10 digits only</p>
            </div>

            <button
              onClick={() => {
                // Validate before moving to next step
                if (!formData.name || formData.name.trim().length < 2) {
                  alert("Please enter a valid name (at least 2 characters)");
                  return;
                }
                if (!formData.phone || formData.phone.length !== 10) {
                  alert("Please enter a valid 10-digit phone number");
                  return;
                }
                if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                  alert("Please enter a valid email address or leave it empty");
                  return;
                }
                setStep(2);
              }}
              disabled={!formData.name || !formData.phone}
              className="w-full py-3.5 bg-gradient-to-r from-[#F97316] to-[#FF8C42] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed mt-6 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Next: Select Plan
            </button>
          </div>
        )}

        {/* Step 2: Select Plan */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">
                Select Membership Plan
              </h3>

              <div className="space-y-3">
                {membershipPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => {
                      updateForm("planId", plan.id);
                      updateForm("customPrice", plan.price.toString());
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition ${formData.planId === plan.id
                      ? "border-black bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {plan.name}
                        </p>
                        <p className="text-sm text-gray-500">{plan.duration}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          ₹{plan.price}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom Price Option */}
              {formData.planId && (
                <div className="mt-4 bg-orange-50 rounded-xl p-4 space-y-3 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">Manual Price Override</span>
                      <p className="text-xs text-gray-600 mt-0.5">Set custom price for this membership</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateForm("useCustomPrice", !formData.useCustomPrice)}
                      className={`w-12 h-6 rounded-full transition ${formData.useCustomPrice ? "bg-[#F97316]" : "bg-gray-300"
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow transition transform ${formData.useCustomPrice ? "translate-x-6" : "translate-x-1"
                          }`}
                      ></div>
                    </button>
                  </div>

                  {formData.useCustomPrice && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Custom Price (₹) *
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3.5 border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none text-lg font-semibold transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                        placeholder="Enter custom price"
                        value={formData.customPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
                            updateForm("customPrice", value);
                          }
                        }}
                        min="0.01"
                        step="0.01"
                        required={formData.useCustomPrice}
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        Original price: ₹{selectedPlan?.price}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all duration-200 text-gray-900 bg-white"
                  value={formData.startDate}
                  onChange={(e) => updateForm("startDate", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={() => {
                  // Validate plan selection
                  if (!formData.planId) {
                    alert("Please select a membership plan");
                    return;
                  }
                  
                  // Validate custom price if enabled
                  if (formData.useCustomPrice) {
                    const customPrice = parseFloat(formData.customPrice);
                    if (!formData.customPrice || isNaN(customPrice) || customPrice <= 0) {
                      alert("Please enter a valid custom price");
                      return;
                    }
                  }
                  
                  // Auto-fill payment amount with total price when moving to step 3
                  const totalPrice = formData.useCustomPrice && formData.customPrice 
                    ? formData.customPrice 
                    : selectedPlan?.price;
                  if (!formData.paymentAmount) {
                    updateForm("paymentAmount", totalPrice.toString());
                  }
                  setStep(3);
                }}
                disabled={!formData.planId}
                className="flex-1 py-3.5 bg-gradient-to-r from-[#F97316] to-[#FF8C42] text-white rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Next: Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">
                Payment Details
              </h3>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-medium">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-medium">{selectedPlan?.duration}</span>
                </div>
                {formData.useCustomPrice && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Original Price</span>
                    <span className="font-medium line-through text-gray-400">
                      ₹{selectedPlan?.price}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-medium text-gray-900">
                    Total Amount
                  </span>
                  <span className="text-xl font-bold">
                    ₹{formData.useCustomPrice && formData.customPrice
                      ? formData.customPrice
                      : selectedPlan?.price}
                  </span>
                </div>
                {formData.useCustomPrice && (
                  <div className="mt-2 text-xs text-orange-600 bg-orange-100 rounded-lg p-2">
                    💡 Custom price applied
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Payment Amount *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white text-lg font-semibold"
                  placeholder="Enter amount"
                  value={formData.paymentAmount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value >= 0 || e.target.value === '') {
                      updateForm("paymentAmount", e.target.value);
                    }
                  }}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Full payment: ₹{formData.useCustomPrice && formData.customPrice
                    ? formData.customPrice
                    : selectedPlan?.price} {formData.paymentAmount && formData.paymentAmount < (formData.useCustomPrice && formData.customPrice ? parseFloat(formData.customPrice) : selectedPlan?.price) && "(Partial payment accepted)"}
                </p>
                {formData.paymentAmount &&
                  formData.paymentAmount < (formData.useCustomPrice && formData.customPrice
                    ? parseFloat(formData.customPrice)
                    : selectedPlan?.price) && (
                    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-700 font-medium">
                        ⚠️ Partial Payment: ₹{formData.paymentAmount}
                      </p>
                      <p className="text-sm text-orange-600 mt-1">
                        Remaining due: ₹
                        {(formData.useCustomPrice && formData.customPrice
                          ? parseFloat(formData.customPrice)
                          : selectedPlan?.price) - parseFloat(formData.paymentAmount)}
                      </p>
                    </div>
                  )}
                {formData.paymentAmount && parseFloat(formData.paymentAmount) === (formData.useCustomPrice && formData.customPrice ? parseFloat(formData.customPrice) : selectedPlan?.price) && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      ✅ Full payment received
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode
                </label>
                <div className="flex gap-2">
                  {["cash", "upi", "card"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateForm("paymentMode", mode)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition ${formData.paymentMode === mode
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-600"
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  className="w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none resize-none transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                  rows={3}
                  placeholder="Any additional notes..."
                  value={formData.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
               
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={!formData.paymentAmount || loading}
                  className="flex-1 py-3.5 bg-gradient-to-r from-[#F97316] to-[#FF8C42] text-white rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  {loading ? "Saving..." : "Save & Add Another"}
                </button>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 active:scale-[0.98] transition-all duration-200"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
