export const EMAIL_FROM = process.env.RESEND_FROM_EMAIL || "ops@dragonseats.com";
export const EMAIL_FROM_NAME = "Dragon Seats Ops";

export const EMAIL_SUBJECTS = {
    opsGameplan: (week: number) =>
        `Week ${week} Gameplan — Dragon Seats`,
    staffAssignment: (week: number) =>
        `Your Week ${week} Assignment — Dragon Seats`,
    amendment: (week: number) =>
        `Schedule Update — Week ${week} — Dragon Seats`,
};

export const OPS_RECIPIENTS = (process.env.OPS_EMAIL_RECIPIENTS || "").split(",").filter(Boolean);

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
