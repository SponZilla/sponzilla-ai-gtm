import { companyRepository } from "../company/company.repository.js";
import { opportunityRepository } from "./opportunity.repository.js";

import type { CreateOpportunityInput } from "./opportunity.validator.js";

export class CompanyNotFoundError extends Error {
  constructor() {
    super("Company not found");
    this.name = "CompanyNotFoundError";
  }
}

export const opportunityService = {
  async createOpportunity(
    input: CreateOpportunityInput,
  ) {
    const company = await companyRepository.findById(
      input.companyId,
    );

    if (!company) {
      throw new CompanyNotFoundError();
    }

    return opportunityRepository.create(input);
  },

  getOpportunity(id: string) {
    return opportunityRepository.findById(id);
  },

  listOpportunities() {
    return opportunityRepository.findAll();
  },
};