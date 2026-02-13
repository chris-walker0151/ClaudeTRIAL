export interface OpsGameplanEmailData {
    weekNumber: number;
    seasonYear: number;
    totalTrips: number;
    totalPersonnel: number;
    totalAssets: number;
    generatedAt: string;
    alerts: string[];
    thursdayPriorityFlags: string[];
    trips: OpsGameplanTrip[];
}

export interface OpsGameplanTrip {
    id: string;
    vehicleName: string;
    hubName: string;
    status: string;
    totalMiles: number | null;
    totalDriveHrs: number | null;
    optimizerScore: number | null;
    departTime: string | null;
    returnTime: string | null;
    personnel: { name: string; role: string }[];
    stops: {
        venueName: string;
        city: string | null;
        state: string | null;
        action: string | null;
        arrivalTime: string | null;
        departTime: string | null;
        assetCount: number;
    }[];
}

export interface StaffAssignmentEmailData {
    personName: string;
    personEmail: string;
    weekNumber: number;
    seasonYear: number;
    trips: StaffAssignmentTrip[];
    travelRecommendations: StaffTravelRec[];
}

export interface StaffAssignmentTrip {
    id: string;
    vehicleName: string;
    hubName: string;
    departTime: string | null;
    returnTime: string | null;
    roleOnTrip: string | null;
    totalMiles: number | null;
    totalDriveHrs: number | null;
    stops: {
        venueName: string;
        city: string | null;
        state: string | null;
        action: string | null;
        arrivalTime: string | null;
    }[];
}

export interface StaffTravelRec {
    type: string;
    providerName: string | null;
    bookingUrl: string | null;
    departureTime: string | null;
    arrivalTime: string | null;
}

export interface AmendmentEmailData {
    personName: string;
    personEmail: string;
    weekNumber: number;
    seasonYear: number;
    changeType: "added" | "removed" | "modified";
    changeSummary: string;
    updatedTrip: StaffAssignmentTrip | null;
}

export interface EmailSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
