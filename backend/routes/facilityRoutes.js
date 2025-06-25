import express from "express";
import {
  createFacility,
  getFacilities,
  getFacilityById,
  updateFacility,
  deleteFacility,
} from "../controllers/facilityController.js";
import { protect } from "../middleware/authMiddleware.js";

const facilityRoutes = express.Router();


facilityRoutes.route("/")
  .post(createFacility)     
  .get(protect, getFacilities);      

facilityRoutes.route("/:id")
  .get(protect, getFacilityById)     
  .put(protect, updateFacility)      
  .delete(protect, deleteFacility);  

export default facilityRoutes;
