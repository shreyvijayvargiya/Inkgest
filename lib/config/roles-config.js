/**
 * Role-based permissions configuration
 * Defines what actions each role can perform
 */

export const ROLES = {
	ADMIN: "admin",
	EDITOR: "editor",
	AUTHOR: "author",
	VIEWER: "viewer",
};

/**
 * Permissions for each role
 */
export const ROLE_PERMISSIONS = {
	[ROLES.ADMIN]: {
		// Users management
		users: {
			view: true,
			create: true,
			edit: true,
			delete: true,
		},
		// Teams management
		teams: {
			view: true,
			create: true,
			edit: true,
			delete: true,
		},
		// Blogs management
		blogs: {
			view: true,
			create: true,
			edit: true,
			delete: true,
			publish: true,
		},
		// Emails management
		emails: {
			view: true,
			create: true,
			edit: true,
			delete: true,
			send: true,
		},
		// Subscribers management
		subscribers: {
			view: true,
			create: true,
			edit: true,
			delete: true,
		},
	},
	[ROLES.EDITOR]: {
		users: {
			view: false,
			create: false,
			edit: false,
			delete: false,
		},
		teams: {
			view: false,
			create: false,
			edit: false,
			delete: false,
		},
		blogs: {
			view: true,
			create: true,
			edit: true,
			delete: true,
			publish: true,
		},
		emails: {
			view: true,
			create: true,
			edit: true,
			delete: true,
			send: true,
		},
		subscribers: {
			view: true,
			create: true,
			edit: true,
			delete: true,
		},
	},
	[ROLES.AUTHOR]: {
		users: {
			view: false,
			create: false,
			edit: false,
			delete: false,
		},
		teams: {
			view: false,
			create: false,
			edit: false,
			delete: false,
		},
		blogs: {
			view: true,
			create: true,
			edit: true, // Only own content
			delete: true, // Only own content
			publish: false,
		},
		emails: {
			view: true,
			create: true,
			edit: true, // Only own content
			delete: true, // Only own content
			send: false,
		},
		subscribers: {
			view: true,
			create: false,
			edit: false,
			delete: false,
		},
	},
	[ROLES.VIEWER]: {
		users: {
			view: true,
			create: false,
			edit: false,
			delete: false,
		},
		teams: {
			view: true,
			create: false,
			edit: false,
			delete: false,
		},
		blogs: {
			view: true,
			create: false,
			edit: false,
			delete: false,
			publish: false,
		},
		emails: {
			view: true,
			create: false,
			edit: false,
			delete: false,
			send: false,
		},
		subscribers: {
			view: true,
			create: false,
			edit: false,
			delete: false,
		},
	},
};

/**
 * Get permissions for a specific role
 * @param {string} role - User role
 * @returns {Object} Permissions object
 */
export const getRolePermissions = (role) => {
	return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS[ROLES.VIEWER];
};

/**
 * Check if user has permission for a specific action
 * @param {string} role - User role
 * @param {string} resource - Resource name (blogs, emails, subscribers, etc.)
 * @param {string} action - Action name (view, create, edit, delete, etc.)
 * @returns {boolean} True if user has permission
 */
export const hasPermission = (role, resource, action) => {
	const permissions = getRolePermissions(role);
	return permissions[resource]?.[action] === true;
};

/**
 * Get allowed actions for a resource based on role
 * @param {string} role - User role
 * @param {string} resource - Resource name
 * @returns {Array} Array of allowed action names
 */
export const getAllowedActions = (role, resource) => {
	const permissions = getRolePermissions(role);
	const resourcePermissions = permissions[resource] || {};
	return Object.keys(resourcePermissions).filter(
		(action) => resourcePermissions[action] === true
	);
};

/**
 * Role labels and colors for UI
 */
export const ROLE_LABELS = {
	[ROLES.ADMIN]: {
		label: "Admin",
		color: "bg-red-100 text-red-800",
	},
	[ROLES.EDITOR]: {
		label: "Editor",
		color: "bg-zinc-100 text-zinc-800",
	},
	[ROLES.AUTHOR]: {
		label: "Author",
		color: "bg-green-100 text-green-800",
	},
	[ROLES.VIEWER]: {
		label: "Viewer",
		color: "bg-zinc-100 text-zinc-800",
	},
};
