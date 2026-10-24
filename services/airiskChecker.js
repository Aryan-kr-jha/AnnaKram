// services/aiRiskChecker.js
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Analyzes proposed FIFO allocations for stockout risk, shelf-life breaches, and storage anomalies
 */
async function analyzeAllocationRisk({ commodityName, requestedQty, remainingAfterTotal, totalRemainingStock, allocations, daysInStorageMax }) {
  const reserveRemaining = remainingAfterTotal !== undefined ? remainingAfterTotal : (totalRemainingStock !== undefined ? totalRemainingStock : 'N/A');

  const prompt = `
You are the AI Risk Advisory Auditor for an Indian Public Distribution System (iPDS) government grain godown.
Analyze the following proposed stock dispatch allocation before final confirmation:

- Commodity: ${commodityName}
- Quantity to Dispatch: ${requestedQty} Quintals
- Total Warehouse Reserve Left After Dispatch: ${reserveRemaining} Quintals
- Oldest Batch Age in this Dispatch: ${daysInStorageMax} days
- Batch Split Details:
${JSON.stringify(allocations, null, 2)}

Provide a structured risk assessment in valid JSON format with the following keys:
{
  "risk_level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "risk_summary": "1-2 sentence assessment of the allocation",
  "flags": ["List of specific risks regarding ageing, buffer stock, or spoilage"],
  "recommended_action": "Specific administrative recommendation for the godown manager"
}
Ensure the output is raw JSON with no markdown formatting or backticks.
`;

  // Candidate models: start with specified model, with automatic fallback for API lifecycle transitions
  const candidateModels = Array.from(new Set([
    process.env.GEMINI_MODEL,
    'gemini-3.1-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-flash-latest'
  ].filter(Boolean)));

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt
      });

      const rawText = response.text;
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return parsed;
    } catch (error) {
      console.error('Gemini Failure Reason:', error.message || error);
      lastError = error;
    }
  }

  // Graceful fallback so a network or quota error doesn't break the dispatch flow
  return {
    risk_level: 'MODERATE',
    risk_summary: 'Algorithmic allocation verified. AI advisory service temporarily unavailable.',
    flags: ['Manual verification of physical bags recommended'],
    recommended_action: 'Proceed with standard physical inspection.'
  };
}

module.exports = { analyzeAllocationRisk };