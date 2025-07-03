import { createExpiryNotification } from "../controllers/notificationController.js";
import { emitNotificationToFacility, emitNotificationToUser } from "../config/socketConfig.js";

// Utility function to check if a drug needs expiry notification
const checkAndCreateExpiryNotification = async (inventoryItem) => {
  try {
    if (inventoryItem.currentStock <= 0) {
      return; // Don't create notifications for out-of-stock items
    }

    const now = new Date();
    const expiryDate = new Date(inventoryItem.expiryDate);
    const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    // Create notification if drug expires within 30 days or has expired
    if (daysToExpiry <= 30) {
      await createExpiryNotification(inventoryItem, daysToExpiry);
    }
  } catch (error) {
    console.error("Error checking expiry notification:", error);
  }
};

// Utility function to check stock level and create low stock notifications
const checkStockLevelNotification = async (inventoryItem) => {
  try {
    const Notification = (await import("../models/notificationModel.js")).default;
    
    let type, title, priority;
    
    if (inventoryItem.currentStock === 0) {
      type = "OUT_OF_STOCK";
      title = "Drug Out of Stock";
      priority = "CRITICAL";
    } else if (inventoryItem.currentStock <= 10) { // Configurable threshold
      type = "LOW_STOCK";
      title = "Low Stock Alert";
      priority = "HIGH";
    } else {
      return; // Stock level is adequate
    }

    const message = inventoryItem.currentStock === 0
      ? `${inventoryItem.drugName} (Batch: ${inventoryItem.batchNumber}) is out of stock`
      : `${inventoryItem.drugName} (Batch: ${inventoryItem.batchNumber}) has low stock: ${inventoryItem.currentStock} units remaining`;

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

    console.log(`Stock level notification created for ${inventoryItem.drugName}`);
  } catch (error) {
    console.error("Error creating stock level notification:", error);
  }
};

export { checkAndCreateExpiryNotification, checkStockLevelNotification };
