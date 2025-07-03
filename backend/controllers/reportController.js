import asyncHandler from 'express-async-handler';
import Inventory from '../models/inventoryModel.js';
import Dispensation from '../models/dispensationModel.js';
import Redistribution from '../models/redistributionModel.js';
import Facility from '../models/facilityModel.js'; 
import mongoose from 'mongoose';

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
    const { startDate, endDate } = req.query; // Date range from frontend
    const facilityId = req.user.facility; // Get facility ID from authenticated user

    let query = { facility: new mongoose.Types.ObjectId(facilityId) };

    // Apply date range filter if provided
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set to end of the day

        // Determine which date field to filter by based on report type
        let dateField;
        if (reportType === 'dispensed') {
            dateField = 'dateDispensed';
        } else if (reportType === 'redistribution') {
            dateField = 'createdAt'; // Or receivedAt/declinedAt if more specific
        } else if (reportType === 'inventory' || reportType === 'expired' || reportType === 'nearing') {
            dateField = 'receivedDate'; // Or createdAt, depending on what 'date' means for inventory reports
        }

        if (dateField) {
            query[dateField] = { $gte: start, $lte: end };
        }
    }

    let data = [];

    switch (reportType) {
        case 'expired':
            // Expired drugs: expiryDate is less than current date
            query.expiryDate = { $lt: new Date() };
            data = await Inventory.find(query)
                .select('drugName currentStock expiryDate')
                .populate('facility', 'name'); // Populate facility name if needed
            data = data.map(item => ({
                drug: item.drugName,
                quantity: item.currentStock,
                expiryDate: formatDate(item.expiryDate)
            }));
            break;

        case 'nearing':
            // Nearing expiry (e.g., within next 90 days)
            const ninetyDaysFromNow = new Date();
            ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
            query.expiryDate = { $gte: new Date(), $lte: ninetyDaysFromNow };
            data = await Inventory.find(query)
                .select('drugName currentStock expiryDate')
                .populate('facility', 'name');
            data = data.map(item => ({
                drug: item.drugName,
                quantity: item.currentStock,
                expiryDate: formatDate(item.expiryDate)
            }));
            break;

        case 'dispensed':
            // Dispensation Summary
            data = await Dispensation.find(query)
                .populate('drug', 'drugName') // Populate drugName from Inventory
                .populate('dispensedBy', 'name') // Populate dispensedBy user name
                .select('drug quantityDispensed dispensedTo note dateDispensed');

            data = data.map(item => ({
                drug: item.drug?.drugName || 'N/A', // Use optional chaining
                quantity: item.quantityDispensed,
                date: formatDate(item.dateDispensed),
                patient: item.dispensedTo, // Assuming dispensedTo is the patient name
                dispensedBy: item.dispensedBy?.name || 'N/A'
            }));
            break;

        case 'redistribution':
            // Redistribution Log
            // Note: For redistribution, we might want to show requests *from* or *to* the facility.
            // For simplicity, let's assume 'fromFacility' for now, or adjust the query to include 'toFacility'
            data = await Redistribution.find({
                $or: [{ fromFacility: facilityId }, { toFacility: facilityId }],
                ...query // Apply date range if present
            })
                .populate('drug', 'drugName')
                .populate('fromFacility', 'name')
                .populate('toFacility', 'name')
                .populate('requestedBy', 'name')
                .select('drug quantity fromFacility toFacility createdAt status');

            data = data.map(item => ({
                drug: item.drug?.drugName || 'N/A',
                qty: item.quantity,
                from: item.fromFacility?.name || 'N/A',
                to: item.toFacility?.name || 'N/A',
                date: formatDate(item.createdAt),
                status: item.status,
                requestedBy: item.requestedBy?.name || 'N/A'
            }));
            break;

        case 'inventory':
            // Inventory Summary (all current inventory items)
            data = await Inventory.find(query)
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

    res.json(data);
});