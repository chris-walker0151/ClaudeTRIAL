// sentry.client.config.ts
// This file configures the initialization of Sentry on the client (browser).
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
    // Adjust this value in production.
    tracesSampleRate: 1.0,

    // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/.*\.supabase\.co/],

    // Capture Replay for 10% of all sessions, plus 100% of sessions with errors.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Only initialize if DSN is configured
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    integrations: [
        Sentry.replayIntegration(),
        Sentry.browserTracingIntegration(),
    ],

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
});
