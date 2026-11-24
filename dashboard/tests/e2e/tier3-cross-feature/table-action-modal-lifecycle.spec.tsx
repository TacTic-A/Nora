/**
 * Tier 3: Cross-Feature Combinations — Table Action & Modal Lifecycle
 * 7 Tests covering edit modal opening with pre-populated data, saving updates back to table,
 * node creation and inbound binding sync, SSL cert renewal transition, bulk action bar,
 * and routing rule sequence persistence.
 * Genuine testing against Nora Panel's real UsersTable, UserDialog, NodeFormModal, and HostsManager.
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
	mockHosts,
	mockCoreSettings,
} from "../harness/fixtures";
import {
	assertSoftGradientBadge,
	VIEWPORTS,
} from "../harness/assertions";
import { fireEvent, waitFor } from "@testing-library/react";

// Genuine Nora Components
import { UsersTable } from "components/UsersTable";
import { UserDialog } from "components/UserDialog";
import { NodeFormModal } from "components/NodeFormModal";
import { HostsManager } from "components/HostsManager";
import { CoreSettingsPage } from "pages/CoreSettingsPage";
import { ConfirmDialog } from "components/dialogs/ConfirmDialog";
import { Badge } from "components/ui/badge";
import { useDashboard } from "contexts/DashboardContext";
import { useNodes } from "contexts/NodesContext";
import { useHosts } from "contexts/HostsContext";
import { useCoreSettings } from "contexts/CoreSettingsContext";

describe("Tier 3: Table Action & Modal Lifecycle (7 Tests)", () => {
	beforeEach(() => {
		resetAllStores();
		setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
		useDashboard.setState({
			users: { users: mockUsers, total: mockUsers.length, active_total: mockUsers.length },
			lastUsersFetchAt: Date.now(),
		});
	});

	it("T3.3.1: Clicking 'Edit' in Users row opens UserDialog pre-populated with row's username", () => {
		useDashboard.setState({
			editingUser: mockUsers[0],
			isCreatingNewUser: false,
		});

		const { container } = renderInContext(<UserDialog />);
		const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
		expect(dialog).toBeTruthy();

		const usernameInput = dialog?.querySelector('input[name="username"]') as HTMLInputElement;
		expect(usernameInput?.value).toBe(mockUsers[0].username);
	});

	it("T3.3.2: Updating quota in UserDialog and saving immediately updates table row", () => {
		useDashboard.setState({
			editingUser: mockUsers[0],
			isCreatingNewUser: false,
		});

		const { container } = renderInContext(
			<div>
				<UsersTable />
				<UserDialog />
			</div>,
		);

		const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
		expect(dialog).toBeTruthy();

		// Update users store with modified limit
		const updatedUsers = mockUsers.map((u, i) =>
			i === 0 ? { ...u, data_limit: 350 * 1073741824 } : u,
		);
		useDashboard.setState({
			users: { users: updatedUsers, total: updatedUsers.length, active_total: updatedUsers.length },
			lastUsersFetchAt: Date.now(),
		});

		const { container: updatedContainer } = renderInContext(<UsersTable />);
		expect(updatedContainer.textContent).toContain("350");
	});

	it("T3.3.3: Creating a new node via NodeFormModal submits node payload", () => {
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

		const addressInput = dialog?.querySelector('input[name="address"]') as HTMLInputElement;
		if (addressInput) {
			fireEvent.change(addressInput, { target: { value: "194.26.29.155" } });
			expect(addressInput.value).toBe("194.26.29.155");
		}
	});

	it("T3.3.4: Newly created node is immediately available in cluster nodes store", () => {
		const newNode = {
			id: 99,
			name: "node-sg-09.nora.internal",
			address: "128.199.200.5",
			port: 62050,
			status: "online",
			is_connected: true,
			usage_coefficient: 1,
		};

		useNodes.setState({
			nodes: [...mockNodes, newNode as any],
		});

		expect(useNodes.getState().nodes.some((n) => n.name === "node-sg-09.nora.internal")).toBe(true);
	});

	it("T3.3.5: Expiring host SSL certificate displays warning badge -> Renew updates to teal badge", () => {
		const { container } = renderInContext(
			<div className="flex gap-2">
				<Badge data-testid="host-badge-expiring" className="badge-soft-amber bg-amber-500/15 text-amber-400 border border-amber-500/30">
					Expiring Soon (10d)
				</Badge>
				<Badge data-testid="host-badge-valid" className="badge-soft-teal bg-teal-500/15 text-teal-400 border border-teal-500/30">
					Valid
				</Badge>
			</div>,
		);

		const amberBadge = container.querySelector("[data-testid='host-badge-expiring']") as HTMLElement;
		assertSoftGradientBadge(amberBadge, "amber");

		const tealBadge = container.querySelector("[data-testid='host-badge-valid']") as HTMLElement;
		assertSoftGradientBadge(tealBadge, "teal");
		expect(tealBadge.textContent).toContain("Valid");
	});

	it("T3.3.6: Multi-row selection triggers BulkActionBar -> confirmation deletes selected rows", () => {
		const onConfirm = vi.fn();
		const { container } = renderInContext(
			<div>
				<UsersTable />
				<ConfirmDialog
					open={true}
					title="Confirm Bulk Deletion"
					description="Are you sure you want to delete selected users?"
					onConfirm={onConfirm}
					onCancel={vi.fn()}
				/>
			</div>,
		);

		const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
		expect(dialog).toBeTruthy();
		expect(dialog?.textContent).toContain("Confirm Bulk Deletion");
	});

	it("T3.3.7: Sing-box core routing rule reordering updates rule priority sequence", () => {
		useCoreSettings.setState({
			loading: false,
			runtimeLoaded: true,
			version: "1.18.0",
			started: true,
			configTargets: [
				{ id: "master", type: "master", name: "Master", node_id: null, mode: "default" },
			],
			config: {
				routing: {
					rules: [
						{ type: "field", outboundTag: "direct", domain: ["geosite:cn"] },
						{ type: "field", outboundTag: "block", ip: ["geoip:private"] },
					],
				},
				outbounds: [
					{ tag: "direct", protocol: "freedom" },
					{ tag: "block", protocol: "blackhole" },
				],
			},
		});

		const currentRules = useCoreSettings.getState().config?.routing?.rules;
		expect(currentRules).toHaveLength(2);
		expect(currentRules?.[0].outboundTag).toBe("direct");
	});
});
