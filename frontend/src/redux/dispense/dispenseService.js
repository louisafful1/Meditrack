import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL 
export const API_URL = `${BACKEND_URL}/api/dispensation`

// Dispense Drug
const dispenseDrug = async(drugData) => {
        const response = await axios.post(API_URL, drugData);
        return response.data;
}

// Get Dispensed Drugs
const getDispensations = async() => {
    const response = await axios.get(API_URL);
    return response.data;

}


const dispenseService = {  
    dispenseDrug,
    getDispensations
}

export default dispenseService