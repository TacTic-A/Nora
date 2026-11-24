import { toneClass } from "lib/tone";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import { toast } from "components/ui/sonner";
import { cn } from "lib/cn";
import { Shield } from "lucide-react";

import { AppDialog } from "components/dialogs/AppDialog";
import dayjs from "dayjs";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	type AdminSessionView,
	disableAdmin2FA,
	listAdminSessions,
	revokeAdminSession,
	setupAdmin2FA,
	type TOTPSetup,
} from "service/auth";
import type { Admin } from "types/Admin";
import { generateErrorMessage } from "utils/toastHandler";

type Props = {
	admin: Admin | null;
	open: boolean;
	onClose: () => void;
	canManageSessions: boolean;
	canManage2FA: boolean;
	onChanged: () => void;
};

export const AdminSecurityDialog = ({
	admin,
	open: isOpen,
	onClose,
	canManageSessions,
	canManage2FA,
	onChanged,
}: Props) => {
	const { t } = useTranslation();
	
	const [sessions, setSessions] = useState<AdminSessionView[]>([]);
	const [setup, setSetup] = useState<TOTPSetup | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!isOpen || !admin || !canManageSessions) return;
		listAdminSessions(admin.username)
			.then(setSessions)
			.catch((error) => generateErrorMessage(error, toast));
	}, [admin, canManageSessions, isOpen, toast]);

	const revoke = async (id: number) => {
		if (!admin) return;
		setLoading(true);
		try {
			await revokeAdminSession(admin.username, id);
			setSessions((current) => current.filter((session) => session.id !== id));
		} catch (error) {
			generateErrorMessage(error, toast);
		} finally {
			setLoading(false);
		}
	};

	const enable2FA = async () => {
		if (!admin) return;
		setLoading(true);
		try {
			setSetup(await setupAdmin2FA(admin.username));
			setSessions([]);
			onChanged();
		} catch (error) {
			generateErrorMessage(error, toast);
		} finally {
			setLoading(false);
		}
	};

	const remove2FA = async () => {
		if (!admin) return;
		setLoading(true);
		try {
			await disableAdmin2FA(admin.username);
			setSessions([]);
			setSetup(null);
			onChanged();
		} catch (error) {
			generateErrorMessage(error, toast);
		} finally {
			setLoading(false);
		}
	};

	return (
		<AppDialog
			open={isOpen}
			onClose={onClose}
			icon={<Shield className="size-4" />}
			iconVariant="cyan"
			title={t("admins.security.title", { username: admin?.username ?? "" })}
			footer={<Button variant="outline" onClick={onClose}>{t("close")}</Button>}
		>
			<div className="flex flex-col gap-5">
				{canManage2FA && (
					<div>
						<div className="flex flex-row items-center gap-2 justify-between mb-3">
							<p className="text-sm font-semibold text-white">
								{t("myaccount.twoFactor")}
							</p>
							<Badge className={toneClass(admin?.totp_enabled ? "green" : "gray")}>
								{admin?.totp_enabled
									? t("nodes.enabled")
									: t("disabled")}
							</Badge>
						</div>
						<Button onClick={admin?.totp_enabled ? remove2FA : enable2FA} variant={admin?.totp_enabled ? "destructive" : "soft-cyan"} size="sm" loading={loading}>
							{admin?.totp_enabled
								? t("admins.security.remove2FA")
								: t("admins.security.setup2FA")}
						</Button>
						{setup && (
							<div className="flex flex-col items-center mt-4 gap-3 rounded-xl border border-white/[0.08] bg-[#0d1117] p-4">
								<div className="bg-white rounded-lg p-3">
									<QRCodeCanvas value={setup.uri} size={190} />
								</div>
								<p className="font-mono text-xs break-all text-white">
									{setup.secret}
								</p>
								<p className="text-amber-400 text-xs">
									{t("admins.security.shareSecret")}
								</p>
							</div>
						)}
					</div>
				)}
				{canManageSessions && (
					<div>
						<p className="text-sm font-semibold text-white mb-3">
							{t("myaccount.sessions")}
						</p>
						<div className="flex flex-col gap-2">
							{sessions.map((session) => (
								<div key={session.id} className="flex flex-row items-center gap-2 border border-white/[0.08] bg-[#0d1117] rounded-xl justify-between p-3.5 hover:border-white/[0.15] transition-colors">
									<div className="min-w-0!">
										<p className="text-sm font-semibold text-white font-mono">
											{session.ip_address || "-"}
										</p>
										<p className="text-[#8b949e] text-xs truncate">
											{session.user_agent || "-"}
										</p>
										<p className="text-[#8b949e] text-xs">
											{dayjs(session.last_seen_at).format("YYYY-MM-DD HH:mm")}
										</p>
									</div>
									<Button onClick={() => revoke(session.id)} variant="ghost" size="xs" loading={loading} className="text-destructive hover:bg-destructive/10">
										{t("header.logout")}
									</Button>
								</div>
							))}
							{!sessions.length && (
								<p className="text-[#8b949e] text-sm">
									{t("noData")}
								</p>
							)}
						</div>
					</div>
				)}
			</div>
		</AppDialog>
	);
};
