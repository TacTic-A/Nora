import type { ReactNode } from "react";

export const SettingsCard = ({
	title,
	description,
	actions,
	children,
}: {
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	children?: ReactNode;
}) => (
	<section className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#161b22] overflow-hidden">
		<header className="flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between border-b border-white/[0.06] bg-white/[0.01]">
			<div className="min-w-0">
				<h2 className="text-[1rem] font-semibold text-[var(--rb-panel-text)] tracking-tight">{title}</h2>
				{description ? <p className="mt-1 text-[0.8125rem] text-[#8b949e]">{description}</p> : null}
			</div>
			{actions ? <div className="flex flex-row flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
		</header>
		{children ? <div className="flex flex-col gap-4 p-5">{children}</div> : null}
	</section>
);
