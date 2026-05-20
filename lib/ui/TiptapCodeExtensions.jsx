import React, { useState, useRef, useEffect } from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import {
	Copy,
	X,
	ChevronDown,
	Check,
	Plus,
	MoreVertical,
	Files,
	TrashIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

// Languages list
const LANGUAGES = [
	{ value: "javascript", label: "JavaScript" },
	{ value: "typescript", label: "TypeScript" },
	{ value: "html", label: "HTML" },
	{ value: "css", label: "CSS" },
	{ value: "rust", label: "Rust" },
	{ value: "go", label: "Go" },
	{ value: "golang", label: "Golang" },
	{ value: "cpp", label: "C++" },
	{ value: "python", label: "Python" },
	{ value: "java", label: "Java" },
	{ value: "php", label: "PHP" },
	{ value: "ruby", label: "Ruby" },
	{ value: "swift", label: "Swift" },
	{ value: "kotlin", label: "Kotlin" },
	{ value: "json", label: "JSON" },
	{ value: "xml", label: "XML" },
	{ value: "yaml", label: "YAML" },
	{ value: "markdown", label: "Markdown" },
	{ value: "bash", label: "Bash" },
	{ value: "shell", label: "Shell" },
	{ value: "sql", label: "SQL" },
	{ value: "graphql", label: "GraphQL" },
	{ value: "dockerfile", label: "Dockerfile" },
	{ value: "text", label: "Text" },
];

// CodeBlock Component
const CodeBlockComponent = ({
	node,
	updateAttributes,
	getPos,
	editor,
}) => {
	const [language, setLanguage] = useState(node.attrs.language || "text");
	const [code, setCode] = useState(node.attrs.code || "");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const dropdownRef = useRef(null);

	const deleteNode = () => {
		if (typeof getPos === "function") {
			const pos = getPos();
			if (pos !== null && pos !== undefined) {
				editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
			}
		}
	};

	// Sync with node attributes when node changes
	useEffect(() => {
		setLanguage(node.attrs.language || "text");
		setCode(node.attrs.code || "");
	}, [node.attrs.language, node.attrs.code]);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleLanguageChange = (lang) => {
		setLanguage(lang);
		updateAttributes({ language: lang });
		setIsDropdownOpen(false);
	};

	const handleCodeChange = (newCode) => {
		setCode(newCode);
		updateAttributes({ code: newCode });
	};

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			toast.success("Code copied to clipboard!");
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			toast.error("Failed to copy code");
		}
	};

	return (
		<NodeViewWrapper
			className={`my-4 `}
			data-node-type="codeBlock"
			onClick={(e) => {
				// Only select if clicking on the wrapper itself, not on interactive elements
				if (
					e.target === e.currentTarget ||
					(!e.target.closest("button") &&
						!e.target.closest("input") &&
						!e.target.closest("textarea"))
				) {
					e.preventDefault();
					e.stopPropagation();
					if (typeof getPos === "function") {
						const pos = getPos();
						if (pos !== null && pos !== undefined) {
							editor.commands.setNodeSelection(pos);
						}
					}
				}
			}}
		>
			<div className="rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden">
				{/* Code Editor */}
				<div className="relative bg-white">
					<textarea
						value={code}
						onChange={(e) => handleCodeChange(e.target.value)}
						placeholder="Enter your code here..."
						className="w-full px-4 py-3 text-sm font-mono bg-transparent resize-none focus:outline-none text-zinc-900"
						style={{ minHeight: "100px" }}
						onKeyDown={(e) => {
							if (e.key === "Tab") {
								e.preventDefault();
								const start = e.target.selectionStart;
								const end = e.target.selectionEnd;
								const newCode =
									code.substring(0, start) + "  " + code.substring(end);
								handleCodeChange(newCode);
								setTimeout(() => {
									e.target.selectionStart = e.target.selectionEnd = start + 2;
								}, 0);
							}
						}}
					/>
					{/* Language Selector, Copy, and Options - Bottom Right */}
					<div className="absolute top-2 right-2 flex items-center gap-1.5">
						<div className="relative" ref={dropdownRef}>
							<button
								onClick={() => setIsDropdownOpen(!isDropdownOpen)}
								className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors border border-zinc-200"
							>
								<span>
									{LANGUAGES.find((l) => l.value === language)?.label || "Text"}
								</span>
								<ChevronDown
									className={`w-3 h-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""
										}`}
								/>
							</button>
							<AnimatePresence>
								{isDropdownOpen && (
									<motion.div
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -10 }}
										className="absolute top-full right-0 mb-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto min-w-[150px]"
									>
										{LANGUAGES.map((lang) => (
											<button
												key={lang.value}
												onClick={() => handleLanguageChange(lang.value)}
												className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 transition-colors ${language === lang.value
														? "bg-zinc-100 font-medium"
														: ""
													}`}
											>
												{lang.label}
											</button>
										))}
									</motion.div>
								)}
							</AnimatePresence>
						</div>
						<button
							onClick={handleCopy}
							className="p-1.5 text-zinc-600 hover:bg-zinc-200 rounded-full transition-colors bg-zinc-100 border border-zinc-200"
							title="Copy code"
						>
							{copied ? (
								<Check className="w-3.5 h-3.5 text-green-600" />
							) : (
								<Copy className="w-3.5 h-3.5" />
							)}
						</button>
						<button
							onClick={deleteNode}
							className="p-1.5 text-zinc-600 hover:bg-zinc-200 rounded-full transition-colors bg-zinc-100 border border-zinc-200"
							title="More options"
						>
							<TrashIcon className="w-3.5 h-3.5 text-red-400" />
						</button>
					</div>
				</div>
			</div>
		</NodeViewWrapper>
	);
};

// CodeBlockItem Component (for CodeGroup)
const CodeBlockItem = ({
	code,
	language,
	name,
	onCodeChange,
	onLanguageChange,
	onNameChange,
	onDelete,
}) => {
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const dropdownRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setIsDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			toast.success("Code copied to clipboard!");
			setTimeout(() => setCopied(false), 2000);
		} catch (error) {
			toast.error("Failed to copy code");
		}
	};

	return (
		<div className="relative bg-white rounded-xl">
			{/* Code Editor */}
			<div className="relative">
				<textarea
					value={code}
					onChange={(e) => onCodeChange(e.target.value)}
					placeholder="Enter your code here..."
					className="w-full px-4 py-3 text-sm font-mono bg-transparent resize-none focus:outline-none text-zinc-900"
					style={{ minHeight: "100px" }}
					onKeyDown={(e) => {
						if (e.key === "Tab") {
							e.preventDefault();
							const start = e.target.selectionStart;
							const end = e.target.selectionEnd;
							const newCode =
								code.substring(0, start) + "  " + code.substring(end);
							onCodeChange(newCode);
							setTimeout(() => {
								e.target.selectionStart = e.target.selectionEnd = start + 2;
							}, 0);
						}
					}}
				/>
				{/* Language Selector, Copy, and Options - Bottom Right */}
				<div className="absolute top-2 right-2 flex items-center gap-1.5">
					<div className="relative" ref={dropdownRef}>
						<button
							onClick={() => setIsDropdownOpen(!isDropdownOpen)}
							className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors border border-zinc-200"
						>
							<span>
								{LANGUAGES.find((l) => l.value === language)?.label || "Text"}
							</span>
							<ChevronDown
								className={`w-3 h-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""
									}`}
							/>
						</button>
						<AnimatePresence>
							{isDropdownOpen && (
								<motion.div
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -10 }}
									className="absolute top-full right-0 mb-1 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto min-w-[150px]"
								>
									{LANGUAGES.map((lang) => (
										<button
											key={lang.value}
											onClick={() => {
												onLanguageChange(lang.value);
												setIsDropdownOpen(false);
											}}
											className={`w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-100 transition-colors ${language === lang.value ? "bg-zinc-100 font-medium" : ""
												}`}
										>
											{lang.label}
										</button>
									))}
								</motion.div>
							)}
						</AnimatePresence>
					</div>
					<button
						onClick={handleCopy}
						className="p-1.5 text-zinc-600 hover:bg-zinc-200 rounded-full transition-colors bg-zinc-100 border border-zinc-200"
						title="Copy code"
					>
						{copied ? (
							<Check className="w-3.5 h-3.5 text-green-600" />
						) : (
							<Copy className="w-3.5 h-3.5" />
						)}
					</button>
					{onDelete && (
						<button
							onClick={onDelete}
							className="p-1.5 text-zinc-600 hover:bg-zinc-200 rounded-full transition-colors bg-zinc-100 border border-zinc-200"
							title="More options"
						>
							<TrashIcon className="w-3.5 h-3.5 text-red-400" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

// CodeGroup: ensure every tab has ≥1 code block (avoids empty first panel).
function normalizeCodeGroupTabs(raw) {
	const block = (id) => ({
		id,
		name: "",
		code: "",
		language: "text",
	});
	const tab = (idx, idBase = Date.now()) => ({
		id: idBase + idx,
		name: `Tab ${idx + 1}`,
		code: "",
		language: "text",
		codeBlocks: [block(idBase + idx * 100 + 1)],
	});
	if (!raw || !Array.isArray(raw) || raw.length === 0) return [tab(0)];
	return raw.map((t, i) => {
		let blocks = t.codeBlocks;
		if (!Array.isArray(blocks) || blocks.length === 0) {
			blocks = [block((t.id || Date.now()) + i + 1)];
		}
		return { ...t, codeBlocks: blocks };
	});
}

// CodeGroup Component
const CodeGroupComponent = ({
	node,
	updateAttributes,
	selected,
	getPos,
	editor,
}) => {
	const nodeTabsKey = JSON.stringify(node.attrs.tabs ?? []);

	const [tabs, setTabs] = useState(() =>
		normalizeCodeGroupTabs(node.attrs.tabs),
	);

	const tabCount = tabs.length;
	const rawActive = node.attrs.activeTabIndex ?? 0;
	const activeTab = Math.min(
		Math.max(0, rawActive),
		Math.max(0, tabCount - 1),
	);

	const selectCodeTab = (index) => {
		const next = Math.min(Math.max(0, index), Math.max(0, tabCount - 1));
		updateAttributes({ activeTabIndex: next });
	};

	useEffect(() => {
		setTabs(normalizeCodeGroupTabs(node.attrs.tabs));
	}, [nodeTabsKey]);

	useEffect(() => {
		if (rawActive !== activeTab && tabCount > 0) {
			updateAttributes({ activeTabIndex: activeTab });
		}
	}, [rawActive, activeTab, tabCount, updateAttributes]);

	useEffect(() => {
		const next = normalizeCodeGroupTabs(tabs);
		if (JSON.stringify(next) === JSON.stringify(node.attrs.tabs)) return;
		updateAttributes({ tabs: next });
	}, [tabs, updateAttributes, node.attrs.tabs]);

	const deleteNode = () => {
		if (typeof getPos === "function") {
			const pos = getPos();
			if (pos !== null && pos !== undefined) {
				editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
			}
		}
	};

	const addTab = () => {
		const newTab = {
			id: Date.now(),
			name: `Tab ${tabs.length + 1}`,
			code: "",
			language: "text",
			codeBlocks: [
				{ id: Date.now() + 1, name: "", code: "", language: "text" },
			],
		};
		setTabs([...tabs, newTab]);
		selectCodeTab(tabs.length);
	};

	const removeTab = (tabId) => {
		if (tabs.length === 1) return;
		const removedIndex = tabs.findIndex((tab) => tab.id === tabId);
		const newTabs = tabs.filter((tab) => tab.id !== tabId);
		setTabs(newTabs);
		let nextActive = activeTab;
		if (removedIndex >= 0 && removedIndex < activeTab) {
			nextActive = activeTab - 1;
		} else if (removedIndex === activeTab) {
			nextActive = Math.min(activeTab, newTabs.length - 1);
		}
		selectCodeTab(Math.max(0, nextActive));
	};

	const updateTabName = (tabId, name) => {
		setTabs(tabs.map((tab) => (tab.id === tabId ? { ...tab, name } : tab)));
	};

	const addCodeBlock = (tabId) => {
		setTabs(
			tabs.map((tab) =>
				tab.id === tabId
					? {
						...tab,
						codeBlocks: [
							...tab.codeBlocks,
							{ id: Date.now(), name: "", code: "", language: "text" },
						],
					}
					: tab
			)
		);
	};

	const removeCodeBlock = (tabId, blockId) => {
		setTabs(
			tabs.map((tab) =>
				tab.id === tabId
					? {
						...tab,
						codeBlocks: tab.codeBlocks.filter(
							(block) => block.id !== blockId
						),
					}
					: tab
			)
		);
	};

	const updateCodeBlock = (tabId, blockId, updates) => {
		setTabs(
			tabs.map((tab) =>
				tab.id === tabId
					? {
						...tab,
						codeBlocks: tab.codeBlocks.map((block) =>
							block.id === blockId ? { ...block, ...updates } : block
						),
					}
					: tab
			)
		);
	};

	const currentTab = tabs[activeTab];

	return (
		<NodeViewWrapper className="my-4" data-node-type="codeGroup">
			<div className="rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden">
				{/* Tabs Header */}
				<div
					className="flex items-center justify-between px-3 pt-2 bg-transparent border-b border-zinc-200"
					data-ink-tab-chrome
					contentEditable={false}
				>
					<div className="flex items-center gap-0.5 overflow-x-auto flex-1">
						{tabs.map((tab, index) => (
							<div
								key={tab.id}
								role="tab"
								aria-selected={activeTab === index}
								className={`flex items-center gap-1 shrink-0 px-1 py-1.5 text-xs font-medium transition-colors relative rounded-t-md min-w-[88px] max-w-[200px] ${
									activeTab === index
										? "text-zinc-900 bg-white"
										: "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
								}`}
								onPointerDown={(e) => {
									if (e.target.closest("input, button")) return;
									e.preventDefault();
									e.stopPropagation();
									selectCodeTab(index);
								}}
							>
								<input
									type="text"
									key={`code-tab-${tab.id}-${tab.name}`}
									defaultValue={tab.name}
									onBlur={(e) => {
										const next = e.target.value.trim();
										if (next) updateTabName(tab.id, next);
									}}
									onPointerDown={(e) => e.stopPropagation()}
									onMouseDown={(e) => e.stopPropagation()}
									onClick={(e) => {
										e.stopPropagation();
										if (activeTab !== index) selectCodeTab(index);
									}}
									onFocus={() => {
										if (activeTab !== index) selectCodeTab(index);
									}}
									className="flex-1 min-w-0 px-2 py-0.5 text-xs font-medium bg-transparent border-none outline-none"
									aria-label={`Tab ${index + 1} name`}
								/>
								<button
									type="button"
									onPointerDown={(e) => e.stopPropagation()}
									onMouseDown={(e) => e.stopPropagation()}
									onClick={(e) => {
										e.stopPropagation();
										removeTab(tab.id);
									}}
									className="p-0.5 hover:bg-zinc-200 rounded transition-colors shrink-0"
									title="Remove tab"
								>
									<X className="w-3 h-3" />
								</button>
								{activeTab === index && (
									<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 pointer-events-none" />
								)}
							</div>
						))}
						<button
							type="button"
							onPointerDown={(e) => e.stopPropagation()}
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation();
								addTab();
							}}
							className="p-1.5 text-zinc-600 hover:bg-zinc-200 rounded transition-colors ml-1 shrink-0"
							title="Add tab"
						>
							<Plus className="w-3.5 h-3.5" />
						</button>
					</div>
					<div className="flex items-center gap-1 ml-2">
						<button
							type="button"
							onPointerDown={(e) => e.stopPropagation()}
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation();
								if (currentTab) {
									const newTab = {
										...currentTab,
										id: Date.now(),
										name: `${currentTab.name} (copy)`,
									};
									setTabs([...tabs, newTab]);
									selectCodeTab(tabs.length);
								}
							}}
							className="p-1.5 text-zinc-600 hover:bg-zinc-200 rounded transition-colors"
							title="Duplicate tab"
						>
							<Files className="w-3.5 h-3.5" />
						</button>
						<button
							type="button"
							onPointerDown={(e) => e.stopPropagation()}
							onMouseDown={(e) => e.stopPropagation()}
							onClick={(e) => {
								e.stopPropagation();
								deleteNode();
							}}
							className="p-1.5 text-zinc-600 hover:bg-red-50 hover:text-red-600 rounded transition-colors"
							title="Delete code group"
						>
							<TrashIcon className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>

				{/* Tab Content */}
				{currentTab && (currentTab.codeBlocks?.length ?? 0) > 0 && (
					<div className="p-3 space-y-1 bg-white">
						{(currentTab.codeBlocks ?? []).map((block) => (
							<CodeBlockItem
								key={block.id}
								code={block.code}
								language={block.language}
								name={block.name}
								onCodeChange={(code) =>
									updateCodeBlock(currentTab.id, block.id, { code })
								}
								onLanguageChange={(language) =>
									updateCodeBlock(currentTab.id, block.id, { language })
								}
								onNameChange={(name) =>
									updateCodeBlock(currentTab.id, block.id, { name })
								}
								onDelete={() => removeCodeBlock(currentTab.id, block.id)}
							/>
						))}
					</div>
				)}
			</div>
		</NodeViewWrapper>
	);
};

// CodeBlock Extension
export const CodeBlock = Node.create({
	name: "codeBlock",
	group: "block",
	atom: true,
	attrs: {
		language: { default: "text" },
		code: { default: "" },
	},
	parseHTML() {
		return [{ tag: 'div[data-type="code-block"]' }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, { "data-type": "code-block" }),
		];
	},
	addNodeView() {
		return ReactNodeViewRenderer(CodeBlockComponent);
	},
});

// CodeGroup Extension
export const CodeGroup = Node.create({
	name: "codeGroup",
	group: "block",
	atom: true,
	attrs: {
		activeTabIndex: { default: 0 },
		tabs: {
			default: [
				{
					id: Date.now(),
					name: "Tab 1",
					codeBlocks: [
						{ id: Date.now() + 1, name: "", code: "", language: "text" },
					],
				},
			],
		},
	},
	parseHTML() {
		return [{ tag: 'div[data-type="code-group"]' }];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			"div",
			mergeAttributes(HTMLAttributes, { "data-type": "code-group" }),
		];
	},
	addNodeView() {
		return ReactNodeViewRenderer(CodeGroupComponent, {
			stopEvent: (event) => {
				const t = event.target;
				return Boolean(
					t &&
						typeof t.closest === "function" &&
						t.closest("[data-ink-tab-chrome]"),
				);
			},
		});
	},
});

// Export components for use in extensions
export { CodeBlockComponent, CodeGroupComponent };
