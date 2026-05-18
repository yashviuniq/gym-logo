"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, CheckCircle } from "lucide-react";
import ListModal from "./ListModal";

function PaymentRow({ payment, size = "sm", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between ${
        size === "lg"
          ? "p-3 bg-gray-50 rounded-xl active:bg-gray-100 cursor-pointer"
          : "p-2 active:bg-gray-50 rounded-lg"
      }`}
      style={{ minHeight: "52px" }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-red-600">₹</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {payment.name}
          </p>
          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
            Overdue
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0 pl-2">
        <p className="text-sm font-semibold text-red-600">
          ₹{typeof payment.amount === "number" ? payment.amount.toLocaleString() : payment.amount}
        </p>
        <span className="text-xs text-blue-600 font-medium">
          {size === "lg" ? "View →" : "Collect →"}
        </span>
      </div>
    </div>
  );
}

export default function PendingPaymentsSection({ topPayments, allPayments, totalDues }) {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  return (
    <>
      <div className="bg-white rounded-xl p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Pending Payments</h3>
              <p className="text-xs text-gray-500">
                Total: ₹{totalDues.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium active:bg-amber-100 transition-colors"
              style={{ minHeight: "32px" }}
            >
              View All
            </button>
            <button
              onClick={() => router.push("/finance")}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform"
              style={{ minHeight: "32px" }}
            >
              Collect All
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {topPayments.length > 0 ? (
            topPayments.map((p) => <PaymentRow key={p.id} payment={p} />)
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-gray-500 text-sm">All payments up to date!</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Great job managing finances
              </p>
            </div>
          )}
        </div>
      </div>

      <ListModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Pending Payments"
        subtitle={`Total: ₹${totalDues.toLocaleString()}`}
        icon={<DollarSign className="w-5 h-5" />}
        iconBg="bg-amber-100"
        iconColor="text-amber-600"
        footer={
          <button
            onClick={() => {
              setShowModal(false);
              router.push("/finance");
            }}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium active:bg-amber-600 transition-colors"
          >
            Go to Finance Page
          </button>
        }
      >
        {allPayments.length > 0 ? (
          allPayments.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              size="lg"
              onClick={() => {
                setShowModal(false);
                router.push(`/members/${p.id}`);
              }}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-gray-500 font-medium">All payments up to date!</p>
            <p className="text-xs text-gray-400 mt-1">
              Great job managing finances
            </p>
          </div>
        )}
      </ListModal>
    </>
  );
}
