import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import redistributionService from './redistributionService';
// Removed 'toast' import from here. Toasts should be handled in components.
// import { toast } from 'react-toastify'; // This line is now REMOVED

const initialState = {
    redistributions: [],
    suggestions: [],
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: "",
};

// Async Thunk for creating a redistribution request
export const createRedistribution = createAsyncThunk(
    "redistribution/create",
    async (redistributionData, thunkAPI) => {
        try {
            return await redistributionService.createRedistribution(redistributionData);
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Async Thunk for getting all redistribution requests
export const getRedistributions = createAsyncThunk(
    "redistribution/getAll",
    async (_, thunkAPI) => {
        try {
            return await redistributionService.getRedistributions();
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Async Thunk for approving a redistribution request
export const approveRedistribution = createAsyncThunk(
    "redistribution/approve",
    async (redistributionId, thunkAPI) => {
        try {
            return await redistributionService.approveRedistribution(redistributionId);
        }
        catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Async Thunk for declining a redistribution request
export const declineRedistribution = createAsyncThunk(
    "redistribution/decline",
    async (redistributionId, thunkAPI) => {
        try {
            return await redistributionService.declineRedistribution(redistributionId);
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Async Thunk for updating redistribution status (generic)
export const updateRedistributionStatus = createAsyncThunk(
    "redistribution/updateStatus",
    async ({ id, statusData }, thunkAPI) => {
        try {
            return await redistributionService.updateRedistributionStatus(id, statusData);
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);

// Async Thunk for getting AI Redistribution Suggestions
export const getAIRedistributionSuggestions = createAsyncThunk(
    "redistribution/getSuggestions",
    async (_, thunkAPI) => {
        try {
            const response = await redistributionService.getAIRedistributionSuggestions();
            return response;
        } catch (error) {
            const message =
                (error.response && error.response.data && error.response.data.message) ||
                error.message ||
                error.toString();
            return thunkAPI.rejectWithValue(message);
        }
    }
);


const redistributionSlice = createSlice({
    name: "redistribution",
    initialState,
    reducers: {
        RESET_REDISTRIBUTION(state) {
            state.redistributions = [];
            state.suggestions = [];
            state.isLoading = false;
            state.isError = false;
            state.isSuccess = false;
            state.message = "";
        },
        RESET_TOAST_STATE: (state) => {
            state.isError = false;
            state.isSuccess = false;
            state.message = "";
        },
    },
    extraReducers: (builder) => {
        builder
            // Create Redistribution
            .addCase(createRedistribution.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
                state.message = "";
            })
            .addCase(createRedistribution.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.redistributions.push(action.payload);
                state.message = "Redistribution request created successfully!";
            })
            .addCase(createRedistribution.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Get All Redistributiions
            .addCase(getRedistributions.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
                state.message = "";
            })
            .addCase(getRedistributions.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.redistributions = action.payload;
                // IMPORTANT: REMOVED THIS LINE TO PREVENT UNWANTED TOAST ON PAGE LOAD
                // state.message = "Redistribution requests fetched successfully!";
            })
            .addCase(getRedistributions.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.redistributions = [];
            })

            // Approve Redistribution
            .addCase(approveRedistribution.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
                state.message = "";
            })
            .addCase(approveRedistribution.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const index = state.redistributions.findIndex(
                    (req) => req._id === action.payload.redistribution._id
                );
                if (index !== -1) {
                    state.redistributions[index] = action.payload.redistribution;
                }
                state.message = "Redistribution approved successfully!";
            })
            .addCase(approveRedistribution.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Decline Redistribution
            .addCase(declineRedistribution.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
                state.message = "";
            })
            .addCase(declineRedistribution.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const index = state.redistributions.findIndex(
                    (req) => req._id === action.payload.redistribution._id
                );
                if (index !== -1) {
                    state.redistributions[index] = action.payload.redistribution;
                }
                state.message = "Redistribution declined successfully!";
            })
            .addCase(declineRedistribution.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Update Redistribution Status (generic)
            .addCase(updateRedistributionStatus.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
                state.message = "";
            })
            .addCase(updateRedistributionStatus.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                const index = state.redistributions.findIndex(
                    (req) => req._id === action.payload._id
                );
                if (index !== -1) {
                    state.redistributions[index] = action.payload;
                }
                state.message = "Redistribution status updated successfully!";
            })
            .addCase(updateRedistributionStatus.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Get AI Suggestions
            .addCase(getAIRedistributionSuggestions.pending, (state) => {
                state.isLoading = true;
                state.isError = false;
                state.isSuccess = false;
                state.message = "";
            })
            .addCase(getAIRedistributionSuggestions.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.suggestions = action.payload;
                state.message = "AI suggestions generated successfully!"; // Keep this message for explicit generation
            })
            .addCase(getAIRedistributionSuggestions.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.suggestions = [];
            });
    },
});

export const { RESET_REDISTRIBUTION, RESET_TOAST_STATE } = redistributionSlice.actions;

export default redistributionSlice.reducer;
