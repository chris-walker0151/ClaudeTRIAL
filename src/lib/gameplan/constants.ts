export const APPROVABLE_STATUSES = ["draft", "recommended"] as const;
export const LOCKED_STATUS = "confirmed" as const;
export const OPTIMIZATION_SERVICE_URL =
    process.env.OPTIMIZATION_SERVICE_URL || "http://localhost:5001";
