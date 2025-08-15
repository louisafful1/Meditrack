// backend/controllers/dispensationController.js

import asyncHandler from "express-async-handler";
import Dispensation from "../models/dispensationModel.js";
import Inventory from "../models/inventoryModel.js";
import { logActivity } from "../utils/logActivity.js";
import { checkStockLevelNotification } from "../utils/notificationUtils.js";
import DispenseLog from "../models/aiModels/DispenseLog.js";
import { deleteCache } from '../utils/cache.js';
import mongoose from 'mongoose';

// Helper to ensure facility ID is consistently a string for cache keys/comparisons
const getFacilityIdString = (facility) => {
  if (!facility) return 'no-facility';
  if (typeof facility === 'string') return facility;
  if (facility._id) return facility._id.toString();
  if (facility instanceof mongoose.Types.ObjectId) return facility.toString();
  return 'no-facility';
};

// Helper to generate a unique cache key for reports (must match reportController.js logic)
const generateReportCacheKey = (reportType, userId, facilityId, dateRange) => {
  const facilityIdString = getFacilityIdString(facilityId);
  const startDate = dateRange?.startDate || 'no-start';
  const endDate = dateRange?.endDate || 'no-end';
  return `report:${reportType}:${userId}:${facilityIdString}:${startDate}:${endDate}`;
};

// @desc    Dispense a drug
// @route   POST /api/dispensations
// @access  Private
export const dispenseDrug = asyncHandler(async (req, res) => {
  const { drug, quantityDispensed, dispensedTo, note } = req.body;
  const userId = req.user._id;

  const userFacilityId = req.user.facility && req.user.facility._id
    ? req.user.facility._id
    : req.user.facility;
  const facilityObjectId = new mongoose.Types.ObjectId(userFacilityId);


  if (!drug || !quantityDispensed || !dispensedTo) {
    res.status(400);
    throw new Error("Please fill in all required fields.");
  }

  const inventoryItem = await Inventory.findById(drug);
  if (!inventoryItem) {
    res.status(404);
    throw new Error("Drug not found in inventory.");
  }

  if (!inventoryItem.facility.equals(facilityObjectId)) {
      res.status(403);
      throw new Error("Not authorized to dispense this drug from another facility.");
  }

  if (inventoryItem.currentStock < quantityDispensed) {
    res.status(400);
    throw new Error("Not enough stock available.");
  }

  // Reduce stock
  inventoryItem.currentStock -= quantityDispensed;

  if (inventoryItem.currentStock === 0) {
    inventoryItem.status = "Out of Stock";
  } else if (inventoryItem.currentStock <= (inventoryItem.reorderLevel || 0)) {
    inventoryItem.status = "Low Stock";
  } else {
    inventoryItem.status = "Adequate";
  }
  await inventoryItem.save();

  // Invalidate 'inventory', 'expired', 'nearing', 'dispensed', and 'redistribution' report caches
  const cacheKeysToInvalidate = [
      'inventory', 'expired', 'nearing', 'dispensed', 'redistribution'
  ];

  for (const reportTypeToClear of cacheKeysToInvalidate) {
      const cacheKey = generateReportCacheKey(reportTypeToClear, userId, facilityObjectId, { startDate: null, endDate: null });
      await deleteCache(cacheKey);
  }


  await checkStockLevelNotification(inventoryItem);

  const record = await Dispensation.create({
    drug,
    quantityDispensed,
    dispensedTo,
    note,
    dispensedBy: userId,
    facility: facilityObjectId,
    dateDispensed: new Date(),
  });

  await DispenseLog.create({
    drug,
    quantity: quantityDispensed,
    dispensedTo,
    facility: facilityObjectId,
    dispensedBy: userId,
    note,
  });

  await logActivity({
    userId: userId,
    facility: facilityObjectId,
    action: "Dispensed Drug",
    module: "Dispensation",
    targetId: record._id,
    message: `${req.user.name} dispensed ${quantityDispensed} of ${inventoryItem.drugName} to ${dispensedTo}`,
  });

  res.status(201).json(record);
});

// @desc    Get all dispensations for facility
// @route   GET /api/dispensations
// @access  Private
export const getDispensations = asyncHandler(async (req, res) => {
  const userFacilityId = req.user.facility && req.user.facility._id
    ? req.user.facility._id
    : req.user.facility;
  const facilityObjectId = new mongoose.Types.ObjectId(userFacilityId);

  const records = await Dispensation.find({ facility: facilityObjectId })
    .populate("drug", "drugName batchNumber")
    .populate("dispensedBy", "name")
    .sort({ createdAt: -1 });

  res.status(200).json(records);
});