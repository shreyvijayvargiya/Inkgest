import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import LoginModal from "../../lib/ui/LoginModal";
import AppInkgestTopBar from "../../lib/ui/AppInkgestTopBar";
import AppWorkspaceSidebar from "../../lib/ui/AppWorkspaceSidebar";
import McpIntegrationsPanel from "../../lib/ui/McpIntegrationsPanel";
import { useCompactAssetsNav } from "../../lib/hooks/useCompactAssetsNav";
import {
	getUserCredits,
	FREE_CREDIT_LIMIT,
	formatRenewalDate,
} from "../../lib/utils/credits";
import { getTheme } from "../../lib/utils/theme";

const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Comic:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #__next { height: 100%; }
    body { font-family: 'Comic', sans-serif; background: #F7F5F0; -webkit-font-smoothing: antialiased; }
  `}</style>
);

const T = getTheme();

export default function IntegrationsSettingsPage() {
	const router = useRouter();
	const reduxUser = useSelector((state) => state.user?.user ?? null);
	const [loginModalOpen, setLoginModalOpen] = useState(false);
	const [credits, setCredits] = useState(null);
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const compactAssetsNav = useCompactAssetsNav();
	const sidebarOpenPrefsReady = useRef(false);

	useLayoutEffect(() => {
		if (sidebarOpenPrefsReady.current) return;
		sidebarOpenPrefsReady.current = true;
		if (
			typeof window !== "undefined" &&
			window.matchMedia("(max-width: 767px)").matches
		) {
			setSidebarOpen(false);
		}
	}, []);

	const refreshCredits = useCallback(() => {
		if (!reduxUser) return;
		getUserCredits(reduxUser.uid)
			.then(setCredits)
			.catch((e) => console.error("Failed to load credits", e));
	}, [reduxUser]);

	const creditRemaining = credits
		? credits.plan === "pro"
			? Infinity
			: Math.max(0, credits.remaining ?? FREE_CREDIT_LIMIT)
		: FREE_CREDIT_LIMIT;

	useEffect(() => {
		if (!reduxUser) {
			setCredits(null);
			return;
		}
		refreshCredits();
	}, [reduxUser, refreshCredits]);

	return (
		<div
			className="h-screen flex flex-col overflow-hidden"
			style={{ background: T.base, fontFamily: "'Comic', sans-serif" }}
		>
			<FontLink />
			<AppInkgestTopBar
				T={T}
				reduxUser={reduxUser}
				credits={credits}
				creditRemaining={creditRemaining}
				FREE_CREDIT_LIMIT={FREE_CREDIT_LIMIT}
				formatRenewalDate={formatRenewalDate}
				router={router}
				sidebarOpen={sidebarOpen}
				onSidebarToggle={() => setSidebarOpen((s) => !s)}
				showSidebarToggle={!!reduxUser}
				onLogin={() => setLoginModalOpen(true)}
			/>
			<LoginModal
				isOpen={loginModalOpen}
				onClose={() => setLoginModalOpen(false)}
			/>

			<div className="flex flex-1 min-h-0 overflow-hidden">
				<AppWorkspaceSidebar
					T={T}
					reduxUser={reduxUser}
					sidebarOpen={sidebarOpen}
					onCloseSidebar={() => setSidebarOpen(false)}
					compactAssetsNav={compactAssetsNav}
					onLogin={() => setLoginModalOpen(true)}
				/>

				<main
					className={`flex-1 min-h-0 overflow-hidden transition-[margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${reduxUser && sidebarOpen && !compactAssetsNav ? "ml-[280px]" : "ml-0"}`}
				>
					<McpIntegrationsPanel
						reduxUser={reduxUser}
						onLogin={() => setLoginModalOpen(true)}
					/>
				</main>
			</div>
		</div>
	);
}
