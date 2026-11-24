import { Check, ChevronLeft, ChevronRight, Copy, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { type FC, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "components/ui/tabs";
import { useBreakpointValue } from "hooks/useBreakpointValue";
import { cn } from "lib/cn";
import { getSwipeTargetIndex } from "utils/carousel";
import { copyTextToClipboard } from "utils/clipboard";
import { getConfigLabelFromLink } from "utils/configLabel";
import { useDashboard } from "../contexts/DashboardContext";

type QRCopyPanelProps = {
	value: string;
	size: number;
	/** Accessible name for the QR, which copies on click. */
	label: string;
	/** Set on the carousel only: a horizontal swipe moves to another config. */
	onSwipe?: (delta: number) => void;
};

/**
 * A QR code that copies its value on click, with the value and an explicit copy button
 * under it. The copy state lives here, so callers remount it (via `key`) to reset it.
 */
const QRCopyPanel = ({ value, size, label, onSwipe }: QRCopyPanelProps) => {
	const { t } = useTranslation();
	const [copied, setCopied] = useState(false);
	const qrRef = useRef<HTMLButtonElement>(null);
	const touchStartX = useRef<number | null>(null);
	// A swipe can end on the QR; the click that follows it must not copy.
	const swiped = useRef(false);

	useEffect(() => {
		if (!copied) return undefined;
		const timer = window.setTimeout(() => setCopied(false), 1500);
		return () => window.clearTimeout(timer);
	}, [copied]);

	const copyText = () =>
		copyTextToClipboard(value)
			.then(() => setCopied(true))
			.catch(() => undefined);

	// Clicking the QR copies the picture itself; without image clipboard support it falls back to the link text.
	const copyQrImage = async () => {
		const canvas = qrRef.current?.querySelector("canvas");
		if (!canvas || !navigator.clipboard?.write) return copyText();
		const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
		if (!blob) return copyText();
		await navigator.clipboard
			.write([new ClipboardItem({ "image/png": blob })])
			.then(() => setCopied(true))
			.catch(() => undefined);
	};

	return (
		<div className="flex w-full flex-col items-center gap-4">
			<button
				ref={qrRef}
				type="button"
				aria-label={label}
				onClick={() => {
					if (swiped.current) {
						swiped.current = false;
						return;
					}
					void copyQrImage();
				}}
				onTouchStart={(event) => {
					touchStartX.current = event.touches[0]?.clientX ?? null;
					swiped.current = false;
				}}
				onTouchEnd={(event) => {
					const startX = touchStartX.current;
					touchStartX.current = null;
					if (startX === null || !onSwipe) return;
					const delta = (event.changedTouches[0]?.clientX ?? startX) - startX;
					if (Math.abs(delta) < 40) return;
					swiped.current = true;
					onSwipe(delta);
				}}
				className="rounded-2xl border border-white/10 bg-white p-3.5 shadow-xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-cyan-400"
			>
				<QRCodeCanvas value={value} size={size} level="M" includeMargin={false} />
			</button>
			<div className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2">
				<p dir="ltr" title={value} className="min-w-0 flex-1 truncate font-mono text-xs text-[#8b949e]">
					{value}
				</p>
				<button
					type="button"
					onClick={() => void copyText()}
					className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0 gap-1.5 hover:border-cyan-500/50 hover:bg-cyan-500/10")}
				>
					{copied ? <Check className="size-4 text-cyan-400" /> : <Copy className="size-4" />}
					{copied ? t("copied") : t("copy")}
				</button>
			</div>
		</div>
	);
};

/** Subscription and per-config QR codes for one user, shown in a shadcn dialog. */
export const QRCodeDialog: FC = () => {
	const { t } = useTranslation();
	const QRcodeLinks = useDashboard((state) => state.QRcodeLinks);
	const qrCodeUsername = useDashboard((state) => state.qrCodeUsername);
	const setQRCode = useDashboard((state) => state.setQRCode);
	const setSubLink = useDashboard((state) => state.setSubLink);
	const subscribeUrl = useDashboard((state) => state.subscribeUrl);
	const [configIndex, setConfigIndex] = useState(0);
	const qrSize = useBreakpointValue({ base: 200, sm: 220 }) ?? 200;

	const configItems = useMemo(
		() =>
			(QRcodeLinks ?? []).map((link, itemIndex) => ({
				link,
				label:
					getConfigLabelFromLink(link) ||
					t("userDialog.links.configFallback", { index: itemIndex + 1 }),
			})),
		[QRcodeLinks, t],
	);

	const activeIndex = Math.min(configIndex, Math.max(configItems.length - 1, 0));
	const activeConfig = configItems[activeIndex];
	const hasSubscription = Boolean(subscribeUrl);
	const subscribeQrLink = String(subscribeUrl).startsWith("/")
		? window.location.origin + subscribeUrl
		: String(subscribeUrl);

	const onClose = () => {
		setQRCode(null);
		setSubLink(null);
	};

	const stepConfig = (step: number) =>
		setConfigIndex((current) => (current + step + configItems.length) % configItems.length);

	const subscriptionView = (
		<QRCopyPanel value={subscribeQrLink} size={qrSize} label={t("a11y.copySubscriptionLink")} />
	);

	const configsView = activeConfig && (
		<div className="flex w-full flex-col gap-4">
			<div className="flex items-center justify-between gap-3">
				<button
					type="button"
					aria-label={t("a11y.previous")}
					disabled={configItems.length < 2}
					onClick={() => stepConfig(-1)}
					className={buttonVariants({ variant: "outline", size: "icon" })}
				>
					<ChevronLeft className="rtl:rotate-180" />
				</button>
				<div className="min-w-0 text-center">
					<p className="truncate text-sm font-semibold text-white">{activeConfig.label}</p>
					<p className="text-xs tabular-nums text-[#8b949e]">
						{activeIndex + 1} / {configItems.length}
					</p>
				</div>
				<button
					type="button"
					aria-label={t("a11y.next")}
					disabled={configItems.length < 2}
					onClick={() => stepConfig(1)}
					className={buttonVariants({ variant: "outline", size: "icon" })}
				>
					<ChevronRight className="rtl:rotate-180" />
				</button>
			</div>
			<QRCopyPanel
				key={activeIndex}
				value={activeConfig.link}
				size={qrSize}
				label={t("a11y.copyConfig")}
				onSwipe={
					configItems.length > 1
						? (delta) => setConfigIndex((current) => getSwipeTargetIndex(current, configItems.length, delta))
						: undefined
				}
			/>
		</div>
	);

	const renderBody = () => {
		if (hasSubscription && configItems.length > 0) {
			return (
				<Tabs defaultValue="subscription" className="w-full">
					<TabsList className="w-full bg-[#0d1117] border border-white/[0.08] p-1">
						<TabsTrigger value="subscription">{t("userDialog.links.subscription")}</TabsTrigger>
						<TabsTrigger value="configs">{t("userDialog.links.configs")}</TabsTrigger>
					</TabsList>
					<TabsContent value="subscription" className="pt-5">
						{subscriptionView}
					</TabsContent>
					<TabsContent value="configs" className="pt-5">
						{configsView}
					</TabsContent>
				</Tabs>
			);
		}
		if (hasSubscription) return subscriptionView;
		if (configsView) return configsView;
		return (
			<p className="py-6 text-center text-sm text-[#8b949e]">{t("userDialog.links.noConfigs")}</p>
		);
	};

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="max-h-[min(600px,calc(100dvh-5rem))] gap-0 overflow-hidden p-0 sm:max-w-md rounded-[20px] border border-white/[0.08] bg-[#161b22] text-white shadow-2xl">
				<DialogHeader className="flex-row items-center gap-3 border-b border-white/[0.06] px-6 py-4 pe-12 text-start sm:text-start">
					<div className="size-9 shrink-0 rounded-xl flex items-center justify-center badge-soft-cyan text-cyan-400 [&_svg]:size-5">
						<QrCode />
					</div>
					<div className="min-w-0">
						<DialogTitle className="text-base font-semibold text-white tracking-tight">{t("usersTable.qrCode")}</DialogTitle>
						{qrCodeUsername && (
							<DialogDescription dir="ltr" className="truncate text-start text-xs text-[#8b949e]">
								{qrCodeUsername}
							</DialogDescription>
						)}
					</div>
				</DialogHeader>
				<div className="overflow-y-auto px-6 py-5">{renderBody()}</div>
			</DialogContent>
		</Dialog>
	);
};
