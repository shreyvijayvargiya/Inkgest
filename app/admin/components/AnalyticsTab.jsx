import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import {
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import {
	Globe,
	Map as MapIcon,
	LayoutDashboard,
	MapPin,
	Sun,
	Moon,
} from "lucide-react";
import { getAllAnalytics } from "../../../lib/api/analytics";
import TableSkeleton from "../../../lib/ui/TableSkeleton";
import AnimatedDropdown from "../../../lib/ui/AnimatedDropdown";
import ExportDropdown from "../../../lib/ui/ExportDropdown";

// Create a wrapper component for the map to handle dynamic imports properly
const MapView = dynamic(
	() =>
		import("react-leaflet").then((mod) => {
			const { MapContainer, TileLayer, Marker, Popup } = mod;

			const MapComponent = ({
				locationGroups,
				mapCenter,
				mapZoom,
				mapTheme,
			}) => {
				if (typeof window === "undefined") {
					return null;
				}

				const L = require("leaflet");

				return (
					<MapContainer
						center={mapCenter}
						zoom={mapZoom}
						style={{ height: "100%", width: "100%", borderRadius: "12px" }}
						scrollWheelZoom={true}
					>
						{mapTheme === "light" ? (
							<TileLayer
								key="light-theme"
								attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
							/>
						) : (
							<TileLayer
								key="dark-theme"
								attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
								url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
							/>
						)}
						{locationGroups.map((group, index) => {
							const customIcon = L.divIcon({
								className: "custom-marker",
								html: `
									<div style="
										background-color: #18181b;
										color: white;
										border: 2px solid white;
										border-radius: 50%;
										width: 32px;
										height: 32px;
										display: flex;
										align-items: center;
										justify-content: center;
										font-weight: bold;
										font-size: 12px;
										box-shadow: 0 2px 4px rgba(0,0,0,0.3);
									">
										${group.records.length}
									</div>
								`,
								iconSize: [32, 32],
								iconAnchor: [16, 16],
							});

							return (
								<Marker
									key={index}
									position={[group.latitude, group.longitude]}
									icon={customIcon}
								>
									<Popup>
										<div className="p-2 min-w-[200px]">
											<div className="font-semibold text-sm text-zinc-900 mb-2">
												{group.records.length} Record
												{group.records.length !== 1 ? "s" : ""}
											</div>
											<div className="text-xs text-zinc-600 space-y-1">
												<div>
													<strong>Total Visits:</strong> {group.totalVisits}
												</div>
												<div>
													<strong>Location:</strong>{" "}
													{group.records[0]?.city || "Unknown"}
													{group.records[0]?.country &&
														`, ${group.records[0].country}`}
												</div>
												<div>
													<strong>Coordinates:</strong>{" "}
													{group.latitude.toFixed(4)},{" "}
													{group.longitude.toFixed(4)}
												</div>
											</div>
										</div>
									</Popup>
								</Marker>
							);
						})}
					</MapContainer>
				);
			};

			return MapComponent;
		}),
	{ ssr: false },
);

// Utility to format dates
const formatDate = (dateString, showTime = false) => {
	const date = new Date(dateString);
	if (showTime) {
		return date.toLocaleTimeString("en-US", {
			hour: "numeric",
			minute: "numeric",
		});
	}
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// Mock data generator for missing metrics (Pages, Referrers)
const generateMockPages = () => [
	{ path: "/", visitors: 47 },
	{ path: "/premium-templates", visitors: 8 },
	{ path: "/templates", visitors: 8 },
	{ path: "/forms", visitors: 4 },
	{ path: "/widgets", visitors: 4 },
	{ path: "/admin", visitors: 3 },
];

const generateMockReferrers = () => [
	{ source: "ihatereading.in", visitors: 2 },
	{ source: "shreyvijayvargiya26.medium.com", visitors: 2 },
	{ source: "t.co", visitors: 2 },
	{ source: "blog.startupstash.com", visitors: 1 },
	{ source: "chatgpt.com", visitors: 1 },
	{ source: "com.google.android.gm", visitors: 1 },
];

const StatCard = ({ title, value, change, trend }) => (
	<div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
		<div className="flex justify-between items-start mb-4">
			<h3 className="text-sm font-medium text-zinc-500">{title}</h3>
		</div>
		<div className="flex items-baseline gap-3">
			<span className="text-3xl font-bold text-zinc-900">{value}</span>
			{change && (
				<span
					className={`text-xs font-medium px-2 py-0.5 rounded-full ${
						trend === "up"
							? "bg-green-100 text-green-700"
							: "bg-red-100 text-red-700"
					}`}
				>
					{change}
				</span>
			)}
		</div>
	</div>
);

const AnalyticsTab = () => {
	const [timeRange, setTimeRange] = useState("7d");
	const [activeTab, setActiveTab] = useState("pages");
	const [activeReferrerTab, setActiveReferrerTab] = useState("referrers");
	const [viewMode, setViewMode] = useState("dashboard"); // "dashboard" or "map"
	const [mapTheme, setMapTheme] = useState("light");
	const [isTimeRangeDropdownOpen, setIsTimeRangeDropdownOpen] = useState(false);

	const [env, setEnv] = useState("production");
	const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);

	const envOptions = [
		{ value: "production", label: "Production" },
		{ value: "env", label: "Env" },
	];

	const {
		data: analytics = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["analytics"],
		queryFn: () => getAllAnalytics(),
	});

	// Filter analytics based on timeRange
	const filteredAnalytics = useMemo(() => {
		const now = new Date();
		let cutoffDate = new Date();

		if (timeRange === "24h") {
			cutoffDate.setHours(now.getHours() - 24);
		} else if (timeRange === "7d") {
			cutoffDate.setDate(now.getDate() - 7);
		} else if (timeRange === "30d") {
			cutoffDate.setDate(now.getDate() - 30);
		}

		return analytics.filter((record) => {
			if (!record.firstVisit) return false;
			const visitDate = record.firstVisit.toDate
				? record.firstVisit.toDate()
				: new Date(record.firstVisit);
			return visitDate >= cutoffDate;
		});
	}, [analytics, timeRange]);

	// Process analytics data for the chart
	const chartData = useMemo(() => {
		if (!filteredAnalytics.length && !analytics.length) return [];

		const now = new Date();
		const days = {};

		if (timeRange === "24h") {
			for (let i = 23; i >= 0; i--) {
				const d = new Date(now);
				d.setHours(now.getHours() - i);
				const hourKey = d.getHours();
				days[hourKey] = {
					date: formatDate(d, true),
					visitors: 0,
					views: 0,
					sortKey: d.getTime(),
				};
			}

			filteredAnalytics.forEach((record) => {
				const visitDate = record.firstVisit.toDate
					? record.firstVisit.toDate()
					: new Date(record.firstVisit);
				const hourKey = visitDate.getHours();
				if (days[hourKey]) {
					days[hourKey].visitors += 1;
					days[hourKey].views += record.visitCount || 1;
				}
			});
		} else {
			const numDays = timeRange === "7d" ? 7 : 30;
			for (let i = numDays - 1; i >= 0; i--) {
				const d = new Date(now);
				d.setDate(now.getDate() - i);
				const dateStr = d.toISOString().split("T")[0];
				days[dateStr] = {
					date: formatDate(d),
					visitors: 0,
					views: 0,
					sortKey: d.getTime(),
				};
			}

			filteredAnalytics.forEach((record) => {
				const visitDate = record.firstVisit.toDate
					? record.firstVisit.toDate()
					: new Date(record.firstVisit);
				const dateStr = visitDate.toISOString().split("T")[0];
				if (days[dateStr]) {
					days[dateStr].visitors += 1;
					days[dateStr].views += record.visitCount || 1;
				}
			});
		}

		return Object.values(days).sort((a, b) => a.sortKey - b.sortKey);
	}, [filteredAnalytics, timeRange, analytics]);

	// Group analytics by location for map markers
	const locationGroups = useMemo(() => {
		const groups = {};
		filteredAnalytics.forEach((record) => {
			if (record.latitude && record.longitude) {
				const lat = parseFloat(record.latitude.toFixed(2));
				const lon = parseFloat(record.longitude.toFixed(2));
				const key = `${lat},${lon}`;

				if (!groups[key]) {
					groups[key] = {
						latitude: lat,
						longitude: lon,
						records: [],
						totalVisits: 0,
					};
				}
				groups[key].records.push(record);
				groups[key].totalVisits += record.visitCount || 1;
			}
		});
		return Object.values(groups);
	}, [filteredAnalytics]);

	// Calculate map center
	const mapCenter = useMemo(() => {
		if (locationGroups.length === 0) return [0, 0];
		const avgLat =
			locationGroups.reduce((sum, group) => sum + group.latitude, 0) /
			locationGroups.length;
		const avgLng =
			locationGroups.reduce((sum, group) => sum + group.longitude, 0) /
			locationGroups.length;
		return [avgLat, avgLng];
	}, [locationGroups]);

	const mapZoom = useMemo(
		() =>
			locationGroups.length === 0 ? 2 : locationGroups.length === 1 ? 10 : 3,
		[locationGroups],
	);

	// Calculate totals
	const stats = useMemo(() => {
		const totalVisitors = filteredAnalytics.length;
		const totalViews = filteredAnalytics.reduce(
			(acc, curr) => acc + (curr.visitCount || 1),
			0,
		);
		const singleVisitUsers = filteredAnalytics.filter(
			(a) => (a.visitCount || 1) === 1,
		).length;
		const bounceRate = totalVisitors
			? Math.round((singleVisitUsers / totalVisitors) * 100)
			: 0;

		return {
			visitors: totalVisitors,
			views: totalViews,
			bounceRate: bounceRate,
		};
	}, [filteredAnalytics]);

	const countryData = useMemo(() => {
		const countries = {};
		filteredAnalytics.forEach((record) => {
			const country = record.country || "Unknown";
			countries[country] = (countries[country] || 0) + 1;
		});
		return Object.entries(countries)
			.map(([name, count]) => ({ name, value: count }))
			.sort((a, b) => b.value - a.value)
			.slice(0, 10);
	}, [filteredAnalytics]);

	if (isLoading) return <TableSkeleton />;

	if (error) {
		return (
			<div className="p-8 text-center bg-red-50 rounded-xl border border-red-100">
				<p className="text-red-600">Failed to load analytics data.</p>
			</div>
		);
	}

	const timeRangeOptions = [
		{ value: "24h", label: "Last 24 Hours" },
		{ value: "7d", label: "Last 7 Days" },
		{ value: "30d", label: "Last 30 Days" },
	];

	return (
		<div className="max-w-6xl mx-auto space-y-2">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h2 className="text-2xl font-bold text-zinc-900">Web Analytics</h2>
					<div className="flex items-center gap-2 mt-1">
						<div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-zinc-600">
							<Globe className="w-3 h-3" />
							www.Inkgest.dev
						</div>
						<div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-md text-xs font-medium text-green-700">
							<div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
							2 online
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex bg-zinc-100 p-1 rounded-xl mr-2">
						<button
							onClick={() => setViewMode("dashboard")}
							className={`flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-xl transition-all ${
								viewMode === "dashboard"
									? "bg-white text-zinc-900 shadow-sm"
									: "text-zinc-500 hover:text-zinc-700"
							}`}
						>
							<LayoutDashboard className="w-4 h-4" />
							Dashboard
						</button>
						<button
							onClick={() => setViewMode("map")}
							className={`flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-xl transition-all ${
								viewMode === "map"
									? "bg-white text-zinc-900 shadow-sm"
									: "text-zinc-500 hover:text-zinc-700"
							}`}
						>
							<MapIcon className="w-4 h-4" />
							Map
						</button>
					</div>
					<div className="w-28">
						<AnimatedDropdown
							isOpen={isEnvDropdownOpen}
							onToggle={() => setIsEnvDropdownOpen(!isEnvDropdownOpen)}
							onSelect={(val) => setEnv(val)}
							options={envOptions}
							value={env}
							placeholder="Environment"
							buttonClassName="!rounded-xl !py-1 !px-2 font-medium text-xs text-zinc-700 h-[32px]"
						/>
					</div>

					<div className="w-40">
						<AnimatedDropdown
							isOpen={isTimeRangeDropdownOpen}
							onToggle={() =>
								setIsTimeRangeDropdownOpen(!isTimeRangeDropdownOpen)
							}
							onSelect={(val) => setTimeRange(val)}
							options={timeRangeOptions}
							value={timeRange}
							placeholder="Time Range"
							buttonClassName="!rounded-xl !py-1 !px-2 font-medium text-xs text-zinc-700 h-[32px]"
						/>
					</div>

					<ExportDropdown dataType="analytics" data={filteredAnalytics} />
				</div>
			</div>

			{viewMode === "dashboard" ? (
				<>
					{/* KPI Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<StatCard
							title="Visitors"
							value={stats.visitors}
							change="-11%"
							trend="down"
						/>
						<StatCard
							title="Page Views"
							value={stats.views}
							change="+44%"
							trend="up"
						/>
						<StatCard
							title="Bounce Rate"
							value={`${stats.bounceRate}%`}
							change="-1%"
							trend="up"
						/>
					</div>

					{/* Main Chart */}
					<div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
						<div className="h-[300px] w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart data={chartData}>
									<defs>
										<linearGradient
											id="colorVisitors"
											x1="0"
											y1="0"
											x2="0"
											y2="1"
										>
											<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
											<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										vertical={false}
										stroke="#e5e7eb"
									/>
									<XAxis
										dataKey="date"
										axisLine={false}
										tickLine={false}
										tick={{ fill: "#6b7280", fontSize: 12 }}
										dy={10}
									/>
									<YAxis
										axisLine={false}
										tickLine={false}
										tick={{ fill: "#6b7280", fontSize: 12 }}
									/>
									<Tooltip
										contentStyle={{
											borderRadius: "8px",
											border: "1px solid #e5e7eb",
											boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
										}}
									/>
									<Area
										type="monotone"
										dataKey="visitors"
										stroke="#3b82f6"
										strokeWidth={2}
										fillOpacity={1}
										fill="url(#colorVisitors)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					</div>

					{/* Data Tables */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Left Column: Pages */}
						<div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
							<div className="flex border-b border-zinc-200">
								{["Pages", "Routes"].map((tab) => (
									<button
										key={tab}
										onClick={() => setActiveTab(tab.toLowerCase())}
										className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
											activeTab === tab.toLowerCase()
												? "border-zinc-900 text-zinc-900"
												: "border-transparent text-zinc-500 hover:text-zinc-700"
										}`}
									>
										{tab}
									</button>
								))}
								<div className="ml-auto px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
									Visitors
								</div>
							</div>
							<div className="divide-y divide-zinc-100">
								{activeTab === "pages" &&
									generateMockPages().map((page, i) => (
										<div
											key={i}
											className="flex items-center justify-between px-4 py-3 group hover:bg-zinc-50 transition-colors"
										>
											<div className="flex-1">
												<div className="flex items-center justify-between mb-1 relative z-10">
													<span className="text-sm text-zinc-700">
														{page.path}
													</span>
													<span className="text-sm font-medium text-zinc-900">
														{page.visitors}
													</span>
												</div>
												<div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
													<div
														className="bg-zinc-200 h-full rounded-full"
														style={{ width: `${(page.visitors / 50) * 100}%` }}
													/>
												</div>
											</div>
										</div>
									))}
								{activeTab !== "pages" && (
									<div className="p-8 text-center text-zinc-500 text-sm">
										No data available for {activeTab}
									</div>
								)}
							</div>
						</div>

						{/* Right Column: Referrers/Countries */}
						<div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
							<div className="flex border-b border-zinc-200">
								{["Referrers", "Countries"].map((tab) => (
									<button
										key={tab}
										onClick={() => setActiveReferrerTab(tab.toLowerCase())}
										className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
											activeReferrerTab === tab.toLowerCase()
												? "border-zinc-900 text-zinc-900"
												: "border-transparent text-zinc-500 hover:text-zinc-700"
										}`}
									>
										{tab}
									</button>
								))}
								<div className="ml-auto px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
									Visitors
								</div>
							</div>
							<div className="divide-y divide-zinc-100">
								{activeReferrerTab === "referrers" &&
									generateMockReferrers().map((ref, i) => (
										<div
											key={i}
											className="flex items-center justify-between px-4 py-3 group hover:bg-zinc-50 transition-colors"
										>
											<div className="flex items-center gap-2 flex-1">
												<Globe className="w-4 h-4 text-zinc-400" />
												<span className="text-sm text-zinc-700 truncate max-w-[200px]">
													{ref.source}
												</span>
											</div>
											<span className="text-sm font-medium text-zinc-900">
												{ref.visitors}
											</span>
										</div>
									))}
								{activeReferrerTab === "countries" &&
									countryData.map((country, i) => (
										<div
											key={i}
											className="flex items-center justify-between px-4 py-3 group hover:bg-zinc-50 transition-colors"
										>
											<div className="flex items-center gap-2 flex-1">
												<span className="text-sm text-zinc-700">
													{country.name}
												</span>
											</div>
											<span className="text-sm font-medium text-zinc-900">
												{country.value}
											</span>
										</div>
									))}
								{activeReferrerTab === "countries" &&
									countryData.length === 0 && (
										<div className="p-8 text-center text-zinc-500 text-sm">
											No location data collected yet
										</div>
									)}
							</div>
						</div>
					</div>
				</>
			) : (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
							<MapPin className="w-5 h-5" />
							Geographic Distribution
						</h3>
						<button
							onClick={() =>
								setMapTheme(mapTheme === "light" ? "dark" : "light")
							}
							className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors"
						>
							{mapTheme === "light" ? (
								<Moon className="w-4 h-4" />
							) : (
								<Sun className="w-4 h-4" />
							)}
							{mapTheme === "light" ? "Dark Map" : "Light Map"}
						</button>
					</div>
					<div
						className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm"
						style={{ height: "600px" }}
					>
						{locationGroups.length === 0 ? (
							<div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
								<MapPin className="w-12 h-12 text-zinc-300" />
								<p>No geographic data available yet</p>
							</div>
						) : (
							<MapView
								locationGroups={locationGroups}
								mapCenter={mapCenter}
								mapZoom={mapZoom}
								mapTheme={mapTheme}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default AnalyticsTab;
