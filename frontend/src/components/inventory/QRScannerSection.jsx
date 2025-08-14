import { useEffect, useRef } from "react"; // Removed useState as scanning is now a prop
import { QrCode, ScanLine, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

// isScanning and setIsScanning are now props, controlled by the parent component (InventoryPage)
const QRScannerSection = ({ onSwitchToManual, onResult, isScanning, setIsScanning }) => {
    const html5QrCodeRef = useRef(null); // Ref to store the Html5Qrcode instance

    // Function to stop and clear the scanner instance
    const stopAndClearScanner = async () => {
        const qrCodeScanner = html5QrCodeRef.current;
        if (qrCodeScanner) {
            try {
                if (qrCodeScanner.isScanning) {
                    await qrCodeScanner.stop();
                }
                await qrCodeScanner.clear(); // Explicitly clear resources
            } catch (err) {
                // Filter out known harmless errors from html5-qrcode
                if (err && err.message &&
                   !err.message.includes("Code scanner not running") &&
                   !err.message.includes("Cannot transition to a new state") &&
                   !err.message.includes("No stream to stop") &&
                   !err.message.includes("Cannot clear while scan is ongoing") &&
                   !err.message.includes("removeChild")) {
                    toast.error(`Failed to stop QR scanner: ${err.message || 'Unknown error'}`);
                }
            } finally {
                html5QrCodeRef.current = null; // Ensure ref is nullified after attempt
            }
        }
    };

    // Handler for the "Tap to scan" button
    const handleStartButtonClick = () => {
        setIsScanning(true); // Update the parent's state to start scanning
    };

    // Handler for the "Stop Scanning" button
    const handleStopButtonClick = async () => {
        await stopAndClearScanner(); // Call the dedicated stop and clear function
        setIsScanning(false); // Update the parent's state to stop scanning
    };

    // useEffect to manage the lifecycle of the Html5Qrcode scanner
    useEffect(() => {
        const qrRegionId = "qr-reader";

        const startScanner = async () => {
            // Only create a new instance if one doesn't already exist
            if (!html5QrCodeRef.current) {
                const newScannerInstance = new Html5Qrcode(qrRegionId);
                html5QrCodeRef.current = newScannerInstance;
            }

            try {
                await html5QrCodeRef.current.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText) => {
                        onResult && onResult(decodedText); // Pass the decoded text to the parent component
                        // CRITICAL: After a successful scan, explicitly tell the parent to stop scanning.
                        // This will cause this component to re-render with isScanning=false,
                        // triggering the cleanup in the useEffect's return function.
                        setIsScanning(false);
                    },
                    (errorMessage) => {
                        // Minor errors, no toast for these continuous scan errors
                    }
                );
            } catch (err) {
                setIsScanning(false); // Reset parent's scanning state on failure
                await stopAndClearScanner(); // Attempt to clean up even if start failed

                if (err.name === "NotAllowedError") {
                    toast.error("Camera access denied. Please grant camera permissions in your browser settings.");
                } else if (err.name === "NotFoundError") {
                    toast.error("No camera found on this device.");
                } else if (err.name === "NotReadableError") {
                    toast.error("Camera is already in use by another application or not accessible.");
                } else if (err.name === "OverconstrainedError") {
                    toast.error("Camera constraints not supported by device. Try a different camera or browser.");
                } else {
                    // Only show a generic "Failed to start" for truly unhandled critical errors
                    // AND if the error message is NOT one of the common internal html5-qrcode warnings
                    if (err && err.message &&
                        !err.message.includes("Cannot transition to a new state") &&
                        !err.message.includes("No stream to stop") &&
                        !err.message.includes("removeChild") &&
                        !err.message.includes("Code scanner not running")) {
                        toast.error(`Failed to start QR scanner: ${err.message || 'Unknown error'}`);
                    } else {
                        console.warn("QR scanner start failed with non-critical error:", err);
                    }
                }
            }
        };

        // If isScanning prop is true, start the scanner
        if (isScanning) {
            startScanner();
        }

        // Cleanup function for the effect: runs when component unmounts or `isScanning` prop changes to false
        return () => {
            // This acts as a final safety net, ensuring resources are released
            // when the component unmounts or the `isScanning` prop becomes false.
            stopAndClearScanner();
        };
    }, [isScanning, onResult, setIsScanning]); // Added setIsScanning to dependencies

    return (
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md p-8 rounded-xl shadow-md text-center text-white border border-gray-700 w-full">
            {/* Render based on the isScanning prop */}
            {!isScanning ? (
                <div className="flex flex-col items-center justify-center">
                    <div className="bg-indigo-500 p-4 rounded-full mb-4">
                        <QrCode size={32} />
                    </div>
                    <motion.button
                        onClick={handleStartButtonClick}
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
                    <div id="qr-reader" className="w-full mx-auto max-w-sm"></div>
                    <button
                        onClick={handleStopButtonClick}
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





// import React, { useEffect, useRef, useState } from "react";
// import { BrowserMultiFormatReader } from "@zxing/browser";

// const QRScannerSection = () => {
//   const videoRef = useRef(null);
//   const codeReaderRef = useRef(null);
//   const [devices, setDevices] = useState([]);
//   const [selectedDeviceId, setSelectedDeviceId] = useState("");
//   const [scanning, setScanning] = useState(false);
//   const [result, setResult] = useState("");

//   useEffect(() => {
//     // Create a new reader instance
//     codeReaderRef.current = new BrowserMultiFormatReader();

//     // List devices correctly (static method)
//     BrowserMultiFormatReader.listVideoInputDevices()
//       .then(videoInputDevices => {
//         setDevices(videoInputDevices);
//         if (videoInputDevices.length > 0) {
//           setSelectedDeviceId(videoInputDevices[0].deviceId);
//         }
//       })
//       .catch(err => console.error("Error listing devices:", err));

//     return () => {
//       stopScanner();
//     };
//   }, []);

//   const startScanner = () => {
//     if (!selectedDeviceId) return;

//     setScanning(true);
//     setResult("");

//     codeReaderRef.current
//       .decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
//         if (result) {
//           setResult(result.getText());
//           stopScanner();
//         }
//         if (err && !(err instanceof ZXing.NotFoundException)) {
//           console.error(err);
//         }
//       })
//       .catch(err => console.error("Error starting scanner:", err));
//   };

//   const stopScanner = () => {
//     try {
//       if (codeReaderRef.current) {
//         codeReaderRef.current.stopContinuousDecode(); // stops scanning
//         codeReaderRef.current.stopStreams(); // stops camera
//       }
//       setScanning(false);
//     } catch (err) {
//       console.error("Error stopping scanner:", err);
//     }
//   };

//   return (
//     <div>
//       <h2>QR Code Scanner</h2>

//       {/* Camera selection */}
//       {devices.length > 0 && (
//         <select
//           value={selectedDeviceId}
//           onChange={(e) => setSelectedDeviceId(e.target.value)}
//         >
//           {devices.map((device, idx) => (
//             <option key={idx} value={device.deviceId}>
//               {device.label || `Camera ${idx + 1}`}
//             </option>
//           ))}
//         </select>
//       )}

//       {/* Video preview */}
//       <video ref={videoRef} style={{ width: "300px", height: "200px" }} />

//       {/* Controls */}
//       {!scanning ? (
//         <button onClick={startScanner}>Start Scanner</button>
//       ) : (
//         <button onClick={stopScanner}>Stop Scanner</button>
//       )}

//       {/* Result */}
//       {result && <p>Scanned Result: {result}</p>}
//     </div>
//   );
// };

// export default QRScannerSection;
