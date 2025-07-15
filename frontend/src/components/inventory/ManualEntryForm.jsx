import React, { useState, useEffect } from 'react';
import { PlusCircle, XCircle, Loader2, Clipboard } from 'lucide-react'; // Added Clipboard for consistency
import { useDispatch, useSelector } from 'react-redux';
import { createDrug, updateDrug } from '../../redux/drug/drugSlice'; // Assuming these actions exist
import { toast } from 'react-toastify';

// Helper to format date strings for input type="date"
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Ensure date is valid before formatting
    if (isNaN(date.getTime())) {
        console.warn("Invalid date string provided to formatDateForInput:", dateString);
        return '';
    }
    return date.toISOString().split('T')[0];
};

const ManualEntryForm = ({ onCancel, initialData, onSubmissionSuccess }) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    const { isLoading: drugLoading } = useSelector((state) => state.drug);

    const [drugName, setDrugName] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [currentStock, setCurrentStock] = useState('');
    const [supplier, setSupplier] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [receivedDate, setReceivedDate] = useState('');
    const [reorderLevel, setReorderLevel] = useState(''); // Added reorderLevel

    // Use a state to track if we are editing an existing drug
    const [isEditing, setIsEditing] = useState(false);
    const [editingDrugId, setEditingDrugId] = useState(null);

    // Effect to populate form fields when initialData changes (from QR scan or edit)
    useEffect(() => {
        if (initialData) {
            setDrugName(initialData.drugName || '');
            setBatchNumber(initialData.batchNumber || '');
            setCurrentStock(initialData.currentStock || '');
            setSupplier(initialData.supplier || '');
            setExpiryDate(formatDateForInput(initialData.expiryDate));
            setReceivedDate(formatDateForInput(initialData.receivedDate));
            setReorderLevel(initialData.reorderLevel || ''); // Populate reorderLevel

            // If initialData contains an _id, it means we are editing an existing drug
            if (initialData._id) {
                setIsEditing(true);
                setEditingDrugId(initialData._id);
            } else {
                setIsEditing(false);
                setEditingDrugId(null);
            }
        } else {
            // Clear form if no initialData is provided or initialData becomes null
            setDrugName('');
            setBatchNumber('');
            setCurrentStock('');
            setSupplier('');
            setExpiryDate('');
            setReceivedDate('');
            setReorderLevel('');
            setIsEditing(false);
            setEditingDrugId(null);
        }
    }, [initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user || !user.facility) {
            toast.error("User facility information missing. Cannot add/update drug.");
            return;
        }

        if (!drugName || !batchNumber || currentStock === '' || !supplier || !expiryDate || !receivedDate || reorderLevel === '') {
            toast.error('Please fill in all fields.');
            return;
        }

        if (parseInt(currentStock) < 0) { // Changed to 0, as stock can be 0 (e.g., after depletion)
            return toast.error("Current Stock cannot be negative.");
        }
        if (parseInt(reorderLevel) < 0) {
            return toast.error("Reorder Level cannot be negative.");
        }

        const drugData = {
            drugName,
            batchNumber,
            currentStock: Number(currentStock),
            supplier,
            expiryDate: new Date(expiryDate).toISOString(),
            receivedDate: new Date(receivedDate).toISOString(),
            reorderLevel: Number(reorderLevel), // Include reorderLevel in data
            facility: user.facility, // Associate with current user's facility
            // Determine status based on stock and reorder level
            status: Number(currentStock) <= Number(reorderLevel) / 2 ? "Critical" :
                    Number(currentStock) <= Number(reorderLevel) ? "Low Stock" : "Adequate"
        };

        let resultAction;
        if (isEditing) {
            // For editing, we send the ID and the updated data
            resultAction = await dispatch(updateDrug({ id: editingDrugId, drugData }));
        } else {
            // For new entry
            resultAction = await dispatch(createDrug(drugData));
        }

        if (resultAction.meta.requestStatus === 'fulfilled') {
            toast.success(`Drug ${isEditing ? 'updated' : 'added'} successfully!`);
            onSubmissionSuccess && onSubmissionSuccess(); // Notify parent on success
            // Clear form after successful submission
            setDrugName('');
            setBatchNumber('');
            setCurrentStock('');
            setSupplier('');
            setExpiryDate('');
            setReceivedDate('');
            setReorderLevel('');
            setIsEditing(false);
            setEditingDrugId(null);
        } else {
            // Handle error message from payload if available, otherwise generic
            const errorMessage = resultAction.payload?.message || resultAction.error?.message || 'Unknown error';
            toast.error(`Failed to ${isEditing ? 'update' : 'add'} drug: ${errorMessage}`);
            console.error(`Error ${isEditing ? 'updating' : 'adding'} drug:`, resultAction.payload || resultAction.error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-gray-800 rounded-xl shadow-md border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
                <Clipboard className="mr-2 text-indigo-400" />
                {isEditing ? 'Edit Drug Entry' : 'Manual Drug Entry'}
            </h3>

            {/* Drug Name */}
            <div>
                <label htmlFor="drugName" className="text-sm block mb-1 text-gray-300">Drug Name</label>
                <input
                    type="text"
                    id="drugName"
                    name="drugName"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    required
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Amoxicillin 500mg"
                    disabled={drugLoading}
                />
            </div>

            {/* Batch Number */}
            <div>
                <label htmlFor="batchNumber" className="text-sm block mb-1 text-gray-300">Batch Number</label>
                <input
                    type="text"
                    name="batchNumber"
                    id="batchNumber"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    required
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., AMX-2024-001"
                    disabled={drugLoading}
                />
            </div>

            {/* Current Stock */}
            <div>
                <label htmlFor="currentStock" className="text-sm block mb-1 text-gray-300">Current Stock</label>
                <input
                    type="number"
                    name="currentStock"
                    id="currentStock"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    min="0"
                    required
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 100"
                    disabled={drugLoading}
                />
            </div>

            {/* Supplier */}
            <div>
                <label htmlFor="supplier" className="text-sm block mb-1 text-gray-300">Supplier</label>
                <input
                    type="text"
                    name="supplier"
                    id="supplier"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., National Medical Stores"
                    required
                    disabled={drugLoading}
                />
            </div>

            {/* Expiry Date */}
            <div>
                <label htmlFor="expiryDate" className="text-sm block mb-1 text-gray-300">Expiry Date</label>
                <input
                    type="date"
                    name="expiryDate"
                    id="expiryDate"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={drugLoading}
                />
            </div>

            {/* Received Date */}
            <div>
                <label htmlFor="receivedDate" className="text-sm block mb-1 text-gray-300">Received Date</label>
                <input
                    type="date"
                    name="receivedDate"
                    id="receivedDate"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={drugLoading}
                />
            </div>

            {/* Reorder Level */}
            <div>
                <label htmlFor="reorderLevel" className="text-sm block mb-1 text-gray-300">Reorder Level</label>
                <input
                    type="number"
                    name="reorderLevel"
                    id="reorderLevel"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    min="0"
                    required
                    className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 10"
                    disabled={drugLoading}
                />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-3 col-span-1 md:col-span-2 justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2.5 px-6 rounded-md flex items-center gap-2 transition-colors duration-200"
                    disabled={drugLoading}
                >
                    <XCircle size={20} /> Cancel
                </button>
                <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-md flex items-center gap-2 transition-colors duration-200"
                    disabled={drugLoading}
                >
                    {drugLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <PlusCircle size={20} />}
                    {drugLoading ? 'Submitting...' : (isEditing ? 'Update Drug' : 'Add Drug')}
                </button>
            </div>
        </form>
    );
};

export default ManualEntryForm;
