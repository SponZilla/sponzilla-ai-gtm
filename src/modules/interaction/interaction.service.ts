import { prisma } from "../../lib/prisma.js";

import { opportunityRepository } from "../opportunity/opportunity.repository.js";

import { interactionRepository } from "./interaction.repository.js";

import type {
  CreateInteractionInput,
} from "./interaction.validator.js";

export const interactionService = {
  async createInteraction(input: CreateInteractionInput) {
    const opportunity =
      await opportunityRepository.findById(
        input.opportunityId,
      );

    if (!opportunity) {
      throw new Error("OPPORTUNITY_NOT_FOUND");
    }

    return interactionRepository.create(input);
  },

  getInteraction(id: string) {
    return interactionRepository.findById(id);
  },

  getOpportunityInteractions(opportunityId: string) {
    return interactionRepository.findByOpportunityId(
      opportunityId,
    );
  },
};