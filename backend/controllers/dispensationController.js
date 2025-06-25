import asyncHandler from "express-async-handler";
import Dispensation from "../models/dispensationModel.js";
import Inventory from "../models/inventoryModel.js";
import { logActivity } from "../utils/logActivity.js";
import DispenseLog from "../models/aiModels/DispenseLog.js";

// @desc    Dispense a drug
// @route   POST /api/dispensations
// @access  Private

export const dispenseDrug = asyncHandler(async (req, res) => {
  const { drug, quantityDispensed, dispensedTo, note } = req.body;

  if (!drug || !quantityDispensed || !dispensedTo) {
    res.status(400);
    throw new Error("Please fill in all required fields.");
  }

  const inventoryItem = await Inventory.findById(drug);
  if (!inventoryItem) {
    res.status(404);
    throw new Error("Drug not found in inventory.");
  }

  if (inventoryItem.currentStock < quantityDispensed) {
    res.status(400);
    throw new Error("Not enough stock available.");
  }

  // Reduce stock
  inventoryItem.currentStock -= quantityDispensed;
  await inventoryItem.save();

  // Create a record in the main Dispensation table
  const record = await Dispensation.create({
    drug,
    quantityDispensed,
    dispensedTo,
    note,
    dispensedBy: req.user._id,
    facility: req.user.facility,
  });

  // Log to AI Training Dataset
  await DispenseLog.create({
    drug,
    quantity: quantityDispensed,
    dispensedTo,
    facility: req.user.facility,
    dispensedBy: req.user._id,
    note,
  });

  // Log to Activity Logs
  await logActivity({
    userId: req.user._id,
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
  const records = await Dispensation.find({ facility: req.user.facility })
    .populate("drug", "drugName batchNumber")
    .populate("dispensedBy", "name")
    .sort({ createdAt: -1 });

  res.status(200).json(records);
});
