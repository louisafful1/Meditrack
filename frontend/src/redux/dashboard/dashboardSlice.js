import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import dashboardService from './dashboardService'; 
import { toast } from 'react-toastify';

const initialState = {
    summaryStats: {
        totalDrugs: 0,
        lowStocks: 0,
        nearingExpiry: 0,
        redistribution: 0,
    },
    monthlyTrendData: [],
    expiryOverviewData: [],
    topDispensedDrugs: {
        mostDispensed: [],
        leastDispensed: [],
    },
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: "",
};

// Async Thunk for getting Dashboard Summary Stats
export const getDashboardSummaryStats = createAsyncThunk(
    "dashboard/getSummaryStats",
    async (_, thunkAPI) => {
        try {
            return await dashboardService.getSummaryStats();
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

// Async Thunk for getting Monthly Drug Trend
export const getDashboardMonthlyTrend = createAsyncThunk(
    "dashboard/getMonthlyTrend",
    async (_, thunkAPI) => {
        try {
            return await dashboardService.getMonthlyTrend();
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

// Async Thunk for getting Expiry Overview
export const getDashboardExpiryOverview = createAsyncThunk(
    "dashboard/getExpiryOverview",
    async (_, thunkAPI) => {
        try {
            return await dashboardService.getExpiryOverview();
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

// Async Thunk for getting Top Dispensed Drugs
export const getDashboardTopDispensedDrugs = createAsyncThunk(
    "dashboard/getTopDispensedDrugs",
    async (_, thunkAPI) => {
        try {
            return await dashboardService.getTopDispensedDrugs();
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


const dashboardSlice = createSlice({
    name: "dashboard",
    initialState,
    reducers: {
        RESET_DASHBOARD(state) {
            state.summaryStats = {
                totalDrugs: 0,
                lowStocks: 0,
                nearingExpiry: 0,
                redistribution: 0,
            };
            state.monthlyTrendData = [];
            state.expiryOverviewData = [];
            state.topDispensedDrugs = {
                mostDispensed: [],
                leastDispensed: [],
            };
            state.isError = false;
            state.isSuccess = false;
            state.isLoading = false;
            state.message = "";
        },
    },
    extraReducers: (builder) => {
        builder
            // Summary Stats
            .addCase(getDashboardSummaryStats.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getDashboardSummaryStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.summaryStats = action.payload;
            })
            .addCase(getDashboardSummaryStats.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.summaryStats = initialState.summaryStats; 
            })

            // Monthly Trend
            .addCase(getDashboardMonthlyTrend.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getDashboardMonthlyTrend.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.monthlyTrendData = action.payload;
            })
            .addCase(getDashboardMonthlyTrend.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.monthlyTrendData = []; // Reset to empty on error
            })

            // Expiry Overview
            .addCase(getDashboardExpiryOverview.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getDashboardExpiryOverview.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.expiryOverviewData = action.payload;
            })
            .addCase(getDashboardExpiryOverview.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.expiryOverviewData = []; 
            })

            // Top Dispensed Drugs
            .addCase(getDashboardTopDispensedDrugs.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getDashboardTopDispensedDrugs.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.topDispensedDrugs = action.payload;
            })
            .addCase(getDashboardTopDispensedDrugs.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.topDispensedDrugs = { mostDispensed: [], leastDispensed: [] }; // Reset on error
            });
    },
});

export const { RESET_DASHBOARD } = dashboardSlice.actions;

export default dashboardSlice.reducer;