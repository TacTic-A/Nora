import type * as React from "react";
import { cn } from "lib/cn";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"flex h-9 w-full min-w-0 rounded-lg border border-white/10 bg-[#0d1117] px-3 py-1 text-sm text-[var(--rb-panel-text)] placeholder:text-[#6e7681] shadow-xs transition-all duration-150 outline-none selection:bg-[var(--rb-panel-accent)]/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-[var(--rb-panel-accent)] focus-visible:ring-[2px] focus-visible:ring-[var(--rb-panel-accent)]/25 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
