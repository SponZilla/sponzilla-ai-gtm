import "dotenv/config";

import { prisma } from "../src/lib/prisma.js";

/**
 * Free coverage report: how much of each company's target list we can actually
 * address, and how much of the enrichment cache is being reused instead of
 * paid for. Reads the database only — spends no provider credits.
 *
 *   env -u PORT npx tsx scripts/report-coverage.ts
 */
async function main() {
  const companies = await prisma.company.findMany({
    include: { contacts: true },
    orderBy: { name: "asc" },
  });

  const rows = companies.map((company) => {
    const total = company.contacts.length;
    const verified = company.contacts.filter(
      (contact) => contact.emailStatus === "VERIFIED",
    ).length;
    const withEmail = company.contacts.filter((contact) => contact.email).length;

    return {
      company: company.name,
      contacts: total,
      withEmail,
      verified,
      coverage: total === 0 ? "—" : `${Math.round((verified / total) * 100)}%`,
    };
  });

  const totalContacts = rows.reduce((sum, row) => sum + row.contacts, 0);
  const totalVerified = rows.reduce((sum, row) => sum + row.verified, 0);

  console.table(rows);

  const cache = await prisma.enrichmentLookup.groupBy({
    by: ["hit"],
    _count: { _all: true },
  });

  const hits = cache.find((row) => row.hit)?._count._all ?? 0;
  const misses = cache.find((row) => !row.hit)?._count._all ?? 0;

  console.log(
    `verified ${totalVerified}/${totalContacts} contacts across ${rows.length} companies`,
  );
  console.log(`cache: ${hits} stored answers, ${misses} stored misses`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
