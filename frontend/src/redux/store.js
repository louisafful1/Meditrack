import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth/authSlice.js";
import drugReducer from "./drug/drugSlice.js";

export const store = configureStore({
  reducer: { 
     auth : authReducer,
     drug : drugReducer
    },

});

