// controllers/redistributionController.js
import asyncHandler from "express-async-handler";
import Redistribution from "../models/redistributionModel.js";
import Inventory from "../models/inventoryModel.js";
import Facility from "../models/facilityModel.js";
import { logActivity } from "../utils/logActivity.js";
import RedistributionLog from "../models/aiModels/RedistributionLog.js";
import mongoose from "mongoose"; // Import mongoose for ObjectId comparison
import { createRedistributionNotification } from "../utils/notificationUtils.js";

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
          await createRedistributionNotification(redistribution, "REDISTRIBUTION_CREATED");

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
   // Start a Mongoose session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
     try {
    const redistribution = await Redistribution.findById(req.params.id)
        .populate("drug")
        .populate("fromFacility")
        .populate("toFacility")
        .populate("requestedBy")
        .session(session);

    if (!redistribution) {
        res.status(404);
        throw new Error("Redistribution not found");
    }

    // Ensure req.user.facility is an ObjectId for direct comparison
    const userFacilityObjectId = mongoose.Types.ObjectId.isValid(req.user.facility)
        ? new mongoose.Types.ObjectId(req.user.facility)
        : (req.user.facility && req.user.facility._id ? new mongoose.Types.ObjectId(req.user.facility._id) : null);

    // Ensure redistribution.toFacility._id is an ObjectId
    const toFacilityObjectId = redistribution.toFacility?._id;

    // Perform comparison using .equals() for ObjectIds
    const isAuthorized = userFacilityObjectId && toFacilityObjectId && userFacilityObjectId.equals(toFacilityObjectId);


    // Authorization Check: Only the 'toFacility' (receiving facility) can approve the request
    if (!isAuthorized) {
        res.status(403);
        throw new Error("Not authorized to approve this redistribution");
    }
    if (redistribution.status !== "pending") { // Only pending requests can be approved
            res.status(400);
            throw new Error(`Redistribution status is '${redistribution.status}', cannot approve.`);
        }

    // Deduct stock from fromFacility
    const fromStock = await Inventory.findOne({
        facility: redistribution.fromFacility._id,
        drugName: redistribution.drug.drugName,
        batchNumber: redistribution.drug.batchNumber,
    }).session(session);

    if (!fromStock || fromStock.currentStock < redistribution.quantity) {
        res.status(400);
        throw new Error("Insufficient stock in sending facility");
    }

    fromStock.currentStock -= redistribution.quantity;

       if (fromStock.currentStock === 0) {
            fromStock.status = "Out of Stock";
        } else if (fromStock.currentStock > 0 && fromStock.currentStock < fromStock.reorderLevel) {
            fromStock.status = "Low Stock";
        } else {
            fromStock.status = "Adequate";
        }
    await fromStock.save({ session });

    // Add stock to toFacility (or create new inventory item)
    let toStock = await Inventory.findOne({
        facility: redistribution.toFacility._id,
        drugName: redistribution.drug.drugName,
        batchNumber: redistribution.drug.batchNumber,
    }).session(session);

    if (toStock) {
        toStock.currentStock += redistribution.quantity;
        if (toStock.currentStock === 0) { 
                toStock.status = "Out of Stock";
            } else if (toStock.currentStock > 0 && toStock.currentStock < toStock.reorderLevel) {
                toStock.status = "Low Stock";
            } else {
                toStock.status = "Adequate";
            }
            await toStock.save({ session }); 
    } else {
            // If new item, calculate its initial status
            let initialNewStockStatus;
            if (redistribution.quantity === 0) {
                initialNewStockStatus = "Out of Stock";
            } else if (redistribution.quantity > 0 && redistribution.quantity < (redistribution.drug.reorderLevel || 10)) { 
                initialNewStockStatus = "Low Stock";
            } else {
                initialNewStockStatus = "Adequate";
            }
        toStock = await Inventory.create([{
            drugName: redistribution.drug.drugName,
            batchNumber: redistribution.drug.batchNumber,
            currentStock: redistribution.quantity,
            supplier: redistribution.drug.supplier || "Redistributed",
            expiryDate: redistribution.drug.expiryDate,
            receivedDate: new Date(),
            status: initialNewStockStatus,
            location: "Redistributed Stock",
            facility: redistribution.toFacility._id,
            createdBy: req.user._id,
            reorderLevel: redistribution.drug.reorderLevel || 10,
        }], { session });
        toStock = toStock[0];
    }

    // Update redistribution
    redistribution.status = "completed";
    redistribution.receivedBy = req.user._id;
    redistribution.receivedAt = new Date();
    await redistribution.save({ session });

    //log for ai training
    await RedistributionLog.create([{
        redistributionId: redistribution._id,
        drug: redistribution.drug._id,
        quantity: redistribution.quantity,
        fromFacility: redistribution.fromFacility._id,
        toFacility: redistribution.toFacility._id,
        reason: redistribution.reason,
        expiryDate: redistribution.expiryDate,
        requestedBy: redistribution.requestedBy._id, 
        receivedBy: req.user._id,
        requestedAt: redistribution.createdAt,
        receivedAt: redistribution.receivedAt,
        status: redistribution.status,
    }], { session });

    await logActivity({
        userId: req.user._id,
        facility: req.user.facility,
        action: "Approved Redistribution",
        module: "Redistribution",
        targetId: redistribution._id,
        message: `${req.user.name} approved redistribution of ${redistribution.quantity} ${redistribution.drug.drugName}`,
    }, { session });

      await createRedistributionNotification(redistribution, "REDISTRIBUTION_APPROVED", { session });
        await session.commitTransaction();
        session.endSession();
    res.status(200).json({ message: "Redistribution approved", redistribution });
     } catch (error) {
        await session.abortTransaction();
        session.endSession();
        // Re-throw the error to be caught by asyncHandler's error handling middleware
        throw error;
    }
});


// @desc    Decline a redistribution request
// @route   PUT /api/redistribution/decline/:id
// @access  Private
export const declineRedistribution = asyncHandler(async (req, res) => {
    // FIX: Populate all necessary fields for consistency and potential notifications/logs
    const redistribution = await Redistribution.findById(req.params.id)
        .populate("drug") // Added
        .populate("fromFacility") // Added
        .populate("toFacility")
        .populate("requestedBy"); // Added

    if (!redistribution) {
        res.status(404);
        throw new Error("Redistribution not found");
    }

    // Ensure req.user.facility is an ObjectId for direct comparison
    const userFacilityObjectId = mongoose.Types.ObjectId.isValid(req.user.facility)
        ? new mongoose.Types.ObjectId(req.user.facility)
        : (req.user.facility && req.user.facility._id ? req.user.facility._id : null);

    // Ensure redistribution.toFacility._id is an ObjectId
    const toFacilityObjectId = redistribution.toFacility?._id;

    // Perform comparison using .equals() for ObjectIds
    const isAuthorized = userFacilityObjectId && toFacilityObjectId && userFacilityObjectId.equals(toFacilityObjectId);

    if (!isAuthorized) {
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

    // Log Activity 
    await logActivity({
        userId: req.user._id,
        action: "Declined Redistribution",
        module: "Redistribution",
        targetId: redistribution._id,
        message: `${req.user.name} declined redistribution of ${redistribution.quantity} ${redistribution.drug.drugName} to ${redistribution.toFacility.name}`,
    });

      await createRedistributionNotification(redistribution, "REDISTRIBUTION_DECLINED");

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
