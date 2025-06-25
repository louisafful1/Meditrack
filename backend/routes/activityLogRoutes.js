import express from 'express';
import { getActivityLogs } from '../controllers/activityLogController.js';
import { protect } from '../middleware/authMiddleware.js';

const activityLogRoutes = express.Router();

activityLogRoutes.get('/', protect, getActivityLogs);

export default activityLogRoutes;