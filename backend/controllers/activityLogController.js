// @desc    Get filtered activity logs

import asyncHandler from "express-async-handler";
import ActivityLog from "../models/activityLogModel.js";
import mongoose from "mongoose";

// @route   GET /api/activity-logs?user=...&module=...&from=...&to=...
export const getActivityLogs = asyncHandler(async (req, res) => {
    const { user, module, from, to } = req.query;
  
    let query = {};
  if (req.user && req.user.facility) {
          try {
            query.facility = new mongoose.Types.ObjectId(req.user.facility);
        } catch (error) {
            console.error("Invalid Facility ID from user during log retrieval:", req.user.facility, error);
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
      if (to) query.createdAt.$lte = new Date(to);
    }
  
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email role");
  
    res.status(200).json(logs);
  });
  