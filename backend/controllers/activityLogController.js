// @desc    Get filtered activity logs

import asyncHandler from "express-async-handler";
import ActivityLog from "../models/activityLogModel.js";

// @route   GET /api/activity-logs?user=...&module=...&from=...&to=...
export const getActivityLogs = asyncHandler(async (req, res) => {
    const { user, module, from, to } = req.query;
  
    let query = {};
  
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
  