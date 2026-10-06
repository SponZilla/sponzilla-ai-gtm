import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";

import {
  getDecisionContext,
} from "./decision-context.controller.js";

import {
  approveDecision,
  generateDecision,
  rejectDecision,
} from "./decision.controller.js";

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