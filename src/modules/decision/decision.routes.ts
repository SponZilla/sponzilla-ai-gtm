
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
 * Protect every decision endpoint.
 *
 * Rate limiting happens first so repeated
 * unauthorized requests are restricted.
 *
 * Authentication happens before any
 * business controller is executed.
 */
decisionRouter.use(
  adminRateLimiter,
  requireInternalAdmin,
);

/**
 * Read-only decision context.
 */
decisionRouter.get(
  "/opportunities/:id/decision-context",
  asyncHandler(getDecisionContext),
);

/**
 * Generate an AI GTM decision.
 */
decisionRouter.post(
  "/opportunities/:id/decisions",
  asyncHandler(generateDecision),
);

/**
 * Approve a GTM decision.
 */
decisionRouter.post(
  "/decisions/:id/approve",
  asyncHandler(approveDecision),
);

/**
 * Reject a GTM decision.
 */
decisionRouter.post(
  "/decisions/:id/reject",
  asyncHandler(rejectDecision),
);

/**
 * Execute an approved GTM action.
 */
decisionRouter.post(
  "/decisions/:id/execute",
  asyncHandler(executeDecision),
);

/**
 * Record a GTM outcome.
 */
decisionRouter.post(
  "/decisions/:id/outcomes",
  asyncHandler(recordDecisionOutcome),
);

/**
 * List recorded GTM outcomes.
 */
decisionRouter.get(
  "/decisions/:id/outcomes",
  asyncHandler(listDecisionOutcomes),
);
