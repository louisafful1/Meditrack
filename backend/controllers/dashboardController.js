// controllers/dashboardController.js
import asyncHandler from 'express-async-handler';
import Inventory from '../models/inventoryModel.js';
import Redistribution from '../models/redistributionModel.js';
import Dispensation from '../models/dispensationModel.js';
import mongoose from 'mongoose';

// @desc    Get dashboard summary stats
// @route   GET /api/dashboard/summary
// @access  Private
export const getDashboardSummary = asyncHandler(async (req, res) => {
    const facilityId = req.user.facility; 

    // 1. Total Drugs
    const totalDrugsCount = await Inventory.countDocuments({ facility: facilityId });

    // 2. Low Stocks (status: "Low Stock" or "Out of stock")
    const lowStocks = await Inventory.countDocuments({
        facility: facilityId,
        status: { $in: ["Low Stock", "Out of Stock"] }
    });

    // 3. Nearing Expiry (within the next 90 days, for example)
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    const nearingExpiryCount = await Inventory.countDocuments({
        facility: facilityId,
        expiryDate: { $lte: ninetyDaysFromNow, $gt: new Date() } // Expiring in next 90 days but not yet expired
    });

    // 4. Total Completed Redistributions (as per your last change)
    const totalRedistributions = await Redistribution.countDocuments({
        $or: [{ fromFacility: facilityId }, { toFacility: facilityId }],
        status: 'completed'
    });


    res.json({
        totalDrugs: totalDrugsCount,
        lowStocks: lowStocks,
        nearingExpiry: nearingExpiryCount,
        redistribution: totalRedistributions // CORRECTED: Using totalRedistributions
    });
});

// @desc    Get monthly drug intake trend
// @route   GET /api/dashboard/monthly-trend
// @access  Private
export const getMonthlyDrugTrend = asyncHandler(async (req, res) => {
    const facilityId = req.user.facility;
    const currentYear = new Date().getFullYear();

    // Assuming 'intake' refers to drugs received into inventory (using receivedDate)
    const monthlyIntake = await Inventory.aggregate([
        {
            $match: {
                facility: new mongoose.Types.ObjectId(facilityId),
                receivedDate: {
                    $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                    $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
                }
            }
        },
        {
            $group: {
                _id: { month: { $month: "$receivedDate" } },
                totalQuantity: { $sum: "$currentStock" } // Sum of stock received in that month
            }
        },
        {
            $sort: { "_id.month": 1 }
        }
    ]);

    // Map month numbers to names and ensure all 12 months are present, even if no data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendData = Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const data = monthlyIntake.find(item => item._id.month === monthNum);
        return {
            name: monthNames[i],
            quantity: data ? data.totalQuantity : 0
        };
    });

    res.json(trendData);
});

// @desc    Get drug expiry overview (Expired, Nearing Expiry, Safe)
// @route   GET /api/dashboard/expiry-overview
// @access  Private
export const getExpiryOverview = asyncHandler(async (req, res) => {
    const facilityId = req.user.facility;
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);

    const expiredCount = await Inventory.countDocuments({
        facility: facilityId,
        expiryDate: { $lt: now } // Expired (less than current date)
    });

    const nearingExpiryCount = await Inventory.countDocuments({
        facility: facilityId,
        expiryDate: { $gte: now, $lte: threeMonthsFromNow } // Nearing expiry (between now and 3 months from now)
    });

    const safeCount = await Inventory.countDocuments({
        facility: facilityId,
        expiryDate: { $gt: threeMonthsFromNow } // Safe (greater than 3 months from now)
    });

    const expiryData = [
        { name: 'Expired', value: expiredCount },
        { name: 'Nearing Expiry', value: nearingExpiryCount },
        { name: 'Safe', value: safeCount },
    ];

    res.json(expiryData);
});

// @desc    Get top 5 most and least dispensed drugs
// @route   GET /api/dashboard/top-dispensed-drugs
// @access  Private
export const getTopDispensedDrugs = asyncHandler(async (req, res) => {
    const facilityId = req.user.facility;

    // Aggregate dispensations to get total quantity per drug
    const aggregatedDispensation = await Dispensation.aggregate([
        { $match: { facility: new mongoose.Types.ObjectId(facilityId) } },
        {
            $group: {
                _id: "$drug",
                totalQuantityDispensed: { $sum: "$quantityDispensed" }
            }
        },
        {
            $lookup: { // Join with Inventory to get drugName
                from: 'inventories', // The collection name is usually lowercase and plural of model name
                localField: '_id',
                foreignField: '_id',
                as: 'drugDetails'
            }
        },
        {
            $unwind: '$drugDetails' // Deconstruct the array created by $lookup
        },
        {
            $project: { // Reshape the output
                _id: 0,
                drugId: '$_id',
                drugName: '$drugDetails.drugName',
                totalQuantityDispensed: 1
            }
        }
    ]);

    // Sort for most dispensed (descending)
    const mostDispensed = aggregatedDispensation
        .sort((a, b) => b.totalQuantityDispensed - a.totalQuantityDispensed)
        .slice(0, 5); // Get top 5

    // Sort for least dispensed (ascending)
    const leastDispensed = aggregatedDispensation
        .sort((a, b) => a.totalQuantityDispensed - b.totalQuantityDispensed)
        .slice(0, 5); // Get top 5

    res.json({
        mostDispensed,
        leastDispensed
    });
});