"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <html lang="en">
            <body>
                <div className="flex min-h-screen items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold">
                            Something went wrong
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            An unexpected error has occurred.
                        </p>
                        <button
                            onClick={() => reset()}
                            className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
