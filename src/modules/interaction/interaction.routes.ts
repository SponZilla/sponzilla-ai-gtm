import { Router } from "express";
import { adminRateLimiter } from "../../middleware/admin-rate-limiter.js";
import { requireInternalAdmin } from "../../middleware/require-internal-admin.js";

import {
  createInteraction,
  getInteraction,
  listOpportunityInteractions,
} from "./interaction.controller.js";

export const interactionRouter = Router();

interactionRouter.use(
  adminRateLimiter,
  requireInternalAdmin,
);

interactionRouter.post(
  "/",
  createInteraction,
);

interactionRouter.get(
  "/:id",
  getInteraction,
);

interactionRouter.get(
  "/opportunity/:opportunityId/history",
  listOpportunityInteractions,
);
