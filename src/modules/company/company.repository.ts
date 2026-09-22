import { prisma } from "../../lib/prisma.js";

import type { CreateCompanyInput } from "./company.validator.js";

export const companyRepository = {
  create(input: CreateCompanyInput) {
    return prisma.company.create({
      data: input,
    });
  },

  findById(id: string) {
    return prisma.company.findUnique({
      where: { id },
    });
  },

  findAll() {
    return prisma.company.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },
};