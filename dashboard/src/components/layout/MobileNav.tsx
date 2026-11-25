import { Button } from "components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "components/ui/sheet";
import { motion, useReducedMotion } from "framer-motion";
import { useDisclosure } from "hooks/useDisclosure";
import useGetUser from "hooks/useGetUser";
import { cn } from "lib/cn";
import {
	Bell,
	BellRing,
	Briefcase,
	ChevronDown,
	CircleUser,
	House,
	LogOut,
	Settings,
	Share,
	Users,
} from "lucide-react";
import {
	type ElementType,
	type FC,
	type PointerEvent as ReactPointerEvent,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { logout as logoutSession } from "service/auth";
import type { SponsorAsset } from "service/sponsors";
import { AdminSection } from "types/Admin";
import { clearClientSession } from "utils/session";
import { useUnreadNotifications } from "../NotificationBell";
import { AppSidebar } from "./AppSidebar";
import {
	DEFAULT_TAB_BY_PATH,
	type DirectNavItem,
	filterNavSectionsExcluding,
	type GroupSubItem,
	useNavSections,
} from "./navConfig";
import { MobileDockSkeletonContent } from "./ShellSkeletons";

const TAB_ICONS: Record<string, ElementType> = {
	dashboard: House,
	users: Users,
	admins: Briefcase,
	settings: Settings,
	myaccount: CircleUser,
	notifications: Bell,
};

const DOCK_CYAN_TINT =
	"bg-gradient-to-r from-[var(--nora-panel-accent)]/20 via-[var(--nora-panel-accent)]/15 to-[var(--nora-panel-accent)]/20 border border-[var(--nora-panel-accent)]/40 text-[var(--nora-panel-accent)] shadow-[0_0_12px_color-mix(in_srgb,var(--nora-panel-accent)_25%,transparent)]";

const DOCK_SURFACE_CLASS =
	"border border-[var(--nora-panel-border)] bg-[var(--nora-panel-surface)]/95 backdrop-blur-md shadow-[0_12px_32px_rgba(0,0,0,0.55)]";

type BottomNavItem = {
	key: string;
	label: string;
	to?: string;
	kind?: "menu" | "link";
};

export interface MobileNavProps {
	isDrawerOpen: boolean;
	onCloseDrawer: () => void;
	sponsors?: SponsorAsset[];
	sidebarBanners?: SponsorAsset[];
	isShellLoading?: boolean;
}

export const MobileNav: FC<MobileNavProps> = memo(function MobileNav({
	isDrawerOpen,
	onCloseDrawer,
	sponsors = [],
	sidebarBanners = [],
	isShellLoading = false,
}) {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const location = useLocation();
	const isRTL = i18n.dir(i18n.language) === "rtl";
	const unread = useUnreadNotifications();
	const { userData } = useGetUser();
	const { navSections } = useNavSections();
	const sectionAccess = userData.permissions?.sections;

	const accountMenu = useDisclosure();
	const settingsMenu = useDisclosure();
	const dockSettingsScrollRef = useRef<HTMLDivElement | null>(null);

	const [showIosPrompt, setShowIosPrompt] = useState(false);
	const [openDockGroups, setOpenDockGroups] = useState<Record<string, boolean>>({
		users_hub: true,
	});

	const canSeeAdmins = Boolean(sectionAccess?.[AdminSection.Admins]);
	const includeNotificationsInDock = !canSeeAdmins;

	const dockExcludedRoutes = useMemo(() => {
		const routes = new Set<string>(["/", "/users", "/myaccount"]);
		if (canSeeAdmins) routes.add("/admins");
		if (includeNotificationsInDock) routes.add("/notifications");
		return routes;
	}, [canSeeAdmins, includeNotificationsInDock]);

	const dockSettingsSections = useMemo(
		() => filterNavSectionsExcluding(navSections, dockExcludedRoutes),
		[navSections, dockExcludedRoutes],
	);

	const flatDockSettingsItems = useMemo(() => {
		const items: Array<DirectNavItem | GroupSubItem> = [];
		for (const section of dockSettingsSections) {
			for (const item of section.items) {
				if (!item.visible) continue;
				if (item.type === "direct") {
					items.push(item);
				} else {
					for (const sub of item.subItems) {
						if (sub.visible) items.push(sub);
					}
				}
			}
		}
		return items;
	}, [dockSettingsSections]);

	const hasSettingsMenu = flatDockSettingsItems.length > 0;

	useEffect(() => {
		const ua = window.navigator.userAgent || "";
		const isIOS = /iphone|ipad|ipod/i.test(ua);
		const isStandalone =
			"standalone" in window.navigator
				? Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
				: window.matchMedia("(display-mode: standalone)").matches;
		const hasShown = localStorage.getItem("ios-pwa-tip-shown") === "1";
		if (isIOS && !isStandalone && !hasShown) {
			setShowIosPrompt(true);
			localStorage.setItem("ios-pwa-tip-shown", "1");
		}
	}, []);

	const bottomNavItems = useMemo<BottomNavItem[]>(() => {
		const items: BottomNavItem[] = [
			{ key: "users", label: t("users"), to: "/users" },
		];
		if (canSeeAdmins) {
			items.push({ key: "admins", label: t("admins"), to: "/admins" });
		}
		if (includeNotificationsInDock) {
			items.push({
				key: "notifications",
				label: t("notifications.menu"),
				to: "/notifications",
			});
		}
		items.push({
			key: "myaccount",
			label: t("myaccount.menu"),
			to: "/myaccount",
		});
		if (hasSettingsMenu) {
			items.push({ key: "settings", label: t("header.settings"), kind: "menu" });
		}
		items.splice(Math.floor((items.length + 1) / 2), 0, {
			key: "dashboard",
			label: t("dashboard"),
			to: "/",
		});
		return items;
	}, [t, canSeeAdmins, includeNotificationsInDock, hasSettingsMenu]);

	const isDockItemActive = useCallback(
		(url: string) =>
			location.pathname === url ||
			(url !== "/" && location.pathname.startsWith(url)),
		[location.pathname],
	);

	const activeSettingsItem = useMemo(
		() => flatDockSettingsItems.find((item) => isDockItemActive(item.url)),
		[flatDockSettingsItems, isDockItemActive],
	);
	const isSettingsRoute = Boolean(activeSettingsItem);
	const activeSettingsId = activeSettingsItem?.id ?? null;

	const resolveActive = useCallback(
		(item: BottomNavItem) => {
			if (item.key === "settings") return isSettingsRoute;
			if (!item.to) return false;
			if (item.to === "/") return location.pathname === "/";
			return location.pathname.startsWith(item.to);
		},
		[isSettingsRoute, location.pathname],
	);

	const activeTabKey = useMemo(() => {
		const activeItem = bottomNavItems.find((item) => resolveActive(item));
		return activeItem?.key ?? null;
	}, [bottomNavItems, resolveActive]);

	const [previewTabKey, setPreviewTabKey] = useState<string | null>(null);
	const previewTabKeyRef = useRef<string | null>(null);
	const [pendingTabKey, setPendingTabKey] = useState<string | null>(null);
	const selectedTabKey = previewTabKey ?? pendingTabKey ?? activeTabKey;

	useEffect(() => {
		setPendingTabKey((pending) => (pending === activeTabKey ? null : pending));
	}, [activeTabKey]);

	const setPreviewTabKeySafe = (value: string | null) => {
		previewTabKeyRef.current = value;
		setPreviewTabKey(value);
	};

	const accountHoldTimeout = useRef<number | null>(null);
	const accountHoldOpened = useRef(false);
	const accountHoldStartPoint = useRef<{ x: number; y: number } | null>(null);
	const settingsHoldTimeout = useRef<number | null>(null);
	const settingsHoldOpened = useRef(false);
	const settingsHoldStartPoint = useRef<{ x: number; y: number } | null>(null);
	const tabContentRefs = useRef<Record<string, HTMLButtonElement | null>>({});
	const navDragRef = useRef<{
		active: boolean;
		moved: boolean;
		startX: number;
		startY: number;
		pointerId: number | null;
	}>({
		active: false,
		moved: false,
		startX: 0,
		startY: 0,
		pointerId: null,
	});
	const navMoveRaf = useRef<number | null>(null);
	const navMovePoint = useRef<{ x: number; y: number } | null>(null);
	const suppressNavClickUntil = useRef(0);
	const [isNavDragging, setIsNavDragging] = useState(false);

	const reduceMotion = useReducedMotion();
	const navSpring = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.8 };
	const tapSpring = reduceMotion
		? { duration: 0 }
		: { type: "spring" as const, stiffness: 520, damping: 32, mass: 0.6 };

	const navKeyAtPoint = (clientX: number, clientY: number) => {
		for (const item of bottomNavItems) {
			const node = tabContentRefs.current[item.key];
			if (!node) continue;
			const rect = node.getBoundingClientRect();
			if (
				clientX >= rect.left &&
				clientX <= rect.right &&
				clientY >= rect.top &&
				clientY <= rect.bottom
			) {
				return item.key;
			}
		}
		return null;
	};

	const handleNavPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		const key = navKeyAtPoint(event.clientX, event.clientY);
		if (!key) return;
		const target = bottomNavItems.find((item) => item.key === key);
		if (target?.kind === "menu") return;
		navDragRef.current.active = true;
		navDragRef.current.moved = false;
		navDragRef.current.startX = event.clientX;
		navDragRef.current.startY = event.clientY;
		navDragRef.current.pointerId = event.pointerId;
		setPreviewTabKeySafe(key);
	};

	const handleNavPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!navDragRef.current.active) return;
		navMovePoint.current = { x: event.clientX, y: event.clientY };
		if (navMoveRaf.current) return;
		navMoveRaf.current = window.requestAnimationFrame(() => {
			navMoveRaf.current = null;
			const point = navMovePoint.current;
			if (!point) return;
			const dx = point.x - navDragRef.current.startX;
			const dy = point.y - navDragRef.current.startY;
			if (!navDragRef.current.moved && Math.hypot(dx, dy) < 6) {
				return;
			}
			if (!navDragRef.current.moved) {
				navDragRef.current.moved = true;
				setIsNavDragging(true);
			}
			const key = navKeyAtPoint(point.x, point.y);
			if (key && key !== previewTabKeyRef.current) {
				setPreviewTabKeySafe(key);
			}
		});
	};

	const resetNavDrag = () => {
		navDragRef.current.active = false;
		navDragRef.current.moved = false;
		navDragRef.current.pointerId = null;
	};

	const clearAccountHoldTimer = () => {
		if (accountHoldTimeout.current) {
			window.clearTimeout(accountHoldTimeout.current);
			accountHoldTimeout.current = null;
		}
	};

	const handleAccountHoldStart = () => {
		clearAccountHoldTimer();
		accountHoldOpened.current = false;
		accountHoldTimeout.current = window.setTimeout(() => {
			accountHoldOpened.current = true;
			handleSettingsMenuClose();
			accountMenu.onOpen();
		}, 560);
	};

	const handleAccountHoldEnd = () => {
		clearAccountHoldTimer();
		accountHoldStartPoint.current = null;
	};

	const handleAccountHoldMove = (clientX: number, clientY: number) => {
		const start = accountHoldStartPoint.current;
		if (!start || accountHoldOpened.current) return;
		const dx = clientX - start.x;
		const dy = clientY - start.y;
		if (Math.hypot(dx, dy) > 12) {
			clearAccountHoldTimer();
		}
	};

	const handleAccountMenuClose = () => {
		accountHoldOpened.current = false;
		accountMenu.onClose();
	};

	const clearSettingsHoldTimer = () => {
		if (settingsHoldTimeout.current) {
			window.clearTimeout(settingsHoldTimeout.current);
			settingsHoldTimeout.current = null;
		}
	};

	const openSettingsMenu = () => {
		accountMenu.onClose();
		const path = location.pathname;
		const matchingGroupIds: string[] = [];
		for (const section of dockSettingsSections) {
			for (const item of section.items) {
				if (
					item.type === "group" &&
					item.subItems.some(
						(sub) =>
							sub.visible &&
							(path === sub.url ||
								(sub.url !== "/" && path.startsWith(sub.url))),
					)
				) {
					matchingGroupIds.push(item.id);
				}
			}
		}
		if (matchingGroupIds.length > 0) {
			setOpenDockGroups((prev) => {
				const next = { ...prev };
				let changed = false;
				for (const id of matchingGroupIds) {
					if (!next[id]) {
						next[id] = true;
						changed = true;
					}
				}
				return changed ? next : prev;
			});
		}
		settingsMenu.onOpen();
		setPreviewTabKeySafe("settings");
	};

	const handleSettingsHoldStart = () => {
		clearSettingsHoldTimer();
		settingsHoldOpened.current = false;
		settingsHoldTimeout.current = window.setTimeout(() => {
			settingsHoldOpened.current = true;
			openSettingsMenu();
		}, 560);
	};

	const handleSettingsHoldEnd = () => {
		clearSettingsHoldTimer();
		settingsHoldStartPoint.current = null;
	};

	const handleSettingsHoldMove = (clientX: number, clientY: number) => {
		const start = settingsHoldStartPoint.current;
		if (!start || settingsHoldOpened.current) return;
		const dx = clientX - start.x;
		const dy = clientY - start.y;
		if (Math.hypot(dx, dy) > 12) {
			clearSettingsHoldTimer();
		}
	};

	const handleSettingsMenuClose = () => {
		settingsHoldOpened.current = false;
		settingsMenu.onClose();
		if (previewTabKeyRef.current === "settings") {
			setPreviewTabKeySafe(null);
		}
	};

	const handleSettingsMenuToggle = () => {
		if (Date.now() < suppressNavClickUntil.current) return;
		if (settingsMenu.isOpen) {
			handleSettingsMenuClose();
			return;
		}
		openSettingsMenu();
	};

	const finalizeNavDrag = () => {
		if (!navDragRef.current.active) return;
		const key = previewTabKeyRef.current;
		const moved = navDragRef.current.moved;
		resetNavDrag();
		if (navMoveRaf.current) {
			window.cancelAnimationFrame(navMoveRaf.current);
			navMoveRaf.current = null;
		}
		setIsNavDragging(false);
		setPreviewTabKeySafe(null);
		if (!moved) {
			const target = bottomNavItems.find((item) => item.key === key);
			if (
				key &&
				key !== activeTabKey &&
				target?.to &&
				!accountHoldOpened.current
			) {
				setPendingTabKey(key);
				navigate(target.to);
			}
			return;
		}
		suppressNavClickUntil.current = Date.now() + 400;
		if (!key) return;
		const target = bottomNavItems.find((item) => item.key === key);
		if (!target) return;
		if (target.key === "settings") {
			openSettingsMenu();
			return;
		}
		if (key !== activeTabKey && target.to) {
			setPendingTabKey(key);
			navigate(target.to);
		}
	};

	const handleNavPointerUp = () => {
		finalizeNavDrag();
	};

	const handleNavPointerCancel = () => {
		if (!navDragRef.current.active) return;
		resetNavDrag();
		if (navMoveRaf.current) {
			window.cancelAnimationFrame(navMoveRaf.current);
			navMoveRaf.current = null;
		}
		setIsNavDragging(false);
		setPreviewTabKeySafe(null);
	};

	const handleNavClick = (to?: string) => {
		if (!to) return;
		if (Date.now() < suppressNavClickUntil.current) return;
		if (navDragRef.current.active || isNavDragging) return;
		handleSettingsMenuClose();
		handleAccountMenuClose();
		if (to !== location.pathname) navigate(to);
	};

	const navigateToSettingsItem = (target: string) => {
		handleSettingsMenuClose();
		setPreviewTabKeySafe("settings");
		const defaultTab = DEFAULT_TAB_BY_PATH[target];
		if (defaultTab) {
			navigate(`${target}#${defaultTab}`);
			return;
		}
		navigate(target);
	};

	return (
		<>
			{/* Slide-in Mobile Navigation Drawer */}
			<Sheet
				open={isDrawerOpen}
				onOpenChange={(open) => {
					if (!open) onCloseDrawer();
				}}
			>
				<SheetContent
					side={isRTL ? "right" : "left"}
					dir={isRTL ? "rtl" : "ltr"}
					showCloseButton={false}
					data-side={isRTL ? "right" : "left"}
					className={cn(
						"rb-sidebar-drawer h-[100dvh] max-h-[100dvh] w-[min(320px,86vw)]! max-w-[min(320px,86vw)]! gap-0 bg-[var(--nora-panel-sidebar)] p-0 shadow-[0_24px_64px_rgba(0,0,0,0.55)] will-change-transform border-[var(--nora-panel-border)]",
						isRTL
							? "rounded-s-[24px] border-s border-e-0"
							: "rounded-e-[24px] border-e border-s-0",
					)}
				>
					<SheetTitle className="sr-only">
						{t("a11y.toggleSidebar")}
					</SheetTitle>
					<div className="h-full overflow-hidden">
						<AppSidebar
							collapsed={false}
							sponsors={sponsors}
							sidebarBanners={sidebarBanners}
							inDrawer
							onRequestExpand={onCloseDrawer}
						/>
					</div>
				</SheetContent>
			</Sheet>

			{/* iOS PWA Add-To-Home Prompt */}
			{showIosPrompt ? (
				<div className="fixed inset-x-0 bottom-[86px] z-[2000] px-4 sm:bottom-[90px]">
					<div className="flex items-center gap-3 rounded-[20px] border border-[var(--nora-panel-border)] bg-[var(--nora-panel-surface)] px-4 py-3 shadow-lg">
						<span className="flex size-8 items-center justify-center rounded-full bg-[var(--nora-panel-elevated)] text-[var(--nora-panel-text)]">
							<Share className="size-4" />
						</span>
						<div className="flex-1">
							<p className="text-sm font-semibold text-[var(--nora-panel-text)]">
								{t("pwa.ios.title")}
							</p>
							<p className="text-xs text-[var(--nora-panel-text-muted)]">
								{t("pwa.ios.body")}
							</p>
						</div>
						<Button
							onClick={() => {
								setShowIosPrompt(false);
								localStorage.setItem("ios-pwa-tip-shown", "1");
							}}
							variant="ghost"
							size="xs"
							className="min-h-9 rounded-[10px] px-3 text-sm text-slate-300 hover:bg-transparent active:scale-[0.96]"
						>
							{t("pwa.ios.dismiss")}
						</Button>
					</div>
				</div>
			) : null}

			{/* Mobile Bottom Navigation Dock */}
			<div className="rb-mobile-dock pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] z-[1500] px-3 min-[769px]:hidden">
				<div
					className={cn(
						"pointer-events-auto mx-auto max-w-[min(440px,calc(100vw-20px))] rounded-[24px] border px-2 py-1.5",
						DOCK_SURFACE_CLASS,
						isShellLoading && "rb-skeleton-sweep",
					)}
				>
					{isShellLoading ? (
						<MobileDockSkeletonContent count={bottomNavItems.length} />
					) : (
						<div
							className="relative flex items-center justify-between"
							dir={isRTL ? "rtl" : "ltr"}
							onPointerDown={handleNavPointerDown}
							onPointerMove={handleNavPointerMove}
							onPointerUp={handleNavPointerUp}
							onPointerCancel={handleNavPointerCancel}
							style={{ touchAction: "pan-y" }}
						>
							{bottomNavItems.map((item) => {
								const isActive = resolveActive(item);
								const isSelected = selectedTabKey === item.key;
								const settingsLabel =
									item.key === "settings" && activeSettingsItem?.title
										? activeSettingsItem.title
										: item.label;
								const customIcon =
									item.key === "settings"
										? activeSettingsItem?.icon
										: undefined;
								const TabIcon = customIcon ?? TAB_ICONS[item.key] ?? CircleUser;

								const tabButtonClass = cn(
									"relative z-[1] h-auto min-h-12 min-w-0 flex-1 select-none rounded-[16px] px-0 hover:bg-transparent focus:bg-transparent active:bg-transparent",
									isActive
										? "text-[var(--nora-panel-accent)]"
										: "text-slate-400",
								);

								const navContent = (
									<motion.div
										whileTap={reduceMotion ? undefined : { scale: 0.9 }}
										transition={tapSpring}
										className="w-full"
									>
										<div className="flex w-full flex-col items-center gap-0.5 py-1">
											<div className="relative grid h-7 w-12 place-items-center">
												{isSelected ? (
													<motion.span
														layoutId="mobile-bottom-nav-indicator"
														transition={navSpring}
														className={cn(
															"absolute inset-0 rounded-[14px]",
															DOCK_CYAN_TINT,
														)}
													/>
												) : null}
												<TabIcon
													className={cn(
														"relative z-[1] size-5 transition-colors duration-200",
														isSelected
															? "text-[var(--nora-panel-accent)] drop-shadow-[0_0_6px_color-mix(in_srgb,var(--nora-panel-accent)_50%,transparent)]"
															: "text-slate-400",
													)}
													strokeWidth={1.75}
												/>
												{item.key === "notifications" && unread > 0 ? (
													<span className="absolute top-0.5 end-2 z-[2] size-2 rounded-full border border-[var(--nora-panel-surface)] bg-[var(--nora-panel-accent)]" />
												) : null}
											</div>
											<span
												className={cn(
													"max-w-full truncate px-1 text-center text-[10px] leading-[1.1] transition-colors duration-200",
													isSelected
														? "font-bold text-[var(--nora-panel-accent)]"
														: "font-medium text-slate-400",
												)}
											>
												{settingsLabel}
											</span>
										</div>
									</motion.div>
								);

								if (item.key === "settings") {
									return (
										<Popover
											key={item.key}
											open={settingsMenu.isOpen}
											onOpenChange={(open) => {
												if (open) openSettingsMenu();
												else handleSettingsMenuClose();
											}}
										>
											<PopoverTrigger asChild>
												<Button
													ref={(node) => {
														tabContentRefs.current[item.key] = node;
													}}
													onClick={(event) => {
														event.preventDefault();
														if (settingsHoldOpened.current) return;
														handleSettingsMenuToggle();
													}}
													onPointerDown={(event) => {
														if (event.pointerType === "mouse") return;
														settingsHoldStartPoint.current = {
															x: event.clientX,
															y: event.clientY,
														};
														handleSettingsHoldStart();
													}}
													onPointerMove={(event) => {
														if (event.pointerType === "mouse") return;
														handleSettingsHoldMove(
															event.clientX,
															event.clientY,
														);
													}}
													onPointerUp={handleSettingsHoldEnd}
													onPointerCancel={handleSettingsHoldEnd}
													onPointerLeave={handleSettingsHoldEnd}
													onContextMenu={(event) => {
														event.preventDefault();
													}}
													variant="ghost"
													size="sm"
													className={tabButtonClass}
												>
													{navContent}
												</Button>
											</PopoverTrigger>
											<PopoverContent
												data-dock-settings-popover="true"
												dir={isRTL ? "rtl" : "ltr"}
												side="top"
												align="center"
												sideOffset={12}
												collisionPadding={12}
												className="pointer-events-none z-[1600] flex h-[min(calc(var(--radix-popover-content-available-height,calc(100dvh-116px))-6px),calc(100dvh-116px))] w-[min(272px,calc(100vw-24px))] max-w-[calc(100vw-24px)] origin-bottom flex-col justify-end overflow-visible! border-0! bg-transparent! p-0! shadow-none! data-[state=open]:animate-rb-dock-in data-[state=closed]:animate-rb-dock-out"
											>
												<div
													ref={dockSettingsScrollRef}
													className={cn(
														"relative pointer-events-auto max-h-full w-full origin-bottom overflow-y-auto overscroll-contain rounded-[22px] border p-2.5 text-[#f0f6fc]",
														DOCK_SURFACE_CLASS,
													)}
												>
													<div className="flex flex-col gap-3.5">
														{dockSettingsSections.map((section) => (
															<div
																key={section.id}
																data-dock-section={section.id}
																className="flex flex-col gap-0.5"
															>
																<span className="flex items-center px-2.5 pb-1 text-[10.5px] font-bold tracking-[0.08em] uppercase text-slate-400">
																	<span className="inline-block h-2 w-[3px] rounded-[1px] bg-cyan-400 me-1.5" />
																	{section.title}
																</span>

																<div className="flex flex-col gap-0.5">
																	{section.items.map((navEntry) => {
																		if (navEntry.type === "direct") {
																			const EntryIcon = navEntry.icon;
																			const entrySelected =
																				activeSettingsId === navEntry.id;
																			const isNotifEntry =
																				navEntry.url === "/notifications";
																			const showBadge =
																				Boolean(navEntry.badge) ||
																				(isNotifEntry && unread > 0);

																			return (
																				<button
																					key={navEntry.id}
																					type="button"
																					aria-current={
																						entrySelected
																							? "page"
																							: undefined
																					}
																					onClick={() =>
																						navigateToSettingsItem(
																							navEntry.url,
																						)
																					}
																					className={cn(
																						"relative flex min-h-[38px] w-full items-center gap-2.5 overflow-hidden rounded-[12px] px-2.5 text-start text-[13px] transition-[background-color,color,transform] duration-150 outline-none select-none active:scale-[0.98] active:bg-[#21262d]",
																						entrySelected
																							? isRTL
																								? "bg-gradient-to-l from-[var(--nora-panel-accent)]/15 via-[var(--nora-panel-accent)]/8 to-transparent font-bold text-[var(--nora-panel-accent)] border-s-[3px] border-[var(--nora-panel-accent)] shadow-[0_0_8px_color-mix(in_srgb,var(--nora-panel-accent)_12%,transparent)]"
																								: "bg-gradient-to-r from-[var(--nora-panel-accent)]/15 via-[var(--nora-panel-accent)]/8 to-transparent font-bold text-[var(--nora-panel-accent)] border-s-[3px] border-[var(--nora-panel-accent)] shadow-[0_0_8px_color-mix(in_srgb,var(--nora-panel-accent)_12%,transparent)]"
																							: "bg-transparent font-medium text-slate-400",
																					)}
																				>
																					<EntryIcon className={cn("size-[18px] shrink-0", entrySelected ? "text-[var(--nora-panel-accent)]" : "text-slate-400")} />
																					<span className="min-w-0 flex-1 truncate">
																						{navEntry.title}
																					</span>
																					{isNotifEntry && unread > 0 ? (
																						<span
																							dir="ltr"
																							className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--nora-panel-accent)] px-1.5 text-[10px] font-bold text-slate-950 tabular-nums [unicode-bidi:isolate]"
																						>
																							{unread > 99 ? "99+" : unread}
																						</span>
																					) : showBadge ? (
																						<span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[var(--nora-panel-accent)] text-slate-950 font-bold">
																							<BellRing className="size-2.5" />
																						</span>
																					) : null}
																				</button>
																			);
																		}

																		const isGroupActive =
																			navEntry.subItems.some((sub) =>
																				isDockItemActive(sub.url),
																			);
																		const isGroupOpen = Boolean(
																			openDockGroups[navEntry.id],
																		);
																		const GroupIcon = navEntry.icon;

																		return (
																			<div
																				key={navEntry.id}
																				data-dock-group={navEntry.id}
																				data-dock-group-active={
																					isGroupActive ? "true" : undefined
																				}
																			>
																				<button
																					type="button"
																					aria-expanded={isGroupOpen}
																					onClick={(e) => {
																						const willOpen = !isGroupOpen;
																						const groupEl = e.currentTarget.closest(
																							"[data-dock-group]",
																						) as HTMLElement | null;
																						setOpenDockGroups((prev) => ({
																							...prev,
																							[navEntry.id]: willOpen,
																						}));
																						if (willOpen && groupEl) {
																							window.setTimeout(() => {
																								groupEl.scrollIntoView({
																									block: "nearest",
																									behavior: "smooth",
																								});
																							}, 220);
																						}
																					}}
																					className={cn(
																						"relative flex min-h-[38px] w-full items-center justify-between gap-2.5 overflow-hidden rounded-[12px] px-2.5 text-start text-[13px] transition-[background-color,color,transform] duration-150 outline-none select-none active:scale-[0.98] active:bg-[#21262d]",
																						isGroupActive && !isGroupOpen
																							? isRTL
																								? "bg-gradient-to-l from-[var(--nora-panel-accent)]/15 via-[var(--nora-panel-accent)]/8 to-transparent font-bold text-[var(--nora-panel-accent)] border-s-[3px] border-[var(--nora-panel-accent)]"
																								: "bg-gradient-to-r from-[var(--nora-panel-accent)]/15 via-[var(--nora-panel-accent)]/8 to-transparent font-bold text-[var(--nora-panel-accent)] border-s-[3px] border-[var(--nora-panel-accent)]"
																							: isGroupActive
																								? "bg-transparent font-bold text-[#f0f6fc]"
																								: "bg-transparent font-medium text-slate-400",
																					)}
																				>
																					<span className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
																						<GroupIcon
																							className={cn(
																								"size-[18px] shrink-0",
																								isGroupActive &&
																									"text-[var(--nora-panel-accent)]",
																							)}
																						/>
																						<span className="truncate">
																							{navEntry.title}
																						</span>
																					</span>

																					<ChevronDown
																						className={cn(
																							"size-3.5 shrink-0 text-slate-400 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
																							isGroupOpen
																								? "rotate-0"
																								: isRTL
																									? "rotate-90"
																									: "-rotate-90",
																						)}
																					/>
																				</button>

																				<div
																					aria-hidden={!isGroupOpen}
																					inert={!isGroupOpen ? true : undefined}
																					className={cn(
																						"grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
																						isGroupOpen
																							? "grid-rows-[1fr] opacity-100"
																							: "grid-rows-[0fr] opacity-0",
																					)}
																				>
																					<div className="min-h-0 overflow-hidden">
																						<div
																							className={cn(
																								"ms-[19px] flex flex-col gap-0.5 border-s border-white/[0.08] ps-2.5 pt-1 pb-0.5 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
																								isGroupOpen
																									? "translate-y-0"
																									: "translate-y-1.5",
																							)}
																						>
																							{navEntry.subItems.map(
																								(sub) => {
																									const SubIcon = sub.icon;
																									const subSelected =
																										activeSettingsId ===
																										sub.id;
																									const isSubNotif =
																										sub.url ===
																										"/notifications";
																									return (
																										<button
																											key={sub.id}
																											type="button"
																											aria-current={
																												subSelected
																													? "page"
																													: undefined
																											}
																											onClick={() =>
																												navigateToSettingsItem(
																													sub.url,
																												)
																											}
																											className={cn(
																												"relative flex min-h-[34px] w-full items-center gap-2.5 rounded-[10px] px-2.5 text-start text-xs transition-[background-color,color,transform] duration-150 outline-none select-none active:scale-[0.98] active:bg-[#21262d]",
																												subSelected
																													? isRTL
																														? "bg-gradient-to-l from-[var(--nora-panel-accent)]/15 via-[var(--nora-panel-accent)]/8 to-transparent font-bold text-[var(--nora-panel-accent)] border-s-2 border-[var(--nora-panel-accent)]"
																														: "bg-gradient-to-r from-[var(--nora-panel-accent)]/15 via-[var(--nora-panel-accent)]/8 to-transparent font-bold text-[var(--nora-panel-accent)] border-s-2 border-[var(--nora-panel-accent)]"
																													: "bg-transparent font-medium text-slate-400",
																											)}
																										>
																											{subSelected ? (
																												<span className="pointer-events-none absolute -inset-s-[11.5px] top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--nora-panel-accent)]" />
																											) : null}
																											<SubIcon className={cn("size-4 shrink-0", subSelected ? "text-[var(--nora-panel-accent)]" : "text-slate-400")} />
																											<span className="min-w-0 flex-1 truncate">
																												{sub.title}
																											</span>
																											{isSubNotif &&
																											unread > 0 ? (
																												<span
																													dir="ltr"
																													className="inline-flex h-[17px] min-w-[17px] shrink-0 items-center justify-center rounded-full bg-[var(--nora-panel-accent)] px-1 text-[10px] font-bold text-slate-950 tabular-nums [unicode-bidi:isolate]"
																												>
																													{unread > 99
																														? "99+"
																														: unread}
																												</span>
																											) : null}
																										</button>
																									);
																								},
																							)}
																						</div>
																					</div>
																				</div>
																			</div>
																		);
																	})}
																</div>
															</div>
														))}
													</div>
												</div>
											</PopoverContent>
										</Popover>
									);
								}

								if (item.key === "myaccount") {
									return (
										<Popover
											key={item.key}
											open={accountMenu.isOpen}
											onOpenChange={(open) => {
												if (!open) handleAccountMenuClose();
											}}
										>
											<PopoverTrigger asChild>
												<Button
													ref={(node) => {
														tabContentRefs.current[item.key] = node;
													}}
													onClick={(event) => {
														event.preventDefault();
														if (accountHoldOpened.current) return;
														handleAccountMenuClose();
														handleNavClick(item.to);
													}}
													onPointerDown={(event) => {
														if (event.pointerType === "mouse") return;
														accountHoldStartPoint.current = {
															x: event.clientX,
															y: event.clientY,
														};
														handleAccountHoldStart();
													}}
													onPointerMove={(event) => {
														if (event.pointerType === "mouse") return;
														handleAccountHoldMove(
															event.clientX,
															event.clientY,
														);
													}}
													onPointerUp={handleAccountHoldEnd}
													onPointerCancel={handleAccountHoldEnd}
													onPointerLeave={handleAccountHoldEnd}
													onContextMenu={(event) => {
														event.preventDefault();
													}}
													variant="ghost"
													size="sm"
													className={tabButtonClass}
												>
													{navContent}
												</Button>
											</PopoverTrigger>
											<PopoverContent
												dir={isRTL ? "rtl" : "ltr"}
												side="top"
												align="center"
												sideOffset={12}
												collisionPadding={12}
												onOpenAutoFocus={(event) => event.preventDefault()}
												className={cn(
													"z-[1600] w-[min(188px,calc(100vw-24px))] max-w-[calc(100vw-24px)] rounded-[20px] border p-2",
													DOCK_SURFACE_CLASS,
												)}
											>
												<button
													type="button"
													onClick={async () => {
														try {
															await logoutSession();
														} finally {
															clearClientSession();
															handleAccountMenuClose();
															navigate("/login");
														}
													}}
													className="flex min-h-[38px] w-full items-center gap-2.5 rounded-[12px] px-3 text-[13px] font-semibold text-red-400 transition-[background-color,transform] duration-150 outline-none select-none active:scale-[0.98] active:bg-red-500/20"
												>
													<LogOut className="size-4 shrink-0" />
													<span>{t("header.logout")}</span>
												</button>
											</PopoverContent>
										</Popover>
									);
								}

								return (
									<Button
										key={item.key}
										ref={(node) => {
											tabContentRefs.current[item.key] = node;
										}}
										onClick={() => {
											if (item.to) handleNavClick(item.to);
										}}
										variant="ghost"
										size="sm"
										className={tabButtonClass}
									>
										{navContent}
									</Button>
								);
							})}
						</div>
					)}
				</div>
			</div>
		</>
	);
});
