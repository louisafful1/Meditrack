import { useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList, Clock, Check, RotateCcw, Search, ArrowUpDown,
  AlertCircle, AlertTriangle, Send, Trash2, ScanLine, Sparkles
} from "lucide-react";
import Header from "../components/common/Header";

const RedistributionPage = () => {
  const [formData, setFormData] = useState({
    drugId: "", quantity: "", fromLocation: "", toLocation: "", reason: "", expiryDate: "", notes: ""
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [stockError, setStockError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const mockInventory = [
    { id: 1, name: "Insulin Vials", stock: 35, location: "Main Pharmacy", expiryDate: "2024-07-10" },
    { id: 2, name: "Amoxicillin 500mg", stock: 120, location: "Central Store", expiryDate: "2024-08-15" },
    { id: 3, name: "Paracetamol 500mg", stock: 200, location: "Storage Room 3", expiryDate: "2024-09-30" }
  ];

  const mockFacilities = ["Main Pharmacy", "Ward A", "Ward B", "Clinic X", "Clinic A", "Ward 2", "Rural Clinic B"];
  const mockPendingApprovals = [
    {
      id: 10,
      drugName: "Insulin Vials",
      quantity: 10,
      fromLocation: "Main Pharmacy",
      toLocation: "Clinic A",
      date: "2024-06-12",
      expiryDate: "2024-07-30",
      status: "pending"
    },
    {
      id: 11,
      drugName: "Paracetamol 500mg",
      quantity: 50,
      fromLocation: "Storage Room 3",
      toLocation: "Clinic A",
      date: "2024-06-14",
      expiryDate: "2024-09-30",
      status: "pending"
    }
  ];
  
  const mockSuggestions = [
    {
      id: 1,
      drugName: "Insulin Vials",
      quantity: 20,
      from: "Main Pharmacy",
      to: "Clinic A",
      reason: "Expiring soon, Clinic A has higher demand",
      expiry: "2024-06-20",
    },
    {
      id: 2,
      drugName: "Amoxicillin 500mg",
      quantity: 50,
      from: "Central Store",
      to: "Ward 2",
      reason: "Ward 2 has low supply",
      expiry: "2025-07-5",
    },
    {
      id: 3,
      drugName: "Paracetamol 500mg",
      quantity: 100,
      from: "Storage Room 3",
      to: "Rural Clinic B",
      reason: "Surplus stock, Rural Clinic B needs supply",
      expiry: "2025-09-30",
    }
  ];

  const mockLogs = [
    {
      id: 1, drugName: "Insulin Vials", quantity: 15,
      fromLocation: "Main Pharmacy", toLocation: "Clinic A",
      date: "2024-06-01", expiryDate: "2024-07-15", status: "Completed"
    },
    {
      id: 2, drugName: "Amoxicillin 500mg", quantity: 30,
      fromLocation: "Central Store", toLocation: "Ward 2",
      date: "2024-05-20", expiryDate: "2025-06-30", status: "Completed"
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    if (name === "drugId") {
      const selected = mockInventory.find(d => d.id === parseInt(value));
      if (selected) {
        updated.expiryDate = selected.expiryDate;
        updated.fromLocation = selected.location;
        setFormData(updated);
      }
    }
    if (name === "drugId" || name === "quantity") checkStock(updated);
  };

  const checkStock = (data) => {
    const drug = mockInventory.find(d => d.id === parseInt(data.drugId));
    if (drug && parseInt(data.quantity) > drug.stock) {
      setStockError(`Only ${drug.stock} available`);
    } else {
      setStockError("");
    }
  };

  const handleSuggestionAccept = (s) => {
    const matched = mockInventory.find(d => d.name === s.drugName);
    if (!matched) return;
  
    setFormData({
      drugId: matched.id.toString(),
      quantity: s.quantity.toString(),
      fromLocation: s.from,
      toLocation: s.to,
      reason: s.reason,
      expiryDate: s.expiry,
      notes: ""
    });
  
    checkStock({
      drugId: matched.id.toString(),
      quantity: s.quantity.toString()
    });
  
    // Scroll to form
    setTimeout(() => {
      document.getElementById("redistribution-form")?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };
  

  const handleSubmit = (e) => {
    e.preventDefault();
    if (stockError) return;
    alert("Redistribution submitted");
    handleClear();
  };

  const handleClear = () => {
    setFormData({ drugId: "", quantity: "", fromLocation: "", toLocation: "", reason: "", expiryDate: "", notes: "" });
    setStockError("");
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const filteredLogs = mockLogs.filter((log) =>
    log.drugName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.toLocation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (sortConfig.key) {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const handleApprove = (id) => {
    // For now, just simulate approval
    alert(`Redistribution with ID ${id} approved.`);
    // In a real app, you'd call an API like:
    // await axios.put(`/api/redistribution/approve/${id}`)
  };

  const handleDecline = (id) => {
    alert(`Redistribution with ID ${id} declined.`);
    // Later: await axios.put(`/api/redistribution/decline/${id}`)
  };
  
  

  return (
    <div className="flex-1 flex flex-col overflow-y-auto z-10 text-gray-300">
      <Header title="Drug Redistribution" />

      <main className="p-6 space-y-6 z-10">
        {/* Suggestion Trigger */}
        <div className="flex justify-end">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm rounded-md"
          >
            <Sparkles size={16} className="mr-2" /> Generate Suggestions
          </button>
        </div>

        {/* AI Suggestions */}
        {showSuggestions && (
          <motion.div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <AlertCircle className="text-amber-500 mr-2" />
              AI Redistribution Suggestions
            </h3>

            {mockSuggestions.map((s) => {
              const expiryDate = new Date(s.expiry);
              const today = new Date();
              const diffDays = Math.ceil(
                (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );

              const colorClass =
                diffDays <= 15
                  ? "bg-red-500/10 border-red-500 text-red-400"
                  : diffDays <= 30
                  ? "bg-amber-500/10 border-amber-500 text-amber-400"
                  : "bg-green-500/10 border-emerald-500 text-emerald-400";

              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 mb-3 rounded-lg border-l-4 ${colorClass}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-sm text-white">
                        Move <b>{s.quantity}</b> of <b>{s.drugName}</b> from <b>{s.from}</b> to <b>{s.to}</b>
                      </p>
                      <p className="text-xs text-gray-300 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Expires: {expiryDate.toLocaleDateString()} ({diffDays} day{diffDays !== 1 ? "s" : ""} left)
                      </p>
                      <p className="text-xs text-gray-400 italic">{s.reason}</p>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        title="Accept"
                        onClick={() => handleSuggestionAccept(s)}
                        className="p-2 text-emerald-400 hover:text-emerald-300"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                      <button
                        title="Ignore"
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

{/* Form + Stats */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Form */}
  <motion.div id="redistribution-form" className="bg-gray-800 p-6 rounded-xl border border-gray-700">
    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
      <ClipboardList className="mr-2 text-indigo-400" /> Redistribution Form
    </h3>
    <form onSubmit={handleSubmit} className="space-y-4">
      <select name="drugId" value={formData.drugId} onChange={handleChange} required
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 focus:ring-indigo-500">
        <option value="">Select Drug</option>
        {mockInventory.map(drug => (
          <option key={drug.id} value={drug.id}>
            {drug.name} (Stock: {drug.stock})
          </option>
        ))}
      </select>
      <input type="number" name="quantity" value={formData.quantity} onChange={handleChange}
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2" placeholder="Quantity" min="1" />
      {stockError && (
        <p className="text-red-400 text-sm flex items-center">
          <AlertTriangle className="mr-1" size={14} /> {stockError}
        </p>
      )}
      <input type="text" name="fromLocation" value={formData.fromLocation} readOnly
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2" placeholder="From" />
      <select name="toLocation" value={formData.toLocation} onChange={handleChange} required
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2">
        <option value="">To Location</option>
        {mockFacilities.map((f, i) => <option key={i} value={f}>{f}</option>)}
      </select>
      <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange}
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2" />
      <input type="text" name="reason" value={formData.reason} onChange={handleChange}
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2" placeholder="Reason" />
      <textarea name="notes" value={formData.notes} onChange={handleChange}
        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2" placeholder="Notes"></textarea>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <button type="button" onClick={() => alert("Scanning QR...")}
          className="flex items-center text-indigo-400 hover:text-indigo-300 text-sm">
          <ScanLine size={16} className="mr-1" /> Scan QR
        </button>
        <div className="flex space-x-3">
          <button type="button" onClick={handleClear}
            className="flex items-center px-4 py-2 border border-gray-600 rounded-md text-sm text-gray-200">
            <RotateCcw className="mr-2" size={16} /> Clear
          </button>
          <button type="submit"
            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm">
            <Check className="mr-2" size={16} /> Submit
          </button>
        </div>
      </div>
    </form>
  </motion.div>


  {/* Approval Section */}
<motion.div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-5">
  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
    <ClipboardList className="mr-2 text-emerald-400" /> Pending Approvals
  </h3>

  {mockPendingApprovals.length === 0 ? (
    <p className="text-sm text-gray-400">No pending redistributions to approve.</p>
  ) : (
    mockPendingApprovals.map((item) => (
<div
    key={item.id}
    className="border border-gray-600 p-4 rounded-md bg-gray-700/50 flex justify-between items-start mb-3"
  >    
  <div className="text-sm text-gray-200">
  <p><strong>Drug:</strong> {item.drugName}</p>
  <p><strong>Quantity:</strong> {item.quantity}</p>
  <p><strong>From:</strong> {item.fromLocation}</p>
  <p><strong>Expiry:</strong> {new Date(item.expiryDate).toLocaleDateString()}</p>
</div>
<div className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
      <button
        onClick={() => handleApprove(item.id)}
        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm"
      >
        Approve
      </button>
      <button
        onClick={() => handleDecline(item.id)}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
      >
        Decline
      </button>
    </div>
      </div>
    ))
  )}
</motion.div>
</div>





        {/* Logs */}
        <motion.div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
  {/* Header row with title + controls */}
  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
    <h3 className="text-lg font-semibold text-white mb-2 md:mb-0">
      Redistribution Logs
    </h3>

    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
      <div className="relative w-full md:w-64">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search by drug or destination..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-3 py-2 w-full bg-gray-700 border border-gray-600 rounded-md text-sm"
        />
      </div>

      <select
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm"
      >
        <option value="all">All Redistributions</option>
        <option value="expiring">Expiring Soon</option>
        <option value="week">Last 7 Days</option>
      </select>
    </div>
  </div>

  {/* Table */}
  <div className="overflow-x-auto rounded-lg border border-gray-700">
  <table className="min-w-full text-sm text-left text-gray-300">
    <thead className="bg-gray-700 text-gray-400">
      <tr>
        <th className="py-2 px-3">Drug</th>
        <th className="py-2 px-3">Qty</th>
        <th className="py-2 px-3">From</th>
        <th className="py-2 px-3">To</th>
        <th
          className="py-2 px-3 cursor-pointer"
          onClick={() => handleSort("date")}
        >
          Date <ArrowUpDown size={12} className="inline ml-1" />
        </th>
        <th
          className="py-2 px-3 cursor-pointer"
          onClick={() => handleSort("expiryDate")}
        >
          Expiry <ArrowUpDown size={12} className="inline ml-1" />
        </th>
        <th className="py-2 px-3">Status</th>
      </tr>
    </thead>
    <tbody>
      {sortedLogs.map((log) => {
        const expiryDate = new Date(log.expiryDate);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // color classes
        let rowColor = "";
        if (diffDays <= 15) {
          rowColor = "bg-red-500/10 border-l-4 border-red-600";
        } else if (diffDays <= 30) {
          rowColor = "bg-yellow-500/10 border-l-4 border-yellow-600";
        }

        return (
          <tr key={log.id} className={`${rowColor} hover:bg-gray-700`}>
            <td className="py-2 px-3">{log.drugName}</td>
            <td className="py-2 px-3">{log.quantity}</td>
            <td className="py-2 px-3">{log.fromLocation}</td>
            <td className="py-2 px-3">{log.toLocation}</td>
            <td className="py-2 px-3">
              {new Date(log.date).toLocaleDateString()}
            </td>
            <td className="py-2 px-3">
              <div className="flex items-center gap-2">
                {new Date(log.expiryDate).toLocaleDateString()}
                {diffDays <= 30 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      diffDays <= 15
                        ? "bg-red-600/20 text-red-300"
                        : "bg-yellow-600/20 text-yellow-300"
                    }`}
                  >
                    {diffDays}d
                  </span>
                )}
              </div>
            </td>
            <td className="py-2 px-3">
              <span className="text-green-400 bg-green-500/20 px-2 py-1 rounded-full text-xs">
                {log.status}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
  </div>
</motion.div>

      </main>
    </div>
  );
};

export default RedistributionPage;
