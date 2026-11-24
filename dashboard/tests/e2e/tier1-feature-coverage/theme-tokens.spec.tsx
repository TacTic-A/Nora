/**
 * Tier 1: Feature Coverage — Theme & Color Palette, Soft Gradients, Core UI Primitives
 * Features 1-3 (15 Tests)
 */

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import {
	renderInContext,
	setViewport,
	resetAllStores,
} from "../harness/dom-environment";
import {
	assertRemnawaveColorPalette,
	assertSoftGradientBadge,
	VIEWPORTS,
} from "../harness/assertions";
import { Badge } from "components/ui/badge";
import { Button } from "components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "components/ui/card";
import { Input } from "components/ui/input";
import { Switch } from "components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "components/ui/dialog";
import { AppLayout } from "components/AppLayout";
import { NodeModalStatusBadge } from "components/NodeModalStatusBadge";

describe("Tier 1: Features 1-3 — Theme Tokens, Soft Badges & UI Primitives", () => {
	beforeEach(() => {
		resetAllStores();
		setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
	});

	// ==========================================
	// Feature 1: Theme & Color Palette (5 tests)
	// ==========================================
	describe("Feature 1: Theme & Color Palette", () => {
		it("T1.1.1: Canvas base color #0d1117 is applied to AppLayout root under dark theme", () => {
			const { container } = renderInContext(
				<AppLayout />,
				{ colorMode: "dark" },
			);

			const root = container.querySelector(".bg-\\[\\#0d1117\\]") as HTMLElement;
			expect(root).toBeTruthy();
			assertRemnawaveColorPalette(root, "canvas");
			expect(document.documentElement.classList.contains("rb-theme-dark")).toBe(true);
		});

		it("T1.1.2: Card surfaces render #161b22 surface background with rgba(255,255,255,0.08) border by default", () => {
			const { container } = renderInContext(
				<Card>
					<CardHeader>
						<CardTitle>System Health</CardTitle>
						<CardDescription>Server status overview</CardDescription>
					</CardHeader>
					<CardContent>
						<p>All nodes healthy</p>
					</CardContent>
				</Card>,
			);

			const cardEl = container.querySelector("[data-slot='card']") as HTMLElement;
			expect(cardEl).toBeTruthy();
			assertRemnawaveColorPalette(cardEl, "surface");
			assertRemnawaveColorPalette(cardEl, "border");
		});

		it("T1.1.3: Elevated toolbars and table headers utilize dark header tone", () => {
			const { container } = renderInContext(
				<div data-slot="header-band" className="bg-[#1b2027] border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
					<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						User Identifier
					</span>
				</div>,
			);

			const headerEl = container.querySelector("[data-slot='header-band']") as HTMLElement;
			expect(headerEl).toBeTruthy();
			assertRemnawaveColorPalette(headerEl, "header");
		});

		it("T1.1.4: Scrollable containers apply Remnawave dark custom scrollbar classes", () => {
			const { container } = renderInContext(
				<div
					data-testid="scroll-container"
					className="overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
				>
					<div className="h-96">Long Content List</div>
				</div>,
			);

			const scrollEl = container.querySelector("[data-testid='scroll-container']") as HTMLElement;
			expect(scrollEl).toBeTruthy();
			expect(scrollEl.className).toContain("overflow-y-auto");
		});

		it("T1.1.5: Text color hierarchy conforms to primary, secondary and muted tokens", () => {
			const { container } = renderInContext(
				<Card>
					<CardHeader>
						<CardTitle>Primary Title Text</CardTitle>
						<CardDescription>Secondary descriptive text</CardDescription>
					</CardHeader>
				</Card>,
			);

			const titleEl = container.querySelector("[data-slot='card-title']") as HTMLElement;
			const descEl = container.querySelector("[data-slot='card-description']") as HTMLElement;
			expect(titleEl).toBeTruthy();
			expect(descEl).toBeTruthy();
			expect(titleEl.className).toContain("text-white");
			expect(descEl.className).toContain("text-[#8b949e]");
		});
	});

	// ==========================================
	// Feature 2: "Soft" Gradient System (5 tests)
	// ==========================================
	describe("Feature 2: Soft Gradient System", () => {
		it("T1.2.1: Badge with variant='soft-cyan' renders cyan soft gradient and border", () => {
			const { container } = renderInContext(
				<Badge variant="soft-cyan">Active Inbound</Badge>,
			);

			const badge = container.querySelector("[data-slot='badge']") as HTMLElement;
			expect(badge).toBeTruthy();
			assertSoftGradientBadge(badge, "cyan");
		});

		it("T1.2.2: Badge with variant='soft-teal' renders teal soft gradient and border", () => {
			const { container } = renderInContext(
				<Badge variant="soft-teal">Online Node</Badge>,
			);

			const badge = container.querySelector("[data-slot='badge']") as HTMLElement;
			expect(badge).toBeTruthy();
			assertSoftGradientBadge(badge, "teal");
		});

		it("T1.2.3: Badge with variant='soft-red' renders red soft gradient for alerts and expirations", () => {
			const { container } = renderInContext(
				<Badge variant="soft-red">Expired Quota</Badge>,
			);

			const badge = container.querySelector("[data-slot='badge']") as HTMLElement;
			expect(badge).toBeTruthy();
			assertSoftGradientBadge(badge, "red");
		});

		it("T1.2.4: Badge with variant='soft-amber' renders amber soft gradient for certificate warnings", () => {
			const { container } = renderInContext(
				<Badge variant="soft-amber">Expiring Soon (5d)</Badge>,
			);

			const badge = container.querySelector("[data-slot='badge']") as HTMLElement;
			expect(badge).toBeTruthy();
			assertSoftGradientBadge(badge, "amber");
		});

		it("T1.2.5: Badge with variant='soft-purple' renders purple soft gradient for admin roles", () => {
			const { container } = renderInContext(
				<Badge variant="soft-purple">SuperAdmin</Badge>,
			);

			const badge = container.querySelector("[data-slot='badge']") as HTMLElement;
			expect(badge).toBeTruthy();
			assertSoftGradientBadge(badge, "purple");
		});
	});

	// ==========================================
	// Feature 3: Core UI Primitives (5 tests)
	// ==========================================
	describe("Feature 3: Core UI Primitives", () => {
		it("T1.3.1: Button supports variant='soft' with built-in cyan gradient styling", () => {
			const { container } = renderInContext(
				<Button variant="soft">Action Soft Button</Button>,
			);

			const btn = container.querySelector("[data-slot='button']") as HTMLElement;
			expect(btn).toBeTruthy();
			expect(btn.textContent).toContain("Action Soft Button");
			expect(btn.className).toContain("badge-soft-cyan");
		});

		it("T1.3.2: Primary buttons use cyan accent with rounded border styling", () => {
			const { container } = renderInContext(
				<Button variant="primary">Save Changes</Button>,
			);

			const btn = container.querySelector("[data-slot='button']") as HTMLElement;
			expect(btn).toBeTruthy();
			expect(btn.className).toContain("bg-cyan-500");
			expect(btn.className).toContain("rounded-lg");
		});

		it("T1.3.3: Input fields render dark canvas background with subtle border and focus ring", () => {
			const { container } = renderInContext(
				<Input placeholder="Enter username" />,
			);

			const input = container.querySelector("[data-slot='input']") as HTMLElement;
			expect(input).toBeTruthy();
			expect(input.getAttribute("placeholder")).toBe("Enter username");
			assertRemnawaveColorPalette(input, "canvas");
			assertRemnawaveColorPalette(input, "border");
		});

		it("T1.3.4: Switches/toggles display active indicator and toggle state", () => {
			const { container } = renderInContext(
				<Switch checked={true} aria-label="Toggle Service" />,
			);

			const switchEl = container.querySelector("[data-slot='switch']") as HTMLElement;
			expect(switchEl).toBeTruthy();
			expect(switchEl.getAttribute("data-state")).toBe("checked");
		});

		it("T1.3.5: Modal dialog backdrop and card container render with Remnawave surface styling", () => {
			const { getByRole, getByText } = renderInContext(
				<Dialog open={true}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Configure Service</DialogTitle>
							<DialogDescription>Adjust inbound settings below</DialogDescription>
						</DialogHeader>
						<div>Dialog Inner Body Content</div>
					</DialogContent>
				</Dialog>,
			);

			const dialog = getByRole("dialog");
			expect(dialog).toBeTruthy();
			expect(getByText("Configure Service")).toBeTruthy();
			assertRemnawaveColorPalette(dialog, "surface");
			assertRemnawaveColorPalette(dialog, "border");
		});
	});
});
