import { DialogContent, DialogFooter, DialogHeader } from "components/ui/dialog";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "lib/cn";
import type { FC, ReactNode } from "react";

export const XrayModalContent: FC<Parameters<typeof DialogContent>[0]> = ({ className, children, ...props }) => (
	<DialogContent {...props} className={cn("rb-xray-dialog flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 rounded-[20px] border border-white/[0.08] bg-[#161b22] text-white shadow-2xl", className)}>
		{children}
	</DialogContent>
);

export const XrayModalHeader: FC<
	ComponentPropsWithoutRef<"div"> & { subtitle?: ReactNode; icon?: ReactNode }
> = ({ children, subtitle, icon, className, ...props }) => (
	<DialogHeader {...props} className={cn("shrink-0 border-b border-white/[0.08] bg-[#161b22]/95 px-4 md:px-5 py-3.5 backdrop-blur-md", className)}>
		<div className="flex items-center gap-3">
			{icon && (
				<div className="flex size-9 shrink-0 items-center justify-center rounded-xl badge-soft-cyan text-cyan-400">
					{icon}
				</div>
			)}
			<div className="min-w-0">
				<p className="text-base font-semibold text-white tracking-tight">
					{children}
				</p>
				{subtitle && (
					<p className="mt-0.5 text-xs text-[#8b949e]">
						{subtitle}
					</p>
				)}
			</div>
		</div>
	</DialogHeader>
);

export const XrayModalBody: FC<ComponentPropsWithoutRef<"div">> = ({ children, className, ...props }) => (
	<div className={cn("min-h-0 flex-1 overflow-y-auto px-4 md:px-5 py-4", className)} {...props}>
		{children}
	</div>
);

export const XrayModalFooter: FC<ComponentPropsWithoutRef<"div">> = ({
	children,
	className,
	...props
}) => (
	<DialogFooter {...props} className={cn("shrink-0 border-t border-white/[0.08] bg-[#161b22]/95 px-4 md:px-5 py-3 gap-2 backdrop-blur-md", className)}>
		{children}
	</DialogFooter>
);

export const XrayDialogSection: FC<
	ComponentPropsWithoutRef<"div"> & { title?: ReactNode; description?: ReactNode }
> = ({ title, description, children, className, ...props }) => (
	<div {...props} className={cn(["xray-dialog-section flex flex-col gap-4 border-t border-white/[0.08] pt-5 first:border-t-0 first:pt-0", className].filter(Boolean).join(" "))}>
		{title && (
			<div className="mb-1">
				<p className="text-sm font-semibold text-white tracking-tight">
					{title}
				</p>
				{description && (
					<p className="mt-0.5 text-xs text-[#8b949e]">
						{description}
					</p>
				)}
			</div>
		)}
		{children}
	</div>
);

export const XrayFieldGrid: FC<ComponentPropsWithoutRef<"div">> = ({
	children,
	className,
	...props
}) => (
	<div {...props} className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
		{children}
	</div>
);
