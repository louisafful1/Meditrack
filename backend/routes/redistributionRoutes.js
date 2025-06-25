// routes/redistributionRoutes.js
import express from "express";
import {
    approveRedistribution,
  createRedistribution,
  declineRedistribution,
  getRedistributions,
  getRedistributionSuggestions,
  updateRedistributionStatus,
} from "../controllers/redistributionController.js";
import { protect } from "../middleware/authMiddleware.js";

const redistributionroutes = express.Router();

redistributionroutes
  .route("/")
  .post(protect, createRedistribution)
  .get(protect, getRedistributions);

  redistributionroutes.put('/:id/approve', protect, approveRedistribution);
  redistributionroutes.put('/decline/:id', protect, declineRedistribution);
redistributionroutes.put("/:id", protect, updateRedistributionStatus);
// ai suggesstions
redistributionroutes.get('/suggestions', protect, getRedistributionSuggestions);

export default redistributionroutes;

