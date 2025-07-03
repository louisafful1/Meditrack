import { motion } from "framer-motion";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux"; //
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Import dashboard actions
import { getDashboardExpiryOverview } from "../../redux/dashboard/dashboardSlice"; 

const STATUS_COLORS = {
    'Expired': '#EF4444',        // Red-500
    'Nearing Expiry': '#F59E0B', // Amber-500
    'Safe': '#10B981'            // Green-500
};

const ExpiryDataChart = () => {
    const dispatch = useDispatch();
    const { expiryOverviewData, isLoading, isError, message } = useSelector(
        (state) => state.dashboard 
    );

    // Fetch data when the component mounts
    useEffect(() => {
        dispatch(getDashboardExpiryOverview());
    }, [dispatch]); 

    // --- Conditional Rendering for Loading/Error States ---
    if (isLoading && expiryOverviewData.length === 0) {
        return (
            <motion.div
                className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 flex items-center justify-center h-80'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="text-gray-300">Loading Expiry Data...</div>
            </motion.div>
        );
    }

    if (isError) {
        return (
            <motion.div
                className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 flex items-center justify-center h-80'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="text-red-400">Error loading expiry data: {message}</div>
            </motion.div>
        );
    }

    // Render chart only if data is available
    if (!expiryOverviewData || expiryOverviewData.length === 0) {
        return (
            <motion.div
                className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 flex items-center justify-center h-80'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="text-gray-400">No expiry data available.</div>
            </motion.div>
        );
    }

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
                            data={expiryOverviewData} 
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8" // Default fill, overridden by Cell colors
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {/* Map over the dynamic data for cells */}
                            {expiryOverviewData.map((entry, index) => (
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