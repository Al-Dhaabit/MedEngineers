import { NextResponse } from "next/server";
import { calculateDomainRecommendation, type EngineerResponses } from "@/lib/domainAlgorithm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const group1 = Array.isArray(body?.group1) ? body.group1 : [];
    const group2 = Array.isArray(body?.group2) ? body.group2 : [];
    const group3 = Array.isArray(body?.group3) ? body.group3 : [];
    const group4 = Array.isArray(body?.group4) ? body.group4 : [];
    const workStyle = typeof body?.workStyle === "string" ? body.workStyle : "";

    const responses: EngineerResponses = {
      skillsGroupA: group1,
      skillsGroupB: group2,
      skillsGroupC: group3,
      skillsGlobal: group4,
      workStylePersona: workStyle || undefined,
      handsOnProject: typeof body?.handsOnProject === "string" ? body.handsOnProject : "",
      professionalExp: typeof body?.professionalExp === "string" ? body.professionalExp : "",
      scenarioResponse: typeof body?.scenarioResponse === "string" ? body.scenarioResponse : "",
    };

    const recommendation = calculateDomainRecommendation(responses);

    return NextResponse.json({
      submission: {
        name: typeof body?.name === "string" ? body.name : "Unknown Applicant",
        email: typeof body?.email === "string" ? body.email : "",
        major: typeof body?.major === "string" ? body.major : "Engineering",
        recommendation,
      },
    });
  } catch (error) {
    console.error("Domain suggestion failed:", error);
    return NextResponse.json({ error: "Failed to calculate domain recommendation" }, { status: 500 });
  }
}
