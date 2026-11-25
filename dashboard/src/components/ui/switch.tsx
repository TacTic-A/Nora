import type * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "lib/cn";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-white/10 shadow-xs transition-colors outline-none focus-visible:ring-[2px] focus-visible:ring-[var(--nora-panel-accent)]/25 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[var(--nora-panel-accent)] data-[state=checked]:border-[var(--nora-panel-accent)] data-[state=unchecked]:bg-[#21262d]",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className="pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0.5 rtl:data-[state=checked]:-translate-x-[calc(100%-2px)] rtl:data-[state=unchecked]:-translate-x-0.5"
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
