import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
	onIconChange,
	typeLabels = DEFAULT_LABELS,
	Icon,
	Icons,
}) {
	const [hovering, setHovering] = useState(false);
	const [pickerOpen, setPickerOpen] = useState(false);
	const iconWrapRef = useRef(null);

	const tag = typeLabels[item.type] || item.tag || "Draft";
	const meta = item.type === "draft" ? `${item.words ?? 0}w` : "";
	const date = item.date
		? typeof item.date === "string"
			? item.date
			: (item.createdAt?.toDate?.()?.toLocaleDateString?.("en-US", {
					weekday: "short",
					month: "short",
					day: "numeric",
				}) ?? "")
		: "";
	const sidebarIcon = resolveSidebarIcon(item);

	useEffect(() => {
		if (!pickerOpen) return undefined;
		const onDown = (e) => {
			if (iconWrapRef.current?.contains(e.target)) return;
			setPickerOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [pickerOpen]);

	const TrashIcon = Icon && Icons ? (
		<Icon d={Icons.trash} size={14} stroke="#EF4444" />
	) : (
		<svg
			width={14}
			height={14}
			viewBox="0 0 24 24"
			fill="none"
			stroke="#EF4444"
			strokeWidth={2}
			strokeLinecap="round"
		>
			<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
		</svg>
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
			style={{
				background: active ? T.surface : "transparent",
				border: `1px solid ${active ? T.border : "transparent"}`,
				borderRadius: 10,
				padding: "10px 12px",
				cursor: "pointer",
				boxShadow: active ? "0 1px 8px rgba(0,0,0,0.07)" : "none",
				position: "relative",
				marginBottom: 4,
				transition: "background 0.15s, border-color 0.15s",
				overflow: pickerOpen ? "visible" : undefined,
				zIndex: pickerOpen ? 20 : undefined,
			}}
		>
			{active && (
				<motion.div
					layoutId="active-pill"
					style={{
						position: "absolute",
						left: 0,
						top: "50%",
						transform: "translateY(-50%)",
						width: 3,
						height: 32,
						background: T.warm,
						borderRadius: "0 3px 3px 0",
					}}
				/>
			)}
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 8,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
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
								width: 32,
								height: 32,
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
							<SidebarIconGlyph icon={sidebarIcon} size={16} />
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
								fontSize: 13,
								fontWeight: 600,
								color: T.accent,
								lineHeight: 1.4,
								marginBottom: 6,
								overflow: "hidden",
								display: "-webkit-box",
								WebkitLineClamp: 2,
								WebkitBoxOrient: "vertical",
							}}
						>
							{item.title || "Untitled"}
						</p>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<span
								style={{
									fontSize: 10.5,
									fontWeight: 600,
									background: "#F0ECE5",
									color: T.muted,
									padding: "2px 7px",
									borderRadius: 100,
								}}
							>
								{tag}
							</span>
							{meta && (
								<span style={{ fontSize: 10.5, color: T.muted }}>{meta}</span>
							)}
							{meta && date && (
								<span style={{ fontSize: 10.5, color: T.muted }}>·</span>
							)}
							{date && (
								<span style={{ fontSize: 10.5, color: T.muted }}>{date}</span>
							)}
						</div>
					</div>
				</div>
				<AnimatePresence>
					{hovering && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 2,
								flexShrink: 0,
							}}
						>
							<motion.button
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.8 }}
								onClick={(e) => {
									e.stopPropagation();
									onDelete(item.id);
								}}
								style={{
									background: "none",
									border: "none",
									cursor: "pointer",
									padding: 4,
									borderRadius: 6,
									flexShrink: 0,
									color: "#EF4444",
									transition: "background 0.15s",
								}}
								whileHover={{ background: "#FEE2E2" }}
							>
								{TrashIcon}
							</motion.button>
						</div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}
