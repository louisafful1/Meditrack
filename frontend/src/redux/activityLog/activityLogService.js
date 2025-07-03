// src/features/activityLogs/activityLogService.js (or src/redux/activityLogs/activityLogService.js)
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";
export const API_URL = `${BACKEND_URL}/api/activity-logs`;

/**** IN REFERENCE TO ACTIVITY LOG CONTROLLER/ROUTE ***/

/**
 * Fetches activity logs from the backend with optional filters.
 * @param {object} filters - An object containing filter parameters.
 * @param {string} [filters.user] - User ID to filter by.
 * @param {string} [filters.module] - Module name (e.g., "Inventory", "Dispensation") to filter by.
 * @param {string} [filters.from] - Start date (YYYY-MM-DD) for date range.
 * @param {string} [filters.to] - End date (YYYY-MM-DD) for date range.
 */
const getLogs = async (filters = {}) => {
    let url = `${API_URL}`;
    const params = new URLSearchParams();

    if (filters.user) params.append('user', filters.user);
    if (filters.module) params.append('module', filters.module);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);

    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    const response = await axios.get(url);
    return response.data;
};

const activityLogService = {
    getLogs,
};

export default activityLogService;