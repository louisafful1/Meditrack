import Notification from "../models/notificationModel.js";
import Inventory from "../models/inventoryModel.js";
import Facility from "../models/facilityModel.js";
import User from "../models/userModels.js";
import { triggerExpiryCheck } from "../cron/expiryNotificationCron.js";
import { emitNotificationToFacility, emitNotificationToUser } from "../config/socketConfig.js";
import asyncHandler from "express-async-handler";
import mongoose from "mongoose";

// @desc    Get notifications for a facility or user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const { facilityId, userId, isRead, type, limit = 50, page = 1 } = req.query;

  let filter = {};

  if (facilityId) {
    filter.facility = facilityId;
  }

  if (userId) {
    filter.userId = userId;
  }

  if (isRead !== undefined) {
    filter.isRead = isRead === "true";
  }

  if (type) {
    filter.type = type;
  }

  const skip = (page - 1) * limit;

  const notifications = await Notification.find(filter)
    .populate("facility", "name location")
    .populate("drugId", "drugName batchNumber currentStock expiryDate")
    .populate("userId", "name email")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

  const total = await Notification.countDocuments(filter);

  res.json({
    notifications,
    pagination: {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
    },
  });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  notification.isRead = true;
  await notification.save();

  res.json({ message: "Notification marked as read" });
});

// @desc    Mark all notifications as read for a facility/user
// @route   PUT /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  const { facilityId, userId } = req.body;

  let filter = {};
  if (facilityId) filter.facility = facilityId;
  if (userId) filter.userId = userId;

  await Notification.updateMany(filter, { isRead: true });

  res.json({ message: "All notifications marked as read" });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  await notification.deleteOne();
  res.json({ message: "Notification deleted" });
});

// @desc    Get notification count for dashboard
// @route   GET /api/notifications/count
// @access  Private
const getNotificationCount = asyncHandler(async (req, res) => {
  const { facilityId, userId } = req.query;

  let filter = { isRead: false };
  if (facilityId) filter.facility = facilityId;
  if (userId) filter.userId = userId;

  const counts = await Notification.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        priority: { $first: "$priority" },
      },
    },
  ]);

  const total = await Notification.countDocuments(filter);

  res.json({
    total,
    byType: counts,
  });
});

// @desc    Create expiry notification
// @route   POST /api/notifications/expiry
// @access  Private (Internal use)
const createExpiryNotification = async (inventoryItem, daysToExpiry) => {
  try {
    let type, title, priority;

    if (daysToExpiry <= 0) {
      type = "DRUG_EXPIRED";
      title = "Drug Expired";
      priority = "CRITICAL";
    } else if (daysToExpiry <= 7) {
      type = "DRUG_EXPIRING";
      title = "Drug Expiring Soon";
      priority = "HIGH";
    } else if (daysToExpiry <= 30) {
      type = "DRUG_EXPIRING";
      title = "Drug Expiring in 30 Days";
      priority = "MEDIUM";
    }else if (daysToExpiry <= 90) {
      type = "DRUG_EXPIRING";
      title = "Drug Expiring in 3 Months";
      priority = "LOW";
    } else {
      return; // Don't create notification for drugs expiring in more than 30 days
    }

    const message = daysToExpiry <= 0
      ? `${inventoryItem.drugName} (Batch: ${inventoryItem.batchNumber}) has expired. Current stock: ${inventoryItem.currentStock}`
      : `${inventoryItem.drugName} (Batch: ${inventoryItem.batchNumber}) expires in ${daysToExpiry} days. Current stock: ${inventoryItem.currentStock}`;

    // Check if notification already exists for this drug batch
    const existingNotification = await Notification.findOne({
      drugId: inventoryItem._id,
      type: type,
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
      },
    });

    if (existingNotification) {
      return; // Don't create duplicate notifications
    }

    const notification = new Notification({
      type,
      title,
      message,
      drugId: inventoryItem._id,
      drugName: inventoryItem.drugName,
      batchNumber: inventoryItem.batchNumber,
      expiryDate: inventoryItem.expiryDate,
      facility: inventoryItem.facility,
      priority,
      metadata: {
        daysToExpiry,
        currentStock: inventoryItem.currentStock,
      },
    });

    await notification.save();
    
    // Populate the notification for real-time emission
    const populatedNotification = await Notification.findById(notification._id)
      .populate("facility", "name location")
      .populate("drugId", "drugName batchNumber currentStock expiryDate")
      .populate("userId", "name email");

    // Emit real-time notification to facility
    emitNotificationToFacility(inventoryItem.facility, populatedNotification);

    // If there's a specific user, emit to them as well
    if (populatedNotification.userId) {
      emitNotificationToUser(populatedNotification.userId, populatedNotification);
    }

    console.log(`Expiry notification created for ${inventoryItem.drugName}`);
  } catch (error) {
    console.error("Error creating expiry notification:", error);
  }
};

// @desc    Manually trigger expiry check (for testing)
// @route   POST /api/notifications/trigger-expiry-check
// @access  Private
const manualExpiryCheck = asyncHandler(async (req, res) => {
  try {
    const notificationsCreated = await triggerExpiryCheck();
    res.json({
      message: "Expiry check completed",
      notificationsCreated,
    });
  } catch (error) {
    res.status(500);
    throw new Error("Error triggering expiry check");
  }
});

// @desc    Create a test notification (for testing WebSocket)
// @route   POST /api/notifications/test
// @access  Private
const createTestNotification = asyncHandler(async (req, res) => {
  try {
    const { title, message, type = "LOW_STOCK", priority = "MEDIUM" } = req.body;
    
    // Get user's facility - assume they have one for testing
    const user = await User.findById(req.user._id).populate('facility');
    if (!user || !user.facility) {
      res.status(400);
      throw new Error("User must be associated with a facility");
    }

    // Create a test notification
    const notification = new Notification({
      type,
      title: title || "Test Notification",
      message: message || "This is a test notification",
      // We'll create without a specific drug for testing - use a dummy ObjectId
      drugId: new mongoose.Types.ObjectId(),
      drugName: "Test Drug",
      batchNumber: "TEST-001",
      facility: user.facility._id,
      userId: req.user._id,
      priority,
      metadata: {
        test: true,
        createdBy: req.user._id
      },
    });

    await notification.save();
    
    // Populate the notification for real-time emission
    const populatedNotification = await Notification.findById(notification._id)
      .populate("facility", "name location")
      .populate("userId", "name email");

    // Emit real-time notification to facility
    emitNotificationToFacility(user.facility._id, populatedNotification);

    // Emit to the specific user as well
    emitNotificationToUser(req.user._id, populatedNotification);

    res.status(201).json({
      message: "Test notification created successfully",
      notification: populatedNotification
    });
  } catch (error) {
    res.status(500);
    throw new Error("Error creating test notification");
  }
});

export {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationCount,
  createExpiryNotification,
  manualExpiryCheck,
  createTestNotification,
};