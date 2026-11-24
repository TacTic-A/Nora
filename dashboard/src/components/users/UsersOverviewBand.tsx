import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "lib/cn";
import { formatBytes } from "utils/formatByte";
import type { UsersOverviewSelection, UsersOverviewTarget } from "utils/usersOverview";

const count = (value: number | null | undefined, locale: string) =>
	value === null || value === undefined
		? "—"
		: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);

const percent = (value: number, locale: string) =>
	new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);

export type OverviewStatusKey =
	| "active"
	| "expired"
	| "limited"
	| "on_hold"
	| "disabled";

export type UsersOverviewBandProps = {
	total: number;
	usersLimit?: number | null;
	active: number;
	online: number;
	usage: number | null;
	usageLabel?: string;
	breakdown: Partial<Record<OverviewStatusKey, number>>;
	locale: string;
	/** Rendered inside a parent card: drops its own border and surface. */
	bare?: boolean;
	selection: UsersOverviewSelection;
	onSelect: (target: UsersOverviewTarget) => void;
};

const STATUS_ORDER: OverviewStatusKey[] = [
	"active",
	"expired",
	"limited",
	"on_hold",
	"disabled",
];

/* Remnawave cyber-minimalist status tones */
const STATUS_TONE: Record<OverviewStatusKey, string> = {
	active: "bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.5)]",
	expired: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]",
	limited: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
	on_hold: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]",
	disabled: "bg-[#484f58]",
};

/**
 * The users overview card, rebuilt with Tailwind on the panel's own tokens.
 *
 * This is the first screen of the Chakra → Tailwind migration: no Chakra
 * component, no `sx`, no emotion. Every colour comes from `--rb-panel-*`, so it
 * matches the rest of the dashboard exactly, and logical utilities keep RTL
 * identical to LTR.
 */
type OverviewLinkProps = {
	label: string;
	active?: boolean;
	onSelect: () => void;
	className?: string;
	children: ReactNode;
};

const OverviewLink = ({ label, active = false, onSelect, className, children }: OverviewLinkProps) => (
	<button
		type="button"
		aria-label={label}
		aria-pressed={active}
		title={label}
		onClick={onSelect}
		className={cn(
			"cursor-pointer text-start underline decoration-panel-text-muted/60 underline-offset-4 transition-colors hover:text-panel-accent hover:decoration-panel-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-panel-accent rounded-sm",
			active && "text-panel-accent decoration-panel-accent",
			className,
		)}
	>
		{children}
	</button>
);

export function UsersOverviewBand({
	total,
	usersLimit,
	active,
	online,
	usage,
	usageLabel,
	breakdown,
	locale,
	bare = false,
	selection,
	onSelect,
}: UsersOverviewBandProps) {
	const { t } = useTranslation();
	const totals = STATUS_ORDER.reduce((sum, key) => sum + (breakdown[key] ?? 0), 0);
	const share = (value: number, of: number) =>
		of > 0 ? (value / of) * 100 : 0;
	const limitPercent = usersLimit ? Math.min(100, share(total, usersLimit)) : null;

	return (
		<section
			className={
				bare
					? "grid grid-cols-2 gap-x-4 gap-y-4 p-4 md:grid-cols-[minmax(0,14rem)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,13rem)] md:gap-0"
					: "grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border border-white/[0.08] bg-[#161b22] p-4 shadow-md md:grid-cols-[minmax(0,14rem)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,13rem)] md:gap-0"
			}
			aria-label={t("usersStatusBreakdown")}
		>
			{/* Total, against the admin's user cap when the panel reports one. */}
			<div className="order-1 col-span-1 flex flex-col justify-between gap-2 md:pe-6">
				<span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
					{t("usersTable.total")}
				</span>
				<div>
					<div className="flex items-baseline gap-2">
						<OverviewLink
							label={t("usersTable.total")}
							onSelect={() => onSelect({ kind: "all" })}
							className="rb-tabular font-mono text-[1.75rem] font-bold leading-none tracking-tight text-white hover:text-cyan-400"
						>
							{count(total, locale)}
						</OverviewLink>
						{usersLimit ? (
							<span className="rb-tabular font-mono text-xs text-[#8b949e]">
								/ {count(usersLimit, locale)}
							</span>
						) : null}
					</div>
					{limitPercent !== null ? (
						<div className="mt-2 space-y-1">
							<div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
								<div
									className="h-full rounded-full bg-cyan-400 transition-[width] duration-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]"
									style={{ width: `${limitPercent}%` }}
								/>
							</div>
							<p className="rb-tabular font-mono flex items-baseline gap-1 text-[0.625rem] text-[#8b949e]">
								<span>{percent(limitPercent, locale)}%</span>
								<span>/</span>
								<span>{count(usersLimit, locale)}</span>
							</p>
						</div>
					) : (
						<p className="mt-2 text-xs text-[#8b949e]">
							{t("users")}
						</p>
					)}
				</div>
			</div>

			{/* Live state. */}
			<div className="order-3 col-span-2 grid grid-cols-2 content-start gap-x-4 gap-y-3 border-t border-white/[0.06] pt-4 md:order-2 md:col-span-1 md:flex md:flex-col md:justify-between md:gap-3 md:border-s md:border-t-0 md:border-white/[0.06] md:px-6 md:pt-0">
				{[
					{ key: "online", label: t("onlineStatus.online"), value: online, tone: "bg-panel-accent" },
					{ key: "active", label: t("status.active"), value: active, tone: "bg-panel-success" },
				].map((row) => (
					<OverviewLink
						key={row.key}
						label={row.label}
						active={row.key === "online" ? selection.online : selection.status === "active"}
						onSelect={() =>
							onSelect(row.key === "online" ? { kind: "online" } : { kind: "status", status: "active" })
						}
						className="block w-full"
					>
						<div className="flex items-center gap-1.5">
							<span className={`size-1.5 rounded-full ${row.tone}`} />
							<span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
								{row.label}
							</span>
						</div>
						<div className="mt-1 flex items-baseline gap-2">
							<span className="rb-tabular font-mono text-lg font-bold leading-none text-white">
								{count(row.value, locale)}
							</span>
							<span className="rb-tabular font-mono flex items-baseline gap-1 text-[0.625rem] text-[#8b949e]">
								<span>{percent(share(row.value, totals || total || 1), locale)}%</span>
								<span>{t("users")}</span>
							</span>
						</div>
					</OverviewLink>
				))}
			</div>

			{/* Distribution across statuses. */}
			<div className="order-4 col-span-2 flex flex-col justify-center gap-2 border-t border-white/[0.06] pt-4 md:order-3 md:col-span-1 md:border-s md:border-t-0 md:border-white/[0.06] md:px-6 md:pt-0">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
						{t("usersStatusBreakdown")}
					</span>
					<span className="rb-tabular font-mono text-xs text-[#8b949e]">
						{count(totals, locale)}
					</span>
				</div>
				<div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-white/[0.08]">
					{STATUS_ORDER.map((key) => {
						const value = breakdown[key] ?? 0;
						if (!value) return null;
						return (
							<span
								key={key}
								className={`h-full first:rounded-s-full last:rounded-e-full ${STATUS_TONE[key]}`}
								style={{ width: `${share(value, totals || 1)}%` }}
								title={`${t(`status.${key}`)}: ${value}`}
							/>
						);
					})}
				</div>
				<div className="grid grid-cols-2 gap-x-4 gap-y-1">
					{STATUS_ORDER.map((key) => (
						<OverviewLink
							key={key}
							label={t(`status.${key}`)}
							active={selection.status === key}
							onSelect={() => onSelect({ kind: "status", status: key })}
							className="flex items-center gap-1.5 text-xs text-[#c9d1d9] hover:text-white"
						>
							<span className={`size-1.5 rounded-full ${STATUS_TONE[key]}`} />
							{t(`status.${key}`)}
							<span className="rb-tabular font-mono ms-auto font-medium text-white">
								{count(breakdown[key] ?? 0, locale)}
							</span>
						</OverviewLink>
					))}
				</div>
			</div>

			{/* Traffic total plus the per-user average. */}
			<div className="order-2 col-span-1 flex flex-col justify-between gap-2 md:order-4 md:col-span-1 md:border-s md:border-white/[0.06] md:ps-6">
				<span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
					{usageLabel ?? t("usersTable.listUsage")}
				</span>
				<div>
					<OverviewLink
						label={usageLabel ?? t("usersTable.listUsage")}
						active={selection.usage}
						onSelect={() => onSelect({ kind: "usage" })}
						className="rb-tabular font-mono block w-full text-[1.75rem] font-bold leading-none tracking-tight text-white hover:text-cyan-400"
					>
						<span dir="ltr" style={{ unicodeBidi: "isolate" }}>
							{usage === null ? "—" : formatBytes(usage)}
						</span>
					</OverviewLink>
					<p className="mt-2 flex items-baseline gap-1 text-[0.625rem] text-panel-text-muted">
						{usage === null || total === 0 ? (
							<span>&nbsp;</span>
						) : (
							<>
								<span dir="ltr" style={{ unicodeBidi: "isolate" }}>
									{formatBytes(Math.round(usage / Math.max(1, total)))}
								</span>
								<span>/</span>
								<span>{t("user")}</span>
							</>
						)}
					</p>
				</div>
			</div>
		</section>
	);
}
