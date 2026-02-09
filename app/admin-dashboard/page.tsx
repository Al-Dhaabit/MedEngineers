import { adminDb } from "@/lib/firebaseAdmin";
import { columns, Competitor } from "./columns"; // Import the type
import { DataTable } from "./data-table";
import LogoutButton from "@/components/logout"

// Add these exports to disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getMedicineCompetitors(): Promise<Competitor[]> {
    const competitorsRef = adminDb.collection("competitors");
    const snapshot = await competitorsRef.where("major", "==", "Medicine").get();

    // Cast the data to Competitor
    return snapshot.docs.map(doc => {
        const data = doc.data();
        console.log(data.status);
        return {
            id: doc.id,
            fullName: data.fullName || "",
            email: data.email || "",
            status: data.status || "pending",
        } as Competitor;
    });
}

export default async function DashboardPage() {
    const data = await getMedicineCompetitors();

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-5">Medicine Competitors</h1>
            <p className="text-muted-foreground mb-5">Guide: Click on the competitor's name which will open their details on another tab to view and update their status. All changes will be displayed in the table below.</p>
            {/* Now 'data' matches 'columns' types exactly */}
            <DataTable columns={columns} data={data} />
            <div className="mt-5 border p-5 rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Stats</h2>
                <p>Total Medicine Competitors: {data.length}</p>
                <p>Accepted Applications: {data.filter((competitor) => competitor.status === "Accepted").length}</p>
                <p>Rejected Applications: {data.filter((competitor) => competitor.status === "Rejected").length}</p>
            </div>
            <div className="mt-5">
                <LogoutButton />
            </div>
        </div>
    );
}