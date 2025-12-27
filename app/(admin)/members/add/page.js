"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";

const membershipPlans = [
  { id: 1, name: "Basic", duration: "1 Month", price: 1000 },
  { id: 2, name: "Standard", duration: "3 Months", price: 2500 },
  { id: 3, name: "Premium", duration: "6 Months", price: 4500 },
  { id: 4, name: "Annual", duration: "12 Months", price: 8000 },
];

export default function AddMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
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

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedPlan = membershipPlans.find((p) => p.id === formData.planId);

  const handleSubmit = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    router.push("/members");
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => updateForm("name", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => updateForm("phone", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => updateForm("email", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                  placeholder="Age"
                  value={formData.age}
                  onChange={(e) => updateForm("age", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none resize-none"
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
              <input
                type="tel"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                placeholder="Emergency contact number"
                value={formData.emergencyContact}
                onChange={(e) => updateForm("emergencyContact", e.target.value)}
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.phone}
              className="w-full py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed mt-4"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Custom Price (₹) *
                      </label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 border border-orange-300 rounded-xl focus:ring-2 focus:ring-[#F97316] outline-none text-lg font-semibold"
                        placeholder="Enter custom price"
                        value={formData.customPrice}
                        onChange={(e) => updateForm("customPrice", e.target.value)}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                  value={formData.startDate}
                  onChange={(e) => updateForm("startDate", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.planId}
                className="flex-1 py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Received *
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                  placeholder="Enter amount"
                  value={formData.paymentAmount}
                  onChange={(e) => updateForm("paymentAmount", e.target.value)}
                />
                {formData.paymentAmount &&
                  formData.paymentAmount < (formData.useCustomPrice && formData.customPrice
                    ? parseFloat(formData.customPrice)
                    : selectedPlan?.price) && (
                    <p className="text-sm text-orange-500 mt-1">
                      Due amount: ₹
                      {(formData.useCustomPrice && formData.customPrice
                        ? parseFloat(formData.customPrice)
                        : selectedPlan?.price) - formData.paymentAmount}
                    </p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none resize-none"
                  rows={2}
                  placeholder="Any additional notes..."
                  value={formData.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.paymentAmount || loading}
                className="flex-1 py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add Member"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
