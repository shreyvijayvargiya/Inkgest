import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
	ChevronRight,
	MoreVertical,
	Pencil,
	Trash2,
	FolderPlus,
	FilePlus,
} from "lucide-react";
import IconSelectorDropdown from "./IconSelectorDropdown.jsx";
import { SidebarIconGlyph, SidebarDragHandle } from "./sidebarRowShared";
import {
	pickToSidebarIcon,
	resolveFolderIcon,
} from "../utils/assetSidebarIcon";

const DEPTH_PAD = ["pl-0", "pl-3", "pl-6", "pl-9", "pl-12", "pl-[60px]"];

function depthClass(depth) {
	return DEPTH_PAD[Math.min(depth, DEPTH_PAD.length - 1)] || "pl-[60px]";
}

/**
 * Sidebar row for a workspace folder.
 */
export default function SidebarFolderRow({
	node,
	name,
	depth = 0,
	expanded = true,
	onToggle,
	onRename,
	onDelete,
	onAddFolder,
	onAddFile,
	onIconChange,
	searchPath = null,
	nodeId,
}) {
	const [hovering, setHovering] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [renaming, setRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState("");
	const iconWrapRef = useRef(null);
	const menuWrapRef = useRef(null);
	const renameInputRef = useRef(null);

	const folderIcon = resolveFolderIcon(node || { sidebarIcon: null });
	const id = nodeId || node?.id;

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		isDragging,
	} = useDraggable({
		id: `node-${id}`,
		data: { type: "folder", nodeId: id },
		disabled: !id,
	});

	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: `drop-folder-${id}`,
		data: { type: "folder-drop", folderId: id },
		disabled: !id,
	});

	const setRowRef = (el) => {
		setDragRef(el);
		setDropRef(el);
	};

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

	const showActions = hovering || menuOpen || pickerOpen;

	const handleRenameBlur = () => {
		const trimmed = renameValue.trim();
		const current = (name || "").trim() || "Folder";
		if (onRename && trimmed && trimmed !== current) {
			onRename(trimmed);
		}
		setRenaming(false);
		setMenuOpen(false);
	};

	return (
		<div
			className={`select-none ${depthClass(depth)}`}
			onMouseEnter={() => setHovering(true)}
			onMouseLeave={() => setHovering(false)}
		>
			<div
				ref={setRowRef}
				className={`group flex items-center gap-1 rounded-xl px-1 py-1 cursor-pointer transition-colors ${
					isOver ? "bg-[#FEF3E2] ring-1 ring-[#C17B2F]/30" : "hover:bg-[#F7F5F0]"
				} ${isDragging ? "opacity-45" : ""}`}
				onClick={() => onToggle?.()}
			>
				<button
					type="button"
					className="flex items-center justify-center w-5 h-5 shrink-0 border-none bg-transparent p-0 cursor-pointer text-[#888888]"
					onClick={(e) => {
						e.stopPropagation();
						onToggle?.();
					}}
					aria-label={expanded ? "Collapse folder" : "Expand folder"}
				>
					<motion.span
						animate={{ rotate: expanded ? 90 : 0 }}
						transition={{ duration: 0.15 }}
						className="inline-flex"
					>
						<ChevronRight className="w-3.5 h-3.5" aria-hidden />
					</motion.span>
				</button>

				<div
					ref={iconWrapRef}
					className="relative shrink-0"
					onPointerDown={(e) => e.stopPropagation()}
					onClick={(e) => e.stopPropagation()}
				>
					<motion.button
						type="button"
						title={onIconChange ? "Change folder icon" : undefined}
						disabled={!onIconChange}
						onClick={() => {
							if (onIconChange) setPickerOpen((v) => !v);
						}}
						whileTap={onIconChange ? { scale: 0.94 } : {}}
						className={`w-7 h-7 rounded-xl border border-[#E8E4DC] bg-[#FAFAF8] flex items-center justify-center p-0 ${
							onIconChange ? "cursor-pointer hover:bg-[#F0ECE5]" : "cursor-default"
						}`}
					>
						<SidebarIconGlyph
							icon={folderIcon}
							size={14}
							className="text-[#C17B2F]"
						/>
					</motion.button>
					<AnimatePresence>
						{pickerOpen && onIconChange && (
							<motion.div
								initial={{ opacity: 0, y: -6, scale: 0.97 }}
								animate={{ opacity: 1, y: 0, scale: 1 }}
								exit={{ opacity: 0, y: -6, scale: 0.97 }}
								transition={{ duration: 0.14 }}
								className="absolute top-[calc(100%+6px)] left-0 z-[500]"
							>
								<IconSelectorDropdown
									onSelect={(pick) => {
										const next = pickToSidebarIcon(pick);
										if (next) onIconChange(id, next);
										setPickerOpen(false);
									}}
									onClose={() => setPickerOpen(false)}
								/>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				<div className="flex-1 min-w-0">
					<p className="text-xs font-medium text-[#111111] truncate m-0">
						{name || "Folder"}
					</p>
					{searchPath ? (
						<p className="text-[10px] text-[#888888] truncate m-0 mt-0.5">
							{searchPath}
						</p>
					) : null}
				</div>

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
							title="Folder actions"
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
									className="absolute top-[calc(100%+4px)] right-0 z-[500] min-w-[168px] rounded-xl border border-[#E2E2E2] bg-white shadow-lg overflow-hidden"
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
													className="w-full rounded border border-[#E2E2E2] bg-[#FAFAF8] px-2 py-1.5 text-xs font-medium outline-none focus:border-[#C17B2F]"
													placeholder="Folder name"
												/>
											) : (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														setRenameValue(name || "");
														setRenaming(true);
													}}
													className="flex w-full items-center gap-2 border-none bg-white px-3 py-2.5 text-left text-xs font-medium text-[#111111] cursor-pointer hover:bg-[#F7F5F0]"
												>
													<Pencil className="w-3.5 h-3.5 text-[#888888]" />
													Rename
												</button>
											)}
										</div>
									)}
									{onAddFolder && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												setMenuOpen(false);
												onAddFolder();
											}}
											className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2.5 text-left text-xs font-medium text-[#111111] cursor-pointer hover:bg-[#F7F5F0]"
										>
											<FolderPlus className="w-3.5 h-3.5 text-[#888888]" />
											New folder
										</button>
									)}
									{onAddFile && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												setMenuOpen(false);
												onAddFile();
											}}
											className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2.5 text-left text-xs font-medium text-[#111111] cursor-pointer hover:bg-[#F7F5F0]"
										>
											<FilePlus className="w-3.5 h-3.5 text-[#888888]" />
											New draft
										</button>
									)}
									{onDelete && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												setMenuOpen(false);
												onDelete();
											}}
											className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2.5 text-left text-xs font-medium text-red-500 cursor-pointer hover:bg-red-50"
										>
											<Trash2 className="w-3.5 h-3.5" />
											Delete folder
										</button>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</div>
			</div>
		</div>
	);
}
