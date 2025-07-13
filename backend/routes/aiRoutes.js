import express from "express";
import { createInventorySnapshot, generateFacilitySnapshots, getDispenseLogs, getFacilitySnapshotTrends, getInventorySnapshots, getRedistributionSnapshots, getSnapshotStats } from "../controllers/aiControllers/snapshotController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { getAiRedistributionSuggestions } from "../controllers/redistributionAiController.js";
const aiRoutes = express.Router();

aiRoutes.get("/redistribution-suggestions", protect, getAiRedistributionSuggestions);

// snapshots and logs
aiRoutes.post('/', protect, createInventorySnapshot);

aiRoutes.get('/generate', protect, adminOnly, generateFacilitySnapshots);

// Inventory snapshots for a facility 
aiRoutes.get("/inventory", protect, getInventorySnapshots);

// Redistribution behavior trends
aiRoutes.get("/redistribution", protect, getRedistributionSnapshots);

// AI Summary stats
aiRoutes.get("/stats", protect, getSnapshotStats);

// Training AI with historical dispensation logs
aiRoutes.get("/dispense-logs", protect, getDispenseLogs);

// For dashboard AI trends
aiRoutes.get("/facility-trends", protect, getFacilitySnapshotTrends);


export default aiRoutes;
