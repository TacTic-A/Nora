/**
 * Headless DOM Environment Setup & Test Harness for Nora Panel E2E Tests.
 * Integrates Happy DOM, React Testing Library, mock Nora APIs, and responsive emulation.
 */

import React, { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ColorModeProvider } from "lib/color-mode";
import { vi } from "vitest";
import { VIEWPORTS, type ViewportSpec } from "./assertions";
import {
	mockSystemKPIs,
	mockUsers,
	mockNodes,
	mockInbounds,
	mockHosts,
	mockAdmins,
	mockAuditLogs,
	mockCoreSettings,
	mockIntegrationSettings,
} from "./fixtures";
import { AdminRole, AdminStatus, AdminTrafficLimitMode } from "types/Admin";
import { getDefaultPermissionsForRole } from "constants/adminPermissions";
import { useDashboard } from "contexts/DashboardContext";
import { useNodes, FetchNodesQueryKey } from "contexts/NodesContext";
import { useHosts } from "contexts/HostsContext";
import { useServicesStore } from "contexts/ServicesContext";
import { useAdminsStore } from "contexts/AdminsContext";
import { useCoreSettings } from "contexts/CoreSettingsContext";

import { NotificationProvider } from "components/NotificationBell";

// Ensure React global
Object.assign(globalThis, { React });

// Setup localStorage and sessionStorage mocks if not provided
const createStorageMock = () => {
	const storage = new Map<string, string>();
	return {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => storage.set(key, String(value)),
		removeItem: (key: string) => storage.delete(key),
		clear: () => storage.clear(),
		get length() {
			return storage.size;
		},
		key: (i: number) => Array.from(storage.keys())[i] ?? null,
	};
};

if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== "function") {
	Object.defineProperty(globalThis, "localStorage", {
		value: createStorageMock(),
		writable: true,
	});
}

if (!globalThis.sessionStorage || typeof globalThis.sessionStorage.getItem !== "function") {
	Object.defineProperty(globalThis, "sessionStorage", {
		value: createStorageMock(),
		writable: true,
	});
}

// Mock ResizeObserver
if (typeof globalThis.ResizeObserver === "undefined") {
	class MockResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	globalThis.ResizeObserver = MockResizeObserver as any;
}

// Mock IntersectionObserver
if (typeof globalThis.IntersectionObserver === "undefined") {
	class MockIntersectionObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	globalThis.IntersectionObserver = MockIntersectionObserver as any;
}

// Responsive Viewport Emulation
export function setViewport(width: number, height: number) {
	Object.defineProperty(window, "innerWidth", {
		writable: true,
		configurable: true,
		value: width,
	});
	Object.defineProperty(window, "innerHeight", {
		writable: true,
		configurable: true,
		value: height,
	});
	Object.defineProperty(document.documentElement, "clientWidth", {
		writable: true,
		configurable: true,
		value: width,
	});
	Object.defineProperty(document.documentElement, "clientHeight", {
		writable: true,
		configurable: true,
		value: height,
	});

	// Mock matchMedia according to viewport width
	window.matchMedia = vi.fn().mockImplementation((query: string) => {
		let matches = false;
		const minMatch = query.match(/\(min-width:\s*(\d+)px\)/);
		const maxMatch = query.match(/\(max-width:\s*(\d+)px\)/);
		if (minMatch && maxMatch) {
			matches = width >= parseInt(minMatch[1], 10) && width <= parseInt(maxMatch[1], 10);
		} else if (minMatch) {
			matches = width >= parseInt(minMatch[1], 10);
		} else if (maxMatch) {
			matches = width <= parseInt(maxMatch[1], 10);
		}

		return {
			matches,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		};
	});

	window.dispatchEvent(new Event("resize"));
}

// Mock i18n system
let currentLang = "en";
let currentDir = "ltr";

export function setTestLocale(locale: "en" | "fa" | "ru") {
	currentLang = locale;
	currentDir = locale === "fa" ? "rtl" : "ltr";
	document.documentElement.dir = currentDir;
	document.documentElement.lang = locale;
}

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: any) => {
			if (options?.defaultValue) return options.defaultValue;
			return key;
		},
		i18n: {
			language: currentLang,
			changeLanguage: async (lang: string) => {
				setTestLocale(lang as any);
				return Promise.resolve();
			},
			dir: () => currentDir,
		},
	}),
	Trans: ({ children }: { children: ReactNode }) => children,
	I18nextProvider: ({ children }: { children: ReactNode }) => children,
}));

// Default Mock User Session with FullAccess
export const mockAdminUser = {
	username: "root_admin",
	role: AdminRole.FullAccess,
	permissions: getDefaultPermissionsForRole(AdminRole.FullAccess),
	telegram_id: "",
	users_usage: 0,
	created_traffic: 0,
	deleted_users_usage: 0,
	data_limit: null,
	traffic_limit_mode: AdminTrafficLimitMode.UsedTraffic,
	use_service_traffic_limits: false,
	show_user_traffic: true,
	delete_user_usage_limit_enabled: false,
	delete_user_usage_limit: null,
	service_limits: [],
	status: AdminStatus.Active,
	disabled_reason: null,
};

vi.mock("hooks/useGetUser", () => ({
	default: vi.fn(() => ({
		userData: mockAdminUser,
		getUserIsPending: false,
		getUserIsSuccess: true,
		getUserIsError: false,
		getUserError: null,
	})),
}));

export function resetAllStores() {
	const now = Date.now();

	const inboundsMap = new Map();
	inboundsMap.set("vless", [
		{ id: 1, tag: "vless-reality-443", protocol: "vless", network: "tcp", port: 443, tls: "reality" },
	]);
	inboundsMap.set("vmess", [
		{ id: 2, tag: "vmess-ws-8443", protocol: "vmess", network: "ws", port: 8443, tls: "tls" },
	]);
	inboundsMap.set("trojan", [
		{ id: 3, tag: "trojan-tls-4433", protocol: "trojan", network: "tcp", port: 4433, tls: "tls" },
	]);

	// 1. Reset useDashboard
	useDashboard.setState({
		isCreatingNewUser: false,
		editingUser: null,
		editingUserInitialTab: null,
		quickEditUser: null,
		users: {
			users: mockUsers.map((u) => ({
				id: u.id,
				username: u.username,
				uuid: u.uuid,
				status: u.status,
				used_traffic: u.used_traffic,
				data_limit: u.data_limit,
				expire: u.expire_date ? Math.floor(new Date(u.expire_date).getTime() / 1000) : null,
				created_at: u.created_at,
				online: u.online,
				traffic_reset_strategy: "no_reset",
				sub_revoked_at: null,
				node_ids: [],
				inbound_tags: u.inbound_access || [],
			} as any)),
			total: mockUsers.length,
			active_total: mockUsers.filter((u) => u.status === "active").length,
			users_limit: null,
			status_breakdown: { active: 3, expired: 1, disabled: 1 },
			usage_total: 100000000,
			online_total: 3,
		},
		inbounds: inboundsMap,
		loading: false,
		lastUsersFetchAt: now,
		usersCacheKey: "default",
		usersCacheAuthToken: "session",
		isUserLimitReached: false,
		filters: {
			sort: "-created_at",
			advancedFilters: [],
			groups: [],
			tags: [],
			tagMatchAll: false,
		},
	});

	// 2. Reset useNodes
	useNodes.setState({
		nodes: mockNodes.map((n) => ({
			id: n.id,
			name: n.name,
			address: n.address,
			port: n.port,
			status: n.status,
			is_active: n.status === "online",
			connected_users_count: n.activeConnections,
			cpu_usage_percent: 24,
			memory_used: 1024,
			memory_total: 4096,
			traffic_used: n.bandwidthUsageBytes,
			traffic_total: 0,
			is_master: n.isMaster,
			version: n.version,
		} as any)),
		loading: false,
	});

	// 3. Reset useHosts (HostsSchema is Record<string, HostItem[]>)
	const hostsMap: Record<string, any[]> = {
		"vless-reality-443": [
			{
				id: 1,
				remark: "gateway.nora.site",
				address: "gateway.nora.site",
				dns_primary: "1.1.1.1",
				dns_secondary: "8.8.8.8",
				port: 443,
				path: "",
				sni: "gateway.nora.site",
				inbound_tags: ["vless-reality-443"],
				certificate_days_left: 68,
				status: "valid",
				auto_renew: true,
				is_disabled: false,
			},
		],
		"trojan-tls-4433": [
			{
				id: 2,
				remark: "edge.nora.site",
				address: "edge.nora.site",
				dns_primary: "1.1.1.1",
				dns_secondary: "8.8.8.8",
				port: 4433,
				path: "",
				sni: "edge.nora.site",
				inbound_tags: ["trojan-tls-4433"],
				certificate_days_left: 5,
				status: "expiring_soon",
				auto_renew: true,
				is_disabled: false,
			},
		],
	};
	useHosts.setState({ hosts: hostsMap, loading: false });

	// 4. Reset useServicesStore
	useServicesStore.setState({
		services: mockInbounds.map((i) => ({
			id: i.id,
			name: i.tag,
			description: `${i.protocol.toUpperCase()} Service`,
			used_traffic: 1024,
			lifetime_used_traffic: 4096,
			usage_coefficient: 1,
			host_count: i.associatedHosts.length,
			user_count: i.connectedClients,
			has_hosts: i.associatedHosts.length > 0,
			broken: false,
			protocol: i.protocol,
			port: i.port,
			enabled: i.enabled,
		} as any)),
		summaryServices: mockInbounds.map((i) => ({
			id: i.id,
			name: i.tag,
			description: null,
			used_traffic: 1024,
			lifetime_used_traffic: 4096,
			usage_coefficient: 1,
			host_count: i.associatedHosts.length,
			user_count: i.connectedClients,
			has_hosts: i.associatedHosts.length > 0,
			broken: false,
		} as any)),
		total: mockInbounds.length,
		loading: false,
	});

	// 5. Reset useAdminsStore
	useAdminsStore.setState({
		admins: mockAdmins.map((a) => ({
			id: a.id,
			username: a.username,
			role: a.role === "SuperAdmin" ? "full_access" : a.role === "Operator" ? "sudo" : "standard",
			twoFactorEnabled: a.twoFactorEnabled,
			last_login: a.lastLogin,
			last_ip: a.ip,
			status: "active",
			created_traffic: 0,
			users_usage: 0,
			deleted_users_usage: 0,
			data_limit: null,
			traffic_limit_mode: "used_traffic",
			use_service_traffic_limits: false,
			show_user_traffic: true,
			delete_user_usage_limit_enabled: false,
			delete_user_usage_limit: null,
			service_limits: [],
			permissions: {
				sections: {
					usage: true,
					admins: true,
					services: true,
					hosts: true,
					nodes: true,
					integrations: true,
					xray: true,
				},
			},
		} as any)),
		total: mockAdmins.length,
		loading: false,
		lastFetchedAt: now,
	});

	// 6. Reset useCoreSettings
	useCoreSettings.setState({
		config: mockCoreSettings.config as any,
		loading: false,
		runtimeLoaded: true,
		version: "1.18.0",
		started: true,
	});
}

// Render Helper for E2E Component and Page Tests
export interface RenderInContextOptions extends Omit<RenderOptions, "wrapper"> {
	route?: string;
	colorMode?: "dark" | "light";
	locale?: "en" | "fa";
	viewport?: ViewportSpec;
	currentUser?: typeof mockAdminUser;
	queryClient?: QueryClient;
}

export function renderInContext(
	ui: ReactElement,
	options: RenderInContextOptions = {},
): RenderResult {
	const {
		route = "/",
		colorMode = "dark",
		locale = "en",
		viewport = VIEWPORTS.desktop,
		queryClient: customQueryClient,
		...renderOptions
	} = options;

	// Set viewport
	setViewport(viewport.width, viewport.height);

	// Set locale
	setTestLocale(locale);

	// Set theme
	localStorage.setItem("rb-theme", colorMode);
	localStorage.setItem("chakra-ui-color-mode", colorMode);
	document.documentElement.classList.remove("rb-theme-light", "rb-theme-dark");
	document.documentElement.classList.add(`rb-theme-${colorMode}`);
	document.documentElement.dataset.theme = colorMode;

	const queryClient = customQueryClient || new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
		},
	});

	// Pre-seed query cache for common query keys if not already provided
	if (!queryClient.getQueryData(FetchNodesQueryKey)) {
		queryClient.setQueryData(FetchNodesQueryKey, mockNodes);
	}
	if (!queryClient.getQueryData(["statistics-query-key"])) {
		queryClient.setQueryData(["statistics-query-key"], {
			version: "v1.18.0",
			cpu_cores: 8,
			cpu_threads: 16,
			cpu_frequency_hz: 3200000000,
			cpu_usage: mockSystemKPIs.cpuUsagePercent,
			total_user: 142,
			online_users: mockSystemKPIs.onlineUsers,
			online_users_usage: 104857600,
			online_users_upload_speed: 1048576,
			online_users_download_speed: 5242880,
			users_active: 120,
			users_on_hold: 5,
			users_disabled: 7,
			users_expired: 10,
			users_limited: 0,
			incoming_bandwidth: 1258291200,
			outgoing_bandwidth: 1380536706,
			panel_total_bandwidth: mockSystemKPIs.totalBandwidthBytes,
			incoming_bandwidth_speed: 1048576,
			outgoing_bandwidth_speed: 5242880,
			total_incoming_bandwidth_speed: 2097152,
			total_outgoing_bandwidth_speed: 10485760,
			memory: {
				current: mockSystemKPIs.memory.usedBytes,
				total: mockSystemKPIs.memory.totalBytes,
				percent: mockSystemKPIs.memory.percentage,
			},
			swap: { current: 0, total: 0, percent: 0 },
			disk: {
				current: mockSystemKPIs.disk.usedBytes,
				total: mockSystemKPIs.disk.totalBytes,
				percent: mockSystemKPIs.disk.percentage,
			},
			load_avg: [0.42, 0.55, 0.61],
			uptime_seconds: 86400,
			panel_uptime_seconds: 86400,
			xray_uptime_seconds: 86400,
			xray_running: true,
			xray_version: "1.8.7",
			app_memory: 52428800,
			app_threads: 4,
		});
	}

	function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				<ColorModeProvider>
					<MemoryRouter initialEntries={[route]}>
						<NotificationProvider>{children}</NotificationProvider>
					</MemoryRouter>
				</ColorModeProvider>
			</QueryClientProvider>
		);
	}

	return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export {
	mockSystemKPIs,
	mockUsers,
	mockNodes,
	mockInbounds,
	mockHosts,
	mockAdmins,
	mockAuditLogs,
	mockCoreSettings,
	mockIntegrationSettings,
};
