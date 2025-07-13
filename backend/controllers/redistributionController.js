// controllers/redistributionController.js
import asyncHandler from "express-async-handler";
import Redistribution from "../models/redistributionModel.js";
import Inventory from "../models/inventoryModel.js";
import Facility from "../models/facilityModel.js";
import { logActivity } from "../utils/logActivity.js";
import RedistributionLog from "../models/aiModels/RedistributionLog.js";

// @desc    Create redistribution request
// @route   POST /api/redistribution
// @access  Private

export const createRedistribution = asyncHandler(async (req, res) => {
  const { drug, quantity, toFacility, reason } = req.body;

  if (!drug || !quantity || !toFacility || !reason) {
    res.status(400);
    throw new Error("All required fields must be filled.");
  }

  const fromFacility = req.user.facility;

  // Prevent redistributing within the same facility
  if (fromFacility.toString() === toFacility.toString()) {
    res.status(400);
    throw new Error("Cannot redistribute drugs within the same facility.");
  }

  // Check if the destination facility exists
  const receivingFacility = await Facility.findById(toFacility);
  if (!receivingFacility) {
    res.status(404);
    throw new Error("Receiving facility not found.");
  }

  // Check if the drug exists and belongs to the requesting user's facility
  const inventoryItem = await Inventory.findOne({ _id: drug, facility: fromFacility });
  if (!inventoryItem) {
    res.status(404);
    throw new Error("Drug not found in your facility's inventory.");
  }

  // Check for sufficient stock
  if (inventoryItem.currentStock < quantity) {
    res.status(400);
    throw new Error(`Insufficient stock. Only ${inventoryItem.currentStock} available.`);
  }

  const expiryDate = inventoryItem.expiryDate;

  const redistribution = await Redistribution.create({
    drug,
    quantity,
    fromFacility,
    toFacility,
    reason,
    expiryDate,
    requestedBy: req.user._id,
  });

  await logActivity({
    userId: req.user._id,
    action: "Requested Redistribution",
    module: "Redistribution",
    targetId: redistribution._id,
    message: `${req.user.name} requested redistribution of ${quantity} ${inventoryItem.drugName} to ${toFacility}`,
  });
  res.status(201).json(redistribution);
});


// @desc    Get all redistributions for facility (sent or received)
// @route   GET /api/redistribution
// @access  Private
export const getRedistributions = asyncHandler(async (req, res) => {
  const facilityId = req.user.facility;

  const redistributions = await Redistribution.find({
    $or: [{ fromFacility: facilityId }, { toFacility: facilityId }],
  })
    .populate("drug")
    .populate("fromFacility")
    .populate("toFacility")
    .sort({ createdAt: -1 });

  res.status(200).json(redistributions);
});


// @desc    Approve and complete a redistribution
// @route   PUT /api/redistributions/:id/approve
// @access  Private (only receiving facility users)
export const approveRedistribution = asyncHandler(async (req, res) => {
  const redistribution = await Redistribution.findById(req.params.id)
    .populate("drug")
    .populate("fromFacility")
    .populate("toFacility");

  if (!redistribution) {
    res.status(404);
    throw new Error("Redistribution not found");
  }

  if (redistribution.toFacility._id.toString() !== req.user.facility.toString()) {
    res.status(403);
    throw new Error("Not authorized to approve this redistribution");
  }

  if (redistribution.status === "completed") {
    res.status(400);
    throw new Error("Redistribution has already been approved");
  }

  // Deduct stock from fromFacility
  const fromStock = await Inventory.findOne({
    facility: redistribution.fromFacility._id,
    drugName: redistribution.drug.drugName,
    batchNumber: redistribution.drug.batchNumber,
  });

  if (!fromStock || fromStock.currentStock < redistribution.quantity) {
    res.status(400);
    throw new Error("Insufficient stock in sending facility");
  }

  fromStock.currentStock -= redistribution.quantity;
  await fromStock.save();

  // Add stock to toFacility (or create new inventory item)
  let toStock = await Inventory.findOne({
    facility: redistribution.toFacility._id,
    drugName: redistribution.drug.drugName,
    batchNumber: redistribution.drug.batchNumber,
  });

  if (toStock) {
    toStock.currentStock += redistribution.quantity;
    await toStock.save();
  } else {
    toStock = await Inventory.create({
      drugName: redistribution.drug.drugName,
      batchNumber: redistribution.drug.batchNumber,
      currentStock: redistribution.quantity,
      supplier: redistribution.drug.supplier || "Redistributed",
      expiryDate: redistribution.drug.expiryDate,
      receivedDate: new Date(),
      status: "available",
      location: "Redistributed Stock",
      facility: redistribution.toFacility._id,
      createdBy: req.user._id,
    });
  }

  // Update redistribution
  redistribution.status = "completed";
  redistribution.receivedBy = req.user._id;
  redistribution.receivedAt = new Date();
  await redistribution.save();

  //log for ai training
  await RedistributionLog.create({
    redistributionId: redistribution._id,
    drug: redistribution.drug._id,
    quantity: redistribution.quantity,
    fromFacility: redistribution.fromFacility._id,
    toFacility: redistribution.toFacility._id,
    reason: redistribution.reason,
    expiryDate: redistribution.expiryDate,
    requestedBy: redistribution.requestedBy,
    receivedBy: req.user._id,
    requestedAt: redistribution.createdAt,
    receivedAt: redistribution.receivedAt,
    status: redistribution.status,
  });
  
  await logActivity({
    userId: req.user._id,
    action: "Approved Redistribution",
    module: "Redistribution",
    targetId: redistribution._id,
    message: `${req.user.name} approved redistribution of ${redistribution.quantity} ${redistribution.drug.drugName}`,
  });


  
  res.status(200).json({ message: "Redistribution approved", redistribution });
});


// @desc    Decline a redistribution request
// @route   PUT /api/redistribution/decline/:id
// @access  Private
export const declineRedistribution = asyncHandler(async (req, res) => {
  const redistribution = await Redistribution.findById(req.params.id)
    .populate("toFacility");

  if (!redistribution) {
    res.status(404);
    throw new Error("Redistribution not found");
  }

  if (redistribution.toFacility._id.toString() !== req.user.facility.toString()) {
    res.status(403);
    throw new Error("Not authorized to decline this redistribution");
  }

  if (redistribution.status !== "pending") {
    res.status(400);
    throw new Error("Only pending redistributions can be declined");
  }

  redistribution.status = "declined";
  redistribution.declinedBy = req.user._id;
  redistribution.declinedAt = new Date();
  await redistribution.save();

  res.status(200).json({ message: "Redistribution declined", redistribution });
});


// @desc    Update redistribution status
// @route   PUT /api/redistribution/:id
// @access  Private
export const updateRedistributionStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const redistribution = await Redistribution.findById(req.params.id);

  if (!redistribution) {
    res.status(404);
    throw new Error("Redistribution request not found.");
  }

  redistribution.status = status;
  await redistribution.save();

  res.status(200).json(redistribution);
});

