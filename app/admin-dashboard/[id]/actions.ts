"use server"

import { adminDb } from "@/lib/firebaseAdmin";
import { revalidatePath } from "next/cache";

export async function updateCompetitorStatus(id: string, status: "Accepted" | "Rejected") {
    try {
        const docRef = adminDb.collection("competitors").doc(id);
        await docRef.update({
            status: status,
            updatedAt: new Date()
        });

        // Revalidate the page to show updated data
        revalidatePath(`/admin-dashboard/${id}`);

        return { success: true };
    } catch (error) {
        console.error("Error updating competitor status:", error);
        return { success: false, error: "Failed to update status" };
    }
}