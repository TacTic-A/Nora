import { useInfiniteQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "components/ui/button";
import { fetch } from "service/http";

type AdminHistoryChange = {
	field: string;
	before: string;
	after: string;
	delta?: string;
};

type AdminHistoryEntry = {
	id: number;
	actor_username: string;
	created_at: string;
	changes?: AdminHistoryChange[];
};

type AdminHistoryResponse = {
	actions: AdminHistoryEntry[];
	next_before_id?: number | null;
};

const formatChangeValue = (field: string, value: string) =>
	field === "expire" && /^\d+$/.test(value) ? dayjs.unix(Number(value)).format("YYYY-MM-DD HH:mm") : value;

export const AdminHistoryPanel: FC<{ username: string }> = ({ username }) => {
	const { t } = useTranslation();
	const query = useInfiniteQuery({
		queryKey: ["admin-history", username],
		queryFn: ({ pageParam }) =>
			fetch<AdminHistoryResponse>(
				`/admin/history/${encodeURIComponent(username)}?limit=30${pageParam ? `&before_id=${pageParam}` : ""}`,
			),
		initialPageParam: null as number | null,
		getNextPageParam: (last) => last.next_before_id ?? undefined,
	});

	if (query.isPending) {
		return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
	}
	if (query.isError) {
		return <p className="text-sm text-destructive">{t("adminHistory.error")}</p>;
	}
	const entries = query.data.pages.flatMap((page) => page.actions);
	if (!entries.length) {
		return <p className="text-sm text-muted-foreground">{t("adminHistory.empty")}</p>;
	}

	return (
		<div className="flex flex-col gap-3">
			{entries.map((entry) => (
				<div key={entry.id} className="rounded-xl border border-white/[0.08] bg-[#161b22] px-3.5 py-3 shadow-sm">
					<div className="flex flex-wrap items-center justify-between gap-2 text-xs">
						<span dir="ltr" className="font-semibold text-white">
							{t("adminHistory.by", { name: entry.actor_username })}
						</span>
						<span className="rb-tabular font-mono text-xs text-[#8b949e]">{dayjs(entry.created_at).format("YYYY-MM-DD HH:mm")}</span>
					</div>
					{entry.changes?.length ? (
						<ul className="mt-2 flex flex-col gap-1.5">
							{entry.changes.map((change) => (
								<li key={change.field} dir="ltr" className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-mono tabular-nums">
									<span className="font-semibold text-white">
										{t(`recentActions.fields.${change.field}`, { defaultValue: change.field })}
									</span>
									<span className="text-[#8b949e] text-xs">{formatChangeValue(change.field, change.before)}</span>
									<span className="text-[#8b949e]">→</span>
									<span className="font-bold text-white text-xs">{formatChangeValue(change.field, change.after)}</span>
									{change.delta ? (
										<span className="rb-tabular rounded badge-soft-cyan text-cyan-400 px-1.5 py-0.5 text-xs font-semibold border border-cyan-500/30">{change.delta}</span>
									) : null}
								</li>
							))}
						</ul>
					) : null}
				</div>
			))}
			{query.hasNextPage ? (
				<Button variant="outline" size="sm" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()} className="rounded-lg border-white/[0.08] bg-[#161b22] text-[#c9d1d9] hover:bg-[#21262d] hover:text-white">
					{t("adminHistory.loadMore")}
				</Button>
			) : null}
		</div>
	);
};
