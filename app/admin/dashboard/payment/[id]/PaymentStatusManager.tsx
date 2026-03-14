"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PaymentStatusManagerProps {
  uid: string;
  currentPaymentSuccessful?: boolean;
}

export default function PaymentStatusManager({ uid, currentPaymentSuccessful }: PaymentStatusManagerProps) {
  const [paymentSuccessful, setPaymentSuccessful] = useState<boolean | undefined>(currentPaymentSuccessful);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setPaymentSuccessful(currentPaymentSuccessful);
  }, [currentPaymentSuccessful]);

  const updatePaymentStatus = async (value: boolean) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/update-payment-status", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid,
          paymentSuccessful: value,
        }),
      });

      if (response.ok) {
        setPaymentSuccessful(value);
        router.refresh();
        return;
      }

      if (response.status === 401 || response.status === 403) {
        alert("Session expired or insufficient permissions. Redirecting to login...");
        window.location.href = "/admin";
        return;
      }

      const errorData = await response.json().catch(() => ({}));
      alert(errorData.error || "Failed to update payment status");
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("Error updating payment status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-gray-700 mb-2">Payment Review</h3>
      <div className="flex items-center gap-4">
        <span className="font-medium">Current Payment Status:</span>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            paymentSuccessful === true
              ? "bg-green-100 text-green-800"
              : paymentSuccessful === false
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {paymentSuccessful === true ? "Accepted" : paymentSuccessful === false ? "Rejected" : "Pending Review"}
        </span>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={() => updatePaymentStatus(true)}
          disabled={loading || paymentSuccessful === true}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Updating..." : "Accept"}
        </button>
        <button
          onClick={() => updatePaymentStatus(false)}
          disabled={loading || paymentSuccessful === false}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Updating..." : "Reject"}
        </button>
      </div>
    </div>
  );
}
