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
				"flex size-4.5 shrink-0 items-center justify-center rounded-md border border-white/20 bg-[#0d1117] shadow-xs outline-none transition-all focus-visible:ring-[2px] focus-visible:ring-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-cyan-500 data-[state=checked]:bg-cyan-500 data-[state=checked]:text-white data-[state=indeterminate]:border-cyan-500 data-[state=indeterminate]:bg-cyan-500 data-[state=indeterminate]:text-white",
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
