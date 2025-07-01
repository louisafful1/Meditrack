import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Package, AlertCircle, Boxes, ArrowUpDown, Search,
  Edit, Trash2, Download, X
} from "lucide-react";
import Header from "../components/common/Header";
import ManualEntryForm from "../components/inventory/ManualEntryForm";
import QRScannerSection from "../components/inventory/QRScannerSection";
import { useDispatch, useSelector } from "react-redux";
import { deleteDrug, getAllDrugs } from "../redux/drug/drugSlice";

const InventoryPage = () => {
  const dispatch = useDispatch();
const { drugs = [] } = useSelector((state) => state.drug || {});

  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);
  const [entryMode, setEntryMode] = useState("qr");
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);

  const rowsPerPage = 10;

  useEffect(() => {
    dispatch(getAllDrugs());
  }, [dispatch]);

  const handleDeleteDrug = (drugId) => {
    dispatch(deleteDrug(drugId));
  };

  const handleEditClick = (drug) => {
    setSelectedDrug(drug);
    setShowEditModal(true);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filtered = drugs.filter((item) => {
    const matchesSearch = item.drugName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "low" && item.status === "Low Stock") ||
      (filter === "critical" && item.status === "Critical");
    return matchesSearch && matchesFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortConfig.key) {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const paginated = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(sorted.length / rowsPerPage);

  const handleExportCSV = () => {
    if (!drugs.length) return;
    const headers = Object.keys(drugs[0]).join(",");
    const rows = drugs.map((obj) => Object.values(obj).join(",")).join("\n");
    const csv = [headers, rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto text-gray-300 z-9">
      <Header title="Inventory" />

      <main className="p-6 space-y-6 z-9">
        {/* QR or Manual Entry */}
        <AnimatePresence mode="wait">
          {entryMode === "qr" ? (
            <motion.div
              key="qr"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <QRScannerSection onSwitchToManual={() => setEntryMode("manual")} />
            </motion.div>
          ) : (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700"
            >
              <ManualEntryForm onCancel={() => setEntryMode("qr")} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              className="pl-10 pr-3 py-2 w-full bg-gray-800 border border-gray-700 rounded-md"
              placeholder="Search drug..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-4">
            <select
              className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="low">Low Stock</option>
              <option value="critical">Critical</option>
            </select>
            <button
              onClick={handleExportCSV}
              className="flex items-center bg-indigo-600 px-3 py-2 rounded-md hover:bg-indigo-700"
            >
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th onClick={() => handleSort("drugName")} className="px-4 py-3 cursor-pointer text-left">
                  Drug Name <ArrowUpDown size={12} className="inline ml-1" />
                </th>
                <th className="px-4 py-3">Batch</th>
                <th onClick={() => handleSort("currentStock")} className="px-4 py-3 cursor-pointer">Stock <ArrowUpDown size={12} className="inline ml-1" /></th>
                <th className="px-4 py-3">Supplier</th>
                <th onClick={() => handleSort("expiryDate")} className="px-4 py-3 cursor-pointer">Expiry <ArrowUpDown size={12} className="inline ml-1" /></th>
                <th className="px-4 py-3">Received</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginated.map((item) => (
                <tr key={item._id} className="hover:bg-gray-800">
                  <td className="px-4 py-3">{item.drugName}</td>
                  <td className="px-4 py-3">{item.batchNumber}</td>
                  <td className="px-4 py-3">{item.currentStock}</td>
                  <td className="px-4 py-3">{item.supplier}</td>
                    <td className="px-4 py-3">
  {new Date(item.receivedDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  })}
</td>
                    <td className="px-4 py-3">
  {new Date(item.expiryDate).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric"
  })}
</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      item.status === "Critical"
                        ? "bg-red-500/20 text-red-300"
                        : item.status === "Low Stock"
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-green-500/20 text-green-300"
                    }`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => handleEditClick(item)} className="text-indigo-400 hover:text-indigo-300">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteDrug(item._id)} className="text-red-400 hover:text-red-300">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-end gap-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded-md border ${
                page === i + 1 ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default InventoryPage;
