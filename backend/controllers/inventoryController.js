import asyncHandler from 'express-async-handler';
import Inventory from '../models/inventoryModel.js';
import Facility from '../models/facilityModel.js';
import { logActivity } from '../utils/logActivity.js';
import { checkAndCreateExpiryNotification, checkStockLevelNotification } from '../utils/notificationUtils.js';
// import redisClient from '../config/redisClient.js';

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

  if (!drugName || !batchNumber || !currentStock || !expiryDate || !receivedDate) {
    res.status(400);
    throw new Error('Please fill in all required fields');
  }
  // Calculate Status Based on Stock and Reorder Level
  let calculatedStatus;
  if (currentStock === 0) {
    calculatedStatus = "Out of Stock";
  } else if (currentStock > 0 && currentStock < reorderLevel) {
    calculatedStatus = "Low Stock";
  } else {
    calculatedStatus = "Adequate";
  }
  const facilityId = req.user.facility;
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
    facility: facilityId,
    createdBy: req.user._id,
  });

    // Log Activity
    await logActivity({
      userId: req.user._id,
      action: "Created Inventory",
      module: "Inventory",
      targetId: item._id,
      message: `${drugName} added to inventory by ${req.user.name}`,
    });

  // Check for expiry and stock level notifications
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
 
    // Validation
    if (!drugName || !batchNumber || !currentStock || !expiryDate || !receivedDate) {
      res.status(400);
      throw new Error("Missing required fields");
    }
  
    const inventoryItem = new Inventory({
      drugName,
      batchNumber,
      currentStock,
      supplier,
      expiryDate,
      receivedDate,
     status: status || "Adequate",
      location,
      createdBy: req.user._id,
      facility: req.user.facility
    });
  
    const savedItem = await inventoryItem.save();
    // await redisClient.del(`inventory:${req.user.facility}`);
      // Log Activity
  await logActivity({
    userId: req.user._id,
    facility: req.user.facility,
    action: "Create Inventory",
    module: "inventory",
    targetId: savedItem._id,
    message: `${drugName} added to inventory by ${req.user.name}`,
  });

  // Check for expiry and stock level notifications
  await checkAndCreateExpiryNotification(savedItem);
  await checkStockLevelNotification(savedItem);

    res.status(201).json(savedItem);
  });



// @desc    Get all inventory for a user's facility
// @route   GET /api/inventory
// @access  Private
export const getInventoryByFacility = asyncHandler(async (req, res) => {
  const facilityId = req.user.facility;

  const inventory = await Inventory.find({ facility: facilityId })
  .populate("facility", "name")
  .sort({ createdAt: -1 });

  res.status(200).json(inventory);
});

// @desc    Get single inventory item by ID
// @route   GET /api/inventory/:id
// @access  Private
export const getInventoryItem = asyncHandler(async (req, res) => {
  const item = await Inventory.findById(req.params.id);

  if (!item || item.facility.toString() !== req.user.facility.toString()) {
    res.status(404);
    throw new Error('Item not found or not accessible');
  }

  res.status(200).json(item);
});

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private
export const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await Inventory.findById(req.params.id);

  if (!item || item.facility.toString() !== req.user.facility.id.toString()) {
    res.status(404);
    throw new Error('Item not found or not accessible');
  }

  const updates = req.body;
  Object.assign(item, updates);

  const updatedItem = await item.save();

  await logActivity({
    userId: req.user._id,
    action: "Updated Inventory",
    module: "Inventory",
    targetId: item._id,
    message: `${req.user.name} updated ${item.drugName} batch ${item.batchNumber}`,
  });

  // Check for expiry and stock level notifications after update
  await checkAndCreateExpiryNotification(updatedItem);
  await checkStockLevelNotification(updatedItem);
  
  res.status(200).json(updatedItem);
});


// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private
export const deleteInventoryItem = asyncHandler(async (req, res) => {
  const item = await Inventory.findById(req.params.id);

  if (!item || item.facility.toString() !== req.user.facility.id.toString()) {
    res.status(404);
    throw new Error('Item not found or not accessible');
  }

 await Inventory.findByIdAndDelete(item._id);

  // await redisClient.del(`inventory:${req.user.facility}`);
  await logActivity({
    userId: req.user._id,
    action: "Deleted Inventory",
    module: "Inventory",
    targetId: item._id,
    message: `${req.user.name} deleted ${item.drugName} batch ${item.batchNumber}`,
  });
  
  res.status(200).json({ message: 'Item removed' });
});