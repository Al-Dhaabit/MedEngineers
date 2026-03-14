"use client";

import { useEffect, useState } from "react";
import type { DomainRecommendation } from "@/lib/domainAlgorithm";

interface SubmissionResult {
    name: string;
    email: string;
    major: string;
    recommendation: DomainRecommendation | null;
}

type CompetitorEngineer = {
    id?: string;
    fullName?: string;
    email?: string;
    major?: string;
    group1?: string[];
    group2?: string[];
    group3?: string[];
    group4?: string[];
    workstyle?: string;
    workStyle?: string;
    projects?: string;
    handsOnProject?: string;
    experience?: string;
    professionalExp?: string;
    challengeAnswers?: string;
    scenarioResponse?: string;
};

interface DomainAISectionProps {
    competitorEngineer?: CompetitorEngineer;
}

export default function DomainAISection({ competitorEngineer }: DomainAISectionProps) {
    const [domainLoading, setDomainLoading] = useState(false);
    const [domainResults, setDomainResults] = useState<SubmissionResult[]>([]);
    const [domainError, setDomainError] = useState<string | null>(null);
    const [selectedDomain, setSelectedDomain] = useState<"A" | "B" | "C" | null>(null);
    const [finalizingDomain, setFinalizingDomain] = useState(false);
    const [finalizeError, setFinalizeError] = useState<string | null>(null);
    const [finalizeSuccess, setFinalizeSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (!competitorEngineer) {
            setDomainResults([]);
            setDomainError(null);
            setDomainLoading(false);
            setSelectedDomain(null);
            setFinalizeError(null);
            setFinalizeSuccess(null);
            return;
        }
        fetchDomainRecommendation();
    }, [competitorEngineer]);

    const fetchDomainRecommendation = async () => {
        setDomainLoading(true);
        setDomainError(null);

        try {
            const res = await fetch("/api/domain-suggestion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: competitorEngineer?.fullName ?? "Unknown Applicant",
                    email: competitorEngineer?.email ?? "",
                    major: competitorEngineer?.major ?? "Engineering",
                    group1: competitorEngineer?.group1 ?? [],
                    group2: competitorEngineer?.group2 ?? [],
                    group3: competitorEngineer?.group3 ?? [],
                    group4: competitorEngineer?.group4 ?? [],
                    workStyle: competitorEngineer?.workstyle ?? competitorEngineer?.workStyle ?? "",
                    handsOnProject: competitorEngineer?.projects ?? competitorEngineer?.handsOnProject ?? "",
                    professionalExp: competitorEngineer?.experience ?? competitorEngineer?.professionalExp ?? "",
                    scenarioResponse: competitorEngineer?.challengeAnswers ?? competitorEngineer?.scenarioResponse ?? "",
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || "Failed to calculate recommendation");
            }
            setDomainResults(data.submission ? [data.submission] : []);
            console.log(data.submission);

        } catch (err) {
            setDomainResults([]);
            setDomainError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setDomainLoading(false);
        }
    };

    const finalizeDomain = async () => {
        if (!competitorEngineer?.id || !selectedDomain) {
            setFinalizeError("Missing competitor ID or domain selection.");
            return;
        }

        setFinalizingDomain(true);
        setFinalizeError(null);
        setFinalizeSuccess(null);

        try {
            const res = await fetch("/api/admin/update-domain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    competitorId: competitorEngineer.id,
                    domain: selectedDomain,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || "Failed to finalize domain");
            }

            setFinalizeSuccess(`Domain ${selectedDomain} finalized.`);
        } catch (err) {
            setFinalizeError(err instanceof Error ? err.message : "Failed to finalize domain");
        } finally {
            setFinalizingDomain(false);
        }
    };

    const getDomainColor = (domain: string) => {
        switch (domain) {
            case "A":
                return { bg: "#e9456015", border: "#e94560", text: "#e94560", gradient: "from-red-500 to-pink-600" };
            case "B":
                return { bg: "#00d9ff15", border: "#00d9ff", text: "#00d9ff", gradient: "from-cyan-500 to-blue-600" };
            case "C":
                return { bg: "#a855f715", border: "#a855f7", text: "#a855f7", gradient: "from-purple-500 to-violet-600" };
            default:
                return { bg: "#88888815", border: "#888", text: "#888", gradient: "from-gray-500 to-gray-600" };
        }
    };

    const getDomainIcon = (domain: string) => {
        switch (domain) {
            case "A":
                return "🔧";
            case "B":
                return "📊";
            case "C":
                return "🤖";
            default:
                return "❓";
        }
    };

    const getDomainName = (domain: string) => {
        switch (domain) {
            case "A":
                return "Medical Tools & Hardware";
            case "B":
                return "Clinical Systems & Operations";
            case "C":
                return "Digital Health & AI";
            default:
                return "Unknown";
        }
    };

    const domain = ["A", "B", "C"];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-8">
            {/* Header */}
            <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 mb-4">
                    <span className="text-xl">🧠</span>
                    <span className="text-sm font-medium text-purple-400">Domain AI</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-3">
                    Domain AI Recommendations
                </h2>
                <p className="text-base text-gray-600 max-w-2xl mx-auto">
                    AI-powered analysis of engineering applicants to suggest their best-fit hackathon domain
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <div className="text-3xl font-bold text-white">{domainResults.length}</div>
                    <div className="text-sm text-gray-400">Total Submissions</div>
                </div>
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <div className="text-3xl font-bold text-white">
                        {domainResults.filter(r => r.recommendation).length}
                    </div>
                    <div className="text-sm text-gray-400">Engineers Analyzed</div>
                </div>
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <div className="text-3xl font-bold text-[#e94560]">
                        {domainResults.filter(r => r.recommendation?.recommended.domain === "A").length}
                    </div>
                    <div className="text-sm text-gray-400">🔧 Domain A</div>
                </div>
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <div className="text-3xl font-bold text-[#00d9ff]">
                        {domainResults.filter(r => r.recommendation?.recommended.domain === "B").length}
                    </div>
                    <div className="text-sm text-gray-400">📊 Domain B</div>
                </div>
                <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                    <div className="text-3xl font-bold text-[#a855f7]">
                        {domainResults.filter(r => r.recommendation?.recommended.domain === "C").length}
                    </div>
                    <div className="text-sm text-gray-400">🤖 Domain C</div>
                </div>
            </div>

            {/* Legend */}
            <div className="mb-8 p-4 bg-gray-900/50 rounded-xl border border-gray-800 flex flex-wrap justify-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#e94560]" />
                    <span className="text-sm text-gray-200">A: Medical Tools & Hardware</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#00d9ff]" />
                    <span className="text-sm text-gray-200">B: Clinical Systems & Operations</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#a855f7]" />
                    <span className="text-sm text-gray-200">C: Digital Health & AI</span>
                </div>
            </div>

            {/* Loading State */}
            {domainLoading && (
                <div className="text-center py-20">
                    <div className="animate-spin w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full mx-auto mb-6" />
                    <p className="text-gray-500 text-lg">Analyzing submissions with AI...</p>
                </div>
            )}

            {/* Error State */}
            {domainError && (
                <div className="bg-red-100 border border-red-300 rounded-xl p-6 text-center">
                    <span className="text-4xl mb-4 block">⚠️</span>
                    <p className="text-red-700 text-lg">{domainError}</p>
                    <button
                        onClick={fetchDomainRecommendation}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Empty State */}
            {!domainLoading && !domainError && domainResults.filter(r => r.recommendation).length === 0 && (
                <div className="text-center py-20 bg-gray-900/50 rounded-xl border border-gray-800">
                    <span className="text-6xl mb-4 block">📭</span>
                    <p className="text-gray-300 text-lg">No engineering submissions found</p>
                    <p className="text-gray-400 text-sm mt-2">Submit an application as an Engineer to see recommendations</p>
                </div>
            )}

            {/* Results Grid */}
            {!domainLoading && !domainError && domainResults.filter(r => r.recommendation).length > 0 && (
                <div className="space-y-4">
                    {domainResults.filter(r => r.recommendation).map((result, idx) => {
                        const rec = result.recommendation!;
                        const colors = getDomainColor(rec.recommended.domain);

                        return (
                            <div
                                key={idx}
                                className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors"
                            >
                                {/* Card Header with gradient */}
                                <div
                                    className="p-6"
                                    style={{ background: `linear-gradient(135deg, ${colors.bg}, transparent)` }}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        {/* Applicant Info */}
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                                                style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}` }}
                                            >
                                                {getDomainIcon(rec.recommended.domain)}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">
                                                    {result.name || "Unknown Applicant"}
                                                </h3>
                                                <p className="text-gray-300 text-sm">{result.email}</p>
                                            </div>
                                        </div>

                                        {/* Recommendation Badge */}
                                        <div
                                            className={`px-5 py-3 rounded-xl bg-gradient-to-r ${colors.gradient} text-white font-bold text-center`}
                                        >
                                            <div className="text-2xl">Domain {rec.recommended.domain}</div>
                                            <div className="text-sm opacity-80">{rec.recommended.percentage}% Match</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-6 border-t border-gray-800">
                                    {/* Domain Name */}
                                    <div className="mb-4">
                                        <span className="text-xs uppercase tracking-wider text-gray-400">Recommended Track</span>
                                        <p className="text-lg text-white font-medium" style={{ color: colors.text }}>
                                            {getDomainName(rec.recommended.domain)}
                                        </p>
                                    </div>

                                    {/* Confidence */}
                                    <div className="mb-6 flex items-center gap-2">
                                        <span className="text-xs uppercase tracking-wider text-gray-400">Confidence:</span>
                                        <span
                                            className={`px-2 py-1 rounded text-xs font-bold uppercase ${rec.confidence === "high"
                                                ? "bg-green-500/20 text-green-400"
                                                : rec.confidence === "medium"
                                                    ? "bg-yellow-500/20 text-yellow-400"
                                                    : "bg-red-500/20 text-red-400"
                                                }`}
                                        >
                                            {rec.confidence}
                                        </span>
                                    </div>

                                    {/* Score Breakdown */}
                                    <div className="grid grid-cols-3 gap-4">
                                        {rec.allScores.map((score) => {
                                            const scoreColors = getDomainColor(score.domain);
                                            const isRecommended = score.domain === rec.recommended.domain;

                                            return (
                                                <div
                                                    key={score.domain}
                                                    className={`p-4 rounded-xl border-2 transition-all ${isRecommended ? "border-opacity-100" : "border-opacity-30"
                                                        }`}
                                                    style={{
                                                        borderColor: scoreColors.border,
                                                        backgroundColor: isRecommended ? scoreColors.bg : "transparent",
                                                    }}
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-lg">{getDomainIcon(score.domain)}</span>
                                                        <span className="text-sm font-medium text-gray-200">Domain {score.domain}</span>
                                                    </div>
                                                    {/* Progress bar */}
                                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${score.percentage}%`,
                                                                backgroundColor: scoreColors.text,
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xl font-bold" style={{ color: scoreColors.text }}>
                                                            {score.percentage}%
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Reasoning */}
                                    {rec.reasoning && (
                                        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
                                            <span className="text-xs uppercase tracking-wider text-gray-400 block mb-2">AI Analysis</span>
                                            <p className="text-gray-200 text-sm leading-relaxed">
                                                {rec.reasoning.replace(/\*\*/g, "")}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Refresh Button */}
            <div className="mt-8 text-center">
                <button
                    onClick={fetchDomainRecommendation}
                    disabled={domainLoading}
                    className="px-6 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                    {domainLoading ? "Refreshing..." : "🔄 Refresh if no recommendation is shown"}
                </button>
            </div>

            {/* All three domains for admins to finalize the domain for engineering */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold text-white mb-4 text-center">Finalize Domain</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(["A", "B", "C"] as const).map((domain) => {
                        const colors = getDomainColor(domain);
                        const isSelected = selectedDomain === domain;

                        return (
                            <button
                                key={domain}
                                onClick={() => setSelectedDomain(domain)}
                                className={`text-left p-5 rounded-2xl border-2 transition-all ${isSelected ? "border-opacity-100" : "border-opacity-40"
                                    }`}
                                style={{
                                    borderColor: colors.border,
                                    backgroundColor: isSelected ? colors.bg : "transparent",
                                }}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                                        style={{ backgroundColor: colors.bg, border: `2px solid ${colors.border}` }}
                                    >
                                        {getDomainIcon(domain)}
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-300">Domain {domain}</div>
                                        <div className="text-base font-semibold" style={{ color: colors.text }}>
                                            {getDomainName(domain)}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400">Click to select</p>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-5 text-center">
                    <button
                        onClick={finalizeDomain}
                        disabled={!selectedDomain || finalizingDomain || !competitorEngineer?.id}
                        className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        {finalizingDomain ? "Finalizing..." : selectedDomain ? `Finalize Domain ${selectedDomain}` : "Select a Domain"}
                    </button>
                    {!competitorEngineer?.id && (
                        <p className="text-xs text-gray-500 mt-2">Competitor ID missing. Cannot finalize.</p>
                    )}
                    {finalizeError && (
                        <p className="text-sm text-red-400 mt-2">{finalizeError}</p>
                    )}
                    {finalizeSuccess && (
                        <p className="text-sm text-emerald-400 mt-2">{finalizeSuccess}</p>
                    )}
                </div>
            </div>

        </div>
    );
}
