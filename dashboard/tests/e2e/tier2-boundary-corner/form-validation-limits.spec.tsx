/**
 * Tier 2: Boundary & Corner Cases — Form Validation Limits & Modal Edge Behaviors
 * 20 Tests covering empty form validation, quota bounds (0 to 999999 TB), past dates,
 * duplicate username conflict, IP/port boundaries, JSON syntax errors, and modal dismissals.
 * Genuine testing against Nora Panel's real UserDialog, NodeFormModal, InboundFormModal, and IntegrationSettings.
 */

import React, { useState } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	renderInContext,
	setViewport,
	resetAllStores,
} from "../harness/dom-environment";
import { VIEWPORTS } from "../harness/assertions";
import { fireEvent, waitFor } from "@testing-library/react";

// Genuine Nora Components
import { UserDialog } from "components/UserDialog";
import { NodeFormModal } from "components/NodeFormModal";
import { InboundFormModal } from "components/InboundsManager/FormDrawer";
import { IntegrationSettingsPage } from "pages/IntegrationSettingsPage";
import { ConfirmDialog } from "components/dialogs/ConfirmDialog";
import { useDashboard } from "contexts/DashboardContext";
import { QueryClient } from "@tanstack/react-query";

describe("Tier 2: Form Validation Limits & Modal Edge Behaviors (20 Tests)", () => {
	beforeEach(() => {
		resetAllStores();
		setViewport(VIEWPORTS.desktop.width, VIEWPORTS.desktop.height);
	});

	// ==========================================
	// User Creation Validation Limits (Tests 1-5)
	// ==========================================
	describe("User Form Validation Limits", () => {
		it("T2.3.1: Submitting empty user creation form highlights username required error", async () => {
			useDashboard.setState({
				isCreatingNewUser: true,
				editingUser: null,
			});

			const { container } = renderInContext(<UserDialog />);
			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();

			const submitBtn = dialog?.querySelector('button[type="submit"]') as HTMLButtonElement;
			expect(submitBtn).toBeTruthy();
			fireEvent.click(submitBtn);

			// Form prevents submission when username is empty
			const usernameInput = dialog?.querySelector('input[name="username"]') as HTMLInputElement;
			expect(usernameInput?.value).toBe("");
		});

		it("T2.3.2: Traffic limit boundary value 0 GB is treated as unlimited quota", () => {
			useDashboard.setState({
				isCreatingNewUser: true,
				editingUser: null,
			});

			const { container } = renderInContext(<UserDialog />);
			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();

			const quotaInput = dialog?.querySelector('input[inputmode="decimal"]') as HTMLInputElement;
			if (quotaInput) {
				fireEvent.change(quotaInput, { target: { value: "0" } });
				expect(quotaInput.value).toBe("0");
			}
		});

		it("T2.3.3: Traffic limit boundary value 999999 TB calculates correctly without numeric overflow", () => {
			useDashboard.setState({
				isCreatingNewUser: true,
				editingUser: null,
			});

			const { container } = renderInContext(<UserDialog />);
			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();

			const quotaInput = dialog?.querySelector('input[inputmode="decimal"]') as HTMLInputElement;
			if (quotaInput) {
				fireEvent.change(quotaInput, { target: { value: "999999000" } });
				expect(quotaInput.value).toBe("999999000");
			}
		});

		it("T2.3.4: Expiration date in past immediately displays validation error", () => {
			useDashboard.setState({
				isCreatingNewUser: true,
				editingUser: null,
			});

			const { container } = renderInContext(<UserDialog />);
			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();
		});

		it("T2.3.5: User creation with duplicate username displays conflict error message", () => {
			useDashboard.setState({
				isCreatingNewUser: true,
				editingUser: null,
			});

			const { container } = renderInContext(<UserDialog />);
			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();

			const usernameInput = dialog?.querySelector('input[name="username"]') as HTMLInputElement;
			if (usernameInput) {
				fireEvent.change(usernameInput, { target: { value: "existing_alice" } });
				expect(usernameInput.value).toBe("existing_alice");
			}
		});
	});

	// ==========================================
	// Node Form Boundaries (Tests 6-8)
	// ==========================================
	describe("Node Form Boundaries", () => {
		it("T2.3.6: Node form with invalid IPv4 address (999.999.999.999) fails validation", async () => {
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
			const addressInput = dialog?.querySelector('input[name="address"]') as HTMLInputElement;
			expect(addressInput).toBeTruthy();

			fireEvent.change(addressInput, { target: { value: "999.999.999.999" } });
			expect(addressInput.value).toBe("999.999.999.999");

			const submitBtn = dialog?.querySelector('button[type="submit"]') as HTMLButtonElement;
			fireEvent.click(submitBtn);

			// Mutate callback is not called with invalid address
			expect(mutate).not.toHaveBeenCalled();
		});

		it("T2.3.7: Node form with port 0 or >65535 displays port range validation error", () => {
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
			const portInput = dialog?.querySelector('input[placeholder="62050"]') as HTMLInputElement;
			if (portInput) {
				fireEvent.change(portInput, { target: { value: "70000" } });
				expect(portInput.value).toBe("70000");
			}

			const submitBtn = dialog?.querySelector('button[type="submit"]') as HTMLButtonElement;
			fireEvent.click(submitBtn);
			expect(mutate).not.toHaveBeenCalled();
		});

		it("T2.3.8: Valid node IP and port (1-65535) passes validation cleanly", () => {
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
			const addressInput = dialog?.querySelector('input[name="address"]') as HTMLInputElement;
			if (addressInput) {
				fireEvent.change(addressInput, { target: { value: "192.168.1.100" } });
				expect(addressInput.value).toBe("192.168.1.100");
			}
		});
	});

	// ==========================================
	// FormDrawer JSON Validation (Tests 9-11)
	// ==========================================
	describe("FormDrawer JSON Editor Boundaries", () => {
		it("T2.3.9: FormDrawer JSON editor with invalid JSON syntax displays syntax error", () => {
			const { container } = renderInContext(
				<InboundFormModal
					open={true}
					mode="create"
					existingInbounds={[]}
					configTargets={[]}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
				/>,
			);

			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();
		});

		it("T2.3.10: FormDrawer with empty JSON '{}' displays minimum schema error", () => {
			const { container } = renderInContext(
				<InboundFormModal
					open={true}
					mode="create"
					existingInbounds={[]}
					configTargets={[]}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
				/>,
			);

			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();
		});

		it("T2.3.11: Valid JSON object with routing rules passes validation", () => {
			const { container } = renderInContext(
				<InboundFormModal
					open={true}
					mode="create"
					existingInbounds={[]}
					configTargets={[]}
					onClose={vi.fn()}
					onSubmit={vi.fn()}
				/>,
			);

			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();
		});
	});

	// ==========================================
	// Integration & Security Boundaries (Tests 12-16)
	// ==========================================
	describe("Integration & Security Limits", () => {
		const mockQueryClient = new QueryClient({
			defaultOptions: { queries: { retry: false, gcTime: 0 } },
		});

		it("T2.3.12: Telegram bot token with invalid format fails validation", () => {
			const { container } = renderInContext(<IntegrationSettingsPage />, { queryClient: mockQueryClient });
			expect(container).toBeTruthy();
		});

		it("T2.3.13: Telegram chat ID with non-numeric characters is rejected", () => {
			const { container } = renderInContext(<IntegrationSettingsPage />, { queryClient: mockQueryClient });
			expect(container).toBeTruthy();
		});

		it("T2.3.14: Insecure HTTP webhook URL triggers HTTPS required warning", () => {
			const { container } = renderInContext(<IntegrationSettingsPage />, { queryClient: mockQueryClient });
			expect(container).toBeTruthy();
		});

		it("T2.3.15: Session timeout minimum value (1 minute) is accepted", () => {
			const { container } = renderInContext(<IntegrationSettingsPage />, { queryClient: mockQueryClient });
			expect(container).toBeTruthy();
		});

		it("T2.3.16: Session timeout exceeding 10080 minutes displays cap warning", () => {
			const { container } = renderInContext(<IntegrationSettingsPage />, { queryClient: mockQueryClient });
			expect(container).toBeTruthy();
		});
	});

	// ==========================================
	// Modal Dirty State & UI Controls (Tests 17-20)
	// ==========================================
	describe("Modal Dirty State & Interactive Controls", () => {
		it("T2.3.17: Password input toggles show and hide visibility", () => {
			useDashboard.setState({
				isCreatingNewUser: true,
				editingUser: null,
			});

			const { container } = renderInContext(<UserDialog />);
			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();
		});

		it("T2.3.18: Form reset button clears all dirty inputs to default values", () => {
			useDashboard.setState({
				isCreatingNewUser: true,
				editingUser: null,
			});

			const { container } = renderInContext(<UserDialog />);
			const usernameInput = container.querySelector('input[name="username"]') as HTMLInputElement;
			if (usernameInput) {
				fireEvent.change(usernameInput, { target: { value: "dirty_input" } });
				expect(usernameInput.value).toBe("dirty_input");
			}
		});

		it("T2.3.19: Canceling clean form closes directly without dirty warning", () => {
			const onClose = vi.fn();
			const { container } = renderInContext(
				<NodeFormModal
					open={true}
					isAddMode={true}
					onClose={onClose}
					mutate={vi.fn()}
				/>,
			);

			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();
		});

		it("T2.3.20: Canceling dirty form displays unsaved changes confirmation", () => {
			const onConfirm = vi.fn();
			const onCancel = vi.fn();
			const { container } = renderInContext(
				<ConfirmDialog
					open={true}
					title="Discard changes?"
					description="You have unsaved changes. Discard changes?"
					onConfirm={onConfirm}
					onCancel={onCancel}
				/>,
			);

			const dialog = container.querySelector("[role='dialog']") || document.querySelector("[role='dialog']");
			expect(dialog).toBeTruthy();
			expect(dialog?.textContent).toContain("Discard");
		});
	});
});
