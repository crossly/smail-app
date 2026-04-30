import {
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
	type EmailDetail,
	type InboxEmail,
	createMailbox,
	deleteMailbox,
	fetchEmailDetail,
	fetchInbox,
	fetchMailbox,
	mailboxKeys,
} from "./api.ts";

const DEFAULT_REFRESH_INTERVAL_MS = 10_000;

function formatInboxTime(timestamp: number) {
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(timestamp);
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : "请求失败，请稍后重试。";
}

function useRefreshCountdown(isEnabled: boolean, refreshIntervalMs: number) {
	const [remainingSeconds, setRemainingSeconds] = useState(
		refreshIntervalMs / 1000,
	);

	useEffect(() => {
		if (!isEnabled) {
			setRemainingSeconds(refreshIntervalMs / 1000);
			return;
		}

		const startedAt = Date.now();
		const interval = window.setInterval(() => {
			const elapsed = (Date.now() - startedAt) % refreshIntervalMs;
			setRemainingSeconds(
				Math.max(1, Math.ceil((refreshIntervalMs - elapsed) / 1000)),
			);
		}, 250);

		return () => window.clearInterval(interval);
	}, [isEnabled, refreshIntervalMs]);

	return remainingSeconds;
}

function MailboxPanel({
	address,
	isLoading,
	error,
	onCreate,
	onDelete,
	isCreating,
	isDeleting,
}: {
	address: string | null;
	isLoading: boolean;
	error: unknown;
	onCreate: (prefix?: string) => void;
	onDelete: () => void;
	isCreating: boolean;
	isDeleting: boolean;
}) {
	const [prefix, setPrefix] = useState("");
	const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
		"idle",
	);
	const isBusy = isCreating || isDeleting;

	async function copyAddress() {
		if (!address) {
			return;
		}

		try {
			await navigator.clipboard.writeText(address);
			setCopyState("copied");
			window.setTimeout(() => setCopyState("idle"), 1_600);
		} catch {
			setCopyState("failed");
		}
	}

	function submitCustomPrefix(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		onCreate(prefix);
	}

	return (
		<section className="tool-panel mailbox-panel" aria-labelledby="mailbox-title">
			<div className="panel-heading">
				<p className="eyebrow">当前邮箱</p>
				<h1 id="mailbox-title">临时收件地址</h1>
			</div>

			{isLoading ? (
				<div className="state-box">正在读取当前邮箱...</div>
			) : error ? (
				<div className="state-box state-box-error">{getErrorMessage(error)}</div>
			) : address ? (
				<div className="address-block">
					<span className="address-label">Address</span>
					<strong>{address}</strong>
				</div>
			) : (
				<div className="state-box">
					还没有邮箱地址。随机生成一个，或输入前缀创建自定义地址。
				</div>
			)}

			<div className="button-row">
				<button
					className="button button-primary"
					type="button"
					onClick={() => onCreate()}
					disabled={isBusy}
				>
					{isCreating ? "生成中..." : "随机生成"}
				</button>
				<button
					className="button"
					type="button"
					onClick={copyAddress}
					disabled={!address || isBusy}
				>
					{copyState === "copied"
						? "已复制"
						: copyState === "failed"
							? "复制失败"
							: "复制"}
				</button>
				<button
					className="button button-danger"
					type="button"
					onClick={onDelete}
					disabled={!address || isBusy}
				>
					{isDeleting ? "删除中..." : "删除"}
				</button>
			</div>

			<form className="custom-prefix-form" onSubmit={submitCustomPrefix}>
				<label htmlFor="mailbox-prefix">自定义前缀</label>
				<div className="input-row">
					<input
						id="mailbox-prefix"
						name="prefix"
						type="text"
						autoComplete="off"
						placeholder="例如 ricky"
						value={prefix}
						onChange={(event) => setPrefix(event.target.value)}
					/>
					<button
						className="button"
						type="submit"
						disabled={isBusy || !prefix.trim()}
					>
						创建
					</button>
				</div>
			</form>
		</section>
	);
}

function EmailDetailPanel({
	emailId,
	isOpen,
}: {
	emailId: string;
	isOpen: boolean;
}) {
	const detailQuery = useQuery({
		queryKey: mailboxKeys.email(emailId),
		queryFn: () => fetchEmailDetail(emailId),
		enabled: isOpen,
		staleTime: 60_000,
	});

	if (!isOpen) {
		return null;
	}

	if (detailQuery.isLoading) {
		return <div className="email-detail-state">正在加载邮件详情...</div>;
	}

	if (detailQuery.isError) {
		return (
			<div className="email-detail-state email-detail-error">
				邮件详情加载失败：{getErrorMessage(detailQuery.error)}
			</div>
		);
	}

	const detail = detailQuery.data as EmailDetail | undefined;

	return (
		<div className="email-detail">
			<iframe
				title={`邮件内容 ${emailId}`}
				srcDoc={detail?.body || "<p>No content.</p>"}
				sandbox=""
				referrerPolicy="no-referrer"
			/>
		</div>
	);
}

function EmailRow({
	email,
	isExpanded,
	onToggle,
}: {
	email: InboxEmail;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	const sender = email.from_name || email.from_address;

	return (
		<article className="email-row">
			<button
				className="email-summary"
				type="button"
				aria-expanded={isExpanded}
				onClick={onToggle}
			>
				<span className="email-sender">{sender}</span>
				<span className="email-subject">{email.subject || "(无主题)"}</span>
				<span className="email-time">{formatInboxTime(email.time)}</span>
			</button>
			<EmailDetailPanel emailId={email.id} isOpen={isExpanded} />
		</article>
	);
}

function InboxPanel({
	address,
	emails,
	isInitialLoading,
	isRefreshing,
	error,
	onRefresh,
	refreshIntervalMs,
	expandedEmailId,
	onToggleEmail,
}: {
	address: string | null;
	emails: InboxEmail[];
	isInitialLoading: boolean;
	isRefreshing: boolean;
	error: unknown;
	onRefresh: () => void;
	refreshIntervalMs: number;
	expandedEmailId: string | null;
	onToggleEmail: (id: string) => void;
}) {
	const countdown = useRefreshCountdown(Boolean(address), refreshIntervalMs);
	const sortedEmails = useMemo(
		() => [...emails].sort((a, b) => b.time - a.time),
		[emails],
	);

	return (
		<section className="tool-panel inbox-panel" aria-labelledby="inbox-title">
			<div className="inbox-heading">
				<div>
					<p className="eyebrow">收件箱</p>
					<h2 id="inbox-title">邮件列表</h2>
				</div>
				<div className="refresh-tools">
					<span>{address ? `${countdown}s 后自动刷新` : "等待邮箱地址"}</span>
					<button
						className="button"
						type="button"
						onClick={onRefresh}
						disabled={!address || isRefreshing}
					>
						{isRefreshing ? "刷新中..." : "手动刷新"}
					</button>
				</div>
			</div>

			{!address ? (
				<div className="state-box">左侧生成邮箱后，这里会显示收到的邮件。</div>
			) : isInitialLoading ? (
				<div className="state-box">正在加载收件箱...</div>
			) : error ? (
				<div className="state-box state-box-error">
					收件箱加载失败：{getErrorMessage(error)}
				</div>
			) : sortedEmails.length === 0 ? (
				<div className="state-box">当前收件箱为空，系统会自动刷新。</div>
			) : (
				<div className="email-list">
					{sortedEmails.map((email) => (
						<EmailRow
							key={email.id}
							email={email}
							isExpanded={expandedEmailId === email.id}
							onToggle={() => onToggleEmail(email.id)}
						/>
					))}
				</div>
			)}
		</section>
	);
}

export function App() {
	const queryClient = useQueryClient();
	const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

	const mailboxQuery = useQuery({
		queryKey: mailboxKeys.mailbox(),
		queryFn: fetchMailbox,
	});
	const address = mailboxQuery.data?.address ?? null;
	const refreshIntervalMs =
		mailboxQuery.data?.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;

	const inboxQuery = useQuery({
		queryKey: mailboxKeys.inbox(),
		queryFn: fetchInbox,
		enabled: Boolean(address),
		refetchInterval: address ? refreshIntervalMs : false,
	});

	const invalidateSession = async () => {
		setExpandedEmailId(null);
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: mailboxKeys.mailbox() }),
			queryClient.invalidateQueries({ queryKey: mailboxKeys.inbox() }),
		]);
	};

	const createMailboxMutation = useMutation({
		mutationFn: createMailbox,
		onSuccess: invalidateSession,
	});
	const deleteMailboxMutation = useMutation({
		mutationFn: deleteMailbox,
		onSuccess: invalidateSession,
	});

	function refreshInbox() {
		void queryClient.invalidateQueries({ queryKey: mailboxKeys.inbox() });
	}

	function toggleEmail(id: string) {
		setExpandedEmailId((current) => (current === id ? null : id));
	}

	const actionError =
		createMailboxMutation.error ?? deleteMailboxMutation.error ?? null;

	return (
		<main className="tool-app">
			<div className="tool-shell">
				<MailboxPanel
					address={address}
					isLoading={mailboxQuery.isLoading}
					error={mailboxQuery.error ?? actionError}
					onCreate={(prefix) => createMailboxMutation.mutate(prefix)}
					onDelete={() => deleteMailboxMutation.mutate()}
					isCreating={createMailboxMutation.isPending}
					isDeleting={deleteMailboxMutation.isPending}
				/>
				<InboxPanel
					address={address}
					emails={inboxQuery.data?.emails ?? []}
					isInitialLoading={inboxQuery.isLoading}
					isRefreshing={inboxQuery.isFetching && !inboxQuery.isLoading}
					error={inboxQuery.error}
					onRefresh={refreshInbox}
					refreshIntervalMs={refreshIntervalMs}
					expandedEmailId={expandedEmailId}
					onToggleEmail={toggleEmail}
				/>
			</div>
		</main>
	);
}
