import { LUCIDE_ICONS } from "../ui/IconSelectorDropdown.jsx";

export function findLucideIcon(name) {
	return LUCIDE_ICONS.find((i) => i.name === name) || LUCIDE_ICONS[0];
}

export function SidebarIconGlyph({ icon, size = 16, className = "text-[#5A5550]" }) {
	if (!icon) return null;
	if (icon.type === "emoji") {
		return (
			<span className="leading-none text-sm" aria-hidden>
				{icon.value}
			</span>
		);
	}
	const luc = findLucideIcon(icon.name);
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
			aria-hidden
		>
			<path d={luc.path} />
		</svg>
	);
}

export function SidebarDragHandle({ listeners, attributes, className = "" }) {
	return (
		<button
			type="button"
			title="Drag to move"
			className={`flex items-center justify-center p-1 rounded border-none bg-transparent text-[#BBBBBB] hover:text-[#888888] hover:bg-[#F0ECE5] cursor-grab active:cursor-grabbing touch-none ${className}`}
			{...listeners}
			{...attributes}
			onClick={(e) => e.stopPropagation()}
		>
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="currentColor"
				aria-hidden
			>
				<circle cx="9" cy="6" r="1.5" />
				<circle cx="15" cy="6" r="1.5" />
				<circle cx="9" cy="12" r="1.5" />
				<circle cx="15" cy="12" r="1.5" />
				<circle cx="9" cy="18" r="1.5" />
				<circle cx="15" cy="18" r="1.5" />
			</svg>
		</button>
	);
}
