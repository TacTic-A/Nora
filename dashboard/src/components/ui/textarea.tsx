import type * as React from "react";
import { cn } from "lib/cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex min-h-16 w-full rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-[var(--nora-panel-text)] placeholder:text-[#6e7681] shadow-xs transition-all duration-150 outline-none selection:bg-[var(--nora-panel-accent)]/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-[var(--nora-panel-accent)] focus-visible:ring-[2px] focus-visible:ring-[var(--nora-panel-accent)]/25 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
