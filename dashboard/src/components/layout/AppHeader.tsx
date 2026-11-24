import {
	Breadcrumb,
	BreadcrumbEllipsisDropdown,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "components/ui/breadcrumb";
import { Button } from "components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "components/ui/popover";
import { motion } from "framer-motion";
import { useDisclosure } from "hooks/useDisclosure";
import useGetUser from "hooks/useGetUser";
import { cn } from "lib/cn";
import { resolveAppLanguageCode } from "lib/language";
import {
	Check,
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
import { GitHubStars } from "../GitHubStars";
import { HeaderCalendar } from "../HeaderCalendar";
import {
	NotificationBell,
	NotificationMenuItem,
	useNotificationCenter,
} from "../NotificationBell";
import { SponsorCarousel } from "../SponsorCarousel";
import ThemeSelector from "../ThemeSelector";
import type { BreadcrumbEntry } from "./breadcrumbConfig";
import { HeaderSkeletonContent } from "./ShellSkeletons";

const AnimatedHamburger = ({
	isOpen,
	isRTL,
}: {
	isOpen: boolean;
	isRTL?: boolean;
}) => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 18 18"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.75"
		strokeLinecap="round"
		aria-hidden="true"
		style={{ transform: isRTL ? "scaleX(-1)" : undefined }}
	>
		<motion.line
			x1="3"
			y1="5"
			x2="15"
			y2="5"
			initial={false}
			animate={{ x2: isOpen ? 10 : 15 }}
			transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
		/>
		<motion.line
			x1="3"
			y1="9"
			x2="15"
			y2="9"
			initial={false}
			animate={{ x2: 15 }}
			transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
		/>
		<motion.line
			x1="3"
			y1="13"
			x2="15"
			y2="13"
			initial={false}
			animate={{ x2: isOpen ? 12 : 15 }}
			transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
		/>
	</svg>
);

let textMeasureCanvas: HTMLCanvasElement | null = null;
const measureBreadcrumbLabel = (text: string, isPage: boolean): number => {
	if (typeof document === "undefined") {
		return Math.ceil(text.length * (isPage ? 8.5 : 8));
	}
	if (!textMeasureCanvas) {
		textMeasureCanvas = document.createElement("canvas");
	}
	const ctx = textMeasureCanvas.getContext("2d");
	if (!ctx) {
		return Math.ceil(text.length * (isPage ? 8.5 : 8));
	}
	ctx.font = `${isPage ? "600" : "500"} 12.5px "Arad", "Inter", system-ui, -apple-system, sans-serif`;
	return Math.ceil(ctx.measureText(text).width);
};

export interface AppHeaderProps {
	sidebarCollapsed: boolean;
	onToggleSidebar: () => void;
	isMobile: boolean;
	isShellLoading?: boolean;
	breadcrumbItems: BreadcrumbEntry[];
	sponsorHeaderItems?: Array<{
		id: string;
		src: string;
		alt: string;
		href?: string;
		label?: string;
		isSponsor: boolean;
	}>;
	mobileHeaderItems?: Array<{
		id: string;
		src: string;
		alt: string;
		href?: string;
		label?: string;
		isSponsor: boolean;
	}>;
	bannersVisible?: boolean;
	onNavigate: (path: string) => void;
}

export const AppHeader: FC<AppHeaderProps> = ({
	sidebarCollapsed,
	onToggleSidebar,
	isMobile,
	isShellLoading = false,
	breadcrumbItems,
	sponsorHeaderItems = [],
	mobileHeaderItems = [],
	bannersVisible = false,
	onNavigate,
}) => {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const isRTL = i18n.dir(i18n.language) === "rtl";
	const headerRef = useRef<HTMLElement | null>(null);
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

	const [calendarCompact, setCalendarCompact] = useState(false);
	const [starsCompact, setStarsCompact] = useState(false);
	const [profileCompact, setProfileCompact] = useState(false);
	const [breadcrumbMode, setBreadcrumbMode] = useState<
		"full" | "compact" | "minimal"
	>("full");
	const [bannerShrinkable, setBannerShrinkable] = useState(false);
	const [canTruncateLastCrumbState, setCanTruncateLastCrumbState] =
		useState(false);
	const [bannerDimensions, setBannerDimensions] = useState({
		natural: 220,
		half: 110,
	});

	const starsExpandedWidthRef = useRef(88);
	const profileExpandedWidthRef = useRef(96);

	const canTruncateLastCrumb =
		canTruncateLastCrumbState &&
		calendarCompact &&
		starsCompact &&
		profileCompact &&
		breadcrumbMode === "minimal";

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

	useEffect(() => {
		const firstBannerSrc = sponsorHeaderItems[0]?.src;
		if (!firstBannerSrc) return;
		const probe = new Image();
		const update = () => {
			if (probe.naturalWidth && probe.naturalHeight) {
				const natural = Math.round(
					(probe.naturalWidth / probe.naturalHeight) * 38,
				);
				const half = Math.max(90, Math.round(natural / 2));
				setBannerDimensions((prev) => {
					if (prev.natural === natural && prev.half === half) return prev;
					return { natural, half };
				});
			}
		};
		probe.onload = update;
		probe.src = firstBannerSrc;
		if (probe.complete) update();
	}, [sponsorHeaderItems[0]?.src]);

	useEffect(() => {
		if (isShellLoading) return;
		const headerEl = headerRef.current;
		if (!headerEl) return;

		const checkFit = () => {
			if (!headerRef.current) return;
			const totalWidth = headerRef.current.clientWidth;
			const hasBanner = sponsorHeaderItems.length > 0;
			const bannerImg = headerRef.current.querySelector<HTMLImageElement>(
				"[data-header-banner] img",
			);
			let naturalBannerWidth = 0;
			if (hasBanner) {
				if (bannerImg?.naturalWidth && bannerImg.naturalHeight) {
					naturalBannerWidth = Math.round(
						(bannerImg.naturalWidth / bannerImg.naturalHeight) * 38,
					);
				} else {
					naturalBannerWidth = bannerDimensions.natural;
				}
			}
			const bannerWidth = hasBanner ? naturalBannerWidth + 2 : 0;
			const minBannerWidth = hasBanner
				? Math.max(Math.round(naturalBannerWidth * 0.5), 60)
				: 0;

			const profileEl = headerRef.current.querySelector<HTMLElement>(
				"[data-header-profile]",
			);
			const notifEl = headerRef.current.querySelector<HTMLElement>(
				"[data-header-notifications]",
			);
			const starsEl = headerRef.current.querySelector<HTMLElement>(
				"[data-header-github-stars]",
			);
			if (!profileCompact && profileEl && profileEl.offsetWidth > 44) {
				profileExpandedWidthRef.current = profileEl.offsetWidth;
			}
			const fullProfileWidth = profileEl ? profileExpandedWidthRef.current : 90;
			const compactProfileWidth = profileEl ? 34 : 0;
			const notifWidth =
				!isMobile && getUserIsSuccess && notifEl ? notifEl.offsetWidth : 0;
			if (!starsCompact && starsEl && starsEl.offsetWidth > 44) {
				starsExpandedWidthRef.current = starsEl.offsetWidth;
			}
			const fullStarsWidth = starsEl ? starsExpandedWidthRef.current : 0;
			const compactStarsWidth = starsEl ? 34 : 0;
			const isFa = i18n.language?.startsWith("fa");
			const fullCalendarWidth = isFa ? 184 : 200;
			const compactCalendarWidth = 34;
			const navButtonWidth = 34;
			const isDesktop = !isMobile && window.innerWidth >= 769;
			const headerPadding = isDesktop ? 40 : 24;
			const hstackGap = 12;
			const navDividerGaps = 25;
			const bannerGap = hasBanner ? 10 : 0;

			const getAvailableSpace = (
				calWidth: number,
				strWidth: number,
				profWidth: number,
			) => {
				const rightControlsWidth =
					profWidth +
					(notifWidth > 0 ? notifWidth + 8 : 0) +
					(strWidth > 0 ? strWidth + 8 : 0);
				const controlsWidth = calWidth + 8 + rightControlsWidth;
				const fixedOverhead =
					headerPadding +
					hstackGap +
					navButtonWidth +
					navDividerGaps +
					bannerGap +
					controlsWidth;
				return totalWidth - fixedOverhead;
			};

			const spaceFullCalFullStars = getAvailableSpace(
				fullCalendarWidth,
				fullStarsWidth,
				fullProfileWidth,
			);
			const spaceCompactCalFullStars = getAvailableSpace(
				compactCalendarWidth,
				fullStarsWidth,
				fullProfileWidth,
			);
			const spaceCompactCalCompactStars = getAvailableSpace(
				compactCalendarWidth,
				compactStarsWidth,
				fullProfileWidth,
			);
			const spaceCompactAllControls = getAvailableSpace(
				compactCalendarWidth,
				compactStarsWidth,
				compactProfileWidth,
			);

			const crumbCount = breadcrumbItems.length;
			const fullBreadcrumbWidth =
				crumbCount === 0
					? 0
					: crumbCount === 1
						? measureBreadcrumbLabel(breadcrumbItems[0]?.label || "", true)
						: breadcrumbItems.reduce((acc, item, idx) => {
								const isLast = idx === crumbCount - 1;
								return (
									acc +
									measureBreadcrumbLabel(item.label || "", isLast) +
									(idx > 0 ? 24 : 0)
								);
							}, 0);

			const compactBreadcrumbWidth =
				crumbCount <= 2
					? fullBreadcrumbWidth
					: measureBreadcrumbLabel(breadcrumbItems[0]?.label || "", false) +
						24 +
						22 +
						24 +
						measureBreadcrumbLabel(
							breadcrumbItems[crumbCount - 1]?.label || "",
							true,
						);

			const minimalBreadcrumbWidth =
				crumbCount <= 1
					? measureBreadcrumbLabel(breadcrumbItems[0]?.label || "", true)
					: 22 +
						24 +
						measureBreadcrumbLabel(
							breadcrumbItems[crumbCount - 1]?.label || "",
							true,
						);

			const buffer = 20;
			const stage1Needed = fullBreadcrumbWidth + bannerWidth + buffer;
			const stage2Needed = fullBreadcrumbWidth + bannerWidth + buffer;
			const stage3Needed = compactBreadcrumbWidth + bannerWidth + buffer;
			const stage4Needed = minimalBreadcrumbWidth + bannerWidth + buffer;
			const stage5Needed = minimalBreadcrumbWidth + minBannerWidth + buffer;

			let nextCalendarCompact = true;
			let nextStarsCompact = false;
			let nextProfileCompact = false;
			let nextBreadcrumbMode: "full" | "compact" | "minimal" = "minimal";
			let nextBannerShrinkable = false;
			let nextTruncate = true;

			if (spaceFullCalFullStars >= stage1Needed) {
				nextCalendarCompact = false;
				nextStarsCompact = false;
				nextProfileCompact = false;
				nextBreadcrumbMode = "full";
				nextBannerShrinkable = false;
				nextTruncate = false;
			} else if (spaceCompactCalFullStars >= stage2Needed) {
				nextCalendarCompact = true;
				nextStarsCompact = false;
				nextProfileCompact = false;
				nextBreadcrumbMode = "full";
				nextBannerShrinkable = false;
				nextTruncate = false;
			} else if (spaceCompactCalCompactStars >= stage2Needed) {
				nextCalendarCompact = true;
				nextStarsCompact = true;
				nextProfileCompact = false;
				nextBreadcrumbMode = "full";
				nextBannerShrinkable = false;
				nextTruncate = false;
			} else if (spaceCompactAllControls >= stage2Needed) {
				nextCalendarCompact = true;
				nextStarsCompact = true;
				nextProfileCompact = true;
				nextBreadcrumbMode = "full";
				nextBannerShrinkable = false;
				nextTruncate = false;
			} else if (spaceCompactAllControls >= stage3Needed) {
				nextCalendarCompact = true;
				nextStarsCompact = true;
				nextProfileCompact = true;
				nextBreadcrumbMode = "compact";
				nextBannerShrinkable = false;
				nextTruncate = false;
			} else if (spaceCompactAllControls >= stage4Needed) {
				nextCalendarCompact = true;
				nextStarsCompact = true;
				nextProfileCompact = true;
				nextBreadcrumbMode = "minimal";
				nextBannerShrinkable = false;
				nextTruncate = false;
			} else if (hasBanner && spaceCompactAllControls >= stage5Needed) {
				nextCalendarCompact = true;
				nextStarsCompact = true;
				nextProfileCompact = true;
				nextBreadcrumbMode = "minimal";
				nextBannerShrinkable = true;
				nextTruncate = false;
			} else {
				nextCalendarCompact = true;
				nextStarsCompact = true;
				nextProfileCompact = true;
				nextBreadcrumbMode = "minimal";
				nextBannerShrinkable = hasBanner;
				nextTruncate = true;
			}

			setCalendarCompact((prev) =>
				prev !== nextCalendarCompact ? nextCalendarCompact : prev,
			);
			setStarsCompact((prev) =>
				prev !== nextStarsCompact ? nextStarsCompact : prev,
			);
			setProfileCompact((prev) =>
				prev !== nextProfileCompact ? nextProfileCompact : prev,
			);
			setBreadcrumbMode((prev) =>
				prev !== nextBreadcrumbMode ? nextBreadcrumbMode : prev,
			);
			setBannerShrinkable((prev) =>
				prev !== nextBannerShrinkable ? nextBannerShrinkable : prev,
			);
			setCanTruncateLastCrumbState((prev) =>
				prev !== nextTruncate ? nextTruncate : prev,
			);
		};

		const timer = window.setTimeout(checkFit, 20);
		const ro = new ResizeObserver(checkFit);
		ro.observe(headerEl);
		const controlsEl = headerEl.querySelector<HTMLElement>(
			"[data-header-controls]",
		);
		if (controlsEl) {
			ro.observe(controlsEl);
		}
		return () => {
			window.clearTimeout(timer);
			ro.disconnect();
		};
	}, [
		sponsorHeaderItems.length,
		breadcrumbItems,
		i18n.language,
		bannerDimensions.natural,
		isMobile,
		getUserIsSuccess,
		starsCompact,
		profileCompact,
		isShellLoading,
	]);

	return (
		<div className="relative z-[100] shrink-0">
			<header
				ref={headerRef}
				dir={isRTL ? "rtl" : "ltr"}
				className={cn(
					"mx-3 mt-3 flex h-[52px] min-h-[52px] items-center justify-between gap-3 overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#161b22] px-3 shadow-[0_1px_2px_rgba(0,0,0,0.03),inset_0_1px_0_0_rgba(255,255,255,0.06)] select-none min-[769px]:mx-4 min-[769px]:px-5",
					isShellLoading && "rb-skeleton-sweep",
				)}
			>
				{isShellLoading ? (
					<HeaderSkeletonContent
						isMobile={isMobile}
						breadcrumbCount={breadcrumbItems.length}
					/>
				) : (
					<>
						<div className="flex h-full min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
							<button
								type="button"
								aria-label={t("a11y.toggleSidebar")}
								onClick={onToggleSidebar}
								className="inline-flex size-[34px] min-w-[34px]! shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#161b22] text-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none active:scale-[0.95] focus-visible:ring-2 focus-visible:ring-cyan-500/50 min-[769px]:rounded-[12px] min-[769px]:hover:border-white/20 min-[769px]:hover:bg-[#21262d] min-[769px]:hover:text-white min-[769px]:hover:shadow-[0_4px_12px_rgba(0,0,0,0.24)]"
							>
								<AnimatedHamburger
									isOpen={isMobile ? false : !sidebarCollapsed}
									isRTL={isRTL}
								/>
							</button>

							<span
								aria-hidden="true"
								className="mx-0.5 hidden h-4 w-px shrink-0 bg-white/[0.08] min-[769px]:block"
							/>

							<Breadcrumb
								data-header-breadcrumb="true"
								dir={isRTL ? "rtl" : "ltr"}
								className={cn(
									"hidden min-[769px]:flex",
									canTruncateLastCrumb
										? "min-w-0 shrink overflow-hidden"
										: "min-w-fit shrink-0 overflow-visible",
								)}
							>
								<BreadcrumbList
									className={cn(
										canTruncateLastCrumb ? "min-w-0" : "min-w-fit",
									)}
								>
									{breadcrumbItems.length === 1 ? (
										<BreadcrumbItem
											className={cn(
												canTruncateLastCrumb
													? "min-w-0 shrink"
													: "min-w-fit shrink-0",
											)}
										>
											<BreadcrumbPage isTruncated={canTruncateLastCrumb}>
												{breadcrumbItems[0].label}
											</BreadcrumbPage>
										</BreadcrumbItem>
									) : null}

									{breadcrumbItems.length === 2 ? (
										breadcrumbMode === "minimal" ? (
											<>
												<BreadcrumbItem className="shrink-0">
													<BreadcrumbEllipsisDropdown
														items={[breadcrumbItems[0]]}
														onNavigate={(path) => onNavigate(path)}
													/>
												</BreadcrumbItem>
												<BreadcrumbSeparator />
												<BreadcrumbItem
													className={cn(
														canTruncateLastCrumb
															? "min-w-0 shrink"
															: "min-w-fit shrink-0",
													)}
												>
													<BreadcrumbPage isTruncated={canTruncateLastCrumb}>
														{breadcrumbItems[1].label}
													</BreadcrumbPage>
												</BreadcrumbItem>
											</>
										) : (
											<>
												<BreadcrumbItem className="shrink-0">
													<BreadcrumbLink
														isClickable={Boolean(breadcrumbItems[0].path)}
														onClick={() => {
															if (breadcrumbItems[0].path) {
																onNavigate(breadcrumbItems[0].path);
															}
														}}
													>
														{breadcrumbItems[0].label}
													</BreadcrumbLink>
												</BreadcrumbItem>
												<BreadcrumbSeparator />
												<BreadcrumbItem
													className={cn(
														canTruncateLastCrumb
															? "min-w-0 shrink"
															: "min-w-fit shrink-0",
													)}
												>
													<BreadcrumbPage isTruncated={canTruncateLastCrumb}>
														{breadcrumbItems[1].label}
													</BreadcrumbPage>
												</BreadcrumbItem>
											</>
										)
									) : null}

									{breadcrumbItems.length === 3 ? (
										<>
											{breadcrumbMode === "full" ? (
												<>
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbLink
															isClickable={Boolean(breadcrumbItems[0].path)}
															onClick={() => {
																if (breadcrumbItems[0].path) {
																	onNavigate(breadcrumbItems[0].path);
																}
															}}
														>
															{breadcrumbItems[0].label}
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbLink
															isClickable={Boolean(breadcrumbItems[1].path)}
															onClick={() => {
																if (breadcrumbItems[1].path) {
																	onNavigate(breadcrumbItems[1].path);
																}
															}}
														>
															{breadcrumbItems[1].label}
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem
														className={cn(
															canTruncateLastCrumb
																? "min-w-0 shrink"
																: "min-w-fit shrink-0",
														)}
													>
														<BreadcrumbPage
															isTruncated={canTruncateLastCrumb}
														>
															{breadcrumbItems[2].label}
														</BreadcrumbPage>
													</BreadcrumbItem>
												</>
											) : null}

											{breadcrumbMode === "compact" ? (
												<>
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbLink
															isClickable={Boolean(breadcrumbItems[0].path)}
															onClick={() => {
																if (breadcrumbItems[0].path) {
																	onNavigate(breadcrumbItems[0].path);
																}
															}}
														>
															{breadcrumbItems[0].label}
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbEllipsisDropdown
															items={[breadcrumbItems[1]]}
															onNavigate={(path) => onNavigate(path)}
														/>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem
														className={cn(
															canTruncateLastCrumb
																? "min-w-0 shrink"
																: "min-w-fit shrink-0",
														)}
													>
														<BreadcrumbPage
															isTruncated={canTruncateLastCrumb}
														>
															{breadcrumbItems[2].label}
														</BreadcrumbPage>
													</BreadcrumbItem>
												</>
											) : null}

											{breadcrumbMode === "minimal" ? (
												<>
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbEllipsisDropdown
															items={[breadcrumbItems[0], breadcrumbItems[1]]}
															onNavigate={(path) => onNavigate(path)}
														/>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem
														className={cn(
															canTruncateLastCrumb
																? "min-w-0 shrink"
																: "min-w-fit shrink-0",
														)}
													>
														<BreadcrumbPage
															isTruncated={canTruncateLastCrumb}
														>
															{breadcrumbItems[2].label}
														</BreadcrumbPage>
													</BreadcrumbItem>
												</>
											) : null}
										</>
									) : null}

									{breadcrumbItems.length === 4 ? (
										<>
											{breadcrumbMode === "full" ? (
												<>
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbLink
															isClickable={Boolean(breadcrumbItems[0].path)}
															onClick={() => {
																if (breadcrumbItems[0].path) {
																	onNavigate(breadcrumbItems[0].path);
																}
															}}
														>
															{breadcrumbItems[0].label}
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbLink
															isClickable={Boolean(breadcrumbItems[1].path)}
															onClick={() => {
																if (breadcrumbItems[1].path) {
																	onNavigate(breadcrumbItems[1].path);
																}
															}}
														>
															{breadcrumbItems[1].label}
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbLink
															isClickable={Boolean(breadcrumbItems[2].path)}
															onClick={() => {
																if (breadcrumbItems[2].path) {
																	onNavigate(breadcrumbItems[2].path);
																}
															}}
														>
															{breadcrumbItems[2].label}
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem
														className={cn(
															canTruncateLastCrumb
																? "min-w-0 shrink"
																: "min-w-fit shrink-0",
														)}
													>
														<BreadcrumbPage
															isTruncated={canTruncateLastCrumb}
														>
															{breadcrumbItems[3].label}
														</BreadcrumbPage>
													</BreadcrumbItem>
												</>
											) : null}

											{breadcrumbMode === "compact" ? (
												<>
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbLink
															isClickable={Boolean(breadcrumbItems[0].path)}
															onClick={() => {
																if (breadcrumbItems[0].path) {
																	onNavigate(breadcrumbItems[0].path);
																}
															}}
														>
															{breadcrumbItems[0].label}
														</BreadcrumbLink>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbEllipsisDropdown
															items={[breadcrumbItems[1], breadcrumbItems[2]]}
															onNavigate={(path) => onNavigate(path)}
														/>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem
														className={cn(
															canTruncateLastCrumb
																? "min-w-0 shrink"
																: "min-w-fit shrink-0",
														)}
													>
														<BreadcrumbPage
															isTruncated={canTruncateLastCrumb}
														>
															{breadcrumbItems[3].label}
														</BreadcrumbPage>
													</BreadcrumbItem>
												</>
											) : null}

											{breadcrumbMode === "minimal" ? (
												<>
													<BreadcrumbItem className="shrink-0">
														<BreadcrumbEllipsisDropdown
															items={[
																breadcrumbItems[0],
																breadcrumbItems[1],
																breadcrumbItems[2],
															]}
															onNavigate={(path) => onNavigate(path)}
														/>
													</BreadcrumbItem>
													<BreadcrumbSeparator />
													<BreadcrumbItem
														className={cn(
															canTruncateLastCrumb
																? "min-w-0 shrink"
																: "min-w-fit shrink-0",
														)}
													>
														<BreadcrumbPage
															isTruncated={canTruncateLastCrumb}
														>
															{breadcrumbItems[3].label}
														</BreadcrumbPage>
													</BreadcrumbItem>
												</>
											) : null}
										</>
									) : null}

									{breadcrumbItems.length > 4 ? (
										breadcrumbMode === "minimal" ? (
											<>
												<BreadcrumbItem className="shrink-0">
													<BreadcrumbEllipsisDropdown
														items={breadcrumbItems.slice(0, -1)}
														onNavigate={(path) => onNavigate(path)}
													/>
												</BreadcrumbItem>
												<BreadcrumbSeparator />
												<BreadcrumbItem
													className={cn(
														canTruncateLastCrumb
															? "min-w-0 shrink"
															: "min-w-fit shrink-0",
													)}
												>
													<BreadcrumbPage isTruncated={canTruncateLastCrumb}>
														{
															breadcrumbItems[breadcrumbItems.length - 1]
																.label
														}
													</BreadcrumbPage>
												</BreadcrumbItem>
											</>
										) : (
											<>
												<BreadcrumbItem className="shrink-0">
													<BreadcrumbLink
														isClickable={Boolean(breadcrumbItems[0].path)}
														onClick={() => {
															if (breadcrumbItems[0].path) {
																onNavigate(breadcrumbItems[0].path);
															}
														}}
													>
														{breadcrumbItems[0].label}
													</BreadcrumbLink>
												</BreadcrumbItem>
												<BreadcrumbSeparator />
												<BreadcrumbItem className="shrink-0">
													<BreadcrumbEllipsisDropdown
														items={breadcrumbItems.slice(1, -1)}
														onNavigate={(path) => onNavigate(path)}
													/>
												</BreadcrumbItem>
												<BreadcrumbSeparator />
												<BreadcrumbItem
													className={cn(
														canTruncateLastCrumb
															? "min-w-0 shrink"
															: "min-w-fit shrink-0",
													)}
												>
													<BreadcrumbPage isTruncated={canTruncateLastCrumb}>
														{
															breadcrumbItems[breadcrumbItems.length - 1]
																.label
														}
													</BreadcrumbPage>
												</BreadcrumbItem>
											</>
										)
									) : null}
								</BreadcrumbList>
							</Breadcrumb>

							{isMobile && mobileHeaderItems.length > 0 ? (
								<div
									data-header-mobile-banner="true"
									aria-hidden={!bannersVisible}
									className={cn(
										"flex max-h-[38px] min-w-[40px] max-w-full shrink items-center justify-start overflow-hidden transition-transform duration-[540ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
										bannersVisible
											? "translate-y-0"
											: "pointer-events-none -translate-y-[54px]",
									)}
								>
									<SponsorCarousel
										items={mobileHeaderItems}
										variant="banner"
										animateIn={false}
									/>
								</div>
							) : null}

							{!isMobile && sponsorHeaderItems.length > 0 ? (
								<div
									data-header-banner="true"
									aria-hidden={!bannersVisible}
									style={{
										width: bannerShrinkable
											? "100%"
											: `${bannerDimensions.natural}px`,
										maxWidth: `${bannerDimensions.natural}px`,
										minWidth: bannerShrinkable
											? `${Math.max(Math.round(bannerDimensions.natural * 0.5), 60)}px`
											: `${bannerDimensions.natural}px`,
									}}
									className={cn(
										"flex max-h-[38px] items-center justify-center overflow-hidden transition-transform duration-[540ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
										bannerShrinkable ? "shrink" : "shrink-0",
										bannersVisible
											? "translate-y-0"
											: "pointer-events-none -translate-y-[54px]",
									)}
								>
									<SponsorCarousel
										items={sponsorHeaderItems}
										variant="banner"
										animateIn={false}
									/>
								</div>
							) : null}
						</div>

						<div
							data-header-controls="true"
							className="flex h-full shrink-0 items-center gap-1.5 sm:gap-2"
						>
							{!isMobile ? (
								<HeaderCalendar isCompact={calendarCompact} />
							) : null}

							<GitHubStars compact={isMobile || starsCompact} />

							{!isMobile && getUserIsSuccess && userData.username ? (
								<NotificationBell />
							) : null}

							{getUserIsSuccess && userData.username ? (
								<Popover
									open={userMenu.isOpen}
									onOpenChange={(open) => {
										if (open) userMenu.onOpen();
										else closeUserMenu();
									}}
								>
									<PopoverTrigger asChild>
										<Button
											type="button"
											data-header-profile="true"
											variant="outline"
											size="sm"
											title={
												isMobile || profileCompact
													? userData.username
													: undefined
											}
											aria-label={t("a11y.userMenu")}
											className={cn(
												"h-[34px] border-white/[0.08] bg-[#161b22] text-[#f0f6fc] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#21262d] hover:border-white/20 active:scale-[0.97] min-[769px]:hover:shadow-[0_4px_12px_rgba(0,0,0,0.24)]",
												isMobile || profileCompact
													? "w-[34px] min-w-[34px]! rounded-full px-0 min-[769px]:rounded-[12px]"
													: "w-auto min-w-0 rounded-[12px] px-3",
											)}
										>
											<span className="flex items-center justify-center gap-2">
												<span className="relative inline-flex shrink-0 items-center justify-center">
													<CircleUser
														className="size-4 text-[#f0f6fc]"
														strokeWidth={1.75}
													/>
													{isMobile && unread > 0 ? (
														<span className="absolute -top-0.5 -end-0.5 size-2 rounded-full border-[1.5px] border-[#161b22] bg-cyan-400" />
													) : null}
												</span>
												{!(isMobile || profileCompact) ? (
													<span
														dir="ltr"
														style={{ unicodeBidi: "isolate" }}
														className="max-w-[140px] truncate text-xs font-semibold leading-normal text-[#f0f6fc]"
													>
														{userData.username}
													</span>
												) : null}
											</span>
										</Button>
									</PopoverTrigger>
									<PopoverContent
										dir={isRTL ? "rtl" : "ltr"}
										align={isRTL ? "start" : "end"}
										sideOffset={8}
										collisionPadding={12}
										id="rb-user-menu"
										data-profile-window="true"
										data-profile-menu="true"
										onOpenAutoFocus={(e) => e.preventDefault()}
										className="z-[9999] w-[240px] min-w-[240px]! max-w-[240px] max-h-[min(calc(var(--radix-popover-content-available-height,76dvh)-8px),calc(100dvh-24px))] overflow-y-auto overscroll-contain rounded-[20px] border border-white/[0.08] bg-[#161b22] p-2 text-[#f0f6fc] shadow-[0_20px_48px_rgba(0,0,0,0.5)] select-none"
									>
										<div
											dir={isRTL ? "rtl" : "ltr"}
											className="mb-1.5 flex w-full items-center justify-start gap-3 rounded-[14px] border border-white/[0.06] bg-[#21262d] p-2.5 text-start"
										>
											<div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.08] bg-[#161b22] text-[#f0f6fc]">
												<CircleUser className="size-4" strokeWidth={1.75} />
											</div>
											<div className="flex min-w-0 flex-1 flex-col items-start text-start">
												<span
													dir="ltr"
													style={{ unicodeBidi: "isolate" }}
													className="max-w-full truncate text-[13px] font-bold text-[#f0f6fc]"
												>
													{userData.username}
												</span>
												<span className="max-w-full truncate text-[11px] font-medium text-slate-400">
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
													isPressing={
														pressingProfileSubmenu === "notifications"
													}
													onToggle={() =>
														toggleProfileSubmenu("notifications")
													}
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
															"flex h-[38px] w-full items-center justify-between gap-2.5 rounded-[12px] px-3 text-[13px] font-medium text-[#f0f6fc] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none select-none active:scale-[0.97] active:bg-[#21262d] focus-visible:bg-[#21262d] min-[769px]:hover:bg-[#21262d]",
															pressingProfileSubmenu === "language" ||
																activeProfileSubmenu === "language"
																? "bg-[#21262d]"
																: "bg-transparent",
															pressingProfileSubmenu === "language" &&
																"scale-[0.97]",
														)}
													>
														<span className="flex min-w-0 items-center gap-2.5">
															<Languages
																className="size-4 shrink-0 text-[#f0f6fc]"
																strokeWidth={1.75}
															/>
															<span className="truncate">
																{t("header.language")}
															</span>
														</span>
														<span className="shrink-0 text-[11px] font-semibold text-slate-400">
															{languageItems.find(
																(item) => item.code === activeLanguage,
															)?.label || "English"}
														</span>
													</button>
												</PopoverTrigger>
												<PopoverContent
													dir={isRTL ? "rtl" : "ltr"}
													side={isMobile ? "bottom" : isRTL ? "left" : "right"}
													align={isMobile ? "center" : "start"}
													sideOffset={8}
													collisionPadding={12}
													data-profile-window="true"
													data-profile-submenu="true"
													data-language-menu-list="true"
													className="z-[10005] w-[min(220px,calc(100vw-24px))] min-w-[176px]! max-h-[min(calc(var(--radix-popover-content-available-height,72dvh)-8px),calc(100dvh-24px))] overflow-y-auto overscroll-contain rounded-[20px] border border-white/[0.08] bg-[#161b22] p-1.5 text-[#f0f6fc] shadow-[0_20px_48px_rgba(0,0,0,0.5)] select-none"
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
																		"flex h-9 w-full items-center justify-between gap-3 rounded-[10px] px-2.5 text-xs transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none active:scale-[0.98] focus-visible:bg-[#21262d] min-[769px]:hover:bg-[#21262d]",
																		isActiveLang
																			? "bg-[#21262d] font-bold text-cyan-400"
																			: "font-medium text-slate-300 min-[769px]:hover:text-white",
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
																		<Check className="size-3.5 text-cyan-400" />
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

											<div className="my-1 h-px bg-white/[0.08]" />

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
							) : null}
						</div>
					</>
				)}
			</header>

			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 -bottom-4 z-[99] h-4 bg-gradient-to-b from-[#0d1117] to-transparent"
			/>
		</div>
	);
};
