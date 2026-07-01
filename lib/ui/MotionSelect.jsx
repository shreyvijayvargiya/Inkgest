"use client";

/**
 * Framer Motion–based select replacement. Use anywhere a native <select> hurt UX
 * (e.g. contenteditable toolbars) or for consistent custom styling app-wide.
 *
 * @param {string} value — current option value
 * @param {(value: string) => void} onChange
 * @param {{ value: string, label: React.ReactNode }[]} options
 * @param {boolean} [preserveEditorSelection] — mousedown preventDefault on trigger + options (draft bubble, etc.)
 */
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function MotionSelect({
	value,
	onChange,
	options = [],
	disabled = false,
	placeholder = "Select…",
	preserveEditorSelection = false,
	maxMenuHeight = 280,
	zIndex = 400,
	className = "",
	style,
	triggerStyle,
	menuStyle,
	optionStyle,
	alignMenu = "stretch",
}) {
	const reactId = useId();
	const rootRef = useRef(null);
	const [open, setOpen] = useState(false);
	const selected = options.find((o) => o.value === value);
	const label = selected?.label ?? placeholder;
	const menuId = `${reactId}-listbox`;

	useEffect(() => {
		if (!open) return;
		const onDoc = (e) => {
			if (!rootRef.current?.contains(e.target)) setOpen(false);
		};
		const onKey = (e) => {
			if (e.key === "Escape") setOpen(false);
		};
		const t = setTimeout(() => {
			document.addEventListener("mousedown", onDoc);
			document.addEventListener("keydown", onKey);
		}, 0);
		return () => {
			clearTimeout(t);
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const onTriggerMouseDown = useCallback(
		(e) => {
			if (preserveEditorSelection) e.preventDefault();
		},
		[preserveEditorSelection],
	);

	const pick = useCallback(
		(v) => {
			if (disabled) return;
			onChange(v);
			setOpen(false);
		},
		[disabled, onChange],
	);

	return (
		<div
			ref={rootRef}
			className={className}
			style={{ position: "relative", width: alignMenu === "stretch" ? "100%" : "auto", ...style }}
		>
			<motion.button
				type="button"
				id={`${reactId}-trigger`}
				disabled={disabled}
				aria-haspopup="listbox"
				aria-controls={open ? menuId : undefined}
				aria-expanded={open}
				onMouseDown={onTriggerMouseDown}
				onClick={() => !disabled && setOpen((o) => !o)}
				whileTap={disabled ? undefined : { scale: 0.98 }}
				style={{
					width: alignMenu === "stretch" ? "100%" : "auto",
					minWidth: alignMenu === "stretch" ? undefined : 120,
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 8,
					cursor: disabled ? "not-allowed" : "pointer",
					opacity: disabled ? 0.65 : 1,
					...triggerStyle,
				}}
			>
				<span
					style={{
						flex: 1,
						minWidth: 0,
						textAlign: "left",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{label}
				</span>
				<motion.span
					animate={{ rotate: open ? 180 : 0 }}
					transition={{ duration: 0.18 }}
					style={{
						display: "inline-flex",
						flexShrink: 0,
						opacity: disabled ? 0.45 : 1,
					}}
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						aria-hidden
					>
						<path d="M6 9l6 6 6-6" />
					</svg>
				</motion.span>
			</motion.button>
			<AnimatePresence>
				{open && !disabled ? (
					<motion.div
						key="motion-select-menu"
						id={menuId}
						role="listbox"
						aria-labelledby={`${reactId}-trigger`}
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
						style={{
							position: "absolute",
							top: "100%",
							left: 0,
							right: alignMenu === "stretch" ? 0 : "auto",
							marginTop: 6,
							maxHeight: maxMenuHeight,
							overflowY: "auto",
							zIndex,
							borderRadius: 10,
							border: "1px solid #E8E4DC",
							background: "#FFFFFF",
							padding: 4,
							boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
							...menuStyle,
						}}
					>
						{options.map((opt) => (
							<button
								key={String(opt.value)}
								type="button"
								role="option"
								aria-selected={opt.value === value}
								onMouseDown={(e) => {
									if (preserveEditorSelection) e.preventDefault();
								}}
								onClick={() => pick(opt.value)}
								style={{
									width: "100%",
									display: "block",
									textAlign: "left",
									padding: "8px 10px",
									border: "none",
									borderRadius: 8,
									background:
										opt.value === value ? "rgba(193, 123, 47, 0.12)" : "transparent",
									fontSize: 12,
									color: "#1A1A1A",
									cursor: "pointer",
									...optionStyle,
								}}
							>
								{opt.label}
							</button>
						))}
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
