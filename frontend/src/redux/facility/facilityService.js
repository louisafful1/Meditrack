import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";
export const API_URL = `${BACKEND_URL}/api/facilities`;

/**** IN REFERENCE TO FACILITY CONTROLLER/ROUTE ****/

// Create a new facility
const createFacility = async (facilityData) => {
    const response = await axios.post(API_URL, facilityData);
    return response.data;
};

// Get all facilities
const getAllFacilities = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

// Get single facility by ID
const getFacilityById = async (facilityId) => {
    const response = await axios.get(`${API_URL}${facilityId}`);
    return response.data;
};

// Update a facility
const updateFacility = async (facilityId, facilityData) => {
    const response = await axios.put(`${API_URL}${facilityId}`, facilityData);
    return response.data;
};

// Delete a facility
const deleteFacility = async (facilityId) => {
    const response = await axios.delete(`${API_URL}${facilityId}`);
    return response.data;
};

const facilityService = {
    createFacility,
    getAllFacilities,
    getFacilityById,
    updateFacility,
    deleteFacility,
};

export default facilityService;