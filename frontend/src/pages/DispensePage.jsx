import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clipboard, AlertTriangle, Check, RotateCcw } from "lucide-react";
import Header from "../components/common/Header";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllDrugs,
} from "../redux/drug/drugSlice";
import { dispenseDrug, getDispensations } from "../redux/dispense/dispenseSlice";

const DispensePage = () => {
  
  const dispatch = useDispatch();
  const { drugs = [], } = useSelector((state) => state.drug);
    const { records = [] } = useSelector((state) => state.dispense);

  

  const [formData, setFormData] = useState({
    drug: "",
    quantityDispensed: "",
    dispensedTo: "",
    note: "",
  });

  const [selectedDrug, setSelectedDrug] = useState(null);
  const [stockError, setStockError] = useState("");

  useEffect(() => {
    dispatch(getAllDrugs());
    dispatch(getDispensations());
  }, [dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedForm = { ...formData, [name]: value };
    setFormData(updatedForm);

    if (name === "drug") {
      const drug = drugs.find((d) => d._id === value);
      setSelectedDrug(drug);
      setStockError("");
    }

    if (name === "quantityDispensed" || name === "drug") {
      validateStock(updatedForm);
    }
  };

  const validateStock = (form) => {
    const drug = drugs.find((d) => d._id === form.drug);
    const enteredQty = parseInt(form.quantityDispensed || 0);

    if (drug && enteredQty > drug.currentStock) {
      setStockError(`Only ${drug.currentStock} units available.`);
    } else {
      setStockError("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (stockError || !formData.drug) return;

    dispatch(dispenseDrug(formData)).then(() => {
      dispatch(getAllDrugs()); // update inventory count
      dispatch(getDispensations()); // update recent logs
      handleClear();
    });
  };

  const handleClear = () => {
    setFormData({
      drug: "",
      quantityDispensed: "",
      dispensedTo: "",
      note: "",
    });
    setSelectedDrug(null);
    setStockError("");
  };

  const calculatedRemainingStock = () => {
    if (!selectedDrug || !formData.quantityDispensed) return "";
    return selectedDrug.currentStock - parseInt(formData.quantityDispensed || 0);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <Header title="Dispense Drugs" />
      <main className="p-4 md:p-6 space-y-6 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dispense Form */}
          <motion.div
            className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
              <Clipboard className="mr-2 text-indigo-400" />
              Record Drug Dispense
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Drug Select */}
              <div>
                <label className="text-sm text-gray-300">Drug</label>
                <select
                  name="drug"
                  value={formData.drug}
                  onChange={handleChange}
                  required
                  className="w-full mt-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
                >
                  <option value="">Select a drug...</option>
                  {drugs.map((drug) => (
                    <option key={drug._id} value={drug._id}>
                      {drug.drugName} (Stock: {drug.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock & quantityDispensed */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-300">Available</label>
                  <input
                    type="number"
                    value={selectedDrug?.currentStock || ""}
                    disabled
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-300">Quantity</label>
                  <input
                    type="number"
                    name="quantityDispensed"
                    value={formData.quantityDispensed}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 mt-1"
                  />
                  {stockError && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertTriangle className="mr-1" size={14} />
                      {stockError}
                    </p>
                  )}
                </div>
              </div>

              {/* Remaining Display */}
              {formData.quantityDispensed && !stockError && (
                <p className="text-sm text-green-400">
                  Remaining after dispense: {calculatedRemainingStock()} units
                </p>
              )}

              {/* Expiry Date */}
              {selectedDrug?.expiryDate && (
                <div>
                  <label className="text-sm text-gray-300">Expiry Date</label>
                  <input
                    type="text"
                    disabled
                    value={new Date(selectedDrug.expiryDate).toLocaleDateString(
                      "en-GB",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 mt-1"
                  />
                </div>
              )}

              {/* Dispensed To */}
              <div>
                <label className="text-sm text-gray-300">Dispensed To</label>
                <input
                  type="text"
                  name="dispensedTo"
                  value={formData.dispensedTo}
                  onChange={handleChange}
                  placeholder="e.g. Patient or Department"
                  required
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 mt-1"
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-sm text-gray-300">Note</label>
                <textarea
                  name="note"
                  value={formData.note}
                  onChange={handleChange}
                  rows="3"
                  className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 mt-1"
                  placeholder="Additional note..."
                />
              </div>

              {/* Submit & Clear */}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm font-medium"
                >
                  <Check className="mr-2" size={16} /> Submit
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-200 hover:bg-gray-700"
                >
                  <RotateCcw className="mr-2" size={16} /> Clear
                </button>
              </div>
            </form>
          </motion.div>

          {/* Recent Dispenses */}
          <motion.div
            className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">
              Recent Dispenses
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {records.slice(0, 5).map((d) => (
                <div
                  key={d._id}
                  className="bg-gray-700 border border-gray-600 p-4 rounded-md"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">
                        {d.drug?.drugName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {d.dispensedTo}
                      </p>
                    </div>
                    <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full">
                      {d.quantityDispensed} units
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                  {d.note && (
                    <p className="text-xs italic text-gray-300">{d.note}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default DispensePage;
