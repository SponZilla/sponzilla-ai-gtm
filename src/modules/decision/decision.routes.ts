import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";

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

decisionRouter.get(
  "/opportunities/:id/decision-context",
  asyncHandler(getDecisionContext),
);

decisionRouter.post(
  "/opportunities/:id/decisions",
  asyncHandler(generateDecision),
);

decisionRouter.post(
  "/decisions/:id/approve",
  asyncHandler(approveDecision),
);

decisionRouter.post(
  "/decisions/:id/reject",
  asyncHandler(rejectDecision),
);

decisionRouter.post(
  "/decisions/:id/execute",
  asyncHandler(executeDecision),
);

decisionRouter.post(
  "/decisions/:id/outcomes",
  asyncHandler(
    recordDecisionOutcome,
  ),
);

decisionRouter.get(
  "/decisions/:id/outcomes",
  asyncHandler(
    listDecisionOutcomes,
  ),
);