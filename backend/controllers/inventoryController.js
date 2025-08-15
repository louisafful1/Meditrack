// backend/controllers/inventoryController.js

import asyncHandler from 'express-async-handler';
import Inventory from '../models/inventoryModel.js';
import Facility from '../models/facilityModel.js';
import { logActivity } from '../utils/logActivity.js';
import { checkAndCreateExpiryNotification, checkStockLevelNotification } from '../utils/notificationUtils.js';
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

// @desc    Add new inventory item
// @route   POST /api/inventory
// @access  Private
export const createInventoryItem = asyncHandler(async (req, res) => {
  const {
    drugName,
    batchNumber,
    currentStock,
    supplier,
    expiryDate,
    receivedDate,
    reorderLevel,
    location,
  } = req.body;
  const userId = req.user._id;

  const userFacilityId = req.user.facility && req.user.facility._id
    ? req.user.facility._id
    : req.user.facility;
  const facilityObjectId = new mongoose.Types.ObjectId(userFacilityId);


  if (!drugName || !batchNumber || currentStock === undefined || !expiryDate || !receivedDate) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }

  const existingItem = await Inventory.findOne({ batchNumber, facility: facilityObjectId });
  if (existingItem) {
    res.status(400);
    throw new Error(`Drug with batch number '${batchNumber}' already exists for this facility.`);
  }

  const receivedDateObj = new Date(receivedDate);
  const expiryDateObj = new Date(expiryDate);
  const sixMonthsLater = new Date(receivedDateObj);
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  if (expiryDateObj < receivedDateObj) {
    res.status(400);
    throw new Error('Expiry Date cannot be before Received Date.');
  }

  if (expiryDateObj < sixMonthsLater) {
    res.status(400);
    throw new Error('Drug expiry date must be at least 6 months from the received date.');
  }

  let calculatedStatus;
  if (currentStock === 0) {
    calculatedStatus = "Out of Stock";
  } else if (currentStock > 0 && currentStock <= (reorderLevel || 0)) {
    calculatedStatus = "Low Stock";
  } else {
    calculatedStatus = "Adequate";
  }

  const item = await Inventory.create({
    drugName,
    batchNumber,
    currentStock,
    supplier,
    expiryDate,
    receivedDate,
    location,
    reorderLevel,
    status: calculatedStatus,
    facility: facilityObjectId,
    createdBy: userId,
  });

  // Invalidate relevant report caches after creation
  const cacheKeysToInvalidate = [
      'inventory', 'expired', 'nearing', 'dispensed', 'redistribution'
  ];

  for (const reportTypeToClear of cacheKeysToInvalidate) {
      const cacheKey = generateReportCacheKey(reportTypeToClear, userId, facilityObjectId, { startDate: null, endDate: null });
      await deleteCache(cacheKey);
  }


  await logActivity({
    userId: userId,
    action: "Created Inventory",
    module: "Inventory",
    targetId: item._id,
    message: `${drugName} added to inventory by ${req.user.name}`,
    facility: facilityObjectId,
  });

  await checkAndCreateExpiryNotification(item);
  await checkStockLevelNotification(item);

  res.status(201).json(item);
});

// @desc    Scan and save new inventory item
// @route   POST /api/inventory/scan
// @access  Private
export const scanAndSaveInventory = asyncHandler(async (req, res) => {
    const {
      drugName,
      batchNumber,
      currentStock,
      supplier,
      expiryDate,
      receivedDate,
      status,
      location
    } = req.body;
    const userId = req.user._id;

    const userFacilityId = req.user.facility && req.user.facility._id
        ? req.user.facility._id
        : req.user.facility;
    const facilityObjectId = new mongoose.Types.ObjectId(userFacilityId);
 
    if (!drugName || !batchNumber || !currentStock || !expiryDate || !receivedDate) {
      res.status(400);
      throw new Error("Missing required fields");
    }

    const existingItem = await Inventory.findOne({ batchNumber, facility: facilityObjectId });
    if (existingItem) {
      res.status(400);
      throw new Error(`Drug with batch number '${batchNumber}' already exists for this facility.`);
    }

    const receivedDateObj = new Date(receivedDate);
    const expiryDateObj = new Date(expiryDate);
    const sixMonthsLater = new Date(receivedDateObj);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    if (expiryDateObj < receivedDateObj) {
      res.status(400);
      throw new Error('Expiry Date cannot be before Received Date.');
    }

    if (expiryDateObj < sixMonthsLater) {
      res.status(400);
      throw new Error('Drug expiry date must be at least 6 months from the received date.');
    }
  
    const inventoryItem = new Inventory({
      drugName,
      batchNumber,
      currentStock,
      supplier,
      expiryDate,
      receivedDate,
      status: status || (currentStock <= (existingItem?.reorderLevel || 0) / 2 ? "Critical" : currentStock <= (existingItem?.reorderLevel || 0) ? "Low Stock" : "Adequate"),
      location,
      createdBy: userId,
      facility: facilityObjectId,
      reorderLevel: existingItem?.reorderLevel
    });
  
    const savedItem = await inventoryItem.save();
    
    // Invalidate relevant report caches after scan and save
    const cacheKeysToInvalidate = [
        'inventory', 'expired', 'nearing', 'dispensed', 'redistribution'
    ];

    for (const reportTypeToClear of cacheKeysToInvalidate) {
        const cacheKey = generateReportCacheKey(reportTypeToClear, userId, facilityObjectId, { startDate: null, endDate: null });
        await deleteCache(cacheKey);
    }


    await logActivity({
      userId: userId,
      facility: facilityObjectId,
      action: "Created Inventory (Scan)",
      module: "Inventory",
      targetId: savedItem._id,
      message: `${drugName} added to inventory by ${req.user.name} via QR scan`,
    });

    await checkAndCreateExpiryNotification(savedItem);
    await checkStockLevelNotification(savedItem);

    res.status(201).json(savedItem);
  });


// @desc    Get all inventory for a user's facility
// @route   GET /api/inventory
// @access  Private
export const getInventoryByFacility = asyncHandler(async (req, res) => {
  const userFacilityId = req.user.facility && req.user.facility._id
    ? req.user.facility._id
    : req.user.facility;
  const facilityObjectId = new mongoose.Types.ObjectId(userFacilityId);

  const inventory = await Inventory.find({ facility: facilityObjectId })
  .populate("facility", "name")
  .sort({ createdAt: -1 });

  res.status(200).json(inventory);
});

// @desc    Get single inventory item by ID
// @route   GET /api/inventory/:id
// @access  Private
export const getInventoryItem = asyncHandler(async (req, res) => {
  const item = await Inventory.findById(req.params.id);
  const userFacilityId = req.user.facility && req.user.facility._id
    ? req.user.facility._id
    : req.user.facility;
  const facilityObjectId = new mongoose.Types.ObjectId(userFacilityId);


  if (!item || !item.facility.equals(facilityObjectId)) {
    res.status(404);
    throw new Error('Item not found or not accessible');
  }

  res.status(200).json(item);
});

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private
export const updateInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const userId = req.user._id;

  const userFacilityId = req.user.facility && req.user.facility._id
    ? req.user.facility._id
    : req.user.facility;
  const facilityObjectId = new mongoose.Types.ObjectId(userFacilityId);


  const item = await Inventory.findById(id);

  if (!item) {
    res.status(404);
    throw new Error('Item not found or not accessible');
  }

  if (!item.facility.equals(facilityObjectId)) {
    res.status(403);
    throw new Error('Access Denied: You are not authorized to update this inventory item.');
  }

  if (updates.expiryDate || updates.receivedDate) {
    const currentReceivedDate = updates.receivedDate ? new Date(updates.receivedDate) : new Date(item.receivedDate);
    const currentExpiryDate = updates.expiryDate ? new Date(updates.expiryDate) : new Date(item.expiryDate);

    const sixMonthsLater = new Date(currentReceivedDate);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    if (currentExpiryDate < currentReceivedDate) {
      res.status(400);
      throw new Error('Expiry Date cannot be before Received Date.');
    }
    if (currentExpiryDate < sixMonthsLater) {
      res.status(400);
      throw new Error('Drug expiry date must be at least 6 months from the received date.');
    }
  }

  if (updates.currentStock !== undefined || updates.reorderLevel !== undefined) {
    const newStock = updates.currentStock !== undefined ? Number(updates.currentStock) : item.currentStock;
    const newReorderLevel = updates.reorderLevel !== undefined ? Number(updates.reorderLevel) : item.reorderLevel;

    updates.status = newStock <= newReorderLevel / 2 ? "Critical" :
                     newStock <= newReorderLevel ? "Low Stock" : "Adequate";
  }

  const updatedItem = await Inventory.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updatedItem) {
    res.status(500);
    throw new Error('Failed to update inventory item.');
  }

  // Invalidate relevant report caches after updating
  const cacheKeysToInvalidate = [
      'inventory', 'expired', 'nearing', 'dispensed', 'redistribution'
  ];

  for (const reportTypeToClear of cacheKeysToInvalidate) {
      const cacheKey = generateReportCacheKey(reportTypeToClear, userId, facilityObjectId, { startDate: null, endDate: null });
      await deleteCache(cacheKey);
  }


  await logActivity({
    userId: userId,
    action: "Updated Inventory",
    module: "Inventory",
    targetId: updatedItem._id,
    message: `${req.user.name} updated ${updatedItem.drugName} batch ${updatedItem.batchNumber}`,
    facility: facilityObjectId
  });

  await checkAndCreateExpiryNotification(updatedItem);
  await checkStockLevelNotification(updatedItem);
  
  res.status(200).json(updatedItem);
});


// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private
export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const userFacilityId = req.user.facility && req.user.facility._id
    ? req.user.facility._id
    : req.user.facility;
  const facilityObjectId = new mongoose.Types.ObjectId(userFacilityId);


  const item = await Inventory.findById(id);

  if (!item) {
    res.status(404);
    throw new Error('Item not found or not accessible');
  }

  if (!item.facility.equals(facilityObjectId)) {
    res.status(403);
    throw new Error('Access Denied: You are not authorized to delete this inventory item.');
  }

  await item.deleteOne();

  // Invalidate relevant report caches after deletion
  const cacheKeysToInvalidate = [
      'inventory', 'expired', 'nearing', 'dispensed', 'redistribution'
  ];

  for (const reportTypeToClear of cacheKeysToInvalidate) {
      const cacheKey = generateReportCacheKey(reportTypeToClear, userId, facilityObjectId, { startDate: null, endDate: null });
      await deleteCache(cacheKey);
  }


  await logActivity({
    userId: userId,
    action: "Deleted Inventory",
    module: "Inventory",
    targetId: item._id,
    message: `${req.user.name} deleted ${item.drugName} batch ${item.batchNumber}`,
    facility: facilityObjectId
  });
  
  res.status(200).json({ message: 'Item removed' });
});