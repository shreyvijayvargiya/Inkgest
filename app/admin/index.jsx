import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import HomeTab from "./components/HomeTab";
import BlogTab from "./components/BlogTab";
import EmailTab from "./components/EmailTab";
import KanbanBoardTab from "./components/KanbanBoardTab";
import IdeaDatabaseTab from "./components/IdeaDatabaseTab";
import SubscribersTab from "./components/SubscribersTab";
import UsersTab from "./components/UsersTab";
import CustomersTab from "./components/CustomersTab";
import PaymentsTab from "./components/PaymentsTab";
import MessagesTab from "./components/MessagesTab";
import InvoiceTab from "./components/InvoiceTab";
import WaitlistTab from "./components/WaitlistTab";
import ReportIssuesTab from "./components/ReportIssuesTab";
import ProductsTab from "./components/ProductsTab";
import TeamsTab from "./components/TeamsTab";
import CreditsSettingsTab from "./components/CreditsSettingsTab";
import FormsTab from "./components/FormsTab";
import ChangelogTab from "./components/ChangelogTab";
import AssetsTab from "./components/AssetsTab";
import AnalyticsTab from "./components/AnalyticsTab";
import CronJobsTab from "./components/CronJobsTab";
import DocsEditorTab from "./components/DocsEditorTab";
import SearchModal from "./components/SearchModal";
import Sidebar from "./components/Sidebar";
import { onAuthStateChange } from "../../lib/api/auth";
import { getCachedUserRole } from "../../lib/utils/getUserRole";
import { getUserRole } from "../../lib/utils/getUserRole";
import { getCurrentUserEmail } from "../../lib/utils/getCurrentUserEmail";
import ConfirmationModal from "../../lib/ui/ConfirmationModal";
import LoginModal from "../../lib/ui/LoginModal";
import {
	getUserCookie,
	removeUserCookie,
	setUserCookie,
} from "../../lib/utils/cookies";
import { useAppQueryClient } from "../../lib/hooks/useQueryClient";
import WorkflowAutomationsTab from "./components/WorkflowTab";
import TablesTab from "./components/TablesTab";
import { useRouter } from "next/router";

const Admin = () => {
	const queryClient = useAppQueryClient();
	const [activeTab, setActiveTab] = useState("home");
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [showSearchModal, setShowSearchModal] = useState(false);
	const [showLoginModal, setShowLoginModal] = useState(false);
	const [user, setUser] = useState(null);
	const [selectedTable, setSelectedTable] = useState(null);

	const handleSetActiveTab = (id) => {
		router.push(`/admin?path=${id}`);
		setActiveTab(id);
		setIsSidebarOpen(false);
		// Reset selected table when switching away from tables tab
		if (id !== "tables") {
			setSelectedTable(null);
		}
	}
	// Modal states
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);
	const [confirmData, setConfirmData] = useState({
		title: "",
		message: "",
		variant: "danger",
	});

	const router = useRouter();
	const pathname = router?.query?.path || "home";
	
	useEffect(() => {
		if (pathname) {
			setActiveTab(pathname);
		}
	}, [pathname]);

	// Fetch user role with React Query
	const fetchUserRole = async () => {
		try {
			// Get current user email (from Firebase Auth or localStorage fallback)
			const userEmail = await getCurrentUserEmail();

			console.log("CMS: Current user email:", userEmail);

			if (userEmail) {
				// Fetch role from Firestore teams collection using email
				// Firebase Auth users don't have role - we check teams collection
				const role = await getUserRole(userEmail, false);
				console.log("CMS: Fetched role from teams collection:", role);
				return role;
			} else {
				console.warn("CMS: No user email found, using cached role");
				// Fallback to cached role
				return getCachedUserRole();
			}
		} catch (error) {
			console.error("Error fetching user role:", error);
			// Fallback to cached role
			return getCachedUserRole();
		}
	};

	const { data: userRole = "viewer" } = useQuery({
		queryKey: ["userRole"],
		queryFn: fetchUserRole,
		staleTime: 5 * 60 * 1000, // 5 minutes
		cacheTime: 10 * 60 * 1000, // 10 minutes
	});

	// Check for existing user in cookie on mount
	useEffect(() => {
		const cookieUser = getUserCookie();
		if (cookieUser) {
			setUser(cookieUser);
		}
	}, []);

	// Listen for auth state changes and refetch user role
	useEffect(() => {
		const unsubscribe = onAuthStateChange(async (firebaseUser) => {
			// Invalidate userRole query when auth state changes
			queryClient.invalidateQueries({ queryKey: ["userRole"] });

			// Update user state and cookie
			if (firebaseUser) {
				const userData = {
					uid: firebaseUser.uid,
					email: firebaseUser.email,
					displayName:
						firebaseUser.displayName ||
						firebaseUser.email?.split("@")[0] ||
						"User",
					photoURL: firebaseUser.photoURL || null,
					provider:
						firebaseUser.providerData[0]?.providerId === "google.com"
							? "google"
							: "email",
				};
				setUserCookie(userData);
				setUser(userData);
			} else {
				removeUserCookie();
				setUser(null);
			}
		});

		return () => unsubscribe();
	}, [queryClient]);

	// Keyboard shortcut for search (Cmd/Ctrl + K)
	useEffect(() => {
		const handleKeyDown = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setShowSearchModal(true);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<div className="h-screen w-screen bg-zinc-50 flex flex-col overflow-hidden">
			{/* Main Layout */}
			<div className="flex flex-1 overflow-hidden relative">
				{/* Mobile Overlay */}
				<AnimatePresence>
					{isSidebarOpen && (
						<>
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => setIsSidebarOpen(false)}
								className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
							/>
						</>
					)}
				</AnimatePresence>

				{/* Sidebar */}
				<Sidebar
					activeTab={activeTab}
					setActiveTab={handleSetActiveTab}
					isSidebarOpen={isSidebarOpen}
					setIsSidebarOpen={setIsSidebarOpen}
					setShowSearchModal={setShowSearchModal}
					setShowLoginModal={setShowLoginModal}
					user={user}
					selectedTable={selectedTable}
					onTableSelect={setSelectedTable}
				/>

				{/* Mobile Menu Toggle */}
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => setIsSidebarOpen(!isSidebarOpen)}
					className="md:hidden fixed flex items-center gap-1 border border-zinc-100 bottom-4 z-50 right-4 p-2 text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors shadow-lg bg-white"
				>
					{isSidebarOpen ? "Close" : "Open"} Sidebar
					{isSidebarOpen ? (
						<X className="w-5 h-5" />
					) : (
						<Menu className="w-5 h-5" />
					)}
				</motion.button>

				{/* Content Area */}
				<main className="flex-1 w-full h-full overflow-y-auto">
					<div className="h-full w-full md:p-2">
						<div className="h-full w-full bg-white border border-zinc-200 rounded-2xl py-2 overflow-y-auto">
							{activeTab === "home" && (
								<HomeTab onNavigate={handleSetActiveTab} />
							)}
							{activeTab === "blogs" && <BlogTab queryClient={queryClient} />}
							{activeTab === "emails" && <EmailTab queryClient={queryClient} />}
							{activeTab === "kanban-board" && (
								<KanbanBoardTab queryClient={queryClient} />
							)}
							{activeTab === "idea-database" && (
								<IdeaDatabaseTab queryClient={queryClient} />
							)}
							{activeTab === "assets" && (
								<AssetsTab queryClient={queryClient} />
							)}
							{activeTab === "cron-jobs" && (
								<CronJobsTab queryClient={queryClient} />
							)}
							{activeTab === "docs-editor" && <DocsEditorTab />}
							{activeTab === "subscribers" && (
								<SubscribersTab queryClient={queryClient} />
							)}
							{activeTab === "users" && <UsersTab />}
							{activeTab === "customers" && <CustomersTab />}
							{activeTab === "payments" && (
								<PaymentsTab queryClient={queryClient} />
							)}
							{activeTab === "invoices" && (
								<InvoiceTab queryClient={queryClient} />
							)}
							{activeTab === "products" && (
								<ProductsTab queryClient={queryClient} />
							)}
							{activeTab === "messages" && (
								<MessagesTab queryClient={queryClient} />
							)}
							{activeTab === "forms" && <FormsTab queryClient={queryClient} />}
							{activeTab === "changelog" && (
								<ChangelogTab queryClient={queryClient} />
							)}
							{activeTab === "workflows" && <WorkflowAutomationsTab />}
							{activeTab === "tables" && (
								<TablesTab
									queryClient={queryClient}
									selectedTable={selectedTable}
									onTableSelect={setSelectedTable}
								/>
							)}
							{activeTab === "waitlist" && (
								<WaitlistTab queryClient={queryClient} />
							)}
							{activeTab === "analytics" && <AnalyticsTab />}
							{activeTab === "reportIssues" && (
								<ReportIssuesTab queryClient={queryClient} />
							)}
							{activeTab === "teams" && <TeamsTab queryClient={queryClient} />}
							{activeTab === "credits" && (
								<CreditsSettingsTab queryClient={queryClient} />
							)}
						</div>
					</div>
				</main>
			</div>

			{/* Confirmation Modal */}
			<ConfirmationModal
				isOpen={showConfirmModal}
				onClose={() => {
					setShowConfirmModal(false);
					setConfirmAction(null);
				}}
				onConfirm={() => {
					if (confirmAction) {
						confirmAction();
					}
					setShowConfirmModal(false);
					setConfirmAction(null);
				}}
				title={confirmData.title}
				message={confirmData.message}
				confirmText="Confirm"
				cancelText="Cancel"
				variant={confirmData.variant}
			/>

			{/* Search Modal */}
			<SearchModal
				isOpen={showSearchModal}
				onClose={() => setShowSearchModal(false)}
				onNavigate={setActiveTab}
			/>

			{/* Login Modal */}
			<LoginModal
				isOpen={showLoginModal}
				onClose={() => setShowLoginModal(false)}
			/>
		</div>
	);
};

export default Admin;
