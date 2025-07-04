import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";
export const API_URL = `${BACKEND_URL}/api/redistribution/`;

/**** IN REFERENCE TO REDISTRIBUTION CONTROLLER/ROUTE ****/

// Create Redistribution Request
const createRedistribution = async (redistributionData) => {
    const response = await axios.post(API_URL, redistributionData);
    return response.data;
};

// Get All Redistributiion Requests (sent or received by user's facility)
const getRedistributions = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

// Approve a Redistribution Request
const approveRedistribution = async (redistributionId) => {
    const response = await axios.put(`${API_URL}${redistributionId}/approve`);
    return response.data;
};

// Decline a Redistribution Request
const declineRedistribution = async (redistributionId) => {
    const response = await axios.put(`${API_URL}decline/${redistributionId}`);
    return response.data;
};

// Update Redistribution Status (generic update, if needed for other statuses)
const updateRedistributionStatus = async (redistributionId, statusData) => {
    const response = await axios.put(`${API_URL}${redistributionId}`, statusData);
    return response.data;
};

// Get AI-based Redistribution Suggestions
const getRedistributionSuggestions = async () => {
    const response = await axios.get(API_URL + "suggestions");
    return response.data;
};

const redistributionService = {
    createRedistribution,
    getRedistributions,
    approveRedistribution,
    declineRedistribution,
    updateRedistributionStatus,
    getRedistributionSuggestions,
};

export default redistributionService;