import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import facilityService from './facilityService';
import { toast } from 'react-toastify';

const initialState = {
    facilities: [],
    facility: null, 
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: "",
};

// Async Thunk for creating a facility
export const createFacility = createAsyncThunk(
    "facility/create",
    async (facilityData, thunkAPI) => {
        try {
            return await facilityService.createFacility(facilityData);
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

// Async Thunk for getting all facilities
export const getAllFacilities = createAsyncThunk(
    "facility/getAll",
    async (_, thunkAPI) => {
        try {
            return await facilityService.getAllFacilities();
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

// Async Thunk for getting a single facility by ID
export const getFacilityById = createAsyncThunk(
    "facility/getById",
    async (facilityId, thunkAPI) => {
        try {
            return await facilityService.getFacilityById(facilityId);
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

// Async Thunk for updating a facility
export const updateFacility = createAsyncThunk(
    "facility/update",
    async ({ id, facilityData }, thunkAPI) => {
        try {
            return await facilityService.updateFacility(id, facilityData);
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

// Async Thunk for deleting a facility
export const deleteFacility = createAsyncThunk(
    "facility/delete",
    async (facilityId, thunkAPI) => {
        try {
            return await facilityService.deleteFacility(facilityId);
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


const facilitySlice = createSlice({
    name: "facility",
    initialState,
    reducers: {
        RESET_FACILITIES(state) {
            state.facilities = [];
            state.facility = null;
            state.isError = false;
            state.isSuccess = false;
            state.isLoading = false;
            state.message = "";
        },
    },
    extraReducers: (builder) => {
        builder
            // Create Facility
            .addCase(createFacility.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createFacility.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.facilities.push(action.payload); // Add new facility to the list
                state.message = "Facility created successfully!";
                toast.success(state.message);
            })
            .addCase(createFacility.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Get All Facilities
            .addCase(getAllFacilities.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getAllFacilities.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.facilities = action.payload;
                state.message = "Facilities fetched successfully!";
            })
            .addCase(getAllFacilities.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.facilities = [];
            })

            // Get Facility By ID
            .addCase(getFacilityById.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getFacilityById.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.facility = action.payload;
                state.message = "Facility details fetched successfully!";
            })
            .addCase(getFacilityById.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
                state.facility = null;
            })

            // Update Facility
            .addCase(updateFacility.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateFacility.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Update the facility in the list
                const index = state.facilities.findIndex(
                    (fac) => fac._id === action.payload._id
                );
                if (index !== -1) {
                    state.facilities[index] = action.payload;
                }
                // If the updated facility is the currently selected one
                if (state.facility && state.facility._id === action.payload._id) {
                    state.facility = action.payload;
                }
                state.message = "Facility updated successfully!";
                toast.success(state.message);
            })
            .addCase(updateFacility.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })

            // Delete Facility
            .addCase(deleteFacility.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deleteFacility.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                // Remove the deleted facility from the list
                state.facilities = state.facilities.filter(
                    (fac) => fac._id !== action.meta.arg // action.meta.arg contains the facilityId passed to the thunk
                );
                state.message = "Facility deleted successfully!";
                toast.success(state.message);
            })
            .addCase(deleteFacility.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const { RESET_FACILITIES } = facilitySlice.actions;

export default facilitySlice.reducer;