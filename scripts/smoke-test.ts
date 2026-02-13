/**
 * Production smoke test for Dragon Seats platform.
 * Run: npx tsx scripts/smoke-test.ts
 *
 * Requires: PRODUCTION_URL and OPTIMIZATION_SERVICE_URL environment variables
 */

const BASE_URL = process.env.PRODUCTION_URL || "http://localhost:3000";
const OPTIMIZER_URL = process.env.OPTIMIZATION_SERVICE_URL || "http://localhost:5001";

interface TestResult {
    name: string;
    passed: boolean;
    message: string;
    durationMs: number;
}

async function runTest(
    name: string,
    fn: () => Promise<void>,
): Promise<TestResult> {
    const start = Date.now();
    try {
        await fn();
        return {
            name,
            passed: true,
            message: "OK",
            durationMs: Date.now() - start,
        };
    } catch (err) {
        return {
            name,
            passed: false,
            message: String(err),
            durationMs: Date.now() - start,
        };
    }
}

async function main() {
    console.log(`\nSmoke Testing: ${BASE_URL}`);
    console.log(`Optimizer: ${OPTIMIZER_URL}\n`);

    const results: TestResult[] = [];

    // Test 1: Frontend loads
    results.push(
        await runTest("Frontend loads", async () => {
            const res = await fetch(BASE_URL);
            if (!res.ok && res.status !== 307)
                throw new Error(`Status ${res.status}`);
        }),
    );

    // Test 2: Login page accessible
    results.push(
        await runTest("Login page accessible", async () => {
            const res = await fetch(`${BASE_URL}/login`, { redirect: "manual" });
            if (res.status >= 500)
                throw new Error(`Status ${res.status}`);
        }),
    );

    // Test 3: Optimizer health check
    results.push(
        await runTest("Optimizer health check", async () => {
            const res = await fetch(`${OPTIMIZER_URL}/health`);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            if (data.status !== "ok")
                throw new Error(`Health status: ${data.status}`);
        }),
    );

    // Test 4: API auth guard (should reject unauthenticated)
    results.push(
        await runTest("API auth guard", async () => {
            const res = await fetch(`${BASE_URL}/api/optimize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    season_year: 2025,
                    week_number: 1,
                }),
            });
            // Should get 401 or redirect (not 200)
            if (res.status === 200)
                throw new Error("API accessible without auth");
        }),
    );

    // Test 5: Cron endpoint auth guard
    results.push(
        await runTest("Cron auth guard", async () => {
            const res = await fetch(`${BASE_URL}/api/cron/monday-run`, {
                method: "POST",
            });
            if (res.status === 200)
                throw new Error("Cron accessible without secret");
        }),
    );

    // Print results
    console.log("=== Smoke Test Results ===\n");
    for (const r of results) {
        const icon = r.passed ? "✅ PASS" : "❌ FAIL";
        console.log(
            `${icon}  ${r.name} (${r.durationMs}ms)${r.passed ? "" : ` — ${r.message}`}`,
        );
    }

    const failed = results.filter((r) => !r.passed);
    console.log(
        `\n${results.length - failed.length}/${results.length} tests passed\n`,
    );

    if (failed.length > 0) process.exit(1);
}

main();
