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

  // Show error state if there's an error
  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        Error loading dashboard: {message}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Dashboard Overview" />

      <main className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {isLoading && !summaryStats.totalDrugs ? (
            // Show loading skeleton for stat cards
            <>
              <div className="bg-gray-800 p-6 rounded-lg animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-16"></div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-16"></div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-16"></div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-700 rounded w-16"></div>
              </div>
            </>
          ) : (
            // Show actual stat cards when data is loaded
            <>
              <StatCard
                name="Total Drugs"
                icon={Package}
                value={summaryStats.totalDrugs?.toLocaleString() || '0'} 
                color="#10B981"
              />
              <StatCard
                name="Low Stocks"
                icon={AlertTriangle}
                value={summaryStats.lowStocks?.toLocaleString() || '0'} 
                color="#8B5CF6"
              />
              <StatCard
                name="Nearing Expiry"
                icon={Clock}
                value={summaryStats.nearingExpiry?.toLocaleString() || '0'} 
                color="#EC4899"
              />
              <StatCard
                name="Redistribution"
                icon={Repeat}
                value={summaryStats.redistribution?.toLocaleString() || '0'} 
                color="#3B82F6"
              />
            </>
          )}
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