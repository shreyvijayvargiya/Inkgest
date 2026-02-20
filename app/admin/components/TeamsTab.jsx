import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
	Plus,
	Trash2,
	Edit2,
	Eye,
	Search,
	ArrowUpDown,
	ArrowUp,
	ArrowDown,
	X,
	Save,
} from "lucide-react";
import TableSkeleton from "../../../lib/ui/TableSkeleton";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
	TableEmpty,
} from "../../../lib/ui/Table";
import {
	getAllTeamMembers,
	addTeamMember,
	updateTeamMember,
	deleteTeamMember,
} from "../../../lib/api/teams";
import {
	hasPermission,
	getAllowedActions,
} from "../../../lib/config/roles-config";
import { getCachedUserRole, getUserRole } from "../../../lib/utils/getUserRole";
import { getCurrentUserEmail } from "../../../lib/utils/getCurrentUserEmail";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import ConfirmationModal from "../../../lib/ui/ConfirmationModal";
import { toast } from "react-toastify";
import { ROLE_LABELS } from "../../../lib/config/roles-config";

const TeamsTab = ({ queryClient }) => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState(null); // 'email', 'username', 'role', 'createdAt'
	const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'
	const [showTeamModal, setShowTeamModal] = useState(false);
	const [editingTeam, setEditingTeam] = useState(null);
	const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
	const [teamForm, setTeamForm] = useState({
		email: "",
		username: "",
		role: "viewer",
	});

	// Modal states
	const [showConfirmModal, setShowConfirmModal] = useState(false);
	const [confirmAction, setConfirmAction] = useState(null);

	// Fetch user role with React Query
	const fetchUserRole = async () => {
		try {
			// Get current user email (from Firebase Auth or localStorage fallback)
			const userEmail = await getCurrentUserEmail();

			console.log("TeamsTab: Current user email:", userEmail);

			if (userEmail) {
				// Fetch role from Firestore teams collection using email
				// Force refresh to ensure we get the latest role
				const role = await getUserRole(userEmail, true);
				console.log("TeamsTab: Fetched role from teams collection:", role);

				// Check if user exists in teams collection
				const teamMembers = await getAllTeamMembers();
				const currentUserInTeams = teamMembers.find(
					(member) =>
						member.email?.toLowerCase().trim() ===
						userEmail.toLowerCase().trim()
				);

				if (!currentUserInTeams) {
					console.warn(
						"TeamsTab: User not found in teams collection. They may need to be added first."
					);
					// If user is not in teams collection, they can't manage teams
					// But we'll still return the role (which will be "viewer" by default)
				}

				return role;
			} else {
				console.warn("TeamsTab: No user email found, using cached role");
				// Fallback to cached role
				return getCachedUserRole();
			}
		} catch (error) {
			console.error("Error fetching user role:", error);
			// Fallback to cached role
			return getCachedUserRole();
		}
	};

	const { data: userRole = "viewer", isLoading: isLoadingRole } = useQuery({
		queryKey: ["userRole"],
		queryFn: fetchUserRole,
		staleTime: 5 * 60 * 1000, // 5 minutes
		cacheTime: 10 * 60 * 1000, // 10 minutes
	});

	// Debug: Log role and permissions
	React.useEffect(() => {
		console.log("TeamsTab: Current userRole:", userRole);
		console.log(
			"TeamsTab: Has create permission:",
			hasPermission(userRole, "teams", "create")
		);
		console.log(
			"TeamsTab: Has edit permission:",
			hasPermission(userRole, "teams", "edit")
		);
		console.log(
			"TeamsTab: Has delete permission:",
			hasPermission(userRole, "teams", "delete")
		);
		console.log(
			"TeamsTab: Allowed actions:",
			getAllowedActions(userRole, "teams")
		);
	}, [userRole]);

	// Get allowed actions for teams
	const allowedActions = getAllowedActions(userRole, "teams");

	// Fetch team members with React Query
	const {
		data: teamMembers = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["teamMembers"],
		queryFn: () => getAllTeamMembers(),
	});

	// Check if current user exists in teams collection
	const [currentUserEmail, setCurrentUserEmail] = useState(null);
	const [currentUserInTeams, setCurrentUserInTeams] = useState(false);

	useEffect(() => {
		const checkUserInTeams = async () => {
			try {
				const email = await getCurrentUserEmail();
				setCurrentUserEmail(email);
				if (email && teamMembers.length > 0) {
					const found = teamMembers.find(
						(member) =>
							member.email?.toLowerCase().trim() === email.toLowerCase().trim()
					);
					setCurrentUserInTeams(!!found);
				}
			} catch (error) {
				console.error("Error checking user in teams:", error);
			}
		};
		if (teamMembers.length > 0) {
			checkUserInTeams();
		}
	}, [teamMembers]);

	// If user is not in teams collection and there are no team members, allow them to add themselves
	const canAddSelf = !currentUserInTeams && teamMembers.length === 0;
	const effectiveUserRole = canAddSelf ? "admin" : userRole; // Temporary admin access for first user

	// Filter team members by search query
	const filteredTeamMembers = teamMembers.filter((member) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			member.email?.toLowerCase().includes(searchLower) ||
			member.username?.toLowerCase().includes(searchLower) ||
			member.role?.toLowerCase().includes(searchLower)
		);
	});

	// Sort team members
	const sortedTeamMembers = [...filteredTeamMembers].sort((a, b) => {
		if (!sortField) return 0;

		// Handle date comparison separately
		if (sortField === "createdAt") {
			const dateA = a.createdAt?.toDate
				? a.createdAt.toDate()
				: new Date(a.createdAt || 0);
			const dateB = b.createdAt?.toDate
				? b.createdAt.toDate()
				: new Date(b.createdAt || 0);
			return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
		}

		// Handle string comparison for other fields
		let aValue, bValue;

		switch (sortField) {
			case "email":
				aValue = (a.email || "").toLowerCase();
				bValue = (b.email || "").toLowerCase();
				break;
			case "username":
				aValue = (a.username || "").toLowerCase();
				bValue = (b.username || "").toLowerCase();
				break;
			case "role":
				aValue = (a.role || "").toLowerCase();
				bValue = (b.role || "").toLowerCase();
				break;
			default:
				return 0;
		}

		// String comparison
		if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
		if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
		return 0;
	});

	// Handle column sort
	const handleSort = (field) => {
		if (sortField === field) {
			// Toggle direction if clicking same field
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			// Set new field and default to ascending
			setSortField(field);
			setSortDirection("asc");
		}
	};

	// Get sort icon for column header
	const getSortIcon = (field) => {
		if (sortField !== field) {
			return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-zinc-400" />;
		}
		return sortDirection === "asc" ? (
			<ArrowUp className="w-3.5 h-3.5 ml-1 text-zinc-900" />
		) : (
			<ArrowDown className="w-3.5 h-3.5 ml-1 text-zinc-900" />
		);
	};

	// Create team member mutation
	const createTeamMemberMutation = useMutation({
		mutationFn: addTeamMember,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
			handleCloseModal();
			toast.success("Team member added successfully!");
		},
		onError: (error) => {
			console.error("Error adding team member:", error);
			toast.error(
				error.message || "Failed to add team member. Please try again."
			);
		},
	});

	// Update team member mutation
	const updateTeamMemberMutation = useMutation({
		mutationFn: ({ id, data }) => updateTeamMember(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
			queryClient.invalidateQueries({ queryKey: ["userRole"] }); // Invalidate role cache
			handleCloseModal();
			toast.success("Team member updated successfully!");
		},
		onError: (error) => {
			console.error("Error updating team member:", error);
			toast.error(
				error.message || "Failed to update team member. Please try again."
			);
		},
	});

	// Delete team member mutation
	const deleteTeamMemberMutation = useMutation({
		mutationFn: deleteTeamMember,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
			toast.success("Team member deleted successfully!");
		},
		onError: (error) => {
			console.error("Error deleting team member:", error);
			toast.error(
				error.message || "Failed to delete team member. Please try again."
			);
		},
	});

	// Handle form input change
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setTeamForm((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	// Handle role select
	const handleRoleSelect = (role) => {
		setTeamForm((prev) => ({ ...prev, role }));
		setIsRoleDropdownOpen(false);
	};

	// Create or update team member
	const handleSaveTeamMember = async () => {
		if (!teamForm.email) {
			toast.warning("Email is required");
			return;
		}

		if (editingTeam) {
			updateTeamMemberMutation.mutate({
				id: editingTeam.id,
				data: teamForm,
			});
		} else {
			createTeamMemberMutation.mutate(teamForm);
		}
	};

	// Delete team member
	const handleDeleteTeamMember = async (id) => {
		setConfirmAction(() => () => deleteTeamMemberMutation.mutate(id));
		setShowConfirmModal(true);
	};

	// Edit team member
	const handleEditTeamMember = (member) => {
		setEditingTeam(member);
		setTeamForm({
			email: member.email || "",
			username: member.username || "",
			role: member.role || "viewer",
		});
		setShowTeamModal(true);
	};

	// View team member (read-only)
	const handleViewTeamMember = (member) => {
		setEditingTeam(member);
		setTeamForm({
			email: member.email || "",
			username: member.username || "",
			role: member.role || "viewer",
		});
		setShowTeamModal(true);
	};

	// Open create modal
	const handleCreateTeamMember = () => {
		setEditingTeam(null);
		setTeamForm({
			email: "",
			username: "",
			role: "viewer",
		});
		setShowTeamModal(true);
	};

	// Close modal
	const handleCloseModal = () => {
		setShowTeamModal(false);
		setEditingTeam(null);
		setTeamForm({
			email: "",
			username: "",
			role: "viewer",
		});
		setIsRoleDropdownOpen(false);
	};

	// Format date
	const formatDate = (dateString) => {
		if (!dateString) return "";
		const date = dateString?.toDate
			? dateString.toDate()
			: new Date(dateString);
		if (isNaN(date.getTime())) return "";
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// Role options for AnimatedDropdown
	const roleOptions = [
		{ value: "admin", label: "Admin", color: ROLE_LABELS.admin?.color },
		{ value: "editor", label: "Editor", color: ROLE_LABELS.editor?.color },
		{ value: "author", label: "Author", color: ROLE_LABELS.author?.color },
		{ value: "viewer", label: "Viewer", color: ROLE_LABELS.viewer?.color },
	];

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center mb-4 border-b border-zinc-200 px-4 pb-2">
				<div>
					<h2 className="text-lg text-zinc-900">Team Members</h2>
					<p className="text-sm text-zinc-600">
						Manage team members and their roles
						{/* Debug: Show current role */}
						{process.env.NODE_ENV === "development" && (
							<span className="ml-2 text-xs text-zinc-400">
								(Your role: {userRole}, Can create:{" "}
								{hasPermission(userRole, "teams", "create") ? "Yes" : "No"}, Can
								edit: {hasPermission(userRole, "teams", "edit") ? "Yes" : "No"})
							</span>
						)}
					</p>
				</div>
				{(hasPermission(effectiveUserRole, "teams", "create") ||
					canAddSelf) && (
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						onClick={handleCreateTeamMember}
						className="flex items-center gap-1.5 bg-zinc-900 text-white px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors text-sm"
					>
						<Plus className="w-3.5 h-3.5" />
						Add Team Member
					</motion.button>
				)}
			</div>

			{/* Warning if user not in teams */}
			{!currentUserInTeams && teamMembers.length > 0 && (
				<div className="mx-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
					<p className="text-sm text-yellow-800">
						⚠️ You are not in the teams collection. Please ask an admin to add
						you, or if you're the first user, you can add yourself below.
					</p>
				</div>
			)}

			{/* Search */}
			<div className="relative mx-4">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
				<input
					type="text"
					placeholder="Search team members by email, username, or role..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
				/>
			</div>

			<div className="overflow-x-auto px-4">
				{isLoading ? (
					<TableSkeleton rows={5} columns={5} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									sortable
									onClick={() => handleSort("email")}
									className="min-w-[200px]"
								>
									<div className="flex items-center gap-2">
										Email
										{getSortIcon("email")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("username")}
								>
									<div className="flex items-center gap-2">
										Username
										{getSortIcon("username")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("role")}
								>
									<div className="flex items-center gap-2">
										Role
										{getSortIcon("role")}
									</div>
								</TableHead>
								<TableHead
									sortable
									onClick={() => handleSort("createdAt")}
								>
									<div className="flex items-center gap-2">
										Created
										{getSortIcon("createdAt")}
									</div>
								</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{error ? (
								<TableEmpty
									colSpan={5}
									message="Error loading team members. Please try again."
								/>
							) : sortedTeamMembers.length === 0 ? (
								<TableEmpty
									colSpan={5}
									message={
										searchQuery
											? "No team members found matching your search."
											: "No team members found. Add your first team member!"
									}
								/>
							) : (
								sortedTeamMembers.map((member) => (
									<TableRow key={member.id}>
										<TableCell>
											<div className="font-medium text-zinc-900">
												{member.email}
											</div>
										</TableCell>
										<TableCell className="text-zinc-600">
											{member.username || ""}
										</TableCell>
										<TableCell>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													ROLE_LABELS[member.role]?.color ||
													"bg-zinc-100 text-zinc-800"
												}`}
											>
												{ROLE_LABELS[member.role]?.label || member.role}
											</span>
										</TableCell>
										<TableCell className="text-zinc-600">
											{formatDate(member.createdAt)}
										</TableCell>
										<TableCell>
										<div className="flex items-center gap-2">
											{(hasPermission(effectiveUserRole, "teams", "view") ||
												canAddSelf) && (
												<motion.button
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
													onClick={(e) => {
														e.stopPropagation();
														handleViewTeamMember(member);
													}}
													className="p-2 text-zinc-400 hover:text-blue-600 transition-colors"
													title="View"
												>
													<Eye className="w-4 h-4" />
												</motion.button>
											)}
											{(hasPermission(effectiveUserRole, "teams", "edit") ||
												canAddSelf) && (
												<motion.button
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
													onClick={(e) => {
														e.stopPropagation();
														handleEditTeamMember(member);
													}}
													className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
													title="Edit"
												>
													<Edit2 className="w-4 h-4" />
												</motion.button>
											)}
											{(hasPermission(effectiveUserRole, "teams", "delete") ||
												canAddSelf) && (
												<motion.button
													whileHover={{ scale: 1.05 }}
													whileTap={{ scale: 0.95 }}
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteTeamMember(member.id);
													}}
													className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
													title="Delete"
												>
													<Trash2 className="w-4 h-4" />
												</motion.button>
											)}
										</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				)}
			</div>

			{/* Team Member Modal */}
			<AnimatePresence>
				{showTeamModal && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-visible flex flex-col"
						>
							{/* Modal Header */}
							<div className="flex items-center justify-between p-4 border-b border-zinc-200">
								<h3 className="text-lg text-zinc-900">
									{editingTeam
										? hasPermission(effectiveUserRole, "teams", "edit") ||
											canAddSelf
											? "Edit Team Member"
											: "View Team Member"
										: "Add Team Member"}
								</h3>
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={handleCloseModal}
									className="p-1.5 text-zinc-400 hover:text-zinc-600 transition-colors"
								>
									<X className="w-5 h-5" />
								</motion.button>
							</div>

							{/* Modal Body */}
							<div className="p-6 space-y-4 overflow-y-auto overflow-x-visible">
								{/* Email */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-1.5">
										Email <span className="text-red-500">*</span>
									</label>
									<input
										type="email"
										name="email"
										value={teamForm.email}
										onChange={handleInputChange}
										disabled={
											!!editingTeam &&
											!(
												hasPermission(effectiveUserRole, "teams", "edit") ||
												canAddSelf
											)
										}
										className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm disabled:bg-zinc-100 disabled:cursor-not-allowed"
										placeholder="team@example.com"
									/>
								</div>

								{/* Username */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-1.5">
										Username
									</label>
									<input
										type="text"
										name="username"
										value={teamForm.username}
										onChange={handleInputChange}
										disabled={
											!!editingTeam &&
											!(
												hasPermission(effectiveUserRole, "teams", "edit") ||
												canAddSelf
											)
										}
										className="w-full px-3 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm disabled:bg-zinc-100 disabled:cursor-not-allowed"
										placeholder="username"
									/>
								</div>

								{/* Role */}
								<div>
									<label className="block text-sm font-medium text-zinc-700 mb-1.5">
										Role
									</label>
									{!editingTeam ||
									hasPermission(effectiveUserRole, "teams", "edit") ||
									canAddSelf ? (
										<div className="relative z-50">
											<AnimatedDropdown
												isOpen={isRoleDropdownOpen}
												onToggle={() =>
													setIsRoleDropdownOpen(!isRoleDropdownOpen)
												}
												onSelect={(value) => {
													handleRoleSelect(value);
													setIsRoleDropdownOpen(false);
												}}
												options={roleOptions}
												value={teamForm.role}
												placeholder="Select role..."
												className="relative"
												dropdownClassName="max-h-48 overflow-y-auto z-[60]"
											/>
										</div>
									) : (
										<div className="w-full px-3 py-2 border border-zinc-200 rounded-xl bg-zinc-100 text-sm">
											{ROLE_LABELS[teamForm.role]?.label || teamForm.role}
										</div>
									)}
								</div>
							</div>

							{/* Modal Footer */}
							{(hasPermission(effectiveUserRole, "teams", "create") ||
								canAddSelf ||
								(editingTeam &&
									(hasPermission(effectiveUserRole, "teams", "edit") ||
										canAddSelf))) && (
								<div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-200">
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleCloseModal}
										className="px-4 py-1.5 text-sm text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl font-medium transition-colors"
									>
										Cancel
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleSaveTeamMember}
										disabled={
											createTeamMemberMutation.isPending ||
											updateTeamMemberMutation.isPending
										}
										className="flex items-center gap-2 px-4 py-1.5 text-sm bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										<Save className="w-4 h-4" />
										{editingTeam ? "Update" : "Create"} Member
									</motion.button>
								</div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

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
				title="Delete Team Member"
				message="Are you sure you want to delete this team member? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				variant="danger"
			/>
		</div>
	);
};

export default TeamsTab;
