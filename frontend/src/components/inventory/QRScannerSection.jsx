import { QrCode, Scan, ScanLine } from "lucide-react";
import { motion } from "framer-motion";

const QRScannerSection = ({ onSwitchToManual }) => {
  
  const handleQRScan = () => {
    setShowCamera(true);

    // Simulate camera scanning (3s)
    setTimeout(() => {
      setShowCamera(false);
      // This is where QR result handling would go
    }, 3000);
  };
  return (
    <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md p-8 rounded-xl shadow-md text-center text-white border border-gray-700 w-full">
      <div className="flex flex-col items-center justify-center">
        <div className="bg-indigo-500 p-4 rounded-full mb-4">
          <QrCode size={32} />
        </div>
        <motion.button
            onClick={handleQRScan}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="mx-auto block p-12 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-300 rounded-2xl hover:border-blue-400 transition-colors group"
          >
            <div className="space-y-4">
              <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <ScanLine className="h-12 w-12 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Tap to scan drug via QR code</h3>
                <p className="text-gray-600 mt-2">Quick and accurate drug identification</p>
              </div>
            </div>
          </motion.button>

        <button
          onClick={onSwitchToManual}
          className="mt-6 bg-gray-700 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded-md"
        >
          Switch to Manual Entry
        </button>
      </div>
    </div>
  );
};

export default QRScannerSection;

