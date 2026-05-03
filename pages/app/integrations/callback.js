import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth } from "../../../lib/config/firebase";
import { postComposioConnection } from "../../../lib/api/composioIntegrations";
import { onAuthStateChange } from "../../../lib/api/auth";

function waitForAuthUser(timeoutMs = 6000) {
	return new Promise((resolve) => {
		if (auth.currentUser) {
			resolve(auth.currentUser);
			return;
		}
		const unsub = onAuthStateChange((user) => {
			if (user) {
				unsub();
				resolve(user);
			}
		});
		setTimeout(() => {
			unsub();
			resolve(auth.currentUser);
		}, timeoutMs);
	});
}

/**
 * OAuth return URL for Composio (query: platform + optional connectedAccountId).
 */
export default function ComposioIntegrationsCallbackPage() {
	const router = useRouter();
	const [status, setStatus] = useState("working");
	const [message, setMessage] = useState("Finishing connection…");

	useEffect(() => {
		if (!router.isReady) return;

		let cancelled = false;

		const run = async () => {
			const q = router.query || {};
			const platform =
				(typeof q.platform === "string" && q.platform) ||
				(typeof window !== "undefined" &&
					sessionStorage.getItem("composio_oauth_pending_platform"));

			const connectedAccountId =
				(typeof q.connectedAccountId === "string" && q.connectedAccountId) ||
				(typeof q.connected_account_id === "string" &&
					q.connected_account_id) ||
				(typeof q.account_id === "string" && q.account_id) ||
				undefined;

			if (!platform) {
				setStatus("error");
				setMessage("Missing platform. Return to your draft and try Connect again.");
				return;
			}

			const user = await waitForAuthUser();
			if (cancelled) return;
			if (!user) {
				setStatus("error");
				setMessage("Please sign in, then reconnect from Export in your draft.");
				return;
			}

			try {
				const idToken = await user.getIdToken();
				await postComposioConnection(idToken, user.uid, {
					platform,
					...(connectedAccountId ? { connectedAccountId } : {}),
				});
				if (cancelled) return;
				const back =
					(typeof window !== "undefined" &&
						sessionStorage.getItem("composio_oauth_return")) ||
					"/app";
				if (typeof window !== "undefined") {
					sessionStorage.removeItem("composio_oauth_pending_platform");
					sessionStorage.removeItem("composio_oauth_return");
				}
				setStatus("ok");
				setMessage("Connected. Redirecting…");
				setTimeout(() => router.replace(back), 500);
			} catch (e) {
				if (cancelled) return;
				setStatus("error");
				setMessage(e?.message || "Connection could not be verified.");
			}
		};

		run();
		return () => {
			cancelled = true;
		};
	}, [router.isReady, router]);

	return (
		<div
			style={{
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				background: "#F7F5F0",
				fontFamily: "'Outfit', sans-serif",
				padding: 24,
			}}
		>
			<div
				style={{
					maxWidth: 420,
					background: "#fff",
					borderRadius: 14,
					padding: "28px 24px",
					border: "1px solid #E8E4DC",
					boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
					textAlign: "center",
				}}
			>
				<p
					style={{
						margin: "0 0 8px",
						fontSize: 18,
						fontWeight: 700,
						color: "#292524",
					}}
				>
					{status === "ok"
						? "You’re connected"
						: status === "error"
							? "Something went wrong"
							: "Almost there"}
				</p>
				<p style={{ margin: "0 0 20px", fontSize: 14, color: "#78716C" }}>
					{message}
				</p>
				<Link
					href="/app"
					style={{
						fontSize: 13,
						fontWeight: 600,
						color: "#C17B2F",
						textDecoration: "none",
					}}
				>
					Back to app
				</Link>
			</div>
		</div>
	);
}
