import type * as React from "react";
import { cn } from "lib/cn";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export interface KpiCardProps extends React.ComponentProps<"div"> {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: React.ReactNode;
	iconVariant?: "cyan" | "teal" | "purple" | "amber" | "red" | "blue" | "gray";
	trend?: {
		value: string | number;
		positive?: boolean;
		period?: string;
	};
	isLoading?: boolean;
}

export function KpiCard({
	title,
	value,
	subtitle,
	icon,
	iconVariant = "cyan",
	trend,
	isLoading,
	className,
	...props
}: KpiCardProps) {
	const variantClass = {
		cyan: "badge-soft-cyan",
		teal: "badge-soft-teal",
		purple: "badge-soft-purple",
		amber: "badge-soft-amber",
		red: "badge-soft-red",
		blue: "badge-soft-blue",
		gray: "badge-soft-gray",
	}[iconVariant];

	return (
		<div
			data-slot="kpi-card"
			className={cn(
				"group relative flex items-center gap-3.5 rounded-xl border border-white/[0.08] bg-[#161b22] p-4 shadow-sm transition-all duration-200 hover:border-white/[0.16]",
				className,
			)}
			{...props}
		>
			{/* Soft Icon Pill */}
			<div
				className={cn(
					"flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 [&_svg]:size-5",
					variantClass,
				)}
			>
				{icon}
			</div>

			{/* Metric Content */}
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="truncate text-xs font-medium text-[#8b949e]">
					{title}
				</span>

				{isLoading ? (
					<div className="h-7 w-20 animate-pulse rounded bg-white/[0.06]" />
				) : (
					<span className="font-mono text-xl sm:text-2xl font-bold tracking-tight text-white tabular-nums truncate">
						{typeof value === "number" ? value.toLocaleString() : value}
					</span>
				)}

				{trend && (
					<div className="flex items-center gap-1 text-[11px] font-semibold">
						{trend.positive ? (
							<ArrowUpRight className="size-3 text-teal-400" />
						) : (
							<ArrowDownRight className="size-3 text-red-400" />
						)}
						<span className={trend.positive ? "text-teal-400" : "text-red-400"}>
							{trend.value}
						</span>
						{trend.period && (
							<span className="font-normal text-[#8b949e]">
								{trend.period}
							</span>
						)}
					</div>
				)}

				{subtitle && !trend && (
					<span className="truncate text-[11px] text-[#8b949e]">
						{subtitle}
					</span>
				)}
			</div>
		</div>
	);
}
