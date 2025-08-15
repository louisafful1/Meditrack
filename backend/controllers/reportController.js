// backend/controllers/reportController.js

import asyncHandler from 'express-async-handler';
import Inventory from '../models/inventoryModel.js';
import Dispensation from '../models/dispensationModel.js';
import Redistribution from '../models/redistributionModel.js';
import Facility from '../models/facilityModel.js';
import mongoose from 'mongoose';
import { setCache, getCache } from '../utils/cache.js';

// Helper to ensure facility ID is consistently a string for cache keys/comparisons
const getFacilityIdString = (facility) => {
  if (!facility) return 'no-facility';
  if (typeof facility === 'string') return facility;
  if (facility._id) return facility._id.toString();
  if (facility instanceof mongoose.Types.ObjectId) return facility.toString();
  return 'no-facility';
};

// Helper to generate a unique cache key for reports (must match reportController.js logic)
const generateReportCacheKey = (reportType, userId, facilityId, dateRange) => {
  const facilityIdString = getFacilityIdString(facilityId);
  const startDate = dateRange?.startDate || 'no-start';
  const endDate = dateRange?.endDate || 'no-end';
  return `report:${reportType}:${userId}:${facilityIdString}:${startDate}:${endDate}`;
};

// Helper to format date strings
const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-CA', { // YYYY-MM-DD format
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

// @desc    Get various reports based on type and date range
// @route   GET /api/reports/:reportType
// @access  Private
export const getReports = asyncHandler(async (req, res) => {
    const { reportType } = req.params;
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    const facilityId = req.user.facility;
    if (!facilityId) {
        res.status(400);
        throw new Error('User facility not found. Cannot generate report.');
    }

    let facilityObjectId;
    const facilityIdString = getFacilityIdString(facilityId);
    if (!mongoose.Types.ObjectId.isValid(facilityIdString)) {
        res.status(400);
        throw new Error('Invalid facility ID format for user. Cannot generate report.');
    }
    facilityObjectId = new mongoose.Types.ObjectId(facilityIdString);

    const cacheKey = generateReportCacheKey(reportType, userId, facilityObjectId, { startDate, endDate });

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
        return res.status(200).json(cachedData);
    }

    let commonQueryFilters = {};
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        commonQueryFilters.dateRange = { $gte: start, $lte: end };
    }

    let data = [];

    switch (reportType) {
        case 'expired':
            const expiredQuery = {
                facility: facilityObjectId,
                expiryDate: { $lt: new Date() },
                currentStock: { $gt: 0 }
            };
            data = await Inventory.find(expiredQuery)
                .select('drugName currentStock expiryDate')
                .populate('facility', 'name');
            data = data.map(item => ({
                drug: item.drugName,
                quantity: item.currentStock,
                expiryDate: formatDate(item.expiryDate)
            }));
            break;

        case 'nearing':
            const ninetyDaysFromNow = new Date();
            ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
            const nearingQuery = {
                facility: facilityObjectId,
                expiryDate: { $gte: new Date(), $lte: ninetyDaysFromNow },
                currentStock: { $gt: 0 }
            };
            data = await Inventory.find(nearingQuery)
                .select('drugName currentStock expiryDate')
                .populate('facility', 'name');
            data = data.map(item => ({
                drug: item.drugName,
                quantity: item.currentStock,
                expiryDate: formatDate(item.expiryDate)
            }));
            break;

        case 'dispensed':
            let dispensedQuery = { facility: facilityObjectId };
            if (commonQueryFilters.dateRange) {
                dispensedQuery.dateDispensed = commonQueryFilters.dateRange;
            }
            data = await Dispensation.find(dispensedQuery)
                .populate('drug', 'drugName batchNumber')
                .populate('dispensedBy', 'name')
                .select('drug quantityDispensed dispensedTo note dateDispensed');

            data = data.map(item => ({
                drug: item.drug?.drugName || 'N/A',
                batch: item.drug?.batchNumber || 'N/A',
                quantity: item.quantityDispensed,
                date: formatDate(item.dateDispensed),
                patient: item.dispensedTo,
                dispensedBy: item.dispensedBy?.name || 'N/A'
            }));
            break;

        case 'redistribution':
            const facilityMatchQuery = {
                $or: [
                    { fromFacility: facilityObjectId },
                    { toFacility: facilityObjectId }
                ]
            };

            let finalRedistributionQuery;
            if (commonQueryFilters.dateRange) {
                finalRedistributionQuery = {
                    $and: [
                        facilityMatchQuery,
                        { createdAt: commonQueryFilters.dateRange }
                    ]
                };
            } else {
                finalRedistributionQuery = facilityMatchQuery;
            }

            data = await Redistribution.find(finalRedistributionQuery)
                .populate('drug', 'drugName batchNumber') // Explicitly populate drugName and batchNumber
                .populate('fromFacility', 'name')
                .populate('toFacility', 'name')
                .populate('requestedBy', 'name')
                .select('quantity reason expiryDate status createdAt updatedAt declinedAt'); // Select only desired fields from Redistribution model

            // Map the data to flatten populated fields and format dates
            data = data.map(item => ({
                drug: item.drug?.drugName || 'N/A', // Access drugName from populated drug object
                batch: item.drug?.batchNumber || 'N/A', // Access batchNumber from populated drug object
                quantity: item.quantity,
                from: item.fromFacility?.name || 'N/A', // Access name from populated fromFacility object
                to: item.toFacility?.name || 'N/A',     // Access name from populated toFacility object
                reason: item.reason,
                expiryDate: formatDate(item.expiryDate),
                status: item.status,
                requestedBy: item.requestedBy?.name || 'N/A', // Access name from populated requestedBy object
                createdAt: formatDate(item.createdAt),
                updatedAt: formatDate(item.updatedAt),
                declinedAt: formatDate(item.declinedAt)
            }));
            break;

        case 'inventory':
            const inventoryQuery = { facility: facilityObjectId };
            data = await Inventory.find(inventoryQuery)
                .select('drugName currentStock location status expiryDate supplier');
            data = data.map(item => ({
                drug: item.drugName,
                stock: item.currentStock,
                location: item.location,
                status: item.status,
                supplier: item.supplier,
                expiryDate: formatDate(item.expiryDate)
            }));
            break;

        default:
            res.status(400);
            throw new Error('Invalid report type specified');
    }

    await setCache(cacheKey, data);

    res.json(data);
});
