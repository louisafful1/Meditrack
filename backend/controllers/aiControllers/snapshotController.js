import asyncHandler from 'express-async-handler';
import InventorySnapshot from '../../models/aiModels/InventorySnapshot.js';
import Inventory from '../../models/inventoryModel.js';
import Dispensation from '../../models/dispensationModel.js';
import Facility from '../../models/facilityModel.js';
import Redistribution from '../../models/redistributionModel.js';
import FacilityBehaviorSnapshot from '../../models/aiModels/FacilityBehaviorSnapshot.js';
import RedistributionLog from '../../models/aiModels/RedistributionLog.js';
import DispenseLog from '../../models/aiModels/DispenseLog.js';

 

export const createInventorySnapshot = asyncHandler(async (req, res) => {
  const facilityId = req.user.facility;

  const items = await Inventory.find({ facility: facilityId });

  const snapshotData = items.map(item => ({
    drug: item._id,
    drugName: item.drugName,
    batchNumber: item.batchNumber,
    currentStock: item.currentStock,
    expiryDate: item.expiryDate,
    location: item.location,
  }));

  const snapshot = await InventorySnapshot.create({
    facility: facilityId,
    inventory: snapshotData,
  });

  res.status(201).json({ message: "Snapshot created", snapshot });
});

// @desc  Generate daily facility behavior snapshots
// @route GET /api/snapshots/generate
// @access Private/Admin or Cron
export const generateFacilitySnapshots = asyncHandler(async (req, res) => {
    const facilities = await Facility.find();
  
    for (const facility of facilities) {
      const drugs = await Inventory.find({ facility: facility._id });
  
      for (const drug of drugs) {
        try {
        const drugName = drug.drugName;
  
        const totalDispensed = await Dispensation.aggregate([
          { $match: { drug: drug._id, facility: facility._id } },
          { $group: { _id: null, total: { $sum: "$quantityDispensed" } } }
        ]);
  
        const totalRedistributedIn = await Redistribution.aggregate([
          { $match: { toFacility: facility._id, drug: drug._id, status: 'completed' } },
          { $group: { _id: null, total: { $sum: "$quantity" } } }
        ]);
  
        const totalRedistributedOut = await Redistribution.aggregate([
          { $match: { fromFacility: facility._id, drug: drug._id, status: 'completed' } },
          { $group: { _id: null, total: { $sum: "$quantity" } } }
        ]);
  
        const totalReceived = drug.currentStock + (totalDispensed[0]?.total || 0);
  
        // Optionally: Calculate average usage (assuming we log for ~30 days)
        const averageDailyUsage = ((totalDispensed[0]?.total || 0) / 30).toFixed(2);
  
        // Determine need level (simple rule)
        const needLevel = averageDailyUsage >= 5
          ? "high"
          : averageDailyUsage >= 2
          ? "moderate"
          : "low";
  
        await FacilityBehaviorSnapshot.create({
          facility: facility._id,
          drugName,
          totalDispensed: totalDispensed[0]?.total || 0,
          totalReceived,
          totalRedistributedIn: totalRedistributedIn[0]?.total || 0,
          totalRedistributedOut: totalRedistributedOut[0]?.total || 0,
          currentStock: drug.currentStock,
          averageDailyUsage,
          calculatedNeedLevel: needLevel,
        });
      
      }catch (err) {
        console.error(`Snapshot error for drug ${drug.drugName} in ${facility.name}: ${err.message}`);
      }
    }
    }
  
    res.status(200).json({ message: "Facility behavior snapshots generated." });
  });

  //  Get inventory snapshots for a user's facility
export const getInventorySnapshots = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const query = { facility: req.user.facility };
    if (startDate && endDate) {
      const from = new Date(startDate);
      const to = new Date(endDate);
      if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
        query.createdAt = { $gte: from, $lte: to };
      }
    }
  
    const snapshots = await InventorySnapshot.find(query).sort({ createdAt: -1 });
    res.status(200).json(snapshots);
  });
  
  // Redistribution AI logs
  export const getRedistributionSnapshots = asyncHandler(async (req, res) => {
    const logs = await RedistributionLog.find({}).populate("facility drug");
    res.status(200).json(logs);
  });
  
  // Facility AI trends for AI training or dashboard
  export const getFacilitySnapshotTrends = asyncHandler(async (req, res) => {
    const snapshots = await FacilityBehaviorSnapshot.find({
      facility: req.user.facility,
    }).sort({ createdAt: -1 });
    res.status(200).json(snapshots);
  });
  
  // Dispensation AI training logs
  export const getDispenseLogs = asyncHandler(async (req, res) => {
    const logs = await DispenseLog.find({
      facility: req.user.facility,
    }).populate("drug")
    .populate("dispensedBy", "name email");
    res.status(200).json(logs);
  });
  
  // Summary counts/stats for admin overview
  export const getSnapshotStats = asyncHandler(async (req, res) => {
    const [inventoryCount, redistributionCount, facilitySnapshots, dispenseLogs] = await Promise.all([
      InventorySnapshot.countDocuments(),
      RedistributionLog.countDocuments(),
      FacilityBehaviorSnapshot.countDocuments(),
      DispenseLog.countDocuments(),
    ]);
  
    res.status(200).json({
      inventorySnapshots: inventoryCount,
      redistributionLogs: redistributionCount,
      behaviorSnapshots: facilitySnapshots,
      dispenseLogs: dispenseLogs,
    });
  });