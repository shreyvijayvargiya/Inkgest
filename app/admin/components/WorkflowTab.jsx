import React, { useCallback, useMemo, useState } from "react";
import {
	ReactFlow,
	MiniMap,
	Controls,
	Background,
	useEdgesState,
	useNodesState,
	addEdge,
	Handle,
	Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toast } from "sonner";
import {
	Plus,
	Trash2,
	Play,
	Save,
	Globe,
	Download,
	Link as LinkIcon,
	Wand2,
	FileEdit,
	UploadCloud,
	Send,
	Table2,
	X,
	Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import TiptapEditor from "./TiptapEditor";
import {
	generateNewsletterFromSources,
	runHttpRequest,
} from "../../../lib/api/automations";
import { createTable, checkTableExists } from "../../../lib/api/tables";
import { createBlog } from "../../../lib/api/blog";
import { createEmail } from "../../../lib/api/emails";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import ExportDropdown from "../../../lib/ui/ExportDropdown";

function uid(prefix = "node") {
	return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const HANDLE_CLASS =
	"!w-4 !h-4 !bg-zinc-900 !border-2 !border-white !shadow-md !z-50";

function parseUrls(input) {
	return String(input || "")
		.split(/[\n,]+/g)
		.map((u) => u.trim())
		.filter(Boolean);
}

function getIncomingNode(nodeId, nodes, edges) {
	const edge = edges.find((e) => e.target === nodeId);
	if (!edge) return null;
	return nodes.find((n) => n.id === edge.source) || null;
}

function InputNode({ data }) {
	const urls = data.urlsText ?? "";
	const [isTypeOpen, setIsTypeOpen] = useState(false);

	const typeOptions = useMemo(
		() => [
			{ value: "blog", label: "Blog post" },
			{ value: "email", label: "Email" },
		],
		[],
	);
	return (
		<div className="relative overflow-visible">
			<Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
			<Handle
				type="source"
				position={Position.Right}
				className={HANDLE_CLASS}
			/>
			<div className="rounded-2xl border border-zinc-200 bg-white shadow-sm w-[320px] overflow-hidden">
				<div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
					<p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
						Input
					</p>
					<p className="text-sm font-semibold text-zinc-900 mt-0.5">
						Sources + prompt
					</p>
				</div>
				<div className="p-4 space-y-3">
					<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
						Generate type
					</label>
					<AnimatedDropdown
						isOpen={isTypeOpen}
						onToggle={() => setIsTypeOpen((v) => !v)}
						onSelect={(value) => data.onChange({ contentType: value })}
						options={typeOptions}
						value={data.contentType ?? "newsletter"}
						placeholder="Select type..."
						buttonClassName="px-3 py-2 text-xs"
						optionClassName="text-xs"
					/>
					<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
						URLs (optional, one per line)
					</label>
					<textarea
						value={urls}
						onChange={(e) => data.onChange({ urlsText: e.target.value })}
						rows={4}
						className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
					/>
					<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
						Prompt (required)
					</label>
					<textarea
						value={data.prompt ?? ""}
						onChange={(e) => data.onChange({ prompt: e.target.value })}
						rows={3}
						className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
					/>
				</div>
			</div>
		</div>
	);
}

function GenerateNode({ data }) {
	return (
		<div className="relative overflow-visible">
			<Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
			<Handle
				type="source"
				position={Position.Right}
				className={HANDLE_CLASS}
			/>
			<div className="rounded-2xl border border-zinc-200 bg-white shadow-sm w-[320px] overflow-hidden">
				<div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
					<p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
						AI
					</p>
					<p className="text-sm font-semibold text-zinc-900 mt-0.5">
						Generate draft
					</p>
				</div>
				<div className="p-4 space-y-3">
					<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
						OpenRouter model (optional)
					</label>
					<input
						value={data.model ?? ""}
						onChange={(e) => data.onChange({ model: e.target.value })}
						placeholder='e.g. "openai/gpt-4o-mini"'
						className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
					/>

					<motion.button
						whileHover={{ scale: 1.01 }}
						whileTap={{ scale: 0.99 }}
						disabled={data.isRunning}
						onClick={data.onRun}
						className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-60"
					>
						<Play className="w-3.5 h-3.5" />
						{data.isRunning ? "Generating..." : "Run"}
					</motion.button>

					{data.lastRunAt ? (
						<p className="text-[11px] text-zinc-500">
							Last run:{" "}
							<span className="font-semibold">
								{new Date(data.lastRunAt).toLocaleTimeString()}
							</span>
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

function EditorNode({ data }) {
	return (
		<div className="relative overflow-visible">
			<Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
			<Handle
				type="source"
				position={Position.Right}
				className={HANDLE_CLASS}
			/>
			<div className="rounded-2xl border border-zinc-200 bg-white shadow-sm w-[520px] overflow-hidden flex flex-col max-h-[420px]">
				<div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
					<div>
						<p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
							Editor
						</p>
						<p className="text-sm font-semibold text-zinc-900 mt-0.5">
							Edit content
						</p>
					</div>
					{data.sourceLabel ? (
						<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
							{data.sourceLabel}
						</p>
					) : null}
				</div>
				<div className="p-3 flex-1 min-h-0">
					<TiptapEditor
						placeholder="Generated content will appear here..."
						content={data.content ?? ""}
						onChange={(val) => data.onChange({ content: val })}
					/>
				</div>
			</div>
		</div>
	);
}

function PublishNode({ data }) {
	const [isTargetOpen, setIsTargetOpen] = useState(false);
	const targetOptions = useMemo(
		() => [
			{ value: "emails", label: "Emails table" },
			{ value: "blogs", label: "Blogs table" },
		],
		[],
	);

	return (
		<div className="relative overflow-visible">
			<Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
			<Handle
				type="source"
				position={Position.Right}
				className={HANDLE_CLASS}
			/>
			<div className="rounded-2xl border border-zinc-200 bg-white shadow-sm w-[320px] overflow-hidden">
				<div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
					<p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
						Publish
					</p>
					<p className="text-sm font-semibold text-zinc-900 mt-0.5">
						Save to database
					</p>
				</div>
				<div className="p-4 space-y-3">
					<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
						Target
					</label>
					<AnimatedDropdown
						isOpen={isTargetOpen}
						onToggle={() => setIsTargetOpen((v) => !v)}
						onSelect={(value) => data.onChange({ target: value })}
						options={targetOptions}
						value={data.target ?? "emails"}
						placeholder="Select target..."
						buttonClassName="px-3 py-2 text-xs"
						optionClassName="text-xs"
					/>

					<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
						Title / Subject
					</label>
					<input
						value={data.title ?? ""}
						onChange={(e) => data.onChange({ title: e.target.value })}
						className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
					/>

					<motion.button
						whileHover={{ scale: 1.01 }}
						whileTap={{ scale: 0.99 }}
						disabled={data.isPublishing}
						onClick={data.onPublish}
						className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-60"
					>
						<Save className="w-3.5 h-3.5" />
						{data.isPublishing ? "Saving..." : "Save"}
					</motion.button>

					{data.savedId ? (
						<p className="text-[11px] text-zinc-500">
							Saved: <span className="font-semibold">{data.savedId}</span>
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

function SendNode({ data }) {
	const [isAudienceOpen, setIsAudienceOpen] = useState(false);
	const audienceOptions = useMemo(
		() => [
			{ value: "custom", label: "Custom email" },
			{ value: "subscribers", label: "Subscribers" },
			{ value: "users", label: "All users (verified)" },
			{ value: "customers", label: "Customers (coming next)" },
			{ value: "paid-users", label: "Paid users (coming next)" },
		],
		[],
	);

	return (
		<div className="relative overflow-visible">
			<Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
			<Handle
				type="source"
				position={Position.Right}
				className={HANDLE_CLASS}
			/>
			<div className="rounded-2xl border border-zinc-200 bg-white shadow-sm w-[320px] overflow-hidden">
				<div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
					<p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
						Send
					</p>
					<p className="text-sm font-semibold text-zinc-900 mt-0.5">
						Deliver email
					</p>
				</div>
				<div className="p-4 space-y-3">
					<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
						Audience
					</label>
					<AnimatedDropdown
						isOpen={isAudienceOpen}
						onToggle={() => setIsAudienceOpen((v) => !v)}
						onSelect={(value) => data.onChange({ audience: value })}
						options={audienceOptions}
						value={data.audience ?? "custom"}
						placeholder="Select audience..."
						buttonClassName="px-3 py-2 text-xs"
						optionClassName="text-xs"
					/>

					{data.audience === "custom" ? (
						<>
							<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
								To email
							</label>
							<input
								value={data.toEmail ?? ""}
								onChange={(e) => data.onChange({ toEmail: e.target.value })}
								className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
							/>
						</>
					) : null}

					<motion.button
						whileHover={{ scale: 1.01 }}
						whileTap={{ scale: 0.99 }}
						disabled={data.isSending}
						onClick={data.onSend}
						className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-60"
					>
						<Play className="w-3.5 h-3.5" />
						{data.isSending ? "Sending..." : "Send"}
					</motion.button>

					<p className="text-[11px] text-zinc-500">
						Note: subscribers/users require a saved email id.
					</p>
				</div>
			</div>
		</div>
	);
}

function HttpRequestNode({ data }) {
	const method = data.method ?? "GET";
	const authType = data.authType ?? "none";
	const apiKeyIn = data.apiKeyIn ?? "header";
	const showBody = method === "POST";
	const nodeId = data.__nodeId || "http";
	const [isMethodOpen, setIsMethodOpen] = useState(false);
	const [isApiKeyInOpen, setIsApiKeyInOpen] = useState(false);

	const methodOptions = useMemo(
		() => [
			{ value: "GET", label: "GET" },
			{ value: "POST", label: "POST" },
		],
		[],
	);

	const apiKeyInOptions = useMemo(
		() => [
			{ value: "header", label: "Header" },
			{ value: "query", label: "Query" },
		],
		[],
	);

	return (
		<div className="relative overflow-visible">
			<Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
			<Handle
				type="source"
				position={Position.Right}
				className={HANDLE_CLASS}
			/>
			<div className="rounded-2xl border border-zinc-200 bg-white shadow-sm w-[360px] overflow-hidden">
				<div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
					<div>
						<p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
							HTTP
						</p>
						<p className="text-sm font-semibold text-zinc-900 mt-0.5">
							Request
						</p>
					</div>
					<div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
						<Globe className="w-3.5 h-3.5" />
						{method}
					</div>
				</div>

				<div className="p-4 space-y-3">
					<div className="grid grid-cols-1 gap-2">
						<div className="col-span-1">
							<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
								Method
							</label>
							<div className="mt-1">
								<AnimatedDropdown
									isOpen={isMethodOpen}
									onToggle={() => setIsMethodOpen((v) => !v)}
									onSelect={(value) => data.onChange({ method: value })}
									options={methodOptions}
									value={method}
									placeholder="Method..."
									buttonClassName="px-3 py-2 text-xs"
									optionClassName="text-xs"
								/>
							</div>
						</div>
						<div className="col-span-2">
							<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
								URL
							</label>
							<input
								value={data.url ?? ""}
								onChange={(e) => data.onChange({ url: e.target.value })}
								placeholder="https://api.example.com/v1/..."
								className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
							Auth
						</label>
						<div className="flex items-center gap-3 text-xs">
							<label className="flex items-center gap-2">
								<input
									type="radio"
									name={`auth-${nodeId}`}
									checked={authType === "none"}
									onChange={() => data.onChange({ authType: "none" })}
								/>
								None
							</label>
							<label className="flex items-center gap-2">
								<input
									type="radio"
									name={`auth-${nodeId}`}
									checked={authType === "bearer"}
									onChange={() => data.onChange({ authType: "bearer" })}
								/>
								Bearer
							</label>
							<label className="flex items-center gap-2">
								<input
									type="radio"
									name={`auth-${nodeId}`}
									checked={authType === "apiKey"}
									onChange={() => data.onChange({ authType: "apiKey" })}
								/>
								API Key
							</label>
						</div>

						{authType === "bearer" ? (
							<input
								value={data.bearerToken ?? ""}
								onChange={(e) => data.onChange({ bearerToken: e.target.value })}
								placeholder="Bearer token"
								className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
							/>
						) : null}

						{authType === "apiKey" ? (
							<div className="space-y-2">
								<div className="grid grid-cols-2 gap-2">
									<input
										value={data.apiKeyName ?? ""}
										onChange={(e) =>
											data.onChange({ apiKeyName: e.target.value })
										}
										placeholder="Key name (e.g. x-api-key)"
										className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
									/>
									<input
										value={data.apiKeyValue ?? ""}
										onChange={(e) =>
											data.onChange({ apiKeyValue: e.target.value })
										}
										placeholder="Key value"
										className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
									/>
								</div>
								<div>
									<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
										Place key in
									</label>
									<div className="mt-1">
										<AnimatedDropdown
											isOpen={isApiKeyInOpen}
											onToggle={() => setIsApiKeyInOpen((v) => !v)}
											onSelect={(value) => data.onChange({ apiKeyIn: value })}
											options={apiKeyInOptions}
											value={apiKeyIn}
											placeholder="Header/Query..."
											buttonClassName="px-3 py-2 text-xs"
											optionClassName="text-xs"
										/>
									</div>
								</div>
							</div>
						) : null}
					</div>

					<div className="grid grid-cols-1 gap-2">
						<div>
							<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
								Headers (JSON)
							</label>
							<textarea
								value={data.headersJson ?? ""}
								onChange={(e) => data.onChange({ headersJson: e.target.value })}
								rows={4}
								placeholder={`{"Content-Type":"application/json"}`}
								className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
							/>
						</div>
						<div>
							<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
								Params (JSON)
							</label>
							<textarea
								value={data.paramsJson ?? ""}
								onChange={(e) => data.onChange({ paramsJson: e.target.value })}
								rows={4}
								placeholder={`{"q":"test"}`}
								className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
							/>
						</div>
					</div>

					{showBody ? (
						<div>
							<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
								Body (text)
							</label>
							<textarea
								value={data.bodyText ?? ""}
								onChange={(e) => data.onChange({ bodyText: e.target.value })}
								rows={5}
								placeholder={`{"hello":"world"}`}
								className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
							/>
						</div>
					) : null}

					<motion.button
						whileHover={{ scale: 1.01 }}
						whileTap={{ scale: 0.99 }}
						disabled={data.isRunning}
						onClick={data.onRun}
						className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-60"
					>
						<Play className="w-3.5 h-3.5" />
						{data.isRunning ? "Running..." : "Run request"}
					</motion.button>

					{data.lastResponse ? (
						<div className="pt-2 border-t border-zinc-100">
							<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">
								Response
							</p>
							<div className="p-3 rounded-2xl border border-zinc-200 bg-zinc-50">
								<p className="text-xs font-semibold text-zinc-900">
									{data.lastResponse.status} {data.lastResponse.statusText}
								</p>
								<pre className="mt-2 text-[11px] text-zinc-700 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
									{data.lastResponse.bodyText || ""}
								</pre>
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function ExportNode({ data }) {
	const exportItems = Array.isArray(data.exportItems) ? data.exportItems : [];
	return (
		<div className="relative overflow-visible">
			<Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
			<Handle
				type="source"
				position={Position.Right}
				className={HANDLE_CLASS}
			/>
			<div className="rounded-2xl border border-zinc-200 bg-white shadow-sm w-[320px] overflow-hidden">
				<div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
					<div>
						<p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
							Export
						</p>
						<p className="text-sm font-semibold text-zinc-900 mt-0.5">
							Download output
						</p>
					</div>
					<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
						{exportItems.length} item
						{exportItems.length === 1 ? "" : "s"}
					</p>
				</div>
				<div className="p-4 space-y-3">
					<p className="text-xs text-zinc-600">
						Exports the connected node output (editor or HTTP response).
					</p>
					<ExportDropdown
						dataType={data.dataType || "workflow"}
						data={exportItems}
					/>
					{data.preview ? (
						<div className="p-3 rounded-2xl border border-zinc-200 bg-zinc-50">
							<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
								Preview
							</p>
							<p className="mt-1 text-xs text-zinc-700 line-clamp-3">
								{data.preview}
							</p>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

const COLUMN_TYPES = [
	{ value: "text", label: "Text" },
	{ value: "id", label: "ID" },
	{ value: "number", label: "Number" },
	{ value: "boolean", label: "Boolean" },
	{ value: "date", label: "Date" },
	{ value: "email", label: "Email" },
	{ value: "url", label: "URL" },
	{ value: "array", label: "Array" },
	{ value: "object", label: "Object" },
];

function TableCreatorNode({ data }) {
	const columns = data.columns || [];
	const [isTypeOpen, setIsTypeOpen] = useState(null);

	const addColumn = () => {
		const newCol = {
			id: uid("col"),
			name: "",
			type: "text",
			required: false,
		};
		data.onChange({ columns: [...columns, newCol] });
	};

	const updateColumn = (colId, patch) => {
		data.onChange({
			columns: columns.map((c) => (c.id === colId ? { ...c, ...patch } : c)),
		});
	};

	const removeColumn = (colId) => {
		data.onChange({
			columns: columns.filter((c) => c.id !== colId),
		});
	};

	return (
		<div className="relative overflow-visible">
			<Handle type="target" position={Position.Left} className={HANDLE_CLASS} />
			<Handle
				type="source"
				position={Position.Right}
				className={HANDLE_CLASS}
			/>
			<div className="rounded-2xl border border-zinc-200 bg-white shadow-sm w-[420px] overflow-hidden">
				<div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between">
					<div>
						<p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
							Database
						</p>
						<p className="text-sm font-semibold text-zinc-900 mt-0.5">
							Create Table
						</p>
					</div>
					<Table2 className="w-4 h-4 text-zinc-400" />
				</div>
				<div className="p-4 space-y-3">
					<div>
						<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
							Table Name
						</label>
						<input
							value={data.tableName ?? ""}
							onChange={(e) =>
								data.onChange({
									tableName: e.target.value
										.toLowerCase()
										.replace(/[^a-z0-9_]/g, "_"),
								})
							}
							placeholder="my_table"
							className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
						/>
					</div>

					<div>
						<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
							Description (optional)
						</label>
						<input
							value={data.tableDescription ?? ""}
							onChange={(e) =>
								data.onChange({ tableDescription: e.target.value })
							}
							placeholder="Description of your table"
							className="mt-1 w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-4 focus:ring-zinc-900/5"
						/>
					</div>

					<div>
						<div className="flex items-center justify-between mb-2">
							<label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
								Columns
							</label>
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={addColumn}
								className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-zinc-100 text-zinc-700 text-[10px] font-semibold hover:bg-zinc-200"
							>
								<Plus className="w-3 h-3" /> Add
							</motion.button>
						</div>

						<div className="space-y-2 max-h-[200px] overflow-y-auto">
							{columns.length === 0 ? (
								<p className="text-xs text-zinc-400 italic">
									No columns added yet
								</p>
							) : (
								columns.map((col, idx) => (
									<div
										key={col.id}
										className="p-2 rounded-xl border border-zinc-100 bg-zinc-50 space-y-2"
									>
										<div className="flex items-center gap-2">
											<input
												value={col.name}
												onChange={(e) =>
													updateColumn(col.id, {
														name: e.target.value
															.toLowerCase()
															.replace(/[^a-z0-9_]/g, "_"),
													})
												}
												placeholder="column_name"
												className="flex-1 px-2 py-1.5 rounded-xl border border-zinc-200 text-xs outline-none focus:ring-2 focus:ring-zinc-900/5"
											/>
											<button
												onClick={() => removeColumn(col.id)}
												className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
											>
												<X className="w-3.5 h-3.5" />
											</button>
										</div>
										<div className="flex items-center gap-2">
											<AnimatedDropdown
												isOpen={isTypeOpen === col.id}
												onToggle={() =>
													setIsTypeOpen(isTypeOpen === col.id ? null : col.id)
												}
												onSelect={(value) =>
													updateColumn(col.id, { type: value })
												}
												options={COLUMN_TYPES}
												value={col.type}
												placeholder="Type..."
												buttonClassName="px-2 py-1.5 text-[10px]"
												optionClassName="text-[10px]"
											/>
											<label className="flex items-center gap-1 text-[10px] text-zinc-500">
												<input
													type="checkbox"
													checked={col.required}
													onChange={(e) =>
														updateColumn(col.id, { required: e.target.checked })
													}
													className="w-3 h-3"
												/>
												Required
											</label>
										</div>
									</div>
								))
							)}
						</div>
					</div>

					<motion.button
						whileHover={{ scale: 1.01 }}
						whileTap={{ scale: 0.99 }}
						disabled={data.isSaving}
						onClick={data.onSave}
						className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-60"
					>
						<Save className="w-3.5 h-3.5" />
						{data.isSaving ? "Creating..." : "Create Table"}
					</motion.button>

					{data.savedTableName ? (
						<p className="text-[11px] text-green-600">
							Created:{" "}
							<span className="font-semibold">{data.savedTableName}</span>
						</p>
					) : null}

					{data.error ? (
						<p className="text-[11px] text-red-500">{data.error}</p>
					) : null}
				</div>
			</div>
		</div>
	);
}

const nodeTypes = {
	inputNode: InputNode,
	generateNode: GenerateNode,
	editorNode: EditorNode,
	publishNode: PublishNode,
	sendNode: SendNode,
	httpRequestNode: HttpRequestNode,
	exportNode: ExportNode,
	tableCreatorNode: TableCreatorNode,
};

const WorkflowTab = () => {
	const initialNodes = useMemo(() => {
		const inputId = uid("input");
		const genId = uid("gen");
		const editorId = uid("editor");
		const publishId = uid("publish");
		const sendId = uid("send");
		const httpId = uid("http");
		const exportId = uid("export");
		const tableId = uid("table");

		return [
			{
				id: inputId,
				type: "inputNode",
				position: { x: 0, y: 0 },
				data: { urlsText: "", prompt: "", contentType: "newsletter" },
			},
			{
				id: genId,
				type: "generateNode",
				position: { x: 360, y: 0 },
				data: { model: "", isRunning: false },
			},
			{
				id: editorId,
				type: "editorNode",
				position: { x: 720, y: -40 },
				data: { content: "", sourceLabel: "AI output" },
			},
			{
				id: publishId,
				type: "publishNode",
				position: { x: 1280, y: 0 },
				data: { target: "emails", title: "", isPublishing: false, savedId: "" },
			},
			{
				id: sendId,
				type: "sendNode",
				position: { x: 1640, y: 0 },
				data: { audience: "custom", toEmail: "", isSending: false },
			},
			{
				id: httpId,
				type: "httpRequestNode",
				position: { x: 2000, y: 0 },
				data: {
					method: "GET",
					url: "",
					headersJson: "",
					paramsJson: "",
					bodyText: "",
					authType: "none",
					bearerToken: "",
					apiKeyName: "",
					apiKeyValue: "",
					apiKeyIn: "header",
					isRunning: false,
					lastResponse: null,
				},
			},
			{
				id: exportId,
				type: "exportNode",
				position: { x: 2380, y: 0 },
				data: {
					dataType: "workflow",
				},
			},
			{
				id: tableId,
				type: "tableCreatorNode",
				position: { x: 2780, y: 0 },
				data: {
					tableName: "",
					tableDescription: "",
					columns: [],
					isSaving: false,
					savedTableName: "",
					error: "",
				},
			},
		];
	}, []);

	const initialEdges = useMemo(
		() => [
			{ id: "e1", source: initialNodes[0].id, target: initialNodes[1].id },
			{ id: "e2", source: initialNodes[1].id, target: initialNodes[2].id },
			{ id: "e3", source: initialNodes[2].id, target: initialNodes[3].id },
			{ id: "e4", source: initialNodes[3].id, target: initialNodes[4].id },
			{ id: "e5", source: initialNodes[4].id, target: initialNodes[5].id },
			{ id: "e6", source: initialNodes[5].id, target: initialNodes[6].id },
			{ id: "e7", source: initialNodes[6].id, target: initialNodes[7].id },
		],
		[initialNodes],
	);

	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	const updateNodeData = useCallback(
		(nodeId, patch) => {
			setNodes((nds) =>
				nds.map((n) =>
					n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
				),
			);
		},
		[setNodes],
	);

	const onConnect = useCallback(
		(params) =>
			setEdges((eds) =>
				addEdge(
					{
						...params,
						animated: true,
						style: { stroke: "#e0e0e0" },
					},
					eds,
				),
			),
		[setEdges],
	);

	const addNode = (type) => {
		const selected = nodes.find((n) => n.selected);
		const id = uid(type);
		setNodes((nds) => {
			const base = selected
				? { x: selected.position.x + 380, y: selected.position.y }
				: { x: 120, y: 220 + nds.length * 40 };

			const getNodeData = () => {
				switch (type) {
					case "inputNode":
						return { urlsText: "", prompt: "", contentType: "newsletter" };
					case "generateNode":
						return { model: "", isRunning: false };
					case "editorNode":
						return { content: "", sourceLabel: "" };
					case "publishNode":
						return {
							target: "emails",
							title: "",
							isPublishing: false,
							savedId: "",
						};
					case "sendNode":
						return { audience: "custom", toEmail: "", isSending: false };
					case "httpRequestNode":
						return {
							method: "GET",
							url: "",
							headersJson: "",
							paramsJson: "",
							bodyText: "",
							authType: "none",
							bearerToken: "",
							apiKeyName: "",
							apiKeyValue: "",
							apiKeyIn: "header",
							isRunning: false,
							lastResponse: null,
						};
					case "tableCreatorNode":
						return {
							tableName: "",
							tableDescription: "",
							columns: [],
							isSaving: false,
							savedTableName: "",
							error: "",
						};
					default:
						return { dataType: "workflow" };
				}
			};

			return [
				...nds,
				{
					id,
					type,
					position: base,
					data: getNodeData(),
				},
			];
		});

		// Auto-connect: selected node -> new node
		if (selected) {
			setEdges((eds) =>
				addEdge(
					{
						id: uid("edge"),
						source: selected.id,
						target: id,
						animated: true,
						style: { stroke: "#e0e0e0" },
					},
					eds,
				),
			);
		} else {
			toast.info("Tip: select a node first to auto-connect the next step.");
		}
	};

	const removeSelected = () => {
		setNodes((nds) => nds.filter((n) => !n.selected));
		setEdges((eds) => eds.filter((e) => !e.selected));
	};

	const wireNodeHandlers = useMemo(() => {
		// attach per-node handlers so nodes can mutate state and run actions
		return nodes.map((n) => {
			const dataWithId = { ...n.data, __nodeId: n.id };

			if (n.type === "inputNode") {
				return {
					...n,
					data: {
						...dataWithId,
						onChange: (patch) => updateNodeData(n.id, patch),
					},
				};
			}

			if (n.type === "generateNode") {
				return {
					...n,
					data: {
						...dataWithId,
						onChange: (patch) => updateNodeData(n.id, patch),
						onRun: async () => {
							const input = getIncomingNode(n.id, nodes, edges);
							const urls = parseUrls(input?.data?.urlsText || "");
							const prompt = input?.data?.prompt || "";

							if (!String(prompt || "").trim()) {
								toast.error("Prompt is required (URLs are optional).");
								return;
							}

							updateNodeData(n.id, { isRunning: true });
							try {
								const result = await generateNewsletterFromSources({
									urls,
									prompt,
									model: n.data.model || undefined,
								});

								// push output into the first connected editor node (if any)
								const outEdge = edges.find((e) => e.source === n.id);
								const editor = outEdge
									? nodes.find((x) => x.id === outEdge.target)
									: null;
								if (editor?.type === "editorNode") {
									updateNodeData(editor.id, { content: result.content || "" });
								}

								updateNodeData(n.id, { lastRunAt: Date.now() });
								toast.success("Generated!");
							} catch (e) {
								toast.error(e?.message || "Generation failed");
							} finally {
								updateNodeData(n.id, { isRunning: false });
							}
						},
					},
				};
			}

			if (n.type === "editorNode") {
				return {
					...n,
					data: {
						...dataWithId,
						onChange: (patch) => updateNodeData(n.id, patch),
					},
				};
			}

			if (n.type === "publishNode") {
				return {
					...n,
					data: {
						...dataWithId,
						onChange: (patch) => updateNodeData(n.id, patch),
						onPublish: async () => {
							const prev = getIncomingNode(n.id, nodes, edges);
							const content = prev?.data?.content || "";
							if (!content) {
								toast.error("Connect an Editor node with content.");
								return;
							}

							updateNodeData(n.id, { isPublishing: true });
							try {
								if ((n.data.target || "emails") === "blogs") {
									const id = await createBlog({
										title: n.data.title || "Untitled",
										slug:
											(n.data.title || "untitled")
												.toLowerCase()
												.replace(/[^a-z0-9]+/g, "-")
												.replace(/(^-|-$)/g, "") || "untitled",
										author: "Admin",
										status: "draft",
										content,
									});
									updateNodeData(n.id, { savedId: id });
									toast.success("Saved blog draft");
								} else {
									const id = await createEmail({
										subject: n.data.title || "Untitled",
										status: "draft",
										content,
									});
									updateNodeData(n.id, { savedId: id });
									toast.success("Saved email draft");
								}
							} catch (e) {
								toast.error(e?.message || "Save failed");
							} finally {
								updateNodeData(n.id, { isPublishing: false });
							}
						},
					},
				};
			}

			if (n.type === "sendNode") {
				return {
					...n,
					data: {
						...dataWithId,
						onChange: (patch) => updateNodeData(n.id, patch),
						onSend: async () => {
							const prev = getIncomingNode(n.id, nodes, edges);
							const emailId = prev?.data?.savedId || "";
							const editorNode = getIncomingNode(prev?.id, nodes, edges);
							const subject = prev?.data?.title || "No Subject";
							const content = editorNode?.data?.content || "";

							if (!content) {
								toast.error(
									"Missing content (connect Editor → Publish → Send).",
								);
								return;
							}

							updateNodeData(n.id, { isSending: true });
							try {
								if (n.data.audience === "custom") {
									if (!n.data.toEmail) {
										toast.error("Enter a custom email address.");
										return;
									}
									const r = await fetch("/api/emails/send-single", {
										method: "POST",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({
											email: n.data.toEmail,
											subject,
											content,
										}),
									});
									const d = await r.json();
									if (!r.ok) throw new Error(d?.error || "Send failed");
									toast.success("Sent");
									return;
								}

								// These endpoints require emailId
								if (!emailId) {
									toast.error(
										"Save an email first (Publish node) to get emailId.",
									);
									return;
								}

								const route =
									n.data.audience === "subscribers"
										? "/api/emails/send"
										: n.data.audience === "users"
											? "/api/emails/send-to-users"
											: null;

								if (!route) {
									toast.info("Customers/paid users are next to add.");
									return;
								}

								const r = await fetch(route, {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ emailId, subject, content }),
								});
								const d = await r.json();
								if (!r.ok) throw new Error(d?.error || "Send failed");
								toast.success(d?.message || "Sent");
							} catch (e) {
								toast.error(e?.message || "Send failed");
							} finally {
								updateNodeData(n.id, { isSending: false });
							}
						},
					},
				};
			}

			if (n.type === "httpRequestNode") {
				return {
					...n,
					data: {
						...dataWithId,
						onChange: (patch) => updateNodeData(n.id, patch),
						onRun: async () => {
							updateNodeData(n.id, { isRunning: true });
							try {
								const result = await runHttpRequest({
									method: n.data.method || "GET",
									url: n.data.url || "",
									headersJson: n.data.headersJson || "",
									paramsJson: n.data.paramsJson || "",
									bodyText: n.data.bodyText || "",
									authType: n.data.authType || "none",
									bearerToken: n.data.bearerToken || "",
									apiKeyName: n.data.apiKeyName || "",
									apiKeyValue: n.data.apiKeyValue || "",
									apiKeyIn: n.data.apiKeyIn || "header",
								});

								updateNodeData(n.id, {
									lastResponse: result?.response || null,
									lastRunAt: Date.now(),
								});

								// If this HTTP node connects to an Editor node, append response body.
								const outEdge = edges.find((e) => e.source === n.id);
								const next = outEdge
									? nodes.find((x) => x.id === outEdge.target)
									: null;
								if (next?.type === "editorNode") {
									const prevContent = next.data?.content || "";
									const body = result?.response?.bodyText || "";
									updateNodeData(next.id, {
										content: `${prevContent}\n\n---\n\n${body}`.trim(),
										sourceLabel: "HTTP response",
									});
								}

								toast.success("HTTP request complete");
							} catch (e) {
								toast.error(e?.message || "HTTP request failed");
							} finally {
								updateNodeData(n.id, { isRunning: false });
							}
						},
					},
				};
			}

			if (n.type === "exportNode") {
				const prev = getIncomingNode(n.id, nodes, edges);
				let exportItems = [];
				let preview = "";

				if (prev?.type === "editorNode") {
					const content = prev.data?.content || "";
					exportItems = [
						{
							type: "editor",
							sourceLabel: prev.data?.sourceLabel || "",
							content,
							exportedAt: new Date().toISOString(),
						},
					];
					preview = String(content || "").slice(0, 140);
				} else if (prev?.type === "httpRequestNode") {
					const body = prev.data?.lastResponse?.bodyText || "";
					exportItems = [
						{
							type: "http",
							method: prev.data?.method || "GET",
							url: prev.data?.url || "",
							status: prev.data?.lastResponse?.status,
							statusText: prev.data?.lastResponse?.statusText,
							bodyText: body,
							exportedAt: new Date().toISOString(),
						},
					];
					preview = String(body || "").slice(0, 140);
				} else if (prev?.type) {
					exportItems = [
						{
							type: prev.type,
							data: prev.data || {},
							exportedAt: new Date().toISOString(),
						},
					];
					preview = JSON.stringify(prev.data || {}).slice(0, 140);
				}

				return {
					...n,
					data: {
						...dataWithId,
						exportItems,
						preview,
					},
				};
			}

			if (n.type === "tableCreatorNode") {
				return {
					...n,
					data: {
						...dataWithId,
						onChange: (patch) => updateNodeData(n.id, patch),
						onSave: async () => {
							const tableName = n.data.tableName?.trim();
							const columns = n.data.columns || [];

							if (!tableName) {
								updateNodeData(n.id, { error: "Table name is required" });
								toast.error("Table name is required");
								return;
							}

							if (columns.length === 0) {
								updateNodeData(n.id, { error: "Add at least one column" });
								toast.error("Add at least one column");
								return;
							}

							const invalidCols = columns.filter((c) => !c.name?.trim());
							if (invalidCols.length > 0) {
								updateNodeData(n.id, { error: "All columns must have names" });
								toast.error("All columns must have names");
								return;
							}

							updateNodeData(n.id, { isSaving: true, error: "" });

							try {
								// Check if table already exists
								const exists = await checkTableExists(tableName);
								if (exists) {
									updateNodeData(n.id, {
										isSaving: false,
										error: `Table "${tableName}" already exists. Please choose a different name.`,
									});
									toast.error(`Table "${tableName}" already exists`);
									return;
								}

								// Create the table
								await createTable({
									tableName,
									description: n.data.tableDescription || "",
									columns: columns.map((c) => ({
										name: c.name,
										type: c.type,
										required: c.required,
									})),
								});

								updateNodeData(n.id, {
									savedTableName: tableName,
									isSaving: false,
									error: "",
								});
								toast.success(`Table "${tableName}" created successfully!`);
							} catch (e) {
								updateNodeData(n.id, {
									isSaving: false,
									error: e?.message || "Failed to create table",
								});
								toast.error(e?.message || "Failed to create table");
							}
						},
					},
				};
			}

			return n;
		});
	}, [nodes, edges, updateNodeData, setNodes]);

	return (
		<div className="h-[calc(100vh-170px)] min-h-[520px] flex flex-col gap-3">
			<div className="flex items-start justify-between border-b border-zinc-200 px-4 pb-3">
				<div>
					<h1 className="text-lg font-semibold text-zinc-900">
						Workflow Automations
					</h1>
					<p className="text-sm text-zinc-500 font-medium mt-1">
						AI workflows to speed up your content and operations.
					</p>
				</div>
				<div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
					<Sparkles className="w-4 h-4" />
					Workflow Automations
				</div>
			</div>
			<div className="flex items-center justify-between px-4">
				<div className="flex items-center gap-2">
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => addNode("inputNode")}
						className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50"
					>
						<LinkIcon className="w-4 h-4" /> Input
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => addNode("generateNode")}
						className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50"
					>
						<Wand2 className="w-4 h-4" /> Generate
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => addNode("editorNode")}
						className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50"
					>
						<FileEdit className="w-4 h-4" /> Editor
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => addNode("publishNode")}
						className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50"
					>
						<UploadCloud className="w-4 h-4" /> Publish
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => addNode("sendNode")}
						className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50"
					>
						<Send className="w-4 h-4" /> Send
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => addNode("httpRequestNode")}
						className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50"
					>
						<Globe className="w-4 h-4" /> HTTP
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => addNode("exportNode")}
						className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50"
					>
						<Download className="w-4 h-4" /> Export
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={() => addNode("tableCreatorNode")}
						className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50"
					>
						<Table2 className="w-4 h-4" /> Table
					</motion.button>
				</div>

				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={removeSelected}
					className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50 text-zinc-700"
				>
					<Trash2 className="w-4 h-4" />
					Remove selected
				</motion.button>
			</div>

			<div className="mx-4 flex-1 min-h-0 rounded-3xl border border-zinc-200 bg-white overflow-hidden">
				<ReactFlow
					nodes={wireNodeHandlers}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					nodeTypes={nodeTypes}
					defaultEdgeOptions={{
						animated: true,
						type: "smoothstep",
						style: { stroke: "#e0e0e0", strokeWidth: 2 },
					}}
					connectionLineStyle={{ stroke: "#e0e0e0", strokeWidth: 2 }}
					nodesConnectable
					fitView
				>
					<MiniMap />
					<Controls />
					<Background />
				</ReactFlow>
			</div>
		</div>
	);
};

export default WorkflowTab;
