// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { ColorModeProvider } from "lib/color-mode";
import * as React from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { computeBreadcrumbItems } from "./breadcrumbConfig";
import { MobileNav } from "./MobileNav";

Object.assign(globalThis, { React });

globalThis.fetch = vi.fn().mockResolvedValue({
	ok: true,
	json: async () => ({}),
}) as any;

if (typeof window !== "undefined") {
	window.ResizeObserver =
		window.ResizeObserver ||
		class ResizeObserver {
			observe() {}
			unobserve() {}
			disconnect() {}
		};
}

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, fallback?: string) => fallback || key,
		i18n: {
			language: "en",
			resolvedLanguage: "en",
			dir: () => "ltr",
			changeLanguage: vi.fn(),
		},
	}),
}));

vi.mock("hooks/useGetUser", () => ({
	__esModule: true,
	default: () => ({
		userData: {
			username: "admin",
			role: "full_access",
			permissions: {
				sections: {
					admins: true,
					usage: true,
					services: true,
					hosts: true,
					nodes: true,
					xray: true,
					integrations: true,
				},
				self_permissions: {
					self_myaccount: true,
				},
			},
		},
		getUserIsSuccess: true,
		getUserIsError: false,
	}),
}));

vi.mock("hooks/useDisclosure", () => ({
	useDisclosure: () => ({
		isOpen: false,
		onOpen: vi.fn(),
		onClose: vi.fn(),
		onToggle: vi.fn(),
	}),
}));

vi.mock("../NotificationBell", () => ({
	NotificationBell: () => <div data-testid="notification-bell">Bell</div>,
	NotificationMenuItem: () => <div>NotificationItem</div>,
	useNotificationCenter: () => ({ unread: 2 }),
	useUnreadNotifications: () => 2,
}));

vi.mock("../GitHubStars", () => ({
	GitHubStars: () => <div data-testid="github-stars">Stars</div>,
}));

vi.mock("../HeaderCalendar", () => ({
	HeaderCalendar: () => <div data-testid="header-calendar">Calendar</div>,
}));

vi.mock("../ThemeSelector", () => ({
	__esModule: true,
	default: () => <div data-testid="theme-selector">Theme</div>,
}));

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return ({ children }: { children: React.ReactNode }) => (
		<ColorModeProvider>
			<QueryClientProvider client={queryClient}>
				<MemoryRouter>{children}</MemoryRouter>
			</QueryClientProvider>
		</ColorModeProvider>
	);
};

describe("Milestone 2: Shell, Layout & Navigation", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	describe("breadcrumbConfig", () => {
		const mockT = ((key: string, fallback?: string) => fallback || key) as any;

		it("computes breadcrumbs for root path", () => {
			const crumbs = computeBreadcrumbItems("/", "", null, mockT);
			expect(crumbs).toEqual([{ label: "dashboard", path: "/" }]);
		});

		it("computes breadcrumbs for /users", () => {
			const crumbs = computeBreadcrumbItems("/users", "", null, mockT);
			expect(crumbs).toHaveLength(3);
			expect(crumbs[0]).toEqual({ label: "dashboard", path: "/" });
			expect(crumbs[1].label).toBe("User Management");
			expect(crumbs[2]).toEqual({ label: "users", path: "/users" });
		});

		it("computes breadcrumbs for /bulk-actions with active hash tab", () => {
			const crumbs = computeBreadcrumbItems(
				"/bulk-actions",
				"#permissions",
				null,
				mockT,
			);
			expect(crumbs.length).toBeGreaterThanOrEqual(3);
			expect(crumbs.some((c) => c.label === "bulkActions.tabs.permissions")).toBe(
				true,
			);
		});

		it("computes breadcrumbs for /hosts with hash", () => {
			const crumbs = computeBreadcrumbItems("/hosts", "#hosts", null, mockT);
			expect(crumbs.some((c) => c.label === "hostsPage.tabHosts")).toBe(true);
		});

		it("computes breadcrumbs for /xray-settings with hash", () => {
			const crumbs = computeBreadcrumbItems(
				"/xray-settings",
				"#routing",
				null,
				mockT,
			);
			expect(crumbs.some((c) => c.label === "pages.xray.Routings")).toBe(true);
		});

		it("appends editorPageTitle when an entity editor is active", () => {
			const crumbs = computeBreadcrumbItems(
				"/users",
				"",
				"Edit User: Alice",
				mockT,
			);
			expect(crumbs[crumbs.length - 1].label).toBe("Edit User: Alice");
		});

		it("handles fallback parameterized paths cleanly", () => {
			const crumbs = computeBreadcrumbItems(
				"/custom-tool/sub-path",
				"",
				null,
				mockT,
			);
			expect(crumbs[0]).toEqual({ label: "dashboard", path: "/" });
			expect(crumbs[1].label).toBe("custom tool");
			expect(crumbs[2].label).toBe("sub path");
		});
	});

	describe("AppHeader", () => {
		it("renders header styling with panel surface and border", () => {
			const { container } = render(
				<AppHeader
					sidebarCollapsed={false}
					onToggleSidebar={vi.fn()}
					isMobile={false}
					breadcrumbItems={[{ label: "Dashboard", path: "/" }]}
					onNavigate={vi.fn()}
				/>,
				{ wrapper: createWrapper() },
			);

			const header = container.querySelector("header");
			expect(header).toBeDefined();
			expect(header?.className).toContain("bg-[var(--rb-panel-surface)]");
			expect(header?.className).toContain("border-[var(--rb-panel-border)]");
		});

		it("renders breadcrumbs and triggers onNavigate on link click", () => {
			const onNavigate = vi.fn();
			render(
				<AppHeader
					sidebarCollapsed={false}
					onToggleSidebar={vi.fn()}
					isMobile={false}
					breadcrumbItems={[
						{ label: "Dashboard", path: "/" },
						{ label: "Users", path: "/users" },
					]}
					onNavigate={onNavigate}
				/>,
				{ wrapper: createWrapper() },
			);

			const dashboardLink = screen.getByText("Dashboard");
			expect(dashboardLink).toBeDefined();
			dashboardLink.click();
			expect(onNavigate).toHaveBeenCalledWith("/");
		});

		it("renders header controls (calendar, stars, notifications, user button)", () => {
			render(
				<AppHeader
					sidebarCollapsed={false}
					onToggleSidebar={vi.fn()}
					isMobile={false}
					breadcrumbItems={[{ label: "Dashboard", path: "/" }]}
					onNavigate={vi.fn()}
				/>,
				{ wrapper: createWrapper() },
			);

			expect(screen.getByTestId("header-calendar")).toBeDefined();
			expect(screen.getByTestId("github-stars")).toBeDefined();
			expect(screen.getByTestId("notification-bell")).toBeDefined();
			expect(screen.getByText("admin")).toBeDefined();
		});

		it("calls onToggleSidebar when the hamburger button is clicked", () => {
			const onToggleSidebar = vi.fn();
			render(
				<AppHeader
					sidebarCollapsed={false}
					onToggleSidebar={onToggleSidebar}
					isMobile={false}
					breadcrumbItems={[{ label: "Dashboard", path: "/" }]}
					onNavigate={vi.fn()}
				/>,
				{ wrapper: createWrapper() },
			);

			const hamburger = screen.getByLabelText("a11y.toggleSidebar");
			hamburger.click();
			expect(onToggleSidebar).toHaveBeenCalled();
		});
	});

	describe("AppSidebar", () => {
		it("renders sidebar with panel surface and border", () => {
			const { container } = render(<AppSidebar collapsed={false} />, {
				wrapper: createWrapper(),
			});

			const aside = container.querySelector("aside");
			expect(aside).toBeDefined();
			expect(aside?.className).toContain("bg-[var(--rb-panel-sidebar)]");
			expect(aside?.className).toContain("border-[var(--rb-panel-border)]");
		});

		it("displays Nora brand logo and title", () => {
			render(<AppSidebar collapsed={false} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("Nora")).toBeDefined();
		});

		it("renders section titles with cyber accent bars", () => {
			const { container } = render(<AppSidebar collapsed={false} />, {
				wrapper: createWrapper(),
			});

			const cyberBars = container.querySelectorAll(
				'[data-nav-section] span.inline-block.w-\\[3px\\]',
			);
			expect(cyberBars.length).toBeGreaterThan(0);
		});
	});

	describe("MobileNav", () => {
		it("renders mobile bottom dock with panel surface and cyan tint on active indicator", () => {
			const { container } = render(
				<MobileNav isDrawerOpen={false} onCloseDrawer={vi.fn()} />,
				{ wrapper: createWrapper() },
			);

			const dock = container.querySelector(".rb-mobile-dock");
			expect(dock).toBeDefined();
			expect(dock?.innerHTML).toContain("bg-[var(--rb-panel-surface)]/95");
		});

		it("renders navigation tabs in the mobile bottom dock", () => {
			render(<MobileNav isDrawerOpen={false} onCloseDrawer={vi.fn()} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("dashboard")).toBeDefined();
			expect(screen.getByText("users")).toBeDefined();
			expect(screen.getByText("admins")).toBeDefined();
			expect(screen.getByText("myaccount.menu")).toBeDefined();
		});
	});
});
