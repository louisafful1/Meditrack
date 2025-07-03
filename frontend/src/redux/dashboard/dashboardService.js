import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";
export const API_URL = `${BACKEND_URL}/api/dashboard/`;

/**** IN REFERENCE TO DASHBOARD CONTROLLER/ROUTE ***/

// Get Dashboard Summary Stats
const getSummaryStats = async () => {
    const response = await axios.get(API_URL + "summary");
    return response.data;
};

// Get Monthly Drug Trend Data
const getMonthlyTrend = async () => {
    const response = await axios.get(API_URL + "monthly-trend");
    return response.data;
};

// Get Expiry Overview Data
const getExpiryOverview = async () => {
    const response = await axios.get(API_URL + "expiry-overview");
    return response.data;
};

// Get Top Dispensed Drugs Data
const getTopDispensedDrugs = async () => {
    const response = await axios.get(API_URL + "top-dispensed-drugs");
    return response.data;
};

const dashboardService = {
    getSummaryStats,
    getMonthlyTrend,
    getExpiryOverview,
    getTopDispensedDrugs,
};

export default dashboardService;