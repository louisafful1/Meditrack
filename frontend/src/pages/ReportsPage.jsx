import { useState } from "react";
import { FileDown, Calendar, BarChart, FileText } from "lucide-react";
import Header from "../components/common/Header";
import Datepicker from "react-tailwindcss-datepicker"; // npm install react-tailwindcss-datepicker
import { downloadCSV, downloadPDF } from "../../utils/exportUtils"; // Assume helper methods

const ReportsPage = () => {
  const [reportType, setReportType] = useState("expired");
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const handleDateChange = (newRange) => setDateRange(newRange);

  // Mock data - replace with real fetched data
  const mockReports = {
    expired: [
      { drug: "Insulin", quantity: 20, expiryDate: "2024-06-01" },
      { drug: "Amoxicillin", quantity: 15, expiryDate: "2024-06-10" },
    ],
    nearing: [
      { drug: "Paracetamol", quantity: 50, expiryDate: "2024-07-05" },
    ],
    dispensed: [
      { drug: "Ibuprofen", quantity: 100, date: "2024-06-12", patient: "John Doe" },
    ],
    redistribution: [
      { drug: "Ciprofloxacin", qty: 30, to: "Clinic A", date: "2024-06-10" },
    ],
    inventory: [
      { drug: "Dexamethasone", stock: 120, location: "Main Pharmacy" },
    ]
  };

  const currentData = mockReports[reportType] || [];

  const reportTitles = {
    expired: "Expired Drugs Report",
    nearing: "Nearing Expiry (Next 30 Days)",
    dispensed: "Dispensation Summary",
    redistribution: "Redistribution Log",
    inventory: "Inventory Summary",
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto text-gray-200">
      <Header title="Reports & Analytics" />

      <main className="p-6 space-y-6 z-10">
        <div className="grid md:grid-cols-3 gap-4">
          <button onClick={() => setReportType("expired")} className={`p-4 rounded-lg border ${reportType === "expired" ? "bg-red-600/20 border-red-600" : "bg-gray-800 border-gray-700"}`}>
            <BarChart className="w-6 h-6 mb-2" />
            Expired Drugs
          </button>
          <button onClick={() => setReportType("nearing")} className={`p-4 rounded-lg border ${reportType === "nearing" ? "bg-yellow-600/20 border-yellow-600" : "bg-gray-800 border-gray-700"}`}>
            <BarChart className="w-6 h-6 mb-2" />
            Nearing Expiry
          </button>
          <button onClick={() => setReportType("dispensed")} className={`p-4 rounded-lg border ${reportType === "dispensed" ? "bg-green-600/20 border-green-600" : "bg-gray-800 border-gray-700"}`}>
            <BarChart className="w-6 h-6 mb-2" />
            Dispensation Report
          </button>
          <button onClick={() => setReportType("redistribution")} className={`p-4 rounded-lg border ${reportType === "redistribution" ? "bg-blue-600/20 border-blue-600" : "bg-gray-800 border-gray-700"}`}>
            <BarChart className="w-6 h-6 mb-2" />
            Redistribution Report
          </button>
          <button onClick={() => setReportType("inventory")} className={`p-4 rounded-lg border ${reportType === "inventory" ? "bg-indigo-600/20 border-indigo-600" : "bg-gray-800 border-gray-700"}`}>
            <BarChart className="w-6 h-6 mb-2" />
            Inventory Summary
          </button>
        </div>

{/* Filter & Export Section */}
<div className="bg-gray-800 p-4 rounded-md border border-gray-700 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
  {/* Left title section */}
  <div>
    <h2 className="text-lg font-semibold text-white">{reportTitles[reportType]}</h2>
    <p className="text-sm text-gray-400">Specify date range (optional)</p>
  </div>

  {/* Controls section */}
  <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
    {/* Datepicker wrapper to prevent overflow */}
    <div className="w-full sm:w-60 relative z-50">
      <Datepicker
        value={dateRange}
        onChange={handleDateChange}
        displayFormat="DD/MM/YYYY"
        showShortcuts={true}
        placeholder="Select date range"
        inputClassName="bg-gray-700 text-sm px-3 py-2 rounded-md text-gray-200 w-full"
        containerClassName="w-full"
      />
    </div>

    <button
      onClick={() => downloadCSV(currentData, `${reportType}-report`)}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm"
    >
      <FileText size={16} className="inline mr-2" />
      Export CSV
    </button>

    <button
      onClick={() => downloadPDF(currentData, reportTitles[reportType])}
      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
    >
      <FileDown size={16} className="inline mr-2" />
      Export PDF
    </button>
  </div>
</div>




        {/* Report Table */}
        <div className="bg-gray-900 rounded-md border border-gray-700 p-4 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-200">
            <thead className="bg-gray-700 text-gray-400">
              <tr>
                {currentData.length > 0 && Object.keys(currentData[0]).map((key) => (
                  <th key={key} className="py-2 px-4 capitalize">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-800 border-b border-gray-700">
                  {Object.values(item).map((val, i) => (
                    <td key={i} className="py-2 px-4">{val}</td>
                  ))}
                </tr>
              ))}
              {currentData.length === 0 && (
                <tr>
                  <td colSpan="10" className="py-4 text-center text-gray-500">
                    No data available for this report.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
