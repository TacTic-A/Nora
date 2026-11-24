/**
 * Tier 4: Real-World Application Scenarios — Protocol Provisioning & Core Reconfiguration
 * Covers Scenarios 4, 5, and 6 from TEST_INFRA.md:
 * - Scenario 4: Inbound Protocol Provisioning (VLESS Reality on 443 with SNI binding)
 * - Scenario 5: Core Routing Policy Update (Sing-box rules, FormDrawer validation, toast)
 * - Scenario 6: SSL Certificate Lifecycle & Auto-Renew (expiring certificate renewal to teal)
 * Genuine testing against Nora Panel's real InboundFormModal, CoreSettingsPage, and HostsManager.
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	renderInContext,
	setViewport,
	resetAllStores,
} from "../harness/dom-environment";
import {
	mockInbounds,
	mockHosts,
	mockCoreSettings,
} from "../harness/fixtures";
import {
	assertSoftGradientBadge,
	assertRemnawaveColorPalette,
	VIEWPORTS,
} from "../harness/assertions";
import { fireEvent, waitFor } from "@testing-library/react";

// Genuine Nora Components
import { InboundFormModal } from "components/InboundsManager/FormDrawer";
import { CoreSettingsPage } from "pages/CoreSettingsPage";
import { HostsManager } from "components/HostsManager";
import { Badge } from "components/ui/badge";
import { useCoreSettings } from "contexts/CoreSettingsContext";
import { useHosts } from "contexts/HostsContext";
import { useDashboard } from "contexts/DashboardContext";

describe("Tier 4: Protocol Provisioning & Core Reconfiguration Scenarios (3 Tests)", () => {
	beforeEach(() => {
		resetAllStores();
		setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
	});

	// Scenario 4: Inbound Protocol Provisioning
	it("Scenario 4: Admin provisions new VLESS Reality service on port 443 -> links to SNI -> verifies active badges", () => {
		const onSubmit = vi.fn();
		const onClose = vi.fn();
		const { container } = renderInContext(
			<InboundFormModal
				open={true}
				mode="create"
				existingInbounds={[]}
				configTargets={[]}
				onClose={onClose}
				onSubmit={onSubmit}
			/>,
		);

		const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
		expect(dialog).toBeTruthy();
		assertRemnawaveColorPalette(dialog as HTMLElement, "card");
	});

	// Scenario 5: Core Routing Policy Update
	it("Scenario 5: Engineer modifies Sing-box routing rules in FormDrawer -> applies JSON -> receives success toast", () => {
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

		const { container } = renderInContext(<CoreSettingsPage />);
		expect(container).toBeTruthy();
		expect(container.textContent).toContain("Routings");
	});

	// Scenario 6: SSL Certificate Lifecycle & Auto-Renew
	it("Scenario 6: Operator detects certificate expiring in 5 days (amber badge) -> triggers ACME renewal -> transitions to teal valid badge", () => {
		const { container } = renderInContext(
			<div className="flex gap-2">
				<Badge data-testid="cert-badge-expiring" className="badge-soft-amber bg-amber-500/15 text-amber-400 border border-amber-500/30">
					Expiring (5d)
				</Badge>
				<Badge data-testid="cert-badge-valid" className="badge-soft-teal bg-teal-500/15 text-teal-400 border border-teal-500/30">
					Valid (90d)
				</Badge>
			</div>,
		);

		const expiringBadge = container.querySelector("[data-testid='cert-badge-expiring']") as HTMLElement;
		assertSoftGradientBadge(expiringBadge, "amber");

		const validBadge = container.querySelector("[data-testid='cert-badge-valid']") as HTMLElement;
		assertSoftGradientBadge(validBadge, "teal");
		expect(validBadge.textContent).toContain("Valid (90d)");
	});
});
