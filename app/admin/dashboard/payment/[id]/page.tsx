import { adminDb } from "@/lib/firebaseAdmin";
import { notFound } from "next/navigation";
import LogoutButton from "@/components/logout";
import PaymentStatusManager from "./PaymentStatusManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PaymentUser {
  id: string;
  [key: string]: any;
}

async function getPaymentUser(id: string): Promise<PaymentUser | null> {
  if (!id || typeof id !== "string" || id.trim() === "") {
    return null;
  }

  const competitorDoc = await adminDb.collection("competitors").doc(id.trim()).get();
  if (competitorDoc.exists) {
    return {
      id: competitorDoc.id,
      sourceCollection: "competitors",
      ...competitorDoc.data(),
    } as PaymentUser;
  }

  const attendeeDoc = await adminDb.collection("attendees").doc(id.trim()).get();
  if (attendeeDoc.exists) {
    return {
      id: attendeeDoc.id,
      sourceCollection: "attendees",
      ...attendeeDoc.data(),
    } as PaymentUser;
  }

  return null;
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const paymentUser = await getPaymentUser(resolvedParams.id);

  if (!paymentUser) {
    notFound();
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <a href="/admin/dashboard" className="text-brand-teal hover:underline mb-4 inline-block">
          ← Back to Dashboard
        </a>
      </div>

      <div className="border rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Payment Submission Details</h1>

        <PaymentStatusManager
          uid={paymentUser.id}
          currentPaymentSuccessful={
            typeof paymentUser.paymentSuccessful === "boolean"
              ? paymentUser.paymentSuccessful
              : paymentUser.isPaid === true
                ? true
                : paymentUser.isPayed === true
                  ? true
                  : undefined
          }
        />

        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Payment Details</h3>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-b border-gray-200 pb-3">
                <h4 className="font-medium text-gray-600 mb-1">Username</h4>
                <p className="text-gray-900 break-words">{paymentUser.fullName || "N/A"}</p>
              </div>
              <div className="border-b border-gray-200 pb-3">
                <h4 className="font-medium text-gray-600 mb-1">UID</h4>
                <p className="text-gray-900 break-words">{paymentUser.id}</p>
              </div>
              <div className="border-b border-gray-200 pb-3">
                <h4 className="font-medium text-gray-600 mb-1">User Email</h4>
                <p className="text-gray-900 break-words">{paymentUser.email || "N/A"}</p>
              </div>
              <div className="border-b border-gray-200 pb-3">
                <h4 className="font-medium text-gray-600 mb-1">University Email</h4>
                <p className="text-gray-900 break-words">{paymentUser.universityEmail || paymentUser.university_email || "N/A"}</p>
              </div>
              <div className="border-b border-gray-200 pb-3">
                <h4 className="font-medium text-gray-600 mb-1">Transaction ID</h4>
                <p className="text-gray-900 break-words">{paymentUser.transactionID || "N/A"}</p>
              </div>
              <div className="border-b border-gray-200 pb-3">
                <h4 className="font-medium text-gray-600 mb-1">isAmbassador</h4>
                <p className="text-gray-900 break-words">
                  {typeof paymentUser.isAmbassador === "boolean" ? (paymentUser.isAmbassador ? "True" : "False") : "N/A"}
                </p>
              </div>
              <div className="border-b border-gray-200 pb-3 md:col-span-2">
                <h4 className="font-medium text-gray-600 mb-1">Uploaded Payment Proof</h4>
                {/* check this later */}
                {(paymentUser.payment?.proof?.fileName || paymentUser.paymentProof?.fileName) ? (
                  <a
                    href={`/api/admin/payment-proof/${paymentUser.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 hover:underline font-medium"
                  >
                    {/* check this later */}
                    {paymentUser.payment?.proof?.fileName || paymentUser.paymentProof?.fileName}
                  </a>
                ) : (
                  <p className="text-gray-900">N/A</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
