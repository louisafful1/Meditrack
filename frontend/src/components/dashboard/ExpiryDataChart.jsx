import { motion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const expiryData = [
	{ name: 'Expired', value: 85 },
	{ name: 'Nearing Expiry', value: 115 },
	{ name: 'Safe', value: 165 },
];

// Match colors to statuses
const STATUS_COLORS = {
	'Expired': '#EF4444',        // Red-500
	'Nearing Expiry': '#F59E0B', // Amber-500
	'Safe': '#10B981'            // Green-500
};

const ExpiryDataChart = () => {
	return (
		<motion.div
			className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.3 }}
		>
			<h2 className='text-xl font-semibold text-gray-100 mb-4'>Drug Expiry Overview</h2>

			<div style={{ width: "100%", height: 300 }}>
				<ResponsiveContainer>
					<PieChart>
						<Pie
							data={expiryData}
							cx="50%"
							cy="50%"
							outerRadius={80}
							fill="#8884d8"
							dataKey="value"
							label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
						>
							{expiryData.map((entry, index) => (
								<Cell
									key={`cell-${index}`}
									fill={STATUS_COLORS[entry.name] || '#8884d8'}
								/>
							))}
						</Pie>
						<Tooltip
							contentStyle={{
								backgroundColor: "rgba(31, 41, 55, 0.8)",
								borderColor: "#4B5563",
							}}
							itemStyle={{ color: "#E5E7EB" }}
						/>
						<Legend />
					</PieChart>
				</ResponsiveContainer>
			</div>
		</motion.div>
	);
};

export default ExpiryDataChart;
