import { Router } from "express";

import {
  ingestMarketIntelligenceOpportunity,
} from "./market-intelligence.controller.js";

export const marketIntelligenceRouter = Router();

marketIntelligenceRouter.post(
  "/opportunities",
  ingestMarketIntelligenceOpportunity,
);