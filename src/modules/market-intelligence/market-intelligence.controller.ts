import type { Request, Response } from "express";
import { ZodError } from "zod";

import {
  parseOpportunityV1,
} from "@sponzilla/contracts/v1";
import { ingestMarketIntelligenceOpportunity as ingestOpportunityService } from "./market-intelligence.service.js";

export async function ingestMarketIntelligenceOpportunity(
  req: Request,
  res: Response,
) {
  let parsed: ReturnType<typeof parseOpportunityV1>;

  try {
    parsed = parseOpportunityV1(req.body);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: "INVALID_MARKET_INTELLIGENCE_PAYLOAD",
        details: error.flatten(),
      });
    }

    throw error;
  }

  const result = await ingestOpportunityService(parsed);

  return res.status(201).json({
    data: result,
  });
}
