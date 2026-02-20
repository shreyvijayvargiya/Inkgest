import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import {
	Search,
	X,
	FileText,
	Mail,
	Users,
	Shield,
	ArrowRight,
	Sparkles,
	Receipt,
	LayoutGrid,
	UsersRound,
	AlertCircle,
	CreditCard,
	ShoppingBag,
	Building2,
	User,
	MessageSquare,
	FileEdit,
} from "lucide-react";
import { getAllBlogs } from "../../../lib/api/blog";
import { getAllEmails } from "../../../lib/api/emails";
import { getAllSubscribers } from "../../../lib/api/subscribers";
import { getAllProducts } from "../../../lib/api/products";
import { getAllPayments } from "../../../lib/api/payments";
import { getAllInvoices } from "../../../lib/api/invoice";
import { getAllCustomers } from "../../../lib/api/customers";
import { getAllUsers } from "../../../lib/api/users";
import { getAllTeamMembers } from "../../../lib/api/teams";
import { getAllWaitlist } from "../../../lib/api/waitlist";
import { getAllMessages } from "../../../lib/api/messages";
import { getAllForms } from "../../../lib/api/forms";

const SearchModal = ({ isOpen, onClose, onNavigate }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all"); // all, blogs, emails, subscribers, users, customers, products, payments, invoices, messages, forms, teams, waitlist

	// Normalize values for safe React rendering and search indexing
	const formatValue = (value) => {
		if (value === null || value === undefined) return "";
		if (typeof value === "string") return value;
		if (typeof value === "number" || typeof value === "boolean") return String(value);
		if (value instanceof Date) {
			if (isNaN(value.getTime())) return "";
			return value.toLocaleString();
		}
		// Firestore Timestamp-like object
		if (
			typeof value === "object" &&
			typeof value.seconds === "number" &&
			typeof value.nanoseconds === "number"
		) {
			const ms = value.seconds * 1000 + Math.floor(value.nanoseconds / 1e6);
			const d = new Date(ms);
			return isNaN(d.getTime()) ? "" : d.toLocaleString();
		}
		// Avoid rendering arbitrary objects as React children
		return "";
	};

	// Fetch all data
	const { data: blogs = [] } = useQuery({
		queryKey: ["blogs"],
		queryFn: () => getAllBlogs(),
		enabled: isOpen,
	});

	const { data: emails = [] } = useQuery({
		queryKey: ["emails"],
		queryFn: () => getAllEmails(),
		enabled: isOpen,
	});

	const { data: subscribers = [] } = useQuery({
		queryKey: ["subscribers"],
		queryFn: () => getAllSubscribers(),
		enabled: isOpen,
	});

	const { data: users = [] } = useQuery({
		queryKey: ["users"],
		queryFn: () => getAllUsers(),
		enabled: isOpen,
	});

	const { data: customers = [] } = useQuery({
		queryKey: ["customers"],
		queryFn: () => getAllCustomers(),
		enabled: isOpen,
	});

	const { data: products = [] } = useQuery({
		queryKey: ["products"],
		queryFn: () => getAllProducts(),
		enabled: isOpen,
	});

	const { data: payments = [] } = useQuery({
		queryKey: ["payments"],
		queryFn: () => getAllPayments(),
		enabled: isOpen,
	});

	const { data: invoices = [] } = useQuery({
		queryKey: ["invoices"],
		queryFn: () => getAllInvoices(),
		enabled: isOpen,
	});

	const { data: messages = [] } = useQuery({
		queryKey: ["messages"],
		queryFn: () => getAllMessages(),
		enabled: isOpen,
	});

	const { data: forms = [] } = useQuery({
		queryKey: ["forms"],
		queryFn: () => getAllForms(),
		enabled: isOpen,
	});

	const { data: teams = [] } = useQuery({
		queryKey: ["teams"],
		queryFn: () => getAllTeamMembers(),
		enabled: isOpen,
	});

	const { data: waitlist = [] } = useQuery({
		queryKey: ["waitlist"],
		queryFn: () => getAllWaitlist(),
		enabled: isOpen,
	});

	// Prepare search data
	const searchData = useMemo(() => {
		const data = [];

		if (selectedCategory === "all" || selectedCategory === "blogs") {
			blogs.forEach((blog) => {
				data.push({
					type: "blog",
					id: blog.id,
					title: blog.title,
					subtitle: blog.slug || blog.author || "",
					searchText: `${blog.title} ${blog.slug || ""} ${blog.author || ""}`,
					data: blog,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "emails") {
			emails.forEach((email) => {
				data.push({
					type: "email",
					id: email.id,
					title: email.subject,
					subtitle: email.status || "draft",
					searchText: `${email.subject} ${email.status || ""}`,
					data: email,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "subscribers") {
			subscribers.forEach((subscriber) => {
				data.push({
					type: "subscriber",
					id: subscriber.id,
					title: subscriber.email,
					subtitle: subscriber.name || "",
					searchText: `${subscriber.email} ${subscriber.name || ""}`,
					data: subscriber,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "users") {
			users.forEach((u) => {
				const id = u.id || u.uid || u.email || `${u.email || "user"}-${Math.random()}`;
				const title = formatValue(u.email || u.name || u.displayName || "User");
				const subtitle = formatValue(u.role || u.plan || u.status || "");
				data.push({
					type: "user",
					id,
					title,
					subtitle,
					searchText: `${title} ${subtitle} ${formatValue(u.email || "")}`,
					data: u,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "customers") {
			customers.forEach((c) => {
				const id = c.id || c.customerId || c.email || `${c.email || "customer"}-${Math.random()}`;
				const title = formatValue(c.email || c.name || c.customer_email || "Customer");
				const subtitle = formatValue(c.plan || c.status || c.company || "");
				data.push({
					type: "customer",
					id,
					title,
					subtitle,
					searchText: `${title} ${subtitle}`,
					data: c,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "products") {
			products.forEach((p) => {
				const id = p.id || p.productId || p.slug || `${p.name || "product"}-${Math.random()}`;
				const title = formatValue(p.name || p.title || "Product");
				const subtitle = formatValue(p.status || p.type || p.slug || "");
				data.push({
					type: "product",
					id,
					title,
					subtitle,
					searchText: `${title} ${subtitle}`,
					data: p,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "payments") {
			payments.forEach((p) => {
				const id = p.id || p.paymentId || p.orderId || `${p.email || "payment"}-${Math.random()}`;
				const title = formatValue(p.customerEmail || p.email || p.customer_email || "Payment");
				const subtitle = formatValue(p.status || p.amount || p.currency || "");
				data.push({
					type: "payment",
					id,
					title,
					subtitle,
					searchText: `${title} ${subtitle}`,
					data: p,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "invoices") {
			invoices.forEach((inv) => {
				const id = inv.id || inv.invoiceId || inv.number || `${inv.customerEmail || "invoice"}-${Math.random()}`;
				const title = formatValue(
					inv.number ? `Invoice ${inv.number}` : inv.customerEmail || inv.email || "Invoice"
				);
				const subtitle = formatValue(inv.status || inv.total || "");
				data.push({
					type: "invoice",
					id,
					title,
					subtitle,
					searchText: `${title} ${subtitle} ${formatValue(inv.customerEmail || inv.email || "")}`,
					data: inv,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "messages") {
			messages.forEach((m) => {
				const id = m.id || m.messageId || `${m.email || "message"}-${Math.random()}`;
				const title = formatValue(m.subject || m.title || m.email || "Message");
				const subtitle = formatValue(m.status || m.createdAt || "");
				data.push({
					type: "message",
					id,
					title,
					subtitle,
					searchText: `${title} ${subtitle} ${formatValue(m.email || "")}`,
					data: m,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "forms") {
			forms.forEach((f) => {
				const id = f.id || f.slug || f.formId || `${f.name || "form"}-${Math.random()}`;
				const title = formatValue(f.name || f.title || f.slug || "Form");
				const subtitle = formatValue(f.status || "");
				data.push({
					type: "form",
					id,
					title,
					subtitle,
					searchText: `${title} ${subtitle}`,
					data: f,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "teams") {
			teams.forEach((t) => {
				const id = t.id || t.email || `${t.email || "team"}-${Math.random()}`;
				const title = formatValue(t.email || t.name || "Team Member");
				const subtitle = formatValue(t.role || "");
				data.push({
					type: "team",
					id,
					title,
					subtitle,
					searchText: `${title} ${subtitle}`,
					data: t,
				});
			});
		}

		if (selectedCategory === "all" || selectedCategory === "waitlist") {
			waitlist.forEach((w) => {
				const id = w.id || w.email || `${w.email || "waitlist"}-${Math.random()}`;
				const title = formatValue(w.email || w.name || "Waitlist");
				const subtitle = formatValue(w.status || "");
				data.push({
					type: "waitlist",
					id,
					title,
					subtitle,
					searchText: `${title} ${subtitle}`,
					data: w,
				});
			});
		}

		return data;
	}, [
		blogs,
		emails,
		subscribers,
		users,
		customers,
		products,
		payments,
		invoices,
		messages,
		forms,
		teams,
		waitlist,
		selectedCategory,
	]);

	// Configure Fuse.js
	const fuse = useMemo(() => {
		return new Fuse(searchData, {
			keys: ["title", "subtitle", "searchText"],
			threshold: 0.3,
			includeScore: true,
		});
	}, [searchData]);

	// Perform search
	const searchResults = useMemo(() => {
		if (!searchQuery.trim()) {
			return [];
		}
		return fuse.search(searchQuery).map((result) => result.item);
	}, [searchQuery, fuse]);

	// Reset search when modal closes
	useEffect(() => {
		if (!isOpen) {
			setSearchQuery("");
			setSelectedCategory("all");
		}
	}, [isOpen]);

	// Handle keyboard shortcuts
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e) => {
			if (e.key === "Escape") {
				onClose();
			}
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Handle result click
	const handleResultClick = (result) => {
		if (result.type === "blog") {
			onNavigate("blogs");
			window.location.href = `/admin/editor/blog?id=${result.id}`;
		} else if (result.type === "email") {
			onNavigate("emails");
			window.location.href = `/admin/editor/email?id=${result.id}`;
		} else if (result.type === "subscriber") {
			onNavigate("subscribers");
		} else if (result.type === "user") {
			onNavigate("users");
		} else if (result.type === "customer") {
			onNavigate("customers");
		} else if (result.type === "product") {
			onNavigate("products");
		} else if (result.type === "payment") {
			onNavigate("payments");
		} else if (result.type === "invoice") {
			onNavigate("invoices");
		} else if (result.type === "message") {
			onNavigate("messages");
		} else if (result.type === "form") {
			onNavigate("forms");
		} else if (result.type === "team") {
			onNavigate("teams");
		} else if (result.type === "waitlist") {
			onNavigate("waitlist");
		}
		onClose();
	};

	// Guidance actions
	const guidanceActions = [
		{
			icon: FileText,
			label: "Create New Blog",
			action: () => {
				onNavigate("blogs");
				window.location.href = "/admin/editor/blog";
				onClose();
			},
		},
		{
			icon: Mail,
			label: "Create New Email",
			action: () => {
				onNavigate("emails");
				window.location.href = "/admin/editor/email";
				onClose();
			},
		},
		{
			icon: Shield,
			label: "Add Team Member",
			action: () => {
				onNavigate("teams");
				onClose();
			},
		},
		{
			icon: Users,
			label: "Check Subscribers",
			action: () => {
				onNavigate("subscribers");
				onClose();
			},
		},
		{
			icon: Mail,
			label: "Send Email to Subscriber",
			action: () => {
				onNavigate("subscribers");
				onClose();
			},
		},
		{
			icon: Receipt,
			label: "Create New Invoice",
			action: () => {
				onNavigate("invoices");
				onClose();
			},
		},
		{
			icon: LayoutGrid,
			label: "Open Kanban Board",
			action: () => {
				onNavigate("kanban-board");
				onClose();
			},
		},
		{
			icon: Receipt,
			label: "View Invoices",
			action: () => {
				onNavigate("invoices");
				onClose();
			},
		},
		{
			icon: UsersRound,
			label: "Manage Waitlist",
			action: () => {
				onNavigate("waitlist");
				onClose();
			},
		},
		{
			icon: AlertCircle,
			label: "Report Issues",
			action: () => {
				onNavigate("reportIssues");
				onClose();
			},
		},
	];

	const getTypeIcon = (type) => {
		switch (type) {
			case "blog":
				return FileText;
			case "email":
				return Mail;
			case "subscriber":
				return Users;
			case "user":
				return Users;
			case "customer":
				return Building2;
			case "product":
				return ShoppingBag;
			case "payment":
				return CreditCard;
			case "invoice":
				return Receipt;
			case "message":
				return MessageSquare;
			case "form":
				return FileEdit;
			case "team":
				return Shield;
			case "waitlist":
				return UsersRound;
			default:
				return FileText;
		}
	};

	const getTypeColor = (type) => {
		switch (type) {
			case "blog":
				return "bg-zinc-100 text-zinc-800";
			case "email":
				return "bg-purple-100 text-purple-800";
			case "subscriber":
				return "bg-green-100 text-green-800";
			case "user":
				return "bg-blue-100 text-blue-800";
			case "customer":
				return "bg-amber-100 text-amber-800";
			case "product":
				return "bg-indigo-100 text-indigo-800";
			case "payment":
				return "bg-emerald-100 text-emerald-800";
			case "invoice":
				return "bg-zinc-100 text-zinc-800";
			case "message":
				return "bg-pink-100 text-pink-800";
			case "form":
				return "bg-violet-100 text-violet-800";
			case "team":
				return "bg-zinc-100 text-zinc-800";
			case "waitlist":
				return "bg-teal-100 text-teal-800";
			default:
				return "bg-zinc-100 text-zinc-800";
		}
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className="fixed inset-0 bg-black bg-opacity-50 z-50"
					/>

					{/* Modal */}
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col pointer-events-auto"
						>
							{/* Header */}
							<div className="p-4">
								<div className="flex items-center gap-3 mb-3">
									<div className="flex-1 relative">
										<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
										<input
											type="text"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											placeholder="Search blogs, emails, subscribers, users, customers, products, payments, invoices..."
											className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-200 focus:outline-none text-sm"
											autoFocus
										/>
									</div>
									<button
										onClick={onClose}
										className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors rounded-xl hover:bg-zinc-100"
									>
										<X className="w-5 h-5" />
									</button>
								</div>
							</div>

							{/* Content */}
							<div className="flex-1 overflow-y-auto p-4">
								{/* Search Results */}
								{searchQuery.trim() && (
									<div className="mb-6">
										{searchResults.length === 0 ? (
											<div className="text-center py-8 text-zinc-500 text-sm">
												No results found for "{searchQuery}"
											</div>
										) : (
											<div className="space-y-1">
												{searchResults.map((result) => {
													const Icon = getTypeIcon(result.type);
													return (
														<motion.button
															key={`${result.type}-${result.id}`}
															whileHover={{ scale: 1.01 }}
															whileTap={{ scale: 0.99 }}
															onClick={() => handleResultClick(result)}
															className="w-full p-2 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors text-left flex items-center gap-3"
														>
															<div
																className={`p-2 rounded-xl ${getTypeColor(
																	result.type
																)}`}
															>
																<Icon className="w-4 h-4" />
															</div>
															<div className="flex-1 min-w-0">
																<div className="font-medium text-zinc-900 truncate">
																	{result.title}
																</div>
																{result.subtitle && (
																	<div className="text-xs text-zinc-500 truncate">
																		{result.subtitle}
																	</div>
																)}
															</div>
															<div className="flex items-center gap-2">
																<span
																	className={`px-2 py-0.5 text-xs font-medium rounded ${getTypeColor(
																		result.type
																	)}`}
																>
																	{result.type}
																</span>
																<ArrowRight className="w-4 h-4 text-zinc-400" />
															</div>
														</motion.button>
													);
												})}
											</div>
										)}
									</div>
								)}

								{/* Guidance Section */}
								<div>
									<div className="flex items-center gap-2 mb-3">
										<Sparkles className="w-4 h-4 text-zinc-400" />
										<h3 className="text-sm font-semibold text-zinc-700">
											Quick Actions
										</h3>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
										{guidanceActions.map((action, index) => {
											const Icon = action.icon;
											return (
												<motion.button
													key={index}
													whileHover={{ scale: 1.02 }}
													whileTap={{ scale: 0.98 }}
													onClick={action.action}
													className="py-1 px-2 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors text-left flex items-center gap-3"
												>
													<div className="py-1 px-2 rounded-xl bg-zinc-100 text-zinc-700">
														<Icon className="w-4 h-4" />
													</div>
													<span className="text-sm font-medium text-zinc-900">
														{action.label}
													</span>
													<ArrowRight className="w-4 h-4 text-zinc-400 ml-auto" />
												</motion.button>
											);
										})}
									</div>
								</div>
							</div>

							{/* Footer */}
							<div className="p-4 border-t border-zinc-200 bg-zinc-50">
								<div className="flex items-center justify-between text-xs text-zinc-500">
									<div className="flex items-center gap-4">
										<span>Press Esc to close</span>
									</div>
									<span>
										{searchQuery.trim()
											? `${searchResults.length} result${
													searchResults.length !== 1 ? "s" : ""
												}`
											: `${searchData.length} total items`}
									</span>
								</div>
							</div>
						</motion.div>
					</div>
				</>
			)}
		</AnimatePresence>
	);
};

export default SearchModal;
