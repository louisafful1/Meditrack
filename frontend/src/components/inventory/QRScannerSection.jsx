import { useEffect, useRef, useState } from "react";
import { QrCode, ScanLine } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { motion } from "framer-motion";

const QRScannerSection = ({ onSwitchToManual, onResult }) => {
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

const startScanning = () => {
  setScanning(true);
};

useEffect(() => {
  if (scanning && !html5QrCodeRef.current) {
    const qrRegionId = "qr-reader";
    html5QrCodeRef.current = new Html5Qrcode(qrRegionId);

html5QrCodeRef.current.start(
  { facingMode: "environment" },
  {
    fps: 10,
    qrbox: { width: 250, height: 250 },
  },
  (decodedText) => {
    console.log("✅ Detected:", decodedText);
    onResult && onResult(decodedText);
    stopScanning();
  },
        (err) => {}
      )
      .catch((err) => {
        console.error("QR start failed:", err);
        setScanning(false);
      });
  }
}, [scanning]);

  const stopScanning = () => {
    html5QrCodeRef.current
      ?.stop()
      .then(() => {
        html5QrCodeRef.current.clear();
        setScanning(false);
      })
      .catch((err) => {
        console.error("Stop error", err);
      });
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md p-8 rounded-xl shadow-md text-center text-white border border-gray-700 w-full">
      {!scanning ? (
        <div className="flex flex-col items-center justify-center">
          <div className="bg-indigo-500 p-4 rounded-full mb-4">
            <QrCode size={32} />
          </div>
          <motion.button
            onClick={startScanning}
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
      ) : (
        <div>
          <div id="qr-reader" ref={scannerRef} className="w-full mx-auto max-w-sm"></div>
          <button
            onClick={stopScanning}
            className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md"
          >
            Stop Scanning
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScannerSection;
