import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { T, TRANSLATION_LANGUAGES } from "../draftPageLib";
import {
	buildTranslationLanguageOptions,
	searchTranslationLanguagesWithFuse,
} from "../../../lib/utils/searchTranslationLanguages";

const ALL_OPTIONS = buildTranslationLanguageOptions(TRANSLATION_LANGUAGES);

export default function TranslationLanguageSelect({
	value,
	onChange,
	disabled = false,
	zIndex = 450,
}) {
	const rootRef = useRef(null);
	const searchRef = useRef(null);
	const [open, setOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const selected = ALL_OPTIONS.find((o) => o.value === value);
	const label = selected?.label ?? "Select language…";

	const filteredOptions = useMemo(
		() => searchTranslationLanguagesWithFuse(ALL_OPTIONS, searchQuery),
		[searchQuery],
	);

	useEffect(() => {
		if (!open) return;
		const onDoc = (e) => {
			if (!rootRef.current?.contains(e.target)) {
				setOpen(false);
				setSearchQuery("");
			}
		};
		const onKey = (e) => {
			if (e.key === "Escape") {
				setOpen(false);
				setSearchQuery("");
			}
		};
		const t = setTimeout(() => {
			document.addEventListener("mousedown", onDoc);
			document.addEventListener("keydown", onKey);
			searchRef.current?.focus();
		}, 0);
		return () => {
			clearTimeout(t);
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const pick = useCallback(
		(v) => {
			if (disabled) return;
			onChange(v);
			setOpen(false);
			setSearchQuery("");
		},
		[disabled, onChange],
	);

	return (
		<div
			ref={rootRef}
			style={{
				position: "relative",
				width: 168,
				minWidth: 168,
				flexShrink: 0,
			}}
		>
			<motion.button
				type="button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				onClick={() => !disabled && setOpen((o) => !o)}
				whileTap={disabled ? undefined : { scale: 0.98 }}
				style={{
					width: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 8,
					padding: "6px 10px",
					borderRadius: 8,
					border: `1px solid ${T.border}`,
					fontSize: 12,
					fontWeight: 600,
					background: T.base,
					color: T.accent,
					cursor: disabled ? "not-allowed" : "pointer",
					opacity: disabled ? 0.65 : 1,
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
					style={{ display: "inline-flex", flexShrink: 0 }}
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
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -6 }}
						transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
						role="listbox"
						style={{
							position: "absolute",
							top: "100%",
							left: 0,
							right: 0,
							marginTop: 6,
							zIndex,
							borderRadius: 10,
							border: `1px solid ${T.border}`,
							background: T.surface,
							boxShadow: "0 12px 32px rgba(0,0,0,0.14)",
							overflow: "hidden",
							minWidth: 220,
						}}
					>
						<div
							style={{
								padding: 8,
								borderBottom: `1px solid ${T.border}`,
								background: T.base,
							}}
							onMouseDown={(e) => e.stopPropagation()}
						>
							<input
								ref={searchRef}
								type="search"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search languages…"
								aria-label="Search languages"
								autoComplete="off"
								style={{
									width: "100%",
									padding: "7px 10px",
									borderRadius: 8,
									border: `1px solid ${T.border}`,
									fontSize: 12,
									fontWeight: 500,
									color: T.accent,
									background: T.surface,
									outline: "none",
									boxSizing: "border-box",
								}}
							/>
						</div>

						<div
							style={{
								maxHeight: 260,
								overflowY: "auto",
								padding: 4,
							}}
						>
							{filteredOptions.length === 0 ? (
								<p
									style={{
										padding: "12px 10px",
										fontSize: 12,
										color: T.muted,
										textAlign: "center",
										margin: 0,
									}}
								>
									No languages match &ldquo;{searchQuery}&rdquo;
								</p>
							) : (
								filteredOptions.map((opt) => (
									<button
										key={opt.value}
										type="button"
										role="option"
										aria-selected={opt.value === value}
										onClick={() => pick(opt.value)}
										style={{
											width: "100%",
											display: "block",
											textAlign: "left",
											padding: "8px 10px",
											border: "none",
											borderRadius: 8,
											background:
												opt.value === value
													? "rgba(193, 123, 47, 0.12)"
													: "transparent",
											fontSize: 12,
											fontWeight: 600,
											color: T.accent,
											cursor: "pointer",
										}}
										onMouseEnter={(e) => {
											if (opt.value !== value) {
												e.currentTarget.style.background = "#F0ECE5";
											}
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.background =
												opt.value === value
													? "rgba(193, 123, 47, 0.12)"
													: "transparent";
										}}
									>
										{opt.label}
									</button>
								))
							)}
						</div>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}
