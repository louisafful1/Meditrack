import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import reportService from './reportService'; 
import { toast } from 'react-toastify';

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
            toast.error(message);
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
                state.currentReportData = action.payload; 
                state.message = "Report data fetched successfully!";
            })
            .addCase(getReport.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.currentReportData = []; 
            });
    },
});

export const { RESET_REPORT } = reportSlice.actions;

export default reportSlice.reducer;