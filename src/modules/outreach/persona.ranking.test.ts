import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { rankTargets } from "./persona.ranking.js";

const decisionMaker = (
  overrides: Partial<{
    name: string | null;
    title: string | null;
    linkedinUrl: string | null;
    email: string | null;
    sourceUrl: string | null;
    verified: boolean;
  }> = {},
) => ({
  name: null,
  title: null,
  linkedinUrl: null,
  email: null,
  sourceUrl: null,
  verified: false,
  ...overrides,
});

describe("rankTargets", () => {
  it("ranks partnerships leadership above marketing leadership", () => {
    const ranked = rankTargets([
      decisionMaker({
        name: "Marketing Person",
        title: "Chief Marketing Officer",
      }),
      decisionMaker({
        name: "Partnerships Person",
        title: "Head of Partnerships",
      }),
    ]);

    assert.equal(ranked[0]?.name, "Partnerships Person");
    assert.equal(ranked[0]?.matchedPersona, "head of partnerships");
    assert.ok(
      ranked[0]!.personaScore > ranked[1]!.personaScore,
      "partnerships head must outscore the CMO",
    );
  });

  it("keeps the LinkedIn URL and marks unmatched titles as low fit", () => {
    const ranked = rankTargets([
      decisionMaker({
        name: "Engineer",
        title: "Staff Software Engineer",
        linkedinUrl: "https://www.linkedin.com/in/engineer-example",
      }),
    ]);

    assert.equal(ranked[0]?.personaScore, 20);
    assert.equal(ranked[0]?.matchedPersona, null);
    assert.equal(
      ranked[0]?.linkedinUrl,
      "https://www.linkedin.com/in/engineer-example",
    );
  });

  it("sorts deterministically when scores tie", () => {
    const ranked = rankTargets([
      decisionMaker({ name: "Zoe", title: "Head of Brand" }),
      decisionMaker({ name: "Adam", title: "Head of Brand" }),
    ]);

    assert.deepEqual(
      ranked.map((target) => target.name),
      ["Adam", "Zoe"],
    );
  });

  it("honours operator-supplied persona titles", () => {
    const ranked = rankTargets(
      [
        decisionMaker({ name: "Head of Community", title: "Head of Community" }),
        decisionMaker({ name: "Partnerships", title: "Head of Partnerships" }),
      ],
      { personaTitles: ["head of community"] },
    );

    assert.equal(ranked[0]?.name, "Head of Community");
    assert.equal(ranked[0]?.matchedPersona, "head of community");
  });
});
