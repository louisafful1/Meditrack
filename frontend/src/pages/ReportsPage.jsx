import { useState, useEffect } from "react";
import { FileDown, Calendar, BarChart, FileText } from "lucide-react";
import Header from "../components/common/Header";
import Datepicker from "react-tailwindcss-datepicker";
import { downloadCSV, downloadPDF } from "../utils/exportUtils";

// Redux imports
import { useDispatch, useSelector } from "react-redux";
import { getReport, RESET_REPORT } from "../redux/report/reportSlice"; 

const ReportsPage = () => {
  const dispatch = useDispatch();
  const { currentReportData, isLoading, isError, message } = useSelector(
    (state) => state.report
  );

  const user = useSelector((state) => state.auth.user);
  const facility = useSelector((state) => state.facility.facility);

  const [reportType, setReportType] = useState("expired");
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    dispatch(getReport({ reportType, dateRange }));
    return () => {
      dispatch(RESET_REPORT());
    };
  }, [reportType, dateRange, dispatch]);

  useEffect(() => {
    if (isError) {
      console.error("Report Fetch Error:", message);
    }
  }, [isError, message]);

  const handleDateChange = (newRange) => {
    const formattedRange = {
      startDate: newRange.startDate ? new Date(newRange.startDate).toISOString().split('T')[0] : null,
      endDate: newRange.endDate ? new Date(newRange.endDate).toISOString().split('T')[0] : null,
    };
    setDateRange(formattedRange);
  };

  const reportTitles = {
    expired: "Expired Drugs Report",
    nearing: "Nearing Expiry (Next 30 Days)",
    dispensed: "Dispensation Summary",
    redistribution: "Redistribution Log",
    inventory: "Inventory Summary",
  };

  const getTableHeaders = (data) => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto text-gray-200">
      <Header title="Reports & Analytics" />

      <main className="p-6 space-y-6 z-10">
        <div className="grid md:grid-cols-3 gap-4">
          <button onClick={() => setReportType("expired")} className={`p-4 rounded-lg border text-center transition-all duration-300 ${reportType === "expired" ? "bg-red-600/20 border-red-600 text-red-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700"}`}>
            <BarChart className="w-6 h-6 mb-2 mx-auto" />
            Expired Drugs
          </button>
          <button onClick={() => setReportType("nearing")} className={`p-4 rounded-lg border text-center transition-all duration-300 ${reportType === "nearing" ? "bg-yellow-600/20 border-yellow-600 text-yellow-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700"}`}>
            <BarChart className="w-6 h-6 mb-2 mx-auto" />
            Nearing Expiry
          </button>
          <button onClick={() => setReportType("dispensed")} className={`p-4 rounded-lg border text-center transition-all duration-300 ${reportType === "dispensed" ? "bg-green-600/20 border-green-600 text-green-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700"}`}>
            <BarChart className="w-6 h-6 mb-2 mx-auto" />
            Dispensation Report
          </button>
          <button onClick={() => setReportType("redistribution")} className={`p-4 rounded-lg border text-center transition-all duration-300 ${reportType === "redistribution" ? "bg-blue-600/20 border-blue-600 text-blue-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700"}`}>
            <BarChart className="w-6 h-6 mb-2 mx-auto" />
            Redistribution Report
          </button>
          <button onClick={() => setReportType("inventory")} className={`p-4 rounded-lg border text-center transition-all duration-300 ${reportType === "inventory" ? "bg-indigo-600/20 border-indigo-600 text-indigo-400" : "bg-gray-800 border-gray-700 hover:bg-gray-700"}`}>
            <BarChart className="w-6 h-6 mb-2 mx-auto" />
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
                inputClassName="bg-gray-700 text-sm px-3 py-2 rounded-md text-gray-200 w-full focus:ring-indigo-500 focus:border-indigo-500"
                containerClassName="w-full"
                theme="dark" 
                primaryColor="indigo" // Matches your indigo buttons
                toggleClassName="absolute top-0 right-0 h-full px-3 text-gray-400 focus:outline-none" 
               
              />
            </div>

            <button
              onClick={() => {
                const metadata = {
                  facilityName: facility ? facility.name : "Unknown Facility",
                  userName: user ? user.name || user.username || "Unknown User" : "Unknown User",
                  generatedAt: new Date().toLocaleString(),
                };
                downloadCSV(currentReportData, `${reportType}-report`, metadata);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm transition-colors duration-200 w-full sm:w-auto"
            >
              <FileText size={16} className="inline mr-2" />
              Export CSV
            </button>

            <button
              onClick={() => {
                const metadata = {
                  facilityName: facility ? facility.name : "Unknown Facility",
                  userName: user ? user.name || user.username || "Unknown User" : "Unknown User",
                  generatedAt: new Date().toLocaleString(),
                };
                downloadPDF(currentReportData, reportTitles[reportType], metadata);
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors duration-200 w-full sm:w-auto"
            >
              <FileDown size={16} className="inline mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-gray-900 rounded-md border border-gray-700 p-4 overflow-x-auto">
          {isLoading ? (
            <div className="py-4 text-center text-gray-400">Loading report data...</div>
          ) : isError ? (
            <div className="py-4 text-center text-red-400">Error: {message}</div>
          ) : (
            <table className="w-full text-left text-sm text-gray-200">
              <thead className="bg-gray-700 text-gray-400">
                <tr>
                  {getTableHeaders(currentReportData).map((key) => (
                    <th key={key} className="py-2 px-4 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentReportData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-800 border-b border-gray-700">
                    {getTableHeaders(currentReportData).map((key, i) => (
                      <td key={i} className="py-2 px-4">
                        {item[key] === null || item[key] === undefined ? "N/A" : String(item[key])}
                      </td>
                    ))}
                  </tr>
                ))}
                {currentReportData.length === 0 && (
                  <tr>
                    <td colSpan={getTableHeaders(currentReportData).length || 10} className="py-4 text-center text-gray-500">
                      No data available for this report with the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
