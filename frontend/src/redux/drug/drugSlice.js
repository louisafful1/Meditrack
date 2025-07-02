import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import drugService from './drugService'
import { toast } from 'react-toastify'

const initialState = {
    drugs: [],
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: "",
    
    }
/**** IN REFERENCE TO INVENTORY CONTROLLER/ROUTE ***/

    // create drug
export const createDrug = createAsyncThunk(
  "drug/createDrug",
  async (drugData, thunkAPI) => {
    try {
      return await drugService.createDrug(drugData)
    } catch (error) {
      const message = 
     ( error.response &&
      error.response.data &&
      error.response.data.message) || 
      error.message ||
      error.toString()
      return thunkAPI.rejectWithValue(message)
      
    }

  }
)

    // Get All drugs
    export const getAllDrugs = createAsyncThunk(
      "drug/getAllDrugs",
      async (_, thunkAPI) => {
        try {
          return await drugService.getAllDrugs()
        } catch (error) {
          const message = 
         ( error.response &&
          error.response.data &&
          error.response.data.message) || 
          error.message ||
          error.toString()
          return thunkAPI.rejectWithValue(message)
          
        }
    
      }
    )

        // Delete drug
        export const deleteDrug = createAsyncThunk(
          "drug/deleteDrug",
          async (drugId, thunkAPI) => {
            try {
              return await drugService.deleteDrug(drugId)
            } catch (error) {
              const message = 
             ( error.response &&
              error.response.data &&
              error.response.data.message) || 
              error.message ||
              error.toString()
              return thunkAPI.rejectWithValue(message)
              
            }
        
          }
        )





const drugSlice = createSlice({
  name: "drug",
  initialState,
  reducers: {
    RESET_drug(state){
      state.drugs = [];
        state.isError= false
        state.isSuccess= false
        state.isLoading= false
        state.message= ""
      }

  },
  extraReducers: (builder) => {
    builder
    /**** IN REFERENCE TO INVENTORY CONTROLLER/ROUTE ***/

    // create drug
        .addCase(createDrug.pending, (state) => {
          state.isLoading = true
        })
        .addCase(createDrug.fulfilled, (state, action) => {
          state.isLoading = false
          state.isSuccess = true
          state.drugs.push(action.payload) //Add the new drug to the list
          toast.success("Drug added sucessfully")
        })
        .addCase(createDrug.rejected, (state, action) => {
          state.isLoading = false
          state.isError = true
          state.message= action.payload
          toast.error(action.payload)
        })

        // get All drugs
        .addCase(getAllDrugs.pending, (state) => {
          state.isLoading = true
        })
        .addCase(getAllDrugs.fulfilled, (state, action) => {
          state.isLoading = false
          state.isSuccess = true
          state.drugs= action.payload
        })
        .addCase(getAllDrugs.rejected, (state, action) => {
          state.isLoading = false
          state.isError = true
          state.message= action.payload
          toast.error(action.payload)
        })

       
        // Delete drugs
        .addCase(deleteDrug.pending, (state) => {
          state.isLoading = true
        })
        .addCase(deleteDrug.fulfilled, (state, action) => {
          state.isLoading = false
          state.isSuccess = true
          state.drugs = state.drugs.filter(drug => drug._id !== action.payload._id);
          toast.success(action.payload.message)

        })
        .addCase(deleteDrug.rejected, (state, action) => {
          state.isLoading = false
          state.isError = true
          state.message= action.payload
          toast.error(action.payload)
        })



       

      }

});

export const {RESET_DRUG} = drugSlice.actions

export default drugSlice.reducer