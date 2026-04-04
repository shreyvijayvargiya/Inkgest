import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LoginModal from "../../lib/ui/LoginModal";
import {
	getUserCredits,
	FREE_CREDIT_LIMIT,
	formatRenewalDate,
} from "../../lib/utils/credits";
import { getTheme } from "../../lib/utils/theme";
import { listAssets } from "../../lib/api/userAssets";
import GenerateCanvasTab from "../../lib/ui/GenerateCanvasTab";
import AppInkgestTopBar from "../../lib/ui/AppInkgestTopBar";

const FontLink = () => (
	<style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #__next { height: 100%; }
    body { font-family: 'Outfit', sans-serif; background: #F7F5F0; -webkit-font-smoothing: antialiased; }
  `}</style>
);

const T = getTheme();

const FORMAT = "substack";
const STYLE = "casual";

export default function AppCanvasPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const reduxUser = useSelector((state) => state.user?.user ?? null);
	const [loginModalOpen, setLoginModalOpen] = useState(false);
	const [credits, setCredits] = useState(null);

	const creditRemaining = credits
		? credits.plan === "pro"
			? Infinity
			: Math.max(0, credits.remaining ?? FREE_CREDIT_LIMIT)
		: FREE_CREDIT_LIMIT;

	const { data: items = [], isLoading: assetsLoading } = useQuery({
		queryKey: ["assets", reduxUser?.uid],
		queryFn: () => listAssets(reduxUser.uid),
		enabled: !!reduxUser,
		staleTime: 2 * 60 * 1000,
	});

	useEffect(() => {
		if (!reduxUser) {
			setCredits(null);
			return;
		}
		getUserCredits(reduxUser.uid)
			.then(setCredits)
			.catch((e) => console.error("Failed to load credits", e));
	}, [reduxUser]);

	return (
		<div
			style={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				background: T.base,
				fontFamily: "'Outfit', sans-serif",
				overflow: "hidden",
			}}
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
				sidebarOpen={false}
				onSidebarToggle={() => {}}
				showSidebarToggle={false}
				showFormCanvasNav
				formCanvasActive="canvas"
				onLogin={() => setLoginModalOpen(true)}
			/>
			<LoginModal
				isOpen={loginModalOpen}
				onClose={() => setLoginModalOpen(false)}
			/>
			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					minHeight: 0,
					overflow: "hidden",
				}}
			>
				<GenerateCanvasTab
					theme={T}
					sidebarOpen={false}
					reduxUser={reduxUser}
					router={router}
					queryClient={queryClient}
					creditRemaining={creditRemaining}
					onLogin={() => setLoginModalOpen(true)}
					format={FORMAT}
					style={STYLE}
					assets={items}
					assetsLoading={assetsLoading}
				/>
			</div>
		</div>
	);
}
