import { adminDb } from "@/lib/firebaseAdmin";
import { columns, Competitor } from "./columns"; // Import the type
import { DataTable } from "./data-table";

async function getMedicineCompetitors(): Promise<Competitor[]> {
    const competitorsRef = adminDb.collection("competitors");
    const snapshot = await competitorsRef.where("major", "==", "Medicine").get();

    // Cast the data to Competitor
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            fullName: data.fullName || "",
            email: data.email || "",
            status: data.status || "Pending",
        } as Competitor;
    });
}

export default async function DashboardPage() {
    const data = await getMedicineCompetitors();

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-2xl font-bold mb-5">Medicine Competitors</h1>
            {/* Now 'data' matches 'columns' types exactly */}
            <DataTable columns={columns} data={data} />
        </div>
    );
}