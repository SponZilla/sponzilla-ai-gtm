import { prisma } from "../../lib/prisma.js";

import type { CreateCompanyInput } from "./company.validator.js";

export interface UpsertCompanyFromIntelligenceInput {
  name: string;
  website: string;
  industry: string | null;
}

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

  async upsertFromIntelligence(
    input: UpsertCompanyFromIntelligenceInput,
  ) {
    const existing =
      (await prisma.company.findFirst({
        where: { website: input.website },
      })) ??
      (await prisma.company.findFirst({
        where: {
          name: {
            equals: input.name,
            mode: "insensitive",
          },
        },
      }));

    if (existing) {
      return prisma.company.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          website: input.website,
          industry: input.industry,
        },
      });
    }

    return prisma.company.create({
      data: {
        name: input.name,
        website: input.website,
        industry: input.industry,
      },
    });
  },
};