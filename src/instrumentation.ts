// instrumentation.ts
// Next.js instrumentation hook — initializes Sentry on the server side.
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

import * as Sentry from "@sentry/nextjs";

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        // Dynamically import the server config to initialize Sentry on the server.
        await import("../sentry.server.config");
    }

    if (process.env.NEXT_RUNTIME === "edge") {
        // Dynamically import the server config for edge runtime too.
        await import("../sentry.server.config");
    }
}

export const onRequestError = Sentry.captureRequestError;
