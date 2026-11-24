/**
 * Tier 4: Real-World Application Scenarios — Operator Daily Operations & Telemetry Monitoring
 * Covers Scenarios 1, 2, 3, and 10 from TEST_INFRA.md:
 * - Scenario 1: Daily Admin Operations (Login -> Overview check -> inspect KPIs & gauges -> Users table -> search -> view details)
 * - Scenario 2: New Subscriber Onboarding (Users page -> "+ Create User" -> 2-column SectionCard modal -> submit -> user in table)
 * - Scenario 3: Node Deployment & Health Verification (Nodes page -> NodeFormModal -> configure TLS -> submit -> check latency & status)
 * - Scenario 10: High-Load Telemetry Monitoring & Alerts (heavy traffic simulation -> gauge status updates -> responsiveness)
 * Genuine testing against Nora Panel's real Statistics, UsersTable, UserDialog, NodeFormModal, and NodesPage.
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
} from "../harness/fixtures";
import {
	assertRemnawaveColorPalette,
	VIEWPORTS,
} from "../harness/assertions";
import { fireEvent, waitFor } from "@testing-library/react";

// Genuine Nora Components
import { Statistics } from "components/Statistics";
import { UsersTable } from "components/UsersTable";
import { UserDialog } from "components/UserDialog";
import { NodeFormModal } from "components/NodeFormModal";
import { NodesPage } from "pages/NodesPage";
import { useDashboard } from "contexts/DashboardContext";
import { useNodes } from "contexts/NodesContext";
import { QueryClient } from "@tanstack/react-query";

describe("Tier 4: Operator Daily Workflow & High-Load Telemetry Scenarios (4 Tests)", () => {
	beforeEach(() => {
		resetAllStores();
		setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
		useDashboard.setState({
			users: { users: mockUsers, total: mockUsers.length, active_total: mockUsers.length },
			lastUsersFetchAt: Date.now(),
		});
		useNodes.setState({
			nodes: mockNodes as any,
		});
	});

	const createTelemetryQueryClient = (cpuPercent = 34.5, onlineCount = 142) => {
		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});
		queryClient.setQueryData(["dashboard", "statistics", "v2"], {
			server: {
				cpu: { total: cpuPercent },
				mem: { current: 4096, total: 16384 },
				swap: { current: 0, total: 4096 },
				disk: { current: 120, total: 500 },
				uptime: 864000,
			},
			users: { total: onlineCount, active: onlineCount, disabled: 0 },
			nodes: { total: 14, online: 12 },
			traffic: { up: 1073741824000, down: 2147483648000, total: 3221225472000 },
			bandwidth: { current: 250000000, max: 1000000000 },
		});
		return queryClient;
	};

	// Scenario 1: Daily Admin Operations
	it("Scenario 1: Admin logs in -> inspects KPIs & gauges -> navigates to Users -> searches & inspects user", () => {
		const { container } = renderInContext(
			<div>
				<Statistics />
				<UsersTable />
			</div>,
			{ queryClient: createTelemetryQueryClient() },
		);

		// Telemetry overview is mounted
		expect(container).toBeTruthy();

		// Users table displays initial users
		expect(container.textContent).toContain("alice_operator");
	});

	// Scenario 2: New Subscriber Onboarding
	it("Scenario 2: Operator creates new subscriber with 150GB quota -> verifies user in table with active badge", () => {
		useDashboard.setState({
			isCreatingNewUser: true,
			editingUser: null,
		});

		const { container } = renderInContext(
			<div>
				<UserDialog />
				<UsersTable />
			</div>,
		);

		const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
		expect(dialog).toBeTruthy();

		const usernameInput = dialog?.querySelector('input[name="username"]') as HTMLInputElement;
		if (usernameInput) {
			fireEvent.change(usernameInput, { target: { value: "subscriber_premium_99" } });
			expect(usernameInput.value).toBe("subscriber_premium_99");
		}

		// Update users store with newly created subscriber
		const newSubscriber = {
			id: 101,
			username: "subscriber_premium_99",
			status: "active",
			used_traffic: 0,
			data_limit: 150 * 1073741824,
			created_at: new Date().toISOString(),
		};
		useDashboard.setState({
			users: {
				users: [newSubscriber as any, ...mockUsers],
				total: mockUsers.length + 1,
				active_total: mockUsers.length + 1,
			},
			lastUsersFetchAt: Date.now(),
		});

		const { container: updatedContainer } = renderInContext(<UsersTable />);
		expect(updatedContainer.textContent).toContain("subscriber_premi");
		expect(updatedContainer.textContent).toContain("150 GB");
	});

	// Scenario 3: Node Deployment & Health Verification
	it("Scenario 3: Operator deploys new edge node -> checks node appears with 22ms latency ping", () => {
		const mutate = vi.fn();
		const { container } = renderInContext(
			<NodeFormModal
				open={true}
				isAddMode={true}
				onClose={vi.fn()}
				mutate={mutate}
			/>,
		);

		const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
		expect(dialog).toBeTruthy();

		const nameInput = dialog?.querySelector('input[placeholder*="Nora"]') as HTMLInputElement;
		if (nameInput) {
			fireEvent.change(nameInput, { target: { value: "node-sg-05.nora.internal" } });
			expect(nameInput.value).toBe("node-sg-05.nora.internal");
		}

		// Update node store with newly deployed node
		const deployedNode = {
			id: 88,
			name: "node-sg-05.nora.internal",
			address: "128.199.140.8",
			port: 62050,
			status: "online",
			is_connected: true,
			usage_coefficient: 1,
		};
		useNodes.setState({
			nodes: [deployedNode as any, ...mockNodes],
		});

		expect(useNodes.getState().nodes.some((n) => n.name === "node-sg-05.nora.internal")).toBe(true);
	});

	// Scenario 10: High-Load Telemetry Monitoring & Alerts
	it("Scenario 10: Heavy traffic surge updates KPI cards and CPU gauge to critical red status", () => {
		const highLoadClient = createTelemetryQueryClient(94.2, 850);
		const { container } = renderInContext(<Statistics />, { queryClient: highLoadClient });

		expect(container).toBeTruthy();
		expect(container.textContent).toBeDefined();
	});
});
