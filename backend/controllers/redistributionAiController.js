import asyncHandler from 'express-async-handler';
import Inventory from '../models/inventoryModel.js';
import Dispensation from '../models/dispensationModel.js';
import Facility from '../models/facilityModel.js';
import mongoose from 'mongoose';
import axios from 'axios';

const NEARING_EXPIRY_DAYS = 90;
const ADC_PERIOD_DAYS = 60;

const GITHUB_AI_API_URL = 'https://models.github.ai/inference/chat/completions';
const GITHUB_AI_API_KEY = process.env.OPENAI_API_KEY;

let isGeneratingSuggestions = false;
let lastGenerationTime = 0;
const MIN_GENERATION_INTERVAL_MS = 1 * 60 * 1000;

async function getLLMJustificationsBatched(suggestionPrompts) {
  if (!GITHUB_AI_API_KEY) {
    console.warn("GITHUB_AI_API_KEY (from OPENAI_API_KEY env var) is not set. Skipping LLM justification.");
    const reasonsMap = {};
    suggestionPrompts.forEach((prompt, index) => {
      reasonsMap[`suggestion_${index}`] = "Automated suggestion based on inventory analysis (API key missing).";
    });
    return reasonsMap;
  }

  if (suggestionPrompts.length === 0) {
    return {};
  }

  const maxRetries = 5;
  const initialDelayMs = 1000;
  const maxDelayMs = 30000;
  const minGuaranteedDelayMs = 1000;

  let currentRetry = 0;

  const userMessageContent = `You are an expert pharmaceutical supply chain manager providing practical and relatable advice on drug redistribution. Below are multiple potential drug redistribution suggestions. For each suggestion, provide a concise, professional, and actionable reason that sounds human and focuses on real-world impact like patient care, cost savings, and preventing waste. Respond with a JSON object where each key is the suggestion's 'id' and the value is an object containing the 'id' and 'reason' string.
  - IMPORTANT: When mentioning facility names after prepositions (like 'to', 'from', 'at'), always ensure there is a single space between the preposition and the facility name (e.g., "to [Facility Name]", not "to[Facility Name]"). Ensure readability and proper sentence structure.

Examples of desired output format:
{
  "suggestion_0": { "id": "suggestion_0", "reason": "Transferring this Paracetamol from [Source Facility Name] to [Target Facility Name] is crucial. It prevents the drug from expiring unused at your facility while ensuring [Target Facility Name] has enough to treat their patients, as they are currently low on stock." },
  "suggestion_1": { "id": "suggestion_1", "reason": "Moving this Acetylcysteine Injection from your facility to [Target Facility Name] makes sense because your current stock is high and nearing expiry. [Target Facility Name] needs it to avoid a potential stockout, ensuring continuous patient care." }
}

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
            content: "You are an expert pharmaceutical supply chain manager providing practical and relatable advice on drug redistribution. Your goal is to explain *why* a transfer is beneficial, focusing on real-world impact like patient care, cost savings, and preventing waste. Make your reasons sound human, actionable, and easy to understand for facility managers. Respond only with a JSON object, where each key is a suggestion ID and the value is an object containing 'id' and 'reason' fields. Do not include any other text or formatting outside the JSON."
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
        console.log("DEBUG LLM: Raw LLM response content:", rawContent);
        try {
          let jsonString = rawContent;
          if (rawContent.startsWith('```json')) {
            jsonString = rawContent.substring(7, rawContent.lastIndexOf('```')).trim();
          } else if (rawContent.startsWith('```')) {
            jsonString = rawContent.substring(3, rawContent.lastIndexOf('```')).trim();
          }

          const parsedReasons = JSON.parse(jsonString);
          console.log("DEBUG LLM: Parsed LLM response JSON:", parsedReasons);
          const reasonsMap = {};
          for (const key in parsedReasons) {
            if (parsedReasons.hasOwnProperty(key)) {
              const item = parsedReasons[key];
              if (item && item.reason) {
                reasonsMap[key] = item.reason;
              }
            }
          }
          console.log("DEBUG LLM: Final reasonsMap:", reasonsMap);
          return reasonsMap;
        } catch (parseError) {
          console.error("Failed to parse LLM JSON response:", parseError, "Raw content:", rawContent);
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

  console.error("Failed to get LLM justifications after all retries due to persistent API issues.");
  const reasonsMap = {};
  suggestionPrompts.forEach((prompt, index) => {
    reasonsMap[`suggestion_${index}`] = "Automated suggestion based on inventory analysis (LLM temporarily unavailable due to high demand).";
  });
  return reasonsMap;
}

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

export const getAiRedistributionSuggestions = asyncHandler(async (req, res) => {
  if (!req.user || !req.user.facility) {
    console.warn("Unauthorized: User not authenticated or facility not found for user.");
    return res.status(401).json({ message: "Unauthorized: User facility information missing." });
  }

  const userFacilityId = req.user.facility;

  if (isGeneratingSuggestions) {
    console.warn("AI redistribution suggestions generation already in progress. Denying new request.");
    return res.status(429).json({ message: "AI suggestions generation is already running. Please try again shortly." });
  }

  const now = Date.now();
  if (now - lastGenerationTime < MIN_GENERATION_INTERVAL_MS) {
    console.warn("AI redistribution suggestions requested too soon after last successful generation.");
    return res.status(429).json({ message: `Please wait ${Math.ceil((MIN_GENERATION_INTERVAL_MS - (now - lastGenerationTime)) / 1000)} seconds before requesting new AI suggestions.` });
  }

  isGeneratingSuggestions = true;
  console.log("Starting AI redistribution suggestions generation...");

  try {
    const adcMap = await calculateADCs();
    console.log(`Calculated ADCs for ${Object.keys(adcMap).length} drug-facility pairs.`);

    const userFacilityInventory = await Inventory.find({
      facility: userFacilityId,
      currentStock: { $gt: 0 }
    })
      .populate('facility', 'name type')
      .select('drugName currentStock expiryDate facility reorderLevel batchNumber _id');
    console.log(`Found ${userFacilityInventory.length} inventory items in user's facility.`);

    const nearingExpiryDrugs = [];
    const nearingExpiryDate = new Date();
    nearingExpiryDate.setDate(nearingExpiryDate.getDate() + NEARING_EXPIRY_DAYS);

    for (const item of userFacilityInventory) {
      if (item.expiryDate > new Date() && item.expiryDate <= nearingExpiryDate) {
        const sourceFacilityADC = adcMap[`${item.facility._id.toString()}_${item._id.toString()}`] || 0;

        const daysUntilExpiry = Math.ceil((item.expiryDate - new Date()) / (1000 * 60 * 60 * 24));

        const sourceConsumableBeforeExpiry = sourceFacilityADC * daysUntilExpiry;

        if (item.currentStock > sourceConsumableBeforeExpiry) {
          nearingExpiryDrugs.push(item);
        }
      }
    }
    console.log(`Filtered down to ${nearingExpiryDrugs.length} drugs truly in surplus and nearing expiry in user's facility.`);

    const allFacilities = await Facility.find({ active: true }).select('_id name type');
    console.log(`Found ${allFacilities.length} active facilities.`);

    const potentialSuggestions = [];
    const llmPromptsForBatch = [];

    for (const sourceDrug of nearingExpiryDrugs) {
      const sourceFacility = sourceDrug.facility;
      const daysUntilExpiry = Math.ceil((sourceDrug.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
      let suggestionsCountForCurrentDrug = 0;

      for (const targetFacility of allFacilities) {
        if (suggestionsCountForCurrentDrug >= 3) {
          break;
        }

        if (sourceFacility._id.toString() === targetFacility._id.toString()) {
          continue;
        }

        const targetFacilityADC = adcMap[`${targetFacility._id.toString()}_${sourceDrug._id.toString()}`];

        if (targetFacilityADC && targetFacilityADC > 0) {
          const targetDrugInventory = await Inventory.findOne({
            facility: targetFacility._id,
            drugName: sourceDrug.drugName,
          }).select('currentStock reorderLevel');

          const targetCurrentStock = targetDrugInventory?.currentStock || 0;
          const targetReorderLevel = targetDrugInventory?.reorderLevel || 0;

          const projectedDaysSupply = targetFacilityADC > 0 ? (targetCurrentStock / targetFacilityADC) : Infinity;
          const needsDrug = targetCurrentStock < targetReorderLevel || projectedDaysSupply < 30;

          if (needsDrug) {
            const quantityConsumableBeforeExpiryAtTarget = targetFacilityADC * daysUntilExpiry;

            const quantityToSuggestBasedOnNeed = Math.max(0, (targetReorderLevel * 1.5) - targetCurrentStock);
            const quantityToSuggestBasedOnADC = Math.ceil(targetFacilityADC * 15);

            const suggestedQuantity = Math.min(
              sourceDrug.currentStock,
              quantityConsumableBeforeExpiryAtTarget,
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
                suggestedQuantity: Math.round(suggestedQuantity),
                daysUntilExpiry: daysUntilExpiry
              });

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
              suggestionsCountForCurrentDrug++;
            }
          }
        }
      }
    }
    console.log(`Identified ${potentialSuggestions.length} potential redistribution suggestions.`);

    let reasonsMap = {};
    if (llmPromptsForBatch.length > 0) {
      console.log(`Calling LLM for ${llmPromptsForBatch.length} justifications...`);
      reasonsMap = await getLLMJustificationsBatched(llmPromptsForBatch);
      console.log("LLM justifications received.");
    } else {
      console.log("No potential suggestions to get LLM justifications for.");
    }

    const finalSuggestions = potentialSuggestions.map(s => ({
      ...s,
      reason: reasonsMap[s.id] || "Automated suggestion based on inventory analysis (reason not generated).",
      id: undefined,
    }));

    console.log(`Sending ${finalSuggestions.length} final suggestions to frontend.`);
    res.status(200).json(finalSuggestions);

    lastGenerationTime = now;
  } catch (error) {
    console.error("Error during AI redistribution suggestions generation:", error);
    res.status(500).json({ message: "Failed to generate AI suggestions due to a server error.", error: error.message });
  } finally {
    isGeneratingSuggestions = false;
  }
});