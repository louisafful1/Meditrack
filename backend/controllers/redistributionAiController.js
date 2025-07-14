import asyncHandler from 'express-async-handler';
import Inventory from '../models/inventoryModel.js';
import Dispensation from '../models/dispensationModel.js';
import Facility from '../models/facilityModel.js';
import mongoose from 'mongoose';
import axios from 'axios';

// Define a configurable threshold for "nearing expiry" in days
const NEARING_EXPIRY_DAYS = 90;
const ADC_PERIOD_DAYS = 60; // Using 60 days for rolling average

// GitHub AI API configuration
const GITHUB_AI_API_URL = 'https://models.github.ai/inference/chat/completions';
const GITHUB_AI_API_KEY = process.env.OPENAI_API_KEY;

// --- Concurrency Control for Backend Endpoint ---
let isGeneratingSuggestions = false;
let lastGenerationTime = 0; 
const MIN_GENERATION_INTERVAL_MS = 1 * 60 * 1000; 

/**
 * Calls the GitHub AI model to get detailed justifications for multiple redistribution suggestions.
 * It sends a single prompt with multiple suggestions and expects a structured JSON response.
 * Implements retry logic with exponential backoff and jitter for rate limit errors.
 * @param {Array<Object>} suggestionPrompts - An array of objects, each containing details for a suggestion.
 * @returns {Promise<Object>} A map where keys are a unique identifier for the suggestion and values are the generated justifications.
 */
async function getLLMJustificationsBatched(suggestionPrompts) {
    if (!GITHUB_AI_API_KEY) {
        console.warn("GITHUB_AI_API_KEY (from OPENAI_API_KEY env var) is not set. Skipping LLM justification.");
        // Return a map with generic reasons for all prompts if API key is missing
        const reasonsMap = {};
        suggestionPrompts.forEach((prompt, index) => {
            reasonsMap[`suggestion_${index}`] = "Automated suggestion based on inventory analysis (API key missing).";
        });
        return reasonsMap;
    }

    if (suggestionPrompts.length === 0) {
        return {}; // No prompts, no justifications needed
    }

    const maxRetries = 5; 
    const initialDelayMs = 1000; 
    const maxDelayMs = 30000; 
    const minGuaranteedDelayMs = 1000; 

    let currentRetry = 0;
    // Each suggestion will have an ID for easy mapping back
    const userMessageContent = `You are an intelligent assistant for a pharmaceutical supply chain. Below are multiple potential drug redistribution suggestions. For each suggestion, provide a concise, professional, and actionable reason. Respond with a JSON array where each object has an 'id' matching the suggestion's 'id' and a 'reason' string.

Examples of desired output format:
[
  { "id": "suggestion_0", "reason": "Redistribute to prevent expiry and meet high demand at target facility." },
  { "id": "suggestion_1", "reason": "Transfer excess stock from overstocked facility to one nearing reorder level." }
]

Here are the suggestions to analyze:
${suggestionPrompts.map((s, index) => `
Suggestion ID: suggestion_${index}
Drug: ${s.drugName} (Batch: ${s.batchNumber})
Source Facility: ${s.fromFacilityName} (Current Stock: ${s.fromStock}, Expires in: ${s.daysUntilExpiry} days)
Target Facility: ${s.toFacilityName} (Current Stock: ${s.toStock}, Reorder Level: ${s.toReorderLevel}, Avg Daily Consumption: ${s.targetADC.toFixed(2)})
Suggested Quantity: ${s.suggestedQuantity}`).join('\n')}
`;

    while (currentRetry < maxRetries) {
        try {
            const response = await axios.post(GITHUB_AI_API_URL, {
                model: "openai/gpt-4.1",
                messages: [
                    {
                        role: "system",
                        content: "You are an intelligent assistant for a pharmaceutical supply chain. Provide concise, professional, and actionable reasons for drug redistribution. Focus on inventory optimization, preventing wastage, and ensuring supply where needed. Respond only with a JSON array of objects, each with an 'id' and 'reason' field. Do not include any other text or formatting outside the JSON."
                    },
                    {
                        role: "user",
                        content: userMessageContent
                    }
                ],
                max_tokens: 1000, 
                temperature: 0.7,
                response_format: { type: "json_object" } 
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GITHUB_AI_API_KEY}`
                }
            });

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const rawContent = response.data.choices[0].message.content.trim();
                try {
                    let jsonString = rawContent;
                    if (rawContent.startsWith('```json')) {
                        jsonString = rawContent.substring(7, rawContent.lastIndexOf('```')).trim();
                    } else if (rawContent.startsWith('```')) { // Generic code block
                        jsonString = rawContent.substring(3, rawContent.lastIndexOf('```')).trim();
                    }

                    const parsedReasons = JSON.parse(jsonString);
                    const reasonsMap = {};
                    if (Array.isArray(parsedReasons)) {
                        parsedReasons.forEach(item => {
                            if (item.id && item.reason) {
                                reasonsMap[item.id] = item.reason;
                            }
                        });
                    }
                    return reasonsMap;
                } catch (parseError) {
                    console.error("Failed to parse LLM JSON response:", parseError, "Raw content:", rawContent);
                    // Fallback to generic reasons if parsing fails
                    const reasonsMap = {};
                    suggestionPrompts.forEach((prompt, index) => {
                        reasonsMap[`suggestion_${index}`] = "Automated suggestion based on inventory analysis (LLM response parsing failed).";
                    });
                    return reasonsMap;
                }
            } else {
                console.warn("LLM response structure unexpected or empty:", response.data);
                const reasonsMap = {};
                suggestionPrompts.forEach((prompt, index) => {
                    reasonsMap[`suggestion_${index}`] = "Automated suggestion based on inventory analysis (LLM response incomplete).";
                });
                return reasonsMap;
            }
        } catch (error) {
            if (error.response && error.response.status === 429) {
                currentRetry++;
                let delayMs = initialDelayMs * Math.pow(2, currentRetry - 1);
                const retryAfterHeader = error.response.headers['retry-after'];
                if (retryAfterHeader) {
                    const parsedRetryAfter = parseInt(retryAfterHeader, 10);
                    if (!isNaN(parsedRetryAfter)) {
                        delayMs = Math.max(delayMs, parsedRetryAfter * 1000);
                    }
                }
                delayMs = Math.max(delayMs, minGuaranteedDelayMs);
                const jitter = Math.random() * 500;
                delayMs = Math.min(maxDelayMs, delayMs + jitter);

                console.warn(`Rate limit hit. Retrying in ${delayMs / 1000} seconds... (Attempt ${currentRetry}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                console.error("Error calling GitHub AI API:", error.response ? error.response.data : error.message);
                const reasonsMap = {};
                suggestionPrompts.forEach((prompt, index) => {
                    reasonsMap[`suggestion_${index}`] = `Automated suggestion based on inventory analysis (LLM error: ${error.response?.status || 'network error'}).`;
                });
                return reasonsMap;
            }
        }
    }

    // This block is reached only if all retries are exhausted
    console.error("Failed to get LLM justifications after all retries due to persistent API issues.");
    const reasonsMap = {};
    suggestionPrompts.forEach((prompt, index) => {
        reasonsMap[`suggestion_${index}`] = "Automated suggestion based on inventory analysis (LLM temporarily unavailable due to high demand).";
    });
    return reasonsMap;
}


/**
 * Calculates the average daily consumption (ADC) for drugs per facility based on recent dispensations.
 * @returns {Promise<Object>} A map where keys are 'facilityId_drugId' and values are ADC.
 */
const calculateADCs = async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - ADC_PERIOD_DAYS); 

    const adcs = await Dispensation.aggregate([
        {
            $match: {
                dateDispensed: { $gte: cutoffDate }
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
                adc: { $divide: ['$totalDispensed', ADC_PERIOD_DAYS] } 
            }
        }
    ]);

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
    // Ensure user is authenticated and has a facility associated
    if (!req.user || !req.user.facility) {
        console.warn("Unauthorized: User not authenticated or facility not found for user.");
        return res.status(401).json({ message: "Unauthorized: User facility information missing." });
    }

    const userFacilityId = req.user.facility; 

    // Basic concurrency control: if a generation is already in progress, return a 429 or wait
    if (isGeneratingSuggestions) {
        console.warn("AI redistribution suggestions generation already in progress. Denying new request.");
        return res.status(429).json({ message: "AI suggestions generation is already running. Please try again shortly." });
    }

    // Optional: Add a cooldown to prevent rapid successive requests even after one finishes
    const now = Date.now();
    if (now - lastGenerationTime < MIN_GENERATION_INTERVAL_MS) {
        console.warn("AI redistribution suggestions requested too soon after last successful generation.");
        return res.status(429).json({ message: `Please wait ${Math.ceil((MIN_GENERATION_INTERVAL_MS - (now - lastGenerationTime)) / 1000)} seconds before requesting new AI suggestions.` });
    }

    isGeneratingSuggestions = true;
    console.log("Starting AI redistribution suggestions generation...");

    try {
        // 1. Calculate Average Daily Consumptions (ADCs) for all facilities/drugs
        const adcMap = await calculateADCs();
        console.log(`Calculated ADCs for ${Object.keys(adcMap).length} drug-facility pairs.`);

        // 2. Find drugs nearing expiry ONLY from the user's facility
        const nearingExpiryDate = new Date();
        nearingExpiryDate.setDate(nearingExpiryDate.getDate() + NEARING_EXPIRY_DAYS);

        const nearingExpiryDrugs = await Inventory.find({
            facility: userFacilityId, 
            expiryDate: { $gt: new Date(), $lte: nearingExpiryDate }, 
            currentStock: { $gt: 0 } 
        })
        .populate('facility', 'name type') 
        .select('drugName currentStock expiryDate facility reorderLevel batchNumber _id');
        console.log(`Found ${nearingExpiryDrugs.length} drugs nearing expiry in user's facility.`);

        // 3. Get all facilities for context (e.g., type, location if available)
        const allFacilities = await Facility.find({ active: true }).select('_id name type');
        console.log(`Found ${allFacilities.length} active facilities.`);

        const potentialSuggestions = [];
        const llmPromptsForBatch = []; 

        // Iterate through nearing expiry drugs from the user's facility to find potential recipients
        for (const sourceDrug of nearingExpiryDrugs) {
            const sourceFacility = sourceDrug.facility; 
            const daysUntilExpiry = Math.ceil((sourceDrug.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            let suggestionsCountForCurrentDrug = 0; 

            for (const targetFacility of allFacilities) {
                // Limit to 3 suggestions per drug
                if (suggestionsCountForCurrentDrug >= 3) {
                    break; // Move to the next source drug
                }

                // Skip the source facility itself (which is now the user's facility)
                if (sourceFacility._id.toString() === targetFacility._id.toString()) {
                    continue;
                }

                // ADC map key is 'facilityId_drugId'
                const targetFacilityADC = adcMap[`${targetFacility._id.toString()}_${sourceDrug._id.toString()}`];

                if (targetFacilityADC && targetFacilityADC > 0) {
                    const targetDrugInventory = await Inventory.findOne({
                        facility: targetFacility._id,
                        drugName: sourceDrug.drugName, // Match by drugName
                    }).select('currentStock reorderLevel');

                    const targetCurrentStock = targetDrugInventory?.currentStock || 0;
                    const targetReorderLevel = targetDrugInventory?.reorderLevel || 0;

                    const projectedDaysSupply = targetFacilityADC > 0 ? (targetCurrentStock / targetFacilityADC) : Infinity;
                    const needsDrug = targetCurrentStock < targetReorderLevel || projectedDaysSupply < 30; 

                    if (needsDrug) {
                        // Suggest a quantity that helps meet their need without overstocking
                        const quantityToSuggestBasedOnNeed = Math.max(0, (targetReorderLevel * 1.5) - targetCurrentStock); 
                        const quantityToSuggestBasedOnADC = Math.ceil(targetFacilityADC * 15); // Suggest 15 days supply

                        const suggestedQuantity = Math.min(
                            sourceDrug.currentStock,
                            Math.max(quantityToSuggestBasedOnNeed, quantityToSuggestBasedOnADC) 
                        );

                        if (suggestedQuantity > 0) {
                            const suggestionId = `suggestion_${potentialSuggestions.length}`; 
                            potentialSuggestions.push({
                                id: suggestionId, 
                                drugId: sourceDrug._id,
                                drugName: sourceDrug.drugName,
                                batchNumber: sourceDrug.batchNumber,
                                fromFacilityId: sourceFacility._id,
                                fromFacilityName: sourceFacility.name,
                                fromStock: sourceDrug.currentStock, 
                                toFacilityId: targetFacility._id,
                                toFacilityName: targetFacility.name,
                                toStock: targetCurrentStock, 
                                toReorderLevel: targetReorderLevel, 
                                targetADC: targetFacilityADC, 
                                suggestedQuantity: suggestedQuantity,
                                daysUntilExpiry: daysUntilExpiry
                            });

                            // Prepare data for the batched LLM prompt
                            llmPromptsForBatch.push({
                                id: suggestionId,
                                drugName: sourceDrug.drugName,
                                batchNumber: sourceDrug.batchNumber,
                                fromFacilityName: sourceFacility.name,
                                fromStock: sourceDrug.currentStock,
                                daysUntilExpiry: daysUntilExpiry,
                                toFacilityName: targetFacility.name,
                                toStock: targetCurrentStock,
                                toReorderLevel: targetReorderLevel,
                                targetADC: targetFacilityADC,
                                suggestedQuantity: suggestedQuantity
                            });
                            suggestionsCountForCurrentDrug++; // Increment counter for this drug
                        }
                    }
                }
            }
        }
        console.log(`Identified ${potentialSuggestions.length} potential redistribution suggestions.`);

        // 4. Get justifications from LLM in a single batched call
        let reasonsMap = {};
        if (llmPromptsForBatch.length > 0) {
            console.log(`Calling LLM for ${llmPromptsForBatch.length} justifications...`);
            reasonsMap = await getLLMJustificationsBatched(llmPromptsForBatch);
            console.log("LLM justifications received.");
        } else {
            console.log("No potential suggestions to get LLM justifications for.");
        }

        // 5. Map reasons back to the suggestions
        const finalSuggestions = potentialSuggestions.map(s => ({
            ...s,
            reason: reasonsMap[s.id] || "Automated suggestion based on inventory analysis (reason not generated).",
            id: undefined // Remove the temporary 'id' used for LLM mapping
        }));

        console.log(`Sending ${finalSuggestions.length} final suggestions to frontend.`);
        res.status(200).json(finalSuggestions);

        lastGenerationTime = now; // Update last successful generation time
    } catch (error) {
        console.error("Error during AI redistribution suggestions generation:", error);
        res.status(500).json({ message: "Failed to generate AI suggestions due to a server error.", error: error.message });
    } finally {
        isGeneratingSuggestions = false; // Reset flag
    }
});
