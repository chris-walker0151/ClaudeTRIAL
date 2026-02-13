import { Resend } from "resend";
import { EMAIL_FROM, EMAIL_FROM_NAME } from "./constants";
import type { EmailSendResult } from "./types";

let resendInstance: Resend | null = null;

function getResend(): Resend {
    if (!resendInstance) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error("RESEND_API_KEY environment variable is not set");
        }
        resendInstance = new Resend(apiKey);
    }
    return resendInstance;
}

export async function sendEmail(
    to: string | string[],
    subject: string,
    html: string,
): Promise<EmailSendResult> {
    try {
        const resend = getResend();
        const { data, error } = await resend.emails.send({
            from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, messageId: data?.id };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Failed to send email",
        };
    }
}
