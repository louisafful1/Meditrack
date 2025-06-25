import axios from 'axios';

const BACKEND_URL=import.meta.env.VITE_APP_BACKEND_URL ;
export const API_URL = `${BACKEND_URL}/api/users/`;


// Register User
const register = async (userData) => {
  const response = await axios.post(API_URL + "register", userData, {
     withCredentials:true
  });

  return response.data
};

// Login User
const login = async (userData) => {
  const response = await axios.post(API_URL + "login", userData);
  return response.data
};

// Logout User
const logout = async () => {
  const response = await axios.post(API_URL + "logout");
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

// Update User
const updateUser = async (userData) => {
  const response = await axios.put(API_URL + "profile", userData);
  return response.data;
};

// Ppdate Photo
const updatePhoto = async (userData) => {
  const response = await axios.patch(API_URL + "updatePhoto", userData);
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





const authService = {
    register,
    login,
    logout,
    getLoginStatus,
    getUserProfile,
    updateUser,
    updatePhoto,
    forgotPassword,
    resetPassword
}

export default authService