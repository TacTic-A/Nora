import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApexOptions } from "apexcharts";
import { PageLoadingSkeleton } from "components/ui";
import { Button } from "components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "components/ui/dialog";
import { Spinner } from "components/ui/spinner";
import { useDashboard } from "contexts/DashboardContext";
import { AnimatePresence, motion } from "framer-motion";
import useGetUser from "hooks/useGetUser";
import type { TFunction } from "i18next";
import { cn } from "lib/cn";
import { useColorMode } from "lib/color-mode";
import {
	ArrowDownLeft,
	ArrowUpRight,
	ChartColumn,
	Clock,
	Cpu,
	Database,
	HardDrive,
	Server,
	ShieldCheck,
	Signal,
	Users,
	X,
} from "lucide-react";
import {
	type ComponentPropsWithoutRef,
	type FC,
	lazy,
	type ReactNode,
	Suspense,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { fetch, reportAPIError, useAPIRequestErrors } from "service/http";
import { AdminRole } from "types/Admin";
import type { SystemStats } from "types/System";
import type { UsersListResponse } from "types/User";
import { dashboardDiagnostics } from "utils/diagnostics";
import { formatBytes, numberWithCommas } from "utils/formatByte";
import {
	getTotalNetworkHistory,
	mergeLiveSystemStats,
	recordTotalNetworkSample,
} from "utils/systemMetrics";
import { getAPIWebSocketURL } from "utils/websocket";
import { DashboardMaintenanceControls } from "./DashboardMaintenanceControls";
import { SystemDiagnostics, useSystemDiagnostics } from "./SystemDiagnostics";

export const StatisticsQueryKey = ["statistics-query-key"] as const;

const HistoryChart = lazy(() => import("react-apexcharts"));

type MaintenanceInfo = {
	panel?: {
		image?: string;
		tag?: string | null;
		mode?: string;
		install_mode?: string;
		channel?: string;
		update?: {
			current?: string | null;
			available?: boolean;
			target?: string | null;
			latest_release?: { tag?: string | null } | null;
			latest_dev?: { tag?: string | null } | null;
			error?: string | null;
		} | null;
	} | null;
};

type BandwidthScope = "master" | "total";

const formatDurationText = (seconds: number, t: TFunction): string => {
	if (!seconds || seconds <= 0) {
		return `0 ${t("dashboard.system.durationSeconds")}`;
	}

	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remSeconds = Math.floor(seconds % 60);

	const andWord = t("dashboard.system.durationAnd");
	const commaWord = t("dashboard.system.durationComma");

	const formatUnit = (val: number, singleKey: string, pluralKey: string) => {
		const unitStr = val === 1 ? t(singleKey) : t(pluralKey);
		return `${val} ${unitStr}`;
	};

	if (days > 0) {
		const parts: string[] = [
			formatUnit(
				days,
				"dashboard.system.durationDay",
				"dashboard.system.durationDays",
			),
		];
		if (hours > 0) {
			parts.push(
				formatUnit(
					hours,
					"dashboard.system.durationHour",
					"dashboard.system.durationHours",
				),
			);
		}
		if (minutes > 0) {
			parts.push(
				formatUnit(
					minutes,
					"dashboard.system.durationMinute",
					"dashboard.system.durationMinutes",
				),
			);
		}
		if (parts.length === 1) return parts[0];
		if (parts.length === 2) return parts.join(andWord);
		return (
			parts.slice(0, -1).join(commaWord) + andWord + parts[parts.length - 1]
		);
	}

	if (hours > 0) {
		const hStr = formatUnit(
			hours,
			"dashboard.system.durationHour",
			"dashboard.system.durationHours",
		);
		if (minutes > 0) {
			const mStr = formatUnit(
				minutes,
				"dashboard.system.durationMinute",
				"dashboard.system.durationMinutes",
			);
			return `${hStr}${andWord}${mStr}`;
		}
		return hStr;
	}

	if (minutes > 0) {
		const mStr = formatUnit(
			minutes,
			"dashboard.system.durationMinute",
			"dashboard.system.durationMinutes",
		);
		if (remSeconds > 0) {
			const sStr = formatUnit(
				remSeconds,
				"dashboard.system.durationSecond",
				"dashboard.system.durationSeconds",
			);
			return `${mStr}${andWord}${sStr}`;
		}
		return mStr;
	}

	return formatUnit(
		remSeconds,
		"dashboard.system.durationSecond",
		"dashboard.system.durationSeconds",
	);
};

const formatLocalizedDuration = (
	seconds: number,
	t: TFunction,
	isRTL = false,
): ReactNode => {
	const text = formatDurationText(seconds, t);
	return (
		<p
			dir={isRTL ? "rtl" : "ltr"}
			className="text-[13px] font-bold tracking-[-0.01em] text-panel-text tabular-nums [unicode-bidi:isolate]"
		>
			{text}
		</p>
	);
};

const useSystemMetricsStream = (enabled = true) => {
	const queryClient = useQueryClient();
	useEffect(() => {
		if (!enabled || typeof window === "undefined") return;
		const url = getAPIWebSocketURL("/system/metrics", { interval: 3 });
		if (!url) return;
		let closed = false;
		let ws: WebSocket | null = null;
		let reconnectTimer: number | undefined;

		const connect = () => {
			ws = new WebSocket(url);
			ws.onmessage = (event) => {
				if (
					typeof document !== "undefined" &&
					document.visibilityState === "hidden"
				) {
					return;
				}
				try {
					const payload = JSON.parse(event.data);
					if (payload?.error) {
						reportAPIError("STREAM /system/metrics", payload);
						return;
					}
					const stats = payload?.stats ?? payload;
					if (!stats || typeof stats !== "object" || !("version" in stats)) {
						return;
					}
					useAPIRequestErrors.getState().clear("STREAM /system/metrics");
					queryClient.setQueryData<SystemStats>(StatisticsQueryKey, (current) =>
						mergeLiveSystemStats(current, stats),
					);
				} catch (error) {
					console.error("Unable to parse system metrics stream payload", error);
				}
			};
			ws.onerror = () => ws?.close();
			ws.onclose = () => {
				if (!closed) reconnectTimer = window.setTimeout(connect, 3000);
			};
		};

		connect();
		return () => {
			closed = true;
			if (reconnectTimer) window.clearTimeout(reconnectTimer);
			ws?.close();
		};
	}, [enabled, queryClient]);
};

const toFiniteNumber = (value: unknown, fallback = 0) => {
	const next = Number(value);
	return Number.isFinite(next) ? next : fallback;
};

const safeHistory = (value: unknown): SystemStats["cpu_history"] =>
	Array.isArray(value)
		? value.map((entry) => {
				const item = entry as Record<string, unknown> | null;
				return {
					timestamp: toFiniteNumber(item?.timestamp),
					value: toFiniteNumber(item?.value),
				};
			})
		: [];

const safeNetworkHistory = (value: unknown): SystemStats["network_history"] =>
	Array.isArray(value)
		? value.map((entry) => {
				const item = entry as Record<string, unknown> | null;
				return {
					timestamp: toFiniteNumber(item?.timestamp),
					incoming: toFiniteNumber(item?.incoming),
					outgoing: toFiniteNumber(item?.outgoing),
				};
			})
		: [];

const safeUsageStats = (value: unknown): SystemStats["memory"] => {
	const raw =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: {};
	return {
		current: toFiniteNumber(raw.current),
		total: toFiniteNumber(raw.total),
		percent: toFiniteNumber(raw.percent),
	};
};

const sanitizeSystemStats = (
	value: SystemStats | undefined,
): SystemStats | null => {
	if (!value || typeof value !== "object") return null;
	const raw = value as unknown as Record<string, unknown>;
	const rawPersonal =
		raw.personal_usage && typeof raw.personal_usage === "object"
			? (raw.personal_usage as Record<string, unknown>)
			: null;
	const rawAdmin =
		raw.admin_overview && typeof raw.admin_overview === "object"
			? (raw.admin_overview as Record<string, unknown>)
			: null;

	return {
		...value,
		version: String(raw.version ?? ""),
		os: typeof raw.os === "string" ? raw.os : undefined,
		cpu_cores: toFiniteNumber(raw.cpu_cores),
		cpu_threads: toFiniteNumber(raw.cpu_threads),
		cpu_frequency_hz: toFiniteNumber(raw.cpu_frequency_hz),
		cpu_usage: toFiniteNumber(raw.cpu_usage),
		total_user: toFiniteNumber(raw.total_user),
		online_users: toFiniteNumber(raw.online_users),
		online_users_usage: toFiniteNumber(raw.online_users_usage),
		online_users_upload_speed: toFiniteNumber(raw.online_users_upload_speed),
		online_users_download_speed: toFiniteNumber(
			raw.online_users_download_speed,
		),
		users_active: toFiniteNumber(raw.users_active),
		users_on_hold: toFiniteNumber(raw.users_on_hold),
		users_disabled: toFiniteNumber(raw.users_disabled),
		users_expired: toFiniteNumber(raw.users_expired),
		users_limited: toFiniteNumber(raw.users_limited),
		incoming_bandwidth: toFiniteNumber(raw.incoming_bandwidth),
		outgoing_bandwidth: toFiniteNumber(raw.outgoing_bandwidth),
		panel_total_bandwidth: toFiniteNumber(raw.panel_total_bandwidth),
		incoming_bandwidth_speed: toFiniteNumber(raw.incoming_bandwidth_speed),
		outgoing_bandwidth_speed: toFiniteNumber(raw.outgoing_bandwidth_speed),
		total_incoming_bandwidth_speed: toFiniteNumber(
			raw.total_incoming_bandwidth_speed,
		),
		total_outgoing_bandwidth_speed: toFiniteNumber(
			raw.total_outgoing_bandwidth_speed,
		),
		memory: safeUsageStats(raw.memory),
		swap: safeUsageStats(raw.swap),
		disk: safeUsageStats(raw.disk),
		load_avg: Array.isArray(raw.load_avg)
			? raw.load_avg.map((item: unknown) => toFiniteNumber(item))
			: [],
		uptime_seconds: toFiniteNumber(raw.uptime_seconds),
		panel_uptime_seconds: toFiniteNumber(raw.panel_uptime_seconds),
		xray_uptime_seconds: toFiniteNumber(raw.xray_uptime_seconds),
		xray_running: Boolean(raw.xray_running),
		xray_version:
			typeof raw.xray_version === "string" ? raw.xray_version : null,
		app_memory: toFiniteNumber(raw.app_memory),
		app_threads: toFiniteNumber(raw.app_threads),
		panel_cpu_percent: toFiniteNumber(raw.panel_cpu_percent),
		panel_memory_percent: toFiniteNumber(raw.panel_memory_percent),
		cpu_history: safeHistory(raw.cpu_history),
		memory_history: safeHistory(raw.memory_history),
		swap_history: safeHistory(raw.swap_history),
		disk_history: safeHistory(raw.disk_history),
		network_history: safeNetworkHistory(raw.network_history),
		panel_cpu_history: safeHistory(raw.panel_cpu_history),
		panel_memory_history: safeHistory(raw.panel_memory_history),
		personal_usage: rawPersonal
			? {
					total_users: toFiniteNumber(rawPersonal.total_users),
					consumed_bytes: toFiniteNumber(rawPersonal.consumed_bytes),
					built_bytes: toFiniteNumber(rawPersonal.built_bytes),
					reset_bytes: toFiniteNumber(rawPersonal.reset_bytes),
					traffic_basis:
						rawPersonal.traffic_basis === "created_traffic"
							? "created_traffic"
							: "used_traffic",
				}
			: {
					total_users: 0,
					consumed_bytes: 0,
					built_bytes: 0,
					reset_bytes: 0,
					traffic_basis: "used_traffic",
				},
		admin_overview: rawAdmin
			? {
					total_admins: toFiniteNumber(rawAdmin.total_admins),
					sudo_admins: toFiniteNumber(rawAdmin.sudo_admins),
					full_access_admins: toFiniteNumber(rawAdmin.full_access_admins),
					standard_admins: toFiniteNumber(rawAdmin.standard_admins),
					top_admin_username:
						typeof rawAdmin.top_admin_username === "string"
							? rawAdmin.top_admin_username
							: null,
					top_admin_usage: toFiniteNumber(rawAdmin.top_admin_usage),
				}
			: {
					total_admins: 0,
					sudo_admins: 0,
					full_access_admins: 0,
					standard_admins: 0,
					top_admin_username: null,
					top_admin_usage: 0,
				},
	};
};

const formatNumberValue = (value?: number | null) => numberWithCommas(value);

const formatPercent = (val: number): string => {
	if (!Number.isFinite(val)) return "0%";
	const rounded = Math.round(val * 10) / 10;
	const formatted = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
	return `${formatted}%`;
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const HISTORY_INTERVALS = [
	{ labelKey: "dashboard.history.interval.2m", seconds: 120 },
	{ labelKey: "dashboard.history.interval.10m", seconds: 600 },
	{ labelKey: "dashboard.history.interval.30m", seconds: 1800 },
	{ labelKey: "dashboard.history.interval.1h", seconds: 3600 },
	{ labelKey: "dashboard.history.interval.3h", seconds: 10800 },
	{ labelKey: "dashboard.history.interval.5h", seconds: 18000 },
] as const;

type HistoryMetricType = "cpu" | "memory" | "network" | "panel";

type HistoryModalPayload = {
	type: HistoryMetricType;
	title: string;
	metricLabel?: string;
	entries?: Array<{ timestamp: number; value: number }>;
	networkEntries?: SystemStats["network_history"];
	cpuEntries?: SystemStats["panel_cpu_history"];
	memoryEntries?: SystemStats["panel_memory_history"];
};

const expandShortData = <T extends { timestamp: number }>(entries: T[]): T[] => {
	if (entries.length === 1) {
		const single = entries[0];
		return [{ ...single, timestamp: single.timestamp - 2 }, single];
	}
	return entries;
};

const HistoryModal: FC<{
	open: boolean;
	onClose: () => void;
	payload: HistoryModalPayload | null;
	intervalSeconds: number;
	onIntervalChange: (value: number) => void;
	bandwidthScope: BandwidthScope;
	onBandwidthScopeChange: (scope: BandwidthScope) => void;
	canSeeGlobal: boolean;
	t: TFunction;
	isRTL?: boolean;
}> = ({
	open: isOpen,
	onClose,
	payload,
	intervalSeconds,
	onIntervalChange,
	bandwidthScope,
	onBandwidthScopeChange,
	canSeeGlobal,
	t,
	isRTL = false,
}) => {
	const { colorMode } = useColorMode();
	const [isSwitchingInterval, setIsSwitchingInterval] = useState(false);
	const [isChartReady, setIsChartReady] = useState(false);

	useEffect(() => {
		if (!isOpen) {
			setIsChartReady(false);
			return;
		}
		const timer = window.setTimeout(() => setIsChartReady(true), 220);
		return () => window.clearTimeout(timer);
	}, [isOpen]);

	const gridColor =
		colorMode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
	const mutedTextColor = colorMode === "dark" ? "#94a3b8" : "#64748b";

	const MetricIcon = useMemo(() => {
		switch (payload?.type) {
			case "cpu":
				return Cpu;
			case "memory":
				return Database;
			case "network":
				return Signal;
			case "panel":
				return Server;
			default:
				return ChartColumn;
		}
	}, [payload?.type]);

	const { latestTimestamp, availableSpan } = useMemo(() => {
		if (!payload) {
			const now = Math.floor(Date.now() / 1000);
			return {
				latestTimestamp: now,
				earliestTimestamp: now - 120,
				availableSpan: 120,
			};
		}
		let timestamps: number[] = [];
		if (payload.type === "network" && payload.networkEntries?.length) {
			timestamps = payload.networkEntries.map((e) => e.timestamp);
		} else if (payload.type === "panel") {
			const cTs = (payload.cpuEntries || []).map((e) => e.timestamp);
			const mTs = (payload.memoryEntries || []).map((e) => e.timestamp);
			timestamps = [...cTs, ...mTs];
		} else if (payload.entries?.length) {
			timestamps = payload.entries.map((e) => e.timestamp);
		}

		if (!timestamps.length) {
			const now = Math.floor(Date.now() / 1000);
			return {
				latestTimestamp: now,
				earliestTimestamp: now - 120,
				availableSpan: 120,
			};
		}
		const maxT = Math.max(...timestamps);
		const minT = Math.min(...timestamps);
		return {
			latestTimestamp: maxT,
			earliestTimestamp: minT,
			availableSpan: Math.max(1, maxT - minT),
		};
	}, [payload]);

	const effectiveSpan =
		intervalSeconds === 120
			? Math.min(120, availableSpan)
			: Math.max(
					intervalSeconds * 0.5,
					Math.min(intervalSeconds, availableSpan),
				);

	const cutoff = latestTimestamp - effectiveSpan;

	const { chartSeries, actualMinTs, actualMaxTs } = useMemo(() => {
		if (!payload) {
			return {
				chartSeries: [],
				actualMinTs: cutoff,
				actualMaxTs: latestTimestamp,
			};
		}

		let seriesList: { name: string; data: [number, number][] }[] = [];
		let allTs: number[] = [];

		if (payload.type === "network" && payload.networkEntries) {
			const filtered = payload.networkEntries.filter(
				(e) => e.timestamp >= cutoff,
			);
			const rawData = filtered.length >= 1 ? filtered : payload.networkEntries;
			const finalData = expandShortData(rawData);
			allTs = finalData.map((e) => e.timestamp);
			seriesList = [
				{
					name: t("dashboard.system.networkIncoming"),
					data: finalData.map((e) => [e.timestamp * 1000, e.incoming]),
				},
				{
					name: t("dashboard.system.networkOutgoing"),
					data: finalData.map((e) => [e.timestamp * 1000, e.outgoing]),
				},
			];
		} else if (payload.type === "panel") {
			const filteredCpu = (payload.cpuEntries || []).filter(
				(e) => e.timestamp >= cutoff,
			);
			const filteredMem = (payload.memoryEntries || []).filter(
				(e) => e.timestamp >= cutoff,
			);
			const rawCpu =
				filteredCpu.length >= 1 ? filteredCpu : payload.cpuEntries || [];
			const rawMem =
				filteredMem.length >= 1 ? filteredMem : payload.memoryEntries || [];
			const finalCpu = expandShortData(rawCpu);
			const finalMem = expandShortData(rawMem);
			allTs = [
				...finalCpu.map((e) => e.timestamp),
				...finalMem.map((e) => e.timestamp),
			];
			seriesList = [
				{
					name: t("dashboard.system.panelCpuUsage"),
					data: finalCpu.map((e) => [e.timestamp * 1000, e.value]),
				},
				{
					name: t("dashboard.system.panelMemoryUsage"),
					data: finalMem.map((e) => [e.timestamp * 1000, e.value]),
				},
			];
		} else if (payload.entries) {
			const filtered = payload.entries.filter((e) => e.timestamp >= cutoff);
			const rawEntries = filtered.length >= 1 ? filtered : payload.entries;
			const finalEntries = expandShortData(rawEntries);
			allTs = finalEntries.map((e) => e.timestamp);
			seriesList = [
				{
					name: payload.metricLabel ?? payload.title,
					data: finalEntries.map((e) => [e.timestamp * 1000, e.value]),
				},
			];
		}

		const minTs = allTs.length ? Math.min(...allTs) : cutoff;
		const maxTs = allTs.length ? Math.max(...allTs) : latestTimestamp;

		return {
			chartSeries: seriesList,
			actualMinTs: minTs,
			actualMaxTs: maxTs,
		};
	}, [payload, cutoff, latestTimestamp, t]);

	const hasEnoughPoints = useMemo(() => {
		if (!payload) return false;
		let totalPoints = 0;
		if (payload.type === "network" && payload.networkEntries) {
			totalPoints = payload.networkEntries.filter(
				(e) => e.timestamp >= cutoff,
			).length;
			return totalPoints >= 1;
		}
		if (payload.type === "panel") {
			const cLen = (payload.cpuEntries || []).filter(
				(e) => e.timestamp >= cutoff,
			).length;
			const mLen = (payload.memoryEntries || []).filter(
				(e) => e.timestamp >= cutoff,
			).length;
			totalPoints = Math.max(cLen, mLen);
		} else if (payload.entries) {
			totalPoints = payload.entries.filter((e) => e.timestamp >= cutoff).length;
		}
		return totalPoints >= 2;
	}, [payload, cutoff]);

	const isNetwork = payload?.type === "network";

	const { computedMin, computedMax } = useMemo(() => {
		if (isNetwork || !chartSeries.length) {
			return { computedMin: undefined, computedMax: undefined };
		}
		let maxVal = 0;
		let minVal = 100;
		for (const series of chartSeries) {
			for (const pt of series.data) {
				const v = pt[1];
				if (Number.isFinite(v)) {
					if (v > maxVal) maxVal = v;
					if (v < minVal) minVal = v;
				}
			}
		}
		if (maxVal === 0 && minVal === 100) {
			return { computedMin: 0, computedMax: 10 };
		}
		const dynamicMax = Math.min(100, Math.ceil(maxVal * 1.15) || 10);
		const dynamicMin = Math.max(0, Math.floor(minVal * 0.85));
		return {
			computedMin: dynamicMin,
			computedMax: dynamicMax,
		};
	}, [isNetwork, chartSeries]);

	const options: ApexOptions = useMemo(
		() => ({
			chart: {
				type: "area",
				animations: {
					enabled: true,
					easing: "easeinout",
					speed: 260,
					animateGradually: { enabled: true, delay: 40 },
					dynamicAnimation: { enabled: true, speed: 220 },
				},
				toolbar: { show: false },
				zoom: { enabled: false },
				background: "transparent",
				fontFamily: "inherit",
				sparkline: { enabled: false },
			},
			colors: isNetwork
				? ["#06b6d4", "#0d9488"]
				: ["#06b6d4", "#0d9488", "#8b5cf6", "#f59e0b"],
			fill: {
				type: "gradient",
				gradient: {
					shadeIntensity: 1,
					opacityFrom: 0.25,
					opacityTo: 0.02,
					stops: [0, 100],
				},
			},
			dataLabels: { enabled: false },
			theme: { mode: colorMode },
			stroke: { curve: "smooth", width: 2 },
			grid: {
				borderColor: gridColor,
				strokeDashArray: 3,
				xaxis: { lines: { show: false } },
				yaxis: { lines: { show: true } },
				padding: {
					top: 0,
					right: 8,
					bottom: 12,
					left: 5,
				},
			},
			xaxis: {
				type: "numeric",
				min: actualMinTs * 1000,
				max: actualMaxTs * 1000,
				tickAmount: 5,
				axisBorder: { show: false },
				axisTicks: { show: false },
				labels: {
					style: {
						colors: mutedTextColor,
						fontSize: "11px",
						fontFamily: "inherit",
					},
					hideOverlappingLabels: true,
					formatter: (val: string, timestamp?: number) => {
						const num = timestamp !== undefined ? timestamp : Number(val);
						if (!num || !Number.isFinite(num)) return val || "";
						const d = new Date(num);
						const h = String(d.getHours()).padStart(2, "0");
						const m = String(d.getMinutes()).padStart(2, "0");
						const s = String(d.getSeconds()).padStart(2, "0");
						return intervalSeconds === 120 ? `${h}:${m}:${s}` : `${h}:${m}`;
					},
				},
			},
			yaxis: {
				min: isNetwork ? undefined : computedMin,
				max: isNetwork ? undefined : computedMax,
				forceNiceScale: isNetwork,
				tickAmount: 5,
				labels: {
					offsetX: 0,
					style: {
						colors: mutedTextColor,
						fontSize: "11px",
						fontFamily: "inherit",
					},
					formatter: (val: number) => {
						if (!Number.isFinite(val)) return "0";
						if (isNetwork) {
							return formatBytes(val, 1);
						}
						return `${Math.round(val * 10) / 10}%`;
					},
				},
			},
			legend: {
				position: "bottom",
				offsetY: 0,
				labels: { colors: mutedTextColor },
				itemMargin: { horizontal: 8, vertical: 6 },
			},
			tooltip: {
				custom: ({ series, seriesIndex, dataPointIndex, w }) => {
					const timestamp = w.globals.seriesX[seriesIndex]?.[dataPointIndex];
					const dateStr = timestamp
						? new Date(timestamp).toLocaleTimeString(
								isRTL ? "fa-IR" : "en-US",
								{
									hour12: false,
									hour: "2-digit",
									minute: "2-digit",
									second: "2-digit",
								},
							)
						: "";

					const linesHtml = w.globals.seriesNames
						.map((name: string, i: number) => {
							const val = series[i]?.[dataPointIndex];
							if (val === undefined || Number.isNaN(val)) return "";
							const color = w.globals.colors[i] || "#06b6d4";
							const displayVal = isNetwork
								? `${formatBytes(val, 2)}/s`
								: `${Math.round(val * 10) / 10}%`;
							return `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:4px;"><div style="display:flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;border-radius:50%;background:${color};flex-shrink:0;"></span><span style="color:#b1bac4;font-size:11px;font-weight:500;">${name}</span></div><span style="color:#ffffff;font-size:11px;font-weight:700;font-variant-numeric:tabular-nums;direction:ltr;font-family:var(--font-mono);">${displayVal}</span></div>`;
						})
						.join("");

					return `<div style="background:#161b22;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:8px 12px;box-shadow:0 12px 28px -6px rgba(0,0,0,0.55);direction:${isRTL ? "rtl" : "ltr"};font-family:inherit;min-width:148px;"><div style="color:#8b949e;font-size:10px;font-weight:600;direction:ltr;text-align:${isRTL ? "right" : "left"};border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:4px;margin-bottom:4px;">${dateStr}</div>${linesHtml}</div>`;
				},
			},
		}),
		[
			colorMode,
			gridColor,
			mutedTextColor,
			intervalSeconds,
			isNetwork,
			isRTL,
			computedMin,
			computedMax,
			actualMinTs,
			actualMaxTs,
		],
	);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				dir={isRTL ? "rtl" : "ltr"}
				showCloseButton={false}
				className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-1.5rem)] max-w-[780px] flex-col gap-0 overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#161b22] p-0 text-[var(--rb-panel-text)] shadow-2xl sm:w-full sm:max-w-[780px]"
			>
				<DialogHeader className="flex flex-row items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3.5 text-start min-[769px]:px-6">
					<div className="flex min-w-0 items-center gap-2.5">
						<span className="badge-soft-cyan flex size-7 shrink-0 items-center justify-center rounded-lg text-cyan-400 [&_svg]:size-3.5">
							<MetricIcon className="size-3.5" />
						</span>
						<div className="min-w-0">
							<DialogTitle className="truncate text-[14px] font-bold tracking-tight text-[var(--rb-panel-text)]">
								{t("dashboard.history.modalTitle", {
									metric: payload?.title ?? "",
								})}
							</DialogTitle>
							<DialogDescription className="sr-only">
								{payload?.title ?? ""}
							</DialogDescription>
						</div>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={onClose}
						aria-label={t("close")}
						className="size-8 shrink-0 rounded-xl text-[#8b949e] transition-all hover:bg-[#21262d] hover:text-white"
					>
						<X className="size-4" />
					</Button>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 min-[769px]:px-6 min-[769px]:py-5">
					<div className="flex flex-col gap-4">
						{(hasEnoughPoints || (isNetwork && canSeeGlobal)) && (
							<div
								className={cn(
									"flex-wrap items-center justify-between gap-2.5",
									hasEnoughPoints ? "flex" : "hidden min-[769px]:flex",
								)}
							>
								{hasEnoughPoints ? (
									<div className="inline-flex w-full max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-white/[0.08] bg-[#21262d] p-1 min-[769px]:w-fit [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
										{HISTORY_INTERVALS.map((interval, idx) => {
											const isAvailable =
												idx === 0 || availableSpan >= interval.seconds * 0.5;
											const isActive = intervalSeconds === interval.seconds;
											return (
												<div
													key={interval.seconds}
													className="relative inline-flex flex-1 items-center justify-center min-[769px]:flex-none"
												>
													{isActive && (
														<motion.div
															layoutId="historyIntervalActivePill"
															transition={{
																type: "tween",
																ease: [0.22, 1, 0.36, 1],
																duration: 0.24,
															}}
															className="pointer-events-none absolute inset-0 rounded-lg bg-cyan-500 shadow-[0_2px_8px_rgba(6,182,212,0.35)]"
														/>
													)}
													<Button
														type="button"
														onClick={() => {
															if (
																isAvailable &&
																intervalSeconds !== interval.seconds
															) {
																setIsSwitchingInterval(true);
																onIntervalChange(interval.seconds);
																window.setTimeout(
																	() => setIsSwitchingInterval(false),
																	240,
																);
															}
														}}
														variant="ghost"
														size="xs"
														className={cn(
															"relative z-10 h-7 w-full rounded-lg bg-transparent! px-2.5 text-[11px] whitespace-nowrap transition-colors duration-150 sm:px-3.5",
															isActive
																? "font-bold text-white! min-[769px]:hover:text-white!"
																: "font-medium text-[#8b949e] min-[769px]:hover:text-white",
															isAvailable
																? "cursor-pointer opacity-100"
																: "cursor-not-allowed opacity-40",
														)}
													>
														{t(interval.labelKey)}
													</Button>
												</div>
											);
										})}
									</div>
								) : (
									<div />
								)}

								{isNetwork && canSeeGlobal && (
									<div className="relative hidden items-center gap-0.5 rounded-lg border border-white/[0.08] bg-[#21262d] p-0.5 min-[769px]:flex">
										{(["master", "total"] as const).map((scope) => {
											const active = bandwidthScope === scope;
											return (
												<div key={scope} className="relative">
													{active && (
														<motion.div
															layoutId="historyBandwidthScopePill"
															transition={{
																type: "tween",
																ease: [0.22, 1, 0.36, 1],
																duration: 0.22,
															}}
															className="pointer-events-none absolute inset-0 rounded-md bg-cyan-500 shadow-sm"
														/>
													)}
													<Button
														type="button"
														onClick={() => onBandwidthScopeChange(scope)}
														title={
															scope === "total"
																? t("dashboard.system.bandwidthScope.totalHint")
																: undefined
														}
														variant="ghost"
														size="xs"
														className={cn(
															"relative z-10 h-6 rounded-md bg-transparent! px-2.5 text-[11px] font-semibold transition-colors",
															active
																? "text-white! min-[769px]:hover:text-white!"
																: "text-[#8b949e] min-[769px]:hover:text-white",
														)}
													>
														{t(`dashboard.system.bandwidthScope.${scope}`)}
													</Button>
												</div>
											);
										})}
									</div>
								)}
							</div>
						)}

						<div
							dir="ltr"
							className="relative min-h-[300px] w-full rounded-xl border border-white/[0.08] bg-[#0d1117]/60 p-2 sm:p-3 [&_.apexcharts-canvas]:[flex-direction:ltr]! [&_.apexcharts-legend]:flex! [&_.apexcharts-legend]:justify-center! [&_.apexcharts-legend]:gap-4! [&_.apexcharts-tooltip]:border-none! [&_.apexcharts-tooltip]:bg-transparent! [&_.apexcharts-tooltip]:shadow-none! [&_.apexcharts-yaxis-label]:[flex-direction:ltr]!"
						>
							<AnimatePresence>
								{isSwitchingInterval && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15, ease: "easeOut" }}
										className="absolute inset-0 z-10 flex items-center justify-center rounded-[16px] bg-panel-surface/80"
									>
										<Spinner className="text-panel-accent" />
									</motion.div>
								)}
							</AnimatePresence>
							<motion.div
								animate={{ opacity: isSwitchingInterval ? 0 : 1 }}
								transition={{ duration: 0.2, ease: "easeOut" }}
								className="h-full w-full"
							>
								<Suspense
									fallback={
										<div className="flex h-[280px] items-center justify-center">
											<Spinner className="text-panel-accent" />
										</div>
									}
								>
									{hasEnoughPoints && isOpen && !isChartReady ? (
										<div className="flex h-[300px] items-center justify-center">
											<Spinner className="text-panel-accent" />
										</div>
									) : hasEnoughPoints && isOpen ? (
										<HistoryChart
											key={`${payload?.type}-${bandwidthScope}-${intervalSeconds}-${colorMode}`}
											options={options}
											series={chartSeries}
											type="area"
											height={300}
											width="100%"
										/>
									) : (
										<div className="flex h-[300px] flex-col items-center justify-center gap-2 px-4 text-center">
											<p className="text-[13px] font-medium text-panel-text-muted">
												{t("noData")}
											</p>
										</div>
									)}
								</Suspense>
							</motion.div>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const average = (values: number[]) =>
	values.length
		? values.reduce((total, value) => total + value, 0) / values.length
		: 0;

const peak = (values: number[]) => (values.length ? Math.max(...values) : 0);

const ResourceCard: FC<{
	label: string;
	icon: ReactNode;
	value: string;
	totalValue?: string;
	percent: number;
	metaUnit?: string;
	metaValue?: string | number;
	subMeta?: ReactNode;
	footerLeft?: string;
	footerRight?: string;
	onHistory?: () => void;
	historyLabel?: string;
	isRTL?: boolean;
	iconVariant?: "cyan" | "teal" | "purple" | "amber";
}> = ({
	label,
	icon,
	value,
	totalValue,
	percent,
	metaUnit,
	metaValue,
	subMeta,
	footerLeft,
	footerRight,
	onHistory,
	historyLabel,
	isRTL = false,
	iconVariant = "teal",
}) => {
	const safe = clampPercent(percent);
	const barColor =
		safe >= 90
			? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
			: safe >= 70
				? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
				: "bg-[var(--rb-panel-accent)] shadow-[0_0_8px_color-mix(in_srgb,var(--rb-panel-accent)_50%,transparent)]";

	const topAccentColor = {
		cyan: "via-cyan-500/40",
		teal: "via-teal-500/40",
		purple: "via-purple-500/40",
		amber: "via-amber-500/40",
	}[iconVariant];

	const variantClass = {
		cyan: "badge-soft-cyan text-cyan-400",
		teal: "badge-soft-teal text-teal-400",
		purple: "badge-soft-purple text-purple-400",
		amber: "badge-soft-amber text-amber-400",
	}[iconVariant];

	return (
		<article
			className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-[#161b22] p-4 sm:p-5 shadow-sm transition-all duration-200 hover:border-white/[0.16]"
		>
			{/* Remnawave Top Glow Accent */}
			<div
				className={cn(
					"pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent",
					topAccentColor,
				)}
			/>

			<div className="relative z-[1] w-full">
				<div className="mb-3 flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2.5">
						<span
							className={cn(
								"flex size-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 [&_svg]:size-4",
								variantClass,
							)}
						>
							{icon}
						</span>
						<p className="truncate text-xs font-semibold text-[#8b949e]">
							{label}
						</p>
					</div>
					{onHistory && (
						<button
							type="button"
							onClick={onHistory}
							className="relative inline-flex h-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-[#21262d] px-2.5 text-[11px] font-medium text-[#8b949e] select-none outline-none transition-all duration-150 hover:border-white/[0.18] hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500/50 active:scale-[0.97]"
						>
							{historyLabel}
						</button>
					)}
				</div>

				<div className="mb-1 flex flex-nowrap items-baseline justify-start gap-1.5 font-mono">
					{totalValue ? (
						<div
							dir="ltr"
							className="flex items-baseline gap-1.5 [unicode-bidi:isolate]"
						>
							<p className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[var(--rb-panel-text)] tabular-nums">
								{value}
							</p>
							<p className="font-mono text-xs font-semibold text-[#8b949e] tabular-nums">
								/ {totalValue}
							</p>
						</div>
					) : (
						<div className="flex flex-wrap items-baseline gap-1.5">
							<p
								dir="ltr"
								className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[var(--rb-panel-text)] tabular-nums [unicode-bidi:isolate]"
							>
								{value}
							</p>
							{metaValue !== undefined && metaUnit && (
								<div
									dir={isRTL ? "rtl" : "ltr"}
									className="flex items-center gap-1 font-mono text-xs font-medium text-[#8b949e] [unicode-bidi:isolate]"
								>
									<p dir="ltr" className="tabular-nums">
										({metaValue}
									</p>
									<p>{metaUnit})</p>
								</div>
							)}
						</div>
					)}
				</div>

				{subMeta && <div className="mt-1">{subMeta}</div>}
			</div>

			<div className="relative z-[1] mt-3.5 w-full">
				<div className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
					<span className="font-semibold text-[#8b949e]">Utilization</span>
					<p
						dir="ltr"
						className="font-bold text-[var(--rb-panel-text)] tabular-nums [unicode-bidi:isolate]"
					>
						{formatPercent(safe)}
					</p>
				</div>
				<div
					role="progressbar"
					aria-valuenow={Math.round(safe)}
					aria-valuemin={0}
					aria-valuemax={100}
					className="h-1.5 w-full overflow-hidden rounded-full bg-[#21262d]"
				>
					<div
						className={cn(
							"h-full rounded-full transition-all duration-300",
							barColor,
						)}
						style={{
							width: `${safe}%`,
						}}
					/>
				</div>
				{(footerLeft || footerRight) && (
					<div
						dir={isRTL ? "rtl" : "ltr"}
						className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2 font-mono text-[11px] text-[#8b949e] tabular-nums [unicode-bidi:isolate]"
					>
						<p className="truncate">{footerLeft}</p>
						<p className="truncate">{footerRight}</p>
					</div>
				)}
			</div>
		</article>
	);
};

const StatRow: FC<{
	label: string;
	value: string | number;
	dimLabel?: boolean;
	accent?: boolean;
	tag?: string;
	tagColor?: string;
	helper?: string;
}> = ({ label, value, dimLabel, accent, tag, tagColor, helper }) => (
	<div className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-2.5 last:border-b-0">
		<div className="flex min-w-0 flex-nowrap items-center gap-2.5">
			{tagColor && (
				<span
					style={{
						backgroundColor: tagColor,
						boxShadow: `0 0 8px ${tagColor}66`,
					}}
					className="size-[7px] shrink-0 rounded-full"
				/>
			)}
			<p
				className={cn(
					"truncate text-[13px] font-semibold",
					dimLabel ? "text-[#8b949e]" : "text-[#b1bac4]",
				)}
			>
				{label}
			</p>
			{tag && (
				<span
					dir="ltr"
					className="font-mono inline-flex items-center justify-center rounded-full border border-white/[0.08] bg-[#21262d] px-2 py-0.5 text-[10px] font-bold text-[#b1bac4] tabular-nums [unicode-bidi:isolate]"
				>
					{tag.endsWith("%") ? `${tag.slice(0, -1)}%` : tag}
				</span>
			)}
		</div>
		<div className="flex shrink-0 flex-col items-end">
			<p
				dir="ltr"
				className={cn(
					"font-mono text-[13px] font-bold tabular-nums [unicode-bidi:isolate]",
					accent ? "text-cyan-400" : "text-[var(--rb-panel-text)]",
				)}
			>
				{typeof value === "number" ? formatNumberValue(value) : value}
			</p>
			{helper && (
				<p
					dir="ltr"
					className="font-mono text-[10px] font-medium text-[#8b949e] tabular-nums [unicode-bidi:isolate]"
				>
					{helper}
				</p>
			)}
		</div>
	</div>
);

const SectionCard: FC<{
	children: ReactNode;
	title?: ReactNode;
	action?: ReactNode;
	noHover?: boolean;
	headerClassName?: string;
	contentClassName?: string;
}> = ({
	children,
	title,
	action,
	noHover = false,
	headerClassName,
	contentClassName,
}) => {
	return (
		<article
			className={cn(
				"relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#161b22] shadow-sm transition-all duration-200",
				!noHover && "hover:border-white/[0.16]",
			)}
		>
			{(title || action) && (
				<div
					className={cn(
						"relative z-[1] flex flex-wrap items-center justify-between gap-2.5 border-b border-white/[0.08] px-4 py-3.5 sm:px-5 min-[769px]:px-6",
						headerClassName,
					)}
				>
					{title && (
						<div className="min-w-0 text-[13px] font-bold tracking-tight text-[var(--rb-panel-text)]">
							{title}
						</div>
					)}
					{action}
				</div>
			)}
			<div
				className={cn(
					"relative z-[1] flex-1 px-4 py-4 sm:px-5 min-[769px]:px-6",
					contentClassName,
				)}
			>
				{children}
			</div>
		</article>
	);
};

const AnimatedHeightWrapper: FC<{
	children: ReactNode;
	activeKey: string;
}> = ({ children, activeKey }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<number | "auto">("auto");

	useEffect(() => {
		if (!containerRef.current) return;
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const newHeight =
					entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
				if (newHeight > 0) {
					setHeight(newHeight);
				}
			}
		});
		resizeObserver.observe(containerRef.current);
		return () => resizeObserver.disconnect();
	}, []);

	return (
		<motion.div
			animate={{ height }}
			transition={{
				duration: 0.35,
				ease: [0.22, 1, 0.36, 1],
			}}
			style={{ overflow: "hidden" }}
		>
			<div ref={containerRef}>
				<AnimatePresence mode="wait" initial={false}>
					<motion.div
						key={activeKey}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{
							opacity: { duration: 0.14, ease: "linear" },
						}}
					>
						{children}
					</motion.div>
				</AnimatePresence>
			</div>
		</motion.div>
	);
};

const SpeedItem: FC<{
	icon: ReactNode;
	label: string;
	value: string;
	direction?: "in" | "out";
}> = ({ icon, label, value, direction = "in" }) => (
	<div
		className={cn(
			"flex items-center justify-between rounded-lg p-2.5 sm:p-3 transition-colors",
			direction === "in"
				? "border border-teal-500/15 bg-teal-500/[0.04]"
				: "border border-cyan-500/15 bg-cyan-500/[0.04]",
		)}
	>
		<div className="flex min-w-0 items-center gap-2.5">
			<span
				className={cn(
					"flex size-7 shrink-0 items-center justify-center rounded-lg [&_svg]:size-3.5",
					direction === "in"
						? "badge-soft-teal text-teal-400"
						: "badge-soft-cyan text-cyan-400",
				)}
			>
				{icon}
			</span>
			<p className="truncate text-xs font-medium text-[#b1bac4]">
				{label}
			</p>
		</div>
		<p
			dir="ltr"
			className={cn(
				"shrink-0 font-mono text-sm font-bold tabular-nums [unicode-bidi:isolate]",
				direction === "in" ? "text-teal-400" : "text-cyan-400",
			)}
		>
			{value}
		</p>
	</div>
);

export const Statistics: FC<ComponentPropsWithoutRef<"div">> = (props) => {
	const { version } = useDashboard();
	const { userData } = useGetUser();
	const { t, i18n } = useTranslation();
	const isRTL = i18n.dir(i18n.language) === "rtl";

	const { data: rawSystemData } = useQuery<SystemStats>({
		queryKey: StatisticsQueryKey,
		queryFn: () => fetch("/system"),
	});

	const fetchedVersion = rawSystemData?.version;
	useEffect(() => {
		if (fetchedVersion && version !== fetchedVersion) {
			useDashboard.setState({ version: fetchedVersion });
		}
	}, [fetchedVersion, version]);

	const { data: maintenanceInfo } = useQuery<MaintenanceInfo>({
		queryKey: ["dashboard-maintenance-info"],
		queryFn: () =>
			fetch<MaintenanceInfo>("/maintenance/info", { timeout: 8000 }),
		refetchOnWindowFocus: true,
		staleTime: 60 * 1000,
		refetchInterval: 2 * 60 * 1000,
		retry: false,
	});

	const { data: myUsersData } = useQuery<UsersListResponse>({
		queryKey: ["dashboard-my-users-stats", userData.username],
		queryFn: () =>
			fetch<UsersListResponse>("/users", {
				query: { admin: userData.username, limit: 1000 },
			}),
		enabled: Boolean(userData.username),
		staleTime: 10_000,
		refetchInterval: 15_000,
	});

	const systemData = useMemo(
		() => sanitizeSystemStats(rawSystemData),
		[rawSystemData],
	);
	useSystemMetricsStream(true);

	const [totalNetworkHistory, setTotalNetworkHistory] = useState(() =>
		getTotalNetworkHistory(),
	);

	useEffect(() => {
		if (!systemData) return;
		setTotalNetworkHistory(
			recordTotalNetworkSample(
				systemData.total_incoming_bandwidth_speed ?? 0,
				systemData.total_outgoing_bandwidth_speed ?? 0,
			),
		);
	}, [systemData]);

	const [activeHistoryType, setActiveHistoryType] =
		useState<HistoryMetricType | null>(null);
	const [historyInterval, setHistoryInterval] = useState<number>(
		HISTORY_INTERVALS[0].seconds,
	);
	const [userTab, setUserTab] = useState<"all" | "mine">("all");
	const [bandwidthScope, setBandwidthScope] = useState<BandwidthScope>("total");
	const [inlineStatusWithTitle, setInlineStatusWithTitle] = useState(false);
	const overviewHeaderRef = useRef<HTMLDivElement | null>(null);
	const overviewTitleRef = useRef<HTMLHeadingElement | null>(null);
	const overviewStatusRef = useRef<HTMLDivElement | null>(null);
	const overviewControlsRef = useRef<HTMLDivElement | null>(null);

	const canSeeGlobal =
		userData.role === AdminRole.Sudo || userData.role === AdminRole.FullAccess;
	const showTotalBandwidth = canSeeGlobal && bandwidthScope === "total";
	const diagnosticsQuery = useSystemDiagnostics(canSeeGlobal);
	const criticalIssues = dashboardDiagnostics(
		diagnosticsQuery.data || [],
		diagnosticsQuery.isSuccess ? undefined : systemData || undefined,
	);
	const hasXrayError = criticalIssues.some(
		(issue) =>
			issue.resource_type === "node" ||
			(issue.resource_type === "node_service" && issue.resource === "xray"),
	);

	const checkOverviewHeaderFit = useCallback(() => {
		const rowEl = overviewHeaderRef.current;
		const titleEl = overviewTitleRef.current;
		const statusEl = overviewStatusRef.current;
		const controlsEl = overviewControlsRef.current;
		if (!rowEl || !titleEl || !statusEl) return;
		const innerWidth = Math.max(0, rowEl.clientWidth - 8);
		const titleWidth = Math.ceil(titleEl.scrollWidth);
		const statusWrapped = statusEl.offsetHeight > 24;
		const statusWidth = Math.ceil(statusEl.scrollWidth);
		const controlsWidth = controlsEl ? controlsEl.offsetWidth : 0;
		const isMobileViewport =
			typeof window !== "undefined" && window.innerWidth <= 768;
		const buttonsWrapped =
			controlsWidth > 0 &&
			(isMobileViewport ||
				Math.max(titleWidth, statusWidth) + 12 + controlsWidth > innerWidth);
		const canShareTopRow =
			!statusWrapped && titleWidth + 16 + statusWidth <= innerWidth;
		const nextInline = buttonsWrapped && canShareTopRow;
		setInlineStatusWithTitle((prev) =>
			prev !== nextInline ? nextInline : prev,
		);
	}, []);

	useLayoutEffect(() => {
		checkOverviewHeaderFit();
		const rowEl = overviewHeaderRef.current;
		if (!rowEl || typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(checkOverviewHeaderFit);
		observer.observe(rowEl);
		if (overviewTitleRef.current) {
			observer.observe(overviewTitleRef.current);
		}
		if (overviewStatusRef.current) {
			observer.observe(overviewStatusRef.current);
		}
		if (overviewControlsRef.current) {
			observer.observe(overviewControlsRef.current);
		}
		return () => observer.disconnect();
	}, [checkOverviewHeaderFit]);

	const openHistory = (type: HistoryMetricType) => {
		setHistoryInterval(HISTORY_INTERVALS[0].seconds);
		setActiveHistoryType(type);
	};

	const activeHistoryPayload = useMemo<HistoryModalPayload | null>(() => {
		if (!activeHistoryType || !systemData) return null;
		switch (activeHistoryType) {
			case "cpu":
				return {
					type: "cpu",
					title: t("dashboard.system.cpuUsage"),
					metricLabel: t("dashboard.system.cpuUsage"),
					entries: systemData.cpu_history,
				};
			case "memory":
				return {
					type: "memory",
					title: t("dashboard.system.memoryUsage"),
					metricLabel: t("dashboard.system.memoryUsage"),
					entries: systemData.memory_history,
				};
			case "network":
				return {
					type: "network",
					title: t("dashboard.system.bandwidthSpeed"),
					networkEntries: showTotalBandwidth
						? totalNetworkHistory
						: systemData.network_history,
				};
			case "panel":
				return {
					type: "panel",
					title: t("dashboard.system.panelUsage"),
					cpuEntries: systemData.panel_cpu_history,
					memoryEntries: systemData.panel_memory_history,
				};
		}
	}, [
		activeHistoryType,
		showTotalBandwidth,
		systemData,
		t,
		totalNetworkHistory,
	]);

	if (!systemData) {
		return (
			<div
				dir={isRTL ? "rtl" : "ltr"}
				className="flex w-full flex-col gap-4 min-[769px]:gap-5"
			>
				{canSeeGlobal && (
					<SystemDiagnostics issues={criticalIssues} criticalOnly />
				)}
				<PageLoadingSkeleton
					variant="dashboard"
					canSeeGlobal={canSeeGlobal}
					isRTL={isRTL}
				/>
			</div>
		);
	}

	const activePercent =
		systemData.total_user > 0
			? formatPercent((systemData.users_active / systemData.total_user) * 100)
			: formatPercent(0);
	const onlinePercent =
		systemData.total_user > 0
			? formatPercent((systemData.online_users / systemData.total_user) * 100)
			: formatPercent(0);

	const myTotalUsers =
		myUsersData?.total ?? systemData.personal_usage?.total_users ?? 0;
	const myActiveUsers =
		myUsersData?.active_total ??
		myUsersData?.status_breakdown?.active ??
		myTotalUsers;
	const myOnlineUsers = myUsersData?.online_total ?? 0;

	const myActivePercent =
		myTotalUsers > 0
			? formatPercent((myActiveUsers / myTotalUsers) * 100)
			: formatPercent(0);
	const myOnlinePercent =
		myTotalUsers > 0
			? formatPercent((myOnlineUsers / myTotalUsers) * 100)
			: formatPercent(0);

	const myUsersList = myUsersData?.users ?? [];
	const myOnHoldUsers =
		myUsersData?.status_breakdown?.on_hold ??
		myUsersList.filter((u) => u.status === "on_hold").length;
	const myLimitedUsers =
		myUsersData?.status_breakdown?.limited ??
		myUsersList.filter((u) => u.status === "limited").length;
	const myExpiredUsers =
		myUsersData?.status_breakdown?.expired ??
		myUsersList.filter((u) => u.status === "expired").length;
	const myOnlineUploadSpeed = myUsersList.reduce(
		(sum, u) => sum + (Number(u.upload_speed) || 0),
		0,
	);
	const myOnlineDownloadSpeed = myUsersList.reduce(
		(sum, u) => sum + (Number(u.download_speed) || 0),
		0,
	);
	const myActiveUsersUsedTraffic = myUsersList.reduce(
		(sum, u) => sum + (Number(u.used_traffic) || 0),
		0,
	);

	const panelInfo = maintenanceInfo?.panel;
	const exactVersion =
		panelInfo?.tag ||
		panelInfo?.update?.current ||
		(systemData.channel?.toLowerCase() === "dev"
			? "dev"
			: systemData.version) ||
		"-";

	const isHealthy = systemData.xray_running && !hasXrayError;

	return (
		<div
			dir={isRTL ? "rtl" : "ltr"}
			{...props}
			className="flex w-full flex-col gap-4 min-[769px]:gap-5"
		>
			{canSeeGlobal && (
				<SystemDiagnostics issues={criticalIssues} criticalOnly />
			)}

			<div
				ref={overviewHeaderRef}
				className="rb-dashboard-header flex flex-wrap items-center justify-between gap-3 px-1"
			>
				<div
					className={cn(
						"rb-dashboard-header-meta flex min-w-0",
						inlineStatusWithTitle
							? "w-full flex-row items-center justify-start gap-3"
							: "flex-col items-start gap-1.5",
					)}
				>
					<h1
						ref={overviewTitleRef}
						className="shrink-0 text-[18px] font-bold tracking-tight whitespace-nowrap text-[var(--rb-panel-text)] min-[769px]:text-[20px]"
					>
						{t("dashboard.system.overview")}
					</h1>
					<div
						ref={overviewStatusRef}
						className={cn(
							"flex items-center gap-2",
							inlineStatusWithTitle
								? "shrink-0 pt-[2px] whitespace-nowrap"
								: "flex-wrap",
						)}
					>
						<span
							className={cn(
								"inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-semibold",
								isHealthy
									? "badge-soft-teal text-teal-300"
									: "badge-soft-red text-red-300",
							)}
						>
							<span
								className={cn(
									"size-2 shrink-0 rounded-full",
									isHealthy
										? "bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"
										: "bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]",
								)}
							/>
							<span>
								{hasXrayError
									? t("diagnostics.statusError")
									: systemData.xray_running
										? t("dashboard.system.statusRunning")
										: t("dashboard.system.statusStopped")}
							</span>
						</span>

						{systemData.os && (
							<span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#8b949e]">
								<span>·</span>
								<span dir="ltr" className="[unicode-bidi:isolate]">
									{systemData.os}
								</span>
							</span>
						)}

						{exactVersion && exactVersion !== "-" && (
							<span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#8b949e] tabular-nums">
								<span>·</span>
								<span dir="ltr" className="[unicode-bidi:isolate]">
									{exactVersion}
								</span>
							</span>
						)}
					</div>
				</div>

				<div
					ref={overviewControlsRef}
					className="w-full min-[769px]:w-auto shrink-0"
				>
					<DashboardMaintenanceControls
						channel={systemData.channel}
						version={systemData.version}
					/>
				</div>
			</div>

			<div className="rb-dashboard-grid-guard grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4 min-[769px]:gap-4">
				<ResourceCard
					label={t("dashboard.system.cpuUsage")}
					icon={<Cpu className="size-4" />}
					iconVariant="cyan"
					value={formatPercent(systemData.cpu_usage)}
					percent={systemData.cpu_usage}
					metaValue={formatNumberValue(systemData.cpu_cores)}
					metaUnit={t("dashboard.system.core")}
					subMeta={
						systemData.load_avg && systemData.load_avg.length >= 3 ? (
							<div
								dir={isRTL ? "rtl" : "ltr"}
								className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-[#8b949e]"
							>
								<span>{t("loadAverage")}:</span>
								<span
									dir="ltr"
									className="tabular-nums [unicode-bidi:isolate]"
								>
									{systemData.load_avg
										.slice(0, 3)
										.map((v) => v.toFixed(2))
										.join(" · ")}
								</span>
							</div>
						) : undefined
					}
					footerLeft={`${t("dashboard.system.average")}: ${formatPercent(average(systemData.cpu_history.map((e) => e.value)))}`}
					footerRight={`${t("dashboard.system.peak")}: ${formatPercent(peak(systemData.cpu_history.map((e) => e.value)))}`}
					historyLabel={t("dashboard.system.viewHistory")}
					isRTL={isRTL}
					onHistory={() => openHistory("cpu")}
				/>
				<ResourceCard
					label={t("dashboard.system.memoryUsage")}
					icon={<Server className="size-4" />}
					iconVariant="teal"
					value={formatBytes(systemData.memory.current, 1)}
					totalValue={formatBytes(systemData.memory.total, 1)}
					percent={systemData.memory.percent}
					footerLeft={`${t("dashboard.system.average")}: ${formatPercent(average(systemData.memory_history.map((e) => e.value)))}`}
					footerRight={`${t("dashboard.system.peak")}: ${formatPercent(peak(systemData.memory_history.map((e) => e.value)))}`}
					historyLabel={t("dashboard.system.viewHistory")}
					isRTL={isRTL}
					onHistory={() => openHistory("memory")}
				/>
				<ResourceCard
					label={t("dashboard.system.swapUsage")}
					icon={<Database className="size-4" />}
					iconVariant="purple"
					value={formatBytes(systemData.swap.current, 1)}
					totalValue={formatBytes(systemData.swap.total, 1)}
					percent={systemData.swap.percent}
					footerLeft={`${t("dashboard.system.average")}: ${formatPercent(average(systemData.swap_history.map((e) => e.value)))}`}
					footerRight={`${t("dashboard.system.peak")}: ${formatPercent(peak(systemData.swap_history.map((e) => e.value)))}`}
					isRTL={isRTL}
				/>
				<ResourceCard
					label={t("dashboard.system.diskUsage")}
					icon={<HardDrive className="size-4" />}
					iconVariant="amber"
					value={formatBytes(systemData.disk.current, 1)}
					totalValue={formatBytes(systemData.disk.total, 1)}
					percent={systemData.disk.percent}
					footerLeft={`${t("dashboard.system.free")}: ${formatBytes(Math.max(0, systemData.disk.total - systemData.disk.current), 1)}`}
					footerRight={`${t("dashboard.system.average")}: ${formatPercent(average(systemData.disk_history.map((e) => e.value)))}`}
					isRTL={isRTL}
				/>
			</div>

			<div className="rb-dashboard-grid-guard grid grid-cols-1 gap-3 min-[769px]:grid-cols-2 min-[769px]:gap-4">
				<SectionCard
					headerClassName="flex-nowrap items-center justify-between gap-2 px-3.5 sm:px-5 min-[769px]:px-6"
					title={
						<div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
							<span className="badge-soft-cyan flex size-6 shrink-0 items-center justify-center rounded-lg text-cyan-400 sm:size-7 sm:rounded-xl [&_svg]:size-3.5">
								<Signal className="size-3.5" />
							</span>
							<span className="truncate text-[12px] sm:text-[13px] font-bold text-[var(--rb-panel-text)]">
								{t("dashboard.system.bandwidthSpeed")}
							</span>
						</div>
					}
					action={
						<div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
							{canSeeGlobal && (
								<div className="relative flex h-[24px] shrink-0 items-center gap-0.5 rounded-lg border border-white/[0.08] bg-[#21262d] p-0.5">
									{(["master", "total"] as const).map((scope) => {
										const active = bandwidthScope === scope;
										return (
											<div
												key={scope}
												className="relative flex h-[20px] items-center"
											>
												{active && (
													<motion.div
														layoutId="bandwidthScopeTabPill"
														transition={{
															type: "tween",
															ease: [0.16, 1, 0.3, 1],
															duration: 0.22,
														}}
														className="pointer-events-none absolute inset-0 z-[1] rounded-md bg-[var(--rb-panel-accent)] shadow-[0_1px_4px_color-mix(in_srgb,var(--rb-panel-accent)_35%,transparent)]"
													/>
												)}
												<Button
													type="button"
													onClick={() => setBandwidthScope(scope)}
													title={
														scope === "total"
															? t("dashboard.system.bandwidthScope.totalHint")
															: undefined
													}
													variant="ghost"
													size="xs"
													className={cn(
														"relative z-[2] h-[20px] min-h-0 rounded-md bg-transparent! px-2 text-[10.5px] font-semibold leading-none transition-colors active:scale-[0.97]",
														active
															? "text-white! min-[769px]:hover:text-white!"
															: "text-[#8b949e] min-[769px]:hover:text-white",
													)}
												>
													<span
														className={cn(
															"inline-flex items-center leading-none",
															isRTL && "translate-y-[1.5px]",
														)}
													>
														{t(`dashboard.system.bandwidthScope.${scope}`)}
													</span>
												</Button>
											</div>
										);
									})}
								</div>
							)}
							<button
								type="button"
								onClick={() => openHistory("network")}
								className="relative inline-flex h-[24px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-[#21262d] px-2.5 text-[11px] font-medium text-[#8b949e] select-none outline-none transition-all duration-150 hover:border-white/[0.18] hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500/50 active:scale-[0.97]"
							>
								{t("dashboard.system.viewHistory")}
							</button>
						</div>
					}
				>
					<div className="flex flex-col gap-2.5">
						<SpeedItem
							direction="in"
							icon={<ArrowDownLeft className="size-3.5" />}
							label={t("dashboard.system.incomingSpeed")}
							value={`${formatBytes(showTotalBandwidth ? (systemData.total_incoming_bandwidth_speed ?? 0) : systemData.incoming_bandwidth_speed)}/s`}
						/>
						<SpeedItem
							direction="out"
							icon={<ArrowUpRight className="size-3.5" />}
							label={t("dashboard.system.outgoingSpeed")}
							value={`${formatBytes(showTotalBandwidth ? (systemData.total_outgoing_bandwidth_speed ?? 0) : systemData.outgoing_bandwidth_speed)}/s`}
						/>
					</div>
				</SectionCard>

				<SectionCard
					title={
						<div className="flex items-center gap-2.5">
							<span className="badge-soft-teal flex size-7 shrink-0 items-center justify-center rounded-xl text-teal-400 [&_svg]:size-3.5">
								<Clock className="size-3.5" />
							</span>
							<span className="text-[13px] font-bold text-[var(--rb-panel-text)]">{t("dashboard.system.uptime")}</span>
						</div>
					}
				>
					<div className="flex flex-col gap-2.5">
						<div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#21262d]/50 p-2.5 sm:p-3">
							<div className="flex min-w-0 items-center gap-2.5">
								<span className="badge-soft-teal flex size-7 shrink-0 items-center justify-center rounded-lg text-teal-400 [&_svg]:size-3.5">
									<Server className="size-3.5" />
								</span>
								<p className="truncate text-xs font-medium text-[#b1bac4]">
									{t("dashboard.system.systemUptime")}
								</p>
							</div>
							<div className="font-mono text-xs font-semibold text-[var(--rb-panel-text)]">
								{formatLocalizedDuration(systemData.uptime_seconds, t, isRTL)}
							</div>
						</div>
						<div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#21262d]/50 p-2.5 sm:p-3">
							<div className="flex min-w-0 items-center gap-2.5">
								<span className="badge-soft-cyan flex size-7 shrink-0 items-center justify-center rounded-lg text-cyan-400 [&_svg]:size-3.5">
									<Database className="size-3.5" />
								</span>
								<p className="truncate text-xs font-medium text-[#b1bac4]">
									{t("dashboard.system.panelUptime")}
								</p>
							</div>
							<div className="font-mono text-xs font-semibold text-[var(--rb-panel-text)]">
								{formatLocalizedDuration(
									systemData.panel_uptime_seconds,
									t,
									isRTL,
								)}
							</div>
						</div>
					</div>
				</SectionCard>
			</div>

			<SectionCard
				noHover
				title={
					<div className="flex items-center gap-2.5">
						<span className="badge-soft-cyan flex size-7 shrink-0 items-center justify-center rounded-xl text-cyan-400 [&_svg]:size-3.5">
							<Cpu className="size-3.5" />
						</span>
						<span className="text-[13px] font-bold text-[var(--rb-panel-text)]">{t("dashboard.system.panelUsage")}</span>
					</div>
				}
				action={
					<button
						type="button"
						onClick={() => openHistory("panel")}
						className="relative inline-flex h-[24px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-[#21262d] px-2.5 text-[11px] font-medium text-[#8b949e] select-none outline-none transition-all duration-150 hover:border-white/[0.18] hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-500/50 active:scale-[0.97]"
					>
						{t("dashboard.system.viewHistory")}
					</button>
				}
			>
				<div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[769px]:gap-4">
					<ResourceCard
						label={t("dashboard.system.panelCpuUsage")}
						icon={<Cpu className="size-4" />}
						iconVariant="cyan"
						value={formatPercent(systemData.panel_cpu_percent)}
						percent={systemData.panel_cpu_percent}
						metaValue={formatNumberValue(systemData.app_threads)}
						metaUnit={t("dashboard.system.thread")}
						footerLeft={`${t("dashboard.system.average")}: ${formatPercent(average(systemData.panel_cpu_history.map((e) => e.value)))}`}
						footerRight={`${t("dashboard.system.peak")}: ${formatPercent(peak(systemData.panel_cpu_history.map((e) => e.value)))}`}
						isRTL={isRTL}
					/>
					<ResourceCard
						label={t("dashboard.system.panelMemoryUsage")}
						icon={<Server className="size-4" />}
						iconVariant="teal"
						value={formatBytes(systemData.app_memory, 1)}
						totalValue={formatBytes(systemData.memory.total, 1)}
						percent={systemData.panel_memory_percent}
						footerLeft={`${t("dashboard.system.average")}: ${formatPercent(average(systemData.panel_memory_history.map((e) => e.value)))}`}
						footerRight={`${t("dashboard.system.peak")}: ${formatPercent(peak(systemData.panel_memory_history.map((e) => e.value)))}`}
						isRTL={isRTL}
					/>
				</div>
			</SectionCard>

			<SectionCard
				title={
					<div className="flex items-center gap-2.5">
						<span className="badge-soft-purple flex size-7 shrink-0 items-center justify-center rounded-lg text-purple-400">
							<Users className="size-3.5" />
						</span>
						<span>{t("dashboard.users")}</span>
					</div>
				}
				action={
					canSeeGlobal ? (
						<div
							data-rb-swap=""
							className="relative flex items-center gap-0.5 rounded-lg border border-white/[0.08] bg-[#21262d] p-0.5"
						>
							{(
								[
									{ id: "all" as const, label: t("dashboard.users.allUsers") },
									{ id: "mine" as const, label: t("dashboard.users.myUsers") },
								] as const
							).map((tab) => {
								const active = userTab === tab.id;
								return (
									<div key={tab.id} className="relative">
										{active && (
											<motion.div
												layoutId="usersOverviewTabPill"
												transition={{
													type: "tween",
													ease: [0.16, 1, 0.3, 1],
													duration: 0.22,
												}}
												className="pointer-events-none absolute inset-0 z-[1] rounded-md border border-[var(--rb-panel-accent)]/40 bg-[var(--rb-panel-accent)]/20 shadow-[0_0_10px_color-mix(in_srgb,var(--rb-panel-accent)_25%,transparent)]"
											/>
										)}
										<Button
											type="button"
											onClick={() => setUserTab(tab.id)}
											variant="ghost"
											size="xs"
											className={cn(
												"relative z-[2] h-[22px] rounded-md bg-transparent! px-2.5 text-[11px] font-semibold transition-colors active:scale-[0.97]",
												active
													? "text-[var(--rb-panel-accent)]! min-[769px]:hover:text-[var(--rb-panel-accent-hover)]!"
													: "text-[#8b949e] min-[769px]:hover:text-white",
											)}
										>
											{tab.label}
										</Button>
									</div>
								);
							})}
						</div>
					) : undefined
				}
			>
				<AnimatedHeightWrapper activeKey={userTab}>
					{canSeeGlobal && userTab === "all" ? (
						<div className="flex flex-col">
							<StatRow
								label={t("dashboard.users.total")}
								value={systemData.total_user}
								tagColor="#3b82f6"
							/>
							<StatRow
								label={t("dashboard.users.active")}
								value={systemData.users_active}
								tag={activePercent}
								tagColor="#22c55e"
							/>
							<StatRow
								label={t("dashboard.users.online")}
								value={systemData.online_users}
								tag={onlinePercent}
								tagColor="#06b6d4"
								helper={
									systemData.online_users_upload_speed ||
									systemData.online_users_download_speed
										? `↑ ${formatBytes(systemData.online_users_upload_speed)}/s · ↓ ${formatBytes(systemData.online_users_download_speed)}/s`
										: undefined
								}
							/>
							<StatRow
								label={t("dashboard.users.onHold")}
								value={systemData.users_on_hold}
								tagColor="#a855f7"
							/>
							<StatRow
								label={t("dashboard.users.limited")}
								value={systemData.users_limited}
								tagColor="#f59e0b"
							/>
							<StatRow
								label={t("dashboard.users.expired")}
								value={systemData.users_expired}
								tagColor="#f97316"
							/>
						</div>
					) : (
						<div className="flex flex-col">
							<StatRow
								label={t("dashboard.users.total")}
								value={myTotalUsers}
								tagColor="#3b82f6"
							/>
							<StatRow
								label={t("dashboard.users.active")}
								value={myActiveUsers}
								tag={myActivePercent}
								tagColor="#22c55e"
							/>
							<StatRow
								label={t("dashboard.users.online")}
								value={myOnlineUsers}
								tag={myOnlinePercent}
								tagColor="#06b6d4"
								helper={
									myOnlineUploadSpeed || myOnlineDownloadSpeed
										? `↑ ${formatBytes(myOnlineUploadSpeed)}/s · ↓ ${formatBytes(myOnlineDownloadSpeed)}/s`
										: undefined
								}
							/>
							<StatRow
								label={t("dashboard.users.onHold")}
								value={myOnHoldUsers}
								tagColor="#a855f7"
							/>
							<StatRow
								label={t("dashboard.users.limited")}
								value={myLimitedUsers}
								tagColor="#f59e0b"
							/>
							<StatRow
								label={t("dashboard.users.expired")}
								value={myExpiredUsers}
								tagColor="#f97316"
							/>
							<StatRow
								label={t("dashboard.users.currentUserUsage")}
								value={formatBytes(myActiveUsersUsedTraffic, 1)}
								tagColor="#3b82f6"
							/>
							{systemData.personal_usage?.reset_bytes ? (
								<StatRow
									label={t("dashboard.users.resetData")}
									value={formatBytes(systemData.personal_usage.reset_bytes, 1)}
									tagColor="#f59e0b"
								/>
							) : null}
						</div>
					)}
				</AnimatedHeightWrapper>
			</SectionCard>

			{canSeeGlobal && systemData.admin_overview && (
				<SectionCard
					title={
						<div className="flex items-center gap-2.5">
							<span className="badge-soft-amber flex size-7 shrink-0 items-center justify-center rounded-lg text-amber-400">
								<ShieldCheck className="size-3.5" />
							</span>
							<span>{t("dashboard.admins")}</span>
						</div>
					}
				>
					<div className="flex flex-col">
						<StatRow
							label={t("dashboard.admins.total")}
							value={systemData.admin_overview.total_admins}
							tagColor="#3b82f6"
						/>
						<StatRow
							label={t("dashboard.admins.fullAccess")}
							value={systemData.admin_overview.full_access_admins}
							tagColor="#f59e0b"
						/>
						<StatRow
							label={t("dashboard.admins.sudo")}
							value={systemData.admin_overview.sudo_admins}
							tagColor="#a855f7"
						/>
						<StatRow
							label={t("dashboard.admins.standard")}
							value={systemData.admin_overview.standard_admins}
							tagColor="#22c55e"
						/>
						{systemData.admin_overview.top_admin_username && (
							<StatRow
								label={t("dashboard.admins.topAdmin")}
								value={`${systemData.admin_overview.top_admin_username} · ${formatBytes(systemData.admin_overview.top_admin_usage)}`}
								dimLabel
								accent
							/>
						)}
					</div>
				</SectionCard>
			)}

			<HistoryModal
				open={Boolean(activeHistoryPayload)}
				onClose={() => setActiveHistoryType(null)}
				payload={activeHistoryPayload}
				intervalSeconds={historyInterval}
				onIntervalChange={setHistoryInterval}
				bandwidthScope={bandwidthScope}
				onBandwidthScopeChange={setBandwidthScope}
				canSeeGlobal={canSeeGlobal}
				t={t}
				isRTL={isRTL}
			/>
		</div>
	);
};
