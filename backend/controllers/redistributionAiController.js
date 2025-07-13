import asyncHandler from 'express-async-handler';
import Inventory from '../models/inventoryModel.js';
import Dispensation from '../models/dispensationModel.js';
import Facility from '../models/facilityModel.js';
import mongoose from 'mongoose';
import axios from 'axios'; // Import axios for making HTTP requests

// Define a configurable threshold for "nearing expiry" in days
const NEARING_EXPIRY_DAYS = 90;
// Define the historical period for calculating Average Daily Consumption (ADC) in days
const ADC_PERIOD_DAYS = 60; // Using 60 days for rolling average

// GitHub AI API configuration
const GITHUB_AI_API_URL = 'https://models.github.ai/inference/chat/completions';
// IMPORTANT: Ensure your .env file has OPENAI_API_KEY set to your ghp_... GitHub token
const GITHUB_AI_API_KEY = process.env.OPENAI_API_KEY; 

/**
 * Calls the GitHub AI model to get a detailed justification for a redistribution suggestion.
 * @param {string} prompt - The prompt to send to the LLM.
 * @returns {Promise<string>} The generated justification text.
 */
async function getLLMJustification(prompt) {
    if (!GITHUB_AI_API_KEY) {
        console.warn("GITHUB_AI_API_KEY (from OPENAI_API_KEY env var) is not set. Skipping LLM justification.");
        return "Automated suggestion based on inventory analysis.";
    }

    try {
        const response = await axios.post(GITHUB_AI_API_URL, {
            model: "openai/gpt-4.1", // As specified in your GitHub AI example
            messages: [
                {
                    role: "system",
                    content: "You are an intelligent assistant for a pharmaceutical supply chain. Provide concise, professional, and actionable reasons for drug redistribution. Focus on inventory optimization, preventing wastage, and ensuring supply where needed."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 150, // Limit the length of the response
            temperature: 0.7, // Creativity level
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GITHUB_AI_API_KEY}` // Use Bearer token for GitHub PAT
            }
        });

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            return response.data.choices[0].message.content.trim();
        } else {
            console.warn("LLM response structure unexpected:", response.data);
            return "Automated suggestion based on inventory analysis (LLM response incomplete).";
        }
    } catch (error) {
        console.error("Error calling GitHub AI API:", error.response ? error.response.data : error.message);
        return `Automated suggestion based on inventory analysis (LLM error: ${error.response?.status || 'network error'}).`;
    }
}


/**
 * Calculates the average daily consumption (ADC) for drugs per facility based on recent dispensations.
 * @returns {Promise<Object>} A map where keys are 'facilityId_drugId' and values are ADC.
 */
const calculateADCs = async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ADC_PERIOD_DAYS); // Data from last ADC_PERIOD_DAYS

    const adcs = await Dispensation.aggregate([
        {
            $match: {
                dateDispensed: { $gte: cutoffDate } // Filter for the historical period
            }
        },
        {
            $group: {
                _id: {
                    drug: '$drug',
                    facility: '$facility'
                },
                totalDispensed: { $sum: '$quantityDispensed' }
            }
        },
        {
            $project: {
                _id: 0,
                drug: '$_id.drug',
                facility: '$_id.facility',
                adc: { $divide: ['$totalDispensed', ADC_PERIOD_DAYS] } // Divide by the number of days
            }
        }
    ]);

    // Convert array of objects to a map for easier lookup: 'facilityId_drugId' -> adcValue
    const adcMap = {};
    adcs.forEach(item => {
        adcMap[`${item.facility.toString()}_${item.drug.toString()}`] = item.adc;
    });

    return adcMap;
};

// @desc    Get AI-powered redistribution suggestions
// @route   GET /api/ai/redistribution-suggestions
// @access  Private (e.g., requires admin or supervisor role)
export const getAiRedistributionSuggestions = asyncHandler(async (req, res) => {
    // 1. Calculate Average Daily Consumptions (ADCs) for all facilities/drugs
    const adcMap = await calculateADCs();

    // 2. Find drugs nearing expiry across all facilities
    const nearingExpiryDate = new Date();
    nearingExpiryDate.setDate(nearingExpiryDate.getDate() + NEARING_EXPIRY_DAYS);

    const nearingExpiryDrugs = await Inventory.find({
        expiryDate: { $gt: new Date(), $lte: nearingExpiryDate }, // Expiring soon
        currentStock: { $gt: 0 } // Must have stock to redistribute
    })
    .populate('facility', 'name type') // Populate facility details for type learning
    .select('drugName currentStock expiryDate facility reorderLevel batchNumber _id'); // Added _id to select

    // 3. Get all facilities for context (e.g., type, location if available)
    const allFacilities = await Facility.find({ active: true }).select('_id name type');

    const suggestions = [];

    // Iterate through nearing expiry drugs to find potential recipients
    for (const sourceDrug of nearingExpiryDrugs) {
        const sourceFacility = sourceDrug.facility; // This is the populated facility object

        const daysUntilExpiry = Math.ceil((sourceDrug.expiryDate - new Date()) / (1000 * 60 * 60 * 24));

        // Find potential recipient facilities for this drug
        for (const targetFacility of allFacilities) {
            // Skip the source facility itself
            if (sourceFacility._id.toString() === targetFacility._id.toString()) {
                continue;
            }

            // Check if the target facility has a historical ADC for this drug
            const targetFacilityADC = adcMap[`${targetFacility._id.toString()}_${sourceDrug._id.toString()}`];

            // Only consider facilities that actually consume this drug (ADC > 0)
            if (targetFacilityADC && targetFacilityADC > 0) {
                // Fetch target facility's current stock of this specific drug
                const targetDrugInventory = await Inventory.findOne({
                    facility: targetFacility._id,
                    drugName: sourceDrug.drugName, // Match by drugName for simplicity, or drugId if consistent
                    // Consider matching by batchNumber if unique stock items are important for target
                }).select('currentStock reorderLevel');

                const targetCurrentStock = targetDrugInventory?.currentStock || 0;
                const targetReorderLevel = targetDrugInventory?.reorderLevel || 0;

                // Determine if target facility 'needs' the drug based on its stock vs. ADC/reorder level
                const projectedDaysSupply = targetFacilityADC > 0 ? (targetCurrentStock / targetFacilityADC) : Infinity;
                const needsDrug = targetCurrentStock < targetReorderLevel || projectedDaysSupply < 30; // Needs if below reorder or less than 30 days supply

                if (needsDrug) {
                    // Suggest a quantity that helps meet their need without overstocking
                    const quantityToSuggestBasedOnNeed = Math.max(0, (targetReorderLevel * 1.5) - targetCurrentStock); // Aim for 1.5x reorder level
                    const quantityToSuggestBasedOnADC = Math.ceil(targetFacilityADC * 15); // Suggest 15 days supply

                    const suggestedQuantity = Math.min(
                        sourceDrug.currentStock,
                        Math.max(quantityToSuggestBasedOnNeed, quantityToSuggestBasedOnADC) // Take the higher of the two need calculations
                    );

                    if (suggestedQuantity > 0) {
                        // Construct a detailed prompt for the LLM
                        const llmPrompt = `Drug: ${sourceDrug.drugName} (Batch: ${sourceDrug.batchNumber}).
                        Source Facility: ${sourceFacility.name} (Current Stock: ${sourceDrug.currentStock}, Expires in: ${daysUntilExpiry} days).
                        Target Facility: ${targetFacility.name} (Current Stock: ${targetCurrentStock}, Reorder Level: ${targetReorderLevel}, Avg Daily Consumption: ${targetFacilityADC.toFixed(2)}).
                        Suggested Quantity: ${suggestedQuantity}.
                        Generate a concise reason for this redistribution, focusing on preventing expiry and meeting target facility's need.`;

                        const reason = await getLLMJustification(llmPrompt);

                        suggestions.push({
                            drugId: sourceDrug._id,
                            drugName: sourceDrug.drugName,
                            batchNumber: sourceDrug.batchNumber,
                            fromFacilityId: sourceFacility._id,
                            fromFacilityName: sourceFacility.name,
                            toFacilityId: targetFacility._id,
                            toFacilityName: targetFacility.name,
                            suggestedQuantity: suggestedQuantity,
                            reason: reason, // Use the LLM-generated reason
                            daysUntilExpiry: daysUntilExpiry // Pass this for frontend display
                        });
                    }
                }
            }
        }
    }

    res.status(200).json(suggestions);
});
