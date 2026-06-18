import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import {
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
	useDroppable,
	DragOverlay,
} from "@dnd-kit/core";
import SidebarAssetCard from "./SidebarAssetCard";
import SidebarFolderRow from "./SidebarFolderRow";
import { SIDEBAR_ASSET_LABELS } from "../utils/appSidebar";

const DEPTH_PAD = ["pl-0", "pl-3", "pl-6", "pl-9", "pl-12", "pl-[60px]"];

function depthPadClass(depth) {
	const base = DEPTH_PAD[Math.min(depth, DEPTH_PAD.length - 1)] || "pl-[60px]";
	return `${base} pl-5`;
}

function RootDropZone({ children }) {
	const { setNodeRef, isOver } = useDroppable({
		id: "drop-root",
		data: { type: "root" },
	});
	return (
		<div
			ref={setNodeRef}
			className={`min-h-[40px] rounded-xl transition-colors ${
				isOver ? "bg-[#FEF3E2]/60 ring-1 ring-[#C17B2F]/20" : ""
			}`}
		>
			{children}
		</div>
	);
}

function TreeNode({
	node,
	depth,
	assetMap,
	expandedFolders,
	toggleFolder,
	activeAssetId,
	Icon,
	Icons,
	onIconChange,
	onFolderIconChange,
	onRenameAsset,
	onRenameFolder,
	onDeleteAsset,
	onDeleteFolder,
	onAddFolder,
	onAddFile,
	onAssetClick,
}) {
	const isFolder = node.kind === "folder";
	const expanded = expandedFolders.has(node.id);

	if (isFolder) {
		return (
			<div>
				<SidebarFolderRow
					node={node}
					nodeId={node.id}
					name={node.name}
					depth={depth}
					expanded={expanded}
					onToggle={() => toggleFolder(node.id)}
					onRename={(name) => onRenameFolder?.(node.id, name)}
					onDelete={() => onDeleteFolder?.(node.id)}
					onAddFolder={() => onAddFolder?.(node.id)}
					onAddFile={() => onAddFile?.(node.id)}
					onIconChange={onFolderIconChange}
				/>
				{expanded &&
					(node.children || []).map((child) => (
						<TreeNode
							key={child.id}
							node={child}
							depth={depth + 1}
							assetMap={assetMap}
							expandedFolders={expandedFolders}
							toggleFolder={toggleFolder}
							activeAssetId={activeAssetId}
							Icon={Icon}
							Icons={Icons}
							onIconChange={onIconChange}
							onFolderIconChange={onFolderIconChange}
							onRenameAsset={onRenameAsset}
							onRenameFolder={onRenameFolder}
							onDeleteAsset={onDeleteAsset}
							onDeleteFolder={onDeleteFolder}
							onAddFolder={onAddFolder}
							onAddFile={onAddFile}
							onAssetClick={onAssetClick}
						/>
					))}
			</div>
		);
	}

	if (node.kind === "file" && node.assetId) {
		const item = assetMap.get(node.assetId);
		if (!item) return null;
		return (
			<SidebarAssetCard
				item={{ ...item, _workspaceNodeId: node.id }}
				active={item.id === activeAssetId}
				typeLabels={SIDEBAR_ASSET_LABELS}
				Icon={Icon}
				Icons={Icons}
				onIconChange={onIconChange}
				onRename={onRenameAsset}
				onClick={() => onAssetClick?.(item)}
				onDelete={onDeleteAsset}
				dragId={`node-${node.id}`}
				indentClass={depthPadClass(depth)}
			/>
		);
	}

	return null;
}

function SearchResultRow({
	entry,
	activeAssetId,
	Icon,
	Icons,
	onIconChange,
	onFolderIconChange,
	onRenameAsset,
	onRenameFolder,
	onDeleteAsset,
	onDeleteFolder,
	onAddFolder,
	onAddFile,
	onAssetClick,
}) {
	if (entry.kind === "folder") {
		return (
			<SidebarFolderRow
				node={{ name: entry.name }}
				nodeId={entry.nodeId}
				name={entry.name}
				depth={0}
				expanded={false}
				searchPath={entry.path ? `/${entry.path}` : undefined}
				onRename={(name) => onRenameFolder?.(entry.nodeId, name)}
				onDelete={() => onDeleteFolder?.(entry.nodeId)}
				onAddFolder={() => onAddFolder?.(entry.nodeId)}
				onAddFile={() => onAddFile?.(entry.nodeId)}
				onIconChange={onFolderIconChange}
			/>
		);
	}

	const item = entry.item;
	if (!item) return null;
	return (
		<div>
			{entry.path ? (
				<p className="text-[10px] text-[#888888] truncate mx-1 mb-0.5 pl-1">
					/{entry.path}
				</p>
			) : null}
			<SidebarAssetCard
				item={item}
				active={item.id === activeAssetId}
				typeLabels={SIDEBAR_ASSET_LABELS}
				Icon={Icon}
				Icons={Icons}
				onIconChange={onIconChange}
				onRename={onRenameAsset}
				onClick={() => onAssetClick?.(item)}
				onDelete={onDeleteAsset}
				dragId={entry.nodeId ? `node-${entry.nodeId}` : `loose-${item.id}`}
			/>
		</div>
	);
}

function parseDragPayload(id, data) {
	const s = String(id);
	if (s.startsWith("node-")) {
		return { kind: data?.type === "folder" ? "folder" : "file", nodeId: s.slice(5) };
	}
	if (s.startsWith("loose-")) {
		return { kind: "loose", assetId: s.slice(6) };
	}
	return null;
}

function parseDropTarget(overId) {
	const s = String(overId || "");
	if (s === "drop-root") return { parentId: null };
	if (s.startsWith("drop-folder-")) return { parentId: s.slice(12) };
	return null;
}

/**
 * Workspace tree: folders + file nodes + loose assets (backward compat).
 */
export default function WorkspaceSidebarTree({
	roots = [],
	looseAssets = [],
	assetMap,
	searchQuery = "",
	searchResults = null,
	activeAssetId = null,
	Icon,
	Icons,
	onIconChange,
	onFolderIconChange,
	onRenameAsset,
	onRenameFolder,
	onDeleteAsset,
	onDeleteFolder,
	onAddFolder,
	onAddFile,
	onAssetClick,
	onMoveNode,
	onPlaceAsset,
}) {
	const [expandedFolders, setExpandedFolders] = useState(() => new Set());
	const [activeDrag, setActiveDrag] = useState(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	const toggleFolder = useCallback((id) => {
		setExpandedFolders((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const handleDragStart = useCallback((event) => {
		setActiveDrag(event.active);
	}, []);

	const handleDragEnd = useCallback(
		async (event) => {
			setActiveDrag(null);
			const { active, over } = event;
			if (!over || (!onMoveNode && !onPlaceAsset)) return;

			const drop = parseDropTarget(over.id);
			if (!drop) return;

			const payload = parseDragPayload(active.id, active.data?.current);
			if (!payload) return;

			if (payload.kind === "loose" && onPlaceAsset) {
				if (payload.assetId) {
					await onPlaceAsset(payload.assetId, drop.parentId);
					if (drop.parentId) {
						setExpandedFolders((prev) => new Set([...prev, drop.parentId]));
					}
				}
				return;
			}

			if ((payload.kind === "folder" || payload.kind === "file") && onMoveNode) {
				if (payload.nodeId === drop.parentId) return;
				await onMoveNode(payload.nodeId, {
					parentId: drop.parentId,
					order: Date.now(),
				});
				if (drop.parentId) {
					setExpandedFolders((prev) => new Set([...prev, drop.parentId]));
				}
			}
		},
		[onMoveNode, onPlaceAsset],
	);

	const isSearching = Boolean(String(searchQuery || "").trim());
	const hasContent =
		roots.length > 0 || looseAssets.length > 0 || (searchResults?.length ?? 0) > 0;

	const treeBody = (
		<AnimatePresence>
				{roots.map((node) => (
					<TreeNode
						key={node.id}
						node={node}
						depth={0}
						assetMap={assetMap}
						expandedFolders={expandedFolders}
						toggleFolder={toggleFolder}
						activeAssetId={activeAssetId}
						Icon={Icon}
						Icons={Icons}
						onIconChange={onIconChange}
						onFolderIconChange={onFolderIconChange}
						onRenameAsset={onRenameAsset}
						onRenameFolder={onRenameFolder}
						onDeleteAsset={onDeleteAsset}
						onDeleteFolder={onDeleteFolder}
						onAddFolder={onAddFolder}
						onAddFile={onAddFile}
						onAssetClick={onAssetClick}
					/>
				))}
				{looseAssets.map((item) => (
					<SidebarAssetCard
						key={item.id}
						item={item}
						active={item.id === activeAssetId}
						typeLabels={SIDEBAR_ASSET_LABELS}
						Icon={Icon}
						Icons={Icons}
						onIconChange={onIconChange}
						onRename={onRenameAsset}
						onClick={() => onAssetClick?.(item)}
						onDelete={onDeleteAsset}
						dragId={`loose-${item.id}`}
					/>
				))}
		</AnimatePresence>
	);

	if (!hasContent && !isSearching) {
		return (
			<div className="text-center py-10 px-4 text-[#888888]">
				<p className="text-[32px] mb-2.5">📭</p>
				<p className="text-[13px] mb-3">No drafts yet</p>
				<p className="text-xs">Use InkAgent to create your first draft</p>
			</div>
		);
	}

	if (isSearching) {
		if (!searchResults?.length) {
			return (
				<div className="text-center py-10 px-4 text-[#888888]">
					<p className="text-[32px] mb-2.5">📭</p>
					<p className="text-[13px]">No matches</p>
				</div>
			);
		}
		return (
			<DndContext
				sensors={sensors}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<RootDropZone>
					<AnimatePresence>
						{searchResults.map((entry) => (
							<SearchResultRow
								key={
									entry.kind === "folder"
										? `folder-${entry.nodeId}`
										: `file-${entry.item?.id ?? entry.nodeId}`
								}
								entry={entry}
								activeAssetId={activeAssetId}
								Icon={Icon}
								Icons={Icons}
								onIconChange={onIconChange}
								onFolderIconChange={onFolderIconChange}
								onRenameAsset={onRenameAsset}
								onRenameFolder={onRenameFolder}
								onDeleteAsset={onDeleteAsset}
								onDeleteFolder={onDeleteFolder}
								onAddFolder={onAddFolder}
								onAddFile={onAddFile}
								onAssetClick={onAssetClick}
							/>
						))}
					</AnimatePresence>
				</RootDropZone>
			</DndContext>
		);
	}

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<RootDropZone>{treeBody}</RootDropZone>
			<DragOverlay dropAnimation={null}>
				{activeDrag ? (
					<div className="rounded-xl border border-[#E8E4DC] bg-white px-3 py-2 text-xs font-medium text-[#111111] shadow-md opacity-90">
						Moving…
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}
