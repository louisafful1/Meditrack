import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL 
export const API_URL = `${BACKEND_URL}/api/inventory/`

// craete Drug
const createDrug = async(drugData) => {
        const response = await axios.post(API_URL, drugData);
        return response.data;

}

// Get Drugs
const getAllDrugs = async() => {
    const response = await axios.get(API_URL);
    return response.data;

}
// delete Drug
const deleteDrug = async(drugId) => {
    const response = await axios.delete(`${API_URL}${drugId}`);
    return response.data;
}


const drugService = {
    createDrug,
    getAllDrugs,
    deleteDrug,
}

export default drugService