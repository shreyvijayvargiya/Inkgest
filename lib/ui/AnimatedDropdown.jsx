import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

/**
 * Reusable Animated Dropdown Component
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether dropdown is open
 * @param {Function} props.onToggle - Function to toggle dropdown
 * @param {Function} props.onSelect - Function called when option is selected
 * @param {Array} props.options - Array of options { value, label, color? }
 * @param {string|number} props.value - Currently selected value
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.className - Additional classes for container
 * @param {string} props.buttonClassName - Additional classes for button
 * @param {string} props.dropdownClassName - Additional classes for dropdown
 * @param {Function} props.renderOption - Custom render function for options
 * @param {Function} props.renderButton - Custom render function for button
 */
const AnimatedDropdown = ({
	isOpen,
	onToggle,
	onSelect,
	options = [],
	value,
	placeholder = "Select...",
	className = "",
	buttonClassName = "",
	dropdownClassName = "",
	optionClassName = "",
	renderOption,
	renderButton,
}) => {
	const dropdownRef = useRef(null);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				if (isOpen) {
					onToggle();
				}
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen, onToggle]);

	// Find selected option
	const selectedOption = options.find((opt) => opt.value === value);

	// Default button render
	const defaultRenderButton = () => {
		if (renderButton) {
			return renderButton(selectedOption, isOpen);
		}

		return (
			<motion.button
				whileHover={{ scale: 1.01 }}
				whileTap={{ scale: 0.99 }}
				onClick={onToggle}
				className={`w-full px-4 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-100 focus:outline-none bg-white flex items-center justify-between ${buttonClassName}`}
			>
				{selectedOption ? (
					<span
						className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedOption.color || "bg-zinc-100 text-zinc-800"
							}`}
					>
						{selectedOption.label}
					</span>
				) : (
					<span className="text-zinc-500">{placeholder}</span>
				)}
				<ChevronDown
					className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""
						}`}
				/>
			</motion.button>
		);
	};

	// Default option render
	const defaultRenderOption = (option, index) => {
		if (renderOption) {
			return renderOption(option, index, value === option.value);
		}

		return (
			<motion.button
				key={option.value}
				whileHover={{ backgroundColor: "#f4f4f5" }}
				onClick={() => {
					onSelect(option.value);
					onToggle();
				}}
				className={`w-full px-4 py-1.5 rounded-xl text-left flex items-center gap-2 transition-colors text-sm ${value === option.value
						? "bg-zinc-50 text-zinc-900 font-medium"
						: "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
					} ${optionClassName}`}
			>
				{option.color ? (
					<span
						className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${option.color}`}
					>
						{option.label}
					</span>
				) : (
					<span>{option.label}</span>
				)}
				{value === option.value && (
					<svg
						className="w-4 h-4 ml-auto text-zinc-600"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path
							fillRule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clipRule="evenodd"
						/>
					</svg>
				)}
			</motion.button>
		);
	};

	return (
		<div className={`relative ${className}`} ref={dropdownRef}>
			{defaultRenderButton()}

			<AnimatePresence>
				{isOpen && (
					<motion.div
						initial={{ opacity: 0, y: -10, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -10, scale: 0.95 }}
						transition={{ duration: 0.15 }}
						className={`absolute top-full left-0 mt-1 w-full bg-white border border-zinc-200 rounded-xl shadow-lg z-[2000] overflow-hidden ${dropdownClassName}`}
					>
						<div className="max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
							{options.map((option, index) => defaultRenderOption(option, index))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

export default AnimatedDropdown;
