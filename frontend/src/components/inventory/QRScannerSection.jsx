import { useEffect, useRef, useState } from "react";
import { QrCode, ScanLine, X } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const QRScannerSection = ({ onSwitchToManual, onResult }) => {
    const [scanning, setScanning] = useState(false);
    const html5QrCodeRef = useRef(null); // Ref to store the Html5Qrcode instance

    // Handler for the "Tap to scan" button
    const handleStartButtonClick = () => {
        setScanning(true); // This will trigger the useEffect below to start the scanner
    };

    // Handler for the "Stop Scanning" button
    const handleStopButtonClick = async () => {
        const qrCodeScanner = html5QrCodeRef.current;
        if (qrCodeScanner && qrCodeScanner.isScanning) { // Check if it's currently scanning
            try {
                // Only stop the camera, do not clear the instance here.
                // The full 'clear' will happen in useEffect cleanup on component unmount.
                await qrCodeScanner.stop();
                console.log("QR Code camera stopped by Stop button.");
            } catch (err) {
                console.error("Error stopping QR camera from Stop button:", err);
                // Ignore "Code scanner not running" error as it's expected if already stopped
                if (!err.message.includes("Code scanner not running")) {
                    toast.error(`Failed to stop QR camera: ${err.message || 'Unknown error'}`);
                }
            }
        }
        setScanning(false); // Update UI state
    };

    // useEffect to manage the lifecycle of the Html5Qrcode scanner
    useEffect(() => {
        const qrRegionId = "qr-reader"; // ID of the HTML element where the camera feed will be rendered
        let scannerInstance = null; // Local variable for the Html5Qrcode instance for this effect run

        const startScanner = async () => {
            // Only create a new instance if one doesn't already exist in the ref
            if (!html5QrCodeRef.current) {
                scannerInstance = new Html5Qrcode(qrRegionId);
                html5QrCodeRef.current = scannerInstance; // Store in ref
            } else {
                scannerInstance = html5QrCodeRef.current; // Use existing instance
            }

            try {
                await scannerInstance.start( // Use the local instance
                    { facingMode: "environment" }, // Prefer the rear camera
                    {
                        fps: 10, // Frames per second to scan
                        qrbox: { width: 250, height: 250 }, // Size of the QR scanning box
                    },
                    // Success callback: when a QR code is detected
                    async (decodedText) => {
                        console.log("✅ QR Code Detected:", decodedText);
                        toast.success("QR Code detected!");
                        onResult && onResult(decodedText); // Pass the decoded text to the parent component

                        // Stop the scanner immediately upon successful scan
                        const currentScanner = html5QrCodeRef.current;
                        if (currentScanner && currentScanner.isScanning) { // Use .isScanning property
                            try {
                                await currentScanner.stop();
                                console.log("QR Code camera stopped after successful scan.");
                            } catch (err) {
                                console.error("Error stopping QR camera after scan:", err);
                            }
                        }
                        setScanning(false); // Update UI state after scan
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
                // If the instance failed to start, ensure it's removed from ref if it was the one we just tried to use
                if (html5QrCodeRef.current === scannerInstance) {
                    html5QrCodeRef.current = null;
                }

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

        // Effect logic based on 'scanning' state
        if (scanning) {
            startScanner();
        }

        // Cleanup function for the effect: runs when component unmounts or `scanning` changes to false
        return () => {
            // Capture the current value of the ref at the start of cleanup
            const qrCodeScannerToClean = html5QrCodeRef.current;

            // Only proceed if a scanner instance actually exists in the ref
            if (qrCodeScannerToClean) {
                // IMPORTANT: Nullify the ref immediately so no other concurrent cleanup tries to use it
                html5QrCodeRef.current = null;

                // Stop the scanner if it's currently scanning
                // Use Promise.resolve() to ensure .stop() returns a Promise, even if it doesn't always
                Promise.resolve(qrCodeScannerToClean.isScanning ? qrCodeScannerToClean.stop() : null)
                    .then(() => {
                        console.log("QR Code camera stopped in cleanup (if it was scanning).");
                        // Always attempt to clear resources after stop (or stop error)
                        // Use Promise.resolve() for clear() as well
                        return Promise.resolve(qrCodeScannerToClean.clear());
                    })
                    .then(() => {
                        console.log("QR Code scanner resources cleared in cleanup.");
                    })
                    .catch(e => {
                        // This catch block handles errors from both stop() and clear()
                        console.error("Error during QR scanner cleanup:", e);
                        // Avoid showing toast for common "not running" errors during cleanup
                        if (!e.message.includes("Code scanner not running") && !e.message.includes("Cannot clear while scan is ongoing")) {
                            toast.error(`Failed to fully clean up QR scanner: ${e.message || 'Unknown error'}`);
                        }
                    });
            }
        };
    }, [scanning, onResult]); // onResult is a prop, include it in dependencies if its identity can change

    return (
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md p-8 rounded-xl shadow-md text-center text-white border border-gray-700 w-full">
            {!scanning ? (
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
                    {/* This is where the Html5Qrcode scanner will render the video feed */}
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
