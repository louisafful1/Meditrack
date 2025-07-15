import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Package, AlertCircle, Boxes, ArrowUpDown, Search,
    Edit, Trash2, Download, X,
    QrCode // Added QrCode icon for clarity
} from "lucide-react";
import Header from "../components/common/Header";
import ManualEntryForm from "../components/inventory/ManualEntryForm";
import QRScannerSection from "../components/inventory/QRScannerSection";
import { useDispatch, useSelector } from "react-redux";
import {
    deleteDrug,
    getAllDrugs,
    createDrug, // Assuming this action exists in drugSlice
    updateDrug, // Assuming this action exists in drugSlice
    RESET_DRUG
} from "../redux/drug/drugSlice";
import { toast } from 'react-toastify'; // Ensure toast is imported

const InventoryPage = () => {
    const dispatch = useDispatch();
    const { drugs = [], isLoading, isError, message } = useSelector((state) => state.drug || {});
    const { user } = useSelector((state) => state.auth); // Get current user for facility ID

    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const [page, setPage] = useState(1);
    const [entryMode, setEntryMode] = useState("qr"); // 'qr' or 'manual'
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedDrug, setSelectedDrug] = useState(null);
    const [scannedDrugData, setScannedDrugData] = useState(null); // State for scanned QR data

    const rowsPerPage = 10;

    // Fetch drugs on component mount and when relevant Redux states change
    useEffect(() => {
        dispatch(getAllDrugs());
        // Cleanup function for Redux state
        return () => {
            dispatch(RESET_DRUG());
        };
    }, [dispatch]);

    // Handle toast messages for drug-related Redux state changes
    useEffect(() => {
        if (isError && message) {
            toast.error(message);
        }
    }, [isError, message]);


    const handleDeleteDrug = (drugId) => {
        if (window.confirm("Are you sure you want to delete this drug from inventory? This action cannot be undone.")) {
            dispatch(deleteDrug(drugId))
                .unwrap()
                .then(() => {
                    toast.success("Drug deleted successfully!");
                    dispatch(getAllDrugs()); // Refresh the list after deletion
                })
                .catch((error) => {
                    toast.error(`Failed to delete drug: ${error.message || error}`);
                });
        }
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
        if (!drugs.length) {
            toast.info("No data to export.");
            return;
        }
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
        toast.success("Inventory data exported successfully!");
    };

    // --- QR Scan Result Handler ---
    const handleQRResult = async (data) => {
        try {
            const scannedData = JSON.parse(data);
            console.log("Scanned data:", scannedData);

            if (!user || !user.facility) {
                toast.error("User facility information not available. Please log in or ensure your user profile is complete.");
                return;
            }

            // Ensure the scanned drug is associated with the current user's facility.
            scannedData.facility = user.facility;

            // Check if this drug (by drugName and batchNumber) already exists in the user's inventory
            const existingDrug = drugs.find(
                (d) =>
                    d.drugName === scannedData.drugName &&
                    d.batchNumber === scannedData.batchNumber &&
                    // Handle both populated facility object and direct facility ID string
                    (d.facility && typeof d.facility === 'object' ? d.facility._id : d.facility) === user.facility
            );

            if (existingDrug) {
                // If drug exists, update its stock
                const quantityToAdd = scannedData.currentStock || 0;
                if (quantityToAdd <= 0) {
                    toast.warn("Scanned quantity is zero or negative. No stock update performed.");
                    return;
                }

                const updatedStock = existingDrug.currentStock + quantityToAdd;
                const updatedDrugData = {
                    ...existingDrug, // Keep existing properties
                    currentStock: updatedStock,
                    // Optionally update other fields if QR data is more current
                    expiryDate: scannedData.expiryDate || existingDrug.expiryDate,
                    supplier: scannedData.supplier || existingDrug.supplier,
                    receivedDate: new Date().toISOString(), // New stock received, update date
                    status: updatedStock <= existingDrug.reorderLevel / 2 ? "Critical" :
                            updatedStock <= existingDrug.reorderLevel ? "Low Stock" : "Adequate"
                };

                // Remove _id from updatedDrugData as it's passed separately in updateDrug action
                delete updatedDrugData._id;

                dispatch(updateDrug({ id: existingDrug._id, drugData: updatedDrugData }))
                    .unwrap()
                    .then(() => {
                        toast.success(`Successfully updated stock for ${scannedData.drugName} (Batch: ${scannedData.batchNumber}). New stock: ${updatedStock}`);
                        dispatch(getAllDrugs()); // Refresh data after update
                    })
                    .catch((error) => {
                        toast.error(`Failed to update drug: ${error.message || error.toString()}`);
                        console.error("Update drug error:", error);
                    });
            } else {
                // If drug does not exist, set it to scannedDrugData and switch to manual entry
                // This will pre-fill the form for a new entry
                setScannedDrugData(scannedData);
                setEntryMode("manual");
                toast.info("New drug detected. Please verify details and add manually.");
            }
        } catch (error) {
            toast.error(`Invalid QR code data format: ${error.message}`);
            console.error("Error parsing QR data:", error);
        }
    };


    return (
        <div className="flex flex-col flex-1 overflow-y-auto text-gray-300 z-9">
            <Header title="Inventory" />

            <main className="p-6 space-y-6 z-9">
                {/* QR or Manual Entry Section */}
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
                            <QRScannerSection
                                onSwitchToManual={() => {
                                    setEntryMode("manual");
                                    setScannedDrugData(null); // Clear scanned data if manual is chosen this way
                                }}
                                onResult={handleQRResult} // Use the new handler
                            />
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
                            <ManualEntryForm
                                onCancel={() => {
                                    setEntryMode("qr");
                                    setScannedDrugData(null); // Clear scanned data when canceling manual entry
                                }}
                                initialData={scannedDrugData} // Pass scanned data to ManualEntryForm
                                onSubmissionSuccess={() => {
                                    setScannedDrugData(null); // Clear data after successful manual submission
                                    setEntryMode("qr"); // Optionally switch back to QR after manual submission
                                    dispatch(getAllDrugs()); // Refresh drugs after manual entry
                                }}
                            />
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
                            {paginated.length > 0 ? (
                                paginated.map((item) => (
                                    <tr key={item._id} className="hover:bg-gray-800">
                                        <td className="px-4 py-3">{item.drugName}</td>
                                        <td className="px-4 py-3">{item.batchNumber}</td>
                                        <td className="px-4 py-3">{item.currentStock}</td>
                                        <td className="px-4 py-3">{item.supplier}</td>
                                        <td className="px-4 py-3">
                                            {new Date(item.expiryDate).toLocaleDateString("en-GB", {
                                                weekday: "long",
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric"
                                            })}
                                        </td>
                                        <td className="px-4 py-3">
                                            {new Date(item.receivedDate).toLocaleDateString("en-GB", {
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
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center py-6 text-gray-400">
                                        <Boxes className="mx-auto mb-2" size={32} />
                                        No inventory items found.
                                    </td>
                                </tr>
                            )}
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
