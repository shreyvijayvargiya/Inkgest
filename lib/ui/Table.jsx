import React from "react";

/* Inkgest theme: base #F7F5F0, surface #FFFFFF, accent #1A1A1A, warm #C17B2F, muted #7A7570, border #E8E4DC */
const inkgest = {
	container: "w-full border border-[#E8E4DC] rounded-xl",
	header: "border-b-2 border-[#E8E4DC] bg-[#F7F5F0]",
	headerCell: "px-4 py-3 text-left text-xs font-semibold text-[#1A1A1A] tracking-wider",
	headerCellSortable: "cursor-pointer hover:bg-[#E8E4DC]/50 transition-colors",
	body: "divide-y divide-[#E8E4DC]",
	row: "border-b border-[#E8E4DC] last:border-b-0 transition-colors",
	rowHover: "hover:bg-[#FEF3E2]/50",
	cell: "px-4 py-3 text-sm text-[#1A1A1A]",
};

const defaultStyles = {
	container: "w-full border border-zinc-200 rounded-xl",
	header: "border-b border-zinc-200",
	headerCell: "px-4 py-3 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wider",
	headerCellSortable: "cursor-pointer hover:bg-zinc-50 transition-colors",
	body: "divide-y divide-zinc-200",
	row: "border-b border-zinc-200 rounded-xl last:border-b-0",
	rowHover: "hover:bg-zinc-50/50 transition-colors",
	cell: "px-4 py-3 text-sm text-zinc-900",
};

const getStyles = (variant) => (variant === "inkgest" ? inkgest : defaultStyles);

/**
 * Table Component - Shadcn-style table with optional inkgest theme
 * Reusable table component for admin panels
 */
export const Table = ({ className = "", variant, children, ...props }) => {
	const s = getStyles(variant);
	return (
		<div className={`w-full overflow-x-auto ${s.container}`}>
			<table className={`w-full ${className}`} {...props}>
				{children}
			</table>
		</div>
	);
};

/**
 * Table Header Component
 */
export const TableHeader = ({ className = "", variant, children, ...props }) => {
	const s = getStyles(variant);
	return (
		<thead className={`${s.header} ${className}`} {...props}>
			{children}
		</thead>
	);
};

/**
 * Table Body Component
 */
export const TableBody = ({ className = "", variant, children, ...props }) => {
	const s = getStyles(variant);
	return (
		<tbody className={`${s.body} ${className}`} {...props}>
			{children}
		</tbody>
	);
};

/**
 * Table Row Component
 */
export const TableRow = ({
	className = "",
	variant,
	children,
	onClick,
	hover = true,
	...props
}) => {
	const s = getStyles(variant);
	return (
		<tr
			className={`${s.row} ${hover ? s.rowHover : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
			onClick={onClick}
			{...props}
		>
			{children}
		</tr>
	);
};

/**
 * Table Head Cell Component
 */
export const TableHead = ({
	className = "",
	variant,
	children,
	onClick,
	sortable = false,
	...props
}) => {
	const s = getStyles(variant);
	return (
		<th
			className={`${s.headerCell} ${sortable || onClick ? s.headerCellSortable : ""} ${className}`}
			onClick={onClick}
			{...props}
		>
			{children}
		</th>
	);
};

/**
 * Table Cell Component
 */
export const TableCell = ({ className = "", variant, children, ...props }) => {
	const s = getStyles(variant);
	return (
		<td className={`${s.cell} ${className}`} {...props}>
			{children}
		</td>
	);
};

/**
 * Table Container - Wrapper for the entire table with optional loading/empty states
 */
export const TableContainer = ({
	children,
	isLoading = false,
	emptyMessage = "No data available",
	emptyIcon: EmptyIcon,
	columns = 0,
	rows = 0,
	...props
}) => {
	if (isLoading) {
		return (
			<div className="w-full border border-zinc-200 rounded-xl overflow-hidden">
				<div className="p-8 text-center">
					<div className="animate-pulse space-y-3">
						{Array.from({ length: rows || 5 }).map((_, i) => (
							<div key={i} className="flex gap-4">
								{Array.from({ length: columns || 5 }).map((_, j) => (
									<div key={j} className="h-4 bg-zinc-200 rounded flex-1"></div>
								))}
							</div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full" {...props}>
			{children}
		</div>
	);
};

/**
 * Table Empty State Component
 */
export const TableEmpty = ({
	message = "No data available",
	icon: Icon,
	colSpan = 1,
}) => {
	return (
		<tr>
			<td colSpan={colSpan} className="px-4 py-12 text-center">
				{Icon && (
					<div className="flex justify-center mb-3">
						<Icon className="w-12 h-12 text-zinc-400" />
					</div>
				)}
				<p className="text-sm text-zinc-500">{message}</p>
			</td>
		</tr>
	);
};
