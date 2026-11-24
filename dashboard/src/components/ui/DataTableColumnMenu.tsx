import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "components/ui/tooltip";
import { Button } from "components/ui/button";
import { Checkbox } from "components/ui/checkbox";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { SlidersHorizontal } from "lucide-react";

import { useTranslation } from "react-i18next";
import type { DataTableColumn } from "./DataTable.types";

type DataTableColumnMenuProps<TData> = {
	columns: DataTableColumn<TData>[];
	visibility: Record<string, boolean>;
	onChange: (next: Record<string, boolean>) => void;
};

/**
 * Column chooser for the dashboard tables. Mirrors the "Columns" control of the
 * rebuilt dashboard, but keeps the panel's own menu styling so the table still
 * looks like the rest of the panel.
 */
export function DataTableColumnMenu<TData>({
	columns,
	visibility,
	onChange,
}: DataTableColumnMenuProps<TData>) {
	const { t } = useTranslation();
	// Structural columns (selection, actions) are not offered: hiding them would
	// leave the row without its controls.
	const choosable = columns.filter(
		(column) => !column.id.startsWith("__") && column.menuLabel !== undefined,
	);

	if (choosable.length === 0) return null;

	const visibleCount = choosable.filter(
		(column) => visibility[column.id] !== false,
	).length;

	return (
		<DropdownMenu>
			<Tooltip>
<TooltipTrigger asChild>
				<DropdownMenuTrigger asChild>
					<Button aria-label={t("next.table.toggleColumns")} size="sm" variant="outline" className="h-9 w-9 rounded-lg border-white/[0.08] bg-[#161b22] text-[#8b949e] hover:bg-[#21262d] hover:text-white">
						<SlidersHorizontal className="w-[16px]" />
					</Button>
				</DropdownMenuTrigger>
			</TooltipTrigger>
<TooltipContent>{t("next.table.toggleColumns")}</TooltipContent>
</Tooltip>
			
				<DropdownMenuContent className="z-[1800] min-w-[220px]! bg-[#21262d] border border-white/10 rounded-xl shadow-2xl p-1.5 backdrop-blur-md">
					<div className="flex flex-col gap-2 px-3 py-2">
						<p className="text-xs text-[#8b949e] uppercase font-semibold tracking-wider">
							{t("next.table.toggleColumns")} · {visibleCount}/{choosable.length}
						</p>
						{choosable.map((column) => {
							const id = `column-${column.id}`;
							const checked = visibility[column.id] !== false;
							return (
								<label key={column.id} className="flex cursor-pointer items-center gap-2 text-sm text-[#c9d1d9] hover:text-white transition-colors py-1"><Checkbox id={id} checked={checked} onCheckedChange={(checked: boolean) => onChange({
											...visibility,
											[column.id]: checked,
										})} /><span><span className="text-sm font-medium">
										{column.menuLabel}
									</span></span></label>
							);
						})}
					</div>
				</DropdownMenuContent>
			
		</DropdownMenu>
	);
}
