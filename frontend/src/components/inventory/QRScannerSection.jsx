import { useEffect, useRef, useState } from "react";
import { QrCode, ScanLine, X } from "lucide-react"; // Added X for stop button
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence for modal animations
import { toast } from "react-toastify"; // Assuming you have react-toastify setup in your app

const QRScannerSection = ({ onSwitchToManual, onResult }) => {
  const [scanning, setScanning] = useState(false);
  // scannerRef is not directly used by Html5Qrcode for its internal logic,
  // but the div with id="qr-reader" is where the video stream is injected.
  const scannerRef = useRef(null); // Retained for potential future direct DOM access if needed
  const html5QrCodeRef = useRef(null); // Ref to store the Html5Qrcode instance

  // Handler for the "Tap to scan" button
  const handleStartButtonClick = () => {
    setScanning(true); // This will trigger the useEffect below to start the scanner
  };

  // Handler for the "Stop Scanning" button
  const handleStopButtonClick = () => {
    setScanning(false); // This will trigger the useEffect cleanup to stop the scanner
  };

  // useEffect to manage the lifecycle of the Html5Qrcode scanner
  useEffect(() => {
    let qrCodeScanner = html5QrCodeRef.current; // Use the ref directly for the instance within this effect

    const qrRegionId = "qr-reader"; // ID of the HTML element where the camera feed will be rendered

    // Function to start the scanner (called when `scanning` becomes true)
    const startScanner = async () => {
      // Create Html5Qrcode instance if it doesn't exist
      if (!qrCodeScanner) {
        qrCodeScanner = new Html5Qrcode(qrRegionId);
        html5QrCodeRef.current = qrCodeScanner; // Store instance in ref
      }

      try {
        await qrCodeScanner.start(
          { facingMode: "environment" }, // Prefer the rear camera
          {
            fps: 10, // Frames per second to scan
            qrbox: { width: 250, height: 250 }, // Size of the QR scanning box
          },
          // Success callback: when a QR code is detected
          (decodedText) => {
            console.log("✅ QR Code Detected:", decodedText);
            toast.success("QR Code detected!");
            onResult && onResult(decodedText); // Pass the decoded text to the parent component
            // Set scanning to false here to stop the scanner and revert UI
            setScanning(false);
          },
          // Error callback for continuous scanning (when no QR code is found or minor stream issues)
          (errorMessage) => {
            // console.log("No QR code detected or scanning error (minor):", errorMessage);
          }
        );
        console.log("QR Code scanner started successfully.");
      } catch (err) {
        // This catch block handles errors that prevent the scanner from starting at all.
        console.error("QR Scanner Start Failed (Critical):", err);
        setScanning(false); // Reset scanning state on failure
        html5QrCodeRef.current = null; // Clear the instance on critical failure
        
        // Provide user-friendly feedback based on the error type
        if (err.name === "NotAllowedError") {
          toast.error("Camera access denied. Please grant camera permissions in your browser settings.");
        } else if (err.name === "NotFoundError") {
          toast.error("No camera found on this device.");
        } else if (err.name === "NotReadableError") {
          toast.error("Camera is already in use by another application or not accessible.");
        } else if (err.name === "OverconstrainedError") {
          toast.error("Camera constraints not supported by device. Try a different camera or browser.");
        } else {
          toast.error(`Failed to start QR scanner: ${err.message || 'Unknown error'}`);
        }
      }
    };

    // Function to stop the scanner (called when `scanning` becomes false or on unmount)
    const stopScanner = async () => {
      // Use html5QrCodeRef.current directly here as it's the source of truth
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) { // Check if scanner instance exists and is running
        try {
          await html5QrCodeRef.current.stop(); // This should stop the camera and clear the canvas
          console.log("QR Code scanner stopped.");
        } catch (err) {
          // This catch block will handle errors if the scanner was not running
          // or if there was an issue releasing camera resources.
          console.error("Error stopping QR scanner:", err);
          if (err.message !== "Code scanner not running.") { // Avoid toast for expected "not running" error
            toast.error(`Failed to stop QR scanner: ${err.message || 'Unknown error'}`);
          }
        } finally {
          // Always ensure these are reset regardless of stop success/failure
          html5QrCodeRef.current = null; // Clear ref
        }
      }
      // Ensure UI reflects non-scanning state. This is crucial even if stop fails.
      setScanning(false);
    };

    // Effect logic based on 'scanning' state
    if (scanning) {
      startScanner();
    } else {
      // Only attempt to stop if a scanner instance was actually created and might be running
      if (html5QrCodeRef.current) {
        stopScanner();
      }
    }

    // Cleanup function for the effect: runs when component unmounts or `scanning` changes
    return () => {
      // Ensure the scanner is stopped and resources are released when the component is removed from the DOM.
      // This is crucial to prevent camera access issues on subsequent mounts or other components.
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) { // Check if it's still scanning before stopping
        html5QrCodeRef.current.stop().catch(e => console.error("Error on unmount stop:", e));
        html5QrCodeRef.current.clear(); // Explicitly clear on unmount for good measure
        html5QrCodeRef.current = null;
      }
    };
  }, [scanning, onResult]); // Re-run effect when 'scanning' state or 'onResult' prop changes

  return (
    <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md p-8 rounded-xl shadow-md text-center text-white border border-gray-700 w-full">
      {!scanning ? (
        <div className="flex flex-col items-center justify-center">
          <div className="bg-indigo-500 p-4 rounded-full mb-4">
            <QrCode size={32} />
          </div>
          <motion.button
            onClick={handleStartButtonClick} // Use the new handler
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
          {/* This is where the Html5Qrcode scanner will render the video feed */}
          {/* The div with qr-reader ID must be present in the DOM when Html5Qrcode.start() is called */}
          <div id="qr-reader" ref={scannerRef} className="w-full mx-auto max-w-sm"></div>
          <button
            onClick={handleStopButtonClick} // Use the new handler
            className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md flex items-center justify-center mx-auto"
          >
            <X size={16} className="mr-2" /> Stop Scanning
          </button>
        </div>
      )}
    </div>
  );
};

export default QRScannerSection;
