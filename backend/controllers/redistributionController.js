// controllers/redistributionController.js
import asyncHandler from "express-async-handler";
import Redistribution from "../models/redistributionModel.js";
import Inventory from "../models/inventoryModel.js";
import Facility from "../models/facilityModel.js";
import { logActivity } from "../utils/logActivity.js";
import RedistributionLog from "../models/aiModels/RedistributionLog.js";
import mongoose from "mongoose";
import { createRedistributionNotification } from "../utils/notificationUtils.js";
import { deleteCache } from '../utils/cache.js';

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

// Helper to generate a unique cache key for activity logs (must match activityLogController.js logic)
const generateActivityLogCacheKey = (userId, facilityId, filters) => {
    const facilityIdString = getFacilityIdString(facilityId);
    const userFilter = filters.user || 'all-users';
    const moduleFilter = filters.module || 'all-modules';
    const fromDate = filters.from || 'no-start-date';
    const toDate = filters.to || 'no-end-date';
    return `activityLogs:${userId}:${facilityIdString}:${userFilter}:${moduleFilter}:${fromDate}:${toDate}`;
};


// @desc    Create redistribution request
// @route   POST /api/redistribution
// @access  Private
export const createRedistribution = asyncHandler(async (req, res) => {
    const { drug, quantity, toFacility, reason } = req.body;
    const userId = req.user._id;

    const userFacilityId = req.user.facility && req.user.facility._id
        ? req.user.facility._id
        : req.user.facility;
    const fromFacilityObjectId = new mongoose.Types.ObjectId(userFacilityId);


    if (!drug || !quantity || !toFacility || !reason) {
        res.status(400);
        throw new Error("All required fields must be filled.");
    }

    if (fromFacilityObjectId.equals(new mongoose.Types.ObjectId(toFacility))) {
        res.status(400);
        throw new Error("Cannot redistribute drugs within the same facility.");
    }

    const receivingFacility = await Facility.findById(toFacility);
    if (!receivingFacility) {
        res.status(404);
        throw new Error("Receiving facility not found.");
    }

    const inventoryItem = await Inventory.findOne({ _id: drug, facility: fromFacilityObjectId });
    if (!inventoryItem) {
        res.status(404);
        throw new Error("Drug not found in your facility's inventory.");
    }

    if (inventoryItem.currentStock < quantity) {
        res.status(400);
        throw new Error(`Insufficient stock. Only ${inventoryItem.currentStock} available.`);
    }

    const expiryDate = inventoryItem.expiryDate;

    let redistribution = await Redistribution.create({ // Use 'let' for reassignment
        drug,
        quantity,
        fromFacility: fromFacilityObjectId,
        toFacility,
        reason,
        expiryDate,
        requestedBy: userId,
    });

    // ✨ CORE FIX: Populate the 'drug', 'fromFacility', and 'toFacility' fields
    // on the created redistribution object before sending notification or logging.
    // This ensures drugName, batchNumber, and facility names are available.
    redistribution = await Redistribution.findById(redistribution._id)
        .populate('drug', 'drugName batchNumber') // Populate drug with specific fields
        .populate('fromFacility', 'name')        // Populate fromFacility with name
        .populate('toFacility', 'name');         // Populate toFacility with name


    // Invalidate 'redistribution' report cache for the requesting facility
    const requestingFacilityCacheKey = generateReportCacheKey('redistribution', userId, fromFacilityObjectId, { startDate: null, endDate: null });
    await deleteCache(requestingFacilityCacheKey);


    // Log activity (now with populated drugName and facility names)
    await logActivity({
        userId: userId,
        action: "Requested Redistribution",
        module: "Redistribution",
        targetId: redistribution._id,
        message: `${req.user.name} requested redistribution of ${redistribution.quantity} ${redistribution.drug?.drugName || 'N/A'} to ${redistribution.toFacility?.name || 'N/A'}`,
        facility: fromFacilityObjectId
    });

    // Invalidate ALL activity log cache keys for this facility
    const activityLogWildcardKey = `activityLogs:${userId}:${getFacilityIdString(fromFacilityObjectId)}:*`;
    await deleteCache(activityLogWildcardKey);
    await deleteCache(generateActivityLogCacheKey(userId, fromFacilityObjectId, {}));
    await deleteCache(generateActivityLogCacheKey(userId, fromFacilityObjectId, { module: 'Redistribution' }));
    await deleteCache(generateActivityLogCacheKey(userId, fromFacilityObjectId, { dateRange: 'today' }));

    // Now call notification function with the fully populated redistribution object
    await createRedistributionNotification(redistribution, "REDISTRIBUTION_CREATED");

    res.status(201).json(redistribution);
});


// @desc    Get all redistributions for facility (sent or received)
// @route   GET /api/redistribution
// @access  Private
export const getRedistributions = asyncHandler(async (req, res) => {
    const userFacilityId = req.user.facility && req.user.facility._id
        ? req.user.facility._id
        : req.user.facility;
    const facilityObjectId = new mongoose.Types.ObjectId(userFacilityId);

    const redistributions = await Redistribution.find({
        $or: [{ fromFacility: facilityObjectId }, { toFacility: facilityObjectId }],
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
            console.error("Redistribution not found for ID:", req.params.id);
            res.status(404);
            throw new Error("Redistribution not found");
        }
        console.log("Redistribution found:", redistribution._id);

        const userFacilityId = req.user.facility && req.user.facility._id
            ? req.user.facility._id
            : req.user.facility;
        const currentUserFacilityObjectId = new mongoose.Types.ObjectId(userFacilityId);

        const toFacilityObjectId = redistribution.toFacility?._id;

        const isAuthorized = currentUserFacilityObjectId && toFacilityObjectId && currentUserFacilityObjectId.equals(toFacilityObjectId);

        if (!isAuthorized) {
            console.error("Authorization failed: User facility ID", currentUserFacilityObjectId, "does not match redistribution toFacility ID", toFacilityObjectId);
            res.status(403);
            throw new Error("Not authorized to approve this redistribution");
        }
        if (redistribution.status !== "pending") {
            console.error(`Redistribution status is '${redistribution.status}', expected 'pending'.`);
            res.status(400);
            throw new Error(`Redistribution status is '${redistribution.status}', cannot approve.`);
        }

        // --- Debugging: From Facility Stock Update ---
        console.log("\n--- APPROVING REDISTRIBUTION: Starting stock updates ---");
        console.log("Redistribution Quantity:", redistribution.quantity);
        console.log("Drug for redistribution:", redistribution.drug.drugName, "Batch:", redistribution.drug.batchNumber);

        const fromStockQuery = {
            facility: redistribution.fromFacility._id,
            drugName: redistribution.drug.drugName, // Use drugName from populated redistribution.drug
            batchNumber: redistribution.drug.batchNumber, // Use batchNumber from populated redistribution.drug
        };
        console.log("FROM Stock - Query for Inventory.findOne:", JSON.stringify(fromStockQuery));
        const fromStock = await Inventory.findOne(fromStockQuery).session(session);

        if (!fromStock) {
            console.error("ERROR: Sending facility inventory item NOT FOUND with query:", JSON.stringify(fromStockQuery));
            res.status(400);
            throw new Error("Sending facility stock item not found or drug/batch mismatch. Aborting transaction.");
        }
        console.log(`FROM Stock - Found: ID=${fromStock._id}, Current=${fromStock.currentStock}, Status=${fromStock.status}`);

        if (fromStock.currentStock < redistribution.quantity) {
            console.error("ERROR: Insufficient stock in sending facility during approval. Available:", fromStock.currentStock, "Requested:", redistribution.quantity);
            res.status(400);
            throw new Error("Insufficient stock in sending facility. Aborting transaction.");
        }

        fromStock.currentStock -= redistribution.quantity;
        console.log(`FROM Stock - After deduction: New current=${fromStock.currentStock}`);

        if (fromStock.currentStock === 0) {
            fromStock.status = "Out of Stock";
        } else if (fromStock.currentStock > 0 && fromStock.currentStock <= (fromStock.reorderLevel || 0)) {
            fromStock.status = "Low Stock";
        } else {
            fromStock.status = "Adequate";
        }
        console.log("FROM Stock - New status will be:", fromStock.status);
        await fromStock.save({ session });
        console.log("FROM Stock - Document saved successfully (within transaction).");
        const updatedFromStockAfterSave = await Inventory.findById(fromStock._id).session(session);
        console.log(`FROM Stock - Verified current stock in session after save: ${updatedFromStockAfterSave?.currentStock}`);


        // --- Debugging: To Facility Stock Update ---
        const toStockQuery = {
            facility: redistribution.toFacility._id,
            drugName: redistribution.drug.drugName, // Use drugName from populated redistribution.drug
            batchNumber: redistribution.drug.batchNumber, // Use batchNumber from populated redistribution.drug
        };
        console.log("\nTO Stock - Query for Inventory.findOne:", JSON.stringify(toStockQuery));
        let toStock = await Inventory.findOne(toStockQuery).session(session);

        if (toStock) {
            console.log(`TO Stock - Found: ID=${toStock._id}, Current=${toStock.currentStock}, Status=${toStock.status}`);
            toStock.currentStock += redistribution.quantity;
            console.log(`TO Stock - After addition: New current=${toStock.currentStock}`);
            if (toStock.currentStock === 0) {
                toStock.status = "Out of Stock";
            } else if (toStock.currentStock > 0 && toStock.currentStock <= (toStock.reorderLevel || 0)) {
                toStock.status = "Low Stock";
            } else {
                toStock.status = "Adequate";
            }
            console.log("TO Stock - New status will be:", toStock.status);
            await toStock.save({ session });
            console.log("TO Stock - Document saved successfully (within transaction).");
            const updatedToStockAfterSave = await Inventory.findById(toStock._id).session(session);
            console.log(`TO Stock - Verified current stock in session after save: ${updatedToStockAfterSave?.currentStock}`);
        } else {
            console.log("TO Stock - Inventory item NOT FOUND. Creating new inventory item for receiving facility.");
            const newInventoryItemData = {
                drugName: redistribution.drug.drugName,
                batchNumber: redistribution.drug.batchNumber,
                currentStock: redistribution.quantity,
                supplier: redistribution.drug.supplier || "Redistributed",
                expiryDate: redistribution.drug.expiryDate,
                receivedDate: new Date(),
                status: (redistribution.quantity <= (redistribution.drug.reorderLevel || 10) ? "Low Stock" : "Adequate"),
                location: "Redistributed Stock",
                facility: redistribution.toFacility._id,
                createdBy: req.user._id,
                reorderLevel: redistribution.drug.reorderLevel || 10,
            };
            console.log("TO Stock - New Inventory Item Data (for creation):", JSON.stringify(newInventoryItemData));
            const newItems = await Inventory.create([newInventoryItemData], { session });
            toStock = newItems[0];
            console.log(`TO Stock - New Inventory item created: ID=${toStock._id}, Current=${toStock.currentStock}`);
        }
        // --- End Debugging: Stock Updates ---

        redistribution.status = "completed";
        redistribution.receivedBy = req.user._id;
        redistribution.receivedAt = new Date();
        await redistribution.save({ session });
        console.log("\nRedistribution status updated to 'completed' and saved.");


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
        console.log("RedistributionLog created.");

        // Log activity
        await logActivity({
            userId: req.user._id,
            facility: currentUserFacilityObjectId,
            action: "Approved Redistribution",
            module: "Redistribution",
            targetId: redistribution._id,
            message: `${req.user.name} approved redistribution of ${redistribution.quantity} ${redistribution.drug?.drugName || 'N/A'} from ${redistribution.fromFacility?.name || 'N/A'} to ${redistribution.toFacility?.name || 'N/A'}`,
        }, { session });
        console.log("Activity log created.");

        // Invalidate ALL activity log cache keys for both facilities
        const fromFacilityActivityLogWildcardKey = `activityLogs:${redistribution.requestedBy._id}:${getFacilityIdString(redistribution.fromFacility._id)}:*`;
        await deleteCache(fromFacilityActivityLogWildcardKey);
        await deleteCache(generateActivityLogCacheKey(redistribution.requestedBy._id, redistribution.fromFacility._id, {}));
        await deleteCache(generateActivityLogCacheKey(redistribution.requestedBy._id, redistribution.fromFacility._id, { module: 'Redistribution' }));
        await deleteCache(generateActivityLogCacheKey(redistribution.requestedBy._id, redistribution.fromFacility._id, { dateRange: 'today' }));
        console.log("Activity log caches invalidated for sending facility.");


        const toFacilityActivityLogWildcardKey = `activityLogs:${req.user._id}:${getFacilityIdString(redistribution.toFacility._id)}:*`;
        await deleteCache(toFacilityActivityLogWildcardKey);
        await deleteCache(generateActivityLogCacheKey(req.user._id, redistribution.toFacility._id, {}));
        await deleteCache(generateActivityLogCacheKey(req.user._id, redistribution.toFacility._id, { module: 'Redistribution' }));
        await deleteCache(generateActivityLogCacheKey(req.user._id, redistribution.toFacility._id, { dateRange: 'today' }));
        console.log("Activity log caches invalidated for receiving facility.");


        await createRedistributionNotification(redistribution, "REDISTRIBUTION_APPROVED", { session });
        console.log("Redistribution approval notification sent.");

        // Invalidate 'inventory', 'expired', 'nearing', and 'redistribution' caches for BOTH affected facilities
        const reportTypesToInvalidate = ['inventory', 'expired', 'nearing', 'redistribution'];

        for (const reportType of reportTypesToInvalidate) {
            const cacheKey = generateReportCacheKey(reportType, redistribution.requestedBy._id, redistribution.fromFacility._id, { startDate: null, endDate: null });
            await deleteCache(cacheKey);
        }
        console.log("Report caches invalidated for sending facility.");

        for (const reportType of reportTypesToInvalidate) {
            const cacheKey = generateReportCacheKey(reportType, req.user._id, redistribution.toFacility._id, { startDate: null, endDate: null });
            await deleteCache(cacheKey);
        }
        console.log("Report caches invalidated for receiving facility.");


        await session.commitTransaction();
        session.endSession();
        console.log("\n--- TRANSACTION COMMITTED SUCCESSFULLY! Inventory updates should be persistent. ---");
        res.status(200).json({ message: "Redistribution approved", redistribution });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("\n--- TRANSACTION ABORTED DUE TO ERROR: ---", error);
        throw error;
    }
});


// @desc    Decline a redistribution request
// @route   PUT /api/redistribution/decline/:id
// @access  Private
export const declineRedistribution = asyncHandler(async (req, res) => {
    const redistribution = await Redistribution.findById(req.params.id)
        .populate("drug")
        .populate("fromFacility")
        .populate("toFacility")
        .populate("requestedBy");

    if (!redistribution) {
        res.status(404);
        throw new Error("Redistribution not found");
    }

    const userFacilityId = req.user.facility && req.user.facility._id
        ? req.user.facility._id
        : req.user.facility;
    const currentUserFacilityObjectId = new mongoose.Types.ObjectId(userFacilityId);

    const toFacilityObjectId = redistribution.toFacility?._id;

    const isAuthorized = currentUserFacilityObjectId && toFacilityObjectId && currentUserFacilityObjectId.equals(toFacilityObjectId);

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

    await logActivity({
        userId: req.user._id,
        facility: currentUserFacilityObjectId,
        action: "Declined Redistribution",
        module: "Redistribution",
        targetId: redistribution._id,
        message: `${req.user.name} declined redistribution of ${redistribution.quantity} ${redistribution.drug?.drugName || 'N/A'} to ${redistribution.toFacility?.name || 'N/A'}`,
    });

    await createRedistributionNotification(redistribution, "REDISTRIBUTION_DECLINED");

    // Invalidate 'redistribution' report cache for the receiving facility (current user's)
    const currentUserRedistributionCacheKey = generateReportCacheKey('redistribution', req.user._id, currentUserFacilityObjectId, { startDate: null, endDate: null });
    await deleteCache(currentUserRedistributionCacheKey);

    // Invalidate ALL activity log cache keys for this facility
    const activityLogWildcardKey = `activityLogs:${req.user._id}:${getFacilityIdString(currentUserFacilityObjectId)}:*`;
    await deleteCache(activityLogWildcardKey);
    await deleteCache(generateActivityLogCacheKey(req.user._id, currentUserFacilityObjectId, {}));
    await deleteCache(generateActivityLogCacheKey(req.user._id, currentUserFacilityObjectId, { module: 'Redistribution' }));
    await deleteCache(generateActivityLogCacheKey(req.user._id, currentUserFacilityObjectId, { dateRange: 'today' }));


    res.status(200).json({ message: "Redistribution declined", redistribution });
});


// @desc    Update redistribution status (generic - likely not used for approve/decline)
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
