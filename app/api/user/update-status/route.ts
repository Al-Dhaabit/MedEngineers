import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";


type AllowedStatus = "domain_selection" | "final_phase";
type TargetCollection = "attendees" | "competitors";

async function findUserCollection(uid: string): Promise<TargetCollection | null> {
  const attendeeDoc = await adminDb.collection("attendees").doc(uid).get();
  if (attendeeDoc.exists && attendeeDoc.data()?.submitted === true) {
    return "attendees";
  }

  const competitorDoc = await adminDb.collection("competitors").doc(uid).get();
  if (competitorDoc.exists && competitorDoc.data()?.submitted === true) {
    return "competitors";
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, status } = body as { idToken?: string; status?: AllowedStatus };

    if (!idToken || !status) {
      return NextResponse.json({ error: "idToken and status are required" }, { status: 400 });
    }

    if (status !== "domain_selection" && status !== "final_phase") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // security check
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error("[UpdateStatus] Token verification failed:", error);
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    // find user
    const uid = decodedToken.uid;
    const collection = await findUserCollection(uid);
    if (!collection) {
      return NextResponse.json({ error: "User application not found" }, { status: 404 });
    }

    const docRef = adminDb.collection(collection).doc(uid);
    const docSnap = await docRef.get();
    const data = docSnap.data() || {};

    // check if user is Engineer or Healthcare/Medicine
    const major = data.major;
    if (major !== "Engineering" && major !== "Medicine" && major !== "Healthcare") {
      return NextResponse.json({ error: "You are not eligible for this action" }, { status: 400 });
    }

    const currentStatus = String(data.status || data.workflowStatus || "").toLowerCase();

    // need to recheck the currentStatus !== domain_selection.
    if (major === "Engineering" && currentStatus !== "ticket_confirmed") {
      return NextResponse.json({ error: "Ticket not confirmed yet for Engineering student" }, { status: 403 });
    }

    if (currentStatus === "domain_selection") {
      if (major !== "Medicine" && major !== "Healthcare") {
        return NextResponse.json({ error: "Domain selection is only available for Medicine/Healthcare" }, { status: 400 });
      }
    }

    await docRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, status }, { status: 200 });
  } catch (error) {
    console.error("[UpdateStatus] Internal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
