import React, { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Node } from "@tiptap/core";
import { CustomImage } from "../../../lib/ui/TiptapImageExtension";
import { CustomTable } from "../../../lib/ui/TiptapTableExtension";
import Youtube from "@tiptap/extension-youtube";
import Details from "@tiptap/extension-details";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Markdown } from "tiptap-markdown";
import Placeholder from "@tiptap/extension-placeholder";
import { motion } from "framer-motion";
import {
	Bold,
	Italic,
	Heading1,
	Heading2,
	List,
	ListOrdered,
	Upload,
	Eye,
	Quote,
	Strikethrough,
	Underline as UnderlineIcon,
	Code,
	Code2,
	Link as LinkIcon,
	Palette,
	ChevronDown,
	Type,
	Youtube as YoutubeIcon,
	ChevronRight,
	Table as TableIcon,
	CheckSquare2,
} from "lucide-react";
import { toast } from "sonner";
import { htmlToMarkdown } from "../../../lib/utils/htmlToMarkdown";
import { CodeBlock, CodeGroup } from "../../../lib/ui/TiptapCodeExtensions";
import { AnimatePresence } from "framer-motion";
import {
	TiptapSlashDropdownExtension,
	SlashDropdownMenu,
} from "../../../lib/ui/TiptapSlashDropdownExtension";

// Create DetailsSummary and DetailsContent nodes (required by Details extension)
// These are not exported from @tiptap/extension-details in v2, so we create them manually
const DetailsSummary = Node.create({
	name: "detailsSummary",
	group: "block",
	content: "inline*",
	parseHTML() {
		return [{ tag: "summary" }];
	},
	renderHTML({ HTMLAttributes }) {
		return ["summary", HTMLAttributes, 0];
	},
});

const DetailsContent = Node.create({
	name: "detailsContent",
	group: "block",
	content: "block+",
	parseHTML() {
		return [{ tag: 'div[data-type="detailsContent"]' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ["div", { ...HTMLAttributes, "data-type": "detailsContent" }, 0];
	},
});

// Helper function to detect content type and normalize it
const normalizeContent = (content) => {
	if (!content || typeof content !== "string")
		return { content: "", type: "empty" };

	// Check if it's HTML (contains HTML tags)
	const isHTML =
		content.includes("<") &&
		content.includes(">") &&
		content.match(/<\/?[a-z][\s\S]*>/i);

	// Check if it's markdown (contains markdown patterns)
	const markdownPatterns = [
		/^#{1,6}\s/m, // Headers
		/^\*\*.*\*\*$/m, // Bold
		/^\*.*\*$/m, // Italic
		/^\- .*$/m, // Unordered lists
		/^\d+\. .*$/m, // Ordered lists
		/^> .*$/m, // Blockquotes
		/\[.*\]\(.*\)/, // Links
		/!\[.*\]\(.*\)/, // Images
		/```[\s\S]*```/, // Code blocks
	];
	const isMarkdown = markdownPatterns.some((pattern) => pattern.test(content));

	if (isHTML) {
		// If it's HTML, let Tiptap parse it (it handles HTML natively)
		const tempDiv = document.createElement("div");
		tempDiv.innerHTML = content;
		const text = (tempDiv.textContent || tempDiv.innerText || "").trim();
		return { content, text, type: "html" };
	}

	if (isMarkdown) {
		// If it's markdown, Tiptap Markdown extension will parse it
		return { content, text: content.trim(), type: "markdown" };
	}

	// Plain text - wrap in paragraph for Tiptap
	return { content: `<p>${content}</p>`, text: content.trim(), type: "text" };
};

const TiptapEditor = ({
	placeholder = "Start writing...",
	content = "",
	onChange,
	onImageUpload,
	showPreview,
	onPreview,
}) => {
	const fileInputRef = useRef(null);
	const [linkDropdownOpen, setLinkDropdownOpen] = useState(false);
	const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
	const [menuDropdownOpen, setMenuDropdownOpen] = useState(false);
	const [textTypeDropdownOpen, setTextTypeDropdownOpen] = useState(false);
	const [youtubeUrl, setYoutubeUrl] = useState("");
	const [youtubeModalOpen, setYoutubeModalOpen] = useState(false);
	const [linkUrl, setLinkUrl] = useState("");
	const linkInputRef = useRef(null);
	const colorDropdownRef = useRef(null);
	const menuDropdownRef = useRef(null);
	const textTypeDropdownRef = useRef(null);
	const youtubeInputRef = useRef(null);
	// Track if update is from editor itself (internal) vs external prop change
	const isInternalUpdateRef = useRef(false);
	const lastContentRef = useRef("");
	const updateTimeoutRef = useRef(null);

	// Colors for color picker
	const colors = [
		{ name: "Default", value: "" },
		{ name: "Red", value: "#ef4444" }, // Tailwind Red 500
		{ name: "Orange", value: "#f97316" }, // Tailwind Orange 500
		{ name: "Yellow", value: "#eab308" }, // Tailwind Yellow 500
		{ name: "Green", value: "#22c55e" }, // Tailwind Green 500
		{ name: "Blue", value: "#3b82f6" }, // Tailwind Blue 500
		{ name: "Purple", value: "#a855f7" }, // Tailwind Purple 500
		{ name: "Pink", value: "#ec4899" }, // Tailwind Pink 500
		{ name: "Gray", value: "#6b7280" }, // Tailwind Gray 500
	];

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2],
				},
				blockquote: true,
				strike: true,
				codeBlock: false, // Disable default code block
				// Disable table extensions from StarterKit to use our custom table
				table: false,
				tableRow: false,
				tableCell: false,
				tableHeader: false,
			}),
			CustomImage,
			// Custom table extension (no Tiptap table extension to avoid bugs)
			CustomTable,
			Youtube.configure({
				controls: true,
				nocookie: false,
			}),
			Details.configure({
				persist: true,
				HTMLAttributes: {
					class: "details",
				},
			}),
			DetailsSummary,
			DetailsContent,
			Link.configure({
				protocols: ["http", "https", "mailto"],
			}),
			Placeholder.configure({
				placeholder: placeholder,
			}),
			TextAlign.configure({
				types: ["heading", "paragraph"],
			}),
			Underline,
			Highlight,
			TextStyle,
			Color,
			Typography,
			CharacterCount,
			TaskList.configure({
				HTMLAttributes: {
					class: "task-list",
				},
			}),
			TaskItem.configure({
				nested: true,
				HTMLAttributes: {
					class: "task-item",
				},
			}),
			CodeBlock,
			CodeGroup,
			TiptapSlashDropdownExtension,
			Markdown.configure({
				html: true, // Allow HTML input for backward compatibility
				transformPastedText: true, // Transform pasted markdown
				transformCopiedText: true, // Transform copied text to markdown
			}),
		],
		content: content || "",
		editorProps: {
			attributes: {
				class:
					"prose prose-zinc prose-sm max-w-none p-4 h-full overflow-y-auto focus:outline-none outline-none focus-visible:outline-none",
			},
		},
		onUpdate: ({ editor }) => {
			// Mark this as an internal update (from editor itself)
			isInternalUpdateRef.current = true;

			// Clear any existing timeout
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}

			if (onChange) {
				// Get markdown content using the Markdown extension
				let markdown = "";
				try {
					// Check if markdown storage is available
					if (editor.storage && editor.storage.markdown) {
						markdown = editor.storage.markdown.getMarkdown() || "";
					}
				} catch (error) {
					console.warn("Failed to get markdown from editor:", error);
				}

				// Fallback: Convert HTML to markdown
				if (!markdown) {
					const html = editor.getHTML();
					markdown = htmlToMarkdown(html) || "";
				}

				lastContentRef.current = markdown;
				onChange(markdown);

				// Reset flag after React has processed the state update
				// Use a small timeout to ensure useEffect runs first
				updateTimeoutRef.current = setTimeout(() => {
					isInternalUpdateRef.current = false;
					updateTimeoutRef.current = null;
				}, 10);
			}
		},
	});

	// Update content when prop changes (only for external changes, not internal editor updates)
	React.useEffect(() => {
		if (!editor) return;

		// Skip update if this change came from the editor itself (internal update)
		if (isInternalUpdateRef.current) {
			return;
		}

		// Get current markdown content for comparison
		let currentContent = "";
		try {
			if (editor.storage && editor.storage.markdown) {
				currentContent = (editor.storage.markdown.getMarkdown() || "").trim();
			} else {
				currentContent = (editor.getText() || "").trim();
			}
		} catch (error) {
			currentContent = (editor.getText() || "").trim();
		}

		// Normalize incoming content (handle HTML, markdown, and plain text)
		const normalized = normalizeContent(content);

		// Compare with last known content to avoid unnecessary updates
		const incomingContent = normalized.text || "";

		// Only update if content is actually different
		if (currentContent === incomingContent && content) {
			lastContentRef.current = incomingContent;
			return;
		}

		// Also check against lastContentRef to prevent loops
		// If the incoming content matches what we just sent out, skip update
		if (lastContentRef.current === incomingContent && incomingContent) {
			return;
		}

		// Store selection before updating to restore it later
		const { from, to } = editor.state.selection;
		const wasFocused = editor.isFocused;

		// Set content - TipTap Markdown extension will automatically parse markdown
		// It can handle both HTML and markdown input
		if (normalized.content) {
			editor.commands.setContent(normalized.content, false);
		} else {
			editor.commands.clearContent(false);
		}

		// Restore selection and focus after content update
		// Use multiple requestAnimationFrame calls to ensure DOM is fully updated
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				try {
					if (!editor || editor.isDestroyed) return;

					const docSize = editor.state.doc.content.size;

					// Only restore if positions are valid and document has content
					if (docSize > 0) {
						const safeFrom = Math.min(Math.max(0, from), docSize);
						const safeTo = Math.min(Math.max(0, to), docSize);

						if (safeFrom >= 0 && safeTo >= 0) {
							editor.commands.setTextSelection({ from: safeFrom, to: safeTo });

							// Restore focus if it was focused before
							if (wasFocused) {
								editor.commands.focus();
							}
						}
					} else if (wasFocused) {
						// If document is empty, just focus
						editor.commands.focus();
					}
				} catch (error) {
					// If restoration fails, try to focus at the end
					if (wasFocused) {
						try {
							editor.commands.focus("end");
						} catch (e) {
							// Ignore errors
						}
					}
				}
			});
		});

		lastContentRef.current = incomingContent;
	}, [content, editor]);

	// Cleanup timeout on unmount
	React.useEffect(() => {
		return () => {
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}
		};
	}, []);

	const handleImageUpload = useCallback(
		(event) => {
			const file = event.target.files[0];
			if (file) {
				if (!file.type.startsWith("image/")) {
					toast.warning("Please select an image file");
					return;
				}
				const reader = new FileReader();
				reader.onload = (e) => {
					const imageUrl = e.target.result;
					editor?.chain().focus().setImage({ src: imageUrl }).run();
					if (onImageUpload) {
						onImageUpload(imageUrl);
					}
				};
				reader.readAsDataURL(file);
			}
			event.target.value = "";
		},
		[editor, onImageUpload]
	);

	const handleYoutubeInsert = useCallback(() => {
		if (!youtubeUrl.trim()) {
			toast.warning("Please enter a YouTube URL");
			return;
		}

		// Extract video ID from various YouTube URL formats
		const getVideoId = (url) => {
			const patterns = [
				/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
				/^([a-zA-Z0-9_-]{11})$/,
			];

			for (const pattern of patterns) {
				const match = url.match(pattern);
				if (match) {
					return match[1];
				}
			}
			return null;
		};

		const videoId = getVideoId(youtubeUrl.trim());

		if (!videoId) {
			toast.error(
				"Invalid YouTube URL. Please enter a valid YouTube video URL or ID."
			);
			return;
		}

		// Try different YouTube extension command formats
		try {
			// Method 1: Using src attribute
			if (editor.commands.setYoutubeVideo) {
				editor
					.chain()
					.focus()
					.setYoutubeVideo({ src: `https://www.youtube.com/embed/${videoId}` })
					.run();
			} else if (editor.commands.insertContent) {
				// Method 2: Insert as HTML iframe
				editor
					.chain()
					.focus()
					.insertContent({
						type: "youtube",
						attrs: {
							src: `https://www.youtube.com/embed/${videoId}`,
						},
					})
					.run();
			}
		} catch (error) {
			console.error("Error inserting YouTube video:", error);
			toast.error("Failed to insert YouTube video");
			return;
		}
		setYoutubeModalOpen(false);
		setYoutubeUrl("");
		toast.success("YouTube video inserted!");
	}, [editor, youtubeUrl]);

	// Handle click outside for dropdowns
	React.useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				linkInputRef.current &&
				!linkInputRef.current.contains(event.target)
			) {
				setLinkDropdownOpen(false);
			}
			if (
				colorDropdownRef.current &&
				!colorDropdownRef.current.contains(event.target)
			) {
				setColorDropdownOpen(false);
			}
			if (
				menuDropdownRef.current &&
				!menuDropdownRef.current.contains(event.target)
			) {
				setMenuDropdownOpen(false);
			}
			if (
				textTypeDropdownRef.current &&
				!textTypeDropdownRef.current.contains(event.target)
			) {
				setTextTypeDropdownOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	if (!editor) {
		return null;
	}

	return (
		<div className="border border-zinc-300 rounded-xl overflow-hidden flex flex-col h-full">
			{/* Editor Toolbar */}
			<div className="border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 flex items-center gap-1 sticky top-0 z-10 flex-shrink-0">
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => editor.chain().focus().toggleBold().run()}
					className={`p-1.5 rounded-xl ${editor.isActive("bold")
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-600 hover:bg-zinc-100"
						}`}
					title="Bold"
				>
					<Bold className="w-3.5 h-3.5" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => editor.chain().focus().toggleItalic().run()}
					className={`p-1.5 rounded-xl ${editor.isActive("italic")
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-600 hover:bg-zinc-100"
						}`}
					title="Italic"
				>
					<Italic className="w-3.5 h-3.5" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => editor.chain().focus().toggleUnderline().run()}
					className={`p-1.5 rounded-xl ${editor.isActive("underline")
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-600 hover:bg-zinc-100"
						}`}
					title="Underline"
				>
					<UnderlineIcon className="w-3.5 h-3.5" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => editor.chain().focus().toggleStrike().run()}
					className={`p-1.5 rounded-xl ${editor.isActive("strike")
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-600 hover:bg-zinc-100"
						}`}
					title="Strikethrough"
				>
					<Strikethrough className="w-3.5 h-3.5" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => editor.chain().focus().toggleBlockquote().run()}
					className={`p-1.5 rounded-xl ${editor.isActive("blockquote")
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-600 hover:bg-zinc-100"
						}`}
					title="Quote"
				>
					<Quote className="w-3.5 h-3.5" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 1 }).run()
					}
					className={`p-1.5 rounded-xl ${editor.isActive("heading", { level: 1 })
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-600 hover:bg-zinc-100"
						}`}
					title="Heading 1"
				>
					<Heading1 className="w-3.5 h-3.5" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() =>
						editor.chain().focus().toggleHeading({ level: 2 }).run()
					}
					className={`p-1.5 rounded-xl ${editor.isActive("heading", { level: 2 })
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-600 hover:bg-zinc-100"
						}`}
					title="Heading 2"
				>
					<Heading2 className="w-3.5 h-3.5" />
				</motion.button>
				<div className="w-px h-5 bg-zinc-200 mx-1" />
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => editor.chain().focus().toggleBulletList().run()}
					className={`p-1.5 rounded-xl ${editor.isActive("bulletList")
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-600 hover:bg-zinc-100"
						}`}
					title="Bullet List"
				>
					<List className="w-3.5 h-3.5" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
					className={`p-1.5 rounded-xl ${editor.isActive("orderedList")
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-600 hover:bg-zinc-100"
						}`}
					title="Ordered List"
				>
					<ListOrdered className="w-3.5 h-3.5" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => {
						if (!editor || editor.isDestroyed) return;

						// Exit incompatible nodes
						if (editor.isActive("codeBlock") || editor.isActive("codeGroup")) {
							editor.chain().focus().exitCode().run();
						}

						// Toggle task list (will create one if it doesn't exist)
						editor.chain().focus().toggleTaskList().run();
					}}
					className={`p-1.5 rounded-xl ${editor.isActive("taskList")
							? "bg-zinc-200 text-zinc-900"
							: "text-zinc-600 hover:bg-zinc-100"
						}`}
					title="Task List"
				>
					<CheckSquare2 className="w-3.5 h-3.5" />
				</motion.button>
				<div className="w-px h-5 bg-zinc-200 mx-1" />
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() =>
						editor
							.chain()
							.focus()
							.insertContent({
								type: "codeBlock",
								attrs: { language: "text", code: "" },
							})
							.run()
					}
					className="p-1.5 rounded-xl text-zinc-600 hover:bg-zinc-100"
					title="Code Block"
				>
					<Code className="w-3.5 h-3.5" />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() =>
						editor
							.chain()
							.focus()
							.insertContent({
								type: "codeGroup",
								attrs: {
									tabs: [
										{
											id: Date.now(),
											name: "Tab 1",
											codeBlocks: [
												{
													id: Date.now() + 1,
													name: "",
													code: "",
													language: "text",
												},
											],
										},
									],
								},
							})
							.run()
					}
					className="p-1.5 rounded-xl text-zinc-600 hover:bg-zinc-100"
					title="Code Group"
				>
					<Code2 className="w-3.5 h-3.5" />
				</motion.button>
				{showPreview && (
					<>
						<div className="w-px h-5 bg-zinc-200 mx-1" />
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={onPreview}
							className="p-1.5 rounded-xl text-zinc-600 hover:bg-zinc-100"
							title="Preview"
						>
							<Eye className="w-3.5 h-3.5" />
						</motion.button>
					</>
				)}
				<div className="w-px h-5 bg-zinc-200 mx-1" />
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => fileInputRef.current?.click()}
					className="p-1.5 rounded-xl text-zinc-600 hover:bg-zinc-100"
					title="Upload Image"
				>
					<Upload className="w-3.5 h-3.5" />
				</motion.button>
				<div className="w-px h-5 bg-zinc-200 mx-1" />
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => setYoutubeModalOpen(true)}
					className="p-1.5 rounded-xl text-zinc-600 hover:bg-zinc-100"
					title="Insert YouTube Video"
				>
					<YoutubeIcon className="w-3.5 h-3.5" />
				</motion.button>
				<div className="w-px h-5 bg-zinc-200 mx-1" />
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => {
						if (!editor || editor.isDestroyed) return;

						// Insert custom table (no Tiptap table extension)
						try {
							// If we're inside a table, don't insert another table
							if (editor.isActive("customTable")) {
								editor.chain().focus().run();
								return;
							}

							// Exit incompatible nodes
							if (
								editor.isActive("codeBlock") ||
								editor.isActive("codeGroup")
							) {
								editor.chain().focus().exitCode().run();
							}

							// Ensure we have content
							if (editor.isEmpty) {
								editor.chain().focus().insertContent("<p></p>").run();
							}

							// Ensure we're at the end of a paragraph or create one
							const { state } = editor;
							const { $from } = state.selection;

							// If we're in the middle of a paragraph, split it first
							if (
								$from.parent.type.name === "paragraph" &&
								$from.parentOffset > 0
							) {
								editor.chain().focus().splitBlock().run();
							}

							// Wait for editor to be completely ready
							// Use multiple delays to ensure React and Tiptap are both ready
							setTimeout(() => {
								requestAnimationFrame(() => {
									requestAnimationFrame(() => {
										try {
											// Ensure editor is still valid
											if (!editor || editor.isDestroyed || !editor.view) {
												return;
											}

											// Get fresh state
											const { state, view } = editor;
											if (!state || !view) return;

											// Get current position
											const { $from } = state.selection;

											// Validate position
											if (
												!$from ||
												$from.pos < 0 ||
												$from.pos > state.doc.content.size
											) {
												return;
											}

											// Create table node
											const tableNode = state.schema.nodes.customTable.create({
												rows: [
													[{ content: "" }, { content: "" }, { content: "" }],
													[{ content: "" }, { content: "" }, { content: "" }],
												],
												hasHeader: true,
											});

											// Create transaction
											const tr = state.tr.insert($from.pos, tableNode);

											// Dispatch transaction
											view.dispatch(tr);

											// Focus after a delay
											setTimeout(() => {
												editor.chain().focus().run();
											}, 10);
										} catch (error) {
											console.error("Table insertion failed:", error);
										}
									});
								});
							}, 100);
						} catch (error) {
							console.error("Table insertion failed:", error);
						}
					}}
					className="p-1.5 rounded-xl text-zinc-600 hover:bg-zinc-100"
					title="Insert Table"
				>
					<TableIcon className="w-3.5 h-3.5" />
				</motion.button>
				<div className="w-px h-5 bg-zinc-200 mx-1" />
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => {
						editor.chain().focus().setDetails().run();
					}}
					className="p-1.5 rounded-xl text-zinc-600 hover:bg-zinc-100"
					title="Insert Toggle/Details"
				>
					<ChevronRight className="w-3.5 h-3.5" />
				</motion.button>
			</div>
			<div
				className="flex-1 overflow-y-auto relative"
				style={{ minHeight: "100%" }}
			>
				<EditorContent editor={editor} />

				{/* Slash Dropdown Menu (trigger: /) */}
				{editor && <SlashDropdownMenu editor={editor} />}

				{/* Bubble Menu */}
				{editor && (
					<BubbleMenu
						editor={editor}
						tippyOptions={{ duration: 100 }}
						className="bubble-menu"
						shouldShow={({ editor, view, state }) => {
							const { selection } = state;

							// Method 1: Check if selection is a NodeSelection (when clicking on atom nodes)
							if (selection.node) {
								const nodeType = selection.node.type.name;
								if (
									nodeType === "image" ||
									nodeType === "codeBlock" ||
									nodeType === "codeGroup" ||
									nodeType === "youtube" ||
									nodeType === "table" ||
									nodeType === "customTable" ||
									nodeType === "details" ||
									nodeType === "detailsSummary" ||
									nodeType === "detailsContent"
								) {
									return false;
								}
							}

							// Method 2: Check DOM for data-node-type attribute (simplest and most reliable)
							const domSelection = window.getSelection();
							if (domSelection && domSelection.rangeCount > 0) {
								const range = domSelection.getRangeAt(0);
								let element = range.commonAncestorContainer;

								// Get the actual element (might be a text node)
								if (element.nodeType !== Node.ELEMENT_NODE) {
									element = element.parentElement;
								}

								// Check if element or any parent has our data-node-type attribute
								while (element && element !== view.dom) {
									const nodeType = element.getAttribute?.("data-node-type");
									if (
										nodeType === "image" ||
										nodeType === "codeBlock" ||
										nodeType === "codeGroup" ||
										nodeType === "table" ||
										nodeType === "customTable"
									) {
										return false;
									}

									// Also check for NodeViewWrapper with our custom nodes
									if (element.classList?.contains("node-view-wrapper")) {
										const pos = view.posAtDOM(element, 0);
										if (pos !== null && pos !== undefined) {
											try {
												const resolvedPos = state.doc.resolve(pos);
												const nodeAtPos = resolvedPos.node();
												if (
													nodeAtPos &&
													(nodeAtPos.type.name === "image" ||
														nodeAtPos.type.name === "codeBlock" ||
														nodeAtPos.type.name === "codeGroup" ||
														nodeAtPos.type.name === "youtube" ||
														nodeAtPos.type.name === "table" ||
														nodeAtPos.type.name === "customTable" ||
														nodeAtPos.type.name === "details" ||
														nodeAtPos.type.name === "detailsSummary" ||
														nodeAtPos.type.name === "detailsContent")
												) {
													return false;
												}
											} catch (e) {
												// Ignore errors
											}
										}
									}

									element = element.parentElement;
									if (!element) break;
								}
							}

							// Method 3: Check if there's actually a text selection (not just a cursor)
							if (selection.from === selection.to) {
								return false;
							}

							// Method 4: Check nodes in the selection range
							const selectedNodeTypes = new Set();
							state.doc.nodesBetween(selection.from, selection.to, (node) => {
								if (node.isBlock) {
									selectedNodeTypes.add(node.type.name);
								}
							});

							if (
								selectedNodeTypes.has("image") ||
								selectedNodeTypes.has("codeBlock") ||
								selectedNodeTypes.has("codeGroup") ||
								selectedNodeTypes.has("youtube") ||
								selectedNodeTypes.has("table") ||
								selectedNodeTypes.has("customTable") ||
								selectedNodeTypes.has("details") ||
								selectedNodeTypes.has("detailsSummary") ||
								selectedNodeTypes.has("detailsContent")
							) {
								return false;
							}

							// Only show for actual text selections
							return true;
						}}
					>
						<div className="w-fit flex items-center gap-1 bg-white text-zinc-900 border border-zinc-200 rounded-xl shadow-lg p-1">
							{/* Bold */}
							<button
								onClick={() => editor.chain().focus().toggleBold().run()}
								className={`p-2 rounded transition-colors ${editor.isActive("bold")
										? "bg-zinc-300 text-zinc-900 font-bold"
										: "hover:bg-zinc-100 text-zinc-700"
									}`}
								title="Bold"
							>
								<Bold className="w-3 h-3" />
							</button>

							{/* Italic */}
							<button
								onClick={() => editor.chain().focus().toggleItalic().run()}
								className={`p-2 rounded transition-colors ${editor.isActive("italic")
										? "bg-zinc-300 text-zinc-900 font-bold"
										: "hover:bg-zinc-100 text-zinc-700"
									}`}
								title="Italic"
							>
								<Italic className="w-3 h-3" />
							</button>

							{/* Underline */}
							<button
								onClick={() => editor.chain().focus().toggleUnderline().run()}
								className={`p-2 rounded transition-colors ${editor.isActive("underline")
										? "bg-zinc-300 text-zinc-900 font-bold"
										: "hover:bg-zinc-100 text-zinc-700"
									}`}
								title="Underline"
							>
								<UnderlineIcon className="w-3 h-3" />
							</button>

							{/* Strikethrough */}
							<button
								onClick={() => editor.chain().focus().toggleStrike().run()}
								className={`p-2 rounded transition-colors ${editor.isActive("strike")
										? "bg-zinc-300 text-zinc-900 font-bold"
										: "hover:bg-zinc-100 text-zinc-700"
									}`}
								title="Strikethrough"
							>
								<Strikethrough className="w-3 h-3" />
							</button>

							{/* Inline Code */}
							<button
								onClick={() => editor.chain().focus().toggleCode().run()}
								className={`p-2 rounded transition-colors ${editor.isActive("code")
										? "bg-zinc-300 text-zinc-900 font-bold"
										: "hover:bg-zinc-100 text-zinc-700"
									}`}
								title="Inline code"
							>
								<Code className="w-3 h-3" />
							</button>

							{/* Link Dropdown */}
							<div className="relative" ref={linkInputRef}>
								<button
									onClick={() => {
										if (editor.isActive("link")) {
											editor.chain().focus().unsetLink().run();
										} else {
											setLinkDropdownOpen(!linkDropdownOpen);
											const url = editor.getAttributes("link").href || "";
											setLinkUrl(url);
										}
									}}
									className={`p-2 rounded transition-colors ${editor.isActive("link")
											? "bg-zinc-300 text-zinc-900 font-bold"
											: "hover:bg-zinc-100 text-zinc-700"
										}`}
									title="Link"
								>
									<LinkIcon className="w-3 h-3" />
								</button>
								<AnimatePresence>
									{linkDropdownOpen && (
										<motion.div
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											className="absolute top-full left-0 mb-1 bg-white border border-zinc-200 rounded shadow-lg z-50 p-2 min-w-[250px]"
										>
											<input
												type="text"
												value={linkUrl}
												onChange={(e) => setLinkUrl(e.target.value)}
												placeholder="Enter URL"
												className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-zinc-100 mb-2"
												autoFocus
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														if (linkUrl) {
															editor
																.chain()
																.focus()
																.extendMarkRange("link")
																.setLink({ href: linkUrl })
																.run();
														}
														setLinkDropdownOpen(false);
													} else if (e.key === "Escape") {
														setLinkDropdownOpen(false);
													}
												}}
											/>
											<div className="flex items-center gap-2">
												<button
													onClick={() => {
														if (linkUrl) {
															editor
																.chain()
																.focus()
																.extendMarkRange("link")
																.setLink({ href: linkUrl })
																.run();
														}
														setLinkDropdownOpen(false);
													}}
													className="flex-1 px-2 py-1 text-xs font-medium bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors"
												>
													Apply
												</button>
												<button
													onClick={() => {
														editor.chain().focus().unsetLink().run();
														setLinkDropdownOpen(false);
													}}
													className="px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
												>
													Remove
												</button>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>

							{/* Color Dropdown */}
							<div className="relative" ref={colorDropdownRef}>
								<button
									onClick={() => setColorDropdownOpen(!colorDropdownOpen)}
									className="p-2 rounded hover:bg-zinc-100 text-zinc-700 transition-colors"
									title="Text color"
								>
									<Palette className="w-3 h-3" />
								</button>
								<AnimatePresence>
									{colorDropdownOpen && (
										<motion.div
											initial={{ opacity: 0, y: -10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											className="absolute top-full left-0 mb-1 bg-white border border-zinc-200 rounded shadow-lg z-50 p-2 min-w-[150px]"
										>
											<div className="grid grid-cols-5 gap-1">
												{colors.map((color) => (
													<button
														key={color.value || "default"}
														onClick={() => {
															if (color.value) {
																editor
																	.chain()
																	.focus()
																	.setColor(color.value)
																	.run();
															} else {
																editor.chain().focus().unsetColor().run();
															}
															setColorDropdownOpen(false);
														}}
														className="flex flex-col items-center gap-1 p-1 hover:bg-zinc-100 rounded transition-colors"
													>
														<div
															className={`w-4 h-4 rounded border ${color.value ? "" : "bg-white border-zinc-300"
																}`}
															style={{
																backgroundColor: color.value || "transparent",
															}}
														/>
													</button>
												))}
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>

							{/* Text Type Dropdown */}
							<div className="relative" ref={textTypeDropdownRef}>
								<button
									onClick={() => setTextTypeDropdownOpen(!textTypeDropdownOpen)}
									className="flex w-fit min-w-32 items-center gap-2 p-1.5 text-xs font-medium hover:bg-zinc-100 rounded transition-colors text-zinc-700"
								>
									<Type className="w-3 h-3" />
									<span>
										{editor.isActive("heading", { level: 1 })
											? "Heading 1"
											: editor.isActive("heading", { level: 2 })
												? "Heading 2"
												: editor.isActive("orderedList")
													? "Ordered List"
													: editor.isActive("bulletList")
														? "Bullet List"
														: "Text"}
									</span>
									<ChevronDown className="w-3 h-3 text-zinc-600" />
								</button>
								<AnimatePresence>
									{textTypeDropdownOpen && (
										<motion.div
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: 10 }}
											className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 min-w-[180px]"
										>
											<button
												onClick={() => {
													editor.chain().focus().setParagraph().run();
													setTextTypeDropdownOpen(false);
												}}
												className={`w-full flex items-center gap-2 text-left p-1.5 rounded text-xs hover:bg-zinc-100 transition-colors ${!editor.isActive("heading") &&
														!editor.isActive("orderedList") &&
														!editor.isActive("bulletList")
														? "bg-zinc-300 font-bold"
														: ""
													}`}
											>
												<Type className="w-4 h-4 text-zinc-500" />
												Text
											</button>
											<button
												onClick={() => {
													editor
														.chain()
														.focus()
														.toggleHeading({ level: 1 })
														.run();
													setTextTypeDropdownOpen(false);
												}}
												className={`w-full flex items-center gap-2 text-left p-1.5 rounded text-xs hover:bg-zinc-100 transition-colors ${editor.isActive("heading", { level: 1 })
														? "bg-zinc-300 font-bold"
														: ""
													}`}
											>
												<Heading1 className="w-4 h-4 text-zinc-500" />
												Heading 1
											</button>
											<button
												onClick={() => {
													editor
														.chain()
														.focus()
														.toggleHeading({ level: 2 })
														.run();
													setTextTypeDropdownOpen(false);
												}}
												className={`w-full flex items-center gap-2 text-left p-1.5 rounded text-xs hover:bg-zinc-100 transition-colors ${editor.isActive("heading", { level: 2 })
														? "bg-zinc-300 font-bold"
														: ""
													}`}
											>
												<Heading2 className="w-4 h-4 text-zinc-500" />
												Heading 2
											</button>
											<div className="border-t border-zinc-200 my-1" />
											<button
												onClick={() => {
													editor.chain().focus().toggleOrderedList().run();
													setTextTypeDropdownOpen(false);
												}}
												className={`w-full flex items-center gap-2 text-left p-1.5 rounded text-xs hover:bg-zinc-100 transition-colors ${editor.isActive("orderedList")
														? "bg-zinc-300 font-bold"
														: ""
													}`}
											>
												<ListOrdered className="w-4 h-4 text-zinc-500" />
												Ordered List (ol)
											</button>
											<button
												onClick={() => {
													editor.chain().focus().toggleBulletList().run();
													setTextTypeDropdownOpen(false);
												}}
												className={`w-full flex items-center gap-2 text-left p-1.5 rounded text-xs hover:bg-zinc-100 transition-colors ${editor.isActive("bulletList")
														? "bg-zinc-300 font-bold"
														: ""
													}`}
											>
												<List className="w-4 h-4 text-zinc-500" />
												Bullet List (ul)
											</button>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						</div>
					</BubbleMenu>
				)}
			</div>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleImageUpload}
				style={{ display: "none" }}
			/>

			{/* YouTube Video Modal */}
			<AnimatePresence>
				{youtubeModalOpen && (
					<div
						className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
						onClick={() => {
							setYoutubeModalOpen(false);
							setYoutubeUrl("");
						}}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="bg-white rounded-xl shadow-xl p-4 max-w-md w-full mx-4"
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="font-semibold text-zinc-900 mb-4">
								Insert YouTube Video
							</h3>
							<input
								ref={youtubeInputRef}
								type="text"
								value={youtubeUrl}
								onChange={(e) => setYoutubeUrl(e.target.value)}
								placeholder="Paste YouTube URL or video ID"
								className="w-full p-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 mb-4"
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleYoutubeInsert();
									} else if (e.key === "Escape") {
										setYoutubeModalOpen(false);
										setYoutubeUrl("");
									}
								}}
								autoFocus
							/>
							<div className="flex items-center gap-2">
								<button
									onClick={handleYoutubeInsert}
									className="flex-1 p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium"
								>
									Insert
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default TiptapEditor;
