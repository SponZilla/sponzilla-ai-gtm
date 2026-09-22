import { Router } from "express";

import {
  createInteraction,
  getInteraction,
  listOpportunityInteractions,
} from "./interaction.controller.js";

export const interactionRouter = Router();

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