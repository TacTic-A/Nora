import type * as React from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "lib/cn";

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;
/** Wrap an option's label in this so the trigger shows only the label, not the description under it. */
const SelectItemText = SelectPrimitive.ItemText;

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(
				"flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#0d1117] px-3 text-start text-sm text-[var(--rb-panel-text)] whitespace-nowrap shadow-xs outline-none transition-all duration-150 focus-visible:border-[var(--rb-panel-accent)] focus-visible:ring-[2px] focus-visible:ring-[var(--rb-panel-accent)]/25 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-[#6e7681] [&>span]:truncate",
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<ChevronDown className="size-4 shrink-0 text-[#8b949e]" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

function SelectContent({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				data-slot="select-content"
				position="popper"
				sideOffset={4}
				className={cn(
					"relative z-[13000] origin-(--radix-select-content-transform-origin) data-[state=open]:animate-rb-pop-in data-[state=closed]:animate-rb-pop-out max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-white/10 bg-[#21262d] text-[var(--rb-panel-text)] shadow-2xl backdrop-blur-md",
					className,
				)}
				{...props}
			>
				<SelectPrimitive.Viewport className="w-full p-1.5">{children}</SelectPrimitive.Viewport>
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				"relative flex w-full cursor-pointer items-start gap-2 rounded-lg py-1.5 ps-2.5 pe-8 text-sm text-[#c9d1d9] outline-none select-none transition-colors hover:bg-[var(--rb-panel-row-hover)] hover:text-[var(--rb-panel-text)] focus:bg-[var(--rb-panel-row-hover)] focus:text-[var(--rb-panel-text)] data-[highlighted]:bg-[var(--rb-panel-row-hover)] data-[highlighted]:text-[var(--rb-panel-text)] data-[state=checked]:text-[var(--rb-panel-accent)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				className,
			)}
			{...props}
		>
			<span className="absolute end-2 top-2 flex size-4 items-center justify-center">
				<SelectPrimitive.ItemIndicator>
					<Check className="size-4 text-[var(--rb-panel-accent)]" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</div>
		</SelectPrimitive.Item>
	);
}

export { Select, SelectContent, SelectItem, SelectItemText, SelectTrigger, SelectValue };
