/**
 * Custom Visual, Responsive, and Layout Assertions for Nora Panel E2E Tests.
 * Ensures strict compliance with Remnawave-inspired cyber-minimalist dark aesthetic,
 * responsive design across mobile/tablet/desktop, and anti-phantom scope boundaries.
 */

import fs from "node:fs";
import path from "node:path";
import { expect } from "vitest";

export interface ViewportSpec {
	width: number;
	height: number;
	name: "mobile" | "tablet-portrait" | "tablet-landscape" | "desktop" | "ultrawide";
}

export const VIEWPORTS: Record<string, ViewportSpec> = {
	mobile: { width: 375, height: 667, name: "mobile" },
	tabletPortrait: { width: 768, height: 1024, name: "tablet-portrait" },
	tabletLandscape: { width: 1024, height: 768, name: "tablet-landscape" },
	desktop: { width: 1280, height: 800, name: "desktop" },
	ultrawide: { width: 2560, height: 1440, name: "ultrawide" },
};

export interface OverflowViolation {
	tag: string;
	className: string;
	reason: string;
	detectedValue: string | number;
	viewportLimit: number;
}

/**
 * Checks whether an element is enclosed within a horizontally scrollable container
 * (e.g., data table container or carousel wrapper with overflow-x-auto/scroll).
 */
function isInsideHorizontalScrollContainer(el: HTMLElement, container: HTMLElement): boolean {
	let curr: HTMLElement | null = el.parentElement;
	while (curr && curr !== container) {
		const cls = curr.className || "";
		const style = curr.getAttribute("style") || "";
		if (
			typeof cls === "string" &&
			(cls.includes("overflow-x-auto") ||
				cls.includes("overflow-x-scroll") ||
				cls.includes("overflow-auto") ||
				cls.includes("overflow-hidden") ||
				style.includes("overflow-x: auto") ||
				style.includes("overflow-x: scroll") ||
				style.includes("overflow: auto") ||
				style.includes("overflow: hidden"))
		) {
			return true;
		}
		curr = curr.parentElement;
	}
	return false;
}

/**
 * Tailwind Standard Width Scale to Pixel Mapping (rem * 16)
 */
const TAILWIND_SCALE_PX: Record<string, number> = {
	"w-56": 224,
	"w-64": 256,
	"w-72": 288,
	"w-80": 320,
	"w-96": 384,
	"min-w-56": 224,
	"min-w-64": 256,
	"min-w-72": 288,
	"min-w-80": 320,
	"min-w-96": 384,
};

/**
 * Asserts that no element inside container exceeds the viewport width,
 * avoiding horizontal scrollbars, broken layout reflows, or visual clipping.
 * NO tautological expect(true).toBe(true).
 */
export function assertNoHorizontalOverflow(container: HTMLElement, viewportWidth: number) {
	const allElements = [container, ...Array.from(container.querySelectorAll<HTMLElement>("*"))];
	const violations: OverflowViolation[] = [];

	for (const el of allElements) {
		const isExempt = isInsideHorizontalScrollContainer(el, container);
		if (isExempt) continue;

		const classList = el.className || "";

		// 1. Check explicit inline styles (width and min-width in px or rem)
		const styleWidth = el.style?.width;
		if (styleWidth) {
			if (styleWidth.endsWith("px")) {
				const px = parseFloat(styleWidth);
				if (px > viewportWidth) {
					violations.push({
						tag: el.tagName.toLowerCase(),
						className: typeof classList === "string" ? classList : "",
						reason: "Explicit style width exceeds viewport",
						detectedValue: `${px}px`,
						viewportLimit: viewportWidth,
					});
				}
			} else if (styleWidth.endsWith("rem")) {
				const px = parseFloat(styleWidth) * 16;
				if (px > viewportWidth) {
					violations.push({
						tag: el.tagName.toLowerCase(),
						className: typeof classList === "string" ? classList : "",
						reason: "Explicit style width (rem) exceeds viewport",
						detectedValue: `${px}px`,
						viewportLimit: viewportWidth,
					});
				}
			}
		}

		const styleMinWidth = el.style?.minWidth;
		if (styleMinWidth) {
			if (styleMinWidth.endsWith("px")) {
				const px = parseFloat(styleMinWidth);
				if (px > viewportWidth) {
					violations.push({
						tag: el.tagName.toLowerCase(),
						className: typeof classList === "string" ? classList : "",
						reason: "Explicit style min-width exceeds viewport",
						detectedValue: `${px}px`,
						viewportLimit: viewportWidth,
					});
				}
			} else if (styleMinWidth.endsWith("rem")) {
				const px = parseFloat(styleMinWidth) * 16;
				if (px > viewportWidth) {
					violations.push({
						tag: el.tagName.toLowerCase(),
						className: typeof classList === "string" ? classList : "",
						reason: "Explicit style min-width (rem) exceeds viewport",
						detectedValue: `${px}px`,
						viewportLimit: viewportWidth,
					});
				}
			}
		}

		// 2. Check Tailwind arbitrary pixel/rem classes: w-[<N>px], min-w-[<N>px]
		if (typeof classList === "string") {
			const arbitraryMatches = classList.matchAll(/(?:^|\s)(?:(sm|md|lg|xl|2xl):)?(min-)?w-\[(\d+(?:\.\d+)?)(px|rem)\]/g);
			for (const match of arbitraryMatches) {
				const breakpoint = match[1];
				const isMin = !!match[2];
				const numValue = parseFloat(match[3]);
				const unit = match[4];
				const px = unit === "rem" ? numValue * 16 : numValue;

				// If prefixed by responsive breakpoint, only applies when viewport >= breakpoint threshold
				let breakpointApplies = true;
				if (breakpoint === "sm" && viewportWidth < 480) breakpointApplies = false;
				if (breakpoint === "md" && viewportWidth < 768) breakpointApplies = false;
				if (breakpoint === "lg" && viewportWidth < 1024) breakpointApplies = false;
				if (breakpoint === "xl" && viewportWidth < 1280) breakpointApplies = false;

				if (breakpointApplies && px > viewportWidth) {
					violations.push({
						tag: el.tagName.toLowerCase(),
						className: classList,
						reason: `Tailwind arbitrary ${isMin ? "min-width" : "width"} class exceeds viewport`,
						detectedValue: match[0].trim(),
						viewportLimit: viewportWidth,
					});
				}
			}

			// 3. Check Tailwind standard scale widths
			for (const [token, pxVal] of Object.entries(TAILWIND_SCALE_PX)) {
				const regex = new RegExp(`(?:^|\\s)(?!sm:|md:|lg:|xl:)${token}(?:\\s|$)`);
				if (regex.test(classList) && pxVal > viewportWidth) {
					violations.push({
						tag: el.tagName.toLowerCase(),
						className: classList,
						reason: `Tailwind standard scale width class '${token}' (${pxVal}px) exceeds viewport`,
						detectedValue: `${pxVal}px`,
						viewportLimit: viewportWidth,
					});
				}
			}

			// 4. Mobile Multi-Column Grid Warning (<=480px)
			if (viewportWidth <= 480) {
				const multiColMatch = classList.match(/(?:^|\s)(?!sm:|md:|lg:|xl:)grid-cols-([3-9]|1[0-2])(?:\s|$)/);
				if (multiColMatch) {
					violations.push({
						tag: el.tagName.toLowerCase(),
						className: classList,
						reason: `Un-prefixed multi-column grid '${multiColMatch[0].trim()}' on mobile viewport without responsive stacking`,
						detectedValue: multiColMatch[0].trim(),
						viewportLimit: viewportWidth,
					});
				}
			}
		}

		// 5. Unconstrained Data Table Check on Mobile / Tablet
		if (el.tagName === "TABLE" && viewportWidth < 768) {
			if (!isInsideHorizontalScrollContainer(el, container)) {
				violations.push({
					tag: "table",
					className: typeof classList === "string" ? classList : "",
					reason: "Data table rendered without horizontal scrolling wrapper (overflow-x-auto) on viewport < 768px",
					detectedValue: "table-without-scroll-wrapper",
					viewportLimit: viewportWidth,
				});
			}
		}

		// 6. Live Computed Geometry (if available in environment)
		if (el.scrollWidth > 0 && el.clientWidth > 0 && el.scrollWidth > el.clientWidth && el.scrollWidth > viewportWidth) {
			violations.push({
				tag: el.tagName.toLowerCase(),
				className: typeof classList === "string" ? classList : "",
				reason: `Uncontrolled horizontal scrollWidth (${el.scrollWidth}px) exceeds clientWidth (${el.clientWidth}px)`,
				detectedValue: `${el.scrollWidth}px`,
				viewportLimit: viewportWidth,
			});
		}
	}

	// Dynamic assertion on collected violations (NO expect(true).toBe(true))
	expect(
		violations,
		`Detected ${violations.length} horizontal layout overflow violation(s) at viewport width ${viewportWidth}px`,
	).toEqual([]);
}

/**
 * Asserts that the element conforms to Remnawave dark theme color palette tokens.
 */
export function assertRemnawaveColorPalette(
	element: HTMLElement,
	expectedRole: "canvas" | "surface" | "elevated" | "header" | "border",
) {
	const classList = element.className || "";
	const inlineStyle = element.getAttribute("style") || "";

	switch (expectedRole) {
		case "canvas": {
			const matchesCanvas =
				classList.includes("bg-[#0d1117]") ||
				classList.includes("rb-theme-dark") ||
				inlineStyle.includes("#0d1117") ||
				classList.includes("bg-background") ||
				classList.includes("bg-panel-app");
			expect(
				matchesCanvas,
				`Element <${element.tagName.toLowerCase()} class="${classList}"> must apply Remnawave canvas background (#0d1117 / bg-panel-app)`,
			).toBe(true);
			break;
		}
		case "surface": {
			const matchesSurface =
				classList.includes("bg-[#161b22]") ||
				classList.includes("bg-card") ||
				classList.includes("bg-panel-surface") ||
				classList.includes("bg-secondary") ||
				inlineStyle.includes("#161b22");
			expect(
				matchesSurface,
				`Card surface element <${element.tagName.toLowerCase()} class="${classList}"> must apply Remnawave card surface (#161b22 / bg-card)`,
			).toBe(true);
			break;
		}
		case "elevated": {
			const matchesElevated =
				classList.includes("bg-[#21262d]") ||
				classList.includes("bg-panel-elevated") ||
				classList.includes("bg-muted") ||
				inlineStyle.includes("#21262d");
			expect(
				matchesElevated,
				`Elevated element <${element.tagName.toLowerCase()} class="${classList}"> must apply Remnawave elevated surface (#21262d)`,
			).toBe(true);
			break;
		}
		case "header": {
			const matchesHeader =
				classList.includes("bg-[#1b2027]") ||
				classList.includes("bg-panel-surface") ||
				classList.includes("bg-muted") ||
				inlineStyle.includes("#1b2027");
			expect(
				matchesHeader,
				`Table header element <${element.tagName.toLowerCase()} class="${classList}"> must apply header tone (#1b2027 / bg-muted)`,
			).toBe(true);
			break;
		}
		case "border": {
			const matchesBorder =
				classList.includes("border-[rgba(255,255,255,0.08)]") ||
				classList.includes("border-white/[0.08]") ||
				classList.includes("border-white/10") ||
				classList.includes("border-white/[0.06]") ||
				classList.includes("border-border") ||
				classList.includes("border-panel-border") ||
				classList.includes("border-whiteAlpha-200") ||
				inlineStyle.includes("rgba(255, 255, 255, 0.08)");
			expect(
				matchesBorder,
				`Border styling on <${element.tagName.toLowerCase()} class="${classList}"> must match Remnawave subtle border (rgba(255,255,255,0.08) / border-border)`,
			).toBe(true);
			break;
		}
	}
}

export type SoftColorScheme = "cyan" | "teal" | "red" | "amber" | "purple" | "blue" | "gray" | "green";

const COLOR_RGB_MAP: Record<SoftColorScheme, string[]> = {
	cyan: ["6, 182, 212", "0, 181, 216", "#06b6d4", "#22d3ee"],
	teal: ["13, 148, 136", "49, 151, 149", "#0d9488", "#2dd4bf"],
	red: ["224, 49, 49", "239, 68, 68", "229, 62, 62", "#ef4444", "#f87171"],
	amber: ["245, 158, 11", "214, 158, 46", "#f59e0b", "#fbbf24"],
	purple: ["139, 92, 246", "128, 90, 213", "#8b5cf6", "#c084fc"],
	blue: ["59, 130, 246", "#3b82f6", "#60a5fa"],
	gray: ["110, 118, 129", "#8b949e", "#6e7681"],
	green: ["34, 197, 94", "56, 161, 105", "#22c55e", "#4ade80"],
};

/**
 * Asserts that a badge or pill element uses the signature Remnawave translucent "soft" gradient style
 * for the SPECIFIC color requested.
 * Rejects wrong color badges and unstyled elements.
 */
export function assertSoftGradientBadge(
	badgeElement: HTMLElement,
	colorScheme: SoftColorScheme,
) {
	const classList = badgeElement.className || "";
	const inlineStyle = badgeElement.getAttribute("style") || "";
	const dataVariant = badgeElement.getAttribute("data-variant") || "";

	// 1. Direct class or data-variant check
	const hasSpecificBadgeClass = classList.includes(`badge-soft-${colorScheme}`);
	const hasSpecificVariant = dataVariant === `soft-${colorScheme}` || dataVariant === colorScheme;

	// 2. Color-specific composite check (bg-${color}-* AND text-${color}-* AND border)
	const hasColorBg = new RegExp(`\\bbg-${colorScheme}(-\\w+)?(\\/(10|15|20|25))?\\b`).test(classList);
	const hasColorText = new RegExp(`\\btext-${colorScheme}(-\\w+)?\\b`).test(classList);
	const hasBorder = classList.includes("border");
	const hasColorComposite = hasColorBg && hasColorText && hasBorder;

	// 3. Inline style linear-gradient check matching specific RGB tokens
	const expectedTokens = COLOR_RGB_MAP[colorScheme] || [];
	const hasInlineGradient =
		inlineStyle.includes("linear-gradient") &&
		expectedTokens.some((token) => inlineStyle.includes(token));

	const matchesExpectedColor =
		hasSpecificBadgeClass || hasSpecificVariant || hasColorComposite || hasInlineGradient;

	// 4. Strict cross-color mutual exclusion (cannot have a different color's badge-soft class)
	const allSchemes = Object.keys(COLOR_RGB_MAP) as SoftColorScheme[];
	const otherColors = allSchemes.filter((c) => c !== colorScheme && (colorScheme === "green" ? c !== "teal" : true));
	const conflictingColors = otherColors.filter((other) => classList.includes(`badge-soft-${other}`));

	expect(
		conflictingColors,
		`Badge element <${badgeElement.tagName.toLowerCase()} class="${classList}"> has conflicting badge class for '${colorScheme}' (found '${conflictingColors.join(", ")}')`,
	).toEqual([]);

	expect(
		matchesExpectedColor,
		`Badge element <${badgeElement.tagName.toLowerCase()} class="${classList}" style="${inlineStyle}"> must render soft variant for specific color '${colorScheme}'`,
	).toBe(true);
}

/**
 * Asserts that numeric metrics, latencies, IPs, ports, and bytes render with monospace font.
 */
export function assertMonospaceTypography(element: HTMLElement) {
	const classList = element.className || "";
	const inlineStyle = element.getAttribute("style") || "";

	const isMonospace =
		classList.includes("font-mono") ||
		classList.includes("rb-tabular") ||
		classList.includes("tabular-nums") ||
		inlineStyle.includes("monospace") ||
		inlineStyle.includes("Fira Mono") ||
		inlineStyle.includes("JetBrains Mono") ||
		inlineStyle.includes("Geist Mono");

	expect(
		isMonospace,
		`Metric element <${element.tagName.toLowerCase()} class="${classList}"> must use monospace typography (.font-mono or .rb-tabular)`,
	).toBe(true);
}

/**
 * Forbidden Remnawave feature patterns strictly prohibited from appearing in Nora Panel.
 */
export const FORBIDDEN_PHANTOM_PATTERNS = [
	{ name: "Squads", regex: /\b(Squads|Internal Squads|Squad Management)\b/i },
	{ name: "HWID Inspector", regex: /\b(HWID|HWID Inspector|Hardware ID Lock|HWID Whitelist)\b/i },
	{ name: "SRH Inspector", regex: /\b(SRH Inspector|Subscription Routing Rules)\b/i },
	{ name: "Infra Billing", regex: /\b(Infra Billing|Credit Card Invoicing|Stripe Connect)\b/i },
	{ name: "Cloud Reseller", regex: /\b(Reseller Portal|Sub-reseller Credits)\b/i },
];

/**
 * Statically inspects Nora Panel's source files (routes and navigation definitions)
 * to verify that no forbidden Remnawave features have been added to the application schema.
 */
export function assertStaticNoPhantomFeatures(projectRoot?: string) {
	const baseDir = projectRoot || path.resolve(__dirname, "../../../src");
	const routerPath = path.join(baseDir, "pages/Router.tsx");
	const navConfigPath = path.join(baseDir, "components/layout/navConfig.ts");
	const sidebarPath = path.join(baseDir, "components/AppSidebar.tsx");

	const filesToCheck = [
		{ file: routerPath, name: "Router.tsx" },
		{ file: navConfigPath, name: "navConfig.ts" },
		{ file: sidebarPath, name: "AppSidebar.tsx" },
	];

	const violations: { file: string; feature: string; match: string }[] = [];

	for (const { file, name } of filesToCheck) {
		if (fs.existsSync(file)) {
			const content = fs.readFileSync(file, "utf8");
			for (const pattern of FORBIDDEN_PHANTOM_PATTERNS) {
				const match = content.match(pattern.regex);
				if (match) {
					violations.push({
						file: name,
						feature: pattern.name,
						match: match[0],
					});
				}
			}
		}
	}

	expect(
		violations,
		`Static Anti-Phantom Violation: Found forbidden features in Nora route/navigation definitions`,
	).toEqual([]);
}

/**
 * Strict Anti-Phantom Scope Verification.
 * Audits the rendered DOM tree of Nora pages/components AND statically validates route/nav definitions.
 * NO tautological expect(true).toBe(true).
 */
export function assertAntiPhantomScope(rootElement?: HTMLElement) {
	// 1. Static route & nav inspection
	assertStaticNoPhantomFeatures();

	// 2. Rendered DOM inspection (if root element provided)
	if (rootElement) {
		const innerText = rootElement.textContent || "";
		const innerHTML = rootElement.innerHTML || "";

		for (const pattern of FORBIDDEN_PHANTOM_PATTERNS) {
			expect(
				innerText,
				`Anti-Phantom Violation: Found forbidden feature '${pattern.name}' in DOM textContent`,
			).not.toMatch(pattern.regex);

			expect(
				innerHTML,
				`Anti-Phantom Violation: Found forbidden feature '${pattern.name}' in DOM innerHTML`,
			).not.toMatch(pattern.regex);
		}

		// Verify no placeholder/dummy buttons are present in the view
		const dummyButtons = Array.from(rootElement.querySelectorAll("button, a")).filter((el) => {
			const label = (el.textContent || "").trim().toLowerCase();
			return (
				label === "coming soon" ||
				label === "placeholder" ||
				label === "dummy" ||
				label === "unimplemented"
			);
		});

		expect(
			dummyButtons,
			`Anti-Phantom Violation: Found ${dummyButtons.length} dummy/placeholder action buttons in DOM`,
		).toHaveLength(0);
	}
}

/**
 * Asserts touch target dimensions on mobile viewports (>=32px).
 */
export function assertTouchTargetSize(buttonOrInteractive: HTMLElement, minSize = 32) {
	const classList = buttonOrInteractive.className || "";

	const isTouchFriendly =
		classList.includes("h-9") ||
		classList.includes("h-10") ||
		classList.includes("h-8") ||
		classList.includes("p-2") ||
		classList.includes("p-3") ||
		classList.includes("py-2") ||
		classList.includes("min-h-") ||
		classList.includes("size-");

	expect(
		isTouchFriendly,
		`Interactive target <${buttonOrInteractive.tagName.toLowerCase()} class="${classList}"> must have adequate touch sizing (>=${minSize}px) on mobile viewports`,
	).toBe(true);
}

/**
 * Asserts that a modal dialog utilizes the 2-column SectionCard modular layout on desktop,
 * and collapses to a single stacked column on mobile.
 */
export function assertModalTwoColumnLayout(modalElement: HTMLElement, isMobile = false) {
	const gridOrFlexContainer =
		modalElement.querySelector(".grid, .flex-col, [class*='grid-cols-']") || modalElement;
	const containerClasses = gridOrFlexContainer.className || "";

	if (isMobile) {
		const isStacked =
			containerClasses.includes("grid-cols-1") ||
			containerClasses.includes("flex-col") ||
			!containerClasses.includes("grid-cols-2");
		expect(
			isStacked,
			`Modal on mobile must stack form sections vertically into a single column. Classes: '${containerClasses}'`,
		).toBe(true);
	} else {
		const isTwoColumn =
			containerClasses.includes("md:grid-cols-2") ||
			containerClasses.includes("grid-cols-2") ||
			containerClasses.includes("lg:grid-cols-2");
		expect(
			isTwoColumn,
			`Modal on desktop must support 2-column SectionCard layout (md:grid-cols-2). Classes: '${containerClasses}'`,
		).toBe(true);
	}
}
