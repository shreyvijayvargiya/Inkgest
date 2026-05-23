import { useRef, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const MENU_MIN_WIDTH = 180;
const VIEWPORT_PAD = 12;

/**
 * Block category trigger + menu. Uses a fixed portal menu so panels are not
 * clipped by navbar overflow on phones and narrow viewports.
 */
export default function DraftBlockCategoryDropdown({
	cat,
	isOpen,
	onToggle,
	catItems,
	onSelectItem,
}) {
	const btnRef = useRef(null);
	const [menuPos, setMenuPos] = useState(null);

	useLayoutEffect(() => {
		if (!isOpen || !btnRef.current) {
			setMenuPos(null);
			return undefined;
		}
		const update = () => {
			const r = btnRef.current.getBoundingClientRect();
			const maxLeft = window.innerWidth - MENU_MIN_WIDTH - VIEWPORT_PAD;
			const left = Math.max(
				VIEWPORT_PAD,
				Math.min(r.left, maxLeft),
			);
			setMenuPos({ top: r.bottom + 8, left });
		};
		update();
		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);
		return () => {
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [isOpen]);

	const MenuPanel = () => {
return (
	<motion.div
			data-blocks-category-menu
			initial={{ opacity: 0, y: -6, scale: 0.97 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{ opacity: 0, y: -6, scale: 0.97 }}
			transition={{ duration: 0.13 }}
			style={{
				position: "fixed",
				top: menuPos?.top ?? 0,
				left: menuPos?.left ?? 0,
				visibility: menuPos ? "visible" : "hidden",
				minWidth: MENU_MIN_WIDTH,
				background: "#fff",
				border: "1px solid #E2E2E2",
				borderRadius: 10,
				boxShadow: "0 12px 32px rgba(0,0,0,0.1)",
				zIndex: 500,
				padding: "6px",
			}}
		>
			{catItems.map((item) => (
				<motion.button
					key={item.id}
					type="button"
					onClick={() => onSelectItem(item.id)}
					whileHover={{ background: "#F0F0F0" }}
					whileTap={{ scale: 0.97 }}
					style={{
						width: "100%",
						display: "flex",
						alignItems: "center",
						gap: 9,
						padding: "7px 10px",
						borderRadius: 7,
						border: "none",
						background: "transparent",
						color: "#111",
						fontSize: 13,
						cursor: "pointer",
						textAlign: "left",
						whiteSpace: "nowrap",
					}}
				>
					<span
						style={{
							fontSize: 14,
							minWidth: 20,
							textAlign: "center",
							color: "#888",
						}}
					>
						{item.icon}
					</span>
					{item.label}
				</motion.button>
			))}
		</motion.div>
)
	};

	return (
		<div style={{ position: "relative", flexShrink: 0 }}>
			<motion.button
				ref={btnRef}
				type="button"
				onClick={onToggle}
				whileHover={{ background: "#F0F0F0" }}
				whileTap={{ scale: 0.93 }}
				style={{
					height: 30,
					padding: "0 9px",
					display: "flex",
					alignItems: "center",
					gap: 4,
					borderRadius: 7,
					border: "none",
					background: isOpen ? "#111" : "transparent",
					color: isOpen ? "#fff" : "#555",
					fontSize: 12,
					fontWeight: 600,
					cursor: "pointer",
					whiteSpace: "nowrap",
					transition: "all 0.13s",
					flexShrink: 0,
				}}
			>
				{cat.label}
				<svg
					width="8"
					height="8"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
				>
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</motion.button>
			<AnimatePresence>
				{isOpen &&
					menuPos &&
					<MenuPanel />}
			</AnimatePresence>
		</div>
	);
}
