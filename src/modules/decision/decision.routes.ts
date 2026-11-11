
import {
  Router,
} from "express";

import {
  asyncHandler,
} from "../../middleware/async-handler.js";

import {
  requireInternalAdmin,
} from "../../middleware/require-internal-admin.js";

import {
  requireSponzillaAdmin,
} from "../../middleware/require-sponzilla-admin.js";

import {
  adminRateLimiter,
} from "../../middleware/admin-rate-limiter.js";

import {
  getDecisionContext,
} from "./decision-context.controller.js";

import {
  approveDecision,
  generateDecision,
  rejectDecision,
  executeDecision,
} from "./decision.controller.js";

import {
  listDecisionOutcomes,
  recordDecisionOutcome,
} from "./decision-outcome.controller.js";

export const decisionRouter = Router();

/**
 * Rate limiting happens before authentication so repeated
 * unauthorized requests are restricted.
 */
decisionRouter.use(
  adminRateLimiter,
);

/**
 * Read-only decision context.
 */
decisionRouter.get(
  "/opportunities/:id/decision-context",
  requireInternalAdmin,
  asyncHandler(getDecisionContext),
);

/**
 * Generate an AI GTM decision.
 */
decisionRouter.post(
  "/opportunities/:id/decisions",
  requireInternalAdmin,
  asyncHandler(generateDecision),
);

/**
 * Approve a GTM decision.
 */
decisionRouter.post(
  "/decisions/:id/approve",
  requireSponzillaAdmin,
  asyncHandler(approveDecision),
);

/**
 * Reject a GTM decision.
 */
decisionRouter.post(
  "/decisions/:id/reject",
  requireSponzillaAdmin,
  asyncHandler(rejectDecision),
);

/**
 * Execute an approved GTM action.
 */
decisionRouter.post(
  "/decisions/:id/execute",
  requireInternalAdmin,
  asyncHandler(executeDecision),
);

/**
 * Record a GTM outcome.
 */
decisionRouter.post(
  "/decisions/:id/outcomes",
  requireInternalAdmin,
  asyncHandler(recordDecisionOutcome),
);

/**
 * List recorded GTM outcomes.
 */
decisionRouter.get(
  "/decisions/:id/outcomes",
  requireInternalAdmin,
  asyncHandler(listDecisionOutcomes),
);
