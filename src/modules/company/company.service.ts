import { companyRepository } from "./company.repository.js";

import type { CreateCompanyInput } from "./company.validator.js";

export const companyService = {
  createCompany(input: CreateCompanyInput) {
    return companyRepository.create(input);
  },

  getCompany(id: string) {
    return companyRepository.findById(id);
  },

  listCompanies() {
    return companyRepository.findAll();
  },
};