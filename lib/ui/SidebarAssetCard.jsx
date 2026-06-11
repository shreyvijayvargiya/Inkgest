import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import IconSelectorDropdown from "./IconSelectorDropdown.jsx";
import { getTheme } from "../utils/theme";
import {
	findLucideIcon,
	pickToSidebarIcon,
	resolveSidebarIcon,
} from "../utils/assetSidebarIcon";

const T = getTheme();

const DEFAULT_LABELS = {
	table: "Table",
	draft: "Draft",
	infographics: "Infographics",
	landing_page: "Landing Page",
	image_gallery: "Gallery",
};

function SidebarIconGlyph({ icon, size = 16, color = "#5A5550" }) {
	if (!icon) return null;
	if (icon.type === "emoji") {
		return (
			<span style={{ fontSize: size, lineHeight: 1 }} aria-hidden>
				{icon.value}
			</span>
		);
	}
	const luc = findLucideIcon(icon.name);
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke={color}
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
		>
			<path d={luc.path} />
		</svg>
	);
}

/**
 * Sidebar row for drafts / tables / assets — icon (editable), title, type tag, date.
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
			layout
			initial={{ opacity: 0, x: -12 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: -12, scale: 0.95 }}
			whileHover={{ x: 2 }}
			transition={{ duration: 0.22 }}
			onHoverStart={() => setHovering(true)}
			onHoverEnd={() => setHovering(false)}
			onClick={onClick}
			className="group p-1"
			style={{
				background: active ? T.surface : "transparent",
				border: `1px solid ${active ? T.border : "transparent"}`,
				borderRadius: 10,
				cursor: "pointer",
				boxShadow: active ? "0 1px 8px rgba(0,0,0,0.07)" : "none",
				position: "relative",
				transition: "background 0.15s, border-color 0.15s",
				overflow: panelOpen ? "visible" : undefined,
				zIndex: panelOpen ? 20 : undefined,
			}}
		>
			{active && (
				<motion.div
					layoutId="active-pill"
					style={{
						position: "absolute",
						left: 0,
						top: "5%",
						transform: "translateY(-50%)",
						width: 2,
						height: 36,
						background: T.warm,
						borderRadius: "12px",
					}}
				/>
			)}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 8,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 10,
						flex: 1,
						minWidth: 0,
					}}
				>
					<div
						ref={iconWrapRef}
						style={{ position: "relative", flexShrink: 0 }}
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
							whileHover={onIconChange ? { background: "#F0ECE5" } : {}}
							whileTap={onIconChange ? { scale: 0.94 } : {}}
							style={{
								width: 28,
								height: 28,
								borderRadius: 8,
								border: `1px solid ${active ? T.border : "#E8E4DC"}`,
								background: active ? T.surface : "#FAFAF8",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: onIconChange ? "pointer" : "default",
								padding: 0,
								marginTop: 1,
							}}
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
									transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
									style={{
										position: "absolute",
										top: "calc(100% + 6px)",
										left: 0,
										zIndex: 500,
									}}
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

					<div style={{ flex: 1, minWidth: 0 }}>
						<p
							style={{
								fontSize: 12,
								fontWeight: 500,
								color: T.accent,
								overflow: "hidden",
								display: "-webkit-box",
								WebkitLineClamp: 2,
								WebkitBoxOrient: "vertical",
							}}
						>
							{item.title || "Untitled"}
						</p>
					</div>
				</div>
				{(onDelete || onRename) && (
						<div
							ref={menuWrapRef}
							className={`relative shrink-0 transition-opacity ${
								showActions
									? "opacity-100"
									: "opacity-0 pointer-events-none max-sm:opacity-100 max-sm:pointer-events-auto"
							}`}
							onPointerDown={(e) => e.stopPropagation()}
							onClick={(e) => e.stopPropagation()}
						>
							<motion.button
								type="button"
								title="More actions"
								onClick={() => {
									setMenuOpen((v) => !v);
									if (menuOpen) setRenaming(false);
								}}
								className="flex items-center justify-center p-1 rounded cursor-pointer border-none bg-transparent text-[#888888] hover:bg-[#F0ECE5] transition-colors"
								whileHover={{ background: "#F0ECE5" }}
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
										transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
										className="absolute top-[calc(100%+4px)] right-0 max-sm:left-0 max-sm:right-auto z-[500] min-w-[148px] max-w-[min(220px,calc(100vw-24px))] rounded-[10px] border border-[#E2E2E2] bg-[#FFFFFF] shadow-[0_8px_28px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)] overflow-hidden"
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
														className="w-full rounded border border-[#E2E2E2] bg-[#FAFAF8] px-2 py-1.5 text-xs font-medium text-[#111111] outline-none focus:border-[#C17B2F] focus:ring-1 focus:ring-[#C17B2F]/30"
														placeholder="Name"
													/>
												) : (
													<motion.button
														type="button"
														onClick={startRename}
														whileHover={{ background: "#F7F5F0" }}
														className="flex w-full items-center gap-2 border-none bg-[#FFFFFF] px-3 py-2.5 text-left text-xs font-medium text-[#111111] cursor-pointer transition-colors"
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
												whileHover={{ background: "#FEE2E2" }}
												className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2.5 text-left text-xs font-medium text-red-500 cursor-pointer transition-colors"
											>
												{TrashIcon}
												Delete
											</motion.button>
										)}
									</motion.div>
								)}
							</AnimatePresence>
						</div>
				)}
			</div>
		</motion.div>
	);
}
