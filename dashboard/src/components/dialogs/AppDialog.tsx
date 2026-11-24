import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "components/ui/dialog";
import { cn } from "lib/cn";

import type { ComponentProps, ReactNode } from "react";

const SIZE_CLASSES = {
	sm: "sm:max-w-md max-h-[calc(100dvh-2rem)]",
	md: "sm:max-w-lg max-h-[calc(100dvh-2rem)]",
	lg: "sm:max-w-2xl max-h-[calc(100dvh-2rem)]",
	xl: "sm:max-w-3xl max-h-[calc(100dvh-2rem)]",
	"2xl": "sm:max-w-4xl max-h-[calc(100dvh-2rem)]",
	"3xl": "sm:max-w-5xl max-h-[calc(100dvh-2rem)]",
	"4xl": "sm:max-w-6xl max-h-[calc(100dvh-2rem)]",
	full: "max-w-[100vw] h-[100dvh] max-h-[100dvh]",
} as const;

export type AppDialogProps = {
	open: boolean;
	onClose: () => void;
	title: ReactNode;
	subtitle?: ReactNode;
	icon?: ReactNode;
	iconVariant?: "cyan" | "teal" | "blue" | "purple" | "amber" | "red" | "gray";
	children: ReactNode;
	footer?: ReactNode;
	size?: keyof typeof SIZE_CLASSES;
	contentProps?: ComponentProps<typeof DialogContent>;
	headerProps?: ComponentProps<typeof DialogHeader>;
	bodyProps?: ComponentProps<"div">;
	footerProps?: ComponentProps<typeof DialogFooter>;
};

const ICON_VARIANT_CLASSES = {
	cyan: "badge-soft-cyan text-cyan-400",
	teal: "badge-soft-teal text-teal-400",
	blue: "badge-soft-blue text-blue-400",
	purple: "badge-soft-purple text-purple-400",
	amber: "badge-soft-amber text-amber-400",
	red: "badge-soft-red text-red-400",
	gray: "badge-soft-gray text-[#8b949e]",
} as const;

export const AppDialog = ({
	open,
	onClose,
	title,
	subtitle,
	icon,
	iconVariant = "cyan",
	children,
	footer,
	size = "md",
	contentProps,
	headerProps,
	bodyProps,
	footerProps,
}: AppDialogProps) => (
	<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
		<DialogContent {...contentProps} className={cn(SIZE_CLASSES[size], "flex flex-col", contentProps?.className)}>
			<DialogHeader {...headerProps} className={cn("shrink-0", headerProps?.className)}>
				{icon || subtitle ? (
					<div className="flex items-center gap-3 min-w-0">
						{icon && (
							<div className={cn("size-9 shrink-0 rounded-xl flex items-center justify-center [&_svg]:size-5", ICON_VARIANT_CLASSES[iconVariant])}>
								{icon}
							</div>
						)}
						<div className="flex flex-col min-w-0 text-start">
							<DialogTitle className="text-base font-semibold text-white tracking-tight truncate">
								{title}
							</DialogTitle>
							{subtitle && (
								<DialogDescription className="text-xs text-[#8b949e] truncate mt-0.5">
									{subtitle}
								</DialogDescription>
							)}
						</div>
					</div>
				) : (
					<DialogTitle>{title}</DialogTitle>
				)}
			</DialogHeader>
			<div {...bodyProps} className={cn("min-h-0 flex-1 px-5 py-4 overflow-y-auto", bodyProps?.className)}>
				{children}
			</div>
			{footer != null && <DialogFooter {...footerProps} className={cn("shrink-0", footerProps?.className)}>{footer}</DialogFooter>}
		</DialogContent>
	</Dialog>
);
