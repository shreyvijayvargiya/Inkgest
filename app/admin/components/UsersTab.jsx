import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../lib/config/firebase";
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
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Users } from "lucide-react";
import ExportDropdown from "../../../lib/ui/ExportDropdown";

const loadUsers = async () => {
	const usersRef = collection(db, "users");
	const q = query(usersRef, orderBy("createdAt", "desc"));
	const querySnapshot = await getDocs(q);
	const usersData = [];

	querySnapshot.forEach((doc) => {
		usersData.push({
			id: doc.id,
			...doc.data(),
		});
	});

	return usersData;
};

const UsersTab = () => {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortField, setSortField] = useState(null); // 'name', 'email', 'provider', 'createdAt', 'lastSignIn'
	const [sortDirection, setSortDirection] = useState("asc"); // 'asc' or 'desc'

	// Fetch users with React Query
	const {
		data: users = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["users"],
		queryFn: loadUsers,
	});

	const filteredUsers = users.filter((user) => {
		const searchLower = searchQuery.toLowerCase();
		return (
			user.email?.toLowerCase().includes(searchLower) ||
			user.name?.toLowerCase().includes(searchLower) ||
			user.displayName?.toLowerCase().includes(searchLower) ||
			user.uid?.toLowerCase().includes(searchLower)
		);
	});

	// Sort users
	const sortedUsers = [...filteredUsers].sort((a, b) => {
		if (!sortField) return 0;

		// Handle date comparison separately
		if (sortField === "createdAt" || sortField === "lastSignIn") {
			const dateA = a[sortField]?.toDate
				? a[sortField].toDate()
				: new Date(a[sortField] || 0);
			const dateB = b[sortField]?.toDate
				? b[sortField].toDate()
				: new Date(b[sortField] || 0);
			return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
		}

		// Handle string comparison for other fields
		let aValue, bValue;

		switch (sortField) {
			case "name":
				aValue = (a.name || a.displayName || "").toLowerCase();
				bValue = (b.name || b.displayName || "").toLowerCase();
				break;
			case "email":
				aValue = (a.email || "").toLowerCase();
				bValue = (b.email || "").toLowerCase();
				break;
			case "provider":
				aValue = (a.provider || "").toLowerCase();
				bValue = (b.provider || "").toLowerCase();
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
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
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

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center mb-4 border-b border-zinc-200 px-4 pb-2">
				<div>
					<h2 className="text-lg text-zinc-900">
						Authenticated Users
					</h2>
					<p className="text-sm text-zinc-600 mt-1">List of users that have signed in to the websites</p>
				</div>
				<ExportDropdown dataType="users" data={sortedUsers} />
			</div>

			{/* Search */}
			<div className="relative mx-4">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
				<input
					type="text"
					placeholder="Search users by email, name, or UID..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 text-sm"
				/>
			</div>

			<div className="overflow-x-auto px-4">
				{isLoading ? (
					<TableSkeleton rows={5} columns={6} />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									sortable
									onClick={() => handleSort("name")}
									className="min-w-[200px]"
								>
									<div className="flex items-center gap-2">
										User
										{getSortIcon("name")}
									</div>
								</TableHead>
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
								<TableHead sortable onClick={() => handleSort("provider")}>
									<div className="flex items-center gap-2">
										Provider
										{getSortIcon("provider")}
									</div>
								</TableHead>
								<TableHead>Email Verified</TableHead>
								<TableHead sortable onClick={() => handleSort("createdAt")}>
									<div className="flex items-center gap-2">
										Created
										{getSortIcon("createdAt")}
									</div>
								</TableHead>
								<TableHead sortable onClick={() => handleSort("lastSignIn")}>
									<div className="flex items-center gap-2">
										Last Sign In
										{getSortIcon("lastSignIn")}
									</div>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{error ? (
								<TableEmpty
									colSpan={6}
									message="Error loading users. Please try again."
								/>
							) : sortedUsers.length === 0 ? (
								<TableEmpty
									colSpan={6}
									icon={Users}
									message={
										searchQuery
											? "No users found matching your search."
											: "No users found."
									}
								/>
							) : (
								sortedUsers.map((user) => (
									<TableRow key={user.id}>
										<TableCell>
											<div className="flex items-center gap-3">
												{user.photoURL ? (
													<img
														src={user.photoURL}
														alt={user.name}
														className="w-8 h-8 rounded-full object-cover"
													/>
												) : (
													<div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
														<span className="text-xs font-medium text-zinc-600">
															{user.name
																?.split(" ")
																.map((n) => n[0])
																.join("")
																.toUpperCase() || "U"}
														</span>
													</div>
												)}
												<div>
													<div className="font-medium text-zinc-900">
														{user.name || user.displayName || "Unknown"}
													</div>
													<div className="text-xs text-zinc-500 font-mono">
														{/* {user.uid} */} ************
													</div>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="font-medium text-zinc-900">
												{/* {add user.email} */} ************@gmail.com
											</div>
										</TableCell>
										<TableCell>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													user.provider === "google"
														? "bg-zinc-100 text-zinc-800"
														: "bg-purple-100 text-purple-800"
												}`}
											>
												{user.provider === "google" ? "Google" : "Email"}
											</span>
										</TableCell>
										<TableCell>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													user.emailVerified
														? "bg-green-100 text-green-800"
														: "bg-yellow-100 text-yellow-800"
												}`}
											>
												{user.emailVerified ? "Verified" : "Unverified"}
											</span>
										</TableCell>
										<TableCell className="text-zinc-600">
											{formatDate(user.createdAt)}
										</TableCell>
										<TableCell className="text-zinc-600">
											{formatDate(user.lastSignIn)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
};

export default UsersTab;
