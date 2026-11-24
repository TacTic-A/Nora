import { Button } from "components/ui/button";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { withClass } from "lib/withClass";
import { TriangleAlert } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
} from "components/ui/dialog";

import { useDisclosure } from "hooks/useDisclosure";
import { cn } from "lib/cn";
import {
	cloneElement,
	type MouseEvent,
	type ReactElement,
	type ReactNode,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";

const WarningIcon = withClass(TriangleAlert, "w-6 h-6");

export type ConfirmDialogProps = {
	open: boolean;
	title: ReactNode;
	description: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	colorScheme?: string;
	loading?: boolean;
	isConfirmDisabled?: boolean;
	onClose: () => void;
	onConfirm: () => void | Promise<void>;
};

export const ConfirmDialog = ({
	open: isOpen,
	title,
	description,
	confirmLabel,
	cancelLabel,
	colorScheme = "primary",
	loading: isLoading,
	isConfirmDisabled = false,
	onClose,
	onConfirm,
}: ConfirmDialogProps) => {
	const { t } = useTranslation();
	const cancelRef = useRef<HTMLButtonElement | null>(null);
	const isDestructive = colorScheme === "red";
	const iconBg = isDestructive ? "badge-soft-red" : "badge-soft-cyan";
	const iconColor = isDestructive ? "text-red-400" : "text-cyan-400";

	return (
		<Dialog open={isOpen} onOpenChange={(next) => { if (!next) onClose(); }}>
			<DialogContent
				showCloseButton={false}
				onKeyDown={(event) => {
					if (event.key !== "Enter" || isLoading || isConfirmDisabled) return;
					event.preventDefault();
					void onConfirm();
				}}
				className="mx-4 max-w-[calc(100vw_-_32px)] gap-0 overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#161b22] text-white px-5 py-4.5 shadow-2xl sm:mx-0 sm:max-w-[500px]"
			>
				<div className="flex items-start gap-3.5">
					<div className={cn(iconBg, iconColor, "flex size-10 shrink-0 items-center justify-center rounded-xl")}>
						<WarningIcon />
					</div>
					<div className="min-w-0! flex-1">
						<DialogTitle className="mb-0.5 text-base sm:text-lg font-semibold text-white tracking-tight rb-confirm-dialog-content">
							{title}
						</DialogTitle>
						<DialogDescription asChild className="mt-1.5">
							<div>
								{typeof description === "string" ? (
									<p className="text-sm leading-relaxed text-[#8b949e]">{description}</p>
								) : (
									description
								)}
							</div>
						</DialogDescription>
					</div>
				</div>
				<DialogFooter className="mt-4 flex-wrap justify-end gap-2 border-t border-white/[0.06] pt-3.5 rb-confirm-dialog-actions">
					<Button ref={cancelRef} variant="outline" onClick={onClose} disabled={isLoading} size="sm" className="h-[36px] min-h-[36px] min-w-[80px]! px-3 text-sm">
						{cancelLabel ?? t("cancel")}
					</Button>
					<Button variant={isDestructive ? "destructive" : "soft-cyan"} disabled={isConfirmDisabled} onClick={onConfirm} size="sm" loading={isLoading} className="h-[36px] min-h-[36px] min-w-[80px]! px-3 text-sm">
						{confirmLabel ?? t("confirm")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

const stripHtmlTags = (value: string) => value.replace(/<[^>]*>/g, "");

export type DeleteConfirmDialogProps = {
	children: ReactElement;
	description?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	loading?: boolean;
	disabled?: boolean;
	onConfirm: () => void | Promise<void>;
	onCancel?: () => void;
};

export const DeleteConfirmDialog = ({
	children,
	description,
	confirmLabel,
	cancelLabel,
	loading: isLoading,
	disabled: isDisabled,
	onConfirm,
	onCancel,
}: DeleteConfirmDialogProps) => {
	const { t } = useTranslation();
	const { isOpen, onClose, onOpen } = useDisclosure();
	const [isConfirming, setIsConfirming] = useState(false);
	const busy = Boolean(isLoading) || isConfirming;
	const confirmMessage =
		typeof description === "string"
			? stripHtmlTags(description)
			: (description ?? t("common.confirmDelete"));

	const handleClose = () => {
		if (busy) return;
		onCancel?.();
		onClose();
	};
	const handleConfirm = async () => {
		setIsConfirming(true);
		try {
			await onConfirm();
			onClose();
		} finally {
			setIsConfirming(false);
		}
	};
	const childProps = children.props as {
		onClick?: (event: MouseEvent<HTMLElement>) => void;
		onClickCapture?: (event: MouseEvent<HTMLElement>) => void;
	};
	const trigger = cloneElement(children, {
		onClickCapture: (event: MouseEvent<HTMLElement>) => {
			childProps.onClickCapture?.(event);
			if (event.defaultPrevented) return;
			event.preventDefault();
			event.stopPropagation();
			if (!isDisabled && !busy) onOpen();
		},
		onClick: (event: MouseEvent<HTMLElement>) => {
			childProps.onClick?.(event);
			event.stopPropagation();
		},
	} as Partial<typeof children.props>);

	return (
		<>
			{trigger}
			<ConfirmDialog
				open={isOpen}
				onClose={handleClose}
				onConfirm={handleConfirm}
				title={t("common.confirmAction")}
				description={confirmMessage}
				confirmLabel={confirmLabel ?? t("delete")}
				cancelLabel={cancelLabel ?? t("cancel")}
				colorScheme="red"
				loading={busy}
				isConfirmDisabled={Boolean(isDisabled)}
			/>
		</>
	);
};
