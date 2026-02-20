import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import {
	Copy,
	ChevronLeft,
	ChevronRight,
	BookOpen,
	Rocket,
	Layers,
	Network,
	Code2,
	Database,
	Mail,
	CreditCard,
	Shield,
	Settings,
	Check,
	HelpCircle,
	Search,
	X,
	RocketIcon,
	Globe,
	Github,
	ChevronRight as ChevronRightIcon,
	ChevronDown,
	Moon,
	Sun,
	Monitor,
	ShoppingCart,
	ExternalLink,
	Menu,
	Folder,
	FolderOpen,
	Sidebar,
	BarChart,
} from "lucide-react";
import { toast } from "react-toastify";
import Fuse from "fuse.js";

// Documentation sections configuration
const DOC_SECTIONS = [
	{
		id: "getting-started",
		title: "Getting Started",
		file: "getting-started.md",
		icon: Rocket,
		category: "getting-started",
	},
	{
		id: "tech-stack",
		title: "Tech Stack",
		file: "tech-stack.md",
		icon: Layers,
		category: "getting-started",
	},
	{
		id: "architecture",
		title: "Architecture",
		file: "architecture.md",
		icon: Network,
		category: "getting-started",
	},
	{
		id: "apis",
		title: "APIs",
		file: "apis.md",
		icon: Code2,
		category: "core-features",
	},
	{
		id: "database",
		title: "Database",
		file: "database.md",
		icon: Database,
		category: "core-features",
	},
	{
		id: "emailing",
		title: "Emailing",
		file: "emailing.md",
		icon: Mail,
		category: "integrations",
	},
	{
		id: "payments",
		title: "Payments",
		file: "payments.md",
		icon: CreditCard,
		category: "integrations",
	},
	{
		id: "authentication",
		title: "Authentication",
		file: "authentication.md",
		icon: Shield,
		category: "core-features",
	},
	{
		id: "admin",
		title: "Admin",
		file: "admin.md",
		icon: Settings,
		category: "advanced",
	},
	{
		id: "frontend",
		title: "Frontend",
		file: "frontend.md",
		icon: Monitor,
		category: "advanced",
	},
	{
		id: "seo",
		title: "SEO",
		file: "seo.md",
		icon: Globe,
		category: "advanced",
	},
	{
		id: "analytics",
		title: "Analytics",
		file: "analytics.md",
		icon: BarChart,
		category: "integrations",
	},
	{
		id: "documentation",
		title: "Documentation",
		file: "documentation.md",
		icon: BookOpen,
		category: "advanced",
	},
	{
		id: "faq",
		title: "FAQ",
		file: null,
		icon: HelpCircle,
		category: "support",
	},
];

// Category configuration
const DOC_CATEGORIES = [
	{
		id: "getting-started",
		title: "Getting Started",
		icon: Rocket,
		sections: DOC_SECTIONS.filter((s) => s.category === "getting-started"),
	},
	{
		id: "core-features",
		title: "Core Features",
		icon: Code2,
		sections: DOC_SECTIONS.filter((s) => s.category === "core-features"),
	},
	{
		id: "integrations",
		title: "Integrations",
		icon: Network,
		sections: DOC_SECTIONS.filter((s) => s.category === "integrations"),
	},
	{
		id: "advanced",
		title: "Advanced",
		icon: Settings,
		sections: DOC_SECTIONS.filter((s) => s.category === "advanced"),
	},
	{
		id: "support",
		title: "Support",
		icon: HelpCircle,
		sections: DOC_SECTIONS.filter((s) => s.category === "support"),
	},
];

// FAQ Questions and Answers
const FAQ_DATA = [
	{
		id: 1,
		question: "How do I set up Firebase Authentication?",
		answer:
			"To set up Firebase Authentication, go to Firebase Console, enable Email/Password and Google providers, then add your Firebase configuration to `.env.local` with all required environment variables. See the Authentication section for detailed steps.",
	},
	{
		id: 2,
		question: "How do I send emails to subscribers?",
		answer:
			"Use the Admin panel → Emails tab to create an email, then click 'Send to Subscribers'. The system will automatically batch send emails to all active subscribers using Resend API. Make sure you have configured your Resend API key in environment variables.",
	},
	{
		id: 3,
		question: "How do I configure Polar payments?",
		answer:
			"Create a Polar account, set up products and plans, get your API credentials, and add them to `.env.local`. Configure the webhook endpoint at `/api/polar/webhook`. For local testing, use ngrok to forward webhooks to your local server.",
	},
	{
		id: 4,
		question: "What's the difference between Firestore and Supabase?",
		answer:
			"Firestore is a NoSQL database (primary) with real-time updates, while Supabase is a PostgreSQL database (optional) with SQL queries and Row Level Security. You can use either or both. Firestore is recommended for most use cases due to its simplicity and real-time capabilities.",
	},
	{
		id: 5,
		question: "How do I manage user roles and permissions?",
		answer:
			"User roles are stored in the Firestore `teams` collection, not in Firebase Auth. Add users to the teams collection with their email and role (admin, editor, author, or viewer). Roles are checked client-side and should be validated server-side for security.",
	},
	{
		id: 6,
		question: "How do I create and publish a blog post?",
		answer:
			"Go to Admin panel → Blogs tab, click 'Create New Blog', use the Tiptap editor to write your content, add a title and banner image, then save. To publish, change the status to 'published' and set the published date. The blog will be accessible via its slug.",
	},
	{
		id: 7,
		question: "How do I test webhooks locally?",
		answer:
			"Install ngrok (`npm install -g ngrok`), start your dev server (`npm run dev`), run `ngrok http 3000` in another terminal, copy the ngrok URL, and set it as your webhook URL in Polar dashboard. Webhooks will be forwarded to your local server.",
	},
	{
		id: 8,
		question: "How do I add a new subscriber?",
		answer:
			"Go to Admin panel → Subscribers tab, click 'Add Subscriber', enter the email and optional name, then save. Subscribers can also subscribe through your website's subscription form. All subscribers are stored in Firestore `subscribers` collection.",
	},
	{
		id: 9,
		question: "How do I customize email templates?",
		answer:
			"Email templates are stored in `public/html/` directory. Edit the HTML files (like `send-subscription-confirm-email.html`) using inline CSS. Templates use placeholder variables like `{{customerName}}` that are replaced at send time.",
	},
	{
		id: 10,
		question: "How do I deploy the application?",
		answer:
			"Build the application with `npm run build`, then deploy to Vercel (recommended for Next.js) or any Node.js hosting. Make sure to set all environment variables in your hosting platform. Update Firebase Security Rules and Supabase RLS policies for production.",
	},
	{
		id: 11,
		question: "User not found in teams collection - how to fix?",
		answer:
			"Add the user to the Firestore `teams` collection with their email and role (admin, editor, author, or viewer). The role must match the email used for Firebase authentication.",
	},
	{
		id: 12,
		question: "Role not updating in admin panel - what to do?",
		answer:
			"Clear browser cache, refresh the page, or wait for React Query cache to refresh. Roles are cached for performance and may take a few seconds to update.",
	},
	{
		id: 13,
		question: "Sign in fails with Firebase - how to troubleshoot?",
		answer:
			"Check that Firebase config is correct in `.env.local`, verify Email/Password and Google providers are enabled in Firebase Console, and ensure authorized domains include your domain.",
	},
	{
		id: 14,
		question: "Cookie not persisting after login - how to fix?",
		answer:
			"Check cookie settings and domain configuration. Ensure cookies are set for the correct domain and that browser settings allow cookies. Check if you're using HTTPS in production.",
	},
	{
		id: 15,
		question: "Permissions denied in admin panel - why?",
		answer:
			"Check that your user role in the `teams` collection matches the required permission. Viewer role has read-only access, while admin has full access. Verify your email matches exactly.",
	},
	{
		id: 16,
		question: "Data not loading in admin tabs - what's wrong?",
		answer:
			"Check Firebase configuration in `.env.local`, verify Firestore security rules allow read access, and check browser console for error messages. Ensure you're authenticated.",
	},
	{
		id: 17,
		question: "Editor not working in blog/email tabs - how to fix?",
		answer:
			"Check that Tiptap dependencies are installed (`npm install`), verify browser console for errors, and ensure React Query is properly configured. Try refreshing the page.",
	},
	{
		id: 18,
		question: "Invalid API key error for payments - what to check?",
		answer:
			"Verify `POLAR_ACCESS_TOKEN` or `STRIPE_SECRET_KEY` is correctly set in `.env.local`, check for typos, and ensure the key is from the correct environment (test vs production).",
	},
	{
		id: 19,
		question: "Webhook verification failed - how to resolve?",
		answer:
			"Check that `POLAR_WEBHOOK_SECRET` or `STRIPE_WEBHOOK_SECRET` matches the webhook secret from your payment provider dashboard. Verify the secret is copied correctly without extra spaces.",
	},
	{
		id: 20,
		question: "Product/Plan not found error - why?",
		answer:
			"Verify the `planId` exists in your payment provider (Polar/Stripe) dashboard. For Stripe, ensure you're using Price IDs (starting with `price_`) not Product IDs. Check the pricing page configuration.",
	},
	{
		id: 21,
		question: "Payment failed - what could be the issue?",
		answer:
			"Check customer payment method is valid, verify card details, check payment provider dashboard for decline reasons, and ensure test mode is used with test cards during development.",
	},
];

// Code block component with copy button (shared)
const CodeBlock = ({ language, children, isDark = false, ...props }) => {
	const [copied, setCopied] = useState(false);
	const codeString = String(children).replace(/\n$/, "");

	const lightTheme = {
		...oneLight,
	};

	const darkTheme = {
		...oneDark,
	};

	const handleCopyCode = async () => {
		try {
			await navigator.clipboard.writeText(codeString);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			toast.success("Code copied to clipboard!");
		} catch (error) {
			console.error("Failed to copy code:", error);
			toast.error("Failed to copy code");
		}
	};

	return (
		<div className="relative group my-4 block !bg-white dark:!bg-zinc-800">
			<div className="absolute top-2 right-2 z-10">
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={handleCopyCode}
					className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
						copied
							? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
							: "bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200"
					}`}
				>
					{copied ? (
						<>
							<Check className="w-3 h-3" />
							Copied
						</>
					) : (
						<>
							<Copy className="w-3 h-3" />
							Copy
						</>
					)}
				</motion.button>
			</div>
			<SyntaxHighlighter
				language={language || "javascript"}
				style={isDark ? darkTheme : lightTheme}
				PreTag="div"
				className={`rounded border ${
					isDark ? "border-zinc-700 !bg-zinc-800" : "border-zinc-200 !bg-white"
				}`}
				customStyle={{
					background: isDark ? "#27272a" : "#ffffff",
					padding: "1rem",
					margin: 0,
					marginBottom: 0,
					fontSize: "0.75rem",
					border: isDark ? "1px solid #3f3f46" : "1px solid #e4e4e7",
					display: "block",
					overflowX: "auto",
				}}
				{...props}
			>
				{codeString}
			</SyntaxHighlighter>
		</div>
	);
};

export default function DocsPage() {
	const [activeSection, setActiveSection] = useState("getting-started");
	const [markdownContent, setMarkdownContent] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [showSearchModal, setShowSearchModal] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [tableOfContents, setTableOfContents] = useState([]);
	const [activeHeading, setActiveHeading] = useState("");
	const [isDark, setIsDark] = useState(false);
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
	const [expandedCategories, setExpandedCategories] = useState({
		"getting-started": true,
		"core-features": true,
		integrations: true,
		advanced: true,
		support: true,
	});

	// Theme management
	useEffect(() => {
		// Check localStorage for saved theme preference
		const savedTheme = localStorage.getItem("docs-theme");
		if (savedTheme === "dark") {
			setIsDark(true);
			document.documentElement.classList.add("dark");
		} else {
			setIsDark(false);
			document.documentElement.classList.remove("dark");
		}
	}, []);

	const toggleTheme = () => {
		const newTheme = !isDark;
		setIsDark(newTheme);
		if (newTheme) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("docs-theme", "dark");
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("docs-theme", "light");
		}
	};

	// Initialize Fuse.js for search (memoized)
	const fuse = useMemo(
		() =>
			new Fuse(
				[
					...DOC_SECTIONS.filter((s) => s.file).map((section) => ({
						title: section.title,
						id: section.id,
						type: "section",
					})),
					...FAQ_DATA.map((faq) => ({
						title: faq.question,
						content: faq.answer,
						id: `faq-${faq.id}`,
						type: "faq",
					})),
				],
				{
					keys: ["title", "content"],
					threshold: 0.3,
					includeScore: true,
				},
			),
		[],
	);

	// Handle search
	useEffect(() => {
		if (searchQuery.trim()) {
			const results = fuse.search(searchQuery);
			setSearchResults(results.map((r) => r.item));
		} else {
			setSearchResults([]);
		}
	}, [searchQuery, fuse]);

	// Keyboard shortcut for search (Cmd/Ctrl + K)
	useEffect(() => {
		const handleKeyDown = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setShowSearchModal(true);
			}
			if (e.key === "Escape" && showSearchModal) {
				setShowSearchModal(false);
				setSearchQuery("");
				setSearchResults([]);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [showSearchModal]);

	// Load markdown content
	useEffect(() => {
		const loadMarkdown = async () => {
			setIsLoading(true);
			try {
				const section = DOC_SECTIONS.find((s) => s.id === activeSection);
				if (!section) return;

				// Handle FAQ section (no file)
				if (section.id === "faq") {
					setMarkdownContent("");
					setTableOfContents([]);
					setIsLoading(false);
					return;
				}

				const response = await fetch(`/docs/${section.file}`);
				if (!response.ok) {
					throw new Error(`Failed to load ${section.file}`);
				}
				const content = await response.text();
				setMarkdownContent(content);

				// Parse headings for table of contents
				const headings = [];
				const lines = content.split("\n");
				lines.forEach((line, index) => {
					const h1Match = line.match(/^# (.+)$/);
					const h2Match = line.match(/^## (.+)$/);
					const h3Match = line.match(/^### (.+)$/);
					const h4Match = line.match(/^#### (.+)$/);

					// Create slug-based ID
					const createId = (text) => {
						return text
							.toLowerCase()
							.replace(/[^\w\s-]/g, "")
							.replace(/\s+/g, "-")
							.replace(/-+/g, "-")
							.trim();
					};

					if (h1Match) {
						const text = h1Match[1];
						const id = createId(text);
						headings.push({ level: 1, text, id, lineIndex: index });
					} else if (h2Match) {
						const text = h2Match[1];
						const id = createId(text);
						headings.push({ level: 2, text, id, lineIndex: index });
					} else if (h3Match) {
						const text = h3Match[1];
						const id = createId(text);
						headings.push({ level: 3, text, id, lineIndex: index });
					} else if (h4Match) {
						const text = h4Match[1];
						const id = createId(text);
						headings.push({ level: 4, text, id, lineIndex: index });
					}
				});
				setTableOfContents(headings);
			} catch (error) {
				console.error("Error loading markdown:", error);
				setMarkdownContent(
					`# ${
						DOC_SECTIONS.find((s) => s.id === activeSection)?.title ||
						"Documentation"
					}\n\nContent not available.`,
				);
				toast.error("Failed to load documentation");
			} finally {
				setIsLoading(false);
			}
		};

		loadMarkdown();
	}, [activeSection]);

	// Get current section index
	const currentIndex = DOC_SECTIONS.findIndex((s) => s.id === activeSection);
	const hasPrevious = currentIndex > 0;
	const hasNext = currentIndex < DOC_SECTIONS.length - 1;

	// Navigation handlers
	const handlePrevious = () => {
		if (hasPrevious) {
			setActiveSection(DOC_SECTIONS[currentIndex - 1].id);
		}
	};

	const handleNext = () => {
		if (hasNext) {
			setActiveSection(DOC_SECTIONS[currentIndex + 1].id);
		}
	};

	// Copy markdown to clipboard
	const handleCopyMarkdown = async () => {
		try {
			await navigator.clipboard.writeText(markdownContent);
			toast.success("Markdown copied to clipboard!");
		} catch (error) {
			console.error("Failed to copy:", error);
			toast.error("Failed to copy markdown");
		}
	};

	// Function reference list item component
	const FunctionListItem = ({ children }) => {
		const [copied, setCopied] = useState(false);

		// Extract function name and description from children
		const extractFunctionInfo = (node) => {
			if (Array.isArray(node)) {
				let functionName = "";
				let description = "";
				let foundCode = false;

				for (let i = 0; i < node.length; i++) {
					const item = node[i];

					// Check if it's a code element (inline code from markdown)
					if (
						item?.type === "code" ||
						(item?.props && item.props.inline !== undefined)
					) {
						foundCode = true;
						functionName = String(
							item.props?.children || item.children || "",
						).trim();

						// Look for description after colon in next items
						for (let j = i + 1; j < node.length; j++) {
							const nextItem = node[j];
							const nextText = String(nextItem || "");
							if (nextText.includes(":")) {
								description = nextText.split(":").slice(1).join(":").trim();
								break;
							}
							if (typeof nextItem === "string" && nextItem.trim()) {
								description += (description ? " " : "") + nextItem.trim();
							}
						}

						if (functionName && description) {
							return { found: true, functionName, description };
						}
					}

					// Also check if string contains the pattern
					if (typeof item === "string") {
						const match = item.match(/`([^`]+)`:\s*(.+)$/);
						if (match) {
							return {
								found: true,
								functionName: match[1].trim(),
								description: match[2].trim(),
							};
						}
					}
				}
			}

			// Check if it's a string directly
			if (typeof node === "string") {
				const match = node.match(/`([^`]+)`:\s*(.+)$/);
				if (match) {
					return {
						found: true,
						functionName: match[1].trim(),
						description: match[2].trim(),
					};
				}
			}

			return { found: false };
		};

		const functionInfo = extractFunctionInfo(children);

		if (functionInfo.found) {
			return (
				<div className="flex items-start gap-2 group/item">
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(functionInfo.functionName);
								setCopied(true);
								setTimeout(() => setCopied(false), 2000);
								toast.success("Function name copied!");
							} catch (error) {
								toast.error("Failed to copy");
							}
						}}
						className={`flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium transition-all ${
							copied
								? "bg-green-100 text-green-700 opacity-100"
								: "bg-zinc-100 hover:bg-zinc-200 text-zinc-600 opacity-0 group-hover/item:opacity-100"
						}`}
					>
						{copied ? (
							<Check className="w-3 h-3" />
						) : (
							<Copy className="w-3 h-3" />
						)}
					</motion.button>
					<div className="flex-1">
						<code className="text-zinc-900 dark:text-zinc-100 font-mono text-xs font-semibold bg-zinc-100 dark:bg-zinc-700 px-1 py-0.5 rounded">
							{functionInfo.functionName}
						</code>
						<span className="text-zinc-700 dark:text-zinc-300 text-sm ml-1">
							: {functionInfo.description}
						</span>
					</div>
				</div>
			);
		}

		// Return children as-is to preserve inline code rendering in lists
		return <>{children}</>;
	};

	// Sidebar content component (reusable for desktop and mobile)
	const SidebarContent = ({ onSectionClick }) => (
		<>
			<div className="flex justify-between p-4 ">
				<div className="flex items-center gap-2">
					<RocketIcon className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
					<h1 className="text-md font-bold text-zinc-900 dark:text-zinc-100 font-mono">
						Inkgest
					</h1>
				</div>
				{/* Theme Toggle Button */}
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
					onClick={toggleTheme}
					className="flex gap-1 px-1.5 py-1 items-center bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-full shadow-lg hover:shadow-xl transition-all"
					aria-label="Toggle theme"
				>
					{isDark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
				</motion.button>
			</div>
			<nav className="flex-1 p-3">
				{/* Search Button */}
				<button
					onClick={() => {
						setShowSearchModal(true);
						if (onSectionClick) onSectionClick();
					}}
					className="w-full px-3 py-1.5 mb-2 text-xs font-medium transition-colors rounded flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-300 dark:border-zinc-600 font-mono"
				>
					<div className="flex items-center gap-2">
						<Search className="w-3.5 h-3.5" />
						<span>Search</span>
					</div>
					<span className="text-[10px] text-zinc-500">CMD/CTRL + K</span>
				</button>
				<div className="space-y-1">
					{DOC_CATEGORIES.map((category) => {
						const CategoryIcon = category.icon;
						const isExpanded = expandedCategories[category.id];
						const hasActiveSection = category.sections.some(
							(s) => s.id === activeSection,
						);

						return (
							<div key={category.id} className="space-y-0.5">
								{/* Category Header */}
								<button
									onClick={() => {
										setExpandedCategories((prev) => ({
											...prev,
											[category.id]: !prev[category.id],
										}));
									}}
									className={`w-full text-left px-3 py-2 rounded text-xs font-semibold transition-colors font-mono flex items-center gap-2 ${
										hasActiveSection
											? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
											: "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
									}`}
								>
									<CategoryIcon className="w-3.5 h-3.5 flex-shrink-0" />
									<span className="flex-1">{category.title}</span>
									{isExpanded ? (
										<FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
									) : (
										<Folder className="w-3.5 h-3.5 flex-shrink-0" />
									)}
									{isExpanded ? (
										<ChevronDown className="w-3 h-3 flex-shrink-0" />
									) : (
										<ChevronRightIcon className="w-3 h-3 flex-shrink-0" />
									)}
								</button>

								{/* Category Items */}
								{isExpanded && (
									<ul className="ml-4 space-y-0.5 border-l border-zinc-200 dark:border-zinc-700 pl-2">
										{category.sections.map((section) => {
											const IconComponent = section.icon;
											return (
												<li key={section.id}>
													<button
														onClick={() => {
															setActiveSection(section.id);
															if (onSectionClick) onSectionClick();
														}}
														className={`w-full text-left px-3 py-1.5 rounded text-xs font-medium transition-colors font-mono flex items-center gap-2 ${
															activeSection === section.id
																? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
																: "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
														}`}
													>
														<IconComponent className="w-3.5 h-3.5 flex-shrink-0" />
														<span>{section.title}</span>
													</button>
												</li>
											);
										})}
									</ul>
								)}
							</div>
						);
					})}
				</div>
				{/* Buy Now Card */}
				<div className="p-3 ">
					<a
						href="https://Inkgest.dev"
						target="_blank"
						rel="noopener noreferrer"
						className="block"
					>
						<motion.div
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 rounded-xl p-4 border border-zinc-200 dark:border-zinc-700 shadow-lg hover:shadow-xl transition-all"
						>
							<div className="flex items-center gap-2 mb-2">
								<ShoppingCart className="w-4 h-4 text-white dark:text-zinc-900" />
								<h3 className="text-sm font-bold text-white dark:text-zinc-900 font-mono">
									Buy Inkgest
								</h3>
							</div>
							<p className="text-xs text-zinc-300 dark:text-zinc-700 mb-3 leading-relaxed">
								Easiest way to Build your SaaS Application
							</p>
							<div className="flex items-center gap-1.5 text-xs font-medium text-white dark:text-zinc-900">
								<span>Buy Now</span>
								<ExternalLink className="w-3 h-3" />
							</div>
						</motion.div>
					</a>
				</div>
			</nav>
		</>
	);

	return (
		<div className="h-full overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex">
			{/* Desktop Sidebar */}
			<aside className="hidden md:flex w-64 bg-transparent flex-col h-screen sticky top-0 font-mono">
				<SidebarContent />
			</aside>
			{/* Desktop Sidebar */}
			<aside className="block md:hidden fixed top-1 left-2 z-50">
				<Sidebar
					className="w-4 h-4 dark:text-zinc-500 text-zinc-800"
					onClick={() => setIsMobileSidebarOpen(true)}
				/>
			</aside>

			{/* Mobile Sidebar Drawer */}
			<AnimatePresence>
				{isMobileSidebarOpen && (
					<>
						{/* Backdrop */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setIsMobileSidebarOpen(false)}
							className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-40 md:hidden"
						/>
						{/* Drawer */}
						<motion.aside
							initial={{ x: -280 }}
							animate={{ x: 0 }}
							exit={{ x: -280 }}
							transition={{ type: "spring", damping: 25, stiffness: 200 }}
							className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex-col z-50 md:hidden font-mono shadow-2xl flex"
						>
							<div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-700 flex-shrink-0">
								<div className="flex items-center gap-2">
									<RocketIcon className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
									<h1 className="text-md font-bold text-zinc-900 dark:text-zinc-100 font-mono">
										Inkgest
									</h1>
								</div>
								<motion.button
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
									onClick={() => setIsMobileSidebarOpen(false)}
									className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
									aria-label="Close sidebar"
								>
									<X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
								</motion.button>
							</div>
							<div className="flex-1 overflow-y-auto flex flex-col">
								<SidebarContent
									onSectionClick={() => setIsMobileSidebarOpen(false)}
								/>
							</div>
						</motion.aside>
					</>
				)}
			</AnimatePresence>

			{/* Main Content */}
			<main className="fixed md:top-2 top-4 bottom-2 right-0 lg:left-64 left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 m-2 rounded-2xl overflow-y-auto hidescrollbar">
				{/* Content Area */}
				<div className="flex-1 overflow-y-auto hidescrollbar w-full relative">
					{/* Header with Copy Button */}
					<div
						className={`max-w-4xl mx-auto w-full px-4 mt-4 flex items-center justify-between z-10 ${tableOfContents?.length > 0 && activeSection !== "faq" ? "lg:pr-80" : ""}`}
					>
						<div className="flex items-center gap-3">
							{/* Mobile Menu Toggle */}
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setIsMobileSidebarOpen(true)}
								className="md:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
								aria-label="Open sidebar"
							>
								<Menu className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
							</motion.button>
							<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
								{DOC_SECTIONS.find((s) => s.id === activeSection)?.title ||
									"Documentation"}
							</h2>
						</div>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={handleCopyMarkdown}
							className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded transition-colors text-xs font-medium"
						>
							<Copy className="w-3.5 h-3.5" />
							Copy Markdown
						</motion.button>
					</div>
					<div
						className={`max-w-4xl mx-auto overflow-y-auto hidescrollbar px-4 ${tableOfContents?.length > 0 && activeSection !== "faq" ? "lg:pr-80" : ""}`}
					>
						<div>
							{isLoading ? (
								<div className="flex items-center justify-center py-20">
									<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
								</div>
							) : activeSection === "faq" ? (
								<div className="space-y-6">
									<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
										Frequently Asked Questions
									</h1>
									<div className="space-y-4">
										{FAQ_DATA.map((faq) => (
											<div
												key={faq.id}
												className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded p-4"
											>
												<h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
													{faq.question}
												</h3>
												<p className="text-zinc-700 dark:text-zinc-300 text-sm leading-6">
													{faq.answer}
												</p>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="prose prose-zinc max-w-none prose-sm prose-code:bg-white prose-pre:bg-white">
									<ReactMarkdown
										components={{
											h1: ({ node, children, ...props }) => {
												const text = String(children);
												const heading = tableOfContents?.find(
													(h) => h.text === text && h.level === 1,
												);
												const id =
													heading?.id ||
													text
														.toLowerCase()
														.replace(/\s+/g, "-")
														.replace(/[^\w-]/g, "");
												return (
													<h1
														id={id}
														className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 mt-6 scroll-mt-4"
														{...props}
													>
														{children}
													</h1>
												);
											},
											h2: ({ node, children, ...props }) => {
												const text = String(children);
												const heading = tableOfContents?.find(
													(h) => h.text === text && h.level === 2,
												);
												const id =
													heading?.id ||
													text
														.toLowerCase()
														.replace(/\s+/g, "-")
														.replace(/[^\w-]/g, "");
												return (
													<h2
														id={id}
														className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 mt-6 scroll-mt-4"
														{...props}
													>
														{children}
													</h2>
												);
											},
											h3: ({ node, children, ...props }) => {
												const text = String(children);
												const heading = tableOfContents?.find(
													(h) => h.text === text && h.level === 3,
												);
												const id =
													heading?.id ||
													text
														.toLowerCase()
														.replace(/\s+/g, "-")
														.replace(/[^\w-]/g, "");
												return (
													<h3
														id={id}
														className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 mt-4 scroll-mt-4"
														{...props}
													>
														{children}
													</h3>
												);
											},
											h4: ({ node, children, ...props }) => {
												const text = String(children);
												const heading = tableOfContents?.find(
													(h) => h.text === text && h.level === 4,
												);
												const id =
													heading?.id ||
													text
														.toLowerCase()
														.replace(/\s+/g, "-")
														.replace(/[^\w-]/g, "");
												return (
													<h4
														id={id}
														className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2 mt-3 scroll-mt-4"
														{...props}
													>
														{children}
													</h4>
												);
											},
											p: ({ node, ...props }) => (
												<p
													className="text-zinc-700 dark:text-zinc-300 mb-3 leading-6 text-sm"
													{...props}
												/>
											),
											ul: ({ node, ...props }) => (
												<ul
													className="list-disc mb-3 space-y-1.5 text-zinc-700 dark:text-zinc-300 text-sm ml-6 pl-0"
													style={{ listStylePosition: "outside" }}
													{...props}
												/>
											),
											ol: ({ node, ...props }) => (
												<ol
													className="list-decimal mb-3 space-y-1.5 text-zinc-700 dark:text-zinc-300 text-sm ml-6 pl-0"
													style={{ listStylePosition: "outside" }}
													{...props}
												/>
											),
											li: ({ node, children, ...props }) => {
												// Always pass to FunctionListItem - it will handle detection and fallback
												return (
													<li className="mb-1.5 pl-2" {...props}>
														<FunctionListItem>{children}</FunctionListItem>
													</li>
												);
											},
											code: ({
												node,
												inline,
												className,
												children,
												...props
											}) => {
												// Inline code: ReactMarkdown passes inline=true for inline code
												if (inline) {
													return (
														<code
															className="text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono bg-zinc-100 dark:bg-zinc-800"
															style={{
																display: "inline",
																whiteSpace: "normal",
															}}
															{...props}
														>
															{children}
														</code>
													);
												}

												// Block-level code - always use CodeBlock with SyntaxHighlighter
												const match = /language-(\w+)/.exec(className || "");
												const language = match ? match[1] : "";
												const codeString = String(children).replace(/\n$/, "");

												return (
													<CodeBlock
														language={language}
														isDark={isDark}
														{...props}
													>
														{codeString}
													</CodeBlock>
												);
											},
											pre: ({ node, children, ...props }) => {
												// Pre tag is handled by CodeBlock component via the code component
												// ReactMarkdown wraps code blocks in <pre><code>, so we just pass through
												// The code component will handle rendering as CodeBlock
												return <>{children}</>;
											},
											blockquote: ({ node, ...props }) => (
												<blockquote
													className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-3 italic text-zinc-600 dark:text-zinc-400 my-3 text-sm"
													{...props}
												/>
											),
											a: ({ node, ...props }) => (
												<a
													className="text-blue-600 hover:text-blue-800 underline"
													target="_blank"
													rel="noopener noreferrer"
													{...props}
												/>
											),
											strong: ({ node, ...props }) => (
												<strong
													className="font-semibold text-zinc-900 dark:text-zinc-100"
													{...props}
												/>
											),
											table: ({ node, ...props }) => (
												<div className="overflow-x-auto my-4">
													<table
														className="min-w-full border border-zinc-200 dark:border-zinc-700 rounded"
														{...props}
													/>
												</div>
											),
											thead: ({ node, ...props }) => (
												<thead
													className="bg-zinc-100 dark:bg-zinc-800"
													{...props}
												/>
											),
											th: ({ node, ...props }) => (
												<th
													className="px-3 py-1.5 text-left font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 text-sm"
													{...props}
												/>
											),
											td: ({ node, ...props }) => (
												<td
													className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700 text-sm"
													{...props}
												/>
											),
										}}
									>
										{markdownContent}
									</ReactMarkdown>
								</div>
							)}
						</div>
					</div>

					{/* Table of Contents - Right Sidebar (Outside Main Content) */}
					{tableOfContents?.length > 0 && activeSection !== "faq" && (
						<aside className="hidden lg:block fixed right-0 top-4 bottom-4 w-64 overflow-y-auto hidescrollbar">
							<div className="border-l border-zinc-200 dark:border-zinc-700 pl-6 py-4  ">
								<h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wider">
									Table of Contents
								</h3>
								<nav className="space-y-1">
									{tableOfContents?.map((heading, index) => (
										<a
											key={index}
											href={`#${heading.id}`}
											onClick={(e) => {
												e.preventDefault();
												const element = document.getElementById(heading.id);
												if (element) {
													element.scrollIntoView({
														behavior: "smooth",
														block: "start",
													});
													setActiveHeading(heading.id);
												}
											}}
											className={`block text-xs transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 ${
												heading.level === 1
													? "font-semibold text-zinc-900 dark:text-zinc-100 pl-0"
													: heading.level === 2
														? "font-medium text-zinc-700 dark:text-zinc-300 pl-3"
														: heading.level === 3
															? "text-zinc-600 dark:text-zinc-400 pl-6"
															: "text-zinc-500 dark:text-zinc-500 pl-9"
											} ${
												activeHeading === heading.id
													? "text-zinc-900 dark:text-zinc-100 font-semibold"
													: ""
											}`}
										>
											{heading.text}
										</a>
									))}
								</nav>
							</div>
						</aside>
					)}

					{/* Navigation Footer */}
					<div
						className={`max-w-4xl mx-auto px-4 mt-8 ${tableOfContents?.length > 0 && activeSection !== "faq" ? "lg:pr-80" : ""}`}
					>
						<div className="w-fit my-10 p-1 bg-white dark:bg-zinc-800 gap-1 rounded flex items-center justify-around">
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={handlePrevious}
								disabled={!hasPrevious}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors text-xs font-medium ${
									hasPrevious
										? "bg-zinc-100/50 dark:bg-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
										: "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
								}`}
							>
								<ChevronLeft className="w-3.5 h-3.5" />
								Previous
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								onClick={handleNext}
								disabled={!hasNext}
								className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors text-xs font-medium ${
									hasNext
										? "bg-zinc-100/50 dark:bg-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
										: "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
								}`}
							>
								Next
								<ChevronRight className="w-3.5 h-3.5" />
							</motion.button>
						</div>
					</div>
				</div>
			</main>

			{/* Search Modal */}
			<AnimatePresence>
				{showSearchModal && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-50 flex items-start justify-center pt-20 px-4"
						onClick={() => {
							setShowSearchModal(false);
							setSearchQuery("");
							setSearchResults([]);
						}}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: -20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: -20 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white dark:bg-zinc-800 rounded shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
						>
							{/* Modal Header */}
							<div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Search className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
									<h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
										Search & Ask
									</h3>
								</div>
								<button
									onClick={() => {
										setShowSearchModal(false);
										setSearchQuery("");
										setSearchResults([]);
									}}
									className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
								>
									<X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
								</button>
							</div>

							{/* Search Input */}
							<div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search sections, FAQs, and content..."
									className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400 text-sm font-mono bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400"
									autoFocus
								/>
							</div>

							{/* Search Results */}
							<div className="flex-1 overflow-y-auto p-4">
								{searchQuery.trim() ? (
									searchResults.length > 0 ? (
										<div className="space-y-2">
											{searchResults.map((result, index) => (
												<motion.button
													key={index}
													whileHover={{ scale: 1.01 }}
													whileTap={{ scale: 0.99 }}
													onClick={() => {
														if (result.type === "section") {
															setActiveSection(result.id);
														} else if (result.type === "faq") {
															setActiveSection("faq");
														}
														setShowSearchModal(false);
														setSearchQuery("");
														setSearchResults([]);
													}}
													className="w-full text-left p-3 bg-zinc-50 dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 rounded transition-colors border border-zinc-200 dark:border-zinc-600"
												>
													<div className="flex items-start gap-2">
														{result.type === "faq" ? (
															<HelpCircle className="w-4 h-4 text-zinc-600 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
														) : (
															<BookOpen className="w-4 h-4 text-zinc-600 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
														)}
														<div className="flex-1">
															<div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
																{result.title}
															</div>
															{result.content && (
																<div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
																	{result.content}
																</div>
															)}
															{result.type === "faq" && (
																<div className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
																	FAQ
																</div>
															)}
														</div>
													</div>
												</motion.button>
											))}
										</div>
									) : (
										<div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
											No results found for "{searchQuery}"
										</div>
									)
								) : (
									<div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
										Start typing to search documentation...
									</div>
								)}
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
}
