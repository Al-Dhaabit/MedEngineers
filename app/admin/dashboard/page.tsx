import { adminDb } from "@/lib/firebaseAdmin";
import { columns, Competitor } from "./columns"; // Import the type
import { DataTable } from "./data-table";
import LogoutButton from "@/components/logout"
import { paymentColumns, PaymentSubmission } from "./payment-columns";

// Add these exports to disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getMedicineCompetitors(): Promise<Competitor[]> {
    const competitorsRef = adminDb.collection("competitors");
    const snapshot = await competitorsRef.where("major", "in", ["Medicine", "Healthcare"]).get();

    // Cast the data to Competitor
    return snapshot.docs.map(doc => {
        const data = doc.data();
        console.log(data.status);
        const appStatus = data.application_status || data.applicationStatus || null;
        const rawStatus = data.status || "pending";
        const status =
            appStatus === "accepted" || appStatus === "rejected" || appStatus === "pending"
                ? appStatus
                : rawStatus === "approved_awaiting_payment_submission" ||
                    rawStatus === "payment_submitted_under_review" ||
                    rawStatus === "payment_confirmed" ||
                    rawStatus === "payment_rejected" ||
                    rawStatus === "domain_selection" ||
                    rawStatus === "final_phase"
                    ? "accepted"
                    : rawStatus === "rejected_awaiting_payment_submission"
                        ? "rejected"
                        : "pending";
        return {
            id: doc.id,
            fullName: data.fullName || "",
            email: data.email || "",
            major: data.major || "",
            status,
        } as Competitor;
    });
}

async function getEngineeringCompetitors(): Promise<Competitor[]> {
    const competitorsRef = adminDb.collection("competitors");
    const snapshot = await competitorsRef.where("major", "==", "Engineering").get();

    // Cast the data to Competitor
    return snapshot.docs.map(doc => {
        const data = doc.data();
        console.log(data.status);
        const appStatus = data.application_status || data.applicationStatus || null;
        const rawStatus = data.status || "pending";
        const status =
            appStatus === "accepted" || appStatus === "rejected" || appStatus === "pending"
                ? appStatus
                : rawStatus === "approved_awaiting_payment_submission" ||
                    rawStatus === "payment_submitted_under_review" ||
                    rawStatus === "payment_confirmed" ||
                    rawStatus === "payment_rejected" ||
                    rawStatus === "domain_selection" ||
                    rawStatus === "final_phase"
                    ? "accepted"
                    : rawStatus === "rejected_awaiting_payment_submission"
                        ? "rejected"
                        : "pending";
        return {
            id: doc.id,
            fullName: data.fullName || "",
            email: data.email || "",
            major: data.major || "",
            status,
        } as Competitor;
    });
}

async function getPaymentSubmissions(): Promise<PaymentSubmission[]> {
    const attendeesRef = adminDb.collection("attendees");
    const competitorsRef = adminDb.collection("competitors");
    const [attendeeSnapshot, competitorSnapshot] = await Promise.all([
        attendeesRef.where("status", "in", ["approved_awaiting_payment_submission", "payment_submitted_under_review", "payment_confirmed", "payment_rejected", "domain_selection", "final_phase"]).get(),
        competitorsRef.where("status", "in", ["approved_awaiting_payment_submission", "payment_submitted_under_review", "payment_confirmed", "payment_rejected", "domain_selection", "final_phase"]).get(),
    ]);

    const attendeeRows = attendeeSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            fullName: data.fullName || "",
            email: data.email || data.universityEmail || data.university_email || "",
            isPaid: (data.isPayed === true) || (data.isPaid === true),
            status: data.status || "pending",
        } as PaymentSubmission;
    });

    const competitorRows = competitorSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            fullName: data.fullName || "",
            email: data.email || data.universityEmail || data.university_email || "",
            isPaid: (data.isPayed === true) || (data.isPaid === true),
            status: data.status || "pending",
        } as PaymentSubmission;
    });

    return [...competitorRows, ...attendeeRows];
}

export default async function DashboardPage() {
    const data = await getMedicineCompetitors();
    const engineeringData = await getEngineeringCompetitors();
    const paymentData = await getPaymentSubmissions();

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-5">Healthcare Competitors</h1>
            <p className="text-muted-foreground mb-5">Guide: Click on the competitor's name which will open their details on another tab to view and update their status. All changes will be displayed in the table below.</p>
            {/* Now 'data' matches 'columns' types exactly */}
            <DataTable columns={columns} data={data} />
            <div className="mt-5 border p-5 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Healthcare Stats</h2>
                <p>Total Healthcare Competitors: {data.length}</p>
                <p>Accepted Applications: {data.filter((competitor) => competitor.status === "accepted").length}</p>
                <p>Rejected Applications: {data.filter((competitor) => competitor.status === "rejected").length}</p>
                <p>Pending Applications: {data.filter((competitor) => competitor.status === "pending").length}</p>
            </div>

            <h1 className="text-2xl font-bold mb-5 mt-20">Engineering Competitors</h1>
            <DataTable columns={columns} data={engineeringData} />
            <div className="mt-5 border p-5 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Engineering Stats</h2>
                <p>Total Engineering Competitors: {engineeringData.length}</p>
                <p>Accepted Applications: {engineeringData.filter((competitor) => competitor.status === "accepted").length}</p>
                <p>Rejected Applications: {engineeringData.filter((competitor) => competitor.status === "rejected").length}</p>
                <p>Pending Applications: {engineeringData.filter((competitor) => competitor.status === "pending").length}</p>
            </div>

            <h1 className="text-2xl font-bold mb-5 mt-20">Payment Table</h1>
            <p className="text-muted-foreground mb-5">Contains users with isPaid. Click a name to review proof and accept or reject payment.</p>
            <DataTable columns={paymentColumns} data={paymentData} />
            <div className="mt-5 border p-5 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Payment Stats</h2>
                <p>Total Payment Submissions: {paymentData.length}</p>
                <p>Approved Payments: {paymentData.filter((entry) => entry.status === "payment_confirmed").length}</p>
                <p>Rejected Payments: {paymentData.filter((entry) => entry.status === "payment_rejected").length}</p>
                <p>Pending Payment Applications: {paymentData.filter((entry) => entry.status === "approved_awaiting_payment_submission" || entry.status === "payment_submitted_under_review").length}</p>
            </div>

            <div className="mt-10">
                <LogoutButton />
            </div>
        </div>
    );
}
