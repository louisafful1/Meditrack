import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth/authSlice.js";
import drugReducer from "./drug/drugSlice.js";
import dispenseReducer from "./dispense/dispenseSlice.js";
import reportReducer from "./report/reportSlice.js";
import dashboardReducer from "./dashboard/dashboardSlice.js";
import activityLogReducer from "./activityLog/activityLogSlice.js";
import redistributionReducer from "./redistribution/redistributionSlice.js";
import facilityReducer from "./facility/facilitySlice.js";

export const store = configureStore({
  reducer: { 
     auth : authReducer,
     drug : drugReducer,
     dispense: dispenseReducer,
     report: reportReducer,
     dashboard: dashboardReducer,
     activityLog: activityLogReducer,
     redistribution: redistributionReducer,
     facility: facilityReducer
    },

});

