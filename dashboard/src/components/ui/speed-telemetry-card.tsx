import type * as React from "react";
import { Button } from "components/ui/button";
import { cn } from "lib/cn";
import { ArrowDownLeft, ArrowUpRight, Signal } from "lucide-react";

export interface SpeedTelemetryCardProps extends React.ComponentProps<"article"> {
	title: string;
	incomingSpeed: string;
	outgoingSpeed: string;
	scope?: "master" | "total";
	onScopeChange?: (scope: "master" | "total") => void;
	canSeeGlobal?: boolean;
	onHistory?: () => void;
	historyLabel?: string;
}

export function SpeedTelemetryCard({
	title,
	incomingSpeed,
	outgoingSpeed,
	scope = "total",
	onScopeChange,
	canSeeGlobal,
	onHistory,
	historyLabel,
	className,
	...props
}: SpeedTelemetryCardProps) {
	return (
		<article
			className={cn(
				"flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#161b22] p-4 sm:p-5 shadow-sm transition-all duration-200 hover:border-white/[0.16]",
				className,
			)}
			{...props}
		>
			{/* Card Header */}
			<div className="mb-3.5 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
				<div className="flex items-center gap-2">
					<span className="badge-soft-cyan flex size-7 items-center justify-center rounded-lg text-cyan-400 [&_svg]:size-3.5">
						<Signal />
					</span>
					<span className="text-xs font-semibold text-white">{title}</span>
				</div>

				<div className="flex items-center gap-1.5">
					{canSeeGlobal && onScopeChange && (
						<div className="inline-flex rounded-lg border border-white/[0.08] bg-[#21262d] p-0.5">
							{(["master", "total"] as const).map((s) => {
								const active = scope === s;
								return (
									<Button
										key={s}
										type="button"
										variant="ghost"
										size="xs"
										onClick={() => onScopeChange(s)}
										className={cn(
											"h-5 rounded-md px-2 text-[10px] font-semibold transition-colors",
											active
												? "bg-cyan-500 font-bold text-white shadow-sm"
												: "text-[#8b949e] hover:text-white",
										)}
									>
										{s.toUpperCase()}
									</Button>
								);
							})}
						</div>
					)}

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
			</div>

			{/* Speed Rows */}
			<div className="flex flex-col gap-2.5">
				{/* Incoming / Download */}
				<div className="flex items-center justify-between rounded-lg border border-teal-500/15 bg-teal-500/[0.05] p-2.5">
					<div className="flex items-center gap-2">
						<span className="badge-soft-teal flex size-6 items-center justify-center rounded-md text-teal-400 [&_svg]:size-3">
							<ArrowDownLeft />
						</span>
						<span className="text-xs font-medium text-[#b1bac4]">Incoming</span>
					</div>
					<span
						dir="ltr"
						className="font-mono text-sm font-bold text-teal-400 tabular-nums [unicode-bidi:isolate]"
					>
						{incomingSpeed}
					</span>
				</div>

				{/* Outgoing / Upload */}
				<div className="flex items-center justify-between rounded-lg border border-cyan-500/15 bg-cyan-500/[0.05] p-2.5">
					<div className="flex items-center gap-2">
						<span className="badge-soft-cyan flex size-6 items-center justify-center rounded-md text-cyan-400 [&_svg]:size-3">
							<ArrowUpRight />
						</span>
						<span className="text-xs font-medium text-[#b1bac4]">Outgoing</span>
					</div>
					<span
						dir="ltr"
						className="font-mono text-sm font-bold text-cyan-400 tabular-nums [unicode-bidi:isolate]"
					>
						{outgoingSpeed}
					</span>
				</div>
			</div>
		</article>
	);
}
