import { adminDb } from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { id } = await req.json();

        if (!id || typeof id !== 'string' || id.trim() === '') {
            return NextResponse.json({ error: "Invalid competitor ID" }, { status: 400 });
        }

        const user = await adminDb.collection('competitors').doc(id).get();

        if (!user.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(user.data());
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
    }
}