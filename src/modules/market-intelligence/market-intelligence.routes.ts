import { Router } from "express";
import { adminRateLimiter } from "../../middleware/admin-rate-limiter.js";
import { requireInternalAdmin } from "../../middleware/require-internal-admin.js";

import {
  ingestMarketIntelligenceOpportunity,
} from "./market-intelligence.controller.js";

export const marketIntelligenceRouter = Router();

marketIntelligenceRouter.use(
  adminRateLimiter,
  requireInternalAdmin,
);

marketIntelligenceRouter.post(
  "/opportunities",
  ingestMarketIntelligenceOpportunity,
);
