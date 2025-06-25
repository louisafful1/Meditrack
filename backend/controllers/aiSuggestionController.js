import asyncHandler from 'express-async-handler';
import openai from '../config/openaiClient.js';
import DispenseLog from '../models/aiModels/DispenseLog.js';
import InventorySnapshot from '../models/aiModels/InventorySnapshot.js';
import FacilityBehaviorSnapshot from '../models/aiModels/FacilityBehaviorSnapshot.js';

// @desc    Generate AI-powered redistribution suggestions
// @route   GET /api/ai/redistribute
// @access  Private
export const getAISuggestions = asyncHandler(async (req, res) => {
  try {
    // Fetch near-expiry inventory (e.g., expiring in 30 days)
    const now = new Date();
    const next30 = new Date(now);
    next30.setDate(now.getDate() + 30);

    const nearExpiryDrugs = await InventorySnapshot.find({
      expiryDate: { $lte: next30 },
      stockLevel: { $gt: 0 }
    }).populate("facility", "name");

    // Fetch recent dispense logs (last 60 days)
    const dispenseLogs = await DispenseLog.find({
      createdAt: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
    })
      .populate("drug", "drugName")
      .populate("facility", "name");

    // Facility behavior summary
    const facilityBehaviors = await FacilityBehaviorSnapshot.find({});

    // Build Prompt
    const prompt = `
 You are an intelligent drug redistribution assistant for a network of healthcare facilities.
 Your goal is to recommend moving near-expiry drugs from one facility to another, 
 using past dispense behavior and current usage patterns. Recommend which facility should receive them.
 Ensure your suggestions are practical and avoid waste.


Here’s the data:
1. Near-expiry drugs:
${JSON.stringify(nearExpiryDrugs)}

2. Dispense Logs:
${JSON.stringify(dispenseLogs)}

3. Facility Behaviors:
${JSON.stringify(facilityBehaviors)}

Rules:
- Do not suggest transfers to facilities that rarely dispense the drug.
- Prioritize facilities with fast-moving usage and lower current stock.
- Prefer minimizing expiry risk.
- If no redistribution makes sense, say so.

Please output a list of recommended redistributions with: 
  - Drug name
  - From facility
  - To facility
  - Quantity
  - Reason

Only suggest transfers that make logical sense. If none should happen, say so.
`;

    // Step 5: Call OpenRouter AI
    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-r1-0528:free",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const suggestion = completion.choices[0].message.content;

    res.status(200).json({ suggestions: suggestion });
  } catch (error) {
    res.status(500);
    throw new Error(`AI Suggestion Error: ${error.message}`);
  }
});







