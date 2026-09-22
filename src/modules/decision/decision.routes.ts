import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";

import {
  getDecisionContext,
} from "./decision-context.controller.js";

export const decisionRouter = Router();

decisionRouter.get(
  "/opportunities/:id/decision-context",
  asyncHandler(getDecisionContext),
);