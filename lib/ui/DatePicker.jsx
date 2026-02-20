import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const DatePicker = ({
	value,
	onChange,
	placeholder = "Select date",
	className = "",
	minDate = null,
	maxDate = null,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [currentMonth, setCurrentMonth] = useState(
		value ? new Date(value) : new Date()
	);
	const datePickerRef = useRef(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (
				datePickerRef.current &&
				!datePickerRef.current.contains(event.target)
			) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	// Get days in month
	const getDaysInMonth = (date) => {
		return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
	};

	// Get first day of month
	const getFirstDayOfMonth = (date) => {
		return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
	};

	// Format date for display
	const formatDate = (date) => {
		if (!date) return "";
		const d = new Date(date);
		return d.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	// Check if date is disabled
	const isDateDisabled = (date) => {
		if (minDate && date < new Date(minDate)) return true;
		if (maxDate && date > new Date(maxDate)) return true;
		return false;
	};

	// Handle date selection
	const handleDateSelect = (day) => {
		const selectedDate = new Date(
			currentMonth.getFullYear(),
			currentMonth.getMonth(),
			day
		);
		if (!isDateDisabled(selectedDate)) {
			onChange(selectedDate.toISOString().split("T")[0]);
			setIsOpen(false);
		}
	};

	// Navigate months
	const navigateMonth = (direction) => {
		setCurrentMonth(
			new Date(
				currentMonth.getFullYear(),
				currentMonth.getMonth() + direction,
				1
			)
		);
	};

	// Get calendar days
	const getCalendarDays = () => {
		const daysInMonth = getDaysInMonth(currentMonth);
		const firstDay = getFirstDayOfMonth(currentMonth);
		const days = [];

		// Add empty cells for days before month starts
		for (let i = 0; i < firstDay; i++) {
			days.push(null);
		}

		// Add days of month
		for (let day = 1; day <= daysInMonth; day++) {
			days.push(day);
		}

		return days;
	};

	const selectedDate = value ? new Date(value) : null;
	const calendarDays = getCalendarDays();
	const monthNames = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	return (
		<div className={`relative ${className}`} ref={datePickerRef}>
			<motion.button
				whileHover={{ scale: 1.01 }}
				whileTap={{ scale: 0.99 }}
				onClick={() => setIsOpen(!isOpen)}
				className="w-full px-4 py-2 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-100 bg-white flex items-center justify-between text-sm"
			>
				<span className={value ? "text-zinc-900" : "text-zinc-500"}>
					{value ? formatDate(value) : placeholder}
				</span>
				<Calendar className="w-4 h-4 text-zinc-400" />
			</motion.button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -10, scale: 0.95 }}
						transition={{ duration: 0.15 }}
						className="absolute top-full left-0 mt-1 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg z-[60] p-4"
					>
						{/* Month Navigation */}
						<div className="flex items-center justify-between mb-4">
							<button
								onClick={() => navigateMonth(-1)}
								className="p-1 hover:bg-zinc-100 rounded-xl transition-colors"
							>
								<ChevronLeft className="w-5 h-5 text-zinc-600" />
							</button>
							<h3 className="text-sm font-semibold text-zinc-900">
								{monthNames[currentMonth.getMonth()]}{" "}
								{currentMonth.getFullYear()}
							</h3>
							<button
								onClick={() => navigateMonth(1)}
								className="p-1 hover:bg-zinc-100 rounded-xl transition-colors"
							>
								<ChevronRight className="w-5 h-5 text-zinc-600" />
							</button>
						</div>

						{/* Day Labels */}
						<div className="grid grid-cols-7 gap-1 mb-2">
							{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
								(day) => (
									<div
										key={day}
										className="text-xs font-medium text-zinc-500 text-center py-1"
									>
										{day}
									</div>
								)
							)}
						</div>

						{/* Calendar Grid */}
						<div className="grid grid-cols-7 gap-1">
							{calendarDays.map((day, index) => {
								if (day === null) {
									return <div key={index} className="h-8" />;
								}

								const date = new Date(
									currentMonth.getFullYear(),
									currentMonth.getMonth(),
									day
								);
								const isSelected =
									selectedDate &&
									date.toDateString() === selectedDate.toDateString();
								const isToday =
									date.toDateString() === new Date().toDateString();
								const isDisabled = isDateDisabled(date);

								return (
									<button
										key={index}
										onClick={() => handleDateSelect(day)}
										disabled={isDisabled}
										className={`h-8 rounded-xl text-sm transition-colors ${
											isSelected
												? "bg-zinc-900 text-white font-semibold"
												: isToday
												? "bg-zinc-100 text-zinc-900 font-medium"
												: isDisabled
												? "text-zinc-300 cursor-not-allowed"
												: "text-zinc-700 hover:bg-zinc-100"
										}`}
									>
										{day}
									</button>
								);
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default DatePicker;

