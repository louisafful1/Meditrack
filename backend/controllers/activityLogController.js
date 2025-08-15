// @desc    Get filtered activity logs

import asyncHandler from "express-async-handler";
import ActivityLog from "../models/activityLogModel.js";
import mongoose from "mongoose";
import { setCache, getCache, deleteCache } from '../utils/cache.js'; // Import cache utilities

// Helper to generate a unique cache key for activity logs based on user/facility and filters
const generateActivityLogCacheKey = (userId, facilityId, filters) => {
    const facilityIdString = facilityId ? (facilityId._id ? facilityId._id.toString() : facilityId.toString()) : 'no-facility';
    const userFilter = filters.user || 'all-users';
    const moduleFilter = filters.module || 'all-modules';
    const fromDate = filters.from || 'no-start-date';
    const toDate = filters.to || 'no-end-date';
    return `activityLogs:${userId}:${facilityIdString}:${userFilter}:${moduleFilter}:${fromDate}:${toDate}`;
};

// @route   GET /api/activity-logs?user=...&module=...&from=...&to=...
export const getActivityLogs = asyncHandler(async (req, res) => {
    const { user, module, from, to } = req.query;
    const currentUserId = req.user._id; // Get current user ID for cache key

    let query = {};
    let facilityObjectId;

    if (req.user && req.user.facility) {
        try {
            // Ensure facility ID from req.user is converted to ObjectId string consistently
            const userFacilityIdString = req.user.facility._id ? req.user.facility._id.toString() : req.user.facility.toString();
            if (!mongoose.Types.ObjectId.isValid(userFacilityIdString)) {
                return res.status(400).json({ message: "Invalid user facility ID provided." });
            }
            facilityObjectId = new mongoose.Types.ObjectId(userFacilityIdString);
            query.facility = facilityObjectId;
        } catch (error) {
            return res.status(400).json({ message: "Invalid user facility ID provided." });
        }
    } else {
        console.warn("Unauthorized: User not authenticated or facility not found for user when trying to access activity logs.");
        return res.status(401).json({ message: "Unauthorized: User facility information missing." });
    }

    if (user) query.user = user;
    if (module) query.module = module;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) {
          const endDate = new Date(to);
          endDate.setHours(23, 59, 59, 999); // Set to end of day for inclusive range
          query.createdAt.$lte = endDate;
      }
    }
  
    // Generate cache key for THIS specific request's filters
    const cacheKey = generateActivityLogCacheKey(currentUserId, facilityObjectId, req.query);

    // Try to get data from cache
    const cachedLogs = await getCache(cacheKey);
    if (cachedLogs) {
        return res.status(200).json(cachedLogs);
    }

    // If not in cache, fetch from DB
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email role"); // Ensure 'user' is populated if you display user.name

    // Cache the fetched data before sending the response
    await setCache(cacheKey, logs);
  
    res.status(200).json(logs);
});
