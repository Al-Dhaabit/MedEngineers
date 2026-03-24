import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

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
    const { idToken } = body as { idToken?: string };

    if (!idToken) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error("[GetTicket] Token verification failed:", error);
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const collection = await findUserCollection(uid);
    if (!collection) {
      return NextResponse.json({ error: "User application not found" }, { status: 404 });
    }

    const docSnap = await adminDb.collection(collection).doc(uid).get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: "User document not found" }, { status: 404 });
    }

    const data = docSnap.data() || {};
    const orderId =
      data.orderId ||
      data.ticketId ||
      data.ticketTailor?.orderId ||
      data.ticketTailor?.order_id ||
      null;
    const ticketCode =
      data.ticketCode ||
      data.ticketTailor?.ticketCode ||
      data.ticketTailor?.ticket_code ||
      null;

    return NextResponse.json({ orderId: orderId, ticketCode });
  } catch (error) {
    console.error("[GetTicket] Internal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
