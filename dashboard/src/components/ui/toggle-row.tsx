import type { ReactNode } from "react";
import { cn } from "lib/cn";
import { Switch as UiSwitch } from "components/ui/switch";

export const ToggleRow = ({
	title,
	hint,
	checked,
	disabled,
	onChange,
}: {
	title: ReactNode;
	hint?: ReactNode;
	checked: boolean;
	disabled?: boolean;
	onChange: (next: boolean) => void;
}) => (
	<label className={cn("flex items-center justify-between gap-4 rounded-lg border border-white/[0.08] bg-[#0d1117] px-3.5 py-2.5 transition-colors hover:border-white/[0.15]", disabled && "opacity-60")}>
		<span className="min-w-0">
			<span className="block text-sm font-medium text-[var(--nora-panel-text)]">{title}</span>
			{hint ? <span className="mt-0.5 block text-xs text-[#8b949e]">{hint}</span> : null}
		</span>
		<UiSwitch checked={checked} disabled={disabled} onCheckedChange={(next) => onChange(next)} />
	</label>
);
