import { adminDb } from "@/lib/firebaseAdmin";
import { notFound } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { DecisionButtons } from "./DecisionButtons";
import { Footer } from "@/components/Footer";

type CompetitorDetails = {
    id: string;
    fullName: string;
    email: string;
    contactNo: string;
    emiratesID: string;
    nationality: string;
    major: string;
    majorType: string;
    year: string;
    linkedIn: string;
    resume: string;
    googleDrive: string;
    domain: string;
    status: string;
    attended: boolean;
    isPayed: boolean;
    challenge1: string;
    challenge2: string;
    collaborativeSpirit: string;
    enthusiasmCheck: string;
    skillSet: string;
    submittedAt: Timestamp;
    updatedAt: Timestamp;
};


async function getCompetitorDetails(id: string): Promise<CompetitorDetails | null> {
    try {
        const docRef = adminDb.collection("competitors").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data();
        return {
            id: doc.id,
            ...data,
        } as CompetitorDetails;
    } catch (error) {
        console.error("Error fetching competitor:", error);
        return null;
    }
}

export default async function CompetitorDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const competitor = await getCompetitorDetails(id);

    if (!competitor) {
        notFound();
    }

    return (
        <div className="container mx-auto py-10 px-4 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-brand-teal mb-2">
                    {competitor.fullName}
                </h1>
                <p className="text-muted-foreground">{competitor.email}</p>
            </div>

            <div className="space-y-6">
                {/* Personal Information */}
                <section className="bg-card border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-brand-teal">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem label="Full Name" value={competitor.fullName} />
                        <DetailItem label="Email" value={competitor.email} />
                        <DetailItem label="Contact Number" value={competitor.contactNo} />
                        <DetailItem label="Emirates ID/Passport ID" value={competitor.emiratesID} />
                        <DetailItem label="Nationality" value={competitor.nationality} />
                    </div>
                </section>

                {/* Academic Information */}
                <section className="bg-card border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-brand-teal">Academic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DetailItem label="Major" value={competitor.major} />
                        <DetailItem label="Major Type" value={competitor.majorType} />
                        <DetailItem label="Year" value={competitor.year} />
                    </div>
                </section>

                {/* Responses */}
                <section className="bg-card border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-brand-teal">Skill set AND Experience & Portfolio</h2>
                    <div className="space-y-4">
                        <LongTextItem label="Skill Set" value={competitor.skillSet} />
                        <div className="space-y-3">
                            <DetailItem
                                label="LinkedIn"
                                value={competitor.linkedIn}
                                isLink
                            />
                            <DetailItem label="Resume" value={competitor.resume} />
                            <DetailItem label="Port" value={competitor.googleDrive} />
                        </div>
                    </div>
                </section>

                {/* Responses */}
                <section className="bg-card border border-border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4 text-brand-teal">Responses</h2>
                    <div className="space-y-4">
                        <LongTextItem label="Challenge 1" value={competitor.challenge1} />
                        <LongTextItem label="Challenge 2" value={competitor.challenge2} />
                        <LongTextItem label="Collaborative Spirit" value={competitor.collaborativeSpirit} />
                        <LongTextItem label="Enthusiasm Check" value={competitor.enthusiasmCheck} />
                    </div>
                </section>

                {/* Accepted And Rejected Buttons */}
                {/* If decisionButton is empty, show both buttons, if decisionButton is accepted show a message that it is accepted, 
                if decisionButton is rejected show a message that it is rejected and remove the buttons */}
                <section className="bg-card border border-border rounded-lg p-6">
                    <DecisionButtons
                        competitorId={competitor.id}
                        currentStatus={competitor.status}
                    />
                </section>
            </div>
        </div>
    );
}

function DetailItem({
    label,
    value,
    isLink = false
}: {
    label: string;
    value: string;
    isLink?: boolean;
}) {
    return (
        <div>
            <dt className="text-sm font-medium text-muted-foreground mb-1">{label}</dt>
            <dd className="text-sm">
                {isLink && value ? (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-teal hover:underline"
                    >
                        {value}
                    </a>
                ) : (
                    value || "N/A"
                )}
            </dd>
        </div>
    );
}

function LongTextItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-sm font-medium text-muted-foreground mb-2">{label}</dt>
            <dd className="text-sm bg-muted/30 p-4 rounded-md whitespace-pre-wrap">
                {value || "N/A"}
            </dd>
        </div>
    );
}