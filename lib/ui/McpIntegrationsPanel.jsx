import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Plug,
	Plus,
	Copy,
	Check,
	Trash2,
	Loader2,
	ChevronDown,
	ChevronRight,
	AlertTriangle,
	Key,
	Monitor,
	Terminal,
	ScrollText,
	CircleCheck,
	Clock,
} from "lucide-react";
import { auth } from "../config/firebase";
import { toast } from "sonner";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "./Table";

async function fetchMcpKeys(idToken) {
	const res = await fetch("/api/settings/mcp-keys", {
		headers: { Authorization: `Bearer ${idToken}` },
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "Failed to load keys");
	return {
		keys: data.keys || [],
		integration: data.integration || null,
		adminConfigured: data.adminConfigured !== false,
	};
}

async function fetchMcpLogs(idToken) {
	const res = await fetch("/api/settings/mcp-logs?limit=50", {
		headers: { Authorization: `Bearer ${idToken}` },
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "Failed to load logs");
	return data.logs || [];
}

function formatWhen(iso) {
	if (!iso) return "—";
	try {
		return new Date(iso).toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
			hour: "numeric",
			minute: "2-digit",
			second: "2-digit",
		});
	} catch {
		return iso;
	}
}

function formatDuration(ms) {
	if (ms == null) return null;
	if (ms < 1000) return `${ms} ms`;
	if (ms < 10_000) return `${(ms / 1000).toFixed(1)} s`;
	return `${Math.round(ms / 1000)} s`;
}

function toolLabel(tool) {
	const labels = {
		inkgest_search_docs: "Search docs",
		inkgest_list_docs: "List docs",
		inkgest_read_doc: "Read doc",
		inkgest_create_doc: "Create doc",
		inkgest_update_doc: "Update doc",
		inkgest_list_tasks: "List tasks",
		inkgest_list_projects: "List projects",
		inkgest_get_task: "Get task",
		inkgest_create_task: "Create task",
		inkgest_update_task: "Update task",
		inkgest_delete_task: "Delete task",
		inkgest_translate_doc: "Translate doc",
	};
	return labels[tool] || tool;
}

function formatParamValue(value) {
	if (value == null) return "—";
	if (typeof value === "object") return JSON.stringify(value);
	return String(value);
}

function formatParams(params) {
	if (!params || Object.keys(params).length === 0) return "—";
	return Object.entries(params)
		.map(([key, value]) => `${key}=${formatParamValue(value)}`)
		.join(", ");
}

function formatOutcome(log) {
	if (log.error) return log.error;
	if (log.resultSummary) return log.resultSummary;
	return "—";
}

function McpLogsTable({ logs }) {
	return (
		<Table className="min-w-[960px] text-xs">
			<TableHeader>
				<TableRow hover={false}>
					<TableHead className="px-3 py-2 text-[11px] whitespace-nowrap">Time</TableHead>
					<TableHead className="px-3 py-2 text-[11px] whitespace-nowrap">Tool</TableHead>
					<TableHead className="px-3 py-2 text-[11px] whitespace-nowrap">Method</TableHead>
					<TableHead className="px-3 py-2 text-[11px] whitespace-nowrap">Path</TableHead>
					<TableHead className="px-3 py-2 text-[11px] whitespace-nowrap">Key</TableHead>
					<TableHead className="px-3 py-2 text-[11px] whitespace-nowrap">Status</TableHead>
					<TableHead className="px-3 py-2 text-[11px] whitespace-nowrap text-right">
						Duration
					</TableHead>
					<TableHead className="px-3 py-2 text-[11px] min-w-[140px]">Params</TableHead>
					<TableHead className="px-3 py-2 text-[11px] min-w-[120px]">Result</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{logs.map((log) => {
					const isError = log.status === "error";
					return (
						<TableRow
							key={log.id}
							className={isError ? "bg-red-50/40 hover:bg-red-50/60" : undefined}
						>
							<TableCell className="px-3 py-2 text-[11px] text-zinc-600 whitespace-nowrap tabular-nums align-top">
								{formatWhen(log.createdAt)}
							</TableCell>
							<TableCell className="px-3 py-2 align-top">
								<div className="font-medium text-zinc-900 whitespace-nowrap">
									{toolLabel(log.tool)}
								</div>
								{log.tool && (
									<div className="font-mono text-[10px] text-zinc-400 mt-0.5 max-w-[140px] truncate">
										{log.tool}
									</div>
								)}
							</TableCell>
							<TableCell className="px-3 py-2 font-mono text-[11px] text-zinc-700 whitespace-nowrap align-top">
								{log.method || "—"}
							</TableCell>
							<TableCell className="px-3 py-2 font-mono text-[11px] text-zinc-700 max-w-[180px] truncate align-top">
								<span title={log.path || undefined}>{log.path || "—"}</span>
							</TableCell>
							<TableCell className="px-3 py-2 text-[11px] text-zinc-700 whitespace-nowrap align-top">
								{log.keyName || "—"}
							</TableCell>
							<TableCell className="px-3 py-2 align-top">
								<div className="flex items-center gap-1.5 whitespace-nowrap">
									<span
										className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
											isError
												? "bg-red-100 text-red-700"
												: "bg-emerald-100 text-emerald-700"
										}`}
									>
										{isError ? "Error" : "OK"}
									</span>
									{log.statusCode != null && (
										<span className="font-mono text-[10px] text-zinc-400">
											{log.statusCode}
										</span>
									)}
								</div>
							</TableCell>
							<TableCell className="px-3 py-2 font-mono text-[11px] text-zinc-700 text-right whitespace-nowrap tabular-nums align-top">
								{formatDuration(log.durationMs) ?? "—"}
							</TableCell>
							<TableCell className="px-3 py-2 font-mono text-[10px] text-zinc-600 max-w-[200px] align-top">
								<span className="line-clamp-2 break-all" title={formatParams(log.params)}>
									{formatParams(log.params)}
								</span>
							</TableCell>
							<TableCell
								className={`px-3 py-2 text-[11px] max-w-[160px] align-top ${
									isError ? "text-red-600" : "text-emerald-700"
								}`}
							>
								<span className="line-clamp-2 break-words" title={formatOutcome(log)}>
									{formatOutcome(log)}
								</span>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}

async function createMcpKey(idToken, name) {
	const res = await fetch("/api/settings/mcp-keys", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${idToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ name }),
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "Failed to create key");
	return data;
}

async function revokeMcpKey(idToken, keyId) {
	const res = await fetch(`/api/settings/mcp-keys/${encodeURIComponent(keyId)}`, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${idToken}` },
	});
	const data = await res.json();
	if (!res.ok) throw new Error(data.error || "Failed to revoke key");
}

function CopyButton({ text, label = "Copy" }) {
	const [copied, setCopied] = useState(false);
	const onCopy = async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			toast.success("Copied to clipboard");
			setTimeout(() => setCopied(false), 2000);
		} catch {
			toast.error("Could not copy");
		}
	};
	return (
		<motion.button
			type="button"
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
			onClick={onCopy}
			className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
		>
			{copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
			{copied ? "Copied" : label}
		</motion.button>
	);
}

function CodeBlock({ code, copyLabel }) {
	return (
		<div className="relative rounded-xl border border-zinc-300 bg-zinc-100 overflow-hidden">
			<div className="absolute top-2 right-2 z-10">
				<CopyButton text={code} label={copyLabel || "Copy"} />
			</div>
			<pre className="p-4 pr-24 text-[11px] sm:text-xs text-zinc-800 overflow-x-auto leading-relaxed font-mono">
				{code}
			</pre>
		</div>
	);
}

function SetupSection({ title, icon: Icon, defaultOpen = false, children }) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="border border-zinc-200 rounded-2xl bg-white overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen((s) => !s)}
				className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 transition-colors"
			>
				<div className="p-2 rounded-xl bg-violet-50">
					<Icon className="w-4 h-4 text-violet-600" />
				</div>
				<span className="flex-1 text-sm font-semibold text-zinc-900">{title}</span>
				{open ? (
					<ChevronDown className="w-4 h-4 text-zinc-400" />
				) : (
					<ChevronRight className="w-4 h-4 text-zinc-400" />
				)}
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden"
					>
						<div className="px-4 pb-4 pt-0 space-y-4 border-t border-zinc-100">{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export default function McpIntegrationsPanel({ reduxUser, onLogin }) {
	const queryClient = useQueryClient();
	const [newKeyName, setNewKeyName] = useState("Claude Desktop");
	const [revealedKey, setRevealedKey] = useState(null);
	const [revokingId, setRevokingId] = useState(null);
	const [logsOpen, setLogsOpen] = useState(false);

	const apiBase =
		(typeof window !== "undefined"
			? process.env.NEXT_PUBLIC_DOMAIN || window.location.origin
			: process.env.NEXT_PUBLIC_DOMAIN || "https://your-inkgest-domain.com"
		).replace(/\/$/, "");

	const mcpServerIndex = "/FULL/PATH/TO/Inkgest/mcp-server/index.js";

	const { data: keysData, isLoading } = useQuery({
		queryKey: ["mcpKeys", reduxUser?.uid],
		queryFn: async () => {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Not signed in");
			return fetchMcpKeys(idToken);
		},
		enabled: !!reduxUser?.uid,
	});

	const keys = keysData?.keys ?? [];
	const integration = keysData?.integration;
	const adminConfigured = keysData?.adminConfigured !== false;

	const isConnected =
		integration?.status === "connected" ||
		(integration?.totalInvocations ?? 0) > 0 ||
		keys.some((k) => k.lastUsedAt);

	const { data: logs = [], isLoading: logsLoading } = useQuery({
		queryKey: ["mcpLogs", reduxUser?.uid],
		queryFn: async () => {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Not signed in");
			return fetchMcpLogs(idToken);
		},
		enabled: !!reduxUser?.uid && logsOpen && adminConfigured,
		refetchInterval: logsOpen ? 15_000 : false,
	});

	const createMutation = useMutation({
		mutationFn: async () => {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Not signed in");
			return createMcpKey(idToken, newKeyName);
		},
		onSuccess: (data) => {
			setRevealedKey(data);
			queryClient.invalidateQueries({ queryKey: ["mcpKeys", reduxUser?.uid] });
			toast.success("API key created — copy it now");
		},
		onError: (e) => toast.error(e.message),
	});

	const handleRevoke = useCallback(
		async (keyId) => {
			if (!window.confirm("Revoke this key? Claude will stop accessing your docs.")) return;
			setRevokingId(keyId);
			try {
				const idToken = await auth.currentUser?.getIdToken();
				await revokeMcpKey(idToken, keyId);
				queryClient.invalidateQueries({ queryKey: ["mcpKeys", reduxUser?.uid] });
				toast.success("Key revoked");
			} catch (e) {
				toast.error(e.message);
			} finally {
				setRevokingId(null);
			}
		},
		[queryClient, reduxUser?.uid],
	);

	const sampleKey = revealedKey?.apiKey || "ink_PASTE_YOUR_KEY_HERE";

	const claudeMcpConfig = useMemo(
		() => ({
			command: "node",
			args: [mcpServerIndex],
			env: {
				INKGEST_API_URL: apiBase,
				INKGEST_API_KEY: sampleKey,
			},
		}),
		[apiBase, sampleKey, mcpServerIndex],
	);

	const claudeDesktopConfig = useMemo(
		() => JSON.stringify({ mcpServers: { inkgest: claudeMcpConfig } }, null, 2),
		[claudeMcpConfig],
	);

	const claudeCodeConfig = useMemo(
		() => JSON.stringify({ mcpServers: { inkgest: claudeMcpConfig } }, null, 2),
		[claudeMcpConfig],
	);

	if (!reduxUser) {
		return (
			<div className="flex flex-col items-center justify-center h-full px-6 text-center">
				<Plug className="w-10 h-10 text-violet-500 mb-4" />
				<h2 className="text-lg font-bold text-zinc-900 mb-2">Claude MCP</h2>
				<p className="text-sm text-zinc-500 mb-4 max-w-sm">
					Sign in to create API keys and connect Claude Desktop or Claude Code to your
					Inkgest library.
				</p>
				<button
					type="button"
					onClick={onLogin}
					className="px-4 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-xl"
				>
					Sign in
				</button>
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto">
			<div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
				<div>
					<p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
						Settings → Integrations
					</p>
					<h1 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
						<Plug className="w-6 h-6 text-violet-500" />
						Claude MCP
					</h1>
					<p className="text-sm text-zinc-500 mt-2 leading-relaxed">
						Connect Claude Desktop or Claude Code to search and write your Inkgest drafts.
						Set up once — your API key stays in the MCP config, not in every chat.
					</p>
				</div>

				{/* Integration status */}
				{!isLoading && (
					<div
						className={`rounded-2xl border p-4 sm:p-5 ${
							isConnected
								? "border-emerald-200 bg-emerald-50"
								: keys.length > 0
									? "border-amber-200 bg-amber-50"
									: "border-zinc-200 bg-zinc-50"
						}`}
					>
						<div className="flex items-start gap-3">
							{isConnected ? (
								<CircleCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
							) : (
								<Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
							)}
							<div className="flex-1 min-w-0">
								<p
									className={`text-sm font-semibold ${
										isConnected ? "text-emerald-900" : "text-amber-900"
									}`}
								>
									{isConnected
										? "MCP integration active"
										: keys.length > 0
											? "API key created — finish Claude setup"
											: "Integration not started"}
								</p>
								<p
									className={`text-xs mt-1 leading-relaxed ${
										isConnected ? "text-emerald-800" : "text-amber-800"
									}`}
								>
									{isConnected ? (
										<>
											Claude has called your Inkgest MCP server{" "}
											<strong>{integration?.totalInvocations ?? 0}</strong> time
											{(integration?.totalInvocations ?? 0) === 1 ? "" : "s"}
											{integration?.lastActivityAt && (
												<>
													{" "}
													· last activity {formatWhen(integration.lastActivityAt)}
												</>
											)}
											{integration?.lastTool && (
												<>
													{" "}
													· last tool{" "}
													<code className="bg-white/60 px-1 rounded text-[10px]">
														{toolLabel(integration.lastTool)}
													</code>
												</>
											)}
										</>
									) : keys.length > 0 ? (
										"Paste your API key into Claude Desktop or Claude Code, then invoke any Inkgest tool to complete the connection."
									) : (
										"Create an API key below, then add the MCP server to Claude."
									)}
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Step 1: API keys */}
				<section className="space-y-4">
					<div className="flex items-center gap-2">
						<span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 text-xs font-bold">
							1
						</span>
						<h2 className="text-base font-semibold text-zinc-900">Create an API key</h2>
					</div>

					{!adminConfigured && !isLoading && (
						<div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
							<p className="text-sm font-semibold text-amber-900">
								Server setup required
							</p>
							<p className="text-xs text-amber-800 leading-relaxed">
								Add your Firebase service account JSON file and point to it in{" "}
								<code className="bg-white/80 px-1 rounded">.env.local</code>, then
								restart the dev server:
							</p>
							<CodeBlock
								code={`GOOGLE_APPLICATION_CREDENTIALS=./inkgest-firebase-service-account.json`}
								copyLabel="Copy env line"
							/>
							<p className="text-xs text-amber-800 leading-relaxed">
								Get the JSON from Firebase Console → Project settings → Service
								accounts → Generate new private key. Or run locally:{" "}
								<code className="bg-white/80 px-1 rounded">
									node scripts/create-mcp-key.js YOUR_UID
								</code>
							</p>
						</div>
					)}

					<div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 space-y-4">
						<div className="flex flex-col sm:flex-row gap-2">
							<input
								type="text"
								value={newKeyName}
								onChange={(e) => setNewKeyName(e.target.value)}
								placeholder="Key name (e.g. Claude Desktop)"
								className="flex-1 px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
							/>
							<motion.button
								type="button"
								disabled={createMutation.isPending || !adminConfigured}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => createMutation.mutate()}
								className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-800 text-sm font-semibold rounded-xl disabled:opacity-60"
							>
								{createMutation.isPending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Plus className="w-4 h-4" />
								)}
								Create API key
							</motion.button>
						</div>

						<AnimatePresence>
							{revealedKey && (
								<motion.div
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3"
								>
									<div className="flex items-start gap-2">
										<AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
										<p className="text-xs text-amber-900 leading-relaxed">
											<strong>Copy this key now.</strong> You won&apos;t be able to see it
											again. Paste it into your Claude MCP config below.
										</p>
									</div>
									<div className="flex flex-col sm:flex-row sm:items-center gap-2">
										<code className="flex-1 px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-mono break-all text-zinc-900">
											{revealedKey.apiKey}
										</code>
										<CopyButton text={revealedKey.apiKey} label="Copy key" />
									</div>
									<button
										type="button"
										onClick={() => setRevealedKey(null)}
										className="text-xs text-amber-800 underline"
									>
										I&apos;ve saved my key
									</button>
								</motion.div>
							)}
						</AnimatePresence>

						{isLoading ? (
							<div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
								<Loader2 className="w-4 h-4 animate-spin" />
								Loading keys…
							</div>
						) : keys.length === 0 ? (
							<p className="text-sm text-zinc-500">No keys yet. Create one to get started.</p>
						) : (
							<ul className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden">
								{keys.map((k) => (
									<li
										key={k.id}
										className="flex items-center gap-3 px-3 py-2.5 bg-zinc-50/50"
									>
										<Key className="w-4 h-4 text-zinc-400 shrink-0" />
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-zinc-900 truncate">
												{k.name}
											</p>
											<p className="text-xs font-mono text-zinc-500">{k.prefix}</p>
											{k.lastUsedAt && (
												<p className="text-[10px] text-emerald-600 mt-0.5">
													Last used {formatWhen(k.lastUsedAt)}
												</p>
											)}
										</div>
										<button
											type="button"
											disabled={revokingId === k.id}
											onClick={() => handleRevoke(k.id)}
											className="p-2 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-50"
											title="Revoke key"
										>
											{revokingId === k.id ? (
												<Loader2 className="w-4 h-4 animate-spin" />
											) : (
												<Trash2 className="w-4 h-4" />
											)}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</section>

				{/* Step 2: Install */}
				<section className="space-y-4">
					<div className="flex items-center gap-2">
						<span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 text-zinc-800 text-xs font-bold">
							2
						</span>
						<h2 className="text-base font-semibold text-zinc-900">Install MCP server (once)</h2>
					</div>
					<div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 space-y-3">
						<p className="text-sm text-zinc-600 leading-relaxed">
							From your Inkgest project folder, install the local MCP server dependencies:
						</p>
						<CodeBlock code="yarn mcp:install" copyLabel="Copy command" />
						<p className="text-xs text-zinc-500">
							Requires Node 18+. Run this once per machine after cloning the repo, or publish
							the <code className="text-zinc-700">mcp-server</code> package separately later.
						</p>
					</div>
				</section>

				{/* Step 3: Claude configs */}
				<section className="space-y-4">
					<div className="flex items-center gap-2">
						<span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 text-xs font-bold">
							3
						</span>
						<h2 className="text-base font-semibold text-zinc-900">
							Add to Claude (one-time paste)
						</h2>
					</div>

					<SetupSection title="Claude Desktop" icon={Monitor} defaultOpen>
						<ol className="text-sm text-zinc-600 space-y-2 list-decimal list-inside leading-relaxed">
							<li>Open Claude Desktop → Settings → Developer → Edit Config</li>
							<li>
								Merge the JSON below into{" "}
								<code className="text-xs bg-zinc-100 px-1 rounded">mcpServers</code>
							</li>
							<li>
								Replace the full path in{" "}
								<code className="text-xs bg-zinc-100 px-1 rounded">args</code> with your
								local <code className="text-xs bg-zinc-100 px-1 rounded">mcp-server/index.js</code>{" "}
								path (use an absolute path — Claude may ignore{" "}
								<code className="text-xs bg-zinc-100 px-1 rounded">cwd</code>)
							</li>
							<li>Paste your API key from step 1 into INKGEST_API_KEY</li>
							<li>Restart Claude Desktop</li>
						</ol>
						<p className="text-xs text-zinc-500">
							Config file (macOS):{" "}
							<code className="bg-zinc-100 px-1 rounded">
								~/Library/Application Support/Claude/claude_desktop_config.json
							</code>
						</p>
						<CodeBlock code={claudeDesktopConfig} copyLabel="Copy config" />
					</SetupSection>

					<SetupSection title="Claude Code" icon={Terminal}>
						<ol className="text-sm text-zinc-600 space-y-2 list-decimal list-inside leading-relaxed">
							<li>
								In your project, add{" "}
								<code className="text-xs bg-zinc-100 px-1 rounded">.mcp.json</code> or merge
								into your Claude Code MCP settings
							</li>
							<li>
								Set the full absolute path to{" "}
								<code className="text-xs bg-zinc-100 px-1 rounded">mcp-server/index.js</code>{" "}
								in <code className="text-xs bg-zinc-100 px-1 rounded">args</code> (see config below)
							</li>
							<li>Paste your API key from step 1 into INKGEST_API_KEY</li>
						</ol>
						<CodeBlock code={claudeCodeConfig} copyLabel="Copy config" />
						<p className="text-xs text-zinc-500">
							Or run:{" "}
							<code className="bg-zinc-100 px-1 rounded">
								claude mcp add inkgest -- node index.js
							</code>{" "}
							from the <code className="bg-zinc-100 px-1 rounded">mcp-server</code> folder,
							then set env vars in the generated config.
						</p>
					</SetupSection>
				</section>

				{/* MCP activity logs */}
				{adminConfigured && (
					<section className="space-y-4">
						<div className="border border-zinc-200 rounded-2xl bg-white overflow-hidden">
							<button
								type="button"
								onClick={() => setLogsOpen((s) => !s)}
								className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-zinc-50 transition-colors"
							>
								<div className="p-2 rounded-xl bg-violet-50">
									<ScrollText className="w-4 h-4 text-violet-600" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-semibold text-zinc-900">
										MCP activity logs
									</p>
									<p className="text-xs text-zinc-500 truncate">
										{isConnected
											? `${integration?.totalInvocations ?? logs.length} invocation(s) from Claude`
											: "Shows tool calls once Claude connects"}
									</p>
								</div>
								{logsOpen ? (
									<ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
								) : (
									<ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
								)}
							</button>
							<AnimatePresence initial={false}>
								{logsOpen && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: "auto", opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										className="overflow-hidden border-t border-zinc-100"
									>
										<div className="px-4 py-4 max-h-[28rem] overflow-auto">
											{logsLoading ? (
												<div className="flex items-center gap-2 text-sm text-zinc-500 py-2">
													<Loader2 className="w-4 h-4 animate-spin" />
													Loading logs…
												</div>
											) : logs.length === 0 ? (
												<p className="text-sm text-zinc-500 py-2">
													No MCP calls yet. Use Claude to search or write a doc —
													activity will appear here.
												</p>
											) : (
												<McpLogsTable logs={logs} />
											)}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</section>
				)}

				<section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
					<h3 className="text-sm font-semibold text-zinc-900 mb-2">What Claude can do</h3>
					<ul className="text-sm text-zinc-600 space-y-1.5">
						<li>• Search your drafts and tables</li>
						<li>• Read document content by id</li>
						<li>• Create new markdown drafts</li>
						<li>• Update existing drafts</li>
						<li>• List, create, update, and delete writing tasks</li>
						<li>• Translate drafts (Claude translates, Inkgest saves to Firestore)</li>
					</ul>
					<p className="text-xs text-zinc-500 mt-3">
						API base URL for this workspace:{" "}
						<code className="bg-white px-1 rounded border border-zinc-200">{apiBase}</code>
					</p>
				</section>
			</div>
		</div>
	);
}
