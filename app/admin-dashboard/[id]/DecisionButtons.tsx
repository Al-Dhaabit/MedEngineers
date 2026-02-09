"use client"

import { useState } from "react";
import { updateCompetitorStatus } from "./actions";

type DecisionButtonsProps = {
    competitorId: string;
    currentStatus: string;
}

export function DecisionButtons({ competitorId, currentStatus }: DecisionButtonsProps) {
    const [isLoading, setIsLoading] = useState(false);
    const isDecisionMade = currentStatus === "Accepted" || currentStatus === "Rejected";

    // Handle the decision function
    const handleDecision = async (decision: "Accepted" | "Rejected") => {
        if (isDecisionMade) return;

        setIsLoading(true);
        const result = await updateCompetitorStatus(competitorId, decision);

        if (!result.success) {
            alert("Failed to update status. Please try again.");
        }

        setIsLoading(false);
    };

    // If decision is made, show the decision
    if (isDecisionMade) {
        return (
            <div className="text-center">
                <p className="text-lg font-semibold mb-4">
                    This application has been{" "}
                    <span className={currentStatus === "Accepted" ? "text-green-600" : "text-red-600"}>
                        {currentStatus}
                    </span>
                </p>
                <p className="text-sm text-muted-foreground">
                    Decision cannot be changed once made.
                </p>
            </div>
        );
    }

    // If decision is not made, show the buttons
    return (
        <>
            <p className="text-center mb-4 text-sm text-muted-foreground">
                Note: Accepting OR Rejecting will be allowed only once. Once accepted or rejected, you will not be able to change your decision.
            </p>
            <div className="flex justify-end space-x-4">
                <button
                    onClick={() => handleDecision("Accepted")}
                    disabled={isLoading}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Processing..." : "Accept"}
                </button>

                <button
                    onClick={() => handleDecision("Rejected")}
                    disabled={isLoading}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? "Processing..." : "Reject"}
                </button>
            </div>
        </>
    );
}