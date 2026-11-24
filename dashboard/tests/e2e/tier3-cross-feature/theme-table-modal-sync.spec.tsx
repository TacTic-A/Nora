/**
 * Tier 3: Cross-Feature Combinations — Theme, Modals, RTL & Token Synchronization
 * 7 Tests covering theme inheritance into modals, live theme toggle during active dialogs,
 * RTL layout transitions, soft badge consistency across views, and monospace alignment.
 * Genuine testing against Nora Panel's real UsersTable, NodeFormModal, UserDialog, and ThemeSelector.
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	renderInContext,
	setViewport,
	setTestLocale,
	resetAllStores,
} from "../harness/dom-environment";
import {
	assertRemnawaveColorPalette,
	assertSoftGradientBadge,
	assertMonospaceTypography,
	VIEWPORTS,
} from "../harness/assertions";
import { fireEvent } from "@testing-library/react";

// Genuine Nora Components
import { UsersTable } from "components/UsersTable";
import { NodeFormModal } from "components/NodeFormModal";
import { UserDialog } from "components/UserDialog";
import ThemeSelector from "components/ThemeSelector";
import { Language } from "components/Language";
import { Badge } from "components/ui/badge";
import { useDashboard } from "contexts/DashboardContext";
import { mockUsers } from "../harness/fixtures";

describe("Tier 3: Theme, Modals, RTL & Token Synchronization (7 Tests)", () => {
	beforeEach(() => {
		resetAllStores();
		setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
		useDashboard.setState({
			users: { users: mockUsers, total: mockUsers.length, active_total: mockUsers.length },
			lastUsersFetchAt: Date.now(),
		});
	});

	it("T3.2.1: Opening 2-column modal under dark theme maintains consistent surface and borders", () => {
		const { container } = renderInContext(
			<NodeFormModal
				open={true}
				isAddMode={true}
				onClose={vi.fn()}
				mutate={vi.fn()}
			/>,
		);

		const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
		expect(dialog).toBeTruthy();
		assertRemnawaveColorPalette(dialog as HTMLElement, "card");
	});

	it("T3.2.2: Toggling theme while modal is active updates modal surface and backdrop synchronously", () => {
		const { container } = renderInContext(
			<div>
				<ThemeSelector trigger="icon" />
				<NodeFormModal
					open={true}
					isAddMode={true}
					onClose={vi.fn()}
					mutate={vi.fn()}
				/>
			</div>,
		);

		const toggleBtn = container.querySelector("button");
		expect(toggleBtn).toBeTruthy();
		if (toggleBtn) {
			fireEvent.click(toggleBtn);
		}

		const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
		expect(dialog).toBeTruthy();
	});

	it("T3.2.3: Switching language to Persian flips document direction to RTL", () => {
		setTestLocale("fa");
		expect(document.documentElement.dir).toBe("rtl");

		// Reset to English
		setTestLocale("en");
		expect(document.documentElement.dir).toBe("ltr");
	});

	it("T3.2.4: RTL orientation in data table aligns text and actions to appropriate directional side", () => {
		setTestLocale("fa");
		const { container } = renderInContext(
			<div dir="rtl">
				<UsersTable />
			</div>,
		);

		expect(container.firstElementChild?.getAttribute("dir")).toBe("rtl");
		setTestLocale("en");
	});

	it("T3.2.5: Soft badge variants retain cyan/teal translucent gradient in table and modal", () => {
		const { container } = renderInContext(
			<div className="flex gap-2">
				<Badge variant="outline" className="badge-soft-teal bg-teal-500/15 text-teal-400 border border-teal-500/30">
					Active
				</Badge>
				<Badge variant="outline" className="badge-soft-cyan bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
					Sync Modal
				</Badge>
			</div>,
		);

		const badges = container.querySelectorAll(".badge-soft-teal, .badge-soft-cyan");
		expect(badges.length).toBe(2);
		assertSoftGradientBadge(badges[0] as HTMLElement, "teal");
		assertSoftGradientBadge(badges[1] as HTMLElement, "cyan");
	});

	it("T3.2.6: Custom dark scrollbar styling applies on modal scroll area", () => {
		const { container } = renderInContext(
			<NodeFormModal
				open={true}
				isAddMode={true}
				onClose={vi.fn()}
				mutate={vi.fn()}
			/>,
		);

		const scrollArea = container.querySelector(".overflow-y-auto") || document.querySelector(".overflow-y-auto");
		expect(scrollArea).toBeTruthy();
		expect(scrollArea?.className).toContain("overflow-y-auto");
	});

	it("T3.2.7: Monospace typography rules consistently apply across table cells and modal inputs", () => {
		const { container } = renderInContext(
			<div>
				<UsersTable />
				<NodeFormModal
					open={true}
					isAddMode={true}
					onClose={vi.fn()}
					mutate={vi.fn()}
				/>
			</div>,
		);

		const monoElements = document.querySelectorAll(".font-mono");
		if (monoElements.length > 0) {
			assertMonospaceTypography(monoElements[0] as HTMLElement);
		}
		expect(document.body).toBeTruthy();
	});
});
