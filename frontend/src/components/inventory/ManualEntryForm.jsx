import { useState } from "react";
import { Package, CalendarCheck, Boxes, User, Clipboard, AlertTriangle } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createDrug } from "../../redux/drug/drugSlice";

const initialState = {
	      drugName:"",
        batchNumber:"",
        currentStock:"",
        supplier:"",
        expiryDate:"",
        receivedDate:"",
      
  }
const ManualEntryForm = ({ onCancel }) => {
  
      const [formData, setFormData] = useState(initialState);
      const {drugName,
          batchNumber,
          currentStock,
          supplier,
          expiryDate,
          receivedDate,
          } = formData
      
      const dispatch = useDispatch()
      const navigate = useNavigate()
    
      const {isLoading, isSuccess} = useSelector((state) =>state.drug)
    
      const handleInputChange = (e) => {
      const {name, value} = e.target
      setFormData({ ...formData, [name]: value})
       }
  
    
      const handleSubmit = async(e) => {
        e.preventDefault()
    //  Validations


    if (!drugName || !batchNumber || !currentStock || !supplier || !expiryDate || !receivedDate) {
      return toast.error("All fields are required")
      
     }
         if (parseInt(currentStock) < 1) {
                return toast.error("Stock must be at least 1")
         }     
       
         // Send form data including base64 image
       const drugData = {
          drugName,
          batchNumber,
          currentStock,
          supplier,
          expiryDate,
          receivedDate,
          
          }
      
        await dispatch(createDrug(drugData));   
    
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
          id="drugName"
          name="drugName"
          value={drugName}
          onChange={handleInputChange}
          required
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
          placeholder="e.g., Amoxicillin 500mg"
        />

      </div>

      {/* Batch Number */}
      <div>
        <label className="text-sm block mb-1">Batch Number</label>
        <input
          type="text"
          name="batchNumber"
          id="batchNumber"
          value={batchNumber}
          required
          onChange={handleInputChange}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
          placeholder="e.g., AMX-2024-001"
        />

      </div>

      {/* Current Stock */}
      <div>
        <label className="text-sm block mb-1">Current Stock</label>
        <input
          type="number"
          name="currentStock"
          id="currentStock"
          value={currentStock}
          onChange={handleInputChange}
          min="1"
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
          placeholder="e.g., 100"
        />
      </div>

      {/* Supplier */}
      <div>
        <label className="text-sm block mb-1">Supplier</label>
        <input
          type="text"
          name="supplier"
          id="supplier"
          value={supplier}
          onChange={handleInputChange}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
          placeholder="e.g., National Medical Stores"
        />
      </div>

      {/* Expiry Date */}
      <div>
        <label className="text-sm block mb-1">Expiry Date</label>
        <input
          type="date"
          name="expiryDate"
          id="expiryDate"
          value={expiryDate}
          onChange={handleInputChange}
          className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2"
        />
      </div>

      {/* Received Date */}
      <div>
        <label className="text-sm block mb-1">Received Date</label>
        <input
          type="date"
          name="receivedDate"
          id="receivedDate"
          value={receivedDate}
          onChange={handleInputChange}
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
