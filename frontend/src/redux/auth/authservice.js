import axios from 'axios';

const BACKEND_URL=import.meta.env.VITE_APP_BACKEND_URL ;
export const API_URL = `${BACKEND_URL}/api/users/`;


// Register User
const register = async (userData) => {
  const response = await axios.post(API_URL + "register", userData);

  return response.data
};

// Login User
const login = async (userData) => {
  const response = await axios.post(API_URL + "login", userData);
  return response.data
};

// Logout User
const logout = async () => {
  const response = await axios.post(API_URL + "logout", {});
  return response.data.message;
};

// Get Login Status 
const getLoginStatus = async () => {
  const response = await axios.get(API_URL + "getLoginStatus");
  return response.data;
};

// Get User Profile 
const getUserProfile = async () => {
  const response = await axios.get(API_URL + "profile");
  return response.data;
};

// Get Users 
const getUsers = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// Update Any User
const updateUserByAdmin = async ({ id, userData }) => {
    const response = await axios.put(`${API_URL}${id}`, userData); 
    return response.data;
};


// Forgot Password
const forgotPassword = async (email) => {
  const response = await axios.post(API_URL + "forgotPassword", { email });
  return response.data;
};


// Reset Password
const resetPassword = async ({ password, resetToken }) => {
  const response = await axios.put(`${API_URL}resetPassword/${resetToken}`, { password });
  return response.data;
};
//toggle status
const toggleStatus = async (userId) => {
  const response = await axios.patch(`${API_URL}${userId}/toggle-status`, {});
  return response.data;
};
// delete User
const deleteUser = async(userId) => {
    const response = await axios.delete(`${API_URL}${userId}`);
    return response.data;
}






const authService = {
  register,
    login,
    logout,
    getLoginStatus,
    getUserProfile,
    getUsers,
    updateUserByAdmin,
    forgotPassword,
    resetPassword,
    toggleStatus,
    deleteUser
}

export default authService