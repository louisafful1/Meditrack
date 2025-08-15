// frontend/src/redux/report/reportSlice.js

import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import reportService from './reportService';
// import { toast } from 'react-toastify'; // ✨ REMOVE THIS IMPORT if toasts are only handled in components


const initialState = {
    currentReportData: [],
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: "",
};

// Async Thunk for getting report data
export const getReport = createAsyncThunk(
    "report/getReport",
    async ({ reportType, dateRange }, thunkAPI) => {
        try {
            return await reportService.getReport(reportType, dateRange);
        } catch (error) {
            const message =
                (error.response &&
                    error.response.data &&
                    error.response.data.message) ||
                error.message ||
                error.toString();
            // ✨ REMOVED: toast.error(message); // Remove toast from thunk
            return thunkAPI.rejectWithValue(message);
        }
    }
);

const reportSlice = createSlice({
    name: "report",
    initialState,
    reducers: {
        RESET_REPORT(state) {
            state.currentReportData = [];
            state.isError = false;
            state.isSuccess = false;
            state.isLoading = false;
            state.message = "";
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getReport.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
                state.message = "";
            })
            .addCase(getReport.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.isError = false; // Ensure isError is false on success
                state.message = ""; // Clear any previous error messages
                state.currentReportData = action.payload;
                console.log("REPORT SLICE: getReport.fulfilled - Payload:", action.payload); // Debugging log
                console.log("REPORT SLICE: State after fulfilled:", state.currentReportData); // Debugging log
            })
            .addCase(getReport.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.currentReportData = [];
                // ✨ REMOVED: toast.error(action.payload); // Remove toast from reducer
                console.error("REPORT SLICE: getReport.rejected - Error:", state.message); // Debugging log
            });
    },
});

export const { RESET_REPORT } = reportSlice.actions;

export default reportSlice.reducer;