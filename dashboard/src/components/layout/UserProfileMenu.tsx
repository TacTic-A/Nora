import { Button } from "components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "components/ui/tooltip";
import { useDisclosure } from "hooks/useDisclosure";
import useGetUser from "hooks/useGetUser";
import { cn } from "lib/cn";
import { resolveAppLanguageCode } from "lib/language";
import {
	Check,
	ChevronsUpDown,
	CircleUser,
	Languages,
	LogOut,
} from "lucide-react";
import {
	type FC,
	type MouseEvent as ReactMouseEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import ReactCountryFlag from "react-country-flag";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { logout as logoutSession } from "service/auth";
import { AdminRole } from "types/Admin";
import { clearClientSession } from "utils/session";
import ImperialIranFlag from "../../assets/imperial-iran-flag.svg?react";
import { HeaderCalendar } from "../HeaderCalendar";
import {
	NotificationMenuItem,
	useNotificationCenter,
} from "../NotificationBell";
import ThemeSelector from "../ThemeSelector";

export interface UserProfileMenuProps {
	variant?: "header" | "sidebar";
	collapsed?: boolean;
	isMobile?: boolean;
	compact?: boolean;
}

export const UserProfileMenu: FC<UserProfileMenuProps> = ({
	variant = "header",
	collapsed = false,
	isMobile = false,
	compact = false,
}) => {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const isRTL = i18n.dir(i18n.language) === "rtl";
	const { unread } = useNotificationCenter();
	const { userData, getUserIsSuccess } = useGetUser();

	const userMenu = useDisclosure();
	const [activeProfileSubmenu, setActiveProfileSubmenu] = useState<
		"notifications" | "language" | "theme" | "calendar" | null
	>(null);
	const [pressingProfileSubmenu, setPressingProfileSubmenu] = useState<
		"notifications" | "language" | "theme" | "calendar" | null
	>(null);
	const profileSubmenuTimerRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (profileSubmenuTimerRef.current) {
				window.clearTimeout(profileSubmenuTimerRef.current);
			}
		};
	}, []);

	const closeUserMenu = useCallback(() => {
		userMenu.onClose();
		setActiveProfileSubmenu(null);
		setPressingProfileSubmenu(null);
	}, [userMenu]);

	const toggleProfileSubmenu = useCallback(
		(target: "notifications" | "language" | "theme" | "calendar") => {
			if (profileSubmenuTimerRef.current) {
				window.clearTimeout(profileSubmenuTimerRef.current);
				profileSubmenuTimerRef.current = null;
			}

			if (activeProfileSubmenu === target) {
				setActiveProfileSubmenu(null);
				setPressingProfileSubmenu(null);
				return;
			}

			setPressingProfileSubmenu(target);
			profileSubmenuTimerRef.current = window.setTimeout(() => {
				setPressingProfileSubmenu(null);
				setActiveProfileSubmenu(target);
			}, 90);
		},
		[activeProfileSubmenu],
	);

	const roleLabel = useMemo(() => {
		switch (userData.role) {
			case AdminRole.FullAccess:
				return t("admins.roles.fullAccess");
			case AdminRole.Sudo:
				return t("admins.roles.sudo");
			case AdminRole.Reseller:
				return t("admins.roles.reseller");
			default:
				return t("admins.roles.standard");
		}
	}, [t, userData.role]);

	const languageItems = [
		{ code: "en", label: "English", flag: "US" },
		{ code: "fa", label: "پارسی", flag: "IR" },
		{ code: "zh-cn", label: "中文", flag: "CN" },
		{ code: "ru", label: "Русский", flag: "RU" },
	];
	const activeLanguage = resolveAppLanguageCode(
		i18n.language || i18n.resolvedLanguage,
	);

	if (!getUserIsSuccess || !userData.username) {
		return null;
	}

	const isSidebar = variant === "sidebar";
	const isIconOnly = isSidebar ? collapsed : isMobile || compact;

	const triggerButton = isSidebar ? (
		collapsed ? (
			<Button
				type="button"
				data-header-profile="true"
				variant="outline"
				size="sm"
				aria-label={t("a11y.userMenu")}
				className="size-[34px] min-w-[34px]! rounded-[10px] border-[var(--nora-panel-border)] bg-[var(--nora-panel-elevated)]/60 p-0 text-[var(--nora-panel-text)] transition-colors hover:border-[var(--nora-panel-border-strong)] hover:bg-[var(--nora-panel-elevated)]"
			>
				<CircleUser className="size-4 text-[var(--nora-panel-text)]" strokeWidth={1.75} />
			</Button>
		) : (
			<button
				type="button"
				data-header-profile="true"
				aria-label={t("a11y.userMenu")}
				className="flex h-[44px] w-full cursor-pointer items-center justify-between gap-2.5 rounded-[12px] border border-[var(--nora-panel-border)] bg-[var(--nora-panel-elevated)]/55 px-2.5 text-start text-[var(--nora-panel-text)] transition-colors outline-none select-none hover:border-[var(--nora-panel-border-strong)] hover:bg-[var(--nora-panel-elevated)] active:scale-[0.98]"
			>
				<span className="flex min-w-0 items-center gap-2.5">
					<span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-[var(--nora-panel-border)] bg-[var(--nora-panel-surface)] text-[var(--nora-panel-text)]">
						<CircleUser className="size-4" strokeWidth={1.75} />
					</span>
					<span className="flex min-w-0 flex-col leading-tight">
						<span
							dir="ltr"
							style={{ unicodeBidi: "isolate" }}
							className="truncate text-xs font-bold text-[var(--nora-panel-text)]"
						>
							{userData.username}
						</span>
						<span className="truncate text-[10.5px] font-medium text-[var(--nora-panel-text-muted)]">
							{roleLabel}
						</span>
					</span>
				</span>
				<ChevronsUpDown className="size-3.5 shrink-0 text-[var(--nora-panel-text-muted)]" />
			</button>
		)
	) : (
		<Button
			type="button"
			data-header-profile="true"
			variant="outline"
			size="sm"
			title={isIconOnly ? userData.username : undefined}
			aria-label={t("a11y.userMenu")}
			className={cn(
				"h-[34px] border-[var(--nora-panel-border)] bg-[var(--nora-panel-surface)] text-[var(--nora-panel-text)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[var(--nora-panel-elevated)] hover:border-[var(--nora-panel-border-strong)] active:scale-[0.97] min-[769px]:hover:shadow-[0_4px_12px_rgba(0,0,0,0.24)]",
				isIconOnly
					? "w-[34px] min-w-[34px]! rounded-full px-0 min-[769px]:rounded-[12px]"
					: "w-auto min-w-0 rounded-[12px] px-3",
			)}
		>
			<span className="flex items-center justify-center gap-2">
				<span className="relative inline-flex shrink-0 items-center justify-center">
					<CircleUser
						className="size-4 text-[var(--nora-panel-text)]"
						strokeWidth={1.75}
					/>
					{isMobile && unread > 0 ? (
						<span className="absolute -top-0.5 -end-0.5 size-2 rounded-full border-[1.5px] border-[var(--nora-panel-surface)] bg-[var(--nora-panel-accent)]" />
					) : null}
				</span>
				{!isIconOnly ? (
					<span
						dir="ltr"
						style={{ unicodeBidi: "isolate" }}
						className="max-w-[140px] truncate text-xs font-semibold leading-normal text-[var(--nora-panel-text)]"
					>
						{userData.username}
					</span>
				) : null}
			</span>
		</Button>
	);

	return (
		<Popover
			open={userMenu.isOpen}
			onOpenChange={(open) => {
				if (open) userMenu.onOpen();
				else closeUserMenu();
			}}
		>
			{isSidebar && collapsed ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
					</TooltipTrigger>
					<TooltipContent
						side={isRTL ? "left" : "right"}
						sideOffset={10}
						className="z-[2200] rounded-[10px] border border-[var(--nora-panel-border)] bg-[var(--nora-panel-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--nora-panel-text)] shadow-lg"
					>
						{userData.username} · {roleLabel}
					</TooltipContent>
				</Tooltip>
			) : (
				<PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
			)}
			<PopoverContent
				dir={isRTL ? "rtl" : "ltr"}
				side={isSidebar ? (isRTL ? "left" : "right") : "bottom"}
				align={isSidebar ? "end" : isRTL ? "start" : "end"}
				sideOffset={isSidebar ? 10 : 8}
				collisionPadding={12}
				id="rb-user-menu"
				data-profile-window="true"
				data-profile-menu="true"
				onOpenAutoFocus={(e) => e.preventDefault()}
				className="z-[9999] w-[240px] min-w-[240px]! max-w-[240px] max-h-[min(calc(var(--radix-popover-content-available-height,76dvh)-8px),calc(100dvh-24px))] overflow-y-auto overscroll-contain rounded-[20px] border border-[var(--nora-panel-border)] bg-[var(--nora-panel-surface)] p-2 text-[var(--nora-panel-text)] shadow-[0_20px_48px_rgba(0,0,0,0.5)] select-none"
			>
				<div
					dir={isRTL ? "rtl" : "ltr"}
					className="mb-1.5 flex w-full items-center justify-start gap-3 rounded-[14px] border border-[var(--nora-panel-border)] bg-[var(--nora-panel-elevated)] p-2.5 text-start"
				>
					<div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-[var(--nora-panel-border)] bg-[var(--nora-panel-surface)] text-[var(--nora-panel-text)]">
						<CircleUser className="size-4" strokeWidth={1.75} />
					</div>
					<div className="flex min-w-0 flex-1 flex-col items-start text-start">
						<span
							dir="ltr"
							style={{ unicodeBidi: "isolate" }}
							className="max-w-full truncate text-[13px] font-bold text-[var(--nora-panel-text)]"
						>
							{userData.username}
						</span>
						<span className="max-w-full truncate text-[11px] font-medium text-[var(--nora-panel-text-muted)]">
							{roleLabel}
						</span>
					</div>
				</div>

				<div className="flex flex-col gap-0.5">
					{isMobile ? (
						<NotificationMenuItem
							key={`notif-menu-${isRTL ? "rtl" : "ltr"}`}
							onNavigate={closeUserMenu}
							isOpen={activeProfileSubmenu === "notifications"}
							isPressing={pressingProfileSubmenu === "notifications"}
							onToggle={() => toggleProfileSubmenu("notifications")}
							onClose={() => {
								if (activeProfileSubmenu === "notifications") {
									setActiveProfileSubmenu(null);
								}
							}}
						/>
					) : null}

					{isMobile ? (
						<HeaderCalendar
							key={`cal-menu-${isRTL ? "rtl" : "ltr"}`}
							inMenu
							isOpen={activeProfileSubmenu === "calendar"}
							isPressing={pressingProfileSubmenu === "calendar"}
							onToggle={() => toggleProfileSubmenu("calendar")}
							onClose={() => {
								if (activeProfileSubmenu === "calendar") {
									setActiveProfileSubmenu(null);
								}
							}}
						/>
					) : null}

					<Popover
						open={activeProfileSubmenu === "language"}
						onOpenChange={(open) => {
							if (open) {
								setActiveProfileSubmenu("language");
							} else if (activeProfileSubmenu === "language") {
								setActiveProfileSubmenu(null);
							}
						}}
					>
						<PopoverTrigger asChild>
							<button
								type="button"
								data-submenu-trigger="true"
								onClick={(event: ReactMouseEvent) => {
									event.stopPropagation();
									toggleProfileSubmenu("language");
								}}
								className={cn(
									"flex h-[38px] w-full items-center justify-between gap-2.5 rounded-[12px] px-3 text-[13px] font-medium text-[var(--nora-panel-text)] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none select-none active:scale-[0.97] active:bg-[var(--nora-panel-elevated)] focus-visible:bg-[var(--nora-panel-elevated)] min-[769px]:hover:bg-[var(--nora-panel-elevated)]",
									pressingProfileSubmenu === "language" ||
										activeProfileSubmenu === "language"
										? "bg-[var(--nora-panel-elevated)]"
										: "bg-transparent",
									pressingProfileSubmenu === "language" && "scale-[0.97]",
								)}
							>
								<span className="flex min-w-0 items-center gap-2.5">
									<Languages
										className="size-4 shrink-0 text-[var(--nora-panel-text)]"
										strokeWidth={1.75}
									/>
									<span className="truncate">{t("header.language")}</span>
								</span>
								<span className="shrink-0 text-[11px] font-semibold text-[var(--nora-panel-text-muted)]">
									{languageItems.find((item) => item.code === activeLanguage)
										?.label || "English"}
								</span>
							</button>
						</PopoverTrigger>
						<PopoverContent
							dir={isRTL ? "rtl" : "ltr"}
							side={isMobile ? "bottom" : isRTL ? "left" : "right"}
							align={isMobile ? "center" : "end"}
							sideOffset={8}
							collisionPadding={12}
							data-profile-window="true"
							data-profile-submenu="true"
							data-language-menu-list="true"
							className="z-[10005] w-[min(220px,calc(100vw-24px))] min-w-[176px]! max-h-[min(calc(var(--radix-popover-content-available-height,72dvh)-8px),calc(100dvh-24px))] overflow-y-auto overscroll-contain rounded-[20px] border border-[var(--nora-panel-border)] bg-[var(--nora-panel-surface)] p-1.5 text-[var(--nora-panel-text)] shadow-[0_20px_48px_rgba(0,0,0,0.5)] select-none"
						>
							<div className="flex flex-col gap-0.5">
								{languageItems.map(({ code, label, flag }) => {
									const isActiveLang = activeLanguage === code;
									return (
										<button
											key={code}
											type="button"
											onClick={(e) => {
												e.preventDefault();
												e.stopPropagation();
												i18n.changeLanguage(code);
												setActiveProfileSubmenu(null);
											}}
											className={cn(
												"flex h-9 w-full items-center justify-between gap-3 rounded-[10px] px-2.5 text-xs transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none active:scale-[0.98] focus-visible:bg-[var(--nora-panel-elevated)] min-[769px]:hover:bg-[var(--nora-panel-elevated)]",
												isActiveLang
													? "bg-[var(--nora-panel-elevated)] font-bold text-[var(--nora-panel-accent)]"
													: "font-medium text-[var(--nora-panel-text-secondary)] min-[769px]:hover:text-[var(--nora-panel-text)]",
											)}
										>
											<span className="flex items-center gap-2.5">
												{code === "fa" ? (
													<ImperialIranFlag
														style={{
															width: "16px",
															height: "12px",
															borderRadius: "2px",
														}}
													/>
												) : (
													<ReactCountryFlag
														countryCode={flag}
														svg
														style={{
															width: "16px",
															height: "12px",
															borderRadius: "2px",
														}}
													/>
												)}
												<span>{label}</span>
											</span>
											{isActiveLang ? (
												<Check className="size-3.5 text-[var(--nora-panel-accent)]" />
											) : null}
										</button>
									);
								})}
							</div>
						</PopoverContent>
					</Popover>

					<ThemeSelector
						key={`theme-menu-${isRTL ? "rtl" : "ltr"}`}
						trigger="menuItem"
						triggerLabel={t("header.theme")}
						isOpen={activeProfileSubmenu === "theme"}
						isPressing={pressingProfileSubmenu === "theme"}
						onToggle={() => toggleProfileSubmenu("theme")}
						onClose={() => {
							if (activeProfileSubmenu === "theme") {
								setActiveProfileSubmenu(null);
							}
						}}
					/>

					<div className="my-1 h-px bg-[var(--nora-panel-border)]" />

					<button
						type="button"
						onClick={async () => {
							try {
								await logoutSession();
							} finally {
								clearClientSession();
								navigate("/login");
							}
						}}
						className="flex h-[38px] w-full items-center gap-2.5 rounded-[12px] px-3 text-[13px] font-semibold text-red-400 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none select-none active:scale-[0.98] active:bg-red-500/20 focus-visible:bg-red-500/15 min-[769px]:hover:bg-red-500/15"
					>
						<LogOut className="size-4 shrink-0" />
						<span>{t("header.logout")}</span>
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
};
