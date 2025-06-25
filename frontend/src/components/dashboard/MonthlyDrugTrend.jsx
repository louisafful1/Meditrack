import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const monthlyIntakeData = [
	{ name: 'Jan', quantity: 120 },
	{ name: 'Feb', quantity: 150 },
	{ name: 'Mar', quantity: 180 },
	{ name: 'Apr', quantity: 210 },
	{ name: 'May', quantity: 240 },
	{ name: 'Jun', quantity: 170 },
	{ name: 'Jul', quantity: 190 },
	{ name: 'Aug', quantity: 120 },
	{ name: 'Sep', quantity: 150 },
	{ name: 'Oct', quantity: 180 },
	{ name: 'Nov', quantity: 210 },
	{ name: 'Dec', quantity: 240 }

];

const MonthlyDrugTrend = () => {
	return (
		<motion.div
			className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700'
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.4 }}
		>
			<h2 className='text-xl font-semibold text-gray-100 mb-4'>Monthly Drug Intake</h2>

			<div style={{ width: "100%", height: 300 }}>
				<ResponsiveContainer>
					<BarChart data={monthlyIntakeData}>
						<CartesianGrid strokeDasharray='2 2' stroke='#374151' />
						<XAxis
  dataKey="name"
  stroke="#9CA3AF"
  interval={0}
  angle={-45}
  textAnchor="end"
  height={70}
/>

						<YAxis stroke='#9CA3AF' />
						<Tooltip
							contentStyle={{
								backgroundColor: "rgba(31, 41, 55, 0.8)",
								borderColor: "#4B5563",
							}}
							itemStyle={{ color: "#E5E7EB" }}
						/>
						<Bar dataKey='quantity' fill='#10B981' />
					</BarChart>
				</ResponsiveContainer>

			</div>
		</motion.div>
	);
};
export default MonthlyDrugTrend;
