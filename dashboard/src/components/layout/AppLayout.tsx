import { useQuery } from "@tanstack/react-query";
import { useDisclosure } from "hooks/useDisclosure";
import useGetUser from "hooks/useGetUser";
import { useMediaQuery } from "hooks/useMediaQuery";
import { useSheetSwipeToClose } from "hooks/useSheetSwipeToClose";
import { cn } from "lib/cn";
import { EDITOR_PAGE_ID, useActiveEntityPage } from "lib/entityPages";
import { useShellLoading } from "lib/shellLoading";
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getSponsors, type SponsorAsset } from "service/sponsors";
import { NotificationProvider } from "../NotificationBell";
import ThemeSelector from "../ThemeSelector";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { computeBreadcrumbItems } from "./breadcrumbConfig";
import { MobileNav } from "./MobileNav";

function AppLayoutContent() {
	const editorPageSection = useActiveEntityPage((state) => state.section);
	const editorPageTitle = useActiveEntityPage((state) => state.title);
	const mainRef = useRef<HTMLElement>(null);
	const listScrollTop = useRef(0);

	useLayoutEffect(() => {
		if (mainRef.current) {
			mainRef.current.scrollTop = editorPageSection ? 0 : listScrollTop.current;
		}
	}, [editorPageSection]);

	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const handleSidebarExpand = useCallback(() => setSidebarCollapsed(false), []);
	const isMobile = !useMediaQuery("(min-width: 769px)");
	const sidebarDrawer = useDisclosure();
	const handleDrawerClose = useCallback(
		() => sidebarDrawer.onClose(),
		[sidebarDrawer],
	);
	useSheetSwipeToClose();

	useEffect(() => {
		if (typeof document === "undefined" || !document.body) return;
		if (sidebarCollapsed && !isMobile) {
			document.body.setAttribute("data-sidebar-collapsed", "true");
		} else {
			document.body.removeAttribute("data-sidebar-collapsed");
		}
		return () => {
			document.body?.removeAttribute("data-sidebar-collapsed");
		};
	}, [sidebarCollapsed, isMobile]);

	const { t, i18n } = useTranslation();
	const { userData, getUserIsSuccess, getUserIsError } = useGetUser();
	const activeLoadingCount = useShellLoading(
		(state) => Object.keys(state.activeScopes).length,
	);
	const [shellBootSettled, setShellBootSettled] = useState(false);
	const [shellReady, setShellReady] = useState(false);
	const [bannersVisible, setBannersVisible] = useState(false);
	const shellReadyAtRef = useRef<number | null>(null);

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => {
			setShellBootSettled(true);
		});
		return () => window.cancelAnimationFrame(frame);
	}, []);

	useLayoutEffect(() => {
		if (shellReady) return;
		if (!shellBootSettled) return;
		if (!getUserIsSuccess && !getUserIsError) return;
		if (activeLoadingCount > 0) return;
		shellReadyAtRef.current = Date.now();
		setShellReady(true);
	}, [
		shellReady,
		shellBootSettled,
		getUserIsSuccess,
		getUserIsError,
		activeLoadingCount,
	]);

	const isShellLoading = !shellReady;
	const canSeeSponsors = false;

	useEffect(() => {
		if (getUserIsSuccess && userData.role) {
			try {
				localStorage.setItem("rb-user-role", userData.role);
			} catch {}
		}
	}, [getUserIsSuccess, userData.role]);

	const sponsorsQuery = useQuery({
		queryKey: ["sponsors"],
		queryFn: getSponsors,
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
		retry: false,
		enabled: canSeeSponsors,
		initialData: () => {
			try {
				const raw = sessionStorage.getItem("rb-sponsors-cache");
				return raw ? JSON.parse(raw) : undefined;
			} catch {
				return undefined;
			}
		},
		initialDataUpdatedAt: 0,
	});

	useEffect(() => {
		if (sponsorsQuery.data && canSeeSponsors) {
			try {
				sessionStorage.setItem(
					"rb-sponsors-cache",
					JSON.stringify(sponsorsQuery.data),
				);
			} catch {}
		}
	}, [sponsorsQuery.data]);

	const sponsorData = canSeeSponsors ? sponsorsQuery.data : undefined;
	const sponsorHeaderItems = useMemo(
		() =>
			(sponsorData?.header ?? []).slice(0, 3).map((asset: SponsorAsset) => ({
				id: asset.id,
				src: asset.image_url,
				alt: asset.alt || asset.label || "Sponsor",
				href: asset.target_url,
				label: asset.label,
				isSponsor: true,
			})),
		[sponsorData?.header],
	);
	const sponsorHeaderMobileItems = useMemo(
		() =>
			(sponsorData?.header_mobile ?? [])
				.slice(0, 3)
				.map((asset: SponsorAsset) => ({
					id: asset.id,
					src: asset.image_url,
					alt: asset.alt || asset.label || "Sponsor",
					href: asset.target_url,
					label: asset.label,
					isSponsor: true,
				})),
		[sponsorData?.header_mobile],
	);
	const sponsorSidebarLogoItems = useMemo(() => {
		const extra = sponsorData as unknown as
			| { sidebarLogo?: SponsorAsset[] }
			| undefined;
		const rawLogoList: SponsorAsset[] = [
			...(sponsorData?.sidebar_logo ?? []),
			...(extra?.sidebarLogo ?? []),
			...(sponsorData?.sidebar ?? []).filter(
				(a: SponsorAsset) => a.placement === "sidebar_logo",
			),
		];
		return rawLogoList
			.filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
			.slice(0, 5);
	}, [sponsorData]);
	const sponsorSidebarBanners = useMemo(
		() =>
			(sponsorData?.sidebar ?? [])
				.filter((a: SponsorAsset) => a.placement !== "sidebar_logo")
				.slice(0, 5),
		[sponsorData?.sidebar],
	);
	const mobileHeaderItems = useMemo(
		() =>
			sponsorHeaderMobileItems.length > 0
				? sponsorHeaderMobileItems
				: sponsorHeaderItems,
		[sponsorHeaderMobileItems, sponsorHeaderItems],
	);

	const hasAnimatedBanners =
		sponsorHeaderItems.length > 0 ||
		mobileHeaderItems.length > 0 ||
		sponsorSidebarBanners.length > 0;

	useEffect(() => {
		if (!shellReady || bannersVisible || !hasAnimatedBanners) return;
		const elapsed = shellReadyAtRef.current
			? Date.now() - shellReadyAtRef.current
			: 0;
		const remaining = Math.max(0, 1000 - elapsed);
		let outerRaf = 0;
		let innerRaf = 0;
		const timer = window.setTimeout(() => {
			outerRaf = window.requestAnimationFrame(() => {
				innerRaf = window.requestAnimationFrame(() => {
					setBannersVisible(true);
				});
			});
		}, remaining);
		return () => {
			window.clearTimeout(timer);
			window.cancelAnimationFrame(outerRaf);
			window.cancelAnimationFrame(innerRaf);
		};
	}, [shellReady, bannersVisible, hasAnimatedBanners]);

	const navigate = useNavigate();
	const location = useLocation();
	const [activeLocationHash, setActiveLocationHash] = useState(
		() => window.location.hash,
	);
	const isRTL = i18n.dir(i18n.language) === "rtl";
	const contentRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const syncHash = () => setActiveLocationHash(window.location.hash);
		setActiveLocationHash(location.hash);
		window.addEventListener("hashchange", syncHash);
		return () => window.removeEventListener("hashchange", syncHash);
	}, [location.hash]);

	const breadcrumbItems = useMemo(
		() =>
			computeBreadcrumbItems(
				location.pathname,
				activeLocationHash,
				editorPageTitle,
				t,
			),
		[location.pathname, activeLocationHash, editorPageTitle, t],
	);

	useEffect(() => {
		const node = contentRef.current;
		if (!node || !isMobile) return;
		let startX = 0;
		let startY = 0;
		let tracking = false;
		const edgeSize = 24;
		const minSwipe = 60;

		const isFormField = (target: EventTarget | null) => {
			if (!(target instanceof HTMLElement)) return false;
			const tag = target.tagName.toLowerCase();
			return (
				tag === "input" ||
				tag === "textarea" ||
				tag === "select" ||
				target.isContentEditable
			);
		};

		const handleTouchStart = (event: TouchEvent) => {
			if (!isMobile || sidebarDrawer.isOpen) return;
			if (event.touches.length !== 1) return;
			if (isFormField(event.target)) return;
			const touch = event.touches[0];
			startX = touch.clientX;
			startY = touch.clientY;
			const isEdgeStart = isRTL
				? window.innerWidth - startX <= edgeSize
				: startX <= edgeSize;
			tracking = isEdgeStart;
		};

		const handleTouchMove = (event: TouchEvent) => {
			if (!tracking) return;
			const touch = event.touches[0];
			const dx = touch.clientX - startX;
			const dy = touch.clientY - startY;
			if (Math.abs(dy) > 20 && Math.abs(dy) > Math.abs(dx)) {
				tracking = false;
				return;
			}
			const shouldOpen = isRTL ? dx < -minSwipe : dx > minSwipe;
			if (shouldOpen) {
				tracking = false;
				sidebarDrawer.onOpen();
			}
		};

		const handleTouchEnd = () => {
			tracking = false;
		};

		node.addEventListener("touchstart", handleTouchStart, { passive: true });
		node.addEventListener("touchmove", handleTouchMove, { passive: true });
		node.addEventListener("touchend", handleTouchEnd);
		node.addEventListener("touchcancel", handleTouchEnd);
		return () => {
			node.removeEventListener("touchstart", handleTouchStart);
			node.removeEventListener("touchmove", handleTouchMove);
			node.removeEventListener("touchend", handleTouchEnd);
			node.removeEventListener("touchcancel", handleTouchEnd);
		};
	}, [isMobile, isRTL, sidebarDrawer]);

	return (
		<>
			<div aria-hidden="true" className="hidden">
				<ThemeSelector minimal trigger="icon" />
			</div>
			<div
				dir={isRTL ? "rtl" : "ltr"}
				className={cn(
					"flex h-[100dvh] max-h-[100dvh] min-h-[100dvh] overflow-hidden bg-[var(--nora-panel-bg)] min-[769px]:h-[100vh] min-[769px]:max-h-[100vh] min-[769px]:min-h-[100vh]",
					isRTL ? "flex-row-reverse" : "flex-row",
				)}
				style={
					{
						"--rb-sidebar-offset": isMobile
							? "0px"
							: sidebarCollapsed
								? "68px"
								: "var(--rb-sidebar-width, 240px)",
					} as CSSProperties
				}
			>
				{!isMobile ? (
					<AppSidebar
						collapsed={sidebarCollapsed}
						loading={isShellLoading}
						bannerVisible={bannersVisible}
						sponsors={sponsorSidebarLogoItems}
						sidebarBanners={sponsorSidebarBanners}
						onRequestExpand={handleSidebarExpand}
						onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
					/>
				) : null}

				<div
					ref={contentRef}
					className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--nora-panel-bg)] transition-[margin] duration-[220ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
					style={{
						marginLeft:
							isMobile || isRTL
								? "0px"
								: sidebarCollapsed
									? "68px"
									: "var(--rb-sidebar-width, 240px)",
						marginRight:
							isMobile || !isRTL
								? "0px"
								: sidebarCollapsed
									? "68px"
									: "var(--rb-sidebar-width, 240px)",
					}}
				>
					{isMobile ? (
						<AppHeader
							sidebarCollapsed={sidebarCollapsed}
							onToggleSidebar={() => sidebarDrawer.onOpen()}
							isMobile={isMobile}
							isShellLoading={isShellLoading}
							breadcrumbItems={breadcrumbItems}
							sponsorHeaderItems={sponsorHeaderItems}
							mobileHeaderItems={mobileHeaderItems}
							bannersVisible={bannersVisible}
							onNavigate={(path) => navigate(path)}
						/>
					) : null}

					<main
						ref={mainRef}
						onScroll={(event) => {
							if (!editorPageSection) {
								listScrollTop.current = event.currentTarget.scrollTop;
							}
						}}
						className="min-h-0 flex-1 overflow-auto overscroll-contain bg-transparent p-3 pt-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+88px)] min-[769px]:p-5"
					>
						<div className={cn("flex min-h-full flex-col", editorPageSection && "hidden")}>
							<Outlet />
						</div>
						<div
							id={EDITOR_PAGE_ID}
							className={cn(!editorPageSection && "hidden")}
						/>
					</main>
				</div>

				{isMobile ? (
					<MobileNav
						isDrawerOpen={sidebarDrawer.isOpen}
						onCloseDrawer={handleDrawerClose}
						sponsors={sponsorSidebarLogoItems}
						sidebarBanners={sponsorSidebarBanners}
						isShellLoading={isShellLoading}
					/>
				) : null}
			</div>
		</>
	);
}

export function AppLayout() {
	return (
		<NotificationProvider>
			<AppLayoutContent />
		</NotificationProvider>
	);
}

export default AppLayout;
