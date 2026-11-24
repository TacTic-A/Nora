import type { ReactNode } from "react";

export const FormSection = ({ title, children }: { title?: ReactNode; children: ReactNode }) => (
	<section className="flex flex-col gap-4 border-t border-white/[0.08] pt-5 first:border-t-0 first:pt-0">
		{title ? <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3> : null}
		{children}
	</section>
);
