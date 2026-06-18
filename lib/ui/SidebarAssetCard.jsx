import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import IconSelectorDropdown from "./IconSelectorDropdown.jsx";
import { SidebarIconGlyph, SidebarDragHandle } from "./sidebarRowShared";
import {
	pickToSidebarIcon,
	resolveSidebarIcon,
} from "../utils/assetSidebarIcon";

/**
 * Sidebar row for drafts / tables / assets.
 */
export default function SidebarAssetCard({
	item,
	active,
	onClick,
	onDelete,
	onRename,
	onIconChange,
	Icon,
	Icons,
	dragId = null,
	indentClass = "",
}) {
	const [hovering, setHovering] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [renaming, setRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const iconWrapRef = useRef(null);
	const menuWrapRef = useRef(null);
	const renameInputRef = useRef(null);

	const sidebarIcon = resolveSidebarIcon(item);
	const isTreeFile = Boolean(item._workspaceNodeId);
	const dragIdentifier =
		dragId || (isTreeFile ? `node-${item._workspaceNodeId}` : `asset-${item.id}`);

	const {
		attributes,
		listeners,
		setNodeRef,
		isDragging,
	} = useDraggable({
		id: dragIdentifier,
		data: {
			type: isTreeFile ? "file" : dragId?.startsWith("loose-") ? "loose" : "asset",
			assetId: item.id,
			nodeId: item._workspaceNodeId || null,
		},
		disabled: !item.id,
	});

	useEffect(() => {
		if (!pickerOpen && !menuOpen) return undefined;
		const onDown = (e) => {
			if (iconWrapRef.current?.contains(e.target)) return;
			if (menuWrapRef.current?.contains(e.target)) return;
			setPickerOpen(false);
			setMenuOpen(false);
			setRenaming(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [pickerOpen, menuOpen]);

	useEffect(() => {
		if (!renaming) return;
		renameInputRef.current?.focus();
		renameInputRef.current?.select();
	}, [renaming]);

	const panelOpen = pickerOpen || menuOpen;
	const showActions = hovering || menuOpen;

	const handleRenameBlur = () => {
		const trimmed = renameValue.trim();
		const current = (item.title || "").trim() || "Untitled";
		if (onRename && trimmed && trimmed !== current) {
			onRename(item.id, trimmed);
		}
		setRenaming(false);
		setMenuOpen(false);
	};

	const startRename = (e) => {
		e.stopPropagation();
		setRenameValue(item.title || "");
		setRenaming(true);
	};

	const TrashIcon = Icon && Icons ? (
		<Icon d={Icons.trash} size={14} stroke="#EF4444" />
	) : (
		<Trash2 className="w-3.5 h-3.5 shrink-0 text-red-500" aria-hidden />
	);

	return (
		<motion.div
			ref={setNodeRef}
			layout
			initial={{ opacity: 0, x: -12 }}
			animate={{ opacity: isDragging ? 0.45 : 1, x: 0 }}
			exit={{ opacity: 0, x: -12, scale: 0.95 }}
			transition={{ duration: 0.22 }}
			onMouseEnter={() => setHovering(true)}
			onMouseLeave={() => setHovering(false)}
			onClick={onClick}
			className={`group p-1 rounded-xl cursor-pointer transition-colors relative ${
				indentClass || ""
			} ${
				active
					? "bg-[#FAFAF8] border border-[#E8E4DC] shadow-sm"
					: "border border-transparent hover:bg-[#F7F5F0]"
			} ${panelOpen ? "z-20 overflow-visible" : ""} ${isDragging ? "opacity-45" : ""}`}
		>
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2.5 flex-1 min-w-0">
					<div
						ref={iconWrapRef}
						className="relative shrink-0"
						onPointerDown={(e) => e.stopPropagation()}
						onClick={(e) => e.stopPropagation()}
					>
						<motion.button
							type="button"
							title={onIconChange ? "Change icon" : undefined}
							disabled={!onIconChange}
							onClick={() => {
								if (onIconChange) setPickerOpen((v) => !v);
							}}
							whileTap={onIconChange ? { scale: 0.94 } : {}}
							className={`w-7 h-7 rounded-xl border flex items-center justify-center p-0 mt-px ${
								active
									? "border-[#E8E4DC] bg-[#FAFAF8]"
									: "border-[#E8E4DC] bg-[#FAFAF8]"
							} ${onIconChange ? "cursor-pointer hover:bg-[#F0ECE5]" : "cursor-default"}`}
						>
							<SidebarIconGlyph icon={sidebarIcon} size={14} />
						</motion.button>
						<AnimatePresence>
							{pickerOpen && onIconChange && (
								<motion.div
									data-sidebar-icon-picker
									initial={{ opacity: 0, y: -6, scale: 0.97 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: -6, scale: 0.97 }}
									transition={{ duration: 0.14 }}
									className="absolute top-[calc(100%+6px)] left-0 z-[500]"
								>
									<IconSelectorDropdown
										onSelect={(pick) => {
											const next = pickToSidebarIcon(pick);
											if (next) onIconChange(item.id, next);
											setPickerOpen(false);
										}}
										onClose={() => setPickerOpen(false)}
									/>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					<div className="flex-1 min-w-0">
						<p
							className={`text-xs font-medium m-0 overflow-hidden line-clamp-2 ${
								active ? "text-[#111111]" : "text-[#111111]"
							}`}
						>
							{item.title || "Untitled"}
						</p>
					</div>
				</div>

				{(onDelete || onRename) && (
					<div
						className="flex items-center shrink-0"
						onPointerDown={(e) => e.stopPropagation()}
						onClick={(e) => e.stopPropagation()}
					>
						<div
							className={`transition-opacity ${
								showActions
									? "opacity-100"
									: "opacity-0 pointer-events-none max-sm:opacity-100 max-sm:pointer-events-auto"
							}`}
						>
							<SidebarDragHandle listeners={listeners} attributes={attributes} />
						</div>
						<div
							ref={menuWrapRef}
							className={`relative transition-opacity ${
								showActions
									? "opacity-100"
									: "opacity-0 pointer-events-none max-sm:opacity-100 max-sm:pointer-events-auto"
							}`}
						>
							<motion.button
								type="button"
								title="More actions"
								onClick={() => {
									setMenuOpen((v) => !v);
									if (menuOpen) setRenaming(false);
								}}
								className="flex items-center justify-center p-1 rounded border-none bg-transparent text-[#888888] hover:bg-[#F0ECE5] cursor-pointer"
								whileTap={{ scale: 0.94 }}
							>
								<MoreVertical className="w-3.5 h-3.5" aria-hidden />
							</motion.button>

							<AnimatePresence>
								{menuOpen && (
									<motion.div
										initial={{ opacity: 0, y: -6, scale: 0.97 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: -6, scale: 0.97 }}
										transition={{ duration: 0.14 }}
										className="absolute top-[calc(100%+4px)] right-0 max-sm:left-0 max-sm:right-auto z-[500] min-w-[148px] max-w-[min(220px,calc(100vw-24px))] rounded-xl border border-[#E2E2E2] bg-white shadow-lg overflow-hidden"
									>
										{onRename && (
											<div
												className={`border-b border-[#E2E2E2] ${renaming ? "p-2" : ""}`}
											>
												{renaming ? (
													<input
														ref={renameInputRef}
														type="text"
														value={renameValue}
														onChange={(e) => setRenameValue(e.target.value)}
														onBlur={handleRenameBlur}
														onKeyDown={(e) => {
															if (e.key === "Enter") {
																e.preventDefault();
																renameInputRef.current?.blur();
															}
															if (e.key === "Escape") {
																setRenaming(false);
																setMenuOpen(false);
															}
														}}
														className="w-full rounded border border-[#E2E2E2] bg-[#FAFAF8] px-2 py-1.5 text-xs font-medium text-[#111111] outline-none focus:border-[#C17B2F]"
														placeholder="Name"
													/>
												) : (
													<motion.button
														type="button"
														onClick={startRename}
														className="flex w-full items-center gap-2 border-none bg-white px-3 py-2.5 text-left text-xs font-medium text-[#111111] cursor-pointer hover:bg-[#F7F5F0]"
													>
														<Pencil
															className="w-3.5 h-3.5 shrink-0 text-[#888888]"
															aria-hidden
														/>
														Rename
													</motion.button>
												)}
											</div>
										)}

										{onDelete && (
											<motion.button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													setMenuOpen(false);
													setRenaming(false);
													onDelete(item.id);
												}}
												className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2.5 text-left text-xs font-medium text-red-500 cursor-pointer hover:bg-red-50"
											>
												{TrashIcon}
												Delete
											</motion.button>
										)}
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>
				)}
			</div>
		</motion.div>
	);
}
