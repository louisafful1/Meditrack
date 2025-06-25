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
import AISuggestionsSection from "../components/dashboard/AISuggestionsSection";
import ExpiryDataChart from "../components/dashboard/expiryDataChart";

const DashboardPage = () => {
	const AISuggestions = [
        "Transfer 200 units of Amoxicillin to Hospital B due to rising demand.",
        "Paracetamol stock at Clinic A exceeds average usage—consider redistribution.",
        "Ibuprofen is low at Warehouse 1. Pull 100 units from Clinic B."
      ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Dashboard Overview" />

      <main className="p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            name="Total Drugs"
            icon={Package}
            value="1,280"
            color="#10B981"
          />
          <StatCard
            name="Low Stocks"
            icon={AlertTriangle}
            value="860"
            color="#8B5CF6"
          />
          <StatCard
            name="Nearing Expiry"
            icon={Clock}
            value="42"
            color="#EC4899"
          />
          <StatCard
            name="Redistribution"
            icon={Repeat}
            value="95"
            color="#3B82F6"
          />
        </div>
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MonthlyDrugTrend />
          <ExpiryDataChart />
        </div>
		<AISuggestionsSection suggestions={AISuggestions} />

      </main>
    </div>
  );
};

export default DashboardPage;
