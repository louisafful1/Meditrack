import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import dispenseService from "./dispenseService";
import { toast } from "react-toastify";

const initialState = {
  records: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: "",
};

// Dispense Drug
export const dispenseDrug = createAsyncThunk(
    "dispense/add", 
    async (drugData, thunkAPI) => {
  try {
    return await dispenseService.dispenseDrug(drugData);
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Error dispensing drug";
    return thunkAPI.rejectWithValue(message);
  }
});



// Get Dispensations
export const getDispensations = createAsyncThunk(
    "dispense/all", async (_, thunkAPI) => {
  try {
    return await dispenseService.getDispensations();
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Error fetching dispenses";
    return thunkAPI.rejectWithValue(message);
  }
});

const dispenseSlice = createSlice({
  name: "dispense",
  initialState,
  reducers: {
    RESET_DISPENSE(state) {
      state.records = [];
      state.message = "";
      state.isLoading = false;
      state.isError = false;
      state.isSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(dispenseDrug.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(dispenseDrug.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.records.push(action.payload);
        toast.success("Drug dispensed");
      })
      .addCase(dispenseDrug.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        toast.error(action.payload);
      })

      .addCase(getDispensations.fulfilled, (state, action) => {
        state.records = action.payload;
      });
  },
});

export const { RESET_DISPENSE } = dispenseSlice.actions;
export default dispenseSlice.reducer;
