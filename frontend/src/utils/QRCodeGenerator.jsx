import { useState } from "react";
import QRCode from "qrcode";

const QRCodeGenerator = () => {
  const [formData, setFormData] = useState({
    drugName: "",
    batchNumber: "",
    currentStock: "",
    supplier: "",
    expiryDate: "",
  
  });

  const [qrUrl, setQrUrl] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const generateQR = async () => {
    try {
      const jsonData = JSON.stringify(formData);
      const url = await QRCode.toDataURL(jsonData);
      setQrUrl(url);
    } catch (err) {
      console.error("QR Code generation failed", err);
    }
  };
  

  return (
<div className="p-6 max-w-lg mx-auto bg-gray-800 text-white rounded-md shadow-md overflow-y-auto max-h-screen">
      <h2 className="text-xl mb-4 font-bold">Generate Inventory QR Code</h2>

      <div className="grid grid-cols-1 gap-4">
        {Object.entries(formData).map(([key, value]) => (
          <input
            key={key}
            name={key}
            value={value}
            onChange={handleChange}
            placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
            type={key.includes("Date") ? "date" : "text"}
            className="bg-gray-700 p-2 rounded-md"
          />
        ))}
      </div>

      <button
        onClick={generateQR}
        className="mt-4 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md"
      >
        Generate QR Code
      </button>

{qrUrl && (
  <div className="mt-6 text-center">
    <h3 className="mb-2 font-semibold">QR Code:</h3>

    <a href={qrUrl} download="inventory-qr.png">
      <img
        src={qrUrl}
        alt="QR Code"
        className="mx-auto w-48 h-48 cursor-pointer border border-white rounded-lg hover:opacity-80 transition"
        title="Click to download"
      />
    </a>

    <a
      href={qrUrl}
      download="inventory-qr.png"
      className="inline-block mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
    >
      Download QR Code
    </a>
  </div>
)}

    </div>
  );
};

export default QRCodeGenerator;
