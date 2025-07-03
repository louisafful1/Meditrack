import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; 
import {
    getDashboardSummary,
    getMonthlyDrugTrend,
    getExpiryOverview,
    getTopDispensedDrugs,
} from '../controllers/dashboardController.js';

const dashboardRoutes = express.Router();

dashboardRoutes.route('/summary').get(protect, getDashboardSummary);
dashboardRoutes.route('/monthly-trend').get(protect, getMonthlyDrugTrend);
dashboardRoutes.route('/expiry-overview').get(protect, getExpiryOverview);
dashboardRoutes.route('/top-dispensed-drugs').get(protect, getTopDispensedDrugs);

export default dashboardRoutes;