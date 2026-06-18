import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspaceSidebarWidth } from "../hooks/useWorkspaceSidebarWidth";
import WorkspaceSidebarResizeHandle from "./WorkspaceSidebarResizeHandle";
import {
	listAssets,
	deleteAsset,
	updateAsset,
	createDraft,
} from "../api/userAssets";
import {
	listWorkspaceNodes,
	createFolder,
	createFileNode,
	renameWorkspaceNode,
	deleteWorkspaceNode,
	deleteFileNodesForAsset,
	updateWorkspaceNode,
	moveWorkspaceNode,
	placeAssetInTree,
} from "../api/workspaceTree";
import WorkspaceSidebarTree from "./WorkspaceSidebarTree";
import AppSidebarTasksNav from "./AppSidebarTasksNav";
import { SIDEBAR_ICONS } from "../utils/appSidebar";
import {
	buildWorkspaceTree,
	flattenWorkspaceForSearch,
	filterWorkspaceSearch,
} from "../utils/buildWorkspaceTree";

function Icon({ d, size = 16, stroke, fill = "none", strokeWidth = 1.75, T }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={fill}
			stroke={stroke || T.muted}
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d={d} />
		</svg>
	);
}

function getAssetSource(item) {
	const isAssetType = [
		"table",
		"infographics",
		"landing_page",
		"image_gallery",
	].includes(item?.type);
	return item?.source || (isAssetType ? "assets" : "drafts");
}

/**
 * Shared drafts/assets sidebar (Tasks nav + workspace folder tree).
 */
export default function AppWorkspaceSidebar({
	T,
	reduxUser,
	sidebarOpen,
	onCloseSidebar,
	compactAssetsNav,
	onLogin,
	activeAssetId = null,
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [deleteConfirm, setDeleteConfirm] = useState(null);
	const [deleteFolderConfirm, setDeleteFolderConfirm] = useState(null);
	const { width: sidebarWidth, onResizePointerDown } = useWorkspaceSidebarWidth();

	const uid = reduxUser?.uid;

	const { data: items = [] } = useQuery({
		queryKey: ["assets", uid],
		queryFn: () => listAssets(uid),
		enabled: !!uid,
		staleTime: 2 * 60 * 1000,
	});

	const { data: workspaceNodes = [] } = useQuery({
		queryKey: ["workspaceNodes", uid],
		queryFn: () => listWorkspaceNodes(uid),
		enabled: !!uid,
		staleTime: 2 * 60 * 1000,
	});

	const sidebarItems = useMemo(() => {
		const drafts = items.filter((i) => i.type === "draft");
		const tables = items.filter((i) => i.type === "table");
		const otherAssets = items.filter((i) =>
			["infographics", "landing_page", "image_gallery"].includes(i.type),
		);
		return [...drafts, ...tables, ...otherAssets].sort((a, b) => {
			const aT = a.createdAt?.toMillis?.() ?? a.createdAt?.getTime?.() ?? 0;
			const bT = b.createdAt?.toMillis?.() ?? b.createdAt?.getTime?.() ?? 0;
			return bT - aT;
		});
	}, [items]);

	const { roots, looseAssets, assetMap } = useMemo(
		() => buildWorkspaceTree(workspaceNodes, sidebarItems),
		[workspaceNodes, sidebarItems],
	);

	const searchResults = useMemo(() => {
		const q = search.trim();
		if (!q) return null;
		const flat = flattenWorkspaceForSearch(workspaceNodes, sidebarItems);
		return filterWorkspaceSearch(flat, q);
	}, [search, workspaceNodes, sidebarItems]);

	const invalidateWorkspace = () => {
		queryClient.invalidateQueries({ queryKey: ["workspaceNodes", uid] });
	};

	const handleSidebarIconChange = async (assetId, sidebarIcon) => {
		if (!uid) return;
		const item = sidebarItems.find((i) => i.id === assetId);
		try {
			await updateAsset(uid, assetId, { sidebarIcon }, getAssetSource(item));
			queryClient.invalidateQueries({ queryKey: ["assets", uid] });
		} catch (e) {
			console.error("Sidebar icon update failed", e);
		}
	};

	const handleSidebarRename = async (assetId, title) => {
		if (!uid) return;
		const item = sidebarItems.find((i) => i.id === assetId);
		try {
			await updateAsset(uid, assetId, { title }, getAssetSource(item));
			queryClient.invalidateQueries({ queryKey: ["assets", uid] });
			queryClient.invalidateQueries({ queryKey: ["doc"] });
		} catch (e) {
			console.error("Sidebar rename failed", e);
		}
	};

	const handleRenameFolder = async (nodeId, name) => {
		if (!uid) return;
		try {
			await renameWorkspaceNode(uid, nodeId, name);
			invalidateWorkspace();
		} catch (e) {
			console.error("Folder rename failed", e);
		}
	};

	const handleFolderIconChange = async (nodeId, sidebarIcon) => {
		if (!uid) return;
		try {
			await updateWorkspaceNode(uid, nodeId, { sidebarIcon });
			invalidateWorkspace();
		} catch (e) {
			console.error("Folder icon update failed", e);
		}
	};

	const handleMoveNode = async (nodeId, { parentId, order }) => {
		if (!uid) return;
		try {
			await moveWorkspaceNode(uid, nodeId, { parentId, order });
			invalidateWorkspace();
		} catch (e) {
			console.error("Move node failed", e);
		}
	};

	const handlePlaceAsset = async (assetId, parentId) => {
		if (!uid) return;
		try {
			await placeAssetInTree(uid, assetId, parentId);
			invalidateWorkspace();
		} catch (e) {
			console.error("Place asset failed", e);
		}
	};

	const handleAddFolder = async (parentId = null) => {
		if (!uid) return;
		try {
			await createFolder(uid, { parentId, name: "New folder" });
			invalidateWorkspace();
		} catch (e) {
			console.error("Create folder failed", e);
		}
	};

	const handleAddFile = async (parentId = null) => {
		if (!uid) return;
		try {
			const { id: assetId } = await createDraft(uid, {
				title: "Untitled",
				body: "",
				preview: "",
			});
			await createFileNode(uid, { parentId, assetId, name: "Untitled" });
			queryClient.invalidateQueries({ queryKey: ["assets", uid] });
			invalidateWorkspace();
			router.push(`/app/${assetId}`);
			if (compactAssetsNav) onCloseSidebar?.();
		} catch (e) {
			console.error("Create draft in folder failed", e);
		}
	};

	const confirmDeleteAsset = async () => {
		if (!deleteConfirm || !uid) return;
		const item = sidebarItems.find((i) => i.id === deleteConfirm);
		try {
			await deleteFileNodesForAsset(uid, deleteConfirm);
			await deleteAsset(uid, deleteConfirm, getAssetSource(item));
			queryClient.invalidateQueries({ queryKey: ["assets", uid] });
			queryClient.invalidateQueries({ queryKey: ["doc"] });
			invalidateWorkspace();
		} catch (e) {
			console.error("Delete failed", e);
		}
		setDeleteConfirm(null);
	};

	const confirmDeleteFolder = async () => {
		if (!deleteFolderConfirm || !uid) return;
		try {
			await deleteWorkspaceNode(uid, deleteFolderConfirm);
			invalidateWorkspace();
		} catch (e) {
			console.error("Delete folder failed", e);
		}
		setDeleteFolderConfirm(null);
	};

	if (!reduxUser) return null;

	return (
		<>
			<AnimatePresence>
				{sidebarOpen && compactAssetsNav && (
					<motion.div
						key="workspace-sidebar-backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						onClick={onCloseSidebar}
						className="fixed inset-0 top-14 z-40 bg-black/35 backdrop-blur-[2px] md:hidden"
					/>
				)}
			</AnimatePresence>

			<AnimatePresence initial={false}>
				{sidebarOpen && (
					<motion.aside
						key="workspace-sidebar"
						initial={
							compactAssetsNav
								? { x: -300, opacity: 0 }
								: { width: 0, opacity: 0 }
						}
						animate={
							compactAssetsNav
								? { x: 0, opacity: 1 }
								: { width: sidebarWidth, opacity: 1 }
						}
						exit={
							compactAssetsNav
								? { x: -300, opacity: 0 }
								: { width: 0, opacity: 0 }
						}
						transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
						className={`relative flex flex-col overflow-hidden shrink-0 border-r ${
							compactAssetsNav
								? "fixed top-14 left-0 bottom-0 z-[45] shadow-[8px_0_32px_rgba(0,0,0,0.12)]"
								: ""
						}`}
						style={{
							background: T.surface,
							borderColor: T.border,
							width: compactAssetsNav ? sidebarWidth : undefined,
						}}
					>
						<div
							className="px-3.5 pt-4 pb-3 shrink-0"
							style={{ borderBottom: `1px solid ${T.border}` }}
						>
							<div className="relative">
								<div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
									<Icon d={SIDEBAR_ICONS.search} size={13} T={T} />
								</div>
								<input
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search drafts, folders, tables…"
									className="w-full rounded-[9px] py-[7px] pl-[30px] pr-2.5 text-[13px] outline-none transition-colors"
									style={{
										background: T.surface,
										border: `1px solid ${T.border}`,
										color: T.accent,
									}}
								/>
							</div>
						</div>

						<div className="flex-1 overflow-y-auto p-2.5">
							<AppSidebarTasksNav
								onNavigate={() => {
									if (compactAssetsNav) onCloseSidebar?.();
								}}
								onAddFolder={() => handleAddFolder(null)}
								onAddFile={() => handleAddFile(null)}
							/>
							<WorkspaceSidebarTree
								roots={roots}
								looseAssets={looseAssets}
								assetMap={assetMap}
								searchQuery={search}
								searchResults={searchResults}
								activeAssetId={activeAssetId}
								Icon={(props) => <Icon {...props} T={T} />}
								Icons={SIDEBAR_ICONS}
								onIconChange={handleSidebarIconChange}
								onFolderIconChange={handleFolderIconChange}
								onRenameAsset={handleSidebarRename}
								onRenameFolder={handleRenameFolder}
								onDeleteAsset={setDeleteConfirm}
								onDeleteFolder={setDeleteFolderConfirm}
								onAddFolder={handleAddFolder}
								onAddFile={handleAddFile}
								onMoveNode={handleMoveNode}
								onPlaceAsset={handlePlaceAsset}
								onAssetClick={(item) => {
									router.push(`/app/${item.id}`);
									if (compactAssetsNav) onCloseSidebar?.();
								}}
							/>
						</div>

						{!compactAssetsNav && (
							<WorkspaceSidebarResizeHandle
								onPointerDown={onResizePointerDown}
							/>
						)}

						<div
							className="px-3.5 py-3 shrink-0"
							style={{ borderTop: `1px solid ${T.border}` }}
						>
							<motion.button
								type="button"
								whileHover={{ opacity: 0.8 }}
								onClick={onLogin}
								className="w-full flex items-center gap-2 text-left bg-transparent border-0 p-0 cursor-pointer"
							>
								{reduxUser.photoURL ? (
									<img
										src={reduxUser.photoURL}
										alt={reduxUser.displayName || "User"}
										className="w-7 h-7 rounded-full object-cover shrink-0"
									/>
								) : (
									<div
										className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
										style={{ background: T.border }}
									>
										<Icon d={SIDEBAR_ICONS.settings} size={13} T={T} />
									</div>
								)}
								<div className="flex-1 min-w-0">
									<p
										className="text-xs font-semibold truncate"
										style={{ color: T.accent }}
									>
										{reduxUser.displayName || "Sign in"}
									</p>
									<p className="text-[11px] truncate" style={{ color: T.muted }}>
										{reduxUser.email || "Click to log in"}
									</p>
								</div>
								<span className="text-[10.5px] font-bold bg-[#FEF3E2] text-[#92400E] px-2 py-0.5 rounded-full shrink-0">
									FREE
								</span>
							</motion.button>
						</div>
					</motion.aside>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{deleteConfirm && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setDeleteConfirm(null)}
							className="fixed inset-0 z-[200] bg-black/35 backdrop-blur-[3px]"
						/>
						<motion.div
							initial={{ opacity: 0, scale: 0.92, y: 12 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.92, y: 12 }}
							transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
							className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] z-[201] rounded-2xl p-7 shadow-2xl"
							style={{
								background: T.surface,
								border: `1px solid ${T.border}`,
							}}
						>
							<p className="text-lg font-bold mb-2" style={{ color: T.accent }}>
								Delete this draft?
							</p>
							<p className="text-sm mb-5" style={{ color: T.muted }}>
								This cannot be undone.
							</p>
							<div className="flex gap-2 justify-end">
								<button
									type="button"
									onClick={() => setDeleteConfirm(null)}
									className="px-4 py-2 rounded-xl text-sm font-semibold"
									style={{ color: T.muted, border: `1px solid ${T.border}` }}
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={confirmDeleteAsset}
									className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white"
								>
									Delete
								</button>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{deleteFolderConfirm && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setDeleteFolderConfirm(null)}
							className="fixed inset-0 z-[200] bg-black/35 backdrop-blur-[3px]"
						/>
						<motion.div
							initial={{ opacity: 0, scale: 0.92, y: 12 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.92, y: 12 }}
							transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
							className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] z-[201] rounded-2xl p-7 shadow-2xl"
							style={{
								background: T.surface,
								border: `1px solid ${T.border}`,
							}}
						>
							<p className="text-lg font-bold mb-2" style={{ color: T.accent }}>
								Delete folder?
							</p>
							<p className="text-sm mb-5" style={{ color: T.muted }}>
								Contents will move to the parent level. Files are not deleted.
							</p>
							<div className="flex gap-2 justify-end">
								<button
									type="button"
									onClick={() => setDeleteFolderConfirm(null)}
									className="px-4 py-2 rounded-xl text-sm font-semibold"
									style={{ color: T.muted, border: `1px solid ${T.border}` }}
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={confirmDeleteFolder}
									className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white"
								>
									Delete folder
								</button>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</>
	);
}
