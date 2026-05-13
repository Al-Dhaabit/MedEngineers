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
                    rawStatus === "ticket_confirmed" ||
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
                    rawStatus === "ticket_confirmed" ||
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

async function getCompetitorPaymentSubmissions(): Promise<PaymentSubmission[]> {
    const competitorsRef = adminDb.collection("competitors");
    const competitorSnapshot = await competitorsRef.where("status", "in", ["approved_awaiting_payment_submission", "payment_submitted_under_review", "payment_confirmed", "ticket_confirmed", "payment_rejected", "domain_selection", "final_phase"]).get();

    return competitorSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            fullName: data.fullName || "",
            email: data.email || data.universityEmail || data.university_email || "",
            isPaid: (data.isPayed === true) || (data.isPaid === true),
            status: data.status || "pending",
        } as PaymentSubmission;
    });
}

async function getAttendeePaymentSubmissions(): Promise<PaymentSubmission[]> {
    const attendeesRef = adminDb.collection("attendees");
    const attendeeSnapshot = await attendeesRef.where("status", "in", ["attendee_payment", "payment_submitted_under_review", "attendee_ticket", "ticket_confirmed", "payment_rejected", "final_phase"]).get();

    return attendeeSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            fullName: data.fullName || "",
            email: data.email || data.universityEmail || data.university_email || "",
            isPaid: (data.isPayed === true) || (data.isPaid === true),
            status: data.status || "pending",
        } as PaymentSubmission;
    });
}

export default async function DashboardPage() {
    const data = await getMedicineCompetitors();
    const engineeringData = await getEngineeringCompetitors();
    const competitorPaymentData = await getCompetitorPaymentSubmissions();
    const attendeePaymentData = await getAttendeePaymentSubmissions();

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
            <DataTable columns={paymentColumns} data={competitorPaymentData} />
            <div className="mt-5 border p-5 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Payment Stats</h2>
                <p>Total Payment Submissions: {competitorPaymentData.length}</p>
                <p>Approved Payments: {competitorPaymentData.filter((entry) => entry.status === "payment_confirmed" || entry.status === "ticket_confirmed").length}</p>
                <p>Rejected Payments: {competitorPaymentData.filter((entry) => entry.status === "payment_rejected").length}</p>
                <p>Pending Payment Applications: {competitorPaymentData.filter((entry) => entry.status === "approved_awaiting_payment_submission" || entry.status === "payment_submitted_under_review").length}</p>
            </div>

            <h1 className="text-2xl font-bold mb-5 mt-20">Payment Table for Attendees</h1>
            <p className="text-muted-foreground mb-5">Contains attendee payment submissions. Click a name to review proof and accept or reject payment.</p>
            <DataTable columns={paymentColumns} data={attendeePaymentData} />
            <div className="mt-5 border p-5 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Attendee Payment Stats</h2>
                <p>Total Payment Submissions: {attendeePaymentData.length}</p>
                <p>Approved Payments: {attendeePaymentData.filter((entry) => entry.status === "attendee_ticket" || entry.status === "ticket_confirmed" || entry.status === "final_phase").length}</p>
                <p>Rejected Payments: {attendeePaymentData.filter((entry) => entry.status === "payment_rejected").length}</p>
                <p>Pending Payment Applications: {attendeePaymentData.filter((entry) => entry.status === "attendee_payment" || entry.status === "payment_submitted_under_review").length}</p>
            </div>

            <div className="mt-10">
                <LogoutButton />
            </div>
        </div>
    );
}
