import React, { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	X,
	FileText,
	Link2,
	Loader2,
	Unplug,
	ExternalLink,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { auth } from "../config/firebase";
import {
	postComposioOAuthLink,
	postComposioPush,
	getComposioConnection,
	deleteComposioConnection,
	normalizePushResponse,
	inferExportDocUrl,
} from "../api/composioIntegrations";
import { mergeDraftComposioExport } from "../api/draftComposioExports";

const PLATFORMS = [
	{
		id: "notion",
		label: "Notion",
		short: "Notion",
	},
	{
		id: "googledocs",
		label: "Google Doc",
		short: "Docs",
	},
];

function draftHtmlToPlainText(html) {
	if (typeof document === "undefined") return String(html || "").replace(/<[^>]+>/g, " ").trim();
	const el = document.createElement("div");
	el.innerHTML = html || "";
	return (el.innerText || "").trim();
}

/**
 * Export draft to Notion / Google Docs via Composio (Hono).
 */
export default function DraftExportModal({
	open,
	onClose,
	theme: T,
	draftId,
	userId,
	assetSource = "assets",
	composioExportLinks = {},
	getExportPayload,
}) {
	const queryClient = useQueryClient();
	const [activePlatform, setActivePlatform] = useState("notion");
	const [notionParentId, setNotionParentId] = useState("");

	const activeMeta = PLATFORMS.find((p) => p.id === activePlatform);

	const stored = composioExportLinks?.[activePlatform] || null;

	/** Stored URL from Firestore or infer Google Doc link from saved id */
	const resolvedExportUrl = useMemo(() => {
		if (!stored) return "";
		const u = String(stored.url || "").trim();
		if (/^https?:\/\//i.test(u)) return u;
		return inferExportDocUrl(activePlatform, stored.documentId) || "";
	}, [stored, activePlatform]);

	const { data: connection, isLoading: connectionLoading } = useQuery({
		queryKey: ["composio-connection", activePlatform, userId],
		queryFn: async () => {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) return null;
			return getComposioConnection(idToken, userId, activePlatform);
		},
		enabled: open && !!userId && !!activePlatform,
		retry: false,
		staleTime: 45 * 1000,
	});

	useEffect(() => {
		if (open && userId) {
			queryClient.invalidateQueries({
				queryKey: ["composio-connection", activePlatform, userId],
			});
		}
	}, [open, activePlatform, userId, queryClient]);

	const connected = connection != null;

	const connectMutation = useMutation({
		mutationFn: async () => {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Sign in required");
			if (!userId || String(userId).trim() === "") {
				throw new Error("userId is required");
			}
			const origin =
				typeof window !== "undefined" ? window.location.origin : "";
			const callbackUrl = `${origin}/app/integrations/callback?platform=${encodeURIComponent(activePlatform)}`;
			if (typeof window !== "undefined") {
				sessionStorage.setItem("composio_oauth_pending_platform", activePlatform);
				sessionStorage.setItem(
					"composio_oauth_return",
					window.location.pathname + window.location.search,
				);
			}
			return postComposioOAuthLink(idToken, {
				platform: activePlatform,
				userId: String(userId),
				callbackUrl,
			});
		},
		onSuccess: (data) => {
			const url = data?.redirectUrl || data?.url;
			if (url && typeof window !== "undefined") {
				window.location.href = url;
				return;
			}
			toast.error("No redirect URL from server");
		},
		onError: (e) => toast.error(e.message || "Could not start OAuth"),
	});

	const disconnectMutation = useMutation({
		mutationFn: async () => {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Sign in required");
			return deleteComposioConnection(idToken, userId, activePlatform);
		},
		onSuccess: () => {
			toast.success("Disconnected");
			queryClient.invalidateQueries({
				queryKey: ["composio-connection", activePlatform, userId],
			});
		},
		onError: (e) => toast.error(e.message || "Disconnect failed"),
	});

	const pushMutation = useMutation({
		mutationFn: async ({ action }) => {
			const idToken = await auth.currentUser?.getIdToken();
			if (!idToken) throw new Error("Sign in required");
			const payload =
				typeof getExportPayload === "function" ? getExportPayload() : {};
			const title = payload.title?.trim?.() || "Untitled draft";
			const html = payload.html ?? "";
			const content = draftHtmlToPlainText(html);

			const body = {
				platform: activePlatform,
				action,
				title,
				content,
			};
			if (action === "update") {
				if (!stored?.documentId) {
					throw new Error("Nothing to update yet — use Create first");
				}
				body.documentId = stored.documentId;
			}
			if (
				activePlatform === "notion" &&
				action === "create" &&
				notionParentId.trim()
			) {
				body.notionParentId = notionParentId.trim();
			}

			const res = await postComposioPush(idToken, userId, body);
			let { url, documentId } = normalizePushResponse(res);
			const mergedDocId =
				documentId?.trim?.() ||
				stored?.documentId?.trim?.() ||
				"";
			if (!url.trim() && mergedDocId) {
				url = inferExportDocUrl(activePlatform, mergedDocId);
			}
			const persistedUrl =
				url?.trim?.() ||
				stored?.url?.trim?.() ||
				inferExportDocUrl(activePlatform, mergedDocId) ||
				"";

			await mergeDraftComposioExport(
				userId,
				draftId,
				assetSource,
				activePlatform,
				{
					url: persistedUrl,
					documentId: mergedDocId,
					...(activePlatform === "notion" && notionParentId.trim()
						? { notionParentId: notionParentId.trim() }
						: {}),
				},
				composioExportLinks,
			);
			return res;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["doc", draftId, userId] });
			queryClient.invalidateQueries({ queryKey: ["assets", userId] });
			toast.success("Export complete");
			pushMutation.reset();
		},
		onError: (e) => toast.error(e.message || "Export failed"),
	});

	const canUpdate = !!String(stored?.documentId || "").trim();

	const sidebarStyle = useMemo(
		() => ({
			width: 168,
			borderRight: `1px solid ${T.border}`,
			background: T.base,
			flexShrink: 0,
			padding: "12px 10px",
			display: "flex",
			flexDirection: "column",
			gap: 6,
		}),
		[T],
	);

	if (typeof document === "undefined") return null;

	return createPortal(
		<AnimatePresence>
			{open && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 12050,
						background: "rgba(26,26,26,0.45)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: 20,
					}}
					onClick={onClose}
				>
					<motion.div
						initial={{ opacity: 0, scale: 0.97 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.97 }}
						transition={{ duration: 0.18 }}
						onClick={(e) => e.stopPropagation()}
						style={{
							width: "min(560px, 100%)",
							maxHeight: "min(88vh, 640px)",
							background: T.surface,
							borderRadius: 14,
							boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
							display: "flex",
							overflow: "hidden",
							border: `1px solid ${T.border}`,
						}}
					>
						{/* Tool sidebar */}
						<aside style={sidebarStyle}>
							<p
								style={{
									fontSize: 10,
									fontWeight: 700,
									color: T.muted,
									letterSpacing: "0.08em",
									padding: "4px 8px 10px",
									margin: 0,
								}}
							>
								Connect tools
							</p>
							{PLATFORMS.map((p) => {
								const sel = activePlatform === p.id;
								const linkRow = composioExportLinks?.[p.id];
								const hasSavedExport = !!(
									String(linkRow?.url || "").trim() ||
									String(linkRow?.documentId || "").trim()
								);
								return (
									<button
										key={p.id}
										type="button"
										onClick={() => setActivePlatform(p.id)}
										style={{
											display: "flex",
											alignItems: "center",
											gap: 8,
											padding: "10px 11px",
											borderRadius: 10,
											border: sel ? `1px solid ${T.accent}` : `1px solid transparent`,
											background: sel ? T.surface : "transparent",
											cursor: "pointer",
											textAlign: "left",
											fontFamily: "'Outfit',sans-serif",
										}}
									>
										<FileText
											size={16}
											strokeWidth={2}
											color={sel ? T.accent : T.muted}
										/>
										<span
											style={{
												fontSize: 13,
												fontWeight: sel ? 700 : 600,
												color: sel ? T.accent : T.muted,
												flex: 1,
												minWidth: 0,
											}}
										>
											{p.short}
										</span>
										{hasSavedExport ? (
											<span
												title="Draft has a saved link for updates"
												style={{
													width: 6,
													height: 6,
													borderRadius: "50%",
													background: "#22C55E",
													flexShrink: 0,
												}}
											/>
										) : null}
									</button>
								);
							})}
						</aside>

						<div
							style={{
								flex: 1,
								display: "flex",
								flexDirection: "column",
								minWidth: 0,
								background: T.surface,
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
									padding: "14px 18px",
									borderBottom: `1px solid ${T.border}`,
								}}
							>
								<div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
									<h2
										style={{
											margin: 0,
											fontSize: 16,
											fontWeight: 700,
											color: T.accent,
											fontFamily: "'Outfit',sans-serif",
										}}
									>
										Export
									</h2>
									<p style={{ margin: 0, fontSize: 12, color: T.muted }}>
										{activeMeta?.label} · create a new doc or refresh the last one
									</p>
								</div>
								<button
									type="button"
									onClick={onClose}
									style={{
										border: "none",
										background: T.base,
										borderRadius: 10,
										padding: 8,
										cursor: "pointer",
										color: T.muted,
									}}
								>
									<X size={18} />
								</button>
							</div>

							<div
								style={{
									padding: "16px 18px",
									flex: 1,
									overflowY: "auto",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: 10,
										marginBottom: 16,
									}}
								>
									{connectionLoading ? (
										<Loader2
											className="animate-spin"
											size={18}
											color={T.muted}
										/>
									) : (
										<span
											style={{
												fontSize: 12,
												fontWeight: 700,
												color: connected ? "#166534" : T.muted,
												background: connected ? "#DCFCE7" : T.base,
												padding: "6px 10px",
												borderRadius: 8,
											}}
										>
											{connected ? "Connected" : "Not connected"}
										</span>
									)}
									{connected ? (
										<button
											type="button"
											disabled={disconnectMutation.isPending}
											onClick={() => disconnectMutation.mutate()}
											style={{
												marginLeft: "auto",
												display: "inline-flex",
												alignItems: "center",
												gap: 6,
												fontSize: 11,
												fontWeight: 600,
												color: T.muted,
												background: "none",
												border: `1px solid ${T.border}`,
												borderRadius: 8,
												padding: "6px 10px",
												cursor: "pointer",
												fontFamily: "'Outfit',sans-serif",
											}}
										>
											<Unplug size={14} />
											Disconnect
										</button>
									) : (
										<button
											type="button"
											disabled={connectMutation.isPending || !userId}
											onClick={() => connectMutation.mutate()}
											style={{
												marginLeft: "auto",
												display: "inline-flex",
												alignItems: "center",
												gap: 6,
												fontSize: 12,
												fontWeight: 700,
												color: "#fff",
												background: T.accent,
												border: "none",
												borderRadius: 8,
												padding: "8px 14px",
												cursor: "pointer",
												fontFamily: "'Outfit',sans-serif",
											}}
										>
											{connectMutation.isPending ? (
												<Loader2 size={16} className="animate-spin" />
											) : (
												<Link2 size={16} />
											)}
											Connect {activeMeta?.short}
										</button>
									)}
								</div>

								{activePlatform === "notion" && (
									<label
										style={{
											display: "block",
											marginBottom: 14,
											fontFamily: "'Outfit',sans-serif",
										}}
									>
										<span
											style={{
												fontSize: 11,
												fontWeight: 700,
												color: T.muted,
												display: "block",
												marginBottom: 6,
											}}
										>
											Notion parent page (optional)
										</span>
										<input
											value={notionParentId}
											onChange={(e) => setNotionParentId(e.target.value)}
											placeholder="e.g. page ID to nest new pages under"
											style={{
												width: "100%",
												padding: "10px 12px",
												borderRadius: 10,
												border: `1px solid ${T.border}`,
												fontSize: 13,
												fontFamily: "'Outfit',sans-serif",
												background: T.base,
												color: T.accent,
											}}
										/>
									</label>
								)}

								{(resolvedExportUrl || String(stored?.documentId || "").trim()) && (
										<div
											style={{
												marginBottom: 16,
												padding: 14,
												borderRadius: 12,
												background: T.base,
												border: `1px solid ${T.border}`,
											}}
										>
											<p
												style={{
													margin: "0 0 8px",
													fontSize: 11,
													fontWeight: 700,
													color: T.muted,
												}}
											>
												Saved export (synced to this draft)
											</p>
											{resolvedExportUrl ? (
												<div
													style={{
														display: "flex",
														flexWrap: "wrap",
														alignItems: "center",
														gap: 10,
													}}
												>
													<a
														href={resolvedExportUrl}
														target="_blank"
														rel="noopener noreferrer"
														style={{
															display: "inline-flex",
															alignItems: "center",
															gap: 6,
															fontSize: 13,
															fontWeight: 600,
															color: T.warm ?? "#C17B2F",
															textDecoration: "none",
															wordBreak: "break-all",
															flex: 1,
															minWidth: 0,
														}}
													>
														<ExternalLink size={15} />
														Open in {activeMeta?.label}
													</a>
													<button
														type="button"
														onClick={() => {
															navigator.clipboard?.writeText?.(
																resolvedExportUrl,
															);
															toast.success("Link copied");
														}}
														style={{
															flexShrink: 0,
															fontSize: 11,
															fontWeight: 600,
															color: T.muted,
															background: T.surface,
															border: `1px solid ${T.border}`,
															borderRadius: 8,
															padding: "6px 10px",
															cursor: "pointer",
															fontFamily: "'Outfit',sans-serif",
														}}
													>
														Copy link
													</button>
												</div>
											) : (
												<p
													style={{
														margin: 0,
														fontSize: 12,
														color: T.muted,
														fontFamily: "monospace",
														wordBreak: "break-all",
													}}
												>
													Document id:{" "}
													<strong style={{ fontWeight: 600 }}>{stored?.documentId}</strong>
													<span
														style={{
															display: "block",
															marginTop: 6,
															fontSize: 11,
															fontFamily: "'Outfit',sans-serif",
														}}
													>
														Open the tool to view the page once the backend returns a
														link.
													</span>
												</p>
											)}
										</div>
									)}

								<div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
									<button
										type="button"
										disabled={
											!connected || pushMutation.isPending || connectMutation.isPending
										}
										onClick={() => pushMutation.mutate({ action: "create" })}
										style={{
											flex: 1,
											minWidth: 120,
											padding: "10px 14px",
											borderRadius: 10,
											border: `1px solid ${T.border}`,
											background: T.base,
											color: T.accent,
											fontWeight: 700,
											fontSize: 13,
											cursor:
												!connected || pushMutation.isPending
													? "not-allowed"
													: "pointer",
											opacity:
												!connected || pushMutation.isPending ? 0.5 : 1,
											fontFamily: "'Outfit',sans-serif",
										}}
									>
										{pushMutation.isPending ? "Working…" : "Create new"}
									</button>
									
								</div>
							</div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>,
		document.body,
	);
}
