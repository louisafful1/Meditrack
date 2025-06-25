import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clipboard,
  AlertTriangle,
  Check,
  RotateCcw,
} from "lucide-react";
import Header from "../components/common/Header";

const mockInventory = [
  { id: 1, name: "Amoxicillin 500mg", stock: 120 },
  { id: 2, name: "Paracetamol 500mg", stock: 85 },
  { id: 3, name: "Insulin Vials", stock: 15 },
  { id: 4, name: "Ibuprofen 200mg", stock: 45 },
  { id: 5, name: "Metformin 500mg", stock: 30 },
];

const mockRecentDispenses = [
  { id: 1, drugName: 'Amoxicillin 500mg', quantity: 5, dispensedTo: 'Patient: John Doe', date: '2024-06-15', notes: 'For bacterial infection' },
  { id: 2, drugName: 'Paracetamol 500mg', quantity: 10, dispensedTo: 'Ward: Pediatrics', date: '2024-06-14', notes: 'For fever management' },
  { id: 3, drugName: 'Insulin Vials', quantity: 2, dispensedTo: 'Patient: Sarah Smith', date: '2024-06-13', notes: 'Monthly supply' },
  { id: 4, drugName: 'Ibuprofen 200mg', quantity: 8, dispensedTo: 'Ward: Emergency', date: '2024-06-12', notes: 'Pain management' },
  { id: 5, drugName: 'Metformin 500mg', quantity: 15, dispensedTo: 'Patient: Robert Johnson', date: '2024-06-10', notes: 'Diabetes medication' },
  { id: 6, drugName: 'Amoxicillin 500mg', quantity: 3, dispensedTo: 'Patient: Maria Garcia', date: '2024-06-08', notes: '' }
];

const DispensePage = () => {
  const [formData, setFormData] = useState({
    drugId: "",
    quantity: "",
    dispensedTo: "",
    date: new Date().toISOString().split("T")[0],
    notes: ""
  });
  const [stockError, setStockError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...formData, [name]: value };
    setFormData(updatedForm);
    checkStock(updatedForm);
  };

  const checkStock = (form) => {
    const drug = mockInventory.find((d) => d.id === parseInt(form.drugId));
    if (drug && parseInt(form.quantity) > drug.stock) {
      setStockError(`Only ${drug.stock} units available.`);
    } else {
      setStockError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (stockError) return;
    alert(`Dispensed ${formData.quantity} of ${mockInventory.find(d => d.id === parseInt(formData.drugId))?.name}`);
    handleClear();
  };

  const handleClear = () => {
    setFormData({
      drugId: "",
      quantity: "",
      dispensedTo: "",
      date: new Date().toISOString().split("T")[0],
      notes: ""
    });
    setStockError("");
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Dispense Drugs" />
        <main className='p-6 space-y-6'>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            className='bg-gray-800 bg-opacity-50 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-700'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className='text-xl font-semibold mb-4 text-white flex items-center'>
              <Clipboard className='mr-2 text-indigo-400' />
              Record Dispensing
            </h3>

            <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
  <label className='text-sm'>Drug</label>
  <select
    name='drugId'
    value={formData.drugId}
    onChange={handleChange}
    required
    className='w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 mt-1 focus:ring-indigo-500'
  >
    <option value=''>Select a drug...</option>
    {mockInventory.map((drug) => (
      <option key={drug.id} value={drug.id}>
        {drug.name} (Stock: {drug.stock})
      </option>
    ))}
  </select>
</div>


              <div>
                <label className='text-sm'>Quantity</label>
                <input
                  type='number'
                  name='quantity'
                  value={formData.quantity}
                  onChange={handleChange}
                  min='1'
                  required
                  className='w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 mt-1 focus:ring-indigo-500'
                />
                {stockError && (
                  <p className='text-red-400 text-sm mt-1 flex items-center'>
                    <AlertTriangle className='mr-1' size={14} /> {stockError}
                  </p>
                )}
              </div>

              <div>
                <label className='text-sm'>Dispensed To</label>
                <input
                  type='text'
                  name='dispensedTo'
                  value={formData.dispensedTo}
                  onChange={handleChange}
                  placeholder='Patient name or department'
                  required
                  className='w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 mt-1 focus:ring-indigo-500'
                />
              </div>

              <div>
                <label className='text-sm'>Date</label>
                <input
                  type='date'
                  name='date'
                  value={formData.date}
                  onChange={handleChange}
                  className='w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 mt-1 focus:ring-indigo-500'
                />
              </div>

              <div>
                <label className='text-sm'>Notes</label>
                <textarea
                  name='notes'
                  rows='3'
                  value={formData.notes}
                  onChange={handleChange}
                  className='w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 mt-1 focus:ring-indigo-500'
                  placeholder='Additional notes...'
                ></textarea>
              </div>

              <div className='flex space-x-3'>
                <button
                  type='submit'
                  className='flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm font-medium'
                >
                  <Check className='mr-2' size={16} /> Submit
                </button>
                <button
                  type='button'
                  onClick={handleClear}
                  className='flex items-center px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-200 hover:bg-gray-700'
                >
                  <RotateCcw className='mr-2' size={16} /> Clear
                </button>
              </div>
            </form>
          </motion.div>

          <motion.div
            className='bg-gray-800 bg-opacity-50 backdrop-blur-md p-6 rounded-xl shadow-lg border border-gray-700'
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h3 className='text-xl font-semibold mb-4 text-white'>Recent Dispenses</h3>
            <div className='space-y-4 max-h-96 overflow-y-auto pr-2'>
              {mockRecentDispenses.map((dispense) => (
                <motion.div
                  key={dispense.id}
                  className='bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-indigo-500 transition'
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className='flex justify-between items-center'>
                    <div>
                      <p className='text-sm font-semibold text-white'>{dispense.drugName}</p>
                      <p className='text-xs text-gray-300'>{dispense.dispensedTo}</p>
                    </div>
                    <span className='bg-indigo-500 text-xs text-white font-medium px-2 py-1 rounded-full'>
                      {dispense.quantity} units
                    </span>
                  </div>
                  <p className='text-xs text-gray-400 mt-1'>
                    {new Date(dispense.date).toLocaleDateString()}
                  </p>
                  {dispense.notes && (
                    <p className='text-xs text-gray-300 mt-1 italic'>{dispense.notes}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
          </div>
        </main>
      </div>
  );
};

export default DispensePage;
