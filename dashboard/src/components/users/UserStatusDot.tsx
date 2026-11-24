import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "lib/cn";

type UserOnlineBadgeProps = {
	isOnline: boolean;
};

export const UserOnlineBadge: FC<UserOnlineBadgeProps> = ({ isOnline }) => {
	const { t } = useTranslation();

	return (
		<span data-online={isOnline ? "true" : "false"} className="flex flex-row items-center gap-1.5 rb-user-online-tag text-xs">
			<span
				aria-hidden="true"
				className={cn(
					"size-2 rounded-full shrink-0 rb-user-status-dot transition-all duration-200",
					isOnline ? "bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" : "bg-[#484f58]"
				)}
			/>
			<span className={isOnline ? "text-teal-400 font-medium" : "text-[#8b949e]"}>
				{t(isOnline ? "usersTable.online" : "usersTable.offline")}
			</span>
		</span>
	);
};
