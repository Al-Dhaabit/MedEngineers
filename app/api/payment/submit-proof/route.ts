import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

const MAX_FILE_BYTES = 700 * 1024; // Keep below Firestore 1MB doc limit after base64 encoding

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
    const formData = await req.formData();
    const idToken = formData.get("idToken");
    const transactionID = formData.get("transactionID");
    const paymentProof = formData.get("paymentProof");

    if (typeof idToken !== "string" || !idToken.trim()) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (typeof transactionID !== "string" || !transactionID.trim()) {
      return NextResponse.json({ error: "transactionID is required" }, { status: 400 });
    }

    if (!(paymentProof instanceof File)) {
      return NextResponse.json({ error: "paymentProof file is required" }, { status: 400 });
    }

    if (paymentProof.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    if (paymentProof.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Please upload a file up to 700KB." },
        { status: 400 }
      );
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true);
    } catch (error) {
      console.error("[PaymentProof] Token verification failed:", error);
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const collection = await findUserCollection(uid);

    if (!collection) {
      return NextResponse.json({ error: "User application not found" }, { status: 404 });
    }

    const fileBytes = Buffer.from(await paymentProof.arrayBuffer());
    const fileBase64 = fileBytes.toString("base64");

    await adminDb.collection(collection).doc(uid).set(
      {
        paymentProof: {
          fileName: paymentProof.name,
          fileType: paymentProof.type || "application/octet-stream",
          fileSize: paymentProof.size,
          data: fileBase64,
          uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        transactionID: transactionID.trim(),
        status: "payment_submitted_under_review",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[PaymentProof] Failed to submit payment proof:", error);
    return NextResponse.json({ error: "Failed to submit payment proof" }, { status: 500 });
  }
}
