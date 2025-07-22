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

        if (daysToExpiry <= 90) {
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
        } else if (inventoryItem.currentStock <= 10) {
            type = "LOW_STOCK";
            title = "Low Stock Alert";
            priority = "HIGH";
        } else {
            return;
        }

        const message = inventoryItem.currentStock === 0
            ? `${inventoryItem.drugName} (Batch: ${inventoryItem.batchNumber}) is out of stock`
            : `${inventoryItem.drugName} (Batch: ${inventoryItem.batchNumber}) has low stock: ${inventoryItem.currentStock} units remaining`;

        const existingNotification = await Notification.findOne({
            drugId: inventoryItem._id,
            type: type,
            createdAt: {
                $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
        });

        if (existingNotification) {
            return;
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

        const populatedNotification = await Notification.findById(notification._id)
            .populate("facility", "name location")
            .populate("drugId", "drugName batchNumber currentStock expiryDate")
            .populate("userId", "name email");

        emitNotificationToFacility(inventoryItem.facility, populatedNotification);

        if (populatedNotification.userId) {
            emitNotificationToUser(populatedNotification.userId, populatedNotification);
        }

    } catch (error) {
        console.error("Error creating stock level notification:", error);
    }
};

// Utility function to create redistribution-related notifications
const createRedistributionNotification = async (redistribution, notificationType) => {
    try {
        const Notification = (await import("../models/notificationModel.js")).default;

        let title, message, priority;
        let targetFacilityId, targetUserId;

        // Ensure redistribution object has populated fields for names
        const fromFacilityName = redistribution.fromFacility?.name || 'N/A';
        const toFacilityName = redistribution.toFacility?.name || 'N/A';
        const drugName = redistribution.drug?.drugName || 'N/A';
        const requestedByName = redistribution.requestedBy?.name || 'N/A';
        const receivedByOrDeclinedByName = redistribution.receivedBy?.name || redistribution.declinedBy?.name || 'N/A';

        switch (notificationType) {
            case "REDISTRIBUTION_CREATED":
                title = "New Redistribution Request";
                message = `New request for ${redistribution.quantity} units of ${drugName} from ${fromFacilityName}.`;
                priority = "MEDIUM";
                targetFacilityId = redistribution.toFacility._id;
                targetUserId = null;
                break;
            case "REDISTRIBUTION_APPROVED":
                title = "Redistribution Request Approved";
                message = `Your request for ${redistribution.quantity} units of ${drugName} from ${fromFacilityName} to ${toFacilityName} has been APPROVED by ${receivedByOrDeclinedByName}.`;
                priority = "HIGH";
                targetFacilityId = redistribution.fromFacility._id;
                targetUserId = redistribution.requestedBy._id;
                break;
            case "REDISTRIBUTION_DECLINED":
                title = "Redistribution Request Declined";
                message = `Your request for ${redistribution.quantity} units of ${drugName} from ${fromFacilityName} to ${toFacilityName} has been DECLINED by ${receivedByOrDeclinedByName}.`;
                priority = "HIGH";
                targetFacilityId = redistribution.fromFacility._id;
                targetUserId = redistribution.requestedBy._id;
                break;
            case "REDISTRIBUTION_COMPLETED":
                title = "Redistribution Completed";
                message = `${redistribution.quantity} units of ${drugName} successfully received.`;
                priority = "MEDIUM";
                targetFacilityId = redistribution.fromFacility._id;
                targetUserId = null;
                break;
            default:
                console.warn(`Unknown redistribution notification type: ${notificationType}`);
                return;
        }

        const existingNotification = await Notification.findOne({
            redistributionId: redistribution._id,
            type: notificationType,
            createdAt: {
                $gte: new Date(Date.now() - 60 * 60 * 1000),
            },
        });

        if (existingNotification) {
            return;
        }

        const notification = new Notification({
            type: notificationType,
            title,
            message,
            redistributionId: redistribution._id,
            drugId: redistribution.drug._id,
            drugName: redistribution.drug.drugName,
            batchNumber: redistribution.drug.batchNumber,
            expiryDate: redistribution.expiryDate,
            facility: targetFacilityId,
            userId: targetUserId,
            priority,
            metadata: {
                redistributionQuantity: redistribution.quantity, 
                status: redistribution.status,
            },
        });

        await notification.save();

        const populatedNotification = await Notification.findById(notification._id)
            .populate("facility", "name location")
            .populate("drugId", "drugName batchNumber currentStock expiryDate")
            .populate("userId", "name email")
            .populate({
                path: 'redistributionId',
                populate: [
                    { path: 'fromFacility', select: 'name' },
                    { path: 'toFacility', select: 'name' }
                ]
            });

        if (populatedNotification.facility) {
            emitNotificationToFacility(populatedNotification.facility, populatedNotification);
        }

        if (populatedNotification.userId) {
            emitNotificationToUser(populatedNotification.userId, populatedNotification);
        }

    } catch (error) {
        console.error(`Error creating redistribution notification (${notificationType}):`, error);
    }
};


export {
    checkAndCreateExpiryNotification,
    checkStockLevelNotification,
    createRedistributionNotification
};
