import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationCount,
  manualExpiryCheck,
  createTestNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route("/").get(getNotifications);
router.route("/count").get(getNotificationCount);
router.route("/mark-all-read").put(markAllAsRead);
router.route("/trigger-expiry-check").post(manualExpiryCheck);
router.route("/test").post(createTestNotification);
router.route("/:id/read").put(markAsRead);
router.route("/:id").delete(deleteNotification);

export default router;
