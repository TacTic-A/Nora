import { TagsSelect } from "components/labels/TagsSelect";
import { saveLabels, useInvalidateLabels, useLabelItems, useTags } from "service/labels";
import { AppleEmojiText } from "components/common/AppleEmojiText";
import { Button } from "components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "components/ui/tooltip";
import { Collapsible, CollapsibleContent } from "components/ui/collapsible";
import { Textarea } from "components/ui/textarea";
import { toast } from "components/ui/sonner";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { withClass } from "lib/withClass";
import { cn } from "lib/cn";

import { useSubmitTimers } from "hooks/useSubmitTimers";
import { useClipboard } from "hooks/useClipboard";

import { CheckRow } from "components/ui/check-row";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "components/ui/dialog";
import { nodeEntityPage } from "components/entityPage/EntityOverviews";
import { FormField } from "components/ui/form-field";
import { Input as UiInput } from "components/ui/input";
import { DataSizeField } from "components/ui/data-size-field";
import { NumberField } from "components/ui/number-field";
import { SegmentedControl } from "components/ui/segmented-control";
import { Switch as UiSwitch } from "components/ui/switch";
import { SectionCard } from "components/ui/section-card";
import { zodResolver } from "@hookform/resolvers/zod";
import { Server, Download, Copy, Eye, EyeOff, Globe, KeyRound, Network } from "lucide-react";
import {
	getNodeDefaultValues,
	NodeSchema,
	type NodeType,
} from "contexts/NodesContext";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { type Resolver, Controller, useForm } from "react-hook-form";
import { EmojiShortcodeInput } from "components/common/EmojiShortcodeInput";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
	AnimatedSubmitButton,
	type AnimatedSubmitStatus,
} from "./common/AnimatedSubmitButton";

const EyeIconStyled = withClass(Eye, "w-4 h-4");
const EyeSlashIconStyled = withClass(EyeOff, "w-4 h-4");
const CopyIconStyled = withClass(Copy, "w-4 h-4");
const DownloadIconStyled = withClass(Download, "w-4 h-4");

const BYTES_IN_GB = 1024 * 1024 * 1024;
const getInputError = (error: unknown): string | undefined => {
	if (error && typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message;
		return typeof message === "string" ? message : undefined;
	}
	return undefined;
};

const getFirstInputError = (value: unknown): string | undefined => {
	const direct = getInputError(value);
	if (direct) return direct;
	if (!value || typeof value !== "object") return undefined;
	for (const nested of Object.values(value as Record<string, unknown>)) {
		const message = getFirstInputError(nested);
		if (message) return message;
	}
	return undefined;
};

const optionalPortSchema = z.preprocess(
	(value) => (value === "" || value === null ? undefined : value),
	z.coerce.number().int().min(1).max(65535).optional(),
);

const optionalNullablePortSchema = z.preprocess(
	(value) => (value === "" ? null : value),
	z.coerce.number().int().min(1).max(65535).nullable().optional(),
);

const toValidPort = (value: unknown): number | null => {
	const numeric = Number(value);
	return Number.isInteger(numeric) && numeric >= 1 && numeric <= 65535
		? numeric
		: null;
};

const buildNodeInstallBundle = (
	certificate?: string | null,
	certificateKey?: string | null,
) => {
	const cert = certificate?.trim() ?? "";
	const key = certificateKey?.trim() ?? "";
	if (cert && key) {
		return `${cert}\n${key}\n`;
	}
	return cert;
};

const EditableNodeSchema = z
	.object({
		name: z.string().trim().min(1).max(120),
		note: z.string().max(500).nullable().optional(),
		address: z.string().trim().min(1),
		port: z.coerce.number().int().min(1).max(65535),
		api_port: optionalPortSchema,
		usage_coefficient: z.coerce.number().positive(),
		data_limit: z.number().finite().nonnegative().nullable().optional(),
		proxy_enabled: z.boolean().optional(),
		proxy_type: z.enum(["http", "socks5"]).nullable().optional(),
		proxy_host: z.string().nullable().optional(),
		proxy_port: optionalNullablePortSchema,
		proxy_username: z.string().nullable().optional(),
		proxy_password: z.string().nullable().optional(),
	})
	.superRefine((value, ctx) => {
		if (!value.proxy_enabled) return;
		if (!value.proxy_type) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["proxy_type"],
				message: "Proxy type is required",
			});
		}
		if (!value.proxy_host?.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["proxy_host"],
				message: "Proxy host is required",
			});
		}
		if (value.proxy_port === null || value.proxy_port === undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["proxy_port"],
				message: "Proxy port must be between 1 and 65535",
			});
		}
	});
interface NodeFormModalProps {
	open: boolean;
	onClose: () => void;
	node?: NodeType;
	mutate: (
		data: any,
		options?: {
			onError?: (error: unknown) => void;
			onSuccess?: (data: NodeType) => void;
		},
	) => void;
	loading: boolean;
	isAddMode?: boolean;
	onSubmitSuccess?: (node: NodeType) => void;
}

export const NodeFormModal: FC<NodeFormModalProps> = ({
	open: isOpen,
	onClose,
	node,
	mutate,
	loading: isLoading,
	isAddMode = false,
	onSubmitSuccess,
}) => {
	const { t } = useTranslation();
	
	const [showCertificate, setShowCertificate] = useState(false);
	const [submitStatus, setSubmitStatus] =
		useState<AnimatedSubmitStatus>("idle");
	const { closeTimerRef: successCloseTimerRef, clearSubmitTimers, showSubmitError } = useSubmitTimers(setSubmitStatus);

	const formatDataLimitForInput = useCallback((value?: number | null) => {
		if (value === null || value === undefined) {
			return null;
		}
		const gbValue = value / BYTES_IN_GB;
		if (!Number.isFinite(gbValue)) {
			return null;
		}
		const rounded = Math.round(gbValue * 100) / 100;
		return rounded;
	}, []);

	const convertLimitToBytes = (value?: number | null) =>
		value === null || value === undefined
			? null
			: Math.round(value * BYTES_IN_GB);

	const buildMutationPayload = (data: NodeType) => {
		const apiPort = toValidPort(data.api_port);
		return {
			...(isAddMode ? {} : { id: node?.id ?? data.id }),
			name: data.name,
			note: data.note ?? "",
			address: data.address,
			control_port: Number(data.port),
			...(apiPort ? { api_port: apiPort } : {}),
			usage_coefficient: Number(data.usage_coefficient),
			data_limit: convertLimitToBytes(data.data_limit ?? null),
			proxy_enabled: Boolean(data.proxy_enabled),
			proxy_type: data.proxy_enabled ? data.proxy_type : null,
			proxy_host: data.proxy_enabled ? data.proxy_host : null,
			proxy_port: data.proxy_enabled ? toValidPort(data.proxy_port) : null,
			proxy_username: data.proxy_enabled ? data.proxy_username : null,
			proxy_password: data.proxy_enabled ? data.proxy_password : null,
		};
	};

	const baseDefaults = isAddMode
		? getNodeDefaultValues()
		: {
				...getNodeDefaultValues(),
				...node,
			};

	// The submit handler builds a NodeType payload, so that is the form's value type;
	// zod's input type is unknown and needs the bridge through the resolver cast.
	type NodeFormValues = Parameters<typeof buildMutationPayload>[0];
	const form = useForm<NodeFormValues>({
		resolver: zodResolver((isAddMode ? NodeSchema : EditableNodeSchema) as unknown as Parameters<typeof zodResolver>[0]) as unknown as Resolver<NodeFormValues>,
		defaultValues: {
			...baseDefaults,
			data_limit: formatDataLimitForInput(baseDefaults.data_limit ?? null),
		},
	});

	const { data: nodeLabels } = useLabelItems("node", isOpen);
	const { data: knownNodeTags = [] } = useTags("node", isOpen);
	const invalidateLabels = useInvalidateLabels();
	const originalTags = useMemo(
		() => (!isAddMode && node?.id != null ? (nodeLabels?.items[String(node.id)]?.tags ?? []) : []),
		[isAddMode, node?.id, nodeLabels],
	);
	const [tags, setTags] = useState<string[]>([]);
	useEffect(() => {
		setTags(originalTags);
	}, [originalTags, isOpen]);

	const nodeCertificateValue = !isAddMode
		? buildNodeInstallBundle(node?.node_certificate, node?.node_certificate_key)
		: "";
	const { onCopy: copyNodeCertificate, hasCopied: nodeCertificateCopied } =
		useClipboard(nodeCertificateValue);
	const proxyEnabled = form.watch("proxy_enabled");

	useEffect(() => {
		if (!proxyEnabled) {
			return;
		}
		const currentType = form.getValues("proxy_type");
		if (!currentType) {
			form.setValue("proxy_type", "http");
		}
	}, [proxyEnabled, form]);

	useEffect(() => {
		if (isOpen) {
			clearSubmitTimers();
			setSubmitStatus("idle");
			const defaults = isAddMode
				? getNodeDefaultValues()
				: {
						...getNodeDefaultValues(),
						...node,
					};
			form.reset({
				...defaults,
				data_limit: formatDataLimitForInput(defaults.data_limit ?? null),
			});
			setShowCertificate(false);
		}
	}, [
		isOpen,
		isAddMode,
		node,
		form,
		formatDataLimitForInput,
		clearSubmitTimers,
	]);

	const handleSubmit = form.handleSubmit(
		(data) => {
			if (submitStatus !== "idle" || isLoading) return;
			clearSubmitTimers();
			setSubmitStatus("loading");
			const payload = buildMutationPayload(data);
			mutate(payload, {
				onError: () => {
					showSubmitError();
				},
				onSuccess: async (createdOrUpdatedNode) => {
					if (tags.join("\n") !== originalTags.join("\n") && createdOrUpdatedNode?.id != null) {
						try {
							await saveLabels("node", createdOrUpdatedNode.id, { tags });
							await invalidateLabels();
						} catch {
							toast.error(t("labels.saveFailed"), { duration: 3500 });
						}
					}
					setSubmitStatus("success");
					successCloseTimerRef.current = window.setTimeout(() => {
						successCloseTimerRef.current = null;
						handleClose();
						window.setTimeout(() => {
							onSubmitSuccess?.(createdOrUpdatedNode);
						}, 0);
					}, 1000);
				},
			});
		},
		(errors) => {
			if (submitStatus !== "idle") return;
			const message =
				getFirstInputError(errors) || "Please fix the node form fields.";
			toast.error(message, { duration: 3500 });
			showSubmitError();
		},
	);

	const handleCopyNodeCertificate = () => {
		if (!nodeCertificateValue) return;
		copyNodeCertificate();
		toast.success(t("copied"), { duration: 2000 });
	};

	const handleDownloadNodeCertificate = () => {
		if (!nodeCertificateValue) return;
		const blob = new Blob([nodeCertificateValue], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "node_install_bundle.pem";
		anchor.click();
		URL.revokeObjectURL(url);
	};

	function handleClose() {
		clearSubmitTimers();
		setSubmitStatus("idle");
		setShowCertificate(false);
		onClose();
	}

	const errors = form.formState?.errors;
	const proxyTypeOptions = [
		{ value: "http", label: "HTTP" },
		{ value: "socks5", label: "SOCKS5" },
	];

	return (
		<Dialog
			section="nodes"
			page={!isAddMode && node ? nodeEntityPage(node) : undefined}
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isLoading) handleClose();
			}}
		>
			<DialogContent
				className="flex max-h-[min(840px,calc(100dvh-3rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl lg:max-w-5xl rounded-[20px] border border-white/[0.08] bg-[#161b22] text-white shadow-2xl max-md:inset-x-3 max-md:w-auto max-md:top-[3rem] max-md:bottom-16 max-md:max-h-none max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0"
			>
				<form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
					<DialogHeader className="sticky top-0 z-20 flex-row items-center gap-3 border-b border-white/[0.06] bg-[#161b22]/95 backdrop-blur-md px-6 py-4 pe-12 text-start sm:text-start">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-xl badge-soft-cyan text-cyan-400 [&_svg]:size-5">
							<Server className="size-5" />
						</div>
						<div className="min-w-0">
							<DialogTitle className="truncate text-base font-semibold text-white tracking-tight">
								{isAddMode ? t("nodes.addNewNoraNode") : t("nodes.editNode")}
							</DialogTitle>
							{!isAddMode && node?.name ? (
								<DialogDescription className="truncate text-xs text-[#8b949e]"><AppleEmojiText>{node.name}</AppleEmojiText></DialogDescription>
							) : null}
						</div>
					</DialogHeader>

					<div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
						<div className="flex flex-col gap-5">
							{!isAddMode && nodeCertificateValue ? (
								<SectionCard.Root>
									<SectionCard.Header icon={<SectionCard.Icon variant="amber"><KeyRound className="size-4" /></SectionCard.Icon>}>
										<div className="flex flex-wrap items-center justify-between gap-2 w-full">
											<div>
												<SectionCard.Title>{t("nodes.certificate")}</SectionCard.Title>
												<SectionCard.Description>Node install bundle PEM certificate and private key</SectionCard.Description>
											</div>
											<div className="flex flex-wrap items-center gap-1.5">
												<Button onClick={handleCopyNodeCertificate} variant="outline" size="xs">
													<CopyIconStyled />
													{nodeCertificateCopied ? t("copied") : t("copy")}
												</Button>
												<Button onClick={handleDownloadNodeCertificate} variant="outline" size="xs">
													<DownloadIconStyled />
													{t("nodes.download-certificate")}
												</Button>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button aria-label={t(showCertificate ? "nodes.hide-certificate" : "nodes.show-certificate")} onClick={() => setShowCertificate((prev) => !prev)} variant="ghost" size="xs" className="size-7 p-0">
															{showCertificate ? <EyeSlashIconStyled /> : <EyeIconStyled />}
														</Button>
													</TooltipTrigger>
													<TooltipContent>{t(showCertificate ? "nodes.hide-certificate" : "nodes.show-certificate")}</TooltipContent>
												</Tooltip>
											</div>
										</div>
									</SectionCard.Header>
									<Collapsible open={showCertificate}>
										<CollapsibleContent forceMount className="data-[state=closed]:hidden">
											<div className="mt-3 max-h-[220px] overflow-auto rounded-lg border border-white/10 bg-[#0d1117] p-3 font-mono text-xs text-white selection:bg-cyan-500/30 break-all">
												{nodeCertificateValue}
											</div>
										</CollapsibleContent>
									</Collapsible>
								</SectionCard.Root>
							) : null}

							<SectionCard.Root>
								<SectionCard.Header icon={<SectionCard.Icon variant="cyan"><Network className="size-4" /></SectionCard.Icon>}>
									<SectionCard.Title>{t("nodes.connectionSettings")}</SectionCard.Title>
									<SectionCard.Description>Host address, control port, and throughput limits</SectionCard.Description>
								</SectionCard.Header>
								<SectionCard.Content>
									{isAddMode ? (
										<CheckRow checked disabled onChange={() => undefined}>
											{t("nodes.certInfoOption")}
										</CheckRow>
									) : null}
									<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
										<FormField label={t("nodes.nodeName")} error={getInputError(errors?.name)}>
											<Controller
												control={form.control}
												name="name"
												render={({ field }) => (
													<EmojiShortcodeInput
														ref={field.ref}
														value={field.value ?? ""}
														onChange={field.onChange}
														onBlur={field.onBlur}
														placeholder="Nora-S2"
														maxLength={120}
														aria-invalid={Boolean(errors?.name) || undefined}
													/>
												)}
											/>
										</FormField>
										<FormField label={t("nodes.nodeAddress")} error={getInputError(errors?.address)}>
											<UiInput placeholder="192.168.1.1 or 2001:db8::1" className="font-mono" aria-invalid={Boolean(errors?.address) || undefined} {...form.register("address")} />
										</FormField>
										<FormField label={t("nodes.controlPort")} error={getInputError(errors?.port)}>
											<Controller
												control={form.control}
												name="port"
												render={({ field }) => (
													<NumberField
														inputMode="numeric"
														min={1}
														max={65535}
														placeholder="62050"
														doneLabel={t("common.done")}
														value={field.value === undefined || field.value === null ? "" : String(field.value)}
														onChange={(raw) => field.onChange(raw)}
														invalid={Boolean(errors?.port)}
													/>
												)}
											/>
										</FormField>
										<FormField label={t("nodes.usageCoefficient")} error={getInputError(errors?.usage_coefficient)}>
											<Controller
												control={form.control}
												name="usage_coefficient"
												render={({ field }) => (
													<NumberField
														inputMode="decimal"
														step={0.01}
														min={0}
														placeholder="1"
														doneLabel={t("common.done")}
														value={field.value === undefined || field.value === null ? "" : String(field.value)}
														onChange={(raw) => field.onChange(raw)}
														invalid={Boolean(errors?.usage_coefficient)}
													/>
												)}
											/>
										</FormField>
										<FormField label={t("nodes.dataLimitField")} description={t("nodes.dataLimitHint")} error={getInputError(errors?.data_limit)} className="md:col-span-2">
											<Controller
												control={form.control}
												name="data_limit"
												render={({ field }) => (
													<DataSizeField
														placeholder={t("nodes.dataLimitPlaceholder")}
														valueGb={field.value === undefined || field.value === null ? "" : String(field.value)}
														onChangeGb={(next) => field.onChange(next.trim() === "" ? null : Number(next))}
														invalid={Boolean(errors?.data_limit)}
													/>
												)}
											/>
										</FormField>
									</div>
									<FormField label={t("tags.title")}>
										<TagsSelect value={tags} onChange={setTags} options={knownNodeTags.map((item) => item.tag)} />
									</FormField>
									<FormField label={t("fields.note")} error={getInputError(errors?.note)}>
										<Textarea rows={3} maxLength={500} {...form.register("note")} />
									</FormField>

									<label htmlFor="node-use-proxy" className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-[#0d1117] px-3.5 py-2.5 text-sm font-medium text-white transition-colors">
										<span>{t("nodes.useProxy")}</span>
										<Controller
											control={form.control}
											name="proxy_enabled"
											render={({ field }) => (
												<UiSwitch id="node-use-proxy" checked={Boolean(field.value)} onCheckedChange={(next) => field.onChange(next)} />
											)}
										/>
									</label>
								</SectionCard.Content>
							</SectionCard.Root>

							{proxyEnabled ? (
								<SectionCard.Root>
									<SectionCard.Header icon={<SectionCard.Icon variant="teal"><Globe className="size-4" /></SectionCard.Icon>}>
										<SectionCard.Title>{t("nodes.proxySettings")}</SectionCard.Title>
										<SectionCard.Description>{t("nodes.proxyHint") || "Upstream proxy routing for node communications"}</SectionCard.Description>
									</SectionCard.Header>
									<SectionCard.Content>
										<FormField label={t("nodes.proxyType")} error={getInputError(errors?.proxy_type)}>
											<Controller
												control={form.control}
												name="proxy_type"
												render={({ field }) => (
													<SegmentedControl<string>
														label={t("nodes.proxyType")}
														value={field.value ?? ""}
														options={proxyTypeOptions}
														onChange={(next) => field.onChange(next)}
													/>
												)}
											/>
										</FormField>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
											<FormField label={t("nodes.proxyHost")} error={getInputError(errors?.proxy_host)}>
												<UiInput placeholder="proxy.example.com" className="font-mono" aria-invalid={Boolean(errors?.proxy_host) || undefined} {...form.register("proxy_host")} />
											</FormField>
											<FormField label={t("nodes.proxyPort")} error={getInputError(errors?.proxy_port)}>
												<Controller
													control={form.control}
													name="proxy_port"
													render={({ field }) => (
														<NumberField
															inputMode="numeric"
															min={1}
															max={65535}
															placeholder="8080"
															doneLabel={t("common.done")}
															value={field.value === undefined || field.value === null ? "" : String(field.value)}
															onChange={(raw) => field.onChange(raw.trim() === "" ? null : raw)}
															invalid={Boolean(errors?.proxy_port)}
														/>
													)}
												/>
											</FormField>
										</div>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
											<FormField label={t("nodes.proxyUsername")} error={getInputError(errors?.proxy_username)}>
												<UiInput placeholder="user" className="font-mono" {...form.register("proxy_username")} />
											</FormField>
											<FormField label={t("nodes.proxyPassword")} error={getInputError(errors?.proxy_password)}>
												<UiInput type="password" placeholder="••••••••" className="font-mono" {...form.register("proxy_password")} />
											</FormField>
										</div>
									</SectionCard.Content>
								</SectionCard.Root>
							) : null}
						</div>
					</div>

					<DialogFooter className="sticky bottom-0 z-20 flex-row flex-wrap items-center justify-end gap-2 border-t border-white/[0.08] bg-[#161b22]/95 backdrop-blur-md px-6 py-3.5">
						<Button onClick={handleClose} variant="outline" size="sm">
							{t("cancel")}
						</Button>
						<div className="w-full sm:w-[180px]">
							<AnimatedSubmitButton
								status={submitStatus}
								idleContent={isAddMode ? t("nodes.addNode") : t("nodes.editNode")}
								successLabel={t("userDialog.submitSuccess")}
								disabled={isLoading}
								type="submit"
							/>
						</div>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};
