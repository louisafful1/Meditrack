import express from "express";
import { createInventorySnapshot, generateFacilitySnapshots, getDispenseLogs, getFacilitySnapshotTrends, getInventorySnapshots, getRedistributionSnapshots, getSnapshotStats } from "../../controllers/aiControllers/snapshotController.js";
import { adminOnly, protect } from "../../middleware/authMiddleware.js";
const aiSnapshotRoutes = express.Router();


aiSnapshotRoutes.post('/', protect, createInventorySnapshot);

aiSnapshotRoutes.get('/generate', protect, adminOnly, generateFacilitySnapshots);

// Inventory snapshots for a facility 
aiSnapshotRoutes.get("/inventory", protect, getInventorySnapshots);

// Redistribution behavior trends
aiSnapshotRoutes.get("/redistribution", protect, getRedistributionSnapshots);

// AI Summary stats
aiSnapshotRoutes.get("/stats", protect, getSnapshotStats);

// Training AI with historical dispensation logs
aiSnapshotRoutes.get("/dispense-logs", protect, getDispenseLogs);

// For dashboard AI trends
aiSnapshotRoutes.get("/facility-trends", protect, getFacilitySnapshotTrends);

export default aiSnapshotRoutes;
