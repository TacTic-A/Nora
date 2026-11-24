import type { TFunction } from "i18next";

export interface BreadcrumbEntry {
	label: string;
	path?: string;
}

export function computeBreadcrumbItems(
	pathname: string,
	hash: string,
	editorPageTitle: string | null,
	t: TFunction,
): BreadcrumbEntry[] {
	const hashKey = (hash || "").replace(/^#/, "").split("?")[0].toLowerCase();
	let items: BreadcrumbEntry[] = [];

	if (pathname === "/") {
		items = [{ label: t("dashboard"), path: "/" }];
	} else if (pathname === "/users") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.userHub", "User Management") },
			{ label: t("sidebar.usersList", t("users")), path: "/users" },
		];
	} else if (pathname === "/groups") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.userHub", "User Management") },
			{ label: t("groups.title"), path: "/groups" },
		];
	} else if (pathname === "/bulk-actions") {
		const bulkActionsTabs: Record<string, string> = {
			edit: t("bulkActions.tabs.edit"),
			delete: t("bulkActions.tabs.delete"),
			permissions: t("bulkActions.tabs.permissions"),
		};
		const activeBulkTab = bulkActionsTabs[hashKey];
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.userHub", "User Management") },
			{ label: t("bulkActions.menu"), path: "/bulk-actions" },
			...(activeBulkTab ? [{ label: activeBulkTab }] : []),
		];
	} else if (pathname === "/admins") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("admins"), path: "/admins" },
		];
	} else if (pathname === "/myaccount") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("myaccount.menu"), path: "/myaccount" },
		];
	} else if (pathname === "/usage") {
		const usageTabs: Record<string, string> = {
			services: t("usage.tabs.services"),
			admins: t("usage.tabs.admins"),
			nodes: t("usage.tabs.nodes"),
		};
		const activeUsageTab = usageTabs[hashKey] || usageTabs.services;
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("usage.menu"), path: "/usage#services" },
			{ label: activeUsageTab },
		];
	} else if (pathname === "/hosts") {
		const hostsTabs: Record<string, string> = {
			inbounds: t("hostsPage.tabInbounds"),
			hosts: t("hostsPage.tabHosts"),
		};
		const activeHostsTab = hostsTabs[hashKey] || hostsTabs.inbounds;
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("header.hostSettings"), path: "/hosts#inbounds" },
			{ label: activeHostsTab },
		];
	} else if (pathname === "/services") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("services.title"), path: "/services" },
		];
	} else if (pathname === "/node-settings") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("header.nodeSettings"), path: "/node-settings" },
		];
	} else if (pathname === "/xray-logs") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.observability", "Monitoring & Logs") },
			{ label: t("pages.xray.logs"), path: "/xray-logs" },
		];
	} else if (pathname === "/errors") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.observability", "Monitoring & Logs") },
			{ label: t("diagnostics.menu"), path: "/errors" },
		];
	} else if (pathname === "/access-insights") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.observability", "Monitoring & Logs") },
			{ label: t("header.accessInsights"), path: "/access-insights" },
		];
	} else if (pathname === "/recent-actions") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.observability", "Monitoring & Logs") },
			{ label: t("recentActions.title"), path: "/recent-actions" },
		];
	} else if (pathname === "/xray-settings") {
		const xrayTabs: Record<string, string> = {
			basic: t("pages.xray.basicTemplate"),
			routing: t("pages.xray.Routings"),
			outbounds: t("pages.xray.Outbounds"),
			reverse: t("pages.xray.reverse.title"),
			balancers: t("pages.xray.Balancers"),
			dns: t("DNS"),
			advanced: t("pages.xray.advancedTemplate"),
		};
		const activeXrayTab = xrayTabs[hashKey] || xrayTabs.basic;
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.coreRouting", "Core & Routing") },
			{ label: t("header.xraySettings"), path: "/xray-settings#basic" },
			{ label: activeXrayTab },
		];
	} else if (pathname === "/haproxy") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.coreRouting", "Core & Routing") },
			{ label: t("haproxy.title"), path: "/haproxy" },
		];
	} else if (pathname === "/notifications") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.system", "System") },
			{ label: t("notifications.menu"), path: "/notifications" },
		];
	} else if (pathname === "/settings") {
		const settingsTabs: Record<string, string> = {
			panel: t("settings.panel.tabTitle"),
			telegram: t("settings.telegram"),
			subscriptions: t("settings.subscriptions.tabTitle"),
			ssl: t("settings.ssl.tabTitle"),
		};
		const activeSettingsTab = settingsTabs[hashKey] || settingsTabs.panel;
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.system", "System") },
			{ label: t("header.integrationSettings"), path: "/settings#panel" },
			{ label: activeSettingsTab },
		];
	} else if (pathname === "/placeholders") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.system", "System") },
			{ label: t("placeholders.menu"), path: "/placeholders" },
		];
	} else if (pathname === "/phpmyadmin") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.system", "System") },
			{ label: t("phpmyadmin.menu"), path: "/phpmyadmin" },
		];
	} else if (pathname === "/external-apps") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("sidebar.groups.system", "System") },
			{ label: t("externalApps.menu"), path: "/external-apps" },
		];
	} else if (pathname === "/api-docs") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{ label: t("apiDocs.menu"), path: "/api-docs" },
		];
	} else if (pathname === "/tutorials") {
		items = [
			{ label: t("dashboard"), path: "/" },
			{
				label: t("sidebar.tutorialsAndFaq", t("tutorials.menu")),
				path: "/tutorials",
			},
		];
	} else {
		items = [
			{ label: t("dashboard"), path: "/" },
			...pathname
				.split("/")
				.filter(Boolean)
				.map((part) => ({
					label: part.replace(/[-_]+/g, " "),
				})),
		];
	}

	if (editorPageTitle) {
		items = [...items, { label: editorPageTitle }];
	}

	return items;
}
