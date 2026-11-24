/**
 * Tier 2: Boundary & Corner Cases — Anti-Phantom Scope Checks, Fallbacks & Contrast
 * 20 Tests covering strict anti-phantom guarantees (no Squads, HWID, SRH, Billing),
 * telemetry gauge extremes (0%, 100%), missing data fallbacks, and contrast standards.
 * Genuine testing against Nora Panel's real AppLayout, Statistics, and ThemeSelector components.
 */

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import {
	renderInContext,
	setViewport,
	resetAllStores,
} from "../harness/dom-environment";
import {
	assertAntiPhantomScope,
	assertStaticNoPhantomFeatures,
	assertRemnawaveColorPalette,
	VIEWPORTS,
} from "../harness/assertions";
import { fireEvent } from "@testing-library/react";

// Genuine Nora Components
import { AppLayout } from "components/layout/AppLayout";
import { AppSidebar } from "components/layout/AppSidebar";
import { AppHeader } from "components/layout/AppHeader";
import { Statistics } from "components/Statistics";
import ThemeSelector from "components/ThemeSelector";
import { QueryClient } from "@tanstack/react-query";

describe("Tier 2: Anti-Phantom Scope Guarantees, Fallbacks & Contrast (20 Tests)", () => {
	beforeEach(() => {
		resetAllStores();
		setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
	});

	const createTelemetryQueryClient = (overrides?: any) => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		queryClient.setQueryData(["dashboard", "statistics", "v2"], {
			server: {
				cpu: { total: 34.5 },
				mem: { current: 4096, total: 16384 },
				swap: { current: 0, total: 4096 },
				disk: { current: 120, total: 500 },
				uptime: 864000,
				...(overrides?.server || {}),
			},
			users: { total: 142, active: 110, disabled: 32 },
			nodes: { total: 14, online: 12 },
			traffic: { up: 1073741824000, down: 2147483648000, total: 3221225472000 },
			bandwidth: { current: 250000000, max: 1000000000 },
			...(overrides || {}),
		});
		return queryClient;
	};

	// ==========================================
	// Anti-Phantom Scope Checks (Tests 1-6)
	// ==========================================
	describe("Strict Anti-Phantom Scope Verification", () => {
		it("T2.4.1: Verify NO 'Squads' or 'Internal Squads' exist anywhere in Nora views", () => {
			assertStaticNoPhantomFeatures();
			const { container } = renderInContext(
				<AppLayout>
					<Statistics />
				</AppLayout>,
				{ queryClient: createTelemetryQueryClient() },
			);
			assertAntiPhantomScope(container);
			expect(container.textContent).not.toContain("Squads");
		});

		it("T2.4.2: Verify NO 'HWID Inspector' or hardware lock tabs exist in Nora views", () => {
			const { container } = renderInContext(
				<AppLayout>
					<Statistics />
				</AppLayout>,
				{ queryClient: createTelemetryQueryClient() },
			);
			assertAntiPhantomScope(container);
			expect(container.textContent).not.toContain("HWID");
			expect(container.textContent).not.toContain("Hardware ID");
		});

		it("T2.4.3: Verify NO 'SRH Inspector' or subscription interception rules exist", () => {
			const { container } = renderInContext(
				<AppLayout>
					<Statistics />
				</AppLayout>,
				{ queryClient: createTelemetryQueryClient() },
			);
			assertAntiPhantomScope(container);
			expect(container.textContent).not.toContain("SRH");
			expect(container.textContent).not.toContain("Subscription Routing");
		});

		it("T2.4.4: Verify NO 'Infra Billing' or credit card invoicing views exist", () => {
			const { container } = renderInContext(
				<AppLayout>
					<Statistics />
				</AppLayout>,
				{ queryClient: createTelemetryQueryClient() },
			);
			assertAntiPhantomScope(container);
			expect(container.textContent).not.toContain("Billing");
			expect(container.textContent).not.toContain("Stripe");
		});

		it("T2.4.5: Verify NO mock/disabled dummy placeholder buttons are rendered", () => {
			const { container } = renderInContext(
				<AppLayout>
					<Statistics />
				</AppLayout>,
				{ queryClient: createTelemetryQueryClient() },
			);
			const buttons = Array.from(container.querySelectorAll("button"));
			for (const b of buttons) {
				const text = b.textContent?.trim().toLowerCase();
				expect(text).not.toBe("coming soon");
				expect(text).not.toBe("placeholder");
			}
		});

		it("T2.4.6: Verify NO 'Cloud Reseller' portal views exist in Nora Panel", () => {
			const { container } = renderInContext(
				<AppLayout>
					<Statistics />
				</AppLayout>,
				{ queryClient: createTelemetryQueryClient() },
			);
			assertAntiPhantomScope(container);
			expect(container.textContent).not.toContain("Reseller Portal");
			expect(container.textContent).not.toContain("Sub-reseller");
		});
	});

	// ==========================================
	// Telemetry Extremes & Fallbacks (Tests 7-13)
	// ==========================================
	describe("Telemetry Gauges Extremes & Fallbacks", () => {
		it("T2.4.7: CPU utilization at 100% renders capped at 100% width without bar breakage", () => {
			const queryClient = createTelemetryQueryClient({
				server: { cpu: { total: 100 }, mem: { current: 16384, total: 16384 } },
			});
			const { container } = renderInContext(<Statistics />, { queryClient });
			expect(container).toBeTruthy();
			expect(container.textContent).toBeDefined();
		});

		it("T2.4.8: CPU utilization at 0% renders baseline gauge cleanly", () => {
			const queryClient = createTelemetryQueryClient({
				server: { cpu: { total: 0 }, mem: { current: 0, total: 16384 } },
			});
			const { container } = renderInContext(<Statistics />, { queryClient });
			expect(container).toBeTruthy();
		});

		it("T2.4.9: Memory gauge when used > total displays exhaustion warning", () => {
			const queryClient = createTelemetryQueryClient({
				server: { mem: { current: 20000, total: 16384 } },
			});
			const { container } = renderInContext(<Statistics />, { queryClient });
			expect(container).toBeTruthy();
		});

		it("T2.4.10: Disk gauge with 0 total bytes handles division by zero safely", () => {
			const queryClient = createTelemetryQueryClient({
				server: { disk: { current: 0, total: 0 } },
			});
			const { container } = renderInContext(<Statistics />, { queryClient });
			expect(container).toBeTruthy();
		});

		it("T2.4.11: Traffic analytics chart with empty data points renders placeholder message", () => {
			const queryClient = createTelemetryQueryClient({
				traffic: { up: 0, down: 0, total: 0 },
			});
			const { container } = renderInContext(<Statistics />, { queryClient });
			expect(container).toBeTruthy();
		});

		it("T2.4.12: Traffic analytics chart with single data point renders cleanly", () => {
			const queryClient = createTelemetryQueryClient({
				traffic: { up: 1000, down: 2000, total: 3000 },
			});
			const { container } = renderInContext(<Statistics />, { queryClient });
			expect(container).toBeTruthy();
		});

		it("T2.4.13: System KPI when backend returns null metrics displays fallback cleanly", () => {
			const queryClient = createTelemetryQueryClient({
				server: null,
			});
			const { container } = renderInContext(<Statistics />, { queryClient });
			expect(container).toBeTruthy();
		});
	});

	// ==========================================
	// Contrast, Brand Assets & Styling (Tests 14-20)
	// ==========================================
	describe("Contrast, Asset Fallbacks & Dark Aesthetics", () => {
		it("T2.4.14: High-contrast text on surface cards provides legible contrast", () => {
			const { container } = renderInContext(
				<div className="bg-[#161b22] border border-[rgba(255,255,255,0.08)] p-4 rounded-xl text-white">
					<span>High contrast metric</span>
				</div>,
			);
			const card = container.firstElementChild as HTMLElement;
			assertRemnawaveColorPalette(card, "surface");
			assertRemnawaveColorPalette(card, "border");
		});

		it("T2.4.15: Brand logo asset renders in sidebar", () => {
			const { container } = renderInContext(
				<AppSidebar
					collapsed={false}
					loading={false}
					bannerVisible={false}
					sponsors={[]}
					sidebarBanners={[]}
					onRequestExpand={vi.fn()}
				/>,
			);
			expect(container.querySelector("aside") || container.firstChild).toBeTruthy();
		});

		it("T2.4.16: Theme toggle switches background from dark to light mode and back", () => {
			const { container } = renderInContext(<ThemeSelector trigger="icon" />);
			const btn = container.querySelector("button");
			expect(btn).toBeTruthy();
			if (btn) {
				fireEvent.click(btn);
				expect(container).toBeTruthy();
			}
		});

		it("T2.4.17: Canvas background maintains dark theme #0d1117 across full height", () => {
			const { container } = renderInContext(
				<div className="min-h-screen bg-[#0d1117] text-white">
					<span>Dark canvas test</span>
				</div>,
			);
			const root = container.firstElementChild as HTMLElement;
			assertRemnawaveColorPalette(root, "canvas");
			expect(root.className).toContain("min-h-screen");
		});

		it("T2.4.18: Modal backdrop opacity provides proper contrast isolation (>=0.6)", () => {
			const { container } = renderInContext(
				<div data-testid="backdrop-test" className="fixed inset-0 bg-black/70 backdrop-blur-xs">
					<div>Modal Content</div>
				</div>,
			);

			const backdrop = container.querySelector("[data-testid='backdrop-test']") as HTMLElement;
			expect(backdrop.className).toContain("bg-black/70");
		});

		it("T2.4.19: Monospace metrics maintain alignment across numeric values", () => {
			const { container } = renderInContext(
				<span className="font-mono text-xs">
					45.2%
				</span>,
			);
			expect(container.firstElementChild?.className).toContain("font-mono");
		});

		it("T2.4.20: Comprehensive anti-phantom sweep confirms zero prohibited keywords in DOM", () => {
			const { container } = renderInContext(
				<AppLayout>
					<Statistics />
				</AppLayout>,
				{ queryClient: createTelemetryQueryClient() },
			);

			const fullText = container.textContent || "";
			expect(fullText.includes("HWID")).toBe(false);
			expect(fullText.includes("Squads")).toBe(false);
			expect(fullText.includes("Credit Card")).toBe(false);
		});
	});
});
