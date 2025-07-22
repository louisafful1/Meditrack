import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PlusCircle,
    Package,
    ArrowRightCircle,
    CheckCircle,
    XCircle,
    Clock,
    Truck,
    Lightbulb,
    Loader2,
    FileText
} from 'lucide-react';
import Header from '../components/common/Header';
import { toast } from 'react-toastify';

// Redux Imports
import { useDispatch, useSelector } from 'react-redux';
import {
    createRedistribution,
    getRedistributions,
    approveRedistribution,
    declineRedistribution,
    getAIRedistributionSuggestions,
    RESET_REDISTRIBUTION,
} from '../redux/redistribution/redistributionSlice';
import { getAllDrugs, RESET_DRUG } from '../redux/drug/drugSlice';
import { getAllFacilities, RESET_FACILITIES } from '../redux/facility/facilitySlice';


// --- Helper Functions ---
const getStatusColor = (status) => {
    switch (status) {
        case 'pending': return 'bg-yellow-500/20 text-yellow-300';
        case 'completed': return 'bg-green-500/20 text-green-300';
        case 'declined': return 'bg-red-500/20 text-red-300';
        default: return 'bg-gray-500/20 text-gray-300';
    }
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'pending': return <Clock className="h-4 w-4" />;
        case 'completed': return <CheckCircle className="h-4 w-4" />;
        case 'declined': return <XCircle className="h-4 w-4" />;
        default: return <FileText className="h-4 w-4" />;
    }
};

// --- Custom Confirmation Modal Component ---
// This can be moved to its own file (e.g., components/common/ConfirmationModal.jsx)
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-700 max-w-sm w-full"
            >
                <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>
                <p className="text-gray-300 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                    >
                        {confirmText}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


const RedistributionPage = () => {
    const dispatch = useDispatch();
    const formRef = useRef(null);
    const toastIdRef = useRef(null);


    // Selectors for Redistribution data
    const {
        redistributions,
        suggestions: reduxSuggestions,
        isLoading: redistLoading,
        isError: redistError,
        message: redistMessage,
        isSuccess: redistSuccess,
    } = useSelector((state) => state.redistribution);

    // Selectors for Inventory Drugs (for form dropdown)
    const {
        drugs: inventoryDrugs,
        isLoading: drugsLoading,
        isError: drugsError,
        message: drugsMessage,
    } = useSelector((state) => state.drug);

    // Selectors for Facilities (for form dropdown)
    const {
        facilities,
        isLoading: facilitiesLoading,
        isError: facilitiesError,
        message: facilitiesMessage,
    } = useSelector((state) => state.facility);

    const { user } = useSelector((state) => state.auth);

    // NEW STATE: Local state for AI suggestions, potentially loaded from localStorage
    const [localSuggestions, setLocalSuggestions] = useState([]);

    // Form states
    const [selectedDrug, setSelectedDrug] = useState('');
    const [quantity, setQuantity] = useState('');
    const [toFacility, setToFacility] = useState('');
    const [reason, setReason] = useState('');

    // State for filtering logs
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');

    // --- State for Custom Confirmation Modal ---
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(() => () => {}); // Function to call on confirm
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState('');
    const [confirmButtonText, setConfirmButtonText] = useState('');
    const [requestIdForConfirmation, setRequestIdForConfirmation] = useState(null); // Store ID for action


    // Fetch initial data on component mount and load suggestions from localStorage
    useEffect(() => {
        dispatch(getRedistributions());
        dispatch(getAllDrugs());
        dispatch(getAllFacilities());

        // Load suggestions from localStorage on initial mount
        try {
            const storedSuggestions = localStorage.getItem('aiRedistributionSuggestions');
            if (storedSuggestions) {
                setLocalSuggestions(JSON.parse(storedSuggestions));
            }
        } catch (e) {
            console.error("Failed to load suggestions from localStorage:", e);
            localStorage.removeItem('aiRedistributionSuggestions'); // Clear corrupted data
        }

        // Cleanup on unmount
        return () => {
            dispatch(RESET_REDISTRIBUTION());
            dispatch(RESET_DRUG());
            dispatch(RESET_FACILITIES());
        };
    }, [dispatch]);

    // IMPORTANT: Handle toast messages for Redux state changes AND reset toast state
    useEffect(() => {
        if (redistError && redistMessage) {
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
            }
            toastIdRef.current = toast.error(redistMessage);
        } else if (redistSuccess && redistMessage) {
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
            }
            toastIdRef.current = toast.success(redistMessage);
        }

        return () => {
            if (toastIdRef.current) {
                toast.dismiss(toastIdRef.current);
            }
        };

    }, [redistError, redistMessage, redistSuccess, dispatch]);

    // Handle drug and facility errors (if they also have messages that cause duplicate toasts,
    useEffect(() => {
        if (drugsError && drugsMessage) {
            toast.error(drugsMessage);

        }
    }, [drugsError, drugsMessage]);

    useEffect(() => {
        if (facilitiesError && facilitiesMessage) {
            toast.error(facilitiesMessage);
        }
    }, [facilitiesError, facilitiesMessage]);


    // NEW useEffect: Persist reduxSuggestions to localStorage whenever they change
    useEffect(() => {
        if (reduxSuggestions && reduxSuggestions.length > 0) {
            try {
                localStorage.setItem('aiRedistributionSuggestions', JSON.stringify(reduxSuggestions));
                setLocalSuggestions(reduxSuggestions);
            } catch (e) {
                console.error("Failed to save suggestions to localStorage:", e);
            }
        } else if (reduxSuggestions && reduxSuggestions.length === 0 && localSuggestions.length > 0) {
            localStorage.removeItem('aiRedistributionSuggestions');
            setLocalSuggestions([]);
        }
    }, [reduxSuggestions]);

    // Determine which suggestions to display: prioritize Redux suggestions if available, else local storage
    const displaySuggestions = reduxSuggestions.length > 0 ? reduxSuggestions : localSuggestions;


    // Function to fetch AI suggestions
    const handleGetSuggestions = () => {
        if (!redistLoading) {
            dispatch(getAIRedistributionSuggestions());
        } else {
            toast.info("AI suggestions are already being loaded or generated. Please wait.");
        }
    };

    // Handle form submission for creating a redistribution request
    const handleCreateRequest = async (e) => {
        e.preventDefault();

        if (!selectedDrug || !quantity || !toFacility || !reason) {
            toast.error('Please fill in all fields.');
            return;
        }

        const selectedInventoryDrug = inventoryDrugs.find(d => d._id === selectedDrug);
        if (selectedInventoryDrug && Number(quantity) > selectedInventoryDrug.currentStock) {
            toast.error(`Insufficient stock. Only ${selectedInventoryDrug.currentStock} available.`);
            return;
        }

        const userFacilityId = user?.facility && typeof user.facility === 'object' ? user.facility._id : user?.facility;
        if (user && toFacility === userFacilityId) {
            toast.error('Cannot redistribute drugs to your own facility.');
            return;
        }

        const redistributionData = {
            drug: selectedDrug,
            quantity: Number(quantity),
            toFacility: toFacility,
            reason,
        };

        const resultAction = await dispatch(createRedistribution(redistributionData));

        if (createRedistribution.fulfilled.match(resultAction)) {
            setSelectedDrug('');
            setQuantity('');
            setToFacility('');
            setReason('');
            dispatch(getRedistributions());
            dispatch(getAllDrugs());
        }
    };

    // --- MODIFIED: Handle approve/decline actions with custom confirmation ---
    const handleApproveClick = (id) => {
        setRequestIdForConfirmation(id);
        setConfirmTitle("Approve Redistribution Request");
        setConfirmMessage("Are you sure you want to APPROVE this redistribution request? This action will update inventory.");
        setConfirmButtonText("Approve");
        setConfirmAction(() => async () => { // Use a functional update for state
            const resultAction = await dispatch(approveRedistribution(id));
            if (approveRedistribution.fulfilled.match(resultAction)) {
                dispatch(getRedistributions());
                dispatch(getAllDrugs());
            }
        });
        setIsConfirmModalOpen(true);
    };

    const handleDeclineClick = (id) => {
        setRequestIdForConfirmation(id);
        setConfirmTitle("Decline Redistribution Request");
        setConfirmMessage("Are you sure you want to DECLINE this redistribution request?");
        setConfirmButtonText("Decline");
        setConfirmAction(() => async () => { // Use a functional update for state
            const resultAction = await dispatch(declineRedistribution(id));
            if (declineRedistribution.fulfilled.match(resultAction)) {
                dispatch(getRedistributions());
            }
        });
        setIsConfirmModalOpen(true);
    };

    const handleConfirmAction = async () => {
        setIsConfirmModalOpen(false); // Close modal immediately
        if (confirmAction) {
            await confirmAction(); // Execute the stored action
        }
        setRequestIdForConfirmation(null); // Clear the stored ID
    };

    const handleCloseConfirmModal = () => {
        setIsConfirmModalOpen(false);
        setRequestIdForConfirmation(null); // Clear the stored ID
        setConfirmAction(() => () => {}); // Reset action
    };
    // --- END MODIFIED ---


    // Autofill form from AI suggestion
    const handleInitiateTransfer = (suggestion) => {
        const drugToSelect = inventoryDrugs.find(d => d._id === suggestion.drugId);
        const facilityToSelect = facilities.find(f => f._id === suggestion.toFacilityId);

        if (drugToSelect) {
            setSelectedDrug(drugToSelect._id);
        } else {
            toast.warn(`Drug "${suggestion.drugName}" (ID: ${suggestion.drugId}) not found in your inventory. Cannot autofill drug.`);
            setSelectedDrug('');
        }

        setQuantity(suggestion.suggestedQuantity);
        if (facilityToSelect) {
            setToFacility(facilityToSelect._id);
        } else {
            toast.warn(`Facility "${suggestion.toFacilityName}" (ID: ${suggestion.toFacilityId}) not found. Cannot autofill facility.`);
            setToFacility('');
        }
        setReason(suggestion.reason);

        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };


    // Filter redistribution logs based on status and type (sent/received)
    const filteredRedistributions = redistributions.filter(request => {
        const matchesStatus = filterStatus === 'all' || request.status === filterStatus;

        let matchesType = true;

        if (user) {
            const userFacilityId = user.facility && typeof user.facility === 'object' ? user.facility._id : user.facility;

            if (filterType === 'sent') {
                const fromFacilityId = request.fromFacility && typeof request.fromFacility === 'object' ? request.fromFacility._id : request.fromFacility;
                matchesType = fromFacilityId === userFacilityId;
            } else if (filterType === 'received') {
                const toFacilityId = request.toFacility && typeof request.toFacility === 'object' ? request.toFacility._id : request.toFacility;
                matchesType = toFacilityId === userFacilityId;
            } else { // 'all' type
                const fromFacilityId = request.fromFacility && typeof request.fromFacility === 'object' ? request.fromFacility._id : request.fromFacility;
                const toFacilityId = request.toFacility && typeof request.toFacility === 'object' ? request.toFacility._id : request.toFacility;
                matchesType = (fromFacilityId === userFacilityId || toFacilityId === userFacilityId);
            }
        }

        return matchesStatus && matchesType;
    });

    // Determine if overall loading state is active for any relevant data
    const overallLoading = redistLoading || drugsLoading || facilitiesLoading;
    const overallError = redistError || drugsError || facilitiesError;
    const overallMessage = redistMessage || drugsMessage || facilitiesMessage;


    return (
        <div className="flex-1 flex flex-col overflow-y-auto">
            <Header title="Drug Redistribution" />

            <main className="p-6 space-y-8 text-gray-400 z-10">

                {/* AI Suggestions Section */}
                <motion.div
                    className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                >
                    <h2 className="text-2xl font-semibold text-emerald-400 mb-6 flex items-center gap-2">
                        <Lightbulb size={24} /> AI Redistribution Suggestions
                    </h2>
                    <button
                        onClick={handleGetSuggestions}
                        className="mb-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-md flex items-center gap-2 transition-colors duration-200"
                        disabled={redistLoading}
                    >
                        {redistLoading && displaySuggestions.length === 0 ? <Loader2 className="animate-spin h-5 w-5" /> : <Lightbulb size={20} />}
                        {redistLoading && displaySuggestions.length === 0 ? 'Getting Suggestions...' : 'Get AI Suggestions'}
                    </button>

                    {redistLoading && displaySuggestions.length === 0 ? (
                        <div className="flex justify-center items-center py-4">
                            <Loader2 className="animate-spin text-emerald-400" size={24} />
                            <span className="ml-3 text-lg text-gray-300">Loading AI suggestions...</span>
                        </div>
                    ) : overallError && displaySuggestions.length === 0 ? (
                        <div className="text-center py-4 text-red-400">
                            Error loading AI suggestions: {overallMessage}
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {displaySuggestions.length > 0 ? (
                                displaySuggestions.map((suggestion, index) => (
                                    <li key={index} className="bg-gray-700 p-4 rounded-lg flex items-start gap-4">
                                        <Truck className="h-6 w-6 text-emerald-400" />
                                        <div>
                                            <p className="text-gray-200 font-medium">{suggestion.drugName} (Batch: {suggestion.batchNumber || 'N/A'})</p>
                                            <p className="text-sm text-gray-300">
                                                Transfer <span className="font-semibold text-emerald-300">{suggestion.suggestedQuantity}</span> units
                                                from <span className="font-semibold text-yellow-300">{suggestion.fromFacilityName || 'N/A'}</span>
                                                to <span className="font-semibold text-blue-300">{suggestion.toFacilityName || 'N/A'}</span>.
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Reason: {suggestion.reason}
                                                {suggestion.daysUntilExpiry && ` (Expires in ${suggestion.daysUntilExpiry} days)`}
                                            </p>
                                            <button
                                                onClick={() => handleInitiateTransfer(suggestion)}
                                                className="mt-3 px-4 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 transition-colors"
                                            >
                                                Initiate Transfer
                                            </button>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <p className="text-gray-400 italic">No AI suggestions available at this moment. Click "Get AI Suggestions" to load.</p>
                            )}
                        </ul>
                    )}
                </motion.div>

                {/* Create New Redistribution Request Form */}
                <motion.div
                    ref={formRef}
                    className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <h2 className="text-2xl font-semibold text-indigo-400 mb-6 flex items-center gap-2">
                        <PlusCircle size={24} /> New Redistribution Request
                    </h2>
                    <form onSubmit={handleCreateRequest} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="drug" className="block text-sm font-medium text-gray-300 mb-2">Drug</label>
                            <select
                                id="drug"
                                value={selectedDrug}
                                onChange={(e) => setSelectedDrug(e.target.value)}
                                className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                                required
                                disabled={overallLoading}
                            >
                                <option value="">Select a drug</option>
                                {drugsLoading ? (
                                    <option disabled>Loading drugs...</option>
                                ) : drugsError ? (
                                    <option disabled>Error loading drugs</option>
                                ) : (
                                    inventoryDrugs.length === 0 ? (
                                        <option disabled>No drugs found in your inventory with stock.</option>
                                    ) : (
                                        inventoryDrugs
                                            .filter(drug => {
                                                if (!user || !user.facility) {
                                                    return false;
                                                }
                                                const drugFacilityId = drug.facility && typeof drug.facility === 'object' ? drug.facility._id : drug.facility;
                                                const userFacilityId = user.facility && typeof user.facility === 'object' ? user.facility._id : user.facility;

                                                const isFromUserFacility = drugFacilityId === userFacilityId;
                                                const hasStock = drug.currentStock > 0;

                                                return isFromUserFacility && hasStock;
                                            })
                                            .map((drug) => (
                                                <option key={drug._id} value={drug._id}>
                                                    {drug.drugName} (Batch: {drug.batchNumber || 'N/A'}, Stock: {drug.currentStock})
                                                </option>
                                            ))
                                    )
                                )}
                            </select>
                            {drugsError && <p className="text-red-400 text-xs mt-1">Error fetching drugs: {drugsMessage}</p>}
                        </div>
                        <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-2">Quantity</label>
                            <input
                                type="number"
                                id="quantity"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                                min="1"
                                required
                                disabled={overallLoading}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="toFacility" className="block text-sm font-medium text-gray-300 mb-2">To Facility</label>
                            <select
                                id="toFacility"
                                value={toFacility}
                                onChange={(e) => setToFacility(e.target.value)}
                                className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                                required
                                disabled={overallLoading}
                            >
                                <option value="">Select destination facility</option>
                                {facilitiesLoading ? (
                                    <option disabled>Loading facilities...</option>
                                ) : facilitiesError ? (
                                    <option disabled>Error loading facilities</option>
                                ) : (
                                    facilities.length === 0 ? (
                                        <option disabled>No other facilities available.</option>
                                    ) : (
                                        facilities
                                            .filter(fac => {
                                                const userFacilityId = user?.facility && typeof user.facility === 'object' ? user.facility._id : user?.facility;
                                                return user && fac._id !== userFacilityId;
                                            })
                                            .map((fac) => (
                                                <option key={fac._id} value={fac._id}>
                                                    {fac.name}
                                                </option>
                                            ))
                                    )
                                )}
                            </select>
                            {facilitiesError && <p className="text-red-400 text-xs mt-1">Error fetching facilities: {facilitiesMessage}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-2">Reason</label>
                            <textarea
                                id="reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                                rows="3"
                                required
                                disabled={overallLoading}
                            ></textarea>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-md flex items-center gap-2 transition-colors duration-200"
                                disabled={redistLoading}
                            >
                                {redistLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <PlusCircle size={20} />}
                                {redistLoading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                </motion.div>

                {/* Redistribution Logs & Pending Requests */}
                <motion.div
                    className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <h2 className="text-2xl font-semibold text-purple-400 mb-6 flex items-center gap-2">
                        <ArrowRightCircle size={24} /> Redistribution Logs & Requests
                    </h2>

                    {/* Filters for logs */}
                    <div className="flex gap-4 mb-6">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="declined">Declined</option>
                        </select>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Requests</option>
                            <option value="sent">Sent by Me</option>
                            <option value="received">Received by Me</option>
                        </select>
                    </div>

                    {overallLoading && filteredRedistributions.length === 0 ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="animate-spin text-blue-400" size={32} />
                            <span className="ml-3 text-lg text-gray-300">Loading redistribution logs...</span>
                        </div>
                    ) : overallError && filteredRedistributions.length === 0 ? (
                        <div className="text-center py-10 text-red-400">
                            Error loading redistribution logs: {overallMessage}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-left text-gray-300">
                                <thead className="bg-gray-700 text-gray-400">
                                    <tr>
                                        <th className="py-2 px-3">Drug</th>
                                        <th className="py-2 px-3">Quantity</th>
                                        <th className="py-2 px-3">From Facility</th>
                                        <th className="py-2 px-3">To Facility</th>
                                        <th className="py-2 px-3">Reason</th>
                                        <th className="py-2 px-3">Status</th>
                                        <th className="py-2 px-3">Date</th>
                                        <th className="py-2 px-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {filteredRedistributions.length > 0 ? (
                                            filteredRedistributions.map((request) => (
                                                <motion.tr
                                                    key={request._id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
                                                >
                                                    <td className="py-2 px-3 flex items-center gap-2">
                                                        <Package size={16} className="text-blue-400" />
                                                        {request.drug?.drugName || 'N/A'}
                                                    </td>
                                                    <td className="py-2 px-3">{request.quantity}</td>
                                                    <td className="py-2 px-3">{request.fromFacility?.name || 'N/A'}
                                                    </td>
                                                    <td className="py-2 px-3">{request.toFacility?.name || 'N/A'}
                                                    </td>
                                                    <td className="py-2 px-3">{request.reason}</td>
                                                    <td className="py-2 px-3">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                            {getStatusIcon(request.status)} {request.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3">{new Date(request.createdAt).toLocaleString()}</td>
                                                    <td className="py-2 px-3">
                                                        {request.status === 'pending' && user && request.toFacility?._id === (user.facility && typeof user.facility === 'object' ? user.facility._id : user.facility) && (
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleApproveClick(request._id)} // Changed to handleApproveClick
                                                                    className="p-1 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
                                                                    title="Approve Request"
                                                                    disabled={redistLoading}
                                                                >
                                                                    <CheckCircle size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeclineClick(request._id)} // Changed to handleDeclineClick
                                                                    className="p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                                                                    title="Decline Request"
                                                                    disabled={redistLoading}
                                                                >
                                                                    <XCircle size={18} />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {request.status === 'pending' && user && request.fromFacility?._id === (user.facility && typeof user.facility === 'object' ? user.facility._id : user.facility) && (
                                                            <span className="text-gray-500 italic text-xs">Awaiting Approval</span>
                                                        )}
                                                    </td>
                                                </motion.tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="text-center py-6 text-gray-400">
                                                    <FileText className="mx-auto mb-2" size={32} />
                                                    No redistribution requests found for selected filters.
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </main>
            {/* Custom Confirmation Modal Render */}
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={handleCloseConfirmModal}
                onConfirm={handleConfirmAction}
                title={confirmTitle}
                message={confirmMessage}
                confirmText={confirmButtonText}
            />
        </div>
    );
};

export default RedistributionPage;
