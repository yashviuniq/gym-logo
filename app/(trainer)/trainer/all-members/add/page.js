"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/layout/Header";
import { useToast } from "@/contexts/ToastContext";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  CreditCard, 
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Save,
  Plus,
  AlertTriangle,
  X
} from "lucide-react";

// Prevent scroll from changing number input values
const preventScrollChange = (e) => {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.blur();
  return false;
};

export default function TrainerAddMemberPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [gymId, setGymId] = useState(null);
  const [trainerId, setTrainerId] = useState(null);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "Male",
    age: "",
    planId: null,
    startDate: getTodayString(),
    paymentAmount: "",
    paymentMode: "cash",
    notes: "",
    useCustomPrice: false,
    customPrice: "",
    profileImage: null,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        
        if (!authData?.user) {
          router.push("/auth/login");
          return;
        }

        setTrainerId(authData.user.id);

        // Get gym association
        const { data: gymTrainerData } = await supabase
          .from("gym_trainers")
          .select("gym_id")
          .eq("profile_id", authData.user.id)
          .eq("is_active", true)
          .single();

        if (gymTrainerData) {
          setGymId(gymTrainerData.gym_id);
          await fetchMembershipPlans(gymTrainerData.gym_id);
        } else {
          setLoadingPlans(false);
        }
      } catch (err) {
        console.error("Error:", err);
        setLoadingPlans(false);
      }
    };

    init();
  }, [router]);

  const fetchMembershipPlans = async (gymId) => {
    setLoadingPlans(true);
    try {
      const { data: plans, error } = await supabase
        .from("membership_plans")
        .select("id, name, duration_days, price, is_active")
        .eq("gym_id", gymId)
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;
      
      const transformedPlans = plans?.map(plan => ({
        id: plan.id,
        name: plan.name,
        duration_days: plan.duration_days,
        price: plan.price,
      })) || [];

      setMembershipPlans(transformedPlans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      showError("Failed to load membership plans");
    }
    setLoadingPlans(false);
  };

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedPlan = membershipPlans.find(p => p.id === formData.planId);

  const handleSubmit = async () => {
    if (!gymId) {
      showError("No gym associated. Please contact admin.");
      return;
    }

    setLoading(true);
    try {
      // Check for existing member
      const { data: existingMember } = await supabase
        .from("members")
        .select("id, full_name")
        .eq("gym_id", gymId)
        .eq("phone", formData.phone)
        .maybeSingle();

      if (existingMember) {
        showError(`A member with phone ${formData.phone} already exists: ${existingMember.full_name}`);
        setLoading(false);
        return;
      }

      const finalPrice = formData.useCustomPrice && formData.customPrice 
        ? parseFloat(formData.customPrice) 
        : selectedPlan?.price;
      const paymentAmount = parseFloat(formData.paymentAmount) || 0;
      const balanceOwed = finalPrice - paymentAmount;

      // Upload profile image if provided
      let profileImageUrl = null;
      if (formData.profileImage && formData.profileImage.startsWith('data:')) {
        try {
          const response = await fetch(formData.profileImage);
          const blob = await response.blob();
          const fileExt = blob.type.split('/')[1];
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `profiles/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("member-images")
            .upload(filePath, blob, { cacheControl: "3600", upsert: false });

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("member-images")
              .getPublicUrl(filePath);
            profileImageUrl = urlData.publicUrl;
          }
        } catch (imgError) {
          console.error("Error processing image:", imgError);
        }
      }

      // Create member
      const { data: member, error: memberError } = await supabase
        .from("members")
        .insert({
          gym_id: gymId,
          full_name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          balance: Math.max(0, balanceOwed),
          created_by: trainerId,
          profile_image: profileImageUrl,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Create membership
      const startDate = new Date(formData.startDate + 'T00:00:00');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + selectedPlan.duration_days);

      const { error: membershipError } = await supabase
        .from("memberships")
        .insert({
          member_id: member.id,
          gym_id: gymId,
          plan_id: formData.planId,
          start_date: formData.startDate,
          end_date: endDate.toISOString().split('T')[0],
          status: "active",
          updated_by: trainerId,
        });

      if (membershipError) throw membershipError;

      // Create payment record
      if (paymentAmount > 0) {
        await supabase
          .from("payments")
          .insert({
            gym_id: gymId,
            member_id: member.id,
            amount: paymentAmount,
            payment_mode: formData.paymentMode,
            status: "paid",
            notes: formData.notes || null,
            updated_by: trainerId,
          });
      }

      // Create credentials
      const defaultPassword = formData.phone.slice(1,2)+formData.phone.slice(3,5)+formData.phone.slice(-2) + "213";
      try {
        await supabase
          .from("member_credentials")
          .insert({
            member_id: member.id,
            login_type: "phone",
            login_value: formData.phone,
            password: defaultPassword,
            created_by: trainerId,
          });
      } catch (credError) {
        console.log("Credentials creation skipped:", credError);
      }

      showSuccess("Member added successfully!");
      router.push("/trainer/all-members");
    } catch (error) {
      console.error("Error adding member:", error);
      showError(error.message || "Failed to add member");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-24">
      <Header title="Add New Member" />

      <main className="px-4 py-4 space-y-4">
        {/* Progress Steps */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step >= s
                      ? step === s
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-8 h-1 mx-2 ${step > s ? "bg-emerald-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between px-1 text-xs">
            <span className={`font-medium ${step >= 1 ? "text-blue-600" : "text-gray-500"}`}>Personal</span>
            <span className={`font-medium ${step >= 2 ? "text-blue-600" : "text-gray-500"}`}>Plan</span>
            <span className={`font-medium ${step >= 3 ? "text-blue-600" : "text-gray-500"}`}>Payment</span>
          </div>
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Personal Information</h3>
                <p className="text-xs text-gray-500">Enter basic member details</p>
              </div>
            </div>

            {/* Profile Photo */}
            <div className="flex flex-col items-center py-4 border-b border-gray-100">
              <div className="relative group mb-3">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {formData.profileImage ? (
                    <img src={formData.profileImage} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10" />
                  )}
                </div>
                <label htmlFor="profile-upload" className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-50">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 3 * 1024 * 1024) {
                          showError("Image must be less than 3MB");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => updateForm("profileImage", reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {formData.profileImage && (
                  <button
                    type="button"
                    onClick={() => updateForm("profileImage", null)}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full shadow-lg flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">Upload member photo (Optional)</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^[a-zA-Z\s]*$/.test(value) || value === '') {
                      updateForm("name", value);
                    }
                  }}
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="tel"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Enter 10-digit phone"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      updateForm("phone", value);
                    }
                  }}
                  maxLength="10"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for login</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Optional"
                  value={formData.email}
                  onChange={(e) => updateForm("email", e.target.value.toLowerCase().trim())}
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                value={formData.gender}
                onChange={(e) => updateForm("gender", e.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              onClick={() => {
                if (!formData.name || !formData.phone || formData.phone.length !== 10) {
                  showError("Please fill in all required fields");
                  return;
                }
                setStep(2);
              }}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Membership Plan */}
        {step === 2 && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Membership Plan</h3>
                <p className="text-xs text-gray-500">Select a plan for the member</p>
              </div>
            </div>

            {loadingPlans ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : membershipPlans.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <p>No membership plans available.</p>
                <p className="text-sm">Please contact admin to add plans.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {membershipPlans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => {
                      updateForm("planId", plan.id);
                      updateForm("customPrice", plan.price.toString());
                      updateForm("paymentAmount", plan.price.toString());
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                      formData.planId === plan.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{plan.name}</p>
                        <p className="text-sm text-gray-500">{plan.duration_days} days</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">₹{plan.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Price */}
            {formData.planId && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 text-sm">Custom Price</span>
                  <button
                    type="button"
                    onClick={() => updateForm("useCustomPrice", !formData.useCustomPrice)}
                    className={`w-10 h-5 rounded-full transition ${formData.useCustomPrice ? "bg-blue-600" : "bg-gray-300"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition transform ${formData.useCustomPrice ? "translate-x-5" : "translate-x-0.5"}`}></div>
                  </button>
                </div>
                {formData.useCustomPrice && (
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm"
                    placeholder="Enter custom price"
                    value={formData.customPrice}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        updateForm("customPrice", value);
                      }
                    }}
                  />
                )}
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  value={formData.startDate}
                  max={getTodayString()}
                  onChange={(e) => updateForm("startDate", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => {
                  if (!formData.planId) {
                    showError("Please select a plan");
                    return;
                  }
                  setStep(3);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {step === 3 && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Payment Details</h3>
                <p className="text-xs text-gray-500">Enter payment information</p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium text-black">{selectedPlan?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black">Price:</span>
                <span className="font-bold text-lg text-black">
                  ₹{formData.useCustomPrice && formData.customPrice ? formData.customPrice : selectedPlan?.price}
                </span>
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                  placeholder="Enter amount"
                  value={formData.paymentAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      updateForm("paymentAmount", value);
                    }
                  }}
                />
              </div>
              {formData.paymentAmount && parseFloat(formData.paymentAmount) < (formData.useCustomPrice ? parseFloat(formData.customPrice) : selectedPlan?.price) && (
                <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Due: ₹{(formData.useCustomPrice ? parseFloat(formData.customPrice) : selectedPlan?.price) - parseFloat(formData.paymentAmount)}
                </p>
              )}
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {["cash", "upi", "card"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateForm("paymentMode", mode)}
                    className={`py-2 px-3 rounded-lg border-2 font-medium text-sm capitalize transition ${
                      formData.paymentMode === mode
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                rows={2}
                placeholder="Optional notes"
                value={formData.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.paymentAmount}
                className="flex-1 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Add Member
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
