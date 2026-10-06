import type { Request, Response } from "express";

import { marketIntelligenceOpportunitySchema } from "./market-intelligence.schema.js";
import { ingestMarketIntelligenceOpportunity as ingestOpportunityService } from "./market-intelligence.service.js";

export async function ingestMarketIntelligenceOpportunity(
  req: Request,
  res: Response,
) {
  const parsed = marketIntelligenceOpportunitySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "INVALID_MARKET_INTELLIGENCE_PAYLOAD",
      details: parsed.error.flatten(),
    });
  }

  const result = await ingestOpportunityService(parsed.data);

  return res.status(201).json({
    data: result,
  });
}