import type * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check, Minus } from "lucide-react";
import { cn } from "lib/cn";

function Checkbox({ className, checked, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			checked={checked}
			className={cn(
				"flex size-4.5 shrink-0 items-center justify-center rounded-md border border-[var(--nora-panel-border-strong)] bg-[var(--nora-panel-surface)] text-[var(--nora-panel-text)] shadow-xs outline-none transition-all focus-visible:ring-[2px] focus-visible:ring-[var(--nora-panel-accent)]/25 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[var(--nora-panel-accent)] data-[state=checked]:bg-[var(--nora-panel-accent)] data-[state=checked]:text-white data-[state=indeterminate]:border-[var(--nora-panel-accent)] data-[state=indeterminate]:bg-[var(--nora-panel-accent)] data-[state=indeterminate]:text-white",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator className="flex items-center justify-center">
				{checked === "indeterminate" ? <Minus className="size-3.5" /> : <Check className="size-3.5" />}
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
