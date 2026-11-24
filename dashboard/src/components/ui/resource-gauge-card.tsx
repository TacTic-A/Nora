import type * as React from "react";
import { Button } from "components/ui/button";
import { cn } from "lib/cn";

export interface ResourceGaugeCardProps extends React.ComponentProps<"article"> {
	label: string;
	icon: React.ReactNode;
	value: string;
	totalValue?: string;
	percent: number;
	metaValue?: string | number;
	metaUnit?: string;
	subMeta?: React.ReactNode;
	footerLeft?: string;
	footerRight?: string;
	onHistory?: () => void;
	historyLabel?: string;
	accentVariant?: "cyan" | "teal" | "purple" | "amber";
	isRTL?: boolean;
}

export function ResourceGaugeCard({
	label,
	icon,
	value,
	totalValue,
	percent,
	metaValue,
	metaUnit,
	subMeta,
	footerLeft,
	footerRight,
	onHistory,
	historyLabel,
	accentVariant = "teal",
	isRTL = false,
	className,
	...props
}: ResourceGaugeCardProps) {
	const safePercent = Math.min(100, Math.max(0, percent));

	const barColor =
		safePercent >= 90
			? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
			: safePercent >= 70
				? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
				: "bg-teal-500 shadow-[0_0_8px_rgba(45,212,191,0.5)]";

	const topAccentColor = {
		cyan: "via-cyan-500/40",
		teal: "via-teal-500/40",
		purple: "via-purple-500/40",
		amber: "via-amber-500/40",
	}[accentVariant];

	const iconVariantClass = {
		cyan: "badge-soft-cyan text-cyan-400",
		teal: "badge-soft-teal text-teal-400",
		purple: "badge-soft-purple text-purple-400",
		amber: "badge-soft-amber text-amber-400",
	}[accentVariant];

	return (
		<article
			className={cn(
				"relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/[0.08] bg-[#161b22] p-4 sm:p-5 shadow-sm transition-all duration-200 hover:border-white/[0.16]",
				className,
			)}
			{...props}
		>
			{/* Remnawave Top Glow Accent */}
			<div
				className={cn(
					"pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent to-transparent",
					topAccentColor,
				)}
			/>

			{/* Header */}
			<div className="relative z-10 w-full">
				<div className="mb-3 flex items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-2.5">
						<span
							className={cn(
								"flex size-8 shrink-0 items-center justify-center rounded-xl [&_svg]:size-4",
								iconVariantClass,
							)}
						>
							{icon}
						</span>
						<p className="truncate text-xs font-semibold text-[#8b949e]">
							{label}
						</p>
					</div>

					{onHistory && (
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={onHistory}
							className="h-6 rounded-full border border-white/[0.08] bg-[#21262d] px-2.5 text-[11px] font-medium text-[#8b949e] transition-all hover:border-white/[0.18] hover:text-white"
						>
							{historyLabel ?? "History"}
						</Button>
					)}
				</div>

				{/* Monospace Values */}
				<div className="mb-1 flex items-baseline gap-1.5 font-mono">
					<span
						dir="ltr"
						className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-[var(--rb-panel-text)] tabular-nums [unicode-bidi:isolate]"
					>
						{value}
					</span>
					{totalValue && (
						<span
							dir="ltr"
							className="font-mono text-xs font-semibold text-[#8b949e] tabular-nums [unicode-bidi:isolate]"
						>
							/ {totalValue}
						</span>
					)}
					{metaValue !== undefined && metaUnit && (
						<div
							dir={isRTL ? "rtl" : "ltr"}
							className="flex items-center gap-1 font-mono text-xs text-[#8b949e] [unicode-bidi:isolate]"
						>
							<span dir="ltr" className="tabular-nums">
								({metaValue}
							</span>
							<span>{metaUnit})</span>
						</div>
					)}
				</div>

				{subMeta && <div className="mt-1">{subMeta}</div>}
			</div>

			{/* Progress & Utilization */}
			<div className="relative z-10 mt-3.5 w-full">
				<div className="mb-1.5 flex items-center justify-between font-mono text-[11px]">
					<span className="font-semibold text-[#8b949e]">Utilization</span>
					<span
						dir="ltr"
						className="font-bold text-[var(--rb-panel-text)] tabular-nums [unicode-bidi:isolate]"
					>
						{safePercent.toFixed(1)}%
					</span>
				</div>

				{/* Smooth Track */}
				<div
					role="progressbar"
					aria-valuenow={Math.round(safePercent)}
					aria-valuemin={0}
					aria-valuemax={100}
					className="h-1.5 w-full overflow-hidden rounded-full bg-[#21262d]"
				>
					<div
						className={cn(
							"h-full rounded-full transition-all duration-300",
							barColor,
						)}
						style={{ width: `${safePercent}%` }}
					/>
				</div>

				{/* Footer Metrics */}
				{(footerLeft || footerRight) && (
					<div
						dir={isRTL ? "rtl" : "ltr"}
						className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2 font-mono text-[11px] text-[#8b949e]"
					>
						<span className="truncate">{footerLeft}</span>
						<span className="truncate">{footerRight}</span>
					</div>
				)}
			</div>
		</article>
	);
}
