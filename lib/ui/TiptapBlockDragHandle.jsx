"use client";

import { useEffect, useRef, useState } from "react";

const INK_BLOCK_DRAG_MIME = "application/x-ink-tiptap-block-move-v1";
const SKIP_TAGS = new Set([
	"br",
	"span",
	"a",
	"strong",
	"em",
	"code",
	"input",
	"label",
	"button",
	"svg",
	"path",
	"circle",
]);

function findTopLevelBlock(editorEl, target) {
	let node = target;
	if (node?.nodeType === 3) node = node.parentElement;
	while (node && node.parentElement !== editorEl) node = node.parentElement;
	if (!node || !editorEl.contains(node)) return null;
	const tag = node.nodeName.toLowerCase();
	if (SKIP_TAGS.has(tag)) return null;
	if (node.closest?.("[data-drag-handle]")) return null;
	return node;
}

function blockPosFromDom(editor, domNode) {
	try {
		const pos = editor.view.posAtDOM(domNode, 0);
		if (pos == null) return null;
		const $pos = editor.state.doc.resolve(pos);
		if ($pos.depth < 1) return null;
		return $pos.before(1);
	} catch {
		return null;
	}
}

function moveTopLevelBlock(editor, fromPos, targetPos, insertBefore) {
	const { state } = editor;
	const fromNode = state.doc.nodeAt(fromPos);
	const targetNode = state.doc.nodeAt(targetPos);
	if (!fromNode || !targetNode || fromPos === targetPos) return;

	let insertPos = insertBefore
		? targetPos
		: targetPos + targetNode.nodeSize;
	const fromSize = fromNode.nodeSize;

	let tr = state.tr;
	const slice = state.doc.slice(fromPos, fromPos + fromSize);
	tr = tr.delete(fromPos, fromPos + fromSize);
	if (fromPos < insertPos) insertPos -= fromSize;
	tr = tr.insert(insertPos, slice.content);
	editor.view.dispatch(tr.scrollIntoView());
}

function BlockGripIcon() {
	return (
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
			<circle cx="4.5" cy="3.5" r="1.2" fill="#9A9490" />
			<circle cx="9.5" cy="3.5" r="1.2" fill="#9A9490" />
			<circle cx="4.5" cy="7" r="1.2" fill="#9A9490" />
			<circle cx="9.5" cy="7" r="1.2" fill="#9A9490" />
			<circle cx="4.5" cy="10.5" r="1.2" fill="#9A9490" />
			<circle cx="9.5" cy="10.5" r="1.2" fill="#9A9490" />
		</svg>
	);
}

export default function TiptapBlockDragHandle({ editor, containerRef }) {
	const [handle, setHandle] = useState(null);
	const [dropIndicator, setDropIndicator] = useState(null);
	const dragFromPosRef = useRef(null);
	const dragOverRef = useRef(null);
	const handleRef = useRef(null);

	useEffect(() => {
		if (!editor?.view || !containerRef?.current) return;
		const editorEl = editor.view.dom;
		const container = containerRef.current;

		const handleMouseMove = (e) => {
			if (dragFromPosRef.current != null) return;
			if (e.target.closest?.("[data-drag-handle]")) return;

			const block = findTopLevelBlock(editorEl, e.target);
			if (!block) {
				setHandle(null);
				return;
			}

			const containerRect = container.getBoundingClientRect();
			const editorRect = editorEl.getBoundingClientRect();
			const nodeRect = block.getBoundingClientRect();
			const top = nodeRect.top - containerRect.top + container.scrollTop;
			const handleLeft = editorRect.left - containerRect.left - 28;

			setHandle({
				top,
				handleLeft: Math.max(2, handleLeft),
				block,
				height: nodeRect.height,
				pos: blockPosFromDom(editor, block),
			});
		};

		const handleMouseLeave = () => {
			if (dragFromPosRef.current == null) setHandle(null);
		};

		editorEl.addEventListener("mousemove", handleMouseMove);
		editorEl.addEventListener("mouseleave", handleMouseLeave);
		return () => {
			editorEl.removeEventListener("mousemove", handleMouseMove);
			editorEl.removeEventListener("mouseleave", handleMouseLeave);
		};
	}, [editor, containerRef]);

	useEffect(() => {
		const block = handle?.block;
		const el = handleRef.current;
		if (!block || !el) return undefined;

		const show = () => {
			el.style.opacity = "1";
		};
		const hide = () => {
			if (dragFromPosRef.current == null) el.style.opacity = "0";
		};
		block.addEventListener("mouseenter", show);
		block.addEventListener("mouseleave", hide);
		return () => {
			block.removeEventListener("mouseenter", show);
			block.removeEventListener("mouseleave", hide);
		};
	}, [handle?.block]);

	useEffect(() => {
		if (!editor?.view || !containerRef?.current) return;
		const container = containerRef.current;
		const editorEl = editor.view.dom;

		const onDragOver = (e) => {
			if (
				!e.dataTransfer?.types?.includes(INK_BLOCK_DRAG_MIME) &&
				dragFromPosRef.current == null
			) {
				return;
			}
			if (!e.dataTransfer?.types?.includes(INK_BLOCK_DRAG_MIME)) return;

			e.preventDefault();
			e.dataTransfer.dropEffect = "move";

			const block = findTopLevelBlock(editorEl, e.target);
			const fromPos = dragFromPosRef.current;
			if (!block || fromPos == null) {
				setDropIndicator(null);
				return;
			}

			const blockPos = blockPosFromDom(editor, block);
			if (blockPos == null || blockPos === fromPos) {
				setDropIndicator(null);
				return;
			}

			const tgtRect = block.getBoundingClientRect();
			const containerRect = container.getBoundingClientRect();
			const editorRect = editorEl.getBoundingClientRect();
			const before = e.clientY < tgtRect.top + tgtRect.height / 2;
			dragOverRef.current = { pos: blockPos, before };

			setDropIndicator({
				top:
					(before ? tgtRect.top : tgtRect.bottom) -
					containerRect.top +
					container.scrollTop,
				left: editorRect.left - containerRect.left,
				width: editorRect.width,
			});
		};

		const onDragLeave = (e) => {
			if (!container.contains(e.relatedTarget)) {
				setDropIndicator(null);
				dragOverRef.current = null;
			}
		};

		const onDrop = (e) => {
			if (!e.dataTransfer?.types?.includes(INK_BLOCK_DRAG_MIME)) return;
			e.preventDefault();

			const fromPos = dragFromPosRef.current;
			const over = dragOverRef.current;
			if (fromPos != null && over?.pos != null && over.pos !== fromPos) {
				moveTopLevelBlock(editor, fromPos, over.pos, over.before);
			}

			const srcDom = handle?.block;
			if (srcDom) {
				srcDom.style.opacity = "";
				srcDom.style.outline = "";
				srcDom.style.borderRadius = "";
			}

			dragFromPosRef.current = null;
			dragOverRef.current = null;
			setDropIndicator(null);
			setHandle(null);
		};

		container.addEventListener("dragover", onDragOver);
		container.addEventListener("dragleave", onDragLeave);
		container.addEventListener("drop", onDrop);
		return () => {
			container.removeEventListener("dragover", onDragOver);
			container.removeEventListener("dragleave", onDragLeave);
			container.removeEventListener("drop", onDrop);
		};
	}, [editor, containerRef, handle?.block]);

	if (!editor?.isEditable) return null;

	return (
		<>
			{dropIndicator ? (
				<div
					contentEditable={false}
					className="pointer-events-none absolute z-30 h-0.5 bg-sky-500 rounded-full"
					style={{
						top: dropIndicator.top,
						left: dropIndicator.left,
						width: dropIndicator.width,
					}}
				/>
			) : null}

			{handle?.block && handle.pos != null ? (
				<div
					ref={handleRef}
					data-drag-handle=""
					contentEditable={false}
					draggable
					title="Drag to reorder"
					onDragStart={(e) => {
						dragFromPosRef.current = handle.pos;
						e.dataTransfer.effectAllowed = "move";
						e.dataTransfer.setData(
							INK_BLOCK_DRAG_MIME,
							String(handle.pos),
						);
						try {
							const ghost = handle.block.cloneNode(true);
							ghost.style.cssText =
								"position:fixed;top:-9999px;left:-9999px;opacity:0.7;pointer-events:none;max-width:400px;background:#fff;border-radius:8px;padding:6px 10px;box-shadow:0 4px 16px rgba(0,0,0,0.12)";
							document.body.appendChild(ghost);
							e.dataTransfer.setDragImage(ghost, 20, 20);
							setTimeout(() => document.body.removeChild(ghost), 0);
						} catch {
							/* ignore ghost errors */
						}
						handle.block.style.opacity = "0.35";
						handle.block.style.outline = "2px dashed #D4D0CB";
						handle.block.style.borderRadius = "6px";
					}}
					onDragEnd={() => {
						if (handle.block) {
							handle.block.style.opacity = "";
							handle.block.style.outline = "";
							handle.block.style.borderRadius = "";
						}
						dragFromPosRef.current = null;
						dragOverRef.current = null;
						setDropIndicator(null);
					}}
					className="absolute z-20 flex items-center justify-center w-[22px] h-[22px] rounded-[5px] cursor-grab opacity-0 text-[#B0AAA3] hover:bg-[#F0ECE5] transition-[opacity,background] duration-100 select-none"
					style={{
						left: handle.handleLeft,
						top: handle.top + handle.height / 2 - 11,
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.opacity = "1";
						e.currentTarget.style.background = "#F0ECE5";
					}}
					onMouseLeave={(e) => {
						if (dragFromPosRef.current == null) {
							e.currentTarget.style.opacity = "0";
							e.currentTarget.style.background = "transparent";
						}
					}}
				>
					<BlockGripIcon />
				</div>
			) : null}
		</>
	);
}
