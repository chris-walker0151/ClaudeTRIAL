export interface GameplanReadiness {
    isReady: boolean;
    totalTrips: number;
    confirmedTrips: number;
    unconfirmedTrips: number;
    tripsWithoutPersonnel: number;
    tripsWithoutVehicle: number;
    reasons: string[];
}

export interface GameplanApprovalResult {
    success: boolean;
    tripsLocked: number;
    emailsSent: number;
    approvedAt: string;
    errors: string[];
}

export interface MondayRunResult {
    optimizerResult: {
        runId: string | null;
        tripsGenerated: number;
        status: string;
    };
    opsEmailSent: boolean;
    errors: string[];
}
