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
  const response = await axios.post(API_URL + "login", userData, {
    withCredentials: true
  });
  return response.data
};

// Logout User
const logout = async () => {
  const response = await axios.post(API_URL + "logout", {}, {
    withCredentials: true
  });
  return response.data.message;
};

// Get Login Status 
const getLoginStatus = async () => {
  const response = await axios.get(API_URL + "getLoginStatus", {
    withCredentials: true
  });
  return response.data;
};

// Get User Profile 
const getUserProfile = async () => {
  const response = await axios.get(API_URL + "profile", {
    withCredentials: true
  });
  return response.data;
};

// Get Users 
const getUsers = async () => {
  const response = await axios.get(API_URL, {
    withCredentials: true
  });
  return response.data;
};

// Update User
const updateUser = async (userData) => {
  const response = await axios.put(API_URL + "profile", userData, {
    withCredentials: true
  });
  return response.data;
};


// Forgot Password
const forgotPassword = async (email) => {
  const response = await axios.post(API_URL + "forgotPassword", { email }, {
    withCredentials: true
  });
  return response.data;
};


// Reset Password
const resetPassword = async ({ password, resetToken }) => {
  const response = await axios.put(`${API_URL}resetPassword/${resetToken}`, { password }, {
    withCredentials: true
  });
  return response.data;
};
//toggle status
const toggleStatus = async (userId) => {
  const response = await axios.patch(`${API_URL}${userId}/toggle-status`, {}, {
    withCredentials: true
  });
  return response.data;
};
// delete User
const deleteUser = async(userId) => {
    const response = await axios.delete(`${API_URL}${userId}`, {
      withCredentials: true
    });
    return response.data;
}






const authService = {
  register,
    login,
    logout,
    getLoginStatus,
    getUserProfile,
    getUsers,
    updateUser,
    forgotPassword,
    resetPassword,
    toggleStatus,
    deleteUser
}

export default authService