import { type FC, type MouseEvent as ReactMouseEvent, type ReactElement, type ReactNode, useState } from "react";
import { Ellipsis } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "components/ui/dropdown-menu";
import { RowActionButton } from "./row-actions";

import { cn } from "lib/cn";
const toneClass = (color?: string) => (color ? `text-${color.replace(".", "-")}` : undefined);

export type RowActionItem = {
	id: string;
	label: ReactNode;
	icon?: ReactElement;
	onClick?: () => void;
	disabled?: boolean;
	disabledReason?: string;
	isDanger?: boolean;
	color?: string;
	pinned?: boolean;
};

type RowActionsMenuProps = {
	actions: RowActionItem[];
	label?: string;
};

const getActionLabelText = (label: RowActionItem["label"]) =>
	typeof label === "string" || typeof label === "number" ? String(label) : "";

const getActionPriority = (action: RowActionItem) => {
	const id = action.id.toLowerCase();
	const label = getActionLabelText(action.label).toLowerCase();
	if (id.includes("edit") || label.includes("edit")) return 0;
	if (action.isDanger || id.includes("delete") || label.includes("delete")) {
		return 100;
	}
	return 50;
};

export const orderRowActions = <TAction extends RowActionItem>(actions: TAction[]) =>
	[...actions].sort((first, second) => {
		const priorityDelta = getActionPriority(first) - getActionPriority(second);
		if (priorityDelta !== 0) return priorityDelta;
		return 0;
	});

export const RowActionsMenu: FC<RowActionsMenuProps> = ({ actions, label = "Actions" }) => {
	const [open, setOpen] = useState(false);
	if (actions.length === 0) return null;
	const orderedActions = orderRowActions(actions);
	const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<RowActionButton
					label={label}
					icon={<Ellipsis />}
					onClick={(event: ReactMouseEvent<HTMLButtonElement>) => event.stopPropagation()}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				side="bottom"
				align={isRtl ? "start" : "end"}
				sideOffset={4}
				collisionPadding={16}
				collisionBoundary={typeof document !== "undefined" ? [document.body] : undefined}
				onClick={(event) => event.stopPropagation()}
				className="min-w-[200px]! max-w-[calc(100vw_-_32px)] max-h-[min(65vh,_420px)] overflow-y-auto overflow-x-hidden overscroll-contain z-[13500] rounded-xl bg-[var(--rb-panel-surface)] border border-[var(--rb-panel-border)] p-1.5 shadow-2xl backdrop-blur-md text-[var(--rb-panel-text)]"
			>
				{orderedActions.map((action) => (
					<DropdownMenuItem
						key={action.id}
						disabled={action.disabled}
						className={cn(
							"px-2.5 py-1.5 rounded-lg text-sm font-medium text-[var(--rb-panel-text-secondary)] hover:bg-[var(--rb-panel-elevated)] hover:text-[var(--rb-panel-text)] focus:bg-[var(--rb-panel-elevated)] focus:text-[var(--rb-panel-text)] transition-colors cursor-pointer flex items-center gap-2",
							action.isDanger
								? "text-red-400 hover:bg-red-500/15 hover:text-red-300 focus:bg-red-500/15 focus:text-red-300"
								: toneClass(action.color)
						)}
						onSelect={() => {
							setOpen(false);
							action.onClick?.();
						}}
					>
						{action.icon}
						{action.label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
