import { toneClass } from "lib/tone";
import { Badge } from "components/ui/badge";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

import { cn } from "lib/cn";
import { statusColors } from "constants/UserSettings";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { Status as UserStatusType } from "types/User";
import { relativeExpiryDate } from "utils/dateFormatter";

type UserStatusProps = {
	expiryDate?: number | null;
	status: UserStatusType;
	compact?: boolean;
	showDetail?: boolean;
	extraText?: string | null;
};
export const NodeModalStatusBadge: FC<UserStatusProps> = ({
	expiryDate,
	status: userStatus,
	compact = false,
	showDetail = true,
	extraText,
}) => {
	const { t } = useTranslation();
	const dateInfo = relativeExpiryDate(expiryDate);
	const Icon = statusColors[userStatus].icon;
	const toneClassValue = {
		active: "badge-soft-teal",
		connected: "badge-soft-teal",
		connecting: "badge-soft-amber",
		expired: "badge-soft-red",
		limited: "badge-soft-amber",
		on_hold: "badge-soft-purple",
		disabled: "badge-soft-gray",
		error: "badge-soft-red",
	}[userStatus as string] ?? toneClass(statusColors[userStatus].statusColor);

	return (
		<>
			<Badge className={cn(toneClassValue, "rounded-full inline-flex px-3 py-1 items-center justify-center flex-nowrap leading-[1] whitespace-nowrap max-w-full font-semibold transition-all", compact ? "gap-x-1 min-w-[64px]!" : "gap-x-2 min-w-[72px]!", "rb-status-badge")}>
				<Icon className={cn("shrink-0", compact ? "w-3" : "w-4")} />
				{showDetail && (
					<p className={cn("capitalize font-semibold tracking-[0] whitespace-nowrap text-center", compact ? "text-[.7rem] leading-[1rem]" : "text-xs leading-[1.25rem]", "rb-status-badge-text")}>
						{userStatus && t(`nodeModal.status.${userStatus}`)}
						{extraText && `: ${extraText}`}
					</p>
				)}
			</Badge>
			{showDetail && expiryDate && (
				<p className="inline-block text-xs font-mono ms-2 text-[#8b949e]">
					{t(dateInfo.status, { time: dateInfo.time })}
				</p>
			)}
		</>
	);
};
