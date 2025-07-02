import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL 
export const API_URL = `${BACKEND_URL}/api/`

/**** IN REFERENCE TO INVENTORY CONTROLLER/ROUTE ***/
// create Drug
const createDrug = async(drugData) => {
        const response = await axios.post(API_URL + "inventory", drugData);
        return response.data;

}

// Get Drugs
const getAllDrugs = async() => {
    const response = await axios.get(API_URL + "inventory");
    return response.data;

}
// delete Drug
const deleteDrug = async(drugId) => {
    const response = await axios.delete(`${API_URL}inventory/${drugId}`);
    return response.data;
}

/**** IN REFERENCE TO DISPENSE CONTROLLER/ROUTE ***/

// Dispense Drug
const dispenseDrug = async(drugData) => {
        const response = await axios.post(API_URL + "dispensation", drugData);
        return response.data;

}

// Get Dispensed Drugs
const getDispensations = async() => {
    const response = await axios.get(API_URL + "dispensation");
    return response.data;

}


const drugService = {
    createDrug,
    getAllDrugs,
    deleteDrug,
    dispenseDrug,
    getDispensations
}

export default drugService