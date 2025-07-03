import { useEffect } from "react"; 
import { useDispatch, useSelector } from "react-redux"; 

import Header from "../components/common/Header";
import {
  Package,
  Pill,
  Users,
  Truck,
  AlertTriangle,
  Clock,
  Repeat,
} from "lucide-react";
import StatCard from "../components/common/StatCard";
import MonthlyDrugTrend from "../components/dashboard/MonthlyDrugTrend";
import TopDispensedDrugs from "../components/dashboard/TopDispensedDrugs";

// Import dashboard actions and slice
import {
  getDashboardSummaryStats,
  RESET_DASHBOARD,
} from "../redux/dashboard/dashboardSlice"; 
import ExpiryDataChart from "../components/dashboard/ExpiryDataChart";

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { summaryStats, isLoading, isError, message } = useSelector(
    (state) => state.dashboard
  );

  useEffect(() => {
    // Dispatch action to get summary stats when component mounts
    dispatch(getDashboardSummaryStats());

    // Optional: Reset dashboard state when component unmounts
    return () => {
      dispatch(RESET_DASHBOARD());
    };
  }, [dispatch]); // Only dispatch once on mount

  if (isLoading && !summaryStats.totalDrugs) { // Only show loading if no data yet
    return (
      <div className="flex-1 flex items-center justify-center text-gray-300">
        {/* Loading Dashboard Data... */}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        {/* Error loading dashboard: {message} */}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Dashboard Overview" />

      <main className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            name="Total Drugs"
            icon={Package}
            value={summaryStats.totalDrugs.toLocaleString()} 
            color="#10B981"
          />
          <StatCard
            name="Low Stocks"
            icon={AlertTriangle}
            value={summaryStats.lowStocks.toLocaleString()} 
            color="#8B5CF6"
          />
          <StatCard
            name="Nearing Expiry"
            icon={Clock}
            value={summaryStats.nearingExpiry.toLocaleString()} 
            color="#EC4899"
          />
          <StatCard
            name="Redistribution"
            icon={Repeat}
            value={summaryStats.redistribution.toLocaleString()} 
            color="#3B82F6"
          />
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyDrugTrend />
          <ExpiryDataChart />
        </div>
        {/* Top Dispensed Drugs */}
        <TopDispensedDrugs />

      </main>
    </div>
  );
};

export default DashboardPage;