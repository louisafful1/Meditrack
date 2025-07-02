import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth/authSlice.js";
import drugReducer from "./drug/drugSlice.js";
import dispenseReducer from "./dispense/dispenseSlice.js";
export const store = configureStore({
  reducer: { 
     auth : authReducer,
     drug : drugReducer,
     dispense: dispenseReducer,
    },

});

