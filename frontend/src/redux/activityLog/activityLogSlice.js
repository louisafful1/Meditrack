// src/features/activityLogs/activityLogSlice.js (or src/redux/activityLogs/activityLogSlice.js)
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import activityLogService from './activityLogService'; // Adjust path if necessary
import { toast } from 'react-toastify';

const initialState = {
    logs: [],
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: "",
};

// Async Thunk for getting activity logs
export const getLogs = createAsyncThunk(
    "activityLog/getLogs",
    async (filters, thunkAPI) => {
        try {
            // If your API requires a token, you would get it from your auth slice:
            // const token = thunkAPI.getState().auth.token;
            // return await activityLogService.getLogs(filters, token); // Pass token if service needs it
            return await activityLogService.getLogs(filters);
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            toast.error(message);
            return thunkAPI.rejectWithValue(message);
        }
    }
);

const activityLogSlice = createSlice({
    name: "activityLog",
    initialState,
    reducers: {
        RESET_LOGS(state) {
            state.logs = [];
            state.isError = false;
            state.isSuccess = false;
            state.isLoading = false;
            state.message = "";
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getLogs.pending, (state) => {
                state.isLoading = true;
                state.isError = false; // Reset error on new fetch
                state.isSuccess = false; // Reset success on new fetch
                state.message = ""; // Clear message on new fetch
            })
            .addCase(getLogs.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.logs = action.payload; // Store the fetched logs
                state.message = "Activity logs fetched successfully!";
            })
            .addCase(getLogs.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.logs = []; // Clear logs on error
            });
    },
});

export const { RESET_LOGS } = activityLogSlice.actions;

export default activityLogSlice.reducer;