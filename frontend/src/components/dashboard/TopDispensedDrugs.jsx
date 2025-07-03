import { useEffect } from "react"; 
import { useDispatch, useSelector } from "react-redux"; 
import { motion } from "framer-motion";
import { BarChart2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

// Import dashboard actions
import { getDashboardTopDispensedDrugs } from "../../redux/dashboard/dashboardSlice"; 

const ProgressBar = ({ value, max, color }) => {
  const width = Math.round((value / max) * 100);
  return (
    <div className="w-full bg-gray-700 h-2 rounded">
      <div
        className="h-2 rounded transition-all"
        style={{ width: `${width}%`, backgroundColor: color }}
      ></div>
    </div>
  );
};

const TopDispensedDrugs = () => {
  const dispatch = useDispatch();
  const { topDispensedDrugs, isLoading, isError, message } = useSelector(
    (state) => state.dashboard 
  );

  // Destructure mostDispensed and leastDispensed from the fetched data
  const { mostDispensed, leastDispensed } = topDispensedDrugs;

  useEffect(() => {
    // Fetch data when the component mounts
    dispatch(getDashboardTopDispensedDrugs());
  }, [dispatch]); 

  // Calculate max values for progress bars based on dynamic data
  const getMax = (arr) =>
    Math.max(...arr.map((item) => item.totalQuantityDispensed || 0), 1); 

  const maxMost = getMax(mostDispensed);
  const maxLeast = getMax(leastDispensed);

  // --- Conditional Rendering for Loading/Error States ---
  if (isLoading && (!mostDispensed.length && !leastDispensed.length)) { // Only show loading if no data yet
    return (
      <motion.div
        className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 flex items-center justify-center h-60'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-gray-300">Loading Drug Dispensation Trends...</div>
      </motion.div>
    );
  }

  if (isError) {
    return (
      <motion.div
        className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700 flex items-center justify-center h-60'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="text-red-400">Error loading dispensation trends: {message}</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className='bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-6 border border-gray-700' 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-indigo-400">
        <BarChart2 size={22} />
        Dispensing Summary
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Most Dispensed */}
        <div>
          <h4 className="text-md font-semibold text-green-400 mb-4 flex items-center gap-1 uppercase tracking-wide">
            <ArrowUpCircle size={16} /> Most Dispensed
          </h4>
          <ul className="space-y-4 text-sm">
            {mostDispensed && mostDispensed.length > 0 ? (
              mostDispensed.map((item, i) => (
                <li key={i}>
                  <div className="flex justify-between font-medium text-white mb-1">
                    <span>{item.drugName}</span>
                    <span className="text-green-400 font-bold"> 
                      {item.totalQuantityDispensed}
                    </span>
                  </div>
                  <ProgressBar value={item.totalQuantityDispensed} max={maxMost} color="#22c55e" /> 
                </li>
              ))
            ) : (
              <li className="text-gray-300 italic">No data available.</li> 
            )}
          </ul>
        </div>

        {/* Least Dispensed */}
        <div>
          <h4 className="text-md font-semibold text-red-400 mb-4 flex items-center gap-1 uppercase tracking-wide">
            <ArrowDownCircle size={16} /> Least Dispensed
          </h4>
          <ul className="space-y-4 text-sm">
            {leastDispensed && leastDispensed.length > 0 ? (
              leastDispensed.map((item, i) => (
                <li key={i}>
                  <div className="flex justify-between font-medium text-white mb-1">
                    <span>{item.drugName}</span>
                    <span className="text-red-400 font-bold"> {/* Changed to text-red-400 for better visibility */}
                      {item.totalQuantityDispensed}
                    </span>
                  </div>
                  <ProgressBar value={item.totalQuantityDispensed} max={maxLeast} color="#ef4444" /> {/* Use totalQuantityDispensed */}
                </li>
              ))
            ) : (
              <li className="text-gray-300 italic">No data available.</li> 
            )}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

export default TopDispensedDrugs;