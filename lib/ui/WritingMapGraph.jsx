import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
	Search,
	Loader2,
	Network,
	Info,
	Maximize2,
	Zap,
} from "lucide-react";
import { listAssets } from "../api/userAssets";
import { loadWritingTasks } from "../utils/writingTasksStore";
import { getEmbedding, cosineSimilarity } from "../utils/embeddings";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

const SEMANTIC_LINK_THRESHOLD = 0.72;
const SEARCH_SEMANTIC_THRESHOLD = 0.55;

function truncate(str, max = 72) {
	const s = String(str || "").trim();
	if (s.length <= max) return s;
	return `${s.slice(0, max - 1)}…`;
}

function plainText(value) {
	return String(value || "")
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function buildNodeText(node) {
	if (node.kind === "task") {
		return `${node.name} ${node.description || ""}`.trim();
	}
	return `${node.name} ${node.preview || node.description || ""}`.trim();
}

function useMapNodes(reduxUser) {
	const userId = reduxUser?.uid;

	const { data: assets = [], isLoading: assetsLoading } = useQuery({
		queryKey: ["assets", userId],
		queryFn: () => listAssets(userId),
		enabled: !!userId,
		staleTime: 2 * 60 * 1000,
	});

	const { data: tasks = [] } = useQuery({
		queryKey: ["writingTasks", userId || "guest"],
		queryFn: () => loadWritingTasks(userId),
		enabled: !!reduxUser,
		staleTime: Infinity,
	});

	const nodes = useMemo(() => {
		const out = [];

		for (const task of tasks) {
			if (!task.title?.trim() && !task.description?.trim()) continue;
			out.push({
				id: `task:${task.id}`,
				rawId: task.id,
				kind: "task",
				name: task.title || "Untitled task",
				description: task.description || "",
				status: task.status,
				draftId: task.draftId || null,
				val: 1.2,
			});
		}

		for (const asset of assets) {
			const text = plainText(
				`${asset.title || ""} ${asset.preview || asset.description || asset.body || ""}`,
			);
			if (!text) continue;
			out.push({
				id: `draft:${asset.id}`,
				rawId: asset.id,
				kind: "draft",
				name: asset.title || "Untitled draft",
				preview: plainText(asset.preview || asset.description || asset.body || ""),
				type: asset.type || "draft",
				val: 1,
			});
		}

		return out;
	}, [tasks, assets]);

	return { nodes, isLoading: !!userId && assetsLoading };
}

export default function WritingMapGraph({ reduxUser, onLogin }) {
	const router = useRouter();
	const graphRef = useRef();
	const embedCache = useRef({});
	const [searchQuery, setSearchQuery] = useState("");
	const [embeddings, setEmbeddings] = useState({});
	const [queryEmbedding, setQueryEmbedding] = useState(null);
	const [isCalculating, setIsCalculating] = useState(false);
	const [modelReady, setModelReady] = useState(false);
	const [hoveredNode, setHoveredNode] = useState(null);
	const [hoverPos, setHoverPos] = useState(null);

	const { nodes, isLoading } = useMapNodes(reduxUser);

	// Warm up embedding model + compute node vectors
	useEffect(() => {
		if (!reduxUser || nodes.length === 0) return;

		let cancelled = false;

		const run = async () => {
			setIsCalculating(true);
			const next = { ...embedCache.current };
			let updated = false;

			for (const node of nodes) {
				if (cancelled) return;
				if (next[node.id]) continue;
				const text = buildNodeText(node);
				if (!text) continue;
				const vec = await getEmbedding(text.slice(0, 2000));
				if (vec) {
					next[node.id] = vec;
					updated = true;
				}
			}

			if (!cancelled) {
				embedCache.current = next;
				if (updated) setEmbeddings({ ...next });
				setModelReady(true);
				setIsCalculating(false);
			}
		};

		run();
		return () => {
			cancelled = true;
		};
	}, [reduxUser, nodes]);

	// Semantic search vector for active query
	useEffect(() => {
		const q = searchQuery.trim();
		if (q.length < 2) {
			setQueryEmbedding(null);
			return;
		}

		let cancelled = false;
		const t = setTimeout(async () => {
			const vec = await getEmbedding(q);
			if (!cancelled) setQueryEmbedding(vec);
		}, 350);

		return () => {
			cancelled = true;
			clearTimeout(t);
		};
	}, [searchQuery]);

	const semanticScores = useMemo(() => {
		if (!queryEmbedding) return {};
		const scores = {};
		for (const node of nodes) {
			const vec = embeddings[node.id];
			if (vec) scores[node.id] = cosineSimilarity(queryEmbedding, vec);
		}
		return scores;
	}, [queryEmbedding, embeddings, nodes]);

	const graphData = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();

		const visibleNodes = nodes.filter((node) => {
			if (!q) return true;
			const text = buildNodeText(node).toLowerCase();
			if (text.includes(q)) return true;
			const score = semanticScores[node.id];
			return score != null && score >= SEARCH_SEMANTIC_THRESHOLD;
		});

		const nodeById = new Map(visibleNodes.map((n) => [n.id, n]));
		const links = [];
		const linkSet = new Set();

		// Task → linked draft
		for (const node of visibleNodes) {
			if (node.kind === "task" && node.draftId) {
				const targetId = `draft:${node.draftId}`;
				if (nodeById.has(targetId)) {
					const key = `${node.id}-${targetId}`;
					if (!linkSet.has(key)) {
						links.push({
							source: node.id,
							target: targetId,
							value: 1,
							isExplicit: true,
						});
						linkSet.add(key);
					}
				}
			}
		}

		// Semantic similarity edges
		for (let i = 0; i < visibleNodes.length; i++) {
			for (let j = i + 1; j < visibleNodes.length; j++) {
				const a = visibleNodes[i];
				const b = visibleNodes[j];
				const key = `${a.id}-${b.id}`;
				const rev = `${b.id}-${a.id}`;
				if (linkSet.has(key) || linkSet.has(rev)) continue;

				const vecA = embeddings[a.id];
				const vecB = embeddings[b.id];
				if (!vecA || !vecB) continue;

				const sim = cosineSimilarity(vecA, vecB);
				if (sim >= SEMANTIC_LINK_THRESHOLD) {
					links.push({
						source: a.id,
						target: b.id,
						value: sim,
						isExplicit: false,
					});
					linkSet.add(key);
				}
			}
		}

		const graphNodes = visibleNodes.map((node) => {
			const textHit =
				q && buildNodeText(node).toLowerCase().includes(q);
			const semanticHit =
				q &&
				semanticScores[node.id] != null &&
				semanticScores[node.id] >= SEARCH_SEMANTIC_THRESHOLD;

			let color = node.kind === "task" ? "#6366f1" : "#0ea5e9";
			if (q && (textHit || semanticHit)) color = "#f43f5e";
			if (node.kind === "task" && node.status === "done") color = "#10b981";

			return {
				...node,
				color,
				matchScore: semanticScores[node.id] ?? null,
			};
		});

		return { nodes: graphNodes, links };
	}, [nodes, embeddings, searchQuery, semanticScores]);

	const handleNodeClick = useCallback(
		(node) => {
			if (node.kind === "draft") {
				router.push(`/app/${node.rawId}`);
				return;
			}
			if (node.draftId) {
				router.push(`/app/${node.draftId}`);
				return;
			}
			router.push("/tasks");
		},
		[router],
	);

	const fitCamera = useCallback(() => {
		const g = graphRef.current;
		if (!g) return;
		g.zoomToFit(500, 100);
		// Front-elevated view — less top-down tilt, easier to read depth
		setTimeout(() => {
			g.cameraPosition(
				{ x: 0, y: 140, z: 280 },
				{ x: 0, y: 0, z: 0 },
				900,
			);
		}, 520);
	}, []);

	const updateHoverPosition = useCallback((node) => {
		const g = graphRef.current;
		if (!g || !node || node.x == null || node.y == null || node.z == null) {
			setHoverPos(null);
			return;
		}
		const { x, y } = g.graph2ScreenCoords(node.x, node.y, node.z);
		setHoverPos({ x, y });
	}, []);

	const handleNodeHover = useCallback(
		(node) => {
			setHoveredNode(node || null);
			if (node) {
				updateHoverPosition(node);
			} else {
				setHoverPos(null);
			}
		},
		[updateHoverPosition],
	);

	useEffect(() => {
		if (!hoveredNode) return undefined;
		let rafId = 0;
		const tick = () => {
			updateHoverPosition(hoveredNode);
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	}, [hoveredNode, updateHoverPosition]);

	useEffect(() => {
		if (graphData.nodes.length === 0) return;
		const t = setTimeout(fitCamera, 400);
		return () => clearTimeout(t);
	}, [graphData.nodes.length, graphData.links.length, fitCamera]);

	if (!reduxUser) {
		return (
			<div className="flex flex-col items-center justify-center h-full px-6 text-center bg-[#F7F5F0]">
				<Network className="w-10 h-10 text-indigo-500 mb-4" />
				<h2 className="text-lg font-bold text-zinc-900 mb-2">Writing map</h2>
				<p className="text-sm text-zinc-500 mb-4 max-w-sm">
					Sign in to explore how your tasks and drafts connect in 3D.
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

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-full bg-white text-indigo-600">
				<Loader2 className="w-8 h-8 animate-spin mb-3" />
				<p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
					Loading workspace…
				</p>
			</div>
		);
	}

	if (nodes.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full px-6 text-center bg-[#F7F5F0]">
				<Network className="w-10 h-10 text-indigo-500 mb-4" />
				<h2 className="text-lg font-bold text-zinc-900 mb-2">Nothing to map yet</h2>
				<p className="text-sm text-zinc-500 mb-4 max-w-sm">
					Add writing tasks or create drafts — they&apos;ll appear here as a semantic
					3D graph.
				</p>
				<button
					type="button"
					onClick={() => router.push("/tasks")}
					className="px-4 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-xl"
				>
					Go to Tasks
				</button>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full overflow-hidden bg-[#F7F5F0]">
			{/* Light canvas background */}
			<div className="absolute inset-0 pointer-events-none">
				<div
					className="absolute inset-0 opacity-50"
					style={{
						backgroundImage:
							"radial-gradient(circle at 1px 1px, #d4d4d8 1px, transparent 0)",
						backgroundSize: "28px 28px",
					}}
				/>
				<div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-indigo-100/60 blur-3xl" />
				<div className="absolute -bottom-32 -left-16 w-[360px] h-[360px] rounded-full bg-sky-100/70 blur-3xl" />
				<div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-[#F7F5F0]/80" />
			</div>

			<style jsx global>{`
				.graph-tooltip {
					background: transparent !important;
					padding: 0 !important;
					margin: 0 !important;
					border: none !important;
					box-shadow: none !important;
					color: inherit !important;
					pointer-events: none !important;
				}
			`}</style>

			{/* Header */}
			<div className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pointer-events-none">
				<div className="pointer-events-auto bg-white/80 backdrop-blur-sm border border-zinc-200/80 rounded-2xl px-4 py-3 shadow-sm">
					<h1 className="text-lg sm:text-xl font-bold text-zinc-900 flex items-center gap-2">
						<Network className="w-5 h-5 text-indigo-500 shrink-0" />
						Writing map
					</h1>
					<p className="text-[10px] text-indigo-600 uppercase tracking-widest font-bold mt-0.5">
						Semantic 3D graph
					</p>
				</div>

				<div className="flex items-center gap-2 pointer-events-auto w-full sm:w-auto">
					<div className="relative flex-1 sm:flex-none sm:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Semantic search…"
							className="w-full pl-10 pr-3 py-2.5 bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-xl text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 shadow-sm"
						/>
					</div>
					{(isCalculating || !modelReady) && (
						<div className="flex items-center gap-1.5 px-3 py-2 bg-white/90 backdrop-blur-sm border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-sm">
							<Zap className="w-3 h-3 animate-pulse" />
							<span className="hidden sm:inline">Embedding</span>
						</div>
					)}
				</div>
			</div>

			{/* Legend */}
			<div className="absolute bottom-4 left-4 z-10 p-4 bg-white/90 backdrop-blur-md border border-zinc-200 rounded-2xl max-w-xs pointer-events-auto shadow-lg hidden sm:block">
				<div className="flex items-center gap-2 mb-2">
					<div className="p-1 rounded-xl bg-indigo-50">
						<Info className="w-4 h-4 text-indigo-600" />
					</div>
					<span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
						How to read
					</span>
				</div>
				<p className="text-[11px] leading-relaxed text-zinc-600">
					Tasks and drafts are nodes. Solid links connect a task to its draft;
					dashed links are semantic similarity from local embeddings.
				</p>
				<div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
					<div className="flex items-center gap-1.5">
						<div className="w-2 h-2 rounded-full bg-indigo-500" />
						<span className="text-[10px] font-bold text-zinc-400 uppercase">Task</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="w-2 h-2 rounded-full bg-sky-500" />
						<span className="text-[10px] font-bold text-zinc-400 uppercase">Draft</span>
					</div>
					<div className="flex items-center gap-1.5">
						<div className="w-2 h-2 rounded-full bg-rose-500" />
						<span className="text-[10px] font-bold text-zinc-400 uppercase">Match</span>
					</div>
				</div>
			</div>

			{/* Graph */}
			<div className="relative w-full h-full cursor-grab active:cursor-grabbing z-[1]">
				<AnimatePresence>
					{hoveredNode && hoverPos && (
						<div
							className="absolute z-20 w-[min(280px,72vw)] pointer-events-none"
							style={{
								left: hoverPos.x,
								top: hoverPos.y,
								transform: "translate(-50%, calc(-100% - 14px))",
							}}
						>
							<motion.div
								key={hoveredNode.id}
								initial={{ opacity: 0, scale: 0.96 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.96 }}
								transition={{ duration: 0.12 }}
							>
								<div className="bg-white border border-zinc-200 rounded-xl px-3 py-2.5 shadow-xl shadow-zinc-200/60">
									<div className="flex items-start gap-2.5">
										<div
											className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 ring-2 ring-white shadow-sm"
											style={{ background: hoveredNode.color }}
										/>
										<div className="min-w-0 flex-1">
											<p className="text-xs font-semibold text-zinc-900 leading-snug line-clamp-2">
												{hoveredNode.name}
											</p>
											<div className="flex flex-wrap items-center gap-1.5 mt-1">
												<span
													className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
														hoveredNode.kind === "task"
															? "bg-indigo-50 text-indigo-700"
															: "bg-sky-50 text-sky-700"
													}`}
												>
													{hoveredNode.kind === "task" ? "Task" : "Draft"}
												</span>
												{hoveredNode.matchScore != null && (
													<span className="text-[9px] font-semibold text-rose-600">
														{Math.round(hoveredNode.matchScore * 100)}% match
													</span>
												)}
											</div>
											{(hoveredNode.description || hoveredNode.preview) && (
												<p className="text-[11px] text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
													{truncate(hoveredNode.description || hoveredNode.preview, 90)}
												</p>
											)}
										</div>
									</div>
								</div>
							</motion.div>
						</div>
					)}
				</AnimatePresence>

				<ForceGraph3D
					ref={graphRef}
					graphData={graphData}
					backgroundColor="rgba(0,0,0,0)"
					nodeColor={(node) => node.color}
					nodeLabel={() => ""}
					onNodeHover={handleNodeHover}
					nodeRelSize={5}
					linkOpacity={0.35}
					linkColor={(link) =>
						link.isExplicit
							? "rgba(79, 70, 229, 0.55)"
							: "rgba(148, 163, 184, 0.25)"
					}
					linkWidth={(link) => (link.isExplicit ? 1.8 : 0.6)}
					linkDirectionalParticles={(link) => (link.isExplicit ? 3 : 1)}
					linkDirectionalParticleSpeed={0.005}
					linkDirectionalParticleWidth={(link) => (link.isExplicit ? 1.5 : 0.8)}
					linkDirectionalParticleColor={() => "#818cf8"}
					onNodeClick={handleNodeClick}
					enableNodeDrag
					showNavInfo={false}
				/>
			</div>

			{/* Controls */}
			<div className="absolute bottom-4 right-4 z-10 pointer-events-auto">
				<motion.button
					type="button"
					whileHover={{ scale: 1.04 }}
					whileTap={{ scale: 0.96 }}
					onClick={fitCamera}
					className="p-3 bg-white/90 backdrop-blur-sm border border-zinc-200 rounded-xl shadow-lg hover:bg-white"
					title="Recenter map"
				>
					<Maximize2 className="w-5 h-5 text-zinc-600" />
				</motion.button>
			</div>
		</div>
	);
}
