import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";
import { useRouter } from "next/router";

/**
 * Sidebar nav: Tasks link above the Workspace (drafts/assets) section.
 */
export default function AppSidebarTasksNav({ onNavigate }) {
	const router = useRouter();
	const isActive = router.pathname === "/tasks";

	return (
		<div className="mb-3">
			<motion.button
				type="button"
				whileHover={{ opacity: 0.92 }}
				whileTap={{ scale: 0.98 }}
				onClick={() => {
					router.push("/tasks");
					onNavigate?.();
				}}
				className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
					isActive
						? "bg-zinc-900 text-white"
						: "text-zinc-700 hover:bg-zinc-100"
				}`}
			>
				<LayoutGrid className="w-4 h-4 shrink-0" />
				Tasks
			</motion.button>
			<p className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-1.5 px-1 text-zinc-400">
				Workspace
			</p>
		</div>
	);
}
