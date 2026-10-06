import type {
  Prisma,
  PrismaClient,
} from "../../generated/prisma/client.js";

type DbClient =
  | PrismaClient
  | Prisma.TransactionClient;

export const marketIntelligenceRepository = {
  findByExternalOpportunityId(
    db: DbClient,
    externalOpportunityId: string,
  ) {
    return db.marketIntelligenceOpportunity.findUnique({
      where: {
        externalOpportunityId,
      },
      include: {
        opportunity: {
          include: {
            company: true,
          },
        },
      },
    });
  },

  findCompanyByWebsite(
    db: DbClient,
    website: string,
  ) {
    return db.company.findFirst({
      where: {
        website,
      },
    });
  },

  findCompanyByName(
    db: DbClient,
    name: string,
  ) {
    return db.company.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });
  },
};