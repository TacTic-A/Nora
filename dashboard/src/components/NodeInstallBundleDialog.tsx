import { AppDialog } from "components/dialogs/AppDialog";
import { Button } from "components/ui/button";
import { useClipboard } from "hooks/useClipboard";
import { Check, Copy, Download } from "lucide-react";
import { useTranslation } from "react-i18next";

type NodeInstallBundleDialogProps = {
	name?: string | null;
	certificate: string;
	certificateKey?: string | null;
	onClose: () => void;
};

const buildInstallBundle = (certificate: string, certificateKey?: string | null) => {
	const key = certificateKey?.trim() ?? "";
	const cert = certificate.trim();
	return key ? `${cert}\n${key}\n` : cert;
};

export const NodeInstallBundleDialog = ({
	name,
	certificate,
	certificateKey,
	onClose,
}: NodeInstallBundleDialogProps) => {
	const { t } = useTranslation();
	const bundle = buildInstallBundle(certificate, certificateKey);
	const { onCopy, hasCopied } = useClipboard(bundle);

	const handleDownload = () => {
		const url = URL.createObjectURL(new Blob([bundle], { type: "text/plain" }));
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = "node_install_bundle.pem";
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<AppDialog
			open
			onClose={onClose}
			size="lg"
			icon={<Download className="size-4" />}
			iconVariant="amber"
			title={t("nodes.newNodePublicKeyTitle")}
			subtitle={name ?? undefined}
			footer={<Button variant="outline" onClick={onClose}>{t("close")}</Button>}
		>
			<div className="flex flex-col gap-3">
				<p className="text-sm text-[#8b949e]">{t("nodes.newNodePublicKeyDesc")}</p>
				<div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1117]">
					<div className="flex items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
						<p className="text-sm font-medium text-white">{t("nodes.installBundleLabel")}</p>
						{name ? <p className="min-w-0 truncate font-mono text-xs text-[#8b949e]" dir="ltr">{name}</p> : null}
					</div>
					<div className="grid grid-cols-1 gap-2 border-b border-white/[0.06] p-2.5 sm:grid-cols-2">
						<Button variant="outline" size="sm" onClick={onCopy} className="w-full hover:border-cyan-500/50 hover:bg-cyan-500/10">
							{hasCopied ? <Check className="text-cyan-400" /> : <Copy />}
							{hasCopied ? t("copied") : t("copy")}
						</Button>
						<Button variant="outline" size="sm" onClick={handleDownload} className="w-full hover:border-cyan-500/50 hover:bg-cyan-500/10">
							<Download />
							{t("nodes.download-node-install-bundle")}
						</Button>
					</div>
					<pre
						dir="ltr"
						className="max-h-52 overflow-auto whitespace-pre bg-[#0d1117] p-3.5 font-mono text-xs leading-5 text-white selection:bg-cyan-500/30"
					>
						{bundle}
					</pre>
				</div>
			</div>
		</AppDialog>
	);
};
