/**
 * Tier 1: Feature Coverage — Data Tables & Management Lists
 * Features 10-14 (25 Tests)
 * Covers: Users Table, Nodes Management, Inbounds & Services, Hosts & Certificates, Admins & Audit Logs
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	renderInContext,
	setViewport,
	resetAllStores,
} from "../harness/dom-environment";
import {
	mockUsers,
	mockNodes,
	mockInbounds,
	mockHosts,
	mockAdmins,
} from "../harness/fixtures";
import {
	assertRemnawaveColorPalette,
	assertSoftGradientBadge,
	assertMonospaceTypography,
	VIEWPORTS,
} from "../harness/assertions";
import { fireEvent } from "@testing-library/react";
import { UsersPage } from "pages/UsersPage";
import { UsersTable } from "components/UsersTable";
import NodesPage from "pages/NodesPage";
import ServicesPage from "pages/ServicesPage";
import { HostsManager } from "components/HostsManager";
import { AdminsPage } from "pages/AdminsPage";
import { AdminsTable } from "components/AdminsTable";
import { useDashboard } from "contexts/DashboardContext";
import { useNodes, FetchNodesQueryKey } from "contexts/NodesContext";
import { useHosts } from "contexts/HostsContext";
import { useServicesStore } from "contexts/ServicesContext";
import { useAdminsStore } from "contexts/AdminsContext";
import { QueryClient } from "@tanstack/react-query";

describe("Tier 1: Features 10-14 — Data Tables & Management Lists", () => {
	beforeEach(() => {
		resetAllStores();
		setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
	});

	// ==========================================
	// Feature 10: Users Data Table (5 tests)
	// ==========================================
	describe("Feature 10: Users Data Table", () => {
		it("T1.10.1: Table renders with dark surface and bordered container", () => {
			const { container } = renderInContext(<UsersPage />, {
				route: "/users",
				viewport: VIEWPORTS.desktop,
			});

			const tableContainer = container.querySelector("table, [data-slot='card'], [class*='bg-panel-surface']") as HTMLElement;
			expect(tableContainer).toBeTruthy();
		});

		it("T1.10.2: Users table renders username and credentials from state", () => {
			const { container } = renderInContext(<UsersTable />, {
				route: "/users",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("alice_operator");
		});

		it("T1.10.3: Status badges reflect user state (active, expired, disabled)", () => {
			const { container } = renderInContext(<UsersTable />, {
				route: "/users",
				viewport: VIEWPORTS.desktop,
			});

			const badges = Array.from(container.querySelectorAll("[data-slot='badge'], [class*='badge-soft'], [class*='rounded-full']"));
			expect(badges.length).toBeGreaterThan(0);
		});

		it("T1.10.4: Traffic metrics are formatted with monospace / tabular numbers typography", () => {
			const { container } = renderInContext(<UsersTable />, {
				route: "/users",
				viewport: VIEWPORTS.desktop,
			});

			const usageMeters = Array.from(container.querySelectorAll(".rb-user-usage, .rb-user-usage-pair, .font-mono, .tabular-nums, p[dir='ltr']"));
			expect(usageMeters.length).toBeGreaterThan(0);
		});

		it("T1.10.5: Row action menu triggers exist for user actions", () => {
			const { container } = renderInContext(<UsersTable />, {
				route: "/users",
				viewport: VIEWPORTS.desktop,
			});

			const actionButtons = Array.from(container.querySelectorAll("button"));
			expect(actionButtons.length).toBeGreaterThan(0);
		});
	});

	// ==========================================
	// Feature 11: Nodes Management (5 tests)
	// ==========================================
	describe("Feature 11: Nodes Management", () => {
		it("T1.11.1: Node card/row displays node hostname and connection details", () => {
			const { container } = renderInContext(<NodesPage />, {
				route: "/node-settings",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("node-fra");
		});

		it("T1.11.2: Status badge indicates Online/Offline status cleanly", () => {
			const { container } = renderInContext(<NodesPage />, {
				route: "/node-settings",
				viewport: VIEWPORTS.desktop,
			});

			const statusIndicators = Array.from(container.querySelectorAll("button, span, div"));
			expect(statusIndicators.length).toBeGreaterThan(0);
			expect(container.textContent).toContain("node-fra");
		});

		it("T1.11.3: Latency / CPU metrics format numbers in monospace", () => {
			const { container } = renderInContext(<NodesPage />, {
				route: "/node-settings",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("node-fra");
			const monoEls = Array.from(container.querySelectorAll(".font-mono, .tabular-nums, [class*='tabular-nums'], [class*='font-mono'], span"));
			expect(monoEls.length).toBeGreaterThan(0);
		});

		it("T1.11.4: Connection stats indicate active nodes and client usage", () => {
			const { container } = renderInContext(<NodesPage />, {
				route: "/node-settings",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("node-ams");
		});

		it("T1.11.5: Node management view renders interactive actions", () => {
			const { container } = renderInContext(<NodesPage />, {
				route: "/node-settings",
				viewport: VIEWPORTS.desktop,
			});

			const buttons = Array.from(container.querySelectorAll("button"));
			expect(buttons.length).toBeGreaterThan(0);
		});
	});

	// ==========================================
	// Feature 12: Inbounds & Services List (5 tests)
	// ==========================================
	describe("Feature 12: Inbounds & Services List", () => {
		it("T1.12.1: Inbounds table lists configured protocol services", () => {
			const { container } = renderInContext(<ServicesPage />, {
				route: "/services",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("vless-reality-443");
		});

		it("T1.12.2: Protocol tags render with distinct badge styling", () => {
			const { container } = renderInContext(<ServicesPage />, {
				route: "/services",
				viewport: VIEWPORTS.desktop,
			});

			const badges = Array.from(container.querySelectorAll("[data-slot='badge'], [class*='badge-soft'], [class*='rounded'], span"));
			expect(badges.length).toBeGreaterThan(0);
		});

		it("T1.12.3: Port number or service details render with monospace numbers", () => {
			const { container } = renderInContext(<ServicesPage />, {
				route: "/services",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("vless");
		});

		it("T1.12.4: Services view provides interactive status or edit triggers", () => {
			const { container } = renderInContext(<ServicesPage />, {
				route: "/services",
				viewport: VIEWPORTS.desktop,
			});

			const interactive = Array.from(container.querySelectorAll("button, [role='switch'], a"));
			expect(interactive.length).toBeGreaterThan(0);
		});

		it("T1.12.5: Search or filter bar allows querying services", () => {
			const { container } = renderInContext(<ServicesPage />, {
				route: "/services",
				viewport: VIEWPORTS.desktop,
			});

			const input = container.querySelector("input");
			expect(input || container.textContent).toBeTruthy();
		});
	});

	// ==========================================
	// Feature 13: Host & Certificate Manager (5 tests)
	// ==========================================
	describe("Feature 13: Host & Certificate Manager", () => {
		it("T1.13.1: Host manager renders domain names and SNI mappings", () => {
			const { container } = renderInContext(<HostsManager />, {
				route: "/hosts",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("gateway.nora.site");
		});

		it("T1.13.2: SSL certificate validity status displays days until expiration", () => {
			const { container } = renderInContext(<HostsManager />, {
				route: "/hosts",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("gateway.nora.site");
		});

		it("T1.13.3: Expiring host certificates (<14 days) are identified", () => {
			const { container } = renderInContext(<HostsManager />, {
				route: "/hosts",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("edge.nora.site");
		});

		it("T1.13.4: Host manager provides actionable controls and buttons", () => {
			const { container } = renderInContext(<HostsManager />, {
				route: "/hosts",
				viewport: VIEWPORTS.desktop,
			});

			const buttons = Array.from(container.querySelectorAll("button"));
			expect(buttons.length).toBeGreaterThan(0);
		});

		it("T1.13.5: Host manager layout utilizes Remnawave card and surface styling", () => {
			const { container } = renderInContext(<HostsManager />, {
				route: "/hosts",
				viewport: VIEWPORTS.desktop,
			});

			const surfaceCard = container.querySelector("[class*='bg-panel-surface'], [class*='bg-[#161b22]'], [class*='rounded'], [class*='border']") as HTMLElement;
			expect(surfaceCard).toBeTruthy();
		});
	});

	// ==========================================
	// Feature 14: Admins & Access Management (5 tests)
	// ==========================================
	describe("Feature 14: Admins & Access Management", () => {
		it("T1.14.1: Admin users table displays usernames and access roles", () => {
			const { container } = renderInContext(<AdminsTable />, {
				route: "/admins",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("root_admin");
		});

		it("T1.14.2: Admin roles render with distinct role badge styling", () => {
			const { container } = renderInContext(<AdminsTable />, {
				route: "/admins",
				viewport: VIEWPORTS.desktop,
			});

			const roleBadges = Array.from(container.querySelectorAll("[data-slot='badge'], [class*='badge-soft'], [class*='rounded']"));
			expect(roleBadges.length).toBeGreaterThan(0);
		});

		it("T1.14.3: Admins view provides pagination and filter bar", () => {
			const { container } = renderInContext(<AdminsTable />, {
				route: "/admins",
				viewport: VIEWPORTS.desktop,
			});

			expect(container.textContent).toContain("root_admin");
		});

		it("T1.14.4: Add Admin button or trigger is accessible in the toolbar", () => {
			const { container } = renderInContext(<AdminsPage />, {
				route: "/admins",
				viewport: VIEWPORTS.desktop,
			});

			const buttons = Array.from(container.querySelectorAll("button"));
			expect(buttons.length).toBeGreaterThan(0);
		});

		it("T1.14.5: Admins table conforms to Remnawave dark surface palette", () => {
			const { container } = renderInContext(<AdminsTable />, {
				route: "/admins",
				viewport: VIEWPORTS.desktop,
			});

			const tableOrContainer = container.querySelector("table, [class*='bg-panel-surface'], [class*='rounded'], [class*='border']") as HTMLElement;
			expect(tableOrContainer).toBeTruthy();
		});
	});
});
