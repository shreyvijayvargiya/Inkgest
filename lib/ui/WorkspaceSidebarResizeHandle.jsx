export default function WorkspaceSidebarResizeHandle({ onPointerDown }) {
	return (
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize sidebar"
			onPointerDown={onPointerDown}
			className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize z-10 touch-none hover:bg-[#C17B2F]/20 active:bg-[#C17B2F]/35 transition-colors"
		/>
	);
}
