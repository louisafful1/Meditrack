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

    const redistribution = await Redistribution.create({
        drug,
        quantity,
        fromFacility: fromFacilityObjectId,
        toFacility,
        reason,
        expiryDate,
        requestedBy: userId,
    });

    // Invalidate 'redistribution' report cache for the requesting facility
    const requestingFacilityCacheKey = generateReportCacheKey('redistribution', userId, fromFacilityObjectId, { startDate: null, endDate: null });
    await deleteCache(requestingFacilityCacheKey);


    // Log activity
    await logActivity({
        userId: userId,
        action: "Requested Redistribution",
        module: "Redistribution",
        targetId: redistribution._id,
        message: `${req.user.name} requested redistribution of ${quantity} ${inventoryItem.drugName} to ${receivingFacility.name}`,
        facility: fromFacilityObjectId
    });

    // ✨ CORE FIX: Invalidate ALL activity log cache keys for this facility
    const activityLogWildcardKey = `activityLogs:${userId}:${getFacilityIdString(fromFacilityObjectId)}:*`;
    await deleteCache(activityLogWildcardKey);
    await deleteCache(generateActivityLogCacheKey(userId, fromFacilityObjectId, {})); // Default "all" filter
    await deleteCache(generateActivityLogCacheKey(userId, fromFacilityObjectId, { module: 'Redistribution' }));
    await deleteCache(generateActivityLogCacheKey(userId, fromFacilityObjectId, { dateRange: 'today' }));


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
            throw new Error("Not authorized to approve this redistribution");
        }
        if (redistribution.status !== "pending") {
            res.status(400);
            throw new Error(`Redistribution status is '${redistribution.status}', cannot approve.`);
        }

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
        } else if (fromStock.currentStock > 0 && fromStock.currentStock <= (fromStock.reorderLevel || 0)) {
            fromStock.status = "Low Stock";
        } else {
            fromStock.status = "Adequate";
        }
        await fromStock.save({ session });

        let toStock = await Inventory.findOne({
            facility: redistribution.toFacility._id,
            drugName: redistribution.drug.drugName,
            batchNumber: redistribution.drug.batchNumber,
        }).session(session);

        if (toStock) {
            toStock.currentStock += redistribution.quantity;
            if (toStock.currentStock === 0) {
                toStock.status = "Out of Stock";
            } else if (toStock.currentStock > 0 && toStock.currentStock <= (toStock.reorderLevel || 0)) {
                toStock.status = "Low Stock";
            } else {
                toStock.status = "Adequate";
            }
            await toStock.save({ session });
        } else {
            let initialNewStockStatus;
            const reorderLevelForNew = redistribution.drug.reorderLevel || 10;
            if (redistribution.quantity === 0) {
                initialNewStockStatus = "Out of Stock";
            } else if (redistribution.quantity > 0 && redistribution.quantity <= reorderLevelForNew) {
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
                reorderLevel: reorderLevelForNew,
            }], { session });
            toStock = toStock[0];
        }

        redistribution.status = "completed";
        redistribution.receivedBy = req.user._id;
        redistribution.receivedAt = new Date();
        await redistribution.save({ session });

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

        // Log activity
        await logActivity({
            userId: req.user._id,
            facility: currentUserFacilityObjectId,
            action: "Approved Redistribution",
            module: "Redistribution",
            targetId: redistribution._id,
            message: `${req.user.name} approved redistribution of ${redistribution.quantity} ${redistribution.drug.drugName} from ${redistribution.fromFacility.name} to ${redistribution.toFacility.name}`,
        }, { session });

        // ✨ CORE FIX: Invalidate ALL activity log cache keys for both facilities
        // Invalidate for FROM facility
        const fromFacilityActivityLogWildcardKey = `activityLogs:${redistribution.requestedBy._id}:${getFacilityIdString(redistribution.fromFacility._id)}:*`;
        await deleteCache(fromFacilityActivityLogWildcardKey);
        await deleteCache(generateActivityLogCacheKey(redistribution.requestedBy._id, redistribution.fromFacility._id, {}));
        await deleteCache(generateActivityLogCacheKey(redistribution.requestedBy._id, redistribution.fromFacility._id, { module: 'Redistribution' }));
        await deleteCache(generateActivityLogCacheKey(redistribution.requestedBy._id, redistribution.fromFacility._id, { dateRange: 'today' }));


        // Invalidate for TO facility (current user's)
        const toFacilityActivityLogWildcardKey = `activityLogs:${req.user._id}:${getFacilityIdString(redistribution.toFacility._id)}:*`;
        await deleteCache(toFacilityActivityLogWildcardKey);
        await deleteCache(generateActivityLogCacheKey(req.user._id, redistribution.toFacility._id, {}));
        await deleteCache(generateActivityLogCacheKey(req.user._id, redistribution.toFacility._id, { module: 'Redistribution' }));
        await deleteCache(generateActivityLogCacheKey(req.user._id, redistribution.toFacility._id, { dateRange: 'today' }));


        await createRedistributionNotification(redistribution, "REDISTRIBUTION_APPROVED", { session });

        // Invalidate 'inventory', 'expired', 'nearing', and 'redistribution' caches for BOTH affected facilities
        const reportTypesToInvalidate = ['inventory', 'expired', 'nearing', 'redistribution'];

        // Invalidate caches for the FROM facility (sending)
        for (const reportType of reportTypesToInvalidate) {
            const cacheKey = generateReportCacheKey(reportType, redistribution.requestedBy._id, redistribution.fromFacility._id, { startDate: null, endDate: null });
            await deleteCache(cacheKey);
        }

        // Invalidate caches for the TO facility (receiving - current user's facility)
        for (const reportType of reportTypesToInvalidate) {
            const cacheKey = generateReportCacheKey(reportType, req.user._id, redistribution.toFacility._id, { startDate: null, endDate: null });
            await deleteCache(cacheKey);
        }


        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ message: "Redistribution approved", redistribution });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
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
        message: `${req.user.name} declined redistribution of ${redistribution.quantity} ${redistribution.drug.drugName} to ${redistribution.toFacility.name}`,
    });

    await createRedistributionNotification(redistribution, "REDISTRIBUTION_DECLINED");

    // Invalidate 'redistribution' report cache for the receiving facility (current user's)
    const currentUserRedistributionCacheKey = generateReportCacheKey('redistribution', req.user._id, currentUserFacilityObjectId, { startDate: null, endDate: null });
    await deleteCache(currentUserRedistributionCacheKey);

    // ✨ CORE FIX: Invalidate ALL activity log cache keys for this facility
    const activityLogWildcardKey = `activityLogs:${req.user._id}:${getFacilityIdString(currentUserFacilityObjectId)}:*`;
    await deleteCache(activityLogWildcardKey);
    await deleteCache(generateActivityLogCacheKey(req.user._id, currentUserFacilityObjectId, {})); // Default "all" filter
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
