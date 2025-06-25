import { useState } from "react";
import { Package, CalendarCheck, Boxes, User, Clipboard, AlertTriangle } from "lucide-react";

const ManualEntryForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    drugName: "",
    batchNumber: "",
    currentStock: "",
    supplier: "",
    expiryDate: "",
    receivedDate: new Date().toISOString().split("T")[0]
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.drugName) newErrors.drugName = "Drug name is required";
    if (!formData.batchNumber) newErrors.batchNumber = "Batch number is required";
    if (!formData.currentStock || parseInt(formData.currentStock) < 1) newErrors.currentStock = "Stock must be at least 1";
    if (!formData.supplier) newErrors.supplier = "Supplier is required";
    if (!formData.expiryDate) newErrors.expiryDate = "Expiry date is required";
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <h3 className="text-lg font-semibold mb-4 text-white flex items-center">
        <Clipboard className="mr-2 text-indigo-400" />
        Manual Drug Entry
      </h3>

      {/* Drug Name */}
      <div>
        <label className="text-sm block mb-1">Drug Name</label>
        <input
          type="text"
          name="drugName"
          value={formData.drugName}
          onChange={handleChange}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
          placeholder="e.g., Amoxicillin 500mg"
        />
        {errors.drugName && <p className="text-red-400 text-sm mt-1 flex items-center"><AlertTriangle size={14} className="mr-1" /> {errors.drugName}</p>}
      </div>

      {/* Batch Number */}
      <div>
        <label className="text-sm block mb-1">Batch Number</label>
        <input
          type="text"
          name="batchNumber"
          value={formData.batchNumber}
          onChange={handleChange}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
          placeholder="e.g., AMX-2024-001"
        />
        {errors.batchNumber && <p className="text-red-400 text-sm mt-1 flex items-center"><AlertTriangle size={14} className="mr-1" /> {errors.batchNumber}</p>}
      </div>

      {/* Current Stock */}
      <div>
        <label className="text-sm block mb-1">Current Stock</label>
        <input
          type="number"
          name="currentStock"
          value={formData.currentStock}
          onChange={handleChange}
          min="1"
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
          placeholder="e.g., 100"
        />
        {errors.currentStock && <p className="text-red-400 text-sm mt-1 flex items-center"><AlertTriangle size={14} className="mr-1" /> {errors.currentStock}</p>}
      </div>

      {/* Supplier */}
      <div>
        <label className="text-sm block mb-1">Supplier</label>
        <input
          type="text"
          name="supplier"
          value={formData.supplier}
          onChange={handleChange}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
          placeholder="e.g., National Medical Stores"
        />
        {errors.supplier && <p className="text-red-400 text-sm mt-1 flex items-center"><AlertTriangle size={14} className="mr-1" /> {errors.supplier}</p>}
      </div>

      {/* Expiry Date */}
      <div>
        <label className="text-sm block mb-1">Expiry Date</label>
        <input
          type="date"
          name="expiryDate"
          value={formData.expiryDate}
          onChange={handleChange}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
        />
        {errors.expiryDate && <p className="text-red-400 text-sm mt-1 flex items-center"><AlertTriangle size={14} className="mr-1" /> {errors.expiryDate}</p>}
      </div>

      {/* Received Date */}
      <div>
        <label className="text-sm block mb-1">Received Date</label>
        <input
          type="date"
          name="receivedDate"
          value={formData.receivedDate}
          onChange={handleChange}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-3">
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm font-medium"
        >
          Submit Entry
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-500 text-sm rounded-md text-gray-300 hover:bg-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ManualEntryForm;
