// routes/redistributionRoutes.js
import express from "express";
import {
    approveRedistribution,
  createRedistribution,
  declineRedistribution,
  getRedistributions,
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

export default redistributionroutes;

