/**
 * E2E Test Fixtures for Nora Panel Frontend
 * Authoritative mock datasets representing Nora backend API responses.
 */

export interface SystemKPIs {
	onlineUsers: number;
	activeNodes: number;
	totalNodes: number;
	totalBandwidthBytes: number;
	totalBandwidthFormatted: string;
	systemLoad: number;
	cpuUsagePercent: number;
	memory: {
		usedBytes: number;
		totalBytes: number;
		usedFormatted: string;
		totalFormatted: string;
		percentage: number;
	};
	disk: {
		usedBytes: number;
		totalBytes: number;
		usedFormatted: string;
		totalFormatted: string;
		percentage: number;
	};
	trafficSeries: {
		timestamp: string;
		uploadBytes: number;
		downloadBytes: number;
	}[];
}

export const mockSystemKPIs: SystemKPIs = {
	onlineUsers: 142,
	activeNodes: 12,
	totalNodes: 14,
	totalBandwidthBytes: 2638827906662, // ~2.4 TB
	totalBandwidthFormatted: "2.40 TB",
	systemLoad: 0.42,
	cpuUsagePercent: 34.5,
	memory: {
		usedBytes: 8804682956,
		totalBytes: 17179869184,
		usedFormatted: "8.20 GB",
		totalFormatted: "16.00 GB",
		percentage: 51.2,
	},
	disk: {
		usedBytes: 128849018880,
		totalBytes: 536870912000,
		usedFormatted: "120.00 GB",
		totalFormatted: "500.00 GB",
		percentage: 24.0,
	},
	trafficSeries: [
		{ timestamp: "10:00", uploadBytes: 104857600, downloadBytes: 524288000 },
		{ timestamp: "11:00", uploadBytes: 157286400, downloadBytes: 838860800 },
		{ timestamp: "12:00", uploadBytes: 209715200, downloadBytes: 1258291200 },
		{ timestamp: "13:00", uploadBytes: 314572800, downloadBytes: 1887436800 },
		{ timestamp: "14:00", uploadBytes: 262144000, downloadBytes: 1468006400 },
		{ timestamp: "15:00", uploadBytes: 419430400, downloadBytes: 2306867200 },
	],
};

export interface UserRecord {
	id: number;
	username: string;
	uuid: string;
	status: "active" | "expired" | "disabled";
	used_traffic: number;
	data_limit: number;
	expire_date: string | null;
	note?: string;
	created_at: string;
	online: boolean;
	inbound_access?: string[];
}

export const mockUsers: UserRecord[] = [
	{
		id: 1,
		username: "alice_operator",
		uuid: "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
		status: "active",
		used_traffic: 15032385536, // ~14 GB
		data_limit: 107374182400, // 100 GB
		expire_date: "2026-12-31T23:59:59Z",
		note: "Premium tier user",
		created_at: "2026-01-01T00:00:00Z",
		online: true,
		inbound_access: ["vless-reality-443", "vmess-ws-8443"],
	},
	{
		id: 2,
		username: "bob_developer",
		uuid: "b2c3d4e5-f6a1-4b2c-9d3e-4f5a6b7c8d9e",
		status: "active",
		used_traffic: 45097156608, // ~42 GB
		data_limit: 53687091200, // 50 GB
		expire_date: "2026-11-30T23:59:59Z",
		note: "VIP test account",
		created_at: "2026-02-15T12:00:00Z",
		online: true,
		inbound_access: ["vless-reality-443"],
	},
	{
		id: 3,
		username: "charlie_expired",
		uuid: "c3d4e5f6-a1b2-4c3d-ae4f-5a6b7c8d9e0f",
		status: "expired",
		used_traffic: 107374182400, // 100 GB
		data_limit: 107374182400, // 100 GB
		expire_date: "2026-11-01T00:00:00Z",
		note: "Renewal required",
		created_at: "2026-01-10T08:30:00Z",
		online: false,
		inbound_access: [],
	},
	{
		id: 4,
		username: "david_suspended",
		uuid: "d4e5f6a1-b2c3-4d4e-bf5a-6b7c8d9e0f1a",
		status: "disabled",
		used_traffic: 5368709120, // 5 GB
		data_limit: 21474836480, // 20 GB
		expire_date: "2027-01-01T00:00:00Z",
		note: "Administrative hold",
		created_at: "2026-03-01T15:00:00Z",
		online: false,
		inbound_access: [],
	},
	{
		id: 5,
		username: "eve_unlimited",
		uuid: "e5f6a1b2-c3d4-4e5f-c012-7b8c9d0e1f2a",
		status: "active",
		used_traffic: 322122547200, // ~300 GB
		data_limit: 0, // unlimited
		expire_date: null, // lifetime
		note: "System administrator personal",
		created_at: "2025-12-01T00:00:00Z",
		online: true,
		inbound_access: ["all"],
	},
];

export interface NodeRecord {
	id: number;
	name: string;
	address: string;
	port: number;
	status: "online" | "offline";
	latencyMs: number;
	activeConnections: number;
	bandwidthUsageBytes: number;
	tlsVersion: string;
	version: string;
	isMaster: boolean;
}

export const mockNodes: NodeRecord[] = [
	{
		id: 1,
		name: "node-fra-01.nora.internal",
		address: "194.26.29.110",
		port: 62050,
		status: "online",
		latencyMs: 24,
		activeConnections: 64,
		bandwidthUsageBytes: 858993459200,
		tlsVersion: "TLS 1.3",
		version: "v1.10.4",
		isMaster: true,
	},
	{
		id: 2,
		name: "node-ams-02.nora.internal",
		address: "185.190.140.22",
		port: 62050,
		status: "online",
		latencyMs: 38,
		activeConnections: 48,
		bandwidthUsageBytes: 536870912000,
		tlsVersion: "TLS 1.3",
		version: "v1.10.4",
		isMaster: false,
	},
	{
		id: 3,
		name: "node-hel-03.nora.internal",
		address: "95.217.163.45",
		port: 62050,
		status: "offline",
		latencyMs: 0,
		activeConnections: 0,
		bandwidthUsageBytes: 10737418240,
		tlsVersion: "TLS 1.3",
		version: "v1.10.3",
		isMaster: false,
	},
];

export interface InboundRecord {
	id: number;
	tag: string;
	protocol: "vless" | "vmess" | "shadowsocks" | "trojan";
	listen: string;
	port: number;
	network: "tcp" | "ws" | "grpc";
	security: "reality" | "tls" | "none";
	enabled: boolean;
	connectedClients: number;
	associatedHosts: string[];
}

export const mockInbounds: InboundRecord[] = [
	{
		id: 1,
		tag: "vless-reality-443",
		protocol: "vless",
		listen: "0.0.0.0",
		port: 443,
		network: "tcp",
		security: "reality",
		enabled: true,
		connectedClients: 89,
		associatedHosts: ["gateway.nora.site", "cdn.fastcdn.com"],
	},
	{
		id: 2,
		tag: "vmess-ws-8443",
		protocol: "vmess",
		listen: "0.0.0.0",
		port: 8443,
		network: "ws",
		security: "tls",
		enabled: true,
		connectedClients: 35,
		associatedHosts: ["stream.nora.site"],
	},
	{
		id: 3,
		tag: "shadowsocks-2083",
		protocol: "shadowsocks",
		listen: "0.0.0.0",
		port: 2083,
		network: "tcp",
		security: "none",
		enabled: false,
		connectedClients: 0,
		associatedHosts: [],
	},
	{
		id: 4,
		tag: "trojan-tls-4433",
		protocol: "trojan",
		listen: "0.0.0.0",
		port: 4433,
		network: "tcp",
		security: "tls",
		enabled: true,
		connectedClients: 18,
		associatedHosts: ["edge.nora.site"],
	},
];

export interface HostRecord {
	id: number;
	domain: string;
	sni: string;
	inboundTag: string;
	issuer: string;
	validDaysLeft: number;
	expiryDate: string;
	autoRenew: boolean;
	status: "valid" | "expiring_soon" | "expired";
}

export const mockHosts: HostRecord[] = [
	{
		id: 1,
		domain: "gateway.nora.site",
		sni: "gateway.nora.site",
		inboundTag: "vless-reality-443",
		issuer: "Let's Encrypt Authority X3",
		validDaysLeft: 68,
		expiryDate: "2027-01-31T12:00:00Z",
		autoRenew: true,
		status: "valid",
	},
	{
		id: 2,
		domain: "edge.nora.site",
		sni: "edge.nora.site",
		inboundTag: "trojan-tls-4433",
		issuer: "ZeroSSL RSA Domain CA",
		validDaysLeft: 5,
		expiryDate: "2026-11-28T12:00:00Z",
		autoRenew: true,
		status: "expiring_soon",
	},
	{
		id: 3,
		domain: "legacy.nora.site",
		sni: "legacy.nora.site",
		inboundTag: "vmess-ws-8443",
		issuer: "Let's Encrypt Authority X3",
		validDaysLeft: -2,
		expiryDate: "2026-11-21T12:00:00Z",
		autoRenew: false,
		status: "expired",
	},
];

export interface AdminRecord {
	id: number;
	username: string;
	role: "SuperAdmin" | "Operator" | "Viewer";
	twoFactorEnabled: boolean;
	lastLogin: string;
	ip: string;
}

export const mockAdmins: AdminRecord[] = [
	{
		id: 1,
		username: "root_admin",
		role: "SuperAdmin",
		twoFactorEnabled: true,
		lastLogin: "2026-11-23T21:40:00Z",
		ip: "89.160.20.15",
	},
	{
		id: 2,
		username: "support_operator",
		role: "Operator",
		twoFactorEnabled: false,
		lastLogin: "2026-11-23T19:15:00Z",
		ip: "109.201.133.5",
	},
];

export interface AuditLogEntry {
	id: number;
	timestamp: string;
	adminUsername: string;
	action: string;
	target: string;
	ip: string;
	status: "success" | "failure";
}

export const mockAuditLogs: AuditLogEntry[] = [
	{
		id: 101,
		timestamp: "2026-11-23T21:45:10Z",
		adminUsername: "root_admin",
		action: "user.create",
		target: "alice_operator",
		ip: "89.160.20.15",
		status: "success",
	},
	{
		id: 102,
		timestamp: "2026-11-23T20:30:22Z",
		adminUsername: "support_operator",
		action: "node.restart",
		target: "node-fra-01.nora.internal",
		ip: "109.201.133.5",
		status: "success",
	},
	{
		id: 103,
		timestamp: "2026-11-23T18:12:05Z",
		adminUsername: "support_operator",
		action: "settings.core.update",
		target: "sing-box.routing",
		ip: "109.201.133.5",
		status: "success",
	},
];

export interface CoreProtocolSettings {
	coreType: "sing-box" | "xray";
	logLevel: "debug" | "info" | "warn" | "error";
	dnsServers: string[];
	routingRules: {
		id: string;
		priority: number;
		outbound: string;
		domainSuffix?: string[];
		ipCidr?: string[];
	}[];
	outbounds: {
		tag: string;
		type: "direct" | "block" | "socks" | "wireguard";
		server?: string;
	}[];
}

export const mockCoreSettings: CoreProtocolSettings = {
	coreType: "sing-box",
	logLevel: "info",
	dnsServers: ["1.1.1.1", "8.8.8.8", "https://dns.google/dns-query"],
	routingRules: [
		{
			id: "rule-1",
			priority: 10,
			outbound: "direct",
			domainSuffix: [".ir", ".gov.ir"],
		},
		{
			id: "rule-2",
			priority: 20,
			outbound: "block",
			ipCidr: ["10.0.0.0/8", "192.168.0.0/16"],
		},
		{
			id: "rule-3",
			priority: 30,
			outbound: "wireguard-warp",
			domainSuffix: ["netflix.com", "openai.com"],
		},
	],
	outbounds: [
		{ tag: "direct", type: "direct" },
		{ tag: "block", type: "block" },
		{ tag: "wireguard-warp", type: "wireguard", server: "engage.cloudflareclient.com" },
	],
};

export interface IntegrationSettings {
	telegram: {
		enabled: boolean;
		botToken: string;
		adminChatId: string;
		notifyOnExpiry: boolean;
		notifyOnTrafficThreshold: boolean;
	};
	webhooks: {
		enabled: boolean;
		endpointUrl: string;
		secretKey: string;
		events: string[];
	};
	backup: {
		autoBackupEnabled: boolean;
		frequencyHours: number;
		lastBackupTimestamp: string;
		backupVersion: string;
	};
	security: {
		sessionTimeoutMinutes: number;
		enforceTwoFactor: boolean;
		allowedIpRanges: string[];
	};
}

export const mockIntegrationSettings: IntegrationSettings = {
	telegram: {
		enabled: true,
		botToken: "7193821034:AAHzK1x-98ExampleTokenTelegramAPI",
		adminChatId: "987654321",
		notifyOnExpiry: true,
		notifyOnTrafficThreshold: true,
	},
	webhooks: {
		enabled: true,
		endpointUrl: "https://ops.example.org/nora-events",
		secretKey: "whsec_7c9f18a20e4b47f6a5b6c7d8e9f01234",
		events: ["user.created", "user.expired", "node.offline"],
	},
	backup: {
		autoBackupEnabled: true,
		frequencyHours: 24,
		lastBackupTimestamp: "2026-11-23T04:00:00Z",
		backupVersion: "v1.2.0-nora",
	},
	security: {
		sessionTimeoutMinutes: 60,
		enforceTwoFactor: true,
		allowedIpRanges: ["0.0.0.0/0"],
	},
};
