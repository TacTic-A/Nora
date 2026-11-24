#!/usr/bin/env node
/**
 * Unified E2E Test Suite Runner for Nora Panel Frontend
 * Executes all 4 tiers of opaque-box E2E tests and reports dynamic metrics parsed from Vitest.
 * ZERO hardcoded numbers.
 */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

console.log("===============================================================================");
console.log("🚀 NORA PANEL E2E TEST RUNNER — 4-TIER COMPREHENSIVE SUITE");
console.log("===============================================================================");
console.log(`Directory: ${__dirname}`);
console.log(`Target:    tests/e2e/ (Tiers 1-4)`);
console.log(`Harness:   Headless Component Environment (Happy DOM)`);
console.log("-------------------------------------------------------------------------------\n");

const startTime = Date.now();
const rootDir = path.resolve(__dirname, "../..");
const relReportPath = "tests/e2e/.e2e-report.json";
const reportPath = path.resolve(rootDir, relReportPath);

// Remove previous report if present
if (fs.existsSync(reportPath)) {
	try {
		fs.unlinkSync(reportPath);
	} catch (_) {}
}

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
const vitestArgs = [
	"vitest",
	"run",
	"tests/e2e/",
	"--config",
	"vitest.e2e.config.ts",
	"--reporter=default",
	"--reporter=json",
	`--outputFile=${relReportPath}`,
];

const result = spawnSync(npxCmd, vitestArgs, {
	cwd: rootDir,
	stdio: "inherit",
	shell: true,
	env: { ...process.env, VITE_CONFIG_NATIVE_IGNORE_WARNING: "true" },
});

const duration = ((Date.now() - startTime) / 1000).toFixed(2);

console.log("\n===============================================================================");

let parsedReport = null;
if (fs.existsSync(reportPath)) {
	try {
		const rawContent = fs.readFileSync(reportPath, "utf8");
		parsedReport = JSON.parse(rawContent);
	} catch (err) {
		console.error(`⚠️ Failed to parse Vitest JSON report: ${err.message}`);
	}
}

if (!parsedReport) {
	console.error("❌ E2E TEST EXECUTION FAILED: No JSON report generated.");
	console.error(`Vitest Exit Code: ${result.status}`);
	process.exit(result.status || 1);
}

// Tier classification configuration
const tiers = {
	tier1: {
		label: "Tier 1: Feature Coverage (Features 1-18)",
		matcher: /tier1-feature-coverage/,
		total: 0,
		passed: 0,
		failed: 0,
		skipped: 0,
	},
	tier2: {
		label: "Tier 2: Boundary & Corner Cases (Limits/RWD)",
		matcher: /tier2-boundary-corner/,
		total: 0,
		passed: 0,
		failed: 0,
		skipped: 0,
	},
	tier3: {
		label: "Tier 3: Cross-Feature Interactions",
		matcher: /tier3-cross-feature/,
		total: 0,
		passed: 0,
		failed: 0,
		skipped: 0,
	},
	tier4: {
		label: "Tier 4: Real-World Operator Scenarios",
		matcher: /tier4-real-world-scenarios/,
		total: 0,
		passed: 0,
		failed: 0,
		skipped: 0,
	},
	other: {
		label: "Other E2E Specifications",
		matcher: /.*/,
		total: 0,
		passed: 0,
		failed: 0,
		skipped: 0,
	},
};

const failedTestsList = [];

// Aggregate test results dynamically from parsed JSON
for (const testFile of parsedReport.testResults || []) {
	const normalizedPath = (testFile.name || "").replace(/\\/g, "/");
	let assignedKey = "other";

	if (tiers.tier1.matcher.test(normalizedPath)) assignedKey = "tier1";
	else if (tiers.tier2.matcher.test(normalizedPath)) assignedKey = "tier2";
	else if (tiers.tier3.matcher.test(normalizedPath)) assignedKey = "tier3";
	else if (tiers.tier4.matcher.test(normalizedPath)) assignedKey = "tier4";

	const tierStats = tiers[assignedKey];

	for (const assertion of testFile.assertionResults || []) {
		tierStats.total += 1;
		if (assertion.status === "passed") {
			tierStats.passed += 1;
		} else if (assertion.status === "failed") {
			tierStats.failed += 1;
			failedTestsList.push({
				file: path.relative(rootDir, testFile.name),
				title: assertion.title || assertion.fullName,
				messages: assertion.failureMessages || [],
			});
		} else {
			tierStats.skipped += 1;
		}
	}
}

const totalTests = parsedReport.numTotalTests || 0;
const totalPassed = parsedReport.numPassedTests || 0;
const totalFailed = parsedReport.numFailedTests || 0;
const totalPending = parsedReport.numPendingTests || 0;

console.log("📊 4-Tier Test Suite Dynamic Breakdown:");
for (const key of ["tier1", "tier2", "tier3", "tier4"]) {
	const t = tiers[key];
	if (t.total > 0 || key !== "other") {
		const pct = t.total > 0 ? ((t.passed / t.total) * 100).toFixed(0) : "0";
		const failureNote = t.failed > 0 ? ` [${t.failed} FAILED]` : "";
		console.log(
			`   • ${t.label.padEnd(46)}: ${String(t.passed).padStart(3)} / ${String(t.total).padStart(3)} Passed (${pct}%)${failureNote}`,
		);
	}
}

if (tiers.other.total > 0) {
	const pct = ((tiers.other.passed / tiers.other.total) * 100).toFixed(0);
	console.log(
		`   • ${tiers.other.label.padEnd(46)}: ${String(tiers.other.passed).padStart(3)} / ${String(tiers.other.total).padStart(3)} Passed (${pct}%)`,
	);
}

console.log("-------------------------------------------------------------------------------");
console.log(
	`   TOTAL: ${totalPassed} / ${totalTests} E2E Tests Passed${totalFailed > 0 ? ` (${totalFailed} Failed)` : ""}${totalPending > 0 ? ` (${totalPending} Skipped)` : ""} in ${duration}s`,
);
console.log("===============================================================================\n");

// Clean up temporary report file unless requested to keep
if (!process.env.KEEP_E2E_REPORT && fs.existsSync(reportPath)) {
	try {
		fs.unlinkSync(reportPath);
	} catch (_) {}
}

if (totalFailed > 0 || result.status !== 0 || totalTests === 0) {
	console.error("❌ E2E TEST SUITE VERIFICATION FAILED\n");
	if (failedTestsList.length > 0) {
		console.error("Diagnostic Failure Summary:");
		failedTestsList.forEach((f, idx) => {
			console.error(`  ${idx + 1}) [${f.file}] ${f.title}`);
			if (f.messages && f.messages.length > 0) {
				console.error(`     Error: ${f.messages[0].split("\n")[0]}`);
			}
		});
		console.error("");
	}
	process.exit(result.status || (totalFailed > 0 ? 1 : 0));
}

console.log("✅ ALL E2E TEST TIERS PASSED WITH 100% INTEGRITY!\n");
process.exit(0);
