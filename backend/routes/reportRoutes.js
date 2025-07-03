// routes/reportRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Assuming these exist
import { getReports } from '../controllers/reportController.js';

const reportRoutes = express.Router();

// Route for getting all types of reports
reportRoutes.route('/:reportType').get(protect, getReports);

export default reportRoutes;