import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import authService from "./authservice";
import { toast } from "react-toastify"; 

const initialState = {
  isLoggedIn: false,
  user: null,
  users: [],
  isError: false,
  isSuccess: false,
  isLoading: true, // Start with loading true to check auth status on app load
  message: "",
  isInitialized: false, // Track if initial auth check is complete
};

// Register User
export const register = createAsyncThunk(
  "auth/register",
  async (userData, thunkAPI) => {
    try {
      return await authService.register(userData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Login User
export const login = createAsyncThunk(
  "auth/login",
  async (userData, thunkAPI) => {
    try {
      return await authService.login(userData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

//Reset Password
export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async ({ password, resetToken }, thunkAPI) => {
    try {
      const response = await authService.resetPassword({ password, resetToken });
      return response.data;
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Logout User
export const logout = createAsyncThunk(
  "auth/logout",
  async (_, thunkAPI) => {
    try {
      return await authService.logout();
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// GET Login status
export const getLoginStatus = createAsyncThunk(
  "auth/getLoginStatus",
  async (_, thunkAPI) => {
    try {
      const response = await authService.getLoginStatus();
       return response.data; 
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// GET User profile
export const getUserProfile = createAsyncThunk(
  "auth/getUserProfile",
  async (_, thunkAPI) => {
    try {
      return await authService.getUserProfile();
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// GET Users (for admin panel)
export const getUsers = createAsyncThunk(
  "auth/getUsers",
  async (_, thunkAPI) => {
    try {
      return await authService.getUsers();
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update User (Admin updating any user)
export const updateUser = createAsyncThunk( 
    "auth/updateUser", 
    async ({ id, userData }, thunkAPI) => {
        try {
            return await authService.updateUserByAdmin({ id, userData });
        } catch (error) {
            const message =
                (error.response &&
                    error.response.data &&
                    error.response.data.message) ||
                error.message ||
                error.toString();
            toast.error(message);
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Toggle User Status (active/inactive)
export const toggleStatus = createAsyncThunk(
  "auth/toggleStatus",
  async (userId, thunkAPI) => {
    try {
      return await authService.toggleStatus(userId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete User
export const deleteUser = createAsyncThunk(
  "auth/deleteUser",
  async (userId, thunkAPI) => {
    try {
      return await authService.deleteUser(userId);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    RESET_AUTH(state) {
      state.isError = false;
      state.isSuccess = false;
      state.isLoading = false;
      state.message = "";
    },
    SET_LOGIN_STATUS(state, action) {
      state.isLoggedIn = action.payload;
    },
    SET_INITIALIZED(state) {
      state.isInitialized = true;
      state.isLoading = false;
    },
  },

  extraReducers: (builder) => {
    builder
      // Register user
      .addCase(register.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Add the new user to the users array if returned by backend
        if (action.payload && action.payload._id) {
            state.users = [action.payload, ...state.users];
        }
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Login user
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isLoggedIn = true;
        state.user = action.payload;
        state.isInitialized = true;
        toast.success("Login successful"); 
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
        state.isLoggedIn = false; 
        state.isInitialized = true;
        toast.error(action.payload); 
      })

      // Reset password
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
        toast.success("Password reset successful"); 
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      // Logout user
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isLoggedIn = false;
        state.user = null;
        state.isInitialized = true; // Keep initialized after logout
        toast.success(action.payload); 
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload); 
      })

      // GET Login Status
      .addCase(getLoginStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getLoginStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isLoggedIn = action.payload;
      })
      .addCase(getLoginStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.isLoggedIn = false;
      })

      // GET User Profile
      .addCase(getUserProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.isLoggedIn = true;
        state.user = action.payload;
        state.isInitialized = true;
      })
      .addCase(getUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        // Set logged out state when profile fetch fails
        state.isLoggedIn = false;
        state.user = null;
        state.isInitialized = true;
      })

      // GET Users (for admin panel)
      .addCase(getUsers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.users = action.payload;
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error("Failed to fetch users: " + action.payload); 
      })

              // Update User (Admin updating any user)
            .addCase(updateUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const updatedUser = action.payload; // This should be the full updated user object from backend
                const index = state.users.findIndex(user => user._id === updatedUser._id);
                if (index !== -1) {
                    state.users[index] = updatedUser; // Update the user in the array
                }
                // If the updated user is the currently logged-in admin, update the 'user' state as well
                if (state.user && state.user._id === updatedUser._id) {
                    state.user = updatedUser;
                    localStorage.setItem("user", JSON.stringify(updatedUser)); // Update local storage too
                }
            })
            .addCase(updateUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

      // Toggle User Status (active/inactive)
      .addCase(toggleStatus.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(toggleStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Update the specific user in the users array
        const userIndex = state.users.findIndex(
          (user) => user._id === action.payload._id
        );
        if (userIndex !== -1) {
          state.users[userIndex] = action.payload;
        }
      })
      .addCase(toggleStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // Delete User
      .addCase(deleteUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
   
        state.users = state.users.filter(
          (user) => user._id !== action.payload._id
        );

      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
       
      });
  },
});

export const { RESET_AUTH, SET_LOGIN_STATUS, SET_INITIALIZED } = authSlice.actions;

export default authSlice.reducer;
