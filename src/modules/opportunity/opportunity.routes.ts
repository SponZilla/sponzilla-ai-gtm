import { Router } from "express";

import { asyncHandler } from "../../middleware/async-handler.js";

import {
  createOpportunity,
  getOpportunity,
  listOpportunities,
} from "./opportunity.controller.js";

export const opportunityRouter = Router();

opportunityRouter.post(
  "/",
  asyncHandler(createOpportunity),
);

opportunityRouter.get(
  "/",
  asyncHandler(listOpportunities),
);

opportunityRouter.get(
  "/:id",
  asyncHandler(getOpportunity),
);