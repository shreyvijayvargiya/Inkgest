import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
	FileText,
	Mail,
	Users,
	TrendingUp,
	DollarSign,
	Receipt,
	MessageSquare,
	Building2,
	ArrowRight,
	CheckCircle2,
	Activity,
	Zap,
	Settings,
	BookOpen,
	ExternalLink,
} from "lucide-react";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Legend,
} from "recharts";
import { getAllBlogs } from "../../../lib/api/blog";
import { getAllEmails } from "../../../lib/api/emails";
import { getAllCustomers } from "../../../lib/api/customers";
import { getAllPayments } from "../../../lib/api/payments";
import { getAllInvoices } from "../../../lib/api/invoice";
import { getAllMessages } from "../../../lib/api/messages";
import { getAllSubscribers } from "../../../lib/api/subscribers";
import { getAllUsers } from "../../../lib/api/users";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";

const HomeTab = ({ onNavigate }) => {
	const [activeTab, setActiveTab] = useState("overview");
	const [isQuickActionsDropdownOpen, setIsQuickActionsDropdownOpen] =
		useState(false);

	// Fetch all data
	const { data: blogs = [], isLoading: blogsLoading } = useQuery({
		queryKey: ["blogs"],
		queryFn: () => getAllBlogs(),
	});

	const { data: emails = [], isLoading: emailsLoading } = useQuery({
		queryKey: ["emails"],
		queryFn: () => getAllEmails(),
	});

	const { data: customers = [], isLoading: customersLoading } = useQuery({
		queryKey: ["customers"],
		queryFn: () => getAllCustomers(),
	});

	const { data: payments = [], isLoading: paymentsLoading } = useQuery({
		queryKey: ["payments"],
		queryFn: () => getAllPayments(),
	});

	const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
		queryKey: ["invoices"],
		queryFn: () => getAllInvoices(),
	});

	const { data: messages = [], isLoading: messagesLoading } = useQuery({
		queryKey: ["messages"],
		queryFn: () => getAllMessages(),
	});

	const { data: subscribers = [], isLoading: subscribersLoading } = useQuery({
		queryKey: ["subscribers"],
		queryFn: () => getAllSubscribers(),
	});

	const { data: users = [], isLoading: usersLoading } = useQuery({
		queryKey: ["users"],
		queryFn: () => getAllUsers(),
	});

	// Calculate statistics
	const formatCurrency = (amount, currency = "usd") => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency.toUpperCase(),
		}).format(amount / 100);
	};

	const contentStats = {
		blogs: {
			total: blogs.length,
			published: blogs.filter((b) => b.status === "published").length,
			draft: blogs.filter((b) => b.status === "draft").length,
		},
		emails: {
			total: emails.length,
			published: emails.filter((e) => e.status === "published").length,
			draft: emails.filter((e) => e.status === "draft").length,
		},
	};

	const audienceStats = {
		subscribers: subscribers.filter((s) => s.status === "active").length,
		users: users.length,
		customers: customers.filter((c) => c.status === "active").length,
	};

	const financialStats = {
		totalRevenue: payments
			.filter((p) => p.status === "succeeded")
			.reduce((sum, p) => sum + (p.amount || 0), 0),
		totalPayments: payments.filter((p) => p.status === "succeeded").length,
		totalInvoices: invoices.length,
		paidInvoices: invoices.filter((i) => i.status === "paid").length,
		unpaidInvoices: invoices.filter((i) => i.status === "unpaid").length,
		unpaidAmount: invoices
			.filter((i) => i.status === "unpaid")
			.reduce((sum, i) => sum + (i.total || 0), 0),
		invoiceRevenue: invoices
			.filter((i) => i.status === "paid")
			.reduce((sum, i) => sum + (i.total || 0), 0),
	};

	// Key metrics calculations
	const metrics = [
		{
			title: "Total Revenue",
			value: formatCurrency(financialStats.totalRevenue),
			subtitle: `${financialStats.totalPayments} successful payments`,
			icon: DollarSign,
			color: "from-blue-600 to-indigo-600",
			tab: "payments"
		},
		{
			title: "Active Customers",
			value: audienceStats.customers,
			subtitle: "Joined your platform",
			icon: Building2,
			color: "from-emerald-500 to-teal-600",
			tab: "customers"
		},
		{
			title: "Blog Posts",
			value: contentStats.blogs.published,
			subtitle: `${contentStats.blogs.total} total posts`,
			icon: FileText,
			color: "from-amber-400 to-orange-500",
			tab: "blogs"
		},
		{
			title: "Subscribers",
			value: audienceStats.subscribers,
			subtitle: "Email audience",
			icon: Users,
			color: "from-violet-500 to-purple-600",
			tab: "subscribers"
		}
	];

	const communicationStats = {
		totalMessages: messages.length,
		unreadMessages: messages.filter((m) => !m.read).length,
		unrepliedMessages: messages.filter((m) => !m.replied).length,
	};

	// Recent activity
	const recentInvoices = invoices.slice(0, 5);
	const recentMessages = messages.filter((m) => !m.read).slice(0, 5);

	const formatDate = (date) => {
		if (!date) return "";
		const d = date?.toDate ? date.toDate() : new Date(date);
		if (isNaN(d.getTime())) return "";
		const now = new Date();
		const diffTime = Math.abs(now - d);
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) return "Today";
		if (diffDays === 1) return "Yesterday";
		if (diffDays < 7) return `${diffDays} days ago`;
		return d.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	};

	// Content creation over time (last 7 days)
	const getContentOverTime = () => {
		const days = [];
		for (let i = 6; i >= 0; i--) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			date.setHours(0, 0, 0, 0);
			const dateStr = date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});

			const blogCount = blogs.filter((blog) => {
				if (!blog.createdAt) return false;
				const blogDate = blog.createdAt?.toDate
					? blog.createdAt.toDate()
					: new Date(blog.createdAt);
				blogDate.setHours(0, 0, 0, 0);
				return blogDate.getTime() === date.getTime();
			}).length;

			const emailCount = emails.filter((email) => {
				if (!email.createdAt) return false;
				const emailDate = email.createdAt?.toDate
					? email.createdAt.toDate()
					: new Date(email.createdAt);
				emailDate.setHours(0, 0, 0, 0);
				return emailDate.getTime() === date.getTime();
			}).length;

			days.push({ date: dateStr, blogs: blogCount, emails: emailCount });
		}
		return days;
	};

	const timeSeriesData = getContentOverTime();

	// Priority alerts
	const priorityAlerts = [
		...(communicationStats.unreadMessages > 0
			? [
				{
					type: "message",
					count: communicationStats.unreadMessages,
					label: "unread message",
					action: () => onNavigate?.("admin/messages"),
					color: "bg-zinc-50 border-zinc-300 text-zinc-900",
					icon: MessageSquare,
				},
			]
			: []),
		...(financialStats.unpaidInvoices > 0
			? [
				{
					type: "invoice",
					count: financialStats.unpaidInvoices,
					label: "unpaid invoice",
					action: () => onNavigate?.("admin/invoices"),
					color: "bg-zinc-50 border-zinc-300 text-zinc-900",
					icon: Receipt,
				},
			]
			: []),
	];

	// Quick actions for dropdown
	const quickActionsOptions = [
		{
			value: "blog",
			label: "New Blog Post",
		},
		{
			value: "email",
			label: "New Email",
		},
		{
			value: "invoice",
			label: "Create Invoice",
		},
	];

	const handleQuickActionSelect = (value) => {
		setIsQuickActionsDropdownOpen(false);
		switch (value) {
			case "blog":
				onNavigate?.("blogs");
				break;
			case "email":
				onNavigate?.("emails");
				break;
			case "invoice":
				onNavigate?.("invoices");
				break;
			default:
				break;
		}
	};

	const tabs = [
		{ id: "overview", label: "Overview", icon: Activity },
		{ id: "content", label: "Content", icon: FileText },
		{ id: "communication", label: "Messages", icon: MessageSquare },
	];

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-zinc-200 px-4 pb-2">
				<div>
					<h1 className="text-lg text-zinc-900 text-shadow-sm">Dashboard</h1>
					<p className="text-sm text-zinc-500 font-medium mt-1">
						Welcome back! Here's what's happening with your business.
					</p>
				</div>
				<div className="flex items-center gap-4">
					{/* Priority Alerts */}
					{priorityAlerts.length > 0 && (
						<div className="flex gap-3">
							{priorityAlerts.map((alert, index) => {
								const Icon = alert.icon;
								return (
									<motion.div
										key={index}
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: index * 0.1 }}
										onClick={alert.action}
										className={`group flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-zinc-200 cursor-pointer transition-all hover:bg-zinc-50 hover:shadow-md hover:-translate-y-0.5 ${alert.color}`}
									>
										<div className="p-1.5 rounded-xl bg-white/80 shadow-sm transition-transform group-hover:scale-110">
											<Icon className="w-4 h-4 text-zinc-900" />
										</div>
										<div>
											<p className="text-xs font-bold text-zinc-900 leading-none">
												{alert.count} {alert.label}{alert.count > 1 ? "s" : ""}
											</p>
											<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1 group-hover:text-zinc-600 transition-colors">Attention Required</p>
										</div>
										<ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
									</motion.div>
								);
							})}
						</div>
					)}
					<div className="h-10 w-px bg-zinc-100 mx-2" />
					<div className="flex flex-col items-end">
						<div className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
							<div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
							Live System Status
						</div>
						<div className="flex items-center gap-2 text-sm font-bold text-zinc-900 mt-1">
							<Activity className="w-4 h-4 text-zinc-400" />
							<span>Updated Just now</span>
						</div>
					</div>
				</div>
			</div>

			{/* Key Metrics */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
				{metrics.map((metric, index) => (
					<motion.div
						key={index}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1 }}
						onClick={() => onNavigate?.(metric.tab)}
						className="relative group p-6 rounded-3xl overflow-hidden bg-white border border-zinc-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
					>
						{/* Background Glow */}
						<div className={`absolute -right-4 -top-4 w-24 h-24 bg-gradient-to-br ${metric.color} opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-500`} />

						<div className="relative flex items-center justify-between mb-4">
							<div className={`p-3 rounded-2xl bg-gradient-to-br ${metric.color} shadow-lg shadow-indigo-500/10`}>
								<metric.icon className="w-6 h-6 text-white" />
							</div>
							<div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-50 rounded-full border border-zinc-100">
								<TrendingUp className="w-3 h-3 text-emerald-500" />
								<span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">+12%</span>
							</div>
						</div>

						<div className="relative">
							<p className="text-3xl font-black text-zinc-900 tracking-tight mb-1">
								{metric.value}
							</p>
							<div className="flex items-center justify-between">
								<p className="text-xs font-medium text-zinc-500 uppercase tracking-widest">{metric.title}</p>
								<p className="text-[10px] font-medium text-zinc-400">{metric.subtitle}</p>
							</div>
						</div>
					</motion.div>
				))}
			</div>

			{/* Quick Actions & Help */}
			<div className="flex items-center justify-between gap-4 flex-wrap px-4">
				<div className="flex items-center gap-3">
					<Zap className="w-5 h-5 text-zinc-600" />
					<div className="w-64">
						<AnimatedDropdown
							isOpen={isQuickActionsDropdownOpen}
							onToggle={() =>
								setIsQuickActionsDropdownOpen(!isQuickActionsDropdownOpen)
							}
							onSelect={handleQuickActionSelect}
							options={quickActionsOptions}
							value=""
							placeholder="Quick Actions..."
							buttonClassName="text-sm"
						/>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<a
						href="/docs"
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-zinc-200 rounded-xl hover:bg-zinc-100 transition-colors text-zinc-700"
					>
						<BookOpen className="w-4 h-4" />
						View Docs
						<ExternalLink className="w-3 h-3" />
					</a>
					<button
						onClick={() => onNavigate?.("teams")}
						className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
					>
						<Settings className="w-4 h-4" />
						Settings
					</button>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-8 px-4">
				<div className="flex-1 min-w-0 space-y-6">
					{/* Tabs */}
					<div className="border-b border-zinc-200">
						<div className="flex gap-1 overflow-x-auto no-scrollbar">
							{tabs.map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === tab.id
											? "border-zinc-900 text-zinc-900"
											: "border-transparent text-zinc-600 hover:text-zinc-900"
											}`}
									>
										<Icon className="w-4 h-4" />
										{tab.label}
									</button>
								);
							})}
						</div>
					</div>

					{/* Tab Content */}
					<div className="space-y-6">
						{/* Overview Tab */}
						{activeTab === "overview" && (
							<div className="space-y-6">
								{/* Content Activity Chart */}
								<div className="p-5 rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
									<div className="flex items-center justify-between mb-6">
										<h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
											<Activity className="w-4 h-4 text-zinc-600" />
											Content Activity
										</h3>
										<div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
											<div className="flex items-center gap-1.5">
												<div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
												Blogs
											</div>
											<div className="flex items-center gap-1.5">
												<div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
												Emails
											</div>
										</div>
									</div>
									{blogsLoading || emailsLoading ? (
										<div className="h-64 flex items-center justify-center text-zinc-500">
											<div className="flex flex-col items-center gap-3">
												<div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
												<span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Syncing Data...</span>
											</div>
										</div>
									) : (
										<ResponsiveContainer width="100%" height={300}>
											<AreaChart data={timeSeriesData}>
												<defs>
													<linearGradient id="colorBlogs" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
														<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
													</linearGradient>
													<linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#a855f7" stopOpacity={0.1} />
														<stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
													</linearGradient>
												</defs>
												<CartesianGrid
													strokeDasharray="3 3"
													vertical={false}
													stroke="#f3f4f6"
												/>
												<XAxis
													dataKey="date"
													axisLine={false}
													tickLine={false}
													tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }}
													dy={10}
												/>
												<YAxis
													axisLine={false}
													tickLine={false}
													tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 700 }}
												/>
												<Tooltip
													contentStyle={{
														borderRadius: "16px",
														border: "1px solid #e5e7eb",
														boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
														fontSize: "12px",
														fontWeight: "600",
													}}
												/>
												<Area
													type="monotone"
													dataKey="blogs"
													stroke="#3b82f6"
													strokeWidth={3}
													fillOpacity={1}
													fill="url(#colorBlogs)"
													name="Blogs"
												/>
												<Area
													type="monotone"
													dataKey="emails"
													stroke="#a855f7"
													strokeWidth={3}
													fillOpacity={1}
													fill="url(#colorEmails)"
													name="Emails"
												/>
											</AreaChart>
										</ResponsiveContainer>
									)}
								</div>
							</div>
						)}

						{/* Content Tab */}
						{activeTab === "content" && (
							<div className="space-y-6">
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div className="p-6 rounded-3xl border border-zinc-200 bg-white shadow-sm">
										<div className="flex items-center justify-between mb-6">
											<div className="p-2.5 rounded-2xl bg-blue-50">
												<FileText className="w-5 h-5 text-blue-600" />
											</div>
											<button
												onClick={() => onNavigate?.("blogs")}
												className="p-2 text-zinc-400 hover:text-zinc-600 transition-all"
											>
												<ArrowRight className="w-4 h-4" />
											</button>
										</div>
										<h4 className="text-sm font-bold text-zinc-900 mb-1">Blog Content</h4>
										<p className="text-xs text-zinc-500 mb-6">Manage your articles and posts</p>
										<div className="grid grid-cols-3 gap-2">
											<div className="p-3 rounded-2xl bg-zinc-50 text-center">
												<p className="text-lg font-black text-zinc-900">{contentStats.blogs.total}</p>
												<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total</p>
											</div>
											<div className="p-3 rounded-2xl bg-zinc-50 text-center border border-zinc-100">
												<p className="text-lg font-black text-emerald-600">{contentStats.blogs.published}</p>
												<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Live</p>
											</div>
											<div className="p-3 rounded-2xl bg-zinc-50 text-center">
												<p className="text-lg font-black text-zinc-400">{contentStats.blogs.draft}</p>
												<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Draft</p>
											</div>
										</div>
									</div>

									<div className="p-6 rounded-3xl border border-zinc-200 bg-white shadow-sm">
										<div className="flex items-center justify-between mb-6">
											<div className="p-2.5 rounded-2xl bg-purple-50">
												<Mail className="w-5 h-5 text-purple-600" />
											</div>
											<button
												onClick={() => onNavigate?.("emails")}
												className="p-2 text-zinc-400 hover:text-zinc-600 transition-all"
											>
												<ArrowRight className="w-4 h-4" />
											</button>
										</div>
										<h4 className="text-sm font-bold text-zinc-900 mb-1">Email Campaigns</h4>
										<p className="text-xs text-zinc-500 mb-6">Monitor your email outreach</p>
										<div className="grid grid-cols-3 gap-2">
											<div className="p-3 rounded-2xl bg-zinc-50 text-center">
												<p className="text-lg font-black text-zinc-900">{contentStats.emails.total}</p>
												<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total</p>
											</div>
											<div className="p-3 rounded-2xl bg-zinc-50 text-center border border-zinc-100">
												<p className="text-lg font-black text-emerald-600">{contentStats.emails.published}</p>
												<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sent</p>
											</div>
											<div className="p-3 rounded-2xl bg-zinc-50 text-center">
												<p className="text-lg font-black text-zinc-400">{contentStats.emails.draft}</p>
												<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Draft</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Communication Tab */}
						{activeTab === "communication" && (
							<div className="space-y-6">
								<div className="p-6 rounded-3xl border border-zinc-200 bg-white shadow-sm">
									<div className="flex items-center justify-between mb-6">
										<div className="flex items-center gap-3">
											<div className="p-2.5 rounded-2xl bg-zinc-900">
												<MessageSquare className="w-5 h-5 text-white" />
											</div>
											<div>
												<h4 className="text-sm font-bold text-zinc-900">Inbox activity</h4>
												<p className="text-xs text-zinc-500">Respond to customer inquiries</p>
											</div>
										</div>
										<button
											onClick={() => onNavigate?.("messages")}
											className="px-4 py-2 text-[10px] font-bold bg-zinc-50 hover:bg-zinc-100 text-zinc-900 rounded-xl transition-all border border-zinc-200 uppercase tracking-widest"
										>
											Open Inbox
										</button>
									</div>
									{messagesLoading ? (
										<div className="text-center py-20">
											<div className="inline-block w-6 h-6 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mb-4" />
											<p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Checking Messages...</p>
										</div>
									) : recentMessages.length === 0 ? (
										<div className="text-center py-20 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
											<CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
											<p className="text-sm font-bold text-zinc-900">All caught up!</p>
											<p className="text-xs text-zinc-400 mt-1">Consistency is key. Keep up the great work.</p>
										</div>
									) : (
										<div className="space-y-3">
											{recentMessages.map((message) => (
												<div
													key={message.id}
													className="p-4 rounded-2xl border border-zinc-100 bg-white hover:border-zinc-300 transition-all cursor-pointer group shadow-sm hover:shadow-md"
													onClick={() => onNavigate?.("messages")}
												>
													<div className="flex items-start justify-between">
														<div className="flex-1">
															<p className="text-sm font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors">
																{message.name || "Anonymous"}
															</p>
															<p className="text-xs text-zinc-500 mt-1 line-clamp-1 font-medium">
																{message.subject || message.message}
															</p>
															<p className="text-[10px] text-zinc-400 mt-2 font-bold uppercase tracking-widest group-hover:text-zinc-600">
																{formatDate(message.createdAt)}
															</p>
														</div>
														<div className="w-2 h-2 bg-zinc-900 rounded-full mt-1.5 shadow-sm shadow-zinc-900/20" />
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="w-full lg:w-[400px] flex-shrink-0">
					{/* Users Table Section */}
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-base font-bold text-zinc-900">Recent Users</h3>
								<p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Community update</p>
							</div>
							<button
								onClick={() => onNavigate?.("users")}
								className="p-2 text-zinc-400 hover:text-zinc-900 transition-all"
							>
								<ArrowRight className="w-5 h-5" />
							</button>
						</div>

						<div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
							{usersLoading ? (
								<div className="p-20 text-center">
									<div className="inline-block w-8 h-8 border-4 border-zinc-100 border-t-zinc-900 rounded-full animate-spin" />
								</div>
							) : (
								<div className="divide-y divide-zinc-50">
									{users.slice(0, 6).map((u, i) => (
										<div key={u.id || i} className="p-4 hover:bg-zinc-50 transition-all group flex items-center justify-between">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold border border-zinc-200 group-hover:bg-white transition-colors">
													{u.email?.substring(0, 1).toUpperCase() || "U"}
												</div>
												<div className="flex flex-col">
													<span className="text-sm font-bold text-zinc-900 group-hover:text-blue-600 transition-colors">
														{u.username || "Anonymous"}
													</span>
													<span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${u.role === "admin" ? "text-zinc-900" : "text-zinc-400"
														}`}>
														{u.role || "user"}
													</span>
												</div>
											</div>
											<div className="flex flex-col items-end">
												<span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
													{formatDate(u.createdAt)}
												</span>
												<button
													onClick={() => onNavigate?.("users")}
													className="mt-1 text-zinc-300 hover:text-zinc-900 transition-all opacity-0 group-hover:opacity-100"
												>
													<ExternalLink className="w-3.5 h-3.5" />
												</button>
											</div>
										</div>
									))}
									<button
										onClick={() => onNavigate?.("users")}
										className="w-full p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-colors bg-zinc-50/50"
									>
										Show all registration data
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

		</div>
	);
};

export default HomeTab;
