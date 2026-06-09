import { useState, useRef, useEffect } from "react";

/* ─── Curated emoji set ─── */
const EMOJI_GROUPS = [
	{
		label: "Common",
		items: [
			"✨","🎯","🚀","💡","📝","🔗","📦","⚡","🔍","📤","🖼️","💬","🎨","🛠️",
			"📊","🔒","🌍","🤖","✅","⭐","🎉","💎","🔥","🧩","📌","🏆","💰","🎓",
			"📅","❤️","⚙️","🧠","🌱","📣","🎁","🔔","🎤","🏅","💻","🔑","🎪","🏗️",
		],
	},
	{
		label: "People",
		items: ["👋","👍","👎","✊","🤝","🙌","👏","🤔","😊","😎","🥳","🤩","😍","🧑‍💻"],
	},
	{
		label: "Nature",
		items: ["🌟","🌈","☀️","🌙","⛅","🌊","🌸","🍀","🌿","🦋","🐝","🦊","🌲","🏔️"],
	},
	{
		label: "Objects",
		items: ["📱","🖥️","⌨️","🖱️","📷","🎥","🎙️","📡","🔭","🧪","💊","🧲","🔋","🗂️"],
	},
	{
		label: "Symbols",
		items: ["♾️","✔️","❌","⚠️","ℹ️","💯","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪"],
	},
];

/* ─── Curated lucide icon set: { name, label, path } ─── */
export const LUCIDE_ICONS = [
	{ name: "star",           label: "Star",           path: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
	{ name: "heart",          label: "Heart",          path: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" },
	{ name: "zap",            label: "Zap",            path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
	{ name: "rocket",         label: "Rocket",         path: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0 M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" },
	{ name: "check",          label: "Check",          path: "M20 6L9 17l-5-5" },
	{ name: "x",              label: "X",              path: "M18 6L6 18M6 6l12 12" },
	{ name: "plus",           label: "Plus",           path: "M12 5v14M5 12h14" },
	{ name: "minus",          label: "Minus",          path: "M5 12h14" },
	{ name: "search",         label: "Search",         path: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" },
	{ name: "settings",       label: "Settings",       path: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" },
	{ name: "user",           label: "User",           path: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
	{ name: "users",          label: "Users",          path: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
	{ name: "home",           label: "Home",           path: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" },
	{ name: "mail",           label: "Mail",           path: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" },
	{ name: "phone",          label: "Phone",          path: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" },
	{ name: "calendar",       label: "Calendar",       path: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" },
	{ name: "clock",          label: "Clock",          path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2" },
	{ name: "lock",           label: "Lock",           path: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4" },
	{ name: "key",            label: "Key",            path: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" },
	{ name: "globe",          label: "Globe",          path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" },
	{ name: "map-pin",        label: "Location",       path: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
	{ name: "link",           label: "Link",           path: "M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3 M8 12h8" },
	{ name: "code",           label: "Code",           path: "M16 18l6-6-6-6 M8 6l-6 6 6 6" },
	{ name: "terminal",       label: "Terminal",       path: "M4 17l6-6-6-6 M12 19h8" },
	{ name: "cpu",            label: "CPU",            path: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" },
	{ name: "database",       label: "Database",       path: "M12 2C6.48 2 2 4.02 2 6.5S6.48 11 12 11s10-2.02 10-4.5S17.52 2 12 2z M2 6.5v5C2 13.98 6.48 16 12 16s10-2.02 10-4.5v-5 M2 11.5v5C2 18.98 6.48 21 12 21s10-2.02 10-4.5v-5" },
	{ name: "cloud",          label: "Cloud",          path: "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" },
	{ name: "download",       label: "Download",       path: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" },
	{ name: "upload",         label: "Upload",         path: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12" },
	{ name: "share",          label: "Share",          path: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8 M16 6l-4-4-4 4 M12 2v13" },
	{ name: "edit",           label: "Edit",           path: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" },
	{ name: "trash",          label: "Trash",          path: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" },
	{ name: "copy",           label: "Copy",           path: "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4H8z M14 2v6h6 M8 12h8 M8 16h5" },
	{ name: "file-text",      label: "Document",       path: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" },
	{ name: "folder",         label: "Folder",         path: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" },
	{ name: "image",          label: "Image",          path: "M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 15l-5-5L5 21" },
	{ name: "video",          label: "Video",          path: "M23 7l-7 5 7 5V7z M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2 wait no M1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1V5z" },
	{ name: "mic",            label: "Mic",            path: "M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 23h8" },
	{ name: "volume",         label: "Volume",         path: "M11 5L6 9H2v6h4l5 4V5z M15.54 8.46a5 5 0 0 1 0 7.07 M19.07 4.93a10 10 0 0 1 0 14.14" },
	{ name: "music",          label: "Music",          path: "M9 18V5l12-2v13 M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
	{ name: "bar-chart",      label: "Bar Chart",      path: "M12 20V10 M18 20V4 M6 20v-4" },
	{ name: "pie-chart",      label: "Pie Chart",      path: "M21.21 15.89A10 10 0 1 1 8 2.83 M22 12A10 10 0 0 0 12 2v10z" },
	{ name: "trending-up",    label: "Trending Up",    path: "M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6" },
	{ name: "layers",         label: "Layers",         path: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5" },
	{ name: "grid",           label: "Grid",           path: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z" },
	{ name: "layout",         label: "Layout",         path: "M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z M3 9h18 M9 21V9" },
	{ name: "box",            label: "Box",            path: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" },
	{ name: "package",        label: "Package",        path: "M16.5 9.4l-9-5.19 M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12" },
	{ name: "tag",            label: "Tag",            path: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z M7 7h.01" },
	{ name: "flag",           label: "Flag",           path: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7" },
	{ name: "bookmark",       label: "Bookmark",       path: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" },
	{ name: "award",          label: "Award",          path: "M8.21 13.89L7 23l5-3 5 3-1.21-9.12 M12 2a7 7 0 1 0 0 14A7 7 0 0 0 12 2z" },
	{ name: "gift",           label: "Gift",           path: "M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" },
	{ name: "target",         label: "Target",         path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" },
	{ name: "shield",         label: "Shield",         path: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
	{ name: "alert-circle",   label: "Alert",          path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 8v4 M12 16h.01" },
	{ name: "info",           label: "Info",           path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01" },
	{ name: "help-circle",    label: "Help",           path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01" },
	{ name: "bell",           label: "Bell",           path: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" },
	{ name: "message-square", label: "Message",        path: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
	{ name: "send",           label: "Send",           path: "M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z" },
	{ name: "refresh-cw",     label: "Refresh",        path: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15" },
	{ name: "activity",       label: "Activity",       path: "M22 12h-4l-3 9L9 3l-3 9H2" },
	{ name: "wifi",           label: "Wifi",           path: "M5 12.55a11 11 0 0 1 14.08 0 M1.42 9a16 16 0 0 1 21.16 0 M8.53 16.11a6 6 0 0 1 6.95 0 M12 20h.01" },
	{ name: "battery",        label: "Battery",        path: "M23 7h-1a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1 M7 7H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4 M7 12h9" },
	{ name: "sun",            label: "Sun",            path: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42" },
	{ name: "moon",           label: "Moon",           path: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" },
	{ name: "book",           label: "Book",           path: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" },
	{ name: "pen",            label: "Pen",            path: "M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" },
	{ name: "type",           label: "Text",           path: "M4 7V4h16v3 M9 20h6 M12 4v16" },
	{ name: "align-left",     label: "Align Left",     path: "M17 10H3 M21 6H3 M21 14H3 M17 18H3" },
	{ name: "list",           label: "List",           path: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
	{ name: "check-square",   label: "Checkbox",       path: "M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
	{ name: "table",          label: "Table",          path: "M3 3h18v4H3V3z M3 11h18v4H3z M3 19h18v4H3z M9 3v18 M15 3v18" },
	{ name: "external-link",  label: "External Link",  path: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6 M15 3h6v6 M10 14L21 3" },
	{ name: "arrow-right",    label: "Arrow Right",    path: "M5 12h14 M12 5l7 7-7 7" },
	{ name: "arrow-up",       label: "Arrow Up",       path: "M12 19V5 M5 12l7-7 7 7" },
	{ name: "chevron-right",  label: "Chevron Right",  path: "M9 18l6-6-6-6" },
	{ name: "loader",         label: "Loader",         path: "M12 2v4 M12 18v4 M4.93 4.93l2.83 2.83 M16.24 16.24l2.83 2.83 M2 12h4 M18 12h4 M4.93 19.07l2.83-2.83 M16.24 7.76l2.83-2.83" },
	{ name: "sparkles",       label: "Sparkles",       path: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" },
	{ name: "wand",           label: "Magic Wand",     path: "M15 4V2 M15 16v-2 M8 9h2 M20 9h2 M17.8 11.8L19 13 M15 9h.01 M17.8 6.2L19 5 M3 21l9-9 M12.2 6.2L11 5" },
];

/* ─── Build SVG string for insertion into contentEditable ─── */
export function lucideToSvgString(icon, size = 22, color = "#37352F") {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;flex-shrink:0" data-lucide="${icon.name}"><path d="${icon.path}"/></svg>`;
}

/* ─── Main component ─── */
export default function IconSelectorDropdown({ onSelect, onClose, style = {} }) {
	const [tab, setTab] = useState("emoji"); // "emoji" | "icons"
	const [search, setSearch] = useState("");
	const searchRef = useRef(null);
	const allEmojis = EMOJI_GROUPS.flatMap((g) => g.items);

	useEffect(() => {
		setTimeout(() => searchRef.current?.focus(), 60);
	}, []);

	const q = search.trim().toLowerCase();

	const filteredEmojis = q
		? allEmojis.filter((e) => {
				const name = e.codePointAt(0)?.toString(16) || "";
				return name.includes(q) || e.includes(q);
			})
		: null;

	const filteredIcons = q
		? LUCIDE_ICONS.filter(
				(i) =>
					i.label.toLowerCase().includes(q) ||
					i.name.toLowerCase().includes(q),
			)
		: LUCIDE_ICONS;

	return (
		<div
			style={{
				width: 280,
				background: "#FFFFFF",
				border: "1px solid #E8E4DC",
				borderRadius: 14,
				boxShadow: "0 12px 36px rgba(0,0,0,0.14)",
				display: "flex",
				flexDirection: "column",
				maxHeight: 380,
				overflow: "hidden",
				fontFamily: "'Comic', sans-serif",
				...style,
			}}
		>
			{/* Search */}
			<div
				style={{
					padding: "10px 10px 6px",
					borderBottom: "1px solid #F0ECE5",
					flexShrink: 0,
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 6,
						background: "#F7F5F0",
						border: "1px solid #E8E4DC",
						borderRadius: 8,
						padding: "5px 9px",
					}}
				>
					<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9A9490" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
						<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
					</svg>
					<input
						ref={searchRef}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search icons & emojis…"
						style={{
							flex: 1,
							background: "none",
							border: "none",
							outline: "none",
							fontSize: 12,
							color: "#37352F",
						}}
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch("")}
							style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "#9A9490", fontSize: 13, lineHeight: 1 }}
						>
							✕
						</button>
					)}
				</div>
			</div>

			{/* Tabs */}
			{!q && (
				<div
					style={{
						display: "flex",
						gap: 4,
						padding: "6px 10px 0",
						flexShrink: 0,
					}}
				>
					{[["emoji", "Emoji"], ["icons", "Icons"]].map(([key, label]) => (
						<button
							key={key}
							type="button"
							onClick={() => setTab(key)}
							style={{
								flex: 1,
								background: tab === key ? "#FEF3E2" : "transparent",
								border: `1px solid ${tab === key ? "#F6D9A8" : "transparent"}`,
								borderRadius: 7,
								padding: "5px 8px",
								fontSize: 11,
								fontWeight: 700,
								color: tab === key ? "#92400E" : "#9A9490",
								cursor: "pointer",
							}}
						>
							{label}
						</button>
					))}
				</div>
			)}

			{/* Content */}
			<div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 10px" }}>
				{/* ── Emojis ── */}
				{(tab === "emoji" || q) && (
					<>
						{q ? (
							<div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
								{(filteredEmojis ?? allEmojis).map((em) => (
									<EmojiBtn key={em} em={em} onSelect={onSelect} onClose={onClose} />
								))}
							</div>
						) : (
							EMOJI_GROUPS.map((g) => (
								<div key={g.label} style={{ marginBottom: 8 }}>
									<p style={{ fontSize: 9, fontWeight: 700, color: "#B0AAA3", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4, paddingLeft: 2 }}>
										{g.label}
									</p>
									<div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
										{g.items.map((em) => (
											<EmojiBtn key={em} em={em} onSelect={onSelect} onClose={onClose} />
										))}
									</div>
								</div>
							))
						)}
					</>
				)}

				{/* ── Lucide Icons ── */}
				{(tab === "icons" || q) && (
					<div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginTop: q && tab === "emoji" ? 8 : 0 }}>
						{filteredIcons.map((icon) => (
							<button
								key={icon.name}
								type="button"
								title={icon.label}
								onClick={() => {
									onSelect({ type: "lucide", icon });
									onClose?.();
								}}
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									gap: 3,
									padding: "7px 4px 5px",
									border: "1px solid transparent",
									borderRadius: 8,
									background: "none",
									cursor: "pointer",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.background = "#F7F5F0";
									e.currentTarget.style.borderColor = "#E8E4DC";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.background = "none";
									e.currentTarget.style.borderColor = "transparent";
								}}
							>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#6B6560"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d={icon.path} />
								</svg>
								<span style={{ fontSize: 8.5, color: "#9A9490", textAlign: "center", lineHeight: 1.2, maxWidth: 44, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
									{icon.label}
								</span>
							</button>
						))}
					</div>
				)}

				{filteredEmojis?.length === 0 && filteredIcons.length === 0 && (
					<p style={{ fontSize: 12, color: "#B0AAA3", textAlign: "center", padding: "16px 0" }}>No results for "{search}"</p>
				)}
			</div>
		</div>
	);
}

function EmojiBtn({ em, onSelect, onClose }) {
	return (
		<button
			type="button"
			onClick={() => {
				onSelect({ type: "emoji", value: em });
				onClose?.();
			}}
			style={{
				background: "none",
				border: "1px solid transparent",
				fontSize: 20,
				cursor: "pointer",
				padding: "4px 5px",
				borderRadius: 7,
				lineHeight: 1,
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.background = "#F7F5F0";
				e.currentTarget.style.borderColor = "#E8E4DC";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.background = "none";
				e.currentTarget.style.borderColor = "transparent";
			}}
		>
			{em}
		</button>
	);
}
