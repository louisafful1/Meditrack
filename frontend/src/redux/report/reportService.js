import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000"; 
export const API_URL = `${BACKEND_URL}/api/`;

/**** IN REFERENCE TO REPORT CONTROLLER/ROUTE ***/

// Get Report Data
const getReport = async (reportType, dateRange) => {
    let url = `${API_URL}reports/${reportType}`;
    
    // Add date range as query parameters if provided
    if (dateRange && dateRange.startDate && dateRange.endDate) {
        url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
    }

    const response = await axios.get(url);
    return response.data;
};

const reportService = {
    getReport,
};

export default reportService;