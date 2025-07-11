import express from "express";
import {
  createFacility,
  getFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
} from "../controllers/facilityController.js";
import { adminOnly, authorizeRoles, protect } from "../middleware/authMiddleware.js";

const facilityRoutes = express.Router();


facilityRoutes.route("/")
  .post(createFacility, protect, adminOnly,)     
  .get(protect, authorizeRoles(['admin', 'supervisor', 'pharmacist']), getFacilities);      

facilityRoutes.route("/:id")
  .get(protect, adminOnly, getFacilityById)     
  .put(protect, adminOnly, updateFacility)      
  .delete(protect, adminOnly, deleteFacility);  

export default facilityRoutes;
