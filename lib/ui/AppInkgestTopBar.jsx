/**
 * Shared app chrome: logo, optional sidebar toggle, Form/Canvas nav, spacer,
 * New draft, credits + upgrade, avatar.
 */

import { motion } from "framer-motion";

function Icon({ d, size = 16, stroke = "#7A7570", fill = "none", strokeWidth = 1.75 }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={fill}
			stroke={stroke}
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d={d} />
		</svg>
	);
}

const Icons = {
	plus: "M12 5v14M5 12h14",
	login: "M18 8a6 6 0 0 0-6 6 6 6 0 0 0 6 6 6 6 0 0 0 6-6 6 6 0 0 0-6-6zM3 18a9 9 0 1 1 18 0 9 9 0 0 1-18 0z",
	chevronL: "M15 18l-6-6 6-6",
	chevronR: "M9 18l6-6-6-6",
};

export default function AppInkgestTopBar({
	T,
	reduxUser,
	credits,
	creditRemaining,
	FREE_CREDIT_LIMIT,
	formatRenewalDate,
	router,
	sidebarOpen,
	onSidebarToggle,
	showSidebarToggle = true,
	showFormCanvasNav = false,
	formCanvasActive = "form",
	onLogin,
}) {
	return (
		<div
			style={{
				height: 56,
				background: T.surface,
				borderBottom: `1px solid ${T.border}`,
				display: "flex",
				alignItems: "center",
				padding: "0 20px",
				gap: 12,
				flexShrink: 0,
				zIndex: 50,
			}}
		>
			<a
				href="/"
				style={{
					fontSize: 20,
					color: T.accent,
					textDecoration: "none",
					display: "flex",
					alignItems: "center",
					gap: 7,
					flexShrink: 0,
					marginRight: 8,
				}}
			>
				<motion.span
					whileHover={{ scale: 1.3 }}
					style={{
						width: 8,
						height: 8,
						borderRadius: "50%",
						background: T.warm,
						display: "inline-block",
					}}
				/>
				inkgest
			</a>

			{reduxUser && showSidebarToggle && (
				<motion.button
					type="button"
					whileHover={{ background: "#F0ECE5" }}
					whileTap={{ scale: 0.93 }}
					onClick={onSidebarToggle}
					style={{
						background: "transparent",
						border: "none",
						borderRadius: 8,
						padding: "6px 8px",
						cursor: "pointer",
					}}
				>
					<Icon d={sidebarOpen ? Icons.chevronL : Icons.chevronR} size={16} />
				</motion.button>
			)}

			<div style={{ width: 1, height: 20, background: T.border }} />

			{showFormCanvasNav && (
				<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
					{["form", "canvas"].map((tab) => (
						<motion.button
							key={tab}
							type="button"
							whileTap={{ scale: 0.98 }}
							onClick={() =>
								tab === "form"
									? router.push("/app")
									: router.push("/app/canvas")
							}
							style={{
								padding: "6px 12px",
								borderRadius: 8,
								border: `1px solid ${
									formCanvasActive === tab ? T.warm : T.border
								}`,
								background:
									formCanvasActive === tab ? T.warmBg : T.surface,
								color: formCanvasActive === tab ? T.accent : T.muted,
								fontSize: 12,
								fontWeight: formCanvasActive === tab ? 700 : 600,
								cursor: "pointer",
							}}
						>
							{tab === "form" ? "Form" : "Canvas"}
						</motion.button>
					))}
				</div>
			)}

			<div style={{ flex: 1 }} />

			<motion.button
				type="button"
				whileHover={{
					scale: 1.03,
					y: -1,
					boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
				}}
				whileTap={{ scale: 0.97 }}
				onClick={() => router.push("/app")}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 6,
					background: T.accent,
					color: "white",
					border: "none",
					padding: "7px 16px",
					borderRadius: 9,
					fontSize: 13,
					fontWeight: 600,
					cursor: "pointer",
				}}
			>
				<Icon d={Icons.plus} size={14} stroke="white" />{" "}
				<span className="md:inline hidden">New draft</span>
			</motion.button>

			{reduxUser && (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 8,
						background: T.base,
						border: `1px solid ${creditRemaining === 0 ? "#F5C97A" : T.border}`,
						borderRadius: 100,
						padding: "4px 14px",
					}}
				>
					{credits?.plan === "pro" ? (
						<span style={{ fontSize: 12, color: T.warm, fontWeight: 700 }}>
							∞ Pro
						</span>
					) : (
						<>
							<span style={{ fontSize: 12, color: T.muted, fontWeight: 500 }}>
								Credits{" "}
								<span
									style={{
										fontWeight: 700,
										color: creditRemaining === 0 ? "#EF4444" : T.accent,
									}}
								>
									{credits
										? `${credits.creditsUsed.toFixed(2).replace(/\.?0+$/, "")}/${credits.creditsLimit}`
										: `0/${FREE_CREDIT_LIMIT}`}
								</span>
							</span>
							{credits?.renewsAt && (
								<span
									style={{
										fontSize: 11,
										color: T.muted,
										fontWeight: 500,
										whiteSpace: "nowrap",
									}}
								>
									Renew at {formatRenewalDate(credits.renewsAt)}
								</span>
							)}
						</>
					)}
					<motion.button
						type="button"
						whileHover={{ scale: 1.04 }}
						whileTap={{ scale: 0.97 }}
						onClick={() => router.push("/pricing")}
						style={{
							background: T.accent,
							color: "white",
							border: "none",
							padding: "3px 10px",
							borderRadius: 100,
							fontSize: 11,
							fontWeight: 700,
							cursor: "pointer",
						}}
					>
						{credits?.plan === "pro" ? "Manage" : "Upgrade"}
					</motion.button>
				</div>
			)}
			{!reduxUser && (
				<div
					className="sm:hidden md:flex"
					style={{
						alignItems: "center",
						gap: 8,
						background: T.base,
						border: `1px solid ${T.border}`,
						borderRadius: 100,
						padding: "4px 12px",
					}}
				>
					<span style={{ fontSize: 12, color: T.muted, fontWeight: 600 }}>
						{FREE_CREDIT_LIMIT} Credits
					</span>
				</div>
			)}

			<motion.button
				type="button"
				whileHover={{ scale: 1.08 }}
				whileTap={{ scale: 0.95 }}
				onClick={onLogin}
				style={{
					background: "none",
					border: "none",
					padding: 0,
					cursor: "pointer",
					borderRadius: "50%",
				}}
			>
				{reduxUser?.photoURL ? (
					<img
						src={reduxUser.photoURL}
						alt={reduxUser.displayName || "User"}
						style={{
							width: 34,
							height: 34,
							borderRadius: "50%",
							objectFit: "cover",
							border: `2px solid ${T.border}`,
							display: "block",
						}}
					/>
				) : (
					<div
						style={{
							width: 34,
							height: 34,
							borderRadius: "50%",
							background: T.border,
							border: `2px solid ${T.border}`,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Icon d={Icons.login} size={16} stroke={T.muted} />
					</div>
				)}
			</motion.button>
		</div>
	);
}
