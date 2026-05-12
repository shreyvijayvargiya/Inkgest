import React, { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEK_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function formatInkDateLong(d) {
	if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
	return d.toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

function parseInkDateInput(str) {
	if (!str?.trim()) return null;
	const parsed = Date.parse(str);
	if (!Number.isNaN(parsed)) return new Date(parsed);
	return null;
}

function startOfMonth(d) {
	return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d, delta) {
	return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function sameDay(a, b) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/**
 * Lightweight month calendar (Notion-style) for slash / @today flows.
 */
export function TiptapSlashDatePicker({
	initialDate = new Date(),
	onSelect,
	onClose,
	className = "",
}) {
	const [viewMonth, setViewMonth] = useState(() => startOfMonth(initialDate));
	const [inputValue, setInputValue] = useState(() => formatInkDateLong(initialDate));
	const [selected, setSelected] = useState(() => new Date(initialDate));

	const monthLabel = useMemo(
		() =>
			viewMonth.toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			}),
		[viewMonth],
	);

	const weeks = useMemo(() => {
		const first = startOfMonth(viewMonth);
		const startWeekday = first.getDay();
		const daysInMonth = new Date(
			viewMonth.getFullYear(),
			viewMonth.getMonth() + 1,
			0,
		).getDate();
		const prevMonthDays = new Date(
			viewMonth.getFullYear(),
			viewMonth.getMonth(),
			0,
		).getDate();

		const cells = [];
		let i = 0;
		for (; i < startWeekday; i += 1) {
			const dayNum = prevMonthDays - startWeekday + i + 1;
			cells.push({
				key: `p-${dayNum}`,
				date: new Date(
					viewMonth.getFullYear(),
					viewMonth.getMonth() - 1,
					dayNum,
				),
				muted: true,
			});
		}
		for (let d = 1; d <= daysInMonth; d += 1) {
			cells.push({
				key: `c-${d}`,
				date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d),
				muted: false,
			});
		}
		let next = 1;
		while (cells.length % 7 !== 0 || cells.length < 42) {
			cells.push({
				key: `n-${next}`,
				date: new Date(
					viewMonth.getFullYear(),
					viewMonth.getMonth() + 1,
					next,
				),
				muted: true,
			});
			next += 1;
		}
		const rows = [];
		for (let r = 0; r < cells.length; r += 7) {
			rows.push(cells.slice(r, r + 7));
		}
		return rows;
	}, [viewMonth]);

	const applyDate = useCallback(
		(d) => {
			if (!d || Number.isNaN(d.getTime())) return;
			setSelected(d);
			setInputValue(formatInkDateLong(d));
			setViewMonth(startOfMonth(d));
			onSelect?.(d);
		},
		[onSelect],
	);

	const handleInputBlur = useCallback(() => {
		const d = parseInkDateInput(inputValue);
		if (d) {
			setSelected(d);
			setViewMonth(startOfMonth(d));
			setInputValue(formatInkDateLong(d));
		} else {
			setInputValue(formatInkDateLong(selected));
		}
	}, [inputValue, selected]);

	const goToday = useCallback(() => {
		const t = new Date();
		applyDate(t);
	}, [applyDate]);

	return (
		<div
			className={`bg-white border border-zinc-200 rounded-xl shadow-lg p-3 min-w-[280px] select-none ${className}`}
			onMouseDown={(e) => e.preventDefault()}
		>
			<input
				type="text"
				value={inputValue}
				onChange={(e) => setInputValue(e.target.value)}
				onBlur={handleInputBlur}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						const d = parseInkDateInput(inputValue);
						if (d) applyDate(d);
					}
				}}
				className="w-full px-2.5 py-2 text-sm text-zinc-900 border border-zinc-200 rounded-xl mb-3 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
			/>
			<div className="flex items-center justify-between mb-2 px-0.5">
				<span className="text-sm font-semibold text-zinc-900">{monthLabel}</span>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={goToday}
						className="text-xs font-medium text-zinc-500 hover:text-zinc-800 px-1.5 py-0.5 rounded-md hover:bg-zinc-50"
					>
						Today
					</button>
					<button
						type="button"
						aria-label="Previous month"
						className="p-1 rounded-md hover:bg-zinc-100 text-zinc-600"
						onClick={() => setViewMonth((m) => addMonths(m, -1))}
					>
						<ChevronLeft className="w-4 h-4 text-zinc-600" />
					</button>
					<button
						type="button"
						aria-label="Next month"
						className="p-1 rounded-md hover:bg-zinc-100"
						onClick={() => setViewMonth((m) => addMonths(m, 1))}
					>
						<ChevronRight className="w-4 h-4 text-zinc-600" />
					</button>
				</div>
			</div>
			<div className="grid grid-cols-7 gap-0.5 text-[10px] text-zinc-400 font-medium mb-1">
				{WEEK_LABELS.map((w) => (
					<div key={w} className="text-center py-1">
						{w}
					</div>
				))}
			</div>
			<div className="flex flex-col gap-0.5">
				{weeks.map((row) => (
					<div key={row.map((c) => c.key).join("-")} className="grid grid-cols-7 gap-0.5">
						{row.map((cell) => {
							const isSel = sameDay(cell.date, selected);
							return (
								<button
									key={cell.key}
									type="button"
									onClick={() => applyDate(cell.date)}
									className={[
										"h-8 rounded-md text-xs font-medium transition-colors",
										cell.muted ? "text-zinc-300" : "text-zinc-800",
										isSel && !cell.muted
											? "bg-blue-600 text-white hover:bg-blue-700"
											: !cell.muted
												? "hover:bg-zinc-100"
												: "hover:bg-zinc-50",
									].join(" ")}
								>
									{cell.date.getDate()}
								</button>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}
