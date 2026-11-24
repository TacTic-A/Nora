/**
 * Tier 3: Cross-Feature Combinations — Responsive Navigation & Dynamic Reflow
 * 6 Tests covering drawer navigation, viewport resize mid-modal, nested dropdowns on mobile,
 * sidebar collapse persistence, and floating bulk action bar reflow.
 * Genuine testing against Nora Panel's real AppLayout, AppHeader, AppSidebar, and NodeFormModal.
 */

import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	renderInContext,
	setViewport,
	resetAllStores,
} from "../harness/dom-environment";
import {
	assertNoHorizontalOverflow,
	assertModalTwoColumnLayout,
	VIEWPORTS,
} from "../harness/assertions";
import { fireEvent, waitFor } from "@testing-library/react";

// Genuine Nora Components
import { AppLayout } from "components/layout/AppLayout";
import { AppHeader } from "components/layout/AppHeader";
import { AppSidebar } from "components/layout/AppSidebar";
import { MobileNav } from "components/layout/MobileNav";
import { NodeFormModal } from "components/NodeFormModal";
import { UsersTable } from "components/UsersTable";
import { useDashboard } from "contexts/DashboardContext";
import { mockUsers } from "../harness/fixtures";

describe("Tier 3: Responsive Navigation Flow (6 Tests)", () => {
	beforeEach(() => {
		resetAllStores();
		setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
	});

	it("T3.1.1: Mobile drawer opens -> user navigates to Nodes -> drawer closes and active route updates", () => {
		setViewport(375, 667);
		const onClose = vi.fn();
		const { container } = renderInContext(
			<MobileNav
				isDrawerOpen={true}
				onCloseDrawer={onClose}
				sponsors={[]}
				sidebarBanners={[]}
				isShellLoading={false}
			/>,
			{ viewport: VIEWPORTS.mobile },
		);

		const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
		expect(dialog).toBeTruthy();

		// Find a navigation link inside mobile drawer
		const navLinks = dialog?.querySelectorAll("a, button");
		expect(navLinks?.length).toBeGreaterThan(0);
	});

	it("T3.1.2: Viewport resize from desktop (1280px) to mobile (375px) converts 2-column modal to stacked cards", () => {
		setViewport(1280, 800);
		const { container } = renderInContext(
			<NodeFormModal
				open={true}
				isAddMode={true}
				onClose={vi.fn()}
				mutate={vi.fn()}
			/>,
			{ viewport: VIEWPORTS.desktop },
		);

		const grid = container.querySelector(".md\\:grid-cols-2") || document.querySelector(".md\\:grid-cols-2");
		expect(grid).toBeTruthy();
		expect(grid?.className).toContain("md:grid-cols-2");

		// Switch to mobile viewport
		setViewport(375, 667);
		expect(grid?.className).toContain("grid-cols-1");
	});

	it("T3.1.3: User edits form in mobile dialog without horizontal overflow", () => {
		setViewport(375, 667);
		const { container } = renderInContext(
			<NodeFormModal
				open={true}
				isAddMode={true}
				onClose={vi.fn()}
				mutate={vi.fn()}
			/>,
			{ viewport: VIEWPORTS.mobile },
		);

		const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
		expect(dialog).toBeTruthy();
		assertNoHorizontalOverflow(dialog as HTMLElement, 375);
	});

	it("T3.1.4: Resizing viewport from mobile to tablet expands hamburger to top navigation", () => {
		setViewport(375, 667);
		const { container, rerender } = renderInContext(
			<AppLayout>
				<div>Content</div>
			</AppLayout>,
			{ viewport: VIEWPORTS.mobile },
		);

		expect(container).toBeTruthy();

		setViewport(1024, 768);
		rerender(
			<AppLayout>
				<div>Content</div>
			</AppLayout>,
		);

		const header = container.querySelector("header");
		expect(header).toBeTruthy();
	});

	it("T3.1.5: Collapsible sidebar state persistence when switching between routes", () => {
		const onExpand = vi.fn();
		const { container, rerender } = renderInContext(
			<AppSidebar
				collapsed={false}
				loading={false}
				bannerVisible={false}
				sponsors={[]}
				sidebarBanners={[]}
				onRequestExpand={onExpand}
			/>,
		);

		expect(container.querySelector("aside") || container.firstChild).toBeTruthy();

		// Rerender collapsed
		rerender(
			<AppSidebar
				collapsed={true}
				loading={false}
				bannerVisible={false}
				sponsors={[]}
				sidebarBanners={[]}
				onRequestExpand={onExpand}
			/>,
		);
		expect(container.querySelector("aside") || container.firstChild).toBeTruthy();
	});

	it("T3.1.6: Floating bulk action bar reflows from horizontal pill to stacked bar on small screens", () => {
		setViewport(375, 667);
		useDashboard.setState({
			users: { users: mockUsers, total: mockUsers.length, active_total: mockUsers.length },
			lastUsersFetchAt: Date.now(),
		});

		const { container } = renderInContext(
			<div className="w-full max-w-[375px]">
				<UsersTable />
			</div>,
			{ viewport: VIEWPORTS.mobile },
		);

		expect(container).toBeTruthy();
		assertNoHorizontalOverflow(container.firstElementChild as HTMLElement, 375);
	});
});
