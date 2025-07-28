/* eslint-disable no-unused-vars */
import { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
    Package, AlertCircle, Boxes, ArrowUpDown, Search,
    Edit, Trash2, Download, X,
    QrCode
} from "lucide-react";
import Header from "../components/common/Header";
import ManualEntryForm from "../components/inventory/ManualEntryForm";
import QRScannerSection from "../components/inventory/QRScannerSection";
import { useDispatch, useSelector } from "react-redux";
import {
    deleteDrug,
    getAllDrugs,
    createDrug,
    updateDrug,
    RESET_DRUG
} from "../redux/drug/drugSlice";
import { toast } from 'react-toastify';
import { downloadCSV } from "../utils/exportUtils";

const InventoryPage = () => {
    const dispatch = useDispatch();
    const { drugs = [], isLoading, isError, message } = useSelector((state) => state.drug || {});
    const { user } = useSelector((state) => state.auth);

    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
    const [page, setPage] = useState(1);
    const [entryMode, setEntryMode] = useState("qr");
    const [selectedDrug, setSelectedDrug] = useState(null);
    const [scannedDrugData, setScannedDrugData] = useState(null);
    const [highlightedDrugId, setHighlightedDrugId] = useState(null);

    const [isEditing, setIsEditing] = useState(false);
    const [isQRScanning, setIsQRScanning] = useState(false);

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [drugToDeleteId, setDrugToDeleteId] = useState(null);

    const tableBodyRef = useRef(null);

    const rowsPerPage = 10;

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

    useEffect(() => {
        dispatch(getAllDrugs());
        return () => {
            dispatch(RESET_DRUG());
        };
    }, [dispatch]);

    useEffect(() => {
        if (highlightedDrugId && tableBodyRef.current) {
            const isRowOnCurrentPage = paginated.some(item => item._id === highlightedDrugId);

            if (isRowOnCurrentPage) {
                const rowElement = tableBodyRef.current.querySelector(`tr[data-id="${highlightedDrugId}"]`);
                if (rowElement) {
                    rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const timer = setTimeout(() => {
                        setHighlightedDrugId(null);
                    }, 3000);
                    return () => clearTimeout(timer);
                }
            } else if (highlightedDrugId) {
                const originalIndex = sorted.findIndex(item => item._id === highlightedDrugId);
                if (originalIndex !== -1) {
                    const targetPage = Math.floor(originalIndex / rowsPerPage) + 1;
                    setPage(targetPage);
                }
            }
        }
    }, [highlightedDrugId, paginated, sorted, rowsPerPage, setPage]);

    useEffect(() => {
        if (isError && message) {
            toast.error(message);
        }
    }, [isError, message]);

    const handleDeleteDrug = (drugId) => {
        setDrugToDeleteId(drugId);
        setShowConfirmModal(true);
    };

    const confirmDelete = () => {
        if (drugToDeleteId) {
            dispatch(deleteDrug(drugToDeleteId))
                .unwrap()
                .then(() => {
                    toast.success("Drug deleted successfully!");
                    dispatch(getAllDrugs());
                })
                .catch((error) => {
                    toast.error(`Failed to delete drug: ${error.message || error}`);
                })
                .finally(() => {
                    setShowConfirmModal(false);
                    setDrugToDeleteId(null);
                });
        }
    };

    const cancelDelete = () => {
        setShowConfirmModal(false);
        setDrugToDeleteId(null);
    };

    const handleEditClick = (drug) => {
        setSelectedDrug(drug);
        setScannedDrugData(drug);
        setEntryMode("manual");
        setIsEditing(true);
        setHighlightedDrugId(null);
        setIsQRScanning(false);
    };

    const handleSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
    };

    const handleExportCSV = () => {
        if (!drugs.length) {
            toast.info("No data to export.");
            return;
        }
        downloadCSV(drugs, "inventory");
        toast.success("Inventory data exported successfully!");
    };

    const handleQRResult = async (data) => {
        try {
            const scannedData = JSON.parse(data);

            if (!user || !user.facility) {
                toast.error("User facility information not available. Please log in or ensure your user profile is complete.");
                return;
            }
            const userFacilityId = typeof user.facility === 'object' && user.facility._id
                                   ? user.facility._id
                                   : user.facility;

            scannedData.facility = userFacilityId;

            const scannedDrugNameNormalized = scannedData.drugName?.toLowerCase().trim();
            const scannedBatchNumberNormalized = scannedData.batchNumber?.toLowerCase().trim();

            const fetchedDrugsAction = await dispatch(getAllDrugs());
            const freshDrugs = Array.isArray(fetchedDrugsAction.payload) ? fetchedDrugsAction.payload : [];

            const existingDrug = freshDrugs.find(
                (d) => {
                    const existingDrugNameNormalized = d.drugName?.toLowerCase().trim();
                    const existingBatchNumberNormalized = d.batchNumber?.toLowerCase().trim();
                    const existingFacilityId = d.facility && typeof d.facility === 'object' && d.facility._id
                                               ? d.facility._id
                                               : d.facility;

                    const nameMatch = existingDrugNameNormalized === scannedDrugNameNormalized;
                    const batchMatch = existingBatchNumberNormalized === scannedBatchNumberNormalized;
                    const facilityMatch = existingFacilityId === userFacilityId;

                    return nameMatch && batchMatch && facilityMatch;
                }
            );

            if (existingDrug) {
                toast.info(`Drug "${scannedData.drugName}" (Batch: ${scannedData.batchNumber}) is already in your inventory. Scrolling to highlight.`);
                setHighlightedDrugId(existingDrug._id);
                setScannedDrugData(null);
                setEntryMode("qr");
                setIsEditing(false);
            } else {
                setScannedDrugData(scannedData);
                setEntryMode("manual");
                setIsEditing(false);
                setHighlightedDrugId(null);
                toast.info("New drug batch detected. Please verify details and add manually.");
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
                                    setScannedDrugData(null);
                                    setHighlightedDrugId(null);
                                    setIsEditing(false);
                                    setIsQRScanning(false);
                                }}
                                onResult={handleQRResult}
                                isScanning={isQRScanning}
                                setIsScanning={setIsQRScanning}
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
                                    setScannedDrugData(null);
                                    setHighlightedDrugId(null);
                                    setIsEditing(false);
                                    setIsQRScanning(false);
                                }}
                                initialData={scannedDrugData}
                                isEditing={isEditing}
                                onSubmissionSuccess={() => {
                                    setScannedDrugData(null);
                                    setEntryMode("qr");
                                    dispatch(getAllDrugs());
                                    setHighlightedDrugId(null);
                                    setIsEditing(false);
                                    setIsQRScanning(false);
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
                        <tbody ref={tableBodyRef} className="divide-y divide-gray-700">
                            {paginated.length > 0 ? (
                                paginated.map((item) => (
                                    <tr
                                        key={item._id}
                                        data-id={item._id}
                                        className={`hover:bg-gray-800 ${highlightedDrugId === item._id ? 'bg-blue-900/50 transition-all duration-500 ease-in-out' : ''}`}
                                    >
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

            {/* Custom Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700 max-w-sm w-full text-center"
                        >
                            <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
                            <h3 className="text-xl font-semibold text-white mb-2">Confirm Deletion</h3>
                            <p className="text-gray-300 mb-6">
                                Are you sure you want to delete this drug from inventory? This action cannot be undone.
                            </p>
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={cancelDelete}
                                    className="px-5 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-5 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InventoryPage;
