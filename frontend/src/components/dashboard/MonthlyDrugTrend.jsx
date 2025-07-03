import { motion } from "framer-motion";
import { useEffect } from "react"; 
import { useDispatch, useSelector } from "react-redux"; 
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Import dashboard actions
import { getDashboardMonthlyTrend } from "../../redux/dashboard/dashboardSlice"; 

const MonthlyDrugTrend = () => {
    const dispatch = useDispatch();
    const { monthlyTrendData, isLoading, isError, message } = useSelector(
        (state) => state.dashboard 
    );

    // Fetch data when the component mounts
    useEffect(() => {
        dispatch(getDashboardMonthlyTrend());
    }, [dispatch]); // Dependency array to run only once on mount

    // --- Conditional Rendering for Loading/Error States ---
    if (isLoading && monthlyTrendData.length === 0) { // Only show loading if no data yet
        return (
            <motion.div
                className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 flex items-center justify-center h-80'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <div className="text-gray-300">Loading Monthly Drug Trend...</div>
            </motion.div>
        );
    }

    if (isError) {
        return (
            <motion.div
                className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 flex items-center justify-center h-80'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <div className="text-red-400">Error loading monthly trend: {message}</div>
            </motion.div>
        );
    }

    // Render chart only if data is available
    if (!monthlyTrendData || monthlyTrendData.length === 0) {
        return (
            <motion.div
                className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 flex items-center justify-center h-80'
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <div className="text-gray-400">No monthly drug intake data available.</div>
            </motion.div>
        );
    }

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
                    <BarChart data={monthlyTrendData}> 
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