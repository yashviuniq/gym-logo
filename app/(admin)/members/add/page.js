"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import { useToast } from "@/contexts/ToastContext";

export default function AddMemberPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
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
        const transformedPlans = plans?.map((plan) => ({
          id: plan.id,
          name: plan.name,
          duration: `${plan.duration_days} Days`,
          duration_days: plan.duration_days, // Keep duration_days for calculation
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
      showError("No gym selected. Please go back to dashboard.");
      return;
    }

    setLoading(true);
    try {
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
        showError(`A member with phone number ${formData.phone} already exists: ${existingMember.full_name}. Please use a different phone number or edit the existing member.`);
        setLoading(false);
        return;
      }

      const selectedPlan = membershipPlans.find((p) => p.id === formData.planId);
      const finalPrice = formData.useCustomPrice && formData.customPrice 
        ? parseFloat(formData.customPrice) 
        : selectedPlan?.price;
      const paymentAmount = parseFloat(formData.paymentAmount);
      const balanceOwed = finalPrice - paymentAmount;

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
          balance: Math.max(0, balanceOwed),
          created_by: createdBy,
        })
        .select()
        .single();

      if (memberError) {
        throw memberError;
      }

      // 2. Calculate membership end date using duration_days from the plan
      const startDate = new Date(formData.startDate);
      
      if (!selectedPlan) {
        throw new Error("Selected plan not found");
      }
      
      // Use duration_days from the plan - must be set in database
      if (!selectedPlan.duration_days || selectedPlan.duration_days <= 0) {
        throw new Error(`Invalid duration for plan "${selectedPlan.name}". Please ensure the plan has a valid duration_days value in the database.`);
      }
      
      const durationDays = selectedPlan.duration_days;
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
            mode: formData.payment_mode,
            status: "paid",
            notes: formData.notes || null,
            updated_by: createdBy,
          });

        if (paymentError) {
          console.error("Payment error:", paymentError);
        }
      }

      // 5. Create member credentials for app login using phone number only
      const defaultPassword = formData.phone.slice(-4) + "123";
      try {
        await supabase
          .from("member_credentials")
          .insert({
            member_id: member.id,
            login_type: "phone",
            login_value: formData.phone,
            password: defaultPassword,
            created_by: createdBy,
          });
      } catch (credError) {
        console.log("Credentials creation skipped:", credError);
      }

      showSuccess(`Member added successfully! Login: ${formData.phone} | Password: ${defaultPassword}`);
      
      if (addAnother) {
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
      showError("Failed to add member. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header title="Add New Member" />

      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        {/* Progress Steps - Made smaller */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s
                      ? step === s
                        ? "bg-[#F97316] text-white shadow-md"
                        : "bg-emerald-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step > s ? "✓" : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      step > s ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          <div className="flex justify-between px-1 text-xs">
            <span className={`font-medium ${step >= 1 ? "text-[#F97316]" : "text-gray-500"}`}>
              Personal
            </span>
            <span className={`font-medium ${step >= 2 ? "text-[#F97316]" : "text-gray-500"}`}>
              Plan
            </span>
            <span className={`font-medium ${step >= 3 ? "text-[#F97316]" : "text-gray-500"}`}>
              Payment
            </span>
          </div>
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-16"> {/* Added mb-16 for bottom spacing */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#F97316]/10 to-[#FF8C42]/10 rounded-lg flex items-center justify-center">
                <span className="text-[#F97316] text-lg">👤</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Personal Information</h3>
                <p className="text-xs text-gray-500">Enter basic details</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all placeholder:text-gray-400"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value;
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">📱</span>
                  <input
                    type="tel"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all placeholder:text-gray-400"
                    placeholder="Enter 10-digit phone"
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
                </div>
                <p className="text-xs text-gray-500 mt-1">10 digits only</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">✉️</span>
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all placeholder:text-gray-400"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => updateForm("email", e.target.value.toLowerCase().trim())}
                    title="Please enter a valid email address"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Optional - for app login</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all text-sm"
                    value={formData.gender}
                    onChange={(e) => updateForm("gender", e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all placeholder:text-gray-400 text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none resize-none transition-all placeholder:text-gray-400 text-sm"
                  rows={2}
                  placeholder="Enter address"
                  value={formData.address}
                  onChange={(e) => updateForm("address", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Emergency Contact
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">🚨</span>
                  <input
                    type="tel"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all placeholder:text-gray-400"
                    placeholder="Emergency contact number"
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
                </div>
                <p className="text-xs text-gray-500 mt-1">Optional - 10 digits only</p>
              </div>
            </div>

            {/* Next Button - Fixed position above bottom nav */}
            <div className="mt-6 mb-2"> {/* Reduced margin-top */}
              <button
                onClick={() => {
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
                className="w-full py-3.5 bg-gradient-to-r from-[#F97316] to-[#FF8C42] text-white font-medium rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next: Select Plan
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Plan */}
        {step === 2 && (
          <div className="space-y-4 mb-16"> {/* Added mb-16 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-lg">📋</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Select Membership Plan</h3>
                  <p className="text-xs text-gray-500">Choose a plan for the member</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {membershipPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => {
                      updateForm("planId", plan.id);
                      updateForm("customPrice", plan.price.toString());
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${formData.planId === plan.id
                      ? "border-[#F97316] bg-gradient-to-r from-[#F97316]/5 to-[#FF8C42]/5"
                      : "border-gray-200 hover:border-gray-300"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{plan.name}</p>
                        <p className="text-xs text-gray-500">{plan.duration}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">₹{plan.price}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formData.planId && (
                <div className="mb-4 p-3 bg-gradient-to-r from-[#F97316]/5 to-[#FF8C42]/5 rounded-lg border border-[#F97316]/20">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium text-gray-900">Custom Price</span>
                      <p className="text-xs text-gray-600">Set custom price for this membership</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateForm("useCustomPrice", !formData.useCustomPrice)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full ${formData.useCustomPrice ? "bg-[#F97316]" : "bg-gray-300"
                        }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${formData.useCustomPrice ? "translate-x-5" : "translate-x-0.5"
                          }`}
                      />
                    </button>
                  </div>

                  {formData.useCustomPrice && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Price (₹)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 bg-white border border-[#F97316]/30 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none text-sm font-medium transition-all"
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
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Original price: ₹{selectedPlan?.price}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none transition-all text-sm"
                  value={formData.startDate}
                  onChange={(e) => updateForm("startDate", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (!formData.planId) {
                    alert("Please select a membership plan");
                    return;
                  }
                  
                  if (formData.useCustomPrice) {
                    const customPrice = parseFloat(formData.customPrice);
                    if (!formData.customPrice || isNaN(customPrice) || customPrice <= 0) {
                      alert("Please enter a valid custom price");
                      return;
                    }
                  }
                  
                  const totalPrice = formData.useCustomPrice && formData.customPrice 
                    ? formData.customPrice 
                    : selectedPlan?.price;
                  if (!formData.paymentAmount) {
                    updateForm("paymentAmount", totalPrice.toString());
                  }
                  setStep(3);
                }}
                disabled={!formData.planId}
                className="flex-1 py-3 bg-gradient-to-r from-[#F97316] to-[#FF8C42] text-white font-medium rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Next: Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="space-y-4 mb-16"> {/* Added mb-16 */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-50 to-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-lg">💰</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Payment Details</h3>
                  <p className="text-xs text-gray-500">Complete the payment</p>
                </div>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Plan</span>
                  <span className="font-medium text-gray-900">{selectedPlan?.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Duration</span>
                  <span className="font-medium text-gray-900">{selectedPlan?.duration}</span>
                </div>
                {formData.useCustomPrice && (
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Original Price</span>
                    <span className="font-medium line-through text-gray-400">
                      ₹{selectedPlan?.price}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="font-medium text-gray-900">
                    Total Amount
                  </span>
                  <span className="text-lg font-bold text-gray-900">
                    ₹{formData.useCustomPrice && formData.customPrice
                      ? formData.customPrice
                      : selectedPlan?.price}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none font-medium transition-all"
                  placeholder="Enter amount"
                  value={formData.paymentAmount}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value >= 0 || e.target.value === '') {
                      updateForm("paymentAmount", e.target.value);
                    }
                  }}
                />
              </div>

              {formData.paymentAmount &&
                formData.paymentAmount < (formData.useCustomPrice && formData.customPrice
                  ? parseFloat(formData.customPrice)
                  : selectedPlan?.price) && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-medium text-amber-700">
                      ⚠️ Partial Payment: ₹{formData.paymentAmount}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      Remaining due: ₹
                      {(formData.useCustomPrice && formData.customPrice
                        ? parseFloat(formData.customPrice)
                        : selectedPlan?.price) - parseFloat(formData.paymentAmount)}
                    </p>
                  </div>
                )}
              {formData.paymentAmount && parseFloat(formData.paymentAmount) === (formData.useCustomPrice && formData.customPrice ? parseFloat(formData.customPrice) : selectedPlan?.price) && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-700">
                    ✅ Full payment received
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Mode
                </label>
                <div className="flex gap-2">
                  {["cash", "upi", "card"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => updateForm("paymentMode", mode)}
                      className={`flex-1 py-2 text-sm font-medium capitalize rounded-lg transition ${formData.paymentMode === mode
                        ? "bg-gray-800 text-white"
                        : "bg-gray-100 text-gray-600"
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#F97316] focus:border-[#F97316] outline-none resize-none transition-all placeholder:text-gray-400 text-sm"
                  rows={2}
                  placeholder="Any additional notes..."
                  value={formData.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={!formData.paymentAmount || loading}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? "Saving..." : "Save Member"}
                </button>
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={!formData.paymentAmount || loading}
                  className="flex-1 py-3 bg-gradient-to-r from-[#F97316] to-[#FF8C42] text-white font-medium rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? "Saving..." : "Save & Add Another"}
                </button>
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all duration-200"
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