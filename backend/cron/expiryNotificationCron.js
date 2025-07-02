import cron from "node-cron";
import Inventory from "../models/inventoryModel.js";
import { createExpiryNotification } from "../controllers/notificationController.js";

const setupExpiryNotificationCron = () => {
  // Run daily at 8:00 AM to check for expiring drugs
  cron.schedule("0 8 * * *", async () => {
    console.log("Running daily drug expiry check...");

    try {
      // Get all inventory items
      const inventoryItems = await Inventory.find({
        currentStock: { $gt: 0 }, // Only check items with stock
      }).lean();

      const now = new Date();
      let notificationsCreated = 0;

      for (const item of inventoryItems) {
        const expiryDate = new Date(item.expiryDate);
        const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

        // Create notifications for drugs expiring within 30 days or already expired
        if (daysToExpiry <= 30) {
          await createExpiryNotification(item, daysToExpiry);
          notificationsCreated++;
        }
      }

      console.log(`Drug expiry check completed. Created ${notificationsCreated} notifications.`);
    } catch (error) {
      console.error("Error during drug expiry check:", error);
    }
  });

  console.log("Daily drug expiry notification cron job scheduled for 8:00 AM");
};

// Function to manually trigger expiry check (useful for testing)
const triggerExpiryCheck = async () => {
  console.log("Manually triggering drug expiry check...");

  try {
    const inventoryItems = await Inventory.find({
      currentStock: { $gt: 0 },
    }).lean();

    const now = new Date();
    let notificationsCreated = 0;

    for (const item of inventoryItems) {
      const expiryDate = new Date(item.expiryDate);
      const daysToExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      if (daysToExpiry <= 30) {
        await createExpiryNotification(item, daysToExpiry);
        notificationsCreated++;
      }
    }

    console.log(`Manual expiry check completed. Created ${notificationsCreated} notifications.`);
    return notificationsCreated;
  } catch (error) {
    console.error("Error during manual expiry check:", error);
    throw error;
  }
};

export { setupExpiryNotificationCron, triggerExpiryCheck };
